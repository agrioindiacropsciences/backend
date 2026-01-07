import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { ErrorCodes } from '../types';
import { sanitizeSearchQuery } from '../utils/helpers';

// GET /api/v1/search
export const globalSearch = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const query = req.query.q as string;
    const type = (req.query.type as string) || 'all';
    const limit = Math.min(20, parseInt(req.query.limit as string) || 5);

    if (!query || query.trim().length < 2) {
      return sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        'Search query must be at least 2 characters',
        400
      );
    }

    const sanitized = sanitizeSearchQuery(query);
    const results: Record<string, unknown[]> = {};

    // Search products
    if (type === 'all' || type === 'products') {
      const products = await prisma.product.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: sanitized, mode: 'insensitive' } },
            { nameHi: { contains: sanitized, mode: 'insensitive' } },
            { description: { contains: sanitized, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          nameHi: true,
          slug: true,
          images: true,
        },
        take: limit,
      });

      results.products = products.map(p => ({
        id: p.id,
        name: p.name,
        name_hi: p.nameHi,
        slug: p.slug,
        image: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null,
      }));
    }

    // Search categories
    if (type === 'all' || type === 'categories') {
      const categories = await prisma.category.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: sanitized, mode: 'insensitive' } },
            { nameHi: { contains: sanitized, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          nameHi: true,
          slug: true,
          imageUrl: true,
        },
        take: limit,
      });

      results.categories = categories.map(c => ({
        id: c.id,
        name: c.name,
        name_hi: c.nameHi,
        slug: c.slug,
        image_url: c.imageUrl,
      }));
    }

    // Search distributors
    if (type === 'all' || type === 'distributors') {
      const distributors = await prisma.distributor.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: sanitized, mode: 'insensitive' } },
            { businessName: { contains: sanitized, mode: 'insensitive' } },
            { addressCity: { contains: sanitized, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          businessName: true,
          addressCity: true,
          addressState: true,
        },
        take: limit,
      });

      results.distributors = distributors.map(d => ({
        id: d.id,
        name: d.name,
        business_name: d.businessName,
        location: `${d.addressCity}, ${d.addressState}`,
      }));
    }

    sendSuccess(res, results);
  } catch (error) {
    next(error);
  }
};

