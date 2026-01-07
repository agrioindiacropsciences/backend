import { Response, NextFunction } from 'express';
import prisma from '../../lib/prisma';
import { sendSuccess } from '../../utils/response';
import { AdminRequest } from '../../types';

// GET /api/v1/admin/dashboard/stats
export const getStats = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const period = (req.query.period as string) || '30days';
    
    // Calculate date range
    let daysBack = 30;
    switch (period) {
      case '7days':
        daysBack = 7;
        break;
      case '90days':
        daysBack = 90;
        break;
      case 'year':
        daysBack = 365;
        break;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - daysBack);

    // Get current period stats
    const [
      totalUsers,
      newUsers,
      previousNewUsers,
      totalScans,
      previousScans,
      redemptions,
      previousRedemptions,
      totalProducts,
      totalDistributors,
      todayRegistrations,
    ] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { createdAt: { gte: startDate } } }),
      prisma.user.count({ where: { createdAt: { gte: previousStartDate, lt: startDate } } }),
      prisma.scanRedemption.count({ where: { scannedAt: { gte: startDate } } }),
      prisma.scanRedemption.count({ where: { scannedAt: { gte: previousStartDate, lt: startDate } } }),
      prisma.scanRedemption.count({ where: { scannedAt: { gte: startDate }, status: 'CLAIMED' } }),
      prisma.scanRedemption.count({ where: { scannedAt: { gte: previousStartDate, lt: startDate }, status: 'CLAIMED' } }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.distributor.count({ where: { isActive: true } }),
      prisma.user.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
    ]);

    // Calculate growth percentages
    const calculateGrowth = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100 * 10) / 10;
    };

    // Get active users (users who logged in within the period)
    const activeUsers = await prisma.user.count({
      where: {
        isActive: true,
        lastLogin: { gte: startDate },
      },
    });

    // Get scans per day
    const scansPerDay = await prisma.$queryRaw<{ date: Date; value: number }[]>`
      SELECT DATE(scanned_at) as date, COUNT(*) as value
      FROM scan_redemptions
      WHERE scanned_at >= ${startDate}
      GROUP BY DATE(scanned_at)
      ORDER BY date ASC
    `;

    // Get crop preferences distribution
    const cropPreferences = await prisma.userCrop.groupBy({
      by: ['cropId'],
      _count: true,
      orderBy: { _count: { cropId: 'desc' } },
      take: 10,
    });

    const crops = await prisma.crop.findMany({
      where: { id: { in: cropPreferences.map(c => c.cropId) } },
    });

    const cropMap = new Map(crops.map(c => [c.id, c.name]));

    // Get top states
    const topStates = await prisma.user.groupBy({
      by: ['state'],
      where: { state: { not: null }, isActive: true },
      _count: true,
      orderBy: { _count: { state: 'desc' } },
      take: 10,
    });

    sendSuccess(res, {
      total_users: totalUsers,
      user_growth: calculateGrowth(newUsers, previousNewUsers),
      active_users: activeUsers,
      active_user_growth: 0, // Would need historical data
      total_scans: totalScans,
      scan_growth: calculateGrowth(totalScans, previousScans),
      coupons_redeemed: redemptions,
      redemption_growth: calculateGrowth(redemptions, previousRedemptions),
      total_revenue: 0, // Would need order data
      total_products: totalProducts,
      total_distributors: totalDistributors,
      new_registrations_today: todayRegistrations,
      scans_per_day: scansPerDay.map(s => ({
        date: s.date.toISOString().split('T')[0],
        value: Number(s.value),
      })),
      crop_preferences: cropPreferences.map(c => ({
        name: cropMap.get(c.cropId) || c.cropId,
        value: c._count,
      })),
      top_states: topStates.map(s => ({
        state: s.state,
        users: s._count,
      })),
    });
  } catch (error) {
    next(error);
  }
};

