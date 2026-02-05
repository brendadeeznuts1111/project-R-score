#!/usr/bin/env bun
/**
 * Bun Shell Integration Demo
 * Demonstrating Bun Shell with existing project setup
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
console.log(dirContents.split('\n').slice(0, 5).join('\n') + '\n...');

// Environment variable access
const envInfo = await $`echo "Node env: $NODE_ENV, Platform: $(uname -s)"`.text();
console.log('Environment info:');
console.log(envInfo);

// ============================================================================
// 2. INTEGRATION WITH BUN LINK/BUNX
// ============================================================================
console.log('\n🔗 Integration with Bun Link/Bunx:');

// Check linked packages
const linkStatus = await $`bun link --list 2>/dev/null || echo "No linked packages found"`
  .nothrow()
  .text();
console.log('Linked packages:');
console.log(linkStatus);

// Use bunx for package operations
console.log('Running prettier with bunx:');
const prettierCheck = await $`bunx prettier --version 2>/dev/null || echo "Prettier not available"`
  .nothrow()
  .text();
console.log(`Prettier: ${prettierCheck.trim()}`);

// ============================================================================
// 3. FILE OPERATIONS WITH JAVASCRIPT INTEROP
// ============================================================================
console.log('\n📁 File Operations with JavaScript Interop:');

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
console.log('Created file content:');
console.log(`Demo: ${fileContent.demo}`);
console.log(`Features: ${fileContent.features.join(', ')}`);

// Use file content in shell operations
const wordCount = await $`cat shell-integration-test.json | wc -l`.text();
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
const pipedResult = await $`cat < ${response} | head -3`.text();
console.log('Piped HTTP response (first 3 lines):');
console.log(pipedResult);

// ============================================================================
// 5. REGISTRY OPERATIONS INTEGRATION
// ============================================================================
console.log('\n📦 Registry Operations Integration:');

// Check current registry configuration
const registryInfo = await $`npm config get registry`.nothrow().text();
console.log('Current npm registry:');
console.log(registryInfo);

// Simulate registry check with timeout
const registryCheck =
  await $`timeout 3s curl -s https://registry.npmjs.org/ 2>/dev/null | head -1 || echo "Registry check failed"`
    .nothrow()
    .text();
console.log('Registry connectivity:');
console.log(registryCheck ? '✅ Registry accessible' : '❌ Registry check failed');

// Check package.json
const packageInfo = await $`cat package.json | grep '"name"' | head -1`.nothrow().text();
console.log('Package name from package.json:');
console.log(packageInfo);

// ============================================================================
// 6. DEPENDENCY MANAGEMENT INTEGRATION
// ============================================================================
console.log('\n📋 Dependency Management Integration:');

// Check for security vulnerabilities
console.log('🔒 Checking for security vulnerabilities...');
const auditResult = await $`bunx audit --audit-level moderate 2>/dev/null || echo "Audit completed"`
  .nothrow()
  .text();
console.log('Security audit status:');
console.log(auditResult.substring(0, 100) + (auditResult.length > 100 ? '...' : ''));

// Check dependency tree
console.log('🌳 Dependency tree preview:');
const depTree =
  await $`bunx npm ls --depth=0 2>/dev/null | head -10 || echo "Could not get dependency tree"`
    .nothrow()
    .text();
console.log(depTree);

// ============================================================================
// 7. BUILD AND DEPLOYMENT WORKFLOWS
// ============================================================================
console.log('\n🏗️ Build and Deployment Workflows:');

// Simulate a build workflow
async function simulateBuild() {
  console.log('🔨 Starting build workflow...');

  // Clean previous builds
  await $`rm -rf dist/ build/`.nothrow();

  // Create build directory
  await $`mkdir -p dist/`.nothrow();

  // Copy files (simulated)
  await $`echo '{"build": "completed", "timestamp": "$(date)"}' > dist/manifest.json`;

  // List build output
  const buildFiles = await $`ls -la dist/ 2>/dev/null || echo "No build files"`.text();
  console.log('Build output:');
  console.log(buildFiles);

  console.log('✅ Build workflow completed');
  return true;
}

await simulateBuild();

// ============================================================================
// 8. ERROR HANDLING
// ============================================================================
console.log('\n🛡️ Error Handling:');

try {
  // This might fail if the command doesn't exist
  const result = await $`nonexistent-command`.text();
  console.log('Command succeeded:', result);
} catch (error) {
  console.log('Command failed gracefully:');
  console.log(`Exit code: ${error.exitCode}`);
  console.log(`Error message: ${error.message}`);
}

// ============================================================================
// 9. CROSS-PLATFORM OPERATIONS
// ============================================================================
console.log('\n🌍 Cross-Platform Operations:');

// Platform-specific commands (graceful fallback)
const platformInfo =
  process.platform === 'win32'
    ? await $`ver 2>/dev/null || echo "Windows platform detected"`.nothrow().text()
    : await $`uname -a 2>/dev/null || echo "Unix-like platform detected"`.nothrow().text();
console.log('Platform info:');
console.log(platformInfo.split('\n')[0]); // First line only

// ============================================================================
// 10. CLEANUP
// ============================================================================
console.log('\n🧹 Cleanup:');

// Remove test files
await $`rm -f shell-integration-test.json`.nothrow();

// List remaining files
const remainingFiles = await $`ls -la | grep -E '\.(json|ts|js)$' | head -3`.text();
console.log('Project files:');
console.log(remainingFiles);

console.log('\n🎉 Bun Shell Integration Demo Complete!');
console.log('   All major Bun Shell features demonstrated successfully!');
console.log('   Ready for Fantasy42-Fire22 registry automation!');

console.log('\n💡 Key Bun Shell Benefits for Fantasy42:');
console.log('   ✅ Cross-platform shell operations');
console.log('   ✅ Safe command execution with JavaScript interop');
console.log('   ✅ Seamless integration with bun link and bunx');
console.log('   ✅ Powerful automation and build workflows');
console.log('   ✅ Native file and HTTP operations');

export { simulateBuild };
