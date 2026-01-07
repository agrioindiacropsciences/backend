import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { ErrorCodes } from '../types';

// GET /api/v1/categories
export const getAllCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });

    // Get product counts for each category
    const productCounts = await prisma.product.groupBy({
      by: ['categoryId'],
      where: { isActive: true },
      _count: true,
    });

    const countMap = new Map(
      productCounts.map(pc => [pc.categoryId, pc._count])
    );

    sendSuccess(res, categories.map(category => ({
      id: category.id,
      name: category.name,
      name_hi: category.nameHi,
      slug: category.slug,
      image_url: category.imageUrl,
      parent_id: category.parentId,
      level: category.level,
      path: category.path,
      product_count: countMap.get(category.id) || 0,
    })));
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/categories/:id
export const getCategoryById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!category || !category.isActive) {
      return sendError(res, ErrorCodes.NOT_FOUND, 'Category not found', 404);
    }

    // Get product count
    const productCount = await prisma.product.count({
      where: { categoryId: id, isActive: true },
    });

    sendSuccess(res, {
      id: category.id,
      name: category.name,
      name_hi: category.nameHi,
      slug: category.slug,
      image_url: category.imageUrl,
      parent_id: category.parentId,
      level: category.level,
      path: category.path,
      product_count: productCount,
      children: category.children.map(child => ({
        id: child.id,
        name: child.name,
        name_hi: child.nameHi,
        slug: child.slug,
      })),
    });
  } catch (error) {
    next(error);
  }
};

