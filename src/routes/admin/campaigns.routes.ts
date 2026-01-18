import { Router } from 'express';
import * as campaignsController from '../../controllers/admin/campaigns.controller';
import { requireRole } from '../../middleware/auth';

const router = Router();

// GET /api/v1/admin/campaigns
router.get('/', campaignsController.listCampaigns);

// GET /api/v1/admin/campaigns/:id
router.get('/:id', campaignsController.getCampaign);

// POST /api/v1/admin/campaigns
router.post('/', requireRole('SUPER_ADMIN', 'ADMIN'), campaignsController.createCampaign);

// PUT /api/v1/admin/campaigns/:id
router.put('/:id', requireRole('SUPER_ADMIN', 'ADMIN'), campaignsController.updateCampaign);

// DELETE /api/v1/admin/campaigns/:id
router.delete('/:id', requireRole('SUPER_ADMIN'), campaignsController.deleteCampaign);

export default router;
