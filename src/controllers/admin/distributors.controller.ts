import { Response, NextFunction } from 'express';
import prisma from '../../lib/prisma';
import { sendSuccess, sendError } from '../../utils/response';
import { AdminRequest, ErrorCodes } from '../../types';
import { parsePagination, createPagination, sanitizeSearchQuery } from '../../utils/helpers';
import { Prisma } from '@prisma/client';
import { uploadToCloudinary } from '../../utils/cloudinary';

// GET /api/v1/admin/distributors
export const listDistributors = async (
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
    const status = req.query.status as string | undefined;
    const state = req.query.state as string | undefined;

    const where: Prisma.DistributorWhereInput = {};

    if (searchQuery) {
      const sanitized = sanitizeSearchQuery(searchQuery);
      where.OR = [
        { name: { contains: sanitized, mode: 'insensitive' } },
        { businessName: { contains: sanitized, mode: 'insensitive' } },
        { phone: { contains: sanitized } },
      ];
    }

    if (status) {
      switch (status.toLowerCase()) {
        case 'active':
          where.isActive = true;
          where.isVerified = true;
          break;
        case 'pending':
          where.isVerified = false;
          break;
        case 'inactive':
          where.isActive = false;
          break;
      }
    }

    if (state) {
      where.addressState = state;
    }

    const [distributors, total] = await Promise.all([
      prisma.distributor.findMany({
        where,
        include: {
          _count: {
            select: { coverage: true, products: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.distributor.count({ where }),
    ]);

    sendSuccess(res, {
      distributors: distributors.map(d => ({
        id: d.id,
        name: d.name,
        business_name: d.businessName,
        phone: d.phone,
        location: `${d.addressCity}, ${d.addressState}`,
        coverage_count: d._count.coverage,
        products_count: d._count.products,
        is_verified: d.isVerified,
        is_active: d.isActive,
        rating: d.rating ? Number(d.rating) : null,
        created_at: d.createdAt,
      })),
      pagination: createPagination(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/admin/distributors
export const createDistributor = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const data = req.body;

    // Handle image uploads
    let signatureImageUrl = data.signature_image_url;
    let stampImageUrl = data.stamp_image_url;

    if (req.files && typeof req.files === 'object' && !Array.isArray(req.files)) {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (files['signature']?.[0]) {
        const result = await uploadToCloudinary(files['signature'][0].path, 'distributors/signatures');
        signatureImageUrl = result.url;
      }

      if (files['stamp']?.[0]) {
        const result = await uploadToCloudinary(files['stamp'][0].path, 'distributors/stamps');
        stampImageUrl = result.url;
      }
    }

    const distributor = await prisma.distributor.create({
      data: {
        name: data.name,
        businessName: data.business_name,
        phone: data.phone,
        whatsapp: data.whatsapp,
        email: data.email,
        addressStreet: data.address?.street,
        addressArea: data.address?.area,
        addressCity: data.address?.city,
        addressPincode: data.address?.pincode,
        addressState: data.address?.state,
        locationLat: data.location?.lat,
        locationLng: data.location?.lng,
        openingHours: data.opening_hours,
        signatureImageUrl,
        stampImageUrl,
        isVerified: data.is_verified || false,
        isActive: data.is_active || true,
      },
    });

    // Add coverage pincodes if provided
    if (data.coverage_pincodes && Array.isArray(data.coverage_pincodes)) {
      await prisma.distributorCoverage.createMany({
        data: data.coverage_pincodes.map((pincode: string) => ({
          distributorId: distributor.id,
          pincode,
        })),
      });
    }

    sendSuccess(res, {
      id: distributor.id,
      business_name: distributor.businessName,
    }, 'Distributor created successfully', 201);
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/admin/distributors/:id
export const getDistributor = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { id } = req.params;

    const distributor = await prisma.distributor.findUnique({
      where: { id },
      include: {
        coverage: true,
        products: {
          include: {
            product: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!distributor) {
      return sendError(res, ErrorCodes.NOT_FOUND, 'Distributor not found', 404);
    }

    sendSuccess(res, {
      ...distributor,
      coverage_pincodes: distributor.coverage.map(c => c.pincode),
      products: distributor.products.map(p => ({
        id: p.product.id,
        name: p.product.name,
        is_available: p.isAvailable,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/v1/admin/distributors/:id
export const updateDistributor = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { id } = req.params;
    const data = req.body;

    const distributor = await prisma.distributor.findUnique({ where: { id } });
    if (!distributor) {
      return sendError(res, ErrorCodes.NOT_FOUND, 'Distributor not found', 404);
    }

    const updateData: Prisma.DistributorUpdateInput = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.business_name !== undefined) updateData.businessName = data.business_name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.whatsapp !== undefined) updateData.whatsapp = data.whatsapp;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.address) {
      if (data.address.street !== undefined) updateData.addressStreet = data.address.street;
      if (data.address.area !== undefined) updateData.addressArea = data.address.area;
      if (data.address.city !== undefined) updateData.addressCity = data.address.city;
      if (data.address.pincode !== undefined) updateData.addressPincode = data.address.pincode;
      if (data.address.state !== undefined) updateData.addressState = data.address.state;
    }
    if (data.location) {
      if (data.location.lat !== undefined) updateData.locationLat = data.location.lat;
      if (data.location.lng !== undefined) updateData.locationLng = data.location.lng;
    }
    if (data.opening_hours !== undefined) updateData.openingHours = data.opening_hours;
    if (data.is_verified !== undefined) updateData.isVerified = data.is_verified;
    if (data.is_active !== undefined) updateData.isActive = data.is_active;

    // Handle image uploads
    if (req.files && typeof req.files === 'object' && !Array.isArray(req.files)) {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (files['signature']?.[0]) {
        const result = await uploadToCloudinary(files['signature'][0].path, 'distributors/signatures');
        updateData.signatureImageUrl = result.url;
      }

      if (files['stamp']?.[0]) {
        const result = await uploadToCloudinary(files['stamp'][0].path, 'distributors/stamps');
        updateData.stampImageUrl = result.url;
      }
    }

    await prisma.distributor.update({
      where: { id },
      data: updateData,
    });

    // Update coverage if provided
    if (data.coverage_pincodes) {
      await prisma.distributorCoverage.deleteMany({ where: { distributorId: id } });
      await prisma.distributorCoverage.createMany({
        data: data.coverage_pincodes.map((pincode: string) => ({
          distributorId: id,
          pincode,
        })),
      });
    }

    sendSuccess(res, undefined, 'Distributor updated successfully');
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/admin/distributors/:id
export const deleteDistributor = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { id } = req.params;

    const distributor = await prisma.distributor.findUnique({ where: { id } });
    if (!distributor) {
      return sendError(res, ErrorCodes.NOT_FOUND, 'Distributor not found', 404);
    }

    // Soft delete
    await prisma.distributor.update({
      where: { id },
      data: { isActive: false },
    });

    sendSuccess(res, undefined, 'Distributor deleted successfully');
  } catch (error) {
    next(error);
  }
};

