// test/security-enhancements-test.ts - Phase 2 Security Enhancements Test
// Tests rate limiting, input validation, correlation tracking, and enhanced audit logging

import { enhancedSecurityManager } from '../lib/security/enhanced-security-manager';

async function testRateLimiting(): Promise<boolean> {
  console.info('🧪 Testing Rate Limiting...');
  
  try {
    const manager = enhancedSecurityManager as any;
    
    // Test rate limiting works
    const promises = Array(60).fill(null).map((_, i) => 
      manager.getSecret('test-service', 'test-key').catch(error => {
        if (error.message.includes('Rate limit exceeded')) {
          return 'RATE_LIMITED';
        }
        throw error;
      })
    );
    
    const results = await Promise.allSettled(promises);
    const rateLimitedCount = results.filter(r => 
      r.status === 'fulfilled' && r.value === 'RATE_LIMITED'
    ).length;
    
    if (rateLimitedCount > 0) {
      console.info('✅ Rate limiting: PASSED');
      return true;
    } else {
      console.info('❌ Rate limiting: FAILED - No rate limits triggered');
      return false;
    }
  } catch (error) {
    console.info(`❌ Rate limiting: FAILED - ${error.message}`);
    return false;
  }
}

async function testInputValidation(): Promise<boolean> {
  console.info('🧪 Testing Input Validation...');
  
  try {
    const manager = enhancedSecurityManager as any;
    
    // Test invalid service name
    try {
      await manager.setSecret('', 'valid-name', 'valid-value');
      console.info('❌ Input validation: FAILED - Empty service name allowed');
      return false;
    } catch (error) {
      if (!error.message.includes('Invalid service')) {
        console.info('❌ Input validation: FAILED - Wrong error for empty service');
        return false;
      }
    }
    
    // Test invalid service characters
    try {
      await manager.setSecret('invalid@service', 'valid-name', 'valid-value');
      console.info('❌ Input validation: FAILED - Invalid service characters allowed');
      return false;
    } catch (error) {
      if (!error.message.includes('Invalid service')) {
        console.info('❌ Input validation: FAILED - Wrong error for invalid service characters');
        return false;
      }
    }
    
    // Test invalid name characters
    try {
      await manager.setSecret('valid-service', 'invalid@name', 'valid-value');
      console.info('❌ Input validation: FAILED - Invalid name characters allowed');
      return false;
    } catch (error) {
      if (!error.message.includes('Invalid name')) {
        console.info('❌ Input validation: FAILED - Wrong error for invalid name characters');
        return false;
      }
    }
    
    // Test value too long
    try {
      const longValue = 'x'.repeat(10001);
      await manager.setSecret('valid-service', 'valid-name', longValue);
      console.info('❌ Input validation: FAILED - Value too long allowed');
      return false;
    } catch (error) {
      if (!error.message.includes('value too long')) {
        console.info('❌ Input validation: FAILED - Wrong error for value too long');
        return false;
      }
    }
    
    console.info('✅ Input validation: PASSED');
    return true;
  } catch (error) {
    console.info(`❌ Input validation: FAILED - ${error.message}`);
    return false;
  }
}

async function testCorrelationTracking(): Promise<boolean> {
  console.info('🧪 Testing Correlation Tracking...');
  
  try {
    const manager = enhancedSecurityManager as any;
    
    // Test correlation ID generation
    const correlationId1 = manager.generateCorrelationId('test-operation');
    const correlationId2 = manager.generateCorrelationId('test-operation');
    
    if (typeof correlationId1 !== 'string' || typeof correlationId2 !== 'string') {
      console.info('❌ Correlation tracking: FAILED - Correlation IDs not strings');
      return false;
    }
    
    if (correlationId1 === correlationId2) {
      console.info('❌ Correlation tracking: FAILED - Correlation IDs not unique');
      return false;
    }
    
    if (!correlationId1.includes('test-operation')) {
      console.info('❌ Correlation tracking: FAILED - Correlation ID missing operation name');
      return false;
    }
    
    // Test operation tracking
    manager.startOperationTracking(correlationId1, 'test-op');
    const tracking1 = manager.endOperationTracking(correlationId1);
    
    if (!tracking1 || tracking1.operation !== 'test-op' || tracking1.duration < 0) {
      console.info('❌ Correlation tracking: FAILED - Operation tracking not working');
      return false;
    }
    
    console.info('✅ Correlation tracking: PASSED');
    return true;
  } catch (error) {
    console.info(`❌ Correlation tracking: FAILED - ${error.message}`);
    return false;
  }
}

