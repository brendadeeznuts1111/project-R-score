/**
 * Core Command Domain Model
 * Business logic for command execution and management
 */

import { z } from "zod";

// Command Status Enum
export enum CommandStatus {
  REGISTERED = 'registered',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// Command Type Enum
export enum CommandType {
  SYSTEM = 'system',
  AGENT = 'agent',
  WORKFLOW = 'workflow',
  UTILITY = 'utility',
  DEVELOPMENT = 'development',
  DEPLOYMENT = 'deployment'
}

// Command Parameter Schema
export const CommandParameterSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['string', 'number', 'boolean', 'array', 'object']),
  description: z.string().max(200),
  required: z.boolean().default(false),
  defaultValue: z.any().optional(),
  validation: z.object({
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
    pattern: z.string().optional(),
    enum: z.array(z.any()).optional(),
    minimum: z.number().optional(),
    maximum: z.number().optional()
  }).optional()
});

export type CommandParameter = z.infer<typeof CommandParameterSchema>;

// Command Definition Schema
export const CommandDefinitionSchema = z.object({
  name: z.string().min(1).max(50).regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/),
  type: z.nativeEnum(CommandType),
  description: z.string().max(500),
  parameters: z.array(CommandParameterSchema).default([]),
  aliases: z.array(z.string()).default([]),
  permissions: z.array(z.string()).default([]), // Required permissions
  timeout: z.number().min(1000).max(3600000).default(300000), // 5 minutes
  retryPolicy: z.object({
    maxAttempts: z.number().min(1).max(10).default(3),
    backoffMultiplier: z.number().min(1).max(5).default(2),
    retryableErrors: z.array(z.string()).default(['ECONNRESET', 'ETIMEDOUT'])
  }).optional(),
  examples: z.array(z.object({
    command: z.string(),
    description: z.string().max(200)
  })).default([]),
  tags: z.array(z.string()).default([]),
  version: z.string().regex(/^\d+\.\d+\.\d+$/).default('1.0.0'),
  author: z.string().min(1),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type CommandDefinition = z.infer<typeof CommandDefinitionSchema>;

// Command Execution Schema
export const CommandExecutionSchema = z.object({
  id: z.string(),
  commandName: z.string(),
  parameters: z.record(z.any()),
  status: z.nativeEnum(CommandStatus),
  startedAt: z.date(),
  completedAt: z.date().optional(),
  duration: z.number().optional(), // milliseconds
  result: z.any().optional(),
  error: z.object({
    message: z.string(),
    code: z.string().optional(),
    stack: z.string().optional()
  }).optional(),
  metadata: z.record(z.any()).optional(),
  executedBy: z.string().optional(), // User or agent ID
  sessionId: z.string().optional()
});

export type CommandExecution = z.infer<typeof CommandExecutionSchema>;

// Command Context
export interface CommandContext {
  executionId: string;
  commandName: string;
  parameters: Record<string, any>;
  environment: {
    workingDirectory: string;
    environmentVariables: Record<string, string>;
    userId?: string;
    sessionId?: string;
    permissions: string[];
  };
  timeout: number;
  abortController: AbortController;
}

// Command Result
export interface CommandResult {
  success: boolean;
  result: any;
  executionTime: number;
  metadata?: Record<string, any>;
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };
}

// Command Handler Interface
export interface CommandHandler {
  canHandle(commandName: string): boolean;
  execute(context: CommandContext): Promise<CommandResult>;
  validateParameters(parameters: Record<string, any>): { valid: boolean; errors: string[] };
  getDefinition(): CommandDefinition;
}

// Base Command Handler
export abstract class BaseCommandHandler implements CommandHandler {
  protected definition: CommandDefinition;

  constructor(definition: CommandDefinition) {
    this.definition = definition;
  }

  canHandle(commandName: string): boolean {
    return this.definition.name === commandName ||
           this.definition.aliases.includes(commandName);
  }

