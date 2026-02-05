// src/app.ts
// Main application using TOML configuration imports

// =============================================================================
// STATIC TOML IMPORTS
// =============================================================================

// Import main application configuration
import appConfig from "./config.toml" with { type: "toml" };
// Import bun configuration for build settings
import bunConfig from "./bunfig.toml" with { type: "toml" };

// =============================================================================
// DYNAMIC IMPORTS FOR ENVIRONMENT-SPECIFIC CONFIG
// =============================================================================

interface EnvironmentConfig {
  env: 'development' | 'production' | 'testing';
  database: {
    path: string;
    max_connections: number;
  };
  logging: {
    level: string;
    console: boolean;
  };
}

// Load environment-specific configuration
async function loadEnvironmentConfig(): Promise<EnvironmentConfig> {
  const env = import.meta.env?.NODE_ENV || 'development';
  
  try {
    // Dynamic import with type assertion
    const { default: envConfig } = await import(`./config.${env}.toml`, { 
      with: { type: "toml" } 
    }) as { default: EnvironmentConfig };
    
    return envConfig;
  } catch (error) {
    console.warn(`Environment config for ${env} not found, using defaults`);
    return getDefaultEnvironmentConfig(env);
  }
}

// Fallback configuration
function getDefaultEnvironmentConfig(env: string): EnvironmentConfig {
  return {
    env: env as 'development' | 'production' | 'testing',
    database: {
      path: './data/shortcuts.db',
      max_connections: 10
    },
    logging: {
      level: env === 'production' ? 'info' : 'debug',
      console: env !== 'production'
    }
  };
}

// =============================================================================
// APPLICATION CLASS WITH TOML CONFIGURATION
// =============================================================================

class ShortcutApp {
  private config: typeof appConfig;
  private envConfig: EnvironmentConfig = getDefaultEnvironmentConfig('development');
  private isInitialized = false;

  constructor() {
    this.config = appConfig;
  }

  // Initialize application with configuration
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ Application already initialized');
      return;
    }

    try {
      console.log(`🚀 Initializing ${this.config.app.name} v${this.config.app.version}`);
      
      // Load environment-specific configuration
      this.envConfig = await loadEnvironmentConfig();
      
      // Apply configuration
      this.setupDatabase();
      this.setupLogging();
      this.setupUnicode();
      this.setupPerformance();
      
      this.isInitialized = true;
      console.log('✅ Application initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize application:', error);
      throw error;
    }
  }

  // Setup database using configuration
  private setupDatabase(): void {
    const dbConfig = this.config.database;
    const envDbConfig = this.envConfig.database;
    
    console.log(`🗄️ Setting up database:`);
    console.log(`   Type: ${dbConfig.connection.type}`);
    console.log(`   Path: ${envDbConfig.path}`);
    console.log(`   Max connections: ${envDbConfig.max_connections}`);
    console.log(`   Journal mode: ${dbConfig.connection.journal_mode}`);
    
    // Database initialization logic would go here
    // This is where you'd use the configuration values
  }

  // Setup logging using configuration
  private setupLogging(): void {
    const logConfig = this.config.logging;
    const envLogConfig = this.envConfig.logging;
    
    console.log(`📝 Setting up logging:`);
    console.log(`   Level: ${envLogConfig.level}`);
    console.log(`   Console: ${envLogConfig.console}`);
    console.log(`   File: ${logConfig.outputs.file.enabled}`);
    console.log(`   File path: ${logConfig.outputs.file.path}`);
    
    // Logging initialization logic would go here
  }

  // Setup Unicode text processing
  private setupUnicode(): void {
    const unicodeConfig = this.config.unicode;
    
    console.log(`🌐 Setting up Unicode processing:`);
    console.log(`   Intl.Segmenter: ${unicodeConfig.grapheme_clustering.use_intl_segmenter ? 'Enabled' : 'Disabled'}`);
    console.log(`   Fallback: ${unicodeConfig.grapheme_clustering.enable_fallback ? 'Enabled' : 'Disabled'}`);
    console.log(`   Cache size: ${unicodeConfig.grapheme_clustering.cache_size}`);
    console.log(`   Supported locales: ${unicodeConfig.grapheme_clustering.supported_locales.join(', ')}`);
    console.log(`   Max text length: ${unicodeConfig.limits.max_text_length}`);
    
    // Unicode processing initialization would go here
  }

  // Setup performance monitoring
  private setupPerformance(): void {
    const perfConfig = this.config.performance;
    
    console.log(`⚡ Setting up performance monitoring:`);
    console.log(`   Metrics enabled: ${perfConfig.metrics.enabled}`);
    console.log(`   Collection interval: ${perfConfig.metrics.collection_interval}s`);
    console.log(`   Memory cache: ${perfConfig.cache.memory.enabled ? 'Enabled' : 'Disabled'}`);
    console.log(`   Disk cache: ${perfConfig.cache.disk.enabled ? 'Enabled' : 'Disabled'}`);
    
    // Performance monitoring setup would go here
  }

  // Get configuration value
  getConfigValue(path: string): any {
    const keys = path.split('.');
    let value: any = this.config;
    
    for (const key of keys) {
      value = value?.[key];
    }
    
    return value;
  }

  // Get environment configuration
  getEnvironmentConfig(): EnvironmentConfig {
    return this.envConfig;
  }

  // Reload configuration
  async reloadConfig(): Promise<void> {
    console.log('🔄 Reloading configuration...');
    
    try {
      // Dynamic import of updated configuration
      const { default: newConfig } = await import('./config.toml', { 
        with: { type: "toml" } 
      });
      
      this.config = newConfig;
      this.envConfig = await loadEnvironmentConfig();
      
      // Reinitialize with new config
      this.isInitialized = false;
      await this.initialize();
      
      console.log('✅ Configuration reloaded successfully');
    } catch (error) {
      console.error('❌ Failed to reload configuration:', error);
      throw error;
    }
  }

  // Get application info
  getAppInfo(): typeof appConfig.app {
    return this.config.app;
  }

  // Get shortcut categories
  getShortcutCategories(): typeof appConfig.shortcuts.categories {
    return this.config.shortcuts.categories;
  }

  // Get profile templates
  getProfileTemplates(): typeof appConfig.profiles.templates {
    return this.config.profiles.templates;
  }
}

