// lib/security/zero-trust-manager.ts — Zero-trust security manager

import { EventEmitter } from 'events';
import { logger } from '../core/structured-logger';
import { auditLogger } from './secret-audit-logger';
import { createHash, timingSafeEqual } from 'crypto';

export interface Identity {
  id: string;
  type: 'user' | 'service' | 'device' | 'api_key';
  attributes: Record<string, any>;
  credentials: {
    type: 'password' | 'token' | 'certificate' | 'biometric';
    hash: string;
    expires?: number;
  };
  trustScore: number; // 0-100
  lastVerified: number;
  permissions: string[];
}

export interface SecurityContext {
  identityId: string;
  sessionId: string;
  ipAddress: string;
  userAgent?: string;
  timestamp: number;
  riskScore: number;
  location?: {
    country: string;
    region: string;
    coordinates?: [number, number];
  };
}

export interface AccessPolicy {
  id: string;
  name: string;
  description: string;
  resources: string[];
  actions: string[];
  conditions: {
    trustScoreMin?: number;
    riskScoreMax?: number;
    timeWindow?: {
      start: string;
      end: string;
    };
    locations?: string[];
    deviceTypes?: string[];
    mfaRequired?: boolean;
  };
  effect: 'allow' | 'deny';
  priority: number;
  enabled: boolean;
}

export interface SecurityEvent {
  id: string;
  type: 'authentication' | 'authorization' | 'access' | 'violation' | 'anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  identityId: string;
  context: SecurityContext;
  resource?: string;
  action?: string;
  result: 'success' | 'failure' | 'blocked';
  reason?: string;
  automatedResponse?: {
    action: string;
    executed: boolean;
    result?: string;
  };
}

export class ZeroTrustManager extends EventEmitter {
  private static instance: ZeroTrustManager;
  private identities: Map<string, Identity> = new Map();
  private sessions: Map<string, SecurityContext> = new Map();
  private policies: Map<string, AccessPolicy> = new Map();
  private events: SecurityEvent[] = [];
  private riskFactors: Map<string, number> = new Map();
  private mfaChallenges: Map<string, { code: string; expires: number }> = new Map();

  private constructor() {
    super();
    this.initializeDefaultPolicies();
    this.startContinuousVerification();
  }

  static getInstance(): ZeroTrustManager {
    if (!ZeroTrustManager.instance) {
      ZeroTrustManager.instance = new ZeroTrustManager();
    }
    return ZeroTrustManager.instance;
  }

  /**
   * Register a new identity
   */
  async registerIdentity(identity: Omit<Identity, 'trustScore' | 'lastVerified'>): Promise<string> {
    const fullIdentity: Identity = {
      ...identity,
      trustScore: 50, // Start with neutral trust
      lastVerified: Date.now(),
    };

    this.identities.set(identity.id, fullIdentity);

    await this.logSecurityEvent({
      id: this.generateEventId(),
      type: 'authentication',
      severity: 'low',
      timestamp: Date.now(),
      identityId: identity.id,
      context: this.createMockContext(),
      result: 'success',
      reason: 'Identity registered',
    });

    logger.info(
      'Identity registered',
      {
        identityId: identity.id,
        type: identity.type,
        trustScore: fullIdentity.trustScore,
      },
      ['zero-trust', 'identity']
    );

    return identity.id;
  }

