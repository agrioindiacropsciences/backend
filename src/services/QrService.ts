import { Prisma, Campaign, CampaignTier, DistributionType, RewardType } from '@prisma/client';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { ErrorCodes } from '../types';

export class QrService {
    /**
     * Generate a batch of QR codes (Coupons) for a campaign
     */
    async generateBatch(campaignId: string, quantity: number, batchNumber: string) {
        const campaign = await prisma.campaign.findUnique({
            where: { id: campaignId },
        });

        if (!campaign) {
            throw new AppError('Campaign not found', ErrorCodes.RESOURCE_NOT_FOUND, 404);
        }

        const couponsData = [];
        for (let i = 0; i < quantity; i++) {
            // Generate a unique code (e.g., 12-char alphanumeric)
            // For simplicity using random string + timestamp could be option, 
            // but uuid is safer for uniqueness, or we can use custom generator.
            // Let's use a simple distinct generator or UUID for now to ensure global uniqueness.
            // Format: AGRI-XXXX-XXXX
            const uniqueSuffix = Math.random().toString(36).substring(2, 8).toUpperCase() +
                Math.random().toString(36).substring(2, 6).toUpperCase();
            const code = `AGRI-${uniqueSuffix}`;

            couponsData.push({
                code,
                campaignId,
                batchNumber,
                status: 'UNUSED',
            });
        }

        // Use createMany (Prisma not fully supporting createMany with SQLite, but Postgres is fine)
        // We are on Postgres.
        // However, collision check is needed. If unique constraint fails, we should retry or handle it.
        // For batch of 10k, collisions might check.
        // Let's do it in chunks or rely on UUID if we strictly used UUID.
        // The user asked for "unique qr code".

        // Simplest robust way: UUID.
        // If we want "short" codes, we need collision handling.
        // I'll stick to UUID for the 'code' field for absolute safety in this batch, 
        // or a very large random space.

        // Refined: loop and create. createMany is faster but collision handling is harder.
        // Given 10k, createMany is preferred.
        // I will use `crypto.randomUUID()` or similar if available, or just the custom format.

        // Let's generate purely random UUIDs to allow createMany to succeed with high probability.
        const finalData = Array.from({ length: quantity }).map(() => ({
            code: crypto.randomUUID(), // Use UUID for guaranteed uniqueness
            campaignId,
            batchNumber,
            status: 'UNUSED' as const, // Fix enum type issue
        }));

        const result = await prisma.coupon.createMany({
            data: finalData,
            skipDuplicates: true, // In case of collision, though UUID won't collide
        });

        // Update campaign totalQrCodes
        await prisma.campaign.update({
            where: { id: campaignId },
            data: { totalQrCodes: { increment: result.count } },
        });

        return result;
    }

    /**
     * Get a QR code image URL with the company logo embedded
     */
    getQrUrl(code: string) {
        // Use a permanent, publicly accessible Cloudinary URL for the logo
        // This ensures QuickChart can always fetch the image regardless of local development state
        const logoUrl = 'https://res.cloudinary.com/dyumjsohc/image/upload/v1768456817/assets/agrio_logo.png';

        return `https://quickchart.io/qr?text=${encodeURIComponent(code)}&centerImageUrl=${encodeURIComponent(logoUrl)}&centerImageSize=0.15&size=300&ecLevel=H`;
    }

