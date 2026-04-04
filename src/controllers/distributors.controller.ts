import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthenticatedRequest, ErrorCodes } from '../types';
import { uploadToCloudinary } from '../utils/cloudinary';
import { parsePagination, createPagination, calculateDistance } from '../utils/helpers';
import { generateRequestId } from '../utils/otp';
import {
  createDigilockerUrl,
  getDigilockerDocument,
  getDigilockerStatus,
  verifyDigilockerAccount,
  verifyGstinWithCashfree,
  verifyNameMatchWithCashfree,
  verifyPanWithCashfree,
} from '../utils/cashfree';
import { buildApprovedDistributorSnapshot } from '../utils/distributor-profile-changes';

const LICENSE_NUMBER_REGEX = /^[A-Z0-9/\- ]{5,30}$/;
const CHEQUE_NUMBER_REGEX = /^\d{6}$/;

const getDigilockerRedirectUrl = (): string =>
  process.env.CASHFREE_DIGILOCKER_REDIRECT_URL ||
  'https://www.cashfree.com/docs';

const isCashfreePositiveStatus = (
  status: string | null | undefined,
  positiveStatuses: string[],
) => positiveStatuses.includes(String(status || '').toUpperCase());

const resolveDigilockerUserFlow = (
  verifyAccountResponse: Record<string, unknown>,
): 'signin' | 'signup' => {
  const status = String(
    verifyAccountResponse['status'] ??
        verifyAccountResponse['account_status'] ??
        '',
  ).toUpperCase();
  const message = String(
    verifyAccountResponse['message'] ?? '',
  ).toUpperCase();

  if (
    status.includes('EXIST') ||
    status.includes('SIGNIN') ||
    message.includes('EXIST')
  ) {
    return 'signin';
  }

  return 'signup';
};

const upsertDistributorVerificationDraft = async (
  userId: string,
  data: Record<string, unknown>,
) => {
  return prisma.distributorVerificationDraft.upsert({
    where: { userId },
    create: {
      userId,
      ...data,
    },
    update: data,
  });
};

const normalizeNameForCompare = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9\s&/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const extractNameMatchScore = (result: Record<string, any>): number => {
  const rawScore =
    result.name_match_score ??
    result.match_score ??
    result.similarity_score ??
    result.score ??
    0;
  const parsed = Number(rawScore);
  return Number.isFinite(parsed) ? parsed : 0;
};

const extractNameMatchResult = (result: Record<string, any>): string =>
  String(
    result.name_match_result ??
      result.match_result ??
      result.result ??
      result.status ??
      '',
  ).toUpperCase();

const isStrongNameMatch = (result: Record<string, any>): boolean => {
  const matchResult = extractNameMatchResult(result);
  const score = extractNameMatchScore(result);

  return (
    matchResult.includes('DIRECT_MATCH') ||
    matchResult.includes('EXACT') ||
    matchResult.includes('GOOD_PARTIAL_MATCH') ||
    score >= 70
  );
};

const isBusinessPan = (pan: string, panType?: string): boolean => {
  const holderType = pan.length >= 4 ? pan[3].toUpperCase() : '';
  const resolvedType = String(panType || '').toUpperCase();

  if (resolvedType.includes('INDIVIDUAL')) {
    return false;
  }

  return holderType !== 'P';
};

const selectRegisteredBusinessName = (result: Record<string, any>): string =>
  String(
    result.legal_name_of_business ??
      result.trade_name_of_business ??
      result.legal_name ??
      result.trade_name ??
      result.registered_name ??
      '',
  ).trim();

const isPositivePanResponse = (result: Record<string, any>): boolean =>
  result.valid === true &&
  String(result.pan_status ?? result.status ?? '').toUpperCase() === 'VALID';

const isPositiveGstResponse = (result: Record<string, any>): boolean => {
  const status = String(
    result.gst_in_status ?? result.gstin_status ?? result.status ?? '',
  ).toUpperCase();
  return result.valid === true && (status === 'ACTIVE' || status === 'VALID');
};

const isCashfreeSandboxMode = (): boolean => {
  const configuredBaseUrl =
    process.env.CASHFREE_BASE_URL || 'https://sandbox.cashfree.com/verification';
  return configuredBaseUrl.toLowerCase().includes('sandbox');
};

