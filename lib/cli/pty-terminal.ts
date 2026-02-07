// lib/cli/pty-terminal.ts — PTY terminal support for interactive applications

/**
 * Check if PTY is supported on current platform
 * Note: Windows is not yet supported
 */
export function isPtySupported(): boolean {
  return process.platform !== 'win32';
}

/**
 * Terminal dimensions interface
 */
export interface TerminalDimensions {
  cols: number;
  rows: number;
}

/**
 * Terminal options for creating a new Bun.Terminal
 */
export interface TerminalOptions extends TerminalDimensions {
  /** Called when data is received from the terminal */
  data(terminal: BunTerminalInstance, data: Uint8Array): void;
  /** Called when the terminal closes */
  exit?(terminal: BunTerminalInstance, exitCode: number): void;
  /** Called when terminal buffer drains */
  drain?(terminal: BunTerminalInstance): void;
  /** TERM environment variable (default: "xterm-256color") */
  name?: string;
  /** Environment variables for terminal */
  env?: Record<string, string>;
}

/**
 * Bun Terminal instance interface
 * Matches Bun's native Terminal API
 */
export interface BunTerminalInstance {
  /** Write data to the terminal */
  write(data: string | Uint8Array): void;
  /** Resize the terminal */
  resize(cols: number, rows: number): void;
  /** Set raw mode (disable line buffering and echo) */
  setRawMode(raw: boolean): void;
  /** Keep event loop alive while terminal is open */
  ref(): void;
  /** Allow event loop to exit even if terminal is open */
  unref(): void;
  /** Close the terminal */
  close(): void;
  /** Promise that resolves when terminal closes */
  readonly closed: Promise<void>;
  /** Writable stream interface */
  readonly writable: WritableStream<Uint8Array>;
}

/**
 * Process with attached terminal
 */
export interface TerminalProcess {
  readonly pid: number;
  readonly exited: Promise<number>;
  readonly terminal: BunTerminalInstance;
  kill(signal?: string): void;
}

/**
 * Create a reusable terminal instance
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
 *
 * // Reuse across multiple spawns
 * const proc1 = Bun.spawn(["echo", "first"], { terminal });
 * await proc1.exited;
 *
 * const proc2 = Bun.spawn(["echo", "second"], { terminal });
 * await proc2.exited;
 * ```
 */
export function createTerminal(options: TerminalOptions): BunTerminalInstance {
  if (!isPtySupported()) {
    throw new Error('PTY support is only available on POSIX systems (Linux, macOS)');
  }

  // @ts-expect-error - Bun.Terminal is a runtime API (Bun v1.3.5+)
  return new Bun.Terminal(options);
}

/**
 * Spawn a process with inline PTY terminal
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
 * proc.terminal.close();
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
    throw new Error('PTY support is only available on POSIX systems (Linux, macOS)');
  }

  const proc = Bun.spawn(command, {
    terminal: {
      cols: terminalOptions.cols,
      rows: terminalOptions.rows,
      data: terminalOptions.data,
      exit: terminalOptions.exit,
      drain: terminalOptions.drain,
    },
    cwd: spawnOptions.cwd,
    env: spawnOptions.env,
  });

  return proc as TerminalProcess;
}

/**
 * Spawn a process with a reusable terminal
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
 * Run an interactive program (vim, htop, etc.)
 * Handles terminal resize and stdin forwarding automatically
 *
 * @example
 * ```typescript
 * await runInteractiveProgram(["vim", "file.txt"]);
 * await runInteractiveProgram(["htop"]);
 * ```
 */
export async function runInteractiveProgram(
  command: string[],
  options: Partial<TerminalDimensions> = {}
): Promise<number> {
  if (!isPtySupported()) {
    throw new Error('PTY support is only available on POSIX systems (Linux, macOS)');
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
    proc.terminal?.resize(process.stdout.columns ?? 80, process.stdout.rows ?? 24);
  };
  process.stdout.on('resize', resizeHandler);

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
  process.stdout.off('resize', resizeHandler);
  process.stdin.setRawMode?.(false);

  return exitCode;
}

/**
 * Execute shell commands with PTY support
 * Useful for running command sequences in a proper shell
 *
 * @example
 * ```typescript
 * await runShellSession([
 *   "echo Hello from PTY!",
 *   "pwd",
 *   "exit"
 * ]);
 * ```
 */
export async function runShellSession(
  commands: string[],
  options: Partial<TerminalDimensions> = {}
): Promise<number> {
  if (!isPtySupported()) {
    throw new Error('PTY support is only available on POSIX systems (Linux, macOS)');
  }

  const cols = options.cols ?? 80;
  const rows = options.rows ?? 24;
  const shell = process.env.SHELL || '/bin/bash';

  const commandsQueue = [...commands];

  const proc = Bun.spawn([shell], {
    terminal: {
      cols,
      rows,
      data(terminal: BunTerminalInstance, data: Uint8Array) {
        const text = new TextDecoder().decode(data);
        process.stdout.write(data);

        // Auto-execute commands when prompt appears
        if (text.includes('$') || text.includes('#') || text.includes('>')) {
          const cmd = commandsQueue.shift();
          if (cmd) {
            setTimeout(() => terminal.write(cmd + '\n'), 50);
          }
        }
      },
    },
  });

  return await proc.exited;
}

// Default terminal configuration
export const DEFAULT_TERMINAL_CONFIG: TerminalDimensions = {
  cols: 80,
  rows: 24,
};

// Entry guard for CLI usage
if (import.meta.main) {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  Bun.Terminal PTY Tool v4.5                               ║
║  Bun v${Bun.version} - ${process.platform}                                    ║
╚═══════════════════════════════════════════════════════════╝

PTY Support: ${isPtySupported() ? '✅ Available' : '❌ Not available (Windows)'}

Usage:
  bun lib/pty-terminal.ts [command]

Examples:
  bun lib/pty-terminal.ts bash     # Interactive bash shell
  bun lib/pty-terminal.ts vim      # Run vim editor
  bun lib/pty-terminal.ts htop     # System monitor
`);

  if (!isPtySupported()) {
    console.error('PTY is not supported on Windows. Please use WSL or a Linux VM.');
    process.exit(1);
  }

  const command = process.argv.slice(2);
  if (command.length === 0) {
    console.log('No command specified, starting bash shell...');
    runInteractiveProgram(['bash']).then(code => process.exit(code));
  } else {
    runInteractiveProgram(command).then(code => process.exit(code));
  }
}
