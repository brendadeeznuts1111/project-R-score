#!/usr/bin/env bun
/**
 * 🔐 Enhanced Authentication Middleware
 *
 * Advanced security features for the Fire22 authentication system
 * Includes rate limiting, audit logging, and security monitoring
 *
 * @version 3.0.9
 * @author Fire22 Development Team
 */

import jwt from 'jsonwebtoken';
import type { IRequest } from 'itty-router';
import { authenticate, generateToken, generateRefreshToken } from './auth.middleware.js';

interface SecurityEvent {
  type:
    | 'login_success'
    | 'login_failure'
    | 'token_expired'
    | 'token_invalid'
    | 'rate_limit_exceeded'
    | 'suspicious_activity';
  userId?: string;
  ip?: string;
  userAgent?: string;
  timestamp: Date;
  details?: any;
}

interface RateLimitEntry {
  count: number;
  windowStart: number;
  blocked: boolean;
  blockExpiry?: number;
}

interface SecurityConfig {
  maxLoginAttempts: number;
  lockoutDuration: number; // minutes
  rateLimitWindow: number; // minutes
  suspiciousThreshold: number;
  auditLogRetention: number; // days
}

class EnhancedAuthenticationError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401,
    public securityEvent?: Partial<SecurityEvent>
  ) {
    super(message);
    this.name = 'EnhancedAuthenticationError';
  }
}

class SecurityManager {
  private static instance: SecurityManager;
  private rateLimitMap = new Map<string, RateLimitEntry>();
  private securityEvents: SecurityEvent[] = [];
  private blacklistedTokens = new Set<string>();

  private config: SecurityConfig = {
    maxLoginAttempts: 5,
    lockoutDuration: 15,
    rateLimitWindow: 15,
    suspiciousThreshold: 10,
    auditLogRetention: 90,
  };

  static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  /**
   * Check rate limiting for IP address
   */
  checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
    const key = `rate_limit_${ip}`;
    const now = Date.now();
    const windowMs = this.config.rateLimitWindow * 60 * 1000;

    let entry = this.rateLimitMap.get(key);

    if (!entry) {
      entry = { count: 1, windowStart: now, blocked: false };
      this.rateLimitMap.set(key, entry);
      return { allowed: true };
    }

    // Check if current window has expired
    if (now - entry.windowStart > windowMs) {
      entry.count = 1;
      entry.windowStart = now;
      entry.blocked = false;
      delete entry.blockExpiry;
      return { allowed: true };
    }

    // Check if currently blocked
    if (entry.blocked && entry.blockExpiry && now < entry.blockExpiry) {
      return {
        allowed: false,
        retryAfter: Math.ceil((entry.blockExpiry - now) / 1000),
      };
    }

    // Increment counter
    entry.count++;

    // Block if exceeded limit
    if (entry.count > this.config.maxLoginAttempts) {
      entry.blocked = true;
      entry.blockExpiry = now + this.config.lockoutDuration * 60 * 1000;

      this.logSecurityEvent({
        type: 'rate_limit_exceeded',
        ip,
        timestamp: new Date(),
        details: { attempts: entry.count },
      });

      return {
        allowed: false,
        retryAfter: this.config.lockoutDuration * 60,
      };
    }

    return { allowed: true };
  }

  /**
   * Log security events for audit trail
   */
  logSecurityEvent(event: SecurityEvent): void {
    this.securityEvents.push(event);

    // Clean old events
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.config.auditLogRetention);

    this.securityEvents = this.securityEvents.filter(e => e.timestamp > cutoff);

    // Log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔐 Security Event:`, {
        type: event.type,
        userId: event.userId,
        ip: event.ip,
        timestamp: event.timestamp.toISOString(),
      });
    }
  }

  /**
   * Add token to blacklist
   */
  blacklistToken(token: string): void {
    this.blacklistedTokens.add(token);
  }

  /**
   * Check if token is blacklisted
   */
  isTokenBlacklisted(token: string): boolean {
    return this.blacklistedTokens.has(token);
  }

  /**
   * Detect suspicious activity patterns
   */
  detectSuspiciousActivity(ip: string, userId?: string): boolean {
    const recentEvents = this.securityEvents.filter(event => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      return event.timestamp > fiveMinutesAgo && (event.ip === ip || event.userId === userId);
    });

    const failureCount = recentEvents.filter(event => event.type === 'login_failure').length;

    return failureCount >= this.config.suspiciousThreshold;
  }

  /**
   * Get security statistics
   */
  getSecurityStats(): {
    totalEvents: number;
    recentFailures: number;
    activeBlocks: number;
    blacklistedTokens: number;
  } {
    const lastHour = new Date(Date.now() - 60 * 60 * 1000);
    const recentFailures = this.securityEvents.filter(
      event => event.timestamp > lastHour && event.type === 'login_failure'
    ).length;

    const activeBlocks = Array.from(this.rateLimitMap.values()).filter(
      entry => entry.blocked && entry.blockExpiry && Date.now() < entry.blockExpiry
    ).length;

    return {
      totalEvents: this.securityEvents.length,
      recentFailures,
      activeBlocks,
      blacklistedTokens: this.blacklistedTokens.size,
    };
  }

  /**
   * Clear old rate limit entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.rateLimitMap.entries()) {
      if (entry.blockExpiry && now > entry.blockExpiry) {
        this.rateLimitMap.delete(key);
      }
    }
  }
}

/**
 * Enhanced authentication middleware with security features
 */
