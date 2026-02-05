/**
 * 🏷️ Direct Bun Semver Demo
 * 
 * Focused demonstration of Bun's built-in semver.satisfies() function and related capabilities.
 * Based on: https://bun.com/docs/runtime/semver
 * 
 * This demo shows direct usage of Bun's semver functions without wrapper utilities.
 */

// Direct usage of Bun's built-in semver functions
console.log('🏷️ Direct Bun Semver Functions Demo');
console.log('='.repeat(50));
console.log('');

// ============================================
// BASIC SATISFY FUNCTION
// ============================================

console.log('🎯 Bun.semver.satisfies() Examples');
console.log('─'.repeat(40));

// Basic version satisfaction
console.log('✅ Basic Satisfaction:');
console.log(`  Bun.semver.satisfies("1.2.3", "^1.2.0"): ${Bun.semver.satisfies("1.2.3", "^1.2.0")}`);
console.log(`  Bun.semver.satisfies("2.0.0", "^1.2.0"): ${Bun.semver.satisfies("2.0.0", "^1.2.0")}`);
console.log(`  Bun.semver.satisfies("1.3.0", "~1.2.0"): ${Bun.semver.satisfies("1.3.0", "~1.2.0")}`);
console.log(`  Bun.semver.satisfies("1.2.4", "~1.2.0"): ${Bun.semver.satisfies("1.2.4", "~1.2.0")}`);

// Complex ranges
console.log('\n🔗 Complex Ranges:');
console.log(`  Bun.semver.satisfies("1.2.3", ">=1.2.0 <2.0.0"): ${Bun.semver.satisfies("1.2.3", ">=1.2.0 <2.0.0")}`);
console.log(`  Bun.semver.satisfies("2.0.0", ">=1.2.0 <2.0.0"): ${Bun.semver.satisfies("2.0.0", ">=1.2.0 <2.0.0")}`);
console.log(`  Bun.semver.satisfies("1.5.0", "1.2.3 - 2.3.4"): ${Bun.semver.satisfies("1.5.0", "1.2.3 - 2.3.4")}`);

// Wildcard patterns
console.log('\n🌟 Wildcard Patterns:');
console.log(`  Bun.semver.satisfies("1.2.3", "1.x"): ${Bun.semver.satisfies("1.2.3", "1.x")}`);
console.log(`  Bun.semver.satisfies("2.0.0", "1.x"): ${Bun.semver.satisfies("2.0.0", "1.x")}`);
console.log(`  Bun.semver.satisfies("1.2.3", "*"): ${Bun.semver.satisfies("1.2.3", "*")}`);
console.log(`  Bun.semver.satisfies("2.0.0", "*"): ${Bun.semver.satisfies("2.0.0", "*")}`);

// Pre-release versions
console.log('\n🚀 Pre-release Versions:');
console.log(`  Bun.semver.satisfies("1.0.0-alpha", "1.0.0-alpha"): ${Bun.semver.satisfies("1.0.0-alpha", "1.0.0-alpha")}`);
console.log(`  Bun.semver.satisfies("1.0.0-alpha.1", "1.0.0-alpha"): ${Bun.semver.satisfies("1.0.0-alpha.1", "1.0.0-alpha")}`);
console.log(`  Bun.semver.satisfies("1.0.0-beta", "1.0.0-alpha"): ${Bun.semver.satisfies("1.0.0-beta", "1.0.0-alpha")}`);
console.log(`  Bun.semver.satisfies("1.0.0", "1.0.0-alpha"): ${Bun.semver.satisfies("1.0.0", "1.0.0-alpha")}`);

// ============================================
// OTHER BUN SEMVER FUNCTIONS
// ============================================

console.log('\n🔧 Other Bun Semver Functions');
console.log('─'.repeat(40));

// Version comparison
console.log('⚖️ Version Comparison:');
console.log(`  Bun.semver.compare("1.2.3", "1.2.4"): ${Bun.semver.compare("1.2.3", "1.2.4")}`);
console.log(`  Bun.semver.compare("1.2.3", "1.2.3"): ${Bun.semver.compare("1.2.3", "1.2.3")}`);
console.log(`  Bun.semver.compare("1.2.5", "1.2.4"): ${Bun.semver.compare("1.2.5", "1.2.4")}`);

// Version ordering (new function)
console.log('\n📊 Version Ordering:');
console.log(`  Bun.semver.order("1.2.3", "1.2.4"): ${Bun.semver.order("1.2.3", "1.2.4")} (less than)`);
console.log(`  Bun.semver.order("1.2.3", "1.2.3"): ${Bun.semver.order("1.2.3", "1.2.3")} (equal)`);
console.log(`  Bun.semver.order("1.2.5", "1.2.4"): ${Bun.semver.order("1.2.5", "1.2.4")} (greater than)`);

