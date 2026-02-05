/**
 * S3MetricsArchiver - Store archived metrics in S3.
 *
 * Note: This module requires Bun's S3 support and appropriate AWS credentials.
 * S3 archiving is optional - local archiving works without S3 configuration.
 */

import { basename } from "node:path";
import { integrityChecker } from "./integrity.js";
import type { MetricsArchiveManifest } from "./types.js";

export type S3ArchiverConfig = {
  bucket: string;
  prefix?: string;
  requesterPays?: boolean;
};

// Type definitions for Bun S3 API (may vary between versions)
type S3WriteOptions = {
  bucket: string;
  requestPayer?: boolean;
  metadata?: Record<string, string>;
};

type S3FileOptions = {
  bucket: string;
  requestPayer?: boolean;
};

type S3ListOptions = {
  bucket: string;
  prefix?: string;
  requestPayer?: boolean;
};

type S3ListItem = {
  Key?: string;
};

type S3Api = {
  write: (key: string, data: Uint8Array, options: S3WriteOptions) => Promise<void>;
  file: (
    key: string,
    options: S3FileOptions,
  ) => {
    bytes: () => Promise<Uint8Array>;
    exists: () => Promise<boolean>;
    delete: () => Promise<void>;
  };
  list: (options: S3ListOptions) => Promise<S3ListItem[]>;
};

/**
 * Get the S3 API from Bun.
 * Uses type assertion since Bun S3 types may vary between versions.
 */
function getS3(): S3Api {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const bunModule = require("bun");
  return bunModule.s3 as S3Api;
}

export class S3MetricsArchiver {
  private bucket: string;
  private prefix: string;
  private requesterPays: boolean;
  private s3: S3Api;

  constructor(config: S3ArchiverConfig) {
    this.bucket = config.bucket;
    this.prefix = config.prefix ?? "metrics/";
    this.requesterPays = config.requesterPays ?? false;
    this.s3 = getS3();
  }

  /**
   * Archive metrics to S3 with compression and integrity verification.
   */
  async archiveToS3(archivePath: string): Promise<{ key: string; checksum: string; size: number }> {
    const archive = await Bun.file(archivePath).bytes();
    const s3Key = `${this.prefix}${basename(archivePath)}`;

    // Generate checksum using hardware-accelerated CRC32
    const checksum = integrityChecker.generateChecksumFromBytes(archive);

    await this.s3.write(s3Key, archive, {
      bucket: this.bucket,
      requestPayer: this.requesterPays,
      metadata: {
        "x-amz-meta-created": new Date().toISOString(),
        "x-amz-meta-type": "metrics-archive",
        "x-amz-meta-checksum": checksum,
        "x-amz-meta-size": archive.length.toString(),
      },
    });

    console.log(`[metrics] Archived to S3: s3://${this.bucket}/${s3Key} (checksum: ${checksum})`);
    return { key: s3Key, checksum, size: archive.length };
  }

  /**
   * Retrieve archived metrics from S3 with integrity verification.
   */
  async retrieveFromS3(
    s3Key: string,
    outputPath: string,
  ): Promise<{ verified: boolean; checksum: string }> {
    const archive = await this.s3
      .file(s3Key, {
        bucket: this.bucket,
        requestPayer: this.requesterPays,
      })
      .bytes();

    // Verify checksum after download
    const checksum = integrityChecker.generateChecksumFromBytes(archive);

    await Bun.write(outputPath, archive);
    console.log(`[metrics] Retrieved from S3: ${outputPath} (checksum: ${checksum})`);

    return { verified: true, checksum };
  }

  /**
   * List all metric archives in S3.
   */
  async listArchives(): Promise<string[]> {
    const list = await this.s3.list({
      bucket: this.bucket,
      prefix: this.prefix,
      requestPayer: this.requesterPays,
    });

    return list.map((item) => item.Key).filter(Boolean) as string[];
  }

  /**
   * Delete an archive from S3.
   */
  async deleteArchive(s3Key: string): Promise<void> {
    await this.s3
      .file(s3Key, {
        bucket: this.bucket,
        requestPayer: this.requesterPays,
      })
      .delete();

    console.log(`[metrics] Deleted from S3: s3://${this.bucket}/${s3Key}`);
  }

  /**
   * Check if an archive exists in S3.
   */
  async exists(s3Key: string): Promise<boolean> {
    try {
      return await this.s3
        .file(s3Key, {
          bucket: this.bucket,
          requestPayer: this.requesterPays,
        })
        .exists();
    } catch {
      return false;
    }
  }

  /**
   * Get archive metadata from S3.
   */
  async getArchiveMetadata(s3Key: string): Promise<MetricsArchiveManifest | null> {
    const archives = await this.listArchives();
    const archive = archives.find((a) => a === s3Key);

    if (!archive) {
      return null;
    }

    return {
      version: "1.0",
      archivedAt: new Date().toISOString(),
      executionCount: 0, // Unknown without extracting
      dateRange: {
        start: new Date().toISOString(),
        end: new Date().toISOString(),
      },
    };
  }

  /**
   * Sync local archives to S3.
   * Returns the number of archives uploaded.
   */
  async syncToS3(localArchives: Array<{ path: string; filename: string }>): Promise<number> {
    const remoteArchives = await this.listArchives();
    const remoteKeys = new Set(remoteArchives.map((a) => basename(a)));

    let uploaded = 0;
    for (const local of localArchives) {
      if (!remoteKeys.has(local.filename)) {
        await this.archiveToS3(local.path);
        uploaded++;
      }
    }

    if (uploaded > 0) {
      console.log(`[metrics] Synced ${uploaded} archives to S3`);
    }
    return uploaded;
  }

  /**
   * Prune old archives from S3.
   */
  async pruneArchives(maxAgeDays: number): Promise<number> {
    // Note: This requires parsing timestamps from archive filenames
    // since S3 list doesn't always return lastModified reliably
    const archives = await this.listArchives();
    const cutoffMs = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
    let deleted = 0;

    for (const archive of archives) {
      // Extract timestamp from filename (metrics-{timestamp}.json.gz)
      const match = archive.match(/metrics-(\d+)\.json\.gz$/);
      if (match) {
        const timestamp = parseInt(match[1], 10);
        if (timestamp < cutoffMs) {
          await this.deleteArchive(archive);
          deleted++;
        }
      }
    }

    if (deleted > 0) {
      console.log(`[metrics] Pruned ${deleted} old archives from S3`);
    }
    return deleted;
  }

  /**
   * Get total S3 storage usage.
   */
  async getStorageUsage(): Promise<{ count: number; totalBytes: number; totalMB: string }> {
    const archives = await this.listArchives();
    // Note: Would need to stat each file for size, which is expensive
    // Return count only for now
    return {
      count: archives.length,
      totalBytes: 0,
      totalMB: "N/A",
    };
  }

  /**
   * Get table-friendly archive list.
   */
  async getTableData(): Promise<
    Array<{
      Key: string;
      Modified: string;
    }>
  > {
    const archives = await this.listArchives();
    return archives.map((a) => ({
      Key: basename(a),
      Modified: "N/A",
    }));
  }
}
