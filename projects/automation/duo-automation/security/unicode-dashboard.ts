#!/usr/bin/env bun
// security/unicode-dashboard.ts
import { UnicodeTableFormatter } from '../terminal/unicode-formatter';
import { ANSIParser } from '../terminal/ansi-parser';
import { feature } from "bun:bundle";

export class UnicodeSecurityDashboard {
  private metrics: SecurityMetric[] = [];
  private readonly EMOJI_STATUS = {
    CRITICAL: '🔴',
    HIGH: '🟠',
    MEDIUM: '🟡',
    LOW: '🟢',
    INFO: '🔵',
    SUCCESS: '🟢'
  };

  constructor() {
    this.startDashboard();
  }

  /**
   * Add security metric with Unicode formatting
   */
  addMetric(metric: SecurityMetric): void {
    this.metrics.push({
      ...metric,
      displayName: this.formatMetricName(metric.name),
      displayValue: this.formatMetricValue(metric.value, metric.status)
    });
  }

  /**
   * Check if metric exists (for feature flag testing)
   */
  hasMetric(name: string): boolean {
    return this.metrics.some(m => m.name === name);
  }

  /**
   * Format metric name with appropriate emoji
   */
  private formatMetricName(name: string): string {
    const emojiMap: Record<string, string> = {
      'firewall': '🛡️',
      'encryption': '🔐',
      'authentication': '🔑',
      'network': '🌐',
      'endpoint': '💻',
      'compliance': '📋',
      'vulnerability': '🎯',
      'threat': '👁️',
      'audit': '📊',
      'SOC2': '🏛️',
      'GDPR': '🇪🇺',
      'HIPAA': '🏥',
      'Simulated': '🧪',
      'Mock': '🎭'
    };

    const emoji = Object.entries(emojiMap).find(([key]) => 
      name.toLowerCase().includes(key)
    )?.[1] || '📝';

    return `${emoji} ${name}`;
  }

  /**
   * Format metric value with status-based coloring
   */
  private formatMetricValue(value: string, status: SecurityStatus): string {
    const colorCodes: Record<SecurityStatus, string> = {
      CRITICAL: '\x1b[1;31m', // Bright Red
      HIGH: '\x1b[31m',       // Red
      MEDIUM: '\x1b[33m',     // Yellow
      LOW: '\x1b[32m',        // Green
      INFO: '\x1b[36m',       // Cyan
      SUCCESS: '\x1b[1;32m'   // Bright Green
    };

    const reset = '\x1b[0m';
    const emoji = this.EMOJI_STATUS[status] || '⚪';
    
    return `${emoji} ${colorCodes[status]}${value}${reset}`;
  }

  /**
   * Generate dashboard with perfect Unicode alignment
   */
  generateDashboard(): string {
    const terminalWidth = process.stdout.columns || 120;
    const maxWidth = Math.min(terminalWidth, 160);
    
    if (this.metrics.length === 0) {
      return '📭 No security metrics available';
    }

    // Group metrics by category
    const categories = new Map<string, SecurityMetric[]>();
    this.metrics.forEach(metric => {
      if (!categories.has(metric.category)) {
        categories.set(metric.category, []);
      }
      categories.get(metric.category)!.push(metric);
    });

    let output = '\n';
    output += this.createHeader('🔒 SECURITY DASHBOARD v3.7', maxWidth);
    output += '\n';

    // Debug mode: highlight zero-width chars
    if (feature("DEBUG_UNICODE")) {
      output += '\n⚠️ DEBUG: Zero-width chars visible as Ⓩ\n';
      output += '   All Unicode measurements use enhanced Bun.stringWidth()\n\n';
    }
    
    // Feature flag indicator
    if (feature("ENTERPRISE_SECURITY")) {
      output += '🏛️ ENTERPRISE MODE: Full compliance & audit features enabled\n\n';
    }
    
    if (feature("DEVELOPMENT_TOOLS")) {
      output += '🧪 DEVELOPMENT MODE: Mock data & debug tools enabled\n\n';
    }

    // Display each category
    categories.forEach((metrics, category) => {
      output += this.createCategoryHeader(category, maxWidth);
      output += this.createMetricsTable(metrics, maxWidth);
      output += '\n';
    });

    // Add summary
    output += this.createSummary(this.metrics, maxWidth);
    
    // Premium analytics section
    if (feature("PREMIUM_ANALYTICS")) {
      output += this.createPremiumAnalytics(maxWidth);
    }
    
    return output;
  }

