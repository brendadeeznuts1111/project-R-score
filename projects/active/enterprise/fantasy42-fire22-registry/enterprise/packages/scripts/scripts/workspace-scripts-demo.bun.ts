#!/usr/bin/env bun
/**
 * Fantasy42-Fire22 Workspace Scripts Demo
 * Demonstrating Bun's workspace script execution capabilities
 */

import { $ } from 'bun';

console.info('🚀 Fantasy42-Fire22 Workspace Scripts Demo');
console.info('='.repeat(60));

console.info('\n📦 Available Workspace Packages:');
const packages = [
  '@fire22-registry/core-security',
  '@fire22-registry/analytics-dashboard',
  '@fire22-registry/compliance-core',
];

packages.forEach(pkg => console.info(`   📦 ${pkg}`));

console.info('\n🔧 Workspace Script Execution Examples:');
console.info('-'.repeat(50));

// ============================================================================
// EXAMPLE 1: Run script in all packages
// ============================================================================
console.info('\n1️⃣  Run script in ALL workspace packages:');
console.info("   Command: bun run --filter '*' <script>");
console.info("   Example: bun run --filter '*' link");

// ============================================================================
// EXAMPLE 2: Run script in specific package
// ============================================================================
console.info('\n2️⃣  Run script in SPECIFIC package:');
console.info("   Command: bun run --filter '<package>' <script>");
console.info("   Example: bun run --filter '@fire22-registry/core-security' build");

// ============================================================================
// EXAMPLE 3: Run script with pattern matching
// ============================================================================
console.info('\n3️⃣  Run script with PATTERN matching:');
console.info("   Command: bun run --filter '<pattern>' <script>");
console.info("   Example: bun run --filter '@fire22-registry/*' test");

// ============================================================================
// EXAMPLE 4: Control output lines
// ============================================================================
console.info('\n4️⃣  Control OUTPUT lines:');
console.info("   Command: bun run --filter '*' <script> --elide-lines=<number>");
console.info("   Example: bun run --filter '*' test --elide-lines=3");

// ============================================================================
// EXAMPLE 5: Dependency-aware execution
// ============================================================================
console.info('\n5️⃣  DEPENDENCY-AWARE execution:');
console.info('   Bun automatically respects package dependencies!');
console.info('   If analytics-dashboard depends on core-security,');
console.info('   core-security will run first, then analytics-dashboard');

// ============================================================================
// DEMONSTRATE PRACTICAL WORKFLOWS
// ============================================================================
console.info('\n🎯 Practical Workflow Examples:');
console.info('-'.repeat(40));

console.info('\n🏗️  Build Workflow:');
console.info('   # Build all packages');
console.info("   bun run --filter '*' build");
console.info('');
console.info('   # Build only core packages');
console.info("   bun run --filter '@fire22-registry/core-security' build");
console.info("   bun run --filter '@fire22-registry/compliance-core' build");

console.info('\n🧪 Testing Workflow:');
console.info('   # Test all packages');
console.info("   bun run --filter '*' test");
console.info('');
console.info('   # Test specific functionality');
console.info("   bun run --filter '@fire22-registry/core-security' test");

console.info('\n🔗 Linking Workflow:');
console.info('   # Link all packages for development');
console.info("   bun run --filter '*' link");
console.info('');
console.info('   # Link specific package');
console.info("   bun run --filter '@fire22-registry/analytics-dashboard' link");

console.info('\n🚀 CI/CD Pipeline Examples:');
console.info('   # Parallel builds');
console.info("   bun run --filter '*' build --elide-lines=5");
console.info('');
console.info('   # Sequential testing (with dependencies)');
console.info("   bun run --filter '*' test");
console.info('');
console.info('   # Production build only');
console.info("   bun run --filter '*' build");

// ============================================================================
// ADVANCED PATTERNS
// ============================================================================
console.info('\n⚡ Advanced Patterns:');
console.info('-'.repeat(30));

console.info('\n🔍 Selective Package Execution:');
console.info('   # Run in all packages EXCEPT core-security');
console.info("   bun run --filter '!@fire22-registry/core-security' --filter '*' test");
console.info('');
console.info('   # Run in packages matching pattern');
console.info("   bun run --filter '@fire22-registry/*' build");

console.info('\n📊 Monitoring & Debugging:');
console.info('   # Verbose output for debugging');
console.info("   bun run --filter '*' test --elide-lines=20");
console.info('');
console.info('   # Quick status checks');
console.info("   bun run --filter '*' test --elide-lines=1");

console.info('\n🏭 Enterprise Workflows:');
console.info('   # Multi-environment builds');
console.info("   bun run --filter '*' build:production");
console.info('');
console.info('   # Cross-package linting');
console.info("   bun run --filter '*' lint");
console.info('');
console.info('   # Security auditing');
console.info("   bun run --filter '*' security:audit");

// ============================================================================
// DEPENDENCY ORDER DEMONSTRATION
// ============================================================================
console.info('\n📋 Dependency Order Demonstration:');
console.info('-'.repeat(40));

console.info('Bun respects package dependencies automatically:');
console.info('   📦 @fire22-registry/core-security (no dependencies)');
console.info('   ├── 📦 @fire22-registry/analytics-dashboard (depends on core-security)');
console.info('   └── 📦 @fire22-registry/compliance-core (depends on core-security)');
console.info('');
console.info('When running scripts, Bun will:');
console.info('   1. Run scripts in core-security first');
console.info('   2. Wait for core-security to complete');
console.info('   3. Then run scripts in dependent packages');

// ============================================================================
// PERFORMANCE BENEFITS
// ============================================================================
console.info('\n⚡ Performance Benefits:');
console.info('-'.repeat(30));

console.info('✅ Concurrent execution across packages');
console.info('✅ Smart dependency resolution');
console.info('✅ Minimal overhead for script execution');
console.info('✅ Fast startup times');
console.info('✅ Cross-platform compatibility');

console.info('\n🎉 Workspace Scripts Demo Complete!');
console.info('   Ready to orchestrate your Fantasy42-Fire22 monorepo!');
console.info('');
console.info('💡 Pro Tips:');
console.info('   • Use --elide-lines to control output verbosity');
console.info('   • Leverage dependency order for reliable builds');
console.info('   • Combine filters for complex execution patterns');
console.info('   • Perfect for CI/CD pipelines and development workflows');

export { packages };
