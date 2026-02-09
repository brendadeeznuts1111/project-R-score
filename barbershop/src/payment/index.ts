/**
 * Payment Routing Module - Main Exports
 * Production-ready payment routing with modular architecture
 */

// Configuration
export { config, validateConfig, type PaymentConfig } from './config';

// Logging
export { logger, type LogLevel } from './logger';

// Redis Management
export { redisManager } from './redis-manager';

// Validation
export { validator, ValidationError, type ValidationResult } from './validator';

// Rate Limiting
export { 
  RateLimiter, 
  IPRateLimiter, 
  APIKeyRateLimiter,
  ipRateLimiter,
  apiKeyRateLimiter 
} from './rate-limiter';

// Error Handling
export {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError as AppValidationError,
  RateLimitError,
  ServiceUnavailableError,
  RedisError,
  PaymentError,
  handleError,
  asyncHandler,
} from './errors';

// API Handler
export { paymentHandlers, routeRequest } from './api-handler';

// Server
export { start as startServer, type default as StartFunction } from './server';

// Re-export types from core payment-routing
export type {
  PaymentSplitType,
  PaymentRouteStatus,
  FallbackTrigger,
  PaymentMethod,
  PaymentSplitRecipient,
  PaymentSplit,
  PaymentRoute,
  PaymentRouteCondition,
  FallbackPlan,
  FallbackExecution,
  RoutingConfig,
  RouteEvaluationContext,
  SplitCalculationInput,
  SplitCalculationResult,
  PaymentRoutingStats,
} from '../core/payment-routing';

// Module info
export const moduleInfo = {
  name: 'payment-routing',
  version: '1.0.0',
  description: 'Production-ready payment routing with modular architecture',
};

export default moduleInfo;
