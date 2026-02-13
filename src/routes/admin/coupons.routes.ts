import { Router } from 'express';
import * as couponsController from '../../controllers/admin/coupons.controller';
import { requireRole } from '../../middleware/auth';

const router = Router();
console.log('[AdminRoutes] Registering priority route: /bulk/batches');

// GET /api/v1/admin/coupons/bulk/batches
router.get('/bulk/batches', requireRole('SUPER_ADMIN', 'ADMIN'), couponsController.listBatches);

// DELETE /api/v1/admin/coupons/bulk/batches/:batchNumber
router.delete('/bulk/batches/:batchNumber', requireRole('SUPER_ADMIN', 'ADMIN'), couponsController.deleteBatch);

// GET /api/v1/admin/coupons
router.get('/', couponsController.listCoupons);

// POST /api/v1/admin/coupons/generate
router.post('/generate', requireRole('SUPER_ADMIN', 'ADMIN'), couponsController.generateCoupons);

// POST /api/v1/admin/coupons/delete-bulk (must be before /:id)
router.post('/delete-bulk', requireRole('SUPER_ADMIN', 'ADMIN'), couponsController.deleteCouponsBulk);

// GET /api/v1/admin/coupons/:id
router.get('/:id', couponsController.getCouponDetails);

// DELETE /api/v1/admin/coupons/:id
router.delete('/:id', requireRole('SUPER_ADMIN', 'ADMIN'), couponsController.deleteCoupon);

export default router;