const isVerificationNameMatchBypassEnabled = (): boolean => {
  const rawValue = String(
    process.env.CASHFREE_BYPASS_NAME_MATCH_IN_SANDBOX || '',
  ).toLowerCase();
  return isCashfreeSandboxMode() && (rawValue === 'true' || rawValue === '1');
};

const resolveInvalidVerificationMessage = (
  result: Record<string, any>,
  fallbackMessage: string,
): string => {
  const rawMessage = String(result.message ?? '').trim();
  const normalized = rawMessage.toUpperCase();

  if (
    rawMessage.length === 0 ||
    normalized.includes('VERIFIED SUCCESSFULLY') ||
    normalized.includes('SUCCESS')
  ) {
    return fallbackMessage;
  }

  return rawMessage;
};

const resolvePanFailureMessage = (
  result: Record<string, any>,
  expectedBusinessName: string,
): string => {
  const registeredName = String(
    result.registered_name || result.name || result.full_name || '',
  ).trim();
  const directNameMatchResult = extractNameMatchResult(result);

  if (
    registeredName.length > 0 &&
    expectedBusinessName.trim().length > 0 &&
    (directNameMatchResult.includes('NO_MATCH') ||
        directNameMatchResult.includes('POOR') ||
        (!isStrongNameMatch(result) &&
            normalizeNameForCompare(expectedBusinessName) !==
                normalizeNameForCompare(registeredName)))
  ) {
    return 'Business name does not match the registered PAN name';
  }

  if (isCashfreeSandboxMode()) {
    return 'Sandbox PAN verification accepts only supported Cashfree business PAN test data. Use the exact Cashfree test PAN with its matching business name, or switch to production for real PAN verification.';
  }

  return resolveInvalidVerificationMessage(result, 'Invalid PAN number');
};

const isLikelyPanNameMismatch = (
  result: Record<string, any>,
  expectedBusinessName: string,
): boolean => {
  const registeredName = String(
    result.registered_name || result.name || result.full_name || '',
  ).trim();
  const directNameMatchResult = extractNameMatchResult(result);
  const rawMessage = String(result.message ?? '').toUpperCase();

  return (
    registeredName.length > 0 &&
    expectedBusinessName.trim().length > 0 &&
    (rawMessage.includes('NAME') ||
      rawMessage.includes('MATCH') ||
      directNameMatchResult.includes('NO_MATCH') ||
      directNameMatchResult.includes('POOR') ||
      normalizeNameForCompare(expectedBusinessName) !==
        normalizeNameForCompare(registeredName))
  );
};

