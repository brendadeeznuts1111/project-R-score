#!/usr/bin/env bun
/**
 * BarberShop ELITE Config Manager
 * ===============================
 * Type-safe configuration with validation and hot reloading
 * 
 * Elite Features:
 * - Schema validation with Zod-like interface
 * - Environment variable interpolation
 * - Hot reloading with Bun.watch
 * - Type inference
 * - Secrets masking
 */

import { watch } from 'node:fs';
import { readFile } from 'node:fs/promises';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type ConfigValue = string | number | boolean | null | ConfigValue[] | { [key: string]: ConfigValue };

interface ConfigSchema<T> {
  parse: (value: unknown) => T;
  default?: T;
}

interface ConfigOptions {
  path?: string;
  envPrefix?: string;
  allowHotReload?: boolean;
  secrets?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMA BUILDERS
// ═══════════════════════════════════════════════════════════════════════════════

class SchemaBuilder<T> implements ConfigSchema<T> {
  constructor(private validator: (value: unknown) => T, private defaultValue?: T) {}
  
  parse(value: unknown): T {
    if (value === undefined || value === null) {
      if (this.defaultValue !== undefined) return this.defaultValue;
      // Allow undefined to pass through (for optional schemas)
      if (value === undefined) {
        const result = this.validator(value);
        if (result === undefined) return result as T;
      }
      throw new Error(`Required value is undefined`);
    }
    return this.validator(value);
  }
  
  default(value: T): SchemaBuilder<T> {
    return new SchemaBuilder(this.validator, value);
  }
  
  optional(): SchemaBuilder<T | undefined> {
    return new SchemaBuilder<T | undefined>(
      (v) => v === undefined ? undefined : this.validator(v),
      undefined
    );
  }
}

export const s = {
  string: () => new SchemaBuilder<string>((v) => {
    if (typeof v !== 'string') throw new Error(`Expected string, got ${typeof v}`);
    return v;
  }),
  
  number: () => new SchemaBuilder<number>((v) => {
    if (typeof v === 'string') {
      const parsed = parseFloat(v);
      if (isNaN(parsed)) throw new Error(`Cannot parse "${v}" as number`);
      return parsed;
    }
    if (typeof v !== 'number') throw new Error(`Expected number, got ${typeof v}`);
    return v;
  }),
  
  boolean: () => new SchemaBuilder<boolean>((v) => {
    if (typeof v === 'string') {
      return v === 'true' || v === '1' || v === 'yes';
    }
    return Boolean(v);
  }),
  
  enum: <T extends string>(...values: T[]) => new SchemaBuilder<T>((v) => {
    if (typeof v !== 'string' || !values.includes(v as T)) {
      throw new Error(`Expected one of: ${values.join(', ')}`);
    }
    return v as T;
  }),
  
  array: <T>(itemSchema: SchemaBuilder<T>) => new SchemaBuilder<T[]>((v) => {
    if (!Array.isArray(v)) throw new Error(`Expected array, got ${typeof v}`);
    return v.map((item, i) => {
      try {
        return itemSchema.parse(item);
      } catch (e) {
        throw new Error(`Array item ${i}: ${(e as Error).message}`);
      }
    });
  }),
  
  object: <T extends Record<string, SchemaBuilder<any>>>(shape: T) => {
    type Result = { [K in keyof T]: T[K] extends SchemaBuilder<infer R> ? R : never };
    
    return new SchemaBuilder<Result>((v) => {
      if (typeof v !== 'object' || v === null) {
        throw new Error(`Expected object, got ${typeof v}`);
      }
      
      const result: any = {};
      for (const [key, schema] of Object.entries(shape)) {
        try {
          result[key] = (schema as SchemaBuilder<any>).parse((v as any)[key]);
        } catch (e) {
          throw new Error(`Field "${key}": ${(e as Error).message}`);
        }
      }
      return result;
    });
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ELITE CONFIG MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

export class EliteConfigManager<T extends Record<string, ConfigSchema<any>>> {
  private config: any = {};
  private schema: T;
  private options: ConfigOptions;
  private watchers: Array<(config: any) => void> = [];
  private fileWatcher: any = null;
  private secrets: Set<string>;
  
  constructor(schema: T, options: ConfigOptions = {}) {
    this.schema = schema;
    this.options = {
      path: './config.json',
      envPrefix: 'APP_',
      allowHotReload: true,
      secrets: [],
      ...options,
    };
    this.secrets = new Set(this.options.secrets);
  }
  
  /**
   * Load configuration from all sources
   */
  async load(): Promise<void> {
    const sources: Record<string, any>[] = [];
    
    // 1. Load from file if exists
    try {
      const fileContent = await readFile(this.options.path!, 'utf-8');
      const fileConfig = JSON.parse(fileContent);
      sources.push(fileConfig);
      console.log(`[CONFIG] Loaded from ${this.options.path}`);
    } catch {
      console.log(`[CONFIG] No file at ${this.options.path}, using defaults/env`);
    }
    
    // 2. Load from environment
    const envConfig = this.loadFromEnv();
    if (Object.keys(envConfig).length > 0) {
      sources.push(envConfig);
      console.log(`[CONFIG] Loaded ${Object.keys(envConfig).length} values from env`);
    }
    
    // 3. Merge and validate
    const merged = this.deepMerge({}, ...sources);
    this.config = this.validate(merged);
    
    // 4. Setup hot reload
    if (this.options.allowHotReload) {
      this.setupHotReload();
    }
    
    console.log('[CONFIG] Loaded successfully');
  }
  
  /**
   * Load from environment variables
   */
  private loadFromEnv(): Record<string, any> {
    const envConfig: Record<string, any> = {};
    const prefix = this.options.envPrefix!;
    
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(prefix) && value !== undefined) {
        const path = key.slice(prefix.length).toLowerCase().split('_');
        this.setNestedValue(envConfig, path, value);
      }
    }
    
    return envConfig;
  }
  
  private setNestedValue(obj: any, path: string[], value: string): void {
    let current = obj;
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }
    current[path[path.length - 1]] = value;
  }
  
