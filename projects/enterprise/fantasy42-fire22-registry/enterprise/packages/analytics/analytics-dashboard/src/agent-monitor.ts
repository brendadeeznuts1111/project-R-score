#!/usr/bin/env bun

/**
 * 📊 Fantasy42 User-Agent Monitoring Dashboard
 *
 * Real-time monitoring and analytics for User-Agent usage across Fantasy42 packages
 * with compliance reporting and anomaly detection.
 */

import { Fantasy42UserAgents, UserAgentMonitor } from '@fire22-registry/core-security';
import { Fantasy42SecureClient } from '@fire22-registry/core-security';

export interface UserAgentMetrics {
  totalRequests: number;
  uniqueAgents: number;
  requestsPerMinute: number;
  complianceRate: number;
  suspiciousAgents: number;
  blockedAgents: number;
  topAgents: Array<{
    agent: string;
    count: number;
    percentage: number;
  }>;
  geoDistribution: Record<string, number>;
  complianceByRegion: Record<
    string,
    {
      compliant: number;
      nonCompliant: number;
      rate: number;
    }
  >;
}

export interface SecurityAlert {
  id: string;
  type: 'suspicious_agent' | 'compliance_violation' | 'anomaly_detected';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  agent?: string;
  count?: number;
  timestamp: string;
  recommendedAction: string;
}

export class Fantasy42AgentMonitor extends Fantasy42SecureClient {
  private metricsInterval: Timer | null = null;
  private alertThresholds = {
    suspiciousAgentsPerHour: 10,
    complianceDropThreshold: 0.95, // 95%
    anomalyScoreThreshold: 0.8,
  };

  constructor(environment: string = 'production') {
    super('ANALYTICS_DASHBOARD', environment, {
      compliance: true,
      buildVersion: '2.7.0',
    });
  }

