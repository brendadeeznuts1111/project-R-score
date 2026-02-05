/**
 * Workflow Hooks v2.4.1 - Hardened Baseline
 * Built-in Lifecycle Hooks for Workflow Events
 *
 * Architecture:
 * - Telemetry hooks for performance monitoring
 * - Logging hooks for audit trails
 * - Notification hooks for external integrations
 * - Persistence hooks for state management
 *
 * Powered by Bun 1.3.6 Native APIs
 */

import type {
  WorkflowHook,
  WorkflowContext,
  WorkflowStep,
  StepResult,
  WorkflowStatus,
} from './types';

/**
 * Telemetry data for workflow execution
 */
interface TelemetryData {
  workflowId: string;
  executionId: string;
  stepId?: string;
  duration?: number;
  status?: WorkflowStatus;
  error?: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
}

/**
 * Telemetry collector interface
 */
export interface TelemetryCollector {
  collect(data: TelemetryData): void;
  flush(): Promise<void>;
}

/**
 * In-memory telemetry collector
 */
class InMemoryTelemetryCollector implements TelemetryCollector {
  private readonly data: TelemetryData[] = [];
  private readonly maxSize: number;

  constructor(maxSize = 10000) {
    this.maxSize = maxSize;
  }

  collect(data: TelemetryData): void {
    this.data.push(data);

    // Trim if exceeds max size
    if (this.data.length > this.maxSize) {
      this.data.shift();
    }
  }

  async flush(): Promise<void> {
    // In production, this would send to metrics endpoint
    console.log(`📊 Flushing ${this.data.length} telemetry records`);
  }

  getData(): readonly TelemetryData[] {
    return this.data;
  }

  clear(): void {
    this.data.length = 0;
  }
}

/**
 * Default telemetry collector instance
 */
export const defaultTelemetryCollector = new InMemoryTelemetryCollector();

/**
 * Create telemetry hooks for workflow monitoring
 */
export function createTelemetryHooks(
  collector: TelemetryCollector = defaultTelemetryCollector
): readonly WorkflowHook[] {
  return [
    {
      type: 'beforeWorkflow',
      priority: 1,
      handler: async (context: WorkflowContext) => {
        collector.collect({
          workflowId: context.workflowId,
          executionId: context.executionId,
          timestamp: new Date(),
          metadata: {
            event: 'workflow_started',
            trigger: context.trigger,
            triggeredBy: context.triggeredBy,
          },
        });
      },
    },
    {
      type: 'afterWorkflow',
      priority: 1,
      handler: async (context: WorkflowContext, data?: unknown) => {
        const result = data as { status: WorkflowStatus; stepResults: StepResult[] } | undefined;

        collector.collect({
          workflowId: context.workflowId,
          executionId: context.executionId,
          status: result?.status,
          duration: Date.now() - context.startedAt.getTime(),
          timestamp: new Date(),
          metadata: {
            event: 'workflow_completed',
            stepsExecuted: result?.stepResults.length ?? 0,
            stepsFailed: result?.stepResults.filter((s) => s.status === 'failed').length ?? 0,
          },
        });
      },
    },
    {
      type: 'beforeStep',
      priority: 1,
      handler: async (context: WorkflowContext, data?: unknown) => {
        const step = (data as { step: WorkflowStep })?.step;

        collector.collect({
          workflowId: context.workflowId,
          executionId: context.executionId,
          stepId: step?.id,
          timestamp: new Date(),
          metadata: {
            event: 'step_started',
            stepName: step?.name,
            stepType: step?.type,
          },
        });
      },
    },
    {
      type: 'afterStep',
      priority: 1,
      handler: async (context: WorkflowContext, data?: unknown) => {
        const { step, result } = data as { step: WorkflowStep; result: StepResult };

        collector.collect({
          workflowId: context.workflowId,
          executionId: context.executionId,
          stepId: step.id,
          duration: result.duration,
          timestamp: new Date(),
          metadata: {
            event: 'step_completed',
            stepName: step.name,
            status: result.status,
            attempts: result.attempts,
          },
        });
      },
    },
    {
      type: 'onError',
      priority: 1,
      handler: async (context: WorkflowContext, data?: unknown) => {
        const error = data as { error: Error } | undefined;

        collector.collect({
          workflowId: context.workflowId,
          executionId: context.executionId,
          error: error?.error?.message,
          timestamp: new Date(),
          metadata: {
            event: 'workflow_error',
            stack: error?.error?.stack,
          },
        });
      },
    },
  ];
}

