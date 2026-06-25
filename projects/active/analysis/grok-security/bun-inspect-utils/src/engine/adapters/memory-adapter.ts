// [75.0.0.0] MEMORY STORAGE ADAPTER
// In-memory storage for testing and development
// Zero-npm, Bun-native implementation

import type { StorageAdapter } from "../types";

/**
 * [75.1.0.0] MemoryAdapter - In-memory storage for testing
 */
export class MemoryAdapter implements StorageAdapter {
  readonly name = "memory" as const;
  private storage: Map<string, ArrayBuffer> = new Map();
  private metadata: Map<string, Record<string, unknown>> = new Map();

  /**
   * [75.2.0.0] Store data in memory
   */
  async put(
    key: string,
    data: ArrayBuffer,
    meta?: Record<string, unknown>
  ): Promise<void> {
    this.storage.set(key, data);
    if (meta) {
      this.metadata.set(key, meta);
    }
  }

  /**
   * [75.3.0.0] Retrieve data from memory
   */
  async get(key: string): Promise<ArrayBuffer | null> {
    return this.storage.get(key) ?? null;
  }

  /**
   * [75.4.0.0] Delete data from memory
   */
  async delete(key: string): Promise<void> {
    this.storage.delete(key);
    this.metadata.delete(key);
  }

  /**
   * [75.5.0.0] List keys with optional prefix filter
   */
  async list(prefix?: string): Promise<string[]> {
    const keys = Array.from(this.storage.keys());
    if (prefix) {
      return keys.filter((key) => key.startsWith(prefix));
    }
    return keys;
  }

  /**
   * [75.6.0.0] Get metadata for a key
   */
  async getMetadata(key: string): Promise<Record<string, unknown> | null> {
    return this.metadata.get(key) ?? null;
  }

  /**
   * [75.7.0.0] Clear all storage
   */
  clear(): void {
    this.storage.clear();
    this.metadata.clear();
  }

  /**
   * [75.8.0.0] Get storage size
   */
  size(): number {
    return this.storage.size;
  }
}

export default MemoryAdapter;

