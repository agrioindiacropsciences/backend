import { Prisma, Campaign, CampaignTier, DistributionType, RewardType } from '@prisma/client';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { ErrorCodes } from '../types';

export class QrService {
    /**
     * Generate a batch of QR codes (Coupons) for a campaign
     * @param productId - Optional product ID for free product coupons
     * @param expiryDate - Optional expiry date for coupons
     */
    async generateBatch(
        campaignId: string,
        quantity: number,
        batchNumber: string,
        productId?: string,
        expiryDate?: Date
    ) {
        // Note: ProductCoupons are typically uploaded via Excel.
        // This programmatic generation is for "Virtual" coupons or testing.
        // We need to generate auth codes too.

        const finalData = Array.from({ length: quantity }).map(() => ({
            serialNumber: `AGRI-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
            authCode: Math.random().toString(36).substring(2, 8).toUpperCase(), // Generate random auth code
            batchNumber,
            isRedeemed: false,
            // We don't strictly link campaignId in schema yet (it's optional in ProductCoupon),
            // but for tracking we might want to.
            // However, verifyAndClaim finds ANY active campaign.
            // So these coupons will work with ANY active campaign.
            couponId: campaignId, // using couponId field to store campaignId reference if needed, or null
        }));

        const result = await prisma.productCoupon.createMany({
            data: finalData,
            skipDuplicates: true,
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
        throw new AppError('QR redemption logic is disabled for migration', ErrorCodes.VALIDATION_ERROR, 503);
    }
}

export default new QrService();
