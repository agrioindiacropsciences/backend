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
    const q = req.query.q as string;
    const pincode = req.query.pincode as string;
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;
    const radiusKm = req.query.radius ? parseFloat(req.query.radius as string) : 50; // Default 50km radius for discovery

    const { page, limit, skip } = parsePagination(
      req.query.page as string,
      req.query.limit as string
    );

    const where: Prisma.DistributorWhereInput = {
      isActive: true,
    };

    // 1. Filter by Pincode or Coverage if pincode provided
    if (pincode) {
      const coverageRecords = await prisma.distributorCoverage.findMany({
        where: { pincode },
        select: { distributorId: true },
      });
      const coveredDistributorIds = coverageRecords.map(c => c.distributorId);

      where.OR = [
        ...(where.OR || []),
        { id: { in: coveredDistributorIds } },
        { addressPincode: pincode },
      ];
    }

    // 2. Filter by Search Query if provided
    if (q) {
      const searchTerms = {
        contains: q,
        mode: Prisma.QueryMode.insensitive,
      };
      where.OR = [
        ...(where.OR || []),
        { name: searchTerms },
        { businessName: searchTerms },
        { addressCity: searchTerms },
        { addressStreet: searchTerms },
        { addressArea: searchTerms },
        { addressState: searchTerms },
        { addressPincode: searchTerms },
      ];
    }

    // Fetch distributors (we'll filter by distance in JS for precision)
    let distributors = await prisma.distributor.findMany({
      where,
      orderBy: { rating: 'desc' },
    });

    // 3. Radius Filtering & Distance Calculation
    let formattedDistributors = distributors.map(d => {
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

    // If coordinates are provided, prioritize results within radius AND sort by distance
    if (lat && lng) {
      // If we're strictly searching "nearby" (no text query/pincode), filter by radius
      // But if there's a specific search, just use distance for sorting
      if (!q && !pincode) {
        formattedDistributors = formattedDistributors.filter(d =>
          d.distance_km !== null && d.distance_km <= radiusKm
        );
      }

      formattedDistributors.sort((a, b) => {
        if (a.distance_km === null) return 1;
        if (b.distance_km === null) return -1;
        return a.distance_km - b.distance_km;
      });
    }

    // Manual Pagination after processing
    const total = formattedDistributors.length;
    const paginatedDistributors = formattedDistributors.slice(skip, skip + limit);

    sendSuccess(res, {
      distributors: paginatedDistributors,
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

