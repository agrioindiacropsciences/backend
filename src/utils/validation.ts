import { z } from 'zod';

// Phone number validation for India (10 digits starting with 6-9)
export const phoneNumberSchema = z.string()
  .regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number. Must be 10 digits starting with 6-9');

// Pincode validation for India (6 digits)
export const pincodeSchema = z.string()
  .regex(/^\d{6}$/, 'Invalid pincode. Must be 6 digits');

// Email validation
export const emailSchema = z.string().email('Invalid email address').optional().or(z.literal(''));

// Common schemas
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// Auth Schemas
export const sendOtpSchema = z.object({
  phone_number: phoneNumberSchema,
});

export const verifyOtpSchema = z.object({
  phone_number: phoneNumberSchema,
  otp_code: z.string().length(4, 'OTP must be 4 digits'),
});

export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

// User Profile Schemas
export const createProfileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  pin_code: pincodeSchema,
  full_address: z.string().max(500).optional(),
  email: emailSchema,
  state: z.string().optional(),
  district: z.string().optional(),
});

export const updateProfileSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  email: emailSchema,
  pin_code: pincodeSchema.optional(),
  full_address: z.string().max(500).optional(),
  state: z.string().optional(),
  district: z.string().optional(),
});

export const updateLanguageSchema = z.object({
  language: z.enum(['en', 'hi']),
});

// Crop Schemas
export const syncCropsSchema = z.object({
  crop_ids: z.array(z.string()).min(1, 'At least one crop must be selected'),
});

// Contact/Support Schemas
export const contactFormSchema = z.object({
  name: z.string().min(2).max(100),
  mobile: phoneNumberSchema,
  email: emailSchema,
  subject: z.string().min(5).max(255),
  message: z.string().min(10).max(2000),
});

// Coupon Schemas
export const verifyCouponSchema = z.object({
  coupon_code: z.string().min(5).max(30),
});

export const redeemCouponSchema = z.object({
  coupon_id: z.string().uuid(),
  campaign_tier_id: z.string().uuid(),
});

// Product Schemas
export const productQuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  crop: z.string().optional(),
  best_seller: z.coerce.boolean().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort: z.enum(['name', 'name_desc', 'popular', 'newest']).optional(),
});

// Admin Schemas
export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const adminCreateProductSchema = z.object({
  name: z.string().min(2).max(100),
  name_hi: z.string().min(2).max(100),
  category_id: z.string().min(1),
  description: z.string().optional(),
  description_hi: z.string().optional(),
  composition: z.string().optional(),
  dosage: z.string().optional(),
  application_method: z.string().optional(),
  target_pests: z.array(z.string()).optional(),
  suitable_crops: z.array(z.string()).optional(),
  pack_sizes: z.array(z.object({
    size: z.string(),
    sku: z.string(),
    mrp: z.number().optional(),
    selling_price: z.number().optional(),
  })).optional(),
  safety_precautions: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  is_best_seller: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

export const generateCouponsSchema = z.object({
  count: z.number().min(1).max(10000),
  product_id: z.string().uuid().optional(),
  campaign_id: z.string().uuid().optional(),
  prefix: z.string().max(10).optional(),
  expiry_date: z.string().optional(),
});

// Campaign Schemas
export const createCampaignSchema = z.object({
  name: z.string().min(2).max(100),
  name_hi: z.string().max(100).optional(),
  description: z.string().max(1000).optional(),
  start_date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  end_date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  distribution_type: z.enum(['SEQUENTIAL', 'RANDOM']).default('RANDOM'),
  is_active: z.boolean().default(true),
  tiers: z.array(z.object({
    tier_name: z.string().min(1).max(100),
    reward_name: z.string().min(1).max(100),
    reward_name_hi: z.string().max(100).optional(),
    reward_type: z.enum(['CASHBACK', 'DISCOUNT', 'GIFT', 'POINTS']),
    reward_value: z.number().min(0),
    probability: z.number().min(0).max(1),
    priority: z.number().int().default(0),
    max_winners: z.number().int().positive().optional(),
  })).min(1, 'At least one tier is required'),
});

export const updateCampaignSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  name_hi: z.string().max(100).optional(),
  description: z.string().max(1000).optional(),
  start_date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  end_date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  distribution_type: z.enum(['SEQUENTIAL', 'RANDOM']).optional(),
  is_active: z.boolean().optional(),
});

// Type exports
export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type CreateProfileInput = z.infer<typeof createProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ContactFormInput = z.infer<typeof contactFormSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

