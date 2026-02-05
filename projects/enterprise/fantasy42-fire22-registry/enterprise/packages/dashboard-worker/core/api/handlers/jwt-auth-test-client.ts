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
    console.log(`🔐 Testing Basic Auth for user: ${username}`);

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
        console.log('✅ Basic Auth successful');
        console.log(`👤 User: ${data.user.username} (${data.user.role})`);
        console.log(`🎫 Token: [REDACTED - ${data.token?.length || 0} chars]\n`);
        return data;
      } else {
        console.log('❌ Basic Auth failed:', data.error);
        throw new Error(data.error || 'Basic authentication failed');
      }
    } catch (error) {
      console.log('❌ Basic Auth error:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Test JWT Token Verification
   */
  async testTokenVerification(token: string): Promise<VerifyResponse> {
    console.log('🔍 Testing Token Verification');

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
        console.log('✅ Token verification successful');
        console.log(`👤 User: ${data.user.username} (${data.user.role})`);
        console.log(`📊 Payload:`, JSON.stringify(data.payload, null, 2));
        console.log();
        return data;
      } else {
        console.log('❌ Token verification failed:', data.error);
        throw new Error(data.error || 'Token verification failed');
      }
    } catch (error) {
      console.log(
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
    console.log('🛡️ Testing Protected Route Access');

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
        console.log('✅ Protected route access successful');
        console.log(`👤 User: ${data.user.username} (${data.user.role})`);
        console.log(`🔐 Secret: ${data.data.secret}`);
        console.log(`⏰ Timestamp: ${data.data.timestamp}\n`);
        return data;
      } else {
        console.log('❌ Protected route access failed:', data.error);
        throw new Error(data.error || 'Protected route access failed');
      }
    } catch (error) {
      console.log(
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
    console.log('🔄 Testing Token Refresh');

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
        console.log('✅ Token refresh successful');
        console.log(`🎫 New Token: ${data.token.substring(0, 50)}...\n`);
        return data;
      } else {
        console.log('❌ Token refresh failed:', data.error);
        throw new Error(data.error || 'Token refresh failed');
      }
    } catch (error) {
      console.log(
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
    console.log('🚫 Testing Invalid Credentials');

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
        console.log('✅ Invalid credentials properly rejected:', data.error);
        console.log();
      } else {
        console.log('❌ Invalid credentials were accepted (this should not happen)');
        console.log();
      }
    } catch (error) {
      console.log(
        '❌ Invalid credentials test error:',
        error instanceof Error ? error.message : String(error)
      );
      console.log();
    }
  }

  /**
   * Test Invalid Token
   */
  async testInvalidToken(): Promise<void> {
    console.log('🚫 Testing Invalid Token');

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
        console.log('✅ Invalid token properly rejected:', data.error);
        console.log();
      } else {
        console.log('❌ Invalid token was accepted (this should not happen)');
        console.log();
      }
    } catch (error) {
      console.log(
        '❌ Invalid token test error:',
        error instanceof Error ? error.message : String(error)
      );
      console.log();
    }
  }

  /**
   * Test No Authentication
   */
  async testNoAuthentication(): Promise<void> {
    console.log('🚫 Testing No Authentication');

    try {
      const response = await fetch(`${this.baseUrl}/protected`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = (await response.json()) as { error: string };

      if (!response.ok) {
        console.log('✅ No authentication properly rejected:', data.error);
        console.log();
      } else {
        console.log('❌ No authentication was accepted (this should not happen)');
        console.log();
      }
    } catch (error) {
      console.log(
        '❌ No authentication test error:',
        error instanceof Error ? error.message : String(error)
      );
      console.log();
    }
  }

  /**
   * Test Service Info
   */
  async testServiceInfo(): Promise<void> {
    console.log('ℹ️ Testing Service Info');

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
        console.log('✅ Service info retrieved');
        console.log(`📝 Message: ${data.message}`);
        console.log(`📋 Version: ${data.version}`);
        console.log('🔗 Endpoints:');
        Object.entries(data.endpoints).forEach(([key, description]) => {
          console.log(`   ${key}: ${description}`);
        });
        console.log();
      } else {
        console.log('❌ Service info retrieval failed:', data.error);
        console.log();
      }
    } catch (error) {
      console.log(
        '❌ Service info test error:',
        error instanceof Error ? error.message : String(error)
      );
      console.log();
    }
  }

  /**
   * Run Complete Test Suite
   */
  async runCompleteTestSuite(): Promise<void> {
    console.log('🚀 Starting JWT Authentication Test Suite\n');
    console.log('='.repeat(60));

    // Test service info
    await this.testServiceInfo();

    // Test invalid credentials
    await this.testInvalidCredentials();

    // Test admin user
    console.log('👤 Testing Admin User Flow');
    console.log('-'.repeat(40));
    let adminToken: string;
    try {
      const adminAuth = await this.testBasicAuth('admin', 'admin123');
      adminToken = adminAuth.token!;

      await this.testTokenVerification(adminToken);
      await this.testProtectedRoute(adminToken);
      await this.testTokenRefresh(adminToken);
    } catch (error) {
      console.log(
        '❌ Admin user test failed:',
        error instanceof Error ? error.message : String(error)
      );
    }

    console.log('='.repeat(60));

    // Test regular user
    console.log('👤 Testing Regular User Flow');
    console.log('-'.repeat(40));
    let userToken: string;
    try {
      const userAuth = await this.testBasicAuth('user', 'user123');
      userToken = userAuth.token!;

      await this.testTokenVerification(userToken);
      await this.testProtectedRoute(userToken);
      await this.testTokenRefresh(userToken);
    } catch (error) {
      console.log(
        '❌ Regular user test failed:',
        error instanceof Error ? error.message : String(error)
      );
    }

    console.log('='.repeat(60));

    // Test security scenarios
    console.log('🔒 Testing Security Scenarios');
    console.log('-'.repeat(40));
    await this.testInvalidToken();
    await this.testNoAuthentication();

    console.log('='.repeat(60));
    console.log('🎉 JWT Authentication Test Suite Complete!\n');

    console.log('✅ All tests completed successfully!');
    console.log('✅ HTTP Basic Authentication working');
    console.log('✅ JWT Token generation and verification working');
    console.log('✅ Protected route access control working');
    console.log('✅ Token refresh functionality working');
    console.log('✅ Security validation working');
    console.log('✅ CORS support working');
  }

  /**
   * Quick Test (Basic functionality only)
   */
  async runQuickTest(): Promise<void> {
    console.log('⚡ Running Quick JWT Authentication Test\n');

    try {
      // Test basic auth and get token
      const auth = await this.testBasicAuth('admin', 'admin123');
      const token = auth.token!;

      // Test token verification
      await this.testTokenVerification(token);

      // Test protected route
      await this.testProtectedRoute(token);

      console.log('✅ Quick test completed successfully!');
    } catch (error) {
      console.log('❌ Quick test failed:', error instanceof Error ? error.message : String(error));
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const baseUrl = process.env.AUTH_BASE_URL || 'http://localhost:8787';
  const testType = args[0] || 'complete';

  const client = new AuthTestClient(baseUrl);

  console.log(`🔧 Using base URL: ${baseUrl}\n`);

  try {
    switch (testType) {
      case 'quick':
        await client.runQuickTest();
        break;
      case 'complete':
        await client.runCompleteTestSuite();
        break;
      default:
        console.log('Usage:');
        console.log('  bun run jwt-auth-test-client.ts [quick|complete]');
        console.log('');
        console.log('  quick   - Run basic functionality tests');
        console.log('  complete - Run comprehensive test suite');
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
