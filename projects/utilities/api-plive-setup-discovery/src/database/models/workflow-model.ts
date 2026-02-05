import { db } from '../connection';
import {
  WorkflowRecord,
  WorkflowApprovalRecord,
  WorkflowHistoryRecord,
  WorkflowQueryOptions,
  ExtendedWorkflowRecord
} from '../types/workflow-types';
import { logger } from '../../api/utils/logger';
// Bun-native: use crypto.randomUUID()

export class WorkflowModel {
  // Create a new workflow
  async create(workflowData: Partial<WorkflowRecord>): Promise<WorkflowRecord> {
    const id = crypto.randomUUID();
    const now = new Date();

    const workflow: WorkflowRecord = {
      id,
      workflow_id: workflowData.workflow_id!,
      status: workflowData.status || 'pending',
      current_step: workflowData.current_step || 'initial',
      created_by: workflowData.created_by!,
      created_at: now,
      updated_at: now,
      data: workflowData.data || {},
      metadata: workflowData.metadata || {},
      priority: workflowData.priority || 'medium',
      total_steps: workflowData.total_steps || 1,
      current_step_index: workflowData.current_step_index || 0,
      estimated_completion: workflowData.estimated_completion
    };

    const query = `
      INSERT INTO workflows (
        id, workflow_id, status, current_step, created_by, created_at, updated_at,
        completed_at, data, metadata, priority, total_steps, current_step_index, estimated_completion
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    const values = [
      workflow.id,
      workflow.workflow_id,
      workflow.status,
      workflow.current_step,
      workflow.created_by,
      workflow.created_at,
      workflow.updated_at,
      workflow.completed_at,
      JSON.stringify(workflow.data),
      JSON.stringify(workflow.metadata),
      workflow.priority,
      workflow.total_steps,
      workflow.current_step_index,
      workflow.estimated_completion
    ];

    try {
      const result = await db.query<WorkflowRecord>(query, values);
      logger.info('Workflow created', { workflowId: workflow.id });

      // Log history
      await this.logHistory(workflow.id, 'created', workflow.created_by, {
        workflow_type: workflow.workflow_id,
        initial_data: workflow.data
      });

      return this.transformRecord(result.rows[0]);
    } catch (error) {
      logger.error('Failed to create workflow', { error, workflowData });
      throw error;
    }
  }

  // Find workflow by ID
  async findById(id: string): Promise<WorkflowRecord | null> {
    const query = 'SELECT * FROM workflows WHERE id = $1';
    const result = await db.query<WorkflowRecord>(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.transformRecord(result.rows[0]);
  }

  // Find workflows with filtering and pagination
  async find(options: WorkflowQueryOptions = {}): Promise<{
    items: ExtendedWorkflowRecord[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'desc',
      filters = {}
    } = options;

    const offset = (page - 1) * limit;

    // Build WHERE clause
    const whereConditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.status) {
      whereConditions.push(`status = $${paramIndex++}`);
      values.push(filters.status);
    }

    if (filters.workflow_id) {
      whereConditions.push(`workflow_id = $${paramIndex++}`);
      values.push(filters.workflow_id);
    }

    if (filters.priority) {
      whereConditions.push(`priority = $${paramIndex++}`);
      values.push(filters.priority);
    }

    if (filters.created_by) {
      whereConditions.push(`created_by = $${paramIndex++}`);
      values.push(filters.created_by);
    }

    if (filters.start_date) {
      whereConditions.push(`created_at >= $${paramIndex++}`);
      values.push(filters.start_date);
    }

    if (filters.end_date) {
      whereConditions.push(`created_at <= $${paramIndex++}`);
      values.push(filters.end_date);
    }

    // Betting platform specific filters
    if (filters.betting_category) {
      whereConditions.push(`data->'betting_platform_data'->>'content_type' = $${paramIndex++} OR data->'betting_platform_data'->>'market_type' = $${paramIndex++}`);
      values.push(filters.betting_category, filters.betting_category);
    }

    if (filters.financial_impact_min !== undefined) {
      whereConditions.push(`(data->'betting_platform_data'->>'financial_impact')::numeric >= $${paramIndex++}`);
      values.push(filters.financial_impact_min);
    }

    if (filters.financial_impact_max !== undefined) {
      whereConditions.push(`(data->'betting_platform_data'->>'financial_impact')::numeric <= $${paramIndex++}`);
      values.push(filters.financial_impact_max);
    }

    if (filters.risk_level) {
      whereConditions.push(`data->'betting_platform_data'->>'risk_level' = $${paramIndex++}`);
      values.push(filters.risk_level);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM workflows ${whereClause}`;
    const countResult = await db.query<{ total: string }>(countQuery, values);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    const sortDirection = sortOrder.toUpperCase();
    const dataQuery = `
      SELECT * FROM workflows
      ${whereClause}
      ORDER BY ${sortBy} ${sortDirection}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    values.push(limit, offset);

    const dataResult = await db.query<WorkflowRecord>(dataQuery, values);
    const items = dataResult.rows.map(row => this.transformExtendedRecord(row));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  // Update workflow
  async update(id: string, updates: Partial<WorkflowRecord>): Promise<WorkflowRecord | null> {
    const setFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Build SET clause dynamically
    if (updates.status !== undefined) {
      setFields.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }

    if (updates.current_step !== undefined) {
      setFields.push(`current_step = $${paramIndex++}`);
      values.push(updates.current_step);
    }

    if (updates.current_step_index !== undefined) {
      setFields.push(`current_step_index = $${paramIndex++}`);
      values.push(updates.current_step_index);
    }

    if (updates.data !== undefined) {
      setFields.push(`data = $${paramIndex++}`);
      values.push(JSON.stringify(updates.data));
    }

    if (updates.metadata !== undefined) {
      setFields.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(updates.metadata));
    }

    if (updates.completed_at !== undefined) {
      setFields.push(`completed_at = $${paramIndex++}`);
      values.push(updates.completed_at);
    }

    if (updates.estimated_completion !== undefined) {
      setFields.push(`estimated_completion = $${paramIndex++}`);
      values.push(updates.estimated_completion);
    }

    if (setFields.length === 0) {
      throw new Error('No fields to update');
    }

    setFields.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());

    const query = `
      UPDATE workflows
      SET ${setFields.join(', ')}
      WHERE id = $${paramIndex++}
      RETURNING *
    `;

    values.push(id);

    try {
      const result = await db.query<WorkflowRecord>(query, values);

      if (result.rows.length === 0) {
        return null;
      }

      logger.info('Workflow updated', { workflowId: id, updates });
      return this.transformRecord(result.rows[0]);
    } catch (error) {
      logger.error('Failed to update workflow', { error, workflowId: id, updates });
      throw error;
    }
  }

  // Delete workflow
  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM workflows WHERE id = $1 RETURNING id';

    try {
      const result = await db.query(query, [id]);
      const deleted = result.rowCount > 0;

      if (deleted) {
        logger.info('Workflow deleted', { workflowId: id });
      }

      return deleted;
    } catch (error) {
      logger.error('Failed to delete workflow', { error, workflowId: id });
      throw error;
    }
  }

  // Add approval record
  async addApproval(approval: Omit<WorkflowApprovalRecord, 'id'>): Promise<WorkflowApprovalRecord> {
    const id = crypto.randomUUID();

    const query = `
      INSERT INTO workflow_approvals (
        id, workflow_id, step_id, approver, status, comments, decided_at, approval_type, conditions, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      id,
      approval.workflow_id,
      approval.step_id,
      approval.approver,
      approval.status,
      approval.comments,
      approval.decided_at,
      approval.approval_type,
      JSON.stringify(approval.conditions || []),
      JSON.stringify(approval.metadata || {})
    ];

    try {
      const result = await db.query<WorkflowApprovalRecord>(query, values);
      logger.info('Approval added', { workflowId: approval.workflow_id, stepId: approval.step_id });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to add approval', { error, approval });
      throw error;
    }
  }

