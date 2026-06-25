import type { PerfMetric } from './perf-metric';

// Bun.inspect.custom for Bun v1.3.6+
const inspectCustom = Symbol.for('Bun.inspect.custom');

export interface SecurityMetric extends PerfMetric {
  domain: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  securityScore: number;
  lastVerified: string; // ISO UTC
  localTime: string;    // Node-specific local time
  systemTZ: string;     // Node-specific timezone
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIAL';
}

/**
 * v3.7 Security Metric Enhancer
 * Base function for all security-related performance metrics
 */
export function enhanceSecurityMetric(metric: PerfMetric): SecurityMetric {
  // Derive domain from properties or environment
  const domain = metric.properties?.domain || Bun.env.DASHBOARD_DOMAIN || 'localhost';

  // Calculate security score (0-100)
  const baseScore = metric.value === 'ENABLED' ? 100 : 
                    metric.value === 'PARTIAL' ? 50 : 0;
  
  const impactMultiplier = {
    high: 1.5,
    medium: 1.0,
    low: 0.7
  }[metric.impact] ?? 1.0;

  const securityScore = Math.round(baseScore * impactMultiplier);

  // Determine risk level
  let riskLevel: SecurityMetric['riskLevel'];
  if (securityScore >= 90) riskLevel = 'CRITICAL';
  else if (securityScore >= 70) riskLevel = 'HIGH';
  else if (securityScore >= 40) riskLevel = 'MEDIUM';
  else riskLevel = 'LOW';

  // Check compliance
  const complianceStatus = securityScore >= 70 ? 'COMPLIANT' :
                           securityScore >= 50 ? 'PARTIAL' : 'NON_COMPLIANT';

  const now = new Date();

  return {
    ...metric,
    domain,
    securityScore,
    riskLevel,
    complianceStatus,
    lastVerified: now.toISOString(),
    localTime: now.toLocaleString(),
    systemTZ: process.env.TZ || 'SYSTEM (DEFAULT)',
    
    // Bun.inspect.custom for automatic table formatting
    [inspectCustom](): string {
      const props = metric.properties 
        ? JSON.stringify(metric.properties, null, 0).slice(0, 30) + '...' 
        : '-';
      
      return [
        `[${this.domain}]`.padEnd(15),
        `[${metric.category}]`.padEnd(12),
        `[${metric.type}]`.padEnd(10),
        metric.topic.slice(0, 15).padEnd(15),
        metric.subCat.slice(0, 12).padEnd(12),
        metric.id.slice(0, 12).padEnd(12),
        metric.value.padEnd(8),
        `${metric.locations}`.padStart(3),
        `${this.riskLevel}`.padEnd(8),
        `${metric.impact === 'high' ? '🔴' : metric.impact === 'medium' ? '🟡' : '🟢'}`.padEnd(4),
        `${this.systemTZ}`.padEnd(15),
        props
      ].join(' | ');
    }
  };
}

// Batch processor
export const enhanceSecurityMetrics = (metrics: PerfMetric[]): SecurityMetric[] =>
  metrics.map(enhanceSecurityMetric);