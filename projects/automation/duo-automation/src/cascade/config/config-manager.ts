/**
 * Cascade Adaptive Configuration System
 * Hierarchical configuration with validation and auto-reloading
 * [#REF:CONFIG-CORE]
 */

// Type declarations for Bun APIs and Node.js globals
declare const Bun: {
  file(path: string): { exists(): boolean; yaml(): any };
  watch(path: string, callback: (event: any) => void): any;
} | undefined;

declare const process: {
  env: Record<string, string | undefined>;
  NODE_ENV?: string;
};

export interface RuleConfig {
  id: string;
  name: string;
  priority: number;
  conditions: any[];
  actions: any[];
  metadata?: Record<string, any>;
}

export interface SkillConfig {
  id: string;
  name: string;
  type: string;
  config: Record<string, any>;
  dependencies?: string[];
}

export interface WorkflowConfig {
  id: string;
  name: string;
  steps: any[];
  triggers: any[];
  metadata?: Record<string, any>;
}

export interface HookConfig {
  id: string;
  type: 'pre' | 'post' | 'around' | 'error';
  priority: number;
  handler: string;
  condition?: string;
}

export interface DNSIntegrationConfig {
  enabled: boolean;
  provider: string;
  apiKey?: string;
  zones: string[];
}

export interface MercuryConfig {
  enabled: boolean;
  endpoint: string;
  timeout: number;
  retries: number;
}

export interface TestIntegrationConfig {
  enabled: boolean;
  framework: string;
  coverage: boolean;
  parallel: boolean;
}

export interface CascadeConfig {
  version: string;
  environment: 'development' | 'staging' | 'production';
  engine: {
    ruleEngine: {
      maxRules: number;
      executionTimeout: number;
      cacheSize: number;
    };
    skillEngine: {
      workerPoolSize: number;
      maxConcurrent: number;
      cacheTtl: number;
    };
    memoryEngine: {
      compressionEnabled: boolean;
      retentionDays: number;
      maxMemories: number;
    };
  };
  rules: RuleConfig[];
  skills: SkillConfig[];
  workflows: WorkflowConfig[];
  hooks: HookConfig[];
  integrations: {
    dns: DNSIntegrationConfig;
    mercury: MercuryConfig;
    testing: TestIntegrationConfig;
  };
  observability: {
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    metricsEnabled: boolean;
    tracingEnabled: boolean;
    exporters: string[];
  };
  [key: string]: any; // Index signature for dynamic access
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ConfigChangeEvent {
  timestamp: number;
  changes: Partial<CascadeConfig>;
  source: string;
}

/**
 * Configuration Manager with adaptive features
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config!: CascadeConfig;
  private validator: ConfigValidator;
  private listeners: Array<(event: ConfigChangeEvent) => void> = [];
  private configPath!: string;
  
  private constructor() {
    this.validator = new ConfigValidator();
    this.loadConfig();
    this.setupFileWatcher();
  }
  
  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }
  
  /**
   * Adaptive: Auto-reload on file change (Bun-native file watcher)
   */
  private loadConfig(): void {
    const env = process.env?.NODE_ENV || 'production';
    this.configPath = `./config/cascade.${env}.yml`;
    
    try {
      if (Bun?.file && Bun.file(this.configPath).exists()) {
        const configData = Bun.file(this.configPath);
        this.config = configData.yaml() as CascadeConfig;
        console.log(`📋 Loaded configuration from ${this.configPath}`);
      } else {
        console.warn(`⚠️ Config file ${this.configPath} not found, using defaults`);
        this.config = this.getDefaultConfig();
      }
      
      // Validate immediately
      const validation = this.validator.validate(this.config);
      if (!validation.valid) {
        throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
      }
      
      if (validation.warnings.length > 0) {
        console.warn('⚠️ Configuration warnings:', validation.warnings);
      }
      
    } catch (error) {
      console.error('❌ Failed to load configuration:', error);
      this.config = this.getDefaultConfig();
    }
  }
  
