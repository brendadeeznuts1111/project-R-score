#!/usr/bin/env bun

/**
 * ⚙️ Advanced Configuration Manager Service
 * Centralized configuration management with validation and hot-reload
 */

import { BunNativeAPIDomain } from '../enhanced-bun-native-tracker.js';

export interface EmpireProConfig {
  // Performance settings
  performance: {
    updateIntervalMs: number;
    maxReportAgeHours: number;
    enableGarbageCollection: boolean;
    dryRun: boolean;
    enableRealTimeUpdates: boolean;
  };
  
  // Tracker settings
  tracker: {
    enableDomainClassification: boolean;
    trackAsyncCalls: boolean;
    trackSyncCalls: boolean;
    enableSubscriptions: boolean;
    maxSubscriptions: number;
  };
  
  // CLI settings
  cli: {
    enableColorOutput: boolean;
    enableProgressBars: boolean;
    enableAnimations: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    outputFormat: 'json' | 'table' | 'ascii';
  };
  
  // Domain settings
  domains: {
    enabled: BunNativeAPIDomain[];
    priority: Record<BunNativeAPIDomain, number>;
    thresholds: Record<BunNativeAPIDomain, {
      warningTime: number;
      criticalTime: number;
      maxCalls: number;
    }>;
  };
  
  // Export settings
  export: {
    defaultFormat: 'json' | 'csv' | 'xml' | 'html';
    includeMetadata: boolean;
    compressionEnabled: boolean;
    autoExport: boolean;
    exportInterval: number;
  };
  
  // Security settings
  security: {
    enableAuditLog: boolean;
    maxLogSize: number;
    encryptionEnabled: boolean;
    sanitizeReports: boolean;
  };
}

export class ConfigManagerService {
  private static instance: ConfigManagerService;
  private config: EmpireProConfig;
  private configPath: string;
  private watchers: Array<(config: EmpireProConfig) => void> = [];
  private lastModified: number = 0;

  private constructor() {
    this.configPath = './config/empire-pro.config.json';
    this.config = this.getDefaultConfig();
    this.loadConfig();
    this.startWatching();
  }

  /**
   * 🏭 Get singleton instance
   */
  public static getInstance(): ConfigManagerService {
    if (!ConfigManagerService.instance) {
      ConfigManagerService.instance = new ConfigManagerService();
    }
    return ConfigManagerService.instance;
  }

  /**
   * 📋 Get current configuration
   */
  public getConfig(): EmpireProConfig {
    return { ...this.config };
  }

  /**
   * ⚙️ Update configuration
   */
  public async updateConfig(updates: Partial<EmpireProConfig>): Promise<void> {
    const newConfig = this.mergeConfig(this.config, updates);
    
    if (this.validateConfig(newConfig)) {
      this.config = newConfig;
      await this.saveConfig();
      this.notifyWatchers();
    } else {
      throw new Error('Invalid configuration updates');
    }
  }

  /**
   * 🔄 Reset to default configuration
   */
  public async resetToDefaults(): Promise<void> {
    this.config = this.getDefaultConfig();
    await this.saveConfig();
    this.notifyWatchers();
  }

  /**
   * 👀 Watch for configuration changes
   */
  public watchConfig(callback: (config: EmpireProConfig) => void): void {
    this.watchers.push(callback);
  }

  /**
   * 🛑 Stop watching configuration changes
   */
  public stopWatching(callback: (config: EmpireProConfig) => void): void {
    const index = this.watchers.indexOf(callback);
    if (index > -1) {
      this.watchers.splice(index, 1);
    }
  }

  /**
   * 📊 Get configuration schema
   */
  public getConfigSchema(): any {
    return {
      performance: {
        updateIntervalMs: { type: 'number', min: 100, max: 60000, default: 5000 },
        maxReportAgeHours: { type: 'number', min: 1, max: 168, default: 24 },
        enableGarbageCollection: { type: 'boolean', default: true },
        dryRun: { type: 'boolean', default: false },
        enableRealTimeUpdates: { type: 'boolean', default: true }
      },
      tracker: {
        enableDomainClassification: { type: 'boolean', default: true },
        trackAsyncCalls: { type: 'boolean', default: true },
        trackSyncCalls: { type: 'boolean', default: true },
        enableSubscriptions: { type: 'boolean', default: true },
        maxSubscriptions: { type: 'number', min: 1, max: 100, default: 10 }
      },
      cli: {
        enableColorOutput: { type: 'boolean', default: true },
        enableProgressBars: { type: 'boolean', default: true },
        enableAnimations: { type: 'boolean', default: true },
        logLevel: { type: 'string', enum: ['debug', 'info', 'warn', 'error'], default: 'info' },
        outputFormat: { type: 'string', enum: ['json', 'table', 'ascii'], default: 'ascii' }
      }
    };
  }

