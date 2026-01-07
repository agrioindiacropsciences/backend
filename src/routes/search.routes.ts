import { Router } from 'express';
import * as searchController from '../controllers/search.controller';

const router = Router();

// GET /api/v1/search
router.get('/', searchController.globalSearch);

export default router;

