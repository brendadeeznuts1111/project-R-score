#!/usr/bin/env bun

/**
 * Enhanced Identity Resolver Example
 * Demonstrates the new fail-safe security features, retry logic, and monitoring
 */

import { CrossPlatformIdentityResolver } from '../src/patterns/identity-resolver.js';

async function demonstrateEnhancedResolver() {
  console.log('🔐 Enhanced Identity Resolver Demo');
  console.log('=====================================\n');

  // Example 1: Default secure configuration (FAIL_SAFE)
  console.log('1. Testing with default FAIL_SAFE configuration:');
  const secureResolver = new CrossPlatformIdentityResolver();
  
  try {
    const result = await secureResolver.resolveIdentity('+15551234567');
    console.log('✅ Success:', {
      phone: result.phone,
      isSynthetic: result.isSynthetic,
      syntheticScore: result.syntheticScore,
      riskFactors: result.riskFactors,
      retryCount: result.retryCount
    });
  } catch (error: any) {
    console.log('❌ Failed:', error?.message || error);
  }

  console.log('\n2. Testing with custom FAIL_OPEN configuration:');
  const permissiveResolver = new CrossPlatformIdentityResolver({
    onAnalysisFailure: 'FAIL_OPEN',
    maxRetries: 2,
    retryDelayMs: 500,
    enableMonitoring: true
  });

  try {
    const result = await permissiveResolver.resolveIdentity('+15551234568');
    console.log('✅ Success:', {
      phone: result.phone,
      isSynthetic: result.isSynthetic,
      syntheticScore: result.syntheticScore,
      riskFactors: result.riskFactors,
      retryCount: result.retryCount
    });
  } catch (error: any) {
    console.log('❌ Failed:', error?.message || error);
  }

  console.log('\n3. Testing health status:');
  const healthStatus = await secureResolver.getHealthStatus();
  console.log('Health Status:', healthStatus);

  console.log('\n4. Runtime configuration update:');
  secureResolver.updateFallbackConfig({
    maxRetries: 5,
    retryDelayMs: 2000
  });
  console.log('Configuration updated successfully');

  console.log('\n5. Testing with THROW_ERROR configuration:');
  const strictResolver = new CrossPlatformIdentityResolver({
    onAnalysisFailure: 'THROW_ERROR',   
    maxRetries: 1,  
    enableMonitoring: true
  });

  try {
    const result = await strictResolver.resolveIdentity('+15551234569');
    console.log('✅ Unexpected success:', result);
  } catch (error: any) {
    console.log('❌ Expected failure (THROW_ERROR mode):', error?.message || error);
  }

  console.log('\n🎯 Key Security Improvements:');
  console.log('- ✅ Fail-safe defaults (block on uncertainty)');
  console.log('- ✅ Configurable retry logic with exponential backoff');
  console.log('- ✅ Enhanced error correlation with unique error IDs');
  console.log('- ✅ Structured monitoring and audit logging');
  console.log('- ✅ Runtime configuration updates');
  console.log('- ✅ Health status monitoring');
}

// Run the demonstration
demonstrateEnhancedResolver().catch(console.error);
