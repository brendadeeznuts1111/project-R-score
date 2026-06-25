// [72.0.0.0] ARCHIVE CORE - Bun.Archive integration
// Zero-npm, Bun v1.3.6+ native log archiving with compression
// Enterprise-grade storage with KV/S3/filesystem adapters
// Supports direct S3 upload: Bun.write("s3://bucket/archive.tar.gz", blob)

import type {
  ArchiveMetadata,
  CompressionFormat,
  CoreModule,
  StorageAdapter,
  EventHandler,
} from "../types";

/**
 * [72.1.0.0] Log file entry for archiving
 */
export interface LogFileEntry {
  path: string;
  name: string;
  size: number;
  modified: number;
  content: string;
}

/**
 * [72.2.0.0] ArchiveCore - Bun.Archive wrapper for log management
 */
export class ArchiveCore implements CoreModule {
  private archiveMap: Record<string, string> = {};
  private metadata: ArchiveMetadata | null = null;
  private initialized: boolean = false;
  private format: CompressionFormat;
  private level: number;
  private storageAdapter: StorageAdapter | null = null;

  // Event handlers
  private onArchive: EventHandler<ArchiveMetadata> | null = null;

  constructor(
    format: CompressionFormat = "gzip",
    level: number = 9,
    adapter?: StorageAdapter
  ) {
    this.format = format;
    this.level = Math.max(1, Math.min(9, level));
    this.storageAdapter = adapter ?? null;
  }

  /**
   * [72.3.0.0] Initialize the core
   */
  async initialize(): Promise<void> {
    this.initialized = true;
  }

  /**
   * [72.4.0.0] Dispose resources
   */
  dispose(): void {
    this.clear();
    this.onArchive = null;
    this.initialized = false;
  }

  /**
   * [72.5.0.0] Check initialization status
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * [72.5.5.0] Collect log files from directory
   * @private
   */
  private async collectLogFiles(
    directory: string
  ): Promise<{ entries: LogFileEntry[]; totalSize: number }> {
    const files = await Bun.glob(directory + "/*.log").array();
    const logEntries: LogFileEntry[] = [];
    let totalSize = 0;

    for (const file of files) {
      const bunFile = Bun.file(file.path);
      const content = await bunFile.text();
      const stat = await bunFile.stat();

      logEntries.push({
        path: file.path,
        name: file.name,
        size: content.length,
        modified: stat?.mtime?.getTime() ?? Date.now(),
        content,
      });

      totalSize += content.length;
      this.archiveMap[file.name] = content;
    }

    return { entries: logEntries, totalSize };
  }

  /**
   * [72.5.6.0] Create compressed archive from collected files
   * @private
   */
  private async createCompressedArchive(
    format: CompressionFormat,
    level: number
  ): Promise<Blob> {
    const archive = new Bun.Archive(this.archiveMap, {
      compress: format,
      level,
    });

    return archive.blob();
  }

  /**
   * [72.5.7.0] Store archive metadata
   * @private
   */
  private storeArchiveMetadata(
    logEntries: LogFileEntry[],
    totalSize: number,
    compressedSize: number,
    format: CompressionFormat
  ): void {
    this.metadata = {
      archiveId: `archive-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      timestamp: Date.now(),
      fileCount: logEntries.length,
      originalSize: totalSize,
      compressedSize,
      compressionRatio: totalSize > 0 ? (compressedSize / totalSize) * 100 : 0,
      format,
      level: this.level,
      status: "completed",
    };

    this.onArchive?.(this.metadata);
  }

  /**
   * [72.6.0.0] Archive logs from directory
   */
  async archiveLogs(
    dir: string,
    options: { format?: CompressionFormat; level?: number } = {}
  ): Promise<Blob> {
    const format = options.format ?? this.format;
    const level = options.level ?? this.level;

    const { entries, totalSize } = await this.collectLogFiles(dir);
    const blob = await this.createCompressedArchive(format, level);

    this.storeArchiveMetadata(entries, totalSize, blob.size, format);

    return blob;
  }

  /**
   * [72.7.0.0] Upload archive to storage adapter
   */
  async upload(blob: Blob): Promise<string> {
    if (!this.metadata) {
      throw new Error("No archive metadata available. Call archiveLogs first.");
    }

    if (!this.storageAdapter) {
      throw new Error("No storage adapter configured.");
    }

    const key = `logs/${this.metadata.archiveId}.tar.${this.metadata.format}`;
    const buffer = await blob.arrayBuffer();

    await this.storageAdapter.put(key, buffer, {
      archiveId: this.metadata.archiveId,
      timestamp: this.metadata.timestamp,
      fileCount: this.metadata.fileCount,
    });

    this.metadata.storageKey = key;
    return key;
  }

  /**
   * [72.7.1.0] Upload archive directly to S3 using Bun.write()
   * Uses Bun v1.3.6+ native S3 protocol: s3://bucket/path
   * @param blob - Archive blob to upload
   * @param s3Path - S3 path (e.g., "s3://my-bucket/archives/logs.tar.gz")
   * @returns The S3 path where the archive was written
   */
  async uploadToS3(blob: Blob, s3Path: string): Promise<string> {
    if (!this.metadata) {
      throw new Error("No archive metadata available. Call archiveLogs first.");
    }

    // Validate S3 path format
    if (!s3Path.startsWith("s3://")) {
      throw new Error('S3 path must start with "s3://"');
    }

    // Write directly to S3 using Bun.write()
    await Bun.write(s3Path, blob);

    this.metadata.storageKey = s3Path;
    return s3Path;
  }

  /**
   * [72.7.2.0] Upload archive to S3 with auto-generated path
   * @param blob - Archive blob to upload
   * @param bucket - S3 bucket name
   * @param prefix - Optional path prefix (default: "logs")
   * @returns The S3 path where the archive was written
   */
  async uploadToS3Bucket(
    blob: Blob,
    bucket: string,
    prefix: string = "logs"
  ): Promise<string> {
    if (!this.metadata) {
      throw new Error("No archive metadata available. Call archiveLogs first.");
    }

    const filename = `${this.metadata.archiveId}.tar.${this.metadata.format}`;
    const s3Path = `s3://${bucket}/${prefix}/${filename}`;

    await Bun.write(s3Path, blob);

    this.metadata.storageKey = s3Path;
    return s3Path;
  }

  /**
   * [72.7.3.0] Write archive to local file using Bun.write()
   * @param blob - Archive blob to write
   * @param filePath - Local file path
   * @returns The file path where the archive was written
   */
  async writeToFile(blob: Blob, filePath: string): Promise<string> {
    if (!this.metadata) {
      throw new Error("No archive metadata available. Call archiveLogs first.");
    }

    await Bun.write(filePath, blob);

    this.metadata.storageKey = filePath;
    return filePath;
  }

  /**
   * [72.8.0.0] Get archive metadata
   */
  getMetadata(): ArchiveMetadata | null {
    return this.metadata;
  }

  /**
   * [72.9.0.0] Set storage adapter
   */
  setStorageAdapter(adapter: StorageAdapter): void {
    this.storageAdapter = adapter;
  }

  /**
   * [72.10.0.0] Clear archive state
   */
  clear(): void {
    this.archiveMap = {};
    this.metadata = null;
  }

  /**
   * [72.11.0.0] Subscribe to archive events
   */
  subscribeArchive(handler: EventHandler<ArchiveMetadata>): () => void {
    this.onArchive = handler;
    return () => {
      this.onArchive = null;
    };
  }
}

export default ArchiveCore;
