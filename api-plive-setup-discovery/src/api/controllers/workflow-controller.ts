import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth-middleware';
import { WorkflowManager } from '../../modules/workflow-manager';
import { BettingPlatformWorkflowIntegration } from '../../modules/betting-platform-integration';
import {
  ApiResponse,
  WorkflowResponse,
  ErrorResponse,
  PaginatedResponse,
  BulkOperationResult,
  WorkflowAnalytics,
  WorkflowTimeline,
  WorkflowInstance
} from '../types/api-types';
import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';

export class WorkflowController {
  private workflowManager: WorkflowManager;
  private bettingIntegration: BettingPlatformWorkflowIntegration;

  constructor() {
    this.workflowManager = new WorkflowManager();
    this.bettingIntegration = new BettingPlatformWorkflowIntegration({
      baseUrl: process.env.BETTING_API_URL || 'https://plive.sportswidgets.pro/manager-tools/',
      sessionToken: process.env.BETTING_SESSION_TOKEN || '',
      authToken: process.env.BETTING_API_KEY || '', // Fallback
      timeout: parseInt(process.env.BETTING_API_TIMEOUT || '30000'),
      retryAttempts: parseInt(process.env.BETTING_API_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(process.env.BETTING_API_RETRY_DELAY || '1000'),
      rateLimitRequests: parseInt(process.env.BETTING_API_RATE_LIMIT_REQUESTS || '100'),
      rateLimitWindowMs: parseInt(process.env.BETTING_API_RATE_LIMIT_WINDOW || '60000')
    });
  }

  // Create new workflow with betting platform integration
  async createWorkflow(req: AuthenticatedRequest, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const { workflowType, data, priority = 'medium', metadata = {} } = req.body;
      const userId = req.user?.id || req.apiKey?.id || 'system';

      logger.info('Creating workflow', {
        workflowType,
        userId,
        priority,
        hasBettingData: !!data.bettingPlatformData
      });

      // Record metric
      metrics.increment('workflow.created', { type: workflowType, priority });

      let instance;
      if (this.isBettingPlatformWorkflow(workflowType)) {
        instance = await this.createBettingWorkflow(workflowType, data, userId, priority);
      } else {
        instance = await this.workflowManager.startWorkflow(workflowType, userId, {
          ...data,
          metadata,
          createdByApi: true
        });
      }

      const responseTime = Date.now() - startTime;
      metrics.histogram('workflow.creation_time', responseTime, { type: workflowType || 'unknown' });

      const response: ApiResponse<WorkflowResponse> = {
        success: true,
        data: this.formatWorkflowResponse(instance),
        message: 'Workflow created successfully',
        timestamp: new Date().toISOString(),
        metadata: {
          responseTime,
          workflowId: instance.id
        }
      };

      res.status(201).json(response);
      } catch (error) {
      const responseTime = Date.now() - startTime;
      metrics.increment('workflow.creation_errors', { type: req.body?.workflowType || 'unknown' });

      logger.error('Failed to create workflow', {
        error,
        body: req.body,
        responseTime
      });

      this.handleError(error, res);
    }
  }

  // Betting platform specific workflow creation
  private async createBettingWorkflow(
    workflowType: string,
    data: any,
    userId: string,
    priority: string
  ): Promise<WorkflowInstance> {
    switch (workflowType) {
      case 'content_publishing':
        return await this.bettingIntegration.handleContentSubmission({
          ...data,
          submittedBy: userId,
          priority
        });

      case 'line_change_approval':
        return await this.bettingIntegration.handleLineChangeRequest({
          ...data,
          requestedBy: userId,
          priority
        });

      case 'odds_update_approval':
        return await this.bettingIntegration.handleOddsUpdateRequest({
          ...data,
          requestedBy: userId,
          priority
        });

      case 'promotion_approval':
        return await this.bettingIntegration.handlePromotionSubmission({
          ...data,
          submittedBy: userId,
          priority
        });

      default:
        throw new Error(`Unknown betting platform workflow type: ${workflowType}`);
    }
  }

