#!/usr/bin/env bun
/**
 * 🔐 Registry Authentication Middleware
 * 
 * Supports: none, basic, token, and JWT auth modes
 */

import { styled, FW_COLORS } from '../theme/colors.ts';
import type { RegistryUser, AuthToken } from './registry-types.ts';

export type AuthType = 'none' | 'basic' | 'token' | 'jwt';

export interface AuthConfig {
  type: AuthType;
  jwtSecret?: string;
  tokenExpiry?: number; // seconds
  users?: Map<string, RegistryUser>;
  tokens?: Map<string, AuthToken>;
  allowRead?: boolean; // Allow unauthenticated reads
}

export interface AuthContext {
  user?: RegistryUser;
  token?: AuthToken;
  readonly: boolean;
  authenticated: boolean;
}

export class RegistryAuth {
  private config: AuthConfig;

  constructor(config: AuthConfig) {
    this.config = {
      allowRead: true,
      ...config,
    };
  }

  /**
   * Authenticate a request
   */
  async authenticate(request: Request): Promise<AuthContext> {
    // No auth required
    if (this.config.type === 'none') {
      return { readonly: false, authenticated: true };
    }

    const authHeader = request.headers.get('Authorization');

    // Check for bearer token
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      return this.validateToken(token);
    }

    // Check for basic auth
    if (authHeader?.startsWith('Basic ')) {
      const credentials = authHeader.slice(6);
      return this.validateBasicAuth(credentials);
    }

    // Check for npm token (legacy format)
    if (authHeader?.startsWith('NpmToken ')) {
      const token = authHeader.slice(9);
      return this.validateToken(token);
    }

    // Allow read-only access if configured
    if (this.config.allowRead && this.isReadRequest(request)) {
      return { readonly: true, authenticated: false };
    }

    return { readonly: true, authenticated: false };
  }

  /**
   * Validate basic auth credentials
   */
  private validateBasicAuth(credentials: string): AuthContext {
    try {
      const decoded = atob(credentials);
      const [username, password] = decoded.split(':');

      if (!username || !password) {
        return { readonly: true, authenticated: false };
      }

      const user = this.config.users?.get(username);
      if (!user) {
        return { readonly: true, authenticated: false };
      }

      // In production, use proper password hashing (bcrypt, etc.)
      const valid = this.verifyPassword(password, user);
      if (!valid) {
        return { readonly: true, authenticated: false };
      }

      return {
        user,
        readonly: false,
        authenticated: true,
      };
    } catch {
      return { readonly: true, authenticated: false };
    }
  }

  /**
   * Validate bearer token
   */
  private validateToken(token: string): AuthContext {
    switch (this.config.type) {
      case 'token':
        return this.validateApiToken(token);
      case 'jwt':
        return this.validateJwt(token);
      default:
        return { readonly: true, authenticated: false };
    }
  }

  /**
   * Validate API token
   */
  private validateApiToken(token: string): AuthContext {
    const tokenData = this.config.tokens?.get(token);
    if (!tokenData) {
      return { readonly: true, authenticated: false };
    }

    // Check expiration
    if (tokenData.expires && new Date(tokenData.expires) < new Date()) {
      return { readonly: true, authenticated: false };
    }

    const user = this.config.users?.get(tokenData.user);

    return {
      user,
      token: tokenData,
      readonly: tokenData.readonly,
      authenticated: true,
    };
  }

  /**
   * Validate JWT token
   */
  private validateJwt(token: string): AuthContext {
    try {
      // Simple JWT validation (use a proper library like jose in production)
      const [headerB64, payloadB64, signature] = token.split('.');
      if (!headerB64 || !payloadB64 || !signature) {
        return { readonly: true, authenticated: false };
      }

      const payload = JSON.parse(atob(payloadB64));

      // Check expiration
      if (payload.exp && payload.exp < Date.now() / 1000) {
        return { readonly: true, authenticated: false };
      }

      const user = this.config.users?.get(payload.sub);

      return {
        user,
        readonly: payload.readonly === true,
        authenticated: true,
      };
    } catch {
      return { readonly: true, authenticated: false };
    }
  }

  /**
   * Verify password (simplified - use bcrypt in production)
   */
  private verifyPassword(password: string, user: RegistryUser): boolean {
    // In production, use proper password hashing
    const hash = this.hashPassword(password, user.salt || '');
    return hash === user.passwordHash;
  }

  /**
   * Simple hash function (replace with bcrypt in production)
   */
  private hashPassword(password: string, salt: string): string {
    // This is a placeholder - use bcrypt or similar in production
    return btoa(`${password}:${salt}`);
  }

  /**
   * Check if request is a read operation
   */
  private isReadRequest(request: Request): boolean {
    const method = request.method;
    return method === 'GET' || method === 'HEAD';
  }

  /**
   * Generate authentication challenge response
   */
  challenge(): Response {
    return new Response(JSON.stringify({
      error: 'Unauthorized',
      message: 'Authentication required',
    }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': this.config.type === 'basic' ? 'Basic' : 'Bearer',
      },
    });
  }

  /**
   * Add user to registry
   */
  addUser(user: RegistryUser): void {
    if (!this.config.users) {
      this.config.users = new Map();
    }
    this.config.users.set(user.name, user);
  }

  /**
   * Create auth token for user
   */
  createToken(
    username: string, 
    readonly: boolean = false, 
    expiresIn?: number
  ): string {
    const token = crypto.randomUUID().replace(/-/g, '');
    const tokenData: AuthToken = {
      token,
      user: username,
      readonly,
      created: new Date().toISOString(),
      expires: expiresIn 
        ? new Date(Date.now() + expiresIn * 1000).toISOString() 
        : undefined,
    };

    if (!this.config.tokens) {
      this.config.tokens = new Map();
    }
    this.config.tokens.set(token, tokenData);

    return token;
  }

  /**
   * Revoke a token
   */
  revokeToken(token: string): boolean {
    return this.config.tokens?.delete(token) || false;
  }

  /**
   * Create JWT token
   */
  createJwt(username: string, readonly: boolean = false): string {
    const secret = this.config.jwtSecret || 'default-secret-change-in-production';
    const expiry = this.config.tokenExpiry || 86400; // 24 hours

    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
      sub: username,
      readonly,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + expiry,
    };

    const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '');
    const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '');
    
    // In production, use proper HMAC-SHA256 signing
    const signature = btoa(`${headerB64}.${payloadB64}.${secret}`).replace(/=/g, '');

    return `${headerB64}.${payloadB64}.${signature}`;
  }
}

