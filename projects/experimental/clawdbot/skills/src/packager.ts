#!/usr/bin/env bun
/**
 * src/packager.ts
 * Skill packaging system for portable skill distribution
 * - Create compressed skill packages (.skpkg)
 * - Verify and import packages
 * - Dependency resolution
 * - Version management
 */

import type { Skill } from "./skills";
import integrity from "./integrity";

// Reusable encoders for performance
const encoder = new TextEncoder();
const decoder = new TextDecoder();

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface PackageManifest {
  version: "1.0";
  name: string;
  description: string;
  created: string;
  author?: string;
  skills: string[];
  dependencies: PackageDependency[];
  checksums: Record<string, string>;
  masterChecksum: string;
  compression: "gzip" | "none";
  size: {
    original: number;
    compressed: number;
    ratio: string;
  };
}

export interface PackageDependency {
  name: string;
  type: "binary" | "env" | "config";
  required: boolean;
  description?: string;
}

export interface PackageResult {
  success: boolean;
  path?: string;
  manifest?: PackageManifest;
  error?: string;
  stats?: {
    skillCount: number;
    originalSize: number;
    compressedSize: number;
    ratio: string;
    timeMs: number;
  };
}

export interface ImportResult {
  success: boolean;
  skills?: Skill[];
  manifest?: PackageManifest;
  warnings?: string[];
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// SkillPackager Class
// ═══════════════════════════════════════════════════════════════════════════

export class SkillPackager {
  private outputDir: string;

  constructor(outputDir: string = "./packages") {
    this.outputDir = outputDir;
  }

