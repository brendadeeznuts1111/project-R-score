/**
 * Version manager with strict parsing and Bun.semver comparison/range checks.
 *
 * Native Bun semver implementation for version management,
 * comparison, and automated version bumping
 */

import { Database } from 'bun:sqlite';
import { formatSemver, makeSemver, parseSemver, type ParsedSemver } from './semver';

export interface VersionConfig {
  current: string;
  minimum: string;
  maximum?: string;
  databasePath?: string;
  packageJsonPath?: string;
}

interface VersionHistory {
  version: string;
  timestamp: Date;
  author: string;
  changes: string[];
  breaking: boolean;
}

interface VersionHistoryRow {
  id: number;
  version: string;
  timestamp: number;
  author: string;
  changes: string;
  breaking: number;
}

interface VersionRow {
  version: string;
}

export interface ReleaseConfig {
  type: 'major' | 'minor' | 'patch' | 'prerelease';
  tag?: string;
  branch?: string;
  autoTag: boolean;
  autoPush: boolean;
}

export class BunVersionManager {
  private currentVersion: string;
  private readonly versionDB: Database;
  private readonly config: VersionConfig;

  constructor(config?: Partial<VersionConfig>) {
    this.config = {
      current: '1.0.0',
      minimum: '1.0.0',
      ...config,
    };

    // Parse and validate current version
    this.currentVersion = this.validateVersionBounds(this.config.current);

    // Initialize version history database
    this.versionDB = new Database(this.config.databasePath ?? ':memory:');
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
   * Parse and normalize a strict semantic version.
   */
  parseVersion(version: string): string {
    const parsed = parseSemver(version);
    if (!parsed) {
      throw new Error(`Invalid semver version: ${version}`);
    }
    return formatSemver(parsed);
  }

  private validateVersionBounds(version: string): string {
    const normalizedVersion = this.parseVersion(version);
    const minimumVersion = this.parseVersion(this.config.minimum);

    if (Bun.semver.order(normalizedVersion, minimumVersion) < 0) {
      throw new RangeError(`Version ${normalizedVersion} is below minimum ${minimumVersion}`);
    }

    if (this.config.maximum) {
      const maximumVersion = this.parseVersion(this.config.maximum);
      if (Bun.semver.order(normalizedVersion, maximumVersion) > 0) {
        throw new RangeError(`Version ${normalizedVersion} exceeds maximum ${maximumVersion}`);
      }
    }

    return normalizedVersion;
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
    const v1 = parseSemver(version1);
    const v2 = parseSemver(version2);

    if (!v1 || !v2) {
      throw new Error('Invalid version format');
    }

    return Bun.semver.order(version1, version2);
  }

  /**
   * Check if version satisfies a range using Bun.semver
   */
  satisfies(version: string, range: string): boolean {
    const v = parseSemver(version);
    if (!v) {
      throw new Error(`Invalid version: ${version}`);
    }

    return Bun.semver.satisfies(version, range);
  }

  /**
   * Increment a parsed semantic version.
   */
  increment(
    type: 'major' | 'minor' | 'patch' | 'prerelease' = 'patch',
    prereleaseId?: string
  ): string {
    const current = parseSemver(this.currentVersion);
    if (!current) {
      throw new Error('Invalid current version');
    }

    let newVersion: ParsedSemver;

    switch (type) {
      case 'major':
        newVersion = makeSemver({
          major: current.major + 1,
          minor: 0,
          patch: 0,
          prerelease: prereleaseId ? [prereleaseId, 0] : undefined,
        });
        break;

      case 'minor':
        newVersion = makeSemver({
          major: current.major,
          minor: current.minor + 1,
          patch: 0,
          prerelease: prereleaseId ? [prereleaseId, 0] : undefined,
        });
        break;

      case 'patch':
        newVersion = makeSemver({
          major: current.major,
          minor: current.minor,
          patch: current.patch + 1,
          prerelease: prereleaseId ? [prereleaseId, 0] : undefined,
        });
        break;

      case 'prerelease':
        if (current.prerelease.length > 0) {
          const prereleaseVersion =
            typeof current.prerelease[1] === 'number' ? current.prerelease[1] + 1 : 1;

          newVersion = makeSemver({
            major: current.major,
            minor: current.minor,
            patch: current.patch,
            prerelease: [prereleaseId || current.prerelease[0], prereleaseVersion],
          });
        } else {
          newVersion = makeSemver({
            major: current.major,
            minor: current.minor,
            patch: current.patch,
            prerelease: [prereleaseId || 'alpha', 0],
          });
        }
        break;
    }

    return formatSemver(newVersion);
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

    return this.setVersion(newVersion, {
      author: options.author || 'unknown',
      changes: options.changes || [`Bump ${type} version`],
      breaking: options.breaking || type === 'major',
    });
  }

  async setVersion(
    version: string,
    metadata: {
      author?: string;
      changes?: string[];
      breaking?: boolean;
      dryRun?: boolean;
    } = {}
  ): Promise<string> {
    const normalizedVersion = this.validateVersionBounds(version);
    if (metadata.dryRun) return normalizedVersion;

    this.recordVersion(normalizedVersion, {
      author: metadata.author ?? 'unknown',
      changes: metadata.changes ?? [`Set version to ${normalizedVersion}`],
      breaking: metadata.breaking ?? false,
    });
    this.currentVersion = normalizedVersion;

    if (this.config.packageJsonPath) {
      await this.updatePackageJson(this.config.packageJsonPath, normalizedVersion);
    }

    return normalizedVersion;
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
    const v = parseSemver(version);
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
      v.build.length > 0 ? JSON.stringify(v.build) : null,
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
    const query = this.versionDB.query<VersionHistoryRow, [number]>(`
      SELECT * FROM version_history 
      ORDER BY timestamp DESC, id DESC
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
    const query = this.versionDB.query<VersionRow, []>(
      'SELECT version FROM version_history ORDER BY timestamp DESC, id DESC'
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
  private async updatePackageJson(packageJsonPath: string, newVersion: string): Promise<void> {
    const file = Bun.file(packageJsonPath);
    const packageJson: Record<string, unknown> = await file.json();
    packageJson.version = newVersion;
    await Bun.write(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
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
        message: `Release failed: ${error instanceof Error ? error.message : String(error)}`,
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
    const query = this.versionDB.query<VersionHistoryRow, []>(
      'SELECT * FROM version_history ORDER BY timestamp ASC, id ASC'
    );
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
    let prevVersion: string | null = null;
    const intervals: number[] = [];
    let lastTimestamp: number | null = null;

    for (const row of history) {
      const v = parseSemver(row.version)!;

      if (prevVersion) {
        const prev = parseSemver(prevVersion)!;

        if (v.major > prev.major) {
          metrics.majorReleases++;
        } else if (v.minor > prev.minor) {
          metrics.minorReleases++;
        } else if (v.patch > prev.patch) {
          metrics.patchReleases++;
        }

        if (lastTimestamp !== null) {
          intervals.push(row.timestamp - lastTimestamp);
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
      metrics.lastRelease = new Date(history.at(-1)!.timestamp);
    }

    return metrics;
  }

  close(): void {
    this.versionDB.close();
  }

  [Symbol.dispose](): void {
    this.close();
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
    this.managers.get(name)?.close();
    this.managers.set(name, new BunVersionManager({ current: version }));
  }

  /**
   * Sync all workspace versions
   */
  async syncVersions(targetVersion?: string): Promise<void> {
    const version = targetVersion || this.rootManager.getCurrentVersion();

    await this.rootManager.setVersion(version, {
      author: 'sync',
      changes: [`Sync root version to ${version}`],
    });

    for (const manager of this.managers.values()) {
      await manager.setVersion(version, {
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

  close(): void {
    this.rootManager.close();
    for (const manager of this.managers.values()) manager.close();
  }

  [Symbol.dispose](): void {
    this.close();
  }
}
