import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { sanitizeSearchQuery } from '../utils/helpers';
import { ErrorCodes } from '../types';

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
      is_active: crop.isActive,
      display_order: crop.displayOrder,
    })));
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/crops/:id
export const getCropById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { id } = req.params;
    const crop = await prisma.crop.findUnique({
      where: { id },
    });

    if (!crop) {
      return sendError(res, ErrorCodes.NOT_FOUND, 'Crop not found', 404);
    }

    sendSuccess(res, {
      id: crop.id,
      name: crop.name,
      name_hi: crop.nameHi,
      image_url: crop.imageUrl,
      is_active: crop.isActive,
      display_order: crop.displayOrder,
    });
  } catch (error) {
    next(error);
  }
};

import { uploadToCloudinary } from '../utils/cloudinary';

// POST /api/v1/crops
export const createCrop = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { id, name, name_hi, is_active, display_order } = req.body;
    let { image_url } = req.body;

    if (!name) {
      return sendError(res, ErrorCodes.VALIDATION_ERROR, 'Name is required');
    }

    // Handle image upload
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.path, 'crops');
      image_url = uploadResult.url;
    }

    // Generate ID from name if not provided
    const cropId = id || name.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Check if exists
    const existing = await prisma.crop.findUnique({ where: { id: cropId } });
    if (existing) {
      return sendError(res, ErrorCodes.CONFLICT, 'Crop with this ID already exists');
    }

    const crop = await prisma.crop.create({
      data: {
        id: cropId,
        name,
        nameHi: name_hi || '',
        imageUrl: image_url,
        isActive: is_active === 'true' || is_active === true,
        displayOrder: display_order ? parseInt(String(display_order)) : 0,
      },
    });

    sendSuccess(res, crop, 'Crop created successfully', 201);
  } catch (error) {
    next(error);
  }
};

// PUT /api/v1/crops/:id
export const updateCrop = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { id } = req.params;
    const { name, name_hi, is_active, display_order } = req.body;
    let { image_url } = req.body;

    const crop = await prisma.crop.findUnique({ where: { id } });
    if (!crop) {
      return sendError(res, ErrorCodes.NOT_FOUND, 'Crop not found', 404);
    }

    // Handle image upload
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.path, 'crops');
      image_url = uploadResult.url;
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (name_hi !== undefined) updateData.nameHi = name_hi;
    if (image_url !== undefined) updateData.imageUrl = image_url;
    if (is_active !== undefined) updateData.isActive = is_active === 'true' || is_active === true;
    if (display_order !== undefined) updateData.displayOrder = parseInt(String(display_order));

    const updated = await prisma.crop.update({
      where: { id },
      data: updateData,
    });

    sendSuccess(res, updated, 'Crop updated successfully');
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/crops/:id
export const deleteCrop = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { id } = req.params;

    const crop = await prisma.crop.findUnique({ where: { id } });
    if (!crop) {
      return sendError(res, ErrorCodes.NOT_FOUND, 'Crop not found', 404);
    }

    await prisma.crop.delete({ where: { id } });

    sendSuccess(res, null, 'Crop deleted successfully');
  } catch (error) {
    next(error);
  }
};

