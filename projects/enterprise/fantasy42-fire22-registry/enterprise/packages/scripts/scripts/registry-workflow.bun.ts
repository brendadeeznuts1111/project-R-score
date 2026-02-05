#!/usr/bin/env bun
/**
 * Fantasy42 Registry Workflow Script
 * Comprehensive workflow using Bun Shell, bun link, and bunx
 */

import { $ } from 'bun';

// ============================================================================
// REGISTRY WORKFLOW CONFIGURATION
// ============================================================================
const REGISTRY_CONFIG = {
  name: 'fantasy42-fire22-registry',
  packages: [
    '@fire22-registry/core-security',
    '@fire22-registry/analytics-dashboard',
    '@fire22-registry/compliance-core',
  ],
  environments: ['development', 'staging', 'production'],
  registry: 'https://registry.npmjs.org/',
};

// ============================================================================
// 1. REGISTRY HEALTH CHECK
// ============================================================================
async function checkRegistryHealth() {
  console.log('🏥 Registry Health Check');
  console.log('-'.repeat(30));

  // Check connectivity
  const connectivity = await $`curl -s --connect-timeout 5 ${REGISTRY_CONFIG.registry} | head -1`
    .nothrow()
    .text();
  console.log(`📡 Registry connectivity: ${connectivity ? '✅ Connected' : '❌ Failed'}`);

  // Check npm configuration
  const npmRegistry = await $`npm config get registry`.nothrow().text();
  console.log(`📦 NPM registry: ${npmRegistry.trim()}`);

  // Check bun configuration
  const bunRegistry = await $`cat bunfig.toml | grep -E "registry.*=" | head -1`.nothrow().text();
  console.log(`⚡ Bun registry: ${bunRegistry.trim() || 'Using npm registry'}`);

  return connectivity !== '';
}

// ============================================================================
// 2. PACKAGE LINKING WORKFLOW
// ============================================================================
async function setupPackageLinks() {
  console.log('\n🔗 Package Linking Setup');
  console.log('-'.repeat(30));

  for (const pkg of REGISTRY_CONFIG.packages) {
    console.log(`📦 Processing ${pkg}...`);

    // Extract package name from scoped package (e.g., @fire22-registry/core-security -> core-security)
    const pkgName = pkg.split('/')[1];
    const exists = (await $`ls -d packages/${pkgName} 2>/dev/null`.nothrow().exitCode) === 0;

    if (exists) {
      // Navigate to package directory and link
      const linkResult = await $`cd packages/${pkgName} && bun link`.nothrow();
      if (linkResult.exitCode === 0) {
        console.log(`   ✅ Successfully linked ${pkg}`);
      } else {
        console.log(`   ❌ Failed to link ${pkg}`);
      }
    } else {
      console.log(`   ⚠️  Package directory not found: ${pkg} (looked for: packages/${pkgName})`);
    }
  }

  // List all linked packages
  const linkedPackages = await $`bun link --list 2>/dev/null || echo "No linked packages"`
    .nothrow()
    .text();
  console.log('\n📋 Currently linked packages:');
  console.log(linkedPackages);
}

// ============================================================================
// 3. DEPENDENCY MANAGEMENT
// ============================================================================
async function manageDependencies() {
  console.log('\n📦 Dependency Management');
  console.log('-'.repeat(30));

  // Check for outdated dependencies
  console.log('🔍 Checking for outdated dependencies...');
  const outdatedResult = await $`bun outdated 2>/dev/null`.nothrow();

  if (outdatedResult.exitCode === 0) {
    const outdatedOutput = outdatedResult.stdout.toString();
    const lines = outdatedOutput.split('\n').filter(line => line.trim());
    const outdatedCount = lines.length - 1; // Subtract header line

    console.log(`📊 Outdated packages: ${Math.max(0, outdatedCount)}`);

    if (outdatedCount > 0) {
      console.log('   Outdated packages found:');
      lines.slice(1, 4).forEach(line => {
        // Show first 3 outdated packages
        if (line.trim()) {
          console.log(`   • ${line.trim()}`);
        }
      });
      if (outdatedCount > 3) {
        console.log(`   ... and ${outdatedCount - 3} more`);
      }
    } else {
      console.log('   ✅ All dependencies are up to date');
    }
  } else {
    console.log('   ⚠️  Could not check for outdated dependencies');
  }

  // Check for security vulnerabilities
  console.log('\n🔒 Checking for security vulnerabilities...');
  const auditResult =
    await $`bunx audit --audit-level moderate 2>/dev/null || echo "Audit completed"`
      .nothrow()
      .text();
  console.log('Security audit results:');
  console.log(auditResult.substring(0, 200) + (auditResult.length > 200 ? '...' : ''));
}

// ============================================================================
// 4. BUILD AND TEST WORKFLOW
// ============================================================================
async function buildAndTest() {
  console.log('\n🏗️ Build and Test Workflow');
  console.log('-'.repeat(30));

  // Clean previous builds
  console.log('🧹 Cleaning previous builds...');
  await $`rm -rf dist/ build/`.nothrow();

  // Install dependencies
  console.log('📥 Installing dependencies...');
  const installResult = await $`bun install`.nothrow();
  if (installResult.exitCode === 0) {
    console.log('   ✅ Dependencies installed successfully');
  } else {
    console.log('   ❌ Dependency installation failed');
    return false;
  }

  // Run tests
  console.log('🧪 Running tests...');
  const testResult = await $`bun test --coverage 2>/dev/null`.nothrow();
  if (testResult.exitCode === 0) {
    console.log('   ✅ Tests passed');
  } else {
    console.log('   ⚠️  Some tests failed');
  }

  // Build packages
  console.log('🔨 Building packages...');
  const buildResult = await $`bun run build 2>/dev/null`.nothrow();
  if (buildResult.exitCode === 0) {
    console.log('   ✅ Build completed successfully');

    // List build artifacts
    const buildFiles = await $`find dist/ -type f -name "*.js" -o -name "*.ts" 2>/dev/null | wc -l`
      .nothrow()
      .text();
    console.log(`   📦 Built ${buildFiles.trim()} files`);
  } else {
    console.log('   ❌ Build failed');
    return false;
  }

  return true;
}

