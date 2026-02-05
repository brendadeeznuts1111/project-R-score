/**
 * Authorization Middleware
 *
 * Enforces role-based access control and scope restrictions
 */
import type { AuthenticatedRequest } from './auth.middleware';
/**
 * Authorization middleware factory
 *
 * @param options Authorization options
 * @param options.permissions Required permissions (AND logic)
 * @param options.anyPermissions Required permissions (OR logic)
 * @param options.roles Allowed roles
 * @param options.minLevel Minimum role level required
 * @param options.checkScope Whether to enforce scope restrictions
 */
export declare function authorize(
  options:
    | {
        permissions?: string[];
        anyPermissions?: string[];
        roles?: string[];
        minLevel?: number;
        checkScope?: boolean;
      }
    | string[]
): (request: AuthenticatedRequest) => Promise<Response | void>;
/**
 * Preset authorization middleware for common roles
 */
export declare const requireAdmin: (request: AuthenticatedRequest) => Promise<Response | void>;
export declare const requireManager: (request: AuthenticatedRequest) => Promise<Response | void>;
export declare const requireAgent: (request: AuthenticatedRequest) => Promise<Response | void>;
export declare const requireCustomer: (request: AuthenticatedRequest) => Promise<Response | void>;
/**
 * Check if a user can perform an action on a resource
 */
export declare function canUserAccess(
  user: AuthenticatedRequest['user'],
  resource: {
    type: string;
    id: string;
    ownerId?: string;
  },
  action: string
): Promise<boolean>;
/**
 * Audit log for authorization events
 */
export declare function logAuthorizationEvent(
  user: AuthenticatedRequest['user'],
  action: string,
  resource: string,
  allowed: boolean,
  reason?: string
): Promise<void>;
export default authorize;
//# sourceMappingURL=authorize.middleware.d.ts.map
