import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { createProfileSchema, updateProfileSchema, updateLanguageSchema, syncCropsSchema } from '../utils/validation';
import { AuthenticatedRequest, ErrorCodes } from '../types';
import { AppError } from '../middleware/errorHandler';
import { parsePagination, createPagination } from '../utils/helpers';
import { uploadToCloudinary } from '../utils/cloudinary';

// GET /api/v1/user/profile
export const getProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      include: {
        preferences: true,
        crops: {
          include: { crop: true },
        },
      },
    });

    if (!user) {
      throw new AppError('User not found', ErrorCodes.NOT_FOUND, 404);
    }

    sendSuccess(res, {
      id: user.id,
      phone_number: user.phoneNumber,
      full_name: user.fullName,
      email: user.email,
      role: user.role,
      pin_code: user.pinCode,
      full_address: user.fullAddress,
      state: user.state,
      district: user.district,
      profile_image_url: user.profileImageUrl,
      language: user.preferences?.prefLanguage || 'en',
      crop_preferences: user.crops.map(uc => ({
        id: uc.crop.id,
        name: uc.crop.name,
        name_hi: uc.crop.nameHi,
      })),
      is_active: user.isActive,
      created_at: user.createdAt,
      last_login: user.lastLogin,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/user/profile (Create/Complete profile)
export const createProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const data = createProfileSchema.parse(req.body);

    // Lookup state/district from pincode
    let state: string | undefined;
    let district: string | undefined;

    const pincodeData = await prisma.pincodeData.findUnique({
      where: { pincode: data.pin_code },
    });

    if (pincodeData) {
      state = data.state || pincodeData.state;
      district = data.district || pincodeData.district;
    } else {
      state = data.state;
      district = data.district;
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.userId! },
      data: {
        fullName: data.full_name,
        email: data.email || null,
        pinCode: data.pin_code,
        fullAddress: data.full_address,
        state,
        district,
      },
    });

    sendSuccess(res, {
      id: updatedUser.id,
      phone_number: updatedUser.phoneNumber,
      full_name: updatedUser.fullName,
      pin_code: updatedUser.pinCode,
      state: updatedUser.state,
      district: updatedUser.district,
      profile_image_url: updatedUser.profileImageUrl,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/v1/user/profile
export const updateProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const data = updateProfileSchema.parse(req.body);

    const updateData: Record<string, unknown> = {};

    if (data.full_name !== undefined) updateData.fullName = data.full_name;
    if (data.email !== undefined) updateData.email = data.email || null;
    if (data.full_address !== undefined) updateData.fullAddress = data.full_address;
    if (data.state !== undefined) updateData.state = data.state;
    if (data.district !== undefined) updateData.district = data.district;


    // If pincode changed, lookup state/district
    if (data.pin_code) {
      updateData.pinCode = data.pin_code;
      const pincodeData = await prisma.pincodeData.findUnique({
        where: { pincode: data.pin_code },
      });
      if (pincodeData) {
        updateData.state = pincodeData.state;
        updateData.district = pincodeData.district;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.userId! },
      data: updateData,
    });

    sendSuccess(res, {
      id: updatedUser.id,
      phone_number: updatedUser.phoneNumber,
      full_name: updatedUser.fullName,
      email: updatedUser.email,
      pin_code: updatedUser.pinCode,
      full_address: updatedUser.fullAddress,
      state: updatedUser.state,
      district: updatedUser.district,
      profile_image_url: updatedUser.profileImageUrl,
    }, 'Profile updated successfully');
  } catch (error) {
    next(error);
  }
};

