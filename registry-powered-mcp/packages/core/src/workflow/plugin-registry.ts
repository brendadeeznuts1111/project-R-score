/**
 * Workflow Plugin Registry v2.4.1 - Hardened Baseline
 * Dynamic Plugin Management for Workflow Extensions
 *
 * Architecture:
 * - Symbol-based isolation for internal APIs
 * - Dynamic module loading via import()
 * - Structural contract validation
 * - Version-aware plugin management
 *
 * Powered by Bun 1.3.6 Native APIs
 */

import type {
  WorkflowPlugin,
  PluginMetadata,
  PluginRegistrationOptions,
  StepHandler,
  WorkflowHook,
  WorkflowDefinition,
} from './types';
import { WorkflowEngine } from './engine';

/**
 * Plugin validation result
 */
interface PluginValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

/**
 * Registered plugin entry
 */
interface RegisteredPlugin {
  readonly plugin: WorkflowPlugin;
  readonly registeredAt: Date;
  readonly source: 'local' | 'remote' | 'builtin';
}

/**
 * Plugin Registry Configuration
 */
export interface PluginRegistryConfig {
  readonly enableRemotePlugins: boolean;
  readonly allowedRemoteHosts: readonly string[];
  readonly validateOnRegister: boolean;
  readonly strictMode: boolean;
}

const DEFAULT_REGISTRY_CONFIG: PluginRegistryConfig = {
  enableRemotePlugins: false,
  allowedRemoteHosts: [],
  validateOnRegister: true,
  strictMode: true,
};

/**
 * Workflow Plugin Registry
 *
 * Manages plugin lifecycle:
 * 1. Discovery - Find plugins from various sources
 * 2. Validation - Verify plugin contracts
 * 3. Registration - Register handlers and hooks
 * 4. Execution - Provide plugins to workflow engine
 *
 * Bun Native API Integration:
 * - import(): Dynamic module loading
 * - Map: O(1) plugin lookups
 * - crypto.randomUUID(): Plugin instance IDs
 */
export class PluginRegistry {
  private readonly config: PluginRegistryConfig;
  private readonly plugins: Map<string, RegisteredPlugin> = new Map();
  private engine: WorkflowEngine | null = null;

  constructor(config: Partial<PluginRegistryConfig> = {}) {
    this.config = { ...DEFAULT_REGISTRY_CONFIG, ...config };
  }

  /**
   * Attach workflow engine for plugin registration
   */
  attachEngine(engine: WorkflowEngine): void {
    this.engine = engine;
    console.log('✓ Plugin registry attached to workflow engine');

    // Re-register all existing plugins with the new engine
    for (const [id, entry] of this.plugins) {
      this.registerPluginWithEngine(entry.plugin);
    }
  }

  /**
   * Register a plugin
   */
  async register(
    plugin: WorkflowPlugin,
    options: PluginRegistrationOptions = {}
  ): Promise<void> {
    const { overrideExisting = false, validateSchema = true, enableHooks = true } = options;

    // Validate plugin structure
    if (validateSchema || this.config.validateOnRegister) {
      const validation = this.validatePlugin(plugin);
      if (!validation.valid) {
        throw new Error(
          `Plugin validation failed: ${validation.errors.join(', ')}`
        );
      }
      if (validation.warnings.length > 0) {
        validation.warnings.forEach((w) => console.warn(`⚠️  ${w}`));
      }
    }

    // Check for existing plugin
    if (this.plugins.has(plugin.metadata.id) && !overrideExisting) {
      throw new Error(`Plugin already registered: ${plugin.metadata.id}`);
    }

    // Initialize plugin if needed
    if (plugin.initialize) {
      console.log(`🔄 Initializing plugin: ${plugin.metadata.name}`);
      await plugin.initialize();
    }

    // Store plugin
    this.plugins.set(plugin.metadata.id, {
      plugin,
      registeredAt: new Date(),
      source: 'local',
    });

    // Register with engine if attached
    if (this.engine) {
      this.registerPluginWithEngine(plugin, enableHooks);
    }

    console.log(
      `✓ Plugin registered: ${plugin.metadata.name} v${plugin.metadata.version}`
    );
  }

  /**
   * Register plugin components with workflow engine
   */
  private registerPluginWithEngine(
    plugin: WorkflowPlugin,
    enableHooks = true
  ): void {
    if (!this.engine) return;

    // Register step handlers
    for (const [type, handler] of Object.entries(plugin.stepHandlers)) {
      this.engine.registerStepHandler(type, handler);
    }

    // Register hooks
    if (enableHooks && plugin.hooks) {
      for (const hook of plugin.hooks) {
        this.engine.registerHook(hook);
      }
    }

    // Register workflows
    if (plugin.workflows) {
      for (const workflow of plugin.workflows) {
        this.engine.registerWorkflow(workflow);
      }
    }
  }

