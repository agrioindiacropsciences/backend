import { Response, NextFunction } from 'express';
import prisma from '../../lib/prisma';
import { sendSuccess, sendError } from '../../utils/response';
import { adminCreateProductSchema } from '../../utils/validation';
import { AdminRequest, ErrorCodes } from '../../types';
import { parsePagination, createPagination, generateSlug, sanitizeSearchQuery } from '../../utils/helpers';
import { Prisma } from '@prisma/client';
import { uploadToCloudinary } from '../../utils/cloudinary';
import { NotificationService } from '../../utils/notification.service';

/**
 * When assigning best_seller_rank to a product, shift other products with same or higher rank
 * to ensure unique ranks (only one product per rank).
 */
async function shiftBestSellerRanks(newRank: number, excludeProductId?: string): Promise<void> {
  const toShift = await prisma.product.findMany({
    where: {
      isBestSeller: true,
      bestSellerRank: { gte: newRank },
      ...(excludeProductId && { id: { not: excludeProductId } }),
    },
    orderBy: { bestSellerRank: 'desc' },
    select: { id: true, bestSellerRank: true },
  });

  for (const p of toShift) {
    const currentRank = p.bestSellerRank as number;
    await prisma.product.update({
      where: { id: p.id },
      data: { bestSellerRank: currentRank + 1 },
    });
  }
}

