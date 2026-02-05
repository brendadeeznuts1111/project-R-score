/**
 * Workflow Plugin Types v2.4.1 - Hardened Baseline
 * Type-Safe Workflow Definitions for Registry-Powered-MCP
 *
 * Architecture:
 * - Immutable workflow contracts via readonly properties
 * - Type-safe step definitions with compile-time validation
 * - Plugin extensibility through interface contracts
 *
 * Powered by Bun 1.3.6 Native APIs
 */

/**
 * Workflow execution status
 */
export type WorkflowStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'paused';

/**
 * Step execution status
 */
export type StepStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped';

/**
 * Workflow trigger types
 */
export type WorkflowTrigger =
  | 'manual'
  | 'webhook'
  | 'schedule'
  | 'event'
  | 'api';

/**
 * Step execution mode
 */
export type StepExecutionMode =
  | 'sequential'    // Run steps one after another
  | 'parallel'      // Run steps concurrently
  | 'conditional';  // Run based on condition

/**
 * Workflow step input/output types
 */
export interface StepIO {
  readonly [key: string]: unknown;
}

/**
 * Step condition for conditional execution
 */
export interface StepCondition {
  readonly expression: string;
  readonly operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'matches';
  readonly value: unknown;
}

/**
 * Step retry configuration
 */
export interface StepRetryConfig {
  readonly maxAttempts: number;
  readonly delayMs: number;
  readonly backoffMultiplier: number;
  readonly retryableErrors?: readonly string[];
}

/**
 * Workflow step definition
 */
export interface WorkflowStep {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly type: string;
  readonly handler: string;
  readonly inputs?: StepIO;
  readonly outputs?: readonly string[];
  readonly timeout?: number;
  readonly retry?: StepRetryConfig;
  readonly condition?: StepCondition;
  readonly dependsOn?: readonly string[];
  readonly continueOnError?: boolean;
}

/**
 * Step execution result
 */
export interface StepResult {
  readonly stepId: string;
  readonly status: StepStatus;
  readonly startedAt: Date;
  readonly completedAt?: Date;
  readonly duration?: number;
  readonly outputs?: StepIO;
  readonly error?: string;
  readonly logs: readonly string[];
  readonly attempts: number;
}

/**
 * Workflow definition
 */
export interface WorkflowDefinition {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  readonly trigger: WorkflowTrigger;
  readonly executionMode: StepExecutionMode;
  readonly steps: readonly WorkflowStep[];
  readonly inputs?: StepIO;
  readonly outputs?: readonly string[];
  readonly timeout?: number;
  readonly metadata?: Record<string, unknown>;
  readonly enabled: boolean;
}

/**
 * Workflow execution context
 */
export interface WorkflowContext {
  readonly workflowId: string;
  readonly executionId: string;
  readonly trigger: WorkflowTrigger;
  readonly triggeredBy?: string;
  readonly inputs: StepIO;
  readonly variables: Map<string, unknown>;
  readonly stepResults: Map<string, StepResult>;
  readonly startedAt: Date;
  readonly metadata: Record<string, unknown>;
}

/**
 * Workflow execution result
 */
export interface WorkflowResult {
  readonly executionId: string;
  readonly workflowId: string;
  readonly status: WorkflowStatus;
  readonly startedAt: Date;
  readonly completedAt?: Date;
  readonly duration?: number;
  readonly stepResults: readonly StepResult[];
  readonly outputs?: StepIO;
  readonly error?: string;
}

/**
 * Workflow hook types
 */
export type WorkflowHookType =
  | 'beforeWorkflow'
  | 'afterWorkflow'
  | 'beforeStep'
  | 'afterStep'
  | 'onError'
  | 'onRetry'
  | 'onCancel';

/**
 * Workflow hook handler
 */
export interface WorkflowHook {
  readonly type: WorkflowHookType;
  readonly handler: (context: WorkflowContext, data?: unknown) => Promise<void>;
  readonly priority?: number;
}

/**
 * Step handler function signature
 */
export type StepHandler = (
  inputs: StepIO,
  context: WorkflowContext
) => Promise<StepIO>;

/**
 * Plugin metadata
 */
export interface PluginMetadata {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  readonly author?: string;
  readonly license?: string;
  readonly repository?: string;
  readonly keywords?: readonly string[];
}

/**
 * Workflow plugin interface
 */
export interface WorkflowPlugin {
  readonly metadata: PluginMetadata;
  readonly stepHandlers: Record<string, StepHandler>;
  readonly hooks?: readonly WorkflowHook[];
  readonly workflows?: readonly WorkflowDefinition[];

  /**
   * Initialize plugin
   */
  initialize?(): Promise<void>;

  /**
   * Cleanup plugin resources
   */
  cleanup?(): Promise<void>;
}

/**
 * Plugin registration options
 */
export interface PluginRegistrationOptions {
  readonly overrideExisting?: boolean;
  readonly validateSchema?: boolean;
  readonly enableHooks?: boolean;
}

/**
 * Workflow engine configuration
 */
export interface WorkflowEngineConfig {
  readonly maxConcurrentWorkflows: number;
  readonly defaultTimeout: number;
  readonly enableTelemetry: boolean;
  readonly enablePersistence: boolean;
  readonly persistencePath?: string;
  readonly retryDefaults: StepRetryConfig;
}

/**
 * Workflow execution options
 */
export interface WorkflowExecutionOptions {
  readonly inputs?: StepIO;
  readonly timeout?: number;
  readonly triggeredBy?: string;
  readonly metadata?: Record<string, unknown>;
  readonly dryRun?: boolean;
}

/**
 * Workflow event for pub/sub
 */
export interface WorkflowEvent {
  readonly type: string;
  readonly workflowId: string;
  readonly executionId: string;
  readonly timestamp: Date;
  readonly data?: unknown;
}

/**
 * Workflow TOML configuration section
 */
export interface WorkflowTomlConfig {
  readonly enabled: boolean;
  readonly maxConcurrent: number;
  readonly defaultTimeout: number;
  readonly plugins: readonly string[];
  readonly workflows: readonly WorkflowTomlDefinition[];
}

/**
 * Workflow definition in TOML format
 */
export interface WorkflowTomlDefinition {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  readonly trigger: WorkflowTrigger;
  readonly execution_mode: StepExecutionMode;
  readonly enabled: boolean;
  readonly steps: readonly WorkflowTomlStep[];
}

/**
 * Step definition in TOML format
 */
export interface WorkflowTomlStep {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly handler: string;
  readonly timeout?: number;
  readonly depends_on?: readonly string[];
  readonly continue_on_error?: boolean;
  readonly inputs?: Record<string, unknown>;
}
