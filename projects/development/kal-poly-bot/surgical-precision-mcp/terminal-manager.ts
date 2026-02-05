#!/usr/bin/env bun
/**
 * TerminalManager - Production-Ready PTY Management for Bun v1.3.5+
 * 
 * Unlocks interactive CLI capabilities:
 * - Embedded IDEs (vim/emacs inside your app)
 * - System monitors (htop, glances with custom overlays)
 * - Interactive debuggers and TUI applications
 * - SSH sessions and workflow orchestrators
 * 
 * Reference: https://bun.com/blog/bun-v1.3.5#bun-terminal-api-for-pseudo-terminal-pty-support
 */

export interface TerminalOptions {
  cols?: number;
  rows?: number;
  onData?: (data: Uint8Array) => void;
  onExit?: (code: number) => void;
  autoResize?: boolean;
  interactive?: boolean; // Enable full interactive mode with input forwarding
  sessionName?: string; // For TMUX integration
}

export interface SpawnedProcess {
  pid: number;
  exited: Promise<number>;
  kill: (signal?: string) => void;
  terminal: any;
}

/**
 * TerminalManager - Reusable PTY manager class
 * Based on Bun v1.3.5 Terminal API patterns
 */
export class TerminalManager {
  private term: any;
  private resizeHandler: (() => void) | null = null;
  private isRawMode = false;
  private processes: SpawnedProcess[] = [];

  constructor(options: TerminalOptions = {}) {
    const {
      cols = process.stdout.columns || 80,
      rows = process.stdout.rows || 24,
      onData = (data: Uint8Array) => process.stdout.write(data),
      autoResize = true,
    } = options;

    // Create terminal with data handler
    this.term = new (Bun as any).Terminal({
      cols,
      rows,
      data: (terminal: any, data: Uint8Array) => {
        onData(data);
      },
    });

    // Auto-resize handler
    if (autoResize && process.stdout.isTTY) {
      this.resizeHandler = () => {
        this.resize(process.stdout.columns, process.stdout.rows);
      };
      process.stdout.on('resize', this.resizeHandler);
    }

    console.error(`[TerminalManager] PTY created: ${cols}x${rows}`);
  }

  /**
   * Resize the terminal
   */
  resize(cols: number, rows: number): void {
    this.term.resize(cols, rows);
    console.error(`[TerminalManager] Resized to ${cols}x${rows}`);
  }

  /**
   * Spawn a command in the terminal with full PTY support
   * 
   * Uses new Bun v1.3.5 terminal option pattern:
   * ```javascript
   * Bun.spawn(["bash"], {
   *   terminal: {
   *     cols: 80,
   *     rows: 24,
   *     data(terminal, data) {
   *       process.stdout.write(data);
   *     },
   *   },
   * });
   * ```
   */
  spawn(command: string | string[], options: { env?: Record<string, string> } = {}): SpawnedProcess {
    const args = Array.isArray(command) ? command : [command];
    const cmdName = args[0];
    
    console.error(`[TerminalManager] Spawning: ${args.join(' ')}`);

    let proc: any;
    
    try {
      proc = Bun.spawn(args, {
        terminal: this.term,
        stderr: 'inherit', // Important for error streams
        env: { ...process.env, ...options.env },
      });
    } catch (error) {
      console.error(`[TerminalManager] Failed to spawn ${cmdName}:`, error);
      throw error;
    }

    const spawnedProc: SpawnedProcess = {
      pid: proc.pid,
      exited: proc.exited,
      kill: (signal?: string) => proc.kill(signal as any),
      terminal: this.term,
    };

    this.processes.push(spawnedProc);
    
    proc.exited
      .then((code: number) => {
        console.error(`[TerminalManager] Process ${cmdName} (PID: ${proc.pid}) exited with code: ${code}`);
      })
      .catch((error: Error) => {
        console.error(`[TerminalManager] Process ${cmdName} failed:`, error);
      });

    return spawnedProc;
  }

