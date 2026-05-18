/**
 * Authentication Middleware
 *
 * Validates JWT tokens and attaches user context to requests
 */

import jwt from 'jsonwebtoken';
import type { IRequest } from 'itty-router';

export interface AuthenticatedRequest extends IRequest {
  user?: {
    id: string;
    role: string;
    level: number;
    permissions: string[];
    scope?: {
      type: string;
      field: string;
      restriction: string;
    };
  };
  token?: string;
}

class AuthenticationError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Extract bearer token from Authorization header
 */
function extractBearerToken(authorization?: string): string | null {
  if (!authorization) return null;

  const parts = authorization.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Get JWT secret from environment or Bun secrets
 */
async function getJWTSecret(): Promise<string> {
  // Try Bun secrets first (if available)
  if (typeof Bun !== 'undefined' && Bun.env.JWT_SECRET) {
    return Bun.env.JWT_SECRET;
  }

  // Try process.env
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }

  // Try Cloudflare Workers environment (passed via context)
  if (globalThis.JWT_SECRET) {
    return globalThis.JWT_SECRET;
  }

  throw new AuthenticationError('JWT secret not configured');
}

/**
 * Validate JWT token and return payload
 */
async function validateToken(token: string): Promise<any> {
  const secret = await getJWTSecret();

  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      issuer: 'fire22-dashboard',
      audience: 'fire22-api',
    });

    return decoded;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new AuthenticationError('Token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new AuthenticationError('Invalid token');
    }
    throw new AuthenticationError('Token validation failed');
  }
}

/**
 * Check if token is blacklisted (revoked)
 */
async function isTokenBlacklisted(jti?: string): Promise<boolean> {
  if (!jti) return false;

  // Check against database or cache
  // For now, return false (implement actual check later)
  return false;
}

/**
 * Get user permissions from role
 */
function getRolePermissions(role: string): string[] {
  const rolePermissions: Record<string, string[]> = {
    admin: [
      'admin.*',
      'manager.*',
      'agent.*',
      'customer.*',
      'system.*',
      'financial.*',
      'wager.*',
      'reports.*',
      'analytics.*',
      'audit.view',
    ],
    manager: [
      'manager.*',
      'agent.view',
      'customer.list',
      'customer.view',
      'wager.view_live',
      'reports.weekly',
      'reports.daily',
      'analytics.sports',
      'financial.view',
    ],
    agent: [
      'agent.own',
      'wager.create',
      'wager.view_own',
      'customer.view_own',
      'customer.create_sub',
      'reports.own',
      'queue.deposit',
      'queue.withdrawal',
    ],
    customer: [
      'customer.own',
      'account.view_own',
      'account.update_own',
      'bet.view_own',
      'bet.history_own',
      'withdrawal.request',
      'deposit.request',
      'balance.view_own',
    ],
  };

  return rolePermissions[role] || [];
}

/**
 * Get role level for authorization
 */
function getRoleLevel(role: string): number {
  const roleLevels: Record<string, number> = {
    admin: 5,
    manager: 4,
    agent: 3,
    customer: 2,
    public: 1,
  };

  return roleLevels[role] || 0;
}

/**
 * Get scope restrictions based on role
 */
function getRoleScope(role: string, userId: string): any {
  switch (role) {
    case 'agent':
      return {
        type: 'agent',
        field: 'agentId',
        restriction: 'own_customers',
        value: userId,
      };
    case 'customer':
      return {
        type: 'customer',
        field: 'customerId',
        restriction: 'self_only',
        value: userId,
      };
    default:
      return null;
  }
}

/**
 * Main authentication middleware
 */
export async function authenticate(request: AuthenticatedRequest): Promise<Response | void> {
  try {
    // Extract token from header
    const token = extractBearerToken(request.headers?.get?.('authorization'));

    if (!token) {
      return new Response(
        JSON.stringify({
          error: 'Authentication required',
          message: 'No token provided',
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'Bearer realm="fire22-api"',
          },
        }
      );
    }

    // Validate token
    const payload = await validateToken(token);

    // Check if token is blacklisted
    if (await isTokenBlacklisted(payload.jti)) {
      return new Response(
        JSON.stringify({
          error: 'Token revoked',
          message: 'This token has been revoked',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get user permissions and scope
    const permissions = payload.permissions || getRolePermissions(payload.role);
    const scope = payload.scope || getRoleScope(payload.role, payload.sub);

    // Attach user context to request
    request.user = {
      id: payload.sub,
      role: payload.role,
      level: payload.level || getRoleLevel(payload.role),
      permissions,
      scope,
    };

    request.token = token;

    // Continue to next middleware
    return;
  } catch (error: any) {
    if (error instanceof AuthenticationError) {
      return new Response(
        JSON.stringify({
          error: 'Authentication failed',
          message: error.message,
        }),
        {
          status: error.statusCode,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: 'Internal error',
        message: 'Authentication service unavailable',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export async function authenticateOptional(request: AuthenticatedRequest): Promise<void> {
  try {
    const token = extractBearerToken(request.headers?.get?.('authorization'));

    if (token) {
      const payload = await validateToken(token);

      if (!(await isTokenBlacklisted(payload.jti))) {
        request.user = {
          id: payload.sub,
          role: payload.role,
          level: payload.level || getRoleLevel(payload.role),
          permissions: payload.permissions || getRolePermissions(payload.role),
          scope: payload.scope || getRoleScope(payload.role, payload.sub),
        };
        request.token = token;
      }
    }
  } catch {
    // Silently continue without authentication
  }
}

/**
 * Generate JWT token for a user
 */
export async function generateToken(user: {
  id: string;
  role: string;
  permissions?: string[];
}): Promise<string> {
  const secret = await getJWTSecret();

  const token = jwt.sign(
    {
      sub: user.id,
      role: user.role,
      level: getRoleLevel(user.role),
      permissions: user.permissions || getRolePermissions(user.role),
      scope: getRoleScope(user.role, user.id),
      type: 'access',
    },
    secret,
    {
      expiresIn: '24h',
      issuer: 'fire22-dashboard',
      audience: 'fire22-api',
      jwtId: crypto.randomUUID(),
    }
  );

  return token;
}

/**
 * Generate refresh token
 */
export async function generateRefreshToken(userId: string): Promise<string> {
  const secret = await getJWTSecret();

  const token = jwt.sign(
    {
      sub: userId,
      type: 'refresh',
    },
    secret,
    {
      expiresIn: '7d',
      issuer: 'fire22-dashboard',
      jwtId: crypto.randomUUID(),
    }
  );

  return token;
}

export default authenticate;
