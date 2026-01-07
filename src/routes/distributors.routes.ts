import { Router } from 'express';
import * as distributorsController from '../controllers/distributors.controller';

const router = Router();

// GET /api/v1/distributors
router.get('/', distributorsController.getDistributors);

// GET /api/v1/distributors/:id
router.get('/:id', distributorsController.getDistributorById);

// GET /api/v1/distributors/:id/coverage
router.get('/:id/coverage', distributorsController.getDistributorCoverage);

export default router;

