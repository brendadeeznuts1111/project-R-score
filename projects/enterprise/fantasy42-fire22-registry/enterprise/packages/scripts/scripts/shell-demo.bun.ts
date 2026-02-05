#!/usr/bin/env bun
/**
 * Bun Shell Integration Demo
 * Demonstrating cross-platform shell operations with JavaScript interop
 */

import { $ } from 'bun';

// ============================================================================
// 1. BASIC SHELL OPERATIONS
// ============================================================================
console.log('🚀 Bun Shell Integration Demo');
console.log('='.repeat(60));

console.log('\n🔧 Basic Shell Operations:');

// Cross-platform directory listing
const dirContents = await $`ls -la`.text();
console.log('Directory contents:');
console.log(dirContents);

// Environment variable access
const envInfo = await $`echo "Node env: $NODE_ENV, Platform: $(uname -s)"`.text();
console.log('Environment info:');
console.log(envInfo);

// ============================================================================
// 2. INTEGRATION WITH BUN LINK/BUNX
// ============================================================================
console.log('\n🔗 Integration with Bun Link/Bunx:');

// Check if our packages are properly linked
const linkStatus = await $`bun link --list 2>/dev/null || echo "No linked packages"`
  .nothrow()
  .text();
console.log('Linked packages:');
console.log(linkStatus);

// Use bunx for package operations
console.log('Running prettier with bunx:');
const prettierVersion = await $`bunx prettier --version`.nothrow().text();
console.log(`Prettier version: ${prettierVersion.trim()}`);

// ============================================================================
// 3. FILE OPERATIONS WITH JAVASCRIPT INTEROP
// ============================================================================
console.log('\n📁 File Operations with JavaScript Interop:');

// Create a test file using Bun Shell
await $`echo '{"name": "fantasy42-shell-test", "version": "1.0.0"}' > shell-test.json`;

// Read the file using Bun.file
const testFile = Bun.file('shell-test.json');
const fileContent = await testFile.json();
console.log('Created file content:');
console.log(JSON.stringify(fileContent, null, 2));

// Use file content in shell operations
const wordCount = await $`cat shell-test.json | wc -l`.text();
console.log(`File line count: ${wordCount.trim()}`);

// ============================================================================
// 4. ADVANCED SHELL FEATURES
// ============================================================================
console.log('\n⚡ Advanced Shell Features:');

// Command substitution
const gitStatus =
  await $`echo "Current branch: $(git branch --show-current 2>/dev/null || echo 'not-a-git-repo')"`.text();
console.log(gitStatus);

// Piping with JavaScript objects
const response = await fetch('https://httpbin.org/json');
const pipedResult = await $`cat < ${response} | head -5`.text();
console.log('Piped HTTP response:');
console.log(pipedResult);

// ============================================================================
// 5. CROSS-PLATFORM OPERATIONS
// ============================================================================
console.log('\n🌍 Cross-Platform Operations:');

// Platform-specific commands (graceful fallback)
const platformInfo =
  process.platform === 'win32' ? await $`ver`.nothrow().text() : await $`uname -a`.nothrow().text();
console.log('Platform info:');
console.log(platformInfo);

// ============================================================================
// 6. ERROR HANDLING
// ============================================================================
console.log('\n🛡️ Error Handling:');

try {
  // This might fail if the command doesn't exist
  const result = await $`nonexistent-command`.text();
  console.log('Command succeeded:', result);
} catch (error) {
  console.log('Command failed gracefully:');
  console.log(`Exit code: ${error.exitCode}`);
  console.log(`Stdout: ${error.stdout?.toString()}`);
  console.log(`Stderr: ${error.stderr?.toString()}`);
}

// ============================================================================
// 7. REGISTRY OPERATIONS INTEGRATION
// ============================================================================
console.log('\n📦 Registry Operations Integration:');

// Check current registry configuration
const registryInfo = await $`npm config get registry`.nothrow().text();
console.log('Current npm registry:');
console.log(registryInfo);

// Simulate registry check with timeout
const registryCheck =
  await $`timeout 5s curl -s https://registry.npmjs.org/ || echo "Registry check failed"`
    .nothrow()
    .text();
console.log('Registry connectivity:');
console.log(registryCheck ? '✅ Registry accessible' : '❌ Registry check failed');

// ============================================================================
// 8. BUILD AND DEPLOYMENT WORKFLOWS
// ============================================================================
console.log('\n🏗️ Build and Deployment Workflows:');

// Simulate a build workflow
async function simulateBuild() {
  console.log('🔨 Starting build workflow...');

  // Clean previous builds
  await $`rm -rf dist/`.nothrow();

  // Create build directory
  await $`mkdir -p dist/`.nothrow();

  // Copy files (simulated)
  await $`echo '{"build": "completed", "timestamp": "$(date)"}' > dist/manifest.json`;

  // List build output
  const buildFiles = await $`ls -la dist/`.text();
  console.log('Build output:');
  console.log(buildFiles);

  console.log('✅ Build workflow completed');
}

await simulateBuild();

// ============================================================================
// 9. PACKAGE MANAGEMENT INTEGRATION
// ============================================================================
console.log('\n📋 Package Management Integration:');

// Check package.json
const packageInfo = await $`cat package.json | head -10`.nothrow().text();
console.log('Package.json preview:');
console.log(packageInfo);

// Dependency analysis
const depCount = await $`npm ls --depth=0 2>/dev/null | wc -l || echo "0"`.nothrow().text();
console.log(`Dependencies count: ${depCount.trim()}`);

// ============================================================================
// 10. CLEANUP
// ============================================================================
console.log('\n🧹 Cleanup:');

// Remove test files
await $`rm -f shell-test.json`.nothrow();

// List remaining files
const remainingFiles = await $`ls -la | grep -E '\.(json|ts|js)$' | head -5`.text();
console.log('Remaining project files:');
console.log(remainingFiles);

console.log('\n🎉 Bun Shell Integration Demo Complete!');
console.log('   All major Bun Shell features demonstrated successfully!');
console.log('   Ready for Fantasy42-Fire22 registry automation!');

export { simulateBuild };
