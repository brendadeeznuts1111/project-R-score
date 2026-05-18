/**
 * packages/cli/utils/logger.ts
 * Enterprise-grade structured logging with Bun-native emoji/ANSI support
 * Formats API responses from system-status.ts endpoints for CLI display
 */

import { DesignSystem } from '../../terminal/src/design-system';
import { UnicodeTableFormatter } from '../../terminal/src/enhanced-unicode-formatter';

export enum LogLevel {
  Debug = 'DEBUG',
  Info = 'INFO',
  Warn = 'WARN',
  Error = 'ERROR'
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface LoggerConfig {
  level?: LogLevel;
  useColors?: boolean;
  useTimestamps?: boolean;
  outputPath?: string;
  structured?: boolean;
}

/**
 * Logger - Structured logging with Bun-native ANSI and emoji support
 * Complies with .clinerules emoji and ANSI support requirements
 */
export class Logger {
  private config: Required<LoggerConfig>;
  private logs: LogEntry[] = [];

  constructor(config: LoggerConfig = {}) {
    this.config = {
      level: config.level ?? LogLevel.Info,
      useColors: config.useColors ?? true,
      useTimestamps: config.useTimestamps ?? true,
      outputPath: config.outputPath ?? '',
      structured: config.structured ?? false
    };
  }

  /**
   * Log at DEBUG level
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.Debug, message, context);
  }

  /**
   * Log at INFO level
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.Info, message, context);
  }

  /**
   * Log at WARN level
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.Warn, message, context);
  }

  /**
   * Log at ERROR level
   */
  error(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.Error, message, context);
  }

  /**
   * Format and display a table with automatic ANSI-aware width calculation
   */
  table(rows: Record<string, unknown>[], title?: string): void {
    if (title) {
      this.info(title);
    }
    const formatted = UnicodeTableFormatter.generateTable(rows, { maxWidth: 100 });
    console.info(formatted);
  }

  /**
   * Format and display API response as CLI table
   * Consumes /api/v1/* endpoint responses from system-status.ts
   */
  formatApiResponse(endpoint: string, data: Record<string, unknown>): string {
    const lines: string[] = [];
    
    const titleMap: Record<string, string> = {
      '/api/v1/system-matrix': '📊 SYSTEM MATRIX',
      '/api/v1/health': '💚 SYSTEM HEALTH',
      '/api/v1/status': '⚡ SYSTEM STATUS',
      '/api/v1/domain': '🌐 DOMAIN CONFIG',
      '/api/v1/metrics': '📈 PERFORMANCE METRICS'
    };

    const title = titleMap[endpoint] || endpoint;
    lines.push(this.colorize(title, 'accent_blue'));

    // Recursively format nested objects
    const formatObject = (obj: Record<string, unknown>, indent = 0): string[] => {
      const result: string[] = [];
      const prefix = '  '.repeat(indent);

      Object.entries(obj).forEach(([key, value]) => {
        if (value === null || value === undefined) {
          result.push(`${prefix}${key}: ${this.colorize('N/A', 'muted')}`);
        } else if (typeof value === 'object' && !Array.isArray(value)) {
          result.push(`${prefix}${this.colorize(key, 'secondary')}:`);
          result.push(...formatObject(value as Record<string, unknown>, indent + 1));
        } else if (Array.isArray(value)) {
          result.push(`${prefix}${this.colorize(key, 'secondary')}: [${value.length} items]`);
        } else {
          result.push(`${prefix}${key}: ${String(value)}`);
        }
      });

      return result;
    };

    lines.push(...formatObject(data, 1));
    return lines.join('\n');
  }

  /**
   * Display system matrix from /api/v1/system-matrix response
   */
  displaySystemMatrix(matrix: Record<string, unknown>): void {
    const lines: string[] = [];
    
    lines.push(this.colorize('🏗️  EMPIRE PRO INFRASTRUCTURE MATRIX', 'accent_green'));
    lines.push(UnicodeTableFormatter.generateDivider(50));

    // Format infrastructure section
    if (matrix.infrastructure) {
      lines.push(this.colorize('\n📦 INFRASTRUCTURE', 'secondary'));
      const infra = matrix.infrastructure as Record<string, unknown>;
      Object.entries(infra).forEach(([key, value]) => {
        lines.push(`  ${key}: ${this.formatValue(value)}`);
      });
    }

    // Format performance section
    if (matrix.performance) {
      lines.push(this.colorize('\n⚡ PERFORMANCE', 'secondary'));
      const perf = matrix.performance as Record<string, unknown>;
      Object.entries(perf).forEach(([key, value]) => {
        lines.push(`  ${key}: ${this.formatValue(value)}`);
      });
    }

    // Format testing section
    if (matrix.testing) {
      lines.push(this.colorize('\n✅ TESTING', 'secondary'));
      const test = matrix.testing as Record<string, unknown>;
      Object.entries(test).forEach(([key, value]) => {
        lines.push(`  ${key}: ${this.formatValue(value)}`);
      });
    }

    console.info(lines.join('\n'));
    this.info('System matrix displayed');
  }

