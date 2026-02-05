import { spawn } from 'bun';

// Bun.Terminal might not be in the types yet for some versions, using any for the terminal types
// as it was used in terminal-manager.ts

export type Rewriter = (data: string) => string;
export type Filter = (data: string) => boolean;

export interface RewritableTerminalOptions {
  cols?: number;
  rows?: number;
  onData?: (data: string) => void;
  onExit?: (code: number) => void;
  onError?: (error: any) => void;
  rewriters?: Rewriter[];
  filters?: Filter[];
}

/**
 * RewritableTerminal - Enhanced Bun v1.3.5+ PTY with rewrite/filter middleware
 * 
 * Provides a production-ready wrapper around Bun.Terminal with support for
 * real-time output modification (rewriters) and exclusion (filters).
 */
export class RewritableTerminal {
  private command: string[];
  private options: Required<RewritableTerminalOptions>;
  private proc: any;
  private decoder = new TextDecoder();
  private encoder = new TextEncoder();
  private lineBuffer = '';

  constructor(command: string | string[], options: RewritableTerminalOptions = {}) {
    this.command = Array.isArray(command) ? command : [command];
    this.options = {
      cols: options.cols || process.stdout.columns || 80,
      rows: options.rows || process.stdout.rows || 24,
      onData: options.onData || ((data) => process.stdout.write(data)),
      onExit: options.onExit || ((code) => console.log(`[PTY] Process exited with code: ${code}`)),
      onError: options.onError || ((error) => console.error('[PTY] Terminal error:', error)),
      rewriters: options.rewriters || [],
      filters: options.filters || [],
    };
  }

  /**
   * Initialize and start the PTY session
   */
  async spawn() {
    try {
      this.proc = (spawn as any)(this.command, {
        terminal: {
          cols: this.options.cols,
          rows: this.options.rows,
          data: (_term: any, data: Uint8Array) => this.processOutput(data),
        },
        stderr: 'inherit',
      });

      // Handle process exit
      this.proc.exited.then((code: number) => this.options.onExit(code));
      
      // Handle terminal resize if in interactive env
      if (process.stdout.isTTY) {
        process.stdout.on('resize', this.handleResize);
      }

      return this;
    } catch (error) {
      this.options.onError(error);
      throw error;
    }
  }

  private handleResize = () => {
    this.resize(process.stdout.columns, process.stdout.rows);
  };

  /**
   * Process raw output through filters and rewriters with line buffering for precision
   */
  private processOutput(data: Uint8Array) {
    const text = this.decoder.decode(data, { stream: true });
    this.lineBuffer += text.replace(/\r/g, ''); // Normalize carriage returns

    let idx: number;
    while ((idx = this.lineBuffer.indexOf('\n')) !== -1) {
      const line = this.lineBuffer.slice(0, idx);
      this.lineBuffer = this.lineBuffer.slice(idx + 1);

      // Apply filters first (can stop processing)
      let shouldOutput = true;
      for (const filter of this.options.filters) {
        if (!filter(line)) {
          shouldOutput = false;
          break;
        }
      }

      if (shouldOutput) {
        // Apply rewriters
        let processedLine = line;
        for (const rewriter of this.options.rewriters) {
          processedLine = rewriter(processedLine);
        }
        this.options.onData(processedLine + '\n');
      }
    }
  }

  /**
   * Forward input to the terminal
   */
  write(data: string | Uint8Array) {
    if (this.proc?.terminal) {
      this.proc.terminal.write(data);
    }
  }

  /**
   * Resize the terminal
   */
  resize(cols: number, rows: number) {
    if (this.proc?.terminal) {
      this.proc.terminal.resize(cols, rows);
    }
  }

  /**
   * Kill process and close terminal
   */
  close() {
    if (process.stdout.isTTY) {
      process.stdout.off('resize', this.handleResize);
    }
    
    if (this.proc?.terminal) {
      this.proc.terminal.close();
    }
    
    if (this.proc) {
      this.proc.kill();
    }
  }

  /**
   * Pipe process.stdin to this terminal (interactive mode)
   */
  async pipeInput() {
    if (!process.stdin.isTTY) return;

    process.stdin.setRawMode(true);
    process.stdin.resume();

    try {
      for await (const chunk of process.stdin) {
        this.write(chunk);
      }
    } finally {
      process.stdin.setRawMode(false);
    }
  }

