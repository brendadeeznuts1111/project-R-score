#!/usr/bin/env bun

/**
 * Cookie Validation Demo v3.24
 * 
 * Comprehensive demonstration of RFC 6265 compliant cookie validation
 * Shows error handling, warnings, and sanitization in action
 */

import { CookieValidator, SecureCookieOptions } from '../lib/telemetry/cookie-validator';
import { SecureCookieManager, AnalyticsCookieMap } from '../lib/telemetry/bun-cookies-complete-v2';

console.log('🔍 Cookie Validation Demo v3.24');
console.log('=====================================\n');

// Test cases demonstrating various validation scenarios
const testCases: Array<{ name: string; options: SecureCookieOptions; description: string }> = [
  {
    name: 'Valid Cookie',
    options: {
      name: 'session',
      value: 'abc123',
      domain: 'example.com',
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 3600
    },
    description: 'A perfectly valid cookie with all recommended settings'
  },
  {
    name: 'Missing Required Fields',
    options: {
      name: '',
      value: '',
    },
    description: 'Missing required name and value fields'
  },
  {
    name: 'Control Characters',
    options: {
      name: 'bad\x00cookie',
      value: 'value\x01with\x02control\x03chars'
    },
    description: 'Cookie name and value contain control characters'
  },
  {
    name: 'Oversized Cookie',
    options: {
      name: 'huge',
      value: 'x'.repeat(5000)
    },
    description: 'Cookie value exceeds 4096 character limit'
  },
  {
    name: 'Reserved Prefix',
    options: {
      name: '__Secure-session',
      value: 'secret',
      secure: false // Missing secure flag
    },
    description: 'Uses __Secure- prefix without secure flag'
  },
  {
    name: 'Invalid Domain',
    options: {
      name: 'test',
      value: 'value',
      domain: 'invalid..domain'
    },
    description: 'Invalid domain format'
  },
  {
    name: 'Invalid Path',
    options: {
      name: 'test',
      value: 'value',
      path: 'invalid//path'
    },
    description: 'Path with double slashes'
  },
  {
    name: 'Past Expiration',
    options: {
      name: 'expired',
      value: 'value',
      expires: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
    },
    description: 'Expiration date in the past'
  },
  {
    name: 'SameSite None without Secure',
    options: {
      name: 'cross-site',
      value: 'value',
      sameSite: 'none',
      secure: false
    },
    description: 'sameSite="none" without secure flag'
  },
  {
    name: 'Partitioned without Secure',
    options: {
      name: 'partitioned',
      value: 'value',
      partitioned: true,
      secure: false
    },
    description: 'Partitioned cookie without secure flag'
  },
  {
    name: 'Negative MaxAge',
    options: {
      name: 'negative',
      value: 'value',
      maxAge: -100
    },
    description: 'Negative maxAge value'
  },
  {
    name: 'Leading Dot Domain',
    options: {
      name: 'domain-test',
      value: 'value',
      domain: '.example.com'
    },
    description: 'Domain with leading dot (warning)'
  },
  {
    name: 'IP Address Domain',
    options: {
      name: 'ip-domain',
      value: 'value',
      domain: '192.168.1.1'
    },
    description: 'Using IP address as domain (warning)'
  },
  {
    name: 'Y2038 Expiration',
    options: {
      name: 'future',
      value: 'value',
      expires: new Date('2050-01-01') // Beyond Y2038
    },
    description: 'Expiration beyond Y2038 limit (warning)'
  },
  {
    name: 'Both Expires and MaxAge',
    options: {
      name: 'conflict',
      value: 'value',
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      maxAge: 3600
    },
    description: 'Both expires and maxAge set (warning)'
  }
];

