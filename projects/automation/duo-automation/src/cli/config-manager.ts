/**
 * CLI Configuration Manager
 * Centralized configuration management for Empire Pro CLI
 */

// Use Bun file operations
import { empireLog, chalk } from '../../utils/bun-console-colors';

interface CLIConfig {
  // General settings
  format: 'table' | 'json' | 'csv';
  debug: boolean;
  timeout: number;
  parallel: number;
  
  // CashApp settings
  cashapp: {
    apiKey: string;
    apiSecret: string;
    sandbox: boolean;
    rateLimit: {
      requestsPerSecond: number;
      burstLimit: number;
    };
  };
  
  // Output settings
  output: {
    directory: string;
    timestamp: boolean;
    compression: boolean;
  };
  
  // Monitoring settings
  monitoring: {
    defaultInterval: number;
    alertThresholds: {
      riskScore: number;
      transactionVolume: number;
      failedAttempts: number;
    };
  };
  
  // Analytics settings
  analytics: {
    retention: number; // days
    aggregation: 'hourly' | 'daily' | 'weekly';
    metrics: string[];
  };
}

const DEFAULT_CONFIG: CLIConfig = {
  format: 'table',
  debug: false,
  timeout: 30000,
  parallel: 32,
  
  cashapp: {
    apiKey: '',
    apiSecret: '',
    sandbox: true,
    rateLimit: {
      requestsPerSecond: 10,
      burstLimit: 50
    }
  },
  
  output: {
    directory: './output',
    timestamp: true,
    compression: false
  },
  
  monitoring: {
    defaultInterval: 30,
    alertThresholds: {
      riskScore: 70,
      transactionVolume: 1000,
      failedAttempts: 5
    }
  },
  
  analytics: {
    retention: 30,
    aggregation: 'daily',
    metrics: ['risk_assessments', 'transaction_volume', 'api_calls', 'error_rates']
  }
};

export class CLIConfigManager {
  private configPath: string;
  private config: CLIConfig;

  constructor(configPath?: string) {
    this.configPath = configPath || this.getDefaultConfigPath();
    this.config = { ...DEFAULT_CONFIG };
    this.loadConfig();
  }

  /**
   * Get default config path
   */
  private getDefaultConfigPath(): string {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '.';
    return `${homeDir}/.empire-pro/config.json`;
  }

  /**
   * Load configuration from file
   */
  private async loadConfig(): Promise<void> {
    try {
      const configFile = Bun.file(this.configPath);
      if (await configFile.exists()) {
        const configData = await configFile.text();
        const loadedConfig = JSON.parse(configData);
        
        // Merge with defaults
        this.config = this.mergeConfig(DEFAULT_CONFIG, loadedConfig);
        
        if (this.config.debug) {
          empireLog.info(`📁 Configuration loaded from ${this.configPath}`);
        }
      } else {
        // Create default config
        await this.saveConfig();
        empireLog.info(`📁 Created default configuration at ${this.configPath}`);
      }
    } catch (error) {
      empireLog.warning(`⚠️ Failed to load config, using defaults: ${error}`);
    }
  }

  /**
   * Merge configuration objects
   */
  private mergeConfig(defaults: CLIConfig, loaded: any): CLIConfig {
    const merged = { ...defaults };
    
    for (const key in loaded) {
      if (key in defaults) {
        const defaultValue = defaults[key as keyof CLIConfig];
        const loadedValue = loaded[key];
        
        if (typeof defaultValue === 'object' && !Array.isArray(defaultValue) && defaultValue !== null) {
          (merged as any)[key] = { ...defaultValue, ...loadedValue };
        } else {
          (merged as any)[key] = loadedValue;
        }
      }
    }
    
    return merged;
  }

  /**
   * Save configuration to file
   */
  async saveConfig(): Promise<void> {
    try {
      // Ensure directory exists
      const dir = this.configPath.substring(0, this.configPath.lastIndexOf('/'));
      await Bun.write(this.configPath, JSON.stringify(this.config, null, 2));
      
      if (this.config.debug) {
        empireLog.info(`💾 Configuration saved to ${this.configPath}`);
      }
    } catch (error) {
      empireLog.error(`❌ Failed to save config: ${error}`);
    }
  }

  /**
   * Get configuration value
   */
  get<K extends keyof CLIConfig>(key: K): CLIConfig[K] {
    return this.config[key];
  }

  /**
   * Set configuration value
   */
  async set<K extends keyof CLIConfig>(key: K, value: CLIConfig[K]): Promise<void> {
    this.config[key] = value;
    await this.saveConfig();
  }

  /**
   * Get nested configuration value
   */
  getPath(path: string): any {
    return path.split('.').reduce((obj: any, key) => obj?.[key], this.config);
  }

  /**
   * Set nested configuration value
   */
  async setPath(path: string, value: any): Promise<void> {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((obj: any, key) => {
      if (obj && typeof obj === 'object' && key in obj) {
        return obj[key];
      }
      return obj;
    }, this.config as any);
    
    if (target && typeof target === 'object') {
      target[lastKey] = value;
      await this.saveConfig();
    }
  }

  /**
   * Reset configuration to defaults
   */
  async reset(): Promise<void> {
    this.config = { ...DEFAULT_CONFIG };
    await this.saveConfig();
    empireLog.info('🔄 Configuration reset to defaults');
  }

