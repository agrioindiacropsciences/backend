import { Router } from 'express';
import * as authController from '../../controllers/admin/auth.controller';
import { strictRateLimiter } from '../../middleware/rateLimiter';
import { adminAuth } from '../../middleware/auth';

const router = Router();

// POST /api/v1/admin/auth/login
router.post('/login', strictRateLimiter, authController.login);

// POST /api/v1/admin/auth/refresh
router.post('/refresh', authController.refreshToken);

// GET /api/v1/admin/auth/me - current admin profile (requires valid token)
router.get('/me', adminAuth, authController.me);

export default router;

