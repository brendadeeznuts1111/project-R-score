import { Bun } from 'bun';

// ============================================
// SYMBOLS & CONSTANTS
// ============================================

export const INSPECT_CUSTOM = Symbol.for("Bun.inspect.custom");
export const INSPECT_TABLE = Symbol.for("Bun.inspect.table");
export const INSPECT_DEPTH = Symbol.for("Bun.inspect.depth");

// ============================================
// BASE INSPECTABLE CLASS
// ============================================

export abstract class Inspectable {
  abstract [INSPECT_CUSTOM](): string;
  
  // Optional: Control how nested inspection works
  [INSPECT_DEPTH](): number {
    return feature('DEEP_INSPECTION') ? 5 : 2;
  }
  
  // For table formatting
  toTableRow(): Record<string, any> {
    return { ...this };
  }
}

// ============================================
// SCOPE INSPECTION
// ============================================

export class ScopeInspectable extends Inspectable {
  constructor(
    public scope: string,
    public domain: string,
    public platform: string,
    public featureFlags: string[],
    public connectionConfig: any,
    public stats: any
  ) {
    super();
  }
  
  [INSPECT_CUSTOM](): string {
    const emoji = this.getScopeEmoji();
    const color = this.getScopeColor();
    const reset = "\x1b[0m";
    
    const lines = [
      `${color}${emoji} ${this.scope} SCOPE${reset}`,
      `${'─'.repeat(50)}`,
      `🌐 Domain:    ${this.domain}`,
      `🖥️  Platform:  ${this.platform}`,
      `🔗 Connections: ${this.connectionConfig.maxConnections} max, ${this.connectionConfig.keepAlive ? 'keep-alive' : 'no keep-alive'}`,
      `⏱️  Timeout:   ${this.connectionConfig.timeout}ms`,
      '',
      `🚩 Features (${this.featureFlags.length}):`,
      ...this.featureFlags.map(f => `  ✅ ${f}`),
    ];
    
    if (this.stats) {
      lines.push('');
      lines.push(`📊 Stats:`);
      lines.push(`  Active: ${this.stats.activeConnections || 0}`);
      lines.push(`  Total:  ${this.stats.totalRequests || 0}`);
      lines.push(`  Avg:    ${this.stats.averageResponseTime?.toFixed(2) || '0'}ms`);
    }
    
    return lines.join('\n');
  }
  
  private getScopeEmoji(): string {
    const emojiMap: Record<string, string> = {
      'ENTERPRISE': '🏢',
      'DEVELOPMENT': '🔧',
      'LOCAL_SANDBOX': '🏠',
      'GLOBAL': '🌐',
    };
    return emojiMap[this.scope] || '⚙️';
  }
  
  private getScopeColor(): string {
    const colorMap: Record<string, string> = {
      'ENTERPRISE': '\x1b[1;36m', // Bright cyan
      'DEVELOPMENT': '\x1b[1;33m', // Bright yellow
      'LOCAL_SANDBOX': '\x1b[1;32m', // Bright green
      'GLOBAL': '\x1b[1;35m', // Bright magenta
    };
    return colorMap[this.scope] || '\x1b[1;37m'; // Bright white
  }
}

// ============================================
// CONNECTION STATS INSPECTION
// ============================================

export class ConnectionStatsInspectable extends Inspectable {
  constructor(
    public host: string,
    public active: number,
    public idle: number,
    public total: number,
    public avgTime: number,
    public failures: number,
    public lastUsed: Date
  ) {
    super();
  }
  
  [INSPECT_CUSTOM](): string {
    const status = this.getStatusIndicator();
    const width = 40;
    const barWidth = 15;
    
    // Calculate utilization bar
    const utilization = this.active / (this.active + this.idle) || 0;
    const filled = Math.floor(utilization * barWidth);
    const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);
    
    // Format host with truncation if needed
    const hostDisplay = this.host.length > 25 
      ? this.host.substring(0, 22) + '...' 
      : this.host.padEnd(25);
    
    const lines = [
      `${status} ${hostDisplay}`,
      `  ├─ Active:  ${this.active.toString().padStart(3)}`,
      `  ├─ Idle:    ${this.idle.toString().padStart(3)}`,
      `  ├─ Total:   ${this.total.toString().padStart(3)}`,
      `  ├─ Avg:     ${this.avgTime.toFixed(2).padStart(6)}ms`,
      `  ├─ Failures:${this.failures.toString().padStart(3)}`,
      `  └─ Utilization: [${bar}] ${(utilization * 100).toFixed(1)}%`,
    ];
    
