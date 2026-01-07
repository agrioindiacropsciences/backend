import { Request, Response } from 'express';
import { User, AdminUser } from '@prisma/client';

// Extend Express Request type
export interface AuthenticatedRequest extends Request {
  user?: User;
  userId?: string;
}

export interface AdminRequest extends Request {
  admin?: AdminUser;
  adminId?: string;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

// Error Codes
export const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  OTP_EXPIRED: 'OTP_EXPIRED',
  OTP_INVALID: 'OTP_INVALID',
  COUPON_INVALID: 'COUPON_INVALID',
  COUPON_USED: 'COUPON_USED',
  COUPON_EXPIRED: 'COUPON_EXPIRED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SERVER_ERROR: 'SERVER_ERROR',
} as const;

export type ErrorCode = keyof typeof ErrorCodes;

// JWT Payload Types
export interface JwtPayload {
  userId: string;
  phoneNumber: string;
  role: string;
  type: 'access' | 'refresh';
}

export interface AdminJwtPayload {
  adminId: string;
  email: string;
  role: string;
  type: 'access' | 'refresh';
}

// Controller Handler Type - allows returning void or Response
export type ControllerHandler<T extends Request = Request> = (
  req: T,
  res: Response,
  next: (error?: unknown) => void
) => Promise<void | Response>;