// POST /api/v1/distributors/verify/pan
export const verifyPan = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void | Response> => {
  try {
    const userId = req.userId;
    if (!userId) {
      return sendError(res, ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401);
    }

    const pan = String(req.body.pan_number || req.body.pan || '')
      .trim()
      .toUpperCase();
    const ownerName = String(
      req.body.owner_name || req.body.name || req.user?.fullName || '',
    ).trim();
    const businessName = String(req.body.business_name || '').trim();

    if (!pan) {
      return sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        'PAN number is required',
        400,
      );
    }

    if (!businessName) {
      return sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        'Business name is required to verify business PAN',
        400,
      );
    }

    if (pan.length >= 4 && pan[3].toUpperCase() === 'P') {
      return sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        'Distributor verification requires a business PAN. Individual PAN is not allowed.',
        400,
      );
    }

    const verificationId = generateRequestId();
    const expectedName = businessName;
    const result = await verifyPanWithCashfree(pan, expectedName);
    const registeredName = String(
      result.registered_name || result.name || result.full_name || '',
    ).trim();
    const panType = String(result.type || '').trim();

    if (!isPositivePanResponse(result)) {
      if (isVerificationNameMatchBypassEnabled() &&
          isLikelyPanNameMismatch(result, expectedName)) {
        result['name_match_bypassed'] = true;

        await upsertDistributorVerificationDraft(userId, {
          panNumber: pan,
          panStatus: 'VALID',
          panReferenceId: result.reference_id?.toString() || null,
          panData: {
            ...result,
            expected_name: expectedName,
            registered_name: registeredName,
            name_match_bypassed: true,
          },
        });

        return sendSuccess(
          res,
          {
            verification_id: verificationId,
            status: 'VALID',
            registered_name: registeredName.length === 0 ? null : registeredName,
            pan_number: result.pan || pan,
            pan_type: panType,
            name_match_bypassed: true,
            raw: {
              ...result,
              valid: true,
              pan_status: 'VALID',
            },
          },
          'PAN verified in sandbox debug mode',
        );
      }

      await upsertDistributorVerificationDraft(userId, {
        panNumber: pan,
        panStatus: String(result.pan_status || result.status || 'INVALID'),
        panReferenceId: result.reference_id?.toString() || null,
        panData: result,
      });

      return sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        resolvePanFailureMessage(result, expectedName),
        400,
      );
    }

    if (!isBusinessPan(pan, panType)) {
      return sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        'Only business PAN is allowed in distributor verification',
        400,
        {
          pan_type: panType,
        },
      );
    }

    let nameMatchScore = extractNameMatchScore(result);
    let nameMatchResult = extractNameMatchResult(result);
    let nameMatchPassed = isStrongNameMatch(result);

    if (!nameMatchPassed && registeredName.length > 0) {
      const nameMatchResponse = await verifyNameMatchWithCashfree(
        generateRequestId(),
        normalizeNameForCompare(expectedName),
        normalizeNameForCompare(registeredName),
      );
      nameMatchScore = extractNameMatchScore(nameMatchResponse);
      nameMatchResult = extractNameMatchResult(nameMatchResponse);
      nameMatchPassed =
          isStrongNameMatch(nameMatchResponse) ||
          normalizeNameForCompare(expectedName) ===
              normalizeNameForCompare(registeredName);

      result['cashfree_name_match'] = nameMatchResponse;
    }

    if (!nameMatchPassed) {
      if (isVerificationNameMatchBypassEnabled()) {
        result['name_match_bypassed'] = true;

        await upsertDistributorVerificationDraft(userId, {
          panNumber: pan,
          panStatus: String(result.pan_status || result.status || 'VALID'),
          panReferenceId: result.reference_id?.toString() || null,
          panData: {
            ...result,
            expected_name: expectedName,
            registered_name: registeredName,
            name_match_score: nameMatchScore,
            name_match_result: nameMatchResult,
            name_match_bypassed: true,
          },
        });

        return sendSuccess(
          res,
          {
            verification_id: verificationId,
            status: result.pan_status || result.status,
            registered_name:
              registeredName.length === 0 ? null : registeredName,
            pan_number: result.pan || pan,
            pan_type: panType,
            name_match_score: nameMatchScore,
            name_match_result: nameMatchResult,
            name_match_bypassed: true,
            raw: result,
          },
          'PAN verified in sandbox debug mode',
        );
      }

      await upsertDistributorVerificationDraft(userId, {
        panNumber: pan,
        panStatus: 'NAME_MISMATCH',
        panReferenceId: result.reference_id?.toString() || null,
        panData: {
          ...result,
          expected_name: expectedName,
          registered_name: registeredName,
          name_match_score: nameMatchScore,
          name_match_result: nameMatchResult,
        },
      });

      return sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        'Business name does not match the registered PAN name',
        400,
        {
          registered_name: registeredName,
          expected_name: expectedName,
          name_match_score: nameMatchScore,
          name_match_result: nameMatchResult,
          pan_type: panType,
        },
      );
    }

    await upsertDistributorVerificationDraft(userId, {
      panNumber: pan,
      panStatus: String(result.pan_status || result.status || 'VALID'),
      panReferenceId: result.reference_id?.toString() || null,
      panData: {
        ...result,
        expected_name: expectedName,
        registered_name: registeredName,
        name_match_score: nameMatchScore,
        name_match_result: nameMatchResult,
      },
    });

    return sendSuccess(
      res,
      {
        verification_id: verificationId,
        status: result.pan_status || result.status,
        registered_name: registeredName.length === 0 ? null : registeredName,
        pan_number: result.pan || pan,
        pan_type: panType,
        name_match_score: nameMatchScore,
        name_match_result: nameMatchResult,
        raw: result,
      },
      'PAN verified successfully',
    );
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/distributors/verify/gst
export const verifyGst = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void | Response> => {
  try {
    const userId = req.userId;
    if (!userId) {
      return sendError(res, ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401);
    }

    const gstin = String(req.body.gst_number || req.body.gstin || '')
      .trim()
      .toUpperCase();
    const businessName = String(req.body.business_name || '').trim();

    if (!gstin) {
      return sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        'GST number is required',
        400,
      );
    }

    if (!businessName) {
      return sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        'Business name is required for GST verification',
        400,
      );
    }

    const result = await verifyGstinWithCashfree(gstin, businessName || undefined);
    const registeredBusinessName = selectRegisteredBusinessName(result);

    if (!isPositiveGstResponse(result)) {
      await upsertDistributorVerificationDraft(userId, {
        gstNumber: gstin,
        gstStatus: String(
          result.gst_in_status || result.gstin_status || result.status || 'INVALID',
        ),
        gstReferenceId: result.reference_id?.toString() || null,
        gstData: result,
      });

      return sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        resolveInvalidVerificationMessage(
          result,
          'Invalid or inactive GST number',
        ),
        400,
      );
    }

    const nameMatchResponse = await verifyNameMatchWithCashfree(
      generateRequestId(),
      normalizeNameForCompare(businessName),
      normalizeNameForCompare(registeredBusinessName),
    );
    const nameMatchScore = extractNameMatchScore(nameMatchResponse);
    const nameMatchResult = extractNameMatchResult(nameMatchResponse);
    const isBusinessNameMatched =
      isStrongNameMatch(nameMatchResponse) ||
      normalizeNameForCompare(businessName) ===
          normalizeNameForCompare(registeredBusinessName);

    if (!isBusinessNameMatched) {
      if (isVerificationNameMatchBypassEnabled()) {
        result['name_match_bypassed'] = true;
        result['cashfree_name_match'] = nameMatchResponse;

        await upsertDistributorVerificationDraft(userId, {
          gstNumber: gstin,
          gstStatus: String(
            result.gst_in_status || result.gstin_status || result.status || 'ACTIVE',
          ),
          gstReferenceId: result.reference_id?.toString() || null,
          gstData: {
            ...result,
            expected_name: businessName,
            registered_name: registeredBusinessName,
            name_match_score: nameMatchScore,
            name_match_result: nameMatchResult,
            name_match_bypassed: true,
          },
        });

        return sendSuccess(
          res,
          {
            verification_id: result.reference_id?.toString() || generateRequestId(),
            status: result.gst_in_status || result.gstin_status || result.status,
            legal_name:
              registeredBusinessName.length === 0 ? null : registeredBusinessName,
            gst_number: result.gstin || result.GSTIN || gstin,
            name_match_score: nameMatchScore,
            name_match_result: nameMatchResult,
            name_match_bypassed: true,
            raw: result,
          },
          'GST verified in sandbox debug mode',
        );
      }

      await upsertDistributorVerificationDraft(userId, {
        gstNumber: gstin,
        gstStatus: 'NAME_MISMATCH',
        gstReferenceId: result.reference_id?.toString() || null,
        gstData: {
          ...result,
          cashfree_name_match: nameMatchResponse,
          expected_name: businessName,
          registered_name: registeredBusinessName,
        },
      });

      return sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        'Business name does not match the GST registered name',
        400,
        {
          registered_name: registeredBusinessName,
          expected_name: businessName,
          name_match_score: nameMatchScore,
          name_match_result: nameMatchResult,
        },
      );
    }

    await upsertDistributorVerificationDraft(userId, {
      gstNumber: gstin,
      gstStatus: String(
        result.gst_in_status || result.gstin_status || result.status || 'ACTIVE',
      ),
      gstReferenceId: result.reference_id?.toString() || null,
      gstData: {
        ...result,
        cashfree_name_match: nameMatchResponse,
        expected_name: businessName,
        registered_name: registeredBusinessName,
      },
    });

    return sendSuccess(
      res,
      {
        status: result.gst_in_status || result.gstin_status || result.status,
        gst_number: result.gstin || result.GSTIN || gstin,
        legal_name:
          registeredBusinessName.length === 0 ? null : registeredBusinessName,
        name_match_score: nameMatchScore,
        name_match_result: nameMatchResult,
        raw: result,
      },
      'GST verified successfully',
    );
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/distributors/verify/aadhaar/initiate
export const initiateAadhaarVerification = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void | Response> => {
  try {
    const userId = req.userId;
    if (!userId) {
      return sendError(res, ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401);
    }

    const aadhaarNumber = String(req.body.aadhaar_number || '')
      .trim()
      .replaceAll(' ', '');
    if (!aadhaarNumber) {
      return sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        'Aadhaar number is required',
        400,
      );
    }

    const verificationId = generateRequestId();
    const accountResult = await verifyDigilockerAccount(
      verificationId,
      aadhaarNumber,
    );
    const userFlow = resolveDigilockerUserFlow(accountResult);
    const createUrlResult = await createDigilockerUrl(
      verificationId,
      getDigilockerRedirectUrl(),
      userFlow,
    );

    await upsertDistributorVerificationDraft(userId, {
      aadhaarNumber,
      aadhaarVerificationId: verificationId,
      aadhaarReferenceId:
        createUrlResult.reference_id?.toString() ||
        accountResult.reference_id?.toString() ||
        null,
      aadhaarStatus:
        String(createUrlResult.status || accountResult.status || 'PENDING'),
      aadhaarUserDetails: accountResult,
    });

    return sendSuccess(
      res,
      {
        verification_id: verificationId,
        reference_id:
          createUrlResult.reference_id || accountResult.reference_id || null,
        status: createUrlResult.status || accountResult.status,
        user_flow: userFlow,
        verification_url:
          createUrlResult.verification_url ||
          createUrlResult.url ||
          createUrlResult.link,
        redirect_url: getDigilockerRedirectUrl(),
        raw: createUrlResult,
      },
      'Aadhaar DigiLocker verification started',
    );
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/distributors/verify/aadhaar/status/:verificationId
export const getAadhaarVerificationStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void | Response> => {
  try {
    const userId = req.userId;
    if (!userId) {
      return sendError(res, ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401);
    }

    const verificationId = String(req.params.verificationId || '').trim();
    if (!verificationId) {
      return sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        'Verification ID is required',
        400,
      );
    }

    const draft = await prisma.distributorVerificationDraft.findUnique({
      where: { userId },
    });

    const result = await getDigilockerStatus({
      verificationId,
      referenceId: draft?.aadhaarReferenceId || undefined,
    });

    let documentResult: Record<string, any> | null = null;
    const status = String(result.status || '');
    if (
      status === 'SUCCESS' ||
      status === 'AUTHENTICATED' ||
      status === 'COMPLETED'
    ) {
      documentResult = await getDigilockerDocument('AADHAAR', verificationId);
    }

    await upsertDistributorVerificationDraft(userId, {
      aadhaarVerificationId: verificationId,
      aadhaarReferenceId:
        result.reference_id?.toString() || draft?.aadhaarReferenceId || null,
      aadhaarStatus:
        String(documentResult?.status || result.status || draft?.aadhaarStatus || ''),
      aadhaarUserDetails: result,
      aadhaarDocumentData: documentResult,
    });

    return sendSuccess(
      res,
      {
        verification_id: verificationId,
        reference_id: result.reference_id || draft?.aadhaarReferenceId || null,
        status: documentResult?.status || result.status,
        user_details: result,
        document_data: documentResult,
        is_verified: isCashfreePositiveStatus(documentResult?.status, [
          'SUCCESS',
          'AUTHENTICATED',
          'COMPLETED',
        ]),
      },
      'Aadhaar verification status fetched',
    );
  } catch (error) {
    next(error);
  }
};
export const getMyDistributorProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const userId = req.userId;
    if (!userId) return sendError(res, ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401);

    const distributor = await prisma.distributor.findUnique({
      where: { ownerId: userId },
      include: {
        coverage: true,
      }
    });

    if (!distributor) {
      return sendSuccess(res, null, 'No distributor profile found');
    }

    // Safety: ensure verified states are consistent for approved profiles
    if (distributor.verificationStatus === 'APPROVED') {
      if (distributor.gstNumber && !distributor.isGstVerified) distributor.isGstVerified = true;
      if (distributor.panNumber && !distributor.isPanVerified) distributor.isPanVerified = true;
      if (distributor.aadhaarNumber && !distributor.isAadhaarVerified) distributor.isAadhaarVerified = true;
    }

    sendSuccess(res, distributor);
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/distributor/onboard
export const onboardDistributor = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const userId = req.userId;
    if (!userId) return sendError(res, ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401);

    const data = req.body;
    const files = req.files as { [fieldname: string]: any[] } | undefined;
    const normalizedLicenseNumber = String(data.license_number || '')
      .trim()
      .toUpperCase();
    const normalizedChequeNumber = String(data.check_number || '')
      .replace(/\D/g, '')
      .slice(0, 6);
    const existingDistributor = await prisma.distributor.findUnique({
      where: { ownerId: userId },
    });
    const isApprovedDistributor = existingDistributor?.verificationStatus === 'APPROVED';
    const verificationDraft = await prisma.distributorVerificationDraft.findUnique({
      where: { userId },
    });

    const isPanVerified = isCashfreePositiveStatus(
      verificationDraft?.panStatus,
      ['VALID', 'VERIFIED', 'SUCCESS'],
    );
    const isGstVerified = isCashfreePositiveStatus(
      verificationDraft?.gstStatus,
      ['VALID', 'ACTIVE', 'VERIFIED', 'SUCCESS'],
    );
    const isAadhaarVerified = isCashfreePositiveStatus(
      verificationDraft?.aadhaarStatus,
      ['SUCCESS', 'AUTHENTICATED', 'COMPLETED'],
    );

    if (!isApprovedDistributor && !isPanVerified) {
      return sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        'Please verify PAN before submitting dealer onboarding',
        400,
      );
    }

    if (!isApprovedDistributor && !isGstVerified) {
      return sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        'Please verify GST before submitting dealer onboarding',
        400,
      );
    }

    if (!isApprovedDistributor && !isAadhaarVerified) {
      return sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        'Please complete Aadhaar DigiLocker verification before submitting dealer onboarding',
        400,
      );
    }

    if (!isApprovedDistributor && !LICENSE_NUMBER_REGEX.test(normalizedLicenseNumber)) {
      return sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        'License number must be 5-30 characters and may only contain letters, numbers, spaces, slashes, or hyphens',
        400,
      );
    }

    if (!isApprovedDistributor && !CHEQUE_NUMBER_REGEX.test(normalizedChequeNumber)) {
      return sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        'Cheque number must be exactly 6 digits',
        400,
      );
    }

    // Handle Document Uploads
    const uploads: any = {};
    if (files && !isApprovedDistributor) {
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

    const baseUpdateData: any = {
      phone: data.phone,
      whatsapp: data.whatsapp,
      email: data.email,
      addressStreet: data.address_street,
      addressArea: data.address_area,
      addressCity: data.address_city,
      addressPincode: data.address_pincode,
      addressState: data.address_state,
      locationLat: data.latitude ? parseFloat(data.latitude) : undefined,
      locationLng: data.longitude ? parseFloat(data.longitude) : undefined,
    };

    const sensitiveUpdateData: any = isApprovedDistributor
      ? {
          name: existingDistributor?.name,
          businessName: existingDistributor?.businessName,
          aadhaarNumber: existingDistributor?.aadhaarNumber,
          panNumber: existingDistributor?.panNumber,
          isAadhaarVerified: existingDistributor?.isAadhaarVerified,
          isPanVerified: existingDistributor?.isPanVerified,
          isGstVerified: existingDistributor?.isGstVerified,
          expectedBusinessVolume: existingDistributor?.expectedBusinessVolume,
          licenseNumber: existingDistributor?.licenseNumber,
          gstNumber: existingDistributor?.gstNumber,
          securityDepositAmount: existingDistributor?.securityDepositAmount,
          securityDepositCheckNumber: existingDistributor?.securityDepositCheckNumber,
          bankName: existingDistributor?.bankName,
          verificationStatus: existingDistributor?.verificationStatus,
        }
      : {
          name: data.business_name || data.name,
          businessName: data.business_name || data.name,
          aadhaarNumber: data.aadhaar_number,
          panNumber: data.pan_number,
          isAadhaarVerified,
          isPanVerified,
          isGstVerified,
          expectedBusinessVolume: data.expected_business_volume,
          licenseNumber: normalizedLicenseNumber,
          gstNumber: data.gst_number,
          securityDepositAmount: null,
          securityDepositCheckNumber: normalizedChequeNumber,
          bankName: data.bank_name,
          verificationStatus: 'PENDING',
          ...uploads,
        };

    const distributor = await prisma.distributor.upsert({
      where: { ownerId: userId },
      update: {
        ...baseUpdateData,
        ...sensitiveUpdateData,
        ...(isApprovedDistributor && !existingDistributor?.approvedSnapshot
          ? { approvedSnapshot: buildApprovedDistributorSnapshot(existingDistributor) }
          : {}),
      },
      create: {
        ownerId: userId,
        name: data.business_name || data.name,
        businessName: data.business_name || data.name,
        phone: data.phone,
        email: data.email,
        addressStreet: data.address_street,
        addressArea: data.address_area,
        addressCity: data.address_city,
        addressPincode: data.address_pincode,
        addressState: data.address_state,
        locationLat: data.latitude ? parseFloat(data.latitude) : 0,
        locationLng: data.longitude ? parseFloat(data.longitude) : 0,
        aadhaarNumber: data.aadhaar_number,
        panNumber: data.pan_number,
        isAadhaarVerified,
        isPanVerified,
        isGstVerified,
        expectedBusinessVolume: data.expected_business_volume,
        licenseNumber: normalizedLicenseNumber,
        gstNumber: data.gst_number,
        securityDepositAmount: null,
        securityDepositCheckNumber: normalizedChequeNumber,
        bankName: data.bank_name,
        whatsapp: data.whatsapp,
        isVerified: false,
        verificationStatus: 'PENDING',
        ...uploads
      }
    });

    // Update user role to DEALER
    await prisma.user.update({
      where: { id: userId },
      data: { role: 'DEALER' }
    });

    sendSuccess(res, distributor, 'Onboarding details submitted for verification');
  } catch (error) {
    next(error);
  }
};

