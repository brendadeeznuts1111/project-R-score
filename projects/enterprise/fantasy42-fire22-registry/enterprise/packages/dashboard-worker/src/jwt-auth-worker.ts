import { Context } from 'hono';
import { mainWorkerInstance } from './main-worker'; // Import the main worker instance

// JWT Implementation for Cloudflare Workers
interface JWTPayload {
  sub: string;
  username: string;
  role: string;
  iat: number;
  exp: number;
}

interface User {
  id: string;
  username: string;
  password: string; // In production, this should be hashed
  role: string;
}

interface AuthConfig {
  jwtSecret: string;
  issuer: string;
  audience: string;
  tokenExpiry: number; // in seconds
}

class JWTAuthService {
  private config: AuthConfig;
  private users: Map<string, User> = new Map();

  constructor(config: AuthConfig) {
    this.config = config;
    this.initializeUsers();
  }

  private initializeUsers(): void {
    // In production, users should be stored in a database
    this.users.set('admin', {
      id: '1',
      username: 'admin',
      password: 'admin123', // In production, use bcrypt
      role: 'admin',
    });

    this.users.set('user', {
      id: '2',
      username: 'user',
      password: 'user123', // In production, use bcrypt
      role: 'user',
    });
  }

  // Base64 URL encoding helper
  private base64UrlEncode(str: string): string {
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  // Base64 URL decoding helper
  private base64UrlDecode(str: string): string {
    str += '='.repeat((4 - (str.length % 4)) % 4);
    return atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  }

  // Create JWT header
  private createHeader(): string {
    const header = {
      alg: 'HS256',
      typ: 'JWT',
    };
    return this.base64UrlEncode(JSON.stringify(header));
  }

  // Create JWT payload
  private createPayload(user: User): string {
    const now = Math.floor(Date.now() / 1000);
    const payload: JWTPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      iat: now,
      exp: now + this.config.tokenExpiry,
    };
    return this.base64UrlEncode(JSON.stringify(payload));
  }

  // Create signature
  private async createSignature(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(this.config.jwtSecret);
    const dataData = encoder.encode(data);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, dataData);
    return this.base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
  }

  // Verify signature
  private async verifySignature(data: string, signature: string): Promise<boolean> {
    try {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(this.config.jwtSecret);
      const dataData = encoder.encode(data);

      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
      );

      const signatureData = new Uint8Array(
        Array.from(this.base64UrlDecode(signature)).map(char => char.charCodeAt(0))
      );

      return await crypto.subtle.verify('HMAC', key, signatureData, dataData);
    } catch {
      return false;
    }
  }

  // Generate JWT token
  async generateToken(username: string, password: string): Promise<string | null> {
    const user = this.users.get(username);
    if (!user || user.password !== password) {
      return null;
    }

    const header = this.createHeader();
    const payload = this.createPayload(user);
    const dataToSign = `${header}.${payload}`;
    const signature = await this.createSignature(dataToSign);

    return `${dataToSign}.${signature}`;
  }

  // Verify JWT token
  async verifyToken(token: string): Promise<JWTPayload | null> {
    try {
      const [header, payload, signature] = token.split('.');

      if (!header || !payload || !signature) {
        return null;
      }

      // Verify signature
      const isValid = await this.verifySignature(`${header}.${payload}`, signature);
      if (!isValid) {
        return null;
      }

      // Decode payload
      const payloadData = JSON.parse(this.base64UrlDecode(payload));

      // Check expiration
      if (payloadData.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return payloadData;
    } catch {
      return null;
    }
  }

  // HTTP Basic Authentication
  async basicAuth(authorizationHeader: string | null): Promise<User | null> {
    if (!authorizationHeader || !authorizationHeader.startsWith('Basic ')) {
      return null;
    }

    try {
      const base64Credentials = authorizationHeader.slice(6);
      const credentials = atob(base64Credentials);
      const [username, password] = credentials.split(':', 2);

      const user = this.users.get(username);
      if (!user || user.password !== password) {
        return null;
      }

      return user;
    } catch {
      return null;
    }
  }

  // Extract token from Authorization header
  extractToken(authorizationHeader: string | null): string | null {
    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
      return null;
    }
    return authorizationHeader.slice(7);
  }
}

// Cloudflare Worker implementation
export class AuthWorker {
  private authService: JWTAuthService;

  constructor() {
    const envManager = mainWorkerInstance.getEnvManager();
    const jwtSecret = envManager.getConfig().envValidation.required.find(v => v === 'JWT_SECRET')
      ? Bun.env.JWT_SECRET
      : 'your-secret-key-change-in-production';

    this.authService = new JWTAuthService({
      jwtSecret: jwtSecret || 'your-secret-key-change-in-production', // Use environment variables in production
      issuer: 'fire22-auth',
      audience: 'fire22-api',
      tokenExpiry: 3600, // 1 hour
    });
  }

