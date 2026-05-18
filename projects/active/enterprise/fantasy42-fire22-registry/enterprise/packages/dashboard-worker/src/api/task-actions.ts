// Fire22 Dashboard Worker - Task Assignment & Quick Actions API
// Specialized endpoints for common task operations

import { SQL } from 'bun';
import { Env } from '../types/env';
import { getDatabase } from '../database/connection';
import { TaskService } from './tasks-enhanced';

export interface TaskAssignmentRequest {
  taskUuid: string;
  assigneeId: string;
  reason?: string;
}

export interface BulkStatusUpdateRequest {
  taskUuids: string[];
  status: 'planning' | 'active' | 'in-progress' | 'review' | 'completed' | 'cancelled';
  reason?: string;
}

export interface ProgressUpdateRequest {
  taskUuid: string;
  progress: number; // 0-100
  comment?: string;
}

export interface TaskCommentRequest {
  taskUuid: string;
  comment: string;
}

export interface QuickTaskStats {
  overdue: number;
  dueToday: number;
  dueThisWeek: number;
  unassigned: number;
  inProgress: number;
  blocked: number;
  completedThisWeek: number;
}

export class TaskActionsService {
  private db: SQL;
  private taskService: TaskService;

  constructor(db: SQL) {
    this.db = db;
    this.taskService = new TaskService(db);
  }

  /**
   * Assign task to a user
   */
  async assignTask(request: TaskAssignmentRequest, userId?: string): Promise<any> {
    const { taskUuid, assigneeId, reason } = request;

    try {
      // Get current task to check if assignment changed
      const currentTask = await this.taskService.getTaskByUuid(taskUuid);

      if (currentTask.assigneeId === assigneeId) {
        return {
          success: false,
          message: 'Task is already assigned to this user',
        };
      }

      // Update assignment
      const updatedTask = await this.taskService.updateTask({ uuid: taskUuid, assigneeId }, userId);

      // Log assignment activity
      await this.logActivity(
        taskUuid,
        userId || null,
        'assignment',
        currentTask.assignee?.name || 'Unassigned',
        updatedTask.assignee?.name || 'Unassigned',
        reason || 'Task reassigned'
      );

      return {
        success: true,
        task: updatedTask,
        message: `Task assigned to ${updatedTask.assignee?.name || 'user'}`,
      };
    } catch (error) {
      throw new Error(`Failed to assign task: ${error}`);
    }
  }

  /**
   * Update task progress
   */
  async updateProgress(request: ProgressUpdateRequest, userId?: string): Promise<any> {
    const { taskUuid, progress, comment } = request;

    if (progress < 0 || progress > 100) {
      throw new Error('Progress must be between 0 and 100');
    }

    try {
      const currentTask = await this.taskService.getTaskByUuid(taskUuid);

      // Auto-update status based on progress
      let newStatus = currentTask.status;
      if (progress === 100 && currentTask.status !== 'completed') {
        newStatus = 'completed';
      } else if (progress > 0 && progress < 100 && currentTask.status === 'planning') {
        newStatus = 'in-progress';
      }

      const updatedTask = await this.taskService.updateTask(
        {
          uuid: taskUuid,
          progress,
          status: newStatus,
          completedDate: progress === 100 ? new Date().toISOString() : undefined,
        },
        userId
      );

      // Log progress update
      await this.logActivity(
        taskUuid,
        userId || null,
        'progress_update',
        `${currentTask.progress}%`,
        `${progress}%`,
        comment || `Progress updated to ${progress}%`
      );

      return {
        success: true,
        task: updatedTask,
        message: `Progress updated to ${progress}%${newStatus !== currentTask.status ? ` and status changed to ${newStatus}` : ''}`,
      };
    } catch (error) {
      throw new Error(`Failed to update progress: ${error}`);
    }
  }

