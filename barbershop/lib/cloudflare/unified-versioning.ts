/**
 * Unified Versioning System with Bun.semver
 *
 * Integrates semantic versioning across:
 * - Domain/Zone configurations
 * - Worker deployments
 * - R2 asset versions
 * - Secret rotations
 *
 * Uses Bun.semver for native semver operations:
 * - satisfies(version, range) - Check version compatibility
 * - order(v1, v2) - Compare version ordering
 */

// Version graph lazy loader (requires R2 credentials)
async function getVersionGraph() {
  try {
    const vg = await import('../secrets/core/version-graph');
    return vg.versionGraph;
  } catch {
    return null;
  }
}

// Re-export Bun.semver for convenience
export const semver = Bun.semver;

export interface SemverVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
}

export interface VersionedResource {
  name: string;
  currentVersion: string;
  versionHistory: string[];
  lastUpdated: string;
  metadata?: Record<string, unknown>;
}

export interface DeploymentVersion {
  domain: string;
  worker: string;
  r2Assets: string;
  secrets: string;
  timestamp: string;
  changelog?: string[];
}

export interface CompatibilityMatrix {
  domain: string;
  worker: string;
  r2Assets: string;
  compatible: boolean;
  issues?: string[];
}

/**
 * Unified Version Manager
 *
 * Manages semantic versioning across all Cloudflare resources
 * using Bun.semver for efficient version operations.
 */
export class UnifiedVersionManager {
  private versionCache: Map<string, VersionedResource> = new Map();
  private deploymentHistory: DeploymentVersion[] = [];

