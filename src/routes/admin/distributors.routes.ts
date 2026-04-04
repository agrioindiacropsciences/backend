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
        { name: 'aadhaar_front_photo', maxCount: 1 },
        { name: 'aadhaar_back_photo', maxCount: 1 },
        { name: 'pan_photo', maxCount: 1 },
        { name: 'license_photo', maxCount: 1 },
        { name: 'gst_photo', maxCount: 1 },
        { name: 'check_photo', maxCount: 1 },
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
        { name: 'aadhaar_front_photo', maxCount: 1 },
        { name: 'aadhaar_back_photo', maxCount: 1 },
        { name: 'pan_photo', maxCount: 1 },
        { name: 'license_photo', maxCount: 1 },
        { name: 'gst_photo', maxCount: 1 },
        { name: 'check_photo', maxCount: 1 },
        { name: 'signature', maxCount: 1 },
        { name: 'stamp', maxCount: 1 }
    ]),
    distributorsController.updateDistributor
);

// DELETE /api/v1/admin/distributors/:id
router.delete('/:id', requireRole('SUPER_ADMIN'), distributorsController.deleteDistributor);

// PATCH /api/v1/admin/distributors/:id/verify
// Used by admin website to APPROVE or REJECT a dealer's onboarding application
router.patch('/:id/verify', requireRole('SUPER_ADMIN', 'ADMIN'), distributorsController.verifyDistributor);

export default router;