  // Handle HTTP Basic Authentication
  async handleBasicAuth(request: Request): Promise<Response> {
    const user = await this.authService.basicAuth(request.headers.get('Authorization'));

    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': 'Basic realm="Fire22 API"',
        },
      });
    }

    // Generate JWT token for successful basic auth
    const token = await this.authService.generateToken(user.username, user.password);
    if (!token) {
      return new Response(JSON.stringify({ error: 'Token generation failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Set the token in the Fire22ApiClient instance
    mainWorkerInstance.getFire22ApiClient().setToken(token);

    return new Response(
      JSON.stringify({
        message: 'Authentication successful',
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
        },
        token: token,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Handle JWT Authentication
  async handleJWTAuth(request: Request): Promise<Response> {
    const token = this.authService.extractToken(request.headers.get('Authorization'));

    if (!token) {
      return new Response(JSON.stringify({ error: 'No token provided' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': 'Bearer realm="Fire22 API"',
        },
      });
    }

    const payload = await this.authService.verifyToken(token);
    if (!payload) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        message: 'Token is valid',
        user: {
          id: payload.sub,
          username: payload.username,
          role: payload.role,
        },
        payload: payload,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Handle protected route
  async handleProtectedRoute(request: Request): Promise<Response> {
    const token = this.authService.extractToken(request.headers.get('Authorization'));

    if (!token) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': 'Bearer realm="Fire22 API"',
        },
      });
    }

    const payload = await this.authService.verifyToken(token);
    if (!payload) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // User is authenticated, return protected data
    return new Response(
      JSON.stringify({
        message: 'Access granted to protected resource',
        user: {
          id: payload.sub,
          username: payload.username,
          role: payload.role,
        },
        data: {
          secret: 'This is protected data only accessible with valid JWT',
          timestamp: new Date().toISOString(),
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Handle token refresh
  async handleTokenRefresh(request: Request): Promise<Response> {
    const token = this.authService.extractToken(request.headers.get('Authorization'));

    if (!token) {
      return new Response(JSON.stringify({ error: 'No token provided' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const payload = await this.authService.verifyToken(token);
    if (!payload) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Generate new token
    const user = this.authService['users'].get(payload.username);
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const newToken = await this.authService.generateToken(user.username, user.password);
    if (!newToken) {
      return new Response(JSON.stringify({ error: 'Token refresh failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        message: 'Token refreshed successfully',
        token: newToken,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Main request handler
  async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight requests
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      switch (path) {
        case '/auth/basic':
          if (method === 'POST') {
            const response = await this.handleBasicAuth(request);
            const headers = new Headers(response.headers);
            Object.entries(corsHeaders).forEach(([key, value]) => {
              headers.set(key, value);
            });
            return new Response(response.body, {
              status: response.status,
              headers,
            });
          }
          break;

        case '/auth/verify':
          if (method === 'POST') {
            const response = await this.handleJWTAuth(request);
            const headers = new Headers(response.headers);
            Object.entries(corsHeaders).forEach(([key, value]) => {
              headers.set(key, value);
            });
            return new Response(response.body, {
              status: response.status,
              headers,
            });
          }
          break;

        case '/auth/refresh':
          if (method === 'POST') {
            const response = await this.handleTokenRefresh(request);
            const headers = new Headers(response.headers);
            Object.entries(corsHeaders).forEach(([key, value]) => {
              headers.set(key, value);
            });
            return new Response(response.body, {
              status: response.status,
              headers,
            });
          }
          break;

        case '/protected':
          if (method === 'GET') {
            const response = await this.handleProtectedRoute(request);
            const headers = new Headers(response.headers);
            Object.entries(corsHeaders).forEach(([key, value]) => {
              headers.set(key, value);
            });
            return new Response(response.body, {
              status: response.status,
              headers,
            });
          }
          break;

        case '/':
          if (method === 'GET') {
            return new Response(
              JSON.stringify({
                message: 'Fire22 JWT Authentication Service',
                version: '1.0.0',
                endpoints: {
                  basic: 'POST /auth/basic - HTTP Basic Auth to get JWT',
                  verify: 'POST /auth/verify - Verify JWT token',
                  refresh: 'POST /auth/refresh - Refresh JWT token',
                  protected: 'GET /protected - Access protected resource',
                },
              }),
              {
                status: 200,
                headers: {
                  'Content-Type': 'application/json',
                  ...corsHeaders,
                },
              }
            );
          }
          break;
      }

      return new Response(JSON.stringify({ error: 'Not Found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    } catch (error) {
      console.error('Error handling request:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }
  }
}

// Export for Cloudflare Worker
export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const worker = new AuthWorker();
    return worker.handleRequest(request);
  },
};
