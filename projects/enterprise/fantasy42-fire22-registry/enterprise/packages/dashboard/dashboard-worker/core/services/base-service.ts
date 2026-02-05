/**
 * Base Service Class
 * Provides common functionality for all services
 */

export abstract class BaseService {
  protected name: string;

  constructor(serviceName: string) {
    this.name = serviceName;
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    console.log(`Initializing ${this.name} service`);
  }

  /**
   * Cleanup service resources
   */
  async cleanup(): Promise<void> {
    console.log(`Cleaning up ${this.name} service`);
  }

  /**
   * Get service health status
   */
  getHealth(): { status: string; uptime: number; lastCheck: Date } {
    return {
      status: 'healthy',
      uptime: process.uptime(),
      lastCheck: new Date(),
    };
  }

  /**
   * Validate service configuration
   */
  protected validateConfig(config: any): boolean {
    return true; // Override in subclasses
  }
}

/**
 * Service Registry for managing service instances
 */
export class ServiceRegistry {
  private static instance: ServiceRegistry;
  private services: Map<string, BaseService> = new Map();

  private constructor() {}

  static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }

  register(serviceName: string, service: BaseService): void {
    this.services.set(serviceName, service);
  }

  get<T extends BaseService>(serviceName: string): T | undefined {
    return this.services.get(serviceName) as T;
  }

  async initializeAll(): Promise<void> {
    for (const [name, service] of this.services) {
      await service.initialize();
    }
  }

  async cleanupAll(): Promise<void> {
    for (const [name, service] of this.services) {
      await service.cleanup();
    }
  }
}
