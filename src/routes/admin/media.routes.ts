import { Router } from 'express';
import * as mediaController from '../../controllers/admin/media.controller';
import { requireRole } from '../../middleware/auth';
import { upload } from '../../middleware/upload';

const router = Router();

// Require Admin roles for all media operations
router.use(requireRole('SUPER_ADMIN', 'ADMIN'));

/**
 * Single image upload
 * Expects multi-part form data with key 'file'
 */
router.post('/upload', upload.single('file'), mediaController.uploadMedia);

export default router;
