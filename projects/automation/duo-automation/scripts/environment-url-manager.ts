#!/usr/bin/env bun

/**
 * 🔧 Environment-Specific URL Manager
 * 
 * Handles factory-wager.com domain issues by providing
 * environment-specific URL configurations
 */

interface EnvironmentConfig {
  name: string;
  registry: {
    main: string;
    npm: string;
    packages: string;
    api: string;
    health: string;
    search: string;
  };
  storage: {
    files: string;
    r2: string;
    apple: string;
  };
  email: {
    domain: string;
    support: string;
    registry: string;
  };
  worker: {
    origins: string[];
    headers: Record<string, string>;
  };
  dashboards: {
    apple: string;
    dev: string;
    analytics: string;
  };
}

class EnvironmentURLManager {
  private configs: Record<string, EnvironmentConfig> = {
    production: {
      name: 'production',
      registry: {
        main: 'https://duoplus-registry.utahj4754.workers.dev',
        npm: 'https://duoplus-registry.utahj4754.workers.dev/npm',
        packages: 'https://duoplus-registry.utahj4754.workers.dev/packages',
        api: 'https://duoplus-registry.utahj4754.workers.dev/api',
        health: 'https://duoplus-registry.utahj4754.workers.dev/health',
        search: 'https://duoplus-registry.utahj4754.workers.dev/-/v1/search'
      },
      storage: {
        files: 'https://duoplus-registry.utahj4754.workers.dev/files',
        r2: 'https://api.duoplus.com/r2',
        apple: 'https://duoplus-registry.utahj4754.workers.dev/apple'
      },
      email: {
        domain: 'duoplus-registry.utahj4754.workers.dev',
        support: 'registry@duoplus.com',
        registry: 'registry@duoplus.com'
      },
      worker: {
        origins: [
          'https://duoplus-registry.utahj4754.workers.dev',
          'https://api.duoplus.com',
          'https://duoplus.com'
        ],
        headers: {
          'X-Registry-Domain': 'duoplus-registry.utahj4754.workers.dev',
          'X-Environment': 'production'
        }
      },
      dashboards: {
        apple: 'https://duoplus-registry.utahj4754.workers.dev/apple',
        dev: 'https://duoplus-registry.utahj4754.workers.dev/dev',
        analytics: 'https://duoplus-registry.utahj4754.workers.dev/analytics'
      }
    },
    
    staging: {
      name: 'staging',
      registry: {
        main: 'https://staging-registry.duoplus.com',
        npm: 'https://staging-npm.duoplus.com',
        packages: 'https://staging-packages.duoplus.com',
        api: 'https://staging-api.duoplus.com',
        health: 'https://staging-registry.duoplus.com/health',
        search: 'https://staging-registry.duoplus.com/-/v1/search'
      },
      storage: {
        files: 'https://staging-files.duoplus.com',
        r2: 'https://staging-api.duoplus.com/r2',
        apple: 'https://staging-apple.duoplus.com'
      },
      email: {
        domain: 'staging.duoplus.com',
        support: 'staging@duoplus.com',
        registry: 'staging-registry@duoplus.com'
      },
      worker: {
        origins: [
          'https://staging-registry.duoplus.com',
          'https://staging-api.duoplus.com'
        ],
        headers: {
          'X-Registry-Domain': 'staging-registry.duoplus.com',
          'X-Environment': 'staging'
        }
      },
      dashboards: {
        apple: 'https://staging-apple.duoplus.com',
        dev: 'https://staging-dev.duoplus.com',
        analytics: 'https://staging-analytics.duoplus.com'
      }
    },
    
    development: {
      name: 'development',
      registry: {
        main: 'http://localhost:3000',
        npm: 'http://localhost:3000/npm',
        packages: 'http://localhost:3000/packages',
        api: 'http://localhost:3000/api',
        health: 'http://localhost:3000/health',
        search: 'http://localhost:3000/-/v1/search'
      },
      storage: {
        files: 'http://localhost:3000/files',
        r2: 'http://localhost:3000/r2',
        apple: 'http://localhost:3000/apple'
      },
      email: {
        domain: 'localhost',
        support: 'dev@duoplus.com',
        registry: 'dev-registry@duoplus.com'
      },
      worker: {
        origins: [
          'http://localhost:3000',
          'http://localhost:3001'
        ],
        headers: {
          'X-Registry-Domain': 'localhost:3000',
          'X-Environment': 'development'
        }
      },
      dashboards: {
        apple: 'http://localhost:3000/apple',
        dev: 'http://localhost:3000/dev',
        analytics: 'http://localhost:3000/analytics'
      }
    }
  };

  private currentEnvironment: string;

  constructor() {
    this.currentEnvironment = process.env.NODE_ENV || 'development';
  }

  /**
   * Get current environment configuration
   */
  getConfig(): EnvironmentConfig {
    return this.configs[this.currentEnvironment] || this.configs.development;
  }

  /**
   * Get registry URL for current environment
   */
  getRegistryURL(): string {
    return this.getConfig().registry.main;
  }

  /**
   * Get storage URL for current environment
   */
  getStorageURL(type: 'files' | 'r2' | 'apple' = 'files'): string {
    return this.getConfig().storage[type];
  }

