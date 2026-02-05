import { Router } from 'express';
import { AuthenticatedRequest, requireRole, requirePermission } from '../middleware/auth-middleware';
import { WorkflowController } from '../controllers/workflow-controller';
import { validateWorkflowCreation, validateWorkflowUpdate, validateApproval, validateBulkOperation, validateEscalation, validateDelegation } from '../validation/workflow-validation';
import { asyncHandler } from '../utils/async-handler';

const router = Router();
const workflowController = new WorkflowController();

// Workflow management routes
router.post(
  '/workflows',
  requirePermission(['workflows:create']),
  validateWorkflowCreation,
  asyncHandler(workflowController.createWorkflow)
);

router.get(
  '/workflows',
  requirePermission(['workflows:read']),
  asyncHandler(workflowController.getWorkflows)
);

router.get(
  '/workflows/:id',
  requirePermission(['workflows:read']),
  asyncHandler(workflowController.getWorkflowById)
);

router.put(
  '/workflows/:id',
  requirePermission(['workflows:update']),
  validateWorkflowUpdate,
  asyncHandler(workflowController.updateWorkflow)
);

router.delete(
  '/workflows/:id',
  requireRole(['admin', 'manager']),
  requirePermission(['workflows:delete']),
  asyncHandler(workflowController.deleteWorkflow)
);

// Workflow action routes with validation
router.post(
  '/workflows/:id/start',
  requirePermission(['workflows:execute']),
  asyncHandler(workflowController.startWorkflow)
);

router.post(
  '/workflows/:id/approve',
  requirePermission(['workflows:approve']),
  validateApproval,
  asyncHandler(workflowController.approveStep)
);

router.post(
  '/workflows/:id/reject',
  requirePermission(['workflows:reject']),
  validateApproval,
  asyncHandler(workflowController.rejectStep)
);

router.post(
  '/workflows/:id/cancel',
  requirePermission(['workflows:cancel']),
  asyncHandler(workflowController.cancelWorkflow)
);

// Advanced workflow operations
router.post(
  '/workflows/:id/escalate',
  requirePermission(['workflows:escalate']),
  validateEscalation,
  asyncHandler(workflowController.escalateWorkflow)
);

router.post(
  '/workflows/:id/delegate',
  requirePermission(['workflows:delegate']),
  validateDelegation,
  asyncHandler(workflowController.delegateWorkflow)
);

// Monitoring and analytics
router.get(
  '/workflows/:id/analytics',
  requirePermission(['workflows:analytics']),
  asyncHandler(workflowController.getWorkflowAnalytics)
);

router.get(
  '/workflows/:id/timeline',
  requirePermission(['workflows:timeline']),
  asyncHandler(workflowController.getWorkflowTimeline)
);

// Bulk operations
router.post(
  '/workflows/bulk/approve',
  requirePermission(['workflows:bulk_approve']),
  validateBulkOperation,
  asyncHandler(workflowController.bulkApprove)
);

router.post(
  '/workflows/bulk/cancel',
  requirePermission(['workflows:bulk_cancel']),
  validateBulkOperation,
  asyncHandler(workflowController.bulkCancel)
);

router.post(
  '/workflows/bulk/export',
  requirePermission(['workflows:export']),
  asyncHandler(workflowController.exportWorkflows)
);

// Betting platform specific routes
router.post(
  '/betting/content/submit',
  requirePermission(['betting:content:create']),
  asyncHandler(workflowController.submitContentForReview)
);

router.post(
  '/betting/lines/change',
  requirePermission(['betting:lines:modify']),
  asyncHandler(workflowController.submitLineChange)
);

router.post(
  '/betting/odds/update',
  requirePermission(['betting:odds:update']),
  asyncHandler(workflowController.submitOddsUpdate)
);

router.get(
  '/betting/workflows/active',
  requirePermission(['betting:workflows:monitor']),
  asyncHandler(workflowController.getActiveBettingWorkflows)
);

// Betting platform health check endpoint
router.get(
  '/betting/health',
  requirePermission(['betting:health:read']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const healthCheck = await workflowController.checkBettingPlatformHealth();

    const response: ApiResponse<any> = {
      success: true,
      data: healthCheck,
      message: 'Betting platform health check completed',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  })
);

export default router;
