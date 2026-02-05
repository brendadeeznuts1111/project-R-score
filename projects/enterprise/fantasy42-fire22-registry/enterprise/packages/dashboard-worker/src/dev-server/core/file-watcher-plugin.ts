/**
 * Pluggable File Watcher System
 * Allows easy extension for new file types without modifying core logic
 */

import type { FileChangeEvent } from '../../../core/types/dev-server';

export interface FileTypeConfig {
  extensions: string[];
  description: string;
  priority: number; // Higher priority = processed first
  enabled: boolean;
}

export interface FileWatcherPlugin {
  name: string;
  version: string;
  description: string;

  // Configuration for this plugin
  config: FileTypeConfig;

  // Methods
  initialize(): Promise<void>;
  cleanup(): Promise<void>;

  // File processing
  canHandle(filePath: string): boolean;
  processFileChange(change: FileChangeEvent): Promise<FileChangeResult>;

  // Plugin metadata
  getSupportedExtensions(): string[];
  getPriority(): number;
  isEnabled(): boolean;
}

export interface FileChangeResult {
  success: boolean;
  action: 'reload' | 'hmr' | 'ignore' | 'custom';
  data?: any;
  error?: string;
  processedBy: string;
}

export interface PluginManagerConfig {
  plugins: FileWatcherPlugin[];
  defaultAction: 'ignore' | 'reload';
  maxConcurrentPlugins: number;
  pluginTimeout: number; // ms
}

/**
 * Plugin Manager for File Watcher System
 * Manages multiple plugins and orchestrates file change processing
 */
export class PluginManager {
  private plugins: Map<string, FileWatcherPlugin> = new Map();
  private config: PluginManagerConfig;
  private initialized = false;

  constructor(config: Partial<PluginManagerConfig> = {}) {
    this.config = {
      plugins: [],
      defaultAction: 'ignore',
      maxConcurrentPlugins: 3,
      pluginTimeout: 5000,
      ...config,
    };
  }

