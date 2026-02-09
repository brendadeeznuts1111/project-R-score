/**
 * Shared graceful shutdown handler for CLI scripts.
 *
 * Usage:
 *   const shutdown = createShutdown({ name: 'brand-bench-runner' });
 *   // In hot loops: if (shutdown.requested) break;
 *   // On exit:     shutdown.dispose();
 */

export type ShutdownState = {
  /** True once SIGINT or SIGTERM received. Check in hot loops to break early. */
  readonly requested: boolean;
  /** The signal that triggered shutdown, or null if none yet. */
  readonly signal: string | null;
  /** Register a cleanup function to run before exit. */
  onCleanup(fn: () => void | Promise<void>): void;
  /** Remove listeners. Call when done. */
  dispose(): void;
};

export type ShutdownOptions = {
  name: string;
  quiet?: boolean;
  /** Exit code when shutdown is triggered. Default: 130 (SIGINT convention). */
  exitCode?: number;
  /** If true, run cleanup and exit automatically on signal. Default: false (let caller decide). */
  autoExit?: boolean;
};

export function createShutdown(options: ShutdownOptions): ShutdownState {
  const { name, quiet = false, exitCode = 130, autoExit = false } = options;
  let requested = false;
  let caughtSignal: string | null = null;
  const cleanups: Array<() => void | Promise<void>> = [];

  async function runCleanups(): Promise<void> {
    for (const fn of cleanups) {
      try {
        await fn();
      } catch {}
    }
  }

  function handler(sig: string) {
    if (requested) {
      // Second signal — force exit immediately
      if (!quiet) console.error(`\n[${name}] forced exit (${sig})`);
      process.exit(exitCode);
    }
    requested = true;
    caughtSignal = sig;
    if (!quiet) {
      console.error(`\n[${name}] ${sig} received, shutting down gracefully...`);
    }
    if (autoExit) {
      runCleanups().finally(() => process.exit(exitCode));
    }
  }

  const onSigint = () => handler('SIGINT');
  const onSigterm = () => handler('SIGTERM');

  process.on('SIGINT', onSigint);
  process.on('SIGTERM', onSigterm);

  return {
    get requested() { return requested; },
    get signal() { return caughtSignal; },
    onCleanup(fn) { cleanups.push(fn); },
    dispose() {
      process.off('SIGINT', onSigint);
      process.off('SIGTERM', onSigterm);
    },
  };
}
