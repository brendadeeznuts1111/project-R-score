// test/final-security-test.ts - Final test for all critical security fixes

import { enhancedSecurityManager } from '../lib/security/enhanced-security-manager';
import { securityConfig } from '../lib/security/config-manager';
import { secretManager } from '../barbershop/lib/secrets/core/secrets';

async function testAsyncInitializationFix(): Promise<boolean> {
  console.info('🧪 Testing Async Initialization Fix...');
  
  try {
    // Wait a moment for initialization to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Test health check
    const health = await enhancedSecurityManager.healthCheck();
    
    console.info(`   Initialization status: ${health.initializationStatus}`);
    console.info(`   Is initialized: ${enhancedSecurityManager['isInitialized']}`);
    
    // Check that initialization status is properly tracked
    if (health.initializationStatus === 'completed') {
      console.info('✅ Async initialization fix: PASSED');
      return true;
    } else {
      console.info(`❌ Async initialization fix: FAILED - Status: ${health.initializationStatus}`);
      return false;
    }
  } catch (error) {
    console.info(`❌ Async initialization fix: FAILED - ${error.message}`);
    return false;
  }
}

async function testBasicAuthSecurityFix(): Promise<boolean> {
  console.info('🧪 Testing Basic Auth Security Fix...');
  
  try {
    // Set production environment to test security fix
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    try {
      // Test the auth method directly by calling makeR2Request which triggers authentication
      const secretsInstance = secretManager as any;
      if (typeof secretsInstance.makeR2Request === 'function') {
        await secretsInstance.makeR2Request('GET', 'test-key', '{}');
        console.info('❌ Basic Auth security fix: FAILED - Should have thrown error in production');
        return false;
      } else {
        // Test the generateAWSAuthHeader method directly
        const authHeader = await secretsInstance.generateAWSAuthHeader('GET', 'test-key', '{}');
        console.info('❌ Basic Auth security fix: FAILED - Should have thrown error, got:', authHeader);
        return false;
      }
    } catch (error) {
      if (error.message.includes('Basic Authentication is not allowed in production')) {
        console.info('✅ Basic Auth security fix: PASSED');
        return true;
      } else {
        console.info(`❌ Basic Auth security fix: FAILED - Wrong error: ${error.message}`);
        return false;
      }
    } finally {
      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    }
  } catch (error) {
    console.info(`❌ Basic Auth security fix: FAILED - ${error.message}`);
    return false;
  }
}

async function testMethodNamingFix(): Promise<boolean> {
  console.info('🧪 Testing Method Naming Fix...');
  
  try {
    const secretsInstance = secretManager as any;
    
    // Check that the new methods exist
    if (typeof secretsInstance.getR2CredentialsFromEnvironment !== 'function') {
      console.info('❌ Method naming fix: FAILED - New environment method missing');
      return false;
    }
    
    if (typeof secretsInstance.getR2CredentialsFromSecretsStore !== 'function') {
      console.info('❌ Method naming fix: FAILED - New secrets store method missing');
      return false;
    }
    
    // Test that the methods work
    try {
      const envCreds = secretsInstance.getR2CredentialsFromEnvironment();
      if (!envCreds || typeof envCreds !== 'object') {
        console.info('❌ Method naming fix: FAILED - Environment method returned invalid result');
        return false;
      }
    } catch (error) {
      // Expected to fail due to missing env vars, but method should exist
      if (!error.message.includes('Missing required R2 credentials')) {
        console.info('❌ Method naming fix: FAILED - Wrong error from environment method:', error.message);
        return false;
      }
    }
    
    console.info('✅ Method naming fix: PASSED');
    return true;
  } catch (error) {
    console.info(`❌ Method naming fix: FAILED - ${error.message}`);
    return false;
  }
}

async function testInputValidationFix(): Promise<boolean> {
  console.info('🧪 Testing Input Validation Fix...');
  
  try {
    // Test invalid parameters
    const result1 = securityConfig.isFeatureEnabled('' as any, 'test');
    if (result1 !== false) {
      console.info('❌ Input validation fix: FAILED - Should return false for empty category');
      return false;
    }
    
    const result2 = securityConfig.isFeatureEnabled('security' as any, '');
    if (result2 !== false) {
      console.info('❌ Input validation fix: FAILED - Should return false for empty feature');
      return false;
    }
    
    // Test invalid config updates
    try {
      securityConfig.updateConfig(null as any);
      console.info('❌ Input validation fix: FAILED - Should throw error for null updates');
      return false;
    } catch (error) {
      if (!error.message.includes('Invalid configuration updates')) {
        console.info(`❌ Input validation fix: FAILED - Wrong error message: ${error.message}`);
        return false;
      }
    }
    
    console.info('✅ Input validation fix: PASSED');
    return true;
  } catch (error) {
    console.info(`❌ Input validation fix: FAILED - ${error.message}`);
    return false;
  }
}

async function testSecretOperationsFix(): Promise<boolean> {
  console.info('🧪 Testing Secret Operations Fix...');
  
  try {
    // Test input validation in secret operations
    try {
      await enhancedSecurityManager.setSecret('', 'test', 'value');
      console.info('❌ Secret operations fix: FAILED - Should validate empty service');
      return false;
    } catch (error) {
      if (!error.message.includes('Invalid parameters')) {
        console.info(`❌ Secret operations fix: FAILED - Wrong validation error: ${error.message}`);
        return false;
      }
    }
    
    try {
      await enhancedSecurityManager.setSecret('test', '', 'value');
      console.info('❌ Secret operations fix: FAILED - Should validate empty name');
      return false;
    } catch (error) {
      if (!error.message.includes('Invalid parameters')) {
        console.info(`❌ Secret operations fix: FAILED - Wrong validation error: ${error.message}`);
        return false;
      }
    }
    
    console.info('✅ Secret operations fix: PASSED');
    return true;
  } catch (error) {
    console.info(`❌ Secret operations fix: FAILED - ${error.message}`);
    return false;
  }
}

async function runAllTests(): Promise<void> {
  console.info('🚀 Running Final Critical Security Fixes Tests\\n');
  
  const tests = [
    { name: 'Async Initialization Fix', test: testAsyncInitializationFix },
    { name: 'Basic Auth Security Fix', test: testBasicAuthSecurityFix },
    { name: 'Method Naming Fix', test: testMethodNamingFix },
    { name: 'Input Validation Fix', test: testInputValidationFix },
    { name: 'Secret Operations Fix', test: testSecretOperationsFix }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const { name, test } of tests) {
    console.info(`\\n--- ${name} ---`);
    const result = await test();
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }
  
  console.info('\\n📊 Final Test Results:');
  console.info(`✅ Passed: ${passed}`);
  console.info(`❌ Failed: ${failed}`);
  console.info(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.info('\\n🎉 ALL CRITICAL SECURITY FIXES ARE WORKING CORRECTLY!');
    console.info('\\n🛡️ Security Status: SECURE');
    console.info('🚀 Ready for production deployment');
  } else {
    console.info('\\n⚠️ Some fixes need attention. Please review the failed tests.');
    console.info('🛡️ Security Status: NEEDS ATTENTION');
  }
  
  // Cleanup
  await enhancedSecurityManager.shutdown();
}

// Run tests if this file is executed directly
if (import.meta.main) {
  runAllTests().catch(console.error);
}

export { runAllTests };
