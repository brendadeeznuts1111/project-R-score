#!/usr/bin/env bun

import { ConcurrencyManagers } from './safe-concurrency';

/**
 * Atomic file operations with proper locking
 */
export class AtomicFileOperations {
  /**
   * Atomic write operation with file locking
   */
  static async writeAtomic(filePath: string, content: string | ArrayBuffer): Promise<void> {
    await ConcurrencyManagers.fileOperations.withLock(async () => {
      await Bun.write(filePath, content);
    });
  }

  /**
   * Safe file write with error handling
   */
  static async writeSafe(filePath: string, content: string | ArrayBuffer): Promise<void> {
    try {
      await this.writeAtomic(filePath, content);
    } catch (error) {
      throw new Error(
        `Failed to write file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Atomic append operation
   */
  static async appendAtomic(filePath: string, content: string): Promise<void> {
    await ConcurrencyManagers.fileOperations.withLock(async () => {
      try {
        // Read existing content
        const existingFile = Bun.file(filePath);
        let existingContent = '';

        if (await existingFile.exists()) {
          existingContent = await existingFile.text();
        }

        // Write combined content directly (already in mutex)
        await Bun.write(filePath, existingContent + content);
      } catch (error) {
        throw new Error(
          `Failed to append to file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });
  }

  /**
   * Safe file read with error handling
   */
  static async readSafe(filePath: string): Promise<string> {
    try {
      const file = Bun.file(filePath);
      if (!(await file.exists())) {
        throw new Error(`File does not exist: ${filePath}`);
      }
      return await file.text();
    } catch (error) {
      throw new Error(
        `Failed to read file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Atomic file delete with error handling
   */
  static async deleteSafe(filePath: string): Promise<void> {
    await ConcurrencyManagers.fileOperations.withLock(async () => {
      try {
        const file = Bun.file(filePath);
        if (await file.exists()) {
          await file.delete();
        }
      } catch (error) {
        throw new Error(
          `Failed to delete file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });
  }
}