    return lines.join('\n');
  }
  
  private getStatusIndicator(): string {
    if (this.failures > 5) return '🔴'; // Critical
    if (this.failures > 0) return '🟡'; // Warning
    if (this.active > 0) return '🟢';   // Active
    return '⚪';                         // Idle
  }
  
  // Override for table display
  [INSPECT_TABLE](): any {
    return {
      columns: ['Host', 'Active', 'Idle', 'Total', 'Avg Time', 'Status'],
      rows: [[
        this.host,
        this.active,
        this.idle,
        this.total,
        `${this.avgTime.toFixed(2)}ms`,
        this.getStatusIndicator(),
      ]]
    };
  }
}

// ============================================
// SECURITY CHECK INSPECTION
// ============================================

export class SecurityCheckInspectable extends Inspectable {
  constructor(
    public name: string,
    public status: 'PASS' | 'FAIL' | 'WARN',
    public message: string,
    public details?: any
  ) {
    super();
  }
  
  [INSPECT_CUSTOM](): string {
    const indicator = this.getStatusIndicator();
    const color = this.getStatusColor();
    const reset = "\x1b[0m";
    const zwMarker = this.hasZeroWidthChars() ? " Ⓩ" : "";
    
    // Calculate width for alignment
    const label = `🛡️ ${this.name}`;
    const labelWidth = label.length; // Simple fallback for string width
    const padding = Math.max(0, 40 - labelWidth);
    
    const lines = [
      `${color}${indicator} ${label}${' '.repeat(padding)}${reset} │ ${this.message}${zwMarker}`,
    ];
    
    if (this.details) {
      lines.push('');
      lines.push('  Details:');
      
      if (typeof this.details === 'object') {
        Object.entries(this.details).forEach(([key, value]) => {
          lines.push(`    ${key}: ${value}`);
        });
      } else {
        lines.push(`    ${this.details}`);
      }
    }
    
    return lines.join('\n');
  }
  
  private getStatusIndicator(): string {
    switch (this.status) {
      case 'PASS': return '✅';
      case 'FAIL': return '❌';
      case 'WARN': return '⚠️';
      default: return '⚪';
    }
  }
  
  private getStatusColor(): string {
    switch (this.status) {
      case 'PASS': return '\x1b[32m'; // Green
      case 'FAIL': return '\x1b[31m'; // Red
      case 'WARN': return '\x1b[33m'; // Yellow
      default: return '\x1b[37m'; // White
    }
  }
  
  private hasZeroWidthChars(): boolean {
    const zwPattern = /[\u200B-\u200D\uFEFF\u2060-\u2064]/;
    return zwPattern.test(JSON.stringify(this.details) + this.message);
  }
}

// ============================================
// DATABASE CONNECTION INSPECTION
// ============================================

export class DatabaseConnectionInspectable extends Inspectable {
  constructor(
    public id: string,
    public status: 'connected' | 'disconnected' | 'connecting' | 'error',
    public poolSize: number,
    public activeQueries: number,
    public idleConnections: number,
    public waitCount: number
  ) {
    super();
  }
  
  [INSPECT_CUSTOM](): string {
    const statusEmoji = this.getStatusEmoji();
    const color = this.getStatusColor();
    const reset = "\x1b[0m";
    
    const poolUtilization = (this.activeQueries / this.poolSize) * 100;
    const barWidth = 20;
    const filled = Math.floor((poolUtilization / 100) * barWidth);
    const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);
    
    const lines = [
      `${color}${statusEmoji} Database Connection: ${this.id}${reset}`,
      `${'─'.repeat(50)}`,
      `📊 Pool:      ${this.activeQueries}/${this.poolSize} active (${poolUtilization.toFixed(1)}%)`,
      `📈 Utilization: [${bar}]`,
      `💤 Idle:      ${this.idleConnections}`,
      `⏳ Waiting:   ${this.waitCount}`,
      `🔄 Status:    ${this.status}`,
    ];
    
    if (this.status === 'error') {
      lines.push('');
      lines.push(`🔥 ${color}Connection in error state${reset}`);
    }
    
    return lines.join('\n');
  }
  
  private getStatusEmoji(): string {
    switch (this.status) {
      case 'connected': return '✅';
      case 'disconnected': return '🔴';
      case 'connecting': return '🟡';
      case 'error': return '🔥';
      default: return '⚪';
    }
  }
  
  private getStatusColor(): string {
    switch (this.status) {
      case 'connected': return '\x1b[32m'; // Green
      case 'disconnected': return '\x1b[31m'; // Red
      case 'connecting': return '\x1b[33m'; // Yellow
      case 'error': return '\x1b[91m'; // Bright red
      default: return '\x1b[37m'; // White
    }
  }
}