  /**
   * Package skills into a distributable .skpkg file
   */
  async package(
    skills: Skill[],
    options: {
      name: string;
      description?: string;
      author?: string;
      includeOptional?: boolean;
    }
  ): Promise<PackageResult> {
    const start = performance.now();

    try {
      // Collect dependencies from skills
      const dependencies = this.collectDependencies(skills, options.includeOptional);

      // Compute checksums for each skill
      const checksums: Record<string, string> = {};
      for (const skill of skills) {
        const checksum = integrity.computeChecksum(skill);
        checksums[skill.name] = checksum.crc32;
      }

      // Compute master checksum
      const masterChecksum = integrity.computeMasterChecksum(skills);

      // Serialize skills data
      const skillsJson = JSON.stringify(skills, null, 2);
      const originalData = encoder.encode(skillsJson);

      // Compress
      const compressedData = Bun.gzipSync(originalData);

      // Create manifest
      const manifest: PackageManifest = {
        version: "1.0",
        name: options.name,
        description: options.description || `Package containing ${skills.length} skills`,
        created: new Date().toISOString(),
        author: options.author,
        skills: skills.map((s) => s.name),
        dependencies,
        checksums,
        masterChecksum,
        compression: "gzip",
        size: {
          original: originalData.length,
          compressed: compressedData.length,
          ratio: ((compressedData.length / originalData.length) * 100).toFixed(1) + "%",
        },
      };

      // Create package structure
      const packageData = {
        manifest,
        data: Buffer.from(compressedData).toString("base64"),
      };

      // Ensure output directory exists
      const dir = Bun.file(this.outputDir);
      try {
        await Bun.write(`${this.outputDir}/.keep`, "");
      } catch {
        // Directory creation handled by write
      }

      // Write package file
      const packagePath = `${this.outputDir}/${options.name}.skpkg`;
      const packageJson = JSON.stringify(packageData, null, 2);
      await Bun.write(packagePath, packageJson);

      // Write checksum file
      const packageBytes = new TextEncoder().encode(packageJson);
      const packageChecksum = Bun.hash.crc32(packageBytes).toString(16).padStart(8, "0");
      await Bun.write(`${packagePath}.crc32`, `${packageChecksum}  ${options.name}.skpkg\n`);

      const timeMs = performance.now() - start;

      return {
        success: true,
        path: packagePath,
        manifest,
        stats: {
          skillCount: skills.length,
          originalSize: originalData.length,
          compressedSize: compressedData.length,
          ratio: manifest.size.ratio,
          timeMs,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Package creation failed",
      };
    }
  }

  /**
   * Import skills from a .skpkg file
   */
  async import(packagePath: string): Promise<ImportResult> {
    try {
      const file = Bun.file(packagePath);
      if (!(await file.exists())) {
        return { success: false, error: "Package file not found" };
      }

      // Read and parse package
      const packageJson = await file.text();
      const packageData = JSON.parse(packageJson);

      if (!packageData.manifest || !packageData.data) {
        return { success: false, error: "Invalid package format" };
      }

      const manifest: PackageManifest = packageData.manifest;
      const warnings: string[] = [];

      // Verify package checksum if available
      const checksumPath = `${packagePath}.crc32`;
      const checksumFile = Bun.file(checksumPath);
      if (await checksumFile.exists()) {
        const expected = (await checksumFile.text()).trim().split(/\s+/)[0];
        const packageBytes = new TextEncoder().encode(packageJson);
        const actual = Bun.hash.crc32(packageBytes).toString(16).padStart(8, "0");
        if (expected !== actual) {
          return { success: false, error: `Package checksum mismatch: ${expected} != ${actual}` };
        }
      } else {
        warnings.push("No checksum file found - integrity not verified");
      }

      // Decode and decompress data
      const compressedData = Buffer.from(packageData.data, "base64");
      const decompressedData = Bun.gunzipSync(compressedData);
      const skillsJson = decoder.decode(decompressedData);
      const skills: Skill[] = JSON.parse(skillsJson);

      // Verify master checksum
      const computedMaster = integrity.computeMasterChecksum(skills);
      if (computedMaster !== manifest.masterChecksum) {
        return {
          success: false,
          error: `Data integrity check failed: ${computedMaster} != ${manifest.masterChecksum}`,
        };
      }

      // Verify individual skill checksums
      for (const skill of skills) {
        const checksum = integrity.computeChecksum(skill);
        const expected = manifest.checksums[skill.name];
        if (expected && checksum.crc32 !== expected) {
          warnings.push(`Skill '${skill.name}' checksum mismatch`);
        }
      }

      // Check dependencies
      const missingDeps = this.checkDependencies(manifest.dependencies);
      if (missingDeps.length > 0) {
        warnings.push(`Missing dependencies: ${missingDeps.join(", ")}`);
      }

      return {
        success: true,
        skills,
        manifest,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Import failed",
      };
    }
  }

  /**
   * Verify a package without importing
   */
  async verify(packagePath: string): Promise<{
    valid: boolean;
    manifest?: PackageManifest;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      const file = Bun.file(packagePath);
      if (!(await file.exists())) {
        return { valid: false, issues: ["Package file not found"] };
      }

      const packageJson = await file.text();
      const packageData = JSON.parse(packageJson);

      if (!packageData.manifest) {
        issues.push("Missing manifest");
      }
      if (!packageData.data) {
        issues.push("Missing data");
      }

      if (issues.length > 0) {
        return { valid: false, issues };
      }

      const manifest: PackageManifest = packageData.manifest;

      // Verify checksum file
      const checksumPath = `${packagePath}.crc32`;
      const checksumFile = Bun.file(checksumPath);
      if (await checksumFile.exists()) {
        const expected = (await checksumFile.text()).trim().split(/\s+/)[0];
        const packageBytes = new TextEncoder().encode(packageJson);
        const actual = Bun.hash.crc32(packageBytes).toString(16).padStart(8, "0");
        if (expected !== actual) {
          issues.push(`Package checksum mismatch: expected ${expected}, got ${actual}`);
        }
      } else {
        issues.push("No checksum file found");
      }

      // Try to decompress and verify data
      try {
        const compressedData = Buffer.from(packageData.data, "base64");
        const decompressedData = Bun.gunzipSync(compressedData);
        const skillsJson = decoder.decode(decompressedData);
        const skills: Skill[] = JSON.parse(skillsJson);

        // Verify master checksum
        const computedMaster = integrity.computeMasterChecksum(skills);
        if (computedMaster !== manifest.masterChecksum) {
          issues.push(`Master checksum mismatch: expected ${manifest.masterChecksum}, got ${computedMaster}`);
        }

        // Verify skill count
        if (skills.length !== manifest.skills.length) {
          issues.push(`Skill count mismatch: expected ${manifest.skills.length}, got ${skills.length}`);
        }
      } catch (e) {
        issues.push(`Data verification failed: ${e instanceof Error ? e.message : "unknown error"}`);
      }

      return {
        valid: issues.length === 0,
        manifest,
        issues,
      };
    } catch (error) {
      return {
        valid: false,
        issues: [error instanceof Error ? error.message : "Verification failed"],
      };
    }
  }

  /**
   * List contents of a package
   */
  async list(packagePath: string): Promise<{
    success: boolean;
    manifest?: PackageManifest;
    error?: string;
  }> {
    try {
      const file = Bun.file(packagePath);
      if (!(await file.exists())) {
        return { success: false, error: "Package file not found" };
      }

      const packageJson = await file.text();
      const packageData = JSON.parse(packageJson);

      if (!packageData.manifest) {
        return { success: false, error: "Invalid package format" };
      }

      return {
        success: true,
        manifest: packageData.manifest,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "List failed",
      };
    }
  }