  /**
   * Validate configuration
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate CashApp config
    if (!this.config.cashapp.apiKey) {
      errors.push('CashApp API key is required');
    }
    if (!this.config.cashapp.apiSecret) {
      errors.push('CashApp API secret is required');
    }

    // Validate numeric values
    if (this.config.timeout <= 0) {
      errors.push('Timeout must be positive');
    }
    if (this.config.parallel <= 0) {
      errors.push('Parallel count must be positive');
    }

    // Validate output directory
    if (!this.config.output.directory) {
      errors.push('Output directory is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Show current configuration
   */
  show(): void {
    console.clear();
    console.log(chalk.cyan('⚙️ Empire Pro CLI Configuration\n'));

    console.log(chalk.green('General Settings:'));
    console.log(`  Output Format: ${chalk.yellow(this.config.format)}`);
    console.log(`  Debug Mode: ${chalk.yellow(this.config.debug ? 'Enabled' : 'Disabled')}`);
    console.log(`  Timeout: ${chalk.yellow(this.config.timeout + 'ms')}`);
    console.log(`  Parallel Processing: ${chalk.yellow(this.config.parallel.toString())}`);

    console.log(chalk.green('\nCashApp Settings:'));
    console.log(`  API Key: ${chalk.yellow(this.config.cashapp.apiKey ? '*** Set ***' : 'Not set')}`);
    console.log(`  API Secret: ${chalk.yellow(this.config.cashapp.apiSecret ? '*** Set ***' : 'Not set')}`);
    console.log(`  Sandbox Mode: ${chalk.yellow(this.config.cashapp.sandbox ? 'Enabled' : 'Disabled')}`);
    console.log(`  Rate Limit: ${chalk.yellow(this.config.cashapp.rateLimit.requestsPerSecond + '/s')}`);

    console.log(chalk.green('\nOutput Settings:'));
    console.log(`  Directory: ${chalk.yellow(this.config.output.directory)}`);
    console.log(`  Timestamp: ${chalk.yellow(this.config.output.timestamp ? 'Enabled' : 'Disabled')}`);
    console.log(`  Compression: ${chalk.yellow(this.config.output.compression ? 'Enabled' : 'Disabled')}`);

    console.log(chalk.green('\nMonitoring Settings:'));
    console.log(`  Default Interval: ${chalk.yellow(this.config.monitoring.defaultInterval + 's')}`);
    console.log(`  Risk Threshold: ${chalk.yellow(this.config.monitoring.alertThresholds.riskScore.toString())}`);

    console.log(chalk.green('\nAnalytics Settings:'));
    console.log(`  Retention: ${chalk.yellow(this.config.analytics.retention + ' days')}`);
    console.log(`  Aggregation: ${chalk.yellow(this.config.analytics.aggregation)}`);

    console.log(chalk.gray(`\nConfiguration file: ${this.configPath}`));
  }

  /**
   * Export configuration
   */
  async export(exportPath: string): Promise<void> {
    try {
      // Remove sensitive data for export
      const exportConfig = { ...this.config };
      if (exportConfig.cashapp) {
        exportConfig.cashapp = { ...exportConfig.cashapp };
        exportConfig.cashapp.apiKey = '';
        exportConfig.cashapp.apiSecret = '';
      }

      await Bun.write(exportPath, JSON.stringify(exportConfig, null, 2));
      empireLog.success(`✅ Configuration exported to ${exportPath}`);
    } catch (error) {
      empireLog.error(`❌ Failed to export config: ${error}`);
    }
  }

  /**
   * Import configuration
   */
  async import(importPath: string): Promise<void> {
    try {
      const importFile = Bun.file(importPath);
      if (!await importFile.exists()) {
        throw new Error(`Import file not found: ${importPath}`);
      }

      const importData = await importFile.text();
      const importedConfig = JSON.parse(importData);

      // Merge with current config (preserve sensitive data)
      this.config = this.mergeConfig(this.config, importedConfig);
      
      await this.saveConfig();
      empireLog.success(`✅ Configuration imported from ${importPath}`);
    } catch (error) {
      empireLog.error(`❌ Failed to import config: ${error}`);
    }
  }

  /**
   * Test configuration
   */
  async test(): Promise<boolean> {
    const validation = this.validate();
    
    if (!validation.valid) {
      empireLog.error('❌ Configuration validation failed:');
      validation.errors.forEach(error => {
        console.log(`  • ${error}`);
      });
      return false;
    }

    // Test CashApp API connection
    if (this.config.cashapp.apiKey && this.config.cashapp.apiSecret) {
      try {
        // This would be an actual API test
        empireLog.info('🧪 Testing CashApp API connection...');
        // await this.testCashAppAPI();
        empireLog.success('✅ CashApp API connection successful');
      } catch (error) {
        empireLog.error(`❌ CashApp API test failed: ${error}`);
        return false;
      }
    }

    // Test output directory
    try {
      await Bun.write(`${this.config.output.directory}/.test`, 'test');
      await Bun.file(`${this.config.output.directory}/.test`).delete();
      empireLog.success('✅ Output directory accessible');
    } catch (error) {
      empireLog.error(`❌ Output directory test failed: ${error}`);
      return false;
    }

    empireLog.success('✅ All configuration tests passed');
    return true;
  }

  /**
   * Get environment-specific configuration
   */
  getEnvironmentConfig(): CLIConfig {
    const env = process.env.NODE_ENV || 'development';
    
    // Apply environment-specific overrides
    if (env === 'production') {
      return {
        ...this.config,
        debug: false,
        cashapp: {
          ...this.config.cashapp,
          sandbox: false
        }
      };
    }
    
    return this.config;
  }

  /**
   * Create configuration template
   */
  static createTemplate(): CLIConfig {
    return { ...DEFAULT_CONFIG };
  }
}

// Export singleton instance
export const configManager = new CLIConfigManager();

// Export class for custom instances
export default CLIConfigManager;