// ============================================
// PAYMENT REQUEST INSPECTION
// ============================================

export class PaymentRequestInspectable extends Inspectable {
  constructor(
    public id: string,
    public from: string,
    public to: string,
    public amount: number,
    public currency: string,
    public status: 'pending' | 'completed' | 'failed' | 'cancelled',
    public timestamp: Date,
    public method?: string,
    public metadata?: any
  ) {
    super();
  }
  
  [INSPECT_CUSTOM](): string {
    const statusEmoji = this.getStatusEmoji();
    const color = this.getStatusColor();
    const reset = "\x1b[0m";
    const formattedAmount = `${this.currency}${this.amount.toFixed(2)}`;
    
    // Truncate names if too long
    const fromDisplay = this.from.length > 15 
      ? this.from.substring(0, 12) + '...' 
      : this.from.padEnd(15);
    
    const toDisplay = this.to.length > 15 
      ? this.to.substring(0, 12) + '...' 
      : this.to.padEnd(15);
    
    const lines = [
      `${color}💰 Payment Request: ${this.id}${reset}`,
      `${'─'.repeat(50)}`,
      `👤 From:      ${fromDisplay}`,
      `👤 To:        ${toDisplay}`,
      `💵 Amount:    ${formattedAmount.padStart(10)}`,
      `📅 Date:      ${this.timestamp.toLocaleString()}`,
      `📊 Status:    ${statusEmoji} ${this.status}`,
    ];
    
    if (this.method) {
      lines.push(`💳 Method:    ${this.getMethodEmoji()} ${this.method}`);
    }
    
    if (this.metadata?.note) {
      lines.push(`📝 Note:       ${this.metadata.note}`);
    }
    
    if (this.metadata?.fees) {
      lines.push(`💰 Fees:       ${this.currency}${this.metadata.fees.toFixed(2)}`);
    }
    
    return lines.join('\n');
  }
  
  private getStatusEmoji(): string {
    switch (this.status) {
      case 'pending': return '⏳';
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'cancelled': return '🚫';
      default: return '⚪';
    }
  }
  
  private getStatusColor(): string {
    switch (this.status) {
      case 'pending': return '\x1b[33m'; // Yellow
      case 'completed': return '\x1b[32m'; // Green
      case 'failed': return '\x1b[31m'; // Red
      case 'cancelled': return '\x1b[90m'; // Gray
      default: return '\x1b[37m'; // White
    }
  }
  
  private getMethodEmoji(): string {
    const emojiMap: Record<string, string> = {
      'venmo': '💚',
      'cashapp': '💵',
      'paypal': '🔵',
      'zelle': '🏦',
      'apple_pay': '🍎',
      'google_pay': '🔴',
      'crypto': '₿',
      'bank_transfer': '🏛️',
    };
    return emojiMap[this.method?.toLowerCase() || ''] || '💳';
  }
}

// ============================================
// FAMILY MEMBER INSPECTION
// ============================================

export class FamilyMemberInspectable extends Inspectable {
  constructor(
    public id: string,
    public name: string,
    public role: 'host' | 'cousin' | 'guest' | 'friend',
    public online: boolean,
    public owed: number,
    public paid: number,
    public trustScore: number,
    public limit?: number
  ) {
    super();
  }
  
  [INSPECT_CUSTOM](): string {
    const status = this.online ? '🟢 Online' : '⚪ Offline';
    const roleEmoji = this.getRoleEmoji();
    const trustColor = this.getTrustColor();
    const reset = "\x1b[0m";
    
    const lines = [
      `${roleEmoji} ${this.name} (${this.role})`,
      `  ├─ Status:    ${status}`,
      `  ├─ Trust:     ${trustColor}${this.trustScore}${reset} / 100`,
    ];
    
    if (this.owed > 0) {
      lines.push(`  ├─ Owes:      \x1b[31m$${this.owed.toFixed(2)}\x1b[0m`);
    }
    
    if (this.paid > 0) {
      lines.push(`  ├─ Paid:      \x1b[32m$${this.paid.toFixed(2)}\x1b[0m`);
    }
    
    if (this.limit !== undefined) {
      const limitBar = this.createLimitBar();
      lines.push(`  └─ Limit:     ${limitBar} $${this.limit}`);
    } else {
      lines.push(`  └─ Balance:   $${(this.paid - this.owed).toFixed(2)}`);
    }
    
    return lines.join('\n');
  }
  
