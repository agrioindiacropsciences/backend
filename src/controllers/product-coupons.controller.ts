import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, AdminRequest, ErrorCodes } from '../types';
import { sendSuccess, sendError } from '../utils/response';
import productCouponService from '../services/ProductCouponService';
import { z } from 'zod';

const verifyClaimSchema = z.object({
    serial_number: z.string().min(1, 'Serial number is required'),
    auth_code: z.string().min(1, 'Authentic code is required')
});

export const bulkUpload = async (
    req: AdminRequest,
    res: Response,
    next: NextFunction
): Promise<void | Response> => {
    try {
        if (!req.file) {
            return sendError(res, 'No file uploaded', ErrorCodes.VALIDATION_ERROR, 400);
        }

        const result = await productCouponService.bulkUpload(req.file.buffer);

        sendSuccess(res, result, 'Coupons processed successfully');
    } catch (error) {
        next(error);
    }
};

export const verifyAndClaim = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void | Response> => {
    try {
        const { serial_number, auth_code } = verifyClaimSchema.parse(req.body);
        const userId = req.userId!;

        const result = await productCouponService.verifyAndClaim(serial_number, auth_code, userId);

        sendSuccess(res, result, result.status === 'WON' ? 'Congratulations!' : 'Verified');
    } catch (error) {
        next(error);
    }
};
