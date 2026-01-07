import { Router } from 'express';
import * as distributorsController from '../../controllers/admin/distributors.controller';
import { requireRole } from '../../middleware/auth';

const router = Router();

// GET /api/v1/admin/distributors
router.get('/', distributorsController.listDistributors);

// POST /api/v1/admin/distributors
router.post('/', requireRole('SUPER_ADMIN', 'ADMIN'), distributorsController.createDistributor);

// GET /api/v1/admin/distributors/:id
router.get('/:id', distributorsController.getDistributor);

// PUT /api/v1/admin/distributors/:id
router.put('/:id', requireRole('SUPER_ADMIN', 'ADMIN'), distributorsController.updateDistributor);

// DELETE /api/v1/admin/distributors/:id
router.delete('/:id', requireRole('SUPER_ADMIN'), distributorsController.deleteDistributor);

export default router;

