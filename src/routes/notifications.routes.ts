import { Router } from 'express';
import * as notificationsController from '../controllers/notifications.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/v1/notifications
router.get('/', notificationsController.getNotifications);

// PUT /api/v1/notifications/:id/read
router.put('/:id/read', notificationsController.markAsRead);

// PUT /api/v1/notifications/read-all
router.put('/read-all', notificationsController.markAllAsRead);

export default router;