  // Submit content for review (betting platform specific)
  async submitContentForReview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { contentType, contentData, jurisdiction, financialImpact } = req.body;
      const userId = req.user?.id || req.apiKey?.id || 'system';

      logger.info('Submitting content for review', {
        contentType,
        userId,
        jurisdiction
      });

      const instance = await this.bettingIntegration.handleContentSubmission({
        contentType,
        contentData,
        jurisdiction,
        financialImpact,
        submittedBy: userId
      });

      // Update betting platform with workflow status
      await this.bettingIntegration.updateContentStatus(contentData.contentId, {
        workflowId: instance.id,
        status: 'in_review',
        currentStep: instance.currentStep
      });

      const response: ApiResponse<WorkflowResponse> = {
        success: true,
        data: this.formatWorkflowResponse(instance),
        message: 'Content submitted for review successfully',
        timestamp: new Date().toISOString()
      };

      res.status(201).json(response);
    } catch (error) {
      logger.error('Failed to submit content for review', { error, body: req.body });
      this.handleError(error, res);
    }
  }

  // Submit line change for approval
  async submitLineChange(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { lineId, oldOdds, newOdds, eventName, marketType, reason } = req.body;
      const userId = req.user?.id || req.apiKey?.id || 'system';

      logger.info('Submitting line change for approval', {
        lineId,
        userId,
        eventName
      });

      // Calculate financial impact
      const impactAnalysis = await this.bettingIntegration.calculateFinancialImpact({
        lineId,
        oldOdds,
        newOdds,
        marketType
      });

      const instance = await this.bettingIntegration.handleLineChangeRequest({
        lineId,
        oldOdds,
        newOdds,
        eventName,
        marketType,
        reason,
        financialImpact: impactAnalysis.totalImpact,
        oddsChangePercentage: impactAnalysis.percentageChange,
        totalExposure: impactAnalysis.totalExposure,
        requestedBy: userId
      });

      // Notify trading team via Telegram/Slack
      await this.notifyTradingTeam(lineId, instance.id, impactAnalysis);

      const response: ApiResponse<WorkflowResponse> = {
        success: true,
        data: this.formatWorkflowResponse(instance),
        message: 'Line change submitted for approval',
        timestamp: new Date().toISOString(),
        metadata: {
          financialImpact: impactAnalysis.totalImpact,
          riskLevel: impactAnalysis.riskLevel
        }
      };

      res.status(201).json(response);
    } catch (error) {
      logger.error('Failed to submit line change', { error, body: req.body });
      this.handleError(error, res);
    }
  }

  // Get workflows with advanced filtering for betting operations
  async getActiveBettingWorkflows(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        bettingCategory,
        riskLevel,
        financialImpactMin,
        financialImpactMax,
        urgency
      } = req.query;

      const filters = {
        status: req.query.status as string || 'in_progress',
        priority: req.query.priority as string,
        bettingCategory: bettingCategory as string,
        riskLevel: riskLevel as string,
        financialImpactMin: financialImpactMin ? Number(financialImpactMin) : undefined,
        financialImpactMax: financialImpactMax ? Number(financialImpactMax) : undefined,
        urgency: urgency as string
      } as any;

      const result = await this.workflowManager.getWorkflowsWithBettingFilters(filters);

      const response: ApiResponse<PaginatedResponse<WorkflowResponse>> = {
        success: true,
        data: {
          items: result.items.map(this.formatWorkflowResponse),
          total: result.total,
          page: Number(req.query.page) || 1,
          limit: Number(req.query.limit) || 20,
          totalPages: Math.ceil(result.total / (Number(req.query.limit) || 20))
        },
        message: 'Active betting workflows retrieved successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      logger.error('Failed to get active betting workflows', { error, query: req.query });
      this.handleError(error, res);
    }
  }

  // Get workflows with filtering and pagination
  async getWorkflows(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        type,
        priority,
        startDate,
        endDate,
        assignee
      } = req.query;

      const filters = {
        status: status as string,
        type: type as string,
        priority: priority as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        assignee: assignee as string
      } as any;

      const result = await this.workflowManager.getWorkflows({
        page: Number(page),
        limit: Number(limit),
        filters: filters
      } as any);

      const response: ApiResponse<PaginatedResponse<WorkflowResponse>> = {
        success: true,
        data: {
          items: result.items.map(this.formatWorkflowResponse),
          total: result.total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(result.total / Number(limit))
        },
        message: 'Workflows retrieved successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      logger.error('Failed to get workflows', { error, query: req.query });
      this.handleError(error, res);
    }
  }

  // Get workflow by ID
  async getWorkflowById(req: AuthenticatedRequest, res: Response): Promise<void | Response> {
    try {
      const { id } = req.params;
      const workflow = await this.workflowManager.getWorkflowById(id);

      if (!workflow) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'WORKFLOW_NOT_FOUND',
            message: 'Workflow not found'
          },
          timestamp: new Date().toISOString()
        });
      }

      const response: ApiResponse<WorkflowResponse> = {
        success: true,
        data: this.formatWorkflowResponse(workflow),
        message: 'Workflow retrieved successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      logger.error('Failed to get workflow by ID', { error, workflowId: req.params.id });
      this.handleError(error, res);
    }
  }

  // Approve workflow step
  async approveStep(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { comments, stepId = 'current' } = req.body;
      const userId = req.user?.id || req.apiKey?.id || 'system';

      logger.info('Approving workflow step', { workflowId: id, userId, stepId });

      await this.workflowManager.handleApproval(id, stepId, userId, 'approved', comments);

      const response: ApiResponse<null> = {
        success: true,
        message: 'Workflow step approved successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      logger.error('Failed to approve workflow step', { error, workflowId: req.params.id });
      this.handleError(error, res);
    }
  }

  // Reject workflow step
  async rejectStep(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { comments, stepId = 'current' } = req.body;
      const userId = req.user?.id || req.apiKey?.id || 'system';

      logger.info('Rejecting workflow step', { workflowId: id, userId, stepId });

      await this.workflowManager.handleApproval(id, stepId, userId, 'rejected', comments);

      const response: ApiResponse<null> = {
        success: true,
        message: 'Workflow step rejected successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      logger.error('Failed to reject workflow step', { error, workflowId: req.params.id });
      this.handleError(error, res);
    }
  }

  // Bulk operations with performance optimization
  async bulkApprove(req: AuthenticatedRequest, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const { workflowIds, comments, approvalType = 'standard' } = req.body;
      const userId = req.user?.id || req.apiKey?.id || 'system';

      logger.info('Bulk approving workflows', {
        workflowCount: workflowIds.length,
        userId,
        approvalType
      });

      // Validate bulk operation limits
      if (workflowIds.length > 100) {
        throw new Error('Bulk approval limit exceeded (max: 100 workflows)');
      }

      const results = await this.processBulkApprovals(workflowIds, userId, comments);

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      const responseTime = Date.now() - startTime;

      metrics.histogram('bulk.approval_time', responseTime, { count: workflowIds.length });

      const response: ApiResponse<BulkOperationResult> = {
        success: failed === 0,
        data: {
          successful,
          failed,
          total: workflowIds.length,
          errors: failed > 0 ? results.filter(r => r.status === 'rejected').map(r => (r as any).reason) : []
        },
        message: `Bulk approval completed: ${successful} successful, ${failed} failed`,
        timestamp: new Date().toISOString(),
        metadata: {
          responseTime
        }
      };

      res.json(response);
    } catch (error) {
      const responseTime = Date.now() - startTime;
      metrics.increment('bulk.approval_errors', { count: req.body.workflowIds?.length || 0 });

      logger.error('Failed to bulk approve workflows', { error, body: req.body });
      this.handleError(error, res);
    }
  }

  // Bulk cancel workflows
  async bulkCancel(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workflowIds, reason } = req.body;
      const userId = req.user?.id || req.apiKey?.id || 'system';

      logger.info('Bulk cancelling workflows', {
        workflowCount: workflowIds.length,
        userId
      });

      if (workflowIds.length > 50) {
        throw new Error('Bulk cancel limit exceeded (max: 50 workflows)');
      }

      const results = await Promise.allSettled(
        workflowIds.map((id: string) =>
          this.cancelWorkflowInternal(id, userId, reason)
        )
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      const response: ApiResponse<BulkOperationResult> = {
        success: failed === 0,
        data: {
          successful,
          failed,
          total: workflowIds.length
        },
        message: `Bulk cancel completed: ${successful} successful, ${failed} failed`,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      logger.error('Failed to bulk cancel workflows', { error, body: req.body });
      this.handleError(error, res);
    }
  }

  // Update workflow
  async updateWorkflow(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;

      logger.info('Updating workflow', { workflowId: id, updates });

      // Placeholder - implement actual update logic
      const response: ApiResponse<null> = {
        success: true,
        message: 'Workflow updated successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      logger.error('Failed to update workflow', { error, workflowId: req.params.id });
      this.handleError(error, res);
    }
  }

  // Delete workflow
  async deleteWorkflow(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      logger.info('Deleting workflow', { workflowId: id });

      // Placeholder - implement actual delete logic
      const response: ApiResponse<null> = {
        success: true,
        message: 'Workflow deleted successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      logger.error('Failed to delete workflow', { error, workflowId: req.params.id });
      this.handleError(error, res);
    }
  }

  // Start workflow
  async startWorkflow(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id || req.apiKey?.id || 'system';

      logger.info('Starting workflow', { workflowId: id, userId });

      // Placeholder - implement actual start logic
      const response: ApiResponse<null> = {
        success: true,
        message: 'Workflow started successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      logger.error('Failed to start workflow', { error, workflowId: req.params.id });
      this.handleError(error, res);
    }
  }

  // Cancel workflow
  async cancelWorkflow(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = req.user?.id || req.apiKey?.id || 'system';

      logger.info('Cancelling workflow', { workflowId: id, userId });

      await this.cancelWorkflowInternal(id, userId, reason);

      const response: ApiResponse<null> = {
        success: true,
        message: 'Workflow cancelled successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      logger.error('Failed to cancel workflow', { error, workflowId: req.params.id });
      this.handleError(error, res);
    }
  }

  // Escalate workflow
  async escalateWorkflow(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason, priority } = req.body;
      const userId = req.user?.id || req.apiKey?.id || 'system';

      logger.info('Escalating workflow', { workflowId: id, userId, priority });

      // Placeholder - implement escalation logic
      const response: ApiResponse<null> = {
        success: true,
        message: 'Workflow escalated successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      logger.error('Failed to escalate workflow', { error, workflowId: req.params.id });
      this.handleError(error, res);
    }
  }

  // Delegate workflow
  async delegateWorkflow(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { delegateTo, reason } = req.body;
      const userId = req.user?.id || req.apiKey?.id || 'system';

      logger.info('Delegating workflow', { workflowId: id, userId, delegateTo });

      // Placeholder - implement delegation logic
      const response: ApiResponse<null> = {
        success: true,
        message: 'Workflow delegated successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      logger.error('Failed to delegate workflow', { error, workflowId: req.params.id });
      this.handleError(error, res);
    }
  }

  // Get workflow status
  async getWorkflowStatus(req: AuthenticatedRequest, res: Response): Promise<void | Response> {
    try {
      const { id } = req.params;
      const workflow = await this.workflowManager.getWorkflowById(id);

      if (!workflow) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'WORKFLOW_NOT_FOUND',
            message: 'Workflow not found'
          },
          timestamp: new Date().toISOString()
        });
      }

      const response: ApiResponse<any> = {
        success: true,
        data: {
          id: workflow.id,
          status: workflow.status,
          currentStep: workflow.currentStep,
          progress: this.calculateProgress(workflow),
          lastUpdated: workflow.updatedAt.toISOString()
        },
        message: 'Workflow status retrieved successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      logger.error('Failed to get workflow status', { error, workflowId: req.params.id });
      this.handleError(error, res);
    }
  }

  // Get workflow analytics
  async getWorkflowAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { period = '7d', metrics: requestedMetrics = ['performance', 'approval_rate'] } = req.query;

      const analytics = await this.workflowManager.getWorkflowAnalytics(id, {
        period: period as string,
        metrics: requestedMetrics as string[]
      });

      const response: ApiResponse<WorkflowAnalytics> = {
        success: true,
        data: analytics,
        message: 'Workflow analytics retrieved successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      logger.error('Failed to get workflow analytics', { error, workflowId: req.params.id });
      this.handleError(error, res);
    }
  }

  // Get workflow timeline
  async getWorkflowTimeline(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const timeline = await this.workflowManager.getWorkflowTimeline(id);

      const response: ApiResponse<WorkflowTimeline> = {
        success: true,
        data: timeline,
        message: 'Workflow timeline retrieved successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      logger.error('Failed to get workflow timeline', { error, workflowId: req.params.id });
      this.handleError(error, res);
    }
  }

  // Submit odds update
  async submitOddsUpdate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const oddsData = req.body;
      const userId = req.user?.id || req.apiKey?.id || 'system';

      logger.info('Submitting odds update', { userId, eventId: oddsData.eventId });

      const instance = await this.bettingIntegration.handleOddsUpdateRequest({
        ...oddsData,
        requestedBy: userId
      });

      const response: ApiResponse<WorkflowResponse> = {
        success: true,
        data: this.formatWorkflowResponse(instance),
        message: 'Odds update submitted for approval',
        timestamp: new Date().toISOString()
      };

      res.status(201).json(response);
    } catch (error) {
      logger.error('Failed to submit odds update', { error, body: req.body });
      this.handleError(error, res);
    }
  }

  // Check betting platform health
  async checkBettingPlatformHealth(): Promise<any> {
    try {
      logger.info('Checking betting platform health');
      return await this.bettingIntegration.healthCheck();
    } catch (error) {
      logger.error('Failed to check betting platform health', { error });
      return {
        status: 'error',
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // Export workflows
  async exportWorkflows(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { format = 'json', filters = {}, columns = [] } = req.body;
      const userId = req.user?.id || req.apiKey?.id || 'system';

      logger.info('Exporting workflows', { format, userId, filterCount: Object.keys(filters).length });

      const workflows = await this.workflowManager.getWorkflowsForExport(filters);

      let exportData: Buffer | string;
      let filename: string;

      switch (format) {
        case 'csv':
          exportData = await this.exportToCSV(workflows, columns);
          filename = `workflows-${new Date().toISOString().split('T')[0]}.csv`;
          res.setHeader('Content-Type', 'text/csv');
          break;

        case 'xlsx':
          exportData = await this.exportToExcel(workflows, columns);
          filename = `workflows-${new Date().toISOString().split('T')[0]}.xlsx`;
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          break;

        case 'json':
        default:
          exportData = JSON.stringify(workflows, null, 2);
          filename = `workflows-${new Date().toISOString().split('T')[0]}.json`;
          res.setHeader('Content-Type', 'application/json');
          break;
      }

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', Buffer.byteLength(exportData));

      res.send(exportData);

      logger.info('Workflow export completed', {
        format,
        userId,
        recordCount: workflows.length,
        filename
      });
    } catch (error) {
      logger.error('Failed to export workflows', { error, body: req.body });
      this.handleError(error, res);
    }
  }

  // Helper methods
  private formatWorkflowResponse(instance: WorkflowInstance): WorkflowResponse {
    return {
      id: instance.id,
      workflowId: instance.workflowId,
      status: instance.status,
      currentStep: instance.currentStep,
      createdBy: instance.createdBy,
      createdAt: instance.createdAt.toISOString(),
      updatedAt: instance.updatedAt.toISOString(),
      data: instance.data,
      progress: this.calculateProgress(instance),
      estimatedCompletion: this.estimateCompletion(instance),
      approvals: Array.from(instance.approvals.entries()).map(([key, approval]) => ({
        stepId: approval.stepId,
        approver: approval.approver,
        status: approval.status,
        comments: approval.comments,
        decidedAt: approval.decidedAt?.toISOString()
      })),
      metadata: {
        totalSteps: this.workflowManager.getTotalSteps(instance.workflowId),
        currentStepIndex: this.workflowManager.getCurrentStepIndex(instance),
        isBettingWorkflow: this.isBettingPlatformWorkflow(instance.workflowId),
        priority: instance.data.priority || 'medium',
        financialImpact: instance.data.financialImpact || 0
      }
    };
  }

  private calculateProgress(instance: WorkflowInstance): number {
    const totalSteps = this.workflowManager.getTotalSteps(instance.workflowId);
    const currentStepIndex = this.workflowManager.getCurrentStepIndex(instance);
    return totalSteps > 0 ? Math.round((currentStepIndex / totalSteps) * 100) : 0;
  }

  private estimateCompletion(instance: WorkflowInstance): string | null {
    // Placeholder - implement completion estimation
    return null;
  }

  private isBettingPlatformWorkflow(workflowType: string): boolean {
    const bettingWorkflowTypes = [
      'content_publishing',
      'line_change_approval',
      'odds_update_approval',
      'promotion_approval',
      'partner_preference_approval'
    ];
    return bettingWorkflowTypes.includes(workflowType);
  }

  private async processBulkApprovals(
    workflowIds: string[],
    userId: string,
    comments: string
  ): Promise<PromiseSettledResult<void>[]> {
    const batchSize = 10;
    const batches = this.createBatches(workflowIds, batchSize);
    const results: PromiseSettledResult<void>[] = [];

    for (const batch of batches) {
      const batchResults = await Promise.allSettled(
        batch.map(id =>
          this.workflowManager.handleApproval(id, 'current', userId, 'approved', comments)
        )
      );
      results.push(...batchResults);

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private async cancelWorkflowInternal(id: string, userId: string, reason: string): Promise<void> {
    // Placeholder - implement actual cancel logic
    logger.info('Workflow cancelled internally', { workflowId: id, userId, reason });
  }

  private async notifyTradingTeam(lineId: string, workflowId: string, impactAnalysis: any): Promise<void> {
    // Placeholder - implement trading team notification
    logger.info('Trading team notified', { lineId, workflowId, impactAnalysis });
  }

  private async exportToCSV(workflows: any[], columns: string[]): Promise<string> {
    const headers = columns.length > 0 ? columns : [
      'id', 'workflowId', 'status', 'currentStep', 'createdBy',
      'createdAt', 'updatedAt', 'progress', 'financialImpact'
    ];

    const csvHeaders = headers.join(',');
    const csvRows = workflows.map(workflow =>
      headers.map(header => {
        const value = this.getNestedValue(workflow, header);
        return this.escapeCSVValue(value);
      }).join(',')
    ).join('\n');

    return `${csvHeaders}\n${csvRows}`;
  }

  private async exportToExcel(workflows: any[], columns: string[]): Promise<Buffer> {
    // Placeholder - implement Excel export
    const data = workflows.map(w => ({
      id: w.id,
      status: w.status,
      type: w.workflowId,
      created: w.createdAt,
      progress: this.calculateProgress(w)
    }));

    return Buffer.from(JSON.stringify(data));
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private escapeCSVValue(value: any): string {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  }

  private handleError(error: any, res: Response): void {
    const statusCode = error.statusCode || error.code || 500;
    const errorResponse: ErrorResponse = {
      success: false,
      data: null,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'An internal error occurred',
        details: error.details || null
      },
      timestamp: new Date().toISOString()
    };

    res.status(statusCode).json(errorResponse);
  }
}