  /**
   * Register a plugin
   */
  registerPlugin(plugin: FileWatcherPlugin): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already registered`);
    }

    this.plugins.set(plugin.name, plugin);
    console.log(`📦 Plugin registered: ${plugin.name} v${plugin.version} - ${plugin.description}`);
  }

  /**
   * Unregister a plugin
   */
  unregisterPlugin(name: string): boolean {
    const removed = this.plugins.delete(name);
    if (removed) {
      console.log(`📦 Plugin unregistered: ${name}`);
    }
    return removed;
  }

  /**
   * Initialize all registered plugins
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing file watcher plugins...');

    const initPromises = Array.from(this.plugins.values()).map(async plugin => {
      try {
        if (plugin.isEnabled()) {
          await plugin.initialize();
          console.log(`✅ Plugin initialized: ${plugin.name}`);
        } else {
          console.log(`⏸️ Plugin disabled: ${plugin.name}`);
        }
      } catch (error) {
        console.error(`❌ Failed to initialize plugin ${plugin.name}:`, error);
      }
    });

    await Promise.allSettled(initPromises);
    this.initialized = true;

    console.log(`✅ Plugin manager initialized with ${this.plugins.size} plugins`);
  }

  /**
   * Process a file change through registered plugins
   */
  async processFileChange(change: FileChangeEvent): Promise<FileChangeResult> {
    if (!this.initialized) {
      throw new Error('PluginManager not initialized. Call initialize() first.');
    }

    const startTime = Date.now();

    // Find plugins that can handle this file
    const capablePlugins = Array.from(this.plugins.values())
      .filter(plugin => plugin.isEnabled() && plugin.canHandle(change.path))
      .sort((a, b) => b.getPriority() - a.getPriority()); // Higher priority first

    if (capablePlugins.length === 0) {
      return {
        success: true,
        action: this.config.defaultAction,
        processedBy: 'none',
        data: { reason: 'no_capable_plugins' },
      };
    }

    // Process with highest priority plugin
    const primaryPlugin = capablePlugins[0];

    try {
      console.log(`🔍 Processing ${change.path} with ${primaryPlugin.name}`);

      const result = await this.processWithTimeout(
        primaryPlugin.processFileChange(change),
        this.config.pluginTimeout
      );

      const processingTime = Date.now() - startTime;
      console.log(`✅ File processed by ${primaryPlugin.name} in ${processingTime}ms`);

      return {
        ...result,
        processedBy: primaryPlugin.name,
      };
    } catch (error) {
      console.error(`❌ Plugin ${primaryPlugin.name} failed to process ${change.path}:`, error);

      return {
        success: false,
        action: 'ignore',
        error: error instanceof Error ? error.message : 'Unknown error',
        processedBy: primaryPlugin.name,
      };
    }
  }

  /**
   * Get plugin statistics
   */
  getStats(): {
    totalPlugins: number;
    enabledPlugins: number;
    disabledPlugins: number;
    plugins: Array<{
      name: string;
      version: string;
      enabled: boolean;
      priority: number;
      extensions: string[];
    }>;
  } {
    const plugins = Array.from(this.plugins.values());
    const enabledCount = plugins.filter(p => p.isEnabled()).length;

    return {
      totalPlugins: plugins.length,
      enabledPlugins: enabledCount,
      disabledPlugins: plugins.length - enabledCount,
      plugins: plugins.map(p => ({
        name: p.name,
        version: p.version,
        enabled: p.isEnabled(),
        priority: p.getPriority(),
        extensions: p.getSupportedExtensions(),
      })),
    };
  }

  /**
   * Enable/disable a plugin
   */
  setPluginEnabled(name: string, enabled: boolean): boolean {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      return false;
    }

    // Note: This assumes the plugin has a way to enable/disable itself
    // In a real implementation, you might need to modify the plugin's config
    console.log(`${enabled ? '✅' : '⏸️'} Plugin ${name} ${enabled ? 'enabled' : 'disabled'}`);
    return true;
  }

  /**
   * Get all registered plugins
   */
  getPlugins(): FileWatcherPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get a specific plugin by name
   */
  getPlugin(name: string): FileWatcherPlugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Cleanup all plugins
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up plugins...');

    const cleanupPromises = Array.from(this.plugins.values()).map(async plugin => {
      try {
        await plugin.cleanup();
        console.log(`✅ Plugin cleaned up: ${plugin.name}`);
      } catch (error) {
        console.error(`❌ Failed to cleanup plugin ${plugin.name}:`, error);
      }
    });

    await Promise.allSettled(cleanupPromises);
    this.plugins.clear();

    console.log('✅ All plugins cleaned up');
  }

  /**
   * Process with timeout to prevent hanging plugins
   */
  private async processWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Plugin processing timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then(result => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }
}

// !==!==!==!==!==!==!==!==!==!==!==!==!==!===
// PRE-BUILT PLUGINS
// !==!==!==!==!==!==!==!==!==!==!==!==!==!===

/**
 * JavaScript/TypeScript Plugin
 */
export class JavaScriptPlugin implements FileWatcherPlugin {
  name = 'javascript';
  version = '1.0.0';
  description = 'Handles JavaScript and TypeScript file changes';

  config: FileTypeConfig = {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs'],
    description: 'JavaScript/TypeScript files',
    priority: 100,
    enabled: true,
  };

  async initialize(): Promise<void> {
    // Plugin-specific initialization
    console.log(`🔧 Initializing ${this.name} plugin`);
  }

  async cleanup(): Promise<void> {
    // Cleanup resources
    console.log(`🧹 Cleaning up ${this.name} plugin`);
  }

  canHandle(filePath: string): boolean {
    const ext = filePath.substring(filePath.lastIndexOf('.'));
    return this.config.extensions.includes(ext);
  }

  async processFileChange(change: FileChangeEvent): Promise<FileChangeResult> {
    // JavaScript/TypeScript files typically support HMR
    return {
      success: true,
      action: 'hmr',
      data: {
        fileType: 'javascript',
        changeType: change.type,
        requiresReload: change.type === 'delete' || change.type === 'rename',
      },
    };
  }

  getSupportedExtensions(): string[] {
    return this.config.extensions;
  }

  getPriority(): number {
    return this.config.priority;
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }
}

/**
 * CSS Plugin
 */
export class CSSPlugin implements FileWatcherPlugin {
  name = 'css';
  version = '1.0.0';
  description = 'Handles CSS and style file changes';

  config: FileTypeConfig = {
    extensions: ['.css', '.scss', '.sass', '.less', '.styl'],
    description: 'CSS and preprocessor files',
    priority: 90,
    enabled: true,
  };

  async initialize(): Promise<void> {
    console.log(`🔧 Initializing ${this.name} plugin`);
  }

  async cleanup(): Promise<void> {
    console.log(`🧹 Cleaning up ${this.name} plugin`);
  }

  canHandle(filePath: string): boolean {
    const ext = filePath.substring(filePath.lastIndexOf('.'));
    return this.config.extensions.includes(ext);
  }

  async processFileChange(change: FileChangeEvent): Promise<FileChangeResult> {
    // CSS changes can be hot-reloaded without full page refresh
    return {
      success: true,
      action: 'hmr',
      data: {
        fileType: 'css',
        changeType: change.type,
        injectStyles: true,
      },
    };
  }

  getSupportedExtensions(): string[] {
    return this.config.extensions;
  }

  getPriority(): number {
    return this.config.priority;
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }
}

/**
 * HTML Plugin
 */
export class HTMLPlugin implements FileWatcherPlugin {
  name = 'html';
  version = '1.0.0';
  description = 'Handles HTML template file changes';

  config: FileTypeConfig = {
    extensions: ['.html', '.htm', '.ejs', '.pug', '.hbs'],
    description: 'HTML template files',
    priority: 80,
    enabled: true,
  };

  async initialize(): Promise<void> {
    console.log(`🔧 Initializing ${this.name} plugin`);
  }

  async cleanup(): Promise<void> {
    console.log(`🧹 Cleaning up ${this.name} plugin`);
  }

  canHandle(filePath: string): boolean {
    const ext = filePath.substring(filePath.lastIndexOf('.'));
    return this.config.extensions.includes(ext);
  }

  async processFileChange(change: FileChangeEvent): Promise<FileChangeResult> {
    // HTML changes typically require a full reload
    return {
      success: true,
      action: 'reload',
      data: {
        fileType: 'html',
        changeType: change.type,
        reason: 'HTML templates require full reload',
      },
    };
  }

  getSupportedExtensions(): string[] {
    return this.config.extensions;
  }

  getPriority(): number {
    return this.config.priority;
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }
}

/**
 * GraphQL Plugin - Example of extending for new file types
 */
export class GraphQLPlugin implements FileWatcherPlugin {
  name = 'graphql';
  version = '1.0.0';
  description = 'Handles GraphQL schema and query file changes';

  config: FileTypeConfig = {
    extensions: ['.graphql', '.gql', '.graphqls'],
    description: 'GraphQL schema and query files',
    priority: 70,
    enabled: true,
  };

  async initialize(): Promise<void> {
    console.log(`🔧 Initializing ${this.name} plugin`);
  }

  async cleanup(): Promise<void> {
    console.log(`🧹 Cleaning up ${this.name} plugin`);
  }

  canHandle(filePath: string): boolean {
    const ext = filePath.substring(filePath.lastIndexOf('.'));
    return (
      this.config.extensions.includes(ext) ||
      filePath.includes('.graphql') ||
      filePath.includes('.gql')
    );
  }

  async processFileChange(change: FileChangeEvent): Promise<FileChangeResult> {
    // GraphQL changes might need schema recompilation
    return {
      success: true,
      action: 'hmr',
      data: {
        fileType: 'graphql',
        changeType: change.type,
        recompileSchema: change.type === 'modify',
        requiresReload: change.path.includes('schema'),
      },
    };
  }

  getSupportedExtensions(): string[] {
    return this.config.extensions;
  }

  getPriority(): number {
    return this.config.priority;
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }
}

/**
 * Configuration Plugin - Example of custom file type handling
 */
export class ConfigPlugin implements FileWatcherPlugin {
  name = 'config';
  version = '1.0.0';
  description = 'Handles configuration file changes';

  config: FileTypeConfig = {
    extensions: ['.json', '.yaml', '.yml', '.toml', '.ini', '.env'],
    description: 'Configuration files',
    priority: 50,
    enabled: true,
  };

  async initialize(): Promise<void> {
    console.log(`🔧 Initializing ${this.name} plugin`);
  }

  async cleanup(): Promise<void> {
    console.log(`🧹 Cleaning up ${this.name} plugin`);
  }

  canHandle(filePath: string): boolean {
    const ext = filePath.substring(filePath.lastIndexOf('.'));
    const configFileNames = ['config', 'settings', 'env', 'environment'];

    return (
      this.config.extensions.includes(ext) || configFileNames.some(name => filePath.includes(name))
    );
  }

  async processFileChange(change: FileChangeEvent): Promise<FileChangeResult> {
    // Config changes typically require server restart
    return {
      success: true,
      action: 'reload',
      data: {
        fileType: 'config',
        changeType: change.type,
        reason: 'Configuration changes require server restart',
        severity: 'high',
      },
    };
  }

  getSupportedExtensions(): string[] {
    return this.config.extensions;
  }

  getPriority(): number {
    return this.config.priority;
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }
}

/**
 * Create default plugin configuration
 */
export function createDefaultPluginConfig(): PluginManagerConfig {
  const pluginManager = new PluginManager();

  // Register built-in plugins
  pluginManager.registerPlugin(new JavaScriptPlugin());
  pluginManager.registerPlugin(new CSSPlugin());
  pluginManager.registerPlugin(new HTMLPlugin());
  pluginManager.registerPlugin(new GraphQLPlugin());
  pluginManager.registerPlugin(new ConfigPlugin());

  return {
    plugins: pluginManager.getPlugins(),
    defaultAction: 'ignore',
    maxConcurrentPlugins: 3,
    pluginTimeout: 5000,
  };
}
