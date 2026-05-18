/**
 * Domain Services Index
 * Centralized exports for all domain services
 */

// Logger
export * from './Logger';

// Business Services
export * from './CollectionService';
export * from './SettlementProcessor';
export * from './MetricsCalculator';

// Service types and interfaces
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
}

export interface ServiceOptions {
  timeout?: number;
  retries?: number;
  cache?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

// Factory function for creating service instances with configuration
export function createService<T>(ServiceClass: new () => T, options?: ServiceOptions): T {
  const instance = new ServiceClass();

  // Apply options if the service supports configuration
  if (options && 'configure' in instance) {
    (instance as any).configure(options);
  }

  return instance;
}
