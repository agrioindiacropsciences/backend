import { Router } from 'express';
import * as rewardsController from '../controllers/rewards.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/v1/rewards/:id/certificate
router.get('/:id/certificate', rewardsController.getRewardCertificate);

export default router;

