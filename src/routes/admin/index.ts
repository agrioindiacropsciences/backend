import { Router } from 'express';
import authRoutes from './auth.routes';
import dashboardRoutes from './dashboard.routes';
import usersRoutes from './users.routes';
import productsRoutes from './products.routes';
import couponsRoutes from './coupons.routes';
import distributorsRoutes from './distributors.routes';
import reportsRoutes from './reports.routes';
import settingsRoutes from './settings.routes';
import cmsRoutes from './cms.routes';
import bannersRoutes from './banners.routes';
import { adminAuth } from '../../middleware/auth';

import { adminRateLimiter } from '../../middleware/rateLimiter';

const router = Router();

// Apply admin rate limiter to all admin routes
router.use(adminRateLimiter);

// Auth routes (public)
router.use('/auth', authRoutes);

// All other routes require admin authentication
router.use('/dashboard', adminAuth, dashboardRoutes);
router.use('/users', adminAuth, usersRoutes);
router.use('/products', adminAuth, productsRoutes);
router.use('/coupons', adminAuth, couponsRoutes);
router.use('/distributors', adminAuth, distributorsRoutes);
router.use('/reports', adminAuth, reportsRoutes);
router.use('/settings', adminAuth, settingsRoutes);
router.use('/cms', adminAuth, cmsRoutes);
router.use('/banners', adminAuth, bannersRoutes);

export default router;


