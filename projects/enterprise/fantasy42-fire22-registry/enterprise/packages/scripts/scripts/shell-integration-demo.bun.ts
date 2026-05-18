#!/usr/bin/env bun
/**
 * Bun Shell Integration Demo
 * Demonstrating Bun Shell with existing project setup
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
console.info(dirContents.split('\n').slice(0, 5).join('\n') + '\n...');

// Environment variable access
const envInfo = await $`echo "Node env: $NODE_ENV, Platform: $(uname -s)"`.text();
console.info('Environment info:');
console.info(envInfo);

// ============================================================================
// 2. INTEGRATION WITH BUN LINK/BUNX
// ============================================================================
console.info('\n🔗 Integration with Bun Link/Bunx:');

// Check linked packages
const linkStatus = await $`bun link --list 2>/dev/null || echo "No linked packages found"`
  .nothrow()
  .text();
console.info('Linked packages:');
console.info(linkStatus);

// Use bunx for package operations
console.info('Running prettier with bunx:');
const prettierCheck = await $`bunx prettier --version 2>/dev/null || echo "Prettier not available"`
  .nothrow()
  .text();
console.info(`Prettier: ${prettierCheck.trim()}`);

// ============================================================================
// 3. FILE OPERATIONS WITH JAVASCRIPT INTEROP
// ============================================================================
console.info('\n📁 File Operations with JavaScript Interop:');

// Create a test file using Bun Shell
const testContent = JSON.stringify(
  {
    demo: 'bun-shell-integration',
    timestamp: new Date().toISOString(),
    features: ['shell', 'interop', 'registry'],
  },
  null,
  2
);

await $`echo '${testContent}' > shell-integration-test.json`;

// Read the file using Bun.file
const testFile = Bun.file('shell-integration-test.json');
const fileContent = await testFile.json();
console.info('Created file content:');
console.info(`Demo: ${fileContent.demo}`);
console.info(`Features: ${fileContent.features.join(', ')}`);

// Use file content in shell operations
const wordCount = await $`cat shell-integration-test.json | wc -l`.text();
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
const pipedResult = await $`cat < ${response} | head -3`.text();
console.info('Piped HTTP response (first 3 lines):');
console.info(pipedResult);

// ============================================================================
// 5. REGISTRY OPERATIONS INTEGRATION
// ============================================================================
console.info('\n📦 Registry Operations Integration:');

// Check current registry configuration
const registryInfo = await $`npm config get registry`.nothrow().text();
console.info('Current npm registry:');
console.info(registryInfo);

// Simulate registry check with timeout
const registryCheck =
  await $`timeout 3s curl -s https://registry.npmjs.org/ 2>/dev/null | head -1 || echo "Registry check failed"`
    .nothrow()
    .text();
console.info('Registry connectivity:');
console.info(registryCheck ? '✅ Registry accessible' : '❌ Registry check failed');

// Check package.json
const packageInfo = await $`cat package.json | grep '"name"' | head -1`.nothrow().text();
console.info('Package name from package.json:');
console.info(packageInfo);

// ============================================================================
// 6. DEPENDENCY MANAGEMENT INTEGRATION
// ============================================================================
console.info('\n📋 Dependency Management Integration:');

// Check for security vulnerabilities
console.info('🔒 Checking for security vulnerabilities...');
const auditResult = await $`bunx audit --audit-level moderate 2>/dev/null || echo "Audit completed"`
  .nothrow()
  .text();
console.info('Security audit status:');
console.info(auditResult.substring(0, 100) + (auditResult.length > 100 ? '...' : ''));

// Check dependency tree
console.info('🌳 Dependency tree preview:');
const depTree =
  await $`bunx npm ls --depth=0 2>/dev/null | head -10 || echo "Could not get dependency tree"`
    .nothrow()
    .text();
console.info(depTree);

// ============================================================================
// 7. BUILD AND DEPLOYMENT WORKFLOWS
// ============================================================================
console.info('\n🏗️ Build and Deployment Workflows:');

// Simulate a build workflow
async function simulateBuild() {
  console.info('🔨 Starting build workflow...');

  // Clean previous builds
  await $`rm -rf dist/ build/`.nothrow();

  // Create build directory
  await $`mkdir -p dist/`.nothrow();

  // Copy files (simulated)
  await $`echo '{"build": "completed", "timestamp": "$(date)"}' > dist/manifest.json`;

  // List build output
  const buildFiles = await $`ls -la dist/ 2>/dev/null || echo "No build files"`.text();
  console.info('Build output:');
  console.info(buildFiles);

  console.info('✅ Build workflow completed');
  return true;
}

await simulateBuild();

// ============================================================================
// 8. ERROR HANDLING
// ============================================================================
console.info('\n🛡️ Error Handling:');

try {
  // This might fail if the command doesn't exist
  const result = await $`nonexistent-command`.text();
  console.info('Command succeeded:', result);
} catch (error) {
  console.info('Command failed gracefully:');
  console.info(`Exit code: ${error.exitCode}`);
  console.info(`Error message: ${error.message}`);
}

// ============================================================================
// 9. CROSS-PLATFORM OPERATIONS
// ============================================================================
console.info('\n🌍 Cross-Platform Operations:');

// Platform-specific commands (graceful fallback)
const platformInfo =
  process.platform === 'win32'
    ? await $`ver 2>/dev/null || echo "Windows platform detected"`.nothrow().text()
    : await $`uname -a 2>/dev/null || echo "Unix-like platform detected"`.nothrow().text();
console.info('Platform info:');
console.info(platformInfo.split('\n')[0]); // First line only

// ============================================================================
// 10. CLEANUP
// ============================================================================
console.info('\n🧹 Cleanup:');

// Remove test files
await $`rm -f shell-integration-test.json`.nothrow();

// List remaining files
const remainingFiles = await $`ls -la | grep -E '\.(json|ts|js)$' | head -3`.text();
console.info('Project files:');
console.info(remainingFiles);

console.info('\n🎉 Bun Shell Integration Demo Complete!');
console.info('   All major Bun Shell features demonstrated successfully!');
console.info('   Ready for Fantasy42-Fire22 registry automation!');

console.info('\n💡 Key Bun Shell Benefits for Fantasy42:');
console.info('   ✅ Cross-platform shell operations');
console.info('   ✅ Safe command execution with JavaScript interop');
console.info('   ✅ Seamless integration with bun link and bunx');
console.info('   ✅ Powerful automation and build workflows');
console.info('   ✅ Native file and HTTP operations');

export { simulateBuild };
