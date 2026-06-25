// Shared logger — minimal core logger for cross-module use

export const coreLogger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
  debug: (...args: unknown[]) => {
    if (process.env.DEBUG) console.debug(...args);
  },
};
