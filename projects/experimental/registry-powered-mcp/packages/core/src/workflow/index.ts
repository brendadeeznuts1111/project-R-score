/**
 * Workflow Plugin System v2.4.1 - Hardened Baseline
 * Complete Workflow Engine for Registry-Powered-MCP
 *
 * Golden Operational Matrix Entry:
 * | Infrastructure ID       | Logic Tier     | Resource Tax | Protocol        | Status     |
 * | Workflow-Engine         | Level 3: Control | CPU: <2%   | Native Bun APIs | ACTIVE     |
 *
 * Architecture:
 * - Type-safe workflow definitions
 * - Plugin-based extensibility
 * - Native Bun APIs for maximum performance
 * - TOML configuration support
 * - Comprehensive hook system
 *
 * Powered by Bun 1.3.6 Native APIs
 */

// Types
export type {
  WorkflowStatus,
  StepStatus,
  WorkflowTrigger,
  StepExecutionMode,
  StepIO,
  StepCondition,
  StepRetryConfig,
  WorkflowStep,
  StepResult,
  WorkflowDefinition,
  WorkflowContext,
  WorkflowResult,
  WorkflowHookType,
  WorkflowHook,
  StepHandler,
  PluginMetadata,
  WorkflowPlugin,
  PluginRegistrationOptions,
  WorkflowEngineConfig,
  WorkflowExecutionOptions,
  WorkflowEvent,
  WorkflowTomlConfig,
  WorkflowTomlDefinition,
  WorkflowTomlStep,
} from './types';

// Engine
export { WorkflowEngine, createWorkflowEngine } from './engine';

// Plugin Registry
export {
  PluginRegistry,
  createPluginRegistry,
  definePlugin,
  type PluginRegistryConfig,
} from './plugin-registry';

// Configuration
export {
  WorkflowConfigLoader,
  loadWorkflowsFromConfig,
  type WorkflowRegistryConfig,
} from './config-loader';

// Hooks
export {
  createTelemetryHooks,
  createLoggingHooks,
  createWebhookHooks,
  createPersistenceHooks,
  createBuiltinHooks,
  defaultTelemetryCollector,
  defaultPersistenceStore,
  type TelemetryCollector,
  type WorkflowLogger,
  type WebhookConfig,
  type PersistenceStore,
} from './hooks';

// Built-in Handlers
export {
  builtinHandlers,
  getBuiltinHandlerTypes,
  shellExecHandler,
  httpRequestHandler,
  fileReadHandler,
  fileWriteHandler,
  gitCheckoutHandler,
  gitPullHandler,
  delayHandler,
  logHandler,
  conditionHandler,
  setVariableHandler,
  parallelHandler,
} from './builtin-handlers';

// Re-export commonly used items at top level
import { WorkflowEngine, createWorkflowEngine } from './engine';
import { PluginRegistry, createPluginRegistry, definePlugin } from './plugin-registry';
import { WorkflowConfigLoader, loadWorkflowsFromConfig } from './config-loader';
import { createBuiltinHooks } from './hooks';
import { builtinHandlers } from './builtin-handlers';
import type { WorkflowPlugin, WorkflowDefinition, WorkflowEngineConfig } from './types';

/**
 * Create a fully configured workflow system
 *
 * This is the recommended way to initialize the workflow engine
 * with all built-in handlers and hooks.
 *
 * @param config - Engine configuration options
 * @returns Configured workflow engine and plugin registry
 */
export async function createWorkflowSystem(
  config?: Partial<WorkflowEngineConfig>
): Promise<{
  engine: WorkflowEngine;
  registry: PluginRegistry;
}> {
  // Create engine
  const engine = createWorkflowEngine(config);

  // Create plugin registry and attach to engine
  const registry = createPluginRegistry();
  registry.attachEngine(engine);

  // Register built-in handlers
  engine.registerStepHandlers(builtinHandlers);

  // Register built-in hooks
  const builtinHooks = createBuiltinHooks();
  for (const hook of builtinHooks) {
    engine.registerHook(hook);
  }

  console.log('✅ Workflow system initialized');
  console.log(`   Handlers: ${Object.keys(builtinHandlers).length} built-in`);
  console.log(`   Hooks: ${builtinHooks.length} built-in`);

  return { engine, registry };
}

/**
 * Create workflow system from TOML configuration
 *
 * @param configPath - Path to registry.toml with [workflow] section
 * @returns Configured workflow engine and plugin registry
 */
export async function createWorkflowSystemFromConfig(
  configPath: string
): Promise<{
  engine: WorkflowEngine;
  registry: PluginRegistry;
}> {
  // Load configuration
  const tomlConfig = await WorkflowConfigLoader.YAML.parse(configPath);

  if (!tomlConfig.enabled) {
    throw new Error('Workflow system is disabled in configuration');
  }

  // Create engine with config
  const engineConfig = WorkflowConfigLoader.toEngineConfig(tomlConfig);
  const { engine, registry } = await createWorkflowSystem(engineConfig);

  // Load and register workflows from config
  const workflows = await loadWorkflowsFromConfig(configPath);
  for (const workflow of workflows) {
    engine.registerWorkflow(workflow);
  }

  console.log(`   Workflows: ${workflows.length} from config`);

  // Load plugins if specified
  if (tomlConfig.plugins.length > 0) {
    console.log(`   Loading ${tomlConfig.plugins.length} plugins...`);
    for (const pluginPath of tomlConfig.plugins) {
      try {
        const plugin = await registry.loadFromFile(pluginPath);
        await registry.register(plugin);
      } catch (err) {
        console.error(`Failed to load plugin ${pluginPath}:`, err);
      }
    }
  }

  return { engine, registry };
}

/**
 * Create a simple workflow plugin
 *
 * Helper function for creating plugins with minimal boilerplate.
 *
 * @param id - Plugin identifier
 * @param name - Plugin display name
 * @param handlers - Step handlers provided by this plugin
 * @returns Workflow plugin definition
 */
export function createSimplePlugin(
  id: string,
  name: string,
  handlers: Record<string, (inputs: Record<string, unknown>) => Promise<Record<string, unknown>>>
): WorkflowPlugin {
  return definePlugin({
    metadata: {
      id,
      name,
      version: '1.0.0',
    },
    stepHandlers: handlers as Record<string, any>,
  });
}

/**
 * Quick workflow definition helper
 *
 * @param id - Workflow identifier
 * @param name - Workflow name
 * @param steps - Workflow steps
 * @returns Workflow definition
 */
export function quickWorkflow(
  id: string,
  name: string,
  steps: Array<{
    id: string;
    name: string;
    type: string;
    handler: string;
    inputs?: Record<string, unknown>;
  }>
): WorkflowDefinition {
  return {
    id,
    name,
    version: '1.0.0',
    trigger: 'manual',
    executionMode: 'sequential',
    steps: steps.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      handler: s.handler,
      inputs: s.inputs,
    })),
    enabled: true,
  };
}
