// Fire22 Dashboard Worker - Enhanced Task API with Bun.SQL
// Full CRUD operations with advanced filtering, pagination, and real-time updates

import { SQL } from 'bun';
import { Env } from '../types/env';
import { getDatabase } from '../database/connection';
import { generateTaskUUID, getTeamMemberId, getDepartmentId } from '../utils/uuid-generator';

// Enhanced interfaces for the new API
export interface TaskBase {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'planning' | 'active' | 'in-progress' | 'review' | 'completed' | 'cancelled';
  progress: number;
  departmentId: string;
  assigneeId?: string;
  reporterId?: string;
  dueDate?: string;
  startDate?: string;
  estimatedHours?: number;
  storyPoints?: number;
  tags?: string[];
}

export interface TaskCreate extends TaskBase {}

export interface TaskUpdate extends Partial<TaskBase> {
  uuid: string;
}

export interface TaskResponse extends TaskBase {
  id: number;
  uuid: string;
  assignee?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  reporter?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  department: {
    id: string;
    name: string;
    displayName: string;
    icon: string;
  };
  tags: string[];
  actualHours?: number;
  completedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskListQuery {
  // Filtering
  department?: string;
  assignee?: string;
  status?: string;
  priority?: string;
  tags?: string[];
  search?: string;
  dueBefore?: string;
  dueAfter?: string;

  // Sorting
  sortBy?: 'title' | 'priority' | 'status' | 'progress' | 'dueDate' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';

  // Pagination
  page?: number;
  limit?: number;
}

export interface TaskListResponse {
  success: boolean;
  tasks: TaskResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: TaskListQuery;
  aggregates: {
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    avgProgress: number;
    totalEstimatedHours: number;
    totalActualHours: number;
  };
  lastUpdated: string;
}

export class TaskService {
  private db: SQL;

  constructor(db: SQL) {
    this.db = db;
  }

  /**
   * Create a new task
   */
  async createTask(taskData: TaskCreate, userId?: string): Promise<TaskResponse> {
    const taskUuid = generateTaskUUID();

    try {
      // Insert the task
      await this.db`
        INSERT INTO tasks (
          uuid, title, description, priority, status, progress,
          department_id, assignee_id, reporter_id, due_date, start_date,
          estimated_hours, story_points
        ) VALUES (
          ${taskUuid}, ${taskData.title}, ${taskData.description || null}, 
          ${taskData.priority}, ${taskData.status}, ${taskData.progress},
          ${taskData.departmentId}, ${taskData.assigneeId || null}, 
          ${taskData.reporterId || userId || null}, ${taskData.dueDate || null}, 
          ${taskData.startDate || null}, ${taskData.estimatedHours || null}, 
          ${taskData.storyPoints || null}
        )
      `;

      // Insert tags if provided
      if (taskData.tags && taskData.tags.length > 0) {
        for (const tag of taskData.tags) {
          await this.db`
            INSERT INTO task_tags (task_uuid, tag) 
            VALUES (${taskUuid}, ${tag})
          `;
        }
      }

      // Log activity
      await this.logActivity(taskUuid, userId || null, 'comment', null, null, 'Task created');

      return await this.getTaskByUuid(taskUuid);
    } catch (error) {
      console.error('Error creating task:', error);
      throw new Error(`Failed to create task: ${error}`);
    }
  }

  /**
   * Get task by UUID with full details
   */
  async getTaskByUuid(uuid: string): Promise<TaskResponse> {
    const result = await this.db`
      SELECT 
        t.*,
        d.name as dept_name, d.display_name as dept_display_name, d.icon as dept_icon,
        a.name as assignee_name, a.email as assignee_email, a.role as assignee_role,
        r.name as reporter_name, r.email as reporter_email, r.role as reporter_role
      FROM tasks t
      LEFT JOIN departments d ON t.department_id = d.id
      LEFT JOIN team_members a ON t.assignee_id = a.id
      LEFT JOIN team_members r ON t.reporter_id = r.id
      WHERE t.uuid = ${uuid}
    `;

    if (result.length === 0) {
      throw new Error('Task not found');
    }

    const task = result[0] as any;

    // Get tags
    const tags = await this.db`
      SELECT tag FROM task_tags WHERE task_uuid = ${uuid} ORDER BY tag
    `;

    return this.formatTaskResponse(
      task,
      tags.map((t: any) => t.tag)
    );
  }

