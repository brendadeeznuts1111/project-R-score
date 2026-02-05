/**
 * File Handler Utility - Demonstrates BunFileSystemEntry vs File usage patterns
 * Provides optimized file operations for the Foxy Proxy application
 */

// Type definitions for better TypeScript support
import type { BunFileSystemEntry } from "../types/bun";

// Declare Bun global for TypeScript
declare const Bun: {
  file(path: string): BunFileSystemEntry;
  write(path: string, data: string | ArrayBuffer | Blob): Promise<void>;
};

// Type guard to check if object is BunFileSystemEntry
function isBunFileSystemEntry(obj: unknown): obj is BunFileSystemEntry {
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

export interface FileUploadOptions {
  phoneId: string;
  path?: string;
  useStreaming?: boolean;
  chunkSize?: number;
}

export interface FileDownloadOptions {
  phoneId: string;
  filePath: string;
  localPath?: string;
  asBunFileSystemEntry?: boolean;
}

export interface ProcessingResult {
  success: boolean;
  size: number;
  duration: number;
  method: "BunFileSystemEntry" | "File";
}

/**
 * File Handler class demonstrating optimal file operations
 */
export class FileHandler {
  private static readonly LARGE_FILE_THRESHOLD = 10 * 1024 * 1024; // 10MB
  // CHUNK_SIZE is defined for future use in chunk processing
  private static readonly CHUNK_SIZE = 64 * 1024; // 64KB chunks

  /**
   * Determine the optimal file handling method based on file characteristics
   */
  static determineOptimalMethod(fileSize: number, isServerSide: boolean): "BunFileSystemEntry" | "File" {
    // Use BunFileSystemEntry for server-side large files
    if (isServerSide && fileSize > this.LARGE_FILE_THRESHOLD) {
      return "BunFileSystemEntry";
    }

    // Use File for browser compatibility and smaller files
    return "File";
  }

  /**
   * Create a File object from various sources
   */
  static async createFile(source: File | BunFileSystemEntry | string | ArrayBuffer): Promise<File> {
    if (source instanceof File) {
      return source; // Already a File object
    }

    if (isBunFileSystemEntry(source)) {
      // Convert BunFileSystemEntry to File (browser compatible)
      const buffer = await source.arrayBuffer();
      return new File([buffer], source.name, { type: source.type });
    }

    if (typeof source === "string") {
      // Create File from string content
      return new File([source], "content.txt", { type: "text/plain" });
    }

    if (source instanceof ArrayBuffer) {
      // Create File from ArrayBuffer
      return new File([source], "data.bin", { type: "application/octet-stream" });
    }

    throw new Error("Unsupported source type for file creation");
  }

  /**
   * Create a BunFileSystemEntry from various sources (server-side only)
   */
  static async createBunFileSystemEntry(
    source: File | BunFileSystemEntry | string | ArrayBuffer,
    filePath: string
  ): Promise<BunFileSystemEntry> {
    if (isBunFileSystemEntry(source)) {
      return source; // Already a BunFileSystemEntry
    }

    if (source instanceof File) {
      // Convert File to BunFileSystemEntry (server-side storage)
      await Bun.write(filePath, source);
      return Bun.file(filePath);
    }

    if (typeof source === "string") {
      // Create BunFileSystemEntry from string content
      await Bun.write(filePath, source);
      return Bun.file(filePath);
    }

    if (source instanceof ArrayBuffer) {
      // Create BunFileSystemEntry from ArrayBuffer
      await Bun.write(filePath, source);
      return Bun.file(filePath);
    }

    throw new Error("Unsupported source type for BunFileSystemEntry creation");
  }

  /**
   * Process file upload using optimal method
   */
  static async processFileUpload(file: File | BunFileSystemEntry): Promise<ProcessingResult> {
    const startTime = Date.now();
    const fileSize = file instanceof File ? file.size : await this.getFileSize(file);
    const method = this.determineOptimalMethod(fileSize, typeof Bun !== "undefined");

    try {
      if (method === "BunFileSystemEntry" && isBunFileSystemEntry(file)) {
        // Use BunFileSystemEntry streaming for large files
        await this.processWithBunFileSystemEntry();
      } else {
        // Use standard File approach
        await this.processWithFile();
      }

      return {
        success: true,
        size: fileSize,
        duration: Date.now() - startTime,
        method
      };
    } catch (error) {
      throw new Error(`File upload failed using ${method}: ${error}`);
    }
  }

  /**
   * Process file download using optimal method
   */
  static async processFileDownload(options: FileDownloadOptions): Promise<ProcessingResult> {
    const startTime = Date.now();
    const method = options.asBunFileSystemEntry ? "BunFileSystemEntry" : "File";

    try {
      if (method === "BunFileSystemEntry") {
        // Use BunFileSystemEntry for server-side storage
        await this.downloadAsBunFileSystemEntry();
      } else {
        // Use standard File approach for browser
        await this.downloadAsFile();
      }

      return {
        success: true,
        size: 0, // Size would be determined by the actual download
        duration: Date.now() - startTime,
        method
      };
    } catch (error) {
      throw new Error(`File download failed using ${method}: ${error}`);
    }
  }

  /**
   * Stream processing for large files using BunFileSystemEntry
   */
  static async *processLargeFileInChunks(file: BunFileSystemEntry): AsyncGenerator<Uint8Array, void, unknown> {
    const stream = file.stream();

    for await (const chunk of stream) {
      // Process chunk by chunk for memory efficiency
      yield chunk;
    }
  }

  /**
   * Convert between File and BunFileSystemEntry formats
   */
  static async convertFileFormat(
    file: File | BunFileSystemEntry,
    targetFormat: "File" | "BunFileSystemEntry",
    targetPath?: string
  ): Promise<File | BunFileSystemEntry> {
    if (file instanceof File && targetFormat === "BunFileSystemEntry") {
      if (!targetPath) {
        throw new Error("Target path required for BunFileSystemEntry conversion");
      }
      return await this.createBunFileSystemEntry(file, targetPath);
    }

    if (isBunFileSystemEntry(file) && targetFormat === "File") {
      return await this.createFile(file);
    }

    // Already in target format
    return file;
  }

  /**
   * Get file metadata efficiently
   */
  static async getFileMetadata(file: File | BunFileSystemEntry): Promise<{
    name: string;
    size: number;
    type: string;
    lastModified?: number;
    exists?: boolean;
  }> {
    if (file instanceof File) {
      return {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        exists: true
      };
    }

    if (isBunFileSystemEntry(file)) {
      return {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        exists: await file.exists()
      };
    }

    throw new Error("Invalid file type for metadata extraction");
  }

  // Private helper methods

  private static async processWithBunFileSystemEntry(): Promise<void> {
    // Simulate streaming upload process
    console.log("Processing BunFileSystemEntry with streaming upload");
  }

  private static async processWithFile(): Promise<void> {
    // Standard file processing
    console.log("Processing file with standard method");
  }

  private static async downloadAsBunFileSystemEntry(): Promise<void> {
    // Simulate download and save as BunFileSystemEntry
    console.log("Downloading file as BunFileSystemEntry to local storage");
  }

  private static async downloadAsFile(): Promise<void> {
    // Simulate standard file download for browser
    console.log("Downloading file for browser use");
  }

  private static async getFileSize(file: File | BunFileSystemEntry): Promise<number> {
    if (file instanceof File) {
      return file.size;
    }

    if (isBunFileSystemEntry(file)) {
      return file.size;
    }

    return 0;
  }
}

/**
 * Usage examples and demonstrations
 */
export class FileHandlerExamples {
  /**
   * Example: Upload a large APK file using optimal method
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static async uploadLargeApk(apkFile: File | BunFileSystemEntry, _phoneId: string): Promise<void> {
    // Options available for future use - currently demonstrating basic upload
    const result = await FileHandler.processFileUpload(apkFile);

    console.log("APK upload completed:", {
      method: result.method,
      size: `${(result.size / 1024 / 1024).toFixed(2)}MB`,
      duration: `${result.duration}ms`,
      success: result.success
    });
  }

  /**
   * Example: Download phone screenshot as BunFileSystemEntry
   */
  static async downloadScreenshotAsBunFileSystemEntry(phoneId: string, filename?: string): Promise<BunFileSystemEntry> {
    const options: FileDownloadOptions = {
      phoneId,
      filePath: "/sdcard/Pictures/Screenshots/screenshot.png",
      localPath: `/tmp/${filename || `screenshot-${phoneId}.png`}`,
      asBunFileSystemEntry: true
    };

    const result = await FileHandler.processFileDownload(options);

    console.log("Screenshot downloaded:", {
      method: result.method,
      duration: `${result.duration}ms`,
      success: result.success
    });

    return Bun.file(options.localPath!);
  }

  /**
   * Example: Process configuration files efficiently
   */
  static async processConfigFile(configData: string): Promise<{
    asFile: File;
    asBunFileSystemEntry: BunFileSystemEntry;
    metadata: {
      name: string;
      size: number;
      type: string;
      lastModified?: number;
      exists?: boolean;
    };
  }> {
    // Create as File (browser compatible)
    const file = await FileHandler.createFile(configData);

    // Create as BunFileSystemEntry (server optimized)
    const bunFile = await FileHandler.createBunFileSystemEntry(configData, "/tmp/config.json");

    // Get metadata
    const metadata = await FileHandler.getFileMetadata(file);

    return { asFile: file, asBunFileSystemEntry: bunFile, metadata };
  }

  /**
   * Example: Stream process large log files
   */
  static async processLargeLogFile(logFile: BunFileSystemEntry): Promise<{
    totalLines: number;
    errorCount: number;
    processingTime: number;
  }> {
    const startTime = Date.now();
    let totalLines = 0;
    let errorCount = 0;

    // Process file in chunks to avoid memory issues
    for await (const chunk of FileHandler.processLargeFileInChunks(logFile)) {
      const text = new TextDecoder().decode(chunk);
      const lines = text.split("\n");

      totalLines += lines.length;
      errorCount += lines.filter((line) => line.toLowerCase().includes("error")).length;
    }

    return {
      totalLines,
      errorCount,
      processingTime: Date.now() - startTime
    };
  }
}

export default FileHandler;
