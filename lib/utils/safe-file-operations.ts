// @see https://bun.com/docs/runtime/file-io — Bun.file, Bun.write, BunFile.delete
// @see https://bun.com/docs/guides/read-file/exists — Bun.file().exists()
// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
// lib/utils/safe-file-operations.ts — Safe file operations with error handling

import { mkdir } from 'node:fs/promises';
import { ErrorHandler } from './error-handler';
import { dirnamePath, basenamePath, extnamePath } from '../path-bun';

export interface FileOperationOptions {
  encoding?: BufferEncoding;
  createDir?: boolean;
  backup?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  validateContent?: boolean;
}

export interface FileOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  path?: string;
  metadata?: {
    size?: number;
    created?: Date;
    modified?: Date;
    isFile?: boolean;
    isDirectory?: boolean;
  };
}

/**
 * Safe file operations via Bun.file / Bun.write (canonical Bun file I/O).
 * Pure directory creation still uses node:fs mkdir — Bun.write only creates
 * parent segments when writing a nested *file* path.
 */
export class SafeFileOperations {
  private static readonly DEFAULT_OPTIONS: Required<FileOperationOptions> = {
    encoding: 'utf8',
    createDir: true,
    backup: false,
    maxRetries: 3,
    retryDelay: 1000,
    validateContent: true,
  };

