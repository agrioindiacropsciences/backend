import { Router } from 'express';
import * as fcmController from '../controllers/fcm.controller';
import { authenticate, adminAuth } from '../middleware/auth';

const router = Router();

// User routes (require authentication)
router.post('/register', authenticate, fcmController.registerFcmToken);
router.post('/unregister', authenticate, fcmController.unregisterFcmToken);

// Admin route - send notification (requires admin auth)
router.post('/send', adminAuth, fcmController.sendManualNotification);

export default router;
