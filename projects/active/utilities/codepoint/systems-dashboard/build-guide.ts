#!/usr/bin/env bun
// build-guide.ts - Comprehensive build configuration guide

console.info("📚 Bun Build Configuration Guide");
console.info("=".repeat(50));

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
  console.info("🏗️ Build Configuration Matrix\n");

  // Display configuration matrix
  console.info(
    "┌─────────────┬─────────┬─────────┬───────────┬─────────┬──────────┐"
  );
  console.info(
    "│ Configuration│ Security│ Performance│ Bundle Size│ Target  │ Use Case │"
  );
  console.info(
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

    console.info(
      `│ ${config.name.padEnd(11)} │ ${security} ${config.security.padEnd(7)} │ ${performance} ${config.performance.padEnd(8)} │ ${size} ${config.bundleSize.padEnd(9)} │ ${target} ${config.target.padEnd(6)} │ ${useCase.padEnd(8)} │`
    );
  });

  console.info(
    "└─────────────┴─────────┴─────────┴───────────┴─────────┴──────────┘"
  );
  console.info("");

  // Detailed configuration examples
  buildConfigs.forEach((config, index) => {
    console.info(`${index + 1}. ${config.name} Configuration`);
    console.info("─".repeat(30));
    console.info(`📝 Description: ${config.description}`);
    console.info(`🎯 Use Cases: ${config.useCase.join(", ")}`);
    console.info("");

    console.info("🔧 Build Command:");
    console.info(`   ${generateBuildCommand(config)}`);
    console.info("");

    console.info("🔒 Security Analysis:");
    analyzeSecurity(config).forEach((risk) => {
      console.info(`   ${risk}`);
    });
    console.info("");

    console.info("🌍 Environment Setup:");
    console.info(generateEnvironmentSetup(config));
    console.info("");

    console.info("📋 Configuration File (bunfig.toml):");
    console.info(`   [build.${config.name.toLowerCase()}]`);
    console.info(`   env = ${config.env ? `"${config.env}"` : "false"}`);
    console.info(`   minify = ${config.minify}`);
    console.info(`   sourcemap = "${config.sourcemap}"`);
    console.info(`   target = "${config.target}"`);
    console.info("");

    if (index < buildConfigs.length - 1) {
      console.info("─".repeat(50));
      console.info("");
    }
  });

  // Best practices section
  console.info("🎯 BEST PRACTICES");
  console.info("=".repeat(50));

  console.info("\n🔒 Security Best Practices:");
  console.info("   ✅ Always use PUBLIC_* prefix for client-side variables");
  console.info("   ✅ Keep secrets (API keys, passwords) runtime-only");
  console.info("   ✅ Use different configs per environment");
  console.info("   ✅ Validate environment variables at startup");
  console.info("   ❌ Never use inline mode in production");
  console.info("   ❌ Don't commit .env files to version control");

  console.info("\n⚡ Performance Best Practices:");
  console.info("   ✅ Enable minification for production");
  console.info("   ✅ Use external source maps for debugging");
  console.info("   ✅ Target specific environments (browser vs bun)");
  console.info("   ✅ Consider code splitting for large apps");
  console.info("   ✅ Use tree shaking to remove dead code");

  console.info("\n📦 Bundle Size Optimization:");
  console.info("   ✅ Minification reduces size by 20-40%");
  console.info("   ✅ Tree shaking removes unused code");
  console.info("   ✅ Code splitting improves load times");
  console.info("   ✅ Compression on CDN/serve level");
  console.info("   ✅ Image and asset optimization");

  console.info("\n🔧 Development Workflow:");
  console.info("   🧪 Development: Use inline env vars for debugging");
  console.info("   🚀 Staging: Use PUBLIC_* for realistic testing");
  console.info("   🏭 Production: Use optimized secure builds");
  console.info("   🤖 CI/CD: Use disabled env vars for security");
  console.info("   🧪 Testing: Use fast builds without sourcemaps");

  console.info("\n✅ Build Configuration Guide Complete!");
  console.info("\n📚 Additional Resources:");
  console.info("   📖 Bun Docs: https://bun.sh/docs/bundler");
  console.info("   🔧 Environment Variables: https://bun.sh/docs/runtime/env");
  console.info("   🏗️ Build API: https://bun.sh/docs/bundler/api");
}

main();
