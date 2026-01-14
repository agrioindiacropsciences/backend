import { Response, NextFunction } from 'express';
import prisma from '../../lib/prisma';
import { sendSuccess, sendError } from '../../utils/response';
import { adminCreateProductSchema } from '../../utils/validation';
import { AdminRequest, ErrorCodes } from '../../types';
import { parsePagination, createPagination, generateSlug, sanitizeSearchQuery } from '../../utils/helpers';
import { Prisma } from '@prisma/client';
import { uploadToCloudinary } from '../../utils/cloudinary';
import { NotificationService } from '../../utils/notification.service';

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

    const where: Prisma.ProductWhereInput = {};

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
          category: { select: { name: true } },
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
        category: p.category.name,
        is_best_seller: p.isBestSeller,
        is_active: p.isActive,
        sales_count: p.salesCount,
        pack_sizes: p.packSizes.length,
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

    const product = await prisma.product.create({
      data: {
        name: data.name,
        nameHi: data.name_hi,
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
        isActive: data.is_active,
        packSizes: data.pack_sizes ? {
          create: data.pack_sizes.map(ps => ({
            size: ps.size,
            sku: ps.sku,
            mrp: ps.mrp,
            sellingPrice: ps.selling_price,
          })),
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

    sendSuccess(res, product);
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
    const data = req.body;

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return sendError(res, ErrorCodes.NOT_FOUND, 'Product not found', 404);
    }

    const updateData: Prisma.ProductUpdateInput = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.name_hi !== undefined) updateData.nameHi = data.name_hi;
    if (data.category_id !== undefined) updateData.category = { connect: { id: data.category_id } };
    if (data.description !== undefined) updateData.description = data.description;
    if (data.description_hi !== undefined) updateData.descriptionHi = data.description_hi;
    if (data.composition !== undefined) updateData.composition = data.composition;
    if (data.dosage !== undefined) updateData.dosage = data.dosage;
    if (data.application_method !== undefined) updateData.applicationMethod = data.application_method;
    if (data.target_pests !== undefined) updateData.targetPests = data.target_pests;
    if (data.suitable_crops !== undefined) updateData.suitableCrops = data.suitable_crops;
    if (data.safety_precautions !== undefined) updateData.safetyPrecautions = data.safety_precautions;

    // Handle image uploads
    let imageUrls: string[] = Array.isArray(data.images) ? data.images : (product.images as string[] || []);
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      for (const file of req.files) {
        const result = await uploadToCloudinary(file.path, 'products');
        imageUrls.push(result.url);
      }
    }
    updateData.images = imageUrls;

    if (data.is_best_seller !== undefined) updateData.isBestSeller = data.is_best_seller;
    if (data.is_active !== undefined) updateData.isActive = data.is_active;

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    // Update pack sizes if provided
    if (data.pack_sizes) {
      // Delete existing and create new
      await prisma.productPackSize.deleteMany({ where: { productId: id } });
      await prisma.productPackSize.createMany({
        data: data.pack_sizes.map((ps: any) => ({
          productId: id,
          size: ps.size,
          sku: ps.sku,
          mrp: ps.mrp,
          sellingPrice: ps.selling_price,
        })),
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