  getDefinition(): CommandDefinition {
    return this.definition;
  }

  validateParameters(parameters: Record<string, any>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required parameters
    for (const param of this.definition.parameters) {
      if (param.required && !(param.name in parameters)) {
        errors.push(`Missing required parameter: ${param.name}`);
      }
    }

    // Validate parameter types and constraints
    for (const [key, value] of Object.entries(parameters)) {
      const param = this.definition.parameters.find(p => p.name === key);
      if (!param) {
        errors.push(`Unknown parameter: ${key}`);
        continue;
      }

      // Type validation
      if (!this.validateParameterType(value, param.type)) {
        errors.push(`Parameter ${key}: invalid type, expected ${param.type}`);
      }

      // Constraint validation
      if (param.validation) {
        const constraintErrors = this.validateParameterConstraints(value, param.validation);
        errors.push(...constraintErrors.map(err => `Parameter ${key}: ${err}`));
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  abstract execute(context: CommandContext): Promise<CommandResult>;

  private validateParameterType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return false;
    }
  }

  private validateParameterConstraints(value: any, validation: any): string[] {
    const errors: string[] = [];

    if (validation.minLength !== undefined && typeof value === 'string') {
      if (value.length < validation.minLength) {
        errors.push(`minimum length is ${validation.minLength}`);
      }
    }

    if (validation.maxLength !== undefined && typeof value === 'string') {
      if (value.length > validation.maxLength) {
        errors.push(`maximum length is ${validation.maxLength}`);
      }
    }

    if (validation.pattern && typeof value === 'string') {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        errors.push(`does not match pattern ${validation.pattern}`);
      }
    }

    if (validation.enum && Array.isArray(validation.enum)) {
      if (!validation.enum.includes(value)) {
        errors.push(`must be one of: ${validation.enum.join(', ')}`);
      }
    }

    if (validation.minimum !== undefined && typeof value === 'number') {
      if (value < validation.minimum) {
        errors.push(`minimum value is ${validation.minimum}`);
      }
    }

    if (validation.maximum !== undefined && typeof value === 'number') {
      if (value > validation.maximum) {
        errors.push(`maximum value is ${validation.maximum}`);
      }
    }

    return errors;
  }
}

// Command Registry
export class CommandRegistry {
  private handlers: Map<string, CommandHandler> = new Map();
  private aliases: Map<string, string> = new Map();
  private executions: Map<string, CommandExecution> = new Map();

  registerHandler(handler: CommandHandler): void {
    const definition = handler.getDefinition();

    // Register primary command
    this.handlers.set(definition.name, handler);

    // Register aliases
    for (const alias of definition.aliases) {
      this.aliases.set(alias, definition.name);
    }
  }

  getHandler(commandName: string): CommandHandler | undefined {
    // Check for alias resolution
    const resolvedName = this.aliases.get(commandName) || commandName;
    return this.handlers.get(resolvedName);
  }

  listCommands(filters?: {
    type?: CommandType;
    author?: string;
    tags?: string[];
  }): CommandDefinition[] {
    let commands = Array.from(this.handlers.values()).map(h => h.getDefinition());

    if (filters) {
      if (filters.type) {
        commands = commands.filter(c => c.type === filters.type);
      }

      if (filters.author) {
        commands = commands.filter(c => c.author === filters.author);
      }

      if (filters.tags && filters.tags.length > 0) {
        commands = commands.filter(c =>
          filters.tags!.some(tag => c.tags.includes(tag))
        );
      }
    }

    return commands;
  }