  /**
   * Update task
   */
  async updateTask(taskData: TaskUpdate, userId?: string): Promise<TaskResponse> {
    const { uuid, ...updateData } = taskData;

    // Get current task for change tracking
    const currentTask = await this.getTaskByUuid(uuid);

    try {
      // Update fields individually using tagged template literals
      const updates: Array<{ field: string; value: any }> = [];

      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined && key !== 'tags') {
          const dbField = this.camelToSnake(key);
          updates.push({ field: dbField, value });
        }
      });

      // Build and execute update query
      if (updates.length > 0) {
        // Create a dynamic update query using a more Bun-SQL friendly approach
        const updateFields: Record<string, any> = {};
        updates.forEach(update => {
          updateFields[update.field] = update.value;
        });

        // Generate SET clause dynamically
        const setClause = Object.keys(updateFields)
          .map((field, index) => `${field} = $${index + 2}`)
          .join(', ');

        const values = [uuid, ...Object.values(updateFields)];

        // Use raw query for dynamic field updates
        await this.db.query(
          `UPDATE tasks SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE uuid = $1`,
          values
        );
      }

      // Update tags if provided
      if (taskData.tags !== undefined) {
        await this.db`DELETE FROM task_tags WHERE task_uuid = ${uuid}`;

        if (taskData.tags.length > 0) {
          for (const tag of taskData.tags) {
            await this.db`
              INSERT INTO task_tags (task_uuid, tag) 
              VALUES (${uuid}, ${tag})
            `;
          }
        }
      }

      // Log changes
      await this.logTaskChanges(uuid, currentTask, updateData, userId);

