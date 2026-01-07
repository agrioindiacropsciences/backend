import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { productQuerySchema } from '../utils/validation';
import { AuthenticatedRequest, ErrorCodes } from '../types';
import { parsePagination, createPagination, sanitizeSearchQuery } from '../utils/helpers';
import { Prisma } from '@prisma/client';

// GET /api/v1/products
export const getAllProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const query = productQuerySchema.parse(req.query);
    const { page, limit, skip } = parsePagination(query.page, query.limit);

    const where: Prisma.ProductWhereInput = { isActive: true };

    if (query.q) {
      const sanitized = sanitizeSearchQuery(query.q);
      where.OR = [
        { name: { contains: sanitized, mode: 'insensitive' } },
        { nameHi: { contains: sanitized, mode: 'insensitive' } },
        { description: { contains: sanitized, mode: 'insensitive' } },
      ];
    }

    if (query.category) {
      where.categoryId = query.category;
    }

    if (query.crop) {
      where.suitableCrops = {
        array_contains: [query.crop],
      };
    }

    if (query.best_seller !== undefined) {
      where.isBestSeller = query.best_seller;
    }

    // Determine sorting
    let orderBy: Prisma.ProductOrderByWithRelationInput = { displayOrder: 'asc' };
    switch (query.sort) {
      case 'name':
        orderBy = { name: 'asc' };
        break;
      case 'name_desc':
        orderBy = { name: 'desc' };
        break;
      case 'popular':
        orderBy = { salesCount: 'desc' };
        break;
      case 'newest':
        orderBy = { createdAt: 'desc' };
        break;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true, nameHi: true },
          },
          packSizes: {
            where: { isActive: true },
            select: { size: true, sku: true, mrp: true, sellingPrice: true },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    const formattedProducts = products.map(product => ({
      id: product.id,
      name: product.name,
      name_hi: product.nameHi,
      slug: product.slug,
      category: {
        id: product.category.id,
        name: product.category.name,
        name_hi: product.category.nameHi,
      },
      description: product.description,
      description_hi: product.descriptionHi,
      composition: product.composition,
      dosage: product.dosage,
      application_method: product.applicationMethod,
      target_pests: product.targetPests,
      suitable_crops: product.suitableCrops,
      pack_sizes: product.packSizes.map(ps => ({
        size: ps.size,
        sku: ps.sku,
        mrp: ps.mrp ? Number(ps.mrp) : null,
        selling_price: ps.sellingPrice ? Number(ps.sellingPrice) : null,
      })),
      safety_precautions: product.safetyPrecautions,
      images: product.images,
      is_best_seller: product.isBestSeller,
      is_active: product.isActive,
      sales_count: product.salesCount,
      display_order: product.displayOrder,
    }));

    sendSuccess(res, {
      products: formattedProducts,
      pagination: createPagination(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/products/best-sellers
export const getBestSellers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const limit = Math.min(50, parseInt(req.query.limit as string) || 10);

    const products = await prisma.product.findMany({
      where: { isActive: true, isBestSeller: true },
      include: {
        category: {
          select: { id: true, name: true, nameHi: true },
        },
        packSizes: {
          where: { isActive: true },
          select: { size: true, sku: true },
        },
      },
      orderBy: { salesCount: 'desc' },
      take: limit,
    });

    sendSuccess(res, products.map(product => ({
      id: product.id,
      name: product.name,
      name_hi: product.nameHi,
      slug: product.slug,
      category: {
        id: product.category.id,
        name: product.category.name,
        name_hi: product.category.nameHi,
      },
      images: product.images,
      pack_sizes: product.packSizes,
      is_best_seller: product.isBestSeller,
    })));
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/products/recommended
export const getRecommended = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const limit = Math.min(20, parseInt(req.query.limit as string) || 10);

    // Get user's crop preferences
    const userCrops = await prisma.userCrop.findMany({
      where: { userId: req.userId! },
      select: { cropId: true },
    });

    const cropIds = userCrops.map(uc => uc.cropId);

    // Find products matching user's crops
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        OR: cropIds.length > 0
          ? cropIds.map(cropId => ({
              suitableCrops: { array_contains: [cropId] },
            }))
          : undefined,
      },
      include: {
        category: {
          select: { id: true, name: true, nameHi: true },
        },
        packSizes: {
          where: { isActive: true },
          select: { size: true, sku: true },
        },
      },
      orderBy: { salesCount: 'desc' },
      take: limit,
    });

    sendSuccess(res, products.map(product => ({
      id: product.id,
      name: product.name,
      name_hi: product.nameHi,
      slug: product.slug,
      category: {
        id: product.category.id,
        name: product.category.name,
        name_hi: product.category.nameHi,
      },
      images: product.images,
      suitable_crops: product.suitableCrops,
    })));
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/products/:slug
export const getProductBySlug = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { slug } = req.params;

    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: {
          select: { id: true, name: true, nameHi: true },
        },
        packSizes: {
          where: { isActive: true },
        },
      },
    });

    if (!product || !product.isActive) {
      return sendError(res, ErrorCodes.NOT_FOUND, 'Product not found', 404);
    }

    // Get related products from same category
    const relatedProducts = await prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        id: { not: product.id },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        nameHi: true,
        slug: true,
        images: true,
      },
      take: 4,
    });

    sendSuccess(res, {
      id: product.id,
      name: product.name,
      name_hi: product.nameHi,
      slug: product.slug,
      category: {
        id: product.category.id,
        name: product.category.name,
        name_hi: product.category.nameHi,
      },
      description: product.description,
      description_hi: product.descriptionHi,
      composition: product.composition,
      dosage: product.dosage,
      application_method: product.applicationMethod,
      target_pests: product.targetPests,
      suitable_crops: product.suitableCrops,
      pack_sizes: product.packSizes.map(ps => ({
        size: ps.size,
        sku: ps.sku,
        mrp: ps.mrp ? Number(ps.mrp) : null,
        selling_price: ps.sellingPrice ? Number(ps.sellingPrice) : null,
      })),
      safety_precautions: product.safetyPrecautions,
      images: product.images,
      technical_details: product.technicalDetails,
      is_best_seller: product.isBestSeller,
      related_products: relatedProducts.map(p => ({
        id: p.id,
        name: p.name,
        name_hi: p.nameHi,
        slug: p.slug,
        images: p.images,
      })),
    });
  } catch (error) {
    next(error);
  }
};

