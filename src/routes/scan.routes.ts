import { Router } from 'express';
import * as qrController from '../controllers/QrController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Protected routes (User must be logged in to claim)
router.use(authenticate);

// POST /api/v1/scan/redeem
router.post('/redeem', qrController.redeemQr);

export default router;
