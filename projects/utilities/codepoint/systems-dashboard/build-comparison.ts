#!/usr/bin/env bun
// build-comparison.ts - Enhanced build configuration comparison with advanced analysis

console.info("🔍 Enhanced Build Configuration Comparison");
console.info("=".repeat(50));

// Set comprehensive test environment variables
process.env.PUBLIC_API_URL = "https://api.example.com";
process.env.PUBLIC_API_VERSION = "v2";
process.env.PUBLIC_ENABLE_HEALTH = "true";
process.env.PUBLIC_LOG_LEVEL = "info";
process.env.SECRET_KEY = "super-secret-key";
process.env.DB_PASSWORD = "database-password";
process.env.JWT_SECRET = "jwt-signing-key";
process.env.NODE_ENV = "production";
process.env.BUILD_NUMBER = "12345";

interface BuildResult {
  name: string;
  result: any;
  size: number;
  hasSecrets: boolean;
  hasProcessEnv: boolean;
  buildTime: number;
}

interface SecurityAnalysis {
  secretsExposed: boolean;
  processEnvRefs: number;
  publicVarsInlined: number;
  privateVarsProtected: number;
}

interface PerformanceMetrics {
  buildTime: number;
  bundleSize: number;
  compressionRatio?: number;
}

async function analyzeBundle(filePath: string): Promise<{
  hasSecrets: boolean;
  hasProcessEnv: boolean;
  processEnvRefs: number;
  publicVarsInlined: number;
  privateVarsProtected: number;
}> {
  const content = await Bun.file(filePath).text();

  // Count different types of references
  const processEnvRefs = (content.match(/process\.env\./g) || []).length;
  const publicVarsInlined = (
    content.match(/https:\/\/api\.example\.com/g) || []
  ).length;
  const privateVarsProtected = (
    content.match(/process\.env\.(SECRET_KEY|DB_PASSWORD|JWT_SECRET)/g) || []
  ).length;

  // Check for exposed secrets
  const hasSecrets =
    content.includes("super-secret-key") ||
    content.includes("database-password") ||
    content.includes("jwt-signing-key");

  const hasProcessEnv = processEnvRefs > 0;

  return {
    hasSecrets,
    hasProcessEnv,
    processEnvRefs,
    publicVarsInlined,
    privateVarsProtected,
  };
}

async function measureBuildPerformance(buildFn: () => Promise<any>): Promise<{
  result: any;
  buildTime: number;
}> {
  const startTime = performance.now();
  const result = await buildFn();
  const endTime = performance.now();

  return {
    result,
    buildTime: Math.round(endTime - startTime),
  };
}