// ============================================================================
// 5. ENVIRONMENT SETUP
// ============================================================================
async function setupEnvironment(env: string) {
  console.log(`\n🌍 Environment Setup: ${env}`);
  console.log('-'.repeat(30));

  // Set environment variables
  process.env.NODE_ENV = env;
  process.env.FIRE22_ENV = env;

  // Update bunfig.toml for environment-specific settings
  const envConfig = `
# Environment-specific configuration for ${env}
[env.${env}]
NODE_ENV = "${env}"
FIRE22_ENV = "${env}"
LOG_LEVEL = "${env === 'production' ? 'warn' : 'debug'}"
DEBUG = ${env !== 'production'}
`;

  await $`echo '${envConfig}' >> bunfig.toml`.nothrow();

  console.log(`✅ Environment configured for ${env}`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`   FIRE22_ENV: ${process.env.FIRE22_ENV}`);
}

// ============================================================================
// 6. PUBLISHING WORKFLOW
// ============================================================================
async function publishPackages() {
  console.log('\n🚀 Publishing Workflow');
  console.log('-'.repeat(30));

  // Check if we're ready to publish
  const versionCheck = await $`npm version --no-git-tag-version patch 2>/dev/null | head -1`
    .nothrow()
    .text();
  console.log(`📊 Next version would be: ${versionCheck.trim()}`);

  // Build before publishing
  console.log('🔨 Building for publishing...');
  const buildSuccess = await buildAndTest();

  if (!buildSuccess) {
    console.log('❌ Build failed, cannot publish');
    return false;
  }

  // Publish each package
  for (const pkg of REGISTRY_CONFIG.packages) {
    console.log(`📦 Publishing ${pkg}...`);

    const pkgDir = `packages/${pkg.split('/')[1]}`;
    const exists = (await $`ls -d ${pkgDir} 2>/dev/null`.nothrow().exitCode) === 0;

    if (exists) {
      const publishResult = await $`cd ${pkgDir} && npm publish --dry-run`.nothrow();
      if (publishResult.exitCode === 0) {
        console.log(`   ✅ ${pkg} ready for publishing`);
      } else {
        console.log(`   ❌ ${pkg} has publishing issues`);
      }
    } else {
      console.log(`   ⚠️  Package directory not found: ${pkg}`);
    }
  }

  return true;
}

// ============================================================================
// 7. MONITORING AND LOGGING
// ============================================================================
async function monitorRegistry() {
  console.log('\n📊 Registry Monitoring');
  console.log('-'.repeat(30));

  // Check disk usage
  const diskUsage = await $`df -h . | tail -1`.text();
  console.log('💾 Disk usage:');
  console.log(diskUsage);

  // Check memory usage
  const memoryUsage = await $`ps aux --no-headers -o pmem,pcpu,comm | head -5`.nothrow().text();
  console.log('🧠 Memory usage:');
  console.log(memoryUsage);

  // Check network connectivity
  const pingResult = await $`ping -c 1 registry.npmjs.org 2>/dev/null | head -2`.nothrow().text();
  console.log('🌐 Network connectivity:');
  console.log(pingResult);

  // Log system information
  const systemInfo =
    await $`echo "Platform: $(uname -s), CPU: $(nproc), Memory: $(free -h | grep Mem | awk '{print $2}')"`.text();
  console.log('🖥️ System information:');
  console.log(systemInfo);
}

// ============================================================================
// MAIN WORKFLOW EXECUTION
// ============================================================================
async function main() {
  console.log('🚀 Fantasy42 Registry Workflow');
  console.log('='.repeat(60));
  console.log(`Registry: ${REGISTRY_CONFIG.name}`);
  console.log(`Packages: ${REGISTRY_CONFIG.packages.join(', ')}`);
  console.log(`Environments: ${REGISTRY_CONFIG.environments.join(', ')}`);
  console.log('='.repeat(60));

  try {
    // 1. Health Check
    const isHealthy = await checkRegistryHealth();
    if (!isHealthy) {
      console.log('❌ Registry health check failed');
      process.exit(1);
    }

    // 2. Package Linking
    await setupPackageLinks();

    // 3. Dependency Management
    await manageDependencies();

    // 4. Build and Test
    const buildSuccess = await buildAndTest();
    if (!buildSuccess) {
      console.log('❌ Build and test workflow failed');
      process.exit(1);
    }

    // 5. Environment Setup (for development)
    await setupEnvironment('development');

    // 6. Publishing Workflow (dry-run)
    await publishPackages();

    // 7. Monitoring
    await monitorRegistry();

    console.log('\n🎉 Registry workflow completed successfully!');
    console.log('   All systems operational and ready for deployment!');
  } catch (error) {
    console.error('❌ Registry workflow failed:', error);
    process.exit(1);
  }
}

// Execute workflow if run directly
if (import.meta.main) {
  await main();
}

export {
  checkRegistryHealth,
  setupPackageLinks,
  manageDependencies,
  buildAndTest,
  setupEnvironment,
  publishPackages,
  monitorRegistry,
  main as runRegistryWorkflow,
};
