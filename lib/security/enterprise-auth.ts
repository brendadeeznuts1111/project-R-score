// lib/security/enterprise-auth.ts — Enterprise authentication system

import { Tier1380PasswordSecurity } from './enterprise-password-security';

import { styled, log } from '../theme/colors';
import { Utils } from '../utils/index';
import Tier1380SecretManager from './tier1380-secret-manager';

interface AuthenticationContext {
  ipAddress: string;
  userAgent: string;
  location?: string;
}

interface AuthenticationResult {
  success: boolean;
  session?: SessionToken;
  warnings?: string[];
  metadata?: {
    lastPasswordChange?: Date;
    passwordScore?: number;
    [key: string]: any;
  };
}

interface SessionToken {
  token: string;
  userId: string;
  expiresAt: Date;
  permissions: string[];
  metadata: Record<string, any>;
}

interface AuthenticationError extends Error {
  code?: string;
  score?: number;
  userId?: string;
}

export class Tier1380EnterpriseAuth {
  private static rateLimitStore = new Map<string, { attempts: number; lastAttempt: Date }>();
  private static auditLog: Array<{
    timestamp: Date;
    userId: string;
    action: string;
    success: boolean;
    ipAddress: string;
    userAgent: string;
    metadata?: any;
  }> = [];

  /**
   * Complete authentication flow with enterprise security
   */
  static async authenticate(
    username: string,
    password: string,
    context: AuthenticationContext
  ): Promise<AuthenticationResult> {
    // 1. Rate limiting
    await this.checkRateLimit(username, context.ipAddress);

    // 2. Retrieve password hash from Windows Credential Manager
    const passwordResult = await Tier1380PasswordSecurity.verifyPassword(password, username);

    if (!passwordResult.valid) {
      await this.logFailedAttempt(username, context);
      throw new AuthenticationError('Invalid credentials') as AuthenticationError;
    }

    // 3. Check if password needs rehashing
    if (passwordResult.needsRehash) {
      await this.rehashPassword(username, password);
    }

    // 4. Generate secure session token
    const session = await this.createSession(username, {
      passwordScore: passwordResult.score,
      ...context,
    });

    // 5. Update security audit log
    await this.auditLogin(username, {
      success: true,
      score: passwordResult.score,
      ...context,
    });

    return {
      success: true,
      session,
      warnings: passwordResult.warnings,
      metadata: {
        lastPasswordChange: await this.getLastPasswordChange(username),
        passwordScore: passwordResult.score,
      },
    };
  }

  /**
   * Rate limiting to prevent brute force attacks
   */
  private static async checkRateLimit(username: string, ipAddress: string): Promise<void> {
    const key = `${username}:${ipAddress}`;
    const now = new Date();
    const existing = this.rateLimitStore.get(key);

    if (!existing) {
      this.rateLimitStore.set(key, { attempts: 1, lastAttempt: now });
      return;
    }

    // Reset if last attempt was more than 15 minutes ago
    if (now.getTime() - existing.lastAttempt.getTime() > 15 * 60 * 1000) {
      this.rateLimitStore.set(key, { attempts: 1, lastAttempt: now });
      return;
    }

    // Increment attempts
    existing.attempts++;
    existing.lastAttempt = now;
    this.rateLimitStore.set(key, existing);

    // Lock account after 5 failed attempts
    if (existing.attempts >= 5) {
      await this.lockAccount(username, 'Too many failed attempts');
      throw new AuthenticationError(
        'Account locked due to too many failed attempts'
      ) as AuthenticationError;
    }

    // Add delay to slow down brute force attempts
    const delay = Math.min(existing.attempts * 1000, 5000); // Max 5 seconds
    await Bun.sleep(delay);
  }

  /**
   * Create secure session token
   */
  private static async createSession(
    username: string,
    metadata: Record<string, any>
  ): Promise<SessionToken> {
    const token = this.generateSecureToken();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours

    // Get user permissions (would be from database/AD)
    const permissions = await this.getUserPermissions(username);

    const session: SessionToken = {
      token,
      userId: username,
      expiresAt,
      permissions,
      metadata: {
        ...metadata,
        createdAt: new Date(),
        lastActivity: new Date(),
      },
    };

    // Store session (in production, would use secure session store)
    await this.storeSession(session);

    return session;
  }

