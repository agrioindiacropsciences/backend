import { Router } from 'express';
import * as cmsController from '../../controllers/admin/cms.controller';
import { requireRole } from '../../middleware/auth';

const router = Router();

// Apply role restriction to all CMS routes
router.use(requireRole('SUPER_ADMIN', 'ADMIN'));

// FAQ Management

router.get('/faqs', cmsController.getFaqs);
router.post('/faqs', cmsController.createFaq);
router.put('/faqs/:id', cmsController.updateFaq);
router.delete('/faqs/:id', cmsController.deleteFaq);

// CMS Page Management
router.get('/pages', cmsController.getPages);
router.put('/pages/:slug', cmsController.updatePage);

export default router;
