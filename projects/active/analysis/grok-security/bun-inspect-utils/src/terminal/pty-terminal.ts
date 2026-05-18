// [81.0.0.0] PTY TERMINAL - Bun.Terminal PTY API Implementation
// Wrapper for Bun v1.3.5+ native PTY support
// Platform: POSIX only (Linux, macOS)

import type {
  TerminalOptions,
  TerminalDimensions,
  BunTerminalInstance,
  TerminalProcess,
  TerminalSession,
  TerminalManagerConfig,
  TerminalEvent,
  TerminalDataHandler,
} from "./types";
import { DEFAULT_TERMINAL_CONFIG } from "./types";

/**
 * [81.1.0.0] Check if PTY is supported on current platform
 */
export function isPtySupported(): boolean {
  return process.platform !== "win32";
}

/**
 * [81.2.0.0] Create a reusable terminal instance
 * Uses Bun.Terminal for PTY support
 *
 * @example
 * ```typescript
 * await using terminal = createTerminal({
 *   cols: 80,
 *   rows: 24,
 *   data(term, data) {
 *     process.stdout.write(data);
 *   }
 * });
 * ```
 */
export function createTerminal(options: TerminalOptions): BunTerminalInstance {
  if (!isPtySupported()) {
    throw new Error(
      "PTY support is only available on POSIX systems (Linux, macOS)"
    );
  }

  // @ts-expect-error - Bun.Terminal is a runtime API
  return new Bun.Terminal(options);
}

/**
 * [81.3.0.0] Spawn a process with inline PTY terminal
 *
 * @example
 * ```typescript
 * const proc = spawnWithTerminal(["bash"], {
 *   cols: 80,
 *   rows: 24,
 *   data(terminal, data) {
 *     process.stdout.write(data);
 *   }
 * });
 *
 * await proc.exited;
 * proc.terminal?.close();
 * ```
 */
export function spawnWithTerminal(
  command: string[],
  terminalOptions: TerminalOptions,
  spawnOptions: {
    cwd?: string;
    env?: Record<string, string>;
  } = {}
): TerminalProcess {
  if (!isPtySupported()) {
    throw new Error(
      "PTY support is only available on POSIX systems (Linux, macOS)"
    );
  }

  const proc = Bun.spawn(command, {
    terminal: {
      cols: terminalOptions.cols,
      rows: terminalOptions.rows,
      data: terminalOptions.data,
    },
    cwd: spawnOptions.cwd,
    env: spawnOptions.env,
  });

  return proc as TerminalProcess;
}

/**
 * [81.4.0.0] Spawn a process with a reusable terminal
 *
 * @example
 * ```typescript
 * await using terminal = createTerminal({ cols: 80, rows: 24, data: handler });
 *
 * const proc1 = spawnWithReusableTerminal(["echo", "first"], terminal);
 * await proc1.exited;
 *
 * const proc2 = spawnWithReusableTerminal(["echo", "second"], terminal);
 * await proc2.exited;
 * ```
 */
export function spawnWithReusableTerminal(
  command: string[],
  terminal: BunTerminalInstance,
  options: { cwd?: string; env?: Record<string, string> } = {}
): TerminalProcess {
  const proc = Bun.spawn(command, {
    terminal,
    cwd: options.cwd,
    env: options.env,
  });

  return proc as TerminalProcess;
}

/**
 * [81.5.0.0] Run an interactive program (vim, htop, etc.)
 *
 * @example
 * ```typescript
 * await runInteractiveProgram(["vim", "file.txt"]);
 * ```
 */
export async function runInteractiveProgram(
  command: string[],
  options: Partial<TerminalDimensions> = {}
): Promise<number> {
  if (!isPtySupported()) {
    throw new Error(
      "PTY support is only available on POSIX systems (Linux, macOS)"
    );
  }

  const cols = options.cols ?? process.stdout.columns ?? 80;
  const rows = options.rows ?? process.stdout.rows ?? 24;

  const proc = Bun.spawn(command, {
    terminal: {
      cols,
      rows,
      data(_term: BunTerminalInstance, data: Uint8Array) {
        process.stdout.write(data);
      },
    },
  });

  // Handle terminal resize
  const resizeHandler = () => {
    proc.terminal?.resize(
      process.stdout.columns ?? 80,
      process.stdout.rows ?? 24
    );
  };
  process.stdout.on("resize", resizeHandler);

  // Forward stdin to terminal
  process.stdin.setRawMode?.(true);

  const stdinReader = async () => {
    for await (const chunk of process.stdin) {
      proc.terminal?.write(chunk);
    }
  };
  stdinReader().catch(() => {});

  const exitCode = await proc.exited;
  proc.terminal?.close();
  process.stdout.off("resize", resizeHandler);
  process.stdin.setRawMode?.(false);

  return exitCode;
}

