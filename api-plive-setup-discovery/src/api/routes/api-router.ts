import { Router } from 'express';
import workflowRoutes from './workflow-routes';

const router = Router();

// Mount workflow routes
router.use('/', workflowRoutes);

export { router as apiRouter };
