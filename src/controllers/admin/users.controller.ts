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
          crops: {
            include: { crop: { select: { name: true } } },
          },
          _count: {
            select: { redemptions: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    sendSuccess(res, {
      users: users.map(user => ({
        id: user.id,
        name: user.fullName,
        mobile: user.phoneNumber,
        email: user.email,
        location: user.district && user.state ? `${user.district}, ${user.state}` : null,
        crops: user.crops.map(c => c.crop.name),
        total_scans: user._count.redemptions,
        status: !user.isActive ? 'Suspended' : user.fullName ? 'Active' : 'Pending',
        joined_date: formatDate(user.createdAt),
      })),
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
          },
          orderBy: { scannedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!user) {
      return sendError(res, ErrorCodes.NOT_FOUND, 'User not found', 404);
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
      language: user.preferences?.prefLanguage || 'en',
      is_active: user.isActive,
      created_at: user.createdAt,
      last_login: user.lastLogin,
      crops: user.crops.map(c => ({
        id: c.crop.id,
        name: c.crop.name,
      })),
      recent_redemptions: user.redemptions.map(r => ({
        id: r.id,
        coupon_code: r.coupon.code,
        prize_type: r.prizeType,
        prize_value: Number(r.prizeValue),
        status: r.status,
        scanned_at: r.scannedAt,
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
    const { status, reason } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return sendError(res, ErrorCodes.NOT_FOUND, 'User not found', 404);
    }

    const isActive = status !== 'suspended';

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

