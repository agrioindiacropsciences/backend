import jwt from 'jsonwebtoken';
import { JwtPayload, AdminJwtPayload } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-in-production';
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'default-admin-secret-change-in-production';

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';
const ADMIN_JWT_EXPIRES_IN = process.env.ADMIN_JWT_EXPIRES_IN || '24h';

// Convert string to seconds for JWT
const parseExpiry = (expiry: string): number => {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 604800; // Default 7 days in seconds
  const [, value, unit] = match;
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return parseInt(value) * multipliers[unit];
};

// User Token Functions
export const generateAccessToken = (payload: Omit<JwtPayload, 'type'>): string => {
  return jwt.sign(
    { ...payload, type: 'access' },
    JWT_SECRET,
    { expiresIn: parseExpiry(JWT_EXPIRES_IN) }
  );
};

export const generateRefreshToken = (payload: Omit<JwtPayload, 'type'>): string => {
  return jwt.sign(
    { ...payload, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: parseExpiry(JWT_REFRESH_EXPIRES_IN) }
  );
};

export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  return jwt.verify(token, JWT_REFRESH_SECRET) as JwtPayload;
};

// Admin Token Functions
export const generateAdminAccessToken = (payload: Omit<AdminJwtPayload, 'type'>): string => {
  return jwt.sign(
    { ...payload, type: 'access' },
    ADMIN_JWT_SECRET,
    { expiresIn: parseExpiry(ADMIN_JWT_EXPIRES_IN) }
  );
};

export const generateAdminRefreshToken = (payload: Omit<AdminJwtPayload, 'type'>): string => {
  return jwt.sign(
    { ...payload, type: 'refresh' },
    ADMIN_JWT_SECRET,
    { expiresIn: 604800 } // 7 days in seconds
  );
};

export const verifyAdminToken = (token: string): AdminJwtPayload => {
  return jwt.verify(token, ADMIN_JWT_SECRET) as AdminJwtPayload;
};

// Utility functions
export const decodeToken = (token: string): JwtPayload | AdminJwtPayload | null => {
  try {
    return jwt.decode(token) as JwtPayload | AdminJwtPayload;
  } catch {
    return null;
  }
};

export const getTokenExpiry = (expiresIn: string): Date => {
  const seconds = parseExpiry(expiresIn);
  return new Date(Date.now() + seconds * 1000);
};
