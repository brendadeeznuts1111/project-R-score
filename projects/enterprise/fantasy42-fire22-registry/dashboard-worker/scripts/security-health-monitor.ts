#!/usr/bin/env bun
/**
 * 🔐 Security Health Monitor
 *
 * Monitors authentication system health and security events
 * Integrates with the Fire22 health monitoring infrastructure
 *
 * @version 3.0.9
 * @author Fire22 Development Team
 */

import {
  securityHealthCheck,
  getSecurityAuditLog,
} from '../src/api/middleware/enhanced-auth.middleware.js';
import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';

interface SecurityHealthReport {
  timestamp: string;
  overall: 'healthy' | 'degraded' | 'unhealthy';
  authentication: {
    status: string;
    stats: any;
    issues: string[];
  };
  rateLimit: {
    activeBlocks: number;
    recentViolations: number;
  };
  audit: {
    recentEvents: number;
    suspiciousActivity: number;
    tokenRevocations: number;
  };
  recommendations: string[];
  alerts: Array<{
    level: 'info' | 'warning' | 'critical';
    message: string;
    timestamp: string;
  }>;
}

class SecurityHealthMonitor {
  private alerts: Array<{
    level: 'info' | 'warning' | 'critical';
    message: string;
    timestamp: string;
  }> = [];

