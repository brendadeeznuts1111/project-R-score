// [83.0.0.0] TERMINAL MODULE - Bun.Terminal PTY API
// Provides PTY terminal support for Bun v1.3.5+
// Platform: POSIX only (Linux, macOS)

// Core functions
export {
  isPtySupported,
  createTerminal,
  spawnWithTerminal,
  spawnWithReusableTerminal,
  runInteractiveProgram,
} from "./pty-terminal";

// Terminal manager
export { TerminalManager } from "./terminal-manager";

// Types
export type {
  TerminalDimensions,
  TerminalOptions,
  InlineTerminalOptions,
  BunTerminalInstance,
  TerminalProcess,
  TerminalSession,
  TerminalManagerConfig,
  TerminalEvent,
  TerminalEventType,
  TerminalDataHandler,
  TerminalResizeHandler,
} from "./types";

export { DEFAULT_TERMINAL_CONFIG } from "./types";

