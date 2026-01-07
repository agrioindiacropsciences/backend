import { Response, NextFunction } from 'express';
import prisma from '../../lib/prisma';
import { sendSuccess, sendError } from '../../utils/response';
import { generateCouponsSchema } from '../../utils/validation';
import { AdminRequest, ErrorCodes } from '../../types';
import { parsePagination, createPagination, generateCouponCode, generateBatchId } from '../../utils/helpers';
import { Prisma } from '@prisma/client';

// GET /api/v1/admin/coupons
export const listCoupons = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { page, limit, skip } = parsePagination(
      req.query.page as string,
      req.query.limit as string
    );

    const code = req.query.code as string | undefined;
    const status = req.query.status as string | undefined;
    const productId = req.query.product_id as string | undefined;

    const where: Prisma.CouponWhereInput = {};

    if (code) {
      where.code = { contains: code.toUpperCase() };
    }

    if (status) {
      where.status = status.toUpperCase() as 'UNUSED' | 'USED' | 'EXPIRED';
    }

    if (productId) {
      where.productId = productId;
    }

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        include: {
          product: { select: { name: true } },
          campaign: { select: { name: true } },
          user: { select: { fullName: true, phoneNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.coupon.count({ where }),
    ]);

    sendSuccess(res, {
      coupons: coupons.map(c => ({
        id: c.id,
        code: c.code,
        product: c.product?.name,
        campaign: c.campaign?.name,
        batch_number: c.batchNumber,
        status: c.status,
        used_by: c.user ? {
          name: c.user.fullName,
          phone: c.user.phoneNumber,
        } : null,
        used_at: c.usedAt,
        expiry_date: c.expiryDate,
        created_at: c.createdAt,
      })),
      pagination: createPagination(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/admin/coupons/generate
export const generateCoupons = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const data = generateCouponsSchema.parse(req.body);

    const batchId = generateBatchId();
    const codes: string[] = [];
    const existingCodes = new Set<string>();

    // Get existing codes to avoid duplicates
    const existing = await prisma.coupon.findMany({
      select: { code: true },
    });
    existing.forEach(e => existingCodes.add(e.code));

    // Generate unique codes
    let attempts = 0;
    while (codes.length < data.count && attempts < data.count * 3) {
      const code = generateCouponCode(data.prefix);
      if (!existingCodes.has(code) && !codes.includes(code)) {
        codes.push(code);
      }
      attempts++;
    }

    if (codes.length < data.count) {
      return sendError(
        res,
        ErrorCodes.SERVER_ERROR,
        'Could not generate enough unique codes. Try a different prefix.',
        500
      );
    }

    // Parse expiry date
    const expiryDate = data.expiry_date ? new Date(data.expiry_date) : null;

    // Create coupons in batch
    await prisma.coupon.createMany({
      data: codes.map(code => ({
        code,
        productId: data.product_id || null,
        campaignId: data.campaign_id || null,
        batchNumber: batchId,
        status: 'UNUSED',
        expiryDate,
      })),
    });

    sendSuccess(res, {
      generated_count: codes.length,
      codes_preview: codes.slice(0, 5),
      batch_id: batchId,
    }, `${codes.length} coupons generated successfully`, 201);
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/admin/coupons/:id
export const getCouponDetails = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { id } = req.params;

    const coupon = await prisma.coupon.findUnique({
      where: { id },
      include: {
        product: true,
        campaign: {
          include: { tiers: true },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            email: true,
          },
        },
        redemptions: {
          include: {
            tier: true,
            distributor: { select: { businessName: true } },
          },
        },
      },
    });

    if (!coupon) {
      return sendError(res, ErrorCodes.NOT_FOUND, 'Coupon not found', 404);
    }

    sendSuccess(res, coupon);
  } catch (error) {
    next(error);
  }
};

