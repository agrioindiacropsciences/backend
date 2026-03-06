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

    // ProductCoupon doesn't have productId directly
    // const productId = req.query.product_id as string | undefined;

    const where: Prisma.ProductCouponWhereInput = {};

    if (code) {
      where.serialNumber = { contains: code }; // User searches serial
    }

    if (status) {
      if (status.toUpperCase() === 'USED') {
        where.isRedeemed = true;
      } else if (status.toUpperCase() === 'UNUSED') {
        where.isRedeemed = false;
      }
    }

    const [coupons, total] = await Promise.all([
      prisma.productCoupon.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, phoneNumber: true, profileImageUrl: true } },
          redemptions: {
            include: {
              tier: {
                include: { campaign: { select: { name: true } } }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.productCoupon.count({ where }),
    ]);

    sendSuccess(res, {
      coupons: coupons.map(c => {
        const redemption = c.redemptions?.[0];
        const tier = redemption?.tier;
        const campaignName = tier?.campaign?.name;

        const user = (c as any).user;


        return {
          id: c.id,
          code: c.serialNumber, // Map Serial to Code
          product: null, // Product link not direct in new schema
          campaign: campaignName || null,
          batch_number: c.batchNumber,
          status: c.isRedeemed ? 'USED' : 'UNUSED',
          is_used: c.isRedeemed,
          reward_type: redemption?.prizeType || null,
          reward_value: redemption?.prizeValue ? Number(redemption.prizeValue) : null,
          reward_image: tier?.imageUrl || null,
          used_by: user ? { id: user.id || null, name: user.fullName, phone: user.phoneNumber, phone_number: user.phoneNumber, image: user.profileImageUrl } : null,
          redeemed_by: user ? { id: user.id || null, name: user.fullName, phone: user.phoneNumber, phone_number: user.phoneNumber, image: user.profileImageUrl } : null,
          used_at: c.redeemedAt,
          expiry_date: null,
          created_at: c.createdAt,
          auth_code: c.authCode,
          serial_number: c.serialNumber,
          is_scratched: redemption?.isScratched || false,
          scanned_at: redemption?.scannedAt || null,
          scratched_at: redemption?.scratchedAt || null,
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

    const coupon = await prisma.productCoupon.findUnique({ where: { id } });
    if (!coupon) {
      return sendError(res, ErrorCodes.NOT_FOUND, 'Coupon not found', 404);
    }

    if (coupon.isRedeemed) {
      return sendError(res, ErrorCodes.VALIDATION_ERROR, 'Cannot delete a used coupon', 400);
    }

    await prisma.productCoupon.delete({ where: { id } });
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

    const result = await prisma.productCoupon.deleteMany({
      where: {
        id: { in: ids },
        isRedeemed: false,
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

    const coupon = await prisma.productCoupon.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            email: true,
            profileImageUrl: true,
          },
        },
        redemptions: {
          include: {
            tier: {
              include: { campaign: true }
            },
            // distributor: { select: { businessName: true } }, // if linked
          },
        },
      },
    });

    if (!coupon) {
      return sendError(res, ErrorCodes.NOT_FOUND, 'Coupon not found', 404);
    }

    const redemption = coupon.redemptions?.[0];
    const tier = redemption?.tier;
    const user = (coupon as any).user;

    sendSuccess(res, {
      id: coupon.id,
      code: coupon.serialNumber,
      product: null,
      campaign: tier?.campaign?.name || null,
      batch_number: coupon.batchNumber,
      status: coupon.isRedeemed ? 'USED' : 'UNUSED',
      is_used: coupon.isRedeemed,
      reward_type: tier?.rewardType || null,
      reward_value: tier?.rewardValue ? Number(tier.rewardValue) : null,
      reward_image: tier?.imageUrl || null,
      used_by: user ? { id: user.id, name: user.fullName, phone: user.phoneNumber, phone_number: user.phoneNumber, image: user.profileImageUrl } : null,
      redeemed_by: user ? { id: user.id, name: user.fullName, phone: user.phoneNumber, phone_number: user.phoneNumber, image: user.profileImageUrl } : null,
      used_at: coupon.redeemedAt,
      expiry_date: null,
      created_at: coupon.createdAt,
      auth_code: coupon.authCode,
      serial_number: coupon.serialNumber,
      is_scratched: redemption?.isScratched || false,
      scanned_at: redemption?.scannedAt || null,
      scratched_at: redemption?.scratchedAt || null,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/admin/coupons/batches
export const listBatches = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    console.log('[AdminCoupons] Fetching batch inventory summary...');
    // 1. Get unique batch numbers and their counts
    const batchGroups = await prisma.productCoupon.groupBy({
      by: ['batchNumber'],
      _count: { id: true },
      _min: { createdAt: true },
    });

    console.log(`[AdminCoupons] Found ${batchGroups.length} batch groups in DB.`);

    // EXTRA SAFETY: If there are null batchNumber coupons but they weren't in groups (shouldn't happen but let's be safe)
    const hasNullInGroups = batchGroups.some(g => g.batchNumber === null);
    if (!hasNullInGroups) {
      const nullCount = await prisma.productCoupon.count({ where: { batchNumber: null } });
      if (nullCount > 0) {
        console.log(`[AdminCoupons] Manually adding UNCATEGORIZED group for ${nullCount} items`);
        const oldestNull = await prisma.productCoupon.findFirst({
          where: { batchNumber: null },
          orderBy: { createdAt: 'asc' },
          select: { createdAt: true }
        });
        batchGroups.push({
          batchNumber: null,
          _count: { id: nullCount },
          _min: { createdAt: oldestNull?.createdAt || new Date() }
        });
      }
    }

    // 2. Get redeemed counts for each batch in parallel
    const batchDetails = await Promise.all(
      batchGroups.map(async (group) => {
        const batchName = group.batchNumber || 'UNCATEGORIZED';

        const redeemedCount = await prisma.productCoupon.count({
          where: {
            batchNumber: group.batchNumber, // Works for null too
            isRedeemed: true,
          },
        });

        return {
          batch_number: batchName,
          total_count: group._count.id,
          redeemed_count: redeemedCount,
          created_at: group._min.createdAt || new Date(),
        };
      })
    );

    // Sort by date descending
    batchDetails.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    console.log(`[AdminCoupons] Returning ${batchDetails.length} batches to frontend.`);
    sendSuccess(res, batchDetails, 'Batches retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/admin/coupons/batches/:batchNumber
export const deleteBatch = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { batchNumber } = req.params;
    const targetBatch = batchNumber === 'UNCATEGORIZED' ? null : batchNumber;

    const redeemedCount = await prisma.productCoupon.count({
      where: { batchNumber: targetBatch, isRedeemed: true },
    });

    if (redeemedCount > 0) {
      return sendError(res, ErrorCodes.VALIDATION_ERROR, 'Cannot delete batch with redeemed coupons', 400);
    }

    const result = await prisma.productCoupon.deleteMany({
      where: { batchNumber: targetBatch },
    });

    sendSuccess(res, { deleted_count: result.count }, `Batch ${batchNumber} deleted successfully`);
  } catch (error) {
    next(error);
  }
};
