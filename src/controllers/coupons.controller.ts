import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { verifyCouponSchema, redeemCouponSchema } from '../utils/validation';
import { AuthenticatedRequest, ErrorCodes } from '../types';
import { AppError } from '../middleware/errorHandler';
import { getOrdinalSuffix } from '../utils/helpers';

// POST /api/v1/coupons/verify
export const verifyCoupon = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  return sendError(res, 'New QR scan logic is being implemented. Verification is disabled.', ErrorCodes.VALIDATION_ERROR, 503);
};

// POST /api/v1/coupons/redeem
export const redeemCoupon = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  return sendError(res, 'New QR scan logic is being implemented. Redemption is disabled.', ErrorCodes.VALIDATION_ERROR, 503);
};