async function testEnhancedAuditLogging(): Promise<boolean> {
  console.info('🧪 Testing Enhanced Audit Logging...');
  
  try {
    const manager = enhancedSecurityManager as any;
    
    // Capture console logs
    const originalLog = console.log;
    let auditLogCaptured = false;
    let auditDataValid = false;
    
    console.log = (...args) => {
      const message = args.join(' ');
      if (message.includes('Security Audit:')) {
        auditLogCaptured = true;
        try {
          const auditData = JSON.parse(message.split('Security Audit: ')[1]);
          if (auditData.event && auditData.correlationId && auditData.timestamp) {
            auditDataValid = true;
          }
        } catch {
          // Invalid JSON
        }
      }
      originalLog(...args);
    };
    
    // Perform an operation that should trigger audit logging
    await manager.getSecret('test-service', 'test-key').catch(() => {});
    
    // Restore console.log
    console.log = originalLog;
    
    if (!auditLogCaptured) {
      console.info('❌ Enhanced audit logging: FAILED - No audit log captured');
      return false;
    }
    
    if (!auditDataValid) {
      console.info('❌ Enhanced audit logging: FAILED - Invalid audit data format');
      return false;
    }
    
    console.info('✅ Enhanced audit logging: PASSED');
    return true;
  } catch (error) {
    console.info(`❌ Enhanced audit logging: FAILED - ${error.message}`);
    return false;
  }
}

async function testSecurityMetrics(): Promise<boolean> {
  console.info('🧪 Testing Security Metrics...');
  
  try {
    const manager = enhancedSecurityManager as any;
    
    const initialMetrics = { ...manager.metrics };
    
    // Perform operations to update metrics
    await manager.getSecret('test-service', 'test-key').catch(() => {});
    await manager.setSecret('test-service', 'test-key', 'test-value').catch(() => {});
    
    const finalMetrics = { ...manager.metrics };
    
    // Check that metrics were updated
    if (finalMetrics.secretOperations > initialMetrics.secretOperations &&
        finalMetrics.securityEvents > initialMetrics.securityEvents &&
        finalMetrics.auditEvents > initialMetrics.auditEvents) {
      console.info('✅ Security metrics: PASSED');
      return true;
    } else {
      console.info('❌ Security metrics: FAILED - Metrics not updated properly');
      return false;
    }
  } catch (error) {
    console.info(`❌ Security metrics: FAILED - ${error.message}`);
    return false;
  }
}

async function runSecurityEnhancementsTests(): Promise<void> {
  console.info('🚀 Running Phase 2 Security Enhancements Tests\\n');
  
  const tests = [
    { name: 'Rate Limiting', test: testRateLimiting },
    { name: 'Input Validation', test: testInputValidation },
    { name: 'Correlation Tracking', test: testCorrelationTracking },
    { name: 'Enhanced Audit Logging', test: testEnhancedAuditLogging },
    { name: 'Security Metrics', test: testSecurityMetrics }
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
  
  console.info('\\n📊 Phase 2 Security Enhancements Test Results:');
  console.info(`✅ Passed: ${passed}`);
  console.info(`❌ Failed: ${failed}`);
  console.info(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.info('\\n🎉 ALL PHASE 2 SECURITY ENHANCEMENTS WORKING PERFECTLY!');
    console.info('\\n🛡️ Enhanced Security Features:');
    console.info('🚫 Rate limiting prevents abuse and DoS attacks');
    console.info('✅ Input validation prevents injection attacks');
    console.info('🔍 Correlation tracking enables distributed tracing');
    console.info('📝 Enhanced audit logging for comprehensive security monitoring');
    console.info('📊 Security metrics for real-time threat detection');
    console.info('\\n🚀 System now has enterprise-grade security with advanced protection');
  } else {
    console.info('\\n⚠️ Some Phase 2 enhancements need attention. Please review the failed tests.');
  }
  
  // Cleanup
  await enhancedSecurityManager.shutdown();
}

// Run tests if this file is executed directly
if (import.meta.main) {
  runSecurityEnhancementsTests().catch(console.error);
}

export { runSecurityEnhancementsTests };
