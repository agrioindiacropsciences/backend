import { Router } from 'express';
import * as supportController from '../controllers/support.controller';
import { optionalAuth } from '../middleware/auth';

const router = Router();

// POST /api/v1/support/contact
router.post('/contact', optionalAuth, supportController.submitContactForm);

// GET /api/v1/support/faqs
router.get('/faqs', supportController.getFaqs);

// GET /api/v1/pages/:slug (for terms, privacy-policy, about)
router.get('/:slug', supportController.getPage);

export default router;