// PUT /api/v1/user/language
export const updateLanguage = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { language } = updateLanguageSchema.parse(req.body);

    await prisma.userPreference.upsert({
      where: { userId: req.userId! },
      update: { prefLanguage: language },
      create: {
        userId: req.userId!,
        prefLanguage: language,
      },
    });

    sendSuccess(res, { language }, 'Language preference updated');
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/user/stats
export const getStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const userId = req.userId!;

    // Get scan statistics
    const [totalScans, redemptions, lastScan] = await Promise.all([
      prisma.scanRedemption.count({ where: { userId } }),
      prisma.scanRedemption.findMany({
        where: { userId },
        select: { prizeValue: true, status: true, scannedAt: true },
      }),
      prisma.scanRedemption.findFirst({
        where: { userId },
        orderBy: { scannedAt: 'desc' },
        select: { scannedAt: true },
      }),
    ]);

    const couponsWon = redemptions.length;
    const rewardsClaimed = redemptions.filter(r => r.status === 'CLAIMED').length;
    const totalSavings = redemptions.reduce((sum, r) => sum + Number(r.prizeValue), 0);

    sendSuccess(res, {
      total_scans: totalScans,
      coupons_won: couponsWon,
      rewards_claimed: rewardsClaimed,
      last_scan_date: lastScan?.scannedAt || null,
      total_savings: totalSavings,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/user/crops
export const getCropPreferences = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const userCrops = await prisma.userCrop.findMany({
      where: { userId: req.userId! },
      include: { crop: true },
    });

    sendSuccess(res, {
      crop_ids: userCrops.map(uc => uc.cropId),
      crops: userCrops.map(uc => ({
        id: uc.crop.id,
        name: uc.crop.name,
        name_hi: uc.crop.nameHi,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/user/crops
export const syncCropPreferences = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { crop_ids } = syncCropsSchema.parse(req.body);

    // Validate all crop IDs exist
    const existingCrops = await prisma.crop.findMany({
      where: { id: { in: crop_ids }, isActive: true },
      select: { id: true },
    });

    const validCropIds = existingCrops.map(c => c.id);
    const invalidCropIds = crop_ids.filter(id => !validCropIds.includes(id));

    if (invalidCropIds.length > 0) {
      throw new AppError(
        `Invalid crop IDs: ${invalidCropIds.join(', ')}`,
        ErrorCodes.VALIDATION_ERROR,
        400
      );
    }

    // Delete existing preferences and create new ones
    await prisma.$transaction([
      prisma.userCrop.deleteMany({ where: { userId: req.userId! } }),
      prisma.userCrop.createMany({
        data: validCropIds.map(cropId => ({
          userId: req.userId!,
          cropId,
        })),
      }),
    ]);

    sendSuccess(res, undefined, 'Crop preferences updated successfully');
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/user/coupons
export const getCouponHistory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { page, limit, skip } = parsePagination(
      req.query.page as string,
      req.query.limit as string
    );

    const statusFilter = req.query.status as string | undefined;

    const where: Record<string, unknown> = { usedBy: req.userId! };
    if (statusFilter) {
      where.status = statusFilter.toUpperCase();
    }

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        include: {
          product: { select: { name: true, nameHi: true } },
          redemptions: {
            include: {
              tier: { select: { rewardName: true, rewardNameHi: true, rewardType: true, rewardValue: true } },
            },
          },
        },
        orderBy: { usedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.coupon.count({ where }),
    ]);

    const formattedCoupons = coupons.map(coupon => ({
      id: coupon.id,
      code: coupon.code,
      product_name: coupon.product?.name,
      prize: coupon.redemptions[0]?.tier ? {
        name: coupon.redemptions[0].tier.rewardName,
        type: coupon.redemptions[0].tier.rewardType,
        value: Number(coupon.redemptions[0].tier.rewardValue),
      } : null,
      status: coupon.status,
      scanned_at: coupon.usedAt,
      redeemed_at: coupon.redemptions[0]?.scannedAt,
    }));

    sendSuccess(res, {
      coupons: formattedCoupons,
      pagination: createPagination(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/user/rewards
export const getRewards = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { page, limit, skip } = parsePagination(
      req.query.page as string,
      req.query.limit as string
    );

    const statusFilter = req.query.status as string | undefined;

    const where: Record<string, unknown> = { userId: req.userId! };
    if (statusFilter) {
      where.status = statusFilter.toUpperCase();
    }

    const [redemptions, total, summary] = await Promise.all([
      prisma.scanRedemption.findMany({
        where,
        include: {
          coupon: { select: { code: true } },
          tier: true,
          distributor: { select: { id: true, businessName: true } },
        },
        orderBy: { scannedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.scanRedemption.count({ where }),
      prisma.scanRedemption.groupBy({
        by: ['status'],
        where: { userId: req.userId! },
        _count: true,
        _sum: { prizeValue: true },
      }),
    ]);

    const formattedRewards = redemptions.map(r => ({
      id: r.id,
      coupon_code: r.coupon.code,
      prize: r.tier ? {
        id: r.tier.id,
        name: r.tier.rewardName,
        name_hi: r.tier.rewardNameHi,
        type: r.tier.rewardType,
        value: Number(r.tier.rewardValue),
      } : {
        type: r.prizeType,
        value: Number(r.prizeValue),
      },
      status: r.status,
      won_at: r.scannedAt,
      redeemed_at: r.claimedAt,
      acknowledgment_file_url: r.acknowledgmentFileUrl,
      verified_by_distributor: r.distributor ? {
        id: r.distributor.id,
        name: r.distributor.businessName,
      } : null,
    }));

    const totalRewards = summary.reduce((sum, s) => sum + s._count, 0);
    const pending = summary.find(s => s.status === 'PENDING_VERIFICATION')?._count || 0;
    const redeemed = summary.find(s => s.status === 'CLAIMED')?._count || 0;
    const totalValue = summary.reduce((sum, s) => sum + Number(s._sum.prizeValue || 0), 0);

    sendSuccess(res, {
      rewards: formattedRewards,
      summary: {
        total_rewards: totalRewards,
        pending,
        redeemed,
        total_value: totalValue,
      },
      pagination: createPagination(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/user/profile/avatar
export const updateAvatar = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    if (!req.file) {
      throw new AppError('No file uploaded', ErrorCodes.VALIDATION_ERROR, 400);
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.path, 'user_profiles');
    const imageUrl = result.url;

    const updatedUser = await prisma.user.update({
      where: { id: req.userId! },
      data: { profileImageUrl: imageUrl },
    });

    sendSuccess(res, {
      profile_image_url: updatedUser.profileImageUrl,
    }, 'Avatar updated successfully');

  } catch (error) {
    next(error);
  }
};



