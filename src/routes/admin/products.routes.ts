import { Router } from 'express';
import * as productsController from '../../controllers/admin/products.controller';
import { requireRole } from '../../middleware/auth';

const router = Router();

// GET /api/v1/admin/products
router.get('/', productsController.listProducts);

// POST /api/v1/admin/products
router.post('/', requireRole('SUPER_ADMIN', 'ADMIN'), productsController.createProduct);

// GET /api/v1/admin/products/:id
router.get('/:id', productsController.getProduct);

// PUT /api/v1/admin/products/:id
router.put('/:id', requireRole('SUPER_ADMIN', 'ADMIN'), productsController.updateProduct);

// DELETE /api/v1/admin/products/:id
router.delete('/:id', requireRole('SUPER_ADMIN'), productsController.deleteProduct);

export default router;

