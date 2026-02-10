import { Response, NextFunction } from 'express';
import prisma from '../../lib/prisma';
import { sendSuccess, sendError } from '../../utils/response';
import { AdminRequest, ErrorCodes } from '../../types';
import { uploadToCloudinary } from '../../utils/cloudinary';

// GET /api/v1/admin/categories
export const listCategories = async (
  _req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { displayOrder: 'asc' },
    });

    const productCounts = await prisma.product.groupBy({
      by: ['categoryId'],
      where: { isActive: true },
      _count: true,
    });

    const countMap = new Map(
      productCounts.map((pc) => [pc.categoryId, pc._count])
    );

    sendSuccess(
      res,
      categories.map((category) => ({
        id: category.id,
        name: category.name,
        name_hi: category.nameHi,
        slug: category.slug,
        image_url: category.imageUrl,
        is_active: category.isActive,
        display_order: category.displayOrder,
        product_count: countMap.get(category.id) || 0,
      }))
    );
  } catch (error) {
    next(error);
  }
};

// PUT /api/v1/admin/categories/:id
export const updateCategory = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { id } = req.params;
    const { name, name_hi, is_active, display_order } = req.body as {
      name?: string;
      name_hi?: string;
      is_active?: string | boolean;
      display_order?: string | number;
      image_url?: string;
    };
    let { image_url } = req.body as { image_url?: string };

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return sendError(res, ErrorCodes.NOT_FOUND, 'Category not found', 404);
    }

    // Handle image upload via multipart/form-data
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.path, 'categories');
      image_url = uploadResult.url;
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (name_hi !== undefined) data.nameHi = name_hi;
    if (image_url !== undefined) data.imageUrl = image_url;
    if (is_active !== undefined) {
      const active =
        is_active === true ||
        is_active === 'true' ||
        is_active === '1' ||
        is_active === 1;
      data.isActive = active;
    }
    if (display_order !== undefined) {
      const parsed = parseInt(String(display_order), 10);
      data.displayOrder = Number.isNaN(parsed) ? existing.displayOrder : parsed;
    }

    const updated = await prisma.category.update({
      where: { id },
      data,
    });

    const productCount = await prisma.product.count({
      where: { categoryId: id, isActive: true },
    });

    sendSuccess(res, {
      id: updated.id,
      name: updated.name,
      name_hi: updated.nameHi,
      slug: updated.slug,
      image_url: updated.imageUrl,
      is_active: updated.isActive,
      display_order: updated.displayOrder,
      product_count: productCount,
    });
  } catch (error) {
    next(error);
  }
};

