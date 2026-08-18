/**
 * @fire22/version-manager
 *
 * Strict version parsing with Bun.semver comparison and range checks.
 *
 * @version 3.1.0
 * @author Fire22 Development Team
 */

// Export main classes
export { BunVersionManager, WorkspaceVersionManager } from '../../../src/utils/version-manager';
import { formatSemver, isValidSemver, makeSemver, parseSemver } from '../../../src/utils/semver';

// Export types
export interface VersionConfig {
  current: string;
  minimum: string;
  maximum?: string;
  databasePath?: string;
  packageJsonPath?: string;
}

export interface VersionHistory {
  version: string;
  timestamp: Date;
  author: string;
  changes: string[];
  breaking: boolean;
}

export interface ReleaseConfig {
  type: 'major' | 'minor' | 'patch' | 'prerelease';
  tag?: string;
  branch?: string;
  autoTag: boolean;
  autoPush: boolean;
}

export interface VersionMetrics {
  totalReleases: number;
  majorReleases: number;
  minorReleases: number;
  patchReleases: number;
  averageReleaseInterval: number;
  lastRelease: Date | null;
}

// Export utilities
export const VersionUtils = {
  /**
   * Parse a strict semantic version.
   */
  parse(version: string) {
    const parsed = parseSemver(version);
    if (!parsed) {
      throw new Error(`Invalid semver version: ${version}`);
    }
    return {
      major: parsed.major,
      minor: parsed.minor,
      patch: parsed.patch,
      prerelease: parsed.prerelease,
      build: parsed.build,
      format: () => formatSemver(parsed),
    };
  },

  /**
   * Compare two versions using Bun.semver
   */
  compare(v1: string, v2: string): number {
    const version1 = parseSemver(v1);
    const version2 = parseSemver(v2);

    if (!version1 || !version2) {
      throw new Error('Invalid version format for comparison');
    }

    return Bun.semver.order(v1, v2);
  },

  /**
   * Check if version satisfies range using Bun.semver
   */
  satisfies(version: string, range: string): boolean {
    const v = parseSemver(version);
    if (!v) {
      throw new Error(`Invalid version: ${version}`);
    }

    return Bun.semver.satisfies(version, range);
  },

  /**
   * Validate version format
   */
  isValid(version: string): boolean {
    return isValidSemver(version);
  },

  /**
   * Get next version suggestions
   */
  getNextVersions(currentVersion: string): {
    patch: string;
    minor: string;
    major: string;
    prerelease: {
      alpha: string;
      beta: string;
      rc: string;
    };
  } {
    const current = parseSemver(currentVersion);
    if (!current) {
      throw new Error(`Invalid current version: ${currentVersion}`);
    }

    return {
      patch: formatSemver(
        makeSemver({
          major: current.major,
          minor: current.minor,
          patch: current.patch + 1,
        })
      ),

      minor: formatSemver(
        makeSemver({
          major: current.major,
          minor: current.minor + 1,
          patch: 0,
        })
      ),

      major: formatSemver(
        makeSemver({
          major: current.major + 1,
          minor: 0,
          patch: 0,
        })
      ),

      prerelease: {
        alpha: formatSemver(
          makeSemver({
            major: current.major,
            minor: current.minor,
            patch: current.patch,
            prerelease: ['alpha', 0],
          })
        ),

        beta: formatSemver(
          makeSemver({
            major: current.major,
            minor: current.minor,
            patch: current.patch,
            prerelease: ['beta', 0],
          })
        ),

        rc: formatSemver(
          makeSemver({
            major: current.major,
            minor: current.minor,
            patch: current.patch,
            prerelease: ['rc', 0],
          })
        ),
      },
    };
  },

  /**
   * Sort versions using Bun.semver
   */
  sort(versions: string[], descending: boolean = false): string[] {
    const parsed = versions
      .map(v => ({ version: v, parsed: parseSemver(v) }))
      .filter(v => v.parsed !== null);

    parsed.sort((a, b) => {
      const order = Bun.semver.order(a.version, b.version);
      return descending ? -order : order;
    });

    return parsed.map(v => v.version);
  },

  /**
   * Filter versions by range
   */
  filterByRange(versions: string[], range: string): string[] {
    return versions.filter(version => {
      try {
        return this.satisfies(version, range);
      } catch {
        return false;
      }
    });
  },
};

// Export constants
export const VERSION_TYPES = {
  MAJOR: 'major' as const,
  MINOR: 'minor' as const,
  PATCH: 'patch' as const,
  PRERELEASE: 'prerelease' as const,
};

export const PRERELEASE_TYPES = {
  ALPHA: 'alpha' as const,
  BETA: 'beta' as const,
  RC: 'rc' as const,
};

// Package metadata
export const PACKAGE_INFO = {
  name: '@fire22/version-manager',
  version: '3.1.0',
  description: 'Strict version management with Bun-native comparison and range checks',
  features: [
    'Native Bun.semver integration',
    'Version parsing and validation',
    'Semantic version comparison',
    'Range satisfaction checking',
    'Version history tracking',
    'Workspace synchronization',
    'Git integration and tagging',
    'CLI interface',
    'Automated release workflows',
  ],
  performance: {
    parsing: '<1ms',
    comparison: '<0.1ms',
    rangeSatisfaction: '<0.5ms',
    databaseOps: '<5ms',
  },
};
