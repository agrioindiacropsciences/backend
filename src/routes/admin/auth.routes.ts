import { Router } from 'express';
import * as authController from '../../controllers/admin/auth.controller';
import { strictRateLimiter } from '../../middleware/rateLimiter';

const router = Router();

// POST /api/v1/admin/auth/login
router.post('/login', strictRateLimiter, authController.login);

// POST /api/v1/admin/auth/refresh
router.post('/refresh', authController.refreshToken);

export default router;

