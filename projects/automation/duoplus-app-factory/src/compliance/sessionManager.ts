/**
 * Session Manager with Anomaly Detection
 * 
 * Manages user sessions and applies anomaly-based security policies
 */

import { anomalyDetector, AnomalyFeatures, AnomalyScore } from './anomalyDetector';

export interface SessionData {
  sessionId: string;
  userId: string;
  createdAt: number;
  lastActivity: number;
  ipAddress: string;
  userAgent: string;
  deviceFingerprint: string;
  anomalyScore?: AnomalyScore;
  blocked: boolean;
  blockReason?: string;
}

export interface SessionCheckResult {
  allowed: boolean;
  sessionId: string;
  anomalyScore: AnomalyScore;
  message: string;
  requiresChallenge: boolean;
}

export class SessionManager {
  private sessions = new Map<string, SessionData>();
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private readonly ANOMALY_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Cleanup expired sessions every 10 minutes
    setInterval(() => this.cleanupExpiredSessions(), 10 * 60 * 1000);
  }

  /**
   * Create new session with anomaly check
   */
  async createSession(
    userId: string,
    ipAddress: string,
    userAgent: string,
    deviceFingerprint: string,
    features: AnomalyFeatures
  ): Promise<SessionCheckResult> {
    const sessionId = this.generateSessionId();
    
    // Check anomalies on session creation
    const anomalyScore = await anomalyDetector.predict(features);
    
    const session: SessionData = {
      sessionId,
      userId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      ipAddress,
      userAgent,
      deviceFingerprint,
      anomalyScore,
      blocked: anomalyScore.blockSession,
      blockReason: anomalyScore.blockSession ? anomalyScore.recommendation : undefined,
    };

    this.sessions.set(sessionId, session);
    anomalyDetector.trackSession(sessionId, features);

    return {
      allowed: !anomalyScore.blockSession,
      sessionId,
      anomalyScore,
      message: anomalyScore.recommendation,
      requiresChallenge: anomalyScore.score > 0.6,
    };
  }

  /**
   * Validate existing session with periodic anomaly checks
   */
  async validateSession(
    sessionId: string,
    features: AnomalyFeatures
  ): Promise<SessionCheckResult> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return {
        allowed: false,
        sessionId,
        anomalyScore: { score: 1, level: 'critical', factors: [], recommendation: 'Session not found', blockSession: true },
        message: 'Invalid session',
        requiresChallenge: false,
      };
    }

    // Check if session expired
    if (Date.now() - session.lastActivity > this.SESSION_TIMEOUT) {
      this.sessions.delete(sessionId);
      return {
        allowed: false,
        sessionId,
        anomalyScore: { score: 1, level: 'critical', factors: [], recommendation: 'Session expired', blockSession: true },
        message: 'Session expired',
        requiresChallenge: false,
      };
    }

    // Check if session is blocked
    if (session.blocked) {
      return {
        allowed: false,
        sessionId,
        anomalyScore: session.anomalyScore!,
        message: session.blockReason || 'Session blocked',
        requiresChallenge: false,
      };
    }

    // Periodic anomaly check
    const anomalyScore = await anomalyDetector.predict(features);
    anomalyDetector.trackSession(sessionId, features);

    // Update session
    session.lastActivity = Date.now();
    session.anomalyScore = anomalyScore;

    if (anomalyScore.blockSession) {
      session.blocked = true;
      session.blockReason = anomalyScore.recommendation;
      this.sessions.set(sessionId, session);
      
      return {
        allowed: false,
        sessionId,
        anomalyScore,
        message: anomalyScore.recommendation,
        requiresChallenge: false,
      };
    }

    return {
      allowed: true,
      sessionId,
      anomalyScore,
      message: 'Session valid',
      requiresChallenge: anomalyScore.score > 0.6,
    };
  }

  /**
   * Terminate session
   */
  terminateSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    anomalyDetector.clearSession(sessionId);
  }

  /**
   * Get session info
   */
  getSession(sessionId: string): SessionData | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all active sessions for user
   */
  getUserSessions(userId: string): SessionData[] {
    return Array.from(this.sessions.values()).filter(s => s.userId === userId);
  }

  /**
   * Cleanup expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const expired: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > this.SESSION_TIMEOUT) {
        expired.push(sessionId);
      }
    }

    expired.forEach(sessionId => this.terminateSession(sessionId));
    
    if (expired.length > 0) {
      console.log(`🧹 Cleaned up ${expired.length} expired sessions`);
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }
}

export const sessionManager = new SessionManager();