  /**
   * Display health status from /api/v1/health response
   */
  displayHealth(health: Record<string, unknown>): void {
    const lines: string[] = [];
    
    lines.push(this.colorize('💚 SYSTEM HEALTH CHECK', 'accent_green'));
    lines.push(UnicodeTableFormatter.generateDivider(50));

    const status = health.status as string || 'unknown';
    const statusIcon = status === 'healthy' ? '✅' : status === 'degraded' ? '⚠️' : '❌';
    
    lines.push(`${statusIcon} Status: ${this.colorize(status.toUpperCase(), this.getStatusColor(status))}`);

    if (health.memory) {
      const mem = health.memory as Record<string, unknown>;
      lines.push(`\n💾 Memory:`);
      lines.push(`  RSS: ${mem.rss || 'N/A'}`);
      lines.push(`  Heap: ${mem.heap || 'N/A'}`);
    }

    if (health.uptime) {
      lines.push(`\n⏱️  Uptime: ${health.uptime}`);
    }

    if (health.timestamp) {
      lines.push(`\n📅 Timestamp: ${health.timestamp}`);
    }

    console.info(lines.join('\n'));
    this.info('Health check displayed');
  }

  /**
   * Get color for status value
   */
  private getStatusColor(status: string): keyof typeof DesignSystem.status {
    switch (status.toLowerCase()) {
      case 'operational':
      case 'healthy':
        return 'operational';
      case 'degraded':
        return 'degraded';
      case 'downtime':
      case 'unhealthy':
        return 'downtime';
      default:
        return 'degraded';
    }
  }

  /**
   * Format arbitrary value for display
   */
  private formatValue(value: unknown): string {
    if (value === null || value === undefined) {
      return this.colorize('N/A', 'muted');
    }

    if (typeof value === 'boolean') {
      return value 
        ? this.colorize('✅ true', 'accent_green')
        : this.colorize('❌ false', 'accent_red');
    }

    if (typeof value === 'number') {
      return this.colorize(String(value), 'accent_blue');
    }

    if (typeof value === 'string') {
      return value;
    }

    return JSON.stringify(value);
  }

  /**
   * Apply ANSI color to text
   */
  private colorize(text: string, color: string): string {
    if (!this.config.useColors) {
      return text;
    }

    const colorMap: Record<string, string> = {
      'accent_blue': `\x1b[36m${text}\x1b[0m`,    // Cyan
      'accent_green': `\x1b[32m${text}\x1b[0m`,   // Green
      'accent_red': `\x1b[31m${text}\x1b[0m`,     // Red
      'secondary': `\x1b[90m${text}\x1b[0m`,      // Bright Black
      'muted': `\x1b[2m${text}\x1b[0m`            // Dim
    };

    return colorMap[color] || text;
  }

  /**
   * Core logging implementation
   */
  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    // Check log level filtering
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context
    };

    this.logs.push(entry);

    // Format and output
    const formatted = this.formatLogEntry(entry);
    console.info(formatted);

    // Optionally persist to file
    if (this.config.outputPath) {
      this.persistLog(entry);
    }
  }

  /**
   * Check if log should be output based on level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = Object.values(LogLevel);
    const currentIndex = levels.indexOf(this.config.level);
    const incomingIndex = levels.indexOf(level);
    return incomingIndex >= currentIndex;
  }

  /**
   * Format log entry for display
   */
  private formatLogEntry(entry: LogEntry): string {
    const parts: string[] = [];

    if (this.config.useTimestamps) {
      const time = entry.timestamp.toISOString().split('T')[1].split('.')[0];
      parts.push(this.colorize(`[${time}]`, 'muted'));
    }

    const levelIcon = this.getLevelIcon(entry.level);
    const levelColor = this.getLevelColor(entry.level);
    parts.push(this.colorize(`${levelIcon} ${entry.level}`, levelColor));

    parts.push(entry.message);

    if (entry.context && Object.keys(entry.context).length > 0 && this.config.structured) {
      parts.push(`\n  ${JSON.stringify(entry.context)}`);
    }

    return parts.join(' ');
  }

  /**
   * Get emoji icon for log level
   */
  private getLevelIcon(level: LogLevel): string {
    const icons: Record<LogLevel, string> = {
      [LogLevel.Debug]: '🔍',
      [LogLevel.Info]: 'ℹ️',
      [LogLevel.Warn]: '⚠️',
      [LogLevel.Error]: '❌'
    };
    return icons[level];
  }

  /**
   * Get color for log level
   */
  private getLevelColor(level: LogLevel): string {
    const colors: Record<LogLevel, string> = {
      [LogLevel.Debug]: 'muted',
      [LogLevel.Info]: 'accent_blue',
      [LogLevel.Warn]: 'accent_red',
      [LogLevel.Error]: 'accent_red'
    };
    return colors[level];
  }

  /**
   * Persist log entry to configured output path
   */
  private async persistLog(entry: LogEntry): Promise<void> {
    if (!this.config.outputPath) return;

    try {
      const logLine = JSON.stringify({
        ...entry,
        timestamp: entry.timestamp.toISOString()
      });

      // Use Bun.write per .clinerules (Bun native first)
      const file = Bun.file(this.config.outputPath);
      const existing = await file.text().catch(() => '');
      await Bun.write(this.config.outputPath, existing + logLine + '\n');
    } catch (error) {
      console.error('Failed to persist log:', error);
    }
  }

  /**
   * Get all logged entries (useful for testing/auditing)
   */
  getLogs(level?: LogLevel): LogEntry[] {
    if (!level) {
      return this.logs;
    }
    return this.logs.filter(l => l.level === level);
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
  }
}

/**
 * Global logger instance
 */
let globalLogger: Logger;

export function getGlobalLogger(): Logger {
  if (!globalLogger) {
    globalLogger = new Logger();
  }
  return globalLogger;
}

export function setGlobalLogger(logger: Logger): void {
  globalLogger = logger;
}

export function resetGlobalLogger(): void {
  globalLogger = new Logger();
}