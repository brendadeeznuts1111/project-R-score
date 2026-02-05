#!/usr/bin/env bun

/**
 * 🔐 Enhanced JWT Authentication Test Client
 * Tests advanced security features: rate limiting, audit logging, session management, etc.
 */

interface TestUser {
  username: string;
  password: string;
  role: string;
}

interface AuthResponse {
  message: string;
  user: {
    id: string;
    username: string;
    role: string;
    created_at: string;
    last_login?: string;
    mfa_enabled: boolean;
  };
  token: string;
  session: {
    id: string;
    expires_at: string;
    device_fingerprint?: string;
  };
}

interface AuditLog {
  id: string;
  timestamp: string;
  user_id?: string;
  username?: string;
  action: string;
  ip_address: string;
  user_agent: string;
  success: boolean;
  details?: any;
}

interface Session {
  id: string;
  user_id: string;
  jti: string;
  created_at: string;
  expires_at: string;
  last_accessed: string;
  ip_address: string;
  user_agent: string;
  is_active: boolean;
  device_fingerprint?: string;
}

class EnhancedAuthTestClient {
  private baseUrl: string;
  private authToken: string | null = null;
  private adminToken: string | null = null;

  constructor(baseUrl: string = 'http://localhost:8788') {
    this.baseUrl = baseUrl;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.authToken && !options.headers?.['Authorization']) {
      defaultHeaders['Authorization'] = `Bearer ${this.authToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    return response;
  }

  private async makeAdminRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.adminToken) {
      defaultHeaders['Authorization'] = `Bearer ${this.adminToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    return response;
  }

  /**
   * Test basic authentication
   */
  async testBasicAuth(user: TestUser): Promise<boolean> {
    try {
      const response = await this.makeRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: user.username,
          password: user.password,
        }),
      });

      const data = (await response.json()) as any;

      if (response.ok) {
        const authData = data as AuthResponse;
        this.authToken = authData.token;

        if (user.role === 'admin') {
          this.adminToken = authData.token;
        }

        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Test protected route access
   */
  async testProtectedRoute(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/protected');
      const data = (await response.json()) as any;

      if (response.ok) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Test user info endpoint
   */
  async testGetUserInfo(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/auth/me');
      const data = (await response.json()) as any;

      if (response.ok) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Test token refresh
   */
  async testTokenRefresh(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/auth/refresh', {
        method: 'POST',
      });
      const data = (await response.json()) as any;

      if (response.ok) {
        const oldToken = this.authToken;
        this.authToken = data.token;

        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Test logout
   */
  async testLogout(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/auth/logout', {
        method: 'POST',
      });
      const data = (await response.json()) as any;

      if (response.ok) {
        this.authToken = null;
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Test rate limiting
   */
  async testRateLimiting(): Promise<boolean> {
    const testUser: TestUser = { username: 'nonexistent', password: 'wrong', role: 'user' };
    let rateLimitHit = false;

    // Make multiple failed requests to trigger rate limiting
    for (let i = 1; i <= 15; i++) {
      try {
        const response = await this.makeRequest('/auth/login', {
          method: 'POST',
          body: JSON.stringify(testUser),
        });

        const data = (await response.json()) as any;

        if (response.status === 429) {
          rateLimitHit = true;
          break;
        }

        if (i > 10) {
        }
      } catch (error) {}
    }

    return rateLimitHit;
  }

  /**
   * Test account lockout
   */
  async testAccountLockout(): Promise<boolean> {
    const testUser: TestUser = { username: 'admin', password: 'wrongpassword', role: 'admin' };
    let accountLocked = false;

    // Make multiple failed login attempts
    for (let i = 1; i <= 6; i++) {
      try {
        const response = await this.makeRequest('/auth/login', {
          method: 'POST',
          body: JSON.stringify(testUser),
        });

        const data = (await response.json()) as any;

        if (data.error && data.error.includes('locked')) {
          accountLocked = true;
          break;
        }

        if (i === 5) {
        }
      } catch (error) {}
    }

    // Test if account is actually locked by trying with correct password
    if (accountLocked) {
      try {
        const response = await this.makeRequest('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username: 'admin', password: 'admin123', role: 'admin' }),
        });

        const data = (await response.json()) as any;

        if (data.error && data.error.includes('locked')) {
        } else {
        }
      } catch (error) {}
    }

    return accountLocked;
  }

  /**
   * Test audit logs (admin only)
   */
  async testAuditLogs(): Promise<boolean> {
    if (!this.adminToken) {
      return false;
    }

    try {
      const response = await this.makeAdminRequest('/admin/audit-logs?limit=10');
      const data = (await response.json()) as any;

      if (response.ok) {
        if (data.audit_logs && data.audit_logs.length > 0) {
          data.audit_logs.slice(0, 3).forEach((log: AuditLog, index: number) => {});
        } else {
        }
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Test session management (admin only)
   */
  async testSessionManagement(): Promise<boolean> {
    if (!this.adminToken) {
      return false;
    }

    try {
      const response = await this.makeAdminRequest('/admin/sessions');
      const data = (await response.json()) as any;

      if (response.ok) {
        if (data.sessions && data.sessions.length > 0) {
          data.sessions.slice(0, 3).forEach((session: Session, index: number) => {});
        } else {
        }
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Test token revocation (admin only)
   */
  async testTokenRevocation(): Promise<boolean> {
    if (!this.adminToken) {
      return false;
    }

    // First, get a regular user token
    const regularUser: TestUser = { username: 'user', password: 'user123', role: 'user' };
    let userToken: string | null = null;

    try {
      const response = await this.makeRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify(regularUser),
      });

      if (response.ok) {
        const data = (await response.json()) as any;
        userToken = data.token;
      }
    } catch (error) {
      return false;
    }

    if (!userToken) {
      return false;
    }

    // Test that the token works
    this.authToken = userToken;
    const protectedAccessBefore = await this.testProtectedRoute();

    // Now revoke the token
    try {
      const response = await this.makeAdminRequest('/admin/revoke-token', {
        method: 'POST',
        body: JSON.stringify({ token_to_revoke: userToken }),
      });

      const data = (await response.json()) as any;

      if (response.ok) {
        // Test that the token no longer works
        const protectedAccessAfter = await this.testProtectedRoute();

        if (protectedAccessBefore && !protectedAccessAfter) {
        } else {
        }

        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Test health check
   */
  async testHealthCheck(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/health');
      const data = (await response.json()) as any;

      if (response.ok) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Run comprehensive security test
   */
  async runComprehensiveSecurityTest(): Promise<void> {
    const testUsers: TestUser[] = [
      { username: 'admin', password: 'admin123', role: 'admin' },
      { username: 'user', password: 'user123', role: 'user' },
      { username: 'TITTYB69', password: 'test123', role: 'user' },
    ];

    const results: boolean[] = [];

    // Test basic authentication for all users
    for (const user of testUsers) {
      results.push(await this.testBasicAuth(user));

      if (this.authToken) {
        results.push(await this.testProtectedRoute());
        results.push(await this.testGetUserInfo());
        results.push(await this.testTokenRefresh());
        results.push(await this.testLogout());
      }
    }

    // Test security features (using admin user)
    await this.testBasicAuth({ username: 'admin', password: 'admin123', role: 'admin' });

    results.push(await this.testRateLimiting());
    results.push(await this.testAccountLockout());
    results.push(await this.testAuditLogs());
    results.push(await this.testSessionManagement());
    results.push(await this.testTokenRevocation());
    results.push(await this.testHealthCheck());

    // Summary
    const passed = results.filter(r => r).length;
    const total = results.length;

    if (passed === total) {
    } else {
    }
  }

  /**
   * Run quick security test
   */
  async runQuickSecurityTest(): Promise<void> {
    const results: boolean[] = [];

    // Test basic authentication
    results.push(
      await this.testBasicAuth({ username: 'admin', password: 'admin123', role: 'admin' })
    );

    if (this.authToken) {
      results.push(await this.testProtectedRoute());
      results.push(await this.testGetUserInfo());
      results.push(await this.testHealthCheck());
    }

    const passed = results.filter(r => r).length;
    const total = results.length;

    if (passed === total) {
    } else {
    }
  }
}

// Main execution
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const baseUrl = process.env.AUTH_BASE_URL || 'http://localhost:8788';
  const testType = args[0] || 'comprehensive';

  const client = new EnhancedAuthTestClient(baseUrl);

  switch (testType) {
    case 'quick':
      await client.runQuickSecurityTest();
      break;
    case 'comprehensive':
      await client.runComprehensiveSecurityTest();
      break;
    default:
  }
}

// Run if called directly
if (import.meta.main) {
  main().catch(console.error);
}

export { EnhancedAuthTestClient };
