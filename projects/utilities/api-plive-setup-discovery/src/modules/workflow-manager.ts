// WorkflowManager - integrates with database service
import { WorkflowInstance, WorkflowFilters, WorkflowResult, WorkflowAnalytics, WorkflowTimeline } from '../api/types/api-types';
import { databaseService } from '../database/services/database-service';
import { logger } from '../api/utils/logger';

export class WorkflowManager {
  async startWorkflow(workflowType: string, userId: string, data: any): Promise<WorkflowInstance> {
    try {
      const workflowData = {
        workflow_id: workflowType,
        status: 'pending' as const,
        current_step: 'initial',
        created_by: userId,
        data: {
          ...data,
          priority: data.priority || 'medium'
        },
        metadata: data.metadata || {},
        priority: data.priority || 'medium',
        total_steps: this.getTotalSteps(workflowType),
        current_step_index: 0
      } as any;

      const record = await databaseService.workflow.create(workflowData);

      logger.info('Workflow started', { workflowId: record.id, type: workflowType, userId });

      return this.transformRecord(record);
    } catch (error) {
      logger.error('Failed to start workflow', { error, workflowType, userId });
      throw error;
    }
  }

  async getWorkflows(filters: WorkflowFilters): Promise<WorkflowResult> {
    try {
      const result = await databaseService.workflow.find({
        page: filters.page,
        limit: filters.limit,
        sortBy: 'created_at',
        sortOrder: 'desc',
        filters: filters
      });

      return {
        items: result.items.map(this.transformExtendedRecord),
        total: result.total
      };
    } catch (error) {
      logger.error('Failed to get workflows', { error, filters });
      throw error;
    }
  }

  async getWorkflowById(id: string): Promise<WorkflowInstance | null> {
    try {
      const record = await databaseService.workflow.findById(id);
      return record ? this.transformRecord(record) : null;
    } catch (error) {
      logger.error('Failed to get workflow by ID', { error, workflowId: id });
      throw error;
    }
  }

  async handleApproval(id: string, stepId: string, userId: string, decision: 'approved' | 'rejected', comments?: string): Promise<void> {
    try {
      const workflow = await this.getWorkflowById(id);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      // Add approval record
      await databaseService.workflow.addApproval({
        workflow_id: id,
        step_id: stepId,
        approver: userId,
        status: decision,
        comments: comments || '',
        decided_at: new Date(),
        approval_type: 'standard',
        conditions: [],
        metadata: {}
      });

      // Update workflow status and step
      const updates: any = {
        updated_at: new Date(),
        current_step_index: (workflow.currentStepIndex || 0) + 1
      };

      // Check if workflow is complete
      const totalSteps = this.getTotalSteps(workflow.workflowId);
      if (updates.current_step_index >= totalSteps) {
        updates.status = decision === 'approved' ? 'completed' : 'rejected';
        updates.completed_at = new Date();
      }

      await databaseService.workflow.update(id, updates);

      // Log history
      await databaseService.workflow.logHistory(
        id,
        decision === 'approved' ? 'approved' : 'rejected',
        userId,
        { step: stepId, comments },
        workflow.status,
        updates.status,
        workflow.currentStep,
        updates.current_step || workflow.currentStep
      );

      logger.info('Workflow approval processed', {
        workflowId: id,
        stepId,
        userId,
        decision,
        newStatus: updates.status
      });

    } catch (error) {
      logger.error('Failed to handle approval', { error, workflowId: id, stepId, userId, decision });
      throw error;
    }
  }

  async getWorkflowsForExport(filters: any): Promise<any[]> {
    try {
      const result = await this.getWorkflows(filters);
      return result.items.map(workflow => ({
        id: workflow.id,
        workflowId: workflow.workflowId,
        status: workflow.status,
        currentStep: workflow.currentStep,
        createdBy: workflow.createdBy,
        createdAt: workflow.createdAt.toISOString(),
        updatedAt: workflow.updatedAt.toISOString(),
        completedAt: workflow.data.completedAt?.toISOString(),
        priority: workflow.data.priority || 'medium',
        financialImpact: workflow.data.financialImpact || 0,
        jurisdiction: workflow.data.jurisdiction || '',
        bettingCategory: workflow.data.betting_platform_data?.content_type || '',
        data: workflow.data
      }));
    } catch (error) {
      logger.error('Failed to get workflows for export', { error, filters });
      throw error;
    }
  }

  async getWorkflowAnalytics(id: string, options: any): Promise<WorkflowAnalytics> {
    try {
      return await databaseService.workflow.getAnalytics(id);
    } catch (error) {
      logger.error('Failed to get workflow analytics', { error, workflowId: id });
      throw error;
    }
  }

  async getWorkflowTimeline(id: string): Promise<WorkflowTimeline> {
    try {
      const history = await databaseService.workflow.getHistory(id);

      return {
        events: history.map(record => ({
          id: record.id,
          type: record.action as any,
          timestamp: record.timestamp.toISOString(),
          actor: record.actor,
          comments: record.details?.comments,
          metadata: record.details
        }))
      };
    } catch (error) {
      logger.error('Failed to get workflow timeline', { error, workflowId: id });
      throw error;
    }
  }

  getTotalSteps(workflowId: string): number {
    // Workflow step definitions
    const stepDefinitions: Record<string, number> = {
      'content_publishing': 3, // Initial -> Content Review -> Manager Approval
      'line_change_approval': 4, // Initial -> Trading Review -> Risk Assessment -> Final Approval
      'odds_update_approval': 3, // Initial -> Trading Review -> Manager Approval
      'promotion_approval': 4, // Initial -> Marketing Review -> Legal Review -> Manager Approval
      'standard_approval': 2, // Initial -> Manager Approval
      'incident_response': 3, // Initial -> Investigation -> Resolution
      'partner_preference_approval': 3 // Initial -> Compliance Review -> Manager Approval
    };

    return stepDefinitions[workflowId] || 2;
  }

  getCurrentStepIndex(workflow: WorkflowInstance): number {
    return workflow.currentStepIndex || 0;
  }

  async getWorkflowsWithBettingFilters(filters: any): Promise<WorkflowResult> {
    return this.getWorkflows(filters);
  }

  // Helper methods
  private transformRecord(record: any): WorkflowInstance {
    return {
      id: record.id,
      workflowId: record.workflow_id,
      status: record.status,
      currentStep: record.current_step,
      createdBy: record.created_by,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
      data: record.data,
      approvals: new Map(), // Load approvals separately if needed
      currentStepIndex: record.current_step_index || 0
    };
  }

  private transformExtendedRecord(record: any): WorkflowInstance {
    return this.transformRecord(record);
  }
}
