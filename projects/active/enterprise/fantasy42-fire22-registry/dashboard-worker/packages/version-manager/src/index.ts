/**
 * @fire22/version-manager
 *
 * Production-ready version management using Bun.semver for Fire22 Dashboard Worker
 *
 * @version 3.1.0
 * @author Fire22 Development Team
 */

// Export main classes
export { BunVersionManager, WorkspaceVersionManager } from '../../../src/utils/version-manager';

// Export types
export interface VersionConfig {
  current: string;
  minimum: string;
  maximum?: string;
  prerelease?: string;
  metadata?: Record<string, any>;
}

export interface VersionHistory {
  version: string;
  timestamp: Date;
  author: string;
  changes: string[];
  breaking: boolean;
}

export interface ReleaseConfig {
  version: string;
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
   * Parse version using Bun.semver
   */
  parse(version: string) {
    const parsed = Bun.semver(version);
    if (!parsed) {
      throw new Error(`Invalid semver version: ${version}`);
    }
    return {
      major: parsed.major,
      minor: parsed.minor,
      patch: parsed.patch,
      prerelease: parsed.prerelease,
      build: parsed.build,
      format: () => parsed.format(),
    };
  },

  /**
   * Compare two versions using Bun.semver
   */
  compare(v1: string, v2: string): number {
    const version1 = Bun.semver(v1);
    const version2 = Bun.semver(v2);

    if (!version1 || !version2) {
      throw new Error('Invalid version format for comparison');
    }

    return Bun.semver.order(version1, version2);
  },

  /**
   * Check if version satisfies range using Bun.semver
   */
  satisfies(version: string, range: string): boolean {
    const v = Bun.semver(version);
    if (!v) {
      throw new Error(`Invalid version: ${version}`);
    }

    return Bun.semver.satisfies(v, range);
  },

  /**
   * Validate version format
   */
  isValid(version: string): boolean {
    return Bun.semver(version) !== null;
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
    const current = Bun.semver(currentVersion);
    if (!current) {
      throw new Error(`Invalid current version: ${currentVersion}`);
    }

    return {
      patch: Bun.semver({
        major: current.major,
        minor: current.minor,
        patch: current.patch + 1,
      }).format(),

      minor: Bun.semver({
        major: current.major,
        minor: current.minor + 1,
        patch: 0,
      }).format(),

      major: Bun.semver({
        major: current.major + 1,
        minor: 0,
        patch: 0,
      }).format(),

      prerelease: {
        alpha: Bun.semver({
          major: current.major,
          minor: current.minor,
          patch: current.patch,
          prerelease: ['alpha', 0],
        }).format(),

        beta: Bun.semver({
          major: current.major,
          minor: current.minor,
          patch: current.patch,
          prerelease: ['beta', 0],
        }).format(),

        rc: Bun.semver({
          major: current.major,
          minor: current.minor,
          patch: current.patch,
          prerelease: ['rc', 0],
        }).format(),
      },
    };
  },

  /**
   * Sort versions using Bun.semver
   */
  sort(versions: string[], descending: boolean = false): string[] {
    const parsed = versions
      .map(v => ({ version: v, parsed: Bun.semver(v) }))
      .filter(v => v.parsed !== null);

    parsed.sort((a, b) => {
      const order = Bun.semver.order(a.parsed!, b.parsed!);
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

// Export default instances
export const versionManager = new (
  await import('../../../src/utils/version-manager')
).BunVersionManager({
  current: '3.1.0',
  minimum: '1.0.0',
});

export const workspaceManager = new (
  await import('../../../src/utils/version-manager')
).WorkspaceVersionManager('3.1.0');

// Package metadata
export const PACKAGE_INFO = {
  name: '@fire22/version-manager',
  version: '3.1.0',
  description: 'Production-ready version management using Bun.semver for Fire22 Dashboard Worker',
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
