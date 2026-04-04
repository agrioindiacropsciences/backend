import { Response, NextFunction } from 'express';
import prisma from '../../lib/prisma';
import { sendSuccess, sendError } from '../../utils/response';
import { AdminRequest, ErrorCodes } from '../../types';
import { parsePagination, createPagination, sanitizeSearchQuery, formatDate } from '../../utils/helpers';
import { Prisma } from '@prisma/client';

// GET /api/v1/admin/users
export const listUsers = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { page, limit, skip } = parsePagination(
      req.query.page as string,
      req.query.limit as string
    );

    const searchQuery = req.query.q as string | undefined;
    const status = req.query.status as string | undefined;
    const state = req.query.state as string | undefined;

    const where: Prisma.UserWhereInput = {};

    if (searchQuery) {
      const sanitized = sanitizeSearchQuery(searchQuery);
      where.OR = [
        { fullName: { contains: sanitized, mode: 'insensitive' } },
        { phoneNumber: { contains: sanitized } },
        { email: { contains: sanitized, mode: 'insensitive' } },
      ];
    }

    if (status) {
      switch (status.toLowerCase()) {
        case 'active':
          where.isActive = true;
          where.fullName = { not: null };
          break;
        case 'pending':
          where.fullName = null;
          break;
        case 'suspended':
          where.isActive = false;
          break;
      }
    }

    if (state) {
      where.state = state;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          _count: {
            select: { redemptions: true },
          },
          redemptions: {
            include: {
              coupon: { select: { code: true } },
              productCoupon: { select: { serialNumber: true } },
            },
            take: 100,
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    sendSuccess(res, {
      users: users.map(user => {
        return {
          id: user.id,
          name: user.fullName,
          full_name: user.fullName,
          phone_number: user.phoneNumber,
          mobile: user.phoneNumber,
          email: user.email,
          pincode: user.pinCode,
          total_scans: user._count.redemptions,
          created_at: user.createdAt,
          profile_image_url: user.profileImageUrl,
          role: user.isActive ? 'Active' : 'SUSPENDED',
          is_active: user.isActive,
        };
      }),
      pagination: createPagination(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/admin/users/:id
export const getUserDetails = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        preferences: true,
        crops: {
          include: { crop: true },
        },
        redemptions: {
          include: {
            coupon: true,
            tier: true,
            productCoupon: true,
          },
          orderBy: { scannedAt: 'desc' },
          take: 100, // Fetch more to ensure we have room to deduplicate
        },
        _count: {
          select: { redemptions: true },
        },
      },
    });

    if (!user) {
      return sendError(res, ErrorCodes.NOT_FOUND, 'User not found', 404);
    }

    const claimedCount = await prisma.scanRedemption.count({
      where: { userId: id, status: { in: ['CLAIMED', 'VERIFIED'] } },
    });

    // Extremely robust deduplication using trimmed codes as primary key
    const uniqueRedemptionsMap = new Map();

    user.redemptions.forEach(r => {
      const rawCode = r.coupon?.code || r.productCoupon?.serialNumber;
      const cleanCode = (rawCode || '').trim();

      // Use code as the primary key for deduplication (what user sees)
      // Fallback to IDs only if code is missing
      const key = cleanCode || r.productCouponId || r.couponId || r.id;

      if (key) {
        const existing = uniqueRedemptionsMap.get(key);
        // Prioritize CLAIMED status
        const isBetterStatus = (r.status === 'CLAIMED' || r.status === 'VERIFIED') &&
          !(existing?.status === 'CLAIMED' || existing?.status === 'VERIFIED');

        if (!existing || isBetterStatus) {
          uniqueRedemptionsMap.set(key, r);
        }
      }
    });

    const dedupedRedemptions = Array.from(uniqueRedemptionsMap.values());

    // Recalculate counts based on unique redemptions
    const totalUniqueScans = dedupedRedemptions.length;
    const totalUniqueRewards = dedupedRedemptions.filter(r =>
      ['CLAIMED', 'VERIFIED'].includes(r.status)
    ).length;

    sendSuccess(res, {
      id: user.id,
      phone_number: user.phoneNumber,
      name: user.fullName,
      full_name: user.fullName,
      email: user.email,
      role: user.isActive ? 'Active' : 'SUSPENDED',
      pin_code: user.pinCode,
      pincode: user.pinCode,
      full_address: user.fullAddress,
      state: user.state,
      district: user.district,
      profile_image_url: user.profileImageUrl,
      language: user.preferences?.prefLanguage || 'en',
      is_active: user.isActive,
      created_at: user.createdAt,
      last_login: user.lastLogin,
      total_scans: totalUniqueScans,
      total_rewards: totalUniqueRewards,
      crops: user.crops.map(c => ({
        id: c.crop.id,
        name: c.crop.name,
      })),
      recent_redemptions: dedupedRedemptions.map(r => ({
        id: r.id,
        coupon_code: r.coupon?.code || r.productCoupon?.serialNumber || 'N/A',
        prize_type: r.prizeType,
        prize_value: Number(r.prizeValue),
        status: r.status,
        scanned_at: r.scannedAt,
        tier_name: r.tier?.rewardName || null,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/v1/admin/users/:id/status
export const updateUserStatus = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { id } = req.params;
    const { status, reason, is_active } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return sendError(res, ErrorCodes.NOT_FOUND, 'User not found', 404);
    }

    const isActive = is_active !== undefined ? is_active : status !== 'suspended';

    await prisma.user.update({
      where: { id },
      data: { isActive },
    });

    // Log the action (could be stored in an audit log table)
    console.log(`Admin ${req.adminId} ${isActive ? 'activated' : 'suspended'} user ${id}. Reason: ${reason || 'Not specified'}`);

    sendSuccess(res, { isActive }, `User ${isActive ? 'activated' : 'suspended'} successfully`);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/admin/users/:id
export const deleteUser = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return sendError(res, ErrorCodes.NOT_FOUND, 'User not found', 404);
    }

    // Use a transaction to delete all related data first
    await prisma.$transaction(async (tx) => {
      const distributor = await tx.distributor.findUnique({
        where: { ownerId: id },
        select: { id: true },
      });

      if (distributor) {
        await tx.scanRedemption.updateMany({
          where: { verifiedByDistributorId: distributor.id },
          data: { verifiedByDistributorId: null },
        });

        await tx.distributor.delete({
          where: { id: distributor.id },
        });
      }

      // 1. Delete Refresh Tokens
      await tx.refreshToken.deleteMany({ where: { userId: id } });

      // 2. Delete User Preferences
      await tx.userPreference.deleteMany({ where: { userId: id } });

      // 3. Delete User Crops
      await tx.userCrop.deleteMany({ where: { userId: id } });

      // 4. Delete Notifications
      await tx.notification.deleteMany({ where: { userId: id } });

      // 5. Delete Support Tickets
      await tx.supportTicket.deleteMany({ where: { userId: id } });

      // 6. Delete Scan Redemptions (This might be risky if we want to keep history, but for full delete we proceed)
      await tx.scanRedemption.deleteMany({ where: { userId: id } });

      // 7. Update Coupons used by user to null (or delete if business logic dictates)
      // Here we set usedBy to null to keep the coupon record but disassociate user
      await tx.coupon.updateMany({
        where: { usedBy: id },
        data: { usedBy: null, usedAt: null, status: 'UNUSED' }
      });

      // 8. Finally delete the user
      await tx.user.delete({ where: { id } });
    });

    console.log(`Admin ${req.adminId} deleted user ${id} and all associated data.`);

    sendSuccess(res, null, 'User and all associated data deleted successfully');
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/admin/users/export
export const exportUsers = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const format = (req.query.format as string) || 'csv';

    const users = await prisma.user.findMany({
      include: {
        crops: {
          include: { crop: { select: { name: true } } },
        },
        _count: {
          select: { redemptions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (format === 'csv') {
      const csvHeader = 'ID,Name,Phone,Email,State,District,Crops,Total Scans,Status,Joined Date\n';
      const csvData = users.map(user =>
        `${user.id},${user.fullName || ''},${user.phoneNumber},${user.email || ''},${user.state || ''},${user.district || ''},"${user.crops.map(c => c.crop.name).join(', ')}",${user._count.redemptions},${user.isActive ? 'Active' : 'Suspended'},${formatDate(user.createdAt)}`
      ).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=users-export-${Date.now()}.csv`);
      res.send(csvHeader + csvData);
      return;
    }

    // Default to JSON
    sendSuccess(res, { users });
  } catch (error) {
    next(error);
  }
};
