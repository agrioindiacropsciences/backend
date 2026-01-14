import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/v1/user/profile
router.get('/profile', userController.getProfile);

// POST/PATCH /api/v1/user/profile (Create/Complete profile)
router.post('/profile', userController.createProfile);
router.patch('/profile', userController.createProfile);

// PATCH /api/v1/user/profile/avatar
router.patch('/profile/avatar', upload.single('avatar'), userController.updateAvatar);

// PUT /api/v1/user/profile
router.put('/profile', userController.updateProfile);

// PUT /api/v1/user/language
router.put('/language', userController.updateLanguage);

// GET /api/v1/user/stats
router.get('/stats', userController.getStats);

// GET /api/v1/user/crops
router.get('/crops', userController.getCropPreferences);

// POST /api/v1/user/crops
router.post('/crops', userController.syncCropPreferences);

// GET /api/v1/user/coupons
router.get('/coupons', userController.getCouponHistory);

// GET /api/v1/user/rewards
router.get('/rewards', userController.getRewards);

export default router;