  /**
   * Generate cryptographically secure session token
   */
  private static generateSecureToken(): string {
    const bytes = Bun.randomBytes(32);
    return bytes.toString('hex');
  }

  /**
   * Store session in secure storage
   */
  private static async storeSession(session: SessionToken): Promise<void> {
    const key = `TIER1380_SESSION_${session.token}`;
    const sessionData = JSON.stringify(session);

    // In production, would use secure session store or database
    console.log(`Storing session for user: ${session.userId}`);
  }

  /**
   * Retrieve session from storage
   */
  private static async retrieveSession(token: string): Promise<SessionToken | null> {
    const key = `TIER1380_SESSION_${token}`;
    const sessionData = await Tier1380SecretManager.getSecret(key);

    if (!sessionData) return null;

    try {
      const session = JSON.parse(sessionData);

      // Check if expired
      if (new Date() > session.expiresAt) {
        await this.removeSession(token);
        return null;
      }

      // Update last activity
      session.metadata.lastActivity = new Date();
      await this.storeSession(session);

      return session;
    } catch {
      return null;
    }
  }

  /**
   * Remove expired session
   */
  private static async removeSession(token: string): Promise<void> {
    const key = `TIER1380_SESSION_${token}`;
    await Tier1380SecretManager.setSecret(key, '', { delete: true });
  }

  /**
   * Verify session token
   */
  static async verifySession(token: string): Promise<SessionToken | null> {
    return await this.retrieveSession(token);
  }

  /**
   * Get user permissions from directory service
   */
  private static async getUserPermissions(username: string): Promise<string[]> {
    // In production, would query Active Directory, LDAP, or database
    // For demo, return basic permissions based on username
    const adminUsers = ['admin', 'administrator', 'root'];
    const powerUsers = ['poweruser', 'developer', 'ops'];

    if (adminUsers.includes(username.toLowerCase())) {
      return ['admin', 'read', 'write', 'delete', 'deploy', 'audit'];
    } else if (powerUsers.includes(username.toLowerCase())) {
      return ['read', 'write', 'deploy'];
    } else {
      return ['read'];
    }
  }

  /**
   * Log failed authentication attempt
   */
  private static async logFailedAttempt(
    username: string,
    context: AuthenticationContext
  ): Promise<void> {
    const logEntry = {
      timestamp: new Date(),
      userId: username,
      action: 'AUTH_FAILED',
      success: false,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: {
        location: context.location,
      },
    };

    this.auditLog.push(logEntry);

    // In production, would send to SIEM system
    console.log(`🚨 Authentication failed for ${username} from ${context.ipAddress}`);
  }

  /**
   * Log successful authentication
   */
  private static async auditLogin(username: string, metadata: Record<string, any>): Promise<void> {
    const logEntry = {
      timestamp: new Date(),
      userId: username,
      action: 'AUTH_SUCCESS',
      success: true,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      metadata,
    };

    this.auditLog.push(logEntry);

    console.log(`✅ Authentication successful for ${username}`);
  }

  /**
   * Rehash password with updated algorithm
   */
  private static async rehashPassword(username: string, password: string): Promise<void> {
    try {
      await Tier1380PasswordSecurity.hashPassword(password, { userId: username });
      console.log(`🔄 Rehashed password for ${username}`);
    } catch (error) {
      console.error(`Failed to rehash password for ${username}:`, error);
    }
  }

  /**
   * Get last password change timestamp
   */
  private static async getLastPasswordChange(username: string): Promise<Date> {
    const hash = await Tier1380PasswordSecurity.retrievePasswordHash(username);
    return hash?.createdAt || new Date(0);
  }

  /**
   * Lock user account temporarily
   */
  private static async lockAccount(username: string, reason: string): Promise<void> {
    const lockKey = `TIER1380_LOCK_${username}`;
    const lockData = JSON.stringify({
      locked: true,
      reason,
      lockedAt: new Date(),
      lockExpires: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
    });

    await Tier1380SecretManager.setSecret(lockKey, lockData, {
      persistEnterprise: true,
    });

    console.log(`🔒 Locked account ${username}: ${reason}`);
  }

