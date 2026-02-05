#!/usr/bin/env bun

// Advanced Bun Feature Flags Demonstration
// Showcasing compile-time dead-code elimination and build-time feature toggles

import { serve } from "bun";
import { feature } from "bun:bundle";

// Type-safe feature registry
declare module "bun:bundle" {
  interface Registry {
    features:
      | "PREMIUM"
      | "DEBUG"
      | "BETA_FEATURES"
      | "ADMIN"
      | "ANALYTICS"
      | "PERFORMANCE"
      | "MOCK_API";
  }
}

interface FeatureFlags {
  premium: boolean;
  debug: boolean;
  betaFeatures: boolean;
  admin: boolean;
  analytics: boolean;
  performance: boolean;
}

interface BuildMetrics {
  timestamp: Date;
  enabledFeatures: string[];
  bundleSize: number;
  deadCodeEliminated: string[];
  performanceOptimizations: string[];
}

class FeatureFlagDemo {
  private port = 3000;
  private server: any;
  private metrics: BuildMetrics;
  private startTime = Date.now();

  constructor() {
    this.metrics = {
      timestamp: new Date(),
      enabledFeatures: this.getEnabledFeatures(),
      bundleSize: 0,
      deadCodeEliminated: [],
      performanceOptimizations: [],
    };

    console.log("🚀 Advanced Bun Feature Flags Demo");
    console.log("===================================");
    this.demonstrateFeatureFlags();
    this.setupServer();
  }

  private getEnabledFeatures(): string[] {
    const features: string[] = [];

    if (feature("PREMIUM")) features.push("PREMIUM");
    if (feature("DEBUG")) features.push("DEBUG");
    if (feature("BETA_FEATURES")) features.push("BETA_FEATURES");
    if (feature("ADMIN")) features.push("ADMIN");
    if (feature("ANALYTICS")) features.push("ANALYTICS");
    if (feature("PERFORMANCE")) features.push("PERFORMANCE");
    if (feature("MOCK_API")) features.push("MOCK_API");

    return features;
  }

  private demonstrateFeatureFlags(): void {
    console.log("🎯 Feature Flags Analysis");
    console.log("========================");

    console.log(
      `✅ Enabled features: ${this.metrics.enabledFeatures.join(", ")}`
    );
    console.log(
      `❌ Disabled features: ${this.getDisabledFeatures().join(", ")}`
    );

    // Demonstrate dead-code elimination
    this.demonstrateDeadCodeElimination();

    // Demonstrate conditional compilation
    this.demonstrateConditionalCompilation();

    // Demonstrate performance optimizations
    this.demonstratePerformanceOptimizations();
  }

  private getDisabledFeatures(): string[] {
    const allFeatures = [
      "PREMIUM",
      "DEBUG",
      "BETA_FEATURES",
      "ADMIN",
      "ANALYTICS",
      "PERFORMANCE",
      "MOCK_API",
    ];
    return allFeatures.filter((f) => !this.metrics.enabledFeatures.includes(f));
  }

  private demonstrateDeadCodeElimination(): void {
    console.log("\n💀 Dead-Code Elimination");
    console.log("========================");

    // This code will be completely eliminated if DEBUG is false
    if (feature("DEBUG")) {
      console.log("🐛 Debug mode enabled - debug code included in bundle");
      console.log("   - Debug logging functions");
      console.log("   - Development tools");
      console.log("   - Error stack traces");
      this.metrics.deadCodeEliminated.push("Debug code (included)");
    } else {
      console.log("🚀 Debug mode disabled - debug code eliminated from bundle");
      console.log("   - Zero debug overhead in production");
      console.log("   - Smaller bundle size");
      console.log("   - Better performance");
      this.metrics.deadCodeEliminated.push("Debug code (eliminated)");
    }

    // Premium features conditional compilation
    if (feature("PREMIUM")) {
      console.log("💎 Premium features enabled");
      console.log("   - Advanced analytics");
      console.log("   - Premium UI components");
      console.log("   - Enhanced security features");
      this.metrics.deadCodeEliminated.push("Premium features (included)");
    } else {
      console.log("🆓 Free tier - premium features eliminated");
      console.log("   - No premium overhead");
      console.log("   - Smaller bundle size");
      console.log("   - Faster load times");
      this.metrics.deadCodeEliminated.push("Premium features (eliminated)");
    }

    // Beta features
    if (feature("BETA_FEATURES")) {
      console.log("🧪 Beta features enabled");
      console.log("   - Experimental functionality");
      console.log("   - Cutting-edge features");
      console.log("   - Early access capabilities");
      this.metrics.deadCodeEliminated.push("Beta features (included)");
    } else {
      console.log("🔒 Stable build - beta features eliminated");
      console.log("   - Production-ready only");
      console.log("   - Reduced complexity");
      console.log("   - Higher reliability");
      this.metrics.deadCodeEliminated.push("Beta features (eliminated)");
    }
  }

