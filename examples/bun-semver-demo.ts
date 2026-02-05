#!/usr/bin/env bun
/**
 * Bun Semver API Demonstration
 * Shows how to use Bun's built-in semver functionality
 */

import { semver } from "bun";

function demonstrateSemver() {
  console.log("🏷️  Bun Semver API Demo");
  console.log("=" .repeat(40));

  // Basic order comparison
  console.log("\n📊 Basic Order Comparison:");
  console.log('semver.order("1.0.0", "1.0.0"):', semver.order("1.0.0", "1.0.0")); // 0 (equal)
  console.log('semver.order("1.0.0", "1.0.1"):', semver.order("1.0.0", "1.0.1")); // -1 (first < second)
  console.log('semver.order("1.0.1", "1.0.0"):', semver.order("1.0.1", "1.0.0")); // 1 (first > second)

  // Sorting versions
  console.log("\n🔄 Version Sorting:");
  const unsorted = ["1.0.0", "1.0.1", "1.0.0-alpha", "1.0.0-beta", "1.0.0-rc"];
  console.log("Before sort:", unsorted);
  
  const sorted = [...unsorted].sort(semver.order);
  console.log("After sort: ", sorted);
  
  // Pre-release versions are sorted correctly:
  // alpha < beta < rc < final release

  // Version satisfaction
  console.log("\n✅ Version Satisfaction:");
  console.log('semver.satisfies("1.0.0", "^1.0.0"):', semver.satisfies("1.0.0", "^1.0.0")); // true
  console.log('semver.satisfies("1.1.0", "^1.0.0"):', semver.satisfies("1.1.0", "^1.0.0")); // true
  console.log('semver.satisfies("2.0.0", "^1.0.0"):', semver.satisfies("2.0.0", "^1.0.0")); // false
  
  console.log('\n🎯 Range Examples:');
  console.log('semver.satisfies("1.0.0", "~1.0.0"):', semver.satisfies("1.0.0", "~1.0.0")); // true
  console.log('semver.satisfies("1.0.1", "~1.0.0"):', semver.satisfies("1.0.1", "~1.0.0")); // true
  console.log('semver.satisfies("1.1.0", "~1.0.0"):', semver.satisfies("1.1.0", "~1.0.0")); // false
  console.log('semver.satisfies("1.0.0", ">=1.0.0"):', semver.satisfies("1.0.0", ">=1.0.0")); // true
  console.log('semver.satisfies("0.9.0", ">=1.0.0"):', semver.satisfies("0.9.0", ">=1.0.0")); // false

  // Complex version scenarios
  console.log("\n🔬 Complex Scenarios:");
  const complexVersions = [
    "2.0.0-alpha.1",
    "2.0.0-alpha.2", 
    "2.0.0-beta.1",
    "2.0.0-rc.1",
    "2.0.0",
    "2.1.0",
    "3.0.0-alpha"
  ];
  
  console.log("Complex versions:", complexVersions);
  const sortedComplex = [...complexVersions].sort(semver.order);
  console.log("Sorted complex:", sortedComplex);

  // Practical usage examples
  console.log("\n💼 Practical Usage:");
  
  // Check if current Bun version satisfies requirements
  const currentBunVersion = Bun.version;
  const requiredRange = "^1.3.0";
  const isCompatible = semver.satisfies(currentBunVersion, requiredRange);
  
  console.log(`Current Bun version: ${currentBunVersion}`);
  console.log(`Required range: ${requiredRange}`);
  console.log(`Compatible: ${isCompatible}`);

  // Dependency version checking
  const dependencies = [
    { name: "react", version: "18.2.0", required: "^18.0.0" },
    { name: "typescript", version: "5.0.0", required: "~5.0.0" },
    { name: "eslint", version: "8.0.0", required: ">=8.0.0" }
  ];

  console.log("\n📦 Dependency Compatibility:");
  dependencies.forEach(dep => {
    const compatible = semver.satisfies(dep.version, dep.required);
    console.log(`${dep.name} ${dep.version} ${dep.required}: ${compatible ? '✅' : '❌'}`);
  });

  // Version filtering
  console.log("\n🔍 Version Filtering:");
  const availableVersions = [
    "1.0.0", "1.0.1", "1.1.0", "1.2.0", "2.0.0", "2.1.0"
  ];
  
  const stableVersions = availableVersions.filter(v => 
    semver.satisfies(v, "^1.0.0") && !v.includes('-')
  );
  
  console.log("All versions:", availableVersions);
  console.log("Stable v1.x:", stableVersions);

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
  console.log("\n✅ Demo completed!");
  console.log("\n📚 Learn more: bun run docs:open semver --app");
}

export { demonstrateSemver };
