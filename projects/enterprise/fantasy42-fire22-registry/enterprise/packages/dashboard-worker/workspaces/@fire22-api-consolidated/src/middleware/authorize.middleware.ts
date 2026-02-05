/**
 * Authorization Middleware
 *
 * Enforces role-based access control and scope restrictions
 */

import type { AuthenticatedRequest } from './auth.middleware';

class AuthorizationError extends Error {
  constructor(
    message: string,
    public statusCode: number = 403
  ) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Check if user has required permission
 */
function hasPermission(userPermissions: string[], requiredPermission: string): boolean {
  // Direct match
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }

  // Wildcard match (e.g., 'admin.*' matches 'admin.users.create')
  const permissionParts = requiredPermission.split('.');
  for (let i = 1; i <= permissionParts.length; i++) {
    const wildcardPermission = permissionParts.slice(0, i).join('.') + '.*';
    if (userPermissions.includes(wildcardPermission)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if user has all required permissions
 */
function hasAllPermissions(userPermissions: string[], requiredPermissions: string[]): boolean {
  return requiredPermissions.every(permission => hasPermission(userPermissions, permission));
}

/**
 * Check if user has any of the required permissions
 */
function hasAnyPermission(userPermissions: string[], requiredPermissions: string[]): boolean {
  return requiredPermissions.some(permission => hasPermission(userPermissions, permission));
}

/**
 * Apply scope restrictions to data access
 */
function applyScopeRestriction(scope: any, requestParams: any): boolean {
  if (!scope) return true; // No scope restriction

  switch (scope.type) {
    case 'agent':
      // Agent can only access their own customers
      if (scope.restriction === 'own_customers') {
        if (requestParams.agentId && requestParams.agentId !== scope.value) {
          return false;
        }
        if (requestParams.agentID && requestParams.agentID !== scope.value) {
          return false;
        }
      }
      break;

    case 'customer':
      // Customer can only access their own data
      if (scope.restriction === 'self_only') {
        if (requestParams.customerId && requestParams.customerId !== scope.value) {
          return false;
        }
        if (requestParams.customerID && requestParams.customerID !== scope.value) {
          return false;
        }
        if (requestParams.userId && requestParams.userId !== scope.value) {
          return false;
        }
      }
      break;
  }

  return true;
}

/**
 * Check minimum role level
 */
function hasMinimumLevel(userLevel: number, requiredLevel: number): boolean {
  return userLevel >= requiredLevel;
}

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
export function authorize(
  options:
    | {
        permissions?: string[];
        anyPermissions?: string[];
        roles?: string[];
        minLevel?: number;
        checkScope?: boolean;
      }
    | string[]
) {
  // Handle simple array of permissions (backwards compatibility)
  if (Array.isArray(options)) {
    options = { permissions: options };
  }

  return async (request: AuthenticatedRequest): Promise<Response | void> => {
    try {
      // Check if user is authenticated
      if (!request.user) {
        return new Response(
          JSON.stringify({
            error: 'Authentication required',
            message: 'You must be authenticated to access this resource',
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Check role restrictions
      if (options.roles && !options.roles.includes(request.user.role)) {
        return new Response(
          JSON.stringify({
            error: 'Insufficient role',
            message: `This resource requires one of the following roles: ${options.roles.join(', ')}`,
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Check minimum level
      if (options.minLevel && !hasMinimumLevel(request.user.level, options.minLevel)) {
        return new Response(
          JSON.stringify({
            error: 'Insufficient access level',
            message: `This resource requires access level ${options.minLevel} or higher`,
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Check required permissions (AND logic)
      if (
        options.permissions &&
        !hasAllPermissions(request.user.permissions, options.permissions)
      ) {
        return new Response(
          JSON.stringify({
            error: 'Insufficient permissions',
            message: `This resource requires the following permissions: ${options.permissions.join(', ')}`,
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Check any permissions (OR logic)
      if (
        options.anyPermissions &&
        !hasAnyPermission(request.user.permissions, options.anyPermissions)
      ) {
        return new Response(
          JSON.stringify({
            error: 'Insufficient permissions',
            message: `This resource requires at least one of the following permissions: ${options.anyPermissions.join(', ')}`,
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Apply scope restrictions
      if (options.checkScope !== false && request.user.scope) {
        // Get request parameters
        const url = new URL(request.url);
        const queryParams = Object.fromEntries(url.searchParams);
        const bodyParams = request.body || {};
        const allParams = { ...queryParams, ...bodyParams };

        if (!applyScopeRestriction(request.user.scope, allParams)) {
          return new Response(
            JSON.stringify({
              error: 'Access denied',
              message: 'You can only access resources within your scope',
            }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      }

      // Authorization successful
      return;
    } catch (error: any) {
      if (error instanceof AuthorizationError) {
        return new Response(
          JSON.stringify({
            error: 'Authorization failed',
            message: error.message,
          }),
          {
            status: error.statusCode,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify({
          error: 'Internal error',
          message: 'Authorization service unavailable',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };
}

/**
 * Preset authorization middleware for common roles
 */
export const requireAdmin = authorize({ roles: ['admin'] });
export const requireManager = authorize({ roles: ['admin', 'manager'] });
export const requireAgent = authorize({ roles: ['admin', 'manager', 'agent'] });
export const requireCustomer = authorize({ minLevel: 2 }); // Customer level or higher

/**
 * Check if a user can perform an action on a resource
 */
export async function canUserAccess(
  user: AuthenticatedRequest['user'],
  resource: {
    type: string;
    id: string;
    ownerId?: string;
  },
  action: string
): Promise<boolean> {
  if (!user) return false;

  // Admin can access everything
  if (user.role === 'admin') return true;

  // Check permission for the action
  const permission = `${resource.type}.${action}`;
  if (!hasPermission(user.permissions, permission)) {
    return false;
  }

  // Check scope restrictions
  if (user.scope) {
    switch (user.scope.restriction) {
      case 'self_only':
        return resource.ownerId === user.id;
      case 'own_customers':
        // Would need to check if resource belongs to agent's customers
        // This would require database lookup
        return true; // Placeholder
      default:
        return true;
    }
  }

  return true;
}

/**
 * Audit log for authorization events
 */
export async function logAuthorizationEvent(
  user: AuthenticatedRequest['user'],
  action: string,
  resource: string,
  allowed: boolean,
  reason?: string
): Promise<void> {
  const event = {
    timestamp: new Date(),
    userId: user?.id,
    userRole: user?.role,
    action,
    resource,
    allowed,
    reason,
    ip: globalThis.clientIP || 'unknown',
  };

  // Log to console for now (implement actual logging later)
  if (!allowed) {
    console.warn('Authorization denied:', event);
  } else if (process.env.LOG_LEVEL === 'debug') {
    console.log('Authorization granted:', event);
  }
}

export default authorize;