  private demonstrateConditionalCompilation(): void {
    console.log("\n⚙️ Conditional Compilation");
    console.log("===========================");

    // Compile-time constants using ternary operators
    const isProduction = feature("DEBUG") ? false : true;
    const hasAnalytics = feature("ANALYTICS") ? true : false;
    const isAdmin = feature("ADMIN") ? true : false;

    console.log(`🏭 Production build: ${isProduction}`);
    console.log(`📊 Analytics enabled: ${hasAnalytics}`);
    console.log(`👑 Admin access: ${isAdmin}`);

    // Conditional function definitions
    const logLevel = feature("DEBUG") ? "verbose" : "minimal";
    console.log(`📝 Log level: ${logLevel}`);

    // Feature-based configuration using ternary operators
    const config = {
      debug: feature("DEBUG") ? true : false,
      premium: feature("PREMIUM") ? true : false,
      beta: feature("BETA_FEATURES") ? true : false,
      admin: feature("ADMIN") ? true : false,
      analytics: feature("ANALYTICS") ? true : false,
      performance: feature("PERFORMANCE") ? true : false,
    };

    console.log("⚙️ Feature configuration:", config);

    // Demonstrate compile-time optimizations
    this.demonstrateCompileTimeOptimizations(config);
  }

  private demonstrateCompileTimeOptimizations(config: any): void {
    console.log("\n⚡ Compile-Time Optimizations");
    console.log("==============================");

    // Conditional imports based on features
    if (feature("PERFORMANCE")) {
      console.log("🚀 Performance optimizations enabled:");
      console.log("   - Advanced memory management");
      console.log("   - Optimized algorithms");
      console.log("   - Caching strategies");
      this.metrics.performanceOptimizations.push("Performance mode");
    }

    // Analytics conditional compilation
    if (feature("ANALYTICS")) {
      console.log("📊 Analytics compilation:");
      console.log("   - Tracking code included");
      console.log("   - Metrics collection enabled");
      console.log("   - Performance monitoring active");
      this.metrics.performanceOptimizations.push("Analytics tracking");
    } else {
      console.log("🔒 Analytics eliminated:");
      console.log("   - No tracking overhead");
      console.log("   - Privacy-focused build");
      console.log("   - Faster execution");
      this.metrics.performanceOptimizations.push("No analytics overhead");
    }

    // Admin features
    if (feature("ADMIN")) {
      console.log("👑 Admin features compiled:");
      console.log("   - Admin dashboard code");
      console.log("   - Management tools");
      console.log("   - Advanced configuration");
      this.metrics.performanceOptimizations.push("Admin tools");
    }
  }

  private demonstratePerformanceOptimizations(): void {
    console.log("\n🎯 Performance Impact Analysis");
    console.log("==============================");

    const bundleSizeEstimate = this.calculateBundleSize();
    console.log(`📦 Estimated bundle size: ${bundleSizeEstimate}KB`);

    const performanceScore = this.calculatePerformanceScore();
    console.log(`⚡ Performance score: ${performanceScore}/100`);

    const memoryUsage = process.memoryUsage();
    console.log(
      `💾 Memory usage: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`
    );

    this.metrics.bundleSize = bundleSizeEstimate;
  }

