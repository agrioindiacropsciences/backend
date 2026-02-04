import { Router } from 'express';
import * as bannersController from '../../controllers/admin/banners.controller';
import { requireRole } from '../../middleware/auth';
import { upload } from '../../middleware/upload';

const router = Router();

// Only Super Admins and Admins can manage banners
router.use(requireRole('SUPER_ADMIN', 'ADMIN'));

router.get('/', bannersController.getAllBanners);
router.post('/', upload.single('image'), bannersController.createBanner);
router.put('/:id', upload.single('image'), bannersController.updateBanner);
router.delete('/:id', bannersController.deleteBanner);

export default router;
