import type { FileSink } from 'bun';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

let fileSink: FileSink | null = null;
let filePath: string | null = null;

export function enableFileLog(path: string): void {
  filePath = path;
  fileSink = Bun.file(path).writer({ highWaterMark: 1024 * 64 });
}

export function disableFileLog(): void {
  if (fileSink) {
    fileSink.flush();
    fileSink.end();
    fileSink = null;
    filePath = null;
  }
}

export function getLogFilePath(): string | null {
  return filePath;
}

export function getLogFileInfo(): { path: string; size: number; type: string } | null {
  if (!filePath) return null;
  const f = Bun.file(filePath);
  return { path: filePath, size: f.size, type: f.type };
}

export function log(level: LogLevel, msg: string, context?: Record<string, unknown>): void {
  const line = JSON.stringify({ level, msg, ts: Date.now(), ...context });
  console.log(line);
  if (fileSink) {
    fileSink.write(line + '\n');
  }
}

export const logger = {
  debug: (msg: string, context?: Record<string, unknown>) => log('debug', msg, context),
  info: (msg: string, context?: Record<string, unknown>) => log('info', msg, context),
  warn: (msg: string, context?: Record<string, unknown>) => log('warn', msg, context),
  error: (msg: string, context?: Record<string, unknown>) => log('error', msg, context),
};
