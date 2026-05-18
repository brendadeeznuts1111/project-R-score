/**
 * 📦 Fire22 Dashboard - Repository Pattern Index
 * Unified exports for all repository classes and utilities
 */

// Base repository classes
export { BaseRepository, BaseAuditableRepository } from './base-repository';

// Domain repositories
export { default as CustomerRepository } from './customer-repository';

// Repository registry for dependency injection
import type { DatabaseConnection } from '../types/database/base';
import CustomerRepository from './customer-repository';

/**
 * Repository factory class for creating repository instances
 */
export class RepositoryFactory {
  private connection: DatabaseConnection;
  private repositories: Map<string, any> = new Map();

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  /**
   * Get Customer repository
   */
  getCustomerRepository(): CustomerRepository {
    if (!this.repositories.has('customer')) {
      this.repositories.set('customer', new CustomerRepository(this.connection));
    }
    return this.repositories.get('customer');
  }

  /**
   * Clear all cached repositories
   */
  clearCache(): void {
    this.repositories.clear();
  }

  /**
   * Get all repository instances
   */
  getAllRepositories(): {
    customer: CustomerRepository;
  } {
    return {
      customer: this.getCustomerRepository(),
    };
  }
}

/**
 * Repository container for managing repository lifecycle
 */
export class RepositoryContainer {
  private factory: RepositoryFactory;
  private connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
    this.factory = new RepositoryFactory(connection);
  }

  /**
   * Get repository factory
   */
  getFactory(): RepositoryFactory {
    return this.factory;
  }

  /**
   * Get database connection
   */
  getConnection(): DatabaseConnection {
    return this.connection;
  }

  /**
   * Initialize all repositories
   */
  async initialize(): Promise<void> {
    // Initialize any repository-specific setup here
    // For example, creating indexes, setting up triggers, etc.
  }

  /**
   * Close all repository connections
   */
  async close(): Promise<void> {
    this.factory.clearCache();
    // Close database connection if needed
  }

  /**
   * Health check for all repositories
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    repositories: Record<string, boolean>;
    connection: boolean;
  }> {
    const repositories: Record<string, boolean> = {};
    let allHealthy = true;

    try {
      // Test customer repository
      const customerRepo = this.factory.getCustomerRepository();
      await customerRepo.count(); // Simple query to test connection
      repositories.customer = true;
    } catch (error) {
      repositories.customer = false;
      allHealthy = false;
    }

    // Test database connection
    let connectionHealthy = true;
    try {
      // This would be implemented with actual connection test
      // await this.connection.query('SELECT 1');
    } catch (error) {
      connectionHealthy = false;
      allHealthy = false;
    }

    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      repositories,
      connection: connectionHealthy,
    };
  }
}

/**
 * Global repository container instance
 */
let globalContainer: RepositoryContainer | null = null;

/**
 * Initialize global repository container
 */
export function initializeRepositories(connection: DatabaseConnection): RepositoryContainer {
  globalContainer = new RepositoryContainer(connection);
  return globalContainer;
}

/**
 * Get global repository container
 */
export function getRepositoryContainer(): RepositoryContainer {
  if (!globalContainer) {
    throw new Error('Repository container not initialized. Call initializeRepositories() first.');
  }
  return globalContainer;
}

/**
 * Get repository factory from global container
 */
export function getRepositoryFactory(): RepositoryFactory {
  return getRepositoryContainer().getFactory();
}

/**
 * Utility function to get customer repository
 */
export function getCustomerRepository(): CustomerRepository {
  return getRepositoryFactory().getCustomerRepository();
}

/**
 * Repository service interface for dependency injection
 */
export interface RepositoryService {
  customer: CustomerRepository;
}

/**
 * Create repository service
 */
export function createRepositoryService(connection: DatabaseConnection): RepositoryService {
  const factory = new RepositoryFactory(connection);

  return {
    customer: factory.getCustomerRepository(),
  };
}

/**
 * Repository transaction helper
 */
export class RepositoryTransaction {
  private connection: DatabaseConnection;
  private transaction: any; // Would be actual transaction type

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  /**
   * Begin transaction
   */
  async begin(): Promise<void> {
    // this.transaction = await this.connection.beginTransaction();
  }

  /**
   * Commit transaction
   */
  async commit(): Promise<void> {
    if (this.transaction) {
      // await this.connection.commitTransaction(this.transaction);
    }
  }

  /**
   * Rollback transaction
   */
  async rollback(): Promise<void> {
    if (this.transaction) {
      // await this.connection.rollbackTransaction(this.transaction);
    }
  }

  /**
   * Execute function within transaction
   */
  async execute<T>(fn: (transaction: any) => Promise<T>): Promise<T> {
    await this.begin();

    try {
      const result = await fn(this.transaction);
      await this.commit();
      return result;
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }
}

/**
 * Create transaction helper
 */
export function createTransaction(connection: DatabaseConnection): RepositoryTransaction {
  return new RepositoryTransaction(connection);
}

// Default export with all utilities
export default {
  // Base classes
  BaseRepository,
  BaseAuditableRepository,

  // Domain repositories
  CustomerRepository,

  // Factory and container
  RepositoryFactory,
  RepositoryContainer,
  RepositoryTransaction,

  // Utility functions
  initializeRepositories,
  getRepositoryContainer,
  getRepositoryFactory,
  getCustomerRepository,
  createRepositoryService,
  createTransaction,
};
