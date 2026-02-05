/**
 * Fire22 Dashboard Task Events SSE Integration Test
 * Tests real-time task updates across all departments
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { TaskEnhancedService } from '../../src/api/tasks-enhanced';
import { TaskEventService } from '../../src/api/task-events';
import { DesignTeamIntegrationService } from '../../src/api/design-team-integration';
import { getDatabase } from '../../src/database/connection';
import { SQL } from 'bun';

// Test environment
const TEST_ENV = {
  DATABASE_URL: 'sqlite://test-sse.db',
  JWT_SECRET: 'test-secret-sse',
  ENVIRONMENT: 'test',
};

describe('Fire22 Task Events SSE Integration', () => {
  let db: SQL;
  let taskService: TaskEnhancedService;
  let eventService: TaskEventService;
  let designService: DesignTeamIntegrationService;

  beforeAll(async () => {
    // Initialize test database and services
    db = await getDatabase(TEST_ENV);
    taskService = new TaskEnhancedService(db);
    eventService = new TaskEventService(db);
    designService = new DesignTeamIntegrationService(db);

    // Setup test tables
    await setupTestDatabase(db);
    await designService.initializeDesignIntegration();
  });

  afterAll(async () => {
    await cleanupTestDatabase(db);
  });

  describe('SSE Stream Creation and Management', () => {
    test('should create SSE stream for all departments', async () => {
      const stream = eventService.createEventStream({
        departments: ['technology', 'design', 'finance', 'marketing'],
        eventTypes: ['task_created', 'task_updated', 'task_assigned'],
      });

      expect(stream).toBeInstanceOf(ReadableStream);

      // Test stream can be read
      const reader = stream.getReader();
      expect(reader).toBeDefined();

      // Clean up
      await reader.cancel();
    });

    test('should handle multiple concurrent SSE connections', async () => {
      const streams = [];

      // Create 3 concurrent streams
      for (let i = 0; i < 3; i++) {
        const stream = eventService.createEventStream({
          departments: ['technology'],
          eventTypes: ['task_created'],
        });
        streams.push(stream);
      }

      expect(streams).toHaveLength(3);

      // Clean up all streams
      for (const stream of streams) {
        const reader = stream.getReader();
        await reader.cancel();
      }
    });
  });

  describe('Real-time Task Events Across Departments', () => {
    test('should emit task_created events for technology department', async () => {
      const events: any[] = [];

      // Setup event listener
      const stream = eventService.createEventStream({
        departments: ['technology'],
        eventTypes: ['task_created'],
      });

      const reader = stream.getReader();

      // Create a task to trigger event
      const taskPromise = taskService.createTask({
        title: 'SSE Test Task - Technology',
        priority: 'medium',
        status: 'planning',
        progress: 0,
        departmentId: 'technology',
        assigneeId: 'john-doe',
        tags: ['sse-test', 'technology'],
      });

      // Read events with timeout
      const eventPromise = readEventsWithTimeout(reader, 2000, event => {
        if (event.type === 'task_created') {
          events.push(event);
          return true; // Stop reading after first event
        }
        return false;
      });

      const [taskResult] = await Promise.all([taskPromise, eventPromise]);

      expect(taskResult.success).toBe(true);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('task_created');
      expect(events[0].departmentId).toBe('technology');
      expect(events[0].task.title).toBe('SSE Test Task - Technology');

      await reader.cancel();
    });

    test('should emit task_updated events for design department', async () => {
      const events: any[] = [];

      // Create initial task
      const createResult = await taskService.createTask({
        title: 'SSE Update Test - Design',
        priority: 'high',
        status: 'planning',
        progress: 0,
        departmentId: 'design',
        assigneeId: 'isabella-martinez',
      });

      expect(createResult.success).toBe(true);
      const taskUuid = createResult.data!.uuid;

      // Setup event listener for updates
      const stream = eventService.createEventStream({
        departments: ['design'],
        eventTypes: ['task_updated'],
      });

      const reader = stream.getReader();

      // Update the task to trigger event
      const updatePromise = taskService.updateTask({
        uuid: taskUuid,
        status: 'in-progress',
        progress: 50,
      });

      // Read events
      const eventPromise = readEventsWithTimeout(reader, 2000, event => {
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
      expect(events[0].changes.status).toEqual({
        from: 'planning',
        to: 'in-progress',
      });

      await reader.cancel();
    });

    test('should emit design review events', async () => {
      const events: any[] = [];

      // Create original task
      const originalTask = await taskService.createTask({
        title: 'Feature requiring design review',
        priority: 'high',
        status: 'planning',
        progress: 0,
        departmentId: 'technology',
        assigneeId: 'john-doe',
      });

      expect(originalTask.success).toBe(true);

      // Setup event listener
      const stream = eventService.createEventStream({
        departments: ['design'],
        eventTypes: ['task_created'],
      });

      const reader = stream.getReader();

      // Request design review (creates new task)
      const reviewPromise = designService.requestDesignReview({
        taskUuid: originalTask.data!.uuid,
        reviewType: 'ui_design',
        priority: 'high',
        description: 'Need UI review for new feature',
        requesterId: 'john-doe',
        specificReviewer: 'isabella-martinez',
      });

      // Read events
      const eventPromise = readEventsWithTimeout(reader, 2000, event => {
        if (event.type === 'task_created' && event.task.title.includes('Design Review')) {
          events.push(event);
          return true;
        }
        return false;
      });

      const [reviewResult] = await Promise.all([reviewPromise, eventPromise]);

      expect(reviewResult.success).toBe(true);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('task_created');
      expect(events[0].departmentId).toBe('design');
      expect(events[0].task.title).toContain('Design Review');

      await reader.cancel();
    });
  });

  describe('Cross-Department Event Filtering', () => {
    test('should filter events by department', async () => {
      const techEvents: any[] = [];
      const designEvents: any[] = [];

      // Setup separate streams for different departments
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
        title: 'Tech Department Task',
        priority: 'medium',
        status: 'planning',
        progress: 0,
        departmentId: 'technology',
      });

      const designTaskPromise = taskService.createTask({
        title: 'Design Department Task',
        priority: 'medium',
        status: 'planning',
        progress: 0,
        departmentId: 'design',
      });

      // Read events from both streams
      const techEventPromise = readEventsWithTimeout(techReader, 2000, event => {
        if (event.type === 'task_created') {
          techEvents.push(event);
          return true;
        }
        return false;
      });

      const designEventPromise = readEventsWithTimeout(designReader, 2000, event => {
        if (event.type === 'task_created') {
          designEvents.push(event);
          return true;
        }
        return false;
      });

      await Promise.all([techTaskPromise, designTaskPromise, techEventPromise, designEventPromise]);

      // Verify events are properly filtered
      expect(techEvents).toHaveLength(1);
      expect(techEvents[0].departmentId).toBe('technology');
      expect(techEvents[0].task.title).toBe('Tech Department Task');

      expect(designEvents).toHaveLength(1);
      expect(designEvents[0].departmentId).toBe('design');
      expect(designEvents[0].task.title).toBe('Design Department Task');

      await techReader.cancel();
      await designReader.cancel();
    });

    test('should handle multi-department streams', async () => {
      const events: any[] = [];

      // Setup stream for multiple departments
      const stream = eventService.createEventStream({
        departments: ['technology', 'design', 'finance'],
        eventTypes: ['task_created'],
      });

      const reader = stream.getReader();

      // Create tasks in different departments
      const tasks = [
        { dept: 'technology', title: 'Tech Task' },
        { dept: 'design', title: 'Design Task' },
        { dept: 'finance', title: 'Finance Task' },
      ];

      const taskPromises = tasks.map(task =>
        taskService.createTask({
          title: task.title,
          priority: 'medium',
          status: 'planning',
          progress: 0,
          departmentId: task.dept,
        })
      );

      // Read events (expecting 3)
      const eventPromise = readEventsWithTimeout(reader, 3000, event => {
        if (event.type === 'task_created') {
          events.push(event);
          return events.length >= 3; // Stop after 3 events
        }
        return false;
      });

      await Promise.all([...taskPromises, eventPromise]);

      expect(events).toHaveLength(3);

      const departments = events.map(e => e.departmentId).sort();
      expect(departments).toEqual(['design', 'finance', 'technology']);

      await reader.cancel();
    });
  });

  describe('Event Data Integrity', () => {
    test('should include complete task data in events', async () => {
      const events: any[] = [];

      const stream = eventService.createEventStream({
        departments: ['technology'],
        eventTypes: ['task_created'],
      });

      const reader = stream.getReader();

      const taskData = {
        title: 'Complete Data Test Task',
        description: 'Testing complete event data',
        priority: 'high' as const,
        status: 'planning' as const,
        progress: 0,
        departmentId: 'technology',
        assigneeId: 'john-doe',
        reporterId: 'jane-smith',
        estimatedHours: 16,
        storyPoints: 8,
        tags: ['test', 'sse', 'data-integrity'],
      };

      const taskPromise = taskService.createTask(taskData);

      const eventPromise = readEventsWithTimeout(reader, 2000, event => {
        if (event.type === 'task_created') {
          events.push(event);
          return true;
        }
        return false;
      });

      await Promise.all([taskPromise, eventPromise]);

      expect(events).toHaveLength(1);
      const event = events[0];

      // Verify event structure
      expect(event.type).toBe('task_created');
      expect(event.taskUuid).toBeDefined();
      expect(event.timestamp).toBeDefined();
      expect(event.departmentId).toBe('technology');

      // Verify task data completeness
      expect(event.task.title).toBe(taskData.title);
      expect(event.task.description).toBe(taskData.description);
      expect(event.task.priority).toBe(taskData.priority);
      expect(event.task.estimatedHours).toBe(taskData.estimatedHours);
      expect(event.task.tags).toEqual(taskData.tags);

      await reader.cancel();
    });
  });
});

// Helper functions
async function setupTestDatabase(db: SQL) {
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

async function cleanupTestDatabase(db: SQL) {
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
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      resolve(); // Don't reject, just resolve to allow test to continue
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
        resolve(); // Don't reject, stream might be cancelled
      }
    };

    readLoop();
  });
}