  /**
   * Safely read a file with error handling
   */
  static async readFile(
    filePath: string,
    options: FileOperationOptions = {}
  ): Promise<FileOperationResult<string>> {
    const opts = { ...SafeFileOperations.DEFAULT_OPTIONS, ...options };

    try {
      const pathValidation = this.validatePath(filePath);
      if (!pathValidation.isValid) {
        return {
          success: false,
          error: `Invalid file path: ${pathValidation.errors.join(', ')}`,
          path: filePath,
        };
      }

      const file = Bun.file(filePath);
      if (!(await file.exists())) {
        return {
          success: false,
          error: 'File does not exist',
          path: filePath,
        };
      }

      // Bun.file reports size 0 for missing; after exists(), treat as a file body.
      // Directories are not reliably distinguishable without node:fs stat —
      // empty-size + exists is accepted as a readable path.
      let content: string | undefined;
      let lastError: Error | unknown;

      for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
        try {
          content = await file.text();
          break;
        } catch (error) {
          lastError = error;
          if (attempt < opts.maxRetries) {
            await this.delay(opts.retryDelay * attempt);
          }
        }
      }

      if (content === undefined) {
        throw lastError;
      }

      if (opts.validateContent && !this.validateContent(content)) {
        return {
          success: false,
          error: 'File content validation failed',
          path: filePath,
        };
      }

      return {
        success: true,
        data: content,
        path: filePath,
        metadata: {
          size: file.size,
          modified: file.lastModified ? new Date(file.lastModified) : undefined,
          isFile: true,
          isDirectory: false,
        },
      };
    } catch (error) {
      const standardizedError = ErrorHandler.handle(error, {
        module: 'SafeFileOperations',
        function: 'readFile',
        operation: 'file-read',
        filePath,
      });

      return {
        success: false,
        error: standardizedError.message,
        path: filePath,
      };
    }
  }

  /**
   * Safely write a file with error handling
   */
  static async writeFile(
    filePath: string,
    content: string,
    options: FileOperationOptions = {}
  ): Promise<FileOperationResult<void>> {
    const opts = { ...SafeFileOperations.DEFAULT_OPTIONS, ...options };

    try {
      const pathValidation = this.validatePath(filePath);
      if (!pathValidation.isValid) {
        return {
          success: false,
          error: `Invalid file path: ${pathValidation.errors.join(', ')}`,
          path: filePath,
        };
      }

      if (opts.validateContent && !this.validateContent(content)) {
        return {
          success: false,
          error: 'Content validation failed',
          path: filePath,
        };
      }

      // Bun.write creates intermediate path segments for nested file paths;
      // ensureDirectory covers pure empty-dir edge cases when createDir is set.
      if (opts.createDir) {
        await this.ensureDirectory(dirnamePath(filePath));
      }

      if (opts.backup && (await Bun.file(filePath).exists())) {
        const backupPath = `${filePath}.backup.${Date.now()}`;
        await Bun.write(backupPath, Bun.file(filePath));
      }

      let lastError: Error | unknown;
      let written = false;

      for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
        try {
          await Bun.write(filePath, content);
          written = true;
          break;
        } catch (error) {
          lastError = error;
          if (attempt < opts.maxRetries) {
            await this.delay(opts.retryDelay * attempt);
          }
        }
      }

      if (!written) {
        throw lastError;
      }

      return {
        success: true,
        path: filePath,
      };
    } catch (error) {
      const standardizedError = ErrorHandler.handle(error, {
        module: 'SafeFileOperations',
        function: 'writeFile',
        operation: 'file-write',
        filePath,
      });

      return {
        success: false,
        error: standardizedError.message,
        path: filePath,
      };
    }
  }

  /**
   * Safely append to a file with error handling
   */
  static async appendFile(
    filePath: string,
    content: string,
    options: FileOperationOptions = {}
  ): Promise<FileOperationResult<void>> {
    const opts = { ...SafeFileOperations.DEFAULT_OPTIONS, ...options };

    try {
      const pathValidation = this.validatePath(filePath);
      if (!pathValidation.isValid) {
        return {
          success: false,
          error: `Invalid file path: ${pathValidation.errors.join(', ')}`,
          path: filePath,
        };
      }

      if (opts.createDir) {
        await this.ensureDirectory(dirnamePath(filePath));
      }

      let lastError: Error | unknown;
      let appended = false;

      for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
        try {
          const existing = (await Bun.file(filePath).exists())
            ? await Bun.file(filePath).text()
            : '';
          await Bun.write(filePath, existing + content);
          appended = true;
          break;
        } catch (error) {
          lastError = error;
          if (attempt < opts.maxRetries) {
            await this.delay(opts.retryDelay * attempt);
          }
        }
      }

      if (!appended) {
        throw lastError;
      }

      return {
        success: true,
        path: filePath,
      };
    } catch (error) {
      const standardizedError = ErrorHandler.handle(error, {
        module: 'SafeFileOperations',
        function: 'appendFile',
        operation: 'file-append',
        filePath,
      });

      return {
        success: false,
        error: standardizedError.message,
        path: filePath,
      };
    }
  }

  /**
   * Safely delete a file with error handling
   */
  static async deleteFile(filePath: string): Promise<FileOperationResult<void>> {
    try {
      const pathValidation = this.validatePath(filePath);
      if (!pathValidation.isValid) {
        return {
          success: false,
          error: `Invalid file path: ${pathValidation.errors.join(', ')}`,
          path: filePath,
        };
      }

      const file = Bun.file(filePath);
      if (!(await file.exists())) {
        return {
          success: true, // Deleting non-existent file is considered success
          path: filePath,
        };
      }

      await file.delete();

      return {
        success: true,
        path: filePath,
      };
    } catch (error) {
      const standardizedError = ErrorHandler.handle(error, {
        module: 'SafeFileOperations',
        function: 'deleteFile',
        operation: 'file-delete',
        filePath,
      });

      return {
        success: false,
        error: standardizedError.message,
        path: filePath,
      };
    }
  }

  /**
   * Validate file path for security
   */
  private static validatePath(filePath: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (filePath.includes('..') || filePath.includes('~')) {
      errors.push('Path contains potentially dangerous components');
    }

    if (!filePath || filePath.trim().length === 0) {
      errors.push('Path cannot be empty');
    }

    const invalidChars = /[<>:"|?*]/;
    if (invalidChars.test(filePath)) {
      errors.push('Path contains invalid characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private static validateContent(content: string): boolean {
    return typeof content === 'string' && content.length >= 0;
  }

  /**
   * Ensure directory exists (pure dirs — Bun.write only parents nested files).
   */
  private static async ensureDirectory(dirPath: string): Promise<void> {
    if (!(await Bun.file(dirPath).exists())) {
      await mkdir(dirPath, { recursive: true });
    }
  }

  private static delay(ms: number): Promise<void> {
    return Bun.sleep(ms);
  }
}

/**
 * Convenience functions for common file operations
 */
export const safeReadFile = (filePath: string, options?: FileOperationOptions) =>
  SafeFileOperations.readFile(filePath, options);

export const safeWriteFile = (filePath: string, content: string, options?: FileOperationOptions) =>
  SafeFileOperations.writeFile(filePath, content, options);

export const safeAppendFile = (filePath: string, content: string, options?: FileOperationOptions) =>
  SafeFileOperations.appendFile(filePath, content, options);

export const safeDeleteFile = (filePath: string) => SafeFileOperations.deleteFile(filePath);

// re-export path helpers used by some call sites historically
export { basename, extname, dirname };
