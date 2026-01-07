import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import { sendError } from '../utils/response';
import { ErrorCodes } from '../types';

export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode = 400,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  console.error('Error:', err);

  // App-specific errors
  if (err instanceof AppError) {
    return sendError(res, err.code, err.message, err.statusCode, err.details);
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    const details: Record<string, string> = {};
    err.errors.forEach((error) => {
      const path = error.path.join('.');
      details[path] = error.message;
    });
    return sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      'Validation failed',
      400,
      details
    );
  }

  // JWT errors
  if (err instanceof TokenExpiredError) {
    return sendError(
      res,
      ErrorCodes.UNAUTHORIZED,
      'Token has expired',
      401
    );
  }

  if (err instanceof JsonWebTokenError) {
    return sendError(
      res,
      ErrorCodes.UNAUTHORIZED,
      'Invalid token',
      401
    );
  }

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[])?.join(', ') || 'field';
      return sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        `A record with this ${target} already exists`,
        409
      );
    }
    if (err.code === 'P2025') {
      return sendError(
        res,
        ErrorCodes.NOT_FOUND,
        'Record not found',
        404
      );
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      'Invalid data provided',
      400
    );
  }

  // Default server error
  return sendError(
    res,
    ErrorCodes.SERVER_ERROR,
    process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message,
    500
  );
};

