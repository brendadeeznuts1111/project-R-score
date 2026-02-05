/**
 * 🚀 Enhanced API Integration Demo
 *
 * Demonstrates the enhanced API service with:
 * - JWT authentication and token management
 * - Enhanced security headers
 * - Protected resource access
 * - Security monitoring and audit logging
 * - Integration with Fire22 enhanced security
 */

import { enhancedAPI, EnhancedAPIService } from './enhanced-api-service';

// Demo configuration
const demoConfig = {
  baseURL: 'https://api.fire22.com',
  apiVersion: 'v1',
  timeout: 30000,
  retryAttempts: 3,
  securityLevel: 'enhanced' as const,
};

/**
 * Demo: Complete API Integration Workflow
 */
export class EnhancedAPIDemo {
  private api: EnhancedAPIService;

  constructor() {
    this.api = new EnhancedAPIService(demoConfig);
  }

  /**
   * Demo 1: Authentication Flow
   */
  async demoAuthenticationFlow(): Promise<void> {
    try {
      // Step 1: Login
      const loginResponse = await this.api.login({
        username: 'fire22_user',
        password: 'secure_password_123',
      });

      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
      } else {
        return;
      }

      // Step 2: Verify Token
      const verifyResponse = await this.api.verifyToken();

      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json();
      } else {
      }

      // Step 3: Access Protected Resource
      const protectedResponse = await this.api.getProtectedResource('/api/v1/protected');

      if (protectedResponse.ok) {
        const protectedData = await protectedResponse.json();
      } else {
      }

      // Step 4: Check Security Status
      const status = this.api.getSecurityStatus();
    } catch (error) {
      console.error('❌ Authentication demo failed:', error);
    }
  }

  /**
   * Demo 2: Enhanced Security Headers
   */
  async demoEnhancedSecurityHeaders(): Promise<void> {
    try {
      // Make a request and inspect headers

      const response = await this.api.request('/api/v1/security/status', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'X-Custom-Header': 'demo-value',
        },
      });

      // Show response headers
      const headers = response.headers;
      const securityHeaders = [
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
        'X-Request-ID',
        'X-Fire22-Security',
        'X-Content-Type-Options',
        'X-Frame-Options',
        'X-XSS-Protection',
        'Strict-Transport-Security',
      ];

      securityHeaders.forEach(header => {
        const value = headers.get(header);
        if (value) {
        }
      });
    } catch (error) {
      console.error('❌ Security headers demo failed:', error);
    }
  }

  /**
   * Demo 3: Token Refresh and Management
   */
  async demoTokenManagement(): Promise<void> {
    try {
      // Check current token status
      const status = this.api.getSecurityStatus();

      if (status.authenticated && !status.tokenExpired) {
        // Simulate token refresh
        const refreshResult = await this.api.refreshAuthToken();

        if (refreshResult) {
        } else {
        }
      } else {
      }

      // Show token lifecycle
    } catch (error) {
      console.error('❌ Token management demo failed:', error);
    }
  }

  /**
   * Demo 4: Error Handling and Retry Logic
   */
  async demoErrorHandling(): Promise<void> {
    try {
      // Test with invalid endpoint

      const response = await this.api.request('/api/v1/nonexistent', {
        method: 'GET',
      });

      if (response.status === 404) {
      }

      // Test with invalid token

      // Temporarily set invalid token
      this.api['token'] = 'invalid_token_for_testing';

      try {
        await this.api.verifyToken();
      } catch (error) {}

      // Restore valid token if available
      if (typeof sessionStorage !== 'undefined') {
        const storedToken = sessionStorage.getItem('fire22_access_token');
        if (storedToken) {
          this.api['token'] = storedToken;
        }
      }
    } catch (error) {
      console.error('❌ Error handling demo failed:', error);
    }
  }

  /**
   * Demo 5: Security Monitoring and Audit
   */
  async demoSecurityMonitoring(): Promise<void> {
    try {
      // Make several requests to demonstrate monitoring

      const endpoints = ['/api/v1/security/status', '/api/v1/protected', '/api/v1/auth/verify'];

      for (const endpoint of endpoints) {
        try {
          const response = await this.api.request(endpoint, { method: 'GET' });
        } catch (error) {}
      }
    } catch (error) {
      console.error('❌ Security monitoring demo failed:', error);
    }
  }

  /**
   * Demo 6: Integration with Fire22 Enhanced Security
   */
  async demoFire22Integration(): Promise<void> {
    try {
      // Show current security configuration
      const status = this.api.getSecurityStatus();

      // Demonstrate security level updates

      this.api.updateSecurityConfig({
        securityLevel: 'strict',
        timeout: 45000,
        retryAttempts: 5,
      });

      const updatedStatus = this.api.getSecurityStatus();

      // Restore original configuration
      this.api.updateSecurityConfig(demoConfig);
    } catch (error) {
      console.error('❌ Fire22 integration demo failed:', error);
    }
  }

  /**
   * Run all demos
   */
  async runAllDemos(): Promise<void> {
    try {
      await this.demoAuthenticationFlow();
      await this.demoEnhancedSecurityHeaders();
      await this.demoTokenManagement();
      await this.demoErrorHandling();
      await this.demoSecurityMonitoring();
      await this.demoFire22Integration();
    } catch (error) {
      console.error('❌ Demo execution failed:', error);
    }
  }
}

// Run demo if called directly
if (import.meta.main) {
  const demo = new EnhancedAPIDemo();
  demo.runAllDemos().catch(console.error);
}