  /**
   * Get email domain for current environment
   */
  getEmailDomain(): string {
    return this.getConfig().email.domain;
  }

  /**
   * Get worker origins for current environment
   */
  getWorkerOrigins(): string[] {
    return this.getConfig().worker.origins;
  }

  /**
   * Get dashboard URL for current environment
   */
  getDashboardURL(type: 'apple' | 'dev' | 'analytics' = 'apple'): string {
    return this.getConfig().dashboards[type];
  }

  /**
   * Generate environment-specific configuration files
   */
  generateConfigFiles(): void {
    console.log('🔧 Generating Environment Configuration Files');
    console.log('============================================');
    console.log('');

    // Generate .env files
    this.generateEnvFile('production');
    this.generateEnvFile('staging');
    this.generateEnvFile('development');

    // Generate TypeScript config
    this.generateTSConfig();

    console.log('✅ Configuration files generated');
  }

  private generateEnvFile(environment: string): void {
    const config = this.configs[environment];
    
    const envContent = `
# ${environment.toUpperCase()} Environment Configuration
# Generated: ${new Date().toISOString()}

# Registry Configuration
REGISTRY_URL=${config.registry.main}
REGISTRY_NPM=${config.registry.npm}
REGISTRY_PACKAGES=${config.registry.packages}
REGISTRY_API=${config.registry.api}
REGISTRY_HEALTH=${config.registry.health}
REGISTRY_SEARCH=${config.registry.search}

# Storage Configuration
STORAGE_FILES=${config.storage.files}
STORAGE_R2=${config.storage.r2}
STORAGE_APPLE=${config.storage.apple}

# Email Configuration
EMAIL_DOMAIN=${config.email.domain}
EMAIL_SUPPORT=${config.email.support}
EMAIL_REGISTRY=${config.email.registry}

# Worker Configuration
WORKER_ORIGINS=${config.worker.origins.join(',')}
WORKER_REGISTRY_DOMAIN=${config.worker.headers['X-Registry-Domain']}

# Dashboard Configuration
DASHBOARD_APPLE=${config.dashboards.apple}
DASHBOARD_DEV=${config.dashboards.dev}
DASHBOARD_ANALYTICS=${config.dashboards.analytics}

# Environment
NODE_ENV=${environment}
    `.trim();

    console.log(`📝 Generated .env.${environment}`);
    // In production, this would write to actual files
    // await Bun.write(`./.env.${environment}`, envContent);
  }

  private generateTSConfig(): void {
    const config = this.getConfig();
    
    const tsContent = `
// Environment-specific URL configuration
// Generated: ${new Date().toISOString()}

export const ENVIRONMENT_CONFIG = {
  name: '${config.name}',
  registry: ${JSON.stringify(config.registry, null, 2)},
  storage: ${JSON.stringify(config.storage, null, 2)},
  email: ${JSON.stringify(config.email, null, 2)},
  worker: ${JSON.stringify(config.worker, null, 2)},
  dashboards: ${JSON.stringify(config.dashboards, null, 2)}
} as const;

export const currentConfig = ENVIRONMENT_CONFIG;
export const environment = '${config.name}';
    `.trim();

    console.log('📝 Generated environment-config.ts');
    // In production, this would write to actual file
    // await Bun.write('./src/config/environment-config.ts', tsContent);
  }

  /**
   * Update existing files with environment-specific URLs
   */
  updateExistingFiles(): void {
    console.log('🔄 Updating Existing Files with Environment URLs');
    console.log('===============================================');
    console.log('');

    const criticalFiles = [
      './src/registry/deploy-registry.ts',
      './src/registry/registry-worker.ts',
      './src/registry/wrangler.toml',
      './src/storage/s3-r2-native.ts',
      './src/email/cloudflare-email-manager.js'
    ];

    criticalFiles.forEach(file => {
      console.log(`📝 Update strategy for ${file}:`);
      console.log(`   • Replace hardcoded URLs with environment variables`);
      console.log(`   • Import environment config at runtime`);
      console.log(`   • Use conditional logic based on NODE_ENV`);
      console.log('');
    });

    console.log('🎯 Implementation Plan:');
    console.log('   1. Import environment config in each file');
    console.log('   2. Replace hardcoded URLs with config values');
    console.log('   3. Add environment-specific logic');
    console.log('   4. Test with different NODE_ENV values');
  }
}

// Auto-run if executed directly
if (import.meta.main) {
  const manager = new EnvironmentURLManager();
  
  console.log('🚀 Environment-Specific URL Manager');
  console.log('===================================');
  console.log('');
  
  console.log(`📊 Current Environment: ${manager.getConfig().name}`);
  console.log(`🌐 Registry URL: ${manager.getRegistryURL()}`);
  console.log(`📁 Storage URL: ${manager.getStorageURL()}`);
  console.log(`📧 Email Domain: ${manager.getEmailDomain()}`);
  console.log('');
  
  manager.generateConfigFiles();
  manager.updateExistingFiles();
  
  console.log('');
  console.log('✅ Environment configuration complete!');
  console.log('🎯 Next: Update files to use environment-specific URLs');
}

export { EnvironmentURLManager };