async function compareBuilds(): Promise<void> {
  console.info("📦 Building with different environment configurations...\n");

  const buildResults: BuildResult[] = [];
  const securityAnalyses: SecurityAnalysis[] = [];
  const performanceMetrics: PerformanceMetrics[] = [];

  // 1. Inline build (all env vars)
  console.info("1️⃣ INLINE Build (all environment variables):");
  const { result: inlineResult, buildTime: inlineTime } =
    await measureBuildPerformance(async () =>
      Bun.build({
        entrypoints: ["env-test.ts"],
        outdir: "dist-comparison-inline",
        env: "inline",
        minify: false,
        sourcemap: "none",
      })
    );

  const inlineAnalysis = await analyzeBundle(
    "dist-comparison-inline/env-test.js"
  );
  buildResults.push({
    name: "Inline",
    result: inlineResult,
    size: inlineResult.outputs[0].size,
    hasSecrets: inlineAnalysis.hasSecrets,
    hasProcessEnv: inlineAnalysis.hasProcessEnv,
    buildTime: inlineTime,
  });

  console.info(`   ✅ Built: ${inlineResult.outputs.length} files`);
  console.info(`   📊 Size: ${inlineResult.outputs[0].size} bytes`);
  console.info(`   ⚡ Build Time: ${inlineTime}ms`);
  console.info(
    `   🔐 SECRET_KEY inlined: ${inlineAnalysis.hasSecrets ? "❌ YES (unsafe)" : "✅ NO"}`
  );
  console.info(`   🔗 process.env refs: ${inlineAnalysis.processEnvRefs}`);
  console.info("");

  // 2. Public prefix build (secure)
  console.info("2️⃣ PUBLIC_* Build (only public variables):");
  const { result: publicResult, buildTime: publicTime } =
    await measureBuildPerformance(async () =>
      Bun.build({
        entrypoints: ["env-test.ts"],
        outdir: "dist-comparison-public",
        env: "PUBLIC_*",
        minify: false,
        sourcemap: "none",
      })
    );

  const publicAnalysis = await analyzeBundle(
    "dist-comparison-public/env-test.js"
  );
  buildResults.push({
    name: "PUBLIC_*",
    result: publicResult,
    size: publicResult.outputs[0].size,
    hasSecrets: publicAnalysis.hasSecrets,
    hasProcessEnv: publicAnalysis.hasProcessEnv,
    buildTime: publicTime,
  });

  console.info(`   ✅ Built: ${publicResult.outputs.length} files`);
  console.info(`   📊 Size: ${publicResult.outputs[0].size} bytes`);
  console.info(`   ⚡ Build Time: ${publicTime}ms`);
  console.info(
    `   🔐 SECRET_KEY inlined: ${publicAnalysis.hasSecrets ? "❌ YES (unsafe)" : "✅ NO"}`
  );
  console.info(`   � process.env refs: ${publicAnalysis.processEnvRefs}`);
  console.info(
    `   🛡️ Private vars protected: ${publicAnalysis.privateVarsProtected}`
  );
  console.info("");

  // 3. Disabled build (no injection)
  console.info("3️⃣ DISABLED Build (no environment injection):");
  const { result: disabledResult, buildTime: disabledTime } =
    await measureBuildPerformance(async () =>
      Bun.build({
        entrypoints: ["env-test.ts"],
        outdir: "dist-comparison-disabled",
        env: "disable",
        minify: false,
        sourcemap: "none",
      })
    );

  const disabledAnalysis = await analyzeBundle(
    "dist-comparison-disabled/env-test.js"
  );
  buildResults.push({
    name: "Disabled",
    result: disabledResult,
    size: disabledResult.outputs[0].size,
    hasSecrets: disabledAnalysis.hasSecrets,
    hasProcessEnv: disabledAnalysis.hasProcessEnv,
    buildTime: disabledTime,
  });

  console.info(`   ✅ Built: ${disabledResult.outputs.length} files`);
  console.info(`   📊 Size: ${disabledResult.outputs[0].size} bytes`);
  console.info(`   ⚡ Build Time: ${disabledTime}ms`);
  console.info(
    `   🔐 All env vars runtime: ${disabledAnalysis.hasProcessEnv ? "✅ YES (safe)" : "❌ NO"}`
  );
  console.info(`   🔗 process.env refs: ${disabledAnalysis.processEnvRefs}`);
  console.info("");

  // 4. Minified builds comparison
  console.info("4️⃣ MINIFIED Builds Comparison:");
  const { result: minifiedResult, buildTime: minifiedTime } =
    await measureBuildPerformance(async () =>
      Bun.build({
        entrypoints: ["env-test.ts"],
        outdir: "dist-comparison-minified",
        env: "PUBLIC_*",
        minify: true,
        sourcemap: "none",
      })
    );

  const minifiedAnalysis = await analyzeBundle(
    "dist-comparison-minified/env-test.js"
  );
  const compressionRatio =
    ((inlineResult.outputs[0].size - minifiedResult.outputs[0].size) /
      inlineResult.outputs[0].size) *
    100;

  console.info(`   ✅ Built: ${minifiedResult.outputs.length} files`);
  console.info(`   📊 Size: ${minifiedResult.outputs[0].size} bytes`);
  console.info(`   ⚡ Build Time: ${minifiedTime}ms`);
  console.info(
    `   �️ Compression: ${compressionRatio.toFixed(1)}% smaller than inline`
  );
  console.info(
    `   🔐 Security: ${minifiedAnalysis.hasSecrets ? "❌ Compromised" : "✅ Secure"}`
  );
  console.info("");

  // 5. Source maps comparison
  console.info("5️⃣ SOURCE MAPS Comparison:");
  const { result: sourcemapResult } = await measureBuildPerformance(async () =>
    Bun.build({
      entrypoints: ["env-test.ts"],
      outdir: "dist-comparison-sourcemap",
      env: "PUBLIC_*",
      minify: false,
      sourcemap: "linked",
    })
  );

  console.info(`   ✅ Built: ${sourcemapResult.outputs.length} files`);
  console.info(`   📊 Bundle Size: ${sourcemapResult.outputs[0].size} bytes`);
  console.info(`   🗺️ Source Map: ${sourcemapResult.outputs[1].size} bytes`);
  console.info(
    `   📈 Total Size: ${sourcemapResult.outputs[0].size + sourcemapResult.outputs[1].size} bytes`
  );
  console.info("");

  // Comprehensive Analysis Section
  console.info("� COMPREHENSIVE ANALYSIS");
  console.info("─".repeat(50));

  // Size Analysis
  console.info("\n📏 Size Analysis:");
  buildResults.forEach((build) => {
    const sizeDiff = build.size - buildResults[0].size;
    console.info(
      `   ${build.name.padEnd(10)}: ${build.size} bytes (${sizeDiff >= 0 ? "+" : ""}${sizeDiff})`
    );
  });

  // Performance Analysis
  console.info("\n⚡ Performance Analysis:");
  buildResults.forEach((build) => {
    const timeDiff = build.buildTime - buildResults[0].buildTime;
    console.info(
      `   ${build.name.padEnd(10)}: ${build.buildTime}ms (${timeDiff >= 0 ? "+" : ""}${timeDiff}ms)`
    );
  });

  // Security Analysis
  console.info("\n🔒 Security Analysis:");
  buildResults.forEach((build) => {
    const security = build.hasSecrets
      ? "❌ VULNERABLE"
      : build.hasProcessEnv
        ? "✅ SECURE"
        : "⚠️ MIXED";
    console.info(`   ${build.name.padEnd(10)}: ${security}`);
  });

  // Recommendations Matrix
  console.info("\n💡 Recommendations Matrix:");
  console.info("   ┌─────────────┬──────────┬──────────┬──────────┬──────────┐");
  console.info("   │ Environment │ Inline  │ PUBLIC_* │ Disabled │ Minified │");
  console.info("   ├─────────────┼──────────┼──────────┼──────────┼──────────┤");
  console.info("   │ Development │ ✅ BEST  │ ✅ GOOD  │ ❌ NO    │ ❌ NO    │");
  console.info("   │ Staging     │ ⚠️ RISKY │ ✅ BEST  │ ✅ GOOD  │ ✅ GOOD  │");
  console.info("   │ Production  │ ❌ NEVER │ ✅ BEST  │ ✅ GOOD  │ ✅ BEST  │");
  console.info("   │ CI/CD       │ ❌ NEVER │ ⚠️ RISKY │ ✅ BEST  │ ✅ GOOD  │");
  console.info("   └─────────────┴──────────┴──────────┴──────────┴──────────┘");

  // Security Best Practices
  console.info("\n🛡️ Security Best Practices:");
  console.info("   ✅ Use PUBLIC_* prefix for client-side variables");
  console.info("   ✅ Keep secrets (API keys, passwords) as runtime env vars");
  console.info("   ✅ Use different configs per environment");
  console.info("   ✅ Validate environment variables at startup");
  console.info("   ❌ Never inline secrets in production builds");
  console.info("   ❌ Don't use inline mode for production deployments");

  // Performance Optimization Tips
  console.info("\n� Performance Optimization Tips:");
  console.info(
    "   🗜️ Enable minification for production (~20-40% size reduction)"
  );
  console.info("   🗺️ Use external source maps for debugging");
  console.info("   � Consider code splitting for large applications");
  console.info("   ⚡ Use tree shaking to remove unused code");
  console.info(
    "   🎯 Target specific browsers/platforms for better optimization"
  );

  console.info("\n✅ Enhanced Build Comparison Complete!");
}

// Run enhanced comparison
compareBuilds().catch(console.error);
