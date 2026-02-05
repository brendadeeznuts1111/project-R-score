// Fire22 Dashboard Worker - Real-time Task Updates with Server-Sent Events
// Live task updates for collaborative task management

import { SQL } from 'bun';
import { Env } from '../types/env';
import { getDatabase } from '../database/connection';
import { TaskResponse } from './tasks-enhanced';

/**
 * @fileoverview Real-time task event system using Server-Sent Events
 * @version 1.0.0
 * @author Fire22 Dashboard Team
 * @since 2024-08-28
 */

export interface TaskEvent {
  type:
    | 'task_created'
    | 'task_updated'
    | 'task_deleted'
    | 'task_assigned'
    | 'task_progress'
    | 'task_comment';
  taskUuid: string;
  task?: TaskResponse;
  changes?: Record<string, { from: any; to: any }>;
  comment?: string;
  user?: {
    id: string;
    name: string;
  };
  timestamp: string;
  departmentId: string;
}

export interface TaskEventFilter {
  departments?: string[];
  assignees?: string[];
  eventTypes?: string[];
}

export class TaskEventService {
  private db: SQL;
  private activeConnections = new Map<
    string,
    {
      controller: ReadableStreamDefaultController;
      filters: TaskEventFilter;
      lastHeartbeat: Date;
    }
  >();

  constructor(db: SQL) {
    this.db = db;
    this.setupHeartbeatCleanup();
  }

