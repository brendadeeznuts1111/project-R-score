/**
 * Dependency Injection Container
 * Manages service dependencies and lifecycle
 */

import { DatabaseService, DatabaseConfig } from './database-service';
import { UserService } from './user-service';
import { BaseService } from './base-service';

export interface AppConfig {
  database: DatabaseConfig;
  cache: {
    enabled: boolean;
    ttl: number;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableConsole: boolean;
  };
}

export class DependencyContainer {
  private static instance: DependencyContainer;
  private services: Map<string, any> = new Map();
  private config: AppConfig;

  private constructor(config: AppConfig) {
    this.config = config;
  }

  static create(config: AppConfig): DependencyContainer {
    if (DependencyContainer.instance) {
      throw new Error('Dependency container already exists. Use getInstance() instead.');
    }
    DependencyContainer.instance = new DependencyContainer(config);
    return DependencyContainer.instance;
  }

  static getInstance(): DependencyContainer {
    if (!DependencyContainer.instance) {
      throw new Error('Dependency container not initialized. Call create() first.');
    }
    return DependencyContainer.instance;
  }

  /**
   * Register a service with the container
   */
  register<T>(name: string, service: T): void {
    this.services.set(name, service);
  }

  /**
   * Get a service from the container
   */
  get<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service '${name}' not found in container`);
    }
    return service as T;
  }

  /**
   * Initialize all services
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing dependency container...');

    // Initialize database service first
    const dbService = new DatabaseService(this.config.database);
    await dbService.initialize();
    this.register('database', dbService);

    // Initialize user service with database dependency
    const userService = new UserService(dbService);
    await userService.initialize();
    this.register('user', userService);

    console.log('✅ All services initialized successfully');
  }

  /**
   * Cleanup all services
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up services...');

    for (const [name, service] of this.services) {
      if (service instanceof BaseService) {
        await service.cleanup();
      }
    }

    this.services.clear();
    console.log('✅ All services cleaned up');
  }

  /**
   * Get application configuration
   */
  getConfig(): AppConfig {
    return { ...this.config };
  }

  /**
   * Check health of all services
   */
  getHealthStatus(): Record<string, any> {
    const status: Record<string, any> = {
      timestamp: new Date().toISOString(),
      services: {},
    };

    for (const [name, service] of this.services) {
      if (service instanceof BaseService) {
        status.services[name] = service.getHealth();
      } else {
        status.services[name] = { status: 'unknown' };
      }
    }

    return status;
  }
}