  /**
   * Start real-time monitoring
   */
  startMonitoring(intervalMs: number = 60000): void {
    console.log('📊 Starting Fantasy42 User-Agent monitoring...');

    this.metricsInterval = setInterval(async () => {
      await this.collectMetrics();
      await this.checkForAnomalies();
      await this.generateComplianceReport();
    }, intervalMs);

    console.log(`✅ Monitoring started (interval: ${intervalMs}ms)`);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
      console.log('🛑 Monitoring stopped');
    }
  }

  /**
   * Get current User-Agent metrics
   */
  async getMetrics(): Promise<UserAgentMetrics> {
    const agentUsage = UserAgentMonitor.getAgentUsage();
    const totalRequests = Object.values(agentUsage).reduce((a, b) => a + b, 0);
    const uniqueAgents = Object.keys(agentUsage).length;

    // Calculate top agents
    const topAgents = Object.entries(agentUsage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([agent, count]) => ({
        agent,
        count,
        percentage: (count / totalRequests) * 100,
      }));

    // Calculate geo distribution
    const geoDistribution = this.calculateGeoDistribution(agentUsage);

    // Calculate compliance by region
    const complianceByRegion = await this.calculateComplianceByRegion();

    return {
      totalRequests,
      uniqueAgents,
      requestsPerMinute: totalRequests / (Date.now() / 60000), // Rough estimate
      complianceRate: this.calculateComplianceRate(agentUsage),
      suspiciousAgents: UserAgentMonitor.getBlockedAgents().length,
      blockedAgents: UserAgentMonitor.getBlockedAgents().length,
      topAgents,
      geoDistribution,
      complianceByRegion,
    };
  }

  /**
   * Get security alerts
   */
  async getSecurityAlerts(): Promise<SecurityAlert[]> {
    const alerts: SecurityAlert[] = [];

    // Check for suspicious agents
    const blockedAgents = UserAgentMonitor.getBlockedAgents();
    if (blockedAgents.length > 0) {
      alerts.push({
        id: `suspicious-${Date.now()}`,
        type: 'suspicious_agent',
        severity: 'high',
        description: `Detected ${blockedAgents.length} suspicious User-Agents`,
        count: blockedAgents.length,
        timestamp: new Date().toISOString(),
        recommendedAction: 'Review blocked agents and update security rules',
      });
    }

    // Check compliance rate
    const metrics = await this.getMetrics();
    if (metrics.complianceRate < this.alertThresholds.complianceDropThreshold) {
      alerts.push({
        id: `compliance-${Date.now()}`,
        type: 'compliance_violation',
        severity: 'medium',
        description: `Compliance rate dropped to ${(metrics.complianceRate * 100).toFixed(1)}%`,
        timestamp: new Date().toISOString(),
        recommendedAction: 'Review User-Agent configurations and update compliance settings',
      });
    }

    return alerts;
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(): Promise<string> {
    const metrics = await this.getMetrics();
    const alerts = await this.getSecurityAlerts();

    const report = {
      timestamp: new Date().toISOString(),
      period: 'last-hour',
      metrics,
      alerts,
      compliance: {
        gdpr: this.checkGDPRCompliance(metrics),
        pci: this.checkPCICompliance(metrics),
        aml: this.checkAMLCompliance(metrics),
        overall: metrics.complianceRate >= 0.95,
      },
      recommendations: this.generateRecommendations(metrics, alerts),
    };

    // Clean report (remove ANSI codes)
    const cleanReport = JSON.stringify(report, null, 2).replace(/\x1b\[[0-9;]*m/g, '');

    // Save report
    await Bun.write('./compliance-report.json', cleanReport);

    return cleanReport;
  }

  /**
   * Track User-Agent usage
   */
  static trackAgent(agent: string): void {
    UserAgentMonitor.trackAgent(agent);
  }

  /**
   * Get agent usage statistics
   */
  static getAgentUsageStats(): {
    usage: Record<string, number>;
    suspicious: string[];
    blocked: string[];
  } {
    return {
      usage: UserAgentMonitor.getAgentUsage(),
      suspicious: UserAgentMonitor.getBlockedAgents(),
      blocked: UserAgentMonitor.getBlockedAgents(),
    };
  }

  private async collectMetrics(): Promise<void> {
    const metrics = await this.getMetrics();

    // Send metrics to monitoring service
    await this.sendMetrics(metrics);

    // Log metrics for compliance
    const cleanMetrics = JSON.stringify(metrics).replace(/\x1b\[[0-9;]*m/g, '');
    console.log(
      `📊 Metrics collected: ${metrics.totalRequests} requests, ${metrics.uniqueAgents} unique agents`
    );
  }

  private async checkForAnomalies(): Promise<void> {
    const metrics = await this.getMetrics();

    // Check for unusual patterns
    if (metrics.suspiciousAgents > this.alertThresholds.suspiciousAgentsPerHour) {
      console.warn(`🚨 High number of suspicious agents detected: ${metrics.suspiciousAgents}`);
      await this.createSecurityAlert(
        'anomaly_detected',
        'high',
        `Unusual number of suspicious agents: ${metrics.suspiciousAgents}`
      );
    }

    // Check for compliance drops
    if (metrics.complianceRate < this.alertThresholds.complianceDropThreshold) {
      console.warn(
        `⚠️ Compliance rate below threshold: ${(metrics.complianceRate * 100).toFixed(1)}%`
      );
      await this.createSecurityAlert(
        'compliance_violation',
        'medium',
        `Compliance rate dropped to ${(metrics.complianceRate * 100).toFixed(1)}%`
      );
    }
  }

  private calculateGeoDistribution(agentUsage: Record<string, number>): Record<string, number> {
    const geoDistribution: Record<string, number> = {};

    for (const [agent, count] of Object.entries(agentUsage)) {
      // Extract geo region from User-Agent
      const geoMatch = agent.match(/\((US|EU|UK|Asia|Global)-[\w]+\)/);
      if (geoMatch) {
        const region = geoMatch[1];
        geoDistribution[region] = (geoDistribution[region] || 0) + count;
      } else {
        geoDistribution['Unknown'] = (geoDistribution['Unknown'] || 0) + count;
      }
    }

    return geoDistribution;
  }

  private async calculateComplianceByRegion(): Promise<
    Record<string, { compliant: number; nonCompliant: number; rate: number }>
  > {
    const agentUsage = UserAgentMonitor.getAgentUsage();
    const complianceByRegion: Record<
      string,
      { compliant: number; nonCompliant: number; rate: number }
    > = {};

    for (const [agent, count] of Object.entries(agentUsage)) {
      const geoMatch = agent.match(/\((US|EU|UK|Asia|Global)-[\w]+\)/);
      const region = geoMatch ? geoMatch[1] : 'Unknown';

      if (!complianceByRegion[region]) {
        complianceByRegion[region] = { compliant: 0, nonCompliant: 0, rate: 0 };
      }

      // Check if agent is compliant (has compliance markers)
      const isCompliant =
        agent.includes('GDPR') || agent.includes('AML') || agent.includes('Compliance');

      if (isCompliant) {
        complianceByRegion[region].compliant += count;
      } else {
        complianceByRegion[region].nonCompliant += count;
      }
    }

    // Calculate rates
    for (const region of Object.keys(complianceByRegion)) {
      const data = complianceByRegion[region];
      const total = data.compliant + data.nonCompliant;
      data.rate = total > 0 ? data.compliant / total : 0;
    }

    return complianceByRegion;
  }

  private calculateComplianceRate(agentUsage: Record<string, number>): number {
    let compliantRequests = 0;
    let totalRequests = 0;

    for (const [agent, count] of Object.entries(agentUsage)) {
      totalRequests += count;

      // Check compliance markers
      if (agent.includes('GDPR') || agent.includes('AML') || agent.includes('Compliance')) {
        compliantRequests += count;
      }
    }

    return totalRequests > 0 ? compliantRequests / totalRequests : 0;
  }

  private checkGDPRCompliance(metrics: UserAgentMetrics): boolean {
    // GDPR requires proper data handling and consent
    return metrics.complianceRate >= 0.95 && metrics.suspiciousAgents === 0;
  }

  private checkPCICompliance(metrics: UserAgentMetrics): boolean {
    // PCI compliance for payment-related agents
    const paymentAgents = metrics.topAgents.filter(
      agent => agent.agent.includes('Payment') || agent.agent.includes('Crypto')
    );

    return paymentAgents.every(agent => agent.agent.includes('PCI'));
  }

  private checkAMLCompliance(metrics: UserAgentMetrics): boolean {
    // AML compliance for financial operations
    const financialAgents = metrics.topAgents.filter(
      agent =>
        agent.agent.includes('Payment') ||
        agent.agent.includes('Crypto') ||
        agent.agent.includes('AML')
    );

    return financialAgents.every(agent => agent.agent.includes('AML'));
  }

  private generateRecommendations(metrics: UserAgentMetrics, alerts: SecurityAlert[]): string[] {
    const recommendations: string[] = [];

    if (metrics.complianceRate < 0.95) {
      recommendations.push(
        'Increase User-Agent compliance rate by updating package configurations'
      );
    }

    if (metrics.suspiciousAgents > 0) {
      recommendations.push('Review and block suspicious User-Agents to improve security');
    }

    if (alerts.length > 0) {
      recommendations.push('Address active security alerts to maintain compliance');
    }

    if (metrics.uniqueAgents > 50) {
      recommendations.push('Consider consolidating User-Agent variations for better tracking');
    }

    if (recommendations.length === 0) {
      recommendations.push('User-Agent security posture is strong - continue monitoring');
    }

    return recommendations;
  }

  private async sendMetrics(metrics: UserAgentMetrics): Promise<void> {
    try {
      await this.post('/api/v1/analytics/user-agents', metrics);
    } catch (error) {
      console.warn('⚠️ Failed to send metrics to monitoring service:', error);
    }
  }

  private async createSecurityAlert(
    type: SecurityAlert['type'],
    severity: SecurityAlert['severity'],
    description: string
  ): Promise<void> {
    const alert: SecurityAlert = {
      id: `${type}-${Date.now()}`,
      type,
      severity,
      description,
      timestamp: new Date().toISOString(),
      recommendedAction: 'Review security configuration and update as needed',
    };

    // Send alert to security service
    await this.post('/api/v1/security/alerts', alert);

    // Log alert
    console.error(`🚨 Security Alert: ${description}`);
  }
}

// Export singleton instance
export const agentMonitor = new Fantasy42AgentMonitor();

// Export types
export type { UserAgentMetrics, SecurityAlert };