  /**
   * Perform comprehensive security health check
   */
  async performHealthCheck(): Promise<SecurityHealthReport> {
    console.log('🔐 Running Security Health Check...\n');

    const timestamp = new Date().toISOString();
    this.alerts = [];

    try {
      // Get authentication system health
      const authHealth = await securityHealthCheck();

      // Get recent security events
      const recentEvents = getSecurityAuditLog({
        since: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        limit: 100,
      });

      // Analyze security patterns
      const analysis = this.analyzeSecurityPatterns(recentEvents);

      // Generate recommendations
      const recommendations = this.generateRecommendations(authHealth, analysis);

      // Determine overall health
      const overall = this.determineOverallHealth(authHealth, analysis);

      const report: SecurityHealthReport = {
        timestamp,
        overall,
        authentication: authHealth,
        rateLimit: {
          activeBlocks: authHealth.stats.activeBlocks,
          recentViolations: recentEvents.filter(e => e.type === 'rate_limit_exceeded').length,
        },
        audit: {
          recentEvents: recentEvents.length,
          suspiciousActivity: recentEvents.filter(e => e.type === 'suspicious_activity').length,
          tokenRevocations: recentEvents.filter(e => e.type === 'token_invalid').length,
        },
        recommendations,
        alerts: this.alerts,
      };

      this.displayReport(report);
      return report;
    } catch (error) {
      console.error('❌ Security health check failed:', error);

      return {
        timestamp,
        overall: 'unhealthy',
        authentication: {
          status: 'error',
          stats: {},
          issues: [
            `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          ],
        },
        rateLimit: { activeBlocks: 0, recentViolations: 0 },
        audit: { recentEvents: 0, suspiciousActivity: 0, tokenRevocations: 0 },
        recommendations: ['Investigate security health check failure'],
        alerts: [
          {
            level: 'critical',
            message: 'Security health check system failure',
            timestamp,
          },
        ],
      };
    }
  }

  /**
   * Analyze security event patterns
   */
  private analyzeSecurityPatterns(events: any[]): {
    failureRate: number;
    uniqueIPs: number;
    peakHour: string;
    suspiciousPatterns: string[];
  } {
    const failures = events.filter(e => e.type === 'login_failure');
    const successes = events.filter(e => e.type === 'login_success');
    const failureRate = failures.length / (failures.length + successes.length) || 0;

    const uniqueIPs = new Set(events.map(e => e.ip).filter(Boolean)).size;

    // Find peak hour
    const hourCounts = new Map<number, number>();
    events.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    const peakHour = Array.from(hourCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 0;

    // Detect suspicious patterns
    const suspiciousPatterns: string[] = [];

    if (failureRate > 0.5) {
      suspiciousPatterns.push(`High failure rate: ${(failureRate * 100).toFixed(1)}%`);
    }

    if (uniqueIPs < events.length * 0.1) {
      suspiciousPatterns.push('Concentrated attacks from few IPs');
    }

    const rapidRequests = events.filter((event, index) => {
      if (index === 0) return false;
      const prevEvent = events[index - 1];
      return new Date(event.timestamp).getTime() - new Date(prevEvent.timestamp).getTime() < 1000;
    });

    if (rapidRequests.length > events.length * 0.3) {
      suspiciousPatterns.push('High frequency of rapid requests detected');
    }

    return {
      failureRate,
      uniqueIPs,
      peakHour: `${peakHour.toString().padStart(2, '0')}:00`,
      suspiciousPatterns,
    };
  }

  /**
   * Generate security recommendations
   */
  private generateRecommendations(authHealth: any, analysis: any): string[] {
    const recommendations: string[] = [];

    if (authHealth.issues.length > 0) {
      recommendations.push('Address authentication system issues immediately');
    }

    if (analysis.failureRate > 0.3) {
      recommendations.push('Investigate high authentication failure rate');
    }

    if (analysis.suspiciousPatterns.length > 0) {
      recommendations.push('Review suspicious activity patterns');
    }

    if (authHealth.stats.activeBlocks > 5) {
      recommendations.push('Monitor blocked IPs for potential legitimate users');
    }

    if (authHealth.stats.blacklistedTokens > 100) {
      recommendations.push('Consider token cleanup policy for revoked tokens');
    }

    if (recommendations.length === 0) {
      recommendations.push('Security system operating normally');
      recommendations.push('Continue regular monitoring and logging');
    }

    return recommendations;
  }

  /**
   * Determine overall health status
   */
  private determineOverallHealth(
    authHealth: any,
    analysis: any
  ): 'healthy' | 'degraded' | 'unhealthy' {
    let score = 100;

    // Deduct points for issues
    score -= authHealth.issues.length * 20;
    score -= analysis.suspiciousPatterns.length * 15;
    score -= Math.min(analysis.failureRate * 50, 30);

    if (authHealth.stats.activeBlocks > 10) score -= 10;
    if (authHealth.stats.recentFailures > 100) score -= 15;

    if (score >= 80) return 'healthy';
    if (score >= 60) return 'degraded';
    return 'unhealthy';
  }

  /**
   * Add alert to the report
   */
  private addAlert(level: 'info' | 'warning' | 'critical', message: string): void {
    this.alerts.push({
      level,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Display security health report
   */
  private displayReport(report: SecurityHealthReport): void {
    const statusColor =
      report.overall === 'healthy' ? '🟢' : report.overall === 'degraded' ? '🟡' : '🔴';

    console.log(`${statusColor} Overall Security Status: ${report.overall.toUpperCase()}`);
    console.log('='.repeat(60));

    // Authentication status
    console.log('\n🔐 Authentication System:');
    console.log(`   Status: ${report.authentication.status}`);
    console.log(`   Recent Failures: ${report.authentication.stats.recentFailures}`);
    console.log(`   Active Blocks: ${report.authentication.stats.activeBlocks}`);
    console.log(`   Blacklisted Tokens: ${report.authentication.stats.blacklistedTokens}`);

    // Rate limiting
    console.log('\n🚦 Rate Limiting:');
    console.log(`   Active Blocks: ${report.rateLimit.activeBlocks}`);
    console.log(`   Recent Violations: ${report.rateLimit.recentViolations}`);

    // Audit information
    console.log('\n📊 Security Audit:');
    console.log(`   Recent Events: ${report.audit.recentEvents}`);
    console.log(`   Suspicious Activity: ${report.audit.suspiciousActivity}`);
    console.log(`   Token Revocations: ${report.audit.tokenRevocations}`);

    // Issues
    if (report.authentication.issues.length > 0) {
      console.log('\n⚠️  Issues Found:');
      report.authentication.issues.forEach(issue => {
        console.log(`   • ${issue}`);
      });
    }

    // Recommendations
    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach(rec => {
        console.log(`   • ${rec}`);
      });
    }

    // Alerts
    if (report.alerts.length > 0) {
      console.log('\n🚨 Alerts:');
      report.alerts.forEach(alert => {
        const icon = alert.level === 'critical' ? '🔴' : alert.level === 'warning' ? '🟡' : '🔵';
        console.log(`   ${icon} [${alert.level.toUpperCase()}] ${alert.message}`);
      });
    }

    console.log(`\n📅 Report generated: ${new Date(report.timestamp).toLocaleString()}`);
  }

  /**
   * Save security report to file
   */
  saveReport(report: SecurityHealthReport): void {
    const filename = `security-health-report-${Date.now()}.json`;
    const filepath = join(process.cwd(), filename);

    try {
      writeFileSync(filepath, JSON.stringify(report, null, 2));
      console.log(`\n💾 Report saved: ${filename}`);
    } catch (error) {
      console.error('❌ Failed to save report:', error);
    }
  }

  /**
   * Monitor security continuously
   */
  async startContinuousMonitoring(intervalMinutes: number = 15): Promise<void> {
    console.log(`🔄 Starting continuous security monitoring (${intervalMinutes}min intervals)`);

    const monitor = async () => {
      const report = await this.performHealthCheck();

      // Alert on critical issues
      if (report.overall === 'unhealthy') {
        console.log('\n🚨 CRITICAL: Security system unhealthy!');
      }

      console.log(`\n⏰ Next check in ${intervalMinutes} minutes...`);
    };

    // Initial check
    await monitor();

    // Set up interval
    setInterval(monitor, intervalMinutes * 60 * 1000);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const monitor = new SecurityHealthMonitor();

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🔐 Fire22 Security Health Monitor

DESCRIPTION:
  Monitors authentication system health and security events.
  Integrates with the Fire22 health monitoring infrastructure.

USAGE:
  bun run scripts/security-health-monitor.ts [options]

OPTIONS:
  --continuous      Start continuous monitoring
  --interval <min>  Monitoring interval in minutes (default: 15)
  --save            Save report to JSON file
  --help, -h        Show this help message

EXAMPLES:
  bun run scripts/security-health-monitor.ts              # Single check
  bun run scripts/security-health-monitor.ts --save       # Save report
  bun run scripts/security-health-monitor.ts --continuous # Continuous monitoring
  fire22 security:health                                  # Via Fire22 CLI

🔥 Fire22 Development Team - Enterprise Security System
`);
    process.exit(0);
  }

  if (args.includes('--continuous')) {
    const intervalArg = args.indexOf('--interval');
    const interval =
      intervalArg !== -1 && args[intervalArg + 1] ? parseInt(args[intervalArg + 1]) : 15;

    await monitor.startContinuousMonitoring(interval);
    return;
  }

  try {
    const report = await monitor.performHealthCheck();

    if (args.includes('--save')) {
      monitor.saveReport(report);
    }

    process.exit(report.overall === 'healthy' ? 0 : 1);
  } catch (error) {
    console.error('💥 Security health monitor failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main().catch(error => {
    console.error('💥 Security health monitor failed:', error);
    process.exit(1);
  });
}

export { SecurityHealthMonitor };
