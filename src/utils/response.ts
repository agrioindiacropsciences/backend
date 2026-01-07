import { Response } from 'express';
import { ApiResponse, ApiError, PaginationMeta } from '../types';

export const sendSuccess = <T>(
  res: Response,
  data?: T,
  message?: string,
  statusCode = 200
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
  };
  return res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  code: string,
  message: string,
  statusCode = 400,
  details?: Record<string, unknown>
): Response => {
  const error: ApiError = { code, message };
  if (details) error.details = details;
  
  const response: ApiResponse = {
    success: false,
    error,
  };
  return res.status(statusCode).json(response);
};

export const sendPaginated = <T>(
  res: Response,
  items: T[],
  pagination: PaginationMeta,
  wrapperKey = 'items'
): Response => {
  return res.status(200).json({
    success: true,
    data: {
      [wrapperKey]: items,
      pagination,
    },
  });
};

export const createPagination = (
  total: number,
  page: number,
  limit: number
): PaginationMeta => {
  return {
    total,
    page,
    limit,
    total_pages: Math.ceil(total / limit),
  };
};

