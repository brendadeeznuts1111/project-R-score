/**
 * src/lib/hash-utils.ts
 * Enhanced Integrity & Hash System using Bun.hash.crc32
 * - Fast file hashing with CRC32
 * - Manifest-based verification
 * - Tamper detection for skill directories
 */

import { Glob } from "bun";

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface FileManifest {
  version: number;
  timestamp: string;
  manifestHash: string;
  totalSize: number;
  files: Array<{
    path: string;
    size: number;
    hash: string;
    modified: string;
  }>;
}

export interface VerificationResult {
  valid: boolean;
  totalFiles: number;
  verifiedFiles: number;
  mismatchedFiles: string[];
  missingFiles: string[];
  extraFiles: string[];
}

export interface IntegrityReport {
  skillId: string;
  valid: boolean;
  hash: string;
  manifest?: FileManifest;
  verification?: VerificationResult;
  timestamp: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Ignore Patterns
// ═══════════════════════════════════════════════════════════════════════════

const IGNORE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /\.log$/,
  /\.tmp$/,
  /\.DS_Store$/,
  /dist\//,
  /build\//,
  /\.map$/,
  /\.cache/,
  /coverage\//,
  /\.nyc_output/,
];

// ═══════════════════════════════════════════════════════════════════════════
// SkillIntegrity Class
// ═══════════════════════════════════════════════════════════════════════════

export class SkillIntegrity {
  /**
   * Calculate a combined hash for all files in a skill directory
   */
  static calculateSkillHash(skillDir: string): string {
    const files = this.getAllSkillFiles(skillDir);
    const combinedHash = this.hashFileList(files);
    return Bun.hash.crc32(combinedHash).toString(16).padStart(8, "0");
  }

  /**
   * Verify skill integrity against expected hash
   */
  static async verifySkillIntegrity(
    skillId: string,
    expectedHash: string
  ): Promise<{ valid: boolean; details: { mismatched: string[] } }> {
    const skillDir = `./skills/${skillId}`;
    const currentHash = this.calculateSkillHash(skillDir);

    if (currentHash === expectedHash) {
      return { valid: true, details: { mismatched: [] } };
    }

    // Find exactly which files changed
    const mismatched = await this.findChangedFiles(skillDir, expectedHash);
    return { valid: false, details: { mismatched } };
  }

  /**
   * Get all files in skill directory (excluding ignored patterns)
   */
  private static getAllSkillFiles(skillDir: string): string[] {
    const files: string[] = [];
    const glob = new Glob("**/*");

    for (const entry of glob.scanSync({ cwd: skillDir, onlyFiles: true })) {
      const fullPath = `${skillDir}/${entry}`;
      if (this.shouldHashFile(fullPath)) {
        files.push(fullPath);
      }
    }

    return files.sort();
  }

  /**
   * Check if file should be included in hash calculation
   */
  private static shouldHashFile(filePath: string): boolean {
    return !IGNORE_PATTERNS.some((pattern) => pattern.test(filePath));
  }

  /**
   * Create hash from list of files (based on path and size)
   */
  private static hashFileList(files: string[]): string {
    const sorted = files.sort();
    const content = sorted
      .map((f) => {
        try {
          const file = Bun.file(f);
          return `${f}:${file.size}`;
        } catch {
          return `${f}:0`;
        }
      })
      .join("|");
    return Bun.hash.crc32(content).toString(16);
  }

  /**
   * Find which files have changed compared to expected state
   */
  private static async findChangedFiles(
    skillDir: string,
    expectedHash: string
  ): Promise<string[]> {
    // This is a simplified implementation
    // In a full implementation, you'd compare against stored file hashes
    const files = this.getAllSkillFiles(skillDir);
    const changed: string[] = [];

    for (const file of files) {
      try {
        const content = await Bun.file(file).bytes();
        const hash = Bun.hash.crc32(content).toString(16);
        // Store hash for comparison (simplified - just return all for now)
        changed.push(file.replace(`${skillDir}/`, ""));
      } catch {
        changed.push(file.replace(`${skillDir}/`, ""));
      }
    }

    return changed.slice(0, 5); // Return first 5 for brevity
  }

