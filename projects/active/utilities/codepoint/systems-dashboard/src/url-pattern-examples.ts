#!/usr/bin/env bun
import { DashboardRouter, URLPatternDemo } from "./url-pattern-router.js";

// Comprehensive URLPattern examples for the dashboard
class URLPatternExamples {
  private router: DashboardRouter;

  constructor() {
    this.router = new DashboardRouter();
  }

  // Demonstrate routing capabilities
  async demonstrateRouting(): Promise<void> {
    console.info("🚀 URLPattern Routing Examples\n");

    // Test various routes
    const testCases = [
      { method: "GET", url: "http://localhost:3000/" },
      { method: "GET", url: "http://localhost:3000/tabs/servers" },
      { method: "GET", url: "http://localhost:3000/tabs/api" },
      { method: "GET", url: "http://localhost:3000/api/servers" },
      { method: "POST", url: "http://localhost:3000/api/upload?provider=r2" },
      { method: "GET", url: "http://localhost:3000/static/dashboard.js" },
      { method: "GET", url: "http://localhost:3000/download/json" },
      { method: "GET", url: "http://localhost:3000/debug/routes" },
      { method: "GET", url: "http://localhost:3000/debug/test/users/:id/123" },
      { method: "GET", url: "http://localhost:3000/nonexistent" },
    ];

    for (const testCase of testCases) {
      console.info(`📍 ${testCase.method} ${testCase.url}`);

      try {
        const request = new Request(testCase.url, { method: testCase.method });
        const response = await this.router.handle(request);

        console.info(`   Status: ${response.status}`);

        if (
          response.headers.get("Content-Type")?.includes("application/json")
        ) {
          const json = await response.clone().json();
          console.info(
            `   Content: ${JSON.stringify(json).substring(0, 100)}...`
          );
        } else {
          const text = await response.clone().text();
          console.info(`   Content: ${text.substring(0, 50)}...`);
        }
      } catch (error) {
        console.info(`   Error: ${(error as Error).message}`);
      }

      console.info("");
    }
  }

