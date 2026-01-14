import { Router } from 'express';
import * as distributorsController from '../../controllers/admin/distributors.controller';
import { requireRole } from '../../middleware/auth';
import { upload } from '../../middleware/upload';

const router = Router();

// GET /api/v1/admin/distributors
router.get('/', distributorsController.listDistributors);

// POST /api/v1/admin/distributors
router.post(
    '/',
    requireRole('SUPER_ADMIN', 'ADMIN'),
    upload.fields([
        { name: 'signature', maxCount: 1 },
        { name: 'stamp', maxCount: 1 }
    ]),
    distributorsController.createDistributor
);

// GET /api/v1/admin/distributors/:id
router.get('/:id', distributorsController.getDistributor);

// PUT /api/v1/admin/distributors/:id
router.put(
    '/:id',
    requireRole('SUPER_ADMIN', 'ADMIN'),
    upload.fields([
        { name: 'signature', maxCount: 1 },
        { name: 'stamp', maxCount: 1 }
    ]),
    distributorsController.updateDistributor
);

// DELETE /api/v1/admin/distributors/:id
router.delete('/:id', requireRole('SUPER_ADMIN'), distributorsController.deleteDistributor);

export default router;

