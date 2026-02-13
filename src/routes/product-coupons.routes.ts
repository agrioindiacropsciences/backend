import { Router } from 'express';
import * as productCouponsController from '../controllers/product-coupons.controller';
import { authenticate, adminAuth } from '../middleware/auth';
import { uploadExcel } from '../middleware/upload';

const router = Router();

// Admin routes for bulk upload
router.post(
    '/bulk-upload',
    adminAuth,
    uploadExcel.single('file'),
    productCouponsController.bulkUpload
);

// User routes for verification and claiming
router.post(
    '/verify-claim',
    authenticate,
    productCouponsController.verifyAndClaim
);

export default router;
