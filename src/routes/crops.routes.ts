import { Router } from 'express';
import * as cropsController from '../controllers/crops.controller';
import { adminAuth } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

// GET /api/v1/crops
router.get('/', cropsController.getAllCrops);

// GET /api/v1/crops/:id
router.get('/:id', cropsController.getCropById);

// POST /api/v1/crops
router.post('/', adminAuth, upload.single('image'), cropsController.createCrop);

// PUT /api/v1/crops/:id
router.put('/:id', (req, res, next) => {
    console.log(`[Crops] Updating crop ${req.params.id}`);
    next();
}, adminAuth, upload.single('image'), cropsController.updateCrop);

// DELETE /api/v1/crops/:id
router.delete('/:id', adminAuth, cropsController.deleteCrop);

export default router;