  private calculateBundleSize(): number {
    let baseSize = 100; // Base application size in KB

    // Add size for enabled features
    if (feature("DEBUG")) baseSize += 25;
    if (feature("PREMIUM")) baseSize += 40;
    if (feature("BETA_FEATURES")) baseSize += 30;
    if (feature("ADMIN")) baseSize += 35;
    if (feature("ANALYTICS")) baseSize += 20;
    if (feature("PERFORMANCE")) baseSize += 15;

    return baseSize;
  }

  private calculatePerformanceScore(): number {
    let score = 100;

    // Deduct points for enabled features
    if (feature("DEBUG")) score -= 10;
    if (feature("BETA_FEATURES")) score -= 15;
    if (feature("ANALYTICS")) score -= 5;

    // Add points for optimizations
    if (feature("PERFORMANCE")) score += 10;

    return Math.max(0, Math.min(100, score));
  }

  private setupServer(): void {
    this.server = serve({
      port: this.port,
      fetch: this.createRequestHandler(),
    });

    console.log(
      `\n🚀 Feature flags server running at http://localhost:${this.port}`
    );
    console.log("📊 Available endpoints:");
    console.log("  GET /api/features - Current feature flags");
    console.log("  GET /api/metrics - Build metrics and analysis");
    console.log("  GET /api/bundle - Bundle size estimation");
    console.log("  GET /api/performance - Performance analysis");
    console.log("  POST /api/analyze - Analyze feature combinations");
    console.log("  GET /health - Health check with feature info");
  }

