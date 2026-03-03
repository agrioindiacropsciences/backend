import { Prisma, Campaign, CampaignTier } from '@prisma/client';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { ErrorCodes } from '../types';
import * as xlsx from 'xlsx';

class ProductCouponService {
    /**
     * Bulk upload coupons from Excel buffer
     */
    async bulkUpload(buffer: Buffer) {
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet) as any[];

        // Generate a unique batch ID for this upload session
        const sessionBatchId = `UP-${new Date().getTime().toString(36).toUpperCase()}`;

        // Expect columns: "Serial Num", "Authentic Code", "Batch Number" (optional)
        const validCoupons: Prisma.ProductCouponCreateManyInput[] = [];
        const errors: string[] = [];

        for (const [index, row] of data.entries()) {
            // Flexible header detection
            const getVal = (keys: string[]) => {
                for (const key of keys) {
                    // Try exact match, then case-insensitive, then trimmed
                    if (row[key] !== undefined) return String(row[key]);
                    const foundKey = Object.keys(row).find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === key.toLowerCase().replace(/[^a-z0-9]/g, ''));
                    if (foundKey) return String(row[foundKey]);
                }
                return '';
            };

            const serial = getVal(['Serial Num', 'Seriel Num.', 'Serial Number', 'serial_number', 'Serial', 'SNo', 'S.No']).trim();
            const auth = getVal(['Authentic Code', 'auth_code', 'Authentication Code', 'Auth', 'Code']).trim();
            const batch = getVal(['Batch Number', 'batch_number', 'Batch']).trim();

            if (!serial || !auth) {
                // If it's a completely empty row, just skip silently
                if (!Object.values(row).some(v => v)) continue;

                errors.push(`Row ${index + 2}: Missing Serial Number or Authentic Code`);
                continue;
            }

            validCoupons.push({
                serialNumber: serial,
                authCode: auth,
                batchNumber: batch || sessionBatchId, // Use session batch ID if none in file
                isRedeemed: false,
            });
        }

        if (validCoupons.length === 0) {
            throw new AppError('No valid coupons found in file. Please ensure columns: "Serial Num" and "Authentic Code" exist.', ErrorCodes.VALIDATION_ERROR, 400);
        }

        // Bulk insert (skip duplicates)
        const result = await prisma.productCoupon.createMany({
            data: validCoupons,
            skipDuplicates: true,
        });

        const response = {
            count: result.count,
            totalRows: data.length,
            validRows: validCoupons.length,
            duplicateRows: validCoupons.length - result.count,
            batchId: sessionBatchId,
            errors,
        };

        console.log(`Bulk Upload Summary:`, JSON.stringify(response, null, 2));
        return response;
    }

    /**
     * Verify and Claim Coupon
     */
    async verifyAndClaim(serialNumber: string, authCode: string, userId: string) {
        // Safety: Never process without a valid userId
        if (!userId || userId.trim().length === 0) {
            throw new AppError('User authentication required', ErrorCodes.UNAUTHORIZED, 401);
        }

        const cleanSerial = serialNumber.trim();
        const cleanAuth = authCode.trim();

        console.log(`[ProductCoupon] Verifying claim for serial: '${cleanSerial}' by user: '${userId}'`);

        // 1. Validate Code
        const coupon = await prisma.productCoupon.findUnique({
            where: { serialNumber: cleanSerial },
        });

        if (!coupon) {
            throw new AppError('Invalid Serial Number', ErrorCodes.COUPON_INVALID, 400);
        }

        if (coupon.authCode !== cleanAuth) {
            console.log(`[ProductCoupon] Auth code mismatch. Expected: '${coupon.authCode}', Got: '${cleanAuth}' (raw: '${authCode}')`);
            throw new AppError('Invalid Authentic Code', ErrorCodes.COUPON_INVALID, 400);
        }

        if (coupon.isRedeemed) {
            throw new AppError('Coupon already redeemed', ErrorCodes.COUPON_USED, 400);
        }

        // 2. Check for Active Campaign
        // Adjust for IST since server seems to be on UTC but we want to simulate India time for campaign checks
        const now = new Date();
        now.setHours(now.getHours() + 5);
        now.setMinutes(now.getMinutes() + 30);
        const campaign = await prisma.campaign.findFirst({
            where: {
                isActive: true,
                startDate: { lte: now },
                endDate: { gte: now },
            },
            include: { tiers: true },
        });

        if (!campaign) {
            throw new AppError('No active reward campaign at this moment. Please check dates.', ErrorCodes.CAMPAIGN_INACTIVE, 400);
        }

        // 3. Mark as Redeemed (Burn the code) - Transaction start
        return await prisma.$transaction(async (tx) => {
            // Lock coupon
            const lockedCoupon = await tx.productCoupon.findUnique({
                where: { id: coupon.id },
            });
            if (lockedCoupon?.isRedeemed) {
                throw new AppError('Coupon already redeemed', ErrorCodes.COUPON_USED, 400);
            }

            await tx.productCoupon.update({
                where: { id: coupon.id },
                data: {
                    isRedeemed: true,
                    redeemedAt: new Date(),
                    redeemedBy: userId,
                },
            });

            // 4. Reward Logic
            // Get all tiers for this campaign
            const tiers = campaign.tiers;

            // Filter tiers with available slots
            const availableTiers = tiers.filter((t) => !t.maxWinners || t.currentWinners < t.maxWinners);

            let wonTier: CampaignTier | null = null;

            if (availableTiers.length > 0) {
                // Weighted random selection
                const roll = Math.random(); // 0.0 to 1.0 (assuming probability is decimal 0-1)
                let cumulative = 0;

                // If probabilities sum to < 1, there's a chance of no reward "Better luck next time"
                for (const tier of availableTiers) {
                    cumulative += Number(tier.probability);
                    if (roll < cumulative) {
                        wonTier = tier;
                        break;
                    }
                }
            }

            if (wonTier) {
                // Increment tier winner count
                await tx.campaignTier.update({
                    where: { id: wonTier.id },
                    data: { currentWinners: { increment: 1 } },
                });

                // 5. Create Redemption
                const redemption = await tx.scanRedemption.create({
                    data: {
                        userId,
                        productCouponId: coupon.id,
                        campaignTierId: wonTier.id,
                        prizeType: wonTier.rewardType,
                        prizeValue: wonTier.rewardValue,
                        assignedRank: 0, // Not strictly used for random logic but required? schema says Int? optional
                        status: 'CLAIMED', // Default status
                    },
                });

                // Create notification
                await tx.notification.create({
                    data: {
                        userId,
                        type: 'REWARD',
                        title: `Congratulations! You won ${wonTier.rewardName}`,
                        titleHi: wonTier.rewardNameHi ? `बधाई हो! आपने जीता ${wonTier.rewardNameHi}` : undefined,
                        message: `Your reward ${wonTier.rewardType === 'CASHBACK' ? 'of ₹' + wonTier.rewardValue : ''} has been successfully credited to your account.`,
                        data: { redemption_id: redemption.id },
                    },
                });

                return {
                    status: 'WON',
                    reward: wonTier,
                    redemptionId: redemption.id,
                    redemption,
                };
            } else {
                // Lost - Better luck next time
                return {
                    status: 'LOST',
                    message: 'Better luck next time! No reward this time.',
                };
            }
        });
    }
}

export default new ProductCouponService();
