#!/usr/bin/env bun
/**
 * Terminal Tool - Interactive PTY terminal with project context
 * Uses Bun.Terminal API (v1.3.5+) for proper PTY support
 */

import { ensureDirectExecution } from "../shared/tools/entry-guard.ts";
ensureDirectExecution();

const projectName = Bun.main.split('/').pop()?.replace(/\.ts$/, '') || 'unknown';

console.log(`
╔═══════════════════════════════════════════════════════════╗
║  Project Terminal Tool Starting                          ║
║  Entrypoint: ${Bun.main}${' '.repeat(40 - Bun.main.length)}║
║  PTY Support: ${process.platform !== 'win32' ? '✅ Available' : '❌ Windows (use WSL)'}              ║
╚═══════════════════════════════════════════════════════════╝

Interactive PTY session. Type 'exit' to quit.
All output is logged with project context.
`);

if (process.platform === 'win32') {
  console.error('❌ PTY support requires POSIX system (Linux/macOS)');
  console.error('   Use WSL on Windows: https://docs.microsoft.com/windows/wsl/');
  process.exit(1);
}

// Spawn shell with inline terminal (Bun v1.3.5+ API)
const shell = process.env.SHELL || '/bin/bash';
const proc = Bun.spawn([shell], {
  terminal: {
    cols: process.stdout.columns ?? 80,
    rows: process.stdout.rows ?? 24,
    data(terminal, data) {
      const text = new TextDecoder().decode(data);
      // Log PTY output with project context
      console.log(`[PTY:${projectName}] ${text}`);
    },
  },
});

// Handle terminal resize
process.stdout.on('resize', () => {
  proc.terminal?.resize(
    process.stdout.columns ?? 80,
    process.stdout.rows ?? 24
  );
});

// Forward stdin to terminal
process.stdin.setRawMode?.(true);
for await (const chunk of process.stdin) {
  proc.terminal?.write(chunk);
}

// Cleanup
await proc.exited;
proc.terminal?.close();
process.stdin.setRawMode?.(false);

console.log(`Terminal session ended for ${projectName}`);
Bun.exit(0);
