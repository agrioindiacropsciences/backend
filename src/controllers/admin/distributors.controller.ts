import { Response, NextFunction } from 'express';
import prisma from '../../lib/prisma';
import { sendSuccess, sendError } from '../../utils/response';
import { AdminRequest, ErrorCodes } from '../../types';
import { parsePagination, createPagination, sanitizeSearchQuery } from '../../utils/helpers';
import { Prisma } from '@prisma/client';
import { uploadToCloudinary } from '../../utils/cloudinary';
import { NotificationService } from '../../utils/notification.service';
import {
  buildApprovedDistributorSnapshot,
  getDistributorProfileChanges,
} from '../../utils/distributor-profile-changes';

function looksLikeBusinessName(value?: string | null) {
  if (!value) return false;
  return /\b(traders?|trading|fertili[sz]er|fertilizer|pesticides?|beej|bhandar|kendra|agency|enterprises?|sewa|seeds?|crop|science|agro|industries?|mart|store|shop|distributor|brothers|and|&|farm|krishi)\b/i.test(
    value
  );
}

function normalizeCodeSegment(value?: string | null, length = 3, fallback = 'XXX') {
  const cleaned = (value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  if (!cleaned) return fallback.slice(0, length);
  return cleaned.slice(0, length).padEnd(length, 'X');
}

async function generateDealerCode(distributor: {
  id: string;
  addressState?: string | null;
  addressCity?: string | null;
  addressPincode?: string | null;
}) {
  const stateCode = normalizeCodeSegment(distributor.addressState, 2, 'NA');
  const cityCode = normalizeCodeSegment(distributor.addressCity, 3, 'GEN');
  const pincodeDigits = (distributor.addressPincode || '').replace(/\D/g, '');
  const pinCodeSegment = (pincodeDigits.slice(-3) || '000').padStart(3, '0');
  const uuidSeed = distributor.id.replace(/-/g, '').toUpperCase();
  const suffixLengths = [6, 8, 10, 12, uuidSeed.length];

  for (const suffixLength of suffixLengths) {
    const uniqueSuffix = uuidSeed.slice(-suffixLength);
    const candidate = `AGR-${stateCode}-${cityCode}-${pinCodeSegment}-${uniqueSuffix}`;

    const existing = await prisma.distributor.findFirst({
      where: {
        dealerCode: candidate,
        NOT: { id: distributor.id },
      },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }
  }

  return `AGR-${stateCode}-${cityCode}-${pinCodeSegment}-${uuidSeed}`;
}

function mapDistributorForAdmin(d: any) {
  const profileChanges = getDistributorProfileChanges(d.approvedSnapshot, d);
  const isLegacyManualDistributor = !d.ownerId;
  const hasDistinctLegacyNames =
    isLegacyManualDistributor &&
    typeof d.name === 'string' &&
    typeof d.businessName === 'string' &&
    d.name.trim().length > 0 &&
    d.businessName.trim().length > 0 &&
    d.name.trim() !== d.businessName.trim();

  const nameLooksBusiness = looksLikeBusinessName(d.name);
  const businessNameLooksBusiness = looksLikeBusinessName(d.businessName);

  let resolvedBusinessName = d.businessName || d.name;
  let resolvedOwnerName = d.user?.fullName || null;

  if (hasDistinctLegacyNames) {
    if (nameLooksBusiness && !businessNameLooksBusiness) {
      resolvedBusinessName = d.name;
      resolvedOwnerName = d.businessName;
    } else if (!nameLooksBusiness && businessNameLooksBusiness) {
      resolvedBusinessName = d.businessName;
      resolvedOwnerName = d.name;
    } else {
      resolvedBusinessName = d.businessName || d.name;
      resolvedOwnerName = d.name;
    }
  }

  return {
    id: d.id,
    name: resolvedBusinessName,
    owner_id: d.ownerId || null,
    business_name: resolvedBusinessName,
    owner_name: resolvedOwnerName,
    owner_email: d.user?.email || d.email || null,
    owner_phone: d.user?.phoneNumber || d.phone || null,
    phone: d.phone,
    email: d.email,
    address: [d.addressStreet, d.addressArea].filter(Boolean).join(', ') || null,
    address_street: d.addressStreet,
    address_area: d.addressArea,
    city: d.addressCity,
    address_city: d.addressCity,
    state: d.addressState,
    address_state: d.addressState,
    pincode: d.addressPincode,
    address_pincode: d.addressPincode,
    location: `${d.addressCity || ''}, ${d.addressState || ''}`.replace(/^,\s*|,\s*$/g, '').replace(/,\s*$/, '') || null,
    latitude: d.locationLat ? Number(d.locationLat) : null,
    longitude: d.locationLng ? Number(d.locationLng) : null,
    location_lat: d.locationLat ? Number(d.locationLat) : null,
    location_lng: d.locationLng ? Number(d.locationLng) : null,
    coverage_count: d._count?.coverage ?? 0,
    products_count: d._count?.products ?? 0,
    is_verified: d.isVerified,
    is_active: d.isActive,
    verification_status: d.verificationStatus || (d.isVerified ? 'APPROVED' : 'PENDING'),
    dealer_code: d.dealerCode || null,
    aadhaar_number: d.aadhaarNumber || null,
    aadhaar_photo_url: d.aadhaarFrontPhotoUrl || null,
    aadhaar_front_photo_url: d.aadhaarFrontPhotoUrl || null,
    aadhaar_back_photo_url: d.aadhaarBackPhotoUrl || null,
    pan_number: d.panNumber || null,
    pan_photo_url: d.panPhotoUrl || null,
    license_number: d.licenseNumber || null,
    license_photo_url: d.licensePhotoUrl || null,
    gst_number: d.gstNumber || null,
    gst_photo_url: d.gstPhotoUrl || null,
    expected_business_volume: d.expectedBusinessVolume || null,
    is_aadhaar_verified: d.isAadhaarVerified,
    is_pan_verified: d.isPanVerified,
    security_deposit_amount: d.securityDepositAmount ? Number(d.securityDepositAmount) : null,
    security_deposit_check_photo: d.securityDepositCheckPhoto || null,
    security_deposit_check_number: d.securityDepositCheckNumber || null,
    bank_name: d.bankName || null,
    rating: d.rating ? Number(d.rating) : null,
    created_at: d.createdAt,
    has_profile_changes: profileChanges.length > 0,
    profile_change_count: profileChanges.length,
    profile_changes: profileChanges,
  };
}

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
    const requestOnly =
      req.query.request_only === 'true' || req.query.request_only === '1';

    const where: Prisma.DistributorWhereInput = {};

    if (requestOnly) {
      where.ownerId = { not: null };
    }

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
          where.verificationStatus = 'APPROVED';
          break;
        case 'inactive':
          where.isActive = false;
          break;
        case 'pending':
          where.verificationStatus = 'PENDING';
          break;
        case 'approved':
          where.verificationStatus = 'APPROVED';
          break;
        case 'rejected':
          where.verificationStatus = 'REJECTED';
          break;
        default:
          // No status filter — show all
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
          user: {
            select: {
              fullName: true,
              email: true,
              phoneNumber: true,
            },
          },
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
      distributors: distributors.map((d: any) => mapDistributorForAdmin(d)),
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
    const uploads: Record<string, string> = {};

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

      if (files['aadhaar_front_photo']?.[0]) {
        const result = await uploadToCloudinary(files['aadhaar_front_photo'][0].path, 'distributors/documents');
        uploads.aadhaarFrontPhotoUrl = result.url;
      }

      if (files['aadhaar_back_photo']?.[0]) {
        const result = await uploadToCloudinary(files['aadhaar_back_photo'][0].path, 'distributors/documents');
        uploads.aadhaarBackPhotoUrl = result.url;
      }

      if (files['pan_photo']?.[0]) {
        const result = await uploadToCloudinary(files['pan_photo'][0].path, 'distributors/documents');
        uploads.panPhotoUrl = result.url;
      }

      if (files['license_photo']?.[0]) {
        const result = await uploadToCloudinary(files['license_photo'][0].path, 'distributors/documents');
        uploads.licensePhotoUrl = result.url;
      }

      if (files['gst_photo']?.[0]) {
        const result = await uploadToCloudinary(files['gst_photo'][0].path, 'distributors/documents');
        uploads.gstPhotoUrl = result.url;
      }

      if (files['check_photo']?.[0]) {
        const result = await uploadToCloudinary(files['check_photo'][0].path, 'distributors/security_deposits');
        uploads.securityDepositCheckPhoto = result.url;
      }
    }

    const distributor = await prisma.distributor.create({
      data: {
        name: data.name,
        businessName: data.business_name || data.name,
        phone: data.phone,
        whatsapp: data.whatsapp,
        email: data.email,
        addressStreet: data.address?.street || data.address_street || data.address,
        addressArea: data.address?.area || data.address_area,
        addressCity: data.address?.city || data.address_city || data.city,
        addressPincode:
          data.address?.pincode || data.address_pincode || data.pincode,
        addressState: data.address?.state || data.address_state || data.state,
        locationLat: data.location?.lat ?? data.latitude,
        locationLng: data.location?.lng ?? data.longitude,
        openingHours: data.opening_hours,
        expectedBusinessVolume: data.expected_business_volume,
        aadhaarNumber: data.aadhaar_number,
        panNumber: data.pan_number,
        licenseNumber: data.license_number,
        gstNumber: data.gst_number,
        securityDepositCheckNumber: data.security_deposit_check_number,
        bankName: data.bank_name,
        dealerCode: data.dealer_code,
        signatureImageUrl,
        stampImageUrl,
        isVerified: data.is_verified || false,
        isActive: data.is_active !== false,
        approvedSnapshot:
          data.is_verified || data.verification_status === 'APPROVED'
            ? buildApprovedDistributorSnapshot({
                phone: data.phone,
                email: data.email,
                addressStreet: data.address?.street || data.address_street || data.address,
                addressArea: data.address?.area || data.address_area,
                addressCity: data.address?.city || data.address_city || data.city,
                addressPincode: data.address?.pincode || data.address_pincode || data.pincode,
                addressState: data.address?.state || data.address_state || data.state,
                locationLat: data.location?.lat ?? data.latitude,
                locationLng: data.location?.lng ?? data.longitude,
              })
            : undefined,
        ...uploads,
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
      name: distributor.name,
      business_name: distributor.businessName,
      owner_name: distributor.businessName,
      phone: distributor.phone,
      email: distributor.email,
      address: [distributor.addressStreet, distributor.addressArea].filter(Boolean).join(', ') || null,
      city: distributor.addressCity,
      state: distributor.addressState,
      pincode: distributor.addressPincode,
      latitude: distributor.locationLat ? Number(distributor.locationLat) : null,
      longitude: distributor.locationLng ? Number(distributor.locationLng) : null,
      is_active: distributor.isActive,
      is_verified: distributor.isVerified,
      created_at: distributor.createdAt,
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
        user: {
          select: {
            fullName: true,
            email: true,
            phoneNumber: true,
          },
        },
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
      ...mapDistributorForAdmin(distributor),
      coverage_pincodes: distributor.coverage.map((c: any) => c.pincode),
      products: distributor.products.map((p: any) => ({
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
      if (typeof data.address === 'string') updateData.addressStreet = data.address;
      else {
        if (data.address.street !== undefined) updateData.addressStreet = data.address.street;
        if (data.address.area !== undefined) updateData.addressArea = data.address.area;
        if (data.address.city !== undefined) updateData.addressCity = data.address.city;
        if (data.address.pincode !== undefined) updateData.addressPincode = data.address.pincode;
        if (data.address.state !== undefined) updateData.addressState = data.address.state;
      }
    }
    if (data.city !== undefined) updateData.addressCity = data.city;
    if (data.state !== undefined) updateData.addressState = data.state;
    if (data.pincode !== undefined) updateData.addressPincode = data.pincode;
    if (data.addressStreet !== undefined) updateData.addressStreet = data.addressStreet;
    if (data.address_area !== undefined) updateData.addressArea = data.address_area;
    if (data.address_city !== undefined) updateData.addressCity = data.address_city;
    if (data.address_state !== undefined) updateData.addressState = data.address_state;
    if (data.address_pincode !== undefined) updateData.addressPincode = data.address_pincode;
    if (data.location) {
      if (data.location.lat !== undefined) updateData.locationLat = data.location.lat;
      if (data.location.lng !== undefined) updateData.locationLng = data.location.lng;
    }
    if (data.latitude !== undefined) updateData.locationLat = data.latitude;
    if (data.longitude !== undefined) updateData.locationLng = data.longitude;
    if (data.opening_hours !== undefined) updateData.openingHours = data.opening_hours;
    if (data.expected_business_volume !== undefined)
      updateData.expectedBusinessVolume = data.expected_business_volume;
    if (data.aadhaar_number !== undefined) updateData.aadhaarNumber = data.aadhaar_number;
    if (data.pan_number !== undefined) updateData.panNumber = data.pan_number;
    if (data.license_number !== undefined) updateData.licenseNumber = data.license_number;
    if (data.gst_number !== undefined) updateData.gstNumber = data.gst_number;
    if (data.security_deposit_check_number !== undefined)
      updateData.securityDepositCheckNumber = data.security_deposit_check_number;
    if (data.bank_name !== undefined) updateData.bankName = data.bank_name;
    if (data.dealer_code !== undefined) updateData.dealerCode = data.dealer_code;
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

      if (files['aadhaar_front_photo']?.[0]) {
        const result = await uploadToCloudinary(files['aadhaar_front_photo'][0].path, 'distributors/documents');
        updateData.aadhaarFrontPhotoUrl = result.url;
      }

      if (files['aadhaar_back_photo']?.[0]) {
        const result = await uploadToCloudinary(files['aadhaar_back_photo'][0].path, 'distributors/documents');
        updateData.aadhaarBackPhotoUrl = result.url;
      }

      if (files['pan_photo']?.[0]) {
        const result = await uploadToCloudinary(files['pan_photo'][0].path, 'distributors/documents');
        updateData.panPhotoUrl = result.url;
      }

      if (files['license_photo']?.[0]) {
        const result = await uploadToCloudinary(files['license_photo'][0].path, 'distributors/documents');
        updateData.licensePhotoUrl = result.url;
      }

      if (files['gst_photo']?.[0]) {
        const result = await uploadToCloudinary(files['gst_photo'][0].path, 'distributors/documents');
        updateData.gstPhotoUrl = result.url;
      }

      if (files['check_photo']?.[0]) {
        const result = await uploadToCloudinary(files['check_photo'][0].path, 'distributors/security_deposits');
        updateData.securityDepositCheckPhoto = result.url;
      }
    }

    let updatedDistributor = await prisma.distributor.update({
      where: { id },
      data: updateData,
    });

    if (updatedDistributor.verificationStatus === 'APPROVED') {
      updatedDistributor = await prisma.distributor.update({
        where: { id },
        data: {
          approvedSnapshot: buildApprovedDistributorSnapshot(updatedDistributor),
        },
      });
    }

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

    await prisma.$transaction(async (tx) => {
      await tx.scanRedemption.updateMany({
        where: { verifiedByDistributorId: id },
        data: { verifiedByDistributorId: null },
      });

      await tx.distributor.delete({
        where: { id },
      });
    });

    sendSuccess(res, undefined, 'Distributor deleted successfully');
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/admin/distributors/:id/verify
export const verifyDistributor = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { id } = req.params;
    const { status, remarks, dealer_code } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return sendError(res, ErrorCodes.VALIDATION_ERROR, 'Invalid status', 400);
    }

    const distributor = await prisma.distributor.findUnique({ where: { id } });
    if (!distributor) {
      return sendError(res, ErrorCodes.NOT_FOUND, 'Distributor not found', 404);
    }

    const resolvedDealerCode =
      status === 'APPROVED'
        ? (dealer_code || distributor.dealerCode || await generateDealerCode(distributor))
        : (dealer_code || distributor.dealerCode);

    let updatedDistributor = await prisma.distributor.update({
      where: { id },
      data: {
        verificationStatus: status,
        isVerified: status === 'APPROVED',
        dealerCode: resolvedDealerCode,
      },
    });

    if (status === 'APPROVED') {
      updatedDistributor = await prisma.distributor.update({
        where: { id },
        data: {
          approvedSnapshot: buildApprovedDistributorSnapshot(updatedDistributor),
        },
      });
    }

    if (status === 'APPROVED' && updatedDistributor.ownerId) {
      try {
        await NotificationService.sendToUser(
          updatedDistributor.ownerId,
          'Distributor application approved',
          'Your distributor profile has been approved. You can now access the dealer home.',
          undefined,
          {
            type: 'SYSTEM',
            slug: 'dealer_home',
            event: 'dealer_approved',
            distributorId: updatedDistributor.id,
            dealerCode: updatedDistributor.dealerCode || '',
          }
        );
      } catch (notificationError) {
        console.error(
          `Failed to send distributor approval notification for distributor ${updatedDistributor.id}:`,
          notificationError
        );
      }
    }

    sendSuccess(res, updatedDistributor, `Distributor ${status.toLowerCase()} successfully`);
  } catch (error) {
    next(error);
  }
};
