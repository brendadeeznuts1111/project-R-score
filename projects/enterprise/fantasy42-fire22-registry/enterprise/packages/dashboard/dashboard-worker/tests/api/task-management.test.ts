/**
 * Fire22 Dashboard Task Management API Test Suite
 * Comprehensive testing for all task management endpoints
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { TaskEnhancedService } from '../../src/api/tasks-enhanced';
import { TaskEventService } from '../../src/api/task-events';
import { getDatabase } from '../../src/database/connection';
import { Database } from 'bun:sqlite';

// Test environment setup
const TEST_ENV = {
  DATABASE_URL: 'sqlite://test.db',
  JWT_SECRET: 'test-secret-key-for-testing-only',
  ENVIRONMENT: 'test',
};

describe('Fire22 Task Management API', () => {
  let db: Database;
  let taskService: TaskEnhancedService;
  let eventService: TaskEventService;
  let testTaskUuid: string;

  beforeAll(async () => {
    // Initialize test database
    db = await getDatabase(TEST_ENV);
    taskService = new TaskEnhancedService(db);
    eventService = new TaskEventService(db);

    // Setup test tables
    await setupTestDatabase(db);
  });

  afterAll(async () => {
    // Cleanup test database
    await cleanupTestDatabase(db);
  });

  beforeEach(async () => {
    // Clear test data before each test
    await clearTestData(db);
  });

  describe('Task CRUD Operations', () => {
    test('should create a new task', async () => {
      const taskData = {
        title: 'Test Task Creation',
        description: 'Testing task creation functionality',
        priority: 'medium' as const,
        status: 'planning' as const,
        progress: 0,
        departmentId: 'technology',
        assigneeId: 'test-user-1',
        reporterId: 'test-user-2',
        estimatedHours: 8,
        storyPoints: 5,
        tags: ['test', 'api'],
      };

      const result = await taskService.createTask(taskData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.title).toBe(taskData.title);
      expect(result.data!.uuid).toMatch(/^task_\d{4}_\d{2}_\d{2}_[a-z0-9]+$/);

      testTaskUuid = result.data!.uuid;
    });

    test('should retrieve tasks with pagination', async () => {
      // Create multiple test tasks
      const tasks = await createMultipleTestTasks(taskService, 5);

      const result = await taskService.getTasks({
        page: 1,
        limit: 3,
        departmentId: 'technology',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.tasks).toHaveLength(3);
      expect(result.data!.pagination.total).toBe(5);
      expect(result.data!.pagination.totalPages).toBe(2);
      expect(result.data!.pagination.hasNext).toBe(true);
    });

    test('should filter tasks by status and priority', async () => {
      // Create tasks with different statuses and priorities
      await createTestTaskWithStatus(taskService, 'active', 'high');
      await createTestTaskWithStatus(taskService, 'completed', 'low');
      await createTestTaskWithStatus(taskService, 'active', 'high');

      const result = await taskService.getTasks({
        status: 'active',
        priority: 'high',
        departmentId: 'technology',
      });

      expect(result.success).toBe(true);
      expect(result.data!.tasks).toHaveLength(2);
      result.data!.tasks.forEach(task => {
        expect(task.status).toBe('active');
        expect(task.priority).toBe('high');
      });
    });

    test('should update task status and progress', async () => {
      // Create a test task first
      const createResult = await taskService.createTask({
        title: 'Task to Update',
        priority: 'medium',
        status: 'planning',
        progress: 0,
        departmentId: 'technology',
      });

      const taskUuid = createResult.data!.uuid;

      const updateResult = await taskService.updateTask({
        uuid: taskUuid,
        status: 'in-progress',
        progress: 50,
      });

      expect(updateResult.success).toBe(true);
      expect(updateResult.data!.status).toBe('in-progress');
      expect(updateResult.data!.progress).toBe(50);
      expect(updateResult.changes).toBeDefined();
      expect(updateResult.changes!.status).toEqual({
        from: 'planning',
        to: 'in-progress',
      });
    });

    test('should delete a task', async () => {
      // Create a test task first
      const createResult = await taskService.createTask({
        title: 'Task to Delete',
        priority: 'low',
        status: 'planning',
        progress: 0,
        departmentId: 'technology',
      });

      const taskUuid = createResult.data!.uuid;

      const deleteResult = await taskService.deleteTask(taskUuid);
      expect(deleteResult.success).toBe(true);

      // Verify task is deleted
      const getResult = await taskService.getTask(taskUuid);
      expect(getResult.success).toBe(false);
      expect(getResult.error?.code).toBe('TASK_NOT_FOUND');
    });
  });

  describe('Task Comments', () => {
    test('should add comment to task', async () => {
      // Create a test task first
      const createResult = await taskService.createTask({
        title: 'Task for Comments',
        priority: 'medium',
        status: 'active',
        progress: 25,
        departmentId: 'technology',
      });

      const taskUuid = createResult.data!.uuid;

      const commentResult = await taskService.addComment(taskUuid, {
        content: 'This is a test comment',
        type: 'comment',
        userId: 'test-user-1',
      });

      expect(commentResult.success).toBe(true);
      expect(commentResult.data!.content).toBe('This is a test comment');
    });

    test('should retrieve task comments', async () => {
      // Create task and add multiple comments
      const createResult = await taskService.createTask({
        title: 'Task with Multiple Comments',
        priority: 'medium',
        status: 'active',
        progress: 25,
        departmentId: 'technology',
      });

      const taskUuid = createResult.data!.uuid;

      // Add multiple comments
      await taskService.addComment(taskUuid, {
        content: 'First comment',
        type: 'comment',
        userId: 'test-user-1',
      });

      await taskService.addComment(taskUuid, {
        content: 'Second comment',
        type: 'comment',
        userId: 'test-user-2',
      });

      const commentsResult = await taskService.getComments(taskUuid);

      expect(commentsResult.success).toBe(true);
      expect(commentsResult.data).toHaveLength(2);
      expect(commentsResult.data![0].content).toBe('First comment');
      expect(commentsResult.data![1].content).toBe('Second comment');
    });
  });

  describe('Real-time Events (SSE)', () => {
    test('should create event stream', async () => {
      const stream = eventService.createEventStream({
        departments: ['technology'],
        eventTypes: ['task_created', 'task_updated'],
      });

      expect(stream).toBeInstanceOf(ReadableStream);
    });

    test('should emit task creation event', async () => {
      const events: any[] = [];

      // Setup event listener
      const stream = eventService.createEventStream({
        departments: ['technology'],
      });

      const reader = stream.getReader();

      // Create a task to trigger event
      setTimeout(async () => {
        await taskService.createTask({
          title: 'Event Test Task',
          priority: 'medium',
          status: 'planning',
          progress: 0,
          departmentId: 'technology',
        });
      }, 100);

      // Read events for a short time
      const timeout = setTimeout(() => {
        reader.cancel();
      }, 1000);

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const eventData = new TextDecoder().decode(value);
          if (eventData.includes('task_created')) {
            events.push(JSON.parse(eventData.split('data: ')[1]));
            break;
          }
        }
      } catch (error) {
        // Expected when stream is cancelled
      }

      clearTimeout(timeout);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('task_created');
    });
  });

  describe('Department Integration', () => {
    test('should filter tasks by department', async () => {
      // Create tasks in different departments
      await createTestTaskInDepartment(taskService, 'technology');
      await createTestTaskInDepartment(taskService, 'design');
      await createTestTaskInDepartment(taskService, 'technology');

      const result = await taskService.getTasks({
        departmentId: 'technology',
      });

      expect(result.success).toBe(true);
      expect(result.data!.tasks).toHaveLength(2);
      result.data!.tasks.forEach(task => {
        expect(task.departmentId).toBe('technology');
      });
    });

    test('should validate department permissions', async () => {
      const result = await taskService.createTask({
        title: 'Invalid Department Task',
        priority: 'medium',
        status: 'planning',
        progress: 0,
        departmentId: 'invalid-department',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_DEPARTMENT');
    });
  });

  describe('Error Handling', () => {
    test('should handle task not found', async () => {
      const result = await taskService.getTask('invalid-uuid');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('TASK_NOT_FOUND');
      expect(result.error?.message).toContain('invalid-uuid');
    });

    test('should validate required fields', async () => {
      const result = await taskService.createTask({
        title: '', // Empty title should fail
        priority: 'medium',
        status: 'planning',
        progress: 0,
        departmentId: 'technology',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    test('should handle invalid priority values', async () => {
      const result = await taskService.createTask({
        title: 'Invalid Priority Task',
        priority: 'invalid' as any,
        status: 'planning',
        progress: 0,
        departmentId: 'technology',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });
  });
});

// Helper functions for testing
async function setupTestDatabase(db: Database) {
  // Create test tables if they don't exist
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
  await db`DROP TABLE IF EXISTS task_comments`;
  await db`DROP TABLE IF EXISTS tasks`;
}

async function clearTestData(db: Database) {
  await db`DELETE FROM task_comments`;
  await db`DELETE FROM tasks`;
}

async function createMultipleTestTasks(service: TaskEnhancedService, count: number) {
  const tasks = [];
  for (let i = 0; i < count; i++) {
    const result = await service.createTask({
      title: `Test Task ${i + 1}`,
      priority: 'medium',
      status: 'planning',
      progress: 0,
      departmentId: 'technology',
    });
    tasks.push(result.data!);
  }
  return tasks;
}

async function createTestTaskWithStatus(
  service: TaskEnhancedService,
  status: string,
  priority: string
) {
  return await service.createTask({
    title: `Task with ${status} status`,
    priority: priority as any,
    status: status as any,
    progress: 0,
    departmentId: 'technology',
  });
}

async function createTestTaskInDepartment(service: TaskEnhancedService, departmentId: string) {
  return await service.createTask({
    title: `Task in ${departmentId}`,
    priority: 'medium',
    status: 'planning',
    progress: 0,
    departmentId,
  });
}
