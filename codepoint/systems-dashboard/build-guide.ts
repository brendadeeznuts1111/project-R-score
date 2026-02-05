#!/usr/bin/env bun
// build-guide.ts - Comprehensive build configuration guide

console.log("📚 Bun Build Configuration Guide");
console.log("=".repeat(50));

interface BuildConfig {
  name: string;
  env: string | undefined;
  minify: boolean;
  sourcemap: string;
  target: string;
  description: string;
  useCase: string[];
  security: "high" | "medium" | "low";
  performance: "fast" | "medium" | "slow";
  bundleSize: "small" | "medium" | "large";
}

const buildConfigs: BuildConfig[] = [
  {
    name: "Development",
    env: "inline",
    minify: false,
    sourcemap: "inline",
    target: "bun",
    description: "Fast builds with full debugging info",
    useCase: ["local development", "debugging", "testing"],
    security: "low",
    performance: "fast",
    bundleSize: "large",
  },
  {
    name: "Staging",
    env: "PUBLIC_*",
    minify: false,
    sourcemap: "linked",
    target: "browser",
    description: "Secure builds with debugging capabilities",
    useCase: ["staging", "pre-production", "QA testing"],
    security: "high",
    performance: "medium",
    bundleSize: "medium",
  },
  {
    name: "Production",
    env: "PUBLIC_*",
    minify: true,
    sourcemap: "external",
    target: "browser",
    description: "Optimized secure builds for production",
    useCase: ["production", "user-facing", "CDN deployment"],
    security: "high",
    performance: "medium",
    bundleSize: "small",
  },
  {
    name: "CI/CD",
    env: "disable",
    minify: true,
    sourcemap: "none",
    target: "bun",
    description: "Maximum security for automated pipelines",
    useCase: ["CI/CD", "automated testing", "security scanning"],
    security: "high",
    performance: "slow",
    bundleSize: "small",
  },
  {
    name: "Testing",
    env: "inline",
    minify: false,
    sourcemap: "none",
    target: "bun",
    description: "Fast builds for unit/integration tests",
    useCase: ["unit tests", "integration tests", "e2e tests"],
    security: "low",
    performance: "fast",
    bundleSize: "medium",
  },
];

function generateBuildCommand(config: BuildConfig): string {
  const parts = ["bun build"];

  if (config.env) {
    parts.push(`--env=${config.env}`);
  }

  parts.push(`--minify=${config.minify}`);
  parts.push(`--sourcemap=${config.sourcemap}`);
  parts.push(`--target=${config.target}`);

  parts.push("src/index.tsx --outdir dist");

  return parts.join(" ");
}

function analyzeSecurity(config: BuildConfig): string[] {
  const risks: string[] = [];

  if (config.env === "inline") {
    risks.push("⚠️ All environment variables inlined (including secrets)");
  }

  if (config.sourcemap === "inline") {
    risks.push("⚠️ Source maps exposed in bundle");
  }

  if (!config.minify) {
    risks.push("ℹ️ Code not minified (larger bundle size)");
  }

  if (risks.length === 0) {
    risks.push("✅ Secure configuration");
  }

  return risks;
}

function generateEnvironmentSetup(config: BuildConfig): string {
  if (config.env === "PUBLIC_*") {
    return `# Public environment variables (safe to expose)
export PUBLIC_API_URL=https://api.example.com
export PUBLIC_VERSION=1.0.0
export PUBLIC_FEATURE_FLAG=true

# Private environment variables (runtime only)
export SECRET_KEY=keep-secret
export DB_PASSWORD=keep-secret`;
  }

  if (config.env === "inline") {
    return `# All environment variables (development only)
export PUBLIC_API_URL=https://api.example.com
export SECRET_KEY=dev-secret
export DB_PASSWORD=dev-password
export NODE_ENV=development`;
  }

  return `# Runtime environment variables only
export SECRET_KEY=production-secret
export DB_PASSWORD=production-password`;
}

