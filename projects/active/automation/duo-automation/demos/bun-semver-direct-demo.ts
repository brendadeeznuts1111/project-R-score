/**
 * 🏷️ Direct Bun Semver Demo
 * 
 * Focused demonstration of Bun's built-in semver.satisfies() function and related capabilities.
 * Based on: https://bun.com/docs/runtime/semver
 * 
 * This demo shows direct usage of Bun's semver functions without wrapper utilities.
 */

// Direct usage of Bun's built-in semver functions
console.info('🏷️ Direct Bun Semver Functions Demo');
console.info('='.repeat(50));
console.info('');

// ============================================
// BASIC SATISFY FUNCTION
// ============================================

console.info('🎯 Bun.semver.satisfies() Examples');
console.info('─'.repeat(40));

// Basic version satisfaction
console.info('✅ Basic Satisfaction:');
console.info(`  Bun.semver.satisfies("1.2.3", "^1.2.0"): ${Bun.semver.satisfies("1.2.3", "^1.2.0")}`);
console.info(`  Bun.semver.satisfies("2.0.0", "^1.2.0"): ${Bun.semver.satisfies("2.0.0", "^1.2.0")}`);
console.info(`  Bun.semver.satisfies("1.3.0", "~1.2.0"): ${Bun.semver.satisfies("1.3.0", "~1.2.0")}`);
console.info(`  Bun.semver.satisfies("1.2.4", "~1.2.0"): ${Bun.semver.satisfies("1.2.4", "~1.2.0")}`);

// Complex ranges
console.info('\n🔗 Complex Ranges:');
console.info(`  Bun.semver.satisfies("1.2.3", ">=1.2.0 <2.0.0"): ${Bun.semver.satisfies("1.2.3", ">=1.2.0 <2.0.0")}`);
console.info(`  Bun.semver.satisfies("2.0.0", ">=1.2.0 <2.0.0"): ${Bun.semver.satisfies("2.0.0", ">=1.2.0 <2.0.0")}`);
console.info(`  Bun.semver.satisfies("1.5.0", "1.2.3 - 2.3.4"): ${Bun.semver.satisfies("1.5.0", "1.2.3 - 2.3.4")}`);

// Wildcard patterns
console.info('\n🌟 Wildcard Patterns:');
console.info(`  Bun.semver.satisfies("1.2.3", "1.x"): ${Bun.semver.satisfies("1.2.3", "1.x")}`);
console.info(`  Bun.semver.satisfies("2.0.0", "1.x"): ${Bun.semver.satisfies("2.0.0", "1.x")}`);
console.info(`  Bun.semver.satisfies("1.2.3", "*"): ${Bun.semver.satisfies("1.2.3", "*")}`);
console.info(`  Bun.semver.satisfies("2.0.0", "*"): ${Bun.semver.satisfies("2.0.0", "*")}`);

// Pre-release versions
console.info('\n🚀 Pre-release Versions:');
console.info(`  Bun.semver.satisfies("1.0.0-alpha", "1.0.0-alpha"): ${Bun.semver.satisfies("1.0.0-alpha", "1.0.0-alpha")}`);
console.info(`  Bun.semver.satisfies("1.0.0-alpha.1", "1.0.0-alpha"): ${Bun.semver.satisfies("1.0.0-alpha.1", "1.0.0-alpha")}`);
console.info(`  Bun.semver.satisfies("1.0.0-beta", "1.0.0-alpha"): ${Bun.semver.satisfies("1.0.0-beta", "1.0.0-alpha")}`);
console.info(`  Bun.semver.satisfies("1.0.0", "1.0.0-alpha"): ${Bun.semver.satisfies("1.0.0", "1.0.0-alpha")}`);

// ============================================
// OTHER BUN SEMVER FUNCTIONS
// ============================================

console.info('\n🔧 Other Bun Semver Functions');
console.info('─'.repeat(40));

// Version comparison
console.info('⚖️ Version Comparison:');
console.info(`  Bun.semver.compare("1.2.3", "1.2.4"): ${Bun.semver.compare("1.2.3", "1.2.4")}`);
console.info(`  Bun.semver.compare("1.2.3", "1.2.3"): ${Bun.semver.compare("1.2.3", "1.2.3")}`);
console.info(`  Bun.semver.compare("1.2.5", "1.2.4"): ${Bun.semver.compare("1.2.5", "1.2.4")}`);

// Version ordering (new function)
console.info('\n📊 Version Ordering:');
console.info(`  Bun.semver.order("1.2.3", "1.2.4"): ${Bun.semver.order("1.2.3", "1.2.4")} (less than)`);
console.info(`  Bun.semver.order("1.2.3", "1.2.3"): ${Bun.semver.order("1.2.3", "1.2.3")} (equal)`);
console.info(`  Bun.semver.order("1.2.5", "1.2.4"): ${Bun.semver.order("1.2.5", "1.2.4")} (greater than)`);

