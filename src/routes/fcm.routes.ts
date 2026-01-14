import { Router } from 'express';
import { sendManualNotification } from '../controllers/fcm.controller';

const router = Router();

// Route for admin to send manual notification
router.post('/send', sendManualNotification);

export default router;
