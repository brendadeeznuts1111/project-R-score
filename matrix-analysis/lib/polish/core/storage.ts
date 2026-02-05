// lib/polish/core/storage.ts - Cross-runtime persistence
// ═══════════════════════════════════════════════════════════════════════════════

import { Runtime } from "./runtime.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Storage Interface
// ─────────────────────────────────────────────────────────────────────────────

export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
  clear(): Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// File-based Storage (Bun/Node)
// ─────────────────────────────────────────────────────────────────────────────

class FileStorage implements StorageAdapter {
  private basePath: string;

  constructor(namespace = "polish") {
    // Use XDG_DATA_HOME or fallback to ~/.local/share
    const dataHome = process.env.XDG_DATA_HOME
      ?? `${process.env.HOME}/.local/share`;
    this.basePath = `${dataHome}/${namespace}`;
  }

  private getPath(key: string): string {
    // Sanitize key for filesystem
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, "_");
    return `${this.basePath}/${safeKey}.json`;
  }

  private async ensureDir(): Promise<void> {
    if (typeof Bun !== "undefined") {
      const dir = Bun.file(this.basePath);
      if (!(await dir.exists())) {
        await Bun.write(`${this.basePath}/.keep`, "");
      }
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const path = this.getPath(key);
    if (typeof Bun !== "undefined") {
      const file = Bun.file(path);
      if (await file.exists()) {
        return file.json().catch(() => null);
      }
    }
    return null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.ensureDir();
    const path = this.getPath(key);
    if (typeof Bun !== "undefined") {
      await Bun.write(path, JSON.stringify(value, null, 2));
    }
  }

  async delete(key: string): Promise<void> {
    const path = this.getPath(key);
    if (typeof Bun !== "undefined") {
      const file = Bun.file(path);
      if (await file.exists()) {
        // Bun doesn't have fs.unlink, use shell
        await Bun.$`rm -f ${path}`.quiet().nothrow();
      }
    }
  }

  async has(key: string): Promise<boolean> {
    const path = this.getPath(key);
    if (typeof Bun !== "undefined") {
      return Bun.file(path).exists();
    }
    return false;
  }

  async clear(): Promise<void> {
    if (typeof Bun !== "undefined") {
      await Bun.$`rm -rf ${this.basePath}`.quiet().nothrow();
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Browser LocalStorage Adapter
// ─────────────────────────────────────────────────────────────────────────────

class BrowserStorage implements StorageAdapter {
  private prefix: string;

  constructor(namespace = "polish") {
    this.prefix = `${namespace}:`;
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const item = localStorage.getItem(this.getKey(key));
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      localStorage.setItem(this.getKey(key), JSON.stringify(value));
    } catch {
      // Storage full or unavailable
    }
  }

  async delete(key: string): Promise<void> {
    localStorage.removeItem(this.getKey(key));
  }

  async has(key: string): Promise<boolean> {
    return localStorage.getItem(this.getKey(key)) !== null;
  }

  async clear(): Promise<void> {
    const keys = Object.keys(localStorage).filter((k) =>
      k.startsWith(this.prefix)
    );
    for (const key of keys) {
      localStorage.removeItem(key);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Memory Storage (Fallback)
// ─────────────────────────────────────────────────────────────────────────────

class MemoryStorage implements StorageAdapter {
  private store = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | null> {
    return (this.store.get(key) as T) ?? null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async has(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage Factory
// ─────────────────────────────────────────────────────────────────────────────

export function createStorage(namespace?: string): StorageAdapter {
  if (Runtime.isBun || Runtime.isNode) {
    return new FileStorage(namespace);
  }
  if (Runtime.isBrowser) {
    return new BrowserStorage(namespace);
  }
  return new MemoryStorage();
}

// Default storage instance
export const storage = createStorage("polish");
