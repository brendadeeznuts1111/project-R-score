/**
 * Core Workflow Domain Model
 * Business logic for workflow orchestration and execution
 */

import { z } from "zod";

// Workflow Status Enum
export enum WorkflowStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// Workflow Step Types
export enum WorkflowStepType {
  TASK = 'task',
  DECISION = 'decision',
  PARALLEL = 'parallel',
  LOOP = 'loop',
  HUMAN_APPROVAL = 'human_approval',
  WEBHOOK = 'webhook',
  DELAY = 'delay'
}

// Workflow Step Schema
export const WorkflowStepSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  type: z.nativeEnum(WorkflowStepType),
  description: z.string().max(500).optional(),
  config: z.record(z.any()),
  inputs: z.array(z.string()).default([]),
  outputs: z.array(z.string()).default([]),
  timeout: z.number().min(1000).max(3600000).default(300000), // 5 minutes
  retryPolicy: z.object({
    maxAttempts: z.number().min(1).max(10).default(3),
    backoffMultiplier: z.number().min(1).max(5).default(2)
  }).optional(),
  conditions: z.record(z.any()).optional(),
  onError: z.array(z.string()).default([]), // Step IDs to execute on error
  onSuccess: z.array(z.string()).default([]) // Step IDs to execute on success
});

export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;

// Workflow Execution Schema
export const WorkflowExecutionSchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  status: z.nativeEnum(WorkflowStatus),
  startedAt: z.date(),
  completedAt: z.date().optional(),
  currentStep: z.string().optional(),
  context: z.record(z.any()),
  results: z.record(z.any()),
  error: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

export type WorkflowExecution = z.infer<typeof WorkflowExecutionSchema>;

// Workflow Definition Schema
export const WorkflowDefinitionSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  author: z.string().min(1),
  tags: z.array(z.string()).default([]),
  steps: z.array(WorkflowStepSchema).min(1),
  variables: z.record(z.any()).default({}),
  triggers: z.array(z.object({
    type: z.enum(['manual', 'schedule', 'webhook', 'event']),
    config: z.record(z.any())
  })).default([]),
  permissions: z.object({
    execute: z.array(z.string()).default([]), // Agent IDs or roles
    modify: z.array(z.string()).default([]), // Agent IDs or roles
    view: z.array(z.string()).default([]) // Agent IDs or roles
  }).default({}),
  settings: z.object({
    maxConcurrency: z.number().min(1).max(100).default(1),
    timeout: z.number().min(1000).max(86400000).default(3600000), // 1 hour
    retryOnFailure: z.boolean().default(true),
    enableLogging: z.boolean().default(true),
    notifyOnCompletion: z.boolean().default(false)
  }).default({}),
  createdAt: z.date(),
  updatedAt: z.date(),
  publishedAt: z.date().optional()
});

export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;

// Workflow Engine Interface
export interface WorkflowEngine {
  executeWorkflow(definition: WorkflowDefinition, context?: Record<string, any>): Promise<WorkflowExecution>;
  getExecutionStatus(executionId: string): Promise<WorkflowExecution | null>;
  cancelExecution(executionId: string): Promise<boolean>;
  validateWorkflow(definition: WorkflowDefinition): { valid: boolean; errors: string[] };
}

// Workflow Execution Context
export interface ExecutionContext {
  executionId: string;
  workflowId: string;
  stepId: string;
  variables: Record<string, any>;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  startTime: Date;
  timeout: number;
  retryCount: number;
  parentExecutionId?: string;
}

// Step Execution Result
export interface StepResult {
  stepId: string;
  status: 'success' | 'error' | 'timeout' | 'skipped';
  result: any;
  executionTime: number;
  error?: string;
  metadata?: Record<string, any>;
}

// Core Workflow Engine Implementation
export class WorkflowEngineImpl implements WorkflowEngine {
  private executions: Map<string, WorkflowExecution> = new Map();
  private activeExecutions: Map<string, AbortController> = new Map();

