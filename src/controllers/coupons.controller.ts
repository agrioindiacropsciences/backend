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
  try {
    const { coupon_code } = verifyCouponSchema.parse(req.body);

    // Find coupon
    const coupon = await prisma.coupon.findUnique({
      where: { code: coupon_code.toUpperCase() },
      include: {
        product: {
          select: { id: true, name: true, nameHi: true },
        },
        campaign: {
          include: {
            tiers: {
              orderBy: { probability: 'desc' },
            },
          },
        },
      },
    });

    if (!coupon) {
      throw new AppError(
        'This coupon code is invalid.',
        ErrorCodes.COUPON_INVALID,
        400
      );
    }

    if (coupon.status === 'USED') {
      throw new AppError(
        'This coupon code has already been used.',
        ErrorCodes.COUPON_USED,
        400
      );
    }

    if (coupon.status === 'EXPIRED' || (coupon.expiryDate && coupon.expiryDate < new Date())) {
      throw new AppError(
        'This coupon code has expired.',
        ErrorCodes.COUPON_EXPIRED,
        400
      );
    }

    // Determine prize tier (random selection based on probability)
    let selectedTier = null;
    if (coupon.campaign && coupon.campaign.tiers.length > 0) {
      const tiers = coupon.campaign.tiers;
      const rand = Math.random();
      let cumulative = 0;
      
      for (const tier of tiers) {
        cumulative += Number(tier.probability);
        if (rand <= cumulative) {
          // Check if max winners reached
          if (!tier.maxWinners || tier.currentWinners < tier.maxWinners) {
            selectedTier = tier;
            break;
          }
        }
      }
      
      // Fallback to last tier if no tier selected
      if (!selectedTier && tiers.length > 0) {
        selectedTier = tiers[tiers.length - 1];
      }
    }

    sendSuccess(res, {
      is_valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        product: coupon.product ? {
          id: coupon.product.id,
          name: coupon.product.name,
        } : null,
        batch_number: coupon.batchNumber,
      },
      campaign: coupon.campaign ? {
        id: coupon.campaign.id,
        name: coupon.campaign.name,
        tier: selectedTier ? {
          id: selectedTier.id,
          reward_name: selectedTier.rewardName,
          reward_name_hi: selectedTier.rewardNameHi,
          reward_type: selectedTier.rewardType,
          reward_value: Number(selectedTier.rewardValue),
        } : null,
      } : null,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/coupons/redeem
export const redeemCoupon = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { coupon_id, campaign_tier_id } = redeemCouponSchema.parse(req.body);
    const userId = req.userId!;

    // Find and validate coupon
    const coupon = await prisma.coupon.findUnique({
      where: { id: coupon_id },
      include: {
        campaign: true,
      },
    });

    if (!coupon) {
      throw new AppError('Coupon not found', ErrorCodes.COUPON_INVALID, 400);
    }

    if (coupon.status !== 'UNUSED') {
      throw new AppError(
        'This coupon has already been used or expired.',
        ErrorCodes.COUPON_USED,
        400
      );
    }

    // Find campaign tier
    const tier = await prisma.campaignTier.findUnique({
      where: { id: campaign_tier_id },
    });

    if (!tier) {
      throw new AppError('Invalid prize tier', ErrorCodes.VALIDATION_ERROR, 400);
    }

    // Use transaction to update coupon and create redemption
    const result = await prisma.$transaction(async (tx) => {
      // Update coupon status
      await tx.coupon.update({
        where: { id: coupon_id },
        data: {
          status: 'USED',
          usedBy: userId,
          usedAt: new Date(),
        },
      });

      // Increment tier winner count
      const updatedTier = await tx.campaignTier.update({
        where: { id: campaign_tier_id },
        data: { currentWinners: { increment: 1 } },
      });

      // Create redemption record
      const redemption = await tx.scanRedemption.create({
        data: {
          userId,
          couponId: coupon_id,
          campaignTierId: campaign_tier_id,
          prizeType: tier.rewardType,
          prizeValue: tier.rewardValue,
          assignedRank: updatedTier.currentWinners,
          status: 'PENDING_VERIFICATION',
        },
      });

      return { redemption, rank: updatedTier.currentWinners };
    });

    // Create notification for user
    await prisma.notification.create({
      data: {
        userId,
        type: 'REWARD',
        title: `Congratulations! You won ${tier.rewardName}`,
        titleHi: tier.rewardNameHi ? `बधाई हो! आपने जीता ${tier.rewardNameHi}` : undefined,
        message: `Your reward from coupon ${coupon.code} is pending verification.`,
        messageHi: `कूपन ${coupon.code} से आपका इनाम सत्यापन के लिए लंबित है।`,
        data: { redemption_id: result.redemption.id, coupon_id },
      },
    });

    sendSuccess(res, {
      redemption: {
        id: result.redemption.id,
        coupon_code: coupon.code,
        prize: {
          name: tier.rewardName,
          name_hi: tier.rewardNameHi,
          description: `Get ${tier.rewardType.toLowerCase()} worth ₹${tier.rewardValue}`,
          type: tier.rewardType,
          value: Number(tier.rewardValue),
        },
        status: 'PENDING_VERIFICATION',
        assigned_rank: result.rank,
        rank_display: `${getOrdinalSuffix(result.rank)} Winner`,
        redeemed_at: result.redemption.scannedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

