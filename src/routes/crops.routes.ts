import { Router } from 'express';
import * as cropsController from '../controllers/crops.controller';

const router = Router();

// GET /api/v1/crops
router.get('/', cropsController.getAllCrops);

export default router;

