#!/usr/bin/env bun

// Import shared URLPattern type declarations
import "./url-pattern-types.js";

// Feature flag utilities
function hasFeature(flag: string): boolean {
  if (globalThis.__FEATURES__) {
    return globalThis.__FEATURES__.has(flag);
  }
  // Default to true for demo purposes
  return true;
}

// Route handler interface
interface RouteHandler {
  (
    params: Record<string, string>,
    search: Record<string, string>
  ): Response | Promise<Response>;
}

// Route configuration interface
interface Route {
  pattern: URLPattern;
  handler: RouteHandler;
  methods?: string[];
  middleware?: RouteHandler[];
}

// Router class using URLPattern API
class URLPatternRouter {
  private routes: Route[] = [];
  private middleware: RouteHandler[] = [];
  private fallbackHandler?: RouteHandler;

  // Add a route with pattern and handler
  add(
    pattern: string | URLPatternInit,
    handler: RouteHandler,
    options: {
      methods?: string[];
      middleware?: RouteHandler[];
    } = {}
  ): void {
    const urlPattern =
      typeof pattern === "string"
        ? new URLPattern({ pathname: pattern })
        : new URLPattern(pattern);

    this.routes.push({
      pattern: urlPattern,
      handler,
      methods: options.methods,
      middleware: options.middleware || [],
    });

    if (hasFeature("DEBUG")) {
      console.log(`🔗 Route added: ${urlPattern.pathname}`);
    }
  }

  // Add global middleware
  use(middleware: RouteHandler): void {
    this.middleware.push(middleware);
  }

  // Set fallback handler for unmatched routes
  setFallback(handler: RouteHandler): void {
    this.fallbackHandler = handler;
  }

  // Match and execute route
  async handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    // Parse search params
    const search: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      search[key] = value;
    });

    // Execute global middleware first
    for (const middleware of this.middleware) {
      const result = await middleware({}, search);
      if (result.status !== 200) {
        return result;
      }
    }

    // Find matching route
    for (const route of this.routes) {
      // Check method if specified
      if (route.methods && !route.methods.includes(method)) {
        continue;
      }

      const match = route.pattern.exec(url);
      if (match) {
        // Extract pathname groups
        const params: Record<string, string> = {};

        // Add named groups
        if (match.pathname.groups) {
          Object.assign(params, match.pathname.groups);
        }

        // Add wildcard groups (indexed)
        for (const [key, value] of Object.entries(match.pathname.groups)) {
          if (key === "0") {
            params["wildcard"] = value;
          }
        }

        // Execute route middleware
        for (const middleware of route.middleware || []) {
          const result = await middleware(params, search);
          if (result.status !== 200) {
            return result;
          }
        }

        // Execute route handler
        if (hasFeature("DEBUG")) {
          console.log(
            `🎯 Route matched: ${route.pattern.pathname} -> ${JSON.stringify(params)}`
          );
        }

        return await route.handler(params, search);
      }
    }

    // Fallback handler
    if (this.fallbackHandler) {
      return await this.fallbackHandler({}, search);
    }

    return new Response("Not Found", { status: 404 });
  }

  // Get all registered routes (for debugging)
  getRoutes(): string[] {
    return this.routes.map((route) => route.pattern.pathname);
  }

  // Test if a URL would match any route
  test(url: string): boolean {
    try {
      const testUrl = new URL(url);
      return this.routes.some((route) => route.pattern.test(testUrl));
    } catch {
      return false;
    }
  }
}

// Dashboard-specific router with advanced features
class DashboardRouter extends URLPatternRouter {
  constructor() {
    super();
    this.setupDashboardRoutes();
    this.setupAPIRoutes();
    this.setupFileRoutes();

    if (hasFeature("DEBUG")) {
      this.setupDebugRoutes();
    }
  }

