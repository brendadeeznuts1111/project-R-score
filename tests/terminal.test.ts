// @see https://bun.com/docs/runtime/child-process#terminal-pty-support — Bun.Terminal
// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  BUN_TERMINAL_OPTIONS_DOCS,
  BUN_TERMINAL_PTY_DOCS,
  DEFAULT_TERMINAL_COLS,
  DEFAULT_TERMINAL_ROWS,
  createCapturingTerminal,
  spawnWithTerminal,
  terminalOptions,
} from '../lib/terminal.ts';

describe('lib/terminal', () => {
  test('canonical docs URLs point at child-process PTY anchors', () => {
    expect(BUN_TERMINAL_PTY_DOCS).toBe(
      'https://bun.com/docs/runtime/child-process#terminal-pty-support',
    );
    expect(BUN_TERMINAL_OPTIONS_DOCS).toBe(
      'https://bun.com/docs/runtime/child-process#terminal-options',
    );
  });

  test('terminalOptions applies defaults', () => {
    const opts = terminalOptions();
    expect(opts.cols).toBe(DEFAULT_TERMINAL_COLS);
    expect(opts.rows).toBe(DEFAULT_TERMINAL_ROWS);
    expect(opts.name).toBe('xterm-256color');
  });

  test('spawnWithTerminal captures echo output through a PTY', async () => {
    const result = await spawnWithTerminal({ cmd: ['echo', 'pty-ok'] });
    expect(result.exitCode).toBe(0);
    expect(result.pid).toBeGreaterThan(0);
    expect(result.chunks.length).toBeGreaterThan(0);
    // PTY line discipline often emits CR+LF
    expect(result.output.replace(/\r/g, '')).toContain('pty-ok');
  });

  test('createCapturingTerminal is reusable across spawns', async () => {
    const capture = createCapturingTerminal();
    await using _term = capture.terminal;

    const first = Bun.spawn(['echo', 'one'], { terminal: capture.terminal });
    await first.exited;
    const second = Bun.spawn(['echo', 'two'], { terminal: capture.terminal });
    await second.exited;

    const text = capture.text().replace(/\r/g, '');
    expect(text).toContain('one');
    expect(text).toContain('two');
  });

  test('spawnWithTerminal rejects empty cmd', async () => {
    expect(spawnWithTerminal({ cmd: [] })).rejects.toThrow(/non-empty argv/);
  });
});
