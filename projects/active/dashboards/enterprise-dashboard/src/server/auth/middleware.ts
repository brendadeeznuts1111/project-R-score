/**
 * Authentication middleware for API key validation
 *
 * Extracts API keys from:
 * - Authorization: Bearer <key>
 * - X-API-Key: <key>
 */

import type { AuthContext, Permission, ApiResponse } from "../../types";
import { validateApiKey } from "./api-keys";
import { hasPermission, Permissions } from "./permissions";

/**
 * Extract API key from request headers
 */
export function extractApiKey(req: Request): string | null {
  // Check Authorization header (Bearer token)
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    return auth.slice(7).trim() || null;
  }

  // Check X-API-Key header
  const xApiKey = req.headers.get("x-api-key");
  if (xApiKey) {
    return xApiKey.trim() || null;
  }

  return null;
}

/**
 * Authenticate a request and return auth context
 */
export async function authenticate(req: Request): Promise<AuthContext> {
  const key = extractApiKey(req);

  if (!key) {
    return {
      isAuthenticated: false,
      permissions: [],
      isAdmin: false,
    };
  }

  const validation = await validateApiKey(key);

  if (!validation.valid || !validation.apiKey) {
    return {
      isAuthenticated: false,
      permissions: [],
      isAdmin: false,
    };
  }

  const { apiKey } = validation;

  return {
    isAuthenticated: true,
    apiKeyId: apiKey.id,
    keyName: apiKey.name,
    permissions: apiKey.permissions,
    isAdmin: apiKey.permissions.includes(Permissions.ADMIN),
  };
}

/**
 * Create an unauthorized response
 */
export function unauthorizedResponse(message = "Authentication required"): Response {
  return Response.json(
    { error: message } satisfies ApiResponse<never>,
    {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Bearer realm="API", error="invalid_token"',
      },
    }
  );
}

/**
 * Create a forbidden response
 */
export function forbiddenResponse(message = "Insufficient permissions"): Response {
  return Response.json(
    { error: message } satisfies ApiResponse<never>,
    { status: 403 }
  );
}

/**
 * Check if auth context has a specific permission
 */
export function checkPermission(
  auth: AuthContext,
  required: Permission
): Response | null {
  if (!auth.isAuthenticated) {
    return unauthorizedResponse();
  }

  if (!hasPermission(auth.permissions, required)) {
    return forbiddenResponse(`Permission '${required}' required`);
  }

  return null; // Access granted
}

/**
 * Create a permission guard that returns a response if permission check fails
 */
export function requirePermission(
  permission: Permission
): (auth: AuthContext) => Response | null {
  return (auth: AuthContext) => checkPermission(auth, permission);
}

/**
 * Require admin permission
 */
export function requireAdmin(auth: AuthContext): Response | null {
  if (!auth.isAuthenticated) {
    return unauthorizedResponse();
  }

  if (!auth.isAdmin) {
    return forbiddenResponse("Admin access required");
  }

  return null;
}

/**
 * Require authentication (any valid API key)
 */
export function requireAuth(auth: AuthContext): Response | null {
  if (!auth.isAuthenticated) {
    return unauthorizedResponse();
  }

  return null;
}

export type RouteHandler = (req: Request) => Response | Promise<Response>;
export type RouteHandlerObj = {
  GET?: RouteHandler;
  POST?: RouteHandler;
  PUT?: RouteHandler;
  DELETE?: RouteHandler;
  PATCH?: RouteHandler;
};

/**
 * Wrap a route handler with authentication and permission checks.
 * Options: permission, readPermission, writePermission, adminOnly.
 */
export function withAuth(
  handler: RouteHandler | RouteHandlerObj,
  options: {
    permission?: Permission;
    readPermission?: Permission;
    writePermission?: Permission;
    adminOnly?: boolean;
  } = {}
): RouteHandler | RouteHandlerObj {
  const wrapHandler = (fn: RouteHandler, requiredPermission?: Permission): RouteHandler => {
    return async (req: Request) => {
      const authContext = await authenticate(req);

      if (!authContext.isAuthenticated) {
        return unauthorizedResponse("Authentication required");
      }

      if (options.adminOnly && !authContext.isAdmin) {
        return forbiddenResponse("Admin access required");
      }

      if (requiredPermission && !hasPermission(authContext.permissions, requiredPermission)) {
        return forbiddenResponse(`Permission '${requiredPermission}' required`);
      }

      return fn(req);
    };
  };

  const readPerm = options.readPermission || options.permission;
  const writePerm = options.writePermission || options.permission;

  if (typeof handler === "function") {
    return wrapHandler(handler, options.permission);
  }

  const wrapped: RouteHandlerObj = {};
  if (handler.GET) wrapped.GET = wrapHandler(handler.GET, readPerm);
  if (handler.POST) wrapped.POST = wrapHandler(handler.POST, writePerm);
  if (handler.PUT) wrapped.PUT = wrapHandler(handler.PUT, writePerm);
  if (handler.DELETE) wrapped.DELETE = wrapHandler(handler.DELETE, writePerm);
  if (handler.PATCH) wrapped.PATCH = wrapHandler(handler.PATCH, writePerm);
  return wrapped;
}