  /**
   * Load a plugin from a local file
   */
  async loadFromFile(filePath: string): Promise<WorkflowPlugin> {
    console.log(`📦 Loading plugin from: ${filePath}`);

    try {
      const module = await import(filePath);
      const plugin = module.default ?? module.plugin ?? module;

      if (!this.isValidPluginShape(plugin)) {
        throw new Error('Invalid plugin export: must export a WorkflowPlugin object');
      }

      return plugin as WorkflowPlugin;
    } catch (err) {
      throw new Error(
        `Failed to load plugin from ${filePath}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  /**
   * Load a plugin from a remote URL (if enabled)
   */
  async loadFromUrl(url: string): Promise<WorkflowPlugin> {
    if (!this.config.enableRemotePlugins) {
      throw new Error('Remote plugins are disabled');
    }

    const parsedUrl = new URL(url);
    if (!this.config.allowedRemoteHosts.includes(parsedUrl.hostname)) {
      throw new Error(
        `Remote host not allowed: ${parsedUrl.hostname}. Allowed: ${this.config.allowedRemoteHosts.join(', ')}`
      );
    }

    console.log(`🌐 Loading plugin from: ${url}`);

    try {
      // Fetch plugin source
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const source = await response.text();

      // Create a data URL for dynamic import
      const dataUrl = `data:text/javascript;base64,${btoa(source)}`;
      const module = await import(dataUrl);
      const plugin = module.default ?? module.plugin ?? module;

      if (!this.isValidPluginShape(plugin)) {
        throw new Error('Invalid plugin export');
      }

      // Store as remote source
      this.plugins.set(plugin.metadata.id, {
        plugin,
        registeredAt: new Date(),
        source: 'remote',
      });

      return plugin as WorkflowPlugin;
    } catch (err) {
      throw new Error(
        `Failed to load plugin from ${url}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  /**
   * Unregister a plugin
   */
  async unregister(pluginId: string): Promise<boolean> {
    const entry = this.plugins.get(pluginId);

    if (!entry) {
      return false;
    }

    // Cleanup plugin
    if (entry.plugin.cleanup) {
      await entry.plugin.cleanup();
    }

    this.plugins.delete(pluginId);
    console.log(`✓ Plugin unregistered: ${pluginId}`);

    return true;
  }

  /**
   * Get a registered plugin
   */
  get(pluginId: string): WorkflowPlugin | undefined {
    return this.plugins.get(pluginId)?.plugin;
  }

  /**
   * Get all registered plugins
   */
  getAll(): readonly WorkflowPlugin[] {
    return Array.from(this.plugins.values()).map((e) => e.plugin);
  }

  /**
   * Get plugin metadata
   */
  getMetadata(pluginId: string): PluginMetadata | undefined {
    return this.plugins.get(pluginId)?.plugin.metadata;
  }

  /**
   * Check if a plugin is registered
   */
  has(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * Validate plugin structure
   */
  validatePlugin(plugin: unknown): PluginValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!this.isValidPluginShape(plugin)) {
      errors.push('Plugin must have metadata and stepHandlers properties');
      return { valid: false, errors, warnings };
    }

    const p = plugin as WorkflowPlugin;

    // Validate metadata
    if (!p.metadata.id) {
      errors.push('Plugin metadata.id is required');
    }
    if (!p.metadata.name) {
      errors.push('Plugin metadata.name is required');
    }
    if (!p.metadata.version) {
      errors.push('Plugin metadata.version is required');
    }

    // Validate step handlers
    if (Object.keys(p.stepHandlers).length === 0) {
      warnings.push('Plugin has no step handlers');
    }

    for (const [type, handler] of Object.entries(p.stepHandlers)) {
      if (typeof handler !== 'function') {
        errors.push(`Step handler "${type}" must be a function`);
      }
    }

    // Validate hooks if present
    if (p.hooks) {
      for (const hook of p.hooks) {
        if (!hook.type) {
          errors.push('Hook must have a type');
        }
        if (typeof hook.handler !== 'function') {
          errors.push(`Hook handler for "${hook.type}" must be a function`);
        }
      }
    }

    // Validate workflows if present
    if (p.workflows) {
      for (const workflow of p.workflows) {
        if (!workflow.id) {
          errors.push('Workflow must have an id');
        }
        if (!workflow.name) {
          errors.push('Workflow must have a name');
        }
        if (!workflow.steps || workflow.steps.length === 0) {
          warnings.push(`Workflow "${workflow.id}" has no steps`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check if object has valid plugin shape
   */
  private isValidPluginShape(obj: unknown): obj is WorkflowPlugin {
    if (!obj || typeof obj !== 'object') return false;

    const plugin = obj as Record<string, unknown>;

    return (
      typeof plugin.metadata === 'object' &&
      plugin.metadata !== null &&
      typeof plugin.stepHandlers === 'object' &&
      plugin.stepHandlers !== null
    );
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalPlugins: number;
    localPlugins: number;
    remotePlugins: number;
    builtinPlugins: number;
    totalHandlers: number;
    totalWorkflows: number;
  } {
    let localPlugins = 0;
    let remotePlugins = 0;
    let builtinPlugins = 0;
    let totalHandlers = 0;
    let totalWorkflows = 0;

    for (const entry of this.plugins.values()) {
      switch (entry.source) {
        case 'local':
          localPlugins++;
          break;
        case 'remote':
          remotePlugins++;
          break;
        case 'builtin':
          builtinPlugins++;
          break;
      }

      totalHandlers += Object.keys(entry.plugin.stepHandlers).length;
      totalWorkflows += entry.plugin.workflows?.length ?? 0;
    }

    return {
      totalPlugins: this.plugins.size,
      localPlugins,
      remotePlugins,
      builtinPlugins,
      totalHandlers,
      totalWorkflows,
    };
  }

  /**
   * Health check
   */
  healthCheck(): { healthy: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!this.engine) {
      issues.push('No workflow engine attached');
    }

    // Check for plugins with missing dependencies
    for (const [id, entry] of this.plugins) {
      const validation = this.validatePlugin(entry.plugin);
      if (!validation.valid) {
        issues.push(`Plugin "${id}" has validation errors: ${validation.errors.join(', ')}`);
      }
    }

    return {
      healthy: issues.length === 0,
      issues,
    };
  }
}

/**
 * Create a plugin registry instance
 */
export function createPluginRegistry(
  config?: Partial<PluginRegistryConfig>
): PluginRegistry {
  return new PluginRegistry(config);
}

/**
 * Helper to define a plugin with type safety
 */
export function definePlugin(plugin: WorkflowPlugin): WorkflowPlugin {
  return plugin;
}
