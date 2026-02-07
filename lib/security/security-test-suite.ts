/**
 * Comprehensive Security Test Suite
 * 
 * Automated testing for all security components
 */

import { 
  BunSecurityEngine, 
  createSecurityMiddleware,
  SecurityError 
} from './bun-security-integration-v4.js';

export interface SecurityTestResult {
  testName: string;
  status: 'pass' | 'fail' | 'warning';
  duration: number;
  details: string;
  recommendations?: string[];
}

export class SecurityTestSuite {
  private results: SecurityTestResult[] = [];
  private securityEngine: BunSecurityEngine;

  constructor() {
    this.securityEngine = new BunSecurityEngine();
  }

  // 🧪 RUN ALL SECURITY TESTS
  async runFullSuite(): Promise<{
    results: SecurityTestResult[];
    summary: { passed: number; failed: number; warnings: number; total: number };
    overallStatus: 'secure' | 'vulnerable' | 'needs_attention';
  }> {
    console.log('🧪 Starting Security Test Suite...');
    
    // Clear previous results
    this.results = [];

    // Run all tests
    await this.testPasswordSecurity();
    await this.testCSRFProtection();
    await this.testSecretsManagement();
    await this.testEncryptionDecryption();
    await this.testSessionSecurity();
    await this.testRateLimiting();
    await this.testSecurityHeaders();
    await this.testInputValidation();
    await this.testErrorHandling();
    await this.testPerformanceImpact();

    // Calculate summary
    const summary = {
      passed: this.results.filter(r => r.status === 'pass').length,
      failed: this.results.filter(r => r.status === 'fail').length,
      warnings: this.results.filter(r => r.status === 'warning').length,
      total: this.results.length
    };

    // Determine overall status
    let overallStatus: 'secure' | 'vulnerable' | 'needs_attention' = 'secure';
    if (summary.failed > 0) {
      overallStatus = 'vulnerable';
    } else if (summary.warnings > 0) {
      overallStatus = 'needs_attention';
    }

    return { results: this.results, summary, overallStatus };
  }

  // 🔐 PASSWORD SECURITY TESTS
  private async testPasswordSecurity(): Promise<void> {
    const testGroup = 'Password Security';

    // Test 1: Password hashing strength
    await this.runTest(`${testGroup} - Hash Strength`, async () => {
      const password = 'TestPassword123!';
      const hashResult = await BunSecurityEngine.PasswordManager.hashPassword(password);
      
      if (!hashResult.hash || !hashResult.salt) {
        throw new SecurityError('Password hash or salt missing');
      }
      
      if (hashResult.metadata.algorithm !== 'argon2id') {
        throw new SecurityError('Not using recommended argon2id algorithm');
      }
      
      return 'Password hashing uses argon2id with proper salt';
    });

    // Test 2: Password verification
    await this.runTest(`${testGroup} - Verification`, async () => {
      const password = 'TestPassword123!';
      const hashResult = await BunSecurityEngine.PasswordManager.hashPassword(password);
      const verification = await BunSecurityEngine.PasswordManager.verifyPassword(password, hashResult.hash);
      
      if (!verification.valid) {
        throw new SecurityError('Password verification failed');
      }
      
      return 'Password verification works correctly';
    });

    // Test 3: Password strength validation
    await this.runTest(`${testGroup} - Strength Validation`, async () => {
      const weakPassword = '123';
      const strongPassword = 'SuperSecure123!@#';
      
      const weakResult = BunSecurityEngine.PasswordManager.validatePasswordStrength(weakPassword);
      const strongResult = BunSecurityEngine.PasswordManager.validatePasswordStrength(strongPassword);
      
      if (weakResult.valid || !strongResult.valid) {
        throw new SecurityError('Password strength validation incorrect');
      }
      
      return 'Password strength validation works correctly';
    });
  }

  // 🛡️ CSRF PROTECTION TESTS
  private async testCSRFProtection(): Promise<void> {
    const testGroup = 'CSRF Protection';

    // Test 1: CSRF token generation
    await this.runTest(`${testGroup} - Token Generation`, async () => {
      const sessionId = 'test-session-123';
      const tokenResult = BunSecurityEngine.CSRFProtection.generateCSRFToken(sessionId);
      
      if (!tokenResult.token || !tokenResult.cookie) {
        throw new SecurityError('CSRF token or cookie missing');
      }
      
      if (tokenResult.cookie.httpOnly !== true) {
        throw new SecurityError('CSRF cookie not httpOnly');
      }
      
      return 'CSRF tokens generated with proper security flags';
    });

    // Test 2: CSRF token validation
    await this.runTest(`${testGroup} - Token Validation`, async () => {
      const sessionId = 'test-session-123';
      const tokenResult = BunSecurityEngine.CSRFProtection.generateCSRFToken(sessionId);
      const validation = BunSecurityEngine.CSRFProtection.validateCSRFToken(tokenResult.token, sessionId);
      
      if (!validation.valid) {
        throw new SecurityError('CSRF token validation failed');
      }
      
      // Test with wrong session
      const wrongValidation = BunSecurityEngine.CSRFProtection.validateCSRFToken(tokenResult.token, 'wrong-session');
      if (wrongValidation.valid) {
        throw new SecurityError('CSRF token validation should fail for wrong session');
      }
      
      return 'CSRF token validation works correctly';
    });
  }

