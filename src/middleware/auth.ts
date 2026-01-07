import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, AdminRequest, ErrorCodes } from '../types';
import { verifyAccessToken, verifyAdminToken } from '../utils/jwt';
import { sendError } from '../utils/response';
import prisma from '../lib/prisma';

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(
        res,
        ErrorCodes.UNAUTHORIZED,
        'Authorization token is required',
        401
      );
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    if (payload.type !== 'access') {
      return sendError(
        res,
        ErrorCodes.UNAUTHORIZED,
        'Invalid token type',
        401
      );
    }

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || !user.isActive) {
      return sendError(
        res,
        ErrorCodes.UNAUTHORIZED,
        'User not found or inactive',
        401
      );
    }

    req.user = user;
    req.userId = user.id;
    next();
  } catch (error) {
    return sendError(
      res,
      ErrorCodes.UNAUTHORIZED,
      'Invalid or expired token',
      401
    );
  }
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const payload = verifyAccessToken(token);

      if (payload.type === 'access') {
        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
        });

        if (user && user.isActive) {
          req.user = user;
          req.userId = user.id;
        }
      }
    }
  } catch {
    // Ignore errors for optional auth
  }
  next();
};

export const adminAuth = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(
        res,
        ErrorCodes.UNAUTHORIZED,
        'Admin authorization required',
        401
      );
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAdminToken(token);

    if (payload.type !== 'access') {
      return sendError(
        res,
        ErrorCodes.UNAUTHORIZED,
        'Invalid token type',
        401
      );
    }

    // Fetch admin from database
    const admin = await prisma.adminUser.findUnique({
      where: { id: payload.adminId },
    });

    if (!admin || !admin.isActive) {
      return sendError(
        res,
        ErrorCodes.UNAUTHORIZED,
        'Admin not found or inactive',
        401
      );
    }

    req.admin = admin;
    req.adminId = admin.id;
    next();
  } catch (error) {
    return sendError(
      res,
      ErrorCodes.UNAUTHORIZED,
      'Invalid or expired admin token',
      401
    );
  }
};

export const requireRole = (...roles: string[]) => {
  return (
    req: AdminRequest,
    res: Response,
    next: NextFunction
  ): void | Response => {
    if (!req.admin) {
      return sendError(
        res,
        ErrorCodes.UNAUTHORIZED,
        'Admin authentication required',
        401
      );
    }

    if (!roles.includes(req.admin.role)) {
      return sendError(
        res,
        ErrorCodes.FORBIDDEN,
        'Insufficient permissions',
        403
      );
    }

    next();
  };
};

