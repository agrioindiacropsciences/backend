import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthenticatedRequest, ErrorCodes } from '../types';

// GET /api/v1/rewards/:id/certificate
export const getRewardCertificate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const redemption = await prisma.scanRedemption.findUnique({
      where: { id },
      include: {
        coupon: { select: { code: true } },
        tier: true,
        user: { select: { fullName: true, phoneNumber: true } },
      },
    });

    if (!redemption) {
      return sendError(res, ErrorCodes.NOT_FOUND, 'Reward not found', 404);
    }

    // Verify ownership
    if (redemption.userId !== userId) {
      return sendError(res, ErrorCodes.FORBIDDEN, 'Access denied', 403);
    }

    // If certificate URL exists, return it
    if (redemption.acknowledgmentFileUrl) {
      sendSuccess(res, {
        certificate_url: redemption.acknowledgmentFileUrl,
        download_url: redemption.acknowledgmentFileUrl,
      });
      return;
    }

    // Certificate data for frontend to generate
    sendSuccess(res, {
      certificate_data: {
        winner_name: redemption.user.fullName,
        phone_number: redemption.user.phoneNumber,
        coupon_code: redemption.coupon.code,
        prize_name: redemption.tier?.rewardName || `${redemption.prizeType} ₹${redemption.prizeValue}`,
        prize_value: Number(redemption.prizeValue),
        prize_type: redemption.prizeType,
        rank: redemption.assignedRank,
        won_date: redemption.scannedAt,
        status: redemption.status,
      },
      certificate_url: null,
    });
  } catch (error) {
    next(error);
  }
};

