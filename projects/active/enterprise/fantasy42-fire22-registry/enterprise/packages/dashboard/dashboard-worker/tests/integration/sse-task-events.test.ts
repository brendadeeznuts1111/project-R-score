/**
 * Fire22 Dashboard Task Events SSE Integration Test
 * Tests real-time task updates across all departments
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { TaskService } from '../../src/api/tasks-enhanced';
import { TaskEventService } from '../../src/api/task-events';
import { DesignTeamIntegrationService } from '../../src/api/design-team-integration';
import { getDatabase } from '../../src/database/connection';
import { Database } from 'bun:sqlite';

// Test environment
const TEST_ENV = {
  DATABASE_URL: 'sqlite://test-sse.db',
  JWT_SECRET: 'test-secret-sse',
  ENVIRONMENT: 'test',
};

describe('Fire22 Task Events SSE Integration', () => {
  let db: Database;
  let taskService: TaskService;
  let eventService: TaskEventService;
  let designService: DesignTeamIntegrationService;

  beforeAll(async () => {
    // Initialize test database and services
    db = await getDatabase(TEST_ENV);
    taskService = new TaskService(db);
    eventService = new TaskEventService(db);
    designService = new DesignTeamIntegrationService(db);

    // Setup test tables
    await setupTestDatabase(db);
    await designService.initializeDesignIntegration();
  });

  afterAll(async () => {
    await cleanupTestDatabase(db);
  });

  describe('SSE Stream Creation', () => {
    test('should create SSE stream for departments', async () => {
      const stream = eventService.createEventStream({
        departments: ['technology', 'design'],
        eventTypes: ['task_created', 'task_updated'],
      });

      expect(stream).toBeInstanceOf(ReadableStream);

      const reader = stream.getReader();
      expect(reader).toBeDefined();

      await reader.cancel();
    });

    test('should handle multiple concurrent connections', async () => {
      const streams = [];

      for (let i = 0; i < 3; i++) {
        const stream = eventService.createEventStream({
          departments: ['technology'],
          eventTypes: ['task_created'],
        });
        streams.push(stream);
      }

      expect(streams).toHaveLength(3);

      for (const stream of streams) {
        const reader = stream.getReader();
        await reader.cancel();
      }
    });
  });

  describe('Real-time Task Events', () => {
    test('should emit task_created events', async () => {
      const events: any[] = [];

      const stream = eventService.createEventStream({
        departments: ['technology'],
        eventTypes: ['task_created'],
      });

      const reader = stream.getReader();

      // Create task and read event with timeout
      const taskPromise = taskService.createTask({
        title: 'SSE Test Task',
        priority: 'medium',
        status: 'planning',
        progress: 0,
        departmentId: 'technology',
        tags: ['sse-test'],
      });

      const eventPromise = readEventsWithTimeout(reader, 1000, event => {
        if (event.type === 'task_created') {
          events.push(event);
          return true;
        }
        return false;
      });

      const [taskResult] = await Promise.all([taskPromise, eventPromise]);

      expect(taskResult.success).toBe(true);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('task_created');
      expect(events[0].departmentId).toBe('technology');

      await reader.cancel();
    });

    test('should emit task_updated events', async () => {
      const events: any[] = [];

      // Create initial task
      const createResult = await taskService.createTask({
        title: 'SSE Update Test',
        priority: 'high',
        status: 'planning',
        progress: 0,
        departmentId: 'design',
      });

      expect(createResult.success).toBe(true);
      const taskUuid = createResult.data!.uuid;

      // Setup event listener
      const stream = eventService.createEventStream({
        departments: ['design'],
        eventTypes: ['task_updated'],
      });

      const reader = stream.getReader();

      // Update task and read event
      const updatePromise = taskService.updateTask({
        uuid: taskUuid,
        status: 'in-progress',
        progress: 50,
      });

      const eventPromise = readEventsWithTimeout(reader, 1000, event => {
        if (event.type === 'task_updated') {
          events.push(event);
          return true;
        }
        return false;
      });

      const [updateResult] = await Promise.all([updatePromise, eventPromise]);

      expect(updateResult.success).toBe(true);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('task_updated');
      expect(events[0].departmentId).toBe('design');

      await reader.cancel();
    });
  });

  describe('Department Filtering', () => {
    test('should filter events by department', async () => {
      const techEvents: any[] = [];
      const designEvents: any[] = [];

      const techStream = eventService.createEventStream({
        departments: ['technology'],
        eventTypes: ['task_created'],
      });

      const designStream = eventService.createEventStream({
        departments: ['design'],
        eventTypes: ['task_created'],
      });

      const techReader = techStream.getReader();
      const designReader = designStream.getReader();

      // Create tasks in both departments
      const techTaskPromise = taskService.createTask({
        title: 'Tech Task',
        priority: 'medium',
        status: 'planning',
        progress: 0,
        departmentId: 'technology',
      });

      const designTaskPromise = taskService.createTask({
        title: 'Design Task',
        priority: 'medium',
        status: 'planning',
        progress: 0,
        departmentId: 'design',
      });

      // Read events from both streams
      const techEventPromise = readEventsWithTimeout(techReader, 1000, event => {
        if (event.type === 'task_created') {
          techEvents.push(event);
          return true;
        }
        return false;
      });

      const designEventPromise = readEventsWithTimeout(designReader, 1000, event => {
        if (event.type === 'task_created') {
          designEvents.push(event);
          return true;
        }
        return false;
      });

      await Promise.all([techTaskPromise, designTaskPromise, techEventPromise, designEventPromise]);

      // Verify proper filtering
      expect(techEvents).toHaveLength(1);
      expect(techEvents[0].departmentId).toBe('technology');

      expect(designEvents).toHaveLength(1);
      expect(designEvents[0].departmentId).toBe('design');

      await techReader.cancel();
      await designReader.cancel();
    });
  });

  describe('Event Data Integrity', () => {
    test('should include complete task data', async () => {
      const events: any[] = [];

      const stream = eventService.createEventStream({
        departments: ['technology'],
        eventTypes: ['task_created'],
      });

      const reader = stream.getReader();

      const taskData = {
        title: 'Complete Data Test',
        description: 'Testing complete event data',
        priority: 'high' as const,
        status: 'planning' as const,
        progress: 0,
        departmentId: 'technology',
        estimatedHours: 16,
        tags: ['test', 'sse'],
      };

      const taskPromise = taskService.createTask(taskData);

      const eventPromise = readEventsWithTimeout(reader, 1000, event => {
        if (event.type === 'task_created') {
          events.push(event);
          return true;
        }
        return false;
      });

      await Promise.all([taskPromise, eventPromise]);

      expect(events).toHaveLength(1);
      const event = events[0];

      expect(event.type).toBe('task_created');
      expect(event.taskUuid).toBeDefined();
      expect(event.timestamp).toBeDefined();
      expect(event.departmentId).toBe('technology');
      expect(event.task.title).toBe(taskData.title);
      expect(event.task.description).toBe(taskData.description);

      await reader.cancel();
    });
  });
});

// Helper functions
async function setupTestDatabase(db: Database) {
  await db`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT NOT NULL,
      status TEXT NOT NULL,
      progress INTEGER DEFAULT 0,
      department_id TEXT NOT NULL,
      assignee_id TEXT,
      reporter_id TEXT,
      due_date TEXT,
      start_date TEXT,
      estimated_hours INTEGER,
      story_points INTEGER,
      tags TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS task_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_uuid TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'comment',
      user_id TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_uuid) REFERENCES tasks(uuid)
    )
  `;
}

async function cleanupTestDatabase(db: Database) {
  await db`DROP TABLE IF EXISTS design_system_updates`;
  await db`DROP TABLE IF EXISTS design_review_metadata`;
  await db`DROP TABLE IF EXISTS design_assets`;
  await db`DROP TABLE IF EXISTS task_comments`;
  await db`DROP TABLE IF EXISTS tasks`;
}

async function readEventsWithTimeout(
  reader: ReadableStreamDefaultReader,
  timeoutMs: number,
  eventHandler: (event: any) => boolean
): Promise<void> {
  return new Promise(resolve => {
    const timeout = setTimeout(() => {
      resolve();
    }, timeoutMs);

    const readLoop = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            clearTimeout(timeout);
            resolve();
            break;
          }

          const eventData = new TextDecoder().decode(value);

          if (eventData.startsWith('data: ')) {
            try {
              const event = JSON.parse(eventData.slice(6));
              const shouldStop = eventHandler(event);

              if (shouldStop) {
                clearTimeout(timeout);
                resolve();
                break;
              }
            } catch (parseError) {
              // Ignore parse errors for heartbeat events
            }
          }
        }
      } catch (error) {
        clearTimeout(timeout);
        resolve();
      }
    };

    readLoop();
  });
}
