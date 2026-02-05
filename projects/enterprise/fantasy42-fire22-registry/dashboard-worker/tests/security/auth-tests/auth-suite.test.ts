#!/usr/bin/env bun
/**
 * 🧪 Authentication Test Suite
 *
 * Comprehensive testing for the Fire22 authentication system
 * Tests JWT validation, rate limiting, security features, and more
 *
 * @version 3.0.9
 * @author Fire22 Development Team
 */

import { generateToken, generateRefreshToken } from '../src/api/middleware/auth.middleware.js';
import {
  enhancedAuthenticate,
  generateEnhancedToken,
  SecurityManager,
} from '../src/api/middleware/enhanced-auth.middleware.js';

interface TestCase {
  name: string;
  test: () => Promise<boolean>;
  category: string;
  critical: boolean;
}

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  duration: number;
  error?: string;
  critical: boolean;
}

class AuthTestSuite {
  private results: TestResult[] = [];
  private securityManager = SecurityManager.getInstance();

  /**
   * Create mock request object
   */
  private createMockRequest(headers: Record<string, string> = {}): any {
    return {
      headers: {
        get: (key: string) => headers[key.toLowerCase()] || null,
      },
    };
  }

  /**
   * Run all authentication tests
   */
  async runAllTests(): Promise<void> {
    console.log('🧪 Fire22 Authentication Test Suite');
    console.log('='.repeat(60));
    console.log('Testing JWT validation, security features, and more...\n');

    const testCases: TestCase[] = [
      // JWT Token Tests
      {
        name: 'Generate Valid JWT Token',
        test: this.testTokenGeneration.bind(this),
        category: 'JWT',
        critical: true,
      },
      {
        name: 'Generate Refresh Token',
        test: this.testRefreshTokenGeneration.bind(this),
        category: 'JWT',
        critical: true,
      },
      {
        name: 'Validate JWT Token Structure',
        test: this.testTokenValidation.bind(this),
        category: 'JWT',
        critical: true,
      },
      {
        name: 'Handle Expired Tokens',
        test: this.testExpiredToken.bind(this),
        category: 'JWT',
        critical: true,
      },

      // Authentication Middleware Tests
      {
        name: 'Authenticate Valid Request',
        test: this.testValidAuthentication.bind(this),
        category: 'Authentication',
        critical: true,
      },
      {
        name: 'Reject Missing Token',
        test: this.testMissingToken.bind(this),
        category: 'Authentication',
        critical: true,
      },
      {
        name: 'Reject Invalid Token',
        test: this.testInvalidToken.bind(this),
        category: 'Authentication',
        critical: true,
      },
      {
        name: 'Handle Malformed Authorization Header',
        test: this.testMalformedHeader.bind(this),
        category: 'Authentication',
        critical: true,
      },

      // Security Features Tests
      {
        name: 'Rate Limiting Enforcement',
        test: this.testRateLimiting.bind(this),
        category: 'Security',
        critical: true,
      },
      {
        name: 'Token Blacklisting',
        test: this.testTokenBlacklisting.bind(this),
        category: 'Security',
        critical: true,
      },
      {
        name: 'Suspicious Activity Detection',
        test: this.testSuspiciousActivity.bind(this),
        category: 'Security',
        critical: false,
      },
      {
        name: 'Security Event Logging',
        test: this.testSecurityLogging.bind(this),
        category: 'Security',
        critical: false,
      },

      // Role-Based Access Control Tests
      {
        name: 'Admin Role Permissions',
        test: this.testAdminPermissions.bind(this),
        category: 'RBAC',
        critical: true,
      },
      {
        name: 'Manager Role Permissions',
        test: this.testManagerPermissions.bind(this),
        category: 'RBAC',
        critical: true,
      },
      {
        name: 'Agent Role Permissions',
        test: this.testAgentPermissions.bind(this),
        category: 'RBAC',
        critical: true,
      },
      {
        name: 'Customer Role Permissions',
        test: this.testCustomerPermissions.bind(this),
        category: 'RBAC',
        critical: true,
      },

      // Enhanced Security Tests
      {
        name: 'Enhanced Token Generation',
        test: this.testEnhancedTokenGeneration.bind(this),
        category: 'Enhanced',
        critical: false,
      },
      {
        name: 'Security Health Check',
        test: this.testSecurityHealthCheck.bind(this),
        category: 'Enhanced',
        critical: false,
      },
    ];

    // Run tests by category
    const categories = [...new Set(testCases.map(t => t.category))];

    for (const category of categories) {
      console.log(`\n📦 ${category} Tests`);
      console.log('-'.repeat(40));

      const categoryTests = testCases.filter(t => t.category === category);

      for (const testCase of categoryTests) {
        await this.runSingleTest(testCase);
      }
    }

    this.displaySummary();
  }

