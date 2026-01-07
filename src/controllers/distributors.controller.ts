import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { ErrorCodes } from '../types';
import { parsePagination, createPagination, calculateDistance } from '../utils/helpers';
import { Prisma } from '@prisma/client';

// GET /api/v1/distributors
export const getDistributors = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const pincode = req.query.pincode as string;
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;
    const { page, limit, skip } = parsePagination(
      req.query.page as string,
      req.query.limit as string
    );

    // If no pincode provided, return error
    if (!pincode) {
      return sendError(res, ErrorCodes.VALIDATION_ERROR, 'Pincode is required', 400);
    }

    // Find distributors covering this pincode
    const coverageRecords = await prisma.distributorCoverage.findMany({
      where: { pincode },
      select: { distributorId: true },
    });

    const distributorIds = coverageRecords.map(c => c.distributorId);

    // Also include distributors with matching address pincode
    const where: Prisma.DistributorWhereInput = {
      isActive: true,
      OR: [
        { id: { in: distributorIds } },
        { addressPincode: pincode },
      ],
    };

    const [distributors, total] = await Promise.all([
      prisma.distributor.findMany({
        where,
        orderBy: { rating: 'desc' },
        skip,
        take: limit,
      }),
      prisma.distributor.count({ where }),
    ]);

    const formattedDistributors = distributors.map(d => {
      let distanceKm: number | null = null;
      if (lat && lng && d.locationLat && d.locationLng) {
        distanceKm = calculateDistance(
          lat,
          lng,
          Number(d.locationLat),
          Number(d.locationLng)
        );
      }

      return {
        id: d.id,
        name: d.name,
        business_name: d.businessName,
        phone: d.phone,
        whatsapp: d.whatsapp,
        email: d.email,
        address: {
          street: d.addressStreet,
          area: d.addressArea,
          city: d.addressCity,
          pincode: d.addressPincode,
          state: d.addressState,
        },
        location: d.locationLat && d.locationLng ? {
          lat: Number(d.locationLat),
          lng: Number(d.locationLng),
        } : null,
        distance_km: distanceKm,
        opening_hours: d.openingHours,
        signature_image_url: d.signatureImageUrl,
        stamp_image_url: d.stampImageUrl,
        is_verified: d.isVerified,
        is_active: d.isActive,
        rating: d.rating ? Number(d.rating) : null,
        review_count: d.reviewCount,
      };
    });

    // Sort by distance if coordinates provided
    if (lat && lng) {
      formattedDistributors.sort((a, b) => {
        if (a.distance_km === null) return 1;
        if (b.distance_km === null) return -1;
        return a.distance_km - b.distance_km;
      });
    }

    sendSuccess(res, {
      distributors: formattedDistributors,
      pagination: createPagination(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/distributors/:id
export const getDistributorById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { id } = req.params;

    const distributor = await prisma.distributor.findUnique({
      where: { id },
    });

    if (!distributor || !distributor.isActive) {
      return sendError(res, ErrorCodes.NOT_FOUND, 'Distributor not found', 404);
    }

    sendSuccess(res, {
      id: distributor.id,
      name: distributor.name,
      business_name: distributor.businessName,
      phone: distributor.phone,
      whatsapp: distributor.whatsapp,
      email: distributor.email,
      address: {
        street: distributor.addressStreet,
        area: distributor.addressArea,
        city: distributor.addressCity,
        pincode: distributor.addressPincode,
        state: distributor.addressState,
      },
      location: distributor.locationLat && distributor.locationLng ? {
        lat: Number(distributor.locationLat),
        lng: Number(distributor.locationLng),
      } : null,
      opening_hours: distributor.openingHours,
      signature_image_url: distributor.signatureImageUrl,
      stamp_image_url: distributor.stampImageUrl,
      is_verified: distributor.isVerified,
      rating: distributor.rating ? Number(distributor.rating) : null,
      review_count: distributor.reviewCount,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/distributors/:id/coverage
export const getDistributorCoverage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { id } = req.params;

    const distributor = await prisma.distributor.findUnique({
      where: { id },
      include: {
        coverage: { select: { pincode: true } },
        products: {
          where: { isAvailable: true },
          include: {
            product: { select: { id: true, name: true, nameHi: true } },
          },
        },
      },
    });

    if (!distributor || !distributor.isActive) {
      return sendError(res, ErrorCodes.NOT_FOUND, 'Distributor not found', 404);
    }

    sendSuccess(res, {
      pincodes: distributor.coverage.map(c => c.pincode),
      products: distributor.products.map(p => ({
        id: p.product.id,
        name: p.product.name,
        name_hi: p.product.nameHi,
      })),
    });
  } catch (error) {
    next(error);
  }
};

