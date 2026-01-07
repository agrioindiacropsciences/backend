import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../../lib/prisma';
import { sendSuccess } from '../../utils/response';
import { adminLoginSchema, refreshTokenSchema } from '../../utils/validation';
import { generateAdminAccessToken, generateAdminRefreshToken, verifyAdminToken, getTokenExpiry } from '../../utils/jwt';
import { ErrorCodes } from '../../types';
import { AppError } from '../../middleware/errorHandler';

// POST /api/v1/admin/auth/login
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { email, password } = adminLoginSchema.parse(req.body);

    // Find admin by email
    const admin = await prisma.adminUser.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!admin) {
      throw new AppError('Invalid email or password', ErrorCodes.UNAUTHORIZED, 401);
    }

    if (!admin.isActive) {
      throw new AppError('Account is disabled', ErrorCodes.UNAUTHORIZED, 401);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', ErrorCodes.UNAUTHORIZED, 401);
    }

    // Update last login
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() },
    });

    // Generate tokens
    const tokenPayload = {
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
    };

    const accessToken = generateAdminAccessToken(tokenPayload);
    const refreshToken = generateAdminRefreshToken(tokenPayload);

    // Store refresh token
    await prisma.adminRefreshToken.create({
      data: {
        token: refreshToken,
        adminUserId: admin.id,
        expiresAt: getTokenExpiry('7d'),
      },
    });

    sendSuccess(res, {
      token: accessToken,
      refresh_token: refreshToken,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/admin/auth/refresh
export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { refresh_token } = refreshTokenSchema.parse(req.body);

    // Verify refresh token
    const payload = verifyAdminToken(refresh_token);

    if (payload.type !== 'refresh') {
      throw new AppError('Invalid token type', ErrorCodes.UNAUTHORIZED, 401);
    }

    // Check if token exists in database
    const storedToken = await prisma.adminRefreshToken.findUnique({
      where: { token: refresh_token },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      if (storedToken) {
        await prisma.adminRefreshToken.delete({ where: { id: storedToken.id } });
      }
      throw new AppError('Refresh token expired', ErrorCodes.UNAUTHORIZED, 401);
    }

    // Find admin
    const admin = await prisma.adminUser.findUnique({
      where: { id: storedToken.adminUserId },
    });

    if (!admin || !admin.isActive) {
      throw new AppError('Admin account not found or inactive', ErrorCodes.UNAUTHORIZED, 401);
    }

    // Generate new tokens
    const tokenPayload = {
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
    };

    const newAccessToken = generateAdminAccessToken(tokenPayload);
    const newRefreshToken = generateAdminRefreshToken(tokenPayload);

    // Delete old refresh token and create new one
    await prisma.adminRefreshToken.delete({ where: { id: storedToken.id } });
    await prisma.adminRefreshToken.create({
      data: {
        token: newRefreshToken,
        adminUserId: admin.id,
        expiresAt: getTokenExpiry('7d'),
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

