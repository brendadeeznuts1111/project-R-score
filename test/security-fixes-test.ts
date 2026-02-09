// test/security-fixes-test.ts - Comprehensive test for critical security fixes
// Tests all the critical issues that were identified and fixed

import { enhancedSecurityManager } from '../lib/security/enhanced-security-manager';
import { securityConfig } from '../lib/security/config-manager';
import { secretManager } from '../barbershop/lib/secrets/core/secrets';

async function testAsyncInitializationFix(): Promise<boolean> {
  console.log('🧪 Testing Async Initialization Fix...');
  
  try {
    // Create a new instance to test initialization
    const manager = enhancedSecurityManager;
    
    // Test that we can call methods without waiting for constructor
    // This should work now with the proper async initialization pattern
    const health = await manager.healthCheck();
    
    // Check that initialization status is properly tracked
    if (health.initializationStatus === 'completed' || health.initializationStatus === 'failed') {
      console.log('✅ Async initialization fix: PASSED');
      return true;
    } else {
      console.log('❌ Async initialization fix: FAILED - Invalid initialization status');
      return false;
    }
  } catch (error) {
    console.log(`❌ Async initialization fix: FAILED - ${error.message}`);
    return false;
  }
}

async function testBasicAuthSecurityFix(): Promise<boolean> {
  console.log('🧪 Testing Basic Auth Security Fix...');
  
  try {
    // Set production environment to test security fix
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    try {
      // This should fail in production with our security fix
      await secretManager.getSecret('test', 'service');
      console.log('❌ Basic Auth security fix: FAILED - Should have thrown error in production');
      return false;
    } catch (error) {
      if (error.message.includes('Basic Authentication is not allowed in production')) {
        console.log('✅ Basic Auth security fix: PASSED');
        return true;
      } else {
        console.log(`❌ Basic Auth security fix: FAILED - Wrong error: ${error.message}`);
        return false;
      }
    } finally {
      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    }
  } catch (error) {
    console.log(`❌ Basic Auth security fix: FAILED - ${error.message}`);
    return false;
  }
}

async function testMethodNamingFix(): Promise<boolean> {
  console.log('🧪 Testing Method Naming Fix...');
  
  try {
    // Test that the renamed methods exist and work correctly
    const secretsInstance = secretManager as any;
    
    // Check that the old method doesn't exist (or is renamed)
    if (typeof secretsInstance.getR2Credentials === 'function') {
      console.log('❌ Method naming fix: FAILED - Old method still exists');
      return false;
    }
    
    // Check that the new methods exist
    if (typeof secretsInstance.getR2CredentialsFromEnvironment !== 'function') {
      console.log('❌ Method naming fix: FAILED - New environment method missing');
      return false;
    }
    
    if (typeof secretsInstance.getR2CredentialsFromSecretsStore !== 'function') {
      console.log('❌ Method naming fix: FAILED - New secrets store method missing');
      return false;
    }
    
    console.log('✅ Method naming fix: PASSED');
    return true;
  } catch (error) {
    console.log(`❌ Method naming fix: FAILED - ${error.message}`);
    return false;
  }
}

async function testInputValidationFix(): Promise<boolean> {
  console.log('🧪 Testing Input Validation Fix...');
  
  try {
    // Test invalid parameters
    const result1 = securityConfig.isFeatureEnabled('' as any, 'test');
    if (result1 !== false) {
      console.log('❌ Input validation fix: FAILED - Should return false for empty category');
      return false;
    }
    
    const result2 = securityConfig.isFeatureEnabled('security' as any, '');
    if (result2 !== false) {
      console.log('❌ Input validation fix: FAILED - Should return false for empty feature');
      return false;
    }
    
    // Test invalid config updates
    try {
      securityConfig.updateConfig(null as any);
      console.log('❌ Input validation fix: FAILED - Should throw error for null updates');
      return false;
    } catch (error) {
      if (!error.message.includes('Invalid configuration updates')) {
        console.log(`❌ Input validation fix: FAILED - Wrong error message: ${error.message}`);
        return false;
      }
    }
    
    console.log('✅ Input validation fix: PASSED');
    return true;
  } catch (error) {
    console.log(`❌ Input validation fix: FAILED - ${error.message}`);
    return false;
  }
}

async function testErrorHandlingFix(): Promise<boolean> {
  console.log('🧪 Testing Error Handling Fix...');
  
  try {
    // Test feature flag error handling
    const result = enhancedSecurityManager.isFeatureEnabled('INVALID_FEATURE_NAME');
    if (result !== false) {
      console.log('❌ Error handling fix: FAILED - Should return false for invalid feature');
      return false;
    }
    
    // Test health check error handling
    const health = await enhancedSecurityManager.healthCheck();
    if (!health.issues || !Array.isArray(health.issues)) {
      console.log('❌ Error handling fix: FAILED - Health check should handle errors gracefully');
      return false;
    }
    
    console.log('✅ Error handling fix: PASSED');
    return true;
  } catch (error) {
    console.log(`❌ Error handling fix: FAILED - ${error.message}`);
    return false;
  }
}

async function testSecretOperationsFix(): Promise<boolean> {
  console.log('🧪 Testing Secret Operations Fix...');
  
  try {
    // Test input validation in secret operations
    try {
      await enhancedSecurityManager.setSecret('', 'test', 'value');
      console.log('❌ Secret operations fix: FAILED - Should validate empty service');
      return false;
    } catch (error) {
      if (!error.message.includes('Invalid parameters')) {
        console.log(`❌ Secret operations fix: FAILED - Wrong validation error: ${error.message}`);
        return false;
      }
    }
    
    try {
      await enhancedSecurityManager.setSecret('test', '', 'value');
      console.log('❌ Secret operations fix: FAILED - Should validate empty name');
      return false;
    } catch (error) {
      if (!error.message.includes('Invalid parameters')) {
        console.log(`❌ Secret operations fix: FAILED - Wrong validation error: ${error.message}`);
        return false;
      }
    }
    
    console.log('✅ Secret operations fix: PASSED');
    return true;
  } catch (error) {
    console.log(`❌ Secret operations fix: FAILED - ${error.message}`);
    return false;
  }
}

async function runAllTests(): Promise<void> {
  console.log('🚀 Running Critical Security Fixes Tests\\n');
  
  const tests = [
    { name: 'Async Initialization Fix', test: testAsyncInitializationFix },
    { name: 'Basic Auth Security Fix', test: testBasicAuthSecurityFix },
    { name: 'Method Naming Fix', test: testMethodNamingFix },
    { name: 'Input Validation Fix', test: testInputValidationFix },
    { name: 'Error Handling Fix', test: testErrorHandlingFix },
    { name: 'Secret Operations Fix', test: testSecretOperationsFix }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const { name, test } of tests) {
    const result = await test();
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }
  
  console.log('\\n📊 Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\\n🎉 All critical security fixes are working correctly!');
  } else {
    console.log('\\n⚠️ Some fixes need attention. Please review the failed tests.');
  }
  
  // Cleanup
  await enhancedSecurityManager.shutdown();
}

// Run tests if this file is executed directly
if (import.meta.main) {
  runAllTests().catch(console.error);
}

export { runAllTests };
