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
          image_url: t.imageUrl,
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
        image_url: t.imageUrl,
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
        totalQrCodes: data.total_qr_codes || 0,
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
            imageUrl: (tier as any).image_url || null,
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
        current_winners: t.currentWinners,
        image_url: t.imageUrl,
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
    if (data.total_qr_codes !== undefined) updateData.totalQrCodes = data.total_qr_codes;

    // Validate dates if both are being updated
    if (data.start_date && data.end_date) {
      const startDate = new Date(data.start_date);
      const endDate = new Date(data.end_date);
      if (startDate >= endDate) {
        throw new AppError('End date must be after start date', ErrorCodes.VALIDATION_ERROR, 400);
      }
    }

    let campaign;

    if (data.tiers) {
      const inputTiers = data.tiers;
      // Update with tiers management
      campaign = await prisma.$transaction(async (tx) => {
        // 1. Update Campaign Details
        await tx.campaign.update({
          where: { id },
          data: updateData,
        });

        // 2. Handle Tiers
        const keptTierIds: string[] = [];

        for (const tierData of inputTiers) {
          if (tierData.id) {
            // Update existing tier
            await tx.campaignTier.update({
              where: { id: tierData.id },
              data: {
                tierName: tierData.tier_name,
                rewardName: tierData.reward_name,
                rewardNameHi: tierData.reward_name_hi,
                rewardType: tierData.reward_type,
                rewardValue: tierData.reward_value,
                probability: tierData.probability,
                priority: tierData.priority,
                maxWinners: tierData.max_winners,
                imageUrl: (tierData as any).image_url || null,
              },
            });
            keptTierIds.push(tierData.id);
          } else {
            // Create new tier
            const newTier = await tx.campaignTier.create({
              data: {
                campaignId: id,
                tierName: tierData.tier_name,
                rewardName: tierData.reward_name,
                rewardNameHi: tierData.reward_name_hi,
                rewardType: tierData.reward_type,
                rewardValue: tierData.reward_value,
                probability: tierData.probability,
                priority: tierData.priority,
                maxWinners: tierData.max_winners,
                imageUrl: (tierData as any).image_url || null,
              },
            });
            keptTierIds.push(newTier.id);
          }
        }

        // 3. Delete removed tiers (only if no redemptions)
        const tiersToDelete = await tx.campaignTier.findMany({
          where: {
            campaignId: id,
            id: { notIn: keptTierIds },
          },
          select: { id: true, _count: { select: { redemptions: true } } },
        });

        for (const tier of tiersToDelete) {
          if (tier._count.redemptions > 0) {
            throw new AppError(
              `Cannot delete tier (ID: ${tier.id}) because it has existing redemptions. Please mark campaign inactive instead.`,
              ErrorCodes.CONFLICT,
              409
            );
          }
          await tx.campaignTier.delete({ where: { id: tier.id } });
        }

        return tx.campaign.findUnique({
          where: { id },
          include: {
            tiers: { orderBy: { priority: 'asc' } },
          },
        });
      });
    } else {
      // Simple update without tiers
      campaign = await prisma.campaign.update({
        where: { id },
        data: updateData,
        include: {
          tiers: {
            orderBy: { priority: 'asc' },
          },
        },
      });
    }

    if (!campaign) {
      return sendError(res, ErrorCodes.NOT_FOUND, 'Campaign not found after update', 404);
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
        image_url: t.imageUrl,
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

    // Use a transaction to ensure atomic deletion of all associated data
    await prisma.$transaction(async (tx) => {
      // 1. Get all coupon IDs for this campaign
      const coupons = await tx.coupon.findMany({
        where: { campaignId: id },
        select: { id: true }
      });
      const couponIds = coupons.map(c => c.id);

      // 2. Get all tier IDs for this campaign
      const tiers = await tx.campaignTier.findMany({
        where: { campaignId: id },
        select: { id: true }
      });
      const tierIds = tiers.map(t => t.id);

      // 3. Clear scan redemptions linked to coupons or tiers
      if (couponIds.length > 0 || tierIds.length > 0) {
        await tx.scanRedemption.deleteMany({
          where: {
            OR: [
              { couponId: { in: couponIds } },
              { campaignTierId: { in: tierIds } }
            ]
          }
        });
      }

      // 4. Delete associated coupons
      if (couponIds.length > 0) {
        await tx.coupon.deleteMany({
          where: { campaignId: id }
        });
      }

      // 5. Delete the campaign (tiers will be deleted via Cascade in schema if available, but for safety handled by campaign delete)
      await tx.campaign.delete({
        where: { id }
      });
    });

    sendSuccess(res, null, 'Campaign and all associated data deleted successfully');
  } catch (error) {
    next(error);
  }
};
