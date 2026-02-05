/**
 * MetricsArchiver - Archive old metrics with gzip compression.
 * Uses Node.js built-in APIs for cross-runtime compatibility.
 */

import { createGzip, createGunzip } from "node:zlib";
import { existsSync, mkdirSync, unlinkSync, createReadStream, createWriteStream } from "node:fs";
import { readdir, stat, rm } from "node:fs/promises";
import { basename, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";
import { STATE_DIR_CLAWDBOT } from "../config/config.js";
import type { MetricsCollector } from "./collector.js";
import type { MetricsArchiveManifest, MetricsConfig, SkillExecutionRecord } from "./types.js";

const ARCHIVES_DIR = "archives";
const RECORDINGS_DIR = "recordings";
const MAX_DECOMPRESSED_SIZE = 100 * 1024 * 1024; // 100MB limit to prevent decompression bombs

/**
 * Create a Transform stream that computes SHA256 while passing data through.
 * Allows streaming checksum without buffering entire file in memory.
 */
function createHashingStream(): Transform & { getChecksum: () => string } {
  const hasher = new Bun.CryptoHasher("sha256");
  const transform = new Transform({
    transform(chunk, _encoding, callback) {
      hasher.update(chunk);
      callback(null, chunk);
    },
  });
  (transform as Transform & { getChecksum: () => string }).getChecksum = () => hasher.digest("hex");
  return transform as Transform & { getChecksum: () => string };
}

export class MetricsArchiver {
  private collector: MetricsCollector;
  private config: MetricsConfig["archival"];
  private archivesPath: string;
  private recordingsPath: string;

  constructor(collector: MetricsCollector, config?: Partial<MetricsConfig["archival"]>) {
    this.collector = collector;
    this.config = {
      enabled: true,
      maxAgeDays: 7,
      compressLevel: 9,
      storagePath: join(STATE_DIR_CLAWDBOT, ARCHIVES_DIR),
      ...config,
    };
    this.archivesPath = this.config.storagePath;
    this.recordingsPath = join(STATE_DIR_CLAWDBOT, RECORDINGS_DIR);

    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    if (!existsSync(this.archivesPath)) {
      mkdirSync(this.archivesPath, { recursive: true });
    }
    if (!existsSync(this.recordingsPath)) {
      mkdirSync(this.recordingsPath, { recursive: true });
    }
  }

  /**
   * Archive metrics older than maxAgeDays.
   * Returns the path to the created archive, or empty string if nothing to archive.
   */
  async archiveOldMetrics(maxAgeDays?: number): Promise<string> {
    if (!this.config.enabled) {
      return "";
    }

    const days = maxAgeDays ?? this.config.maxAgeDays;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const oldExecutions = this.collector.getExecutionsBefore(cutoffDate);

    if (oldExecutions.length === 0) {
      console.log("[metrics] No old metrics to archive");
      return "";
    }

    const manifest = this.createManifest(oldExecutions);
    const archiveContent = this.buildArchiveJson(oldExecutions, manifest);

    const filename = `metrics-${Date.now()}.json.gz`;
    const archivePath = join(this.archivesPath, filename);

    try {
      // Write compressed JSON
      await Bun.write(archivePath + ".tmp", archiveContent);

      // Compress with gzip, computing checksum while streaming
      const gzip = createGzip({ level: this.config.compressLevel });
      const hashStream = createHashingStream();
      await pipeline(
        createReadStream(archivePath + ".tmp"),
        gzip,
        hashStream,
        createWriteStream(archivePath),
      );

      // Write checksum sidecar file
      const checksum = hashStream.getChecksum();
      await Bun.write(archivePath + ".sha256", `${checksum}  ${basename(archivePath)}\n`);

      // Clean up temp file
      try {
        unlinkSync(archivePath + ".tmp");
      } catch {
        // Ignore
      }

      // Remove archived executions from collector
      this.collector.removeExecutionsBefore(cutoffDate);

      console.log(
        `[metrics] Archived ${oldExecutions.length} executions to ${archivePath} (sha256: ${checksum.slice(0, 8)}...)`,
      );
      return archivePath;
    } catch (err) {
      console.error("[metrics] Failed to create archive:", err);
      throw err;
    }
  }

  /**
   * Archive old terminal recordings.
   */
  async archiveRecordings(maxAgeDays?: number): Promise<string[]> {
    if (!this.config.enabled) {
      return [];
    }

    const days = maxAgeDays ?? Math.min(3, this.config.maxAgeDays);
    const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;

    let files: string[];
    try {
      files = await readdir(this.recordingsPath);
    } catch {
      return [];
    }

    // Filter files by age asynchronously
    const oldFiles: string[] = [];
    for (const file of files) {
      try {
        const fileStat = await stat(join(this.recordingsPath, file));
        if (fileStat.mtimeMs < cutoffMs) {
          oldFiles.push(file);
        }
      } catch {
        // Skip files we can't stat
      }
    }

    if (oldFiles.length === 0) {
      return [];
    }

    // Archive each recording file individually with gzip
    const archivedFiles: string[] = [];
    for (const file of oldFiles) {
      const srcPath = join(this.recordingsPath, file);
      const destPath = join(this.archivesPath, `recording-${Date.now()}-${file}.gz`);

      try {
        const gzip = createGzip({ level: this.config.compressLevel });
        const hashStream = createHashingStream();
        await pipeline(createReadStream(srcPath), gzip, hashStream, createWriteStream(destPath));

        // Write checksum sidecar file
        const checksum = hashStream.getChecksum();
        await Bun.write(destPath + ".sha256", `${checksum}  ${basename(destPath)}\n`);

        // Delete original
        unlinkSync(srcPath);
        archivedFiles.push(file);
      } catch {
        // Skip failed files
      }
    }

    if (archivedFiles.length > 0) {
      console.log(`[metrics] Archived ${archivedFiles.length} recordings`);
    }
    return archivedFiles;
  }

  /**
   * Extract a metrics archive for analysis.
   */
  async extractArchive(archivePath: string, outputDir: string): Promise<number> {
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = join(outputDir, basename(archivePath).replace(/\.gz$/, ""));

    try {
      const gunzip = createGunzip();

      // Size limiter to prevent decompression bombs
      let totalBytes = 0;
      const sizeLimiter = new Transform({
        transform(chunk, _encoding, callback) {
          totalBytes += chunk.length;
          if (totalBytes > MAX_DECOMPRESSED_SIZE) {
            callback(
              new Error(`Decompressed size exceeds limit of ${MAX_DECOMPRESSED_SIZE} bytes`),
            );
            return;
          }
          callback(null, chunk);
        },
      });

      await pipeline(
        createReadStream(archivePath),
        gunzip,
        sizeLimiter,
        createWriteStream(outputPath),
      );

      console.log(`[metrics] Extracted archive to ${outputPath}`);
      return 1;
    } catch (err) {
      // Clean up partial file on failure
      if (existsSync(outputPath)) {
        try {
          unlinkSync(outputPath);
        } catch {
          // ignore cleanup error
        }
      }
      console.error("[metrics] Failed to extract archive:", err);
      throw err;
    }
  }

  /**
   * List all archives in the storage directory.
   */
  async listArchives(): Promise<
    Array<{ filename: string; path: string; size: number; created: Date; hasChecksum: boolean }>
  > {
    try {
      const files = await readdir(this.archivesPath);
      const gzFiles = files.filter((f) => f.endsWith(".gz") && !f.endsWith(".sha256"));

      const archives = await Promise.all(
        gzFiles.map(async (filename) => {
          const filePath = join(this.archivesPath, filename);
          const fileStat = await stat(filePath);
          const hasChecksum = existsSync(filePath + ".sha256");
          return {
            filename,
            path: filePath,
            size: fileStat.size,
            created: fileStat.birthtime,
            hasChecksum,
          };
        }),
      );

      return archives.sort((a, b) => b.created.getTime() - a.created.getTime());
    } catch {
      return [];
    }
  }

  /**
   * Verify archive integrity using SHA256 checksum.
   * Returns true if checksum matches, false if mismatch, null if no checksum file.
   */
  async verifyArchive(archivePath: string): Promise<boolean | null> {
    const checksumPath = archivePath + ".sha256";
    if (!existsSync(checksumPath)) {
      return null;
    }

    try {
      const checksumContent = await Bun.file(checksumPath).text();
      const expectedChecksum = checksumContent.trim().split(/\s+/)[0];
      if (!expectedChecksum) return null;

      // Stream the file through hasher
      const hasher = new Bun.CryptoHasher("sha256");
      const file = Bun.file(archivePath);
      for await (const chunk of file.stream()) {
        hasher.update(chunk);
      }
      const actualChecksum = hasher.digest("hex");

      return actualChecksum === expectedChecksum;
    } catch (err) {
      console.warn(`[metrics] Failed to verify archive ${archivePath}:`, err);
      return null;
    }
  }

  /**
   * Verify all archives and return integrity report.
   */
  async verifyAllArchives(): Promise<
    Array<{ filename: string; status: "valid" | "invalid" | "no-checksum" | "error" }>
  > {
    const archives = await this.listArchives();
    const results = await Promise.all(
      archives.map(async (archive) => {
        const result = await this.verifyArchive(archive.path);
        let status: "valid" | "invalid" | "no-checksum" | "error";
        if (result === true) status = "valid";
        else if (result === false) status = "invalid";
        else status = "no-checksum";
        return { filename: archive.filename, status };
      }),
    );
    return results;
  }

  /**
   * Delete archives older than specified days.
   */
  async pruneArchives(maxAgeDays: number): Promise<number> {
    const cutoffMs = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
    const archives = await this.listArchives();
    let deleted = 0;

    for (const archive of archives) {
      if (archive.created.getTime() < cutoffMs) {
        try {
          await rm(archive.path);
          // Also delete checksum sidecar if it exists
          if (archive.hasChecksum) {
            await rm(archive.path + ".sha256").catch(() => {});
          }
          deleted++;
        } catch {
          // Ignore deletion failures
        }
      }
    }

    if (deleted > 0) {
      console.log(`[metrics] Pruned ${deleted} old archives`);
    }
    return deleted;
  }

  /**
   * Get total archive storage size.
   */
  async getStorageSize(): Promise<{ count: number; totalBytes: number; totalMB: string }> {
    const archives = await this.listArchives();
    const totalBytes = archives.reduce((sum, a) => sum + a.size, 0);
    return {
      count: archives.length,
      totalBytes,
      totalMB: (totalBytes / 1024 / 1024).toFixed(2),
    };
  }

  private createManifest(executions: SkillExecutionRecord[]): MetricsArchiveManifest {
    const timestamps = executions.map((e) => new Date(e.timestamp).getTime());
    return {
      version: "1.0",
      archivedAt: new Date().toISOString(),
      executionCount: executions.length,
      dateRange: {
        start: new Date(Math.min(...timestamps)).toISOString(),
        end: new Date(Math.max(...timestamps)).toISOString(),
      },
    };
  }

  private buildArchiveJson(
    executions: SkillExecutionRecord[],
    manifest: MetricsArchiveManifest,
  ): string {
    return JSON.stringify(
      {
        manifest,
        executions,
      },
      null,
      2,
    );
  }

  /**
   * Get table-friendly archive list for Bun.inspect.table().
   */
  async getTableData(): Promise<
    Array<{
      Filename: string;
      Size: string;
      Created: string;
    }>
  > {
    const archives = await this.listArchives();
    return archives.map((a) => ({
      Filename: basename(a.filename),
      Size:
        a.size > 1024 * 1024
          ? `${(a.size / 1024 / 1024).toFixed(2)} MB`
          : `${(a.size / 1024).toFixed(2)} KB`,
      Created: a.created.toLocaleString(),
    }));
  }
}
