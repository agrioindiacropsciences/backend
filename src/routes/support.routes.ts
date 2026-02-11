import { Router } from 'express';
import * as supportController from '../controllers/support.controller';
import * as aiSupportController from '../controllers/aiSupport.controller';
import { optionalAuth } from '../middleware/auth';

const router = Router();

// POST /api/v1/support/contact
router.post('/contact', optionalAuth, supportController.submitContactForm);

// POST /api/v1/support/ai/chat - Gemini-powered support chat
router.post('/ai/chat', optionalAuth, aiSupportController.chat);

// GET /api/v1/support/faqs
router.get('/faqs', supportController.getFaqs);

// GET /api/v1/support/account-deletion - Public account deletion info (Google Play Store compliance)
router.get('/account-deletion', supportController.getAccountDeletionInfo);

// GET /api/v1/pages/:slug (for terms, privacy-policy, about)
router.get('/:slug', supportController.getPage);

export default router;

