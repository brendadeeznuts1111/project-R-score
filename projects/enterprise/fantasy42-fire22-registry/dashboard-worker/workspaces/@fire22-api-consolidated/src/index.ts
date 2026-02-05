/**
 * @fire22/api-consolidated
 *
 * Enterprise-grade consolidated Fire22 API implementation
 * Features: RBAC, JWT auth, Zod validation, rate limiting, comprehensive testing
 */

// Export main router
export { default } from './router';
export { default as api } from './router';

// Export middleware
export * from './middleware/auth.middleware';
export * from './middleware/authorize.middleware';
export * from './middleware/validate.middleware';
export * from './middleware/rateLimit.middleware';

// Export controllers
export * as AuthController from './controllers/auth.controller';
export * as AdminController from './controllers/admin.controller';
export * as ManagerController from './controllers/manager.controller';
export * as CustomerController from './controllers/customer.controller';
export * as HealthController from './controllers/health.controller';
export * as FinancialController from './controllers/financial.controller';

// Export route definitions
export { authRoutes } from './routes/auth.routes';
export { adminRoutes } from './routes/admin.routes';
export { managerRoutes } from './routes/manager.routes';
export { customerRoutes } from './routes/customer.routes';
export { healthRoutes } from './routes/health.routes';
export { financialRoutes } from './routes/financial.routes';

// Export schemas and validation
export * from './schemas';

// Export types
export interface Fire22APIConfig {
  jwtSecret?: string;
  rateLimit?: {
    enabled: boolean;
    storage?: 'memory' | 'cloudflare-kv';
  };
  validation?: {
    enabled: boolean;
    strict?: boolean;
  };
  cors?: {
    origins: string[];
    methods: string[];
  };
}

export interface Fire22APIContext {
  env?: any;
  ctx?: any;
  request: Request;
}
