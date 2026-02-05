#!/usr/bin/env bun
/**
 * Fantasy42-Fire22 Workspace Scripts Demo
 * Demonstrating Bun's workspace script execution capabilities
 */

import { $ } from 'bun';

console.log('🚀 Fantasy42-Fire22 Workspace Scripts Demo');
console.log('='.repeat(60));

console.log('\n📦 Available Workspace Packages:');
const packages = [
  '@fire22-registry/core-security',
  '@fire22-registry/analytics-dashboard',
  '@fire22-registry/compliance-core',
];

packages.forEach(pkg => console.log(`   📦 ${pkg}`));

console.log('\n🔧 Workspace Script Execution Examples:');
console.log('-'.repeat(50));

// ============================================================================
// EXAMPLE 1: Run script in all packages
// ============================================================================
console.log('\n1️⃣  Run script in ALL workspace packages:');
console.log("   Command: bun run --filter '*' <script>");
console.log("   Example: bun run --filter '*' link");

// ============================================================================
// EXAMPLE 2: Run script in specific package
// ============================================================================
console.log('\n2️⃣  Run script in SPECIFIC package:');
console.log("   Command: bun run --filter '<package>' <script>");
console.log("   Example: bun run --filter '@fire22-registry/core-security' build");

// ============================================================================
// EXAMPLE 3: Run script with pattern matching
// ============================================================================
console.log('\n3️⃣  Run script with PATTERN matching:');
console.log("   Command: bun run --filter '<pattern>' <script>");
console.log("   Example: bun run --filter '@fire22-registry/*' test");

// ============================================================================
// EXAMPLE 4: Control output lines
// ============================================================================
console.log('\n4️⃣  Control OUTPUT lines:');
console.log("   Command: bun run --filter '*' <script> --elide-lines=<number>");
console.log("   Example: bun run --filter '*' test --elide-lines=3");

// ============================================================================
// EXAMPLE 5: Dependency-aware execution
// ============================================================================
console.log('\n5️⃣  DEPENDENCY-AWARE execution:');
console.log('   Bun automatically respects package dependencies!');
console.log('   If analytics-dashboard depends on core-security,');
console.log('   core-security will run first, then analytics-dashboard');

// ============================================================================
// DEMONSTRATE PRACTICAL WORKFLOWS
// ============================================================================
console.log('\n🎯 Practical Workflow Examples:');
console.log('-'.repeat(40));

console.log('\n🏗️  Build Workflow:');
console.log('   # Build all packages');
console.log("   bun run --filter '*' build");
console.log('');
console.log('   # Build only core packages');
console.log("   bun run --filter '@fire22-registry/core-security' build");
console.log("   bun run --filter '@fire22-registry/compliance-core' build");

console.log('\n🧪 Testing Workflow:');
console.log('   # Test all packages');
console.log("   bun run --filter '*' test");
console.log('');
console.log('   # Test specific functionality');
console.log("   bun run --filter '@fire22-registry/core-security' test");

console.log('\n🔗 Linking Workflow:');
console.log('   # Link all packages for development');
console.log("   bun run --filter '*' link");
console.log('');
console.log('   # Link specific package');
console.log("   bun run --filter '@fire22-registry/analytics-dashboard' link");

console.log('\n🚀 CI/CD Pipeline Examples:');
console.log('   # Parallel builds');
console.log("   bun run --filter '*' build --elide-lines=5");
console.log('');
console.log('   # Sequential testing (with dependencies)');
console.log("   bun run --filter '*' test");
console.log('');
console.log('   # Production build only');
console.log("   bun run --filter '*' build");

// ============================================================================
// ADVANCED PATTERNS
// ============================================================================
console.log('\n⚡ Advanced Patterns:');
console.log('-'.repeat(30));

console.log('\n🔍 Selective Package Execution:');
console.log('   # Run in all packages EXCEPT core-security');
console.log("   bun run --filter '!@fire22-registry/core-security' --filter '*' test");
console.log('');
console.log('   # Run in packages matching pattern');
console.log("   bun run --filter '@fire22-registry/*' build");

console.log('\n📊 Monitoring & Debugging:');
console.log('   # Verbose output for debugging');
console.log("   bun run --filter '*' test --elide-lines=20");
console.log('');
console.log('   # Quick status checks');
console.log("   bun run --filter '*' test --elide-lines=1");

console.log('\n🏭 Enterprise Workflows:');
console.log('   # Multi-environment builds');
console.log("   bun run --filter '*' build:production");
console.log('');
console.log('   # Cross-package linting');
console.log("   bun run --filter '*' lint");
console.log('');
console.log('   # Security auditing');
console.log("   bun run --filter '*' security:audit");

// ============================================================================
// DEPENDENCY ORDER DEMONSTRATION
// ============================================================================
console.log('\n📋 Dependency Order Demonstration:');
console.log('-'.repeat(40));

console.log('Bun respects package dependencies automatically:');
console.log('   📦 @fire22-registry/core-security (no dependencies)');
console.log('   ├── 📦 @fire22-registry/analytics-dashboard (depends on core-security)');
console.log('   └── 📦 @fire22-registry/compliance-core (depends on core-security)');
console.log('');
console.log('When running scripts, Bun will:');
console.log('   1. Run scripts in core-security first');
console.log('   2. Wait for core-security to complete');
console.log('   3. Then run scripts in dependent packages');

// ============================================================================
// PERFORMANCE BENEFITS
// ============================================================================
console.log('\n⚡ Performance Benefits:');
console.log('-'.repeat(30));

console.log('✅ Concurrent execution across packages');
console.log('✅ Smart dependency resolution');
console.log('✅ Minimal overhead for script execution');
console.log('✅ Fast startup times');
console.log('✅ Cross-platform compatibility');

console.log('\n🎉 Workspace Scripts Demo Complete!');
console.log('   Ready to orchestrate your Fantasy42-Fire22 monorepo!');
console.log('');
console.log('💡 Pro Tips:');
console.log('   • Use --elide-lines to control output verbosity');
console.log('   • Leverage dependency order for reliable builds');
console.log('   • Combine filters for complex execution patterns');
console.log('   • Perfect for CI/CD pipelines and development workflows');

export { packages };