  /**
   * Setup file watcher for development
   */
  private setupFileWatcher(): void {
    if (process.env?.NODE_ENV !== 'development') return;
    
    try {
      if (Bun?.watch) {
        const watcher = Bun.watch(this.configPath, async (event: any) => {
          if (event.type === 'update') {
            console.log('🔄 Config file changed, reloading...');
            try {
              const oldConfig = { ...this.config };
              this.loadConfig();
              
              // Notify listeners
              const changes = this.detectChanges(oldConfig, this.config);
              if (Object.keys(changes).length > 0) {
                this.notifyListeners({
                  timestamp: Date.now(),
                  changes,
                  source: 'file-watcher'
                });
              }
              
            } catch (error) {
              console.error('❌ Config reload failed:', error);
            }
          }
        });
        
        console.log('👁️ Config file watcher enabled');
      }
    } catch (error) {
      console.warn('⚠️ Failed to setup config watcher:', error);
    }
  }
  
  /**
   * Reinforcement: Type-safe config access
   */
  get<T extends keyof CascadeConfig>(path: T): CascadeConfig[T];
  get<T extends keyof CascadeConfig, K extends keyof CascadeConfig[T]>(
    path: T,
    key: K
  ): CascadeConfig[T][K];
  get(path: string, key?: string): any {
    if (key) {
      return this.config[path]?.[key];
    }
    return this.config[path];
  }
  
  /**
   * Get entire config object
   */
  getAll(): CascadeConfig {
    return { ...this.config };
  }
  
  /**
   * Adaptive: Runtime config updates with validation
   */
  async updateConfig(updates: Partial<CascadeConfig>, source: string = 'runtime'): Promise<void> {
    const newConfig = this.deepMerge(this.config, updates);
    const validation = this.validator.validate(newConfig);
    
    if (!validation.valid) {
      throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Store old config for comparison
    const oldConfig = { ...this.config };
    
    // Apply changes atomically
    this.config = newConfig;
    
    // Notify listeners
    this.notifyListeners({
      timestamp: Date.now(),
      changes: updates,
      source
    });
    
    console.log(`✅ Configuration updated from ${source}`);
    
    if (validation.warnings.length > 0) {
      console.warn('⚠️ Update warnings:', validation.warnings);
    }
  }
  
  /**
   * Subscribe to config changes
   */
  onChange(listener: (event: ConfigChangeEvent) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
  
  /**
   * Validate current configuration
   */
  validateCurrentConfig(): ValidationResult {
    return this.validator.validate(this.config);
  }
  
  /**
   * Get configuration schema
   */
  getSchema(): any {
    return this.validator.getSchema();
  }
  
  private getDefaultConfig(): CascadeConfig {
    return {
      version: '2.1',
      environment: 'production',
      engine: {
        ruleEngine: {
          maxRules: 1000,
          executionTimeout: 100,
          cacheSize: 10000
        },
        skillEngine: {
          workerPoolSize: 4,
          maxConcurrent: 10,
          cacheTtl: 300000
        },
        memoryEngine: {
          compressionEnabled: true,
          retentionDays: 90,
          maxMemories: 100000
        }
      },
      rules: [],
      skills: [],
      workflows: [],
      hooks: [],
      integrations: {
        dns: {
          enabled: false,
          provider: 'cloudflare',
          zones: []
        },
        mercury: {
          enabled: false,
          endpoint: 'https://api.mercury.com',
          timeout: 5000,
          retries: 3
        },
        testing: {
          enabled: true,
          framework: 'bun',
          coverage: true,
          parallel: true
        }
      },
      observability: {
        logLevel: 'info',
        metricsEnabled: true,
        tracingEnabled: true,
        exporters: ['console', 'file']
      }
    };
  }
  
  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }
  
  private detectChanges(oldConfig: CascadeConfig, newConfig: CascadeConfig): Partial<CascadeConfig> {
    const changes: Partial<CascadeConfig> = {};
    
    // Simple deep comparison for top-level changes
    for (const key in newConfig) {
      if (JSON.stringify(oldConfig[key]) !== JSON.stringify(newConfig[key])) {
        (changes as any)[key] = newConfig[key];
      }
    }
    
    return changes;
  }
  
  private notifyListeners(event: ConfigChangeEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('❌ Config listener error:', error);
      }
    }
  }
}

/**
 * Configuration Validator
 */