// Public method to list distributors (Nearby logic)
// GET /api/v1/distributors?lat=...&lng=...&pincode=...
export const getDistributors = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { page, limit, skip } = parsePagination(req.query.page as string, req.query.limit as string);
    const { lat, lng, pincode, q } = req.query;

    const where: any = {
      isActive: true,
      isVerified: true,
      verificationStatus: 'APPROVED',
      dealerCode: { not: null }, // Only show fully approved dealers
    };

    if (pincode) {
      where.addressPincode = pincode as string;
    }

    if (q) {
      where.OR = [
        { name: { contains: q as string, mode: 'insensitive' } },
        { businessName: { contains: q as string, mode: 'insensitive' } },
      ];
    }

    const [distributors, total] = await Promise.all([
      prisma.distributor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.distributor.count({ where })
    ]);

    // If lat/lng provided, calculate distance and sort (simple in-memory sort for now)
    let sortedDistributors = distributors.map((d: any) => ({
      ...d,
      distance: (lat && lng && d.locationLat && d.locationLng) 
        ? calculateDistance(parseFloat(lat as string), parseFloat(lng as string), Number(d.locationLat), Number(d.locationLng))
        : null
    }));

    if (lat && lng) {
      sortedDistributors.sort((a: any, b: any) => (a.distance || Infinity) - (b.distance || Infinity));
    }

    sendSuccess(res, {
      items: sortedDistributors,
      pagination: createPagination(total, page, limit)
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
      include: {
        coverage: true,
        products: {
            include: {
                product: true
            }
        }
      }
    });

    if (!distributor) {
      return sendError(res, ErrorCodes.NOT_FOUND, 'Distributor not found', 404);
    }

    if (
      !distributor.isActive ||
      !distributor.isVerified ||
      distributor.verificationStatus !== 'APPROVED' ||
      !distributor.dealerCode
    ) {
      return sendError(res, ErrorCodes.NOT_FOUND, 'Distributor not found', 404);
    }

    sendSuccess(res, distributor);
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
      const coverage = await prisma.distributorCoverage.findMany({
        where: { distributorId: id }
      });
      sendSuccess(res, coverage);
    } catch (error) {
      next(error);
    }
  };
