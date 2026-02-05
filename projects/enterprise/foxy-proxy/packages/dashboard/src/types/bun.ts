/**
 * Bun Runtime Type Definitions
 * Centralized types for Bun-specific interfaces and globals
 */

// BunFile interface for TypeScript compatibility with Bun's file API
export interface BunFileSystemEntry {
  readonly name: string;
  readonly size: number;
  readonly type: string;
  readonly lastModified: number;
  exists(): Promise<boolean>;
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
  stream(): ReadableStream<Uint8Array> & AsyncIterable<Uint8Array>;
}

// Declare Bun global for TypeScript
declare global {
  const Bun: {
    file(path: string): BunFileSystemEntry;
    write(path: string, data: string | ArrayBuffer | Blob): Promise<void>;
  };
}

// Type guard to check if object is BunFileSystemEntry
export function isBunFileSystemEntry(obj: unknown): obj is BunFileSystemEntry {
  return !!(
    obj &&
    typeof obj === "object" &&
    obj !== null &&
    "name" in obj &&
    "size" in obj &&
    "stream" in obj &&
    typeof (obj as BunFileSystemEntry).name === "string" &&
    typeof (obj as BunFileSystemEntry).size === "number" &&
    typeof (obj as BunFileSystemEntry).stream === "function"
  );
}