#!/usr/bin/env bun
// build-comparison.ts - Enhanced build configuration comparison with advanced analysis

console.log("🔍 Enhanced Build Configuration Comparison");
console.log("=".repeat(50));

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
  console.log("📦 Building with different environment configurations...\n");

  const buildResults: BuildResult[] = [];
  const securityAnalyses: SecurityAnalysis[] = [];
  const performanceMetrics: PerformanceMetrics[] = [];

  // 1. Inline build (all env vars)
  console.log("1️⃣ INLINE Build (all environment variables):");
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

  console.log(`   ✅ Built: ${inlineResult.outputs.length} files`);
  console.log(`   📊 Size: ${inlineResult.outputs[0].size} bytes`);
  console.log(`   ⚡ Build Time: ${inlineTime}ms`);
  console.log(
    `   🔐 SECRET_KEY inlined: ${inlineAnalysis.hasSecrets ? "❌ YES (unsafe)" : "✅ NO"}`
  );
  console.log(`   🔗 process.env refs: ${inlineAnalysis.processEnvRefs}`);
  console.log("");

  // 2. Public prefix build (secure)
  console.log("2️⃣ PUBLIC_* Build (only public variables):");
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

  console.log(`   ✅ Built: ${publicResult.outputs.length} files`);
  console.log(`   📊 Size: ${publicResult.outputs[0].size} bytes`);
  console.log(`   ⚡ Build Time: ${publicTime}ms`);
  console.log(
    `   🔐 SECRET_KEY inlined: ${publicAnalysis.hasSecrets ? "❌ YES (unsafe)" : "✅ NO"}`
  );
  console.log(`   � process.env refs: ${publicAnalysis.processEnvRefs}`);
  console.log(
    `   🛡️ Private vars protected: ${publicAnalysis.privateVarsProtected}`
  );
  console.log("");

  // 3. Disabled build (no injection)
  console.log("3️⃣ DISABLED Build (no environment injection):");
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

  console.log(`   ✅ Built: ${disabledResult.outputs.length} files`);
  console.log(`   📊 Size: ${disabledResult.outputs[0].size} bytes`);
  console.log(`   ⚡ Build Time: ${disabledTime}ms`);
  console.log(
    `   🔐 All env vars runtime: ${disabledAnalysis.hasProcessEnv ? "✅ YES (safe)" : "❌ NO"}`
  );
  console.log(`   🔗 process.env refs: ${disabledAnalysis.processEnvRefs}`);
  console.log("");

  // 4. Minified builds comparison
  console.log("4️⃣ MINIFIED Builds Comparison:");
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

  console.log(`   ✅ Built: ${minifiedResult.outputs.length} files`);
  console.log(`   📊 Size: ${minifiedResult.outputs[0].size} bytes`);
  console.log(`   ⚡ Build Time: ${minifiedTime}ms`);
  console.log(
    `   �️ Compression: ${compressionRatio.toFixed(1)}% smaller than inline`
  );
  console.log(
    `   🔐 Security: ${minifiedAnalysis.hasSecrets ? "❌ Compromised" : "✅ Secure"}`
  );
  console.log("");

  // 5. Source maps comparison
  console.log("5️⃣ SOURCE MAPS Comparison:");
  const { result: sourcemapResult } = await measureBuildPerformance(async () =>
    Bun.build({
      entrypoints: ["env-test.ts"],
      outdir: "dist-comparison-sourcemap",
      env: "PUBLIC_*",
      minify: false,
      sourcemap: "linked",
    })
  );

  console.log(`   ✅ Built: ${sourcemapResult.outputs.length} files`);
  console.log(`   📊 Bundle Size: ${sourcemapResult.outputs[0].size} bytes`);
  console.log(`   🗺️ Source Map: ${sourcemapResult.outputs[1].size} bytes`);
  console.log(
    `   📈 Total Size: ${sourcemapResult.outputs[0].size + sourcemapResult.outputs[1].size} bytes`
  );
  console.log("");

  // Comprehensive Analysis Section
  console.log("� COMPREHENSIVE ANALYSIS");
  console.log("─".repeat(50));

  // Size Analysis
  console.log("\n📏 Size Analysis:");
  buildResults.forEach((build) => {
    const sizeDiff = build.size - buildResults[0].size;
    console.log(
      `   ${build.name.padEnd(10)}: ${build.size} bytes (${sizeDiff >= 0 ? "+" : ""}${sizeDiff})`
    );
  });

  // Performance Analysis
  console.log("\n⚡ Performance Analysis:");
  buildResults.forEach((build) => {
    const timeDiff = build.buildTime - buildResults[0].buildTime;
    console.log(
      `   ${build.name.padEnd(10)}: ${build.buildTime}ms (${timeDiff >= 0 ? "+" : ""}${timeDiff}ms)`
    );
  });

  // Security Analysis
  console.log("\n🔒 Security Analysis:");
  buildResults.forEach((build) => {
    const security = build.hasSecrets
      ? "❌ VULNERABLE"
      : build.hasProcessEnv
        ? "✅ SECURE"
        : "⚠️ MIXED";
    console.log(`   ${build.name.padEnd(10)}: ${security}`);
  });

  // Recommendations Matrix
  console.log("\n💡 Recommendations Matrix:");
  console.log("   ┌─────────────┬──────────┬──────────┬──────────┬──────────┐");
  console.log("   │ Environment │ Inline  │ PUBLIC_* │ Disabled │ Minified │");
  console.log("   ├─────────────┼──────────┼──────────┼──────────┼──────────┤");
  console.log("   │ Development │ ✅ BEST  │ ✅ GOOD  │ ❌ NO    │ ❌ NO    │");
  console.log("   │ Staging     │ ⚠️ RISKY │ ✅ BEST  │ ✅ GOOD  │ ✅ GOOD  │");
  console.log("   │ Production  │ ❌ NEVER │ ✅ BEST  │ ✅ GOOD  │ ✅ BEST  │");
  console.log("   │ CI/CD       │ ❌ NEVER │ ⚠️ RISKY │ ✅ BEST  │ ✅ GOOD  │");
  console.log("   └─────────────┴──────────┴──────────┴──────────┴──────────┘");

  // Security Best Practices
  console.log("\n🛡️ Security Best Practices:");
  console.log("   ✅ Use PUBLIC_* prefix for client-side variables");
  console.log("   ✅ Keep secrets (API keys, passwords) as runtime env vars");
  console.log("   ✅ Use different configs per environment");
  console.log("   ✅ Validate environment variables at startup");
  console.log("   ❌ Never inline secrets in production builds");
  console.log("   ❌ Don't use inline mode for production deployments");

  // Performance Optimization Tips
  console.log("\n� Performance Optimization Tips:");
  console.log(
    "   🗜️ Enable minification for production (~20-40% size reduction)"
  );
  console.log("   🗺️ Use external source maps for debugging");
  console.log("   � Consider code splitting for large applications");
  console.log("   ⚡ Use tree shaking to remove unused code");
  console.log(
    "   🎯 Target specific browsers/platforms for better optimization"
  );

  console.log("\n✅ Enhanced Build Comparison Complete!");
}

// Run enhanced comparison
compareBuilds().catch(console.error);
