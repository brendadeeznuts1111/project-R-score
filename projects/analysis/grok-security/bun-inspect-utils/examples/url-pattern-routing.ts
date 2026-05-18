/**
 * [EXAMPLE][URL-PATTERN][ROUTING]{BUN-NATIVE}
 * Advanced URL routing with URLPattern
 * Run with: bun examples/url-pattern-routing.ts
 */

import {
  URLPatternMatcher,
  URLPatternValidator,
} from "../src/networking/url-pattern";

console.info("\n🚀 [1.0.0.0] Advanced URL Routing\n");

// [1.1.0.0] Create Router
class Router {
  private validator = new URLPatternValidator();
  private handlers: Map<string, (params: Record<string, string>) => void> =
    new Map();

  /**
   * [1.1.1.0] Register a route
   */
  register(
    name: string,
    pattern: string | URLPatternMatcher,
    handler: (params: Record<string, string>) => void
  ) {
    const matcher =
      pattern instanceof URLPatternMatcher
        ? pattern
        : new URLPatternMatcher(pattern);
    this.validator.register(name, matcher);
    this.handlers.set(name, handler);
  }

  /**
   * [1.1.2.0] Route a URL
   */
  route(url: string): boolean {
    const match = this.validator.findFirst(url);
    if (!match) return false;

    const handler = this.handlers.get(match);
    if (!handler) return false;

    // Extract parameters from the matched pattern
    const matcher = (this.validator as any).patterns.get(match);
    const result = matcher.exec(url);

    if (result) {
      const params = {
        ...result.pathname.groups,
        ...result.search.groups,
        ...result.hash.groups,
      };
      handler(params);
    }

    return true;
  }
}

// [1.2.0.0] Setup Routes
console.info("📋 [1.2.0.0] Setting Up Routes");
console.info("─".repeat(50));

const router = new Router();

// API routes
router.register(
  "getUser",
  { pathname: "/api/v1/users/:id" },
  (params) => {
    console.info(`  ✅ GET /api/v1/users/${params.id}`);
  }
);

router.register(
  "listPosts",
  { pathname: "/api/v1/posts" },
  (params) => {
    console.info(`  ✅ GET /api/v1/posts`);
  }
);

// File routes
router.register(
  "downloadFile",
  { pathname: "/downloads/:filename" },
  (params) => {
    console.info(`  ✅ Download: ${params.filename}`);
  }
);

// Admin routes
router.register(
  "adminDashboard",
  { pathname: "/admin/dashboard" },
  (params) => {
    console.info(`  ✅ Admin Dashboard`);
  }
);

// [1.3.0.0] Route Requests
console.info("\n🔀 [1.3.0.0] Routing Requests");
console.info("─".repeat(50));

const requests = [
  "/api/v1/users/123",
  "/api/v1/posts",
  "/downloads/file.pdf",
  "/admin/dashboard",
  "/unknown/path",
];

for (const url of requests) {
  const routed = router.route(url);
  if (!routed) {
    console.info(`  ❌ No route for: ${url}`);
  }
}

// [1.4.0.0] Query Parameter Routing
console.info("\n🔎 [1.4.0.0] Query Parameter Routing");
console.info("─".repeat(50));

const searchRouter = new Router();

searchRouter.register(
  "search",
  { pathname: "/search", search: "?q=:query&limit=:limit?" },
  (params) => {
    console.info(`  ✅ Search: "${params.query}" (limit: ${params.limit || "default"})`);
  }
);

searchRouter.route("/search?q=typescript&limit=10");
searchRouter.route("/search?q=javascript");

// [1.5.0.0] Subdomain Routing
console.info("\n🌍 [1.5.0.0] Subdomain Routing");
console.info("─".repeat(50));

const subdomainRouter = new Router();

subdomainRouter.register(
  "apiSubdomain",
  { hostname: "api.example.com", pathname: "/v1/:resource" },
  (params) => {
    console.info(`  ✅ API: ${params.resource}`);
  }
);

subdomainRouter.register(
  "adminSubdomain",
  { hostname: "admin.example.com", pathname: "/:page" },
  (params) => {
    console.info(`  ✅ Admin: ${params.page}`);
  }
);

subdomainRouter.route("https://api.example.com/v1/users");
subdomainRouter.route("https://admin.example.com/dashboard");

// [1.6.0.0] Hash-based Routing (SPA)
console.info("\n📄 [1.6.0.0] Hash-based Routing (SPA)");
console.info("─".repeat(50));

const spaRouter = new Router();

spaRouter.register(
  "dashboard",
  { hash: "/:page" },
  (params) => {
    console.info(`  ✅ SPA Page: ${params.page}`);
  }
);

spaRouter.route("/#/dashboard");
spaRouter.route("/#/settings");
spaRouter.route("/#/profile");

// [1.7.0.0] Route Priority
console.info("\n⚡ [1.7.0.0] Route Priority");
console.info("─".repeat(50));

const priorityRouter = new Router();

// More specific routes first
priorityRouter.register(
  "userDetail",
  { pathname: "/users/:id" },
  (params) => {
    console.info(`  ✅ User Detail: ${params.id}`);
  }
);

priorityRouter.register(
  "userList",
  { pathname: "/users" },
  (params) => {
    console.info(`  ✅ User List`);
  }
);

priorityRouter.route("/users/123");
priorityRouter.route("/users");

// [1.8.0.0] Performance Metrics
console.info("\n⏱️  [1.8.0.0] Performance Metrics");
console.info("─".repeat(50));

const iterations = 5000;
const start = performance.now();

for (let i = 0; i < iterations; i++) {
  router.route("/api/v1/users/123");
  router.route("/downloads/file.pdf");
  searchRouter.route("/search?q=test&limit=10");
}

const end = performance.now();
const duration = end - start;

console.info(`  Iterations: ${iterations * 3}`);
console.info(`  Duration: ${duration.toFixed(2)}ms`);
console.info(`  Per-route: ${(duration / (iterations * 3)).toFixed(4)}ms`);
console.info(`  Throughput: ${((iterations * 3) / (duration / 1000)).toFixed(0)} routes/sec`);

console.info("\n✅ URL routing examples complete!\n");

