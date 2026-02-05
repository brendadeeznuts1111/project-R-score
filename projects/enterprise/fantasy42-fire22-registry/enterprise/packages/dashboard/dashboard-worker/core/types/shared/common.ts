/**
 * Shared Common Types
 * Common types used across multiple domains
 */

export type RiskLevel = 'low' | 'medium' | 'high' | 'extreme';

export type VIPTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export type Status = 'active' | 'inactive' | 'pending' | 'suspended' | 'cancelled';

export type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY' | 'CNY' | 'INR';

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
  isActive: boolean;
  metadata?: Record<string, any>;
}

export interface AuditTrail {
  timestamp: Date;
  action: string;
  userId: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface SearchOptions {
  query?: string;
  fields?: string[];
  filters?: Record<string, any>;
  pagination?: PaginationOptions;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings?: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  value?: any;
}

export interface ValidationWarning {
  field: string;
  code: string;
  message: string;
  value?: any;
}

export interface CacheOptions {
  ttl: number; // Time to live in seconds
  key?: string;
  tags?: string[];
}

export interface NotificationPayload {
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  recipientId: string;
  data?: Record<string, any>;
  expiresAt?: Date;
}

export interface SystemConfig {
  environment: 'development' | 'staging' | 'production';
  version: string;
  features: Record<string, boolean>;
  limits: Record<string, number>;
  rates: Record<string, number>;
}

export interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  responseTime: number;
  details?: Record<string, any>;
  errors?: string[];
}

export interface RateLimit {
  identifier: string;
  limit: number;
  window: number; // seconds
  count: number;
  resetTime: Date;
  blocked: boolean;
}

export interface QueueItem<T = any> {
  id: string;
  type: string;
  data: T;
  priority: number;
  createdAt: Date;
  processedAt?: Date;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  error?: string;
}

// Export common utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
export type NonNullable<T> = T extends null | undefined ? never : T;
export type ValueOf<T> = T[keyof T];
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];
