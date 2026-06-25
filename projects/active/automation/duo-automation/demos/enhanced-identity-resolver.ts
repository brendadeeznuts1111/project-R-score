#!/usr/bin/env bun

/**
 * Enhanced Identity Resolver Example
 * Demonstrates the new fail-safe security features, retry logic, and monitoring
 */

import { CrossPlatformIdentityResolver } from '../src/patterns/identity-resolver.js';

async function demonstrateEnhancedResolver() {
  console.info('🔐 Enhanced Identity Resolver Demo');
  console.info('=====================================\n');

  // Example 1: Default secure configuration (FAIL_SAFE)
  console.info('1. Testing with default FAIL_SAFE configuration:');
  const secureResolver = new CrossPlatformIdentityResolver();
  
  try {
    const result = await secureResolver.resolveIdentity('+15551234567');
    console.info('✅ Success:', {
      phone: result.phone,
      isSynthetic: result.isSynthetic,
      syntheticScore: result.syntheticScore,
      riskFactors: result.riskFactors,
      retryCount: result.retryCount
    });
  } catch (error: any) {
    console.info('❌ Failed:', error?.message || error);
  }

  console.info('\n2. Testing with custom FAIL_OPEN configuration:');
  const permissiveResolver = new CrossPlatformIdentityResolver({
    onAnalysisFailure: 'FAIL_OPEN',
    maxRetries: 2,
    retryDelayMs: 500,
    enableMonitoring: true
  });

  try {
    const result = await permissiveResolver.resolveIdentity('+15551234568');
    console.info('✅ Success:', {
      phone: result.phone,
      isSynthetic: result.isSynthetic,
      syntheticScore: result.syntheticScore,
      riskFactors: result.riskFactors,
      retryCount: result.retryCount
    });
  } catch (error: any) {
    console.info('❌ Failed:', error?.message || error);
  }

  console.info('\n3. Testing health status:');
  const healthStatus = await secureResolver.getHealthStatus();
  console.info('Health Status:', healthStatus);

  console.info('\n4. Runtime configuration update:');
  secureResolver.updateFallbackConfig({
    maxRetries: 5,
    retryDelayMs: 2000
  });
  console.info('Configuration updated successfully');

  console.info('\n5. Testing with THROW_ERROR configuration:');
  const strictResolver = new CrossPlatformIdentityResolver({
    onAnalysisFailure: 'THROW_ERROR',   
    maxRetries: 1,  
    enableMonitoring: true
  });

  try {
    const result = await strictResolver.resolveIdentity('+15551234569');
    console.info('✅ Unexpected success:', result);
  } catch (error: any) {
    console.info('❌ Expected failure (THROW_ERROR mode):', error?.message || error);
  }

  console.info('\n🎯 Key Security Improvements:');
  console.info('- ✅ Fail-safe defaults (block on uncertainty)');
  console.info('- ✅ Configurable retry logic with exponential backoff');
  console.info('- ✅ Enhanced error correlation with unique error IDs');
  console.info('- ✅ Structured monitoring and audit logging');
  console.info('- ✅ Runtime configuration updates');
  console.info('- ✅ Health status monitoring');
}

// Run the demonstration
demonstrateEnhancedResolver().catch(console.error);