// Export common auth configurations
export const AuthConfigs = {
  // No authentication - open registry
  none(): AuthConfig {
    return { type: 'none' };
  },

  // Basic auth with single admin user
  basic(adminPassword: string): AuthConfig {
    const users = new Map<string, RegistryUser>();
    const salt = crypto.randomUUID().slice(0, 8);
    users.set('admin', {
      name: 'admin',
      email: 'admin@factory-wager.com',
      passwordHash: btoa(`${adminPassword}:${salt}`),
      salt,
      roles: ['admin', 'publish'],
      date: new Date().toISOString(),
      updated: new Date().toISOString(),
    });

    return {
      type: 'basic',
      users,
      allowRead: true,
    };
  },

  // Token-based auth
  token(): AuthConfig {
    return {
      type: 'token',
      users: new Map(),
      tokens: new Map(),
      allowRead: true,
    };
  },

  // JWT auth
  jwt(secret: string): AuthConfig {
    return {
      type: 'jwt',
      jwtSecret: secret,
      tokenExpiry: 86400, // 24 hours
      users: new Map(),
      allowRead: true,
    };
  },
};

// CLI test
if (import.meta.main) {
  console.log(styled('🔐 Registry Auth Test', 'accent'));
  console.log(styled('=====================', 'accent'));

  const TEST_HOST = process.env.REGISTRY_HOST || process.env.SERVER_HOST || process.env.HOST || 'localhost';

  // Test no auth
  const noAuth = new RegistryAuth(AuthConfigs.none());
  const ctx1 = await noAuth.authenticate(new Request(`http://${TEST_HOST}`));
  console.log(styled(`\nNo Auth: ${ctx1.authenticated ? '✅' : '❌'}`, ctx1.authenticated ? 'success' : 'error'));

  // Test basic auth
  const basicAuth = new RegistryAuth(AuthConfigs.basic('testpass'));
  const req = new Request(`http://${TEST_HOST}`, {
    headers: {
      'Authorization': `Basic ${btoa('admin:testpass')}`,
    },
  });
  const ctx2 = await basicAuth.authenticate(req);
  console.log(styled(`Basic Auth: ${ctx2.authenticated ? '✅' : '❌'}`, ctx2.authenticated ? 'success' : 'error'));

  // Test JWT
  const jwtAuth = new RegistryAuth(AuthConfigs.jwt('test-secret'));
  const token = jwtAuth.createJwt('admin');
  const jwtReq = new Request(`http://${TEST_HOST}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  const ctx3 = await jwtAuth.authenticate(jwtReq);
  console.log(styled(`JWT Auth: ${ctx3.authenticated ? '✅' : '❌'}`, ctx3.authenticated ? 'success' : 'error'));
}
