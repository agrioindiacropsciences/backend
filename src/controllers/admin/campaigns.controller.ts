import { Response, NextFunction } from 'express';
import prisma from '../../lib/prisma';
import { sendSuccess, sendError } from '../../utils/response';
import { createCampaignSchema, updateCampaignSchema } from '../../utils/validation';
import { AdminRequest, ErrorCodes } from '../../types';
import { parsePagination, createPagination } from '../../utils/helpers';
import { Prisma } from '@prisma/client';
import { AppError } from '../../middleware/errorHandler';

// GET /api/v1/admin/campaigns
export const listCampaigns = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { page, limit, skip } = parsePagination(
      req.query.page as string,
      req.query.limit as string
    );

    const isActive = req.query.is_active as string | undefined;

    const where: Prisma.CampaignWhereInput = {};

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        include: {
          tiers: {
            orderBy: { priority: 'asc' },
          },
          _count: {
            select: { coupons: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.campaign.count({ where }),
    ]);

    sendSuccess(res, {
      campaigns: campaigns.map(c => ({
        id: c.id,
        name: c.name,
        name_hi: c.nameHi,
        description: c.description,
        start_date: c.startDate,
        end_date: c.endDate,
        is_active: c.isActive,
        distribution_type: c.distributionType,
        total_qr_codes: c.totalQrCodes,
        coupon_count: c._count.coupons,
        tiers: c.tiers.map(t => ({
          id: t.id,
          tier_name: t.tierName,
          reward_name: t.rewardName,
          reward_name_hi: t.rewardNameHi,
          reward_type: t.rewardType,
          reward_value: Number(t.rewardValue),
          probability: Number(t.probability),
          priority: t.priority,
          max_winners: t.maxWinners,
          current_winners: t.currentWinners,
        })),
        created_at: c.createdAt,
        updated_at: c.updatedAt,
      })),
      pagination: createPagination(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/admin/campaigns/:id
export const getCampaign = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { id } = req.params;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        tiers: {
          orderBy: { priority: 'asc' },
        },
        _count: {
          select: { coupons: true },
        },
      },
    });

    if (!campaign) {
      return sendError(res, ErrorCodes.NOT_FOUND, 'Campaign not found', 404);
    }

    sendSuccess(res, {
      id: campaign.id,
      name: campaign.name,
      name_hi: campaign.nameHi,
      description: campaign.description,
      start_date: campaign.startDate,
      end_date: campaign.endDate,
      is_active: campaign.isActive,
      distribution_type: campaign.distributionType,
      total_qr_codes: campaign.totalQrCodes,
      coupon_count: campaign._count.coupons,
      tiers: campaign.tiers.map(t => ({
        id: t.id,
        tier_name: t.tierName,
        reward_name: t.rewardName,
        reward_name_hi: t.rewardNameHi,
        reward_type: t.rewardType,
        reward_value: Number(t.rewardValue),
        probability: Number(t.probability),
        priority: t.priority,
        max_winners: t.maxWinners,
        current_winners: t.currentWinners,
      })),
      created_at: campaign.createdAt,
      updated_at: campaign.updatedAt,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/admin/campaigns
export const createCampaign = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const data = createCampaignSchema.parse(req.body);

    // Parse dates
    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);

    if (startDate >= endDate) {
      throw new AppError('End date must be after start date', ErrorCodes.VALIDATION_ERROR, 400);
    }

    // Validate probability sum (should be <= 1)
    const totalProbability = data.tiers.reduce((sum, tier) => sum + tier.probability, 0);
    if (totalProbability > 1) {
      throw new AppError('Total probability of all tiers cannot exceed 1', ErrorCodes.VALIDATION_ERROR, 400);
    }

    const campaign = await prisma.campaign.create({
      data: {
        name: data.name,
        nameHi: data.name_hi,
        description: data.description,
        startDate,
        endDate,
        distributionType: data.distribution_type,
        isActive: data.is_active,
        tiers: {
          create: data.tiers.map(tier => ({
            tierName: tier.tier_name,
            rewardName: tier.reward_name,
            rewardNameHi: tier.reward_name_hi,
            rewardType: tier.reward_type,
            rewardValue: tier.reward_value,
            probability: tier.probability,
            priority: tier.priority,
            maxWinners: tier.max_winners,
          })),
        },
      },
      include: {
        tiers: {
          orderBy: { priority: 'asc' },
        },
      },
    });

    sendSuccess(res, {
      id: campaign.id,
      name: campaign.name,
      name_hi: campaign.nameHi,
      description: campaign.description,
      start_date: campaign.startDate,
      end_date: campaign.endDate,
      is_active: campaign.isActive,
      distribution_type: campaign.distributionType,
      tiers: campaign.tiers.map(t => ({
        id: t.id,
        tier_name: t.tierName,
        reward_name: t.rewardName,
        reward_name_hi: t.rewardNameHi,
        reward_type: t.rewardType,
        reward_value: Number(t.rewardValue),
        probability: Number(t.probability),
        priority: t.priority,
        max_winners: t.maxWinners,
      })),
      created_at: campaign.createdAt,
    }, 'Campaign created successfully', 201);
  } catch (error) {
    next(error);
  }
};

// PUT /api/v1/admin/campaigns/:id
export const updateCampaign = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { id } = req.params;
    const data = updateCampaignSchema.parse(req.body);

    const updateData: Prisma.CampaignUpdateInput = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.name_hi !== undefined) updateData.nameHi = data.name_hi;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.start_date !== undefined) updateData.startDate = new Date(data.start_date);
    if (data.end_date !== undefined) updateData.endDate = new Date(data.end_date);
    if (data.distribution_type !== undefined) updateData.distributionType = data.distribution_type;
    if (data.is_active !== undefined) updateData.isActive = data.is_active;

    // Validate dates if both are being updated
    if (data.start_date && data.end_date) {
      const startDate = new Date(data.start_date);
      const endDate = new Date(data.end_date);
      if (startDate >= endDate) {
        throw new AppError('End date must be after start date', ErrorCodes.VALIDATION_ERROR, 400);
      }
    }

    const campaign = await prisma.campaign.update({
      where: { id },
      data: updateData,
      include: {
        tiers: {
          orderBy: { priority: 'asc' },
        },
      },
    });

    sendSuccess(res, {
      id: campaign.id,
      name: campaign.name,
      name_hi: campaign.nameHi,
      description: campaign.description,
      start_date: campaign.startDate,
      end_date: campaign.endDate,
      is_active: campaign.isActive,
      distribution_type: campaign.distributionType,
      tiers: campaign.tiers.map(t => ({
        id: t.id,
        tier_name: t.tierName,
        reward_name: t.rewardName,
        reward_name_hi: t.rewardNameHi,
        reward_type: t.rewardType,
        reward_value: Number(t.rewardValue),
        probability: Number(t.probability),
        priority: t.priority,
        max_winners: t.maxWinners,
      })),
      updated_at: campaign.updatedAt,
    }, 'Campaign updated successfully');
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/admin/campaigns/:id
export const deleteCampaign = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { id } = req.params;

    // Check if campaign has coupons
    const couponCount = await prisma.coupon.count({
      where: { campaignId: id },
    });

    if (couponCount > 0) {
      throw new AppError(
        `Cannot delete campaign with ${couponCount} existing coupons. Delete coupons first.`,
        ErrorCodes.VALIDATION_ERROR,
        400
      );
    }

    await prisma.campaign.delete({
      where: { id },
    });

    sendSuccess(res, null, 'Campaign deleted successfully');
  } catch (error) {
    next(error);
  }
};