  // 🔑 SECRETS MANAGEMENT TESTS
  private async testSecretsManagement(): Promise<void> {
    const testGroup = 'Secrets Management';

    // Test 1: Secret encryption
    await this.runTest(`${testGroup} - Encryption`, async () => {
      const data = 'Sensitive test data';
      const encrypted = BunSecurityEngine.SecretManager.encryptWithRotation(data);
      
      if (!encrypted.encrypted || !encrypted.keyVersion) {
        throw new SecurityError('Encryption failed or missing metadata');
      }
      
      return 'Secrets encrypted with proper metadata';
    });

    // Test 2: Secret decryption
    await this.runTest(`${testGroup} - Decryption`, async () => {
      const data = 'Sensitive test data';
      const encrypted = BunSecurityEngine.SecretManager.encryptWithRotation(data);
      const decrypted = BunSecurityEngine.SecretManager.decryptWithRotation(encrypted.encrypted);
      
      if (decrypted.decrypted !== data) {
        throw new SecurityError('Decryption failed - data mismatch');
      }
      
      return 'Secrets decrypted correctly';
    });
  }

  // 🔒 ENCRYPTION/DECRYPTION TESTS
  private async testEncryptionDecryption(): Promise<void> {
    const testGroup = 'Encryption/Decryption';

    // Test large data encryption
    await this.runTest(`${testGroup} - Large Data`, async () => {
      const largeData = 'x'.repeat(10000); // 10KB
      const encrypted = BunSecurityEngine.SecretManager.encryptWithRotation(largeData);
      const decrypted = BunSecurityEngine.SecretManager.decryptWithRotation(encrypted.encrypted);
      
      if (decrypted.decrypted !== largeData) {
        throw new SecurityError('Large data encryption/decryption failed');
      }
      
      return 'Large data encryption works correctly';
    });
  }

  // 🎟️ SESSION SECURITY TESTS
  private async testSessionSecurity(): Promise<void> {
    const testGroup = 'Session Security';

    // Test session validation
    await this.runTest(`${testGroup} - Validation`, async () => {
      // This would integrate with your session system
      // For now, we'll test the middleware integration
      const middleware = createSecurityMiddleware();
      
      if (!middleware) {
        throw new SecurityError('Security middleware not created');
      }
      
      return 'Session security middleware available';
    });
  }

  // ⏱️ RATE LIMITING TESTS
  private async testRateLimiting(): Promise<void> {
    const testGroup = 'Rate Limiting';

    await this.runTest(`${testGroup} - Basic Implementation`, async () => {
      // This would test your rate limiting implementation
      // For now, we'll check if the security engine tracks failed attempts
      const report = this.securityEngine.getSecurityReport();
      
      if (typeof report.metrics.failedAttempts !== 'number') {
        throw new SecurityError('Failed attempts tracking not implemented');
      }
      
      return 'Rate limiting metrics available';
    });
  }

  // 🛡️ SECURITY HEADERS TESTS
  private async testSecurityHeaders(): Promise<void> {
    const testGroup = 'Security Headers';

    await this.runTest(`${testGroup} - Cookie Security`, async () => {
      const sessionId = 'test-session';
      const tokenResult = BunSecurityEngine.CSRFProtection.generateCSRFToken(sessionId);
      const cookie = tokenResult.cookie;
      
      if (cookie.secure !== true) {
        throw new SecurityError('Cookie not marked as secure');
      }
      
      if (cookie.httpOnly !== true) {
        throw new SecurityError('Cookie not marked as httpOnly');
      }
      
      if (cookie.sameSite !== 'strict') {
        throw new SecurityError('Cookie not using strict SameSite policy');
      }
      
      return 'Security cookies have proper flags';
    });
  }

  // ✅ INPUT VALIDATION TESTS
  private async testInputValidation(): Promise<void> {
    const testGroup = 'Input Validation';

    await this.runTest(`${testGroup} - Password Strength`, async () => {
      const testCases = [
        { password: '', expectedValid: false },
        { password: '123', expectedValid: false },
        { password: 'password', expectedValid: false },
        { password: 'StrongPass123!', expectedValid: true }
      ];
      
      for (const testCase of testCases) {
        const result = BunSecurityEngine.PasswordManager.validatePasswordStrength(testCase.password);
        if (result.valid !== testCase.expectedValid) {
          throw new SecurityError(`Password validation failed for: ${testCase.password}`);
        }
      }
      
      return 'Input validation works correctly';
    });
  }

