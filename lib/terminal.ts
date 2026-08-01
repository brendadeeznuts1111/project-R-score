// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
/**
 * Bun.Terminal (PTY) helpers — spawn interactive TTY children and capture output.
 *
 * Prefer this over ad-hoc `terminal:` option literals so docs anchors stay annotated.
 * Host TTY detection is NOT this API — use process.stdout.isTTY / lib/console-depth.ts.
 *
 * North-star planes (all Bun-owned):
 *   guide → bun.com/docs/runtime/child-process#terminal-pty-support
 *   reference → bun.com/reference/bun/Terminal (+ TerminalOptions)
 *   types → github.com/oven-sh/bun/tree/main/packages/bun-types
 *
 * @see https://bun.com/docs/runtime/child-process#terminal-pty-support — Bun.Terminal
 * @see https://bun.com/docs/runtime/child-process#terminal-options — spawn terminal options
 * @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
 * @see https://bun.com/reference/bun/Terminal — API reference (from bun-types)
 * @see https://bun.com/reference/bun/TerminalOptions — TerminalOptions
 * @see https://github.com/oven-sh/bun/tree/main/packages/bun-types — bun-types source
 * @see https://bun.com/blog/bun-v1.3.5#bun-terminal-api-for-pseudo-terminal-pty-support
 */

import { bunDocs, bunReference } from './docs/bun-site-url.ts';
import { BUN_TYPES_SOURCE_URL } from './docs/bun-source-links.ts';

/** Canonical docs locus for PTY support (child-process guide). */
export const BUN_TERMINAL_PTY_DOCS = bunDocs('runtime/child-process', 'terminal-pty-support');

/** Terminal options subsection on the same guide page. */
export const BUN_TERMINAL_OPTIONS_DOCS = bunDocs('runtime/child-process', 'terminal-options');

/** Types-generated API reference for `Bun.Terminal`. */
export const BUN_TERMINAL_REFERENCE = bunReference('bun/Terminal');

/** Types-generated API reference for `TerminalOptions`. */
export const BUN_TERMINAL_OPTIONS_REFERENCE = bunReference('bun/TerminalOptions');

/** Upstream bun-types package tree (declarations + embedded child-process MDX). */
export const BUN_TERMINAL_TYPES_SOURCE = BUN_TYPES_SOURCE_URL;

export const DEFAULT_TERMINAL_COLS = 80;
export const DEFAULT_TERMINAL_ROWS = 24;
export const DEFAULT_TERMINAL_NAME = 'xterm-256color';

export type BunTerminal = InstanceType<typeof Bun.Terminal>;
export type BunTerminalOptions = Bun.TerminalOptions;

export type TerminalSize = {
  cols?: number;
  rows?: number;
  name?: string;
};

export type CreateTerminalOptions = TerminalSize & {
  /** Extra data callback (runs after chunks are recorded when capturing). */
  onData?: (data: Uint8Array<ArrayBuffer>) => void;
  onExit?: (exitCode: number, signal: string | null) => void;
  onDrain?: () => void;
};

export type CapturingTerminal = {
  terminal: BunTerminal;
  chunks: Uint8Array<ArrayBuffer>[];
  /** UTF-8 decode of all captured chunks so far. */
  text: () => string;
};

const decoder = new TextDecoder();

/**
 * Build `TerminalOptions` with project defaults (cols/rows/name).
 */
export function terminalOptions(options: CreateTerminalOptions = {}): BunTerminalOptions {
  const { cols, rows, name, onData, onExit, onDrain } = options;
  return {
    cols: cols ?? DEFAULT_TERMINAL_COLS,
    rows: rows ?? DEFAULT_TERMINAL_ROWS,
    name: name ?? DEFAULT_TERMINAL_NAME,
    data: onData
      ? (_term, data) => {
          onData(data);
        }
      : undefined,
    exit: onExit
      ? (_term, exitCode, signal) => {
          onExit(exitCode, signal);
        }
      : undefined,
    drain: onDrain
      ? () => {
          onDrain();
        }
      : undefined,
  };
}

/**
 * Create a reusable {@link Bun.Terminal} that records every `data` callback chunk.
 * Caller owns lifetime (`await using` / `terminal.close()`).
 */
export function createCapturingTerminal(options: CreateTerminalOptions = {}): CapturingTerminal {
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  const { onData, ...rest } = options;
  const terminal = new Bun.Terminal(
    terminalOptions({
      ...rest,
      onData: data => {
        chunks.push(data);
        onData?.(data);
      },
    })
  );
  return {
    terminal,
    chunks,
    text: () => decoder.decode(Buffer.concat(chunks)),
  };
}

export type SpawnWithTerminalResult = {
  exitCode: number;
  output: string;
  chunks: Uint8Array<ArrayBuffer>[];
  pid: number;
};

export type SpawnWithTerminalOptions = CreateTerminalOptions & {
  cmd: string[];
  cwd?: string;
  env?: Record<string, string | undefined>;
};

/**
 * Spawn `cmd` attached to a fresh PTY, wait for exit, return captured output.
 * Terminal is closed after the subprocess exits.
 */
export async function spawnWithTerminal(
  options: SpawnWithTerminalOptions
): Promise<SpawnWithTerminalResult> {
  const { cmd, cwd, env, ...termOpts } = options;
  if (!cmd.length) {
    throw new Error('spawnWithTerminal: cmd must be a non-empty argv');
  }

  const capture = createCapturingTerminal(termOpts);
  try {
    const proc = Bun.spawn({
      cmd,
      cwd,
      env,
      terminal: capture.terminal,
    });
    const exitCode = await proc.exited;
    // `proc.exited` can resolve before the PTY's final data callback under parallel load.
    // Yield once more before reading the capture so buffered terminal output can drain.
    await Bun.sleep(10);
    return {
      exitCode,
      output: capture.text(),
      chunks: capture.chunks,
      pid: proc.pid,
    };
  } finally {
    if (!capture.terminal.closed) capture.terminal.close();
  }
}
