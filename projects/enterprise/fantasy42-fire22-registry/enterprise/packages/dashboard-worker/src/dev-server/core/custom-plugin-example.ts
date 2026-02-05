/**
 * Custom Plugin Example
 * Demonstrates how to create custom file watcher plugins
 */

import { FileWatcherPlugin, FileTypeConfig, FileChangeResult } from './file-watcher-plugin';
import type { FileChangeEvent } from '../../../core/types/dev-server';

/**
 * Example: Custom Markdown Plugin
 * Processes .md files and triggers documentation rebuild
 */
export class MarkdownPlugin implements FileWatcherPlugin {
  name = 'markdown';
  version = '1.0.0';
  description = 'Handles Markdown file changes for documentation';

  config: FileTypeConfig = {
    extensions: ['.md', '.markdown'],
    description: 'Markdown documentation files',
    priority: 60,
    enabled: true,
  };

  async initialize(): Promise<void> {
    console.log(`🔧 Initializing ${this.name} plugin - watching for documentation changes`);
  }

  async cleanup(): Promise<void> {
    console.log(`🧹 Cleaning up ${this.name} plugin`);
  }

  canHandle(filePath: string): boolean {
    const ext = filePath.substring(filePath.lastIndexOf('.'));
    return this.config.extensions.includes(ext);
  }

  async processFileChange(change: FileChangeEvent): Promise<FileChangeResult> {
    console.log(`📝 Processing markdown file: ${change.path}`);

    // For documentation files, we might want to trigger a rebuild
    if (change.path.includes('README') || change.path.includes('docs/')) {
      return {
        success: true,
        action: 'reload',
        data: {
          fileType: 'markdown',
          changeType: change.type,
          rebuildDocs: true,
          reason: 'Documentation files require full rebuild',
        },
      };
    }

    // For regular markdown files, HMR might be sufficient
    return {
      success: true,
      action: 'hmr',
      data: {
        fileType: 'markdown',
        changeType: change.type,
        livePreview: true,
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
 * Example: Custom Vue.js Plugin
 * Processes .vue files with single-file component handling
 */
export class VuePlugin implements FileWatcherPlugin {
  name = 'vue';
  version = '1.0.0';
  description = 'Handles Vue.js single-file components';

  config: FileTypeConfig = {
    extensions: ['.vue'],
    description: 'Vue.js single-file components',
    priority: 95,
    enabled: true,
  };

  async initialize(): Promise<void> {
    console.log(`🔧 Initializing ${this.name} plugin - Vue SFC support enabled`);
  }

  async cleanup(): Promise<void> {
    console.log(`🧹 Cleaning up ${this.name} plugin`);
  }

  canHandle(filePath: string): boolean {
    return filePath.endsWith('.vue');
  }

  async processFileChange(change: FileChangeEvent): Promise<FileChangeResult> {
    console.log(`🖼️ Processing Vue SFC: ${change.path}`);

    // Vue files typically support HMR
    return {
      success: true,
      action: 'hmr',
      data: {
        fileType: 'vue',
        changeType: change.type,
        componentUpdate: true,
        requiresReload: change.type === 'delete',
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
 * Example: Custom Database Migration Plugin
 * Processes database migration files
 */
export class DatabaseMigrationPlugin implements FileWatcherPlugin {
  name = 'db-migration';
  version = '1.0.0';
  description = 'Handles database migration file changes';

  config: FileTypeConfig = {
    extensions: ['.sql', '.migration', '.db'],
    description: 'Database migration files',
    priority: 30,
    enabled: true,
  };

  async initialize(): Promise<void> {
    console.log(`🔧 Initializing ${this.name} plugin - database migration monitoring`);
  }

  async cleanup(): Promise<void> {
    console.log(`🧹 Cleaning up ${this.name} plugin`);
  }

  canHandle(filePath: string): boolean {
    const ext = filePath.substring(filePath.lastIndexOf('.'));
    const isMigration =
      filePath.includes('migration') || filePath.includes('schema') || filePath.includes('db/');

    return this.config.extensions.includes(ext) || isMigration;
  }

  async processFileChange(change: FileChangeEvent): Promise<FileChangeResult> {
    console.log(`🗄️ Processing database file: ${change.path}`);

    // Database changes require careful handling
    return {
      success: true,
      action: 'reload',
      data: {
        fileType: 'database',
        changeType: change.type,
        requiresMigration: change.type === 'modify',
        severity: 'high',
        reason: 'Database changes require server restart and potential data migration',
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
 * Example: Custom Log File Plugin
 * Monitors log files (typically should be ignored)
 */
export class LogFilePlugin implements FileWatcherPlugin {
  name = 'log-files';
  version = '1.0.0';
  description = 'Handles log file changes (usually ignored)';

  config: FileTypeConfig = {
    extensions: ['.log', '.out', '.err'],
    description: 'Log files',
    priority: 10,
    enabled: true,
  };

  async initialize(): Promise<void> {
    console.log(`🔧 Initializing ${this.name} plugin - log file monitoring`);
  }

  async cleanup(): Promise<void> {
    console.log(`🧹 Cleaning up ${this.name} plugin`);
  }

  canHandle(filePath: string): boolean {
    const ext = filePath.substring(filePath.lastIndexOf('.'));
    const isLogFile =
      filePath.includes('log') ||
      filePath.includes('debug') ||
      this.config.extensions.includes(ext);

    return isLogFile;
  }

  async processFileChange(change: FileChangeEvent): Promise<FileChangeResult> {
    console.log(`📋 Log file changed: ${change.path}`);

    // Log files should generally be ignored for HMR
    return {
      success: true,
      action: 'ignore',
      data: {
        fileType: 'log',
        changeType: change.type,
        reason: 'Log files should not trigger HMR',
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
 * Example: Custom Plugin Factory
 * Shows how to create configurable plugins
 */
export function createCustomMarkdownPlugin(
  options: {
    extensions?: string[];
    priority?: number;
    enableLivePreview?: boolean;
  } = {}
): MarkdownPlugin {
  const plugin = new MarkdownPlugin();

  if (options.extensions) {
    plugin.config.extensions = options.extensions;
  }

  if (options.priority !== undefined) {
    plugin.config.priority = options.priority;
  }

  // Add custom configuration
  (plugin as any).enableLivePreview = options.enableLivePreview ?? true;

  return plugin;
}

/**
 * Example: Plugin Registry
 * Shows how to manage multiple custom plugins
 */
export class PluginRegistry {
  private plugins: Map<string, FileWatcherPlugin> = new Map();

  register(name: string, plugin: FileWatcherPlugin): void {
    this.plugins.set(name, plugin);
    console.log(`📦 Registered custom plugin: ${name}`);
  }

  unregister(name: string): boolean {
    const removed = this.plugins.delete(name);
    if (removed) {
      console.log(`📦 Unregistered plugin: ${name}`);
    }
    return removed;
  }

  get(name: string): FileWatcherPlugin | undefined {
    return this.plugins.get(name);
  }

  getAll(): FileWatcherPlugin[] {
    return Array.from(this.plugins.values());
  }

  getNames(): string[] {
    return Array.from(this.plugins.keys());
  }
}

// Export examples for use
export const examplePlugins = {
  markdown: new MarkdownPlugin(),
  vue: new VuePlugin(),
  dbMigration: new DatabaseMigrationPlugin(),
  logFiles: new LogFilePlugin(),
};

export function createExamplePluginRegistry(): PluginRegistry {
  const registry = new PluginRegistry();

  // Register example plugins
  Object.entries(examplePlugins).forEach(([name, plugin]) => {
    registry.register(name, plugin);
  });

  return registry;
}
