#!/usr/bin/env bun

/**
 * Fire22 Dashboard Environment Deployment Workflow
 * Demonstrates bun pm integration for environment management
 */

import { execSync } from 'child_process';

console.log('🚀 Fire22 Dashboard Environment Deployment Workflow\n');

// Step 1: Pre-deployment validation
console.log('1️⃣ Pre-deployment Environment Validation...');
try {
  execSync('bun run env:validate', { stdio: 'inherit' });
  console.log('✅ Environment validation passed');
} catch (error) {
  console.log('❌ Environment validation failed - deployment aborted');
  process.exit(1);
}

// Step 2: Security audit
console.log('\n2️⃣ Security Audit...');
try {
  execSync('bun run env:audit', { stdio: 'inherit' });
  console.log('✅ Security audit completed');
} catch (error) {
  console.log('⚠️  Security audit found issues - review before deployment');
}

// Step 3: Performance check
console.log('\n3️⃣ Performance Check...');
try {
  execSync('bun run env:performance', { stdio: 'inherit' });
  console.log('✅ Performance check completed');
} catch (error) {
  console.log('❌ Performance check failed');
  process.exit(1);
}

// Step 4: Environment status
console.log('\n4️⃣ Environment Status Check...');
try {
  execSync('bun run env:check', { stdio: 'inherit' });
  console.log('✅ Environment status verified');
} catch (error) {
  console.log('❌ Environment status check failed');
  process.exit(1);
}

// Step 5: Package.json configuration management
console.log('\n5️⃣ Package.json Configuration Management...');
try {
  console.log('Current environment configuration:');
  const env = execSync('bun pm pkg get config.environment', { encoding: 'utf8' });
  const port = execSync('bun pm pkg get config.port', { encoding: 'utf8' });
  const version = execSync('bun pm pkg get version', { encoding: 'utf8' });

  console.log(`   Environment: ${env.trim()}`);
  console.log(`   Port: ${port.trim()}`);
  console.log(`   Version: ${version.trim()}`);

  console.log('✅ Configuration management working');
} catch (error) {
  console.log('❌ Configuration management failed');
  process.exit(1);
}

// Step 6: Integration test
console.log('\n6️⃣ Integration Test...');
try {
  execSync('bun run env:integration', { stdio: 'inherit' });
  console.log('✅ Integration test passed');
} catch (error) {
  console.log('❌ Integration test failed - deployment aborted');
  process.exit(1);
}

// Step 7: Deployment ready
console.log('\n🎉 Environment Deployment Ready!');
console.log('\n📊 Deployment Summary:');
console.log('   ✅ Environment validation: PASSED');
console.log('   ✅ Security audit: COMPLETED');
console.log('   ✅ Performance check: PASSED');
console.log('   ✅ Environment status: VERIFIED');
console.log('   ✅ Configuration management: WORKING');
console.log('   ✅ Integration test: PASSED');

console.log('\n🚀 Ready to deploy with:');
console.log('   bun run deploy:staging    # Deploy to staging');
console.log('   bun run deploy:production # Deploy to production');
console.log('   bun run deploy            # Deploy to default environment');

console.log('\n💡 Environment CLI Commands Available:');
console.log('   bun run env:check         # Check status');
console.log('   bun run env:validate     # Validate config');
console.log('   bun run env:audit        # Security audit');
console.log('   bun run env:performance  # Performance check');
console.log('   bun run env:integration  # Full integration test');
console.log('   bun run env:test         # Run all tests');

console.log('\n🔧 Configuration Management:');
console.log('   bun pm pkg get config.environment');
console.log('   bun pm pkg set config.environment="staging"');
console.log('   bun pm pkg get metadata.environment.cliCommands');
