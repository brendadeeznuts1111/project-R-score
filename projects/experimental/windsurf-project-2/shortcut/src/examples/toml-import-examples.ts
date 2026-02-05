// src/examples/toml-import-examples.ts
// Comprehensive examples of TOML imports in JavaScript/TypeScript

// =============================================================================
// STATIC IMPORT EXAMPLES
// =============================================================================

// Example 1: Basic static import
import basicConfig from "../config.toml" with { type: "toml" };

// Example 2: Static import with type annotation
import typedConfig from "../config.toml" with { type: "toml" };

// Example 3: Multiple static imports
import mainConfig from "../config.toml" with { type: "toml" };
import bunConfig from "../bunfig.toml" with { type: "toml" };

// =============================================================================
// DYNAMIC IMPORT EXAMPLES
// =============================================================================

// Example 1: Basic dynamic import
export async function loadBasicConfig() {
  const { default: config } = await import("../config.toml", { 
    with: { type: "toml" } 
  });
  return config;
}

// Example 2: Dynamic import with type assertion
export async function loadTypedConfig() {
  const { default: config } = await import("../config.toml", { 
    with: { type: "toml" } 
  }) as { default: typeof import("../config.toml") };
  return config;
}

// Type definitions for error handling
interface ConfigLoadSuccess<T = any> {
  success: true;
  config: T;
  error?: never;
}

interface ConfigLoadError {
  success: false;
  config?: never;
  error: Error;
}

type ConfigLoadResult<T = any> = ConfigLoadSuccess<T> | ConfigLoadError;

// Example 3: Dynamic import with error handling
export async function loadConfigWithErrorHandling(path: string = "../config.toml"): Promise<ConfigLoadResult> {
  try {
    const { default: config } = await import(path, { 
      with: { type: "toml" } 
    });
    return { success: true, config };
  } catch (error) {
    console.error(`Failed to load config from ${path}:`, error);
    return { success: false, error: error as Error };
  }
}

// Example 4: Conditional dynamic import
export async function loadConditionalConfig(useProduction: boolean = false) {
  const configPath = useProduction ? "../config.production.toml" : "../config.toml";
  
  const { default: config } = await import(configPath, { 
    with: { type: "toml" } 
  });
  
  return config;
}

// Example 5: Multiple dynamic imports
export async function loadMultipleConfigs() {
  const [mainConfig, bunConfig] = await Promise.all([
    import("../config.toml", { with: { type: "toml" } }),
    import("../bunfig.toml", { with: { type: "toml" } })
  ]);
  
  return {
    main: mainConfig.default,
    bun: bunConfig.default
  };
}

// =============================================================================
// ADVANCED IMPORT PATTERNS
// =============================================================================

// Example 1: Config loader class
export class TomlConfigLoader {
  private cache = new Map<string, any>();

  async load<T = any>(path: string): Promise<T> {
    // Check cache first
    if (this.cache.has(path)) {
      return this.cache.get(path);
    }

    try {
      const { default: config } = await import(path, { 
        with: { type: "toml" } 
      }) as { default: T };
      
      // Cache the result
      this.cache.set(path, config);
      return config;
    } catch (error) {
      throw new Error(`Failed to load TOML config from ${path}: ${error}`);
    }
  }

