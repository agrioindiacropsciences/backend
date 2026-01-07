import { Router } from 'express';
import * as productsController from '../controllers/products.controller';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = Router();

// GET /api/v1/products
router.get('/', productsController.getAllProducts);

// GET /api/v1/products/best-sellers
router.get('/best-sellers', productsController.getBestSellers);

// GET /api/v1/products/recommended (requires auth)
router.get('/recommended', authenticate, productsController.getRecommended);

// GET /api/v1/products/:slug
router.get('/:slug', productsController.getProductBySlug);

export default router;

