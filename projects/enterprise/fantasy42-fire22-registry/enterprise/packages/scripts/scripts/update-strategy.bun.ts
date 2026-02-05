#!/usr/bin/env bun
/**
 * Fantasy42-Fire22 Update Strategy Script
 * Demonstrating different approaches to updating dependencies
 */

import { $ } from 'bun';

console.log('🚀 Fantasy42-Fire22 Update Strategy');
console.log('='.repeat(60));

console.log('\n📊 Current Outdated Dependencies:');
console.log('-'.repeat(40));

// Check root package outdated deps
console.log('\n🔍 Root package.json:');
const rootOutdated = await $`bun outdated --filter './'`.nothrow();
console.log(rootOutdated.stdout.toString() || 'No outdated dependencies in root');

// Check workspace outdated deps
console.log('\n🔍 Workspace packages:');
const workspaceOutdated = await $`bun outdated --filter './packages/*'`.nothrow();
console.log(workspaceOutdated.stdout.toString() || 'No outdated dependencies in workspaces');

// ============================================================================
// SAFE UPDATE STRATEGY
// ============================================================================
console.log('\n🛡️  SAFE UPDATE STRATEGY');
console.log('-'.repeat(40));
console.log('Update one package at a time to test compatibility:');

async function safeUpdate() {
  console.log('\n1️⃣ Updating uuid (minor version bump)...');
  const uuidResult = await $`bun update uuid --filter './'`.nothrow();
  console.log(uuidResult.exitCode === 0 ? '✅ uuid updated' : '⚠️  uuid update failed');

  console.log('\n2️⃣ Updating @types/uuid (minor version bump)...');
  const typesResult = await $`bun update @types/uuid --filter './'`.nothrow();
  console.log(
    typesResult.exitCode === 0 ? '✅ @types/uuid updated' : '⚠️  @types/uuid update failed'
  );

  console.log('\n⚠️  Skipping wrangler (major version - needs testing)');
  console.log('⚠️  Skipping better-sqlite3 (major version - needs testing)');
}

// ============================================================================
// MAJOR UPDATE STRATEGY (WITH CAUTION)
// ============================================================================
console.log('\n⚡ MAJOR UPDATE STRATEGY');
console.log('-'.repeat(40));

async function majorUpdate() {
  console.log('🔴 CAUTION: Major version updates may break compatibility');
  console.log('   Recommended: Update in development branch first');

  console.log('\n📋 Preview major updates:');
  const previewResult = await $`bun update --filter './' --dry-run`;
  console.log('Preview completed');

  console.log('\n💡 To update all (use with caution):');
  console.log("   bun update --filter './'");
  console.log("   bun update --filter './packages/*'");
}

// ============================================================================
// WORKSPACE-SPECIFIC STRATEGY
// ============================================================================
console.log('\n📦 WORKSPACE-SPECIFIC STRATEGY');
console.log('-'.repeat(40));

async function workspaceUpdate() {
  console.log('Update dependencies in specific workspace packages:');

  // Update core-security package
  console.log('\n🔐 Updating @fire22-registry/core-security:');
  const coreResult = await $`bun update --filter '@fire22-registry/core-security'`.nothrow();
  console.log(
    coreResult.exitCode === 0 ? '✅ core-security updated' : '⚠️  core-security update failed'
  );

  // Update analytics-dashboard package
  console.log('\n📊 Updating @fire22-registry/analytics-dashboard:');
  const analyticsResult =
    await $`bun update --filter '@fire22-registry/analytics-dashboard'`.nothrow();
  console.log(
    analyticsResult.exitCode === 0
      ? '✅ analytics-dashboard updated'
      : '⚠️  analytics-dashboard update failed'
  );

  // Update compliance-core package
  console.log('\n📜 Updating @fire22-registry/compliance-core:');
  const complianceResult =
    await $`bun update --filter '@fire22-registry/compliance-core'`.nothrow();
  console.log(
    complianceResult.exitCode === 0
      ? '✅ compliance-core updated'
      : '⚠️  compliance-core update failed'
  );
}

// ============================================================================
// VERIFICATION STRATEGY
// ============================================================================
async function verifyUpdates() {
  console.log('\n✅ VERIFICATION STRATEGY');
  console.log('-'.repeat(40));

  console.log('🧪 Running tests after updates...');
  const testResult = await $`bun test --filter './packages/*'`.nothrow();
  console.log(testResult.exitCode === 0 ? '✅ Tests passed' : '❌ Tests failed');

  console.log('\n🏗️  Running builds after updates...');
  const buildResult = await $`bun run build --filter './packages/*' 2>/dev/null`.nothrow();
  console.log(buildResult.exitCode === 0 ? '✅ Builds successful' : '⚠️  Some builds failed');

  console.log('\n🔒 Running security audit...');
  const auditResult = await $`bunx audit --filter './packages/*' 2>/dev/null`.nothrow();
  console.log('Security audit completed');
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================
async function main() {
  const args = process.argv.slice(2);
  const strategy = args[0];

  console.log('Available update strategies:');
  console.log('  safe     - Update safe packages (minor versions)');
  console.log('  major    - Preview major version updates');
  console.log('  workspace - Update workspace packages');
  console.log('  verify   - Verify updates with tests');
  console.log('  all      - Run all strategies');
  console.log('');
  console.log('Examples:');
  console.log('  bun run scripts/update-strategy.bun.ts safe');
  console.log('  bun run scripts/update-strategy.bun.ts verify');

  switch (strategy) {
    case 'safe':
      await safeUpdate();
      break;
    case 'major':
      await majorUpdate();
      break;
    case 'workspace':
      await workspaceUpdate();
      break;
    case 'verify':
      await verifyUpdates();
      break;
    case 'all':
      await safeUpdate();
      await workspaceUpdate();
      await verifyUpdates();
      break;
    default:
      console.log('❌ Please specify a strategy: safe, major, workspace, verify, or all');
      process.exit(1);
  }

  console.log('\n🎉 Update strategy completed!');
  console.log('\n💡 Remember to:');
  console.log('   • Test your application thoroughly');
  console.log('   • Update any breaking changes in code');
  console.log('   • Commit changes to version control');
  console.log('   • Consider creating a new branch for major updates');
}

// Run main if executed directly
if (import.meta.main) {
  await main();
}

export { safeUpdate, majorUpdate, workspaceUpdate, verifyUpdates, main as runUpdateStrategy };