function main() {
  console.log("🏗️ Build Configuration Matrix\n");

  // Display configuration matrix
  console.log(
    "┌─────────────┬─────────┬─────────┬───────────┬─────────┬──────────┐"
  );
  console.log(
    "│ Configuration│ Security│ Performance│ Bundle Size│ Target  │ Use Case │"
  );
  console.log(
    "├─────────────┼─────────┼─────────┼───────────┼─────────┼──────────┤"
  );

  buildConfigs.forEach((config) => {
    const security =
      config.security === "high"
        ? "🔒"
        : config.security === "medium"
          ? "🔓"
          : "🔓";
    const performance =
      config.performance === "fast"
        ? "⚡"
        : config.performance === "medium"
          ? "🚀"
          : "🐌";
    const size =
      config.bundleSize === "small"
        ? "📦"
        : config.bundleSize === "medium"
          ? "📦"
          : "📦";
    const target = config.target === "bun" ? "🟦" : "🌐";
    const useCase = config.useCase[0];

    console.log(
      `│ ${config.name.padEnd(11)} │ ${security} ${config.security.padEnd(7)} │ ${performance} ${config.performance.padEnd(8)} │ ${size} ${config.bundleSize.padEnd(9)} │ ${target} ${config.target.padEnd(6)} │ ${useCase.padEnd(8)} │`
    );
  });

  console.log(
    "└─────────────┴─────────┴─────────┴───────────┴─────────┴──────────┘"
  );
  console.log("");

  // Detailed configuration examples
  buildConfigs.forEach((config, index) => {
    console.log(`${index + 1}. ${config.name} Configuration`);
    console.log("─".repeat(30));
    console.log(`📝 Description: ${config.description}`);
    console.log(`🎯 Use Cases: ${config.useCase.join(", ")}`);
    console.log("");

    console.log("🔧 Build Command:");
    console.log(`   ${generateBuildCommand(config)}`);
    console.log("");

    console.log("🔒 Security Analysis:");
    analyzeSecurity(config).forEach((risk) => {
      console.log(`   ${risk}`);
    });
    console.log("");

    console.log("🌍 Environment Setup:");
    console.log(generateEnvironmentSetup(config));
    console.log("");

    console.log("📋 Configuration File (bunfig.toml):");
    console.log(`   [build.${config.name.toLowerCase()}]`);
    console.log(`   env = ${config.env ? `"${config.env}"` : "false"}`);
    console.log(`   minify = ${config.minify}`);
    console.log(`   sourcemap = "${config.sourcemap}"`);
    console.log(`   target = "${config.target}"`);
    console.log("");

    if (index < buildConfigs.length - 1) {
      console.log("─".repeat(50));
      console.log("");
    }
  });

  // Best practices section
  console.log("🎯 BEST PRACTICES");
  console.log("=".repeat(50));

  console.log("\n🔒 Security Best Practices:");
  console.log("   ✅ Always use PUBLIC_* prefix for client-side variables");
  console.log("   ✅ Keep secrets (API keys, passwords) runtime-only");
  console.log("   ✅ Use different configs per environment");
  console.log("   ✅ Validate environment variables at startup");
  console.log("   ❌ Never use inline mode in production");
  console.log("   ❌ Don't commit .env files to version control");

  console.log("\n⚡ Performance Best Practices:");
  console.log("   ✅ Enable minification for production");
  console.log("   ✅ Use external source maps for debugging");
  console.log("   ✅ Target specific environments (browser vs bun)");
  console.log("   ✅ Consider code splitting for large apps");
  console.log("   ✅ Use tree shaking to remove dead code");

  console.log("\n📦 Bundle Size Optimization:");
  console.log("   ✅ Minification reduces size by 20-40%");
  console.log("   ✅ Tree shaking removes unused code");
  console.log("   ✅ Code splitting improves load times");
  console.log("   ✅ Compression on CDN/serve level");
  console.log("   ✅ Image and asset optimization");

  console.log("\n🔧 Development Workflow:");
  console.log("   🧪 Development: Use inline env vars for debugging");
  console.log("   🚀 Staging: Use PUBLIC_* for realistic testing");
  console.log("   🏭 Production: Use optimized secure builds");
  console.log("   🤖 CI/CD: Use disabled env vars for security");
  console.log("   🧪 Testing: Use fast builds without sourcemaps");

  console.log("\n✅ Build Configuration Guide Complete!");
  console.log("\n📚 Additional Resources:");
  console.log("   📖 Bun Docs: https://bun.sh/docs/bundler");
  console.log("   🔧 Environment Variables: https://bun.sh/docs/runtime/env");
  console.log("   🏗️ Build API: https://bun.sh/docs/bundler/api");
}

main();
