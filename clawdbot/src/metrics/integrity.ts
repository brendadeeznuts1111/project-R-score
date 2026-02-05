/**
 * MetricsIntegrityChecker - Data integrity verification using hardware-accelerated CRC32.
 * Bun's CRC32 is ~20x faster with hardware acceleration (~9 GB/s throughput).
 * Uses async Bun.file() for non-blocking I/O.
 */

import { existsSync } from "node:fs";

export type IntegrityData<T> = {
  checksum: string;
  generatedAt: string;
  data: T;
};

export class MetricsIntegrityChecker {
  /**
   * Generate CRC32 checksum for any data.
   * Uses hardware acceleration when available (20x faster).
   */
  generateChecksum(data: unknown): string {
    const json = JSON.stringify(data);
    const buffer = Buffer.from(json);
    const hash = Bun.hash.crc32(buffer);
    return hash.toString(16).padStart(8, "0");
  }

  /**
   * Generate checksum from raw bytes.
   */
  generateChecksumFromBytes(bytes: Uint8Array): string {
    const hash = Bun.hash.crc32(bytes);
    return hash.toString(16).padStart(8, "0");
  }

  /**
   * Wrap data with integrity checksum.
   */
  wrapWithChecksum<T>(data: T): IntegrityData<T> {
    return {
      checksum: this.generateChecksum(data),
      generatedAt: new Date().toISOString(),
      data,
    };
  }

  /**
   * Verify data integrity.
   */
  verify<T>(wrapped: IntegrityData<T>): { valid: boolean; expected: string; actual: string } {
    const actual = this.generateChecksum(wrapped.data);
    return {
      valid: actual === wrapped.checksum,
      expected: wrapped.checksum,
      actual,
    };
  }

  /**
   * Store data with integrity verification.
   */
  async storeWithChecksum<T>(data: T, path: string): Promise<{ checksum: string; size: number }> {
    const wrapped = this.wrapWithChecksum(data);
    const json = JSON.stringify(wrapped, null, 2);

    await Bun.write(path, json);

    console.log(`[integrity] Stored with checksum: ${wrapped.checksum}`);

    return {
      checksum: wrapped.checksum,
      size: Buffer.byteLength(json),
    };
  }

  /**
   * Load and verify data from storage.
   */
  async loadAndVerify<T>(path: string): Promise<{ data: T; valid: boolean; checksum: string }> {
    if (!existsSync(path)) {
      throw new Error(`File not found: ${path}`);
    }

    const content = await Bun.file(path).text();
    const wrapped = JSON.parse(content) as IntegrityData<T>;

    const result = this.verify(wrapped);

    if (!result.valid) {
      console.error(`[integrity] Checksum mismatch for ${path}`);
      console.error(`  Expected: ${result.expected}`);
      console.error(`  Actual:   ${result.actual}`);
    }

    return {
      data: wrapped.data,
      valid: result.valid,
      checksum: wrapped.checksum,
    };
  }

  /**
   * Verify file integrity without loading full data.
   */
  async verifyFile(path: string): Promise<boolean> {
    try {
      const content = await Bun.file(path).text();
      const wrapped = JSON.parse(content) as IntegrityData<unknown>;
      const result = this.verify(wrapped);
      return result.valid;
    } catch {
      return false;
    }
  }

  /**
   * Generate checksum manifest for multiple files.
   */
  generateManifest(files: Array<{ path: string; data: unknown }>): Record<string, string> {
    const manifest: Record<string, string> = {};

    for (const file of files) {
      manifest[file.path] = this.generateChecksum(file.data);
    }

    return manifest;
  }

  /**
   * Verify files against a manifest.
   */
  async verifyManifest(
    manifest: Record<string, string>,
    loadFile: (path: string) => Promise<unknown>,
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    for (const [path, expectedChecksum] of Object.entries(manifest)) {
      try {
        const data = await loadFile(path);
        const actualChecksum = this.generateChecksum(data);

        if (actualChecksum !== expectedChecksum) {
          errors.push(`${path}: expected ${expectedChecksum}, got ${actualChecksum}`);
        }
      } catch (err) {
        errors.push(
          `${path}: failed to load - ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create a signed data package with metadata.
   */
  createSignedPackage<T>(
    data: T,
    metadata: Record<string, string> = {},
  ): {
    data: T;
    signature: {
      checksum: string;
      algorithm: string;
      timestamp: string;
      metadata: Record<string, string>;
    };
  } {
    return {
      data,
      signature: {
        checksum: this.generateChecksum(data),
        algorithm: "crc32",
        timestamp: new Date().toISOString(),
        metadata,
      },
    };
  }
}

// Singleton instance for convenience
export const integrityChecker = new MetricsIntegrityChecker();
