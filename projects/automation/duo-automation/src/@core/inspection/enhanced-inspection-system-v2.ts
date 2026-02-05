/**
 * 🎨 Enhanced Custom Inspection System v2.0 - Alternative Implementation
 * 
 * A comprehensive custom inspection system that transforms complex objects into 
 * beautiful, informative terminal displays with emojis, colors, and structured formatting.
 * 
 * Features:
 * - Beautiful Visual Output with emojis and colors
 * - Performance tracking with InspectionStats
 * - Extensible architecture with decorators
 * - Configurable colors and emojis
 * - Zero overhead when disabled
 * - Type-safe inspection with TypeScript
 */

// Symbols for custom inspection
export const INSPECT_CUSTOM = Symbol.for('Bun.inspect.custom');
export const INSPECT_TABLE = Symbol.for('Bun.inspect.table');
export const INSPECT_DEPTH = Symbol.for('Bun.inspect.depth');

// Inspection Config Interface
interface InspectionConfig {
  enabled: boolean;
  colors: Record<string, string>;
  emojis: Record<string, string>;
  depth: number;
  showHidden: boolean;
  customInspectors: Map<new (...args: any[]) => any, (instance: any) => string>;
}

// Default Config
const defaultConfig: InspectionConfig = {
  enabled: true,
  colors: {
    ENTERPRISE: '\x1b[1;34m', // Blue
    DEVELOPMENT: '\x1b[1;33m', // Yellow
    LOCAL_SANDBOX: '\x1b[1;32m', // Green
    GLOBAL: '\x1b[1;36m', // Cyan
    PASS: '\x1b[1;32m', // Green
    FAIL: '\x1b[1;31m', // Red
    WARN: '\x1b[1;33m', // Yellow
    RESET: '\x1b[0m'
  },
  emojis: {
    ENTERPRISE: '🏢',
    DEVELOPMENT: '🔧',
    LOCAL_SANDBOX: '🏠',
    GLOBAL: '🌐',
    PASS: '✅',
    FAIL: '❌',
    WARN: '⚠️'
  },
  depth: 5,
  showHidden: false,
  customInspectors: new Map()
};

// Global Config
let globalConfig = { ...defaultConfig };

// Inspection Stats for Performance Monitoring
export class InspectionStats {
  private static instance: InspectionStats;
  private inspections: Array<{ type: string; duration: number; error: boolean }> = [];

  private constructor() {}

  static getInstance(): InspectionStats {
    if (!InspectionStats.instance) {
      InspectionStats.instance = new InspectionStats();
    }
    return InspectionStats.instance;
  }

  recordInspection(type: string, duration: number, error: boolean = false) {
    this.inspections.push({ type, duration, error });
  }

  printStats() {
    const total = this.inspections.length;
    const avgDuration = this.inspections.reduce((sum, i) => sum + i.duration, 0) / total || 0;
    const errors = this.inspections.filter(i => i.error).length;
    console.log(`Inspection Stats:
  Total: ${total}
  Avg Duration: ${avgDuration.toFixed(4)}ms
  Errors: ${errors}`);
  }
}

// Utility Functions
export class InspectionUtils {
  static formatList(items: any[]): string {
    return items.map((item, index) => `  ${index + 1}. ${item[INSPECT_CUSTOM] ? item[INSPECT_CUSTOM]() : String(item)}`).join('\n');
  }

  static createSummaryCard(title: string, items: any[]): string {
    const content = items.length ? InspectionUtils.formatList(items) : 'No items';
    return `
┌────────────────────────────────────────────────┐
│ ${title.padEnd(45)} │
├────────────────────────────────────────────────┤
│ ${content.replace(/\n/g, '\n│ ')} │
└────────────────────────────────────────────────┘`;
  }

  static createTable<T>(items: T[], columns?: (keyof T)[]): string {
    if (!items.length) return 'No data';
    columns = columns || Object.keys(items[0]) as (keyof T)[];
    const headers = columns.join(' | ');
    const rows = items.map(item => columns!.map(col => String(item[col])).join(' | ')).join('\n');
    return `${headers}\n${'-'.repeat(headers.length)}\n${rows}`;
  }

