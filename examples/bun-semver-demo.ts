#!/usr/bin/env bun
/**
 * Bun Semver API Demonstration
 * Shows how to use Bun's built-in semver functionality
 */

import { semver } from "bun";

function demonstrateSemver() {
  console.info("🏷️  Bun Semver API Demo");
  console.info("=" .repeat(40));

  // Basic order comparison
  console.info("\n📊 Basic Order Comparison:");
  console.info('semver.order("1.0.0", "1.0.0"):', semver.order("1.0.0", "1.0.0")); // 0 (equal)
  console.info('semver.order("1.0.0", "1.0.1"):', semver.order("1.0.0", "1.0.1")); // -1 (first < second)
  console.info('semver.order("1.0.1", "1.0.0"):', semver.order("1.0.1", "1.0.0")); // 1 (first > second)

  // Sorting versions
  console.info("\n🔄 Version Sorting:");
  const unsorted = ["1.0.0", "1.0.1", "1.0.0-alpha", "1.0.0-beta", "1.0.0-rc"];
  console.info("Before sort:", unsorted);
  
  const sorted = [...unsorted].sort(semver.order);
  console.info("After sort: ", sorted);
  
  // Pre-release versions are sorted correctly:
  // alpha < beta < rc < final release

  // Version satisfaction
  console.info("\n✅ Version Satisfaction:");
  console.info('semver.satisfies("1.0.0", "^1.0.0"):', semver.satisfies("1.0.0", "^1.0.0")); // true
  console.info('semver.satisfies("1.1.0", "^1.0.0"):', semver.satisfies("1.1.0", "^1.0.0")); // true
  console.info('semver.satisfies("2.0.0", "^1.0.0"):', semver.satisfies("2.0.0", "^1.0.0")); // false
  
  console.info('\n🎯 Range Examples:');
  console.info('semver.satisfies("1.0.0", "~1.0.0"):', semver.satisfies("1.0.0", "~1.0.0")); // true
  console.info('semver.satisfies("1.0.1", "~1.0.0"):', semver.satisfies("1.0.1", "~1.0.0")); // true
  console.info('semver.satisfies("1.1.0", "~1.0.0"):', semver.satisfies("1.1.0", "~1.0.0")); // false
  console.info('semver.satisfies("1.0.0", ">=1.0.0"):', semver.satisfies("1.0.0", ">=1.0.0")); // true
  console.info('semver.satisfies("0.9.0", ">=1.0.0"):', semver.satisfies("0.9.0", ">=1.0.0")); // false

  // Complex version scenarios
  console.info("\n🔬 Complex Scenarios:");
  const complexVersions = [
    "2.0.0-alpha.1",
    "2.0.0-alpha.2", 
    "2.0.0-beta.1",
    "2.0.0-rc.1",
    "2.0.0",
    "2.1.0",
    "3.0.0-alpha"
  ];
  
  console.info("Complex versions:", complexVersions);
  const sortedComplex = [...complexVersions].sort(semver.order);
  console.info("Sorted complex:", sortedComplex);

  // Practical usage examples
  console.info("\n💼 Practical Usage:");
  
  // Check if current Bun version satisfies requirements
  const currentBunVersion = Bun.version;
  const requiredRange = "^1.3.0";
  const isCompatible = semver.satisfies(currentBunVersion, requiredRange);
  
  console.info(`Current Bun version: ${currentBunVersion}`);
  console.info(`Required range: ${requiredRange}`);
  console.info(`Compatible: ${isCompatible}`);

  // Dependency version checking
  const dependencies = [
    { name: "react", version: "18.2.0", required: "^18.0.0" },
    { name: "typescript", version: "5.0.0", required: "~5.0.0" },
    { name: "eslint", version: "8.0.0", required: ">=8.0.0" }
  ];

  console.info("\n📦 Dependency Compatibility:");
  dependencies.forEach(dep => {
    const compatible = semver.satisfies(dep.version, dep.required);
    console.info(`${dep.name} ${dep.version} ${dep.required}: ${compatible ? '✅' : '❌'}`);
  });

  // Version filtering
  console.info("\n🔍 Version Filtering:");
  const availableVersions = [
    "1.0.0", "1.0.1", "1.1.0", "1.2.0", "2.0.0", "2.1.0"
  ];
  
  const stableVersions = availableVersions.filter(v => 
    semver.satisfies(v, "^1.0.0") && !v.includes('-')
  );
  
  console.info("All versions:", availableVersions);
  console.info("Stable v1.x:", stableVersions);

  return {
    currentVersion: currentBunVersion,
    isCompatible,
    sortedVersions: sorted,
    stableVersions
  };
}

// Run demonstration if executed directly
if (import.meta.main) {
  const result = demonstrateSemver();
  console.info("\n✅ Demo completed!");
  console.info("\n📚 Learn more: bun run docs:open semver --app");
}

export { demonstrateSemver };