  async executeWorkflow(
    definition: WorkflowDefinition,
    initialContext: Record<string, any> = {}
  ): Promise<WorkflowExecution> {
    // Validate workflow before execution
    const validation = this.validateWorkflow(definition);
    if (!validation.valid) {
      throw new Error(`Invalid workflow: ${validation.errors.join(', ')}`);
    }

    const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const abortController = new AbortController();

    const execution: WorkflowExecution = {
      id: executionId,
      workflowId: definition.id,
      status: WorkflowStatus.RUNNING,
      startedAt: new Date(),
      context: { ...definition.variables, ...initialContext },
      results: {}
    };

    this.executions.set(executionId, execution);
    this.activeExecutions.set(executionId, abortController);

    try {
      // Execute workflow asynchronously
      this.executeWorkflowAsync(definition, execution, abortController.signal)
        .then(() => {
          execution.status = WorkflowStatus.COMPLETED;
          execution.completedAt = new Date();
        })
        .catch((error) => {
          execution.status = WorkflowStatus.FAILED;
          execution.completedAt = new Date();
          execution.error = error.message;
        })
        .finally(() => {
          this.activeExecutions.delete(executionId);
        });

      return execution;

    } catch (error) {
      execution.status = WorkflowStatus.FAILED;
      execution.error = error.message;
      execution.completedAt = new Date();
      this.activeExecutions.delete(executionId);
      throw error;
    }
  }

  async getExecutionStatus(executionId: string): Promise<WorkflowExecution | null> {
    return this.executions.get(executionId) || null;
  }

  async cancelExecution(executionId: string): Promise<boolean> {
    const controller = this.activeExecutions.get(executionId);
    if (controller) {
      controller.abort();
      this.activeExecutions.delete(executionId);

      const execution = this.executions.get(executionId);
      if (execution) {
        execution.status = WorkflowStatus.CANCELLED;
        execution.completedAt = new Date();
      }

      return true;
    }
    return false;
  }

  validateWorkflow(definition: WorkflowDefinition): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate basic structure
    if (!definition.steps || definition.steps.length === 0) {
      errors.push('Workflow must have at least one step');
    }

    // Check for duplicate step IDs
    const stepIds = new Set<string>();
    for (const step of definition.steps) {
      if (stepIds.has(step.id)) {
        errors.push(`Duplicate step ID: ${step.id}`);
      }
      stepIds.add(step.id);
    }

    // Validate step connections
    for (const step of definition.steps) {
      // Check onSuccess references
      for (const nextStepId of step.onSuccess) {
        if (!stepIds.has(nextStepId)) {
          errors.push(`Step ${step.id} references unknown onSuccess step: ${nextStepId}`);
        }
      }

      // Check onError references
      for (const errorStepId of step.onError) {
        if (!stepIds.has(errorStepId)) {
          errors.push(`Step ${step.id} references unknown onError step: ${errorStepId}`);
        }
      }
    }

    // Check for cycles (basic check)
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (stepId: string): boolean => {
      if (recursionStack.has(stepId)) return true;
      if (visited.has(stepId)) return false;

      visited.add(stepId);
      recursionStack.add(stepId);

      const step = definition.steps.find(s => s.id === stepId);
      if (step) {
        for (const nextStepId of [...step.onSuccess, ...step.onError]) {
          if (hasCycle(nextStepId)) return true;
        }
      }

      recursionStack.delete(stepId);
      return false;
    };

