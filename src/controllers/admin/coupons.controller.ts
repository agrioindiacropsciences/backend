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
          product: { select: { id: true, name: true } },
          campaign: { include: { tiers: { take: 1, orderBy: { priority: 'asc' } } } },
          user: { select: { fullName: true, phoneNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.coupon.count({ where }),
    ]);

    sendSuccess(res, {
      coupons: coupons.map(c => {
        const tier = (c.campaign as any)?.tiers?.[0];
        return {
          id: c.id,
          code: c.code,
          product: c.product ? { id: c.product.id, name: c.product.name } : null,
          campaign: c.campaign?.name,
          batch_number: c.batchNumber,
          status: c.status,
          is_used: c.status === 'USED',
          reward_type: tier?.rewardType || null,
          reward_value: tier?.rewardValue ? Number(tier.rewardValue) : null,
          used_by: c.user ? { name: c.user.fullName, phone: c.user.phoneNumber } : null,
          redeemed_by: c.user ? { name: c.user.fullName, phone: c.user.phoneNumber } : null,
          used_at: c.usedAt,
          expiry_date: c.expiryDate,
          created_at: c.createdAt,
        };
      }),
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

    if (!data.campaign_id) {
      return sendError(res, ErrorCodes.VALIDATION_ERROR, 'Campaign ID is required for QR generation', 400);
    }

    const batchId = generateBatchId();

    // Use QrService for efficient batch generation
    // We import usage dynamically or at top. 
    // Since I cannot change imports easily with replace_file_content without context of top file,
    // I will assume I need to likely add the import `import QrService from '../../services/QrService';` at the top 
    // OR just use it if I update the file content.
    // Replace limitation: I must act on contiguous block.
    // I'll update the function body to call QrService.

    // I need to import QrService. I'll do a multi_replace to add import and update function.

    // Wait, let's look at the plan again. I need to replace the WHOLE file content or use multi_replace.
    // Using multi_replace is safer.

    const expiryDate = data.expiry_date ? new Date(data.expiry_date) : undefined;
    const result = await import('../../services/QrService').then(m =>
      m.default.generateBatch(data.campaign_id!, data.count, batchId, data.product_id, expiryDate)
    );

    sendSuccess(res, {
      generated_count: result.count,
      batch_id: batchId,
      campaign_id: data.campaign_id
    }, `${result.count} QR codes generated successfully for campaign`, 201);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/admin/coupons/:id
export const deleteCoupon = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { id } = req.params;

    const coupon = await prisma.coupon.findUnique({ where: { id } });
    if (!coupon) {
      return sendError(res, ErrorCodes.NOT_FOUND, 'Coupon not found', 404);
    }

    if (coupon.status === 'USED') {
      return sendError(res, ErrorCodes.VALIDATION_ERROR, 'Cannot delete a used coupon', 400);
    }

    await prisma.coupon.delete({ where: { id } });
    sendSuccess(res, undefined, 'Coupon deleted successfully');
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/admin/coupons/delete-bulk
export const deleteCouponsBulk = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { ids } = req.body as { ids: string[] };

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return sendError(res, ErrorCodes.VALIDATION_ERROR, 'Coupon IDs are required', 400);
    }

    const result = await prisma.coupon.deleteMany({
      where: {
        id: { in: ids },
        status: 'UNUSED',
      },
    });

    sendSuccess(res, { deleted_count: result.count }, `${result.count} coupon(s) deleted successfully`);
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

