import { Router } from 'express';
import * as usersController from '../../controllers/admin/users.controller';

const router = Router();

// GET /api/v1/admin/users
router.get('/', usersController.listUsers);

// GET /api/v1/admin/users/export
router.get('/export', usersController.exportUsers);

// GET /api/v1/admin/users/:id
router.get('/:id', usersController.getUserDetails);

// PUT /api/v1/admin/users/:id/status
router.put('/:id/status', usersController.updateUserStatus);

export default router;