  /**
   * Collect dependencies from skills
   */
  private collectDependencies(skills: Skill[], includeOptional = false): PackageDependency[] {
    const deps: PackageDependency[] = [];
    const seen = new Set<string>();

    for (const skill of skills) {
      for (const missing of skill.missing) {
        if (missing.startsWith("bins:")) {
          const binary = missing.replace("bins:", "").trim();
          if (!seen.has(`bin:${binary}`)) {
            seen.add(`bin:${binary}`);
            deps.push({
              name: binary,
              type: "binary",
              required: skill.status === "bin",
              description: `Required by ${skill.name}`,
            });
          }
        } else if (missing.startsWith("env:")) {
          const envVars = missing.replace("env:", "").trim().split(",");
          for (const envVar of envVars) {
            const trimmed = envVar.trim();
            if (!seen.has(`env:${trimmed}`)) {
              seen.add(`env:${trimmed}`);
              deps.push({
                name: trimmed,
                type: "env",
                required: skill.status === "env",
                description: `Required by ${skill.name}`,
              });
            }
          }
        } else if (missing.startsWith("config:")) {
          const config = missing.replace("config:", "").trim();
          if (!seen.has(`config:${config}`)) {
            seen.add(`config:${config}`);
            deps.push({
              name: config,
              type: "config",
              required: skill.status === "config",
              description: `Required by ${skill.name}`,
            });
          }
        }
      }
    }

    // Filter optional if not included
    if (!includeOptional) {
      return deps.filter((d) => d.required);
    }

    return deps;
  }

  /**
   * Check which dependencies are missing
   */
  private checkDependencies(deps: PackageDependency[]): string[] {
    const missing: string[] = [];

    for (const dep of deps) {
      if (!dep.required) continue;

      switch (dep.type) {
        case "binary": {
          const result = Bun.spawnSync(["which", dep.name]);
          if (result.exitCode !== 0) {
            missing.push(`binary:${dep.name}`);
          }
          break;
        }
        case "env": {
          if (!process.env[dep.name]) {
            missing.push(`env:${dep.name}`);
          }
          break;
        }
        case "config": {
          // Config checks would need access to config file
          // For now, just note it
          break;
        }
      }
    }

    return missing;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Display Functions
// ═══════════════════════════════════════════════════════════════════════════

export function displayPackageInfo(manifest: PackageManifest) {
  console.log("\n" + "═".repeat(60));
  console.log("📦 PACKAGE INFO");
  console.log("═".repeat(60));

  const info = [
    { Field: "Name", Value: manifest.name },
    { Field: "Description", Value: manifest.description },
    { Field: "Version", Value: manifest.version },
    { Field: "Created", Value: manifest.created },
    { Field: "Author", Value: manifest.author || "—" },
    { Field: "Skills", Value: manifest.skills.length.toString() },
    { Field: "Compression", Value: manifest.compression },
    { Field: "Size", Value: `${manifest.size.compressed}B (${manifest.size.ratio} of original)` },
    { Field: "Master CRC32", Value: manifest.masterChecksum },
  ];

  console.log(Bun.inspect.table(info, { colors: true }));

  if (manifest.skills.length > 0) {
    console.log("\nIncluded Skills:");
    manifest.skills.forEach((s) => console.log(`  - ${s}`));
  }

  if (manifest.dependencies.length > 0) {
    console.log("\nDependencies:");
    const deps = manifest.dependencies.map((d) => ({
      Name: d.name,
      Type: d.type,
      Required: d.required ? "✅" : "○",
    }));
    console.log(Bun.inspect.table(deps, { colors: true }));
  }
}

export function displayPackageResult(result: PackageResult) {
  if (result.success) {
    console.log("\n✅ Package created successfully!");
    console.log(`   Path: ${result.path}`);
    if (result.stats) {
      console.log(`   Skills: ${result.stats.skillCount}`);
      console.log(`   Size: ${result.stats.originalSize}B → ${result.stats.compressedSize}B (${result.stats.ratio})`);
      console.log(`   Time: ${result.stats.timeMs.toFixed(2)}ms`);
    }
  } else {
    console.log("\n❌ Package creation failed!");
    console.log(`   Error: ${result.error}`);
  }
}

export default {
  SkillPackager,
  displayPackageInfo,
  displayPackageResult,
};