    // Check each step for cycles
    for (const step of definition.steps) {
      if (hasCycle(step.id)) {
        errors.push(`Workflow contains a cycle involving step: ${step.id}`);
        break;
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private async executeWorkflowAsync(
    definition: WorkflowDefinition,
    execution: WorkflowExecution,
    abortSignal: AbortSignal
  ): Promise<void> {
    const executedSteps = new Set<string>();
    const pendingSteps = new Set<string>();
    const stepResults = new Map<string, StepResult>();

    // Find starting steps (steps with no inputs)
    const startingSteps = definition.steps.filter(step =>
      step.inputs.length === 0 || step.type === WorkflowStepType.HUMAN_APPROVAL
    );

    if (startingSteps.length === 0) {
      throw new Error('No starting steps found in workflow');
    }

    // Execute steps in topological order
    for (const step of startingSteps) {
      await this.executeStep(step, execution, stepResults, abortSignal);
    }

    // Continue executing dependent steps
    while (true) {
      const nextSteps = this.findNextExecutableSteps(definition, stepResults, executedSteps);

      if (nextSteps.length === 0) break;

      // Execute steps in parallel if possible
      const promises = nextSteps.map(step =>
        this.executeStep(step, execution, stepResults, abortSignal)
      );

      await Promise.all(promises);
    }

    // Update execution results
    execution.results = Object.fromEntries(stepResults);
  }

  private findNextExecutableSteps(
    definition: WorkflowDefinition,
    stepResults: Map<string, StepResult>,
    executedSteps: Set<string>
  ): WorkflowStep[] {
    const nextSteps: WorkflowStep[] = [];

    for (const step of definition.steps) {
      if (executedSteps.has(step.id)) continue;

      // Check if all input conditions are met
      const canExecute = this.canExecuteStep(step, stepResults);
      if (canExecute) {
        nextSteps.push(step);
      }
    }

    return nextSteps;
  }

  private canExecuteStep(
    step: WorkflowStep,
    stepResults: Map<string, StepResult>
  ): boolean {
    // Check input dependencies
    for (const inputStepId of step.inputs) {
      const inputResult = stepResults.get(inputStepId);
      if (!inputResult || inputResult.status !== 'success') {
        return false;
      }
    }

    return true;
  }

  private async executeStep(
    step: WorkflowStep,
    execution: WorkflowExecution,
    stepResults: Map<string, StepResult>,
    abortSignal: AbortSignal
  ): Promise<void> {
    const startTime = Date.now();
    execution.currentStep = step.id;

    try {
      // Create execution context
      const context: ExecutionContext = {
        executionId: execution.id,
        workflowId: execution.workflowId,
        stepId: step.id,
        variables: execution.context,
        inputs: {},
        outputs: {},
        startTime: new Date(),
        timeout: step.timeout,
        retryCount: 0
      };

      // Prepare inputs from previous step results
      for (const inputStepId of step.inputs) {
        const inputResult = stepResults.get(inputStepId);
        if (inputResult) {
          context.inputs[inputStepId] = inputResult.result;
        }
      }

      // Execute the step based on its type
      const result = await this.executeStepByType(step, context, abortSignal);

      const stepResult: StepResult = {
        stepId: step.id,
        status: 'success',
        result: result,
        executionTime: Date.now() - startTime,
        metadata: {
          stepType: step.type,
          retryCount: context.retryCount
        }
      };

      stepResults.set(step.id, stepResult);

    } catch (error) {
      const stepResult: StepResult = {
        stepId: step.id,
        status: 'error',
        result: null,
        executionTime: Date.now() - startTime,
        error: error.message
      };

      stepResults.set(step.id, stepResult);
      throw error;
    }
  }

  private async executeStepByType(
    step: WorkflowStep,
    context: ExecutionContext,
    abortSignal: AbortSignal
  ): Promise<any> {
    switch (step.type) {
      case WorkflowStepType.TASK:
        return this.executeTaskStep(step, context, abortSignal);

      case WorkflowStepType.DECISION:
        return this.executeDecisionStep(step, context);

      case WorkflowStepType.PARALLEL:
        return this.executeParallelStep(step, context, abortSignal);

      case WorkflowStepType.LOOP:
        return this.executeLoopStep(step, context, abortSignal);

      case WorkflowStepType.HUMAN_APPROVAL:
        return this.executeHumanApprovalStep(step, context);

      case WorkflowStepType.WEBHOOK:
        return this.executeWebhookStep(step, context);

      case WorkflowStepType.DELAY:
        return this.executeDelayStep(step, context, abortSignal);

      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  private async executeTaskStep(
    step: WorkflowStep,
    context: ExecutionContext,
    abortSignal: AbortSignal
  ): Promise<any> {
    // Execute task with retry logic
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= (step.retryPolicy?.maxAttempts || 3); attempt++) {
      try {
        context.retryCount = attempt;

        // Check for abort signal
        if (abortSignal.aborted) {
          throw new Error('Execution cancelled');
        }

        // Execute the actual task (this would integrate with agents)
        return await this.executeTask(step.config, context);

      } catch (error) {
        lastError = error as Error;

        if (attempt < (step.retryPolicy?.maxAttempts || 3)) {
          // Wait before retry with exponential backoff
          const delay = (step.retryPolicy?.initialDelay || 1000) *
                       Math.pow(step.retryPolicy?.backoffMultiplier || 2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Task execution failed after retries');
  }

  private async executeDecisionStep(step: WorkflowStep, context: ExecutionContext): Promise<any> {
    // Evaluate decision conditions
    const conditions = step.config.conditions || [];
    const variables = { ...context.variables, ...context.inputs };

    for (const condition of conditions) {
      if (this.evaluateCondition(condition, variables)) {
        return { decision: condition.name, result: true };
      }
    }

    return { decision: 'default', result: false };
  }

  private async executeParallelStep(
    step: WorkflowStep,
    context: ExecutionContext,
    abortSignal: AbortSignal
  ): Promise<any> {
    // Execute multiple sub-steps in parallel
    const subSteps = step.config.steps || [];
    const promises = subSteps.map(subStep =>
      this.executeTask(subStep.config, context)
    );

    return await Promise.all(promises);
  }

  private async executeLoopStep(
    step: WorkflowStep,
    context: ExecutionContext,
    abortSignal: AbortSignal
  ): Promise<any> {
    // Execute step repeatedly based on loop configuration
    const results: any[] = [];
    const maxIterations = step.config.maxIterations || 10;
    const condition = step.config.condition;

    for (let i = 0; i < maxIterations; i++) {
      if (abortSignal.aborted) break;

      // Check loop condition
      if (condition && !this.evaluateCondition(condition, context.variables)) {
        break;
      }

      const result = await this.executeTask(step.config.task, context);
      results.push(result);

      // Update loop variable
      context.variables[step.config.loopVariable || 'loopIndex'] = i + 1;
    }

    return results;
  }

  private async executeHumanApprovalStep(step: WorkflowStep, context: ExecutionContext): Promise<any> {
    // Human approval step - would integrate with UI notifications
    return {
      approved: false, // Would be set by human interaction
      approver: null,
      timestamp: new Date().toISOString(),
      comments: step.config.defaultMessage || 'Awaiting approval'
    };
  }

  private async executeWebhookStep(step: WorkflowStep, context: ExecutionContext): Promise<any> {
    // Execute webhook call
    const url = step.config.url;
    const method = step.config.method || 'POST';
    const headers = step.config.headers || {};
    const body = step.config.body ? JSON.stringify(step.config.body) : undefined;

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  private async executeDelayStep(
    step: WorkflowStep,
    context: ExecutionContext,
    abortSignal: AbortSignal
  ): Promise<any> {
    const delay = step.config.delay || 1000;

    // Wait with abort support
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, delay);

      abortSignal.addEventListener('abort', () => {
        clearTimeout(timeout);
        reject(new Error('Delay cancelled'));
      });
    });

    return { delayed: delay };
  }

  private async executeTask(config: any, context: ExecutionContext): Promise<any> {
    // This would integrate with the agent system
    // For now, return a mock result
    return {
      task: config.taskType || 'generic',
      result: 'Task executed successfully',
      timestamp: new Date().toISOString()
    };
  }

  private evaluateCondition(condition: any, variables: Record<string, any>): boolean {
    // Simple condition evaluation (would be more sophisticated in real implementation)
    try {
      const left = variables[condition.left];
      const right = condition.right;
      const operator = condition.operator || '==';

      switch (operator) {
        case '==': return left == right;
        case '===': return left === right;
        case '!=': return left != right;
        case '!==': return left !== right;
        case '>': return left > right;
        case '<': return left < right;
        case '>=': return left >= right;
        case '<=': return left <= right;
        default: return false;
      }
    } catch {
      return false;
    }
  }
}

// Factory function for creating workflow engine
export function createWorkflowEngine(): WorkflowEngine {
  return new WorkflowEngineImpl();
}

// Workflow Registry for managing workflow definitions
export class WorkflowRegistry {
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private engine: WorkflowEngine;

  constructor(engine?: WorkflowEngine) {
    this.engine = engine || createWorkflowEngine();
  }

  registerWorkflow(definition: WorkflowDefinition): void {
    // Validate definition
    WorkflowDefinitionSchema.parse(definition);

    // Validate workflow logic
    const validation = this.engine.validateWorkflow(definition);
    if (!validation.valid) {
      throw new Error(`Invalid workflow: ${validation.errors.join(', ')}`);
    }

    this.workflows.set(definition.id, definition);
  }

  getWorkflow(workflowId: string): WorkflowDefinition | undefined {
    return this.workflows.get(workflowId);
  }

  listWorkflows(filters?: {
    author?: string;
    tags?: string[];
    status?: WorkflowStatus;
  }): WorkflowDefinition[] {
    let workflows = Array.from(this.workflows.values());

    if (filters) {
      if (filters.author) {
        workflows = workflows.filter(w => w.author === filters.author);
      }

      if (filters.tags && filters.tags.length > 0) {
        workflows = workflows.filter(w =>
          filters.tags!.some(tag => w.tags.includes(tag))
        );
      }

      if (filters.status) {
        // Would need to track workflow status separately
      }
    }

    return workflows;
  }

  async executeWorkflow(
    workflowId: string,
    context?: Record<string, any>
  ): Promise<WorkflowExecution> {
    const definition = this.workflows.get(workflowId);
    if (!definition) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    return await this.engine.executeWorkflow(definition, context);
  }

  updateWorkflow(workflowId: string, updates: Partial<WorkflowDefinition>): void {
    const existing = this.workflows.get(workflowId);
    if (!existing) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const updated = { ...existing, ...updates, updatedAt: new Date() };
    WorkflowDefinitionSchema.parse(updated);

    // Re-validate workflow logic
    const validation = this.engine.validateWorkflow(updated);
    if (!validation.valid) {
      throw new Error(`Invalid workflow update: ${validation.errors.join(', ')}`);
    }

    this.workflows.set(workflowId, updated);
  }

  deleteWorkflow(workflowId: string): boolean {
    return this.workflows.delete(workflowId);
  }

  getRegistryStats(): {
    totalWorkflows: number;
    workflowsByAuthor: Record<string, number>;
    workflowsByTag: Record<string, number>;
  } {
    const byAuthor: Record<string, number> = {};
    const byTag: Record<string, number> = {};

    for (const workflow of this.workflows.values()) {
      // Count by author
      byAuthor[workflow.author] = (byAuthor[workflow.author] || 0) + 1;

      // Count by tags
      for (const tag of workflow.tags) {
        byTag[tag] = (byTag[tag] || 0) + 1;
      }
    }

    return {
      totalWorkflows: this.workflows.size,
      workflowsByAuthor: byAuthor,
      workflowsByTag: byTag
    };
  }
}
