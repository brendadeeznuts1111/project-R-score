import { YAML } from "bun";

/**
 * YAML Configuration Manager using Bun's native YAML support
 * Replaces external yaml package with Bun.YAML for better performance
 */
export class YamlConfigManager {
  private configCache: Map<string, any> = new Map();
  private fileWatchers: Map<string, { stop: () => void }> = new Map();

  constructor() {
    console.log("🔧 Initializing YAML Config Manager with Bun.YAML");
  }

  /**
   * Load YAML configuration from file
   */
  async load(filePath: string): Promise<any> {
    try {
      if (this.configCache.has(filePath)) {
        return this.configCache.get(filePath);
      }

      const file = Bun.file(filePath);
      const yamlContent = await file.text();
      const config = YAML.parse(yamlContent);

      this.configCache.set(filePath, config);
      console.log(`✅ Loaded YAML config: ${filePath}`);

      return config;
    } catch (error) {
      console.error(`❌ Failed to load YAML config ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Save configuration to YAML file
   */
  async save(filePath: string, config: any): Promise<void> {
    try {
      const yamlContent = YAML.stringify(config, 0, 2);
      await Bun.write(filePath, yamlContent);
      this.configCache.set(filePath, config);
      console.log(`💾 Saved YAML config: ${filePath}`);
    } catch (error) {
      console.error(`❌ Failed to save YAML config ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Get configuration value by path
   */
  get(path: string, defaultValue?: any): any {
    const keys = path.split('.');
    let current = this.getAll();

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return defaultValue;
      }
    }

    return current;
  }

  /**
   * Set configuration value by path
   */
  set(path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    let current = this.getAll();

    // Navigate to the parent object
    for (const key of keys) {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[lastKey] = value;
  }

  /**
   * Get all configuration
   */
  getAll(): any {
    // For now, return a default config structure
    // In a real implementation, this would merge multiple config files
    return {
      server: {
        port: process.env.PORT || 3001,
        host: process.env.HOST || "0.0.0.0",
        environment: process.env.NODE_ENV || "development"
      },
      database: {
        type: process.env.DB_TYPE || "postgresql",
        host: process.env.DB_HOST || "localhost",
        port: parseInt(process.env.DB_PORT || "5432"),
        name: process.env.DB_NAME || "betting_platform"
      },
      websocket: {
        enabled: true,
        port: parseInt(process.env.WS_PORT || "8080")
      },
      betting: {
        apiUrl: process.env.BETTING_API_URL || 'https://plive.sportswidgets.pro/manager-tools/',
        sessionToken: process.env.BETTING_SESSION_TOKEN,
        timeout: parseInt(process.env.BETTING_API_TIMEOUT || '30000')
      }
    };
  }

  /**
   * Export configuration in different formats
   */
  export(format: 'json' | 'yaml' | 'csv' = 'json'): string {
    const config = this.getAll();

    switch (format) {
      case 'yaml':
        return YAML.stringify(config, 0, 2);
      case 'json':
        return JSON.stringify(config, null, 2);
      case 'csv':
        // Simple CSV export of flattened config
        const flatten = (obj: any, prefix = ''): Record<string, any> => {
          const result: Record<string, any> = {};
          for (const [key, value] of Object.entries(obj)) {
            const newKey = prefix ? `${prefix}.${key}` : key;
            if (typeof value === 'object' && value !== null) {
              Object.assign(result, flatten(value, newKey));
            } else {
              result[newKey] = value;
            }
          }
          return result;
        };
        const flat = flatten(config);
        const headers = Object.keys(flat);
        const values = Object.values(flat);
        return [headers.join(','), values.join(',')].join('\n');
      default:
        return JSON.stringify(config, null, 2);
    }
  }

  /**
   * Watch configuration file for changes
   */
  watch(filePath: string, callback: (config: any) => void): void {
    if (this.fileWatchers.has(filePath)) {
      return; // Already watching
    }

    const watcher = Bun.watch([filePath], {
      persistent: true,
    }, async (event) => {
      if (event.type === 'change') {
        try {
          console.log(`🔄 Config file changed: ${filePath}`);
          this.configCache.delete(filePath);
          const newConfig = await this.load(filePath);
          callback(newConfig);
        } catch (error) {
          console.error(`❌ Error reloading config ${filePath}:`, error);
        }
      }
    });

    this.fileWatchers.set(filePath, watcher);
    console.log(`👀 Watching config file: ${filePath}`);
  }

  /**
   * Stop watching a configuration file
   */
  unwatch(filePath: string): void {
    const watcher = this.fileWatchers.get(filePath);
    if (watcher) {
      watcher.stop();
      this.fileWatchers.delete(filePath);
      console.log(`🛑 Stopped watching: ${filePath}`);
    }
  }

  /**
   * Clear configuration cache
   */
  clearCache(): void {
    this.configCache.clear();
    console.log("🧹 Cleared config cache");
  }

  /**
   * Validate configuration against schema
   */
  validate(config: any, schema?: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic validation - could be enhanced with a proper schema validator
    if (!config || typeof config !== 'object') {
      errors.push("Configuration must be a valid object");
    }

    // Check required sections
    const requiredSections = ['server', 'database'];
    for (const section of requiredSections) {
      if (!config[section]) {
        errors.push(`Missing required section: ${section}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

