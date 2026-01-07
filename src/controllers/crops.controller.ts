import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { sendSuccess } from '../utils/response';
import { sanitizeSearchQuery } from '../utils/helpers';

// GET /api/v1/crops
export const getAllCrops = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const searchQuery = req.query.q as string | undefined;
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);

    const where: Record<string, unknown> = { isActive: true };

    if (searchQuery) {
      const sanitized = sanitizeSearchQuery(searchQuery);
      where.OR = [
        { name: { contains: sanitized, mode: 'insensitive' } },
        { nameHi: { contains: sanitized, mode: 'insensitive' } },
      ];
    }

    const crops = await prisma.crop.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
      take: limit,
    });

    sendSuccess(res, crops.map(crop => ({
      id: crop.id,
      name: crop.name,
      name_hi: crop.nameHi,
      image_url: crop.imageUrl,
    })));
  } catch (error) {
    next(error);
  }
};

