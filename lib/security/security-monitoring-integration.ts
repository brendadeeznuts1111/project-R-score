/**
 * Enhanced Security Monitoring Integration
 * 
 * Real-time security monitoring with alerting and metrics
 */

import { 
  BunSecurityEngine, 
  createSecurityMiddleware,
  SecurityError 
} from './bun-security-integration-v4';

export interface SecurityAlert {
  type: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: Date;
  source: string;
  metadata?: any;
}

export interface SecurityMetrics {
  timestamp: Date;
  passwordHashes: number;
  csrfTokens: number;
  encryptionOps: number;
  failedAttempts: number;
  secretRotations: number;
  riskScore: number;
}

export class SecurityMonitoringEngine {
  private alerts: SecurityAlert[] = [];
  private metrics: SecurityMetrics[] = [];
  private thresholds = {
    failedAttempts: { warning: 10, critical: 50 },
    riskScore: { warning: 70, critical: 50 },
    secretRotationDays: { warning: 45, critical: 90 }
  };

  // 🚨 REAL-TIME ALERT SYSTEM
  generateAlerts(securityEngine: BunSecurityEngine): SecurityAlert[] {
    const report = securityEngine.getSecurityReport();
    const newAlerts: SecurityAlert[] = [];

    // Failed attempts alert
    if (report.metrics.failedAttempts > this.thresholds.failedAttempts.critical) {
      newAlerts.push({
        type: 'critical',
        message: `Critical: ${report.metrics.failedAttempts} failed attempts detected`,
        timestamp: new Date(),
        source: 'authentication',
        metadata: { count: report.metrics.failedAttempts }
      });
    } else if (report.metrics.failedAttempts > this.thresholds.failedAttempts.warning) {
      newAlerts.push({
        type: 'warning',
        message: `Warning: ${report.metrics.failedAttempts} failed attempts detected`,
        timestamp: new Date(),
        source: 'authentication'
      });
    }

    // Risk score alert
    if (report.riskScore < this.thresholds.riskScore.critical) {
      newAlerts.push({
        type: 'critical',
        message: `Critical: Security risk score ${report.riskScore}/100`,
        timestamp: new Date(),
        source: 'risk_assessment',
        metadata: { score: report.riskScore, recommendations: report.recommendations }
      });
    }

    // Secret rotation alert
    const daysSinceRotation = (Date.now() - report.metrics.lastBreachCheck.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceRotation > this.thresholds.secretRotationDays.critical) {
      newAlerts.push({
        type: 'critical',
        message: `Critical: Secrets not rotated for ${Math.floor(daysSinceRotation)} days`,
        timestamp: new Date(),
        source: 'secrets_management'
      });
    }

    this.alerts.push(...newAlerts);
    return newAlerts;
  }

  // 📈 PROMETHEUS METRICS EXPORT
  exportPrometheusMetrics(securityEngine: BunSecurityEngine): string {
    const report = securityEngine.getSecurityReport();
    
    return `
# HELP security_password_hashes_total Total password hashing operations
# TYPE security_password_hashes_total counter
security_password_hashes_total ${report.metrics.passwordHashes}

# HELP security_csrf_tokens_total Total CSRF tokens generated
# TYPE security_csrf_tokens_total counter
security_csrf_tokens_total ${report.metrics.csrfTokens}

# HELP security_encryption_ops_total Total encryption operations
# TYPE security_encryption_ops_total counter
security_encryption_ops_total ${report.metrics.encryptionOps}

# HELP security_failed_attempts_total Total failed authentication attempts
# TYPE security_failed_attempts_total counter
security_failed_attempts_total ${report.metrics.failedAttempts}

# HELP security_secret_rotations_total Total secret rotation operations
# TYPE security_secret_rotations_total counter
security_secret_rotations_total ${report.metrics.secretRotations}

# HELP security_risk_score Current security risk score (0-100)
# TYPE security_risk_score gauge
security_risk_score ${report.riskScore}

# HELP security_alerts_total Total security alerts generated
# TYPE security_alerts_total counter
security_alerts_total ${this.alerts.length}
    `.trim();
  }

  // 📊 SECURITY DASHBOARD DATA
  getDashboardData(securityEngine: BunSecurityEngine): {
    metrics: SecurityMetrics;
    alerts: SecurityAlert[];
    recommendations: string[];
    healthStatus: 'healthy' | 'warning' | 'critical';
  } {
    const report = securityEngine.getSecurityReport();
    const currentMetrics: SecurityMetrics = {
      timestamp: new Date(),
      ...report.metrics,
      riskScore: report.riskScore
    };

    // Determine health status
    let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (report.riskScore < 50 || this.hasCriticalAlerts()) {
      healthStatus = 'critical';
    } else if (report.riskScore < 70 || this.hasWarningAlerts()) {
      healthStatus = 'warning';
    }

    return {
      metrics: currentMetrics,
      alerts: this.alerts.slice(-10), // Last 10 alerts
      recommendations: report.recommendations,
      healthStatus
    };
  }

  // 🔍 ALERT FILTERING
  private hasCriticalAlerts(): boolean {
    return this.alerts.some(alert => alert.type === 'critical');
  }

  private hasWarningAlerts(): boolean {
    return this.alerts.some(alert => alert.type === 'warning');
  }

  // 🧹 CLEANUP OLD DATA
  cleanup(olderThanHours: number = 24): void {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    
    this.alerts = this.alerts.filter(alert => alert.timestamp > cutoff);
    this.metrics = this.metrics.filter(metric => metric.timestamp > cutoff);
  }
}

// 🚀 SECURITY MONITORING MIDDLEWARE
export function createSecurityMonitoringMiddleware() {
  const monitoring = new SecurityMonitoringEngine();
  
  return async (request: Request, securityEngine: BunSecurityEngine) => {
    // Generate alerts
    const alerts = monitoring.generateAlerts(securityEngine);
    
    // Log critical alerts
    alerts.filter(a => a.type === 'critical').forEach(alert => {
      console.error(`🚨 SECURITY ALERT: ${alert.message}`);
    });
    
    // Export metrics (could be sent to monitoring system)
    const metrics = monitoring.exportPrometheusMetrics(securityEngine);
    
    return {
      alerts,
      metrics,
      dashboard: monitoring.getDashboardData(securityEngine)
    };
  };
}
