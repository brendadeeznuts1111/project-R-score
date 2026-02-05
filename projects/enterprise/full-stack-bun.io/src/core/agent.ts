/**
 * Core Agent Domain Model
 * Central business logic for AI agents and their lifecycle
 */

import { z } from "zod";

// Agent Status Enum
export enum AgentStatus {
  CREATED = 'created',
  INITIALIZING = 'initializing',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ERROR = 'error',
  TERMINATED = 'terminated'
}

// Agent Type Enum
export enum AgentType {
  CODER = 'coder',
  REVIEWER = 'reviewer',
  INSTALLER = 'installer',
  WORKFLOW = 'workflow',
  SECURITY = 'security',
  BUILDER = 'builder'
}

// Agent Capabilities Schema
export const AgentCapabilitiesSchema = z.object({
  fileSystem: z.object({
    read: z.boolean(),
    write: z.boolean(),
    execute: z.boolean()
  }),
  network: z.object({
    http: z.boolean(),
    websockets: z.boolean(),
    externalAPIs: z.boolean()
  }),
  process: z.object({
    spawn: z.boolean(),
    shell: z.boolean()
  }),
  database: z.object({
    read: z.boolean(),
    write: z.boolean(),
    schema: z.boolean()
  }),
  ai: z.object({
    codeGeneration: z.boolean(),
    analysis: z.boolean(),
    transformation: z.boolean()
  })
});

export type AgentCapabilities = z.infer<typeof AgentCapabilitiesSchema>;

// Agent Configuration Schema
export const AgentConfigSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.nativeEnum(AgentType),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().max(500),
  capabilities: AgentCapabilitiesSchema,
  maxConcurrency: z.number().min(1).max(100).default(1),
  timeout: z.number().min(1000).max(3600000).default(300000), // 5 minutes
  retryPolicy: z.object({
    maxAttempts: z.number().min(1).max(10).default(3),
    backoffMultiplier: z.number().min(1).max(5).default(2),
    initialDelay: z.number().min(100).max(10000).default(1000)
  }),
  resourceLimits: z.object({
    maxMemoryMB: z.number().min(10).max(4096).default(512),
    maxCpuPercent: z.number().min(1).max(100).default(50),
    maxFileSizeMB: z.number().min(1).max(1000).default(100)
  })
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;

// Agent Runtime State
export interface AgentState {
  id: string;
  status: AgentStatus;
  config: AgentConfig;
  createdAt: Date;
  startedAt?: Date;
  lastActivity?: Date;
  currentTask?: string;
  taskQueue: string[];
  metrics: {
    tasksCompleted: number;
    tasksFailed: number;
    totalRuntime: number;
    averageResponseTime: number;
    errorRate: number;
  };
  capabilities: AgentCapabilities;
}

// Agent Execution Context
export interface ExecutionContext {
  agentId: string;
  taskId: string;
  parameters: Record<string, any>;
  environment: {
    workingDirectory: string;
    environmentVariables: Record<string, string>;
    availableCommands: string[];
  };
  constraints: {
    timeout: number;
    memoryLimit: number;
    networkAccess: boolean;
  };
}