  /**
   * Bulk update task status
   */
  async bulkUpdateStatus(request: BulkStatusUpdateRequest, userId?: string): Promise<any> {
    const { taskUuids, status, reason } = request;

    if (taskUuids.length === 0) {
      throw new Error('No tasks specified');
    }

    if (taskUuids.length > 50) {
      throw new Error('Bulk operations limited to 50 tasks maximum');
    }

    try {
      const updatedTasks = [];
      const errors = [];

      for (const taskUuid of taskUuids) {
        try {
          const currentTask = await this.taskService.getTaskByUuid(taskUuid);

          if (currentTask.status === status) {
            continue; // Skip if already in target status
          }

          const updatedTask = await this.taskService.updateTask(
            {
              uuid: taskUuid,
              status,
              completedDate: status === 'completed' ? new Date().toISOString() : undefined,
            },
            userId
          );

          // Log status change
          await this.logActivity(
            taskUuid,
            userId || null,
            'status_change',
            currentTask.status,
            status,
            reason || `Bulk status update to ${status}`
          );

          updatedTasks.push(updatedTask);
        } catch (error) {
          errors.push({
            taskUuid,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return {
        success: true,
        updated: updatedTasks.length,
        errors: errors.length,
        tasks: updatedTasks,
        errorDetails: errors,
        message: `Updated ${updatedTasks.length} tasks to ${status}${errors.length > 0 ? ` (${errors.length} errors)` : ''}`,
      };
    } catch (error) {
      throw new Error(`Bulk status update failed: ${error}`);
    }
  }

  /**
   * Add comment to task
   */
  async addComment(request: TaskCommentRequest, userId?: string): Promise<any> {
    const { taskUuid, comment } = request;

    if (!comment.trim()) {
      throw new Error('Comment cannot be empty');
    }

    try {
      // Verify task exists
      await this.taskService.getTaskByUuid(taskUuid);

      // Log comment
      await this.logActivity(taskUuid, userId || null, 'comment', null, null, comment.trim());

      return {
        success: true,
        message: 'Comment added successfully',
      };
    } catch (error) {
      throw new Error(`Failed to add comment: ${error}`);
    }
  }

  /**
   * Get quick task statistics for dashboard
   */
  async getQuickStats(departmentId?: string): Promise<QuickTaskStats> {
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()))
        .toISOString()
        .split('T')[0];
      const weekEnd = new Date(now.setDate(now.getDate() - now.getDay() + 6))
        .toISOString()
        .split('T')[0];

      let departmentFilter = '';
      const params: any[] = [];

      if (departmentId) {
        departmentFilter = 'AND t.department_id = ?';
        params.push(departmentId);
      }

      const statsQuery = `
        SELECT 
          SUM(CASE WHEN t.due_date < ? AND t.status NOT IN ('completed', 'cancelled') THEN 1 ELSE 0 END) as overdue,
          SUM(CASE WHEN DATE(t.due_date) = ? AND t.status NOT IN ('completed', 'cancelled') THEN 1 ELSE 0 END) as due_today,
          SUM(CASE WHEN t.due_date BETWEEN ? AND ? AND t.status NOT IN ('completed', 'cancelled') THEN 1 ELSE 0 END) as due_this_week,
          SUM(CASE WHEN t.assignee_id IS NULL AND t.status NOT IN ('completed', 'cancelled') THEN 1 ELSE 0 END) as unassigned,
          SUM(CASE WHEN t.status = 'in-progress' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN t.status = 'planning' AND t.progress = 0 THEN 1 ELSE 0 END) as blocked,
          SUM(CASE WHEN t.status = 'completed' AND DATE(t.completed_date) BETWEEN ? AND ? THEN 1 ELSE 0 END) as completed_this_week
        FROM tasks t
        WHERE 1=1 ${departmentFilter}
      `;

      const queryParams = [today, today, weekStart, weekEnd, weekStart, weekEnd, ...params];
      const result = (await this.db.query(statsQuery, queryParams)) as any[];

      if (result.length === 0) {
        return {
          overdue: 0,
          dueToday: 0,
          dueThisWeek: 0,
          unassigned: 0,
          inProgress: 0,
          blocked: 0,
          completedThisWeek: 0,
        };
      }

      const stats = result[0];
      return {
        overdue: Number(stats.overdue) || 0,
        dueToday: Number(stats.due_today) || 0,
        dueThisWeek: Number(stats.due_this_week) || 0,
        unassigned: Number(stats.unassigned) || 0,
        inProgress: Number(stats.in_progress) || 0,
        blocked: Number(stats.blocked) || 0,
        completedThisWeek: Number(stats.completed_this_week) || 0,
      };
    } catch (error) {
      console.error('Error getting quick stats:', error);
      throw new Error(`Failed to get task statistics: ${error}`);
    }
  }

  /**
   * Get task activity history
   */
  async getTaskActivity(taskUuid: string, limit: number = 50): Promise<any> {
    try {
      // Verify task exists
      await this.taskService.getTaskByUuid(taskUuid);

      const activities = await this.db`
        SELECT 
          ta.*,
          tm.name as user_name,
          tm.email as user_email
        FROM task_activities ta
        LEFT JOIN team_members tm ON ta.user_id = tm.id
        WHERE ta.task_uuid = ${taskUuid}
        ORDER BY ta.created_at DESC
        LIMIT ${limit}
      `;

      return {
        success: true,
        activities: activities.map((activity: any) => ({
          id: activity.id,
          activityType: activity.activity_type,
          oldValue: activity.old_value,
          newValue: activity.new_value,
          comment: activity.comment,
          user: activity.user_name
            ? {
                id: activity.user_id,
                name: activity.user_name,
                email: activity.user_email,
              }
            : null,
          createdAt: activity.created_at,
        })),
      };
    } catch (error) {
      throw new Error(`Failed to get task activity: ${error}`);
    }
  }

  private async logActivity(
    taskUuid: string,
    userId: string | null,
    activityType: string,
    oldValue: string | null,
    newValue: string | null,
    comment: string | null
  ): Promise<void> {
    await this.db`
      INSERT INTO task_activities (task_uuid, user_id, activity_type, old_value, new_value, comment)
      VALUES (${taskUuid}, ${userId}, ${activityType}, ${oldValue}, ${newValue}, ${comment})
    `;
  }
}

// API handlers for task actions endpoints
export async function handleTaskActionsAPI(request: Request, env: Env): Promise<Response> {
  try {
    const db = getDatabase(env);
    const sql = await db.getClient();
    const actionsService = new TaskActionsService(sql);

    const url = new URL(request.url);
    const method = request.method;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID',
      'Content-Type': 'application/json',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    const userId = request.headers.get('X-User-ID');

    // Route: POST /api/tasks/assign
    if (method === 'POST' && url.pathname === '/api/tasks/assign') {
      const requestData: TaskAssignmentRequest = await request.json();
      const result = await actionsService.assignTask(requestData, userId || undefined);
      return new Response(JSON.stringify(result), { headers: corsHeaders });
    }

    // Route: PATCH /api/tasks/{uuid}/progress
    if (method === 'PATCH' && url.pathname.match(/^\/api\/tasks\/[^\/]+\/progress$/)) {
      const taskUuid = url.pathname.split('/')[3];
      const requestData: Omit<ProgressUpdateRequest, 'taskUuid'> = await request.json();
      const result = await actionsService.updateProgress(
        { ...requestData, taskUuid },
        userId || undefined
      );
      return new Response(JSON.stringify(result), { headers: corsHeaders });
    }

    // Route: POST /api/tasks/bulk-status
    if (method === 'POST' && url.pathname === '/api/tasks/bulk-status') {
      const requestData: BulkStatusUpdateRequest = await request.json();
      const result = await actionsService.bulkUpdateStatus(requestData, userId || undefined);
      return new Response(JSON.stringify(result), { headers: corsHeaders });
    }

    // Route: POST /api/tasks/{uuid}/comment
    if (method === 'POST' && url.pathname.match(/^\/api\/tasks\/[^\/]+\/comment$/)) {
      const taskUuid = url.pathname.split('/')[3];
      const requestData: Omit<TaskCommentRequest, 'taskUuid'> = await request.json();
      const result = await actionsService.addComment(
        { ...requestData, taskUuid },
        userId || undefined
      );
      return new Response(JSON.stringify(result), { headers: corsHeaders });
    }

    // Route: GET /api/tasks/stats
    if (method === 'GET' && url.pathname === '/api/tasks/stats') {
      const departmentId = url.searchParams.get('department') || undefined;
      const result = await actionsService.getQuickStats(departmentId);
      return new Response(
        JSON.stringify({
          success: true,
          stats: result,
        }),
        { headers: corsHeaders }
      );
    }

    // Route: GET /api/tasks/{uuid}/activity
    if (method === 'GET' && url.pathname.match(/^\/api\/tasks\/[^\/]+\/activity$/)) {
      const taskUuid = url.pathname.split('/')[3];
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const result = await actionsService.getTaskActivity(taskUuid, limit);
      return new Response(JSON.stringify(result), { headers: corsHeaders });
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Not found',
      }),
      { status: 404, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Task Actions API Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