  private setupDashboardRoutes(): void {
    // Main dashboard page
    this.add("/", () => {
      return new Response(this.getDashboardHTML(), {
        headers: { "Content-Type": "text/html" },
      });
    });

    // Dashboard tabs
    this.add("/tabs/:tab", (params) => {
      const validTabs = [
        "servers",
        "api",
        "performance",
        "headers",
        "bun-apis",
      ];
      const tab = params.tab;

      if (!validTabs.includes(tab)) {
        return new Response("Invalid tab", { status: 400 });
      }

      return new Response(this.getTabContent(tab), {
        headers: { "Content-Type": "text/html" },
      });
    });

    // Upload status
    this.add(
      "/upload/status",
      () => {
        const status = {
          uploading: false,
          progress: 0,
          provider: "s3",
          lastUpload: new Date().toISOString(),
        };

        return new Response(JSON.stringify(status), {
          headers: { "Content-Type": "application/json" },
        });
      },
      { methods: ["GET"] }
    );
  }

  private setupAPIRoutes(): void {
    // API endpoints
    this.add(
      "/api/servers",
      () => {
        const servers = [
          {
            id: 1,
            name: "web-server-01",
            status: "healthy",
            cpu: 45,
            memory: 67,
          },
          {
            id: 2,
            name: "db-server-01",
            status: "healthy",
            cpu: 23,
            memory: 89,
          },
          {
            id: 3,
            name: "cache-server-01",
            status: "warning",
            cpu: 78,
            memory: 45,
          },
        ];

        return new Response(JSON.stringify(servers), {
          headers: { "Content-Type": "application/json" },
        });
      },
      { methods: ["GET"] }
    );

    // Upload API
    this.add(
      "/api/upload",
      async (params, search) => {
        const provider = search.provider || "s3";

        if (hasFeature("CLOUD_UPLOAD")) {
          // Simulate upload process
          await new Promise((resolve) => setTimeout(resolve, 1000));

          return new Response(
            JSON.stringify({
              success: true,
              provider,
              url: `https://${provider}.example.com/dashboard-${Date.now()}`,
            }),
            {
              headers: { "Content-Type": "application/json" },
            }
          );
        } else {
          return new Response(
            JSON.stringify({
              error: "Cloud upload not enabled",
            }),
            { status: 503 }
          );
        }
      },
      { methods: ["POST"] }
    );

    // Feature flags API
    this.add(
      "/api/features",
      () => {
        const features = {
          CLOUD_UPLOAD: hasFeature("CLOUD_UPLOAD"),
          PREMIUM: hasFeature("PREMIUM"),
          DEBUG: hasFeature("DEBUG"),
          AUDIT_LOG: hasFeature("AUDIT_LOG"),
          METRICS: hasFeature("METRICS"),
          ADVANCED_UI: hasFeature("ADVANCED_UI"),
        };

        return new Response(JSON.stringify(features), {
          headers: { "Content-Type": "application/json" },
        });
      },
      { methods: ["GET"] }
    );
  }

  private setupFileRoutes(): void {
    // Static file serving
    this.add("/static/*", async (params) => {
      const filename = params.wildcard;
      const validFiles = ["styles.css", "dashboard.js", "upload.js"];

      if (!validFiles.includes(filename)) {
        return new Response("File not found", { status: 404 });
      }

      // In a real implementation, you'd serve actual files
      const content = `// Content for ${filename}`;
      const contentType = this.getContentType(filename);

      return new Response(content, {
        headers: { "Content-Type": contentType },
      });
    });

    // Download dashboard files
    this.add("/download/:format", (params) => {
      const format = params.format;
      const validFormats = ["json", "csv", "html"];

      if (!validFormats.includes(format)) {
        return new Response("Invalid format", { status: 400 });
      }

      const data = this.generateExport(format);
      const contentType = this.getContentType(`export.${format}`);

      return new Response(data, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="dashboard.${format}"`,
        },
      });
    });
  }

  private setupDebugRoutes(): void {
    // Debug information
    this.add("/debug/routes", () => {
      const routes = this.getRoutes();
      const debug = {
        routes,
        features: Array.from(globalThis.__FEATURES__ || []),
        buildMode: globalThis.__BUILD_MODE__ || "unknown",
        timestamp: new Date().toISOString(),
      };

      return new Response(JSON.stringify(debug, null, 2), {
        headers: { "Content-Type": "application/json" },
      });
    });

    // Pattern testing
    this.add("/debug/test/:pattern/*", (params) => {
      const pattern = params.pattern;
      const testUrl = params.wildcard;

      try {
        const urlPattern = new URLPattern({ pathname: `/${pattern}` });
        const matches = urlPattern.test(`https://example.com/${testUrl}`);
        const exec = urlPattern.exec(`https://example.com/${testUrl}`);

        const result = {
          pattern: `/${pattern}`,
          testUrl,
          matches,
          groups: exec?.pathname.groups || {},
          hasRegExpGroups: urlPattern.hasRegExpGroups,
        };

        return new Response(JSON.stringify(result, null, 2), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
          { status: 400 }
        );
      }
    });
  }