  /**
   * 🔍 Validate configuration
   */
  public validateConfig(config: EmpireProConfig): boolean {
    try {
      // Validate performance settings
      if (config.performance.updateIntervalMs < 100 || config.performance.updateIntervalMs > 60000) {
        return false;
      }
      
      // Validate tracker settings
      if (config.tracker.maxSubscriptions < 1 || config.tracker.maxSubscriptions > 100) {
        return false;
      }
      
      // Validate domain settings
      const validDomains: BunNativeAPIDomain[] = [
        'filesystem', 'networking', 'crypto', 'cookies', 'streams',
        'binary', 'system', 'database', 'build', 'web', 'workers',
        'utilities', 'events', 'timing', 'text', 'nodejs',
        'javascript', 'runtime'
      ];
      
      for (const domain of config.domains.enabled) {
        if (!validDomains.includes(domain)) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 📁 Get default configuration
   */
  private getDefaultConfig(): EmpireProConfig {
    return {
      performance: {
        updateIntervalMs: 5000,
        maxReportAgeHours: 24,
        enableGarbageCollection: true,
        dryRun: false,
        enableRealTimeUpdates: true
      },
      tracker: {
        enableDomainClassification: true,
        trackAsyncCalls: true,
        trackSyncCalls: true,
        enableSubscriptions: true,
        maxSubscriptions: 10
      },
      cli: {
        enableColorOutput: true,
        enableProgressBars: true,
        enableAnimations: true,
        logLevel: 'info',
        outputFormat: 'ascii'
      },
      domains: {
        enabled: [
          'filesystem', 'networking', 'crypto', 'cookies', 'streams',
          'binary', 'system', 'database', 'build', 'web', 'workers',
          'utilities', 'events', 'timing', 'text', 'nodejs',
          'javascript', 'runtime'
        ],
        priority: {
          filesystem: 1, networking: 2, crypto: 3, cookies: 4, streams: 5,
          binary: 6, system: 7, database: 8, build: 9, web: 10, workers: 11,
          utilities: 12, events: 13, timing: 14, text: 15, nodejs: 16,
          javascript: 17, runtime: 18
        },
        thresholds: {
          filesystem: { warningTime: 50, criticalTime: 200, maxCalls: 1000 },
          networking: { warningTime: 100, criticalTime: 500, maxCalls: 500 },
          crypto: { warningTime: 20, criticalTime: 100, maxCalls: 2000 },
          cookies: { warningTime: 10, criticalTime: 50, maxCalls: 100 },
          streams: { warningTime: 30, criticalTime: 150, maxCalls: 300 },
          binary: { warningTime: 15, criticalTime: 75, maxCalls: 1500 },
          system: { warningTime: 100, criticalTime: 400, maxCalls: 200 },
          database: { warningTime: 200, criticalTime: 1000, maxCalls: 100 },
          build: { warningTime: 500, criticalTime: 2000, maxCalls: 50 },
          web: { warningTime: 80, criticalTime: 300, maxCalls: 400 },
          workers: { warningTime: 150, criticalTime: 600, maxCalls: 100 },
          utilities: { warningTime: 25, criticalTime: 100, maxCalls: 800 },
          events: { warningTime: 10, criticalTime: 40, maxCalls: 2000 },
          timing: { warningTime: 5, criticalTime: 20, maxCalls: 3000 },
          text: { warningTime: 20, criticalTime: 80, maxCalls: 1200 },
          nodejs: { warningTime: 60, criticalTime: 250, maxCalls: 300 },
          javascript: { warningTime: 30, criticalTime: 120, maxCalls: 2500 },
          runtime: { warningTime: 40, criticalTime: 160, maxCalls: 1800 }
        }
      },
      export: {
        defaultFormat: 'json',
        includeMetadata: true,
        compressionEnabled: false,
        autoExport: false,
        exportInterval: 3600000 // 1 hour
      },
      security: {
        enableAuditLog: true,
        maxLogSize: 10485760, // 10MB
        encryptionEnabled: false,
        sanitizeReports: false
      }
    };
  }

  /**
   * 📂 Load configuration from file
   */
  private async loadConfig(): Promise<void> {
    try {
      const configFile = Bun.file(this.configPath);
      if (await configFile.exists()) {
        const fileContent = await configFile.text();
        const loadedConfig = JSON.parse(fileContent);
        
        if (this.validateConfig(loadedConfig)) {
          this.config = { ...this.getDefaultConfig(), ...loadedConfig };
        } else {
          console.warn('⚠️  Invalid config file, using defaults');
        }
      }
    } catch (error) {
      console.warn('⚠️  Could not load config file, using defaults:', error);
    }
  }

  /**
   * 💾 Save configuration to file
   */
  private async saveConfig(): Promise<void> {
    try {
      const configDir = this.configPath.substring(0, this.configPath.lastIndexOf('/'));
      const dir = Bun.file(configDir);
      
      if (!await dir.exists()) {
        await Bun.write(`${configDir}/.gitkeep`, '');
      }
      
      await Bun.write(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('❌ Could not save config file:', error);
    }
  }

  /**
   * 🔀 Merge configuration updates
   */
  private mergeConfig(base: EmpireProConfig, updates: Partial<EmpireProConfig>): EmpireProConfig {
    const merged = { ...base };
    
    for (const [key, value] of Object.entries(updates)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        merged[key as keyof EmpireProConfig] = { ...merged[key as keyof EmpireProConfig], ...value } as any;
      } else {
        merged[key as keyof EmpireProConfig] = value as any;
      }
    }
    
    return merged;
  }

  /**
   * 👀 Start watching for file changes
   */
  private startWatching(): void {
    // Simple polling implementation
    setInterval(async () => {
      try {
        const configFile = Bun.file(this.configPath);
        if (await configFile.exists()) {
          const stats = await configFile.stat();
          if (stats.mtime.getTime() > this.lastModified) {
            this.lastModified = stats.mtime.getTime();
            await this.loadConfig();
            this.notifyWatchers();
          }
        }
      } catch (error) {
        // Ignore file watching errors
      }
    }, 1000);
  }

  /**
   * 📢 Notify all watchers
   */
  private notifyWatchers(): void {
    this.watchers.forEach(watcher => {
      try {
        watcher(this.getConfig());
      } catch (error) {
        console.error('❌ Error in config watcher:', error);
      }
    });
  }
}

// Export singleton instance
export const configManager = ConfigManagerService.getInstance();
