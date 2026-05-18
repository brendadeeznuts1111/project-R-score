// [76.0.0.0] FILESYSTEM STORAGE ADAPTER
// Local filesystem storage using Bun.file
// Zero-npm, Bun-native implementation

import type { StorageAdapter } from "../types";
import { mkdir, readdir, unlink } from "node:fs/promises";
import { join, dirname } from "node:path";

/**
 * [76.1.0.0] FilesystemAdapter - Local filesystem storage
 */
export class FilesystemAdapter implements StorageAdapter {
  readonly name = "filesystem" as const;
  private basePath: string;

  constructor(basePath: string = "./storage") {
    this.basePath = basePath;
  }

  /**
   * [76.2.0.0] Ensure directory exists
   */
  private async ensureDir(filePath: string): Promise<void> {
    const dir = dirname(filePath);
    await mkdir(dir, { recursive: true });
  }

  /**
   * [76.3.0.0] Get full path for a key
   */
  private getPath(key: string): string {
    return join(this.basePath, key);
  }

  /**
   * [76.4.0.0] Store data to filesystem
   */
  async put(
    key: string,
    data: ArrayBuffer,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const filePath = this.getPath(key);
    await this.ensureDir(filePath);

    await Bun.write(filePath, data);

    // Store metadata in companion file if provided
    if (metadata) {
      const metaPath = `${filePath}.meta.json`;
      await Bun.write(metaPath, JSON.stringify(metadata, null, 2));
    }
  }

  /**
   * [76.5.0.0] Retrieve data from filesystem
   */
  async get(key: string): Promise<ArrayBuffer | null> {
    const filePath = this.getPath(key);
    const file = Bun.file(filePath);

    if (await file.exists()) {
      return await file.arrayBuffer();
    }
    return null;
  }

  /**
   * [76.6.0.0] Delete data from filesystem
   */
  async delete(key: string): Promise<void> {
    const filePath = this.getPath(key);
    const metaPath = `${filePath}.meta.json`;

    try {
      await unlink(filePath);
    } catch {
      // File may not exist
    }

    try {
      await unlink(metaPath);
    } catch {
      // Metadata file may not exist
    }
  }

  /**
   * [76.7.0.0] List keys with optional prefix filter
   */
  async list(prefix?: string): Promise<string[]> {
    try {
      const files = await readdir(this.basePath, { recursive: true });
      const keys = files
        .filter((f) => !f.endsWith(".meta.json"))
        .map((f) => f.toString());

      if (prefix) {
        return keys.filter((key) => key.startsWith(prefix));
      }
      return keys;
    } catch {
      return [];
    }
  }

  /**
   * [76.8.0.0] Get metadata for a key
   */
  async getMetadata(key: string): Promise<Record<string, unknown> | null> {
    const metaPath = `${this.getPath(key)}.meta.json`;
    const file = Bun.file(metaPath);

    if (await file.exists()) {
      return await file.json();
    }
    return null;
  }
}

export default FilesystemAdapter;

