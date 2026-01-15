import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, ErrorCodes } from '../types';
import { sendSuccess, sendError } from '../utils/response';
import { z } from 'zod'; // Or use validation utils
import QrService from '../services/QrService';

const scanQrSchema = z.object({
    code: z.string().min(1),
    // location info optional?
});

export const redeemQr = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void | Response> => {
    try {
        const { code } = scanQrSchema.parse(req.body);
        const userId = req.userId!;

        const result = await QrService.redeemCode(code, userId);

        const prizeType = result.tier.rewardType;
        // Use tier image if available
        let imageUrl = result.tier.imageUrl;

        // Fallback images if no image in DB
        if (!imageUrl) {
            if (prizeType === 'GIFT') {
                imageUrl = 'https://res.cloudinary.com/dyumjsohc/image/upload/v1768457092/rewards/hero_splendor.jpg';
            } else if (prizeType === 'DISCOUNT') {
                imageUrl = 'https://res.cloudinary.com/dyumjsohc/image/upload/v1768457093/rewards/discount_voucher.jpg';
            } else {
                imageUrl = 'https://res.cloudinary.com/dyumjsohc/image/upload/v1768457092/rewards/cashback_voucher.jpg';
            }
        }

        sendSuccess(res, {
            redemption: result.redemption,
            reward: {
                name: result.tier.rewardName,
                name_hi: result.tier.rewardNameHi,
                type: result.tier.rewardType,
                value: typeof result.tier.rewardValue === 'object' && result.tier.rewardValue !== null && 'toNumber' in result.tier.rewardValue ? (result.tier.rewardValue as any).toNumber() : Number(result.tier.rewardValue),
                image_url: imageUrl
            },
            reward_image_url: imageUrl,
            message: 'Reward claimed successfully!'
        });
    } catch (error) {
        next(error);
    }
};