  // Get approvals for workflow
  async getApprovals(workflowId: string): Promise<WorkflowApprovalRecord[]> {
    const query = 'SELECT * FROM workflow_approvals WHERE workflow_id = $1 ORDER BY decided_at ASC';
    const result = await db.query<WorkflowApprovalRecord>(query, [workflowId]);
    return result.rows;
  }

  // Get workflow history
  async getHistory(workflowId: string): Promise<WorkflowHistoryRecord[]> {
    const query = 'SELECT * FROM workflow_history WHERE workflow_id = $1 ORDER BY timestamp ASC';
    const result = await db.query<WorkflowHistoryRecord>(query, [workflowId]);
    return result.rows;
  }

  // Log history event
  async logHistory(
    workflowId: string,
    action: string,
    actor: string,
    details?: any,
    oldStatus?: string,
    newStatus?: string,
    oldStep?: string,
    newStep?: string
  ): Promise<void> {
    const id = crypto.randomUUID();

    const query = `
      INSERT INTO workflow_history (
        id, workflow_id, action, actor, timestamp, details, old_status, new_status, old_step, new_step
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;

    const values = [
      id,
      workflowId,
      action,
      actor,
      new Date(),
      JSON.stringify(details || {}),
      oldStatus,
      newStatus,
      oldStep,
      newStep
    ];

    try {
      await db.query(query, values);
    } catch (error) {
      logger.error('Failed to log history', { error, workflowId, action });
      // Don't throw - history logging shouldn't break workflow operations
    }
  }

  // Get workflow analytics
  async getAnalytics(workflowId: string): Promise<any> {
    // This would aggregate data from workflow_analytics table
    // Placeholder implementation
    const workflow = await this.findById(workflowId);
    if (!workflow) return null;

    const approvals = await this.getApprovals(workflowId);
    const history = await this.getHistory(workflowId);

    return {
      totalTime: workflow.completed_at
        ? workflow.completed_at.getTime() - workflow.created_at.getTime()
        : Date.now() - workflow.created_at.getTime(),
      approvalRate: approvals.filter(a => a.status === 'approved').length / approvals.length,
      rejectionRate: approvals.filter(a => a.status === 'rejected').length / approvals.length,
      escalationCount: history.filter(h => h.action === 'escalated').length,
      timeline: history.map(h => ({
        step: h.action,
        timestamp: h.timestamp.toISOString(),
        duration: 0, // Would calculate based on step transitions
        actor: h.actor
      }))
    };
  }

  // Bulk operations
  async bulkUpdateStatus(workflowIds: string[], status: string, actor: string, comments?: string): Promise<{
    successful: string[];
    failed: string[];
  }> {
    const successful: string[] = [];
    const failed: string[] = [];

    await db.transaction(async (client) => {
      for (const workflowId of workflowIds) {
        try {
          const updateQuery = 'UPDATE workflows SET status = $1, updated_at = $2 WHERE id = $3';
          await client.query(updateQuery, [status, new Date(), workflowId]);

          // Log history
          await this.logHistory(workflowId, status === 'cancelled' ? 'cancelled' : 'updated', actor, { comments });

          successful.push(workflowId);
        } catch (error) {
          logger.error('Failed to update workflow status in bulk operation', { error, workflowId });
          failed.push(workflowId);
        }
      }
    });

    return { successful, failed };
  }

  // Helper methods
  private transformRecord(record: any): WorkflowRecord {
    return {
      ...record,
      data: typeof record.data === 'string' ? JSON.parse(record.data) : record.data,
      metadata: typeof record.metadata === 'string' ? JSON.parse(record.metadata) : record.metadata,
      created_at: new Date(record.created_at),
      updated_at: new Date(record.updated_at),
      completed_at: record.completed_at ? new Date(record.completed_at) : undefined,
      estimated_completion: record.estimated_completion ? new Date(record.estimated_completion) : undefined
    };
  }

  private transformExtendedRecord(record: any): ExtendedWorkflowRecord {
    return {
      ...this.transformRecord(record),
      betting_platform_data: record.data?.betting_platform_data
    };
  }
}