  // Advanced pattern matching examples
  demonstrateAdvancedPatterns(): void {
    console.info("🔧 Advanced URLPattern Examples\n");

    // 1. API versioning patterns
    const apiPatterns = [
      { pattern: "/api/v1/users/:id", description: "API v1 user endpoint" },
      {
        pattern: "/api/v2/users/:id/profile",
        description: "API v2 user profile",
      },
      {
        pattern: "/api/:version/users/:id/posts/:postId",
        description: "Multi-parameter API",
      },
    ];

    console.info("📋 API Versioning Patterns:");
    apiPatterns.forEach(({ pattern, description }) => {
      const urlPattern = new URLPattern({ pathname: pattern });
      console.info(`   ${pattern}`);
      console.info(`   ${description}`);
      console.info(`   Has regex groups: ${urlPattern.hasRegExpGroups}`);
      console.info("");
    });

    // 2. File and resource patterns
    const resourcePatterns = [
      { pattern: "/static/*", test: "/static/css/main.css" },
      {
        pattern: "/downloads/:category/:filename",
        test: "/downloads/reports/annual.pdf",
      },
      { pattern: "/images/:size(*)", test: "/images/thumbnail/logo.png" },
      { pattern: "/docs/:lang/*", test: "/docs/en/getting-started" },
    ];

    console.info("📁 Resource Patterns:");
    resourcePatterns.forEach(({ pattern, test }) => {
      const urlPattern = new URLPattern({ pathname: pattern });
      const match = urlPattern.exec(`https://example.com${test}`);

      console.info(`   Pattern: ${pattern}`);
      console.info(`   Test: ${test}`);
      console.info(`   Match: ${urlPattern.test(`https://example.com${test}`)}`);
      console.info(`   Groups: ${JSON.stringify(match?.pathname.groups)}`);
      console.info("");
    });

    // 3. Complex routing scenarios
    console.info("🌐 Complex Routing Scenarios:");

    // Blog routing with date and slug
    const blogPattern = new URLPattern({
      pathname: "/blog/:year(\\d{4})/:month(\\d{2})/:slug([\\w-]+)",
    });

    console.info(
      "   Blog pattern: /blog/:year(\\d{4})/:month(\\d{2})/:slug([\\w-]+)"
    );
    console.info(`   Has regex groups: ${blogPattern.hasRegExpGroups}`);

    const blogMatch = blogPattern.exec(
      "https://example.com/blog/2024/01/urlpattern-features"
    );
    console.info(
      `   Blog match groups: ${JSON.stringify(blogMatch?.pathname.groups)}`
    );
    console.info("");

    // Multi-tenant application
    const tenantPattern = new URLPattern({
      protocol: "https",
      hostname: ":tenant.example.com",
      pathname: "/*",
    });

    console.info("   Multi-tenant pattern: :tenant.example.com/*");
    const tenantMatch = tenantPattern.exec(
      "https://acme.example.com/dashboard"
    );
    console.info(`   Tenant: ${tenantMatch?.hostname.groups.tenant}`);
    console.info(`   Path: ${tenantMatch?.pathname.groups[0]}`);
    console.info("");
  }

  // Performance and optimization examples
  demonstratePerformance(): void {
    console.info("⚡ URLPattern Performance Examples\n");

    // Pattern compilation performance
    const patterns = [
      "/users/:id",
      "/api/:version/*",
      "/files/:category/:filename",
      "/blog/:year/:month/:slug",
      "/admin/:section/:subsection/*",
    ];

    console.info("🏃‍♂️ Pattern Compilation Performance:");
    const startTime = performance.now();

    const compiledPatterns = patterns.map((pattern) => {
      const compileStart = performance.now();
      const urlPattern = new URLPattern({ pathname: pattern });
      const compileTime = performance.now() - compileStart;

      return { pattern, urlPattern, compileTime };
    });

    const totalTime = performance.now() - startTime;

    compiledPatterns.forEach(({ pattern, compileTime }) => {
      console.info(`   ${pattern}: ${compileTime.toFixed(3)}ms`);
    });

    console.info(`   Total compilation time: ${totalTime.toFixed(3)}ms`);
    console.info(
      `   Average per pattern: ${(totalTime / patterns.length).toFixed(3)}ms`
    );
    console.info("");

    // Matching performance
    console.info("🎯 Pattern Matching Performance:");
    const testUrl = "https://example.com/users/12345";
    const iterations = 10000;

    const matchStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      compiledPatterns[0].urlPattern.test(testUrl);
    }
    const matchTime = performance.now() - matchStart;

    console.info(`   ${iterations} matches in ${matchTime.toFixed(3)}ms`);
    console.info(
      `   Average per match: ${(matchTime / iterations).toFixed(6)}ms`
    );
    console.info(
      `   Matches per second: ${(iterations / (matchTime / 1000)).toLocaleString()}`
    );
    console.info("");
  }

