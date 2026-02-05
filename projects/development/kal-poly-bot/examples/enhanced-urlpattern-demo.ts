#!/usr/bin/env bun
// Enhanced URLPattern API Demo
// Demonstrates advanced routing with RegExp groups and validation

import { serve } from "bun";
import {
  FileServer,
  PatternValidator,
  Patterns,
  createDemoRouter,
} from "../src/enhanced-urlpattern-api";

// Demo server with comprehensive routing examples
async function createDemoServer() {
  const router = createDemoRouter();
  const fileServer = new FileServer();
  const validator = new PatternValidator();

  // Add validation patterns
  validator.addPattern(Patterns.user);
  validator.addPattern(Patterns.email);
  validator.addPattern(Patterns.date);

  // Additional demo routes
  router.addRoute("apiInfo", new URLPattern({ pathname: "/api" }), () => {
    const apiInfo = {
      name: "Enhanced URLPattern API",
      version: "1.0.0",
      features: [
        "RegExp group validation",
        "Dynamic routing",
        "Query parameter parsing",
        "File serving with security",
        "OpenAPI pattern generation",
        "Performance optimization",
        "Real-time validation with caching",
      ],
      patterns: {
        user: "/users/:id(\\d{1,10})",
        email: "/profile/:email([^@\\s]+@[^@\\s]+\\.[^@\\s]+)",
        date: "/posts/:year(\\d{4})/:month(\\d{2})/:day(\\d{2})/:slug",
        search:
          "/search?q=:query&category=:category(tech|business|sports)&page=:page(\\d+)",
      },
    };
    return new Response(JSON.stringify(apiInfo, null, 2), {
      headers: { "Content-Type": "application/json" },
    });
  });

  router.addRoute(
    "patternTest",
    new URLPattern({ pathname: "/test/patterns" }),
    () => {
      const tests = [
        { url: "/users/12345", pattern: "user", valid: true },
        { url: "/users/abc", pattern: "user", valid: false },
        { url: "/profile/user@example.com", pattern: "email", valid: true },
        { url: "/profile/invalid", pattern: "email", valid: false },
        { url: "/posts/2024/12/20/bun-release", pattern: "date", valid: true },
        { url: "/posts/24/12/20/bun-release", pattern: "date", valid: false },
      ];

      const results = tests.map((test) => {
        const validation = validator.validateUrl(test.url);
        return {
          url: test.url,
          pattern: test.pattern,
          expected: test.valid,
          actual: validation.valid,
          params: validation.params,
          error: validation.error,
        };
      });

      return new Response(JSON.stringify(results, null, 2), {
        headers: { "Content-Type": "application/json" },
      });
    }
  );

  router.addRoute(
    "queryDemo",
    new URLPattern({ pathname: "/demo/query" }),
    (req) => {
      const url = new URL(req.url);
      const searchParams = url.searchParams;

      let result = "Query Parameter Demo\n\n";

      if (searchParams.has("url")) {
        try {
          const testUrl = searchParams.get("url")!;
          const validation = validator.validateUrl(testUrl);
          result += `Testing URL: ${testUrl}\n`;
          result += `Valid: ${validation.valid}\n`;
          if (validation.params) {
            result += `Parameters: ${JSON.stringify(validation.params, null, 2)}\n`;
          }
          if (validation.error) {
            result += `Error: ${validation.error}\n`;
          }
        } catch (error) {
          result += `Error testing URL: ${error}\n`;
        }
      } else {
        result += "Add ?url=<encoded-url> to test a URL\n";
        result +=
          "Example: /demo/query?url=" + encodeURIComponent("/users/12345");
      }

      return new Response(result, {
        headers: { "Content-Type": "text/plain" },
      });
    }
  );

  router.addRoute(
    "performance",
    new URLPattern({ pathname: "/demo/performance" }),
    () => {
      const iterations = 10000;
      const testUrls = [
        "/users/12345",
        "/users/abc",
        "/profile/user@example.com",
        "/posts/2024/12/20/bun-release",
        "/nonexistent",
      ];

      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        for (const url of testUrls) {
          validator.validateUrl(url);
        }
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const opsPerSecond = (iterations * testUrls.length) / (totalTime / 1000);

      const performance = {
        iterations,
        urls: testUrls.length,
        totalTime: `${totalTime.toFixed(2)}ms`,
        opsPerSecond: Math.round(opsPerSecond),
        avgTimePerOp: `${(totalTime / (iterations * testUrls.length)).toFixed(4)}ms`,
      };

      return new Response(JSON.stringify(performance, null, 2), {
        headers: { "Content-Type": "application/json" },
      });
    }
  );

  return {
    async fetch(req: Request): Promise<Response> {
      const url = new URL(req.url);

      // Handle file requests
      if (url.pathname.startsWith("/static/")) {
        return fileServer.handleRequest(req);
      }

      // Handle API routes
      if (url.pathname.startsWith("/api") || url.pathname.startsWith("/demo")) {
        return router.handleRequest(req);
      }

      // Default routes
      if (url.pathname === "/") {
        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Enhanced URLPattern API Demo</title>
    <style>
        body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .endpoint { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }
        .method { color: #007acc; font-weight: bold; }
        .pattern { color: #d73a49; font-family: monospace; }
        .description { color: #586069; }
        a { color: #0366d6; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <h1>Enhanced URLPattern API Demo</h1>
    <p>This demo showcases advanced URLPattern features with RegExp groups, validation, and performance optimization.</p>

    <h2>Available Endpoints</h2>

    <div class="endpoint">
        <span class="method">GET</span> <span class="pattern">/api</span>
        <div class="description">API information and available patterns</div>
        <a href="/api">Try it</a>
    </div>

    <div class="endpoint">
        <span class="method">GET</span> <span class="pattern">/users/:id(\\d{1,10})</span>
        <div class="description">User endpoint with numeric ID validation (1-10 digits)</div>
        <a href="/users/12345">Try valid</a> | <a href="/users/abc">Try invalid</a>
    </div>

    <div class="endpoint">
        <span class="method">GET</span> <span class="pattern">/profile/:email([^@\\s]+@[^@\\s]+\\.[^@\\s]+)</span>
        <div class="description">Profile endpoint with email validation</div>
        <a href="/profile/user@example.com">Try valid</a> | <a href="/profile/invalid">Try invalid</a>
    </div>

    <div class="endpoint">
        <span class="method">GET</span> <span class="pattern">/posts/:year(\\d{4})/:month(\\d{2})/:day(\\d{2})/:slug</span>
        <div class="description">Post endpoint with date validation</div>
        <a href="/posts/2024/12/20/bun-release">Try it</a>
    </div>

    <div class="endpoint">
        <span class="method">GET</span> <span class="pattern">/search?q=:query&category=:category(tech|business|sports)&page=:page(\\d+)</span>
        <div class="description">Search endpoint with query parameter validation</div>
        <a href="/search?q=bun&category=tech&page=1">Try it</a>
    </div>

    <div class="endpoint">
        <span class="method">GET</span> <span class="pattern">/test/patterns</span>
        <div class="description">Test all pattern validations</div>
        <a href="/test/patterns">Try it</a>
    </div>

    <div class="endpoint">
        <span class="method">GET</span> <span class="pattern">/demo/query?url=<encoded-url></span>
        <div class="description">Test any URL against patterns</div>
        <a href="/demo/query?url=%2Fusers%2F12345">Try example</a>
    </div>

    <div class="endpoint">
        <span class="method">GET</span> <span class="pattern">/demo/performance</span>
        <div class="description">Performance benchmark</div>
        <a href="/demo/performance">Try it</a>
    </div>

    <h2>Features Demonstrated</h2>
    <ul>
        <li><strong>RegExp Group Validation:</strong> Parameters are validated using regular expressions</li>
        <li><strong>Dynamic Routing:</strong> Routes are added dynamically with middleware support</li>
        <li><strong>Query Parameter Parsing:</strong> Complex query parameter patterns with validation</li>
        <li><strong>File Serving:</strong> Secure file serving with directory traversal protection</li>
        <li><strong>Performance Optimization:</strong> Caching and optimized route matching</li>
        <li><strong>Error Handling:</strong> Comprehensive error handling with fallbacks</li>
        <li><strong>Real-time Validation:</strong> Pattern validation with result caching</li>
    </ul>

    <h2>Code Examples</h2>
    <p>Check the source code in <code>src/enhanced-urlpattern-api.ts</code> and tests in <code>__tests__/enhanced-urlpattern-api.test.ts</code>.</p>
</body>
</html>`;
        return new Response(html, {
          headers: { "Content-Type": "text/html" },
        });
      }

      return new Response("Not Found", { status: 404 });
    },
  };
}

// Start the demo server
async function main() {
  console.log("🚀 Starting Enhanced URLPattern API Demo Server");
  console.log("📖 Documentation: http://localhost:3000");
  console.log("🔧 API Info: http://localhost:3000/api");
  console.log("🧪 Pattern Tests: http://localhost:3000/test/patterns");
  console.log("⚡ Performance: http://localhost:3000/demo/performance");

  const server = await createDemoServer();

  serve({
    port: 3000,
    fetch: server.fetch,
    development: process.env.NODE_ENV !== "production",
  });
}

// Run demo if this file is executed directly
if (import.meta.main) {
  main().catch(console.error);
}

export { createDemoServer };
