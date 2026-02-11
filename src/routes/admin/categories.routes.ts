import { Router } from 'express';
import { adminAuth } from '../../middleware/auth';
import { upload } from '../../middleware/upload';
import * as categoriesController from '../../controllers/admin/categories.controller';

const router = Router();

// GET /api/v1/admin/categories
router.get('/', adminAuth, categoriesController.listCategories);

// GET /api/v1/admin/categories/:id/products (must be before /:id)
router.get('/:id/products', adminAuth, categoriesController.listCategoryProducts);

// PUT /api/v1/admin/categories/:id
router.put('/:id', adminAuth, upload.single('image'), categoriesController.updateCategory);

// DELETE /api/v1/admin/categories/:id
router.delete('/:id', adminAuth, categoriesController.deleteCategory);

export default router;

