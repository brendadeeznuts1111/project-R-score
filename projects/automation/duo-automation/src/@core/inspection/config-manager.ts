#!/usr/bin/env bun
// Hot-reloadable Configuration Manager for Performance Inspector

import { YAML } from "bun";
import { EventEmitter } from "events";

interface CategoryConfig {
  color: string;
  emoji: string;
  priority: 'high' | 'medium' | 'low';
  enabled: boolean;
}

interface Thresholds {
  processingTime: number;
  memoryUsage: string;
  maxUriLength: number;
  maxConcurrentInspections: number;
}

interface InspectionConfig {
  timeout: number;
  retries: number;
  parallelProcessing: boolean;
}

interface OutputConfig {
  format: 'table' | 'json' | 'csv';
  colors: boolean;
  timestamps: boolean;
  emoji: boolean;
  maxWidth: number;
}

interface ScopeConfig {
  inspection: InspectionConfig;
  output: OutputConfig;
  features: Record<string, boolean>;
  thresholds: Thresholds;
}

interface FeatureFlag {
  enabled: boolean;
  rolloutPercentage: number;
  allowedScopes: string[];
}

interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'pretty' | 'json' | 'structured';
  file: string;
}

interface IntegrationsConfig {
  dashboard: {
    enabled: boolean;
    port: number;
    autoOpen: boolean;
  };
  metrics: {
    enabled: boolean;
    exportFormat: string;
    interval: number;
  };
  notifications: {
    enabled: boolean;
    webhook: string;
    email: string;
  };
}

interface PerformanceInspectorConfig {
  categories: Record<string, CategoryConfig>;
  thresholds: Thresholds;
  scopes: Record<string, ScopeConfig>;
  featureFlags: Record<string, FeatureFlag>;
  logging: LoggingConfig;
  integrations: IntegrationsConfig;
}

class ConfigManager extends EventEmitter {
  private config: PerformanceInspectorConfig | null = null;
  private configPath: string;
  private watcher: any = null;
  private currentScope: string;
  private configLoaded: Promise<void>;

  constructor(configPath: string = "./config/performance-inspector.yaml", scope: string = "local-sandbox") {
    super();
    this.configPath = configPath;
    this.currentScope = scope;
    this.configLoaded = this.loadConfig();
    this.setupHotReload();
  }

  private async loadConfig(): Promise<void> {
    try {
      const configText = await Bun.file(this.configPath).text();
      const rawConfig = YAML.parse(configText) as PerformanceInspectorConfig;
      
      // Apply scope-specific configuration
      this.config = this.applyScopeConfig(rawConfig, this.currentScope);
      
      console.log(`📋 Configuration loaded for scope: ${this.currentScope}`);
      this.emit('configLoaded', this.config);
    } catch (error) {
      console.error(`❌ Failed to load config from ${this.configPath}:`, error);
      this.emit('configError', error);
      throw error;
    }
  }

  private applyScopeConfig(rawConfig: PerformanceInspectorConfig, scope: string): PerformanceInspectorConfig {
    const scopeConfig = rawConfig.scopes[scope];
    if (!scopeConfig) {
      console.warn(`⚠️ Scope '${scope}' not found, using defaults`);
      return rawConfig;
    }

    // Create a deep merge of scope-specific config with base config
    return {
      ...rawConfig,
      categories: rawConfig.categories,
      thresholds: scopeConfig.thresholds || rawConfig.thresholds,
      scopes: {
        ...rawConfig.scopes,
        [scope]: scopeConfig
      },
      featureFlags: rawConfig.featureFlags,
      logging: rawConfig.logging,
      integrations: rawConfig.integrations
    };
  }

  private setupHotReload(): void {
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    try {
      // Use Bun's file watching instead of fs.watch
      const file = Bun.file(this.configPath);
      let lastModified = file.lastModified;
      
      const checkInterval = setInterval(async () => {
        const currentFile = Bun.file(this.configPath);
        if (currentFile.lastModified > lastModified) {
          lastModified = currentFile.lastModified;
          console.log('🔄 Configuration file changed, reloading...');
          await this.loadConfig();
        }
      }, 1000);
      
      this.watcher = { close: () => clearInterval(checkInterval) };
    } catch (error) {
      console.warn('⚠️ Could not setup hot reload for config:', error);
    }
  }

  public async getConfig(): Promise<PerformanceInspectorConfig> {
    await this.configLoaded;
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }
    return this.config;
  }

  public getCategories(): Record<string, CategoryConfig> {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }
    return this.config.categories;
  }

  public getThresholds(): Thresholds {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }
    return this.config.thresholds;
  }

  public getCurrentScopeConfig(): ScopeConfig {
    const config = this.config;
    if (!config) {
      throw new Error('Configuration not loaded');
    }
    return config.scopes[this.currentScope] || config.scopes['local-sandbox'];
  }

  public async isFeatureEnabled(featureName: string): Promise<boolean> {
    const config = await this.getConfig();
    const feature = config.featureFlags[featureName];
    if (!feature?.enabled) {
      return false;
    }

    // Check if current scope is allowed
    if (!feature.allowedScopes.includes(this.currentScope)) {
      return false;
    }

    // For future rollout percentage logic
    if (feature.rolloutPercentage < 100) {
      // Simple hash-based rollout for demo
      const hash = this.hashCode(this.currentScope + featureName);
      return (hash % 100) < feature.rolloutPercentage;
    }

    return true;
  }

  public getCategoryConfig(categoryName: string): CategoryConfig | null {
    const category = this.getCategories()[categoryName];
    return category?.enabled ? category : null;
  }

  public switchScope(newScope: string): void {
    if (this.currentScope === newScope) {
      return;
    }

    this.currentScope = newScope;
    this.loadConfig();
    console.log(`🔄 Switched to scope: ${newScope}`);
  }

  public getCurrentScope(): string {
    return this.currentScope;
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  public destroy(): void {
    if (this.watcher) {
      this.watcher.close();
    }
    this.removeAllListeners();
  }
}

// Singleton instance
let configManager: ConfigManager | null = null;

export function getConfigManager(scope?: string): ConfigManager {
  if (!configManager) {
    const envScope = scope || process.env.DUO_SCOPE || 'local-sandbox';
    configManager = new ConfigManager('./config/performance-inspector.yaml', envScope);
  }
  return configManager;
}

export function isFeatureEnabled(featureName: string, scope?: string): boolean {
  const manager = getConfigManager(scope);
  return manager.isFeatureEnabled(featureName);
}

export function getCategoryConfig(categoryName: string, scope?: string): CategoryConfig | null {
  const manager = getConfigManager(scope);
  return manager.getCategoryConfig(categoryName);
}

export function getCurrentThresholds(scope?: string): Thresholds {
  const manager = getConfigManager(scope);
  return manager.getThresholds();
}

export type {
  PerformanceInspectorConfig,
  CategoryConfig,
  Thresholds,
  InspectionConfig,
  OutputConfig,
  ScopeConfig,
  FeatureFlag,
  LoggingConfig,
  IntegrationsConfig
};

export { ConfigManager };