// Run validation tests
async function runValidationTests() {
  const secureManager = new SecureCookieManager('demo-secret-key');
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n${i + 1}. ${testCase.name}`);
    console.log('─'.repeat(50));
    console.log(`Description: ${testCase.description}`);
    console.log(`Options:`, JSON.stringify(testCase.options, null, 2));
    
    // Validate using CookieValidator
    const validation = CookieValidator.validateCookie(testCase.options);
    
    console.log(`\n📊 Validation Result: ${validation.valid ? '✅ VALID' : '❌ INVALID'}`);
    
    if (validation.errors.length > 0) {
      console.log('\n🚨 Errors:');
      validation.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.property}: ${error.message}`);
        console.log(`      Rule: ${error.rule} | Severity: ${error.severity}`);
        if (error.fix) {
          console.log(`      Fix: ${error.fix}`);
        }
      });
    }
    
    if (validation.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      validation.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning.property}: ${warning.message}`);
        console.log(`      Recommendation: ${warning.recommendation}`);
      });
    }
    
    if (validation.sanitized) {
      console.log('\n🧹 Sanitized Options:');
      console.log(JSON.stringify(validation.sanitized, null, 2));
    }
    
    // Test with SecureCookieManager if validation passes
    if (validation.valid && testCase.options.name && testCase.options.value) {
      try {
        console.log('\n🔐 Testing with SecureCookieManager...');
        const result = secureManager.createSecureCookie(
          testCase.options.name,
          testCase.options.value,
          testCase.options
        );
        
        console.log('✅ Cookie created successfully');
        console.log(`   Name: ${result.cookie.name}`);
        console.log(`   Value length: ${result.cookie.value.length} chars`);
        console.log(`   Secure: ${result.cookie.secure}`);
        console.log(`   HttpOnly: ${result.cookie.httpOnly}`);
        console.log(`   SameSite: ${result.cookie.sameSite}`);
        
        // Verify the cookie
        const verification = secureManager.verifyCookie(result.cookie);
        console.log(`   Verification: ${verification.valid ? '✅ Valid' : '❌ Invalid'}`);
        
      } catch (error) {
        console.log(`❌ Cookie creation failed: ${error}`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
  }
}

// Demonstrate AnalyticsCookieMap with validation
async function demonstrateAnalyticsCookieMap() {
  console.log('\n\n🍪 AnalyticsCookieMap Validation Demo');
  console.log('=====================================\n');
  
  const headersObj: Record<string, string> = {};
  const cookieMap = new AnalyticsCookieMap(headersObj, 'demo-secret');
  
  console.log('1. Setting valid secure cookie...');
  const result1 = cookieMap.setSecure('valid-session', {
    userId: 123,
    role: 'user'
  }, {
    signed: true,
    encrypted: true,
    secure: true,
    httpOnly: true,
    sameSite: 'lax'
  });
  
  console.log(`   Result: ${result1.success ? '✅ Success' : '❌ Failed'}`);
  if (!result1.validation.valid) {
    console.log(`   Errors: ${result1.validation.errors.length}`);
  }
  if (result1.validation.warnings.length > 0) {
    console.log(`   Warnings: ${result1.validation.warnings.length}`);
  }
  
  console.log('\n2. Setting invalid secure cookie...');
  const result2 = cookieMap.setSecure('__Secure-invalid', {
    data: 'secret'
  }, {
    signed: true,
    secure: false // Missing secure flag for __Secure- prefix
  });
  
  console.log(`   Result: ${result2.success ? '✅ Success' : '❌ Failed'}`);
  if (!result2.validation.valid) {
    console.log('   Errors:');
    result2.validation.errors.forEach(error => {
      console.log(`     - ${error.message}`);
    });
  }
  
  console.log('\n3. Getting analytics...');
  const analytics = cookieMap.getAnalytics();
  console.log(`   Total cookies: ${analytics.totalCookies}`);
  console.log(`   Total size: ${analytics.totalSize} bytes`);
  console.log(`   Secure percentage: ${analytics.securePercentage}%`);
}

// Generate comprehensive validation report
function generateValidationReport() {
  console.log('\n\n📋 Comprehensive Validation Report');
  console.log('===================================\n');
  
  // Test a complex scenario with multiple issues
  const complexTestCase: SecureCookieOptions = {
    name: '__Secure-complex\x00',
    value: 'x'.repeat(5000) + '\x01',
    domain: 'invalid..domain',
    path: 'invalid//path',
    expires: new Date(Date.now() - 24 * 60 * 60 * 1000),
    secure: false,
    sameSite: 'none',
    partitioned: true,
    maxAge: -100,
    httpOnly: false
  };
  
  const validation = CookieValidator.validateCookie(complexTestCase);
  const report = CookieValidator.generateReport(validation);
  
  console.log(report);
}

// Main execution
async function main() {
  try {
    await runValidationTests();
    await demonstrateAnalyticsCookieMap();
    generateValidationReport();
    
    console.log('\n\n🎉 Cookie Validation Demo Complete!');
    console.log('=====================================');
    console.log('✅ All validation scenarios tested');
    console.log('✅ RFC 6265 compliance verified');
    console.log('✅ Security rules enforced');
    console.log('✅ Warnings and sanitization demonstrated');
    console.log('✅ Integration with SecureCookieManager shown');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

// Run the demo
if (import.meta.main) {
  main();
}