// Agent Result Schema
export const AgentResultSchema = z.object({
  taskId: z.string(),
  agentId: z.string(),
  status: z.enum(['success', 'error', 'timeout', 'cancelled']),
  result: z.any(),
  executionTime: z.number(),
  errorMessage: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

export type AgentResult = z.infer<typeof AgentResultSchema>;

// Core Agent Class
export class Agent {
  private state: AgentState;
  private activeTasks: Map<string, Promise<any>> = new Map();

  constructor(config: AgentConfig) {
    this.state = {
      id: `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: AgentStatus.CREATED,
      config,
      createdAt: new Date(),
      taskQueue: [],
      metrics: {
        tasksCompleted: 0,
        tasksFailed: 0,
        totalRuntime: 0,
        averageResponseTime: 0,
        errorRate: 0
      },
      capabilities: config.capabilities
    };
  }

  // Get current state
  getState(): AgentState {
    return { ...this.state };
  }

  // Start agent
  async start(): Promise<void> {
    if (this.state.status !== AgentStatus.CREATED) {
      throw new Error(`Agent is already ${this.state.status}`);
    }

    this.state.status = AgentStatus.INITIALIZING;
    this.state.startedAt = new Date();

    try {
      // Initialize agent capabilities
      await this.initializeCapabilities();

      this.state.status = AgentStatus.ACTIVE;
      console.log(`Agent ${this.state.config.name} started successfully`);
    } catch (error) {
      this.state.status = AgentStatus.ERROR;
      throw error;
    }
  }

  // Stop agent
  async stop(): Promise<void> {
    this.state.status = AgentStatus.TERMINATED;

    // Cancel all active tasks
    for (const [taskId, task] of this.activeTasks) {
      // In a real implementation, we'd have cancellation tokens
      console.log(`Cancelling task ${taskId}`);
    }

    this.activeTasks.clear();
    console.log(`Agent ${this.state.config.name} stopped`);
  }

  // Execute task
  async executeTask(context: ExecutionContext): Promise<AgentResult> {
    if (this.state.status !== AgentStatus.ACTIVE) {
      throw new Error(`Agent is not active (status: ${this.state.status})`);
    }

    const startTime = Date.now();
    this.state.lastActivity = new Date();
    this.state.currentTask = context.taskId;

    try {
      // Validate capabilities for this task
      this.validateCapabilities(context);

      // Execute the task
      const result = await this.performTask(context);

      const executionTime = Date.now() - startTime;
      this.updateMetrics(true, executionTime);

      return {
        taskId: context.taskId,
        agentId: this.state.id,
        status: 'success',
        result,
        executionTime,
        metadata: {
          agentType: this.state.config.type,
          agentVersion: this.state.config.version
        }
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.updateMetrics(false, executionTime);

      return {
        taskId: context.taskId,
        agentId: this.state.id,
        status: 'error',
        result: null,
        executionTime,
        errorMessage: error.message,
        metadata: {
          agentType: this.state.config.type,
          agentVersion: this.state.config.version
        }
      };

    } finally {
      this.state.currentTask = undefined;
    }
  }

  // Queue task for execution
  queueTask(context: ExecutionContext): string {
    this.state.taskQueue.push(context.taskId);
    return context.taskId;
  }

  // Get queue status
  getQueueStatus(): { queued: number; active: number } {
    return {
      queued: this.state.taskQueue.length,
      active: this.activeTasks.size
    };
  }

  private async initializeCapabilities(): Promise<void> {
    // Validate that required capabilities are available
    const capabilities = this.state.capabilities;

    // Check file system access
    if (capabilities.fileSystem.read || capabilities.fileSystem.write) {
      // Verify file system permissions
      console.log('Initializing file system capabilities');
    }

    // Check network access
    if (capabilities.network.http || capabilities.network.websockets) {
      // Verify network connectivity
      console.log('Initializing network capabilities');
    }

    // Check process execution
    if (capabilities.process.spawn || capabilities.process.shell) {
      // Verify process execution permissions
      console.log('Initializing process capabilities');
    }

    // Additional capability checks...
  }

  private validateCapabilities(context: ExecutionContext): void {
    // Validate that agent has required capabilities for this task
    // This would check the task requirements against agent capabilities
    console.log(`Validating capabilities for task ${context.taskId}`);
  }

  private async performTask(context: ExecutionContext): Promise<any> {
    // This is the core task execution logic
    // Different agent types would override this method

    switch (this.state.config.type) {
      case AgentType.CODER:
        return this.performCodeGeneration(context);

      case AgentType.REVIEWER:
        return this.performCodeReview(context);

      case AgentType.INSTALLER:
        return this.performPackageInstallation(context);

      case AgentType.WORKFLOW:
        return this.performWorkflowExecution(context);

      case AgentType.SECURITY:
        return this.performSecurityAnalysis(context);

      case AgentType.BUILDER:
        return this.performBuildExecution(context);

      default:
        throw new Error(`Unknown agent type: ${this.state.config.type}`);
    }
  }

  private async performCodeGeneration(context: ExecutionContext): Promise<any> {
    // Implementation would use AI models for code generation
    return {
      type: 'code_generation',
      files: [],
      message: 'Code generation completed'
    };
  }

  private async performCodeReview(context: ExecutionContext): Promise<any> {
    // Implementation would analyze code for issues
    return {
      type: 'code_review',
      issues: [],
      score: 85,
      message: 'Code review completed'
    };
  }

  private async performPackageInstallation(context: ExecutionContext): Promise<any> {
    // Implementation would install packages
    return {
      type: 'package_installation',
      packages: [],
      message: 'Package installation completed'
    };
  }

  private async performWorkflowExecution(context: ExecutionContext): Promise<any> {
    // Implementation would execute workflows
    return {
      type: 'workflow_execution',
      steps: [],
      message: 'Workflow execution completed'
    };
  }

  private async performSecurityAnalysis(context: ExecutionContext): Promise<any> {
    // Implementation would perform security analysis
    return {
      type: 'security_analysis',
      vulnerabilities: [],
      message: 'Security analysis completed'
    };
  }

  private async performBuildExecution(context: ExecutionContext): Promise<any> {
    // Implementation would execute builds
    return {
      type: 'build_execution',
      artifacts: [],
      message: 'Build execution completed'
    };
  }

  private updateMetrics(success: boolean, executionTime: number): void {
    const metrics = this.state.metrics;

    if (success) {
      metrics.tasksCompleted++;
    } else {
      metrics.tasksFailed++;
    }

    metrics.totalRuntime += executionTime;

    // Update average response time
    const totalTasks = metrics.tasksCompleted + metrics.tasksFailed;
    metrics.averageResponseTime = metrics.totalRuntime / totalTasks;

    // Update error rate
    metrics.errorRate = metrics.tasksFailed / totalTasks;
  }
}

// Factory function for creating agents
export function createAgent(config: AgentConfig): Agent {
  // Validate configuration
  AgentConfigSchema.parse(config);

  return new Agent(config);
}

// Agent registry for managing multiple agents
export class AgentRegistry {
  private agents: Map<string, Agent> = new Map();
  private activeAgents: Set<string> = new Set();

  registerAgent(config: AgentConfig): string {
    const agent = createAgent(config);
    this.agents.set(agent.getState().id, agent);
    return agent.getState().id;
  }

  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  async startAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    await agent.start();
    this.activeAgents.add(agentId);
  }

  async stopAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    await agent.stop();
    this.activeAgents.delete(agentId);
  }

  getActiveAgents(): Agent[] {
    return Array.from(this.activeAgents).map(id => this.agents.get(id)!);
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  getRegistryStats(): {
    totalAgents: number;
    activeAgents: number;
    agentTypes: Record<string, number>;
  } {
    const agentTypes: Record<string, number> = {};

    for (const agent of this.agents.values()) {
      const type = agent.getState().config.type;
      agentTypes[type] = (agentTypes[type] || 0) + 1;
    }

    return {
      totalAgents: this.agents.size,
      activeAgents: this.activeAgents.size,
      agentTypes
    };
  }
}