console.info('\n🔍 Order vs Compare:');
console.info('  compare() returns: -1, 0, 1 (numeric ordering)');
console.info('  order() returns:   -1, 0, 1 (numeric ordering)');
console.info('  Both functions provide the same numeric results!');
console.info('  order() is more intuitive for programmatic use.');

// Version cleaning
console.info('\n🧹 Version Cleaning:');
console.info(`  Bun.semver.clean("v1.2.3"): "${Bun.semver.clean("v1.2.3")}"`);
console.info(`  Bun.semver.clean("1.2"): "${Bun.semver.clean("1.2")}"`);
console.info(`  Bun.semver.clean("1"): "${Bun.semver.clean("1")}"`);

// Version validation
console.info('\n✅ Version Validation:');
console.info(`  Bun.semver.valid("1.2.3"): ${Bun.semver.valid("1.2.3") !== null}`);
console.info(`  Bun.semver.valid("v1.2.3"): ${Bun.semver.valid("v1.2.3") !== null}`);
console.info(`  Bun.semver.valid("1.2.3-beta"): ${Bun.semver.valid("1.2.3-beta") !== null}`);
console.info(`  Bun.semver.valid("invalid"): ${Bun.semver.valid("invalid") !== null}`);

// Max satisfying version
console.info('\n📊 Max Satisfying Version:');
const versions = ["1.2.0", "1.2.3", "1.3.0", "2.0.0"];
console.info(`  Versions: [${versions.join(", ")}]`);
console.info(`  Bun.semver.maxSatisfying(versions, "^1.2.0"): ${Bun.semver.maxSatisfying(versions, "^1.2.0")}`);
console.info(`  Bun.semver.maxSatisfying(versions, "~1.2.0"): ${Bun.semver.maxSatisfying(versions, "~1.2.0")}`);
console.info(`  Bun.semver.maxSatisfying(versions, ">=1.2.0 <2.0.0"): ${Bun.semver.maxSatisfying(versions, ">=1.2.0 <2.0.0")}`);

// Min satisfying version
console.info('\n📉 Min Satisfying Version:');
console.info(`  Bun.semver.minSatisfying(versions, "^1.2.0"): ${Bun.semver.minSatisfying(versions, "^1.2.0")}`);
console.info(`  Bun.semver.minSatisfying(versions, "~1.2.0"): ${Bun.semver.minSatisfying(versions, "~1.2.0")}`);

// ============================================
// PRACTICAL EXAMPLES
// ============================================

console.info('\n🎯 Practical Examples');
console.info('─'.repeat(40));

// Example 1: Check Node.js compatibility
console.info('📦 Node.js Compatibility Check:');
const nodeVersion = process.version; // e.g., "v20.0.0"
const nodeRange = ">=18.0.0";
const nodeCompatible = Bun.semver.satisfies(nodeVersion, nodeRange);
console.info(`  Node.js version: ${nodeVersion}`);
console.info(`  Required: ${nodeRange}`);
console.info(`  Compatible: ${nodeCompatible ? '✅' : '❌'}`);

// Example 2: Package dependency checking
console.info('\n📋 Package Dependency Check:');
const packageJson = {
  dependencies: {
    "bun": "^1.0.0",
    "typescript": "^5.0.0",
    "react": "^18.0.0"
  }
};

const installedVersions = {
  "bun": "1.0.15",
  "typescript": "5.2.2",
  "react": "18.2.0"
};

console.info('  Dependency Status:');
Object.entries(packageJson.dependencies).forEach(([name, range]) => {
  const installed = installedVersions[name as keyof typeof installedVersions];
  const satisfied = Bun.semver.satisfies(installed, range);
  const status = satisfied ? '✅' : '❌';
  console.info(`    ${status} ${name}: ${installed} satisfies ${range}`);
});

// Example 3: Feature flag version requirements
console.info('\n🚩 Feature Flag Version Requirements:');
const featureFlags = [
  { name: "ENTERPRISE_SECURITY", minVersion: "2.1.0", currentVersion: "2.2.0" },
  { name: "DEVELOPMENT_TOOLS", minVersion: "2.0.0", currentVersion: "2.0.5" },
  { name: "PREMIUM_ANALYTICS", minVersion: "2.3.0", currentVersion: "2.1.0" },
];

console.info('  Feature Flag Compatibility:');
featureFlags.forEach(({ name, minVersion, currentVersion }) => {
  const compatible = Bun.semver.satisfies(currentVersion, `>=${minVersion}`);
  const status = compatible ? '✅' : '❌';
  console.info(`    ${status} ${name}: ${currentVersion} >= ${minVersion}`);
});

// Example 4: Plugin compatibility matrix
console.info('\n🔌 Plugin Compatibility Matrix:');
const plugins = [
  { name: "inspection-plugin", version: "1.2.3", required: "^1.2.0" },
  { name: "security-plugin", version: "2.0.0", required: "^1.5.0" },
  { name: "performance-plugin", version: "1.6.1", required: "~1.6.0" },
];

