/**
 * Main Application Handler
 * Entry point that initializes the application with dependency injection
 */

import { DependencyContainer, AppConfig } from '../../services/dependency-container';
import { DatabaseService } from '../../services/database-service';
import { UserService } from '../../services/user-service';
import { FeatureFlagsService } from '../../services/feature-flags';
import { AuthService } from '../../../features/authentication/services/auth-service';

export class MainApplication {
  private container: DependencyContainer;
  private config: AppConfig;

  constructor(config?: Partial<AppConfig>) {
    this.config = {
      database: {
        connectionString: process.env.DATABASE_URL || 'sqlite::memory:',
        poolSize: 10,
        timeout: 30000,
        retryAttempts: 3,
      },
      cache: {
        enabled: true,
        ttl: 3600,
      },
      logging: {
        level: (process.env.LOG_LEVEL as any) || 'info',
        enableConsole: true,
      },
      ...config,
    };

    // Initialize dependency container
    this.container = DependencyContainer.create(this.config);
  }

  /**
   * Initialize the application
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing Fire22 Dashboard Worker...');

    try {
      // Initialize core services
      await this.container.initialize();

      // Get service instances
      const dbService = this.container.get<DatabaseService>('database');
      const userService = this.container.get<UserService>('user');

      // Initialize feature services
      const authService = new AuthService(
        dbService,
        userService,
        process.env.JWT_SECRET || 'change-this-secret-in-production'
      );
      await authService.initialize();
      this.container.register('auth', authService);

      // Initialize feature flags
      const featureFlags = new FeatureFlagsService();
      await featureFlags.initialize();
      this.container.register('featureFlags', featureFlags);

      console.log('✅ Application initialized successfully');
      console.log('📊 Health Status:', this.container.getHealthStatus());
    } catch (error) {
      console.error('❌ Application initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get service from container
   */
  getService<T>(name: string): T {
    return this.container.get<T>(name);
  }

  /**
   * Get application configuration
   */
  getConfig(): AppConfig {
    return this.config;
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    return this.container.getHealthStatus();
  }

  /**
   * Cleanup application resources
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up application...');
    await this.container.cleanup();
    console.log('✅ Application cleanup completed');
  }

  /**
   * Check if feature is enabled
   */
  isFeatureEnabled(featureName: string, userId?: string): boolean {
    const featureFlags = this.container.get<FeatureFlagsService>('featureFlags');
    return featureFlags.isEnabled(featureName, userId);
  }

  /**
   * Get user flags
   */
  getUserFeatures(userId: string): Record<string, boolean> {
    const featureFlags = this.container.get<FeatureFlagsService>('featureFlags');
    return featureFlags.getUserFlags(userId);
  }
}

// Global application instance
let appInstance: MainApplication | null = null;

/**
 * Get or create application instance
 */
export async function getApplication(config?: Partial<AppConfig>): Promise<MainApplication> {
  if (!appInstance) {
    appInstance = new MainApplication(config);
    await appInstance.initialize();
  }
  return appInstance;
}

/**
 * Cleanup application (for testing or shutdown)
 */
export async function cleanupApplication(): Promise<void> {
  if (appInstance) {
    await appInstance.cleanup();
    appInstance = null;
  }
}
