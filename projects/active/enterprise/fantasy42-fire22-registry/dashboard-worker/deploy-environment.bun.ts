#!/usr/bin/env bun

/**
 * Fire22 Dashboard Environment Deployment Workflow
 * Demonstrates bun pm integration for environment management
 */

import { execSync } from 'child_process';

console.info('🚀 Fire22 Dashboard Environment Deployment Workflow\n');

// Step 1: Pre-deployment validation
console.info('1️⃣ Pre-deployment Environment Validation...');
try {
  execSync('bun run env:validate', { stdio: 'inherit' });
  console.info('✅ Environment validation passed');
} catch (error) {
  console.info('❌ Environment validation failed - deployment aborted');
  process.exit(1);
}

// Step 2: Security audit
console.info('\n2️⃣ Security Audit...');
try {
  execSync('bun run env:audit', { stdio: 'inherit' });
  console.info('✅ Security audit completed');
} catch (error) {
  console.info('⚠️  Security audit found issues - review before deployment');
}

// Step 3: Performance check
console.info('\n3️⃣ Performance Check...');
try {
  execSync('bun run env:performance', { stdio: 'inherit' });
  console.info('✅ Performance check completed');
} catch (error) {
  console.info('❌ Performance check failed');
  process.exit(1);
}

// Step 4: Environment status
console.info('\n4️⃣ Environment Status Check...');
try {
  execSync('bun run env:check', { stdio: 'inherit' });
  console.info('✅ Environment status verified');
} catch (error) {
  console.info('❌ Environment status check failed');
  process.exit(1);
}

// Step 5: Package.json configuration management
console.info('\n5️⃣ Package.json Configuration Management...');
try {
  console.info('Current environment configuration:');
  const env = execSync('bun pm pkg get config.environment', { encoding: 'utf8' });
  const port = execSync('bun pm pkg get config.port', { encoding: 'utf8' });
  const version = execSync('bun pm pkg get version', { encoding: 'utf8' });

  console.info(`   Environment: ${env.trim()}`);
  console.info(`   Port: ${port.trim()}`);
  console.info(`   Version: ${version.trim()}`);

  console.info('✅ Configuration management working');
} catch (error) {
  console.info('❌ Configuration management failed');
  process.exit(1);
}

// Step 6: Integration test
console.info('\n6️⃣ Integration Test...');
try {
  execSync('bun run env:integration', { stdio: 'inherit' });
  console.info('✅ Integration test passed');
} catch (error) {
  console.info('❌ Integration test failed - deployment aborted');
  process.exit(1);
}

// Step 7: Deployment ready
console.info('\n🎉 Environment Deployment Ready!');
console.info('\n📊 Deployment Summary:');
console.info('   ✅ Environment validation: PASSED');
console.info('   ✅ Security audit: COMPLETED');
console.info('   ✅ Performance check: PASSED');
console.info('   ✅ Environment status: VERIFIED');
console.info('   ✅ Configuration management: WORKING');
console.info('   ✅ Integration test: PASSED');

console.info('\n🚀 Ready to deploy with:');
console.info('   bun run deploy:staging    # Deploy to staging');
console.info('   bun run deploy:production # Deploy to production');
console.info('   bun run deploy            # Deploy to default environment');

console.info('\n💡 Environment CLI Commands Available:');
console.info('   bun run env:check         # Check status');
console.info('   bun run env:validate     # Validate config');
console.info('   bun run env:audit        # Security audit');
console.info('   bun run env:performance  # Performance check');
console.info('   bun run env:integration  # Full integration test');
console.info('   bun run env:test         # Run all tests');

console.info('\n🔧 Configuration Management:');
console.info('   bun pm pkg get config.environment');
console.info('   bun pm pkg set config.environment="staging"');
console.info('   bun pm pkg get metadata.environment.cliCommands');