export async function enhancedAuthenticate(request: any): Promise<Response | void> {
  const security = SecurityManager.getInstance();
  const ip =
    request.headers?.get?.('cf-connecting-ip') ||
    request.headers?.get?.('x-forwarded-for') ||
    request.headers?.get?.('x-real-ip') ||
    'unknown';
  const userAgent = request.headers?.get?.('user-agent') || 'unknown';

  try {
    // Rate limiting check
    const rateLimit = security.checkRateLimit(ip);
    if (!rateLimit.allowed) {
      security.logSecurityEvent({
        type: 'rate_limit_exceeded',
        ip,
        userAgent,
        timestamp: new Date(),
      });

      return new Response(
        JSON.stringify({
          error: 'Too many requests',
          message: 'Rate limit exceeded',
          retryAfter: rateLimit.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': rateLimit.retryAfter?.toString() || '900',
            'X-RateLimit-Limit': security['config'].maxLoginAttempts.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(
              Date.now() + (rateLimit.retryAfter || 900) * 1000
            ).toISOString(),
          },
        }
      );
    }

    // Call original authentication
    const result = await authenticate(request);

    if (result instanceof Response) {
      // Authentication failed
      security.logSecurityEvent({
        type: 'login_failure',
        ip,
        userAgent,
        timestamp: new Date(),
        details: { status: result.status },
      });

      // Check for suspicious activity
      if (security.detectSuspiciousActivity(ip)) {
        security.logSecurityEvent({
          type: 'suspicious_activity',
          ip,
          userAgent,
          timestamp: new Date(),
        });
      }

      return result;
    }

    // Authentication successful
    if (request.user) {
      security.logSecurityEvent({
        type: 'login_success',
        userId: request.user.id,
        ip,
        userAgent,
        timestamp: new Date(),
      });
    }

    return result;
  } catch (error) {
    security.logSecurityEvent({
      type: 'login_failure',
      ip,
      userAgent,
      timestamp: new Date(),
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    });

    throw error;
  }
}

/**
 * Token revocation endpoint
 */
export async function revokeToken(request: any): Promise<Response> {
  const security = SecurityManager.getInstance();

  try {
    const token = request.token;
    if (token) {
      security.blacklistToken(token);

      security.logSecurityEvent({
        type: 'token_invalid',
        userId: request.user?.id,
        timestamp: new Date(),
        details: { action: 'revoked' },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Token revoked successfully',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Token revocation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Security health check endpoint
 */
export async function securityHealthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  stats: any;
  issues: string[];
}> {
  const security = SecurityManager.getInstance();
  const stats = security.getSecurityStats();
  const issues: string[] = [];

  // Check for concerning patterns
  if (stats.recentFailures > 50) {
    issues.push(`High number of recent login failures: ${stats.recentFailures}`);
  }

  if (stats.activeBlocks > 10) {
    issues.push(`High number of active IP blocks: ${stats.activeBlocks}`);
  }

  if (stats.blacklistedTokens > 1000) {
    issues.push(`Large number of blacklisted tokens: ${stats.blacklistedTokens}`);
  }

  // Cleanup old entries
  security.cleanup();

  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (issues.length > 0) {
    status = issues.length > 2 ? 'unhealthy' : 'degraded';
  }

  return {
    status,
    stats,
    issues,
  };
}

/**
 * Get security audit log
 */
export function getSecurityAuditLog(
  filters: {
    type?: SecurityEvent['type'];
    userId?: string;
    ip?: string;
    since?: Date;
    limit?: number;
  } = {}
): SecurityEvent[] {
  const security = SecurityManager.getInstance();
  let events = security['securityEvents'];

  // Apply filters
  if (filters.type) {
    events = events.filter(e => e.type === filters.type);
  }

  if (filters.userId) {
    events = events.filter(e => e.userId === filters.userId);
  }

  if (filters.ip) {
    events = events.filter(e => e.ip === filters.ip);
  }

  if (filters.since) {
    events = events.filter(e => e.timestamp > filters.since!);
  }

  // Sort by timestamp (newest first)
  events = events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  // Apply limit
  if (filters.limit) {
    events = events.slice(0, filters.limit);
  }

  return events;
}

/**
 * Enhanced token generation with additional security
 */
export async function generateEnhancedToken(user: {
  id: string;
  role: string;
  permissions?: string[];
  ip?: string;
}): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
  const security = SecurityManager.getInstance();

  // Check for suspicious activity
  if (user.ip && security.detectSuspiciousActivity(user.ip, user.id)) {
    security.logSecurityEvent({
      type: 'suspicious_activity',
      userId: user.id,
      ip: user.ip,
      timestamp: new Date(),
      details: { action: 'token_generation_blocked' },
    });

    throw new EnhancedAuthenticationError(
      'Token generation blocked due to suspicious activity',
      403,
      { type: 'suspicious_activity' }
    );
  }

  const accessToken = await generateToken(user);
  const refreshToken = await generateRefreshToken(user.id);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  security.logSecurityEvent({
    type: 'login_success',
    userId: user.id,
    ip: user.ip,
    timestamp: new Date(),
    details: { action: 'token_generated' },
  });

  return {
    accessToken,
    refreshToken,
    expiresAt,
  };
}

export { SecurityManager, EnhancedAuthenticationError };
export default enhancedAuthenticate;