  // Add rewrite function
  addRewriter(rewriter: Rewriter) {
    this.options.rewriters.push(rewriter);
  }

  // Add filter function
  addFilter(filter: Filter) {
    this.options.filters.push(filter);
  }
}

/**
 * Standard Library of Rewriters
 */
export const StandardRewriters = {
  // Colorize output patterns - whole words only to avoid breaking sensitive data words
  colorizer: (data: string) => {
    return data
      .replace(/\b(error|fail|failure)\b/gi, match => `\x1b[31m${match}\x1b[0m`)
      .replace(/\b(warning|warn)\b/gi, match => `\x1b[33m${match}\x1b[0m`)
      .replace(/\b(success|ok|pass)\b/gi, match => `\x1b[32m${match}\x1b[0m`)
      .replace(/\b(info|note)\b/gi, match => `\x1b[36m${match}\x1b[0m`);
  },

  // Add timestamps to each chunk of output, handling multi-line strings and avoiding double-prefixing
  timestamp: (data: string) => {
    if (!data.trim()) return data;
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const prefix = `[\x1b[90m${timestamp}\x1b[0m] `;
    
    // Split into lines, prefix each line but avoid double-prefixing
    return data
      .split('\n')
      .map(line => {
        if (!line.trim()) return line;
        // Check if already prefixed with a similar timestamp pattern to avoid doubling
        if (line.includes('\x1b[90m') && line.includes(']')) return line;
        return prefix + line;
      })
      .join('\n');
  },

  // Mask sensitive information
  sensitiveDataMask: (data: string) => {
    return data.replace(
      /\b(password|token|secret|key|apikey|authorization)\b\s*=\s*\S+/gi,
      (match, key) => `${key}=[REDACTED]`
    );
  },
  
  // Team Color Coding (Alice, Bob, Carol, Dave) with multi-line support
  teamAttribution: (teamName: 'Alice' | 'Bob' | 'Carol' | 'Dave') => {
    const colors = {
      Alice: '\x1b[38;5;44m', // #00CED1
      Bob: '\x1b[38;5;220m',   // #FFD700
      Carol: '\x1b[38;5;205m', // #FF69B4
      Dave: '\x1b[38;5;84m',   // #00FF7F
    } as const;
    const reset = '\x1b[0m';
    const color = colors[teamName] || reset;
    const prefix = `${color}[${teamName}]${reset} `;
    
    return (data: string) => {
      if (!data.trim()) return data;
      
      return data
        .split('\n')
        .map(line => {
          if (!line.trim()) return line;
          // Avoid double prefixing
          if (line.includes(`[${teamName}]`)) return line;
          return prefix + line;
        })
        .join('\n');
    };
  }
};

/**
 * Standard Library of Filters
 */
export const StandardFilters = {
  // Filter out empty lines
  noEmptyLines: (data: string) => !/^\s*$/.test(data),

  // Filter out progress bars (naively)
  noProgressBars: (data: string) => !/\[\s*=\s*\]/.test(data),

  // Filter based on content severity
  minimumSeverity: (minLevel: 'info' | 'warn' | 'error') => {
    const levels = { info: 0, warn: 1, error: 2 } as const;
    const minVal = levels[minLevel] ?? 0;

    const stripAnsi = (text: string): string => text.replace(/\x1b\[[0-9;]*m/g, '');

    const getLevel = (text: string): number => {
      const lower = stripAnsi(text).toLowerCase();
      if (/\b(?:error|fail(?:ure)?|exception|panic)\b/i.test(lower)) return 2;
      if (/\b(?:warn(?:ing)?)\b/i.test(lower)) return 1;
      return 0;
    };

    return (data: string) => {
      const strippedTrimmed = stripAnsi(data).trim();
      // Hide prompts, echoes, commands
      if (/^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+[:~\/][^$]*[\$#]\s/i.test(strippedTrimmed) || /^echo\s+/i.test(strippedTrimmed)) {
        return false;
      }
      const level = getLevel(data);
      return level >= minVal;
    };
  }
};