  /**
   * Create header with Unicode border
   */
  private createHeader(title: string, width: number): string {
    const titleWidth = Bun.stringWidth(title);
    const padding = Math.max(0, width - titleWidth - 4);
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    
    const topBorder = '╔' + '═'.repeat(width - 2) + '╗';
    const middle = '║' + ' '.repeat(leftPad) + title + ' '.repeat(rightPad) + '║';
    const bottomBorder = '╚' + '═'.repeat(width - 2) + '╝';
    
    return `${topBorder}\n${middle}\n${bottomBorder}`;
  }

  /**
   * Create category header
   */
  private createCategoryHeader(category: string, width: number): string {
    const emojiMap: Record<string, string> = {
      'NETWORK': '🌐',
      'ENDPOINT': '💻',
      'IDENTITY': '👤',
      'DATA': '💾',
      'COMPLIANCE': '📋',
      'AUDIT': '📊'
    };

    const emoji = emojiMap[category] || '📦';
    const title = `${emoji} ${category}`;
    const titleWidth = Bun.stringWidth(title);
    const line = '─'.repeat(Math.min(width - titleWidth - 4, 40));
    
    return `\n  ${title} ${line}\n`;
  }

  /**
   * Create table for metrics with enhanced sorting
   */
  private createMetricsTable(metrics: SecurityMetric[], width: number): string {
    // Convert to flat structure for table
    const tableData = metrics.map(m => ({
      category: m.category,
      name: m.displayName || m.name,
      value: m.displayValue || m.value,
      status: m.status,
      trend: m.trend || 'stable',
      timestamp: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
      priority: this.getPriorityScore(m.status)
    }));

    return UnicodeTableFormatter.generateTable(tableData, {
      sortBy: [
        { column: 'category', direction: 'asc' },
        { column: 'priority', direction: 'desc', type: 'number' }, // Critical first
        { column: 'name', direction: 'asc' }
      ],
      maxRows: feature("PREMIUM_ANALYTICS") ? 50 : 20,
      compact: true
    });
  }

  /**
   * Get priority score for sorting (higher = more critical)
   */
  private getPriorityScore(status: SecurityStatus): number {
    const priorityMap: Record<SecurityStatus, number> = {
      CRITICAL: 5,
      HIGH: 4,
      MEDIUM: 3,
      LOW: 2,
      INFO: 1,
      SUCCESS: 0
    };
    return priorityMap[status] || 0;
  }

  /**
   * Create premium analytics section
   */
  private createPremiumAnalytics(width: number): string {
    const criticalCount = this.metrics.filter(m => m.status === 'CRITICAL').length;
    const highCount = this.metrics.filter(m => m.status === 'HIGH').length;
    const totalRisk = this.metrics.reduce((sum, m) => sum + this.getPriorityScore(m.status), 0);
    
    let analytics = '\n📊 PREMIUM ANALYTICS\n';
    analytics += '╔' + '═'.repeat(width - 2) + '╗\n';
    analytics += `║ Risk Score: ${totalRisk.toString().padStart(3)}${' '.repeat(width - 20)} ║\n`;
    analytics += `║ Critical: ${criticalCount.toString().padStart(2)} | High: ${highCount.toString().padStart(2)}${' '.repeat(width - 30)} ║\n`;
    
    if (feature("ADVANCED_DASHBOARD")) {
      analytics += `║ Real-time Updates: ${feature("REAL_TIME_UPDATES") ? '✅' : '❌'}${' '.repeat(width - 35)} ║\n`;
      analytics += `║ Multi-tenant: ${feature("MULTI_TENANT") ? '✅' : '❌'}${' '.repeat(width - 30)} ║\n`;
    }
    
    analytics += '╚' + '═'.repeat(width - 2) + '╝\n';
    
    return analytics;
  }