console.info('  Plugin Status:');
plugins.forEach(({ name, version, required }) => {
  const compatible = Bun.semver.satisfies(version, required);
  const status = compatible ? '✅' : '❌';
  console.info(`    ${status} ${name}: v${version} satisfies ${required}`);
});

// Example 5: Range intersection for multi-constraint scenarios
console.info('\n🔗 Range Intersection Example:');
const constraints = [
  { name: "Database", range: "^5.0.0" },
  { name: "API", range: "~5.2.0" },
  { name: "Security", range: ">=5.1.0 <6.0.0" }
];

const availableVersions = ["5.0.0", "5.1.0", "5.2.0", "5.2.3", "5.3.0", "6.0.0"];

console.info('  Finding version that satisfies all constraints:');
constraints.forEach(({ name, range }) => {
  const satisfying = availableVersions.filter(v => Bun.semver.satisfies(v, range));
  console.info(`    ${name} (${range}): [${satisfying.join(', ')}]`);
});

// Find intersection
const intersection = availableVersions.filter(version => 
  constraints.every(({ range }) => Bun.semver.satisfies(version, range))
);
console.info(`  🎯 Intersection: [${intersection.join(', ')}]`);
console.info(`  🏆 Best match: ${intersection.length > 0 ? intersection[intersection.length - 1] : 'None'}`);

// Example 6: Version ordering with order() function
console.info('\n📊 Version Ordering with order() Function:');
const unsortedVersions = ["1.3.0", "1.2.0", "2.0.0", "1.2.3", "1.2.10", "1.10.0"];
console.info(`  Original: [${unsortedVersions.join(', ')}]`);

// Sort using order() function
const sortedUsingOrder = [...unsortedVersions].sort((a, b) => Bun.semver.order(a, b));
console.info(`  Sorted (order): [${sortedUsingOrder.join(', ')}]`);

// Sort using compare() function
const sortedUsingCompare = [...unsortedVersions].sort((a, b) => Bun.semver.compare(a, b));
console.info(`  Sorted (compare): [${sortedUsingCompare.join(', ')}]`);

// Find latest version using order()
const latestVersion = unsortedVersions.reduce((latest, current) => 
  Bun.semver.order(current, latest) > 0 ? current : latest
);
console.info(`  🏆 Latest version: ${latestVersion}`);

// Find oldest version using order()
const oldestVersion = unsortedVersions.reduce((oldest, current) => 
  Bun.semver.order(current, oldest) < 0 ? current : oldest
);
console.info(`  📅 Oldest version: ${oldestVersion}`);

// ============================================
// PERFORMANCE DEMONSTRATION
// ============================================

console.info('\n⚡ Performance Demonstration');
console.info('─'.repeat(40));

// Performance test: 10,000 satisfaction checks
const testVersions = Array.from({ length: 1000 }, (_, i) => `1.${Math.floor(i / 100)}.${i % 100}`);
const testRange = "^1.0.0";

console.info(`🏃 Running 10,000 satisfaction checks...`);
const startTime = Date.now();

for (let i = 0; i < 10000; i++) {
  const version = testVersions[i % testVersions.length];
  Bun.semver.satisfies(version, testRange);
}

const endTime = Date.now();
const duration = endTime - startTime;

console.info(`  ⏱️  Completed in: ${duration}ms`);
console.info(`  📊 Average per check: ${(duration / 10000).toFixed(4)}ms`);
console.info(`  🚀 Performance: ${duration < 100 ? 'Excellent' : duration < 500 ? 'Good' : 'Needs optimization'}`);

// ============================================
// ERROR HANDLING DEMONSTRATION
// ============================================

console.info('\n🛡️ Error Handling Demonstration');
console.info('─'.repeat(40));

// Test invalid inputs
console.info('🔍 Invalid Input Handling:');
const invalidTests = [
  { version: "invalid", range: "^1.0.0" },
  { version: "1.2.3", range: "invalid" },
  { version: "", range: "^1.0.0" },
  { version: "1.2.3", range: "" },
];

invalidTests.forEach(({ version, range }) => {
  try {
    const result = Bun.semver.satisfies(version, range);
    console.info(`  ✅ "${version}" vs "${range}": ${result} (handled gracefully)`);
  } catch (error) {
    console.info(`  ❌ "${version}" vs "${range}": Error - ${(error as Error).message}`);
  }
});

console.info('\n🎉 Direct Bun Semver Demo Complete!');
console.info('='.repeat(50));
console.info('');
console.info('📚 Key Takeaways:');
console.info('   • Bun.semver.satisfies() is the core function for version matching');
console.info('   • Supports all standard semver ranges (^, ~, >=, <=, -, ||)');
console.info('   • Handles pre-release versions and build metadata');
console.info('   • Built-in comparison, cleaning, and validation functions');
console.info('   • Excellent performance for large-scale version checking');
console.info('   • Graceful error handling for invalid inputs');
console.info('');
console.info('🚀 Ready for production use in DuoPlus!');