  async executeCommand(
    commandName: string,
    parameters: Record<string, any>,
    context: Partial<CommandContext> = {}
  ): Promise<CommandExecution> {
    const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const execution: CommandExecution = {
      id: executionId,
      commandName,
      parameters,
      status: CommandStatus.EXECUTING,
      startedAt: new Date(),
      executedBy: context.environment?.userId,
      sessionId: context.environment?.sessionId
    };

    this.executions.set(executionId, execution);

    try {
      const handler = this.getHandler(commandName);
      if (!handler) {
        throw new Error(`Command not found: ${commandName}`);
      }

      // Validate parameters
      const validation = handler.validateParameters(parameters);
      if (!validation.valid) {
        throw new Error(`Parameter validation failed: ${validation.errors.join(', ')}`);
      }

      // Check permissions
      if (context.environment?.permissions) {
        const requiredPermissions = handler.getDefinition().permissions;
        const hasPermissions = requiredPermissions.every(perm =>
          context.environment!.permissions.includes(perm)
        );

        if (!hasPermissions) {
          throw new Error(`Insufficient permissions. Required: ${requiredPermissions.join(', ')}`);
        }
      }

      // Create execution context
      const execContext: CommandContext = {
        executionId,
        commandName,
        parameters,
        environment: {
          workingDirectory: context.environment?.workingDirectory || process.cwd(),
          environmentVariables: context.environment?.environmentVariables || {},
          userId: context.environment?.userId,
          sessionId: context.environment?.sessionId,
          permissions: context.environment?.permissions || []
        },
        timeout: handler.getDefinition().timeout,
        abortController: new AbortController()
      };

      // Execute command
      const result = await this.executeWithTimeout(handler, execContext);

      // Update execution record
      execution.status = CommandStatus.COMPLETED;
      execution.completedAt = new Date();
      execution.duration = result.executionTime;
      execution.result = result.result;
      execution.metadata = result.metadata;

      return execution;

    } catch (error) {
      execution.status = CommandStatus.FAILED;
      execution.completedAt = new Date();
      execution.error = {
        message: error.message,
        code: (error as any).code,
        stack: (error as any).stack
      };

      throw error;
    }
  }

  async cancelExecution(executionId: string): Promise<boolean> {
    // Implementation would need to track abort controllers per execution
    return false; // Placeholder
  }

  getExecution(executionId: string): CommandExecution | undefined {
    return this.executions.get(executionId);
  }

  getRegistryStats(): {
    totalCommands: number;
    commandsByType: Record<string, number>;
    commandsByAuthor: Record<string, number>;
    totalExecutions: number;
    activeExecutions: number;
  } {
    const byType: Record<string, number> = {};
    const byAuthor: Record<string, number> = {};

    for (const handler of this.handlers.values()) {
      const def = handler.getDefinition();
      byType[def.type] = (byType[def.type] || 0) + 1;
      byAuthor[def.author] = (byAuthor[def.author] || 0) + 1;
    }

    const activeExecutions = Array.from(this.executions.values())
      .filter(e => e.status === CommandStatus.EXECUTING).length;

    return {
      totalCommands: this.handlers.size,
      commandsByType: byType,
      commandsByAuthor: byAuthor,
      totalExecutions: this.executions.size,
      activeExecutions
    };
  }

  private async executeWithTimeout(
    handler: CommandHandler,
    context: CommandContext
  ): Promise<CommandResult> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        context.abortController.abort();
        reject(new Error(`Command timeout after ${context.timeout}ms`));
      }, context.timeout);
    });

    return await Promise.race([
      handler.execute(context),
      timeoutPromise
    ]);
  }
}

// Predefined Command Handlers

