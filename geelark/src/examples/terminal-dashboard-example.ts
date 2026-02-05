#!/usr/bin/env bun
/**
 * Geelark Monitoring Dashboard with Bun Terminal API
 *
 * This example demonstrates using Bun.Terminal for:
 * - Real-time monitoring dashboard
 * - Terminal resize handling
 * - Unicode-aware output (emoji, wide characters)
 * - Keyboard input handling
 * - Process spawning with PTY
 *
 * Run with: bun run examples/terminal-dashboard-example.ts
 */

import { Terminal, spawn } from "bun";
import { setInterval } from "node:timers";

// =============================================================================
// TERMINAL SETUP
// =============================================================================

/**
 * Create terminal instance with resize support
 */
const term = new Terminal({
  cols: process.stdout.columns || 80,
  rows: process.stdout.rows || 24,
  mode: "normal", // Canonical mode (line buffering)

  /**
   * Handle terminal resize events
   * Re-render dashboard when terminal is resized
   */
  resize(cols: number, rows: number) {
    renderDashboard(cols, rows);
  }
});

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

interface DashboardState {
  cpu: number;
  memory: number;
  uptime: number;
  requests: number;
  activeConnections: number;
  selectedRow: number;
  isRunning: boolean;
}

const state: DashboardState = {
  cpu: 0,
  memory: 0,
  uptime: 0,
  requests: 0,
  activeConnections: 0,
  selectedRow: 0,
  isRunning: true,
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Unicode-aware padding using Bun.stringWidth()
 * Properly handles emoji and wide characters
 */
function padWithWidth(str: string, totalWidth: number): string {
  const strWidth = Bun.stringWidth(str);
  const padding = Math.max(0, totalWidth - strWidth);
  return str + " ".repeat(padding);
}

/**
 * Render a metric row with proper Unicode alignment
 */
function renderMetricRow(
  emoji: string,
  label: string,
  value: string | number,
  cols: number
): void {
  const valueStr = String(value);
  const emojiWidth = Bun.stringWidth(emoji);
  const labelWidth = Bun.stringWidth(label);
  const valueWidth = Bun.stringWidth(valueStr);

  const innerWidth = cols - 4; // Account for box borders
  const padding = innerWidth - emojiWidth - labelWidth - valueWidth - 4; // -4 for spaces

  term.write(`║ ${emoji} ${label}:${" ".repeat(Math.max(0, padding))}${valueStr} ║\n`);
}

/**
 * Draw a horizontal separator line
 */
function drawSeparator(cols: number): void {
  term.write(`╠${"═".repeat(cols - 2)}╣\n`);
}

/**
 * Draw a box header
 */
function drawHeader(title: string, cols: number): void {
  const titleWidth = Bun.stringWidth(title);
  const padding = Math.max(0, cols - titleWidth - 4);

  term.write(`╔${"═".repeat(Math.floor(padding / 2))}${title}${"═".repeat(Math.ceil(padding / 2))}╗\n`);
}

// =============================================================================
// DASHBOARD RENDERING
// =============================================================================

/**
 * Render the complete dashboard
 */
function renderDashboard(cols: number, rows: number): void {
  // Clear screen and move cursor to top-left
  term.write("\x1b[2J\x1b[;H");

  // Update state
  state.uptime = Math.floor(process.uptime());
  const memUsage = process.memoryUsage();
  state.memory = (memUsage.heapUsed / 1024 / 1024);

  // Draw header
  drawHeader("📊 Geelark Monitoring Dashboard", cols);
  drawSeparator(cols);

  // Draw metrics
  renderMetricRow("⏱️", "Uptime", `${state.uptime}s`, cols);
  renderMetricRow("💾", "Memory Used", `${state.memory.toFixed(2)} MB`, cols);
  renderMetricRow("📊", "CPU Usage", `${state.cpu.toFixed(1)}%`, cols);
  renderMetricRow("🌐", "Requests", state.requests.toString(), cols);
  renderMetricRow("🔌", "Active Connections", state.activeConnections.toString(), cols);

  // Draw separator
  drawSeparator(cols);

  // Draw menu
  const menuItems = [
    "Refresh",
    "View Logs",
    "Health Check",
    "Export Data",
    "Quit",
  ];

  term.write(`║ ${" ".repeat(cols - 4)} ║\n`);
  menuItems.forEach((item, index) => {
    const prefix = index === state.selectedRow ? "►" : " ";
    const highlight = index === state.selectedRow ? "\x1b[1;37m" : ""; // Bold white
    const reset = "\x1b[0m";
    const padding = cols - Bun.stringWidth(item) - 10;

    term.write(`║ ${prefix} ${highlight}${item}${reset}${" ".repeat(Math.max(0, padding))}║\n`);
  });

  // Draw footer
  drawSeparator(cols);
  term.write(`║ ${padWithWidth("Press ↑↓ to navigate, Enter to select", cols - 4)} ║\n`);
  term.write(`╚${"═".repeat(cols - 2)}╝\n`);
}

// =============================================================================
// KEYBOARD INPUT HANDLING
// =============================================================================

/**
 * Set raw mode for immediate keypress handling
 */
term.setRawMode(true);

/**
 * Handle keyboard input
 */
const handleInput = (chunk: Uint8Array) => {
  const input = new TextDecoder().decode(chunk);

  switch (input) {
    case "\x1b[A": // Up arrow
      state.selectedRow = Math.max(0, state.selectedRow - 1);
      renderDashboard(term.cols, term.rows);
      break;

    case "\x1b[B": // Down arrow
      state.selectedRow = Math.min(4, state.selectedRow + 1);
      renderDashboard(term.cols, term.rows);
      break;

    case "\r": // Enter
    case "\n": // Enter (some terminals)
      handleMenuSelection();
      break;

    case "q": // Quit
    case "\x03": // Ctrl+C
      state.isRunning = false;
      term.write("\n👋 Goodbye!\n");
      process.exit(0);
      break;
  }
};

// Register input handler
// @ts-ignore - data callback is valid
term.data = handleInput;

/**
 * Handle menu selection
 */
function handleMenuSelection(): void {
  const actions = [
    "Refreshing dashboard...",
    "Viewing logs...",
    "Running health check...",
    "Exporting data...",
    "Exiting...",
  ];

  term.write(`\n✓ ${actions[state.selectedRow]}\n`);

  if (state.selectedRow === 4) {
    // Quit
    state.isRunning = false;
    process.exit(0);
  }

  // Simulate action
  setTimeout(() => {
    renderDashboard(term.cols, term.rows);
  }, 500);
}

// =============================================================================
// PROCESS SPAWNING WITH PTY
// =============================================================================

/**
 * Example: Spawn a process with PTY attached
 */
function spawnProcessWithPTY(command: string, args: string[]): void {
  // Create PTY for the process
  const procTerm = new Terminal({
    cols: 80,
    rows: 24,
    data(chunk) {
      // Forward output from process
      process.stdout.write(chunk);
    }
  });

  // Spawn process with PTY attached (12ns vs 144ns manual)
  const proc = spawn([command, ...args], {
    terminal: procTerm,
    env: {
      ...process.env,
      BUN_TERMINAL_MODE: "raw"
    }
  });

  // Wait for completion
  proc.exited.then(() => {
    term.write(`\n✓ Process completed with exit code: ${proc.exitCode}\n`);
  });
}

// =============================================================================
// METRICS UPDATE LOOP
// =============================================================================

/**
 * Update metrics periodically
 */
setInterval(() => {
  if (!state.isRunning) return;

  // Simulate CPU usage
  state.cpu = Math.random() * 100;

  // Simulate request count
  state.requests += Math.floor(Math.random() * 10);

  // Simulate active connections
  state.activeConnections = Math.floor(Math.random() * 50) + 10;

  // Re-render dashboard
  renderDashboard(term.cols, term.rows);
}, 1000);

// =============================================================================
// STARTUP
// =============================================================================

console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║  📊 Geelark Monitoring Dashboard with Bun Terminal API                    ║
║                                                                           ║
║  Features:                                                                ║
║  ✅ Real-time metrics (CPU, Memory, Requests)                            ║
║  ✅ Terminal resize support                                              ║
║  ✅ Unicode-aware output (emoji, wide characters)                         ║
║  ✅ Keyboard navigation (↑↓ arrows, Enter)                               ║
║  ✅ PTY process spawning                                                 ║
║                                                                           ║
║  Press 'q' to quit                                                        ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
`);

// Initial render
setTimeout(() => {
  renderDashboard(term.cols, term.rows);
}, 1000);

// Example: Spawn a process with PTY (commented out)
// spawnProcessWithPTY("ls", ["-la", "/Users/nolarose/geelark"]);

console.log("\n✓ Dashboard started. Use arrow keys to navigate, Enter to select, 'q' to quit.\n");