  /**
   * Parse version string to components
   */
  parseVersion(version: string): SemverVersion {
    const match = version.match(
      /^v?(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.]+))?(?:\+([a-zA-Z0-9.]+))?$/
    );
    if (!match) {
      throw new Error(`Invalid semver: ${version}`);
    }

    return {
      major: parseInt(match[1]),
      minor: parseInt(match[2]),
      patch: parseInt(match[3]),
      prerelease: match[4],
      build: match[5],
    };
  }

  /**
   * Format version components to string
   */
  formatVersion(v: SemverVersion): string {
    let version = `${v.major}.${v.minor}.${v.patch}`;
    if (v.prerelease) version += `-${v.prerelease}`;
    if (v.build) version += `+${v.build}`;
    return version;
  }

  /**
   * Bump version using Bun.semver
   */
  bumpVersion(current: string, type: 'major' | 'minor' | 'patch'): string {
    const v = this.parseVersion(current);

    switch (type) {
      case 'major':
        return `${v.major + 1}.0.0`;
      case 'minor':
        return `${v.major}.${v.minor + 1}.0`;
      case 'patch':
        return `${v.major}.${v.minor}.${v.patch + 1}`;
    }
  }

  /**
   * Check if version satisfies range using Bun.semver
   */
  satisfies(version: string, range: string): boolean {
    // Strip 'v' prefix if present
    const cleanVersion = version.replace(/^v/, '');
    return semver.satisfies(cleanVersion, range);
  }

  /**
   * Compare two versions using Bun.semver
   * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
   */
  compare(v1: string, v2: string): number {
    const clean1 = v1.replace(/^v/, '');
    const clean2 = v2.replace(/^v/, '');
    return semver.order(clean1, clean2);
  }

  /**
   * Check if v1 is greater than v2
   */
  isGreaterThan(v1: string, v2: string): boolean {
    return this.compare(v1, v2) > 0;
  }

  /**
   * Check if v1 is less than v2
   */
  isLessThan(v1: string, v2: string): boolean {
    return this.compare(v1, v2) < 0;
  }

  /**
   * Get the greatest version from an array
   */
  getGreatestVersion(versions: string[]): string | null {
    if (versions.length === 0) return null;
    return versions.reduce((greatest, current) =>
      this.isGreaterThan(current, greatest) ? current : greatest
    );
  }

  /**
   * Get the least version from an array
   */
  getLeastVersion(versions: string[]): string | null {
    if (versions.length === 0) return null;
    return versions.reduce((least, current) => (this.isLessThan(current, least) ? current : least));
  }

  /**
   * Filter versions that satisfy a range
   */
  filterByRange(versions: string[], range: string): string[] {
    return versions.filter(v => this.satisfies(v, range));
  }

  /**
   * Sort versions in ascending order
   */
  sortVersions(versions: string[]): string[] {
    return [...versions].sort((a, b) => this.compare(a, b));
  }

  /**
   * Sort versions in descending order
   */
  sortVersionsDesc(versions: string[]): string[] {
    return [...versions].sort((a, b) => this.compare(b, a));
  }

  /**
   * Check compatibility between domain, worker, and R2 versions
   */
  checkCompatibility(matrix: {
    domainVersion: string;
    workerVersion: string;
    r2Version: string;
  }): CompatibilityMatrix {
    const issues: string[] = [];

    // Domain and worker should be on same major version
    const domainV = this.parseVersion(matrix.domainVersion);
    const workerV = this.parseVersion(matrix.workerVersion);

    if (domainV.major !== workerV.major) {
      issues.push(
        `Major version mismatch: domain@${matrix.domainVersion} vs worker@${matrix.workerVersion}`
      );
    }

    // R2 assets should satisfy domain's minimum requirement
    if (!this.satisfies(matrix.r2Version, `^${domainV.major}.${domainV.minor}.0`)) {
      issues.push(`R2 assets ${matrix.r2Version} incompatible with domain ${matrix.domainVersion}`);
    }

    return {
      domain: matrix.domainVersion,
      worker: matrix.workerVersion,
      r2Assets: matrix.r2Version,
      compatible: issues.length === 0,
      issues,
    };
  }

  /**
   * Register a versioned resource
   */
  async registerResource(
    name: string,
    version: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const existing = this.versionCache.get(name);

    const resource: VersionedResource = {
      name,
      currentVersion: version,
      versionHistory: existing ? [...existing.versionHistory, version] : [version],
      lastUpdated: new Date().toISOString(),
      metadata,
    };

    this.versionCache.set(name, resource);

    // Also record in version graph (if available)
    const vg = await getVersionGraph();
    if (vg) {
      try {
        await vg.update(name, {
          version,
          action: existing ? 'UPDATE' : 'CREATE',
          timestamp: resource.lastUpdated,
          metadata,
        });
      } catch (error) {
        console.warn(`Version graph update failed for ${name}`);
      }
    }
  }

  /**
   * Get resource version info
   */
  getResource(name: string): VersionedResource | undefined {
    return this.versionCache.get(name);
  }

  /**
   * Record a full deployment version
   */
  recordDeployment(deployment: Omit<DeploymentVersion, 'timestamp'>): DeploymentVersion {
    const fullDeployment: DeploymentVersion = {
      ...deployment,
      timestamp: new Date().toISOString(),
    };

    this.deploymentHistory.push(fullDeployment);

    // Keep only last 100 deployments
    if (this.deploymentHistory.length > 100) {
      this.deploymentHistory = this.deploymentHistory.slice(-100);
    }

    return fullDeployment;
  }

  /**
   * Get deployment history
   */
  getDeploymentHistory(limit: number = 10): DeploymentVersion[] {
    return this.deploymentHistory.slice(-limit);
  }

  /**
   * Find the last compatible deployment
   */
  findLastCompatibleDeployment(
    domainVersion: string,
    workerRange: string,
    r2Range: string
  ): DeploymentVersion | undefined {
    return this.deploymentHistory
      .slice()
      .reverse()
      .find(
        d =>
          this.satisfies(d.domain, `^${this.parseVersion(domainVersion).major}.0.0`) &&
          this.satisfies(d.worker, workerRange) &&
          this.satisfies(d.r2Assets, r2Range)
      );
  }

  /**
   * Generate changelog between two versions
   */
  generateChangelog(fromVersion: string, toVersion: string): string[] {
    const fromV = this.parseVersion(fromVersion);
    const toV = this.parseVersion(toVersion);
    const changes: string[] = [];

    if (toV.major > fromV.major) {
      changes.push(`🚨 **BREAKING**: Major version bump (${fromV.major} → ${toV.major})`);
    }
    if (toV.minor > fromV.minor) {
      changes.push(`✨ Features: Minor version bump (${fromV.minor} → ${toV.minor})`);
    }
    if (toV.patch > fromV.patch) {
      changes.push(`🔧 Fixes: Patch version bump (${fromV.patch} → ${toV.patch})`);
    }

    return changes;
  }

  /**
   * Validate version constraints for a deployment
   */
  validateDeploymentVersions(versions: {
    domain: string;
    worker: string;
    r2Assets: string;
    secrets: string;
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate all versions are valid semver
    Object.entries(versions).forEach(([component, version]) => {
      try {
        this.parseVersion(version);
      } catch {
        errors.push(`${component}: Invalid semver "${version}"`);
      }
    });

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    // Check compatibility
    const compatibility = this.checkCompatibility({
      domainVersion: versions.domain,
      workerVersion: versions.worker,
      r2Version: versions.r2Assets,
    });

    if (!compatibility.compatible) {
      errors.push(...compatibility.issues);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Get version statistics
   */
  getStats(): {
    totalResources: number;
    totalDeployments: number;
    versionRange: { min: string | null; max: string | null };
  } {
    const allVersions: string[] = [];

    this.versionCache.forEach(resource => {
      allVersions.push(...resource.versionHistory);
    });

    return {
      totalResources: this.versionCache.size,
      totalDeployments: this.deploymentHistory.length,
      versionRange: {
        min: this.getLeastVersion(allVersions),
        max: this.getGreatestVersion(allVersions),
      },
    };
  }

  /**
   * Auto-increment version based on change type
   */
  autoIncrement(
    currentVersion: string,
    changes: { breaking: number; features: number; fixes: number }
  ): { version: string; type: 'major' | 'minor' | 'patch' } {
    if (changes.breaking > 0) {
      return { version: this.bumpVersion(currentVersion, 'major'), type: 'major' };
    }
    if (changes.features > 0) {
      return { version: this.bumpVersion(currentVersion, 'minor'), type: 'minor' };
    }
    return { version: this.bumpVersion(currentVersion, 'patch'), type: 'patch' };
  }
}

// Singleton instance
export const versionManager = new UnifiedVersionManager();
export default versionManager;

// ==================== Helper Functions ====================

/**
 * Quick version comparison
 */
export function versionCompare(v1: string, v2: string): number {
  return versionManager.compare(v1, v2);
}

/**
 * Check if version satisfies range
 */
export function versionSatisfies(version: string, range: string): boolean {
  return versionManager.satisfies(version, range);
}

/**
 * Bump version
 */
export function bumpVersion(version: string, type: 'major' | 'minor' | 'patch'): string {
  return versionManager.bumpVersion(version, type);
}

/**
 * Validate semver
 */
export function isValidSemver(version: string): boolean {
  try {
    versionManager.parseVersion(version);
    return true;
  } catch {
    return false;
  }
}
