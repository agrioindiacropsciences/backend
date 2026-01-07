import { Response, NextFunction } from 'express';
import prisma from '../../lib/prisma';
import { sendSuccess, sendError } from '../../utils/response';
import { AdminRequest, ErrorCodes } from '../../types';
import { formatDate } from '../../utils/helpers';

// GET /api/v1/admin/reports/:type
export const getReportData = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { type } = req.params;
    const startDate = req.query.start_date ? new Date(req.query.start_date as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.end_date ? new Date(req.query.end_date as string) : new Date();
    const groupBy = (req.query.group_by as string) || 'day';

    let data: unknown;

    switch (type) {
      case 'users':
        data = await getUsersReport(startDate, endDate, groupBy);
        break;
      case 'scans':
        data = await getScansReport(startDate, endDate, groupBy);
        break;
      case 'coupons':
        data = await getCouponsReport(startDate, endDate);
        break;
      case 'products':
        data = await getProductsReport();
        break;
      case 'distributors':
        data = await getDistributorsReport();
        break;
      default:
        return sendError(res, ErrorCodes.NOT_FOUND, 'Report type not found', 404);
    }

    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/admin/reports/:type/export
export const exportReport = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { type } = req.params;
    const format = (req.query.format as string) || 'csv';

    // For now, redirect to the main report endpoint
    // In production, this would generate downloadable files
    return sendError(
      res,
      ErrorCodes.NOT_FOUND,
      'Export functionality coming soon. Use the main report endpoint.',
      501
    );
  } catch (error) {
    next(error);
  }
};

// Helper functions for reports
async function getUsersReport(startDate: Date, endDate: Date, groupBy: string) {
  const users = await prisma.user.groupBy({
    by: ['createdAt'],
    where: {
      createdAt: { gte: startDate, lte: endDate },
    },
    _count: true,
  });

  // Group by date
  const dailyData = new Map<string, number>();
  users.forEach(u => {
    const date = formatDate(u.createdAt);
    dailyData.set(date, (dailyData.get(date) || 0) + u._count);
  });

  // Get state distribution
  const stateDistribution = await prisma.user.groupBy({
    by: ['state'],
    where: {
      createdAt: { gte: startDate, lte: endDate },
      state: { not: null },
    },
    _count: true,
    orderBy: { _count: { state: 'desc' } },
    take: 10,
  });

  return {
    timeline: Array.from(dailyData.entries()).map(([date, count]) => ({ date, count })),
    by_state: stateDistribution.map(s => ({ state: s.state, count: s._count })),
    total: users.reduce((sum, u) => sum + u._count, 0),
  };
}

async function getScansReport(startDate: Date, endDate: Date, groupBy: string) {
  const scans = await prisma.scanRedemption.groupBy({
    by: ['scannedAt'],
    where: {
      scannedAt: { gte: startDate, lte: endDate },
    },
    _count: true,
    _sum: { prizeValue: true },
  });

  // Group by date
  const dailyData = new Map<string, { count: number; value: number }>();
  scans.forEach(s => {
    const date = formatDate(s.scannedAt);
    const existing = dailyData.get(date) || { count: 0, value: 0 };
    dailyData.set(date, {
      count: existing.count + s._count,
      value: existing.value + Number(s._sum.prizeValue || 0),
    });
  });

  // Status distribution
  const statusDistribution = await prisma.scanRedemption.groupBy({
    by: ['status'],
    where: {
      scannedAt: { gte: startDate, lte: endDate },
    },
    _count: true,
  });

  return {
    timeline: Array.from(dailyData.entries()).map(([date, data]) => ({
      date,
      scans: data.count,
      value: data.value,
    })),
    by_status: statusDistribution.map(s => ({ status: s.status, count: s._count })),
    total_scans: scans.reduce((sum, s) => sum + s._count, 0),
    total_value: scans.reduce((sum, s) => sum + Number(s._sum.prizeValue || 0), 0),
  };
}

async function getCouponsReport(startDate: Date, endDate: Date) {
  const [total, used, expired, byProduct] = await Promise.all([
    prisma.coupon.count(),
    prisma.coupon.count({ where: { status: 'USED' } }),
    prisma.coupon.count({ where: { status: 'EXPIRED' } }),
    prisma.coupon.groupBy({
      by: ['productId'],
      where: { productId: { not: null } },
      _count: true,
      orderBy: { _count: { productId: 'desc' } },
      take: 10,
    }),
  ]);

  const products = await prisma.product.findMany({
    where: { id: { in: byProduct.map(b => b.productId!).filter(Boolean) } },
    select: { id: true, name: true },
  });

  const productMap = new Map(products.map(p => [p.id, p.name]));

  return {
    total,
    used,
    unused: total - used - expired,
    expired,
    by_product: byProduct.map(b => ({
      product: productMap.get(b.productId!) || 'Unknown',
      count: b._count,
    })),
  };
}

async function getProductsReport() {
  const [total, active, bestSellers, byCategory] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.product.count({ where: { isBestSeller: true } }),
    prisma.product.groupBy({
      by: ['categoryId'],
      _count: true,
      orderBy: { _count: { categoryId: 'desc' } },
    }),
  ]);

  const categories = await prisma.category.findMany({
    where: { id: { in: byCategory.map(b => b.categoryId) } },
    select: { id: true, name: true },
  });

  const categoryMap = new Map(categories.map(c => [c.id, c.name]));

  return {
    total,
    active,
    inactive: total - active,
    best_sellers: bestSellers,
    by_category: byCategory.map(b => ({
      category: categoryMap.get(b.categoryId) || 'Unknown',
      count: b._count,
    })),
  };
}

async function getDistributorsReport() {
  const [total, active, verified, byState] = await Promise.all([
    prisma.distributor.count(),
    prisma.distributor.count({ where: { isActive: true } }),
    prisma.distributor.count({ where: { isVerified: true } }),
    prisma.distributor.groupBy({
      by: ['addressState'],
      where: { addressState: { not: null } },
      _count: true,
      orderBy: { _count: { addressState: 'desc' } },
      take: 10,
    }),
  ]);

  return {
    total,
    active,
    inactive: total - active,
    verified,
    pending_verification: total - verified,
    by_state: byState.map(b => ({
      state: b.addressState,
      count: b._count,
    })),
  };
}