  static progressBar(percentage: number, width = 10): string {
    const filled = Math.round(percentage / 100 * width);
    return `[${'█'.repeat(filled)}${'░'.repeat(width - filled)}] ${percentage.toFixed(0)}%`;
  }
}

// Abstract Base Class
abstract class Inspectable {
  [INSPECT_CUSTOM](): string {
    const start = Date.now();
    try {
      const formatted = this.format();
      InspectionStats.getInstance().recordInspection(this.constructor.name, Date.now() - start);
      return formatted;
    } catch (e) {
      InspectionStats.getInstance().recordInspection(this.constructor.name, Date.now() - start, true);
      return `Error inspecting ${this.constructor.name}: ${(e as Error).message}`;
    }
  }

  abstract format(): string;

  [INSPECT_DEPTH](): number {
    return globalConfig.depth;
  }

  toTableRow(): Record<string, any> {
    return { ...this };
  }
}

// Decorator for Auto-Inspection
export function InspectableClass(emoji: string, color: string) {
  return function <T extends { new(...args: any[]): {} }>(constructor: T) {
    return class extends constructor {
      [INSPECT_CUSTOM](): string {
        const instance = this as any;
        let output = `${color}${emoji} ${constructor.name.toUpperCase()}${globalConfig.colors.RESET}\n`;
        output += '─'.repeat(50) + '\n';
        for (const [key, value] of Object.entries(instance)) {
          output += `${key.padEnd(15)}: ${value}\n`;
        }
        return output;
      }
    };
  };
}

// ScopeInspectable
export class ScopeInspectable extends Inspectable {
  constructor(
    public scope: string,
    public domain: string,
    public platform: string,
    public featureFlags: string[],
    public connectionConfig: any,
    public stats?: any
  ) { super(); }

  format(): string {
    const color = globalConfig.colors[this.scope] || globalConfig.colors.RESET;
    const emoji = globalConfig.emojis[this.scope] || '🏢';
    let output = `${color}${emoji} ${this.scope} SCOPE${globalConfig.colors.RESET}\n`;
    output += '──────────────────────────────────────────────────\n';
    output += `🌐 Domain:    ${this.domain}\n`;
    output += `🖥️  Platform:  ${this.platform}\n`;
    output += `🔗 Connections: ${this.connectionConfig.maxConnections} max, ${this.connectionConfig.keepAlive ? 'keep-alive' : 'no keep-alive'}\n`;
    output += `⏱️  Timeout:   ${this.connectionConfig.timeout}ms\n\n`;
    output += `🚩 Features (${this.featureFlags.length}):\n`;
    output += this.featureFlags.map(f => `  ✅ ${f}`).join('\n') + '\n\n';
    if (this.stats) {
      output += '📊 Stats:\n';
      output += `  Active: ${this.stats.activeConnections}\n`;
      output += `  Total:  ${this.stats.totalRequests}\n`;
      output += `  Avg:    ${this.stats.averageResponseTime}ms\n`;
    }
    return output;
  }
}

// ConnectionStatsInspectable
export class ConnectionStatsInspectable extends Inspectable {
  constructor(
    public host: string,
    public active: number,
    public idle: number,
    public total: number,
    public avgTime: number,
    public failures: number,
    public lastUsed: Date
  ) { super(); }

  format(): string {
    const utilization = ((this.active / (this.active + this.idle)) * 100) || 0;
    const statusColor = this.failures > 0 ? globalConfig.colors.FAIL : globalConfig.colors.PASS;
    let output = `${statusColor}🔗 Connection to ${this.host}${globalConfig.colors.RESET}\n`;
    output += '──────────────────────────────────────────────────\n';
    output += `Active: ${this.active}   Idle: ${this.idle}\n`;
    output += `Utilization: ${InspectionUtils.progressBar(utilization)}\n`;
    output += `Total Requests: ${this.total}\n`;
    output += `Avg Response: ${this.avgTime.toFixed(2)}ms\n`;
    output += `Failures: ${this.failures}\n`;
    output += `Last Used: ${this.lastUsed.toISOString()}\n`;
    return output;
  }
}

// SecurityCheckInspectable
export class SecurityCheckInspectable extends Inspectable {
  constructor(
    public name: string,
    public status: 'PASS' | 'FAIL' | 'WARN',
    public message: string,
    public details?: any
  ) { super(); }

