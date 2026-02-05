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
    console.log("🚀 URLPattern Routing Examples\n");

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
      console.log(`📍 ${testCase.method} ${testCase.url}`);

      try {
        const request = new Request(testCase.url, { method: testCase.method });
        const response = await this.router.handle(request);

        console.log(`   Status: ${response.status}`);

        if (
          response.headers.get("Content-Type")?.includes("application/json")
        ) {
          const json = await response.clone().json();
          console.log(
            `   Content: ${JSON.stringify(json).substring(0, 100)}...`
          );
        } else {
          const text = await response.clone().text();
          console.log(`   Content: ${text.substring(0, 50)}...`);
        }
      } catch (error) {
        console.log(`   Error: ${(error as Error).message}`);
      }

      console.log("");
    }
  }

  // Advanced pattern matching examples
  demonstrateAdvancedPatterns(): void {
    console.log("🔧 Advanced URLPattern Examples\n");

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

    console.log("📋 API Versioning Patterns:");
    apiPatterns.forEach(({ pattern, description }) => {
      const urlPattern = new URLPattern({ pathname: pattern });
      console.log(`   ${pattern}`);
      console.log(`   ${description}`);
      console.log(`   Has regex groups: ${urlPattern.hasRegExpGroups}`);
      console.log("");
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

    console.log("📁 Resource Patterns:");
    resourcePatterns.forEach(({ pattern, test }) => {
      const urlPattern = new URLPattern({ pathname: pattern });
      const match = urlPattern.exec(`https://example.com${test}`);

      console.log(`   Pattern: ${pattern}`);
      console.log(`   Test: ${test}`);
      console.log(`   Match: ${urlPattern.test(`https://example.com${test}`)}`);
      console.log(`   Groups: ${JSON.stringify(match?.pathname.groups)}`);
      console.log("");
    });

    // 3. Complex routing scenarios
    console.log("🌐 Complex Routing Scenarios:");

    // Blog routing with date and slug
    const blogPattern = new URLPattern({
      pathname: "/blog/:year(\\d{4})/:month(\\d{2})/:slug([\\w-]+)",
    });

    console.log(
      "   Blog pattern: /blog/:year(\\d{4})/:month(\\d{2})/:slug([\\w-]+)"
    );
    console.log(`   Has regex groups: ${blogPattern.hasRegExpGroups}`);

    const blogMatch = blogPattern.exec(
      "https://example.com/blog/2024/01/urlpattern-features"
    );
    console.log(
      `   Blog match groups: ${JSON.stringify(blogMatch?.pathname.groups)}`
    );
    console.log("");

    // Multi-tenant application
    const tenantPattern = new URLPattern({
      protocol: "https",
      hostname: ":tenant.example.com",
      pathname: "/*",
    });

    console.log("   Multi-tenant pattern: :tenant.example.com/*");
    const tenantMatch = tenantPattern.exec(
      "https://acme.example.com/dashboard"
    );
    console.log(`   Tenant: ${tenantMatch?.hostname.groups.tenant}`);
    console.log(`   Path: ${tenantMatch?.pathname.groups[0]}`);
    console.log("");
  }

  // Performance and optimization examples
  demonstratePerformance(): void {
    console.log("⚡ URLPattern Performance Examples\n");

    // Pattern compilation performance
    const patterns = [
      "/users/:id",
      "/api/:version/*",
      "/files/:category/:filename",
      "/blog/:year/:month/:slug",
      "/admin/:section/:subsection/*",
    ];

    console.log("🏃‍♂️ Pattern Compilation Performance:");
    const startTime = performance.now();

    const compiledPatterns = patterns.map((pattern) => {
      const compileStart = performance.now();
      const urlPattern = new URLPattern({ pathname: pattern });
      const compileTime = performance.now() - compileStart;

      return { pattern, urlPattern, compileTime };
    });

    const totalTime = performance.now() - startTime;

    compiledPatterns.forEach(({ pattern, compileTime }) => {
      console.log(`   ${pattern}: ${compileTime.toFixed(3)}ms`);
    });

    console.log(`   Total compilation time: ${totalTime.toFixed(3)}ms`);
    console.log(
      `   Average per pattern: ${(totalTime / patterns.length).toFixed(3)}ms`
    );
    console.log("");

    // Matching performance
    console.log("🎯 Pattern Matching Performance:");
    const testUrl = "https://example.com/users/12345";
    const iterations = 10000;

    const matchStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      compiledPatterns[0].urlPattern.test(testUrl);
    }
    const matchTime = performance.now() - matchStart;

    console.log(`   ${iterations} matches in ${matchTime.toFixed(3)}ms`);
    console.log(
      `   Average per match: ${(matchTime / iterations).toFixed(6)}ms`
    );
    console.log(
      `   Matches per second: ${(iterations / (matchTime / 1000)).toLocaleString()}`
    );
    console.log("");
  }

  // Integration with dashboard features
  demonstrateDashboardIntegration(): void {
    console.log("🖥️ Dashboard Integration Examples\n");

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

    console.log("📤 Upload Routing:");
    uploadPatterns.forEach(({ pattern, description, examples }) => {
      console.log(`   ${pattern}`);
      console.log(`   ${description}`);
      examples.forEach((example) => {
        const urlPattern = new URLPattern({ pathname: pattern });
        const match = urlPattern.exec(`https://example.com${example}`);
        console.log(
          `   ${example} → ${JSON.stringify(match?.pathname.groups)}`
        );
      });
      console.log("");
    });

    // Feature-flag based routing
    console.log("🚩 Feature-Flag Routing:");

    const featureRoutes = [
      { pattern: "/premium/analytics", feature: "PREMIUM" },
      { pattern: "/debug/routes", feature: "DEBUG" },
      { pattern: "/admin/users", feature: "ADMIN" },
      { pattern: "/advanced/metrics", feature: "METRICS" },
    ];

    featureRoutes.forEach(({ pattern, feature }) => {
      const urlPattern = new URLPattern({ pathname: pattern });
      const hasFeature = globalThis.__FEATURES__?.has(feature) || false;

      console.log(`   ${pattern}`);
      console.log(`   Required feature: ${feature}`);
      console.log(`   Available: ${hasFeature ? "✅" : "❌"}`);
      console.log("");
    });
  }

  // Error handling and validation
  demonstrateErrorHandling(): void {
    console.log("🛡️ Error Handling and Validation\n");

    // Invalid patterns
    const invalidPatterns = [
      "/users/:id(", // Unclosed group
      "/users/[id]", // Invalid syntax
      "", // Empty pattern
    ];

    console.log("❌ Invalid Pattern Handling:");
    invalidPatterns.forEach((pattern) => {
      try {
        const urlPattern = new URLPattern({ pathname: pattern });
        console.log(`   ${pattern}: Unexpectedly valid`);
      } catch (error) {
        console.log(`   ${pattern}: ${(error as Error).message}`);
      }
    });
    console.log("");

    // Edge cases
    console.log("🔍 Edge Cases:");

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

        console.log(`   ${description}`);
        console.log(`   Pattern: ${pattern}`);
        console.log(`   URL: ${url}`);
        console.log(`   Match: ${match}`);
        console.log(`   Groups: ${JSON.stringify(exec?.pathname.groups)}`);
        console.log("");
      } catch (error) {
        console.log(`   ${description}: Error - ${(error as Error).message}`);
        console.log("");
      }
    });
  }

  // Run all demonstrations
  async runAll(): Promise<void> {
    console.log("🎯 URLPattern Comprehensive Examples\n");
    console.log("=".repeat(60));

    // Basic demo
    URLPatternDemo.basicDemo();
    console.log("\n" + "=".repeat(60));

    // Routing demonstrations
    await this.demonstrateRouting();
    console.log("=".repeat(60));

    // Advanced patterns
    this.demonstrateAdvancedPatterns();
    console.log("=".repeat(60));

    // Performance
    this.demonstratePerformance();
    console.log("=".repeat(60));

    // Dashboard integration
    this.demonstrateDashboardIntegration();
    console.log("=".repeat(60));

    // Error handling
    this.demonstrateErrorHandling();
    console.log("=".repeat(60));

    console.log("✅ All URLPattern examples completed!");
  }
}

// Export for use in other modules
export { URLPatternExamples };

// Run examples if this file is executed directly
if (import.meta.main) {
  const examples = new URLPatternExamples();
  examples.runAll().catch(console.error);
}
