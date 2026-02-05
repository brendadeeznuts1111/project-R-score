/**
 * Authentication Controller
 *
 * Handles authentication operations for Fire22 dashboard
 */
import type { ValidatedRequest } from '../middleware/validate.middleware';
/**
 * User login
 */
export declare function login(request: ValidatedRequest): Promise<Response>;
/**
 * User logout
 */
export declare function logout(request: ValidatedRequest): Promise<Response>;
/**
 * Verify token
 */
export declare function verify(request: ValidatedRequest): Promise<Response>;
/**
 * Refresh access token
 */
export declare function refresh(request: ValidatedRequest): Promise<Response>;
//# sourceMappingURL=auth.controller.d.ts.map
