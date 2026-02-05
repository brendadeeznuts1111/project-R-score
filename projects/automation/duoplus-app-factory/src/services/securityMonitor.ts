/**
 * Security Monitoring Service
 * Tracks blocked sessions, anomalies, and security events
 */

export interface SecurityEvent {
  id: string;
  timestamp: number;
  type: 'session_blocked' | 'challenge_required' | 'anomaly_detected' | 'session_created' | 'session_validated';
  userId: string;
  sessionId: string;
  ipAddress: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  reason?: string;
  factors?: string[];
  metadata?: Record<string, any>;
}

export interface SecurityStats {
  totalSessions: number;
  blockedSessions: number;
  challengeRequired: number;
  anomaliesDetected: number;
  blockRate: number;
  averageRiskScore: number;
  topRiskFactors: { factor: string; count: number }[];
  recentEvents: SecurityEvent[];
}

export class SecurityMonitor {
  private events: SecurityEvent[] = [];
  private sessionStats = new Map<string, { blocked: boolean; riskScore: number; timestamp: number }>();
  private readonly MAX_EVENTS = 10000;
  private readonly STATS_WINDOW = 24 * 60 * 60 * 1000;

  logEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): SecurityEvent {
    const securityEvent: SecurityEvent = {
      ...event,
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
    };
    this.events.unshift(securityEvent);
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(0, this.MAX_EVENTS);
    }
    this.logToConsole(securityEvent);
    return securityEvent;
  }

  trackSession(sessionId: string, blocked: boolean, riskScore: number): void {
    this.sessionStats.set(sessionId, { blocked, riskScore, timestamp: Date.now() });
  }

  getStats(): SecurityStats {
    const now = Date.now();
    const recentEvents = this.events.filter(e => now - e.timestamp < this.STATS_WINDOW);
    const totalSessions = this.sessionStats.size;
    const blockedSessions = Array.from(this.sessionStats.values()).filter(s => s.blocked).length;
    const challengeRequired = recentEvents.filter(e => e.type === 'challenge_required').length;
    const anomaliesDetected = recentEvents.filter(e => e.type === 'anomaly_detected').length;
    const blockRate = totalSessions > 0 ? (blockedSessions / totalSessions) * 100 : 0;
    const riskScores = Array.from(this.sessionStats.values()).map(s => s.riskScore);
    const averageRiskScore = riskScores.length > 0 ? riskScores.reduce((a, b) => a + b, 0) / riskScores.length : 0;
    const factorCounts = new Map<string, number>();
    recentEvents.forEach(e => {
      e.factors?.forEach(factor => {
        factorCounts.set(factor, (factorCounts.get(factor) || 0) + 1);
      });
    });
    const topRiskFactors = Array.from(factorCounts.entries())
      .map(([factor, count]) => ({ factor, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    return {
      totalSessions,
      blockedSessions,
      challengeRequired,
      anomaliesDetected,
      blockRate: parseFloat(blockRate.toFixed(2)),
      averageRiskScore: parseFloat(averageRiskScore.toFixed(4)),
      topRiskFactors,
      recentEvents: recentEvents.slice(0, 50),
    };
  }

  getUserEvents(userId: string, limit = 100): SecurityEvent[] {
    return this.events.filter(e => e.userId === userId).slice(0, limit);
  }

  getBlockedSessions(): SecurityEvent[] {
    return this.events.filter(e => e.type === 'session_blocked').slice(0, 100);
  }

  getHighRiskSessions(): SecurityEvent[] {
    return this.events.filter(e => e.riskScore >= 0.6).slice(0, 100);
  }

  cleanupOldEvents(): number {
    const cutoff = Date.now() - this.STATS_WINDOW;
    const initialLength = this.events.length;
    this.events = this.events.filter(e => e.timestamp > cutoff);
    return initialLength - this.events.length;
  }

  exportEvents(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.events, null, 2);
    }
    const headers = ['id', 'timestamp', 'type', 'userId', 'sessionId', 'ipAddress', 'riskScore', 'riskLevel', 'reason'];
    const rows = this.events.map(e => [e.id, new Date(e.timestamp).toISOString(), e.type, e.userId, e.sessionId, e.ipAddress, e.riskScore, e.riskLevel, e.reason || '']);
    return [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n');
  }

  private logToConsole(event: SecurityEvent): void {
    const emoji = { session_blocked: '🚫', challenge_required: '🔐', anomaly_detected: '⚠️', session_created: '✅', session_validated: '✔️' }[event.type];
    const timestamp = new Date(event.timestamp).toISOString();
    console.log(`${emoji} [${timestamp}] ${event.type.toUpperCase()}: ${event.userId} (Risk: ${(event.riskScore * 100).toFixed(1)}%)`);
  }
}

export const securityMonitor = new SecurityMonitor();

setInterval(() => {
  const cleaned = securityMonitor.cleanupOldEvents();
  if (cleaned > 0) {
    console.log(`🧹 Cleaned up ${cleaned} old security events`);
  }
}, 60 * 60 * 1000);
