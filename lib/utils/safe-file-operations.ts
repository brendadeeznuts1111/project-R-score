/**
 * Safe File Operations Utility
 * 
 * Provides comprehensive error handling for file system operations
 * with proper validation, logging, and graceful fallbacks.
 */

import { readFile, writeFile, appendFile, mkdir, stat, unlink, copyFile, rename } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { ErrorHandler } from './error-handler';

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
 * Safe file operations with comprehensive error handling
 */
export class SafeFileOperations {
  private static readonly DEFAULT_OPTIONS: Required<FileOperationOptions> = {
    encoding: 'utf8',
    createDir: true,
    backup: false,
    maxRetries: 3,
    retryDelay: 1000,
    validateContent: true
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
      // Validate file path
      const pathValidation = this.validatePath(filePath);
      if (!pathValidation.isValid) {
        return {
          success: false,
          error: `Invalid file path: ${pathValidation.errors.join(', ')}`,
          path: filePath
        };
      }

      // Check if file exists
      if (!existsSync(filePath)) {
        return {
          success: false,
          error: 'File does not exist',
          path: filePath
        };
      }

      // Get file metadata
      const stats = await stat(filePath);
      if (!stats.isFile()) {
        return {
          success: false,
          error: 'Path is not a file',
          path: filePath
        };
      }

      // Read file with retries
      let content: string;
      let lastError: Error | unknown;

      for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
        try {
          content = await readFile(filePath, opts.encoding);
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

      // Validate content if requested
      if (opts.validateContent && !this.validateContent(content)) {
        return {
          success: false,
          error: 'File content validation failed',
          path: filePath
        };
      }

      return {
        success: true,
        data: content,
        path: filePath,
        metadata: {
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          isFile: stats.isFile(),
          isDirectory: stats.isDirectory()
        }
      };

    } catch (error) {
      const standardizedError = ErrorHandler.handle(error, {
        module: 'SafeFileOperations',
        function: 'readFile',
        operation: 'file-read',
        filePath
      });

      return {
        success: false,
        error: standardizedError.message,
        path: filePath
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
      // Validate file path
      const pathValidation = this.validatePath(filePath);
      if (!pathValidation.isValid) {
        return {
          success: false,
          error: `Invalid file path: ${pathValidation.errors.join(', ')}`,
          path: filePath
        };
      }

      // Validate content if requested
      if (opts.validateContent && !this.validateContent(content)) {
        return {
          success: false,
          error: 'Content validation failed',
          path: filePath
        };
      }

      // Create directory if needed
      if (opts.createDir) {
        const dir = dirname(filePath);
        await this.ensureDirectory(dir);
      }

      // Create backup if requested
      if (opts.backup && existsSync(filePath)) {
        const backupPath = `${filePath}.backup.${Date.now()}`;
        await copyFile(filePath, backupPath);
      }

      // Write file with retries
      let lastError: Error | unknown;

      for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
        try {
          await writeFile(filePath, content, opts.encoding);
          break;
        } catch (error) {
          lastError = error;
          if (attempt < opts.maxRetries) {
            await this.delay(opts.retryDelay * attempt);
          }
        }
      }

      if (attempt > opts.maxRetries) {
        throw lastError;
      }

      return {
        success: true,
        path: filePath
      };

    } catch (error) {
      const standardizedError = ErrorHandler.handle(error, {
        module: 'SafeFileOperations',
        function: 'writeFile',
        operation: 'file-write',
        filePath
      });

      return {
        success: false,
        error: standardizedError.message,
        path: filePath
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
      // Validate file path
      const pathValidation = this.validatePath(filePath);
      if (!pathValidation.isValid) {
        return {
          success: false,
          error: `Invalid file path: ${pathValidation.errors.join(', ')}`,
          path: filePath
        };
      }

      // Create directory if needed
      if (opts.createDir) {
        const dir = dirname(filePath);
        await this.ensureDirectory(dir);
      }

      // Append with retries
      let lastError: Error | unknown;

      for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
        try {
          await appendFile(filePath, content, opts.encoding);
          break;
        } catch (error) {
          lastError = error;
          if (attempt < opts.maxRetries) {
            await this.delay(opts.retryDelay * attempt);
          }
        }
      }

      if (attempt > opts.maxRetries) {
        throw lastError;
      }

      return {
        success: true,
        path: filePath
      };

    } catch (error) {
      const standardizedError = ErrorHandler.handle(error, {
        module: 'SafeFileOperations',
        function: 'appendFile',
        operation: 'file-append',
        filePath
      });

      return {
        success: false,
        error: standardizedError.message,
        path: filePath
      };
    }
  }

  /**
   * Safely delete a file with error handling
   */
  static async deleteFile(
    filePath: string
  ): Promise<FileOperationResult<void>> {
    try {
      // Validate file path
      const pathValidation = this.validatePath(filePath);
      if (!pathValidation.isValid) {
        return {
          success: false,
          error: `Invalid file path: ${pathValidation.errors.join(', ')}`,
          path: filePath
        };
      }

      // Check if file exists
      if (!existsSync(filePath)) {
        return {
          success: true, // Deleting non-existent file is considered success
          path: filePath
        };
      }

      await unlink(filePath);

      return {
        success: true,
        path: filePath
      };

    } catch (error) {
      const standardizedError = ErrorHandler.handle(error, {
        module: 'SafeFileOperations',
        function: 'deleteFile',
        operation: 'file-delete',
        filePath
      });

      return {
        success: false,
        error: standardizedError.message,
        path: filePath
      };
    }
  }

  /**
   * Validate file path for security
   */
  private static validatePath(filePath: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for path traversal
    if (filePath.includes('..') || filePath.includes('~')) {
      errors.push('Path contains potentially dangerous components');
    }

    // Check for empty path
    if (!filePath || filePath.trim().length === 0) {
      errors.push('Path cannot be empty');
    }

    // Check for invalid characters (basic check)
    const invalidChars = /[<>:"|?*]/;
    if (invalidChars.test(filePath)) {
      errors.push('Path contains invalid characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate file content
   */
  private static validateContent(content: string): boolean {
    // Basic validation - can be extended
    return typeof content === 'string' && content.length >= 0;
  }

  /**
   * Ensure directory exists
   */
  private static async ensureDirectory(dirPath: string): Promise<void> {
    if (!existsSync(dirPath)) {
      await mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Delay utility for retries
   */
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

export const safeDeleteFile = (filePath: string) =>
  SafeFileOperations.deleteFile(filePath);
