/**
 * Type definitions for Bun Terminal API (PTY Support)
 *
 * Temporary type definitions until official Bun v1.3.5 types are available
 */

export interface TerminalDataCallback {
  (terminal: any, data: Uint8Array): void;
}

export interface TerminalOptions {
  cols: number;
  rows: number;
  data: TerminalDataCallback;
}

export interface TerminalInstance {
  write(data: string): void;
  resize(cols: number, rows: number): void;
  close(): void;
  data: TerminalDataCallback;
}

export interface TerminalSpawnOptions {
  terminal: TerminalOptions;
}

export interface SpawnProcessWithTerminal {
  exited: Promise<number>;
  killed: boolean;
  terminal?: TerminalInstance;
}

declare global {
  namespace Bun {
    class Terminal {
      constructor(options: TerminalOptions);
      write(data: string): void;
      resize(cols: number, rows: number): void;
      close(): void;
      data: TerminalDataCallback;
    }
  }

  function spawn(
    args: string[],
    options: TerminalSpawnOptions
  ): SpawnProcessWithTerminal;
}

export {};
