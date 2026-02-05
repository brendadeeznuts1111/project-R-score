// cascade-adaptive-configuration.ts
// [DOMAIN:CASCADE][SCOPE:CONFIG][TYPE:ADAPTIVE][META:{hierarchical:true,validated:true}][CLASS:ConfigManager][#REF:CONFIG-CORE]

import { HookRegistry } from './cascade-hooks-infrastructure';

// Hierarchical Configuration with Validation
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
}

export interface RuleConfig {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  conditions: string[];
  actions: string[];
}

export interface SkillConfig {
  id: string;
  name: string;
  enabled: boolean;
  timeout: number;
  retries: number;
  cacheEnabled: boolean;
}

export interface WorkflowConfig {
  id: string;
  name: string;
  enabled: boolean;
  steps: WorkflowStep[];
}

export interface WorkflowStep {
  id: string;
  type: 'rule' | 'skill' | 'condition';
  target: string;
  config: any;
}

export interface HookConfig {
  id: string;
  type: 'pre' | 'post' | 'around' | 'error';
  priority: number;
  enabled: boolean;
}

export interface DNSIntegrationConfig {
  enabled: boolean;
  healthCheckInterval: number;
  alerting: boolean;
}

export interface MercuryConfig {
  apiKey?: string;
  enabled: boolean;
  rateLimit: number;
}

export interface TestIntegrationConfig {
  enabled: boolean;
  testInterval: number;
  autoRemediation: boolean;
}

export interface ConfigValidationError extends Error {
  errors: string[];
  warnings: string[];
}

export class ConfigManager {
  private static instance: ConfigManager;
  private config!: CascadeConfig; // Definite assignment assertion
  private validator: ConfigValidator;
  private hookRegistry: HookRegistry;
  
  private constructor() {
    this.validator = new ConfigValidator();
    this.hookRegistry = HookRegistry.getInstance();
    this.loadConfig();
  }
  
  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }
  
  // Adaptive: Auto-reload on file change (Bun-native file watcher)
  private loadConfig(): void {
    const configPath = `./config/cascade.${this.getEnvironment()}.yml`;
    
    try {
      if (this.fileExists(configPath)) {
        this.config = this.loadYamlFile(configPath) as CascadeConfig;
      } else {
        this.config = this.getDefaultConfig();
      }
      
      // Validate immediately
      const validation = this.validator.validate(this.config);
      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }
      
      // Watch for changes in development
      if (this.getEnvironment() === 'development') {
        this.watchConfigFile(configPath);
      }
      
      console.log(`✅ Configuration loaded: ${this.config.version} (${this.config.environment})`);
    } catch (error) {
      console.error('❌ Config load failed:', error);
      this.config = this.getDefaultConfig();
    }
  }
  
  // Reinforcement: Type-safe config access
  get<T extends keyof CascadeConfig>(path: T): CascadeConfig[T];
  get<T extends keyof CascadeConfig, K extends keyof CascadeConfig[T]>(
    path: T,
    key: K
  ): CascadeConfig[T][K];
  get(path: string, key?: string): any {
    if (key) {
      return (this.config as any)[path]?.[key];
    }
    return (this.config as any)[path];
  }
  
  // Adaptive: Runtime config updates with validation
  async updateConfig(updates: Partial<CascadeConfig>): Promise<void> {
    const newConfig = this.deepMerge(this.config, updates);
    const validation = this.validator.validate(newConfig);
    
    if (!validation.valid) {
      throw new Error(`Invalid configuration update: ${validation.errors.join(', ')}`);
    }
    
    // Apply changes atomically
    this.atomicUpdate(() => {
      this.config = newConfig;
      this.emitConfigChangeEvent(updates);
    });
    
    console.log('✅ Configuration updated successfully');
  }
  
  // Hook: Extension point for config change listeners
  private emitConfigChangeEvent(updates: Partial<CascadeConfig>): void {
    this.hookRegistry.executeWithHooks(
      'config:change',
      { operation: 'config:change', data: updates, timestamp: Date.now(), requestId: this.generateRequestId() },
      async () => updates as Partial<CascadeConfig>
    ).catch(error => {
      console.error('❌ Config change hooks failed:', error);
    });
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
          enabled: true,
          healthCheckInterval: 60000,
          alerting: true
        },
        mercury: {
          enabled: false,
          rateLimit: 100
        },
        testing: {
          enabled: true,
          testInterval: 300000,
          autoRemediation: true
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
  
  private async notifyComponents(updates: Partial<CascadeConfig>): Promise<void> {
    // Notify relevant components about config changes
    if (updates.engine) {
      console.log('🔧 Engine configuration updated');
    }
    if (updates.observability) {
      console.log('📊 Observability configuration updated');
    }
    if (updates.integrations) {
      console.log('🔗 Integration configuration updated');
    }
  }
  
  private atomicUpdate(updateFn: () => void): void {
    // In a real implementation, this would use proper locking
    updateFn();
  }
  
  private watchConfigFile(configPath: string): void {
    console.log(`👀 Watching config file: ${configPath}`);
    // In a real implementation, this would use Bun.file().watch()
    setInterval(() => {
      console.log('🔄 Config file check (simulated)');
    }, 5000);
  }
  
  private getEnvironment(): string {
    return (globalThis as any).process?.env?.NODE_ENV || 'production';
  }
  
  private fileExists(path: string): boolean {
    // Mock implementation
    return false;
  }
  
  private loadYamlFile(path: string): any {
    // Mock implementation
    return {};
  }
  
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  async validateCurrentConfig(): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    return this.validator.validate(this.config);
  }
}