  private createRequestHandler() {
    return async (req: Request) => {
      const url = new URL(req.url);

      try {
        switch (url.pathname) {
          case "/":
            return new Response(await this.getHomePage(), {
              headers: { "Content-Type": "text/html" },
            });

          case "/api/features":
            return new Response(
              JSON.stringify(this.getFeatureInfo(), null, 2),
              {
                headers: { "Content-Type": "application/json" },
              }
            );

          case "/api/metrics":
            return new Response(JSON.stringify(this.metrics, null, 2), {
              headers: { "Content-Type": "application/json" },
            });

          case "/api/bundle":
            const bundleInfo = this.getBundleInfo();
            return new Response(JSON.stringify(bundleInfo, null, 2), {
              headers: { "Content-Type": "application/json" },
            });

          case "/api/performance":
            const perfInfo = this.getPerformanceInfo();
            return new Response(JSON.stringify(perfInfo, null, 2), {
              headers: { "Content-Type": "application/json" },
            });

          case "/api/analyze":
            const features = url.searchParams.get("features");
            if (!features) {
              return new Response("Missing 'features' parameter", {
                status: 400,
              });
            }

            const analysis = this.analyzeFeatureCombination(
              features.split(",")
            );
            return new Response(JSON.stringify(analysis, null, 2), {
              headers: { "Content-Type": "application/json" },
            });

          case "/health":
            return new Response(
              JSON.stringify({
                status: "healthy",
                timestamp: new Date().toISOString(),
                uptime: Date.now() - this.startTime,
                enabledFeatures: this.metrics.enabledFeatures,
                bundleSize: this.metrics.bundleSize,
              }),
              {
                headers: { "Content-Type": "application/json" },
              }
            );

          default:
            return new Response("Not Found", { status: 404 });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return new Response(`Error: ${errorMessage}`, { status: 500 });
      }
    };
  }

  private getFeatureInfo(): any {
    return {
      enabled: this.metrics.enabledFeatures,
      disabled: this.getDisabledFeatures(),
      total: 7,
      enabledCount: this.metrics.enabledFeatures.length,
      disabledCount: this.getDisabledFeatures().length,
      registry: [
        "PREMIUM",
        "DEBUG",
        "BETA_FEATURES",
        "ADMIN",
        "ANALYTICS",
        "PERFORMANCE",
        "MOCK_API",
      ],
      typeSafe: true,
      compileTime: true,
    };
  }

  private getBundleInfo(): any {
    const currentSize = this.calculateBundleSize();
    const maxSize = this.calculateBundleSize() + 50; // All features enabled

    return {
      currentSize: `${currentSize}KB`,
      maxSize: `${maxSize}KB`,
      sizeReduction: `${maxSize - currentSize}KB`,
      reductionPercentage: (((maxSize - currentSize) / maxSize) * 100).toFixed(
        1
      ),
      deadCodeEliminated: this.metrics.deadCodeEliminated,
      optimizations: this.metrics.performanceOptimizations,
    };
  }

  private getPerformanceInfo(): any {
    const currentScore = this.calculatePerformanceScore();
    const maxScore = 110; // With all optimizations

    return {
      currentScore,
      maxScore,
      performanceGrade: this.getPerformanceGrade(currentScore),
      enabledFeatures: this.metrics.enabledFeatures.length,
      optimizations: this.metrics.performanceOptimizations,
      recommendations: this.getPerformanceRecommendations(),
    };
  }

  private getPerformanceGrade(score: number): string {
    if (score >= 90) return "A+";
    if (score >= 80) return "A";
    if (score >= 70) return "B";
    if (score >= 60) return "C";
    return "D";
  }

  private getPerformanceRecommendations(): string[] {
    const recommendations: string[] = [];

    if (feature("DEBUG")) {
      recommendations.push("Disable DEBUG for production builds");
    }

    if (feature("BETA_FEATURES")) {
      recommendations.push("Consider disabling BETA_FEATURES for stability");
    }

    if (!feature("PERFORMANCE")) {
      recommendations.push("Enable PERFORMANCE for optimized builds");
    }

    if (this.metrics.enabledFeatures.length > 4) {
      recommendations.push(
        "Consider reducing enabled features for better performance"
      );
    }

    return recommendations;
  }

  private analyzeFeatureCombination(features: string[]): any {
    const validFeatures = [
      "PREMIUM",
      "DEBUG",
      "BETA_FEATURES",
      "ADMIN",
      "ANALYTICS",
      "PERFORMANCE",
      "MOCK_API",
    ];
    const invalidFeatures = features.filter((f) => !validFeatures.includes(f));
    const validEnabled = features.filter((f) => validFeatures.includes(f));

    // Simulate analysis
    const estimatedSize = 100 + validEnabled.length * 20;
    const estimatedPerformance = 100 - validEnabled.length * 8;

    return {
      requested: features,
      valid: validEnabled,
      invalid: invalidFeatures,
      analysis: {
        estimatedBundleSize: `${estimatedSize}KB`,
        estimatedPerformance: estimatedPerformance,
        featureCount: validEnabled.length,
        recommendations: this.getFeatureRecommendations(validEnabled),
      },
    };
  }

  private getFeatureRecommendations(features: string[]): string[] {
    const recommendations: string[] = [];

    if (features.includes("DEBUG") && features.includes("PERFORMANCE")) {
      recommendations.push("DEBUG and PERFORMANCE may conflict - choose one");
    }

    if (features.includes("BETA_FEATURES") && !features.includes("DEBUG")) {
      recommendations.push("BETA_FEATURES work best with DEBUG enabled");
    }

    if (features.includes("ADMIN") && !features.includes("PREMIUM")) {
      recommendations.push("ADMIN features typically require PREMIUM");
    }

    if (features.length === 0) {
      recommendations.push(
        "Consider enabling at least one feature for functionality"
      );
    }

    return recommendations;
  }

  private async getHomePage(): Promise<string> {
    const uptime = (Date.now() - this.startTime) / 1000;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Advanced Bun Feature Flags</title>
    <script src="https://unpkg.com/htmx.org@1.9.10"></script>
    <script src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js" defer></script>
    <style>
        body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; background: #f8fafc; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
        .feature-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; }
        .feature-enabled { border-left: 4px solid #10b981; }
        .feature-disabled { border-left: 4px solid #ef4444; }
        .feature-name { font-weight: bold; margin-bottom: 5px; }
        .feature-status { font-size: 0.9em; color: #64748b; }
        .architectures { margin-bottom: 20px; }
        .arch-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 15px; }
        .arch-active { border-left: 4px solid #10b981; background: #f0fdf4; }
        .arch-inactive { border-left: 4px solid #d1d5db; opacity: 0.7; }
        .arch-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .arch-name { font-weight: bold; font-size: 1.1em; }
        .arch-size { background: #3b82f6; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8em; }
        .arch-features { margin: 10px 0; }
        .arch-feature { display: inline-block; padding: 4px 8px; margin: 2px; border-radius: 4px; font-size: 0.8em; font-weight: bold; }
        .arch-use { color: #64748b; font-style: italic; margin: 8px 0; }
        .arch-status { font-weight: bold; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .metric-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .metric-value { font-size: 2em; font-weight: bold; color: #1e40af; }
        .metric-label { color: #64748b; margin-top: 5px; }
        .controls { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px; }
        button { background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin: 5px; }
        button:hover { background: #2563eb; }
        input { padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; margin: 5px; }
        .results { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .code { background: #f1f5f9; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 0.9em; margin: 5px 0; }
    </style>
</head>
<body x-data="{
  features: ${JSON.stringify(this.getFeatureInfo())},
  metrics: ${JSON.stringify(this.metrics)},
  uptime: ${uptime}
}">
    <div class="container">
        <div class="header">
            <h1>🚀 Advanced Bun Feature Flags</h1>
            <p>Compile-time dead-code elimination and build-time feature toggles</p>
        </div>

        <div class="features">
            <template x-for="feature in ['PREMIUM', 'DEBUG', 'BETA_FEATURES', 'ADMIN', 'ANALYTICS', 'PERFORMANCE']" :key="feature">
                <div class="feature-card" :class="features.enabled.includes(feature) ? 'feature-enabled' : 'feature-disabled'">
                    <div class="feature-name" x-text="feature"></div>
                    <div class="feature-status" x-text="features.enabled.includes(feature) ? '✅ Enabled' : '❌ Disabled'"></div>
                </div>
            </template>
        </div>

        <div class="architectures">
            <h3>🏗️ Architecture Patterns</h3>
            <template x-for="arch in getArchitectures()" :key="arch.name">
                <div class="arch-card" :class="arch.isActive ? 'arch-active' : 'arch-inactive'">
                    <div class="arch-header">
                        <div class="arch-name" x-text="arch.name"></div>
                        <div class="arch-size" x-text="arch.size"></div>
                    </div>
                    <div class="arch-features">
                        <template x-for="feature in arch.features" :key="feature">
                            <span class="arch-feature" :class="features.enabled.includes(feature) ? 'feature-enabled' : 'feature-disabled'" x-text="feature"></span>
                        </template>
                    </div>
                    <div class="arch-use" x-text="arch.useCase"></div>
                    <div class="arch-status" x-text="arch.isActive ? '🟢 Active' : '⚪ Inactive'"></div>
                </div>
            </template>
        </div>

        <div class="metrics">
            <div class="metric-card">
                <div class="metric-value" x-text="features.enabledCount"></div>
                <div class="metric-label">Enabled Features</div>
            </div>
            <div class="metric-card">
                <div class="metric-value" x-text="metrics.bundleSize + 'KB'"></div>
                <div class="metric-label">Bundle Size</div>
            </div>
            <div class="metric-card">
                <div class="metric-value" x-text="features.disabledCount"></div>
                <div class="metric-label">Disabled Features</div>
            </div>
            <div class="metric-card">
                <div class="metric-value" x-text="uptime.toFixed(1) + 's'"></div>
                <div class="metric-label">Uptime</div>
            </div>
        </div>

        <div class="controls">
            <h3>🧪 Feature Analysis</h3>
            <input x-model="testFeatures" placeholder="Enter features (e.g., DEBUG,PREMIUM)" />
            <button @click="analyzeFeatures()">Analyze Combination</button>
            <button @click="showBundleInfo()">Bundle Analysis</button>
            <button @click="showPerformanceInfo()">Performance Info</button>
            <button @click="refreshData()">Refresh</button>
        </div>

        <div class="results">
            <h3>📊 Build Information</h3>
            <div class="code">
                <strong>Build Command:</strong> bun build --feature=<span x-text="features.enabled.join(',')"></span> ./app.ts --outdir ./out
            </div>
            <div class="code">
                <strong>Dead Code Eliminated:</strong> <span x-text="metrics.deadCodeEliminated.join(', ')"></span>
            </div>
            <div class="code">
                <strong>Performance Optimizations:</strong> <span x-text="metrics.performanceOptimizations.join(', ')"></span>
            </div>
            <div id="analysisResults" x-show="analysisResults">
                <h4>🔍 Analysis Results:</h4>
                <pre x-text="JSON.stringify(analysisResults, null, 2)"></pre>
            </div>
        </div>
    </div>

    <script>
        function getArchitectures() {
            const enabled = features.enabled;
            return [
                {
                    name: "🏗️ Micro-Frontend",
                    size: "125KB",
                    features: ["PREMIUM", "DEBUG", "ANALYTICS"],
                    useCase: "Enterprise applications with team autonomy",
                    isActive: enabled.includes("PREMIUM") && enabled.includes("DEBUG") && enabled.includes("ANALYTICS")
                },
                {
                    name: "📱 Progressive Web App",
                    size: "95KB",
                    features: ["BETA_FEATURES", "PERFORMANCE", "DEBUG"],
                    useCase: "Mobile-first web applications",
                    isActive: enabled.includes("BETA_FEATURES") && enabled.includes("PERFORMANCE") && enabled.includes("DEBUG")
                },
                {
                    name: "🏢 Enterprise SaaS",
                    size: "150KB",
                    features: ["ADMIN", "PREMIUM", "ANALYTICS"],
                    useCase: "Multi-tier business applications",
                    isActive: enabled.includes("ADMIN") && enabled.includes("PREMIUM") && enabled.includes("ANALYTICS")
                },
                {
                    name: "📱 Mobile Application",
                    size: "75KB",
                    features: ["BETA_FEATURES", "PERFORMANCE", "DEBUG"],
                    useCase: "Native-like mobile experiences",
                    isActive: enabled.includes("BETA_FEATURES") && enabled.includes("PERFORMANCE") && enabled.includes("DEBUG")
                },
                {
                    name: "🌐 IoT Device",
                    size: "18KB",
                    features: ["PERFORMANCE", "ADMIN", "ANALYTICS"],
                    useCase: "Resource-constrained devices",
                    isActive: enabled.includes("PERFORMANCE") && enabled.includes("ADMIN") && enabled.includes("ANALYTICS")
                }
            ];
        }

        function analyzeFeatures() {
            const features = document.querySelector('input[x-model="testFeatures"]').value;
            if (!features) {
                alert('Please enter features to analyze');
                return;
            }

            fetch('/api/analyze?features=' + encodeURIComponent(features))
                .then(r => r.json())
                .then(data => {
                    window.Alpine.store().analysisResults = data;
                })
                .catch(error => {
                    console.error('Error analyzing features:', error);
                });
        }

        function showBundleInfo() {
            fetch('/api/bundle')
                .then(r => r.json())
                .then(data => {
                    console.log('Bundle Info:', data);
                    alert('Bundle info logged to console');
                });
        }

        function showPerformanceInfo() {
            fetch('/api/performance')
                .then(r => r.json())
                .then(data => {
                    console.log('Performance Info:', data);
                    alert('Performance info logged to console');
                });
        }

        function refreshData() {
            fetch('/api/features')
                .then(r => r.json())
                .then(data => {
                    window.Alpine.store().features = data;
                });

            fetch('/api/metrics')
                .then(r => r.json())
                .then(data => {
                    window.Alpine.store().metrics = data;
                });
        }
    </script>
</body>
</html>`;
    return html;
  }
}

// Start the feature flags demonstration
console.log("🚀 Starting Advanced Bun Feature Flags Demo...");
console.log("💡 Features demonstrated:");
console.log("  • Compile-time feature flags with dead-code elimination");
console.log("  • Type-safe feature registry with autocomplete");
console.log("  • Bundle size optimization through conditional compilation");
console.log("  • Performance analysis and recommendations");
console.log("  • Interactive feature combination analysis");

const demo = new FeatureFlagDemo();

// Keep the process running
setInterval(() => {
  // Prevent process from exiting
}, 1000000);

console.log("✅ Feature flags demo initialized successfully!");
console.log("🎯 Build command examples:");
console.log(
  "  bun build --feature=PREMIUM --feature=DEBUG ./app.ts --outdir ./out"
);
console.log("  bun run --feature=ANALYTICS ./app.ts");
console.log("  bun test --feature=MOCK_API");
console.log("🔍 Try different feature combinations via the web interface!");
