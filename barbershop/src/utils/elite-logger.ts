#!/usr/bin/env bun
/**
 * BarberShop ELITE Logger
 * =======================
 * Structured logging with levels, rotation, and Bun-native features
 * 
 * Elite Features:
 * - Structured JSON logging
 * - Log levels (DEBUG, INFO, WARN, ERROR, FATAL)
 * - File rotation with compression
 * - Async batching
 * - Source map support
 */

import { nanoseconds, gzipSync } from 'bun';
import { mkdir, appendFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

// ═══════════════════════════════════════════════════════════════════════════════
// LOG LEVELS
// ═══════════════════════════════════════════════════════════════════════════════

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

const LOG_LEVELS: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4,
};

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  requestId?: string;
  source?: {
    file?: string;
    line?: number;
    column?: number;
  };
}

interface LoggerConfig {
  level: LogLevel;
  pretty?: boolean;
  output?: 'stdout' | 'file' | 'both';
  filePath?: string;
  maxFileSize?: number;      // Bytes before rotation
  maxFiles?: number;         // Number of rotated files to keep
  batchSize?: number;        // Async batch size
  batchTimeoutMs?: number;   // Flush timeout
}

const DEFAULT_CONFIG: LoggerConfig = {
  level: 'INFO',
  pretty: process.env.NODE_ENV === 'development',
  output: 'stdout',
  filePath: './logs/app.log',
  maxFileSize: 10 * 1024 * 1024,  // 10MB
  maxFiles: 5,
  batchSize: 100,
  batchTimeoutMs: 1000,
};

// ═══════════════════════════════════════════════════════════════════════════════
// ELITE LOGGER
// ═══════════════════════════════════════════════════════════════════════════════