// Agent Command Handler
export class AgentCommandHandler extends BaseCommandHandler {
  constructor() {
    super({
      name: 'agent',
      type: CommandType.AGENT,
      description: 'Manage AI agents',
      parameters: [
        {
          name: 'action',
          type: 'string',
          description: 'Action to perform (start, stop, list, status)',
          required: true,
          validation: { enum: ['start', 'stop', 'list', 'status'] }
        },
        {
          name: 'agentId',
          type: 'string',
          description: 'Agent ID for start/stop/status actions',
          required: false
        }
      ],
      aliases: ['agents'],
      permissions: ['agent.manage'],
      examples: [
        { command: 'agent list', description: 'List all agents' },
        { command: 'agent start --agentId coder-001', description: 'Start a specific agent' }
      ],
      tags: ['agent', 'management'],
      author: 'system',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  async execute(context: CommandContext): Promise<CommandResult> {
    const startTime = Date.now();

    try {
      const { action, agentId } = context.parameters;

      switch (action) {
        case 'list':
          // Would integrate with agent registry
          return {
            success: true,
            result: { agents: [] },
            executionTime: Date.now() - startTime
          };

        case 'start':
          if (!agentId) throw new Error('agentId required for start action');
          // Would start the agent
          return {
            success: true,
            result: { agentId, status: 'started' },
            executionTime: Date.now() - startTime
          };

        case 'stop':
          if (!agentId) throw new Error('agentId required for stop action');
          // Would stop the agent
          return {
            success: true,
            result: { agentId, status: 'stopped' },
            executionTime: Date.now() - startTime
          };

        case 'status':
          if (!agentId) throw new Error('agentId required for status action');
          // Would get agent status
          return {
            success: true,
            result: { agentId, status: 'active' },
            executionTime: Date.now() - startTime
          };

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      return {
        success: false,
        result: null,
        executionTime: Date.now() - startTime,
        error: {
          message: error.message,
          code: 'AGENT_COMMAND_ERROR'
        }
      };
    }
  }
}

// Workflow Command Handler
export class WorkflowCommandHandler extends BaseCommandHandler {
  constructor() {
    super({
      name: 'workflow',
      type: CommandType.WORKFLOW,
      description: 'Manage workflows',
      parameters: [
        {
          name: 'action',
          type: 'string',
          description: 'Action to perform (run, list, status, cancel)',
          required: true,
          validation: { enum: ['run', 'list', 'status', 'cancel'] }
        },
        {
          name: 'workflowId',
          type: 'string',
          description: 'Workflow ID for run/status/cancel actions',
          required: false
        },
        {
          name: 'executionId',
          type: 'string',
          description: 'Execution ID for status/cancel actions',
          required: false
        }
      ],
      aliases: ['workflows'],
      permissions: ['workflow.manage'],
      examples: [
        { command: 'workflow list', description: 'List all workflows' },
        { command: 'workflow run --workflowId deploy-main', description: 'Execute a workflow' }
      ],
      tags: ['workflow', 'automation'],
      author: 'system',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  async execute(context: CommandContext): Promise<CommandResult> {
    const startTime = Date.now();

    try {
      const { action, workflowId, executionId } = context.parameters;

      switch (action) {
        case 'list':
          // Would integrate with workflow registry
          return {
            success: true,
            result: { workflows: [] },
            executionTime: Date.now() - startTime
          };

        case 'run':
          if (!workflowId) throw new Error('workflowId required for run action');
          // Would execute the workflow
          return {
            success: true,
            result: { workflowId, executionId: `exec-${Date.now()}` },
            executionTime: Date.now() - startTime
          };

        case 'status':
          if (!executionId) throw new Error('executionId required for status action');
          // Would get execution status
          return {
            success: true,
            result: { executionId, status: 'running' },
            executionTime: Date.now() - startTime
          };

        case 'cancel':
          if (!executionId) throw new Error('executionId required for cancel action');
          // Would cancel the execution
          return {
            success: true,
            result: { executionId, status: 'cancelled' },
            executionTime: Date.now() - startTime
          };

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      return {
        success: false,
        result: null,
        executionTime: Date.now() - startTime,
        error: {
          message: error.message,
          code: 'WORKFLOW_COMMAND_ERROR'
        }
      };
    }
  }
}

// Factory function for creating command registry with default handlers
export function createCommandRegistry(): CommandRegistry {
  const registry = new CommandRegistry();

  // Register default command handlers
  registry.registerHandler(new AgentCommandHandler());
  registry.registerHandler(new WorkflowCommandHandler());

  return registry;
}
