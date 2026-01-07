import { Router } from 'express';
import * as couponsController from '../../controllers/admin/coupons.controller';
import { requireRole } from '../../middleware/auth';

const router = Router();

// GET /api/v1/admin/coupons
router.get('/', couponsController.listCoupons);

// POST /api/v1/admin/coupons/generate
router.post('/generate', requireRole('SUPER_ADMIN', 'ADMIN'), couponsController.generateCoupons);

// GET /api/v1/admin/coupons/:id
router.get('/:id', couponsController.getCouponDetails);

export default router;