  /**
   * Check if account is locked
   */
  private static async isAccountLocked(username: string): Promise<boolean> {
    const lockKey = `TIER1380_LOCK_${username}`;
    const lockData = await Tier1380SecretManager.getSecret(lockKey);

    if (!lockData) return false;

    try {
      const lock = JSON.parse(lockData);

      // Check if lock has expired
      if (new Date() > lock.lockExpires) {
        await this.unlockAccount(username);
        return false;
      }

      return lock.locked;
    } catch {
      return false;
    }
  }

  /**
   * Unlock account
   */
  private static async unlockAccount(username: string): Promise<void> {
    const lockKey = `TIER1380_LOCK_${username}`;
    await Tier1380SecretManager.setSecret(lockKey, '', { delete: true });
    console.log(`🔓 Unlocked account: ${username}`);
  }

  /**
   * Get authentication audit log
   */
  static getAuditLog(limit: number = 100): Array<any> {
    return this.auditLog.slice(-limit);
  }

  /**
   * Clear audit log
   */
  static clearAuditLog(): void {
    this.auditLog = [];
  }

  /**
   * Generate authentication report
   */
  static generateAuthReport(): {
    timestamp: Date;
    period: string;
    totalAttempts: number;
    successfulLogins: number;
    failedLogins: number;
    uniqueUsers: number;
    successRate: string;
    topFailedIPs: Array<{ ip: string; count: number }>;
    recommendations: string[];
  } {
    const now = new Date();
    const last24Hours = this.auditLog.filter(
      entry => now.getTime() - entry.timestamp.getTime() < 24 * 60 * 60 * 1000
    );

    const successfulLogins = last24Hours.filter(entry => entry.success);
    const failedLogins = last24Hours.filter(entry => !entry.success);
    const uniqueUsers = new Set(last24Hours.map(entry => entry.userId));

    const report = {
      timestamp: now,
      period: '24 hours',
      totalAttempts: last24Hours.length,
      successfulLogins: successfulLogins.length,
      failedLogins: failedLogins.length,
      uniqueUsers: uniqueUsers.size,
      successRate:
        last24Hours.length > 0
          ? ((successfulLogins.length / last24Hours.length) * 100).toFixed(1)
          : '0',
      topFailedIPs: this.getTopFailedIPs(failedLogins),
      recommendations: this.generateRecommendations(failedLogins),
    };

    return report;
  }

  private static getTopFailedIPs(failedLogins: any[]): Array<{ ip: string; count: number }> {
    const ipCounts = new Map<string, number>();

    failedLogins.forEach(entry => {
      const count = ipCounts.get(entry.ipAddress) || 0;
      ipCounts.set(entry.ipAddress, count + 1);
    });

    return Array.from(ipCounts.entries())
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private static generateRecommendations(failedLogins: any[]): string[] {
    const recommendations: string[] = [];

    // Check for suspicious patterns
    const topIPs = this.getTopFailedIPs(failedLogins);
    if (topIPs.length > 0 && topIPs[0].count > 10) {
      recommendations.push(
        `Consider blocking IP: ${topIPs[0].ip} (${topIPs[0].count} failed attempts)`
      );
    }

    // Check for high failure rate users
    const userFailures = new Map<string, number>();
    failedLogins.forEach(entry => {
      const count = userFailures.get(entry.userId) || 0;
      userFailures.set(entry.userId, count + 1);
    });

    const highFailureUsers = Array.from(userFailures.entries())
      .filter(([, count]) => count > 5)
      .map(([userId]) => userId);

    if (highFailureUsers.length > 0) {
      recommendations.push(`Users with high failure rates: ${highFailureUsers.join(', ')}`);
    }

    return recommendations;
  }
}

export default Tier1380EnterpriseAuth;

export class AuthenticationError extends Error {
  constructor(
    message: string,
    public code?: string,
    public score?: number,
    public userId?: string
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}
