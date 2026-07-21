export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

let logger: Logger | undefined;

export function setLogger(custom: Logger): void {
  logger = custom;
}

export function getLogger(): Logger {
  return (
    logger ?? {
      debug: () => {},
      info: (...args) => console.info(...args),
      warn: (...args) => console.warn(...args),
      error: (...args) => console.error(...args),
    }
  );
}