      return await this.getTaskByUuid(uuid);
    } catch (error) {
      console.error('Error updating task:', error);
      throw new Error(`Failed to update task: ${error}`);
    }
  }

  /**
   * Delete task
   */
  async deleteTask(uuid: string, userId?: string): Promise<boolean> {
    try {
      // Log deletion
      await this.logActivity(uuid, userId || null, 'comment', null, null, 'Task deleted');

      // Delete task (cascading will handle related records)
      const result = await this.db`DELETE FROM tasks WHERE uuid = ${uuid}`;

      return true;
    } catch (error) {
      console.error('Error deleting task:', error);
      throw new Error(`Failed to delete task: ${error}`);
    }
  }

  /**
   * Get tasks with advanced filtering and pagination
   */
  async getTasks(query: TaskListQuery = {}): Promise<TaskListResponse> {
    const {
      department,
      assignee,
      status,
      priority,
      tags,
      search,
      dueBefore,
      dueAfter,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = query;

    // Build WHERE conditions
    const conditions: string[] = ['1 = 1'];
    const params: any[] = [];

    if (department) {
      conditions.push('d.name = ?');
      params.push(department);
    }

    if (assignee) {
      conditions.push('t.assignee_id = ?');
      params.push(assignee);
    }

    if (status) {
      conditions.push('t.status = ?');
      params.push(status);
    }

    if (priority) {
      conditions.push('t.priority = ?');
      params.push(priority);
    }

    if (search) {
      conditions.push('(t.title LIKE ? OR t.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (dueBefore) {
      conditions.push('t.due_date < ?');
      params.push(dueBefore);
    }

    if (dueAfter) {
      conditions.push('t.due_date > ?');
      params.push(dueAfter);
    }

    // Tag filtering (requires subquery)
    if (tags && tags.length > 0) {
      conditions.push(`
        t.uuid IN (
          SELECT task_uuid FROM task_tags 
          WHERE tag IN (${tags.map(() => '?').join(',')})
          GROUP BY task_uuid
          HAVING COUNT(DISTINCT tag) = ?
        )
      `);
      params.push(...tags, tags.length);
    }

    // Build ORDER BY
    const validSortFields = {
      title: 't.title',
      priority: 't.priority',
      status: 't.status',
      progress: 't.progress',
      dueDate: 't.due_date',
      createdAt: 't.created_at',
      updatedAt: 't.updated_at',
    };

    const orderBy = validSortFields[sortBy as keyof typeof validSortFields] || 't.created_at';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT t.id) as total
      FROM tasks t
      LEFT JOIN departments d ON t.department_id = d.id
      LEFT JOIN team_members a ON t.assignee_id = a.id
      WHERE ${conditions.join(' AND ')}
    `;

    const countResult = (await this.db.query(countQuery, params)) as any[];
    const total = countResult[0]?.total || 0;

    // Get paginated results
    const offset = (page - 1) * limit;
    const tasksQuery = `
      SELECT 
        t.*,
        d.name as dept_name, d.display_name as dept_display_name, d.icon as dept_icon,
        a.name as assignee_name, a.email as assignee_email, a.role as assignee_role,
        r.name as reporter_name, r.email as reporter_email, r.role as reporter_role
      FROM tasks t
      LEFT JOIN departments d ON t.department_id = d.id
      LEFT JOIN team_members a ON t.assignee_id = a.id
      LEFT JOIN team_members r ON t.reporter_id = r.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${orderBy} ${order}
      LIMIT ? OFFSET ?
    `;

    const tasksResult = (await this.db.query(tasksQuery, [...params, limit, offset])) as any[];

    // Get tags for all tasks
    const taskUuids = tasksResult.map((t: any) => t.uuid);
    const tagsResult =
      taskUuids.length > 0
        ? await this.db.query(
            `SELECT task_uuid, tag 
           FROM task_tags 
           WHERE task_uuid IN (${taskUuids.map((_, i) => `$${i + 1}`).join(', ')})
           ORDER BY tag`,
            taskUuids
          )
        : [];

    const tagsByTask = tagsResult.reduce((acc: any, tag: any) => {
      if (!acc[tag.task_uuid]) acc[tag.task_uuid] = [];
      acc[tag.task_uuid].push(tag.tag);
      return acc;
    }, {});

    // Format tasks
    const tasks = tasksResult.map((task: any) =>
      this.formatTaskResponse(task, tagsByTask[task.uuid] || [])
    );

    // Calculate aggregates
    const aggregates = await this.calculateAggregates(conditions, params);

    // Pagination info
    const totalPages = Math.ceil(total / limit);
    const pagination = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    return {
      success: true,
      tasks,
      pagination,
      filters: query,
      aggregates,
      lastUpdated: new Date().toISOString(),
    };
  }

  private async calculateAggregates(conditions: string[], params: any[]): Promise<any> {
    const aggregateQuery = `
      SELECT 
        status,
        priority,
        AVG(progress) as avg_progress,
        SUM(estimated_hours) as total_estimated_hours,
        SUM(actual_hours) as total_actual_hours,
        COUNT(*) as count
      FROM tasks t
      LEFT JOIN departments d ON t.department_id = d.id
      WHERE ${conditions.join(' AND ')}
      GROUP BY status, priority
    `;

    const result = (await this.db.query(aggregateQuery, params)) as any[];

    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    let totalTasks = 0;
    let totalProgress = 0;
    let totalEstimatedHours = 0;
    let totalActualHours = 0;

    result.forEach((row: any) => {
      byStatus[row.status] = (byStatus[row.status] || 0) + row.count;
      byPriority[row.priority] = (byPriority[row.priority] || 0) + row.count;
      totalTasks += row.count;
      totalProgress += (row.avg_progress || 0) * row.count;
      totalEstimatedHours += row.total_estimated_hours || 0;
      totalActualHours += row.total_actual_hours || 0;
    });

    return {
      byStatus,
      byPriority,
      avgProgress: totalTasks > 0 ? Math.round(totalProgress / totalTasks) : 0,
      totalEstimatedHours,
      totalActualHours,
    };
  }

  private formatTaskResponse(task: any, tags: string[]): TaskResponse {
    return {
      id: task.id,
      uuid: task.uuid,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      progress: task.progress,
      departmentId: task.department_id,
      assigneeId: task.assignee_id,
      reporterId: task.reporter_id,
      dueDate: task.due_date,
      startDate: task.start_date,
      estimatedHours: task.estimated_hours,
      storyPoints: task.story_points,
      actualHours: task.actual_hours,
      completedDate: task.completed_date,
      tags,
      assignee: task.assignee_name
        ? {
            id: task.assignee_id,
            name: task.assignee_name,
            email: task.assignee_email,
            role: task.assignee_role,
          }
        : undefined,
      reporter: task.reporter_name
        ? {
            id: task.reporter_id,
            name: task.reporter_name,
            email: task.reporter_email,
            role: task.reporter_role,
          }
        : undefined,
      department: {
        id: task.department_id,
        name: task.dept_name,
        displayName: task.dept_display_name,
        icon: task.dept_icon,
      },
      createdAt: task.created_at,
      updatedAt: task.updated_at,
    };
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

  private async logTaskChanges(
    uuid: string,
    currentTask: TaskResponse,
    updates: Partial<TaskBase>,
    userId?: string
  ): Promise<void> {
    const changes: Array<{ type: string; field: string; oldValue: any; newValue: any }> = [];

    // Check for field changes
    Object.entries(updates).forEach(([key, newValue]) => {
      if (key === 'tags') return; // Handle tags separately

      const oldValue = (currentTask as any)[key];
      if (oldValue !== newValue) {
        changes.push({
          type: this.getActivityType(key),
          field: key,
          oldValue,
          newValue,
        });
      }
    });

    // Log each change
    for (const change of changes) {
      await this.logActivity(
        uuid,
        userId || null,
        change.type,
        String(change.oldValue || ''),
        String(change.newValue || ''),
        `${change.field} changed from "${change.oldValue}" to "${change.newValue}"`
      );
    }
  }

  private getActivityType(field: string): string {
    const mapping: Record<string, string> = {
      status: 'status_change',
      assigneeId: 'assignment',
      progress: 'progress_update',
      dueDate: 'due_date_change',
      priority: 'priority_change',
    };

    return mapping[field] || 'comment';
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}

// API handlers for HTTP endpoints
export async function handleTasksAPI(request: Request, env: Env): Promise<Response> {
  try {
    const db = getDatabase(env);
    const sql = await db.getClient();
    const taskService = new TaskService(sql);

    const url = new URL(request.url);
    const method = request.method;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID',
      'Content-Type': 'application/json',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    // Extract user ID from headers for activity logging
    const userId = request.headers.get('X-User-ID');

    // Route handlers
    if (method === 'GET' && url.pathname === '/api/tasks') {
      // List tasks with filtering/pagination
      const query: TaskListQuery = {};

      // Parse query parameters
      url.searchParams.forEach((value, key) => {
        if (key === 'tags') {
          query.tags = value.split(',');
        } else if (key === 'page' || key === 'limit') {
          (query as any)[key] = parseInt(value);
        } else {
          (query as any)[key] = value;
        }
      });

      const result = await taskService.getTasks(query);
      return new Response(JSON.stringify(result), { headers: corsHeaders });
    }

    if (method === 'POST' && url.pathname === '/api/tasks') {
      // Create new task
      const taskData: TaskCreate = await request.json();
      const result = await taskService.createTask(taskData, userId || undefined);

      return new Response(
        JSON.stringify({
          success: true,
          task: result,
        }),
        { status: 201, headers: corsHeaders }
      );
    }

    if (method === 'GET' && url.pathname.startsWith('/api/tasks/')) {
      // Get specific task
      const uuid = url.pathname.split('/').pop();
      if (!uuid) throw new Error('Task UUID required');

      const result = await taskService.getTaskByUuid(uuid);
      return new Response(
        JSON.stringify({
          success: true,
          task: result,
        }),
        { headers: corsHeaders }
      );
    }

    if (method === 'PUT' && url.pathname.startsWith('/api/tasks/')) {
      // Update task
      const uuid = url.pathname.split('/').pop();
      if (!uuid) throw new Error('Task UUID required');

      const updates = await request.json();
      const result = await taskService.updateTask({ ...updates, uuid }, userId || undefined);

      return new Response(
        JSON.stringify({
          success: true,
          task: result,
        }),
        { headers: corsHeaders }
      );
    }

    if (method === 'DELETE' && url.pathname.startsWith('/api/tasks/')) {
      // Delete task
      const uuid = url.pathname.split('/').pop();
      if (!uuid) throw new Error('Task UUID required');

      await taskService.deleteTask(uuid, userId || undefined);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Task deleted successfully',
        }),
        { headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Not found',
      }),
      { status: 404, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Task API Error:', error);

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