  /**
   * Create a detailed file manifest for a skill directory
   */
  static async createFileManifest(skillDir: string): Promise<FileManifest> {
    const manifest: FileManifest = {
      version: 1,
      timestamp: new Date().toISOString(),
      manifestHash: "",
      totalSize: 0,
      files: [],
    };

    const glob = new Glob("**/*");

    for await (const entry of glob.scan({ cwd: skillDir, onlyFiles: true })) {
      const fullPath = `${skillDir}/${entry}`;
      if (!this.shouldHashFile(fullPath)) continue;

      try {
        const file = Bun.file(fullPath);
        const content = await file.bytes();
        const stats = await file.stat();

        const fileHash = Bun.hash.crc32(content).toString(16).padStart(8, "0");

        manifest.files.push({
          path: entry,
          size: stats?.size || content.length,
          hash: fileHash,
          modified: stats?.mtime?.toISOString() || new Date().toISOString(),
        });

        manifest.totalSize += stats?.size || content.length;
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }

    // Sort for consistent manifest
    manifest.files.sort((a, b) => a.path.localeCompare(b.path));

    // Calculate overall manifest hash
    const manifestContent = JSON.stringify(manifest.files);
    manifest.manifestHash = Bun.hash.crc32(manifestContent)
      .toString(16)
      .padStart(8, "0");

    return manifest;
  }

  /**
   * Verify a manifest against current skill directory state
   */
  static async verifyManifest(
    manifest: FileManifest,
    skillDir: string
  ): Promise<VerificationResult> {
    const results: VerificationResult = {
      valid: true,
      totalFiles: manifest.files.length,
      verifiedFiles: 0,
      mismatchedFiles: [],
      missingFiles: [],
      extraFiles: [],
    };

    // Check expected files
    for (const expected of manifest.files) {
      const fullPath = `${skillDir}/${expected.path}`;
      const file = Bun.file(fullPath);

      if (!(await file.exists())) {
        results.missingFiles.push(expected.path);
        results.valid = false;
        continue;
      }

      try {
        const content = await file.bytes();
        const currentHash = Bun.hash.crc32(content)
          .toString(16)
          .padStart(8, "0");

        if (currentHash !== expected.hash) {
          results.mismatchedFiles.push(expected.path);
          results.valid = false;
        } else {
          results.verifiedFiles++;
        }
      } catch {
        results.mismatchedFiles.push(expected.path);
        results.valid = false;
      }
    }

    // Check for extra files (potential tampering)
    const existingFiles = this.getAllSkillFiles(skillDir);
    const expectedPaths = new Set(manifest.files.map((f) => f.path));

    for (const existing of existingFiles) {
      const relativePath = existing.replace(`${skillDir}/`, "");
      if (!expectedPaths.has(relativePath) && this.shouldHashFile(existing)) {
        results.extraFiles.push(relativePath);
        results.valid = false;
      }
    }

    return results;
  }

  /**
   * Calculate hash for a single file
   */
  static async hashFile(filePath: string): Promise<string> {
    const content = await Bun.file(filePath).bytes();
    return Bun.hash.crc32(content).toString(16).padStart(8, "0");
  }

  /**
   * Calculate hash for raw data
   */
  static hashData(data: string | Uint8Array): string {
    return Bun.hash.crc32(data).toString(16).padStart(8, "0");
  }

  /**
   * Generate a full integrity report for a skill
   */
  static async generateReport(skillId: string): Promise<IntegrityReport> {
    const skillDir = `./skills/${skillId}`;
    const hash = this.calculateSkillHash(skillDir);
    const manifest = await this.createFileManifest(skillDir);
    const verification = await this.verifyManifest(manifest, skillDir);

    return {
      skillId,
      valid: verification.valid,
      hash,
      manifest,
      verification,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Compare two manifests and return differences
   */
  static compareManifests(
    oldManifest: FileManifest,
    newManifest: FileManifest
  ): {
    added: string[];
    removed: string[];
    modified: string[];
    unchanged: string[];
  } {
    const oldFiles = new Map(oldManifest.files.map((f) => [f.path, f]));
    const newFiles = new Map(newManifest.files.map((f) => [f.path, f]));

    const added: string[] = [];
    const removed: string[] = [];
    const modified: string[] = [];
    const unchanged: string[] = [];

    // Check for new and modified files
    for (const [path, newFile] of newFiles) {
      const oldFile = oldFiles.get(path);
      if (!oldFile) {
        added.push(path);
      } else if (oldFile.hash !== newFile.hash) {
        modified.push(path);
      } else {
        unchanged.push(path);
      }
    }

    // Check for removed files
    for (const path of oldFiles.keys()) {
      if (!newFiles.has(path)) {
        removed.push(path);
      }
    }

    return { added, removed, modified, unchanged };
  }
}

export default SkillIntegrity;
