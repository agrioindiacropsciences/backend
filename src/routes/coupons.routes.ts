import { Router } from 'express';
import * as couponsController from '../controllers/coupons.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// POST /api/v1/coupons/verify
router.post('/verify', couponsController.verifyCoupon);

// POST /api/v1/coupons/redeem
router.post('/redeem', couponsController.redeemCoupon);

export default router;

