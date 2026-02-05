// @bun/proxy/monitoring/logger.ts - Logger implementation
import type { LoggerConfiguration } from './index.js';

export class Logger {
  // @ts-ignore - unused in base class but needed for constructor signature
  constructor(private _configuration: LoggerConfiguration) {}

  debug(_message: string, _context?: any): void {
    // Placeholder implementation
  }

  info(_message: string, _context?: any): void {
    // Placeholder implementation
  }

  warn(_message: string, _context?: any): void {
    // Placeholder implementation
  }

  error(_message: string, _error?: Error, _context?: any): void {
    // Placeholder implementation
  }

  fatal(_message: string, _error?: Error, _context?: any): void {
    // Placeholder implementation
  }
}
