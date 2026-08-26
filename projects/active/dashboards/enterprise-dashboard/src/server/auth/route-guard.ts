import type { AuthContext } from "../../types";
import {
  getRoutePermission,
  hasPermission,
  type RouteGroup,
} from "./permissions";

export interface RouteGuardContext {
  url: URL;
  method: string;
  group: RouteGroup | null;
  isDevelopment: boolean;
  auth?: AuthContext;
}

export type RouteGuardResult =
  | { allowed: true }
  | { allowed: false; status: number; message: string };

export function checkRouteGuard(ctx: RouteGuardContext): RouteGuardResult {
  const { group, method, isDevelopment, auth } = ctx;

  if (!group && ctx.url.pathname.startsWith("/api/")) {
    return { allowed: false, status: 404, message: "API route is not mapped" };
  }
  if (!group) return { allowed: true };

  if (group === "debug" && !isDevelopment) {
    return { allowed: false, status: 404, message: "Debug routes disabled in production" };
  }

  const requiredPermission = getRoutePermission(group, method);
  if (requiredPermission) {
    if (!auth?.isAuthenticated) {
      return { allowed: false, status: 401, message: "Authentication required" };
    }
    if (!hasPermission(auth.permissions, requiredPermission)) {
      return {
        allowed: false,
        status: 403,
        message: `Permission '${requiredPermission}' required`,
      };
    }
  }

  if (group === "admin" && !auth?.isAdmin) {
    return { allowed: false, status: 403, message: "Admin access required" };
  }

  return { allowed: true };
}
