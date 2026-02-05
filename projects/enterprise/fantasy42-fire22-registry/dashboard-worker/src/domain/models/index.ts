/**
 * Domain Models Index
 * Centralized exports for all domain models
 */

// Collection Models
export * from './Collection';

// Settlement Models
export * from './Settlement';

// Metrics Models
export * from './Metrics';

// Common types that might be shared across models
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt?: Date;
  version?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  metadata?: Record<string, any>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  metadata?: Record<string, any>;
}
