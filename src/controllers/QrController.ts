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

        sendSuccess(res, {
            redemption: result.redemption,
            reward: {
                name: result.tier.rewardName,
                name_hi: result.tier.rewardNameHi,
                type: result.tier.rewardType,
                value: result.tier.rewardValue,
                image_url: null // Tier doesn't have image yet, maybe Campaign has?
            },
            message: 'Reward claimed successfully!'
        });
    } catch (error) {
        next(error);
    }
};
