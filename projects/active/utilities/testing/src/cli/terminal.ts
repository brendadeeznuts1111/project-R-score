#!/usr/bin/env bun
/**
 * Dev HQ Terminal - Interactive PTY CLI
 * bun run terminal (interactive shell)
 */

import { inspect } from "bun";

interface TerminalConfig {
  cols?: number;
  rows?: number;
  data?: (terminal: Bun.Terminal, data: Uint8Array) => void;
}

// Interactive Dev HQ Terminal
export async function createDevHQTerminal(config: TerminalConfig = {}) {
  // Use await using for automatic resource cleanup
  await using terminal = new Bun.Terminal({
    cols: config.cols || process.stdout.columns || 80,
    rows: config.rows || process.stdout.rows || 24,
    data(term, data) {
      // Direct write to stdout for performance
      process.stdout.write(data);
    }
  });

  return terminal;
}

// Interactive Insights with PTY
export async function insightsPTY() {
  await using terminal = new Bun.Terminal({
    cols: process.stdout.columns || 80,
    rows: process.stdout.rows || 24,
    data(term, data) {
      process.stdout.write(new TextDecoder().decode(data));
    }
  });

  // Run insights in PTY
  const proc = Bun.spawn(["bun", "--smol", "./dev-hq-cli.ts", "insights", "--table"], {
    terminal
  });

  await proc.exited;
  return proc.exitCode;
}

// Interactive Serve with PTY (live logs)
export async function servePTY(port: number = 0) {
  await using terminal = new Bun.Terminal({
    cols: process.stdout.columns || 80,
    rows: process.stdout.rows || 24,
    data(term, data) {
      process.stdout.write(new TextDecoder().decode(data));
    }
  });

  const proc = Bun.spawn([
    "bun", "--hot", "./api/server.ts", `--port=${port}`
  ], { terminal });

  // Handle resize
  process.stdout.on("resize", () => {
    terminal.resize(process.stdout.columns, process.stdout.rows);
  });

  // Forward stdin
  process.stdin.setRawMode(true);
  for await (const chunk of process.stdin) {
    terminal.write(chunk);
  }

  await proc.exited;
  return proc.exitCode;
}

// Interactive File Editor (vim-like)
export async function editorPTY(file: string) {
  await using terminal = new Bun.Terminal({
    cols: process.stdout.columns || 80,
    rows: process.stdout.rows || 24,
    data(term, data) {
      process.stdout.write(new TextDecoder().decode(data));
    }
  });

  const proc = Bun.spawn(["vim", file], { terminal });

  // Resize handling
  process.stdout.on("resize", () => {
    terminal.resize(process.stdout.columns, process.stdout.rows);
  });

  // Forward input
  process.stdin.setRawMode(true);
  for await (const chunk of process.stdin) {
    terminal.write(chunk);
  }

  await proc.exited;
  return proc.exitCode;
}

// Htop-like Process Monitor
export async function monitorPTY() {
  await using terminal = new Bun.Terminal({
    cols: process.stdout.columns || 80,
    rows: process.stdout.rows || 24,
    data(term, data) {
      process.stdout.write(new TextDecoder().decode(data));
    }
  });

  const proc = Bun.spawn(["htop"], { terminal });

  // Resize handling
  process.stdout.on("resize", () => {
    terminal.resize(process.stdout.columns, process.stdout.rows);
  });

  // Forward input
  process.stdin.setRawMode(true);
  for await (const chunk of process.stdin) {
    terminal.write(chunk);
  }

  await proc.exited;
  return proc.exitCode;
}
