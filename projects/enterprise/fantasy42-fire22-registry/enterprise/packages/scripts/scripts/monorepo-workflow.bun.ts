#!/usr/bin/env bun
/**
 * Fantasy42-Fire22 Monorepo Workflow Script
 * Practical examples using Bun workspace filters
 */

import { $ } from 'bun';

console.info('🚀 Fantasy42-Fire22 Monorepo Workflow');
console.info('='.repeat(60));

// ============================================================================
// DEVELOPMENT WORKFLOW
// ============================================================================
async function devWorkflow() {
  console.info('\n🏗️  Development Workflow');
  console.info('-'.repeat(30));

  console.info('📦 Installing all workspace packages...');
  await $`bun install --filter './packages/*'`;

  console.info('✅ All packages installed successfully!');
  console.info('   Ready for development work');
}

// ============================================================================
// CI/CD WORKFLOW
// ============================================================================
async function ciWorkflow() {
  console.info('\n🚀 CI/CD Workflow');
  console.info('-'.repeat(30));

  console.info('🔍 Running dry-run to check what would be installed...');
  const dryRun = await $`bun install --filter './packages/*' --dry-run`;

  console.info('📋 Installing workspace packages (excluding root)...');
  await $`bun install --filter '!./' --filter './packages/*' --frozen-lockfile`;

  console.info('🧪 Running tests for all packages...');
  await $`bun test --filter './packages/*'`;

  console.info('✅ CI/CD workflow completed!');
}

// ============================================================================
// PACKAGE-SPECIFIC WORKFLOW
// ============================================================================
async function packageWorkflow(packageName: string) {
  console.info(`\n📦 ${packageName} Package Workflow`);
  console.info('-'.repeat(30));

  console.info(`🔧 Installing only ${packageName}...`);
  await $`bun install --filter '${packageName}'`;

  console.info(`🧪 Testing only ${packageName}...`);
  await $`bun test --filter '${packageName}'`;

  console.info(`🏗️  Building only ${packageName}...`);
  await $`bun run build --filter '${packageName}'`;

  console.info(`✅ ${packageName} workflow completed!`);
}

// ============================================================================
// PRODUCTION WORKFLOW
// ============================================================================
async function prodWorkflow() {
  console.info('\n🚀 Production Deployment Workflow');
  console.info('-'.repeat(30));

  console.info('📦 Installing production dependencies only...');
  await $`bun install --filter './packages/*' --production --omit optional`;

  console.info('🔒 Verifying lockfile integrity...');
  await $`bun install --filter './packages/*' --frozen-lockfile`;

  console.info('🏗️  Building all packages for production...');
  await $`bun run build --filter './packages/*'`;

  console.info('✅ Production workflow completed!');
  console.info('   Ready for deployment');
}

// ============================================================================
// CLEAN WORKFLOW
// ============================================================================
async function cleanWorkflow() {
  console.info('\n🧹 Clean Workspace Workflow');
  console.info('-'.repeat(30));

  console.info('🗑️  Removing all node_modules...');
  await $`find packages/ -name 'node_modules' -type d -exec rm -rf {} + 2>/dev/null || true`;
  await $`rm -rf node_modules`;

  console.info('📦 Reinstalling all dependencies...');
  await $`bun install --filter './packages/*'`;

  console.info('✅ Clean workspace ready!');
}

// ============================================================================
// MAIN MENU
// ============================================================================
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const packageName = args[1];

  console.info('Available commands:');
  console.info('  dev      - Development workflow (install all packages)');
  console.info('  ci       - CI/CD workflow (frozen lockfile, tests)');
  console.info('  prod     - Production workflow (production deps only)');
  console.info('  clean    - Clean and reinstall workspace');
  console.info('  package  - Work with specific package');
  console.info('');
  console.info('Examples:');
  console.info('  bun run scripts/monorepo-workflow.bun.ts dev');
  console.info('  bun run scripts/monorepo-workflow.bun.ts package @fire22-registry/core-security');
  console.info('  bun run scripts/monorepo-workflow.bun.ts ci');

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
        console.info('❌ Please specify a package name');
        console.info(
          '   Example: bun run scripts/monorepo-workflow.bun.ts package @fire22-registry/core-security'
        );
        process.exit(1);
      }
      await packageWorkflow(packageName);
      break;
    default:
      console.info('❌ Unknown command. Use one of: dev, ci, prod, clean, package');
      process.exit(1);
  }

  console.info('\n🎉 Workflow completed successfully!');
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
