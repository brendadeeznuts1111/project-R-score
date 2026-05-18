#!/usr/bin/env bun
/**
 * Bun Shell Integration Demo
 * Demonstrating cross-platform shell operations with JavaScript interop
 */

import { $ } from 'bun';

// ============================================================================
// 1. BASIC SHELL OPERATIONS
// ============================================================================
console.info('🚀 Bun Shell Integration Demo');
console.info('='.repeat(60));

console.info('\n🔧 Basic Shell Operations:');

// Cross-platform directory listing
const dirContents = await $`ls -la`.text();
console.info('Directory contents:');
console.info(dirContents);

// Environment variable access
const envInfo = await $`echo "Node env: $NODE_ENV, Platform: $(uname -s)"`.text();
console.info('Environment info:');
console.info(envInfo);

// ============================================================================
// 2. INTEGRATION WITH BUN LINK/BUNX
// ============================================================================
console.info('\n🔗 Integration with Bun Link/Bunx:');

// Check if our packages are properly linked
const linkStatus = await $`bun link --list 2>/dev/null || echo "No linked packages"`
  .nothrow()
  .text();
console.info('Linked packages:');
console.info(linkStatus);

// Use bunx for package operations
console.info('Running prettier with bunx:');
const prettierVersion = await $`bunx prettier --version`.nothrow().text();
console.info(`Prettier version: ${prettierVersion.trim()}`);

// ============================================================================
// 3. FILE OPERATIONS WITH JAVASCRIPT INTEROP
// ============================================================================
console.info('\n📁 File Operations with JavaScript Interop:');

// Create a test file using Bun Shell
await $`echo '{"name": "fantasy42-shell-test", "version": "1.0.0"}' > shell-test.json`;

// Read the file using Bun.file
const testFile = Bun.file('shell-test.json');
const fileContent = await testFile.json();
console.info('Created file content:');
console.info(JSON.stringify(fileContent, null, 2));

// Use file content in shell operations
const wordCount = await $`cat shell-test.json | wc -l`.text();
console.info(`File line count: ${wordCount.trim()}`);

// ============================================================================
// 4. ADVANCED SHELL FEATURES
// ============================================================================
console.info('\n⚡ Advanced Shell Features:');

// Command substitution
const gitStatus =
  await $`echo "Current branch: $(git branch --show-current 2>/dev/null || echo 'not-a-git-repo')"`.text();
console.info(gitStatus);

// Piping with JavaScript objects
const response = await fetch('https://httpbin.org/json');
const pipedResult = await $`cat < ${response} | head -5`.text();
console.info('Piped HTTP response:');
console.info(pipedResult);

// ============================================================================
// 5. CROSS-PLATFORM OPERATIONS
// ============================================================================
console.info('\n🌍 Cross-Platform Operations:');

// Platform-specific commands (graceful fallback)
const platformInfo =
  process.platform === 'win32' ? await $`ver`.nothrow().text() : await $`uname -a`.nothrow().text();
console.info('Platform info:');
console.info(platformInfo);

// ============================================================================
// 6. ERROR HANDLING
// ============================================================================
console.info('\n🛡️ Error Handling:');

try {
  // This might fail if the command doesn't exist
  const result = await $`nonexistent-command`.text();
  console.info('Command succeeded:', result);
} catch (error) {
  console.info('Command failed gracefully:');
  console.info(`Exit code: ${error.exitCode}`);
  console.info(`Stdout: ${error.stdout?.toString()}`);
  console.info(`Stderr: ${error.stderr?.toString()}`);
}

// ============================================================================
// 7. REGISTRY OPERATIONS INTEGRATION
// ============================================================================
console.info('\n📦 Registry Operations Integration:');

// Check current registry configuration
const registryInfo = await $`npm config get registry`.nothrow().text();
console.info('Current npm registry:');
console.info(registryInfo);

// Simulate registry check with timeout
const registryCheck =
  await $`timeout 5s curl -s https://registry.npmjs.org/ || echo "Registry check failed"`
    .nothrow()
    .text();
console.info('Registry connectivity:');
console.info(registryCheck ? '✅ Registry accessible' : '❌ Registry check failed');

// ============================================================================
// 8. BUILD AND DEPLOYMENT WORKFLOWS
// ============================================================================
console.info('\n🏗️ Build and Deployment Workflows:');

// Simulate a build workflow
async function simulateBuild() {
  console.info('🔨 Starting build workflow...');

  // Clean previous builds
  await $`rm -rf dist/`.nothrow();

  // Create build directory
  await $`mkdir -p dist/`.nothrow();

  // Copy files (simulated)
  await $`echo '{"build": "completed", "timestamp": "$(date)"}' > dist/manifest.json`;

  // List build output
  const buildFiles = await $`ls -la dist/`.text();
  console.info('Build output:');
  console.info(buildFiles);

  console.info('✅ Build workflow completed');
}

await simulateBuild();

// ============================================================================
// 9. PACKAGE MANAGEMENT INTEGRATION
// ============================================================================
console.info('\n📋 Package Management Integration:');

// Check package.json
const packageInfo = await $`cat package.json | head -10`.nothrow().text();
console.info('Package.json preview:');
console.info(packageInfo);

// Dependency analysis
const depCount = await $`npm ls --depth=0 2>/dev/null | wc -l || echo "0"`.nothrow().text();
console.info(`Dependencies count: ${depCount.trim()}`);

// ============================================================================
// 10. CLEANUP
// ============================================================================
console.info('\n🧹 Cleanup:');

// Remove test files
await $`rm -f shell-test.json`.nothrow();

// List remaining files
const remainingFiles = await $`ls -la | grep -E '\.(json|ts|js)$' | head -5`.text();
console.info('Remaining project files:');
console.info(remainingFiles);

console.info('\n🎉 Bun Shell Integration Demo Complete!');
console.info('   All major Bun Shell features demonstrated successfully!');
console.info('   Ready for Fantasy42-Fire22 registry automation!');

export { simulateBuild };
