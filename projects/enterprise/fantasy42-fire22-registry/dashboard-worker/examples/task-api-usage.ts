/**
 * Fire22 Dashboard Task Management API Usage Examples
 * Demonstrates how to use the task management API in real applications
 */

import { TaskEnhancedService } from '../src/api/tasks-enhanced';
import { TaskEventService } from '../src/api/task-events';
import { getDatabase } from '../src/database/connection';

// Example 1: Basic Task Management
export async function basicTaskManagement() {
  const db = await getDatabase(process.env);
  const taskService = new TaskEnhancedService(db);

  console.log('🚀 Creating a new task...');

  // Create a new task
  const createResult = await taskService.createTask({
    title: 'Implement user dashboard',
    description: 'Create a responsive user dashboard with real-time updates',
    priority: 'high',
    status: 'planning',
    progress: 0,
    departmentId: 'technology',
    assigneeId: 'john-doe',
    reporterId: 'jane-smith',
    dueDate: '2024-09-15T23:59:59Z',
    estimatedHours: 24,
    storyPoints: 13,
    tags: ['frontend', 'dashboard', 'react'],
  });

  if (createResult.success) {
    console.log('✅ Task created:', createResult.data!.uuid);

    // Update task progress
    const updateResult = await taskService.updateTask({
      uuid: createResult.data!.uuid,
      status: 'in-progress',
      progress: 25,
    });

    if (updateResult.success) {
      console.log('✅ Task updated:', updateResult.changes);
    }

    // Add a comment
    const commentResult = await taskService.addComment(createResult.data!.uuid, {
      content: 'Started working on the wireframes',
      type: 'comment',
      userId: 'john-doe',
    });

    if (commentResult.success) {
      console.log('✅ Comment added');
    }
  }
}

// Example 2: Advanced Filtering and Search
export async function advancedTaskFiltering() {
  const db = await getDatabase(process.env);
  const taskService = new TaskEnhancedService(db);

  console.log('🔍 Searching for high-priority tasks...');

  // Get high-priority tasks in technology department
  const highPriorityTasks = await taskService.getTasks({
    departmentId: 'technology',
    priority: 'high',
    status: 'active',
    sortBy: 'dueDate',
    sortOrder: 'asc',
    page: 1,
    limit: 10,
  });

  if (highPriorityTasks.success) {
    console.log(`Found ${highPriorityTasks.data!.tasks.length} high-priority tasks`);

    highPriorityTasks.data!.tasks.forEach(task => {
      console.log(`- ${task.title} (Due: ${task.dueDate})`);
    });
  }

  // Search tasks by keyword
  const searchResults = await taskService.getTasks({
    search: 'authentication',
    tags: 'security,backend',
    dueBefore: '2024-12-31T23:59:59Z',
  });

  if (searchResults.success) {
    console.log(`Found ${searchResults.data!.tasks.length} tasks matching search`);
  }
}

// Example 3: Real-time Task Updates with SSE
export async function realTimeTaskUpdates() {
  const db = await getDatabase(process.env);
  const eventService = new TaskEventService(db);

  console.log('📡 Setting up real-time task updates...');

  // Create event stream for technology department
  const stream = eventService.createEventStream({
    departments: ['technology', 'design'],
    eventTypes: ['task_created', 'task_updated', 'task_assigned'],
  });

  const reader = stream.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        console.log('📡 Event stream ended');
        break;
      }

      const eventData = new TextDecoder().decode(value);

      if (eventData.startsWith('data: ')) {
        const event = JSON.parse(eventData.slice(6));

        switch (event.type) {
          case 'task_created':
            console.log(`🆕 New task created: ${event.task.title}`);
            break;
          case 'task_updated':
            console.log(`📝 Task updated: ${event.task.title}`);
            if (event.changes.status) {
              console.log(`   Status: ${event.changes.status.from} → ${event.changes.status.to}`);
            }
            break;
          case 'task_assigned':
            console.log(`👤 Task assigned: ${event.task.title} → ${event.task.assignee?.name}`);
            break;
        }
      }
    }
  } catch (error) {
    console.error('❌ Error reading event stream:', error);
  } finally {
    reader.releaseLock();
  }
}

