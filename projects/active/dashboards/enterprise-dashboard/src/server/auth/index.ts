/**
 * Authentication & RBAC module
 *
 * Re-exports all auth-related functionality
 */

// Permissions
export {
  Permissions,
  ALL_PERMISSIONS,
  READ_ONLY_PERMISSIONS,
  ROUTE_GROUP_NAMES,
  ROUTE_PERMISSIONS,
  getRoutePermission,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  isValidPermission,
  filterValidPermissions,
  type RouteGroup,
} from "./permissions";

export {
  checkRouteGuard,
  type RouteGuardContext,
  type RouteGuardResult,
} from "./route-guard";

// API Keys
export {
  createApiKey,
  createApiKeyFromRaw,
  validateApiKey,
  findApiKeyByRawKey,
  getApiKey,
  listApiKeys,
  updatePermissions,
  revokeKey,
  deleteKey,
  hasAnyApiKeys,
  hasAdminKey,
} from "./api-keys";

// Middleware
export {
  extractApiKey,
  authenticate,
  unauthorizedResponse,
  forbiddenResponse,
  checkPermission,
  requirePermission,
  requireAdmin,
  requireAuth,
  withAuth,
  type RouteHandler,
  type RouteHandlerObj,
} from "./middleware";
