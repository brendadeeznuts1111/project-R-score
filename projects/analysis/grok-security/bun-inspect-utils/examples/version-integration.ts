// [1.0.0.0] Version Integration Examples - Bun Native
// Shows how to integrate versioning into your application

import {
  VersionManager,
  VersionParser,
  VersionComparator,
  BuildVersionGenerator,
} from "../src/version";

/**
 * [1.1.0.0] Example 1: Display version information
 */
function example1_DisplayVersion(): void {
  console.log("📦 Example 1: Display Version Information\n");

  const version = VersionManager.getFullVersion();
  const versionObj = VersionParser.parse(version);

  console.log(`Current Version: ${version}`);
  console.log(`Major: ${versionObj.major}`);
  console.log(`Minor: ${versionObj.minor}`);
  console.log(`Patch: ${versionObj.patch}`);
  console.log(`Build Metadata: ${versionObj.buildMetadata}\n`);
}

/**
 * [1.2.0.0] Example 2: Version checking
 */
function example2_VersionChecking(): void {
  console.log("📦 Example 2: Version Checking\n");

  const currentVersion = VersionManager.getVersionObject();
  const minRequiredVersion = VersionParser.parse("1.0.0");

  if (VersionComparator.isGreater(currentVersion, minRequiredVersion)) {
    console.log("✅ Current version meets minimum requirements");
  } else {
    console.log("❌ Current version is below minimum requirements");
  }
  console.log("");
}

/**
 * [1.3.0.0] Example 3: Version-based feature flags
 */
function example3_FeatureFlags(): void {
  console.log("📦 Example 3: Version-Based Feature Flags\n");

  const currentVersion = VersionManager.getVersionObject();

  // Feature available in 2.0.0+
  if (currentVersion.major >= 2) {
    console.log("✅ Advanced features enabled (v2.0.0+)");
  } else {
    console.log("⚠️  Advanced features disabled (requires v2.0.0+)");
  }

  // Feature available in 1.5.0+
  if (
    currentVersion.major > 1 ||
    (currentVersion.major === 1 && currentVersion.minor >= 5)
  ) {
    console.log("✅ Enhanced features enabled (v1.5.0+)");
  } else {
    console.log("⚠️  Enhanced features disabled (requires v1.5.0+)");
  }
  console.log("");
}

/**
 * [1.4.0.0] Example 4: Generate version constant for build
 */
function example4_GenerateConstant(): void {
  console.log("📦 Example 4: Generate Version Constant\n");

  const constant = BuildVersionGenerator.generateConstant();
  console.log("Generated version.ts:");
  console.log("---");
  console.log(constant);
  console.log("---\n");
}

/**
 * [1.5.0.0] Example 5: Version comparison utility
 */
function example5_VersionComparison(): void {
  console.log("📦 Example 5: Version Comparison\n");

  const versions = ["1.0.0", "1.5.0", "2.0.0", "1.0.1"];
  const parsed = versions.map((v) => VersionParser.parse(v));

  // Sort versions
  const sorted = parsed.sort((a, b) => VersionComparator.compare(a, b));

  console.log("Sorted versions (ascending):");
  sorted.forEach((v) => {
    console.log(`  ${VersionParser.format(v)}`);
  });
  console.log("");
}

/**
 * [1.6.0.0] Example 6: Version metadata in logs
 */
function example6_VersionMetadata(): void {
  console.log("📦 Example 6: Version Metadata in Logs\n");

  const version = VersionManager.getFullVersion();
  const timestamp = new Date().toISOString();

  const logEntry = {
    timestamp,
    version,
    message: "Application started",
    environment: process.env.NODE_ENV || "development",
  };

  console.log("Log entry with version:");
  console.log(JSON.stringify(logEntry, null, 2));
  console.log("");
}

/**
 * [1.7.0.0] Example 7: Version-aware API responses
 */
function example7_APIResponse(): void {
  console.log("📦 Example 7: Version-Aware API Response\n");

  const version = VersionManager.getFullVersion();
  const versionObj = VersionParser.parse(version);

  const apiResponse = {
    status: "success",
    data: {
      message: "Hello from API",
      items: [1, 2, 3],
    },
    meta: {
      version,
      apiVersion: `v${versionObj.major}`,
      timestamp: new Date().toISOString(),
    },
  };

  console.log("API response with version:");
  console.log(JSON.stringify(apiResponse, null, 2));
  console.log("");
}

/**
 * [1.8.0.0] Example 8: Version-based caching
 */
function example8_VersionCaching(): void {
  console.log("📦 Example 8: Version-Based Caching\n");

  const version = VersionManager.getFullVersion();
  const cacheKey = `cache-${version}`;

  console.log(`Cache key: ${cacheKey}`);
  console.log("This ensures cache is invalidated on version changes\n");
}

/**
 * [1.9.0.0] Main runner
 */
async function main(): Promise<void> {
  console.log("🚀 Version Integration Examples\n");
  console.log("================================\n");

  example1_DisplayVersion();
  example2_VersionChecking();
  example3_FeatureFlags();
  example4_GenerateConstant();
  example5_VersionComparison();
  example6_VersionMetadata();
  example7_APIResponse();
  example8_VersionCaching();

  console.log("✅ All examples completed!");
}

main().catch(console.error);

