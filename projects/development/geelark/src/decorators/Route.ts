/**
 * Route Decorator
 *
 * Defines HTTP routes using TypeScript decorators
 * Usage: @Route("/users", "GET")
 *
 * https://bun.sh/docs/runtime/http
 */

import { BunServe } from "../server/BunServe.js";

// Store routes registered via decorators
const routes: Array<{
  path: string;
  method: string;
  handler: (req: Request, params: Record<string, string>) => Response | Promise<Response>;
  target: any;
  propertyKey: string | symbol;
}> = [];

/**
 * Route decorator for HTTP endpoints
 */
export function Route(
  path: string,
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS" = "GET"
) {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    routes.push({
      path,
      method,
      handler: originalMethod.bind(target),
      target,
      propertyKey,
    });

    return descriptor;
  };
}

/**
 * Shorthand decorators for common HTTP methods
 */
export function Get(path: string) {
  return Route(path, "GET");
}

export function Post(path: string) {
  return Route(path, "POST");
}

export function Put(path: string) {
  return Route(path, "PUT");
}

export function Delete(path: string) {
  return Route(path, "DELETE");
}

export function Patch(path: string) {
  return Route(path, "PATCH");
}

export function Options(path: string) {
  return Route(path, "OPTIONS");
}

/**
 * Register all decorated routes with a BunServe instance
 */
export function registerRoutes(server: BunServe, targetClass?: any): void {
  for (const route of routes) {
    // If targetClass is provided, only register routes for that class
    if (targetClass && route.target !== targetClass.prototype) continue;

    server.addRoute(route.method as any, route.path, route.handler);
  }
}

/**
 * Get all registered routes
 */
export function getRegisteredRoutes() {
  return routes.map((r) => ({ path: r.path, method: r.method }));
}

/**
 * Clear all registered routes (useful for testing)
 */
export function clearRoutes(): void {
  routes.length = 0;
}
