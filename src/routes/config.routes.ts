import { Router } from 'express';
import * as configController from '../controllers/config.controller';

const router = Router();

// GET /api/v1/config
router.get('/', configController.getAppConfig);

// GET /api/v1/banners
router.get('/banners', configController.getBanners);

export default router;

