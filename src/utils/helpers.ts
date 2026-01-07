import { v4 as uuidv4 } from 'uuid';

// Generate unique coupon code
export const generateCouponCode = (prefix?: string): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return prefix ? `${prefix}-${code}` : `AGR-${code}`;
};

// Generate ticket number
export const generateTicketNumber = (): string => {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `TICKET-${year}-${random}`;
};

// Generate slug from text
export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Parse pagination params
export const parsePagination = (
  page?: string | number,
  limit?: string | number
): { page: number; limit: number; skip: number } => {
  const parsedPage = Math.max(1, parseInt(String(page)) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(String(limit)) || 20));
  return {
    page: parsedPage,
    limit: parsedLimit,
    skip: (parsedPage - 1) * parsedLimit,
  };
};

// Calculate distance between two coordinates (Haversine formula)
export const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // Round to 1 decimal
};

const toRad = (deg: number): number => deg * (Math.PI / 180);

// Format date for display
export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Get ordinal suffix for rank
export const getOrdinalSuffix = (num: number): string => {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return `${num}st`;
  if (j === 2 && k !== 12) return `${num}nd`;
  if (j === 3 && k !== 13) return `${num}rd`;
  return `${num}th`;
};

// Generate batch ID
export const generateBatchId = (): string => {
  return `BATCH-${Date.now()}-${uuidv4().slice(0, 8)}`;
};

// Sanitize search query
export const sanitizeSearchQuery = (query: string): string => {
  return query
    .trim()
    .replace(/[<>]/g, '')
    .slice(0, 100);
};

// Parse boolean from string
export const parseBoolean = (value?: string | boolean): boolean | undefined => {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  return value === 'true' || value === '1';
};

// Create pagination meta object
export const createPagination = (
  total: number,
  page: number,
  limit: number
) => ({
  total,
  page,
  limit,
  total_pages: Math.ceil(total / limit),
});