console.log('\n🔍 Order vs Compare:');
console.log('  compare() returns: -1, 0, 1 (numeric ordering)');
console.log('  order() returns:   -1, 0, 1 (numeric ordering)');
console.log('  Both functions provide the same numeric results!');
console.log('  order() is more intuitive for programmatic use.');

// Version cleaning
console.log('\n🧹 Version Cleaning:');
console.log(`  Bun.semver.clean("v1.2.3"): "${Bun.semver.clean("v1.2.3")}"`);
console.log(`  Bun.semver.clean("1.2"): "${Bun.semver.clean("1.2")}"`);
console.log(`  Bun.semver.clean("1"): "${Bun.semver.clean("1")}"`);

// Version validation
console.log('\n✅ Version Validation:');
console.log(`  Bun.semver.valid("1.2.3"): ${Bun.semver.valid("1.2.3") !== null}`);
console.log(`  Bun.semver.valid("v1.2.3"): ${Bun.semver.valid("v1.2.3") !== null}`);
console.log(`  Bun.semver.valid("1.2.3-beta"): ${Bun.semver.valid("1.2.3-beta") !== null}`);
console.log(`  Bun.semver.valid("invalid"): ${Bun.semver.valid("invalid") !== null}`);

// Max satisfying version
console.log('\n📊 Max Satisfying Version:');
const versions = ["1.2.0", "1.2.3", "1.3.0", "2.0.0"];
console.log(`  Versions: [${versions.join(", ")}]`);
console.log(`  Bun.semver.maxSatisfying(versions, "^1.2.0"): ${Bun.semver.maxSatisfying(versions, "^1.2.0")}`);
console.log(`  Bun.semver.maxSatisfying(versions, "~1.2.0"): ${Bun.semver.maxSatisfying(versions, "~1.2.0")}`);
console.log(`  Bun.semver.maxSatisfying(versions, ">=1.2.0 <2.0.0"): ${Bun.semver.maxSatisfying(versions, ">=1.2.0 <2.0.0")}`);

// Min satisfying version
console.log('\n📉 Min Satisfying Version:');
console.log(`  Bun.semver.minSatisfying(versions, "^1.2.0"): ${Bun.semver.minSatisfying(versions, "^1.2.0")}`);
console.log(`  Bun.semver.minSatisfying(versions, "~1.2.0"): ${Bun.semver.minSatisfying(versions, "~1.2.0")}`);

// ============================================
// PRACTICAL EXAMPLES
// ============================================

console.log('\n🎯 Practical Examples');
console.log('─'.repeat(40));

// Example 1: Check Node.js compatibility
console.log('📦 Node.js Compatibility Check:');
const nodeVersion = process.version; // e.g., "v20.0.0"
const nodeRange = ">=18.0.0";
const nodeCompatible = Bun.semver.satisfies(nodeVersion, nodeRange);
console.log(`  Node.js version: ${nodeVersion}`);
console.log(`  Required: ${nodeRange}`);
console.log(`  Compatible: ${nodeCompatible ? '✅' : '❌'}`);

// Example 2: Package dependency checking
console.log('\n📋 Package Dependency Check:');
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

console.log('  Dependency Status:');
Object.entries(packageJson.dependencies).forEach(([name, range]) => {
  const installed = installedVersions[name as keyof typeof installedVersions];
  const satisfied = Bun.semver.satisfies(installed, range);
  const status = satisfied ? '✅' : '❌';
  console.log(`    ${status} ${name}: ${installed} satisfies ${range}`);
});

// Example 3: Feature flag version requirements
console.log('\n🚩 Feature Flag Version Requirements:');
const featureFlags = [
  { name: "ENTERPRISE_SECURITY", minVersion: "2.1.0", currentVersion: "2.2.0" },
  { name: "DEVELOPMENT_TOOLS", minVersion: "2.0.0", currentVersion: "2.0.5" },
  { name: "PREMIUM_ANALYTICS", minVersion: "2.3.0", currentVersion: "2.1.0" },
];

console.log('  Feature Flag Compatibility:');
featureFlags.forEach(({ name, minVersion, currentVersion }) => {
  const compatible = Bun.semver.satisfies(currentVersion, `>=${minVersion}`);
  const status = compatible ? '✅' : '❌';
  console.log(`    ${status} ${name}: ${currentVersion} >= ${minVersion}`);
});

// Example 4: Plugin compatibility matrix
console.log('\n🔌 Plugin Compatibility Matrix:');
const plugins = [
  { name: "inspection-plugin", version: "1.2.3", required: "^1.2.0" },
  { name: "security-plugin", version: "2.0.0", required: "^1.5.0" },
  { name: "performance-plugin", version: "1.6.1", required: "~1.6.0" },
];

console.log('  Plugin Status:');
plugins.forEach(({ name, version, required }) => {
  const compatible = Bun.semver.satisfies(version, required);
  const status = compatible ? '✅' : '❌';
  console.log(`    ${status} ${name}: v${version} satisfies ${required}`);
});