// =============================================================================
// CONFIGURATION LOADING UTILITIES
// =============================================================================

// Load configuration for specific environment
export async function loadConfigForEnvironment(env: string): Promise<typeof appConfig> {
  try {
    // Try to load environment-specific config first
    const { default: config } = await import(`./config.${env}.toml`, { 
      with: { type: "toml" } 
    });
    return config;
  } catch {
    // Fallback to default config
    const { default: config } = await import('./config.toml', { 
      with: { type: "toml" } 
    });
    return config;
  }
}

// Validate configuration before use
export function validateConfig(config: typeof appConfig): boolean {
  try {
    // Check required fields
    if (!config.app.name || !config.app.version) {
      throw new Error('App name and version are required');
    }
    
    if (!config.database.connection.type) {
      throw new Error('Database type is required');
    }
    
    if (!config.unicode.grapheme_clustering) {
      throw new Error('Unicode configuration is required');
    }
    
    console.log('✅ Configuration validation passed');
    return true;
  } catch (error) {
    console.error('❌ Configuration validation failed:', error);
    return false;
  }
}

// =============================================================================
// APPLICATION INITIALIZATION
// =============================================================================

// Create and initialize application instance
export async function createApp(): Promise<ShortcutApp> {
  const app = new ShortcutApp();
  
  // Validate configuration
  if (!validateConfig(appConfig)) {
    throw new Error('Invalid configuration');
  }
  
  // Initialize application
  await app.initialize();
  
  return app;
}

// =============================================================================
// EXAMPLE USAGE
// =============================================================================

// Example 1: Basic usage with static imports
export async function basicUsage() {
  console.log('📦 Using static TOML imports:');
  console.log(`App: ${appConfig.app.name}`);
  console.log(`Version: ${appConfig.app.version}`);
  console.log(`Database: ${appConfig.database.connection.type}`);
}

// Example 2: Dynamic configuration loading
export async function dynamicUsage() {
  console.log('🔄 Using dynamic TOML imports:');
  
  const devConfig = await loadConfigForEnvironment('development');
  console.log(`Dev config loaded: ${devConfig.app.name}`);
  
  const prodConfig = await loadConfigForEnvironment('production');
  console.log(`Prod config loaded: ${prodConfig.app.name}`);
}

// Example 3: Application with configuration
export async function appWithConfig() {
  const app = await createApp();
  
  console.log('🎮 Application running with configuration:');
  console.log(`Environment: ${app.getEnvironmentConfig().env}`);
  console.log(`Database: ${app.getConfigValue('database.connection.path')}`);
  console.log(`Unicode enabled: ${app.getConfigValue('unicode.grapheme_clustering.use_intl_segmenter')}`);
  
  return app;
}

// =============================================================================
// EXPORTS
// =============================================================================

export { ShortcutApp };
export default appConfig;