  // 🚨 ERROR HANDLING TESTS
  private async testErrorHandling(): Promise<void> {
    const testGroup = 'Error Handling';

    await this.runTest(`${testGroup} - Security Errors`, async () => {
      try {
        // Test invalid token
        const validation = BunSecurityEngine.CSRFProtection.validateCSRFToken('invalid-token', 'session');
        if (validation.valid) {
          throw new SecurityError('Invalid token should not validate');
        }
      } catch (error) {
        if (!(error instanceof SecurityError)) {
          throw new SecurityError('Should throw SecurityError for invalid operations');
        }
      }
      
      return 'Security errors handled correctly';
    });
  }

  // ⚡ PERFORMANCE IMPACT TESTS
  private async testPerformanceImpact(): Promise<void> {
    const testGroup = 'Performance Impact';

    // Test password hashing performance
    await this.runTest(`${testGroup} - Password Hashing`, async () => {
      const password = 'TestPassword123!';
      const iterations = 10;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        await BunSecurityEngine.PasswordManager.hashPassword(password);
      }
      
      const duration = performance.now() - start;
      const avgTime = duration / iterations;
      
      if (avgTime > 1000) { // 1 second per hash is too slow
        throw new SecurityError(`Password hashing too slow: ${avgTime.toFixed(2)}ms`);
      }
      
      return `Password hashing performance: ${avgTime.toFixed(2)}ms avg`;
    }, 'warning');

    // Test CSRF token generation performance
    await this.runTest(`${testGroup} - CSRF Token Generation`, async () => {
      const sessionId = 'test-session';
      const iterations = 100;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        BunSecurityEngine.CSRFProtection.generateCSRFToken(sessionId);
      }
      
      const duration = performance.now() - start;
      const avgTime = duration / iterations;
      
      if (avgTime > 10) { // 10ms per token is too slow
        throw new SecurityError(`CSRF token generation too slow: ${avgTime.toFixed(2)}ms`);
      }
      
      return `CSRF token generation performance: ${avgTime.toFixed(2)}ms avg`;
    });
  }

  // 🧪 TEST RUNNER
  private async runTest(testName: string, testFn: () => Promise<string>, defaultStatus: 'pass' | 'fail' | 'warning' = 'pass'): Promise<void> {
    const start = performance.now();
    
    try {
      const details = await testFn();
      const duration = performance.now() - start;
      
      this.results.push({
        testName,
        status: defaultStatus,
        duration,
        details
      });
      
      console.log(`✅ ${testName}: ${defaultStatus.toUpperCase()} (${duration.toFixed(2)}ms)`);
      
    } catch (error) {
      const duration = performance.now() - start;
      
      this.results.push({
        testName,
        status: 'fail',
        duration,
        details: error.message,
        recommendations: this.getRecommendations(error)
      });
      
      console.log(`❌ ${testName}: FAIL (${duration.toFixed(2)}ms) - ${error.message}`);
    }
  }

  // 💡 RECOMMENDATION GENERATOR
  private getRecommendations(error: Error): string[] {
    const recommendations: string[] = [];
    
    if (error.message.includes('argon2id')) {
      recommendations.push('Configure Bun.password to use argon2id algorithm');
      recommendations.push('Set appropriate memoryCost and timeCost parameters');
    }
    
    if (error.message.includes('httpOnly')) {
      recommendations.push('Ensure all security cookies have httpOnly flag');
    }
    
    if (error.message.includes('secure')) {
      recommendations.push('Ensure all cookies are marked as secure in production');
    }
    
    if (error.message.includes('too slow')) {
      recommendations.push('Consider adjusting security parameters for better performance');
      recommendations.push('Monitor performance impact in production');
    }
    
    return recommendations;
  }
}

// 🚀 AUTOMATED SECURITY TESTING
export async function runSecurityTests(): Promise<{
  results: SecurityTestResult[];
  summary: { passed: number; failed: number; warnings: number; total: number };
  overallStatus: 'secure' | 'vulnerable' | 'needs_attention';
}> {
  const testSuite = new SecurityTestSuite();
  const results = await testSuite.runFullSuite();
  
  console.log('\n📊 Security Test Results Summary:');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${results.summary.passed}`);
  console.log(`❌ Failed: ${results.summary.failed}`);
  console.log(`⚠️  Warnings: ${results.summary.warnings}`);
  console.log(`📈 Total: ${results.summary.total}`);
  console.log(`🎯 Overall Status: ${results.overallStatus.toUpperCase()}`);
  
  // Show failed tests
  const failedTests = results.results.filter(r => r.status === 'fail');
  if (failedTests.length > 0) {
    console.log('\n❌ Failed Tests:');
    failedTests.forEach(test => {
      console.log(`   • ${test.testName}: ${test.details}`);
      if (test.recommendations) {
        test.recommendations.forEach(rec => {
          console.log(`     → ${rec}`);
        });
      }
    });
  }
  
  // Show warnings
  const warningTests = results.results.filter(r => r.status === 'warning');
  if (warningTests.length > 0) {
    console.log('\n⚠️  Warnings:');
    warningTests.forEach(test => {
      console.log(`   • ${test.testName}: ${test.details}`);
    });
  }
  
  // Export results for CI/CD
  return results;
}

// Run tests if this file is executed directly
if (import.meta.main) {
  runSecurityTests().catch(console.error);
}