  format(): string {
    const emoji = globalConfig.emojis[this.status] || '❓';
    const color = globalConfig.colors[this.status] || globalConfig.colors.RESET;
    let output = `${color}${emoji} ${this.name}${globalConfig.colors.RESET}\n`;
    output += '──────────────────────────────────────────────────\n';
    output += `📝 ${this.message}\n`;
    if (this.details) {
      for (const [key, value] of Object.entries(this.details)) {
        output += `   ${key}: ${value}\n`;
      }
    }
    return output;
  }
}

// DatabaseConnectionInspectable
export class DatabaseConnectionInspectable extends Inspectable {
  constructor(
    public id: string,
    public status: 'connected' | 'disconnected' | 'connecting' | 'error',
    public poolSize: number,
    public activeQueries: number,
    public idleConnections: number,
    public waitCount: number
  ) { super(); }

  format(): string {
    const emoji = this.status === 'connected' ? '🗄️' : '⚠️';
    const color = this.status === 'connected' ? globalConfig.colors.PASS : globalConfig.colors.WARN;
    let output = `${color}${emoji} Database Connection ${this.id}${globalConfig.colors.RESET}\n`;
    output += '──────────────────────────────────────────────────\n';
    output += `Status: ${this.status}\n`;
    output += `Pool Size: ${this.poolSize}\n`;
    output += `Active Queries: ${this.activeQueries}\n`;
    output += `Idle: ${this.idleConnections}\n`;
    output += `Waiting: ${this.waitCount}\n`;
    return output;
  }
}

// PaymentRequestInspectable
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
  ) { super(); }

  format(): string {
    const emoji = this.status === 'completed' ? '💳' : '⏳';
    const color = this.status === 'completed' ? globalConfig.colors.PASS : globalConfig.colors.WARN;
    let output = `${color}${emoji} Payment Request ${this.id}${globalConfig.colors.RESET}\n`;
    output += '──────────────────────────────────────────────────\n';
    output += `From: ${this.from}  To: ${this.to}\n`;
    output += `Amount: ${this.amount} ${this.currency}\n`;
    output += `Status: ${this.status}\n`;
    output += `Time: ${this.timestamp.toISOString()}\n`;
    if (this.method) output += `Method: ${this.method}\n`;
    if (this.metadata) {
      output += 'Metadata:\n';
      for (const [key, value] of Object.entries(this.metadata)) {
        output += `  ${key}: ${value}\n`;
      }
    }
    return output;
  }
}

// FamilyMemberInspectable
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
  ) { super(); }

  format(): string {
    const emoji = this.online ? '👤' : '⚪';
    let output = `${emoji} Family Member ${this.name} (${this.role})\n`;
    output += '──────────────────────────────────────────────────\n';
    output += `ID: ${this.id}\n`;
    output += `Online: ${this.online ? 'Yes' : 'No'}\n`;
    output += `Owed: ${this.owed}\n`;
    output += `Paid: ${this.paid}\n`;
    output += `Trust: ${InspectionUtils.progressBar(this.trustScore)}\n`;
    if (this.limit) output += `Limit: ${this.limit}\n`;
    return output;
  }
}

// Global Setup Functions
export function setupGlobalInspection() {
  if (!globalConfig.enabled) return;
  // Override console.log to handle inspectables
  const originalLog = console.log;
  console.log = (...args: any[]) => {
    const formatted = args.map(arg => arg[INSPECT_CUSTOM] ? arg[INSPECT_CUSTOM]() : arg);
    originalLog(...formatted);
  };
}

export function setupInspectionIfEnabled() {
  if (process.env.FACTORY_WAGER_INSPECTION_ENABLED === 'true') {
    setupGlobalInspection();
    return true;
  }
  return false;
}

export function configureInspection(config: Partial<InspectionConfig>) {
  globalConfig = { ...globalConfig, ...config };
}

// Export all classes for compatibility
export {
  Inspectable as default,
  ScopeInspectable as Scope,
  ConnectionStatsInspectable as ConnectionStats,
  SecurityCheckInspectable as SecurityCheck,
  DatabaseConnectionInspectable as DatabaseConnection,
  PaymentRequestInspectable as PaymentRequest,
  FamilyMemberInspectable as FamilyMember
};
