/**
 * Version Manager using Bun.semver
 *
 * Native Bun semver implementation for version management,
 * comparison, and automated version bumping
 */

import { Database } from 'bun:sqlite';

interface VersionConfig {
  current: string;
  minimum: string;
  maximum?: string;
  prerelease?: string;
  metadata?: Record<string, any>;
}

interface VersionHistory {
  version: string;
  timestamp: Date;
  author: string;
  changes: string[];
  breaking: boolean;
}

interface ReleaseConfig {
  version: string;
  type: 'major' | 'minor' | 'patch' | 'prerelease';
  tag?: string;
  branch?: string;
  autoTag: boolean;
  autoPush: boolean;
}

export class BunVersionManager {
  private currentVersion: string;
  private versionDB: Database;
  private config: VersionConfig;

  constructor(config?: Partial<VersionConfig>) {
    this.config = {
      current: '1.0.0',
      minimum: '1.0.0',
      ...config,
    };

    // Parse and validate current version
    this.currentVersion = this.parseVersion(this.config.current);

    // Initialize version history database
    this.versionDB = new Database('version-history.db');
    this.initializeDatabase();
  }

  private initializeDatabase() {
    this.versionDB.exec(`
      CREATE TABLE IF NOT EXISTS version_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT NOT NULL UNIQUE,
        major INTEGER NOT NULL,
        minor INTEGER NOT NULL,
        patch INTEGER NOT NULL,
        prerelease TEXT,
        metadata TEXT,
        timestamp INTEGER NOT NULL,
        author TEXT,
        changes TEXT,
        breaking BOOLEAN DEFAULT 0,
        git_tag TEXT,
        git_commit TEXT
      )
    `);

    this.versionDB.exec(`
      CREATE INDEX IF NOT EXISTS idx_version_timestamp 
      ON version_history(timestamp DESC);
    `);

    // Store current version if not exists
    this.recordVersion(this.currentVersion, {
      author: 'system',
      changes: ['Initial version'],
      breaking: false,
    });
  }

  /**
   * Parse version string using Bun.semver
   */
  parseVersion(version: string): string {
    const parsed = Bun.semver(version);
    if (!parsed) {
      throw new Error(`Invalid semver version: ${version}`);
    }
    return parsed.format();
  }

  /**
   * Get current version
   */
  getCurrentVersion(): string {
    return this.currentVersion;
  }

  /**
   * Compare two versions using Bun.semver
   */
  compare(version1: string, version2: string): number {
    const v1 = Bun.semver(version1);
    const v2 = Bun.semver(version2);

    if (!v1 || !v2) {
      throw new Error('Invalid version format');
    }

    return Bun.semver.order(v1, v2);
  }

  /**
   * Check if version satisfies a range using Bun.semver
   */
  satisfies(version: string, range: string): boolean {
    const v = Bun.semver(version);
    if (!v) {
      throw new Error(`Invalid version: ${version}`);
    }

    return Bun.semver.satisfies(v, range);
  }

  /**
   * Increment version using Bun.semver
   */
  increment(
    type: 'major' | 'minor' | 'patch' | 'prerelease' = 'patch',
    prereleaseId?: string
  ): string {
    const current = Bun.semver(this.currentVersion);
    if (!current) {
      throw new Error('Invalid current version');
    }

    let newVersion: any;

    switch (type) {
      case 'major':
        newVersion = Bun.semver({
          major: current.major + 1,
          minor: 0,
          patch: 0,
          prerelease: prereleaseId ? [prereleaseId, 0] : undefined,
        });
        break;

      case 'minor':
        newVersion = Bun.semver({
          major: current.major,
          minor: current.minor + 1,
          patch: 0,
          prerelease: prereleaseId ? [prereleaseId, 0] : undefined,
        });
        break;

      case 'patch':
        newVersion = Bun.semver({
          major: current.major,
          minor: current.minor,
          patch: current.patch + 1,
          prerelease: prereleaseId ? [prereleaseId, 0] : undefined,
        });
        break;

      case 'prerelease':
        if (current.prerelease && current.prerelease.length > 0) {
          const prereleaseVersion =
            typeof current.prerelease[1] === 'number' ? current.prerelease[1] + 1 : 1;

          newVersion = Bun.semver({
            major: current.major,
            minor: current.minor,
            patch: current.patch,
            prerelease: [prereleaseId || current.prerelease[0], prereleaseVersion],
          });
        } else {
          newVersion = Bun.semver({
            major: current.major,
            minor: current.minor,
            patch: current.patch,
            prerelease: [prereleaseId || 'alpha', 0],
          });
        }
        break;
    }

    return newVersion.format();
  }

