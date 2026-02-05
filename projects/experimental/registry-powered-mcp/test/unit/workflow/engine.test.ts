/**
 * Workflow Engine Tests v2.4.1
 *
 * Comprehensive test suite for the workflow execution engine.
 * Tests cover:
 * - Engine initialization
 * - Step handler registration
 * - Sequential workflow execution
 * - Parallel workflow execution
 * - Conditional workflow execution
 * - Error handling and retries
 * - Hook execution
 */

import { describe, test, expect, beforeEach, mock } from 'bun:test';
import {
  WorkflowEngine,
  createWorkflowEngine,
  createWorkflowSystem,
} from '../../../packages/core/src/workflow';
import type {
  WorkflowDefinition,
  StepHandler,
  WorkflowPlugin,
} from '../../../packages/core/src/workflow';

describe('WorkflowEngine', () => {
  let engine: WorkflowEngine;

  beforeEach(() => {
    engine = createWorkflowEngine();
  });

  describe('initialization', () => {
    test('should create engine with default config', () => {
      const stats = engine.getStats();
      expect(stats.activeWorkflows).toBe(0);
      expect(stats.registeredHandlers).toBe(0);
      expect(stats.registeredWorkflows).toBe(0);
    });

    test('should create engine with custom config', () => {
      const customEngine = createWorkflowEngine({
        maxConcurrentWorkflows: 5,
        defaultTimeout: 60000,
      });
      expect(customEngine).toBeInstanceOf(WorkflowEngine);
    });
  });

  describe('step handler registration', () => {
    test('should register a step handler', () => {
      const handler: StepHandler = async (inputs) => ({ result: 'ok' });
      engine.registerStepHandler('test.handler', handler);

      const stats = engine.getStats();
      expect(stats.registeredHandlers).toBe(1);
    });

    test('should register multiple handlers at once', () => {
      engine.registerStepHandlers({
        'handler.one': async () => ({}),
        'handler.two': async () => ({}),
        'handler.three': async () => ({}),
      });

      const stats = engine.getStats();
      expect(stats.registeredHandlers).toBe(3);
    });

    test('should warn when overriding existing handler', () => {
      const consoleSpy = mock(() => {});
      const originalWarn = console.warn;
      console.warn = consoleSpy;

      engine.registerStepHandler('test', async () => ({}));
      engine.registerStepHandler('test', async () => ({}));

      expect(consoleSpy).toHaveBeenCalled();
      console.warn = originalWarn;
    });
  });

  describe('workflow registration', () => {
    test('should register a workflow', () => {
      const workflow: WorkflowDefinition = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: '1.0.0',
        trigger: 'manual',
        executionMode: 'sequential',
        steps: [],
        enabled: true,
      };

      engine.registerWorkflow(workflow);
      expect(engine.getWorkflow('test-workflow')).toBeDefined();
    });

    test('should retrieve registered workflow', () => {
      const workflow: WorkflowDefinition = {
        id: 'my-workflow',
        name: 'My Workflow',
        version: '1.0.0',
        trigger: 'manual',
        executionMode: 'sequential',
        steps: [
          {
            id: 'step1',
            name: 'Step 1',
            type: 'test',
            handler: 'test.handler',
          },
        ],
        enabled: true,
      };

      engine.registerWorkflow(workflow);
      const retrieved = engine.getWorkflow('my-workflow');

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('My Workflow');
      expect(retrieved?.steps.length).toBe(1);
    });
  });

  describe('workflow execution', () => {
    test('should execute a simple sequential workflow', async () => {
      // Register handler
      let executionCount = 0;
      engine.registerStepHandler('counter', async () => {
        executionCount++;
        return { count: executionCount };
      });

      // Register workflow
      const workflow: WorkflowDefinition = {
        id: 'counter-workflow',
        name: 'Counter Workflow',
        version: '1.0.0',
        trigger: 'manual',
        executionMode: 'sequential',
        steps: [
          { id: 'step1', name: 'Count 1', type: 'counter', handler: 'counter' },
          { id: 'step2', name: 'Count 2', type: 'counter', handler: 'counter' },
          { id: 'step3', name: 'Count 3', type: 'counter', handler: 'counter' },
        ],
        enabled: true,
      };

      engine.registerWorkflow(workflow);

      const result = await engine.execute('counter-workflow');

      expect(result.status).toBe('completed');
      expect(result.stepResults.length).toBe(3);
      expect(executionCount).toBe(3);
    });

    test('should pass inputs to step handlers', async () => {
      let receivedInputs: Record<string, unknown> = {};

      engine.registerStepHandler('input-receiver', async (inputs) => {
        receivedInputs = inputs;
        return { received: true };
      });

      const workflow: WorkflowDefinition = {
        id: 'input-workflow',
        name: 'Input Workflow',
        version: '1.0.0',
        trigger: 'manual',
        executionMode: 'sequential',
        steps: [
          {
            id: 'step1',
            name: 'Receive Input',
            type: 'input-receiver',
            handler: 'input-receiver',
            inputs: { message: 'hello', count: 42 },
          },
        ],
        enabled: true,
      };

      engine.registerWorkflow(workflow);
      await engine.execute('input-workflow');

      expect(receivedInputs.message).toBe('hello');
      expect(receivedInputs.count).toBe(42);
    });

    test('should throw error for non-existent workflow', async () => {
      await expect(engine.execute('non-existent')).rejects.toThrow(
        'Workflow not found'
      );
    });

    test('should throw error for disabled workflow', async () => {
      const workflow: WorkflowDefinition = {
        id: 'disabled-workflow',
        name: 'Disabled Workflow',
        version: '1.0.0',
        trigger: 'manual',
        executionMode: 'sequential',
        steps: [],
        enabled: false,
      };

      engine.registerWorkflow(workflow);

      await expect(engine.execute('disabled-workflow')).rejects.toThrow(
        'Workflow is disabled'
      );
    });

    test('should handle step failure', async () => {
      engine.registerStepHandler('failing', async () => {
        throw new Error('Step failed intentionally');
      });

      const workflow: WorkflowDefinition = {
        id: 'failing-workflow',
        name: 'Failing Workflow',
        version: '1.0.0',
        trigger: 'manual',
        executionMode: 'sequential',
        steps: [
          { id: 'step1', name: 'Fail', type: 'failing', handler: 'failing' },
        ],
        enabled: true,
      };

      engine.registerWorkflow(workflow);
      const result = await engine.execute('failing-workflow');

      expect(result.status).toBe('failed');
      expect(result.stepResults[0].status).toBe('failed');
      expect(result.stepResults[0].error).toContain('Step failed intentionally');
    });

    test('should continue on error when configured', async () => {
      let step2Executed = false;

      engine.registerStepHandler('failing', async () => {
        throw new Error('Step failed');
      });
      engine.registerStepHandler('success', async () => {
        step2Executed = true;
        return { ok: true };
      });

      const workflow: WorkflowDefinition = {
        id: 'continue-workflow',
        name: 'Continue Workflow',
        version: '1.0.0',
        trigger: 'manual',
        executionMode: 'sequential',
        steps: [
          {
            id: 'step1',
            name: 'Fail',
            type: 'failing',
            handler: 'failing',
            continueOnError: true,
          },
          {
            id: 'step2',
            name: 'Success',
            type: 'success',
            handler: 'success',
          },
        ],
        enabled: true,
      };

      engine.registerWorkflow(workflow);
      const result = await engine.execute('continue-workflow');

      expect(result.stepResults.length).toBe(2);
      expect(step2Executed).toBe(true);
    });
  });

  describe('parallel execution', () => {
    test('should execute steps in parallel', async () => {
      const executionOrder: string[] = [];

      engine.registerStepHandler('parallel-step', async (inputs) => {
        const id = inputs.id as string;
        const delay = inputs.delay as number;
        await Bun.sleep(delay);
        executionOrder.push(id);
        return { id };
      });

      const workflow: WorkflowDefinition = {
        id: 'parallel-workflow',
        name: 'Parallel Workflow',
        version: '1.0.0',
        trigger: 'manual',
        executionMode: 'parallel',
        steps: [
          {
            id: 'slow',
            name: 'Slow Step',
            type: 'parallel-step',
            handler: 'parallel-step',
            inputs: { id: 'slow', delay: 50 },
          },
          {
            id: 'fast',
            name: 'Fast Step',
            type: 'parallel-step',
            handler: 'parallel-step',
            inputs: { id: 'fast', delay: 10 },
          },
        ],
        enabled: true,
      };

      engine.registerWorkflow(workflow);
      const result = await engine.execute('parallel-workflow');

      expect(result.status).toBe('completed');
      expect(result.stepResults.length).toBe(2);
      // Fast should complete before slow
      expect(executionOrder[0]).toBe('fast');
      expect(executionOrder[1]).toBe('slow');
    });
  });

  describe('conditional execution', () => {
    test('should skip step when condition is not met', async () => {
      let conditionalExecuted = false;

      engine.registerStepHandler('conditional', async () => {
        conditionalExecuted = true;
        return { executed: true };
      });

      const workflow: WorkflowDefinition = {
        id: 'conditional-workflow',
        name: 'Conditional Workflow',
        version: '1.0.0',
        trigger: 'manual',
        executionMode: 'conditional',
        inputs: { shouldRun: false },
        steps: [
          {
            id: 'step1',
            name: 'Conditional Step',
            type: 'conditional',
            handler: 'conditional',
            condition: {
              expression: 'inputs.shouldRun',
              operator: 'eq',
              value: true,
            },
          },
        ],
        enabled: true,
      };

      engine.registerWorkflow(workflow);
      const result = await engine.execute('conditional-workflow');

      expect(result.status).toBe('completed');
      expect(result.stepResults[0].status).toBe('skipped');
      expect(conditionalExecuted).toBe(false);
    });
  });

  describe('hooks', () => {
    test('should execute beforeWorkflow hook', async () => {
      let hookCalled = false;

      engine.registerHook({
        type: 'beforeWorkflow',
        handler: async () => {
          hookCalled = true;
        },
      });

      engine.registerStepHandler('noop', async () => ({}));

      const workflow: WorkflowDefinition = {
        id: 'hook-workflow',
        name: 'Hook Workflow',
        version: '1.0.0',
        trigger: 'manual',
        executionMode: 'sequential',
        steps: [{ id: 'step1', name: 'Noop', type: 'noop', handler: 'noop' }],
        enabled: true,
      };

      engine.registerWorkflow(workflow);
      await engine.execute('hook-workflow');

      expect(hookCalled).toBe(true);
    });

    test('should execute afterStep hook with step result', async () => {
      let capturedResult: any = null;

      engine.registerHook({
        type: 'afterStep',
        handler: async (context, data) => {
          capturedResult = data;
        },
      });

      engine.registerStepHandler('output-step', async () => ({
        output: 'test-value',
      }));

      const workflow: WorkflowDefinition = {
        id: 'after-step-workflow',
        name: 'After Step Workflow',
        version: '1.0.0',
        trigger: 'manual',
        executionMode: 'sequential',
        steps: [
          {
            id: 'step1',
            name: 'Output Step',
            type: 'output-step',
            handler: 'output-step',
          },
        ],
        enabled: true,
      };

      engine.registerWorkflow(workflow);
      await engine.execute('after-step-workflow');

      expect(capturedResult).toBeDefined();
      expect(capturedResult.result.outputs.output).toBe('test-value');
    });
  });

  describe('workflow cancellation', () => {
    test('should cancel a running workflow', async () => {
      // This test is tricky because we need to cancel during execution
      engine.registerStepHandler('long-running', async () => {
        await Bun.sleep(1000);
        return {};
      });

      const workflow: WorkflowDefinition = {
        id: 'long-workflow',
        name: 'Long Workflow',
        version: '1.0.0',
        trigger: 'manual',
        executionMode: 'sequential',
        steps: [
          {
            id: 'step1',
            name: 'Long Step',
            type: 'long-running',
            handler: 'long-running',
          },
        ],
        enabled: true,
      };

      engine.registerWorkflow(workflow);

      // Start execution without awaiting
      const execPromise = engine.execute('long-workflow');

      // Wait a bit then check active workflows
      await Bun.sleep(10);
      const activeWorkflows = engine.getActiveWorkflows();
      expect(activeWorkflows.length).toBe(1);

      // Cancel it
      const cancelled = await engine.cancel(activeWorkflows[0].executionId);
      expect(cancelled).toBe(true);

      // Cleanup
      await execPromise.catch(() => {});
    });

    test('should return false when cancelling non-existent workflow', async () => {
      const cancelled = await engine.cancel('non-existent-id');
      expect(cancelled).toBe(false);
    });
  });

  describe('health check', () => {
    test('should report healthy when all handlers exist', () => {
      engine.registerStepHandler('test', async () => ({}));

      const workflow: WorkflowDefinition = {
        id: 'healthy-workflow',
        name: 'Healthy Workflow',
        version: '1.0.0',
        trigger: 'manual',
        executionMode: 'sequential',
        steps: [{ id: 'step1', name: 'Test', type: 'test', handler: 'test' }],
        enabled: true,
      };

      engine.registerWorkflow(workflow);
      const health = engine.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.issues.length).toBe(0);
    });

    test('should report unhealthy when handler is missing', () => {
      const workflow: WorkflowDefinition = {
        id: 'unhealthy-workflow',
        name: 'Unhealthy Workflow',
        version: '1.0.0',
        trigger: 'manual',
        executionMode: 'sequential',
        steps: [
          { id: 'step1', name: 'Missing', type: 'missing', handler: 'missing' },
        ],
        enabled: true,
      };

      engine.registerWorkflow(workflow);
      const health = engine.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.issues.length).toBeGreaterThan(0);
      expect(health.issues[0]).toContain('missing');
    });
  });
});

describe('createWorkflowSystem', () => {
  test('should create a fully configured workflow system', async () => {
    const { engine, registry } = await createWorkflowSystem();

    expect(engine).toBeInstanceOf(WorkflowEngine);
    expect(registry).toBeDefined();

    const stats = engine.getStats();
    expect(stats.registeredHandlers).toBeGreaterThan(0);
    expect(stats.registeredHooks).toBeGreaterThan(0);
  });

  test('should register built-in handlers', async () => {
    const { engine } = await createWorkflowSystem();

    // Register a workflow using built-in handler
    const workflow: WorkflowDefinition = {
      id: 'builtin-test',
      name: 'Built-in Test',
      version: '1.0.0',
      trigger: 'manual',
      executionMode: 'sequential',
      steps: [
        {
          id: 'log',
          name: 'Log Message',
          type: 'log',
          handler: 'log',
          inputs: { message: 'Test message' },
        },
      ],
      enabled: true,
    };

    engine.registerWorkflow(workflow);
    const result = await engine.execute('builtin-test');

    expect(result.status).toBe('completed');
  });
});
