/**
 * Enhanced logging utilities for consistent, formatted console output
 */

export interface LogContext {
  component?: string;
  operation?: string;
  duration?: number;
  status?: 'success' | 'error' | 'warning' | 'info';
  metadata?: Record<string, any>;
}

export class Logger {
  private component: string;

  constructor(component: string) {
    this.component = component;
  }

  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
    const component = context?.component || this.component;
    const status = context?.status;

    let prefix = `[${timestamp}] ${level.toUpperCase()}`;

    if (component) {
      prefix += ` [${component}]`;
    }

    if (status) {
      const statusEmoji = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
      }[status] || '📝';
      prefix += ` ${statusEmoji}`;
    }

    if (context?.operation) {
      prefix += ` ${context.operation}:`;
    }

    return `${prefix} ${message}`;
  }

  info(message: string, context?: LogContext): void {
    console.log(this.formatMessage('info', message, { ...context, status: 'info' }));
  }

  success(message: string, context?: LogContext): void {
    console.log(this.formatMessage('success', message, { ...context, status: 'success' }));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', message, { ...context, status: 'warning' }));
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const errorMsg = error ? `${message}: ${error.message}` : message;
    console.error(this.formatMessage('error', errorMsg, { ...context, status: 'error' }));

    if (error?.stack && process.env.NODE_ENV === 'development') {
      console.error(error.stack);
    }
  }

  table(data: any[], headers?: string[]): void {
    if (data.length === 0) {
      this.info('No data to display');
      return;
    }

    if (headers) {
      console.table(data, headers);
    } else {
      console.table(data);
    }
  }

  metrics(label: string, value: string | number, unit?: string, context?: LogContext): void {
    const formattedValue = unit ? `${value} ${unit}` : String(value);
    this.info(`${label}: ${formattedValue}`, { ...context, operation: 'metrics' });
  }

  progress(current: number, total: number, operation: string, context?: LogContext): void {
    const percentage = Math.round((current / total) * 100);
    const progressBar = this.createProgressBar(current, total, 20);
    this.info(`${progressBar} ${percentage}% (${current}/${total}) ${operation}`, {
      ...context,
      operation: 'progress',
      metadata: { current, total, percentage }
    });
  }

  private createProgressBar(current: number, total: number, width: number): string {
    const filled = Math.round((current / total) * width);
    const empty = width - filled;
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
  }

  separator(title?: string): void {
    const width = 80;
    const separator = '='.repeat(width);

    if (title) {
      const titleLength = title.length + 4; // 2 spaces + 2 brackets
      const padding = Math.max(0, width - titleLength);
      const leftPad = Math.floor(padding / 2);
      const rightPad = padding - leftPad;

      console.log('='.repeat(leftPad) + ` [${title}] ` + '='.repeat(rightPad));
    } else {
      console.log(separator);
    }
  }

  header(title: string, subtitle?: string): void {
    this.separator();
    console.log(`📋 ${title}`);
    if (subtitle) {
      console.log(`   ${subtitle}`);
    }
    this.separator();
  }

  summary(stats: Record<string, any>, context?: LogContext): void {
    this.header('Summary', context?.operation);

    Object.entries(stats).forEach(([key, value]) => {
      if (typeof value === 'number') {
        this.metrics(key, value, undefined, context);
      } else {
        this.info(`${key}: ${value}`, context);
      }
    });

    this.separator();
  }
}

// Global logger instances for common components
export const createLogger = (component: string): Logger => new Logger(component);

// Pre-configured loggers for common use cases
export const scriptLogger = createLogger('script');
export const apiLogger = createLogger('api');
export const dbLogger = createLogger('database');
export const perfLogger = createLogger('performance');