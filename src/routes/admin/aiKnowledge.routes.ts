import { Router } from 'express';
import * as aiKnowledgeController from '../../controllers/admin/aiKnowledge.controller';
import * as aiKnowledgeFileController from '../../controllers/admin/aiKnowledgeFile.controller';
import { uploadPdf } from '../../middleware/upload';

const router = Router();

// Categories
router.get('/categories', aiKnowledgeController.getCategories);
router.post('/categories', aiKnowledgeController.createCategory);
router.put('/categories/:id', aiKnowledgeController.updateCategory);
router.delete('/categories/:id', aiKnowledgeController.deleteCategory);

// Entries
router.get('/entries', aiKnowledgeController.getEntries);
router.post('/entries', aiKnowledgeController.createEntry);
router.put('/entries/:id', aiKnowledgeController.updateEntry);
router.delete('/entries/:id', aiKnowledgeController.deleteEntry);

// Files (PDF Knowledge)
router.get('/files', aiKnowledgeFileController.getFiles);
router.post('/files/upload', uploadPdf.single('file'), aiKnowledgeFileController.uploadFile);
router.delete('/files/:id', aiKnowledgeFileController.deleteFile);
router.patch('/files/:id/status', aiKnowledgeFileController.toggleFileStatus);

export default router;