  async loadWithFallback<T>(primaryPath: string, fallbackPath: string): Promise<T> {
    try {
      return await this.load<T>(primaryPath);
    } catch {
      console.warn(`Failed to load ${primaryPath}, trying fallback ${fallbackPath}`);
      return await this.load<T>(fallbackPath);
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}

// Example 2: Environment-aware config loader
export class EnvironmentConfigLoader {
  private loader = new TomlConfigLoader();

  async loadForEnvironment(env: 'development' | 'production' | 'testing'): Promise<any> {
    const configPath = `../config.${env}.toml`;
    
    try {
      return await this.loader.YAML.parse(configPath);
    } catch {
      console.warn(`Environment config ${configPath} not found, using default`);
      return await this.loader.YAML.parse("../config.toml");
    }
  }

  async loadWithOverrides(env: string, overrides: Record<string, any>): Promise<any> {
    const config = await this.loadForEnvironment(env as any);
    
    // Apply overrides
    return this.mergeOverrides(config, overrides);
  }

  private mergeOverrides(config: any, overrides: Record<string, any>): any {
    const result = { ...config };
    
    for (const [key, value] of Object.entries(overrides)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = { ...result[key], ...value };
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }
}

// =============================================================================
// PRACTICAL USAGE EXAMPLES
// =============================================================================

// Example 1: Initialize application with TOML config
export async function initializeApp() {
  console.log('🚀 Initializing application with TOML configuration...');
  
  // Load main configuration
  const config = await loadBasicConfig();
  console.log(`📦 Loaded config: ${config.app.name} v${config.app.version}`);
  
  // Load environment-specific configuration
  const envLoader = new EnvironmentConfigLoader();
  const env = import.meta.env?.NODE_ENV || 'development';
  const envConfig = await envLoader.loadForEnvironment(env as 'development' | 'production' | 'testing');
  
  console.log(`🔧 Environment: ${env}`);
  console.log(`🌐 Unicode enabled: ${envConfig.unicode?.grapheme_clustering?.use_intl_segmenter}`);
  
  return { config, envConfig };
}

// Example 2: Configuration validation
export function validateConfiguration(config: any): boolean {
  const required = ['app.name', 'app.version', 'database.connection.type'];
  
  for (const path of required) {
    const value = getNestedValue(config, path);
    if (value === undefined || value === null) {
      console.error(`❌ Required configuration missing: ${path}`);
      return false;
    }
  }
  
  console.log('✅ Configuration validation passed');
  return true;
}

// Helper function to get nested values
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

// Example 3: Hot configuration reloading
export class HotConfigReloader {
  private config: any = null;
  private watchers = new Set<string>();
  
  async loadInitialConfig(): Promise<any> {
    this.config = await loadBasicConfig();
    return this.config;
  }

  async reloadConfig(): Promise<void> {
    const newConfig = await loadBasicConfig();
    
    if (JSON.stringify(this.config) !== JSON.stringify(newConfig)) {
      console.log('🔄 Configuration changed, reloading...');
      this.config = newConfig;
      this.notifyWatchers();
    }
  }

  watchConfig(callback: (config: any) => void): () => void {
    this.watchers.add(callback.toString());
    callback(this.config);
    
    return () => {
      this.watchers.delete(callback.toString());
    };
  }

  private notifyWatchers(): void {
    // Notify all watchers about config change
    console.log(`📢 Notified ${this.watchers.size} config watchers`);
  }

  getCurrentConfig(): any {
    return this.config;
  }
}

// Example 4: Configuration merging
export async function mergeConfigurations() {
  const loader = new TomlConfigLoader();
  
  // Load base configuration
  const baseConfig = await loader.YAML.parse("../config.toml");
  
  // Load environment-specific overrides
  const envOverrides = await loader.YAML.parse("../config.development.toml").catch(() => ({}));
  
  // Load user-specific overrides
  const userOverrides = await loader.YAML.parse("../config.user.toml").catch(() => ({}));
  
  // Merge all configurations
  const mergedConfig = {
    ...baseConfig,
    ...envOverrides,
    ...userOverrides
  };
  
  console.log('🔀 Configuration merged successfully');
  return mergedConfig;
}

// =============================================================================
// DEMO FUNCTIONS
// =============================================================================

// Demo 1: Static vs Dynamic imports
export async function demoStaticVsDynamic() {
  console.log('\n📊 Static vs Dynamic TOML Imports Demo');
  console.log('=' .repeat(50));
  
  // Static import (available immediately)
  console.log('🔹 Static import:');
  console.log(`   App: ${basicConfig.app.name}`);
  console.log(`   Version: ${basicConfig.app.version}`);
  
  // Dynamic import (async)
  console.log('\n🔸 Dynamic import:');
  const dynamicConfig = await loadBasicConfig();
  console.log(`   App: ${dynamicConfig.app.name}`);
  console.log(`   Version: ${dynamicConfig.app.version}`);
  
  // They should be the same
  console.log('\n✅ Both methods loaded the same configuration');
}

// Demo 2: Error handling
export async function demoErrorHandling() {
  console.log('\n🛠️ Error Handling Demo');
  console.log('=' .repeat(30));
  
  // Try to load non-existent config
  const result = await loadConfigWithErrorHandling("../non-existent.toml");
  
  if (result.success) {
    console.log('✅ Config loaded successfully');
  } else {
    console.log('❌ Config failed to load (expected)');
    console.log(`   Error: ${result.error.message}`);
  }
}

// Demo 3: Environment-specific configs
export async function demoEnvironmentConfigs() {
  console.log('\n🌍 Environment-Specific Configs Demo');
  console.log('=' .repeat(45));
  
  const loader = new EnvironmentConfigLoader();
  
  for (const env of ['development', 'production', 'testing'] as const) {
    try {
      const config = await loader.loadForEnvironment(env);
      console.log(`✅ ${env}: ${config.app?.name || 'Unknown'}`);
    } catch {
      console.log(`❌ ${env}: Failed to load`);
    }
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

// Export commonly used functions
export const loadConfig = loadBasicConfig;
export const loadConfigSafe = loadConfigWithErrorHandling;
export const loadEnvironmentConfig = (env: 'development' | 'production' | 'testing') => 
  new EnvironmentConfigLoader().loadForEnvironment(env);

// Export static configs for immediate use
export { basicConfig, mainConfig, bunConfig };