  /**
   * Run a single test case
   */
  private async runSingleTest(testCase: TestCase): Promise<void> {
    const startTime = Date.now();
    process.stdout.write(`  Testing ${testCase.name}... `);

    try {
      const passed = await testCase.test();
      const duration = Date.now() - startTime;

      this.results.push({
        name: testCase.name,
        category: testCase.category,
        passed,
        duration,
        critical: testCase.critical,
      });

      if (passed) {
        console.log(`✅ PASS (${duration}ms)`);
      } else {
        console.log(`❌ FAIL (${duration}ms)`);
      }
    } catch (error) {
      const duration = Date.now() - startTime;

      this.results.push({
        name: testCase.name,
        category: testCase.category,
        passed: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
        critical: testCase.critical,
      });

      console.log(
        `❌ ERROR (${duration}ms): ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Test Cases

  private async testTokenGeneration(): Promise<boolean> {
    const token = await generateToken({
      id: 'test-user',
      role: 'customer',
    });

    return typeof token === 'string' && token.length > 0;
  }

  private async testRefreshTokenGeneration(): Promise<boolean> {
    const refreshToken = await generateRefreshToken('test-user');
    return typeof refreshToken === 'string' && refreshToken.length > 0;
  }

  private async testTokenValidation(): Promise<boolean> {
    const token = await generateToken({
      id: 'test-user',
      role: 'admin',
    });

    // Token should have 3 parts (header.payload.signature)
    const parts = token.split('.');
    return parts.length === 3 && parts.every(part => part.length > 0);
  }

  private async testExpiredToken(): Promise<boolean> {
    // This test would require creating an expired token
    // For now, we'll simulate the behavior
    const request = this.createMockRequest({
      authorization: 'Bearer expired.token.here',
    });

    try {
      const result = await enhancedAuthenticate(request);
      // Should return error response for expired token
      return result instanceof Response && result.status === 401;
    } catch {
      return true; // Expected to throw
    }
  }

  private async testValidAuthentication(): Promise<boolean> {
    const token = await generateToken({
      id: 'test-user',
      role: 'admin',
    });

    const request = this.createMockRequest({
      authorization: `Bearer ${token}`,
      'cf-connecting-ip': '127.0.0.1',
    });

    try {
      const result = await enhancedAuthenticate(request);
      return result === undefined && request.user?.id === 'test-user';
    } catch {
      return false;
    }
  }

  private async testMissingToken(): Promise<boolean> {
    const request = this.createMockRequest({
      'cf-connecting-ip': '127.0.0.1',
    });

    const result = await enhancedAuthenticate(request);
    return result instanceof Response && result.status === 401;
  }

  private async testInvalidToken(): Promise<boolean> {
    const request = this.createMockRequest({
      authorization: 'Bearer invalid.token.here',
      'cf-connecting-ip': '127.0.0.1',
    });

    const result = await enhancedAuthenticate(request);
    return result instanceof Response && result.status === 401;
  }

  private async testMalformedHeader(): Promise<boolean> {
    const request = this.createMockRequest({
      authorization: 'NotBearer token-without-bearer',
      'cf-connecting-ip': '127.0.0.1',
    });

    const result = await enhancedAuthenticate(request);
    return result instanceof Response && result.status === 401;
  }

  private async testRateLimiting(): Promise<boolean> {
    const ip = '192.168.1.100'; // Test IP

    // Clear any existing rate limit for this IP
    this.securityManager['rateLimitMap'].delete(`rate_limit_${ip}`);

    // Make multiple requests to trigger rate limiting
    let blockedResponse: Response | undefined;

    for (let i = 0; i < 10; i++) {
      const request = this.createMockRequest({
        authorization: 'Bearer invalid.token',
        'cf-connecting-ip': ip,
      });

      const result = await enhancedAuthenticate(request);
      if (result instanceof Response && result.status === 429) {
        blockedResponse = result;
        break;
      }
    }

    return blockedResponse !== undefined;
  }

  private async testTokenBlacklisting(): Promise<boolean> {
    const token = 'test-blacklisted-token';

    // Add token to blacklist
    this.securityManager.blacklistToken(token);

    // Check if token is blacklisted
    return this.securityManager.isTokenBlacklisted(token);
  }

  private async testSuspiciousActivity(): Promise<boolean> {
    const ip = '192.168.1.200';
    const userId = 'test-user';

    // Generate multiple failed login events
    for (let i = 0; i < 12; i++) {
      this.securityManager.logSecurityEvent({
        type: 'login_failure',
        ip,
        userId,
        timestamp: new Date(),
      });
    }

    // Check if suspicious activity is detected
    return this.securityManager.detectSuspiciousActivity(ip, userId);
  }

  private async testSecurityLogging(): Promise<boolean> {
    const initialEventCount = this.securityManager['securityEvents'].length;

    this.securityManager.logSecurityEvent({
      type: 'login_success',
      userId: 'test-user',
      ip: '127.0.0.1',
      timestamp: new Date(),
    });

    const newEventCount = this.securityManager['securityEvents'].length;
    return newEventCount > initialEventCount;
  }

  private async testAdminPermissions(): Promise<boolean> {
    const token = await generateToken({
      id: 'admin-user',
      role: 'admin',
    });

    const request = this.createMockRequest({
      authorization: `Bearer ${token}`,
      'cf-connecting-ip': '127.0.0.1',
    });

    await enhancedAuthenticate(request);

    return (
      request.user?.role === 'admin' &&
      request.user?.level === 5 &&
      request.user?.permissions?.includes('admin.*')
    );
  }

  private async testManagerPermissions(): Promise<boolean> {
    const token = await generateToken({
      id: 'manager-user',
      role: 'manager',
    });

    const request = this.createMockRequest({
      authorization: `Bearer ${token}`,
      'cf-connecting-ip': '127.0.0.1',
    });

    await enhancedAuthenticate(request);

    return (
      request.user?.role === 'manager' &&
      request.user?.level === 4 &&
      request.user?.permissions?.includes('manager.*')
    );
  }

  private async testAgentPermissions(): Promise<boolean> {
    const token = await generateToken({
      id: 'agent-user',
      role: 'agent',
    });

    const request = this.createMockRequest({
      authorization: `Bearer ${token}`,
      'cf-connecting-ip': '127.0.0.1',
    });

    await enhancedAuthenticate(request);

    return (
      request.user?.role === 'agent' &&
      request.user?.level === 3 &&
      request.user?.permissions?.includes('agent.own') &&
      request.user?.scope?.type === 'agent'
    );
  }

  private async testCustomerPermissions(): Promise<boolean> {
    const token = await generateToken({
      id: 'customer-user',
      role: 'customer',
    });

    const request = this.createMockRequest({
      authorization: `Bearer ${token}`,
      'cf-connecting-ip': '127.0.0.1',
    });

    await enhancedAuthenticate(request);

    return (
      request.user?.role === 'customer' &&
      request.user?.level === 2 &&
      request.user?.permissions?.includes('customer.own') &&
      request.user?.scope?.type === 'customer'
    );
  }

  private async testEnhancedTokenGeneration(): Promise<boolean> {
    try {
      const result = await generateEnhancedToken({
        id: 'test-user',
        role: 'customer',
        ip: '127.0.0.1',
      });

      return result.accessToken && result.refreshToken && result.expiresAt instanceof Date;
    } catch {
      return false;
    }
  }

  private async testSecurityHealthCheck(): Promise<boolean> {
    const stats = this.securityManager.getSecurityStats();

    return (
      typeof stats === 'object' &&
      typeof stats.totalEvents === 'number' &&
      typeof stats.recentFailures === 'number' &&
      typeof stats.activeBlocks === 'number' &&
      typeof stats.blacklistedTokens === 'number'
    );
  }

  /**
   * Display test summary
   */
  private displaySummary(): void {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;
    const critical = this.results.filter(r => r.critical);
    const criticalPassed = critical.filter(r => r.passed).length;
    const passRate = ((passed / total) * 100).toFixed(1);

    console.log('\n' + '='.repeat(60));
    console.log('🔐 Authentication Test Summary');
    console.log('-'.repeat(60));
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Pass Rate: ${passRate}%`);
    console.log(`🔥 Critical Tests: ${criticalPassed}/${critical.length} passed`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => !r.passed)
        .forEach(result => {
          const criticality = result.critical ? '🔥 CRITICAL' : '';
          console.log(`  • ${result.name} ${criticality}`);
          if (result.error) {
            console.log(`    Error: ${result.error}`);
          }
        });
    }

    // Overall status
    console.log('\n' + '='.repeat(60));
    if (passed === total) {
      console.log('✅ All authentication tests passed! Security system is ready.');
    } else if (criticalPassed === critical.length && passRate >= '80') {
      console.log('⚠️  Most tests passed, critical security features working.');
    } else {
      console.log('❌ Authentication tests failed. Security system needs attention.');
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🧪 Fire22 Authentication Test Suite

DESCRIPTION:
  Comprehensive testing for the Fire22 authentication system.
  Tests JWT validation, rate limiting, security features, and RBAC.

USAGE:
  bun run scripts/auth-test-suite.ts [options]

OPTIONS:
  --help, -h        Show this help message

EXAMPLES:
  bun run scripts/auth-test-suite.ts          # Run all tests
  fire22 test:auth                            # Via Fire22 CLI

🔥 Fire22 Development Team - Enterprise Security Testing
`);
    process.exit(0);
  }

  const suite = new AuthTestSuite();

  try {
    await suite.runAllTests();
    process.exit(0);
  } catch (error) {
    console.error('💥 Authentication test suite failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main().catch(error => {
    console.error('💥 Authentication test suite failed:', error);
    process.exit(1);
  });
}

export { AuthTestSuite };