// Example 4: Design Team Integration
export async function designTeamIntegration() {
  const db = await getDatabase(process.env);
  const taskService = new TaskEnhancedService(db);

  console.log('🎨 Creating design-related tasks...');

  // Create a UI design task
  const designTask = await taskService.createTask({
    title: 'Design user onboarding flow',
    description: 'Create wireframes and mockups for the new user onboarding experience',
    priority: 'high',
    status: 'planning',
    progress: 0,
    departmentId: 'design',
    assigneeId: 'isabella-martinez', // Design Director
    reporterId: 'ethan-cooper', // UI/UX Designer
    dueDate: '2024-09-10T17:00:00Z',
    estimatedHours: 16,
    storyPoints: 8,
    tags: ['ui', 'ux', 'onboarding', 'wireframes'],
  });

  if (designTask.success) {
    console.log('✅ Design task created:', designTask.data!.uuid);

    // Request design review from technology team
    const reviewTask = await taskService.createTask({
      title: 'Review onboarding flow designs',
      description: `Review and provide feedback on designs from task: ${designTask.data!.uuid}`,
      priority: 'medium',
      status: 'planning',
      progress: 0,
      departmentId: 'technology',
      assigneeId: 'john-doe',
      reporterId: 'isabella-martinez',
      tags: ['design-review', 'onboarding', 'collaboration'],
    });

    if (reviewTask.success) {
      console.log('✅ Design review task created:', reviewTask.data!.uuid);

      // Add cross-reference comment
      await taskService.addComment(designTask.data!.uuid, {
        content: `Created review task: ${reviewTask.data!.uuid}`,
        type: 'reference',
        userId: 'isabella-martinez',
      });
    }
  }
}

// Example 5: Department Workflow Automation
export async function departmentWorkflowAutomation() {
  const db = await getDatabase(process.env);
  const taskService = new TaskEnhancedService(db);

  console.log('⚙️ Setting up department workflow automation...');

  // Create a multi-department project
  const projectTasks = [
    {
      title: 'Project Planning & Requirements',
      departmentId: 'management',
      assigneeId: 'sarah-wilson',
      priority: 'high' as const,
      estimatedHours: 8,
    },
    {
      title: 'UI/UX Design & Prototyping',
      departmentId: 'design',
      assigneeId: 'isabella-martinez',
      priority: 'high' as const,
      estimatedHours: 24,
    },
    {
      title: 'Frontend Development',
      departmentId: 'technology',
      assigneeId: 'john-doe',
      priority: 'medium' as const,
      estimatedHours: 40,
    },
    {
      title: 'Security Review & Testing',
      departmentId: 'security',
      assigneeId: 'alex-chen',
      priority: 'high' as const,
      estimatedHours: 16,
    },
    {
      title: 'Marketing Campaign Setup',
      departmentId: 'marketing',
      assigneeId: 'emily-davis',
      priority: 'medium' as const,
      estimatedHours: 12,
    },
  ];

  const createdTasks = [];

  for (const taskData of projectTasks) {
    const result = await taskService.createTask({
      ...taskData,
      status: 'planning',
      progress: 0,
      tags: ['multi-department', 'project-alpha'],
    });

    if (result.success) {
      createdTasks.push(result.data!);
      console.log(`✅ Created task for ${taskData.departmentId}: ${taskData.title}`);
    }
  }

  // Set up task dependencies (simplified example)
  if (createdTasks.length >= 2) {
    await taskService.addComment(createdTasks[1].uuid, {
      content: `Depends on completion of: ${createdTasks[0].uuid}`,
      type: 'dependency',
      userId: 'system',
    });
  }

  return createdTasks;
}

// Example 6: Performance Monitoring
export async function performanceMonitoring() {
  const db = await getDatabase(process.env);
  const taskService = new TaskEnhancedService(db);

  console.log('📊 Monitoring task performance...');

  // Get department performance metrics
  const departments = ['technology', 'design', 'marketing', 'security'];

  for (const dept of departments) {
    const activeTasks = await taskService.getTasks({
      departmentId: dept,
      status: 'active',
    });

    const completedTasks = await taskService.getTasks({
      departmentId: dept,
      status: 'completed',
    });

    if (activeTasks.success && completedTasks.success) {
      console.log(`📈 ${dept.toUpperCase()} Department:`);
      console.log(`   Active tasks: ${activeTasks.data!.pagination.total}`);
      console.log(`   Completed tasks: ${completedTasks.data!.pagination.total}`);

      // Calculate average progress for active tasks
      const avgProgress =
        activeTasks.data!.tasks.reduce((sum, task) => sum + task.progress, 0) /
        activeTasks.data!.tasks.length;
      console.log(`   Average progress: ${avgProgress.toFixed(1)}%`);
    }
  }
}

// Run examples
if (import.meta.main) {
  console.log('🚀 Fire22 Task Management API Examples\n');

  try {
    await basicTaskManagement();
    console.log('\n' + '='.repeat(50) + '\n');

    await advancedTaskFiltering();
    console.log('\n' + '='.repeat(50) + '\n');

    await designTeamIntegration();
    console.log('\n' + '='.repeat(50) + '\n');

    await departmentWorkflowAutomation();
    console.log('\n' + '='.repeat(50) + '\n');

    await performanceMonitoring();

    console.log('\n✅ All examples completed successfully!');
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}
