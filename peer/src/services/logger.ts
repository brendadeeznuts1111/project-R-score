type LogPayload = Record<string, unknown>;

export class AppLogger {
  info(message: string, payload?: LogPayload): void {
    console.info(`[peer-app] ${message}`, payload ?? "");
  }

  warn(message: string, payload?: LogPayload): void {
    console.warn(`[peer-app] ${message}`, payload ?? "");
  }

  error(message: string, payload?: LogPayload): void {
    console.error(`[peer-app] ${message}`, payload ?? "");
  }
}

export const logger = new AppLogger();