  /**
   * Create SSE stream for task events
   */
  createEventStream(filters: TaskEventFilter = {}): ReadableStream {
    const connectionId = `task-events-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return new ReadableStream({
      start: controller => {
        console.log(`📡 New task event stream connection: ${connectionId}`);

        // Store connection
        this.activeConnections.set(connectionId, {
          controller,
          filters,
          lastHeartbeat: new Date(),
        });

        // Send initial connection message
        controller.enqueue(
          this.formatSSEMessage({
            type: 'connection',
            data: {
              connectionId,
              filters,
              timestamp: new Date().toISOString(),
            },
          })
        );

        // Send initial task stats
        this.sendInitialStats(controller, filters);
      },

      cancel: () => {
        console.log(`🔌 Task event stream disconnected: ${connectionId}`);
        this.activeConnections.delete(connectionId);
      },
    });
  }

  /**
   * Broadcast task event to all connected clients
   */
  async broadcastTaskEvent(event: TaskEvent): Promise<void> {
    const message = this.formatSSEMessage({
      type: 'task_event',
      data: event,
    });

    const disconnectedConnections: string[] = [];

    for (const [connectionId, connection] of this.activeConnections) {
      try {
        // Check if client is interested in this event
        if (this.shouldSendEvent(event, connection.filters)) {
          connection.controller.enqueue(message);
          connection.lastHeartbeat = new Date();
        }
      } catch (error) {
        console.error(`Error sending event to connection ${connectionId}:`, error);
        disconnectedConnections.push(connectionId);
      }
    }

    // Clean up disconnected connections
    disconnectedConnections.forEach(id => {
      this.activeConnections.delete(id);
    });

    console.log(
      `📤 Broadcasted ${event.type} event to ${this.activeConnections.size} active connections`
    );
  }

  /**
   * Send heartbeat to all connections
   */
  sendHeartbeat(): void {
    const heartbeatMessage = this.formatSSEMessage({
      type: 'heartbeat',
      data: {
        timestamp: new Date().toISOString(),
        activeConnections: this.activeConnections.size,
      },
    });

    const disconnectedConnections: string[] = [];

    for (const [connectionId, connection] of this.activeConnections) {
      try {
        connection.controller.enqueue(heartbeatMessage);
        connection.lastHeartbeat = new Date();
      } catch (error) {
        console.error(`Heartbeat failed for connection ${connectionId}:`, error);
        disconnectedConnections.push(connectionId);
      }
    }

    // Clean up disconnected connections
    disconnectedConnections.forEach(id => {
      this.activeConnections.delete(id);
    });
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): any {
    return {
      activeConnections: this.activeConnections.size,
      connections: Array.from(this.activeConnections.entries()).map(([id, conn]) => ({
        id,
        filters: conn.filters,
        lastHeartbeat: conn.lastHeartbeat,
        age: Date.now() - conn.lastHeartbeat.getTime(),
      })),
    };
  }

  private async sendInitialStats(
    controller: ReadableStreamDefaultController,
    filters: TaskEventFilter
  ): Promise<void> {
    try {
      // Get quick task stats
      let departmentFilter = '';
      const params: any[] = [];

      if (filters.departments && filters.departments.length > 0) {
        departmentFilter = `AND t.department_id IN (${filters.departments.map(() => '?').join(',')})`;
        params.push(...filters.departments);
      }

      const statsQuery = `
        SELECT 
          t.status,
          t.priority,
          d.name as department_name,
          COUNT(*) as count
        FROM tasks t
        LEFT JOIN departments d ON t.department_id = d.id
        WHERE t.status NOT IN ('completed', 'cancelled') ${departmentFilter}
        GROUP BY t.status, t.priority, d.name
        ORDER BY count DESC
      `;

      const stats = (await this.db.query(statsQuery, params)) as any[];

      controller.enqueue(
        this.formatSSEMessage({
          type: 'initial_stats',
          data: {
            timestamp: new Date().toISOString(),
            stats: stats.map(row => ({
              department: row.department_name,
              status: row.status,
              priority: row.priority,
              count: row.count,
            })),
          },
        })
      );
    } catch (error) {
      console.error('Error sending initial stats:', error);
    }
  }

  private shouldSendEvent(event: TaskEvent, filters: TaskEventFilter): boolean {
    // Check department filter
    if (filters.departments && filters.departments.length > 0) {
      if (!filters.departments.includes(event.departmentId)) {
        return false;
      }
    }

    // Check assignee filter
    if (filters.assignees && filters.assignees.length > 0) {
      if (!event.task?.assigneeId || !filters.assignees.includes(event.task.assigneeId)) {
        return false;
      }
    }

    // Check event type filter
    if (filters.eventTypes && filters.eventTypes.length > 0) {
      if (!filters.eventTypes.includes(event.type)) {
        return false;
      }
    }

    return true;
  }

  private formatSSEMessage(data: any): string {
    return `data: ${JSON.stringify(data)}\n\n`;
  }

  private setupHeartbeatCleanup(): void {
    // Send heartbeat every 30 seconds
    setInterval(() => {
      this.sendHeartbeat();
    }, 30000);

    // Clean up stale connections every 5 minutes
    setInterval(() => {
      const staleTimeout = 5 * 60 * 1000; // 5 minutes
      const now = new Date();
      const staleConnections: string[] = [];

      for (const [connectionId, connection] of this.activeConnections) {
        if (now.getTime() - connection.lastHeartbeat.getTime() > staleTimeout) {
          staleConnections.push(connectionId);
        }
      }

      staleConnections.forEach(id => {
        console.log(`🧹 Cleaning up stale connection: ${id}`);
        this.activeConnections.delete(id);
      });

      if (staleConnections.length > 0) {
        console.log(
          `🧹 Cleaned up ${staleConnections.length} stale connections, ${this.activeConnections.size} remain active`
        );
      }
    }, 300000);
  }
}

// Global event service instance
let taskEventService: TaskEventService | null = null;

export function getTaskEventService(db: Database): TaskEventService {
  if (!taskEventService) {
    taskEventService = new TaskEventService(db);
  }
  return taskEventService;
}

// Helper function to trigger events from other services
export async function emitTaskEvent(
  db: SQL,
  event: Omit<TaskEvent, 'timestamp'>,
  env: Env
): Promise<void> {
  const eventService = getTaskEventService(db);

  await eventService.broadcastTaskEvent({
    ...event,
    timestamp: new Date().toISOString(),
  });
}

// HTTP handler for SSE endpoint
export async function handleTaskEventsSSE(request: Request, env: Env): Promise<Response> {
  try {
    const db = getDatabase(env);
    const sql = await db.getClient();
    const eventService = getTaskEventService(sql);

    const url = new URL(request.url);

    // Parse filters from query parameters
    const filters: TaskEventFilter = {};

    if (url.searchParams.has('departments')) {
      filters.departments = url.searchParams.get('departments')!.split(',');
    }

    if (url.searchParams.has('assignees')) {
      filters.assignees = url.searchParams.get('assignees')!.split(',');
    }

    if (url.searchParams.has('events')) {
      filters.eventTypes = url.searchParams.get('events')!.split(',');
    }

    // Create SSE stream
    const stream = eventService.createEventStream(filters);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
        'Access-Control-Expose-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Task Events SSE Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}

// HTTP handler for connection stats
export async function handleTaskEventsStats(request: Request, env: Env): Promise<Response> {
  try {
    const db = getDatabase(env);
    const sql = await db.getClient();
    const eventService = getTaskEventService(sql);

    const stats = eventService.getConnectionStats();

    return new Response(
      JSON.stringify({
        success: true,
        ...stats,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Task Events Stats Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}
