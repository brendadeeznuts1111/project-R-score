#!/usr/bin/env bun
/**
 * Fantasy42-Fire22 Monorepo Workflow Script
 * Practical examples using Bun workspace filters
 */

import { $ } from 'bun';

console.log('🚀 Fantasy42-Fire22 Monorepo Workflow');
console.log('='.repeat(60));

// ============================================================================
// DEVELOPMENT WORKFLOW
// ============================================================================
async function devWorkflow() {
  console.log('\n🏗️  Development Workflow');
  console.log('-'.repeat(30));

  console.log('📦 Installing all workspace packages...');
  await $`bun install --filter './packages/*'`;

  console.log('✅ All packages installed successfully!');
  console.log('   Ready for development work');
}

// ============================================================================
// CI/CD WORKFLOW
// ============================================================================
async function ciWorkflow() {
  console.log('\n🚀 CI/CD Workflow');
  console.log('-'.repeat(30));

  console.log('🔍 Running dry-run to check what would be installed...');
  const dryRun = await $`bun install --filter './packages/*' --dry-run`;

  console.log('📋 Installing workspace packages (excluding root)...');
  await $`bun install --filter '!./' --filter './packages/*' --frozen-lockfile`;

  console.log('🧪 Running tests for all packages...');
  await $`bun test --filter './packages/*'`;

  console.log('✅ CI/CD workflow completed!');
}

// ============================================================================
// PACKAGE-SPECIFIC WORKFLOW
// ============================================================================
async function packageWorkflow(packageName: string) {
  console.log(`\n📦 ${packageName} Package Workflow`);
  console.log('-'.repeat(30));

  console.log(`🔧 Installing only ${packageName}...`);
  await $`bun install --filter '${packageName}'`;

  console.log(`🧪 Testing only ${packageName}...`);
  await $`bun test --filter '${packageName}'`;

  console.log(`🏗️  Building only ${packageName}...`);
  await $`bun run build --filter '${packageName}'`;

  console.log(`✅ ${packageName} workflow completed!`);
}

// ============================================================================
// PRODUCTION WORKFLOW
// ============================================================================
async function prodWorkflow() {
  console.log('\n🚀 Production Deployment Workflow');
  console.log('-'.repeat(30));

  console.log('📦 Installing production dependencies only...');
  await $`bun install --filter './packages/*' --production --omit optional`;

  console.log('🔒 Verifying lockfile integrity...');
  await $`bun install --filter './packages/*' --frozen-lockfile`;

  console.log('🏗️  Building all packages for production...');
  await $`bun run build --filter './packages/*'`;

  console.log('✅ Production workflow completed!');
  console.log('   Ready for deployment');
}

// ============================================================================
// CLEAN WORKFLOW
// ============================================================================
async function cleanWorkflow() {
  console.log('\n🧹 Clean Workspace Workflow');
  console.log('-'.repeat(30));

  console.log('🗑️  Removing all node_modules...');
  await $`find packages/ -name 'node_modules' -type d -exec rm -rf {} + 2>/dev/null || true`;
  await $`rm -rf node_modules`;

  console.log('📦 Reinstalling all dependencies...');
  await $`bun install --filter './packages/*'`;

  console.log('✅ Clean workspace ready!');
}

// ============================================================================
// MAIN MENU
// ============================================================================
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const packageName = args[1];

  console.log('Available commands:');
  console.log('  dev      - Development workflow (install all packages)');
  console.log('  ci       - CI/CD workflow (frozen lockfile, tests)');
  console.log('  prod     - Production workflow (production deps only)');
  console.log('  clean    - Clean and reinstall workspace');
  console.log('  package  - Work with specific package');
  console.log('');
  console.log('Examples:');
  console.log('  bun run scripts/monorepo-workflow.bun.ts dev');
  console.log('  bun run scripts/monorepo-workflow.bun.ts package @fire22-registry/core-security');
  console.log('  bun run scripts/monorepo-workflow.bun.ts ci');

  switch (command) {
    case 'dev':
      await devWorkflow();
      break;
    case 'ci':
      await ciWorkflow();
      break;
    case 'prod':
      await prodWorkflow();
      break;
    case 'clean':
      await cleanWorkflow();
      break;
    case 'package':
      if (!packageName) {
        console.log('❌ Please specify a package name');
        console.log(
          '   Example: bun run scripts/monorepo-workflow.bun.ts package @fire22-registry/core-security'
        );
        process.exit(1);
      }
      await packageWorkflow(packageName);
      break;
    default:
      console.log('❌ Unknown command. Use one of: dev, ci, prod, clean, package');
      process.exit(1);
  }

  console.log('\n🎉 Workflow completed successfully!');
}

// Run main if executed directly
if (import.meta.main) {
  await main();
}

export {
  devWorkflow,
  ciWorkflow,
  prodWorkflow,
  cleanWorkflow,
  packageWorkflow,
  main as runMonorepoWorkflow,
};