  /**
   * Authenticate identity with continuous verification
   */
  async authenticate(
    identityId: string,
    credentials: any,
    context: SecurityContext
  ): Promise<{
    success: boolean;
    sessionId?: string;
    trustScore: number;
    requiresMFA?: boolean;
    reason?: string;
  }> {
    const identity = this.identities.get(identityId);
    if (!identity) {
      await this.logSecurityEvent({
        id: this.generateEventId(),
        type: 'authentication',
        severity: 'medium',
        timestamp: Date.now(),
        identityId,
        context,
        result: 'failure',
        reason: 'Identity not found',
      });
      return { success: false, trustScore: 0, reason: 'Identity not found' };
    }

    // Verify credentials
    const credentialValid = await this.verifyCredentials(identity, credentials);
    if (!credentialValid) {
      await this.updateTrustScore(identityId, -20);
      await this.logSecurityEvent({
        id: this.generateEventId(),
        type: 'authentication',
        severity: 'high',
        timestamp: Date.now(),
        identityId,
        context,
        result: 'failure',
        reason: 'Invalid credentials',
      });
      return { success: false, trustScore: identity.trustScore, reason: 'Invalid credentials' };
    }

    // Calculate risk score
    const riskScore = await this.calculateRiskScore(identityId, context);

    // Check if MFA is required
    const requiresMFA = await this.checkMFARequirement(identityId, context, riskScore);

    if (requiresMFA) {
      return {
        success: false,
        trustScore: identity.trustScore,
        requiresMFA: true,
        reason: 'Multi-factor authentication required',
      };
    }

    // Create session
    const sessionId = this.generateSessionId();
    this.sessions.set(sessionId, {
      ...context,
      identityId,
      sessionId,
      timestamp: Date.now(),
      riskScore,
    });

    // Update trust score based on successful authentication
    await this.updateTrustScore(identityId, 5);

    await this.logSecurityEvent({
      id: this.generateEventId(),
      type: 'authentication',
      severity: 'low',
      timestamp: Date.now(),
      identityId,
      context,
      result: 'success',
      reason: 'Authentication successful',
    });

    logger.info(
      'Authentication successful',
      {
        identityId,
        sessionId,
        trustScore: identity.trustScore,
        riskScore,
      },
      ['zero-trust', 'auth']
    );

    return {
      success: true,
      sessionId,
      trustScore: identity.trustScore,
    };
  }

