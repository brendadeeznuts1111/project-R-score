/**
 * Health Controller
 *
 * Handles health check and system status operations
 */
import type { ValidatedRequest } from '../middleware/validate.middleware';
/**
 * Basic health check
 */
export declare function health(request: ValidatedRequest): Promise<Response>;
/**
 * Detailed system status
 */
export declare function status(request: ValidatedRequest): Promise<Response>;
/**
 * Test Fire22 API connectivity
 */
export declare function testFire22(request: ValidatedRequest): Promise<Response>;
/**
 * Database connectivity test
 */
export declare function testDatabase(request: ValidatedRequest): Promise<Response>;
/**
 * Readiness check
 */
export declare function ready(request: ValidatedRequest): Promise<Response>;
/**
 * Liveness check
 */
export declare function live(request: ValidatedRequest): Promise<Response>;
/**
 * Metrics endpoint
 */
export declare function metrics(request: ValidatedRequest): Promise<Response>;
//# sourceMappingURL=health.controller.d.ts.map
