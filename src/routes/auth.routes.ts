import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { otpRateLimiter } from '../middleware/rateLimiter';
import { authenticate } from '../middleware/auth';

const router = Router();

// POST /api/v1/auth/send-otp
router.post('/send-otp', otpRateLimiter, authController.sendOtp);

// POST /api/v1/auth/verify-otp
router.post('/verify-otp', authController.verifyOtp);

// POST /api/v1/auth/refresh-token
router.post('/refresh-token', authController.refreshToken);

// POST /api/v1/auth/logout
router.post('/logout', authenticate, authController.logout);

// POST /api/v1/auth/dev-login (Development only - bypasses OTP verification)
// ⚠️ This endpoint is disabled in production
router.post('/dev-login', authController.devLogin);

export default router;