// Configuration Schema Validation
export class ConfigValidator {
  private schema = {
    type: 'object',
    required: ['version', 'environment', 'engine'],
    properties: {
      version: { type: 'string', pattern: /^\d+\.\d+$/ },
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
              maxConcurrent: { type: 'integer', minimum: 1, maximum: 50 },
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
      }
    }
  };
  
  validate(config: any): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Validate required fields
    for (const field of this.schema.required) {
      if (!(field in config)) {
        errors.push(`Missing required field: ${field}`);
      }
    }
    
    // Validate version format
    if (config.version && !/^\d+\.\d+$/.test(config.version)) {
      errors.push('Version must be in format X.Y');
    }
    
    // Validate environment
    if (config.environment && !['development', 'staging', 'production'].includes(config.environment)) {
      errors.push('Environment must be one of: development, staging, production');
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
    if (!engine.ruleEngine) {
      errors.push('Missing ruleEngine configuration');
    } else {
      this.validateRuleEngine(engine.ruleEngine, errors, warnings);
    }
    
    if (!engine.skillEngine) {
      errors.push('Missing skillEngine configuration');
    } else {
      this.validateSkillEngine(engine.skillEngine, errors, warnings);
    }
    
    if (!engine.memoryEngine) {
      errors.push('Missing memoryEngine configuration');
    } else {
      this.validateMemoryEngine(engine.memoryEngine, errors, warnings);
    }
  }
  
  private validateRuleEngine(ruleEngine: any, errors: string[], warnings: string[]): void {
    if (typeof ruleEngine.maxRules !== 'number' || ruleEngine.maxRules < 1 || ruleEngine.maxRules > 10000) {
      errors.push('ruleEngine.maxRules must be between 1 and 10000');
    }
    
    if (typeof ruleEngine.executionTimeout !== 'number' || ruleEngine.executionTimeout < 10 || ruleEngine.executionTimeout > 60000) {
      errors.push('ruleEngine.executionTimeout must be between 10 and 60000ms');
    }
    
    if (typeof ruleEngine.cacheSize !== 'number' || ruleEngine.cacheSize < 100 || ruleEngine.cacheSize > 100000) {
      errors.push('ruleEngine.cacheSize must be between 100 and 100000');
    }
  }
  
  private validateSkillEngine(skillEngine: any, errors: string[], warnings: string[]): void {
    if (typeof skillEngine.workerPoolSize !== 'number' || skillEngine.workerPoolSize < 1 || skillEngine.workerPoolSize > 16) {
      errors.push('skillEngine.workerPoolSize must be between 1 and 16');
    }
    
    if (typeof skillEngine.maxConcurrent !== 'number' || skillEngine.maxConcurrent < 1 || skillEngine.maxConcurrent > 50) {
      errors.push('skillEngine.maxConcurrent must be between 1 and 50');
    }
    
    if (typeof skillEngine.cacheTtl !== 'number' || skillEngine.cacheTtl < 60000 || skillEngine.cacheTtl > 3600000) {
      errors.push('skillEngine.cacheTtl must be between 60000 and 3600000ms');
    }
  }
  
  private validateMemoryEngine(memoryEngine: any, errors: string[], warnings: string[]): void {
    if (typeof memoryEngine.compressionEnabled !== 'boolean') {
      errors.push('memoryEngine.compressionEnabled must be boolean');
    }
    
    if (typeof memoryEngine.retentionDays !== 'number' || memoryEngine.retentionDays < 1 || memoryEngine.retentionDays > 365) {
      errors.push('memoryEngine.retentionDays must be between 1 and 365');
    }
    
    if (typeof memoryEngine.maxMemories !== 'number' || memoryEngine.maxMemories < 1000 || memoryEngine.maxMemories > 1000000) {
      errors.push('memoryEngine.maxMemories must be between 1000 and 1000000');
    }
  }
}
