/**
 * Integrity governance using Bun's cryptographic hashing
 * 
 * Checks file integrity, detects unauthorized changes, and maintains audit trails
 */

import { existsSync } from "fs";
import type { GovernanceResult, GovernanceViolation } from "../governance.js";
import {
  hashFileSync,
  computeHash,
  generateIntegrityReport,
  createAuditEntry,
} from "../../src/utils/integrity.js";
import { getLogger } from "../../src/utils/logger.js";

const logger = getLogger();

export class IntegrityGovernance {
  private integrityManifestPath = ".governance-integrity.json";
  private rules = {
    requireManifest: true,
    trackedPatterns: [
      "src/**/*.{ts,js}",
      "packages/**/*.{ts,js}",
      "scripts/**/*.{ts,js}",
      "config/**/*.json",
    ],
    excludePatterns: [
      "**/*.test.ts",
      "**/node_modules/**",
      "**/dist/**",
      "**/.governance-integrity.json",
    ],
  };

  async check(): Promise<GovernanceResult> {
    const violations: GovernanceViolation[] = [];

    if (!existsSync(this.integrityManifestPath)) {
      if (this.rules.requireManifest) {
        violations.push({
          file: this.integrityManifestPath,
          rule: "missing-integrity-manifest",
          message: "Integrity manifest not found. Run 'bun run governance:integrity:generate' to create it.",
          severity: "error",
        });
      }
      
      if (violations.length === 0 || violations[0].severity === "warning") {
        logger.info("Generating initial integrity manifest...");
        await this.generateManifest();
        return { passed: true, violations: [] };
      }
      
      return { passed: false, violations };
    }

    const manifest = await this.loadManifest();
    if (!manifest) {
      violations.push({
        file: this.integrityManifestPath,
        rule: "invalid-integrity-manifest",
        message: "Integrity manifest is corrupted or invalid",
        severity: "error",
      });
      return { passed: false, violations };
    }

    const manifestValid = this.verifyManifestIntegrity(manifest);
    if (!manifestValid) {
      violations.push({
        file: this.integrityManifestPath,
        rule: "manifest-tampered",
        message: "Integrity manifest has been tampered with!",
        severity: "error",
      });
    }

    const trackedFiles = await this.getTrackedFiles();
    const fileViolations = await this.checkFiles(trackedFiles, manifest);
    violations.push(...fileViolations);

    return {
      passed: violations.filter((v) => v.severity === "error").length === 0,
      violations,
    };
  }

  private async getTrackedFiles(): Promise<string[]> {
    const files: string[] = [];
    
    for (const pattern of this.rules.trackedPatterns) {
      const globber = new Bun.Glob(pattern);
      for (const file of globber.scan({
        cwd: process.cwd(),
        onlyFiles: true,
      })) {
        const shouldExclude = this.rules.excludePatterns.some((excludePattern) => {
          const excludeGlobber = new Bun.Glob(excludePattern);
          return excludeGlobber.match(file);
        });
        
        if (!shouldExclude && existsSync(file)) {
          files.push(file);
        }
      }
    }
    
    return files.sort();
  }

  private async checkFiles(
    files: string[],
    manifest: IntegrityManifest
  ): Promise<GovernanceViolation[]> {
    const violations: GovernanceViolation[] = [];
    
    for (const file of files) {
      if (!existsSync(file)) {
        if (manifest.files[file]) {
          violations.push({
            file,
            rule: "file-deleted",
            message: `File was deleted but still tracked in manifest: ${file}`,
            severity: "warning",
          });
        }
        continue;
      }

      try {
        const currentIntegrity = hashFileSync(file, "blake3");
        const recordedIntegrity = manifest.files[file];

        if (!recordedIntegrity) {
          violations.push({
            file,
            rule: "untracked-file",
            message: `New file detected: ${file}. Run 'bun run governance:integrity:generate' to update manifest.`,
            severity: "warning",
          });
        } else if (recordedIntegrity.hash !== currentIntegrity.hash) {
          violations.push({
            file,
            rule: "file-modified",
            message: `File was modified: ${file}. Expected hash: ${recordedIntegrity.hash.substring(0, 16)}..., got: ${currentIntegrity.hash.substring(0, 16)}...`,
            severity: "error",
          });
        }
      } catch (error) {
        violations.push({
          file,
          rule: "hash-computation-error",
          message: `Failed to compute hash: ${error instanceof Error ? error.message : String(error)}`,
          severity: "error",
        });
      }
    }

    return violations;
  }

  async generateManifest(): Promise<void> {
    const files = await this.getTrackedFiles();
    logger.info(`Generating integrity manifest for ${files.length} files...`);

    const report = await generateIntegrityReport(files, "blake3");

    const manifest: IntegrityManifest = {
      version: "1.0",
      generatedAt: report.generatedAt,
      reportHash: report.reportHash,
      files: {},
    };

    for (const file of report.files) {
      manifest.files[file.path] = {
        hash: file.hash,
        size: file.size,
        modified: file.modified,
      };
    }

    const manifestJson = JSON.stringify(manifest, null, 2);
    const manifestHash = computeHash(manifestJson, "blake3");

    const finalManifest: IntegrityManifest = {
      ...manifest,
      manifestHash,
    };

    await Bun.write(this.integrityManifestPath, JSON.stringify(finalManifest, null, 2));
    
    const auditEntry = createAuditEntry("generate-manifest", files, {
      fileCount: files.length,
      manifestHash,
    });

    logger.info(`✅ Integrity manifest generated with ${files.length} files`);
    logger.info(`   Manifest hash: ${manifestHash.substring(0, 16)}...`);
    logger.info(`   Audit entry: ${auditEntry.entryHash.substring(0, 16)}...`);
  }

  private async loadManifest(): Promise<IntegrityManifest | null> {
    try {
      const file = Bun.file(this.integrityManifestPath);
      return await file.json() as IntegrityManifest;
    } catch (error) {
      logger.error("Failed to load integrity manifest", error as Error);
      return null;
    }
  }

  private verifyManifestIntegrity(manifest: IntegrityManifest): boolean {
    const { manifestHash, ...manifestWithoutHash } = manifest;
    const manifestJson = JSON.stringify(manifestWithoutHash);
    const computedHash = computeHash(manifestJson, "blake3");
    
    return computedHash === manifestHash;
  }
}

interface IntegrityManifest {
  version: string;
  generatedAt: number;
  reportHash: string;
  manifestHash: string;
  files: Record<
    string,
    {
      hash: string;
      size: number;
      modified: number;
    }
  >;
}

