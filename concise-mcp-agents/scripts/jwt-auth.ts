#!/usr/bin/env bun

// [JWT][AUTH][TOKENS][JWT-AUTH-001][v2.11][ACTIVE]

import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { AccessControlSystem, User, UserRole } from "./access-control.ts";
import crypto from "crypto";

interface JWTPayloadExtended extends JWTPayload {
  userId: string;
  role: UserRole;
  permissions?: string[];
  ip?: string;
}

export class JWTAuthSystem {
  private access: AccessControlSystem;
  private revokedTokens: Set<string> = new Set();
  private secret: Uint8Array;

  constructor() {
    this.access = new AccessControlSystem();
    // Generate or load secret
    this.secret = this.getSecret();
  }

  private getSecret(): Uint8Array {
    const secretKey = process.env.JWT_SECRET || 'syndicate-jwt-secret-key-2024';
    return new TextEncoder().encode(secretKey);
  }

  async generateToken(user: User, ip?: string): Promise<string> {
    const payload: JWTPayloadExtended = {
      userId: user.id,
      role: user.role,
      permissions: await this.getUserPermissions(user.role),
      ip: ip,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
    };

    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30d')
      .sign(this.secret);

    return token;
  }

  async verifyToken(token: string, requiredRole?: UserRole): Promise<{ valid: boolean; user?: User; reason?: string }> {
    try {
      // Check if token is revoked
      if (this.revokedTokens.has(token)) {
        return { valid: false, reason: 'Token revoked' };
      }

      const { payload } = await jwtVerify(token, this.secret) as { payload: JWTPayloadExtended };
      const user = await this.access.getUser(payload.userId);

      if (!user) {
        return { valid: false, reason: 'User not found' };
      }

      // Check role if required
      if (requiredRole && user.role !== requiredRole && user.role !== 'ADMIN') {
        return { valid: false, reason: `Insufficient permissions. Required: ${requiredRole}, Got: ${user.role}` };
      }

      // Check if token is expired (additional check)
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        return { valid: false, reason: 'Token expired' };
      }

      // Update user last active
      user.lastActive = new Date().toISOString();
      await this.access.updateUser(user);

      return { valid: true, user };

    } catch (error) {
      return { valid: false, reason: `Invalid token: ${error.message}` };
    }
  }

  async revokeToken(token: string): Promise<void> {
    this.revokedTokens.add(token);
    // In production, persist to Redis/database
  }

  async refreshToken(oldToken: string, ip?: string): Promise<{ token?: string; reason?: string }> {
    const verification = await this.verifyToken(oldToken);
    if (!verification.valid || !verification.user) {
      return { reason: verification.reason };
    }

    // Revoke old token
    await this.revokeToken(oldToken);

    // Generate new token
    const newToken = await this.generateToken(verification.user, ip);
    return { token: newToken };
  }

  private async getUserPermissions(role: UserRole): Promise<string[]> {
    const permissions: Record<UserRole, string[]> = {
      'ADMIN': ['read', 'write', 'delete', 'deploy', 'admin'],
      'OPS': ['read', 'write', 'pipe', 'monitor'],
      'AGENT': ['read', 'grep', 'dataview'],
      'GUEST': ['read']
    };

    return permissions[role] || [];
  }

  async checkPermission(user: User, resource: string, action: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(user.role);
    return permissions.includes(action) || permissions.includes('admin');
  }

  // Middleware-style function for Express-like frameworks
  createAuthMiddleware(requiredRole?: UserRole) {
    return async (req: any, res: any, next: any) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'No token provided' });
        return;
      }

      const token = authHeader.substring(7);
      const verification = await this.verifyToken(token, requiredRole);

      if (!verification.valid) {
        res.status(403).json({ error: verification.reason });
        return;
      }

      req.user = verification.user;
      next();
    };
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const jwt = new JWTAuthSystem();

  if (args.length === 0) {
    console.log(`🔑 JWT Authentication System v2.11

USAGE:
  bun jwt:generate <user-id> [ip]       # Generate JWT token
  bun jwt:verify <token> [role]          # Verify JWT token
  bun jwt:revoke <token>                 # Revoke JWT token
  bun jwt:refresh <old-token> [ip]       # Refresh JWT token

ENVIRONMENT:
  JWT_SECRET                            # Secret key for signing

EXAMPLES:
  bun jwt:generate user123 192.168.1.1  # Generate token
  bun jwt:verify eyJhbGciOiJIUzI1NiIs... ADMIN  # Verify with role check
  bun jwt:revoke eyJhbGciOiJIUzI1NiIs...       # Revoke token
`);
    return;
  }

  const command = args[0];

  try {
    switch (command) {
      case 'generate':
        if (args.length < 2) {
          console.error('Usage: bun jwt:generate <user-id> [ip]');
          process.exit(1);
        }
        const userId = args[1];
        const ip = args[2];

        const access = new AccessControlSystem();
        const user = await access.getUser(userId);

        if (!user) {
          console.error(`User ${userId} not found`);
          process.exit(1);
        }

        const token = await jwt.generateToken(user, ip);
        console.log(`✅ JWT Token generated for ${userId}:`);
        console.log(token);
        break;

      case 'verify':
        if (args.length < 2) {
          console.error('Usage: bun jwt:verify <token> [required-role]');
          process.exit(1);
        }
        const verifyToken = args[1];
        const requiredRole = args[2] as UserRole | undefined;

        const verification = await jwt.verifyToken(verifyToken, requiredRole);
        if (verification.valid) {
          console.log(`✅ Token valid for user: ${verification.user?.username} (${verification.user?.role})`);
        } else {
          console.log(`❌ Token invalid: ${verification.reason}`);
          process.exit(1);
        }
        break;

      case 'revoke':
        if (args.length < 2) {
          console.error('Usage: bun jwt:revoke <token>');
          process.exit(1);
        }
        const revokeToken = args[1];
        await jwt.revokeToken(revokeToken);
        console.log(`✅ Token revoked`);
        break;

      case 'refresh':
        if (args.length < 2) {
          console.error('Usage: bun jwt:refresh <old-token> [ip]');
          process.exit(1);
        }
        const oldToken = args[1];
        const newIp = args[2];

        const refreshResult = await jwt.refreshToken(oldToken, newIp);
        if (refreshResult.token) {
          console.log(`✅ Token refreshed:`);
          console.log(refreshResult.token);
        } else {
          console.log(`❌ Token refresh failed: ${refreshResult.reason}`);
          process.exit(1);
        }
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.log('Use: bun jwt --help');
        process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// CLI execution
if (import.meta.main) {
  main().catch(console.error);
}
