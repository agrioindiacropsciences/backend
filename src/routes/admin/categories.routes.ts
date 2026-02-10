import { Router } from 'express';
import { adminAuth } from '../../middleware/auth';
import { upload } from '../../middleware/upload';
import * as categoriesController from '../../controllers/admin/categories.controller';

const router = Router();

// GET /api/v1/admin/categories
router.get('/', adminAuth, categoriesController.listCategories);

// PUT /api/v1/admin/categories/:id
router.put('/:id', adminAuth, upload.single('image'), categoriesController.updateCategory);

export default router;

