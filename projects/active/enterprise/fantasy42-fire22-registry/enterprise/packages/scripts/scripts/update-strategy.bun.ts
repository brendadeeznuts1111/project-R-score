#!/usr/bin/env bun
/**
 * Fantasy42-Fire22 Update Strategy Script
 * Demonstrating different approaches to updating dependencies
 */

import { $ } from 'bun';

console.info('🚀 Fantasy42-Fire22 Update Strategy');
console.info('='.repeat(60));

console.info('\n📊 Current Outdated Dependencies:');
console.info('-'.repeat(40));

// Check root package outdated deps
console.info('\n🔍 Root package.json:');
const rootOutdated = await $`bun outdated --filter './'`.nothrow();
console.info(rootOutdated.stdout.toString() || 'No outdated dependencies in root');

// Check workspace outdated deps
console.info('\n🔍 Workspace packages:');
const workspaceOutdated = await $`bun outdated --filter './packages/*'`.nothrow();
console.info(workspaceOutdated.stdout.toString() || 'No outdated dependencies in workspaces');

// ============================================================================
// SAFE UPDATE STRATEGY
// ============================================================================
console.info('\n🛡️  SAFE UPDATE STRATEGY');
console.info('-'.repeat(40));
console.info('Update one package at a time to test compatibility:');

async function safeUpdate() {
  console.info('\n1️⃣ Updating uuid (minor version bump)...');
  const uuidResult = await $`bun update uuid --filter './'`.nothrow();
  console.info(uuidResult.exitCode === 0 ? '✅ uuid updated' : '⚠️  uuid update failed');

  console.info('\n2️⃣ Updating @types/uuid (minor version bump)...');
  const typesResult = await $`bun update @types/uuid --filter './'`.nothrow();
  console.info(
    typesResult.exitCode === 0 ? '✅ @types/uuid updated' : '⚠️  @types/uuid update failed'
  );

  console.info('\n⚠️  Skipping wrangler (major version - needs testing)');
  console.info('⚠️  Skipping better-sqlite3 (major version - needs testing)');
}

// ============================================================================
// MAJOR UPDATE STRATEGY (WITH CAUTION)
// ============================================================================
console.info('\n⚡ MAJOR UPDATE STRATEGY');
console.info('-'.repeat(40));

async function majorUpdate() {
  console.info('🔴 CAUTION: Major version updates may break compatibility');
  console.info('   Recommended: Update in development branch first');

  console.info('\n📋 Preview major updates:');
  const previewResult = await $`bun update --filter './' --dry-run`;
  console.info('Preview completed');

  console.info('\n💡 To update all (use with caution):');
  console.info("   bun update --filter './'");
  console.info("   bun update --filter './packages/*'");
}

// ============================================================================
// WORKSPACE-SPECIFIC STRATEGY
// ============================================================================
console.info('\n📦 WORKSPACE-SPECIFIC STRATEGY');
console.info('-'.repeat(40));

async function workspaceUpdate() {
  console.info('Update dependencies in specific workspace packages:');

  // Update core-security package
  console.info('\n🔐 Updating @fire22-registry/core-security:');
  const coreResult = await $`bun update --filter '@fire22-registry/core-security'`.nothrow();
  console.info(
    coreResult.exitCode === 0 ? '✅ core-security updated' : '⚠️  core-security update failed'
  );

  // Update analytics-dashboard package
  console.info('\n📊 Updating @fire22-registry/analytics-dashboard:');
  const analyticsResult =
    await $`bun update --filter '@fire22-registry/analytics-dashboard'`.nothrow();
  console.info(
    analyticsResult.exitCode === 0
      ? '✅ analytics-dashboard updated'
      : '⚠️  analytics-dashboard update failed'
  );

  // Update compliance-core package
  console.info('\n📜 Updating @fire22-registry/compliance-core:');
  const complianceResult =
    await $`bun update --filter '@fire22-registry/compliance-core'`.nothrow();
  console.info(
    complianceResult.exitCode === 0
      ? '✅ compliance-core updated'
      : '⚠️  compliance-core update failed'
  );
}

// ============================================================================
// VERIFICATION STRATEGY
// ============================================================================
async function verifyUpdates() {
  console.info('\n✅ VERIFICATION STRATEGY');
  console.info('-'.repeat(40));

  console.info('🧪 Running tests after updates...');
  const testResult = await $`bun test --filter './packages/*'`.nothrow();
  console.info(testResult.exitCode === 0 ? '✅ Tests passed' : '❌ Tests failed');

  console.info('\n🏗️  Running builds after updates...');
  const buildResult = await $`bun run build --filter './packages/*' 2>/dev/null`.nothrow();
  console.info(buildResult.exitCode === 0 ? '✅ Builds successful' : '⚠️  Some builds failed');

  console.info('\n🔒 Running security audit...');
  const auditResult = await $`bunx audit --filter './packages/*' 2>/dev/null`.nothrow();
  console.info('Security audit completed');
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================
async function main() {
  const args = process.argv.slice(2);
  const strategy = args[0];

  console.info('Available update strategies:');
  console.info('  safe     - Update safe packages (minor versions)');
  console.info('  major    - Preview major version updates');
  console.info('  workspace - Update workspace packages');
  console.info('  verify   - Verify updates with tests');
  console.info('  all      - Run all strategies');
  console.info('');
  console.info('Examples:');
  console.info('  bun run scripts/update-strategy.bun.ts safe');
  console.info('  bun run scripts/update-strategy.bun.ts verify');

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
      console.info('❌ Please specify a strategy: safe, major, workspace, verify, or all');
      process.exit(1);
  }

  console.info('\n🎉 Update strategy completed!');
  console.info('\n💡 Remember to:');
  console.info('   • Test your application thoroughly');
  console.info('   • Update any breaking changes in code');
  console.info('   • Commit changes to version control');
  console.info('   • Consider creating a new branch for major updates');
}

// Run main if executed directly
if (import.meta.main) {
  await main();
}

export { safeUpdate, majorUpdate, workspaceUpdate, verifyUpdates, main as runUpdateStrategy };