// GET /api/v1/admin/products
export const listProducts = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { page, limit, skip } = parsePagination(
      req.query.page as string,
      req.query.limit as string
    );

    const searchQuery = req.query.q as string | undefined;
    const category = req.query.category as string | undefined;

    const where: Prisma.ProductWhereInput = { isActive: true };

    if (searchQuery) {
      const sanitized = sanitizeSearchQuery(searchQuery);
      where.OR = [
        { name: { contains: sanitized, mode: 'insensitive' } },
        { nameHi: { contains: sanitized, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.categoryId = category;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          packSizes: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    sendSuccess(res, {
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        name_hi: p.nameHi,
        slug: p.slug,
        category: p.category ? { id: p.category.id, name: p.category.name } : null,
        images: Array.isArray((p as any).images) ? (p as any).images : [],
        composition: p.composition,
        dosage: p.dosage,
        is_best_seller: p.isBestSeller,
        best_seller_rank: p.bestSellerRank,
        is_active: p.isActive,
        sales_count: p.salesCount,
        pack_sizes: (p.packSizes || []).map(ps => ({
          size: ps.size,
          sku: ps.sku,
          mrp: ps.mrp ? Number(ps.mrp) : null,
          selling_price: ps.sellingPrice ? Number(ps.sellingPrice) : null,
        })),
        created_at: p.createdAt,
      })),
      pagination: createPagination(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/admin/products
export const createProduct = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const data = adminCreateProductSchema.parse(req.body);

    // Generate unique slug
    let slug = generateSlug(data.name);
    const existingSlug = await prisma.product.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    // Verify category exists
    const category = await prisma.category.findUnique({
      where: { id: data.category_id },
    });
    if (!category) {
      return sendError(res, ErrorCodes.VALIDATION_ERROR, 'Category not found', 400);
    }

    // Handle image uploads
    const imageUrls: string[] = [...(data.images || [])];
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        const result = await uploadToCloudinary(file.path, 'products');
        imageUrls.push(result.url);
      }
    }

    // Handle best_seller_rank logic - ensure unique ranks
    let bestSellerRank: number | null = null;
    if (data.is_best_seller) {
      bestSellerRank = data.best_seller_rank ?? 1;
      await shiftBestSellerRanks(bestSellerRank);
    }

    const product = await prisma.product.create({
      data: {
        name: data.name,
        nameHi: (data.name_hi && data.name_hi.trim()) ? data.name_hi : data.name,
        slug,
        categoryId: data.category_id,
        description: data.description,
        descriptionHi: data.description_hi,
        composition: data.composition,
        dosage: data.dosage,
        applicationMethod: data.application_method,
        targetPests: data.target_pests || [],
        suitableCrops: data.suitable_crops || [],
        safetyPrecautions: data.safety_precautions || [],
        images: imageUrls,
        isBestSeller: data.is_best_seller,
        bestSellerRank,
        isActive: data.is_active,
        packSizes: data.pack_sizes && data.pack_sizes.length > 0 ? {
          create: data.pack_sizes.map((ps, i) => {
            const safeSize = (ps.size || '').replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-]/g, '');
            const sku = (ps.sku && ps.sku.trim()) ? ps.sku.trim() : `${slug}-${i + 1}-${safeSize || 'pack'}`;
            return {
              size: ps.size,
              sku,
              mrp: ps.mrp ?? null,
              sellingPrice: ps.selling_price ?? null,
            };
          }),
        } : undefined,
      },
      include: {
        category: { select: { name: true } },
        packSizes: true,
      },
    });

    // Notify users about the new product (Fire and forget)
    const firstImageUrl = imageUrls.length > 0 ? imageUrls[0] : undefined;
    const lowestPrice = product.packSizes.length > 0
      ? Math.min(...product.packSizes.map(ps => Number(ps.sellingPrice || 0)))
      : 0;

    NotificationService.notifyNewProduct(product.name, lowestPrice, firstImageUrl).catch(err => {
      console.error('Failed to send product notification:', err);
    });

    sendSuccess(res, {
      id: product.id,
      name: product.name,
      slug: product.slug,
      category: product.category.name,
      is_best_seller: product.isBestSeller,
      best_seller_rank: product.bestSellerRank,
    }, 'Product created successfully', 201);
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/admin/products/:id
export const getProduct = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        packSizes: true,
      },
    });

    if (!product) {
      return sendError(res, ErrorCodes.NOT_FOUND, 'Product not found', 404);
    }

    sendSuccess(res, {
      ...product,
      best_seller_rank: product.bestSellerRank,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/v1/admin/products/:id
export const updateProduct = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { id } = req.params;
    const raw = req.body;

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return sendError(res, ErrorCodes.NOT_FOUND, 'Product not found', 404);
    }

    const parseJson = (val: unknown): unknown => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') {
        try {
          return JSON.parse(val);
        } catch {
          return val;
        }
      }
      return val;
    };

    const data = { ...raw };
    if (typeof data.target_pests === 'string') data.target_pests = parseJson(data.target_pests);
    if (typeof data.suitable_crops === 'string') data.suitable_crops = parseJson(data.suitable_crops);
    if (typeof data.safety_precautions === 'string') data.safety_precautions = parseJson(data.safety_precautions);
    if (typeof data.pack_sizes === 'string') data.pack_sizes = parseJson(data.pack_sizes);
    if (data.best_seller_rank === '') data.best_seller_rank = null;
    else if (data.best_seller_rank !== undefined) data.best_seller_rank = parseInt(data.best_seller_rank) || null;

    const updateData: Prisma.ProductUpdateInput = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.name_hi !== undefined) updateData.nameHi = (data.name_hi && String(data.name_hi).trim()) ? data.name_hi : (data.name || product.nameHi);
    if (data.category_id !== undefined) updateData.category = { connect: { id: data.category_id } };
    if (data.description !== undefined) updateData.description = data.description;
    if (data.description_hi !== undefined) updateData.descriptionHi = data.description_hi;
    if (data.composition !== undefined) updateData.composition = data.composition;
    if (data.dosage !== undefined) updateData.dosage = data.dosage;
    if (data.application_method !== undefined) updateData.applicationMethod = data.application_method;
    if (data.target_pests !== undefined) updateData.targetPests = data.target_pests;
    if (data.suitable_crops !== undefined) updateData.suitableCrops = data.suitable_crops;
    if (data.safety_precautions !== undefined) updateData.safetyPrecautions = data.safety_precautions;

    // Handle image uploads - merge existing_image_urls with newly uploaded files
    let existingUrls: string[] = [];
    if (data.existing_image_urls) {
      const parsed = parseJson(data.existing_image_urls);
      existingUrls = Array.isArray(parsed) ? parsed.filter((u): u is string => typeof u === 'string') : [];
    }
    let imageUrls: string[] = existingUrls.length > 0 ? existingUrls : (Array.isArray(product.images) ? (product.images as string[]) : []);
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const uploaded: string[] = [];
      for (const file of req.files) {
        if (file.path) {
          const result = await uploadToCloudinary(file.path, 'products');
          uploaded.push(result.url);
        }
      }
      imageUrls = [...existingUrls, ...uploaded];
    }
    updateData.images = imageUrls;

    if (data.is_best_seller !== undefined) {
      updateData.isBestSeller = data.is_best_seller === 'true' || data.is_best_seller === true;
      if (!data.is_best_seller) {
        updateData.bestSellerRank = null;
      } else {
        const newRank = data.best_seller_rank !== undefined && data.best_seller_rank !== ''
          ? parseInt(String(data.best_seller_rank)) || 1
          : (product.bestSellerRank || 1);
        await shiftBestSellerRanks(newRank, id);
        updateData.bestSellerRank = newRank;
      }
    } else if (data.best_seller_rank !== undefined && product.isBestSeller) {
      const newRank = parseInt(String(data.best_seller_rank)) || 1;
      await shiftBestSellerRanks(newRank, id);
      updateData.bestSellerRank = newRank;
    }
    if (data.is_active !== undefined) updateData.isActive = data.is_active !== 'false' && data.is_active !== false;

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    // Update pack sizes if provided
    if (data.pack_sizes && Array.isArray(data.pack_sizes) && data.pack_sizes.length > 0) {
      await prisma.productPackSize.deleteMany({ where: { productId: id } });
      const slug = (updatedProduct as any).slug || product.slug;
      await prisma.productPackSize.createMany({
        data: data.pack_sizes.map((ps: { size?: string; sku?: string; mrp?: number; selling_price?: number }, i: number) => {
          const size = ps.size || '';
          const safeSize = size.replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-]/g, '');
          const sku = (ps.sku && String(ps.sku).trim()) ? String(ps.sku).trim() : `${slug}-${i + 1}-${safeSize || 'pack'}`;
          return {
            productId: id,
            size,
            sku,
            mrp: ps.mrp ?? null,
            sellingPrice: ps.selling_price ?? null,
          };
        }),
      });
    }

    sendSuccess(res, updatedProduct, 'Product updated successfully');
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/admin/products/:id
export const deleteProduct = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return sendError(res, ErrorCodes.NOT_FOUND, 'Product not found', 404);
    }

    // Soft delete by setting isActive to false
    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    sendSuccess(res, undefined, 'Product deleted successfully');
  } catch (error) {
    next(error);
  }
};

