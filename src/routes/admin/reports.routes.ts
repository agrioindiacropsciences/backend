import { Router } from 'express';
import * as reportsController from '../../controllers/admin/reports.controller';

const router = Router();

// GET /api/v1/admin/reports/:type
router.get('/:type', reportsController.getReportData);

// GET /api/v1/admin/reports/:type/export
router.get('/:type/export', reportsController.exportReport);

export default router;

