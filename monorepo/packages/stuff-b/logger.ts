export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export function log(level: LogLevel, msg: string, context?: Record<string, unknown>): void {
  console.log(JSON.stringify({ level, msg, ts: Date.now(), ...context }));
}

export const logger = {
  debug: (msg: string, context?: Record<string, unknown>) => log('debug', msg, context),
  info: (msg: string, context?: Record<string, unknown>) => log('info', msg, context),
  warn: (msg: string, context?: Record<string, unknown>) => log('warn', msg, context),
  error: (msg: string, context?: Record<string, unknown>) => log('error', msg, context),
};