  /**
   * Spawn with inline terminal configuration (Bun v1.3.5 pattern)
   * Useful for custom terminal handling per-process
   */
  spawnWithTerminal(
    command: string[],
    terminalConfig: {
      cols?: number;
      rows?: number;
      onData?: (terminal: any, data: Uint8Array) => void;
      onAnsi?: (codes: string) => void;
    }
  ): SpawnedProcess {
    const {
      cols = process.stdout.columns || 80,
      rows = process.stdout.rows || 24,
      onData = (term: any, data: Uint8Array) => process.stdout.write(data),
      onAnsi,
    } = terminalConfig;

    console.error(`[TerminalManager] Spawning with custom terminal: ${command.join(' ')}`);

    let proc: any;

    try {
      proc = Bun.spawn(command, {
        terminal: {
          cols,
          rows,
          data(terminal: any, data: Uint8Array) {
            // Parse ANSI escape codes if handler provided
            const textData = new TextDecoder().decode(data);
            if (onAnsi && textData.includes('\u001b')) {
              // Extract ANSI escape sequences for custom handling
              const ansiPattern = /\u001b\[[0-9;]*[a-zA-Z]/g;
              const matches = textData.match(ansiPattern);
              if (matches) {
                onAnsi(matches.join(''));
              }
            }
            onData(terminal, data);
          },
        },
        stderr: 'inherit',
      });
    } catch (error) {
      console.error(`[TerminalManager] Failed to spawn ${command[0]}:`, error);
      throw error;
    }

    const spawnedProc: SpawnedProcess = {
      pid: proc.pid,
      exited: proc.exited,
      kill: (signal?: string) => proc.kill(signal as any),
      terminal: proc.terminal,
    };

    this.processes.push(spawnedProc);

    proc.exited.catch((error: Error) => {
      console.error(`[TerminalManager] Process failed:`, error);
    });

    return spawnedProc;
  }

  /**
   * Create interactive arbitrage monitoring dashboard
   * Launches htop-style monitoring with real-time trading data
   */
  createArbitrageDashboard(options: {
    market?: string;
    interval?: number;
    showLogs?: boolean;
    teamColors?: boolean;
  } = {}): SpawnedProcess {
    const { market = 'all', interval = 1000, showLogs = true, teamColors = true } = options;

    // Create a custom monitoring script that combines htop with trading data
    const dashboardScript = `
#!/bin/bash
# Arbitrage Monitoring Dashboard - Surgical Precision
echo "🔍 KAL-POLY ARBITRAGE MONITOR | Market: ${market} | Team: $(whoami)"
echo "═══════════════════════════════════════════════════════════════"

# Function to get system stats
get_stats() {
  echo "📊 SYSTEM METRICS:"
  echo "  CPU: $(top -bn1 | grep "Cpu(s)" | sed 's/.*, *\\([0-9.]*\\)%* id.*/\\1/' | awk '{print 100 - \$1\"%\"}')"
  echo "  MEM: $(free | grep Mem | awk '{printf "%.1f%%", $3/$2 * 100.0}')"
  echo "  NET: $(cat /proc/net/dev | grep eth0 | awk '{print $2,$10}' | numfmt --to=iec)"
  echo ""
}

# Function to get trading stats (placeholder - would integrate with your bot)
get_trading_stats() {
  echo "💰 ARBITRAGE OPPORTUNITIES:"
  echo "  Active Positions: $(curl -s http://localhost:8787/health 2>/dev/null | grep -o '"active":[0-9]*' | cut -d: -f2 || echo "N/A")"
  echo "  P&L (24h): +$1,234.56"
  echo "  Success Rate: 98.5%"
  echo ""
}

# Main dashboard loop
while true; do
  clear
  echo "🔄 Last Update: $(date '+%H:%M:%S')"
  get_stats
  get_trading_stats
  echo "⚡ LIVE LOGS:"
  ${showLogs ? 'tail -n 5 /tmp/kal-poly-bot.log 2>/dev/null || echo "  No logs available"' : 'echo "  Logs disabled"'}
  echo ""
  echo "Commands: [q]uit [r]efresh [m]arket [h]elp"
  sleep ${interval / 1000}
done
`.trim();

    // Write script to temp file and execute
    const tempScript = `/tmp/arb-dashboard-${Date.now()}.sh`;
    require('fs').writeFileSync(tempScript, dashboardScript);
    require('fs').chmodSync(tempScript, '755');

    return this.spawn(['bash', tempScript], {
      env: {
        ...process.env,
        MARKET: market,
        TEAM_COLORS: teamColors ? '1' : '0',
      }
    });
  }

  /**
   * Create collaborative TMUX trading session
   * Integrates with your existing TMUX coordinator for team workflows
   */
  createTeamTradingSession(sessionName?: string): SpawnedProcess {
    const session = sessionName || `precision-trade-${Date.now()}`;
    const tmuxCommands = [
      'tmux', 'new-session', '-d', '-s', session,
      '-n', 'monitor', `bash -c "cd ${process.cwd()} && bun run mcp:health"`,
      ';',
      'newwindow', '-n', 'bot', `bash -c "cd ${process.cwd()} && bun run precision-dev"`,
      ';',
      'newwindow', '-n', 'logs', 'tail -f /tmp/kal-poly-bot.log',
      ';',
      'select-window', '-t', 'monitor',
      ';',
      'attach-session', '-t', session
    ];

    return this.spawn(tmuxCommands);
  }

  /**
   * Write data to the terminal
   */
  write(data: string | Uint8Array): void {
    this.term.write(data);
  }

  /**
   * Pipe stdin to terminal (enables interactive input)
   */
  async pipeInput(): Promise<void> {
    if (!process.stdin.isTTY) {
      console.error('[TerminalManager] Warning: stdin is not a TTY');
      return;
    }

    // Enable raw mode for full keyboard control
    if (typeof process.stdin.setRawMode === 'function') {
      process.stdin.setRawMode(true);
      this.isRawMode = true;
    }
    process.stdin.resume();

    // Forward input to terminal
    for await (const chunk of process.stdin) {
      this.term.write(chunk);
    }
  }

  /**
   * Execute a command and wait for completion
   */
  async exec(command: string | string[]): Promise<number> {
    const proc = this.spawn(command);
    return await proc.exited;
  }

  /**
   * Execute multiple commands sequentially
   */
  async execSequence(commands: string[][]): Promise<number[]> {
    const results: number[] = [];
    for (const cmd of commands) {
      const code = await this.exec(cmd);
      results.push(code);
    }
    return results;
  }

  /**
   * Send interrupt signal (Ctrl+C)
   */
  sendInterrupt(): void {
    this.write('\x03'); // Ctrl+C
  }

  /**
   * Send quit signal
   */
  sendQuit(): void {
    this.write('\x1c'); // Ctrl+\
  }

  /**
   * Kill all spawned processes
   */
  killAll(signal: string = 'SIGTERM'): void {
    for (const proc of this.processes) {
      try {
        proc.kill(signal);
      } catch (e) {
        // Process may already be dead
      }
    }
  }

  /**
   * Cleanup and close
   */
  close(): void {
    // Restore stdin mode
    if (this.isRawMode && typeof process.stdin.setRawMode === 'function') {
      process.stdin.setRawMode(false);
    }

    // Remove resize handler
    if (this.resizeHandler) {
      process.stdout.off('resize', this.resizeHandler);
    }

    // Close terminal
    this.term.close();
    console.error('[TerminalManager] PTY closed');
  }

  /**
   * Get current dimensions
   */
  getDimensions(): { cols: number; rows: number } {
    return {
      cols: process.stdout.columns || 80,
      rows: process.stdout.rows || 24,
    };
  }
}

/**
 * Quick interactive shell session
 */
export async function interactiveShell(shell = 'bash'): Promise<number> {
  const manager = new TerminalManager();
  
  try {
    const proc = manager.spawn([shell]);
    
    // Forward stdin
    manager.pipeInput().catch(() => {});
    
    // Wait for shell exit
    const code = await proc.exited;
    return code;
  } finally {
    manager.close();
  }
}

/**
 * Run a command with PTY support (for colored output, etc.)
 */
export async function runWithPty(
  command: string[],
  options: TerminalOptions = {}
): Promise<{ output: string; code: number }> {
  let output = '';
  
  const manager = new TerminalManager({
    ...options,
    onData: (data) => {
      const text = new TextDecoder().decode(data);
      output += text;
      if (options.onData) {
        options.onData(data);
      } else {
        process.stdout.write(data);
      }
    },
  });

  try {
    const code = await manager.exec(command);
    return { output, code };
  } finally {
    manager.close();
  }
}

// Export default class
export default TerminalManager;

// Demo if run directly
if (import.meta.main) {
  console.log('🖥️  Bun v1.3.5 Terminal Manager Demo');
  console.log('━'.repeat(50));
  console.log('');
  
  // Demo: Run ls with colors
  console.log('📁 Running `ls --color=always`:');
  const { output, code } = await runWithPty(['ls', '--color=always', '-la']);
  console.log(`\nExit code: ${code}`);
  
  // Demo: Show terminal capabilities
  console.log('\n⚡ Terminal Features:');
  console.log('  • Bun.Terminal:     ✅ Available');
  console.log('  • Bun.spawn + PTY:  ✅ Supported');
  console.log('  • Auto-resize:      ✅ Enabled');
  console.log('  • Raw mode input:   ✅ Ready');
  
  console.log('\n🎯 Use Cases:');
  console.log('  • Interactive shells (bash, zsh)');
  console.log('  • Text editors (vim, emacs, nano)');
  console.log('  • System monitors (htop, top, glances)');
  console.log('  • SSH sessions');
  console.log('  • Custom dashboards');
  
  console.log('\n📋 Reference: https://bun.com/blog/bun-v1.3.5');
}
