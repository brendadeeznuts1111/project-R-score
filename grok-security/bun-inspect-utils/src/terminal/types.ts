// [80.0.0.0] TERMINAL TYPES - Bun.Terminal PTY API Type Definitions
// TypeScript types for Bun v1.3.5+ Terminal/PTY support
// Platform: POSIX only (Linux, macOS)

/**
 * [80.1.0.0] Terminal dimensions configuration
 */
export interface TerminalDimensions {
  /** Number of columns (width) */
  cols: number;
  /** Number of rows (height) */
  rows: number;
}

/**
 * [80.1.1.0] Terminal data handler callback
 * Called when terminal receives output data
 */
export type TerminalDataHandler = (
  terminal: BunTerminalInstance,
  data: Uint8Array
) => void;

/**
 * [80.1.2.0] Terminal resize handler callback
 * Called when terminal dimensions change
 */
export type TerminalResizeHandler = (
  terminal: BunTerminalInstance,
  cols: number,
  rows: number
) => void;

/**
 * [80.2.0.0] Bun.Terminal configuration options
 */
export interface TerminalOptions extends TerminalDimensions {
  /** Data output handler */
  data?: TerminalDataHandler;
  /** Resize event handler */
  resize?: TerminalResizeHandler;
}

/**
 * [80.2.1.0] Inline terminal config for Bun.spawn()
 */
export interface InlineTerminalOptions extends TerminalDimensions {
  /** Data output handler */
  data: (terminal: BunTerminalInstance, data: Uint8Array) => void;
}

/**
 * [80.3.0.0] Bun.Terminal instance interface
 * Matches the native Bun.Terminal API
 */
export interface BunTerminalInstance {
  /** Write data to terminal input */
  write(data: string | Uint8Array): void;
  /** Resize terminal dimensions */
  resize(cols: number, rows: number): void;
  /** Set raw mode for input */
  setRawMode(enabled: boolean): void;
  /** Keep process alive while terminal is open */
  ref(): void;
  /** Allow process to exit even if terminal is open */
  unref(): void;
  /** Close the terminal */
  close(): void;
}

/**
 * [80.4.0.0] Spawn options with terminal support
 */
export interface TerminalSpawnOptions {
  /** Reusable terminal instance or inline config */
  terminal: BunTerminalInstance | InlineTerminalOptions;
  /** Working directory */
  cwd?: string;
  /** Environment variables */
  env?: Record<string, string>;
  /** Exit callback */
  onExit?: (
    proc: TerminalProcess,
    exitCode: number | null,
    signalCode: string | null,
    error?: Error
  ) => void;
}

/**
 * [80.4.1.0] Terminal process result
 */
export interface TerminalProcess {
  /** Process ID */
  pid: number;
  /** Terminal instance (if inline terminal was used) */
  terminal?: BunTerminalInstance;
  /** Promise that resolves when process exits */
  exited: Promise<number>;
  /** Kill the process */
  kill(signal?: number | string): void;
}

/**
 * [80.5.0.0] Managed terminal session
 */
export interface TerminalSession {
  /** Unique session ID */
  id: string;
  /** Terminal instance */
  terminal: BunTerminalInstance;
  /** Associated process */
  process: TerminalProcess;
  /** Current dimensions */
  dimensions: TerminalDimensions;
  /** Session creation timestamp */
  createdAt: number;
  /** Write to terminal */
  write(data: string | Uint8Array): void;
  /** Resize terminal */
  resize(cols: number, rows: number): void;
  /** Close session */
  close(): Promise<void>;
}

/**
 * [80.6.0.0] Terminal manager configuration
 */
export interface TerminalManagerConfig {
  /** Default terminal dimensions */
  defaultDimensions: TerminalDimensions;
  /** Default shell command */
  defaultShell: string;
  /** Default shell arguments */
  defaultArgs: string[];
  /** Default environment variables */
  defaultEnv: Record<string, string>;
  /** Auto-close terminals on process exit */
  autoClose: boolean;
}

/**
 * [80.6.1.0] Default terminal manager configuration
 */
export const DEFAULT_TERMINAL_CONFIG: TerminalManagerConfig = {
  defaultDimensions: { cols: 80, rows: 24 },
  defaultShell: "bash",
  defaultArgs: ["-i"],
  defaultEnv: { TERM: "xterm-256color" },
  autoClose: true,
};

/**
 * [80.7.0.0] Terminal event types
 */
export type TerminalEventType = "data" | "resize" | "exit" | "error";

/**
 * [80.7.1.0] Terminal event payload
 */
export interface TerminalEvent {
  type: TerminalEventType;
  sessionId: string;
  timestamp: number;
  data?: Uint8Array | string;
  dimensions?: TerminalDimensions;
  exitCode?: number | null;
  error?: Error;
}

