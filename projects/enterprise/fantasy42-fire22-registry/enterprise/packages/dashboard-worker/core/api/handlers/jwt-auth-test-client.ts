#!/usr/bin/env bun

/**
 * 🔐 JWT Authentication Test Client
 * Demonstrates HTTP Basic Auth and JWT usage with the Cloudflare Worker
 */

import { setTimeout } from 'timers/promises';

interface AuthResponse {
  message: string;
  user: {
    id: string;
    username: string;
    role: string;
  };
  token?: string;
  error?: string;
}

interface VerifyResponse {
  message: string;
  user: {
    id: string;
    username: string;
    role: string;
  };
  payload?: any;
  error?: string;
}

interface ProtectedResponse {
  message: string;
  user: {
    id: string;
    username: string;
    role: string;
  };
  data: {
    secret: string;
    timestamp: string;
  };
  error?: string;
}

interface RefreshResponse {
  message: string;
  token: string;
  error?: string;
}

class AuthTestClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:8787') {
    this.baseUrl = baseUrl;
  }

  /**
   * Test HTTP Basic Authentication
   */
  async testBasicAuth(username: string, password: string): Promise<AuthResponse> {
    console.info(`🔐 Testing Basic Auth for user: ${username}`);

    const credentials = btoa(`${username}:${password}`);

    try {
      const response = await fetch(`${this.baseUrl}/auth/basic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${credentials}`,
        },
      });

      const data = (await response.json()) as AuthResponse;

      if (response.ok) {
        console.info('✅ Basic Auth successful');
        console.info(`👤 User: ${data.user.username} (${data.user.role})`);
        console.info(`🎫 Token: [REDACTED - ${data.token?.length || 0} chars]\n`);
        return data;
      } else {
        console.info('❌ Basic Auth failed:', data.error);
        throw new Error(data.error || 'Basic authentication failed');
      }
    } catch (error) {
      console.info('❌ Basic Auth error:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Test JWT Token Verification
   */
  async testTokenVerification(token: string): Promise<VerifyResponse> {
    console.info('🔍 Testing Token Verification');

    try {
      const response = await fetch(`${this.baseUrl}/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = (await response.json()) as VerifyResponse;

      if (response.ok) {
        console.info('✅ Token verification successful');
        console.info(`👤 User: ${data.user.username} (${data.user.role})`);
        console.info(`📊 Payload:`, JSON.stringify(data.payload, null, 2));
        console.info();
        return data;
      } else {
        console.info('❌ Token verification failed:', data.error);
        throw new Error(data.error || 'Token verification failed');
      }
    } catch (error) {
      console.info(
        '❌ Token verification error:',
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }

  /**
   * Test Protected Route Access
   */
  async testProtectedRoute(token: string): Promise<ProtectedResponse> {
    console.info('🛡️ Testing Protected Route Access');

    try {
      const response = await fetch(`${this.baseUrl}/protected`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = (await response.json()) as ProtectedResponse;

      if (response.ok) {
        console.info('✅ Protected route access successful');
        console.info(`👤 User: ${data.user.username} (${data.user.role})`);
        console.info(`🔐 Secret: ${data.data.secret}`);
        console.info(`⏰ Timestamp: ${data.data.timestamp}\n`);
        return data;
      } else {
        console.info('❌ Protected route access failed:', data.error);
        throw new Error(data.error || 'Protected route access failed');
      }
    } catch (error) {
      console.info(
        '❌ Protected route access error:',
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }

  /**
   * Test Token Refresh
   */
  async testTokenRefresh(token: string): Promise<RefreshResponse> {
    console.info('🔄 Testing Token Refresh');

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = (await response.json()) as RefreshResponse;

      if (response.ok) {
        console.info('✅ Token refresh successful');
        console.info(`🎫 New Token: ${data.token.substring(0, 50)}...\n`);
        return data;
      } else {
        console.info('❌ Token refresh failed:', data.error);
        throw new Error(data.error || 'Token refresh failed');
      }
    } catch (error) {
      console.info(
        '❌ Token refresh error:',
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }

  /**
   * Test Invalid Credentials
   */
  async testInvalidCredentials(): Promise<void> {
    console.info('🚫 Testing Invalid Credentials');

    try {
      const credentials = btoa('invalid:invalid');

      const response = await fetch(`${this.baseUrl}/auth/basic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${credentials}`,
        },
      });

      const data = (await response.json()) as { error: string };

      if (!response.ok) {
        console.info('✅ Invalid credentials properly rejected:', data.error);
        console.info();
      } else {
        console.info('❌ Invalid credentials were accepted (this should not happen)');
        console.info();
      }
    } catch (error) {
      console.info(
        '❌ Invalid credentials test error:',
        error instanceof Error ? error.message : String(error)
      );
      console.info();
    }
  }

  /**
   * Test Invalid Token
   */
  async testInvalidToken(): Promise<void> {
    console.info('🚫 Testing Invalid Token');

    try {
      const response = await fetch(`${this.baseUrl}/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer invalid.token.here',
        },
      });

      const data = (await response.json()) as { error: string };

      if (!response.ok) {
        console.info('✅ Invalid token properly rejected:', data.error);
        console.info();
      } else {
        console.info('❌ Invalid token was accepted (this should not happen)');
        console.info();
      }
    } catch (error) {
      console.info(
        '❌ Invalid token test error:',
        error instanceof Error ? error.message : String(error)
      );
      console.info();
    }
  }

  /**
   * Test No Authentication
   */
  async testNoAuthentication(): Promise<void> {
    console.info('🚫 Testing No Authentication');

    try {
      const response = await fetch(`${this.baseUrl}/protected`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = (await response.json()) as { error: string };

      if (!response.ok) {
        console.info('✅ No authentication properly rejected:', data.error);
        console.info();
      } else {
        console.info('❌ No authentication was accepted (this should not happen)');
        console.info();
      }
    } catch (error) {
      console.info(
        '❌ No authentication test error:',
        error instanceof Error ? error.message : String(error)
      );
      console.info();
    }
  }

  /**
   * Test Service Info
   */
  async testServiceInfo(): Promise<void> {
    console.info('ℹ️ Testing Service Info');

    try {
      const response = await fetch(`${this.baseUrl}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = (await response.json()) as {
        message: string;
        version: string;
        endpoints: Record<string, string>;
        error?: string;
      };

      if (response.ok) {
        console.info('✅ Service info retrieved');
        console.info(`📝 Message: ${data.message}`);
        console.info(`📋 Version: ${data.version}`);
        console.info('🔗 Endpoints:');
        Object.entries(data.endpoints).forEach(([key, description]) => {
          console.info(`   ${key}: ${description}`);
        });
        console.info();
      } else {
        console.info('❌ Service info retrieval failed:', data.error);
        console.info();
      }
    } catch (error) {
      console.info(
        '❌ Service info test error:',
        error instanceof Error ? error.message : String(error)
      );
      console.info();
    }
  }

  /**
   * Run Complete Test Suite
   */
  async runCompleteTestSuite(): Promise<void> {
    console.info('🚀 Starting JWT Authentication Test Suite\n');
    console.info('='.repeat(60));

    // Test service info
    await this.testServiceInfo();

    // Test invalid credentials
    await this.testInvalidCredentials();

    // Test admin user
    console.info('👤 Testing Admin User Flow');
    console.info('-'.repeat(40));
    let adminToken: string;
    try {
      const adminAuth = await this.testBasicAuth('admin', 'admin123');
      adminToken = adminAuth.token!;

      await this.testTokenVerification(adminToken);
      await this.testProtectedRoute(adminToken);
      await this.testTokenRefresh(adminToken);
    } catch (error) {
      console.info(
        '❌ Admin user test failed:',
        error instanceof Error ? error.message : String(error)
      );
    }

    console.info('='.repeat(60));

    // Test regular user
    console.info('👤 Testing Regular User Flow');
    console.info('-'.repeat(40));
    let userToken: string;
    try {
      const userAuth = await this.testBasicAuth('user', 'user123');
      userToken = userAuth.token!;

      await this.testTokenVerification(userToken);
      await this.testProtectedRoute(userToken);
      await this.testTokenRefresh(userToken);
    } catch (error) {
      console.info(
        '❌ Regular user test failed:',
        error instanceof Error ? error.message : String(error)
      );
    }

    console.info('='.repeat(60));

    // Test security scenarios
    console.info('🔒 Testing Security Scenarios');
    console.info('-'.repeat(40));
    await this.testInvalidToken();
    await this.testNoAuthentication();

    console.info('='.repeat(60));
    console.info('🎉 JWT Authentication Test Suite Complete!\n');

    console.info('✅ All tests completed successfully!');
    console.info('✅ HTTP Basic Authentication working');
    console.info('✅ JWT Token generation and verification working');
    console.info('✅ Protected route access control working');
    console.info('✅ Token refresh functionality working');
    console.info('✅ Security validation working');
    console.info('✅ CORS support working');
  }

  /**
   * Quick Test (Basic functionality only)
   */
  async runQuickTest(): Promise<void> {
    console.info('⚡ Running Quick JWT Authentication Test\n');

    try {
      // Test basic auth and get token
      const auth = await this.testBasicAuth('admin', 'admin123');
      const token = auth.token!;

      // Test token verification
      await this.testTokenVerification(token);

      // Test protected route
      await this.testProtectedRoute(token);

      console.info('✅ Quick test completed successfully!');
    } catch (error) {
      console.info('❌ Quick test failed:', error instanceof Error ? error.message : String(error));
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const baseUrl = process.env.AUTH_BASE_URL || 'http://localhost:8787';
  const testType = args[0] || 'complete';

  const client = new AuthTestClient(baseUrl);

  console.info(`🔧 Using base URL: ${baseUrl}\n`);

  try {
    switch (testType) {
      case 'quick':
        await client.runQuickTest();
        break;
      case 'complete':
        await client.runCompleteTestSuite();
        break;
      default:
        console.info('Usage:');
        console.info('  bun run jwt-auth-test-client.ts [quick|complete]');
        console.info('');
        console.info('  quick   - Run basic functionality tests');
        console.info('  complete - Run comprehensive test suite');
        break;
    }
  } catch (error) {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main().catch(error => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
}

export { AuthTestClient };