  /**
   * Deep merge objects
   */
  private deepMerge(target: any, ...sources: any[]): any {
    for (const source of sources) {
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          target[key] = this.deepMerge(target[key] || {}, source[key]);
        } else {
          target[key] = source[key];
        }
      }
    }
    return target;
  }
  
  /**
   * Validate config against schema
   */
  private validate(config: any): any {
    const result: any = {};
    
    for (const [key, schema] of Object.entries(this.schema)) {
      try {
        result[key] = (schema as ConfigSchema<any>).parse(config[key]);
      } catch (e) {
        throw new Error(`Config validation failed for "${key}": ${(e as Error).message}`);
      }
    }
    
    return result;
  }
  
  /**
   * Setup hot reload with Bun.watch
   */
  private setupHotReload(): void {
    try {
      this.fileWatcher = watch(this.options.path!, async (event) => {
        if (event === 'change') {
          console.log('[CONFIG] File changed, reloading...');
          try {
            await this.load();
            this.notifyWatchers();
          } catch (e) {
            console.error('[CONFIG] Hot reload failed:', e);
          }
        }
      });
    } catch {}
  }
  
  /**
   * Get config value
   */
  get<K extends keyof T>(key: K): T[K] extends ConfigSchema<infer R> ? R : never {
    return this.config[key];
  }
  
  /**
   * Get full config (with secrets masked)
   */
  getConfig(maskSecrets = true): any {
    if (!maskSecrets) return this.config;
    
    const masked = JSON.parse(JSON.stringify(this.config));
    for (const secret of this.secrets) {
      if (this.getNestedValue(masked, secret) !== undefined) {
        this.setNestedValue(masked, secret.split('.'), '***');
      }
    }
    return masked;
  }
  
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((o, p) => o?.[p], obj);
  }
  
  /**
   * Subscribe to config changes
   */
  onChange(fn: (config: any) => void): () => void {
    this.watchers.push(fn);
    return () => {
      const idx = this.watchers.indexOf(fn);
      if (idx > -1) this.watchers.splice(idx, 1);
    };
  }
  
  private notifyWatchers(): void {
    for (const fn of this.watchers) {
      fn(this.config);
    }
  }
  
  /**
   * Format config for display
   */
  format(): string {
    const config = this.getConfig(true);
    return JSON.stringify(config, null, 2);
  }
  
  /**
   * Destroy and cleanup
   */
  destroy(): void {
    if (this.fileWatcher) {
      this.fileWatcher.close();
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRESET SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const ServerConfigSchema = {
  port: s.number().default(3000),
  host: s.string().default('0.0.0.0'),
  env: s.enum('development', 'staging', 'production').default('development'),
  workers: s.number().default(4),
  timeout: s.number().default(30000),
};

export const DatabaseConfigSchema = {
  url: s.string().optional(),
  host: s.string().default('localhost'),
  port: s.number().default(5432),
  database: s.string().default('barbershop'),
  username: s.string().default('postgres'),
  password: s.string().default(''),
  ssl: s.boolean().default(false),
  poolSize: s.number().default(10),
};

export const RedisConfigSchema = {
  host: s.string().default('localhost'),
  port: s.number().default(6379),
  password: s.string().optional(),
  database: s.number().default(0),
  tls: s.boolean().default(false),
};

export const AppConfigSchema = {
  server: s.object(ServerConfigSchema).default({}),
  database: s.object(DatabaseConfigSchema).default({}),
  redis: s.object(RedisConfigSchema).default({}),
  features: s.object({
    websockets: s.boolean().default(true),
    caching: s.boolean().default(true),
    rateLimiting: s.boolean().default(true),
  }).default({}),
};

// ═══════════════════════════════════════════════════════════════════════════════
// DEMO
// ═══════════════════════════════════════════════════════════════════════════════

if (import.meta.main) {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  ⚙️  ELITE CONFIG MANAGER                                        ║
╠══════════════════════════════════════════════════════════════════╣
║  Type-Safe • Schema Validation • Hot Reload • Secrets Masking    ║
╚══════════════════════════════════════════════════════════════════╝
`);
  
  // Set some env vars for demo
  process.env.APP_SERVER_PORT = '8080';
  process.env.APP_DATABASE_HOST = 'db.example.com';
  process.env.APP_FEATURES_WEBSOCKETS = 'false';
  
  const config = new EliteConfigManager(AppConfigSchema, {
    envPrefix: 'APP_',
    secrets: ['database.password', 'redis.password'],
  });
  
  console.log('1. Loading Configuration\n');
  
  try {
    await config.load();
    
    console.log('\n2. Accessing Values\n');
    console.log(`   Server port: ${config.get('server').port}`);
    console.log(`   Database host: ${config.get('database').host}`);
    console.log(`   WebSockets enabled: ${config.get('features').websockets}`);
    
    console.log('\n3. Full Config (secrets masked):\n');
    console.log(config.format());
    
    console.log('\n4. Type Safety:\n');
    console.log('   ✓ Port is number:', typeof config.get('server').port === 'number');
    console.log('   ✓ Host is string:', typeof config.get('database').host === 'string');
    console.log('   ✓ WebSockets is boolean:', typeof config.get('features').websockets === 'boolean');
    
    console.log('\n✅ Config Manager demo complete!');
    console.log('\nUsage:');
    console.log('   const config = new EliteConfigManager(schema, { envPrefix: "APP_" });');
    console.log('   await config.load();');
    console.log('   const port = config.get("server").port;');
    
  } catch (e) {
    console.error('Config error:', e);
  }
  
  config.destroy();
}

export { s as schema };
export { EliteConfigManager as default };
