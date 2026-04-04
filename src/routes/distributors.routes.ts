import { Router } from 'express';
import * as distributorsController from '../controllers/distributors.controller';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

// User Facing Distributor Routes
router.get('/my-profile', authenticate, distributorsController.getMyDistributorProfile);
router.post('/verify/pan', authenticate, distributorsController.verifyPan);
router.post('/verify/gst', authenticate, distributorsController.verifyGst);
router.post(
  '/verify/aadhaar/initiate',
  authenticate,
  distributorsController.initiateAadhaarVerification,
);
router.get(
  '/verify/aadhaar/status/:verificationId',
  authenticate,
  distributorsController.getAadhaarVerificationStatus,
);
router.post(
  '/onboard',
  authenticate,
  upload.fields([
    { name: 'aadhaar_front_photo', maxCount: 1 },
    { name: 'aadhaar_back_photo', maxCount: 1 },
    { name: 'pan_photo', maxCount: 1 },
    { name: 'license_photo', maxCount: 1 },
    { name: 'gst_photo', maxCount: 1 },
    { name: 'check_photo', maxCount: 1 },
  ]),
  distributorsController.onboardDistributor
);

// GET /api/v1/distributors
router.get('/', distributorsController.getDistributors);

// GET /api/v1/distributors/:id
router.get('/:id', distributorsController.getDistributorById);

// GET /api/v1/distributors/:id/coverage
router.get('/:id/coverage', distributorsController.getDistributorCoverage);

export default router;