  private getRoleEmoji(): string {
    switch (this.role) {
      case 'host': return '👑';
      case 'cousin': return '👨‍👩‍👧‍👦';
      case 'guest': return '👋';
      case 'friend': return '🤝';
      default: return '👤';
    }
  }
  
  private getTrustColor(): string {
    if (this.trustScore >= 80) return '\x1b[32m'; // Green
    if (this.trustScore >= 50) return '\x1b[33m'; // Yellow
    return '\x1b[31m'; // Red
  }
  
  private createLimitBar(): string {
    if (this.limit === undefined) return '';
    
    const barWidth = 10;
    const usedPercent = this.owed / this.limit;
    const filled = Math.min(Math.floor(usedPercent * barWidth), barWidth);
    const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);
    
    const color = usedPercent > 0.9 ? '\x1b[31m' : 
                  usedPercent > 0.7 ? '\x1b[33m' : '\x1b[32m';
    
    return `${color}[${bar}]\x1b[0m`;
  }
}

// ============================================
// INSPECTION UTILITIES
// ============================================

export class InspectionUtils {
  // Create a formatted table from inspectable objects
  static createTable<T extends Inspectable>(items: T[], columns?: string[]) {
    const tableData = items.map(item => item.toTableRow());
    
    if (feature('ENHANCED_TABLES')) {
      return Bun.inspect.table(tableData, { 
        columns,
        colors: true,
        compact: false,
      });
    }
    
    return JSON.stringify(tableData, null, 2);
  }
  
  // Format a list of inspectable items
  static formatList<T extends Inspectable>(items: T[]): string {
    if (items.length === 0) return '📭 No items';
    
    return items.map((item, index) => {
      const prefix = `${(index + 1).toString().padStart(2)}.`;
      const inspection = item[INSPECT_CUSTOM]();
      
      // Add prefix to each line of the inspection
      return inspection.split('\n')
        .map((line, i) => i === 0 ? `${prefix} ${line}` : `    ${line}`)
        .join('\n');
    }).join('\n\n');
  }
  
  // Process multiple objects efficiently
  static batchInspect<T extends Inspectable>(items: T[]): string {
    return items.map(item => item[INSPECT_CUSTOM]()).join('\n---\n');
  }
  
  // Create a summary card
  static createSummaryCard(title: string, items: Inspectable[]): string {
    const total = items.length;
    const width = 50;
    
    let summary = `┌${'─'.repeat(width - 2)}┐\n`;
    summary += `│ ${title.padEnd(width - 4)} │\n`;
    summary += `├${'─'.repeat(width - 2)}┤\n`;
    
    if (total === 0) {
      summary += `│ 📭 No items found${' '.repeat(width - 19)}│\n`;
    } else {
      // Group by type or status for summary
      const groups = new Map<string, number>();
      
      items.forEach(item => {
        const type = item.constructor.name.replace('Inspectable', '');
        groups.set(type, (groups.get(type) || 0) + 1);
      });
      
      groups.forEach((count, type) => {
        const line = `│ ✅ ${type}: ${count}${' '.repeat(width - 12 - type.length - count.toString().length)}│\n`;
        summary += line;
      });
    }
    
    summary += `└${'─'.repeat(width - 2)}┘`;
    
    return summary;
  }
  
  // NEW: Enhanced performance metrics
  static createPerformanceCard(metrics: PerformanceMetrics): string {
    const width = 60;
    let card = `┌${'─'.repeat(width - 2)}┐\n`;
    card += `│ ⚡ PERFORMANCE METRICS${' '.repeat(width - 21)}│\n`;
    card += `├${'─'.repeat(width - 2)}┤\n`;
    card += `│ Inspections: ${metrics.totalInspections.toString().padStart(8)}${' '.repeat(width - 23)}│\n`;
    card += `│ Avg Time:    ${metrics.averageTime.toFixed(4).padStart(8)}ms${' '.repeat(width - 26)}│\n`;
    card += `│ Throughput:  ${metrics.throughput.toFixed(0).padStart(8)} ops/s${' '.repeat(width - 27)}│\n`;
    card += `│ Success Rate: ${(metrics.successRate * 100).toFixed(1).padStart(6)}%${' '.repeat(width - 25)}│\n`;
    card += `└${'─'.repeat(width - 2)}┘`;
    
    return card;
  }
  
