/**
 * 🚀 SIMD-Accelerated Logger
 * High-performance logging with ANSI stripping using Bun's native SIMD support
 */

declare global {
  var ENABLE_SIMD_ANSI: boolean;
  var USE_FAST_LOGGING: boolean;
  var USER_AGENT: string;
  var TARGET_PLATFORM: string;
}

interface LogEntry {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  platform: string;
  userAgent: string;
}

export class SIMDLogger {
  private buffer: LogEntry[] = [];
  private maxBufferSize = 1000;

  /**
   * High-performance ANSI stripping using Bun's SIMD capabilities
   */
  private stripANSI(text: string): string {
    if (typeof globalThis.ENABLE_SIMD_ANSI !== 'undefined' && globalThis.ENABLE_SIMD_ANSI) {
      // Use Bun's native SIMD-accelerated ANSI stripping if available
      if (typeof Bun !== 'undefined' && Bun.stripANSI) {
        return Bun.stripANSI(text);
      }
    }

    // Fallback to regex-based stripping
    return text.replace(/\u001b\[[0-9;]*m/g, '');
  }

  /**
   * Fast logging with platform-specific optimization
   */
  log(level: 'debug' | 'info' | 'warn' | 'error', message: string, ...args: any[]): void {
    const processedMessage = this.stripANSI(message);
    const fullMessage =
      args.length > 0
        ? `${processedMessage} ${args.map(a => JSON.stringify(a)).join(' ')}`
        : processedMessage;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message: fullMessage,
      platform: globalThis.TARGET_PLATFORM || 'unknown',
      userAgent: globalThis.USER_AGENT || 'Fire22-Dashboard/3.0.9',
    };

    // Add to buffer for batch processing
    this.buffer.push(entry);

    if (this.buffer.length >= this.maxBufferSize) {
      this.flush();
    }

    // Immediate console output for important logs
    if (level === 'error' || level === 'warn') {
      this.consoleOutput(entry);
    }
  }

  /**
   * Optimized console output
   */
  private consoleOutput(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString();
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.platform}]`;

    switch (entry.level) {
      case 'error':
        console.error(`🔥 ${prefix}`, entry.message);
        break;
      case 'warn':
        console.warn(`⚠️  ${prefix}`, entry.message);
        break;
      case 'info':
        console.log(`ℹ️  ${prefix}`, entry.message);
        break;
      case 'debug':
        console.log(`🐛 ${prefix}`, entry.message);
        break;
    }
  }

  /**
   * Batch flush log entries
   */
  flush(): void {
    if (this.buffer.length === 0) return;

    // Process buffer in batches for performance
    const batch = this.buffer.splice(0, Math.min(100, this.buffer.length));

    batch.forEach(entry => {
      if (entry.level !== 'error' && entry.level !== 'warn') {
        this.consoleOutput(entry);
      }
    });
  }

  /**
   * Platform-specific performance metrics
   */
  logPerformanceMetrics(operation: string, duration: number, metadata?: any): void {
    const metrics = {
      operation,
      duration: `${duration}ms`,
      platform: globalThis.TARGET_PLATFORM || 'unknown',
      simdEnabled: globalThis.ENABLE_SIMD_ANSI || false,
      userAgent: globalThis.USER_AGENT || 'Fire22-Dashboard/3.0.9',
      ...metadata,
    };

    this.log('info', `🚀 Performance: ${operation}`, metrics);
  }

  /**
   * HTTP request logging with User-Agent
   */
  logHttpRequest(method: string, url: string, status: number, duration: number): void {
    const userAgent = globalThis.USER_AGENT || 'Fire22-Dashboard/3.0.9';

    this.log('info', `🌐 HTTP ${method} ${url} - ${status} (${duration}ms)`, {
      userAgent,
      platform: globalThis.TARGET_PLATFORM,
    });
  }

  // Convenience methods
  debug(message: string, ...args: any[]): void {
    this.log('debug', message, ...args);
  }
  info(message: string, ...args: any[]): void {
    this.log('info', message, ...args);
  }
  warn(message: string, ...args: any[]): void {
    this.log('warn', message, ...args);
  }
  error(message: string, ...args: any[]): void {
    this.log('error', message, ...args);
  }
}

// Global logger instance
export const logger = new SIMDLogger();

// Auto-flush on process exit
if (typeof process !== 'undefined') {
  process.on('exit', () => logger.flush());
  process.on('SIGINT', () => {
    logger.flush();
    process.exit(0);
  });
}