  // Integration with dashboard features
  demonstrateDashboardIntegration(): void {
    console.info("🖥️ Dashboard Integration Examples\n");

    // Upload routing with provider selection
    const uploadPatterns = [
      {
        pattern: "/upload/:provider",
        description: "Upload to specific provider",
        examples: ["/upload/s3", "/upload/r2", "/upload/local"],
      },
      {
        pattern: "/upload/:provider/:folder/*",
        description: "Upload to specific folder",
        examples: ["/upload/s3/documents", "/upload/r2/images"],
      },
      {
        pattern: "/status/:uploadId",
        description: "Upload status tracking",
        examples: ["/status/abc123", "/status/xyz789"],
      },
    ];

    console.info("📤 Upload Routing:");
    uploadPatterns.forEach(({ pattern, description, examples }) => {
      console.info(`   ${pattern}`);
      console.info(`   ${description}`);
      examples.forEach((example) => {
        const urlPattern = new URLPattern({ pathname: pattern });
        const match = urlPattern.exec(`https://example.com${example}`);
        console.info(
          `   ${example} → ${JSON.stringify(match?.pathname.groups)}`
        );
      });
      console.info("");
    });

    // Feature-flag based routing
    console.info("🚩 Feature-Flag Routing:");

    const featureRoutes = [
      { pattern: "/premium/analytics", feature: "PREMIUM" },
      { pattern: "/debug/routes", feature: "DEBUG" },
      { pattern: "/admin/users", feature: "ADMIN" },
      { pattern: "/advanced/metrics", feature: "METRICS" },
    ];

    featureRoutes.forEach(({ pattern, feature }) => {
      const urlPattern = new URLPattern({ pathname: pattern });
      const hasFeature = globalThis.__FEATURES__?.has(feature) || false;

      console.info(`   ${pattern}`);
      console.info(`   Required feature: ${feature}`);
      console.info(`   Available: ${hasFeature ? "✅" : "❌"}`);
      console.info("");
    });
  }

  // Error handling and validation
  demonstrateErrorHandling(): void {
    console.info("🛡️ Error Handling and Validation\n");

    // Invalid patterns
    const invalidPatterns = [
      "/users/:id(", // Unclosed group
      "/users/[id]", // Invalid syntax
      "", // Empty pattern
    ];

    console.info("❌ Invalid Pattern Handling:");
    invalidPatterns.forEach((pattern) => {
      try {
        const urlPattern = new URLPattern({ pathname: pattern });
        console.info(`   ${pattern}: Unexpectedly valid`);
      } catch (error) {
        console.info(`   ${pattern}: ${(error as Error).message}`);
      }
    });
    console.info("");

    // Edge cases
    console.info("🔍 Edge Cases:");

    const edgeCases = [
      { pattern: "/", url: "https://example.com/", description: "Root path" },
      {
        pattern: "/*",
        url: "https://example.com/anything",
        description: "Wildcard",
      },
      {
        pattern: "/users/:id?",
        url: "https://example.com/users",
        description: "Optional parameter",
      },
      {
        pattern: "/files/:filename(*)",
        url: "https://example.com/files/path/to/file.txt",
        description: "Deep wildcard",
      },
    ];

    edgeCases.forEach(({ pattern, url, description }) => {
      try {
        const urlPattern = new URLPattern({ pathname: pattern });
        const match = urlPattern.test(url);
        const exec = urlPattern.exec(url);

        console.info(`   ${description}`);
        console.info(`   Pattern: ${pattern}`);
        console.info(`   URL: ${url}`);
        console.info(`   Match: ${match}`);
        console.info(`   Groups: ${JSON.stringify(exec?.pathname.groups)}`);
        console.info("");
      } catch (error) {
        console.info(`   ${description}: Error - ${(error as Error).message}`);
        console.info("");
      }
    });
  }

  // Run all demonstrations
  async runAll(): Promise<void> {
    console.info("🎯 URLPattern Comprehensive Examples\n");
    console.info("=".repeat(60));

    // Basic demo
    URLPatternDemo.basicDemo();
    console.info("\n" + "=".repeat(60));

    // Routing demonstrations
    await this.demonstrateRouting();
    console.info("=".repeat(60));

    // Advanced patterns
    this.demonstrateAdvancedPatterns();
    console.info("=".repeat(60));

    // Performance
    this.demonstratePerformance();
    console.info("=".repeat(60));

    // Dashboard integration
    this.demonstrateDashboardIntegration();
    console.info("=".repeat(60));

    // Error handling
    this.demonstrateErrorHandling();
    console.info("=".repeat(60));

    console.info("✅ All URLPattern examples completed!");
  }
}

// Export for use in other modules
export { URLPatternExamples };

// Run examples if this file is executed directly
if (import.meta.main) {
  const examples = new URLPatternExamples();
  examples.runAll().catch(console.error);
}