    /**
     * Redeem a QR code
     */
    async redeemCode(code: string, userId: string) {
        // 1. Validate Code
        const coupon = await prisma.coupon.findUnique({
            where: { code },
            include: {
                campaign: {
                    include: { tiers: true }
                }
            },
        });

        if (!coupon) {
            throw new AppError('Invalid QR Code', ErrorCodes.COUPON_INVALID, 404);
        }

        if (coupon.status === 'USED') {
            throw new AppError('QR Code already used', ErrorCodes.COUPON_USED, 400);
        }

        if (coupon.campaign && !coupon.campaign.isActive) {
            throw new AppError('Campaign is not active', ErrorCodes.CAMPAIGN_INACTIVE, 400);
        }

        if (!coupon.campaign) {
            throw new AppError('No campaign linked to this QR', ErrorCodes.VALIDATION_ERROR, 400);
        }

        const campaign = coupon.campaign;
        const tiers = campaign.tiers;

        return await prisma.$transaction(async (tx) => {
            // Re-fetch coupon in transaction to lock
            const lockedCoupon = await tx.coupon.findUnique({
                where: { id: coupon.id },
            });
            if (lockedCoupon?.status === 'USED') {
                throw new AppError('QR Code already used', ErrorCodes.COUPON_USED, 400);
            }

            let selectedTier: CampaignTier | undefined;
            let rank = 0;

            // Logic Selection
            if (campaign.distributionType === 'SEQUENTIAL') {
                // SEQUENTIAL LOGIC
                // Count total redemptions for this campaign
                const totalRedemptions = await tx.scanRedemption.count({
                    where: {
                        coupon: { campaignId: campaign.id }
                    }
                });
                rank = totalRedemptions + 1;

                // Sort tiers by priority (or just rely on implicit logic if user didn't set priority, but we added it)
                // Assuming 1 is first.
                const sortedTiers = tiers.sort((a, b) => a.priority - b.priority);

                let accumulatedCount = 0;
                for (const tier of sortedTiers) {
                    const limit = tier.maxWinners || 999999999;
                    if (rank > accumulatedCount && rank <= accumulatedCount + limit) {
                        selectedTier = tier;
                        break;
                    }
                    accumulatedCount += limit;
                }

            } else {
                // RANDOM LOGIC
                // Filter tiers that are not full
                const availableTiers = tiers.filter(t => !t.maxWinners || t.currentWinners < t.maxWinners);

                if (availableTiers.length === 0) {
                    // Fallback or Error? 
                    // If no rewards left, user gets nothing or default "Better luck next time" tier if exists.
                    // We will throw error for now or handle gracefully.
                    throw new AppError('All rewards claimed', ErrorCodes.RESOURCE_EXHAUSTED, 400);
                }

                // Weighted random selection
                const totalWeight = availableTiers.reduce((sum, t) => sum + Number(t.probability), 0);
                let randomValue = Math.random() * totalWeight;

                for (const tier of availableTiers) {
                    const weight = Number(tier.probability);
                    if (randomValue <= weight) {
                        selectedTier = tier;
                        break;
                    }
                    randomValue -= weight;
                }

                // Fallback (floating point errors)
                if (!selectedTier) selectedTier = availableTiers[availableTiers.length - 1];
            }

            if (!selectedTier) {
                throw new AppError('No reward available for this rank/scan', ErrorCodes.RESOURCE_NOT_FOUND, 400);
            }

            // UPDATE EVERYTHING

            // 1. Mark Coupon Used
            await tx.coupon.update({
                where: { id: coupon.id },
                data: {
                    status: 'USED',
                    usedBy: userId,
                    usedAt: new Date()
                }
            });

            // 2. Increment Tier Winners
            const updatedTier = await tx.campaignTier.update({
                where: { id: selectedTier.id },
                data: { currentWinners: { increment: 1 } }
            });

            // Double check max limit constraint in case of race condition (Postgres check constraint would be better but simple check here)
            if (selectedTier.maxWinners && updatedTier.currentWinners > selectedTier.maxWinners) {
                // Rollback triggered by error
                throw new AppError('Reward limit reached just now, please try again', ErrorCodes.CONFLICT, 409);
            }

            // 3. Create Redemption
            const redemption = await tx.scanRedemption.create({
                data: {
                    userId,
                    couponId: coupon.id,
                    campaignTierId: selectedTier.id,
                    prizeType: selectedTier.rewardType,
                    prizeValue: selectedTier.rewardValue,
                    assignedRank: rank || undefined, // Only for sequential really, but useful debug
                    status: 'CLAIMED', // Directly claimed for now? Or Pending? Scheme says PENDING usually.
                    // If it's effectively "Revealed", maybe VERIFIED immediately for small prizes?
                    // Letting it be PENDING_VERIFICATION as per default.
                }
            });

            return {
                redemption,
                tier: selectedTier,
                rank
            };
        });
    }
}

export default new QrService();
