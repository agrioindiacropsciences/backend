import { Router } from 'express';
import * as categoriesController from '../controllers/categories.controller';

const router = Router();

// GET /api/v1/categories
router.get('/', categoriesController.getAllCategories);

// GET /api/v1/categories/:id
router.get('/:id', categoriesController.getCategoryById);

export default router;