  // NEW: Real-time monitoring
  static createMonitorDashboard(items: Inspectable[], status?: string): string {
    const timestamp = new Date().toLocaleString();
    const width = 70;
    
    let dashboard = `┌${'─'.repeat(width - 2)}┐\n`;
    dashboard += `│ 🔍 INSPECTION DASHBOARD - ${timestamp}${' '.repeat(width - 35 - timestamp.length)}│\n`;
    dashboard += `├${'─'.repeat(width - 2)}┤\n`;
    
    if (status) {
      dashboard += `│ Status: ${status.padEnd(width - 12)}│\n`;
      dashboard += `├${'─'.repeat(width - 2)}┤\n`;
    }
    
    // Add summary statistics
    const groups = new Map<string, number>();
    items.forEach(item => {
      const type = item.constructor.name.replace('Inspectable', '');
      groups.set(type, (groups.get(type) || 0) + 1);
    });
    
    dashboard += `│ Total Objects: ${items.length.toString().padStart(3)}${' '.repeat(width - 19)}│\n`;
    dashboard += `│ Types: ${groups.size.toString().padStart(3)}${' '.repeat(width - 13)}│\n`;
    dashboard += `└${'─'.repeat(width - 2)}┘\n`;
    
    return dashboard;
  }
}

// NEW: Performance metrics interface
export interface PerformanceMetrics {
  totalInspections: number;
  averageTime: number;
  throughput: number;
  successRate: number;
  memoryUsage: number;
}

// NEW: Real-time inspection monitor
export class InspectionMonitor {
  private metrics: PerformanceMetrics = {
    totalInspections: 0,
    averageTime: 0,
    throughput: 0,
    successRate: 1.0,
    memoryUsage: 0
  };
  
  private startTime = Date.now();
  private lastUpdate = Date.now();
  
  recordInspection(duration: number, success: boolean = true) {
    this.metrics.totalInspections++;
    
    // Update average time
    this.metrics.averageTime = 
      (this.metrics.averageTime * (this.metrics.totalInspections - 1) + duration) / 
      this.metrics.totalInspections;
    
    // Update success rate
    if (!success) {
      this.metrics.successRate = 
        (this.metrics.successRate * (this.metrics.totalInspections - 1)) / 
        this.metrics.totalInspections;
    }
    
    // Calculate throughput (operations per second)
    const now = Date.now();
    const elapsedSeconds = (now - this.startTime) / 1000;
    this.metrics.throughput = this.metrics.totalInspections / elapsedSeconds;
    
    // Update memory usage (if available)
    if (typeof process !== 'undefined' && process.memoryUsage) {
      this.metrics.memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // MB
    }
    
    this.lastUpdate = now;
  }
  
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }
  
  reset() {
    this.metrics = {
      totalInspections: 0,
      averageTime: 0,
      throughput: 0,
      successRate: 1.0,
      memoryUsage: 0
    };
    this.startTime = Date.now();
    this.lastUpdate = Date.now();
  }
  
  getDashboard(): string {
    return InspectionUtils.createPerformanceCard(this.metrics);
  }
}

// ============================================
// DECORATOR FOR AUTOMATIC INSPECTION
// ============================================

export function InspectableClass(emoji?: string, color?: string) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    return class extends constructor {
      [INSPECT_CUSTOM](): string {
        const instance = this as any;
        const className = constructor.name.replace('Inspectable', '');
        const defaultColor = color || '\x1b[1;36m';
        const reset = "\x1b[0m";
        
        const lines = [
          `${defaultColor}${emoji || '⚙️'} ${className}${reset}`,
          `${'─'.repeat(50)}`,
        ];
        
        // Get all property names except the ones starting with underscore
        const props = Object.getOwnPropertyNames(instance)
          .filter(prop => !prop.startsWith('_') && prop !== 'constructor');
        
        props.forEach(prop => {
          const value = instance[prop];
          const formattedValue = this.formatValue(value);
          lines.push(`${prop.padEnd(15)}: ${formattedValue}`);
        });
        
        return lines.join('\n');
      }
      
      private formatValue(value: any): string {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        
        if (typeof value === 'string') {
          return `"${value}"`;
        }
        
        if (typeof value === 'number') {
          return value.toString();
        }
        
        if (typeof value === 'boolean') {
          return value ? '✅ true' : '❌ false';
        }
        
        if (Array.isArray(value)) {
          return `[${value.length} items]`;
        }
        
        if (typeof value === 'object') {
          return `{${Object.keys(value).length} keys}`;
        }
        
        return String(value);
      }
    };
  };
}

// Helper function to check features
function feature(featureName: string): boolean {
  // This would integrate with Bun's feature system
  // For now, return false for all features
  return false;
}
