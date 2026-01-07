import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { sendOtpSchema, verifyOtpSchema, refreshTokenSchema } from '../utils/validation';
import { generateOtp, generateRequestId, getOtpExpiry, isOtpExpired, sendOtpViaSms } from '../utils/otp';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, getTokenExpiry } from '../utils/jwt';
import { AuthenticatedRequest, ErrorCodes } from '../types';
import { AppError } from '../middleware/errorHandler';

// POST /api/v1/auth/send-otp
export const sendOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { phone_number } = sendOtpSchema.parse(req.body);
    
    // Generate OTP and request ID
    const otp = generateOtp();
    const requestId = generateRequestId();
    const expiresAt = getOtpExpiry();

    // Delete any existing OTPs for this phone number
    await prisma.otpVerification.deleteMany({
      where: { phoneNumber: phone_number },
    });

    // Create new OTP record
    await prisma.otpVerification.create({
      data: {
        phoneNumber: phone_number,
        otpCode: otp,
        requestId,
        expiresAt,
      },
    });

    // Send OTP via SMS
    const smsResult = await sendOtpViaSms(phone_number, otp);
    
    if (!smsResult.success && process.env.NODE_ENV === 'production') {
      throw new AppError('Failed to send OTP. Please try again.', ErrorCodes.SERVER_ERROR, 500);
    }

    sendSuccess(res, {
      request_id: requestId,
      expires_in: 300, // 5 minutes
    }, 'OTP sent successfully');
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

    // Find OTP record
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
    if (isOtpExpired(otpRecord.expiresAt)) {
      await prisma.otpVerification.delete({ where: { id: otpRecord.id } });
      throw new AppError('OTP has expired. Please request a new one.', ErrorCodes.OTP_EXPIRED, 400);
    }

    // Verify OTP
    if (otpRecord.otpCode !== otp_code) {
      throw new AppError('Invalid OTP code.', ErrorCodes.OTP_INVALID, 400);
    }

    // Mark OTP as verified
    await prisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: { isVerified: true },
    });

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

