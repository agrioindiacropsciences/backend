import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { sendOtpSchema, verifyOtpSchema, refreshTokenSchema } from '../utils/validation';
import { generateRequestId, getOtpExpiry, sendOtpViaSms, verifyOtpWithTwilio } from '../utils/otp';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, getTokenExpiry } from '../utils/jwt';
import { AuthenticatedRequest, ErrorCodes } from '../types';
import { AppError } from '../middleware/errorHandler';

// Check if running in development mode
const isDevelopment = process.env.NODE_ENV !== 'production';
const DEV_OTP_CODE = '123456'; // Dev bypass OTP code

// POST /api/v1/auth/send-otp
export const sendOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { phone_number } = sendOtpSchema.parse(req.body);

    // Generate request ID for tracking
    const requestId = generateRequestId();
    const expiresAt = getOtpExpiry();

    // Delete any existing OTP verification records for this phone number
    await prisma.otpVerification.deleteMany({
      where: { phoneNumber: phone_number },
    });

    // Send OTP via Twilio Verify API
    const smsResult = await sendOtpViaSms(phone_number);

    // Store verification record (even if Twilio fails, we track the attempt)
    if (smsResult.verificationSid || isDevelopment || !process.env.TWILIO_VERIFY_SERVICE_SID) {
      await prisma.otpVerification.create({
        data: {
          phoneNumber: phone_number,
          otpCode: 'TWILIO', // Placeholder - Twilio manages the OTP
          requestId,
          expiresAt,
          isVerified: false,
        },
      });
    }

    // In production, log error if SMS fails but still allow OTP to be stored
    if (!smsResult.success) {
      console.error(`❌ Failed to send OTP via Twilio to ${phone_number}:`, smsResult.message);
      // Still return success - OTP request is tracked in DB
      // User might need to verify phone number in Twilio console (trial accounts)
    }

    sendSuccess(res, {
      request_id: requestId,
      verification_sid: smsResult.verificationSid,
      expires_in: 600, // 10 minutes (Twilio default)
    }, smsResult.success ? 'OTP sent successfully' : 'OTP request initiated. Please check your phone.');
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/auth/verify-otp
export const verifyOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { phone_number, otp_code } = verifyOtpSchema.parse(req.body);

    // Check if Twilio is configured
    const twilioNotConfigured = !process.env.TWILIO_VERIFY_SERVICE_SID;
    
    // DEV MODE or No Twilio: Allow bypass with "123456" code
    const isDevBypass = (isDevelopment || twilioNotConfigured) && otp_code === DEV_OTP_CODE;

    if (!isDevBypass) {
      // Find OTP verification record (tracking that send-otp was called)
      const otpRecord = await prisma.otpVerification.findFirst({
        where: {
          phoneNumber: phone_number,
          isVerified: false,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!otpRecord) {
        throw new AppError('No OTP request found. Please request a new OTP.', ErrorCodes.OTP_INVALID, 400);
      }

      // Check expiry
      if (new Date() > otpRecord.expiresAt) {
        await prisma.otpVerification.delete({ where: { id: otpRecord.id } });
        throw new AppError('OTP has expired. Please request a new one.', ErrorCodes.OTP_EXPIRED, 400);
      }

      // Verify OTP with Twilio
      const verificationResult = await verifyOtpWithTwilio(phone_number, otp_code);

      if (!verificationResult.valid) {
        throw new AppError(
          verificationResult.message || 'Invalid OTP code.',
          ErrorCodes.OTP_INVALID,
          400
        );
      }

      // Mark OTP as verified
      await prisma.otpVerification.update({
        where: { id: otpRecord.id },
        data: { isVerified: true },
      });
    } else {
      console.log(`🔓 [BYPASS] Verified ${phone_number} with OTP: ${otp_code}`);
    }

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { phoneNumber: phone_number },
      include: {
        preferences: true,
        crops: {
          include: { crop: true },
        },
      },
    });

    const isNewUser = !user;

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          phoneNumber: phone_number,
          preferences: {
            create: {
              prefLanguage: 'en',
            },
          },
        },
        include: {
          preferences: true,
          crops: {
            include: { crop: true },
          },
        },
      });
    } else {
      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });
    }

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      phoneNumber: user.phoneNumber,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: getTokenExpiry(process.env.JWT_REFRESH_EXPIRES_IN || '30d'),
      },
    });

    // Clean up old OTPs
    await prisma.otpVerification.deleteMany({
      where: { phoneNumber: phone_number },
    });

    // Build response based on user status
    const userData = isNewUser ? {
      id: user.id,
      phone_number: user.phoneNumber,
    } : {
      id: user.id,
      phone_number: user.phoneNumber,
      full_name: user.fullName,
      email: user.email,
      role: user.role,
      pin_code: user.pinCode,
      state: user.state,
      district: user.district,
      language: user.preferences?.prefLanguage || 'en',
      crop_preferences: user.crops.map(uc => uc.crop.id),
      is_active: user.isActive,
      created_at: user.createdAt,
    };

    sendSuccess(res, {
      token: accessToken,
      refresh_token: refreshToken,
      is_new_user: isNewUser,
      user: userData,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/auth/refresh-token
export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { refresh_token } = refreshTokenSchema.parse(req.body);

    // Verify refresh token
    const payload = verifyRefreshToken(refresh_token);

    if (payload.type !== 'refresh') {
      throw new AppError('Invalid token type', ErrorCodes.UNAUTHORIZED, 401);
    }

    // Check if token exists in database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refresh_token },
      include: { user: true },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      if (storedToken) {
        await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      }
      throw new AppError('Refresh token expired', ErrorCodes.UNAUTHORIZED, 401);
    }

    if (!storedToken.user.isActive) {
      throw new AppError('User account is inactive', ErrorCodes.UNAUTHORIZED, 401);
    }

    // Generate new tokens
    const tokenPayload = {
      userId: storedToken.user.id,
      phoneNumber: storedToken.user.phoneNumber,
      role: storedToken.user.role,
    };

    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    // Delete old refresh token and create new one
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });
    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: storedToken.user.id,
        expiresAt: getTokenExpiry(process.env.JWT_REFRESH_EXPIRES_IN || '30d'),
      },
    });

    sendSuccess(res, {
      token: newAccessToken,
      refresh_token: newRefreshToken,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/auth/logout
export const logout = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const userId = req.userId!;

    // Delete all refresh tokens for this user
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });

    sendSuccess(res, undefined, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/auth/dev-login (Development only - bypasses OTP)
export const devLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    // Only allow in development mode
    if (!isDevelopment) {
      return sendError(res, ErrorCodes.FORBIDDEN, 'Dev login is not available in production', 403);
    }

    const { phone_number } = req.body;

    if (!phone_number) {
      return sendError(res, ErrorCodes.VALIDATION_ERROR, 'phone_number is required', 400);
    }

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { phoneNumber: phone_number },
      include: {
        preferences: true,
        crops: {
          include: { crop: true },
        },
      },
    });

    const isNewUser = !user;

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          phoneNumber: phone_number,
          preferences: {
            create: {
              prefLanguage: 'en',
            },
          },
        },
        include: {
          preferences: true,
          crops: {
            include: { crop: true },
          },
        },
      });
    } else {
      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });
    }

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      phoneNumber: user.phoneNumber,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: getTokenExpiry(process.env.JWT_REFRESH_EXPIRES_IN || '30d'),
      },
    });

    // Build response based on user status
    const userData = isNewUser ? {
      id: user.id,
      phone_number: user.phoneNumber,
    } : {
      id: user.id,
      phone_number: user.phoneNumber,
      full_name: user.fullName,
      email: user.email,
      role: user.role,
      pin_code: user.pinCode,
      state: user.state,
      district: user.district,
      language: user.preferences?.prefLanguage || 'en',
      crop_preferences: user.crops.map(uc => uc.crop.id),
      is_active: user.isActive,
      created_at: user.createdAt,
    };

    sendSuccess(res, {
      token: accessToken,
      refresh_token: refreshToken,
      is_new_user: isNewUser,
      user: userData,
      _dev_note: '⚠️ This endpoint is for development only and will be disabled in production',
    }, 'Dev login successful');
  } catch (error) {
    next(error);
  }
};

