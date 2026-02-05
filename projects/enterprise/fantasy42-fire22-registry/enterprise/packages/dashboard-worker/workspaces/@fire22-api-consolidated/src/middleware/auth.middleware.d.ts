/**
 * Authentication Middleware
 *
 * Validates JWT tokens and attaches user context to requests
 */
import type { IRequest } from 'itty-router';
export interface AuthenticatedRequest extends IRequest {
  user?: {
    id: string;
    role: string;
    level: number;
    permissions: string[];
    scope?: {
      type: string;
      field: string;
      restriction: string;
    };
  };
  token?: string;
}
/**
 * Main authentication middleware
 */
export declare function authenticate(request: AuthenticatedRequest): Promise<Response | void>;
/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export declare function authenticateOptional(request: AuthenticatedRequest): Promise<void>;
/**
 * Generate JWT token for a user
 */
export declare function generateToken(user: {
  id: string;
  role: string;
  permissions?: string[];
}): Promise<string>;
/**
 * Generate refresh token
 */
export declare function generateRefreshToken(userId: string): Promise<string>;
export default authenticate;
//# sourceMappingURL=auth.middleware.d.ts.map