  /**
   * Bump version and record in history
   */
  async bumpVersion(
    type: 'major' | 'minor' | 'patch' | 'prerelease',
    options: {
      author?: string;
      changes?: string[];
      breaking?: boolean;
      prereleaseId?: string;
      dryRun?: boolean;
    } = {}
  ): Promise<string> {
    const newVersion = this.increment(type, options.prereleaseId);

    if (options.dryRun) {
      return newVersion;
    }

    // Record in history
    this.recordVersion(newVersion, {
      author: options.author || 'unknown',
      changes: options.changes || [`Bump ${type} version`],
      breaking: options.breaking || type === 'major',
    });

    // Update current version
    this.currentVersion = newVersion;

    // Update package.json if exists
    await this.updatePackageJson(newVersion);

    return newVersion;
  }

  /**
   * Record version in history
   */
  private recordVersion(
    version: string,
    metadata: {
      author: string;
      changes: string[];
      breaking: boolean;
      gitTag?: string;
      gitCommit?: string;
    }
  ) {
    const v = Bun.semver(version);
    if (!v) return;

    const insert = this.versionDB.query(`
      INSERT OR IGNORE INTO version_history (
        version, major, minor, patch, prerelease, metadata,
        timestamp, author, changes, breaking, git_tag, git_commit
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      version,
      v.major,
      v.minor,
      v.patch,
      v.prerelease ? JSON.stringify(v.prerelease) : null,
      v.build ? JSON.stringify(v.build) : null,
      Date.now(),
      metadata.author,
      JSON.stringify(metadata.changes),
      metadata.breaking ? 1 : 0,
      metadata.gitTag || null,
      metadata.gitCommit || null
    );
  }

  /**
   * Get version history
   */
  getHistory(limit: number = 10): VersionHistory[] {
    const query = this.versionDB.query(`
      SELECT * FROM version_history 
      ORDER BY timestamp DESC 
      LIMIT ?
    `);

    const rows = query.all(limit);

    return rows.map(row => ({
      version: row.version,
      timestamp: new Date(row.timestamp),
      author: row.author,
      changes: JSON.parse(row.changes),
      breaking: row.breaking === 1,
    }));
  }

  /**
   * Get versions in range using Bun.semver
   */
  getVersionsInRange(range: string): string[] {
    const query = this.versionDB.query(
      'SELECT version FROM version_history ORDER BY timestamp DESC'
    );
    const allVersions = query.all().map(row => row.version);

    return allVersions.filter(version => this.satisfies(version, range));
  }

  /**
   * Check if update is needed
   */
  needsUpdate(currentVersion: string, latestVersion: string): boolean {
    return this.compare(currentVersion, latestVersion) < 0;
  }

  /**
   * Get next version suggestions
   */
  getNextVersionSuggestions(): {
    patch: string;
    minor: string;
    major: string;
    prerelease: {
      alpha: string;
      beta: string;
      rc: string;
    };
  } {
    return {
      patch: this.increment('patch'),
      minor: this.increment('minor'),
      major: this.increment('major'),
      prerelease: {
        alpha: this.increment('prerelease', 'alpha'),
        beta: this.increment('prerelease', 'beta'),
        rc: this.increment('prerelease', 'rc'),
      },
    };
  }

  /**
   * Update package.json with new version
   */
  private async updatePackageJson(newVersion: string): Promise<void> {
    const packageJsonPath = './package.json';

    try {
      const file = Bun.file(packageJsonPath);
      const packageJson = await file.json();

      packageJson.version = newVersion;

      await Bun.write(packageJsonPath, JSON.stringify(packageJson, null, 2));
    } catch (error) {
      console.warn('Could not update package.json:', error);
    }
  }

  /**
   * Create git tag for version
   */
  async createGitTag(version: string, message?: string): Promise<void> {
    const { $ } = await import('bun');

    const tagName = `v${version}`;
    const tagMessage = message || `Release version ${version}`;

    try {
      await $`git tag -a ${tagName} -m "${tagMessage}"`;

      // Update version history with git tag
      const update = this.versionDB.query(
        'UPDATE version_history SET git_tag = ? WHERE version = ?'
      );
      update.run(tagName, version);
    } catch (error) {
      console.error('Failed to create git tag:', error);
      throw error;
    }
  }

  /**
   * Perform full release
   */
  async release(config: ReleaseConfig): Promise<{
    version: string;
    tag: string;
    success: boolean;
    message: string;
  }> {
    try {
      // Bump version
      const newVersion = await this.bumpVersion(config.type, {
        author: 'release-bot',
        changes: [`Release ${config.type} version`],
        breaking: config.type === 'major',
      });

      // Create git tag if enabled
      let tag = '';
      if (config.autoTag) {
        tag = `v${newVersion}`;
        await this.createGitTag(newVersion);
      }

      // Push to remote if enabled
      if (config.autoPush && config.autoTag) {
        const { $ } = await import('bun');
        await $`git push origin ${tag}`;
      }

      return {
        version: newVersion,
        tag,
        success: true,
        message: `Successfully released version ${newVersion}`,
      };
    } catch (error) {
      return {
        version: this.currentVersion,
        tag: '',
        success: false,
        message: `Release failed: ${error.message}`,
      };
    }
  }

  /**
   * Validate version compatibility
   */
  validateCompatibility(dependencies: Record<string, string>): {
    compatible: boolean;
    issues: Array<{
      package: string;
      required: string;
      reason: string;
    }>;
  } {
    const issues: Array<{
      package: string;
      required: string;
      reason: string;
    }> = [];

    for (const [pkg, versionRange] of Object.entries(dependencies)) {
      // Check if current version satisfies dependency requirements
      if (!this.satisfies(this.currentVersion, versionRange)) {
        issues.push({
          package: pkg,
          required: versionRange,
          reason: `Current version ${this.currentVersion} does not satisfy ${versionRange}`,
        });
      }
    }

    return {
      compatible: issues.length === 0,
      issues,
    };
  }

  /**
   * Get version metrics
   */
  getMetrics(): {
    totalReleases: number;
    majorReleases: number;
    minorReleases: number;
    patchReleases: number;
    averageReleaseInterval: number;
    lastRelease: Date | null;
  } {
    const query = this.versionDB.query('SELECT * FROM version_history ORDER BY timestamp DESC');
    const history = query.all();

    const metrics = {
      totalReleases: history.length,
      majorReleases: 0,
      minorReleases: 0,
      patchReleases: 0,
      averageReleaseInterval: 0,
      lastRelease: null as Date | null,
    };

    if (history.length === 0) {
      return metrics;
    }

    // Count release types
    let prevVersion = null;
    let intervals: number[] = [];
    let lastTimestamp = null;

    for (const row of history) {
      const v = Bun.semver(row.version);

      if (prevVersion) {
        const prev = Bun.semver(prevVersion);

        if (v.major > prev.major) {
          metrics.majorReleases++;
        } else if (v.minor > prev.minor) {
          metrics.minorReleases++;
        } else if (v.patch > prev.patch) {
          metrics.patchReleases++;
        }

        if (lastTimestamp) {
          intervals.push(lastTimestamp - row.timestamp);
        }
      }

      prevVersion = row.version;
      lastTimestamp = row.timestamp;
    }

    // Calculate average interval
    if (intervals.length > 0) {
      const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
      metrics.averageReleaseInterval = avgInterval / (1000 * 60 * 60 * 24); // Convert to days
    }

    // Get last release date
    if (history.length > 0) {
      metrics.lastRelease = new Date(history[0].timestamp);
    }

    return metrics;
  }
}

/**
 * Workspace version manager for monorepo
 */
export class WorkspaceVersionManager {
  private managers: Map<string, BunVersionManager> = new Map();
  private rootManager: BunVersionManager;

  constructor(rootVersion: string = '1.0.0') {
    this.rootManager = new BunVersionManager({ current: rootVersion });
  }

  /**
   * Add workspace package
   */
  addWorkspace(name: string, version: string): void {
    this.managers.set(name, new BunVersionManager({ current: version }));
  }

  /**
   * Sync all workspace versions
   */
  async syncVersions(targetVersion?: string): Promise<void> {
    const version = targetVersion || this.rootManager.getCurrentVersion();

    for (const [name, manager] of this.managers) {
      await manager.bumpVersion('patch', {
        author: 'sync',
        changes: [`Sync version to ${version}`],
      });
    }
  }

  /**
   * Get all workspace versions
   */
  getWorkspaceVersions(): Record<string, string> {
    const versions: Record<string, string> = {
      root: this.rootManager.getCurrentVersion(),
    };

    for (const [name, manager] of this.managers) {
      versions[name] = manager.getCurrentVersion();
    }

    return versions;
  }

  /**
   * Check version consistency
   */
  checkConsistency(): {
    consistent: boolean;
    inconsistencies: Array<{
      package: string;
      version: string;
      expected: string;
    }>;
  } {
    const rootVersion = this.rootManager.getCurrentVersion();
    const inconsistencies: Array<{
      package: string;
      version: string;
      expected: string;
    }> = [];

    for (const [name, manager] of this.managers) {
      const version = manager.getCurrentVersion();
      if (version !== rootVersion) {
        inconsistencies.push({
          package: name,
          version,
          expected: rootVersion,
        });
      }
    }

    return {
      consistent: inconsistencies.length === 0,
      inconsistencies,
    };
  }
}

// Export singleton instances
export const versionManager = new BunVersionManager({
  current: '2.0.0',
  minimum: '1.0.0',
});

export const workspaceVersionManager = new WorkspaceVersionManager('2.0.0');
