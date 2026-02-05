/**
 * Middleware Decorator
 *
 * Applies middleware to class methods or entire classes
 * Usage: @Middleware(logger)
 *
 * https://bun.sh/docs/runtime/http#middleware
 */

export type MiddlewareFunction = (
  req: Request,
  next: () => Promise<Response>
) => Response | Promise<Response>;

const middlewares = new Map<any, MiddlewareFunction[]>();

/**
 * Apply middleware to a class
 */
export function Middleware(...fns: MiddlewareFunction[]) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    middlewares.set(constructor, fns);
    return constructor;
  };
}

/**
 * Get middleware for a class
 */
export function getMiddleware(target: any): MiddlewareFunction[] {
  return middlewares.get(target) ?? [];
}

/**
 * Common middleware functions
 */
export const MIDDLEWARE = {
  /**
   * Log all requests
   */
  logger: (req: Request, next: () => Promise<Response>) => {
    const start = Date.now();
    console.log(`→ ${req.method} ${new URL(req.url).pathname}`);
    return next().then((res) => {
      const duration = Date.now() - start;
      console.log(`← ${res.status} ${duration}ms`);
      return res;
    });
  },

  /**
   * Add timing headers
   */
  timing: (req: Request, next: () => Promise<Response>) => {
    const start = performance.now();
    return next().then((res) => {
      const headers = new Headers(res.headers);
      headers.set("X-Response-Time", `${(performance.now() - start).toFixed(2)}ms`);
      return new Response(res.body, {
        status: res.status,
        headers,
      });
    });
  },

  /**
   * Require JSON content type
   */
  requireJSON: (req: Request, next: () => Promise<Response>) => {
    const contentType = req.headers.get("Content-Type");
    if (req.method !== "GET" && req.method !== "HEAD" && !contentType?.includes("json")) {
      return new Response(JSON.stringify({ error: "Content-Type must be application/json" }), {
        status: 415,
        headers: { "Content-Type": "application/json" },
      });
    }
    return next();
  },

  /**
   * Parse JSON body
   */
  jsonBody: async (req: Request, next: () => Promise<Response>) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      try {
        const body = await req.json();
        (req as any).body = body;
      } catch {
        // Body not JSON or empty
      }
    }
    return next();
  },
};

/**
 * Chain multiple middleware functions
 */
export function chain(...fns: MiddlewareFunction[]): MiddlewareFunction {
  return (req: Request, final: () => Promise<Response>) => {
    let chain = final;
    for (const fn of fns.reverse()) {
      const next = chain;
      chain = async () => await fn(req, next);
    }
    return chain();
  };
}