export class EliteLogger {
  private config: LoggerConfig;
  private batch: LogEntry[] = [];
  private batchTimer: Timer | null = null;
  private currentFileSize = 0;
  private requestId: string | null = null;
  
  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.ensureLogDir();
  }
  
  private async ensureLogDir(): Promise<void> {
    if (this.config.filePath) {
      const dir = this.config.filePath.split('/').slice(0, -1).join('/');
      if (dir) {
        await mkdir(dir, { recursive: true });
      }
    }
  }
  
  /**
   * Set request ID for context
   */
  setRequestId(id: string): void {
    this.requestId = id;
  }
  
  /**
   * Check if level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.level];
  }
  
  /**
   * Create log entry
   */
  private createEntry(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      requestId: this.requestId || undefined,
    };
    
    if (error) {
      entry.error = {
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      };
    }
    
    // Capture source location (expensive, only for ERROR/FATAL)
    if (LOG_LEVELS[level] >= LOG_LEVELS['ERROR']) {
      const stack = new Error().stack;
      if (stack) {
        const lines = stack.split('\n');
        if (lines[3]) {
          const match = lines[3].match(/at .* \((.+):(\d+):(\d+)\)/);
          if (match) {
            entry.source = {
              file: match[1].split('/').pop(),
              line: parseInt(match[2]),
              column: parseInt(match[3]),
            };
          }
        }
      }
    }
    
    return entry;
  }
  
  /**
   * Format entry for output
   */
  private format(entry: LogEntry): string {
    if (this.config.pretty) {
      const color = this.getColor(entry.level);
      let output = `${color}[${entry.timestamp}] ${entry.level}:${this.resetColor()} ${entry.message}`;
      
      if (entry.requestId) {
        output += ` ${this.dimColor()}[${entry.requestId}]${this.resetColor()}`;
      }
      
      if (entry.context && Object.keys(entry.context).length > 0) {
        output += `\n  ${this.dimColor()}${JSON.stringify(entry.context)}${this.resetColor()}`;
      }
      
      if (entry.error) {
        output += `\n  ${this.redColor()}Error: ${entry.error.message}${this.resetColor()}`;
        if (entry.error.stack) {
          const stackLines = entry.error.stack.split('\n').slice(1, 4);
          output += '\n' + stackLines.map(l => `    ${this.dimColor()}${l.trim()}${this.resetColor()}`).join('\n');
        }
      }
      
      return output;
    }
    
    return JSON.stringify(entry);
  }
  
  private getColor(level: LogLevel): string {
    const colors: Record<LogLevel, string> = {
      DEBUG: '\x1b[36m',  // Cyan
      INFO: '\x1b[32m',   // Green
      WARN: '\x1b[33m',   // Yellow
      ERROR: '\x1b[31m',  // Red
      FATAL: '\x1b[35m',  // Magenta
    };
    return colors[level] || '';
  }
  
  private resetColor(): string { return '\x1b[0m'; }
  private dimColor(): string { return '\x1b[90m'; }
  private redColor(): string { return '\x1b[31m'; }
  
  /**
   * Write to output
   */
  private async write(entry: LogEntry): Promise<void> {
    const formatted = this.format(entry);
    
    if (this.config.output === 'stdout' || this.config.output === 'both') {
      console.log(formatted);
    }
    
    if (this.config.output === 'file' || this.config.output === 'both') {
      this.batch.push(entry);
      
      if (this.batch.length >= this.config.batchSize!) {
        await this.flush();
      } else if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => this.flush(), this.config.batchTimeoutMs);
      }
    }
  }
  
  /**
   * Flush batch to file
   */
  private async flush(): Promise<void> {
    if (this.batch.length === 0) return;
    
    const entries = this.batch.splice(0, this.batch.length);
    const lines = entries.map(e => JSON.stringify(e)).join('\n') + '\n';
    
    // Check rotation
    await this.checkRotation();
    
    // Write
    if (this.config.filePath) {
      await appendFile(this.config.filePath, lines);
      this.currentFileSize += Buffer.byteLength(lines);
    }
    
    // Clear timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }
  
  /**
   * Check if log rotation needed
   */
  private async checkRotation(): Promise<void> {
    if (this.currentFileSize < this.config.maxFileSize!) return;
    
    // Rotate files
    for (let i = this.config.maxFiles! - 1; i >= 1; i--) {
      const oldPath = `${this.config.filePath}.${i}.gz`;
      const newPath = `${this.config.filePath}.${i + 1}.gz`;
      
      try {
        const file = Bun.file(oldPath);
        if (await file.exists()) {
          await Bun.write(newPath, file);
        }
      } catch {}
    }
    
    // Compress current file
    try {
      const currentContent = await Bun.file(this.config.filePath!).text();
      const compressed = gzipSync(Buffer.from(currentContent));
      await Bun.write(`${this.config.filePath}.1.gz`, compressed);
      
      // Clear current file
      await Bun.write(this.config.filePath!, '');
      this.currentFileSize = 0;
    } catch (e) {
      console.error('Log rotation failed:', e);
    }
  }
  
  /**
   * Log methods
   */
  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('DEBUG')) {
      this.write(this.createEntry('DEBUG', message, context));
    }
  }
  
  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('INFO')) {
      this.write(this.createEntry('INFO', message, context));
    }
  }
  
  warn(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('WARN')) {
      this.write(this.createEntry('WARN', message, context));
    }
  }
  
  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    if (this.shouldLog('ERROR')) {
      this.write(this.createEntry('ERROR', message, context, error));
    }
  }
  
  fatal(message: string, error?: Error, context?: Record<string, unknown>): void {
    if (this.shouldLog('FATAL')) {
      this.write(this.createEntry('FATAL', message, context, error));
    }
  }
  
  /**
   * Close logger and flush
   */
  async close(): Promise<void> {
    await this.flush();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════════════════════

export const logger = new EliteLogger();

// ═══════════════════════════════════════════════════════════════════════════════
// DEMO
// ═══════════════════════════════════════════════════════════════════════════════

if (import.meta.main) {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  📝 ELITE LOGGER                                                 ║
╠══════════════════════════════════════════════════════════════════╣
║  Structured • Async Batching • File Rotation • Pretty/JSON       ║
╚══════════════════════════════════════════════════════════════════╝
`);
  
  const log = new EliteLogger({
    level: 'DEBUG',
    pretty: true,
    output: 'stdout',
  });
  
  log.setRequestId('req-123-abc');
  
  console.log('1. Different Log Levels:\n');
  
  log.debug('Debug message', { detail: 'verbose info' });
  log.info('User logged in', { userId: 'user-456', ip: '192.168.1.1' });
  log.warn('Cache miss', { key: 'barber:jb', durationMs: 50 });
  log.error('Database connection failed', new Error('ECONNREFUSED'), { retry: 3 });
  
  console.log('\n2. Child Logger with Context:\n');
  
  // Simulate child logger
  log.setRequestId('req-789-xyz');
  log.info('Processing payment', { amount: 45.50, barberId: 'barber_jb' });
  log.info('Payment completed', { transactionId: 'txn-abc-123' });
  
  console.log('\n3. Performance Timing:\n');
  
  const startNs = nanoseconds();
  for (let i = 0; i < 1000; i++) {
    log.debug('Loop iteration', { i });
  }
  const elapsedMs = Number(nanoseconds() - startNs) / 1e6;
  console.log(`   Logged 1000 messages in ${elapsedMs.toFixed(2)}ms`);
  
  console.log('\n✅ Logger demo complete!');
  console.log('\nUsage:');
  console.log('   logger.info("Message", { context });');
  console.log('   logger.error("Failed", error, { retry: 3 });');
  
  await log.close();
}

export default EliteLogger;
