#!/usr/bin/env bun
/**
 * Bun Workspace Filter Patterns Demo
 * Demonstrating different filter patterns for monorepo management
 */

import { $ } from 'bun';

console.info('🚀 Bun Workspace Filter Patterns Demo');
console.info('='.repeat(60));

console.info('\n📋 Available Packages in Our Monorepo:');
const packages = [
  '@fire22-registry/core-security',
  '@fire22-registry/analytics-dashboard',
  '@fire22-registry/compliance-core',
];

packages.forEach(pkg => console.info(`   📦 ${pkg}`));

console.info('\n🔧 Filter Pattern Examples:');
console.info('-'.repeat(40));

// Example 1: Install all packages in ./packages
console.info('\n1️⃣  Install all packages in ./packages:');
console.info("   Command: bun install --filter './packages/*'");
console.info('   Result: Installs all packages in packages/ directory');

// Example 2: Exclude root package
console.info('\n2️⃣  Exclude root package.json, install only workspaces:');
console.info("   Command: bun install --filter '!./' --filter './packages/*'");
console.info('   Result: Skips root package.json, installs only workspace packages');

// Example 3: Exclude specific package
console.info('\n3️⃣  Exclude specific package:');
console.info(
  "   Command: bun install --filter '!@fire22-registry/core-security' --filter './packages/*'"
);
console.info('   Result: Installs all packages except core-security');

// Example 4: Install only specific package
console.info('\n4️⃣  Install only specific package:');
console.info("   Command: bun install --filter '@fire22-registry/analytics-dashboard'");
console.info('   Result: Installs only analytics-dashboard and its dependencies');

// Example 5: Install packages by pattern
console.info('\n5️⃣  Install packages by name pattern:');
console.info("   Command: bun install --filter '@fire22-registry/*'");
console.info('   Result: Installs all @fire22-registry scoped packages');

// Example 6: Development vs Production installs
console.info('\n6️⃣  Development packages only:');
console.info("   Command: bun install --filter './packages/*' --dev");
console.info('   Result: Installs only devDependencies for workspace packages');

console.info('\n📊 Practical Use Cases:');
console.info('-'.repeat(40));

console.info('\n🎯 CI/CD Scenarios:');
console.info("   • Install all packages: bun install --filter './packages/*'");
console.info("   • Skip root in CI: bun install --filter '!./' --filter './packages/*'");
console.info("   • Quick dev setup: bun install --filter './packages/*' --dev");

console.info('\n🏗️  Development Scenarios:');
console.info("   • Test specific package: bun install --filter '@fire22-registry/core-security'");
console.info("   • Update dependencies: bun update --filter './packages/*'");
console.info("   • Clean reinstall: rm -rf node_modules && bun install --filter './packages/*'");

console.info('\n🚀 Production Scenarios:');
console.info("   • Production build: bun install --filter './packages/*' --production");
console.info("   • Skip optional deps: bun install --filter './packages/*' --omit optional");
console.info("   • Frozen lockfile: bun install --filter './packages/*' --frozen-lockfile");

console.info('\n💡 Pro Tips:');
console.info('-'.repeat(40));
console.info('   • Use --dry-run to preview what will be installed');
console.info('   • Combine filters with logical operators (!, &&)');
console.info('   • Use globs (*, **) for flexible package matching');
console.info('   • Filter by package name, path, or custom tags');
console.info('   • Perfect for monorepo CI/CD pipelines');

console.info('\n🎉 Filter patterns demonstrated successfully!');
console.info('   Ready to optimize your Fantasy42-Fire22 monorepo workflow!');

export { packages };