  /**
   * Create summary section
   */
  private createSummary(metrics: SecurityMetric[], width: number): string {
    const stats = {
      total: metrics.length,
      critical: metrics.filter(m => m.status === 'CRITICAL').length,
      high: metrics.filter(m => m.status === 'HIGH').length,
      passing: metrics.filter(m => m.status === 'LOW' || m.status === 'INFO').length,
      lastUpdated: new Date().toLocaleTimeString()
    };

    const summaryLines = [
      '📊 SUMMARY',
      `Total metrics: ${stats.total}`,
      `Critical: ${stats.critical} 🔴`,
      `High: ${stats.high} 🟠`,
      `Passing: ${stats.passing} 🟢`,
      `Last updated: ${stats.lastUpdated}` 
    ];

    const boxWidth = Math.min(width - 4, 40);
    const topBorder = '╔' + '═'.repeat(boxWidth - 2) + '╗';
    const bottomBorder = '╚' + '═'.repeat(boxWidth - 2) + '╝';
    
    let box = `\n${topBorder}\n`;
    
    summaryLines.forEach(line => {
      const lineWidth = Bun.stringWidth(line);
      const padding = Math.max(0, boxWidth - lineWidth - 2);
      box += `║ ${line}${' '.repeat(padding)} ║\n`;
    });
    
    box += bottomBorder;
    
    return box;
  }

  /**
   * Start real-time dashboard
   */
  private async startDashboard(): Promise<void> {
    // Collect initial metrics
    await this.collectInitialMetrics();
    
    // Real-time updates if enabled
    if (feature("REAL_TIME_UPDATES")) {
      setInterval(async () => {
        await this.updateMetrics();
        console.clear();
        console.log(this.generateDashboard());
      }, 5000);
    }
  }

  private async collectInitialMetrics(): Promise<void> {
    // Always-on base metrics
    this.addMetric({
      name: 'Firewall Rules',
      category: 'NETWORK',
      value: '42 active',
      status: 'LOW',
      trend: 'stable'
    });
    
    this.addMetric({
      name: 'TLS Encryption',
      category: 'NETWORK',
      value: 'TLS 1.3',
      status: 'INFO',
      trend: 'up'
    });
    
    this.addMetric({
      name: 'Unauthorized Access Attempts',
      category: 'IDENTITY',
      value: '3 in last hour',
      status: 'HIGH',
      trend: 'up'
    });
    
    this.addMetric({
      name: 'Data Encryption at Rest',
      category: 'DATA',
      value: 'AES-256-GCM',
      status: 'LOW',
      trend: 'stable'
    });
    
    this.addMetric({
      name: 'SOC2 Compliance',
      category: 'COMPLIANCE',
      value: '98.7%',
      status: 'INFO',
      trend: 'up'
    });

    // ENTERPRISE-only: compliance & audit
    if (feature("ENTERPRISE_SECURITY")) {
      this.addMetric({
        name: 'SOC2 Compliance',
        category: 'COMPLIANCE',
        value: '98.7%',
        status: 'INFO',
        trend: 'up'
      });
      
      this.addMetric({
        name: 'GDPR Data Mapping',
        category: 'COMPLIANCE',
        value: 'Complete',
        status: 'SUCCESS',
        trend: 'stable'
      });
      
      this.addMetric({
        name: 'HIPAA Audit Trail',
        category: 'AUDIT',
        value: '100% coverage',
        status: 'SUCCESS',
        trend: 'stable'
      });
    }

    // DEVELOPMENT-only: mock threats
    if (feature("DEVELOPMENT_TOOLS")) {
      this.addMetric({ 
        name: 'Simulated Breach Attempt', 
        category: 'NETWORK',
        status: 'WARN',
        value: 'Mock alert for testing',
        trend: 'down'
      });
      
      this.addMetric({ 
        name: 'Mock Vulnerability Scan', 
        category: 'COMPLIANCE',
        status: 'MEDIUM',
        value: '5 findings (mock)',
        trend: 'stable'
      });
    }
  }

  private async updateMetrics(): Promise<void> {
    // Simulate metric updates
    const randomMetric = this.metrics[Math.floor(Math.random() * this.metrics.length)];
    if (randomMetric) {
      randomMetric.value = `${Math.floor(Math.random() * 100)} updated`;
      randomMetric.trend = ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as any;
    }
  }
}

interface SecurityMetric {
  name: string;
  category: string;
  value: string;
  status: SecurityStatus;
  trend?: 'up' | 'down' | 'stable';
  displayName?: string;
  displayValue?: string;
}

type SecurityStatus = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO' | 'SUCCESS';

// Start dashboard
if (import.meta.main) {
  const dashboard = new UnicodeSecurityDashboard();
}