/**
 * Logger interface for logging hooks
 */
export interface WorkflowLogger {
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
  debug(message: string, data?: Record<string, unknown>): void;
}

/**
 * Console logger implementation
 */
const consoleLogger: WorkflowLogger = {
  info: (message, data) => console.log(`ℹ️  ${message}`, data ? JSON.stringify(data) : ''),
  warn: (message, data) => console.warn(`⚠️  ${message}`, data ? JSON.stringify(data) : ''),
  error: (message, data) => console.error(`❌ ${message}`, data ? JSON.stringify(data) : ''),
  debug: (message, data) => console.debug(`🔍 ${message}`, data ? JSON.stringify(data) : ''),
};

/**
 * Create logging hooks for workflow audit trails
 */
export function createLoggingHooks(
  logger: WorkflowLogger = consoleLogger
): readonly WorkflowHook[] {
  return [
    {
      type: 'beforeWorkflow',
      priority: 10,
      handler: async (context: WorkflowContext) => {
        logger.info(`Workflow started: ${context.workflowId}`, {
          executionId: context.executionId,
          trigger: context.trigger,
          triggeredBy: context.triggeredBy,
        });
      },
    },
    {
      type: 'afterWorkflow',
      priority: 10,
      handler: async (context: WorkflowContext, data?: unknown) => {
        const result = data as { status: WorkflowStatus } | undefined;
        const duration = Date.now() - context.startedAt.getTime();

        if (result?.status === 'completed') {
          logger.info(`Workflow completed: ${context.workflowId}`, {
            executionId: context.executionId,
            duration: `${duration}ms`,
          });
        } else {
          logger.warn(`Workflow ended with status: ${result?.status}`, {
            executionId: context.executionId,
            duration: `${duration}ms`,
          });
        }
      },
    },
    {
      type: 'beforeStep',
      priority: 10,
      handler: async (context: WorkflowContext, data?: unknown) => {
        const step = (data as { step: WorkflowStep })?.step;
        logger.debug(`Step starting: ${step?.name}`, {
          stepId: step?.id,
          type: step?.type,
        });
      },
    },
    {
      type: 'afterStep',
      priority: 10,
      handler: async (context: WorkflowContext, data?: unknown) => {
        const { step, result } = data as { step: WorkflowStep; result: StepResult };

        if (result.status === 'completed') {
          logger.debug(`Step completed: ${step.name}`, {
            stepId: step.id,
            duration: `${result.duration?.toFixed(0)}ms`,
          });
        } else if (result.status === 'failed') {
          logger.error(`Step failed: ${step.name}`, {
            stepId: step.id,
            error: result.error,
            attempts: result.attempts,
          });
        }
      },
    },
    {
      type: 'onError',
      priority: 10,
      handler: async (context: WorkflowContext, data?: unknown) => {
        const error = (data as { error: Error })?.error;
        logger.error(`Workflow error: ${context.workflowId}`, {
          executionId: context.executionId,
          error: error?.message,
          stack: error?.stack,
        });
      },
    },
    {
      type: 'onRetry',
      priority: 10,
      handler: async (context: WorkflowContext, data?: unknown) => {
        const { step, attempt } = data as { step: WorkflowStep; attempt: number };
        logger.warn(`Step retry: ${step.name}`, {
          stepId: step.id,
          attempt,
        });
      },
    },
    {
      type: 'onCancel',
      priority: 10,
      handler: async (context: WorkflowContext) => {
        logger.warn(`Workflow cancelled: ${context.workflowId}`, {
          executionId: context.executionId,
        });
      },
    },
  ];
}

/**
 * Webhook notification configuration
 */
export interface WebhookConfig {
  url: string;
  secret?: string;
  events: readonly string[];
  headers?: Record<string, string>;
}

/**
 * Create webhook notification hooks
 */
export function createWebhookHooks(config: WebhookConfig): readonly WorkflowHook[] {
  const sendWebhook = async (
    event: string,
    context: WorkflowContext,
    data?: Record<string, unknown>
  ) => {
    // Skip if event not in configured events
    if (!config.events.includes(event) && !config.events.includes('*')) {
      return;
    }

    const payload = {
      event,
      workflowId: context.workflowId,
      executionId: context.executionId,
      timestamp: new Date().toISOString(),
      data,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config.headers,
    };

    // Add signature if secret is configured
    if (config.secret) {
      const hmac = new Bun.CryptoHasher('sha256', config.secret);
      hmac.update(JSON.stringify(payload));
      headers['X-Webhook-Signature'] = `sha256=${hmac.digest('hex')}`;
    }

    try {
      await fetch(config.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error(`Webhook notification failed: ${err}`);
    }
  };

  return [
    {
      type: 'beforeWorkflow',
      priority: 50,
      handler: async (context) => {
        await sendWebhook('workflow.started', context, {
          trigger: context.trigger,
          triggeredBy: context.triggeredBy,
        });
      },
    },
    {
      type: 'afterWorkflow',
      priority: 50,
      handler: async (context, data) => {
        const result = data as { status: WorkflowStatus; stepResults: StepResult[] } | undefined;
        await sendWebhook('workflow.completed', context, {
          status: result?.status,
          duration: Date.now() - context.startedAt.getTime(),
        });
      },
    },
    {
      type: 'onError',
      priority: 50,
      handler: async (context, data) => {
        const error = (data as { error: Error })?.error;
        await sendWebhook('workflow.failed', context, {
          error: error?.message,
        });
      },
    },
  ];
}

/**
 * Persistence hook for storing workflow state
 */
export interface PersistenceStore {
  save(executionId: string, data: unknown): Promise<void>;
  YAML.parse(executionId: string): Promise<unknown | null>;
  delete(executionId: string): Promise<void>;
}

/**
 * In-memory persistence store
 */
class InMemoryPersistenceStore implements PersistenceStore {
  private readonly store = new Map<string, unknown>();

  async save(executionId: string, data: unknown): Promise<void> {
    this.store.set(executionId, data);
  }

  async YAML.parse(executionId: string): Promise<unknown | null> {
    return this.store.get(executionId) ?? null;
  }

  async delete(executionId: string): Promise<void> {
    this.store.delete(executionId);
  }
}

/**
 * Default persistence store
 */
export const defaultPersistenceStore = new InMemoryPersistenceStore();

/**
 * Create persistence hooks for workflow state management
 */
export function createPersistenceHooks(
  store: PersistenceStore = defaultPersistenceStore
): readonly WorkflowHook[] {
  return [
    {
      type: 'beforeWorkflow',
      priority: 5,
      handler: async (context: WorkflowContext) => {
        await store.save(context.executionId, {
          workflowId: context.workflowId,
          startedAt: context.startedAt,
          status: 'running',
          inputs: context.inputs,
        });
      },
    },
    {
      type: 'afterStep',
      priority: 5,
      handler: async (context: WorkflowContext, data?: unknown) => {
        const { result } = data as { step: WorkflowStep; result: StepResult };

        // Update stored state with step result
        const existing = await store.YAML.parse(context.executionId);
        if (existing) {
          const state = existing as Record<string, unknown>;
          const stepResults = (state.stepResults as StepResult[]) ?? [];
          stepResults.push(result);
          state.stepResults = stepResults;
          await store.save(context.executionId, state);
        }
      },
    },
    {
      type: 'afterWorkflow',
      priority: 5,
      handler: async (context: WorkflowContext, data?: unknown) => {
        const result = data as { status: WorkflowStatus } | undefined;

        // Update final state
        const existing = await store.YAML.parse(context.executionId);
        if (existing) {
          const state = existing as Record<string, unknown>;
          state.status = result?.status;
          state.completedAt = new Date();
          state.duration = Date.now() - context.startedAt.getTime();
          await store.save(context.executionId, state);
        }
      },
    },
  ];
}

/**
 * Create all built-in hooks with default configuration
 */
export function createBuiltinHooks(): readonly WorkflowHook[] {
  return [
    ...createTelemetryHooks(),
    ...createLoggingHooks(),
    ...createPersistenceHooks(),
  ];
}
