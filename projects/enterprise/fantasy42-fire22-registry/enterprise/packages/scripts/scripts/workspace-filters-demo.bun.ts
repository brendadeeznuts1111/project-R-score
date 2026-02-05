#!/usr/bin/env bun
/**
 * Bun Workspace Filter Patterns Demo
 * Demonstrating different filter patterns for monorepo management
 */

import { $ } from 'bun';

console.log('🚀 Bun Workspace Filter Patterns Demo');
console.log('='.repeat(60));

console.log('\n📋 Available Packages in Our Monorepo:');
const packages = [
  '@fire22-registry/core-security',
  '@fire22-registry/analytics-dashboard',
  '@fire22-registry/compliance-core',
];

packages.forEach(pkg => console.log(`   📦 ${pkg}`));

console.log('\n🔧 Filter Pattern Examples:');
console.log('-'.repeat(40));

// Example 1: Install all packages in ./packages
console.log('\n1️⃣  Install all packages in ./packages:');
console.log("   Command: bun install --filter './packages/*'");
console.log('   Result: Installs all packages in packages/ directory');

// Example 2: Exclude root package
console.log('\n2️⃣  Exclude root package.json, install only workspaces:');
console.log("   Command: bun install --filter '!./' --filter './packages/*'");
console.log('   Result: Skips root package.json, installs only workspace packages');

// Example 3: Exclude specific package
console.log('\n3️⃣  Exclude specific package:');
console.log(
  "   Command: bun install --filter '!@fire22-registry/core-security' --filter './packages/*'"
);
console.log('   Result: Installs all packages except core-security');

// Example 4: Install only specific package
console.log('\n4️⃣  Install only specific package:');
console.log("   Command: bun install --filter '@fire22-registry/analytics-dashboard'");
console.log('   Result: Installs only analytics-dashboard and its dependencies');

// Example 5: Install packages by pattern
console.log('\n5️⃣  Install packages by name pattern:');
console.log("   Command: bun install --filter '@fire22-registry/*'");
console.log('   Result: Installs all @fire22-registry scoped packages');

// Example 6: Development vs Production installs
console.log('\n6️⃣  Development packages only:');
console.log("   Command: bun install --filter './packages/*' --dev");
console.log('   Result: Installs only devDependencies for workspace packages');

console.log('\n📊 Practical Use Cases:');
console.log('-'.repeat(40));

console.log('\n🎯 CI/CD Scenarios:');
console.log("   • Install all packages: bun install --filter './packages/*'");
console.log("   • Skip root in CI: bun install --filter '!./' --filter './packages/*'");
console.log("   • Quick dev setup: bun install --filter './packages/*' --dev");

console.log('\n🏗️  Development Scenarios:');
console.log("   • Test specific package: bun install --filter '@fire22-registry/core-security'");
console.log("   • Update dependencies: bun update --filter './packages/*'");
console.log("   • Clean reinstall: rm -rf node_modules && bun install --filter './packages/*'");

console.log('\n🚀 Production Scenarios:');
console.log("   • Production build: bun install --filter './packages/*' --production");
console.log("   • Skip optional deps: bun install --filter './packages/*' --omit optional");
console.log("   • Frozen lockfile: bun install --filter './packages/*' --frozen-lockfile");

console.log('\n💡 Pro Tips:');
console.log('-'.repeat(40));
console.log('   • Use --dry-run to preview what will be installed');
console.log('   • Combine filters with logical operators (!, &&)');
console.log('   • Use globs (*, **) for flexible package matching');
console.log('   • Filter by package name, path, or custom tags');
console.log('   • Perfect for monorepo CI/CD pipelines');

console.log('\n🎉 Filter patterns demonstrated successfully!');
console.log('   Ready to optimize your Fantasy42-Fire22 monorepo workflow!');

export { packages };
