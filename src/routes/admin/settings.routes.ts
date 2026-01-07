import { Router } from 'express';
import * as settingsController from '../../controllers/admin/settings.controller';
import { requireRole } from '../../middleware/auth';

const router = Router();

// GET /api/v1/admin/settings
router.get('/', settingsController.getSettings);

// PUT /api/v1/admin/settings
router.put('/', requireRole('SUPER_ADMIN'), settingsController.updateSettings);

export default router;