export class ConfigValidator {
  private schema = {
    type: 'object',
    required: ['version', 'environment', 'engine'],
    properties: {
      version: { type: 'string', pattern: /^\\d+\\.\\d+$/ },
      environment: { enum: ['development', 'staging', 'production'] },
      engine: {
        type: 'object',
        required: ['ruleEngine', 'skillEngine', 'memoryEngine'],
        properties: {
          ruleEngine: {
            type: 'object',
            required: ['maxRules', 'executionTimeout', 'cacheSize'],
            properties: {
              maxRules: { type: 'integer', minimum: 1, maximum: 10000 },
              executionTimeout: { type: 'integer', minimum: 10, maximum: 60000 },
              cacheSize: { type: 'integer', minimum: 100, maximum: 100000 }
            }
          },
          skillEngine: {
            type: 'object',
            required: ['workerPoolSize', 'maxConcurrent', 'cacheTtl'],
            properties: {
              workerPoolSize: { type: 'integer', minimum: 1, maximum: 16 },
              maxConcurrent: { type: 'integer', minimum: 1, maximum: 100 },
              cacheTtl: { type: 'integer', minimum: 60000, maximum: 3600000 }
            }
          },
          memoryEngine: {
            type: 'object',
            required: ['compressionEnabled', 'retentionDays', 'maxMemories'],
            properties: {
              compressionEnabled: { type: 'boolean' },
              retentionDays: { type: 'integer', minimum: 1, maximum: 365 },
              maxMemories: { type: 'integer', minimum: 1000, maximum: 1000000 }
            }
          }
        }
      },
      observability: {
        type: 'object',
        properties: {
          logLevel: { enum: ['debug', 'info', 'warn', 'error'] },
          metricsEnabled: { type: 'boolean' },
          tracingEnabled: { type: 'boolean' },
          exporters: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  };
  
  validate(config: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Validate required fields
    for (const field of this.schema.required) {
      if (!(field in config)) {
        errors.push(`Missing required field: ${field}`);
      }
    }
    
    // Validate version format
    if (config.version && !/^\\d+\\.\\d+$/.test(config.version)) {
      errors.push('Version must be in format X.Y');
    }
    
    // Validate environment
    if (config.environment && !['development', 'staging', 'production'].includes(config.environment)) {
      errors.push('Environment must be development, staging, or production');
    }
    
    // Validate engine configuration
    if (config.engine) {
      this.validateEngine(config.engine, errors, warnings);
    }
    
    // Adaptive: Performance warnings
    if (config.engine?.ruleEngine?.cacheSize < 1000) {
      warnings.push('Cache size < 1000 may impact performance');
    }
    
    if (config.engine?.skillEngine?.workerPoolSize < 2) {
      warnings.push('Worker pool size < 2 may cause delays');
    }
    
    // Reinforcement: Security validation
    if (config.environment === 'production' && config.observability?.logLevel === 'debug') {
      warnings.push('Debug logging in production may leak sensitive data');
    }
    
    return { valid: errors.length === 0, errors, warnings };
  }
  
  private validateEngine(engine: any, errors: string[], warnings: string[]): void {
    // Rule Engine validation
    if (engine.ruleEngine) {
      const re = engine.ruleEngine;
      if (re.maxRules && (re.maxRules < 1 || re.maxRules > 10000)) {
        errors.push('ruleEngine.maxRules must be between 1 and 10000');
      }
      if (re.executionTimeout && (re.executionTimeout < 10 || re.executionTimeout > 60000)) {
        errors.push('ruleEngine.executionTimeout must be between 10ms and 60s');
      }
    }
    
    // Skill Engine validation
    if (engine.skillEngine) {
      const se = engine.skillEngine;
      if (se.workerPoolSize && (se.workerPoolSize < 1 || se.workerPoolSize > 16)) {
        errors.push('skillEngine.workerPoolSize must be between 1 and 16');
      }
    }
    
    // Memory Engine validation
    if (engine.memoryEngine) {
      const me = engine.memoryEngine;
      if (me.retentionDays && (me.retentionDays < 1 || me.retentionDays > 365)) {
        errors.push('memoryEngine.retentionDays must be between 1 and 365');
      }
    }
  }
  
  getSchema(): any {
    return this.schema;
  }
}

export class ConfigValidationError extends Error {
  constructor(message: string, public errors: string[]) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}