  /**
   * Verify access authorization
   */
  async authorize(
    sessionId: string,
    resource: string,
    action: string
  ): Promise<{
    allowed: boolean;
    reason?: string;
    policyId?: string;
    riskScore: number;
  }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { allowed: false, reason: 'Invalid session', riskScore: 100 };
    }

    const identity = this.identities.get(session.identityId);
    if (!identity) {
      return { allowed: false, reason: 'Identity not found', riskScore: 100 };
    }

    // Re-verify session (continuous authentication)
    const sessionValid = await this.verifySession(session);
    if (!sessionValid) {
      this.sessions.delete(sessionId);
      return { allowed: false, reason: 'Session expired or invalid', riskScore: 100 };
    }

    // Evaluate access policies
    const policyResult = await this.evaluateAccessPolicies(identity, session, resource, action);

    await this.logSecurityEvent({
      id: this.generateEventId(),
      type: 'authorization',
      severity: policyResult.allowed ? 'low' : 'medium',
      timestamp: Date.now(),
      identityId: identity.id,
      context: session,
      resource,
      action,
      result: policyResult.allowed ? 'success' : 'blocked',
      reason: policyResult.reason,
    });

    if (policyResult.allowed) {
      // Update trust score for successful access
      await this.updateTrustScore(identity.id, 2);
    } else {
      // Decrease trust score for denied access
      await this.updateTrustScore(identity.id, -5);
    }

    return {
      allowed: policyResult.allowed,
      reason: policyResult.reason,
      policyId: policyResult.policyId,
      riskScore: session.riskScore,
    };
  }

  /**
   * Challenge with MFA
   */
  async challengeMFA(
    identityId: string,
    sessionId: string
  ): Promise<{
    challengeId: string;
    methods: string[];
    expires: number;
  }> {
    const challengeId = this.generateChallengeId();
    const code = this.generateMFACode();
    const expires = Date.now() + 300000; // 5 minutes

    this.mfaChallenges.set(challengeId, { code, expires });

    await this.logSecurityEvent({
      id: this.generateEventId(),
      type: 'authentication',
      severity: 'medium',
      timestamp: Date.now(),
      identityId,
      context: this.sessions.get(sessionId) || this.createMockContext(),
      result: 'success',
      reason: 'MFA challenge issued',
    });

    return {
      challengeId,
      methods: ['totp', 'sms', 'email'],
      expires,
    };
  }

  /**
   * Verify MFA response
   */
  async verifyMFA(
    challengeId: string,
    response: string
  ): Promise<{
    success: boolean;
    sessionId?: string;
    reason?: string;
  }> {
    const challenge = this.mfaChallenges.get(challengeId);
    if (!challenge) {
      return { success: false, reason: 'Challenge not found or expired' };
    }

    if (Date.now() > challenge.expires) {
      this.mfaChallenges.delete(challengeId);
      return { success: false, reason: 'Challenge expired' };
    }

    const isValid = response === challenge.code; // Simplified verification
    this.mfaChallenges.delete(challengeId);

    if (isValid) {
      // In a real implementation, create session here
      return { success: true };
    } else {
      return { success: false, reason: 'Invalid MFA response' };
    }
  }

  /**
   * Get security statistics
   */
  getStatistics(): {
    totalIdentities: number;
    activeSessions: number;
    activePolicies: number;
    totalEvents: number;
    averageTrustScore: number;
    averageRiskScore: number;
    eventsByType: Record<SecurityEvent['type'], number>;
    eventsBySeverity: Record<SecurityEvent['severity'], number>;
  } {
    const eventsByType = {
      authentication: 0,
      authorization: 0,
      access: 0,
      violation: 0,
      anomaly: 0,
    };

    const eventsBySeverity = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    for (const event of this.events) {
      eventsByType[event.type]++;
      eventsBySeverity[event.severity]++;
    }

    const trustScores = Array.from(this.identities.values()).map(i => i.trustScore);
    const avgTrustScore =
      trustScores.length > 0
        ? trustScores.reduce((sum, score) => sum + score, 0) / trustScores.length
        : 0;

    const riskScores = Array.from(this.sessions.values()).map(s => s.riskScore);
    const avgRiskScore =
      riskScores.length > 0
        ? riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length
        : 0;

    return {
      totalIdentities: this.identities.size,
      activeSessions: this.sessions.size,
      activePolicies: Array.from(this.policies.values()).filter(p => p.enabled).length,
      totalEvents: this.events.length,
      averageTrustScore: avgTrustScore,
      averageRiskScore: avgRiskScore,
      eventsByType,
      eventsBySeverity,
    };
  }

  /**
   * Initialize default security policies
   */
  private initializeDefaultPolicies(): void {
    // Admin access policy
    this.policies.set('policy-admin', {
      id: 'policy-admin',
      name: 'Admin Access',
      description: 'Full administrative access',
      resources: ['*'],
      actions: ['*'],
      conditions: {
        trustScoreMin: 80,
        riskScoreMax: 30,
        mfaRequired: true,
      },
      effect: 'allow',
      priority: 100,
      enabled: true,
    });

    // User access policy
    this.policies.set('policy-user', {
      id: 'policy-user',
      name: 'User Access',
      description: 'Standard user access',
      resources: ['user-data', 'profile'],
      actions: ['read', 'update'],
      conditions: {
        trustScoreMin: 50,
        riskScoreMax: 60,
      },
      effect: 'allow',
      priority: 50,
      enabled: true,
    });

    // High-risk operations policy
    this.policies.set('policy-sensitive', {
      id: 'policy-sensitive',
      name: 'Sensitive Operations',
      description: 'Access to sensitive operations',
      resources: ['secrets', 'keys', 'audit-logs'],
      actions: ['read', 'write'],
      conditions: {
        trustScoreMin: 90,
        riskScoreMax: 20,
        mfaRequired: true,
        timeWindow: { start: '09:00', end: '17:00' },
      },
      effect: 'allow',
      priority: 90,
      enabled: true,
    });
  }

  /**
   * Start continuous verification process
   */
  private startContinuousVerification(): void {
    setInterval(async () => {
      await this.performContinuousVerification();
    }, 60000); // Every minute
  }

  /**
   * Perform continuous verification
   */
  private async performContinuousVerification(): Promise<void> {
    const now = Date.now();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessions) {
      // Check session age (max 1 hour)
      if (now - session.timestamp > 3600000) {
        expiredSessions.push(sessionId);
        continue;
      }

      // Re-calculate risk score
      const newRiskScore = await this.calculateRiskScore(session.identityId, session);
      if (newRiskScore > session.riskScore + 20) {
        // Significant risk increase
        await this.logSecurityEvent({
          id: this.generateEventId(),
          type: 'anomaly',
          severity: 'medium',
          timestamp: now,
          identityId: session.identityId,
          context: session,
          result: 'success',
          reason: 'Significant risk score increase detected',
        });
      }

      session.riskScore = newRiskScore;
    }

    // Clean up expired sessions
    for (const sessionId of expiredSessions) {
      this.sessions.delete(sessionId);
    }

    // Clean up expired MFA challenges
    for (const [challengeId, challenge] of this.mfaChallenges) {
      if (now > challenge.expires) {
        this.mfaChallenges.delete(challengeId);
      }
    }
  }

  /**
   * Verify credentials with proper security
   */
  private async verifyCredentials(identity: Identity, credentials: any): Promise<boolean> {
    if (!credentials || !identity.credentials) {
      return false;
    }

    // Check credential expiration
    if (identity.credentials.expires && Date.now() > identity.credentials.expires) {
      await this.logSecurityEvent({
        id: this.generateEventId(),
        type: 'authentication',
        severity: 'medium',
        timestamp: Date.now(),
        identityId: identity.id,
        context: this.createMockContext(),
        result: 'failure',
        reason: 'Credentials expired',
      });
      return false;
    }

    try {
      switch (identity.credentials.type) {
        case 'password':
          if (!credentials.password) return false;
          // Use timing-safe comparison to prevent timing attacks
          const inputHash = createHash('sha256').update(credentials.password).digest('hex');
          return timingSafeEqual(
            Buffer.from(inputHash, 'hex'),
            Buffer.from(identity.credentials.hash, 'hex')
          );

        case 'token':
          if (!credentials.token) return false;
          // Verify token format and signature
          const tokenParts = credentials.token.split('.');
          if (tokenParts.length !== 3) return false;

          // In production, verify JWT signature with proper key
          // For now, verify basic structure
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          return payload.exp > Date.now() / 1000 && payload.sub === identity.id;

        case 'certificate':
          if (!credentials.certificate) return false;
          // Basic certificate validation - in production use proper X.509 validation
          return (
            credentials.certificate.includes(identity.id) &&
            credentials.certificate.includes('BEGIN CERTIFICATE')
          );

        case 'biometric':
          if (!credentials.biometricData) return false;
          // Biometric verification should use specialized secure comparison
          // This is a placeholder for proper biometric verification
          return (
            createHash('sha256').update(credentials.biometricData).digest('hex') ===
            identity.credentials.hash
          );

        default:
          return false;
      }
    } catch (error) {
      logger.error(
        'Credential verification error',
        error instanceof Error ? error : new Error(String(error)),
        {
          identityId: identity.id,
          credentialType: identity.credentials.type,
        },
        ['zero-trust', 'security']
      );
      return false;
    }
  }

  /**
   * Calculate risk score
   */
  private async calculateRiskScore(identityId: string, context: SecurityContext): Promise<number> {
    let riskScore = 0;

    // Base risk from context
    if (context.ipAddress) {
      // Check if IP is in known risky ranges
      if (this.isRiskyIP(context.ipAddress)) {
        riskScore += 30;
      }
    }

    // Time-based risk
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      // Unusual hours
      riskScore += 15;
    }

    // Identity-based risk
    const identity = this.identities.get(identityId);
    if (identity) {
      if (identity.trustScore < 50) {
        riskScore += 25;
      }
    }

    // Recent failures
    const recentFailures = this.events.filter(
      e =>
        e.identityId === identityId && e.result === 'failure' && Date.now() - e.timestamp < 300000
    ).length; // Last 5 minutes

    riskScore += recentFailures * 10;

    return Math.min(100, Math.max(0, riskScore));
  }

  /**
   * Check if MFA is required
   */
  private async checkMFARequirement(
    identityId: string,
    context: SecurityContext,
    riskScore: number
  ): Promise<boolean> {
    const identity = this.identities.get(identityId);
    if (!identity) return true;

    // MFA required for high risk
    if (riskScore > 50) return true;

    // MFA required for low trust
    if (identity.trustScore < 60) return true;

    // MFA required for sensitive operations
    if (context.riskScore > 40) return true;

    return false;
  }

  /**
   * Evaluate access policies
   */
  private async evaluateAccessPolicies(
    identity: Identity,
    context: SecurityContext,
    resource: string,
    action: string
  ): Promise<{ allowed: boolean; reason?: string; policyId?: string }> {
    // Sort policies by priority (highest first)
    const sortedPolicies = Array.from(this.policies.values())
      .filter(p => p.enabled)
      .sort((a, b) => b.priority - a.priority);

    for (const policy of sortedPolicies) {
      // Check resource match
      const resourceMatch = policy.resources.includes('*') || policy.resources.includes(resource);
      if (!resourceMatch) continue;

      // Check action match
      const actionMatch = policy.actions.includes('*') || policy.actions.includes(action);
      if (!actionMatch) continue;

      // Check conditions
      const conditionsMet = await this.evaluatePolicyConditions(policy, identity, context);

      if (conditionsMet) {
        return {
          allowed: policy.effect === 'allow',
          reason:
            policy.effect === 'allow'
              ? `Access granted by policy: ${policy.name}`
              : `Access denied by policy: ${policy.name}`,
          policyId: policy.id,
        };
      }
    }

    // Default deny
    return {
      allowed: false,
      reason: 'No matching policy found - default deny',
    };
  }

  /**
   * Evaluate policy conditions
   */
  private async evaluatePolicyConditions(
    policy: AccessPolicy,
    identity: Identity,
    context: SecurityContext
  ): Promise<boolean> {
    const conditions = policy.conditions;

    // Trust score condition
    if (conditions.trustScoreMin && identity.trustScore < conditions.trustScoreMin) {
      return false;
    }

    // Risk score condition
    if (conditions.riskScoreMax && context.riskScore > conditions.riskScoreMax) {
      return false;
    }

    // Time window condition
    if (conditions.timeWindow) {
      const currentHour = new Date().getHours();
      const startHour = parseInt(conditions.timeWindow.start.split(':')[0]);
      const endHour = parseInt(conditions.timeWindow.end.split(':')[0]);

      if (currentHour < startHour || currentHour > endHour) {
        return false;
      }
    }

    // Location condition
    if (conditions.locations && conditions.locations.length > 0) {
      if (!context.location || !conditions.locations.includes(context.location.country)) {
        return false;
      }
    }

    // MFA condition
    if (conditions.mfaRequired) {
      // In a real implementation, check if MFA was verified
      // For now, assume MFA is required but not verified
      return false;
    }

    return true;
  }

  /**
   * Verify session validity
   */
  private async verifySession(session: SecurityContext): Promise<boolean> {
    // Check session age
    if (Date.now() - session.timestamp > 3600000) {
      // 1 hour
      return false;
    }

    // Check for security events related to this session
    const recentViolations = this.events.filter(
      e =>
        e.identityId === session.identityId &&
        e.type === 'violation' &&
        Date.now() - e.timestamp < 300000
    ).length; // Last 5 minutes

    if (recentViolations > 0) {
      return false;
    }

    return true;
  }

  /**
   * Update trust score
   */
  private async updateTrustScore(identityId: string, delta: number): Promise<void> {
    const identity = this.identities.get(identityId);
    if (!identity) return;

    identity.trustScore = Math.max(0, Math.min(100, identity.trustScore + delta));
    identity.lastVerified = Date.now();
  }

  /**
   * Log security event
   */
  private async logSecurityEvent(event: SecurityEvent): Promise<void> {
    this.events.push(event);

    // Keep only recent events (last 10000)
    if (this.events.length > 10000) {
      this.events = this.events.slice(-10000);
    }

    // Emit event for listeners
    this.emit('security-event', event);

    // Log to audit system
    await auditLogger.logSecretAccess(
      event.type,
      `${event.identityId}-${event.type}`,
      'zero-trust-manager',
      event.result === 'success',
      {
        userId: event.identityId,
        sessionId: event.sessionId,
        ipAddress: event.context.ipAddress,
      }
    );
  }

  /**
   * Check if IP is risky
   */
  private isRiskyIP(ip: string): boolean {
    // Simplified IP risk checking
    const riskyRanges = ['10.0.0.', '192.168.', '172.16.'];
    return riskyRanges.some(range => ip.startsWith(range));
  }

  /**
   * Create mock context for testing
   */
  private createMockContext(): SecurityContext {
    return {
      identityId: 'unknown',
      sessionId: 'unknown',
      ipAddress: '127.0.0.1',
      timestamp: Date.now(),
      riskScore: 50,
    };
  }

  /**
   * Generate unique IDs
   */
  private generateEventId(): string {
    return `evt-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateSessionId(): string {
    return `sess-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateChallengeId(): string {
    return `chal-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateMFACode(): string {
    return Math.random().toString().substring(2, 8);
  }
}

// Export singleton instance
export const zeroTrustManager = ZeroTrustManager.getInstance();