  private getDashboardHTML(): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Advanced Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-900 text-white">
    <div class="container mx-auto p-4">
        <h1 class="text-3xl font-bold mb-6">🚀 Advanced Dashboard with URLPattern</h1>

        <nav class="mb-6">
            <a href="/tabs/servers" class="px-4 py-2 bg-blue-600 rounded mr-2">Servers</a>
            <a href="/tabs/api" class="px-4 py-2 bg-green-600 rounded mr-2">API</a>
            <a href="/tabs/headers" class="px-4 py-2 bg-purple-600 rounded mr-2">Headers</a>
            <a href="/tabs/bun-apis" class="px-4 py-2 bg-orange-600 rounded">Bun APIs</a>
        </nav>

        <div id="content">
            <p>Welcome to the advanced dashboard! Navigate using the links above.</p>
        </div>

        <div class="mt-8">
            <h2 class="text-xl font-bold mb-4">🔗 URLPattern Examples</h2>
            <div class="bg-gray-800 p-4 rounded">
                <p>Test patterns: <a href="/debug/test/users/:id/123" class="text-blue-400">/users/:id</a></p>
                <p>Test patterns: <a href="/debug/test/files/*/image.png" class="text-blue-400">/files/*</a></p>
                <p>Debug routes: <a href="/debug/routes" class="text-blue-400">View all routes</a></p>
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  private getTabContent(tab: string): string {
    const tabContent = {
      servers: "<h2>🖥️ Servers</h2><p>Server monitoring data...</p>",
      api: "<h2>🔗 API</h2><p>API endpoints documentation...</p>",
      performance: "<h2>📊 Performance</h2><p>Performance metrics...</p>",
      headers: "<h2>📋 Headers</h2><p>HTTP Headers documentation...</p>",
      "bun-apis": "<h2>🔧 Bun APIs</h2><p>Bun API documentation...</p>",
    };

    return `
<!DOCTYPE html>
<html>
<head>
    <title>${tab} - Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-900 text-white">
    <div class="container mx-auto p-4">
        <a href="/" class="text-blue-400 mb-4 inline-block">← Back to Dashboard</a>
        ${tabContent[tab as keyof typeof tabContent] || "<p>Tab not found</p>"}
    </div>
</body>
</html>`;
  }

  private getContentType(filename: string): string {
    const ext = filename.split(".").pop()?.toLowerCase();
    const types: Record<string, string> = {
      css: "text/css",
      js: "application/javascript",
      json: "application/json",
      html: "text/html",
      csv: "text/csv",
    };
    return types[ext || ""] || "text/plain";
  }

  private generateExport(format: string): string {
    const data = {
      timestamp: new Date().toISOString(),
      servers: [
        { name: "web-server-01", status: "healthy", cpu: 45, memory: 67 },
        { name: "db-server-01", status: "healthy", cpu: 23, memory: 89 },
      ],
    };

    switch (format) {
      case "json":
        return JSON.stringify(data, null, 2);
      case "csv":
        return "name,status,cpu,memory\nweb-server-01,healthy,45,67\ndb-server-01,healthy,23,89";
      case "html":
        return `<table><tr><th>Name</th><th>Status</th><th>CPU</th><th>Memory</th></tr>${data.servers
          .map(
            (s) =>
              `<tr><td>${s.name}</td><td>${s.status}</td><td>${s.cpu}%</td><td>${s.memory}%</td></tr>`
          )
          .join("")}</table>`;
      default:
        return JSON.stringify(data, null, 2);
    }
  }
}

// URLPattern demonstration utilities
export class URLPatternDemo {
  // Demonstrate basic pattern matching
  static basicDemo(): void {
    console.log("🔗 URLPattern Basic Demo");

    // User ID pattern
    const userPattern = new URLPattern({ pathname: "/users/:id" });
    console.log("Pattern:", userPattern.pathname);
    console.log(
      "Match /users/123:",
      userPattern.test("https://example.com/users/123")
    );
    console.log(
      "Match /posts/456:",
      userPattern.test("https://example.com/posts/456")
    );

    const result = userPattern.exec("https://example.com/users/123");
    console.log("Exec result:", result?.pathname.groups.id);

    // Wildcard pattern
    const filesPattern = new URLPattern({ pathname: "/files/*" });
    const fileMatch = filesPattern.exec("https://example.com/files/image.png");
    console.log("Wildcard match:", fileMatch?.pathname.groups[0]);

    // Complex pattern
    const complexPattern = new URLPattern({
      pathname: "/api/:version/users/:id/posts/*",
    });
    console.log("Has regex groups:", complexPattern.hasRegExpGroups);
  }

  // Test multiple patterns
  static testPatterns(): void {
    const patterns = [
      { pattern: "/users/:id", url: "https://example.com/users/123" },
      { pattern: "/files/*", url: "https://example.com/files/docs/report.pdf" },
      { pattern: "/api/:version/*", url: "https://example.com/api/v1/users" },
      {
        pattern: "/blog/:year/:month/:slug",
        url: "https://example.com/blog/2024/01/hello-world",
      },
    ];

    patterns.forEach(({ pattern, url }) => {
      const urlPattern = new URLPattern({ pathname: pattern });
      const match = urlPattern.exec(url);

      console.log(`Pattern: ${pattern}`);
      console.log(`URL: ${url}`);
      console.log(`Match: ${urlPattern.test(url)}`);
      console.log(`Groups:`, match?.pathname.groups);
      console.log("---");
    });
  }

  // Advanced pattern features
  static advancedDemo(): void {
    // Protocol matching
    const protocolPattern = new URLPattern({
      protocol: "https",
      hostname: "api.example.com",
      pathname: "/v*:version/*",
    });

    // Full URL pattern
    const fullPattern = new URLPattern("https://api.example.com/users/:id");

    // Simple named groups (avoid complex regex for now)
    const simplePattern = new URLPattern({
      pathname: "/files/:filename",
    });

    console.log("Protocol pattern:", protocolPattern.protocol);
    console.log(
      "Full pattern test:",
      fullPattern.test("https://api.example.com/users/123")
    );
    console.log("Simple pattern has groups:", simplePattern.hasRegExpGroups);

    // Test the simple pattern
    const simpleMatch = simplePattern.exec(
      "https://example.com/files/document.jpg"
    );
    console.log("Simple match:", simpleMatch?.pathname.groups);
  }
}

// Export router and utilities
export { DashboardRouter, URLPatternRouter, type Route, type RouteHandler };

// Run demo if this file is executed directly
if (import.meta.main) {
  console.log("🚀 URLPattern Demo");
  URLPatternDemo.basicDemo();
  console.log("\n🧪 Pattern Testing");
  URLPatternDemo.testPatterns();
  console.log("\n🔧 Advanced Features");
  URLPatternDemo.advancedDemo();
}
