// [1.0.0.0] Version Management System - Bun Native
// Handles semantic versioning, build metadata, and version comparison
// Supports: Major.Minor.Patch+BuildMetadata format

import { readFileSync } from "fs";
import { join } from "path";

/**
 * [1.1.0.0] Semantic Version Interface
 * Represents a complete version with metadata
 */
export interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  buildMetadata?: string;
}

/**
 * [1.2.0.0] Version Parser
 * Parses version strings into structured format
 */
export class VersionParser {
  /**
   * Parse semantic version string
   * Format: major.minor.patch[-prerelease][+buildMetadata]
   * Examples: "1.0.0", "2.1.3-alpha", "1.0.0+abc123"
   */
  static parse(versionString: string): SemanticVersion {
    const match = versionString.match(
      /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.-]+))?(?:\+([a-zA-Z0-9.-]+))?$/
    );

    if (!match) {
      throw new Error(`Invalid version format: ${versionString}`);
    }

    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
      prerelease: match[4],
      buildMetadata: match[5],
    };
  }

  /**
   * Format version object to string
   */
  static format(version: SemanticVersion): string {
    let result = `${version.major}.${version.minor}.${version.patch}`;
    if (version.prerelease) {
      result += `-${version.prerelease}`;
    }
    if (version.buildMetadata) {
      result += `+${version.buildMetadata}`;
    }
    return result;
  }
}

/**
 * [1.3.0.0] Version Comparator
 * Compares semantic versions
 */
export class VersionComparator {
  /**
   * Compare two versions
   * Returns: -1 (v1 < v2), 0 (v1 == v2), 1 (v1 > v2)
   */
  static compare(v1: SemanticVersion, v2: SemanticVersion): number {
    if (v1.major !== v2.major) return v1.major > v2.major ? 1 : -1;
    if (v1.minor !== v2.minor) return v1.minor > v2.minor ? 1 : -1;
    if (v1.patch !== v2.patch) return v1.patch > v2.patch ? 1 : -1;

    // Prerelease versions have lower precedence
    if (v1.prerelease && !v2.prerelease) return -1;
    if (!v1.prerelease && v2.prerelease) return 1;
    if (v1.prerelease && v2.prerelease) {
      return v1.prerelease.localeCompare(v2.prerelease);
    }

    return 0;
  }

  static isGreater(v1: SemanticVersion, v2: SemanticVersion): boolean {
    return this.compare(v1, v2) > 0;
  }

  static isLess(v1: SemanticVersion, v2: SemanticVersion): boolean {
    return this.compare(v1, v2) < 0;
  }

  static isEqual(v1: SemanticVersion, v2: SemanticVersion): boolean {
    return this.compare(v1, v2) === 0;
  }
}

/**
 * [1.4.0.0] Version Manager
 * Reads version from package.json and environment
 */
export class VersionManager {
  private static packageVersion: string | null = null;
  private static buildMetadata: string | null = null;

  /**
   * Get version from package.json
   */
  static getPackageVersion(packagePath?: string): string {
    if (this.packageVersion) return this.packageVersion;

    try {
      const path = packagePath || join(process.cwd(), "package.json");
      const content = readFileSync(path, "utf-8");
      const pkg = JSON.parse(content);
      this.packageVersion = pkg.version || "0.0.0";
      return this.packageVersion;
    } catch (error) {
      console.warn("Failed to read package.json version:", error);
      return "0.0.0";
    }
  }

  /**
   * Get build metadata from environment or git
   */
  static getBuildMetadata(): string {
    if (this.buildMetadata) return this.buildMetadata;

    // Try environment variable first
    if (process.env.BUILD_METADATA) {
      this.buildMetadata = process.env.BUILD_METADATA;
      return this.buildMetadata;
    }

    // Try to get git commit hash
    try {
      const commitHash = Bun.spawnSync(["git", "rev-parse", "--short", "HEAD"], {
        cwd: process.cwd(),
      }).stdout.toString().trim();

      if (commitHash) {
        this.buildMetadata = commitHash;
        return this.buildMetadata;
      }
    } catch (error) {
      // Git not available
    }

    // Fallback to timestamp
    this.buildMetadata = `build-${Date.now()}`;
    return this.buildMetadata;
  }

  /**
   * Get complete version string with metadata
   */
  static getFullVersion(packagePath?: string): string {
    const version = this.getPackageVersion(packagePath);
    const metadata = this.getBuildMetadata();
    return `${version}+${metadata}`;
  }

  /**
   * Get version object
   */
  static getVersionObject(packagePath?: string): SemanticVersion {
    const fullVersion = this.getFullVersion(packagePath);
    return VersionParser.parse(fullVersion);
  }
}

/**
 * [1.5.0.0] Build Version Generator
 * Generates version constants for build output
 */
export class BuildVersionGenerator {
  /**
   * Generate version constant for TypeScript/JavaScript
   */
  static generateConstant(packagePath?: string): string {
    const version = VersionManager.getFullVersion(packagePath);
    const timestamp = new Date().toISOString();

    return `
// [1.0.0.0] BUILD VERSION - Auto-generated
// Generated: ${timestamp}

export const BUILD_VERSION = "${version}";
export const BUILD_TIMESTAMP = "${timestamp}";
export const BUILD_METADATA = {
  version: "${version}",
  timestamp: "${timestamp}",
  major: ${VersionParser.parse(version).major},
  minor: ${VersionParser.parse(version).minor},
  patch: ${VersionParser.parse(version).patch},
  buildMetadata: "${VersionManager.getBuildMetadata()}",
};

export default BUILD_VERSION;
`.trim();
  }

  /**
   * Generate version JSON
   */
  static generateJSON(packagePath?: string): string {
    const version = VersionManager.getVersionObject(packagePath);
    const timestamp = new Date().toISOString();

    return JSON.stringify(
      {
        version: VersionManager.getFullVersion(packagePath),
        timestamp,
        major: version.major,
        minor: version.minor,
        patch: version.patch,
        prerelease: version.prerelease || null,
        buildMetadata: version.buildMetadata,
      },
      null,
      2
    );
  }

  /**
   * Generate version header comment
   */
  static generateHeader(packagePath?: string): string {
    const version = VersionManager.getFullVersion(packagePath);
    const timestamp = new Date().toISOString();

    return `
// ============================================
// BUILD VERSION: ${version}
// BUILD TIMESTAMP: ${timestamp}
// ============================================
`.trim();
  }
}

