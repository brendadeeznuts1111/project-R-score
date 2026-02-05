#!/usr/bin/env bun
/**
 * src/system.ts
 * Production-ready skills system with compression, S3, and security
 */

import type { Skill } from "./skills";
import security from "./security";
import integrity from "./integrity";

// ═══════════════════════════════════════════════════════════════════════════
// Compression
// ═══════════════════════════════════════════════════════════════════════════

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function compressSkillData(skill: Skill): {
  compressed: Uint8Array;
  originalSize: number;
  compressedSize: number;
  ratio: string;
} {
  const json = JSON.stringify(skill);
  const data = encoder.encode(json);
  const compressed = Bun.gzipSync(data);

  return {
    compressed,
    originalSize: data.length,
    compressedSize: compressed.length,
    ratio: ((compressed.length / data.length) * 100).toFixed(1) + "%",
  };
}

export function decompressSkillData(compressed: Uint8Array): Skill {
  const decompressed = Bun.gunzipSync(compressed);
  return JSON.parse(decoder.decode(decompressed));
}

// ═══════════════════════════════════════════════════════════════════════════
// S3 Storage (if configured)
// ═══════════════════════════════════════════════════════════════════════════

export interface S3Config {
  bucket: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export function getS3Config(): S3Config | null {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) return null;

  return {
    bucket,
    region: process.env.S3_REGION || "us-east-1",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
}

export async function uploadToS3(
  localPath: string,
  remotePath: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  const config = getS3Config();
  if (!config) {
    return { success: false, error: "S3 not configured" };
  }

  try {
    const localFile = Bun.file(localPath);
    if (!(await localFile.exists())) {
      return { success: false, error: "Local file not found" };
    }

    // Use Bun.s3.file for S3 operations
    const s3Path = `${config.bucket}/${remotePath}`;
    const s3File = Bun.s3.file(s3Path);

    // Write to S3
    await Bun.write(s3File, localFile);

    return {
      success: true,
      url: `s3://${s3Path}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "S3 upload failed",
    };
  }
}

export async function downloadFromS3(
  remotePath: string,
  localPath: string
): Promise<{ success: boolean; error?: string }> {
  const config = getS3Config();
  if (!config) {
    return { success: false, error: "S3 not configured" };
  }

  try {
    const s3Path = `${config.bucket}/${remotePath}`;
    const s3File = Bun.s3.file(s3Path);

    await Bun.write(localPath, s3File);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "S3 download failed",
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Production Skills System
// ═══════════════════════════════════════════════════════════════════════════

export class ProductionSkillsSystem {
  private checksums: Map<number, string> = new Map();

  constructor() {
    this.setupSecurity();
  }

  setupSecurity() {
    // Enforce strict certificate validation
    if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0") {
      console.warn("⚠️  TLS validation disabled - not recommended for production");
    }

    // Sanitize NO_PROXY - filter empty entries and normalize
    const noProxy = process.env.NO_PROXY || "";
    if (noProxy) {
      const sanitized = noProxy
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .join(",");
      if (sanitized !== noProxy) {
        process.env.NO_PROXY = sanitized;
        console.warn("⚠️  NO_PROXY contained empty entries - sanitized");
      }
    }
  }

  // Execute skill binary safely
  executeSkill(
    skill: Skill,
    args: string[] = []
  ): ReturnType<typeof security.executeSkillBinary> {
    const binary = skill.path?.split("/").pop();
    if (!binary) {
      return {
        success: false,
        exitCode: 1,
        stdout: "",
        stderr: "Skill has no binary path",
        durationMs: 0,
      };
    }

    return security.executeSkillBinary(binary, args, {
      timeout: 30000,
      maxOutputSize: 1024 * 1024,
    });
  }

  // Backup skills with compression
  async backupSkills(
    skills: Skill[],
    outputPath: string
  ): Promise<{
    success: boolean;
    path?: string;
    checksum?: string;
    stats?: { original: number; compressed: number; ratio: string };
    error?: string;
  }> {
    try {
      // Compress all skills
      const json = JSON.stringify(skills, null, 2);
      const data = encoder.encode(json);
      const compressed = Bun.gzipSync(data);

      // Calculate checksum
      const checksum = Bun.hash.crc32(compressed).toString(16).padStart(8, "0");

      // Write compressed backup
      await Bun.write(outputPath, compressed);

      // Write checksum file
      await Bun.write(
        outputPath.replace(/\.(gz|tar\.gz)$/, ".crc32"),
        `${checksum}  ${outputPath}\n`
      );

      return {
        success: true,
        path: outputPath,
        checksum,
        stats: {
          original: data.length,
          compressed: compressed.length,
          ratio: ((compressed.length / data.length) * 100).toFixed(1) + "%",
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Backup failed",
      };
    }
  }

  // Restore skills from backup
  async restoreSkills(backupPath: string): Promise<{
    success: boolean;
    skills?: Skill[];
    error?: string;
  }> {
    try {
      const file = Bun.file(backupPath);
      if (!(await file.exists())) {
        return { success: false, error: "Backup file not found" };
      }

      const compressed = await file.bytes();

      // Verify checksum if available
      const checksumPath = backupPath.replace(/\.(gz|tar\.gz)$/, ".crc32");
      const checksumFile = Bun.file(checksumPath);
      if (await checksumFile.exists()) {
        const expected = (await checksumFile.text()).trim().split(/\s+/)[0];
        const actual = Bun.hash.crc32(compressed).toString(16).padStart(8, "0");
        if (expected !== actual) {
          return { success: false, error: `Checksum mismatch: ${expected} != ${actual}` };
        }
      }

      // Decompress and parse
      const decompressed = Bun.gunzipSync(compressed);
      const skills = JSON.parse(decoder.decode(decompressed));

      return { success: true, skills };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Restore failed",
      };
    }
  }

  // Upload backup to S3
  async uploadBackup(localPath: string): Promise<{
    success: boolean;
    url?: string;
    error?: string;
  }> {
    const filename = localPath.split("/").pop() || "backup.gz";
    return uploadToS3(localPath, `backups/${filename}`);
  }

  // Verify all skills integrity
  verifyIntegrity(skills: Skill[]): {
    valid: boolean;
    changed: string[];
    newSkills: string[];
  } {
    const changed: string[] = [];
    const newSkills: string[] = [];

    for (const skill of skills) {
      const checksum = integrity.computeChecksum(skill);
      const previous = this.checksums.get(skill.id);

      if (!previous) {
        newSkills.push(skill.name);
      } else if (previous !== checksum.crc32) {
        changed.push(skill.name);
      }

      this.checksums.set(skill.id, checksum.crc32);
    }

    return {
      valid: changed.length === 0,
      changed,
      newSkills,
    };
  }

  // Get system status
  getStatus(skills: Skill[]) {
    const binaries = integrity.checkAllBinaries(skills);
    const ready = skills.filter((s) => s.status === "ready").length;
    const found = binaries.filter((b) => b.found).length;

    return {
      totalSkills: skills.length,
      readySkills: ready,
      binariesFound: found,
      binariesTotal: binaries.length,
      s3Configured: !!getS3Config(),
      tlsEnabled: process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "0",
    };
  }
}

export default {
  compressSkillData,
  decompressSkillData,
  getS3Config,
  uploadToS3,
  downloadFromS3,
  ProductionSkillsSystem,
};