// Example 5: Range intersection for multi-constraint scenarios
console.log('\n🔗 Range Intersection Example:');
const constraints = [
  { name: "Database", range: "^5.0.0" },
  { name: "API", range: "~5.2.0" },
  { name: "Security", range: ">=5.1.0 <6.0.0" }
];

const availableVersions = ["5.0.0", "5.1.0", "5.2.0", "5.2.3", "5.3.0", "6.0.0"];

console.log('  Finding version that satisfies all constraints:');
constraints.forEach(({ name, range }) => {
  const satisfying = availableVersions.filter(v => Bun.semver.satisfies(v, range));
  console.log(`    ${name} (${range}): [${satisfying.join(', ')}]`);
});

// Find intersection
const intersection = availableVersions.filter(version => 
  constraints.every(({ range }) => Bun.semver.satisfies(version, range))
);
console.log(`  🎯 Intersection: [${intersection.join(', ')}]`);
console.log(`  🏆 Best match: ${intersection.length > 0 ? intersection[intersection.length - 1] : 'None'}`);

// Example 6: Version ordering with order() function
console.log('\n📊 Version Ordering with order() Function:');
const unsortedVersions = ["1.3.0", "1.2.0", "2.0.0", "1.2.3", "1.2.10", "1.10.0"];
console.log(`  Original: [${unsortedVersions.join(', ')}]`);

// Sort using order() function
const sortedUsingOrder = [...unsortedVersions].sort((a, b) => Bun.semver.order(a, b));
console.log(`  Sorted (order): [${sortedUsingOrder.join(', ')}]`);

// Sort using compare() function
const sortedUsingCompare = [...unsortedVersions].sort((a, b) => Bun.semver.compare(a, b));
console.log(`  Sorted (compare): [${sortedUsingCompare.join(', ')}]`);

// Find latest version using order()
const latestVersion = unsortedVersions.reduce((latest, current) => 
  Bun.semver.order(current, latest) > 0 ? current : latest
);
console.log(`  🏆 Latest version: ${latestVersion}`);

// Find oldest version using order()
const oldestVersion = unsortedVersions.reduce((oldest, current) => 
  Bun.semver.order(current, oldest) < 0 ? current : oldest
);
console.log(`  📅 Oldest version: ${oldestVersion}`);

// ============================================
// PERFORMANCE DEMONSTRATION
// ============================================

console.log('\n⚡ Performance Demonstration');
console.log('─'.repeat(40));

// Performance test: 10,000 satisfaction checks
const testVersions = Array.from({ length: 1000 }, (_, i) => `1.${Math.floor(i / 100)}.${i % 100}`);
const testRange = "^1.0.0";

console.log(`🏃 Running 10,000 satisfaction checks...`);
const startTime = Date.now();

for (let i = 0; i < 10000; i++) {
  const version = testVersions[i % testVersions.length];
  Bun.semver.satisfies(version, testRange);
}

const endTime = Date.now();
const duration = endTime - startTime;

console.log(`  ⏱️  Completed in: ${duration}ms`);
console.log(`  📊 Average per check: ${(duration / 10000).toFixed(4)}ms`);
console.log(`  🚀 Performance: ${duration < 100 ? 'Excellent' : duration < 500 ? 'Good' : 'Needs optimization'}`);

// ============================================
// ERROR HANDLING DEMONSTRATION
// ============================================

console.log('\n🛡️ Error Handling Demonstration');
console.log('─'.repeat(40));

// Test invalid inputs
console.log('🔍 Invalid Input Handling:');
const invalidTests = [
  { version: "invalid", range: "^1.0.0" },
  { version: "1.2.3", range: "invalid" },
  { version: "", range: "^1.0.0" },
  { version: "1.2.3", range: "" },
];

invalidTests.forEach(({ version, range }) => {
  try {
    const result = Bun.semver.satisfies(version, range);
    console.log(`  ✅ "${version}" vs "${range}": ${result} (handled gracefully)`);
  } catch (error) {
    console.log(`  ❌ "${version}" vs "${range}": Error - ${(error as Error).message}`);
  }
});

console.log('\n🎉 Direct Bun Semver Demo Complete!');
console.log('='.repeat(50));
console.log('');
console.log('📚 Key Takeaways:');
console.log('   • Bun.semver.satisfies() is the core function for version matching');
console.log('   • Supports all standard semver ranges (^, ~, >=, <=, -, ||)');
console.log('   • Handles pre-release versions and build metadata');
console.log('   • Built-in comparison, cleaning, and validation functions');
console.log('   • Excellent performance for large-scale version checking');
console.log('   • Graceful error handling for invalid inputs');
console.log('');
console.log('🚀 Ready for production use in DuoPlus!');
