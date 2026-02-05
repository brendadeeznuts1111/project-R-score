#!/usr/bin/env node

/**
 * 📦 Advanced Version Management System
 *
 * Comprehensive versioning with semantic versioning, compatibility checking,
 * update management, and version control
 * Features:
 * - Semantic versioning (semver)
 * - Version compatibility checking
 * - Update management and notifications
 * - Version history and rollback
 * - Environment-specific versioning
 * - Version validation and migration
 */

import { EventEmitter } from 'events';
import * as semver from 'semver';

export interface VersionInfo {
  version: string;
  major: number;
  minor: number;
  patch: number;
  prerelease?: string[];
  build?: string;
  raw: string;
}

export interface VersionCompatibility {
  isCompatible: boolean;
  breaking: boolean;
  requiresUpdate: boolean;
  recommendedAction: string;
  migrationPath?: string[];
}

export interface VersionUpdate {
  id: string;
  fromVersion: string;
  toVersion: string;
  type: 'major' | 'minor' | 'patch' | 'prerelease';
  changelog: string[];
  breakingChanges: string[];
  migrationGuide?: string;
  rollbackSupported: boolean;
  timestamp: string;
  applied: boolean;
  environment: string;
}

export interface VersionManifest {
  current: VersionInfo;
  available: VersionInfo[];
  latest: VersionInfo;
  minimumRequired: VersionInfo;
  supported: VersionInfo[];
  deprecated: VersionInfo[];
  environments: Record<string, VersionInfo>;
}

export class VersionManager extends EventEmitter {
  private currentVersion: VersionInfo;
  private versionHistory: VersionUpdate[] = [];
  private versionManifest: VersionManifest;
  private updateCheckInterval: NodeJS.Timeout | null = null;
  private updateCheckUrl?: string;
  private autoUpdateEnabled: boolean = false;
  private environment: string;
  private versionStorage: Map<string, any> = new Map();

  constructor(options: {
    currentVersion: string;
    environment?: string;
    updateCheckUrl?: string;
    autoUpdateEnabled?: boolean;
  }) {
    super();

    this.currentVersion = this.parseVersion(options.currentVersion);
    this.environment = options.environment || 'production';
    this.updateCheckUrl = options.updateCheckUrl;
    this.autoUpdateEnabled = options.autoUpdateEnabled || false;

    this.initializeVersioning();
  }

  private initializeVersioning(): void {
    console.log(`📦 Initializing Version Manager v${this.currentVersion.raw}`);

    // Initialize version manifest
    this.versionManifest = {
      current: this.currentVersion,
      available: [],
      latest: this.currentVersion,
      minimumRequired: this.currentVersion,
      supported: [this.currentVersion],
      deprecated: [],
      environments: {
        [this.environment]: this.currentVersion,
      },
    };

    // Setup version persistence
    this.setupVersionPersistence();

    // Setup update checking if enabled
    if (this.autoUpdateEnabled && this.updateCheckUrl) {
      this.setupAutoUpdateChecking();
    }

    // Setup version validation
    this.setupVersionValidation();

    console.log('✅ Version Manager initialized');
  }

  // ============================================================================
  // VERSION PARSING AND VALIDATION
  // ============================================================================

  /**
   * Parse version string into VersionInfo object
   */
  parseVersion(versionString: string): VersionInfo {
    const parsed = semver.parse(versionString);

    if (!parsed) {
      throw new Error(`Invalid version format: ${versionString}`);
    }

    return {
      version: parsed.version,
      major: parsed.major,
      minor: parsed.minor,
      patch: parsed.patch,
      prerelease: parsed.prerelease.length > 0 ? parsed.prerelease : undefined,
      build: parsed.build.length > 0 ? parsed.build.join('.') : undefined,
      raw: versionString,
    };
  }

  /**
   * Validate version format
   */
  validateVersion(versionString: string): boolean {
    return semver.valid(versionString) !== null;
  }

  /**
   * Compare two versions
   */
  compareVersions(version1: string, version2: string): number {
    return semver.compare(version1, version2);
  }

  /**
   * Check if version satisfies range
   */
  satisfiesRange(version: string, range: string): boolean {
    return semver.satisfies(version, range);
  }

  /**
   * Get version increment type
   */
  getIncrementType(
    fromVersion: string,
    toVersion: string
  ): 'major' | 'minor' | 'patch' | 'prerelease' {
    const from = this.parseVersion(fromVersion);
    const to = this.parseVersion(toVersion);

    if (to.major > from.major) return 'major';
    if (to.minor > from.minor) return 'minor';
    if (to.patch > from.patch) return 'patch';
    return 'prerelease';
  }

  // ============================================================================
  // VERSION COMPATIBILITY
  // ============================================================================

  /**
   * Check compatibility between versions
   */
  checkCompatibility(currentVersion: string, targetVersion: string): VersionCompatibility {
    const current = this.parseVersion(currentVersion);
    const target = this.parseVersion(targetVersion);

    const isCompatible = semver.satisfies(target.version, `^${current.major}.0.0`);
    const breaking = target.major > current.major;
    const requiresUpdate = this.compareVersions(target.version, current.version) > 0;

    let recommendedAction = 'No action required';
    let migrationPath: string[] | undefined;

    if (breaking) {
      recommendedAction = 'Major update required - review breaking changes';
      migrationPath = this.generateMigrationPath(current.version, target.version);
    } else if (requiresUpdate) {
      recommendedAction = 'Minor update recommended';
    }

    return {
      isCompatible,
      breaking,
      requiresUpdate,
      recommendedAction,
      migrationPath,
    };
  }

  /**
   * Generate migration path between versions
   */
  private generateMigrationPath(fromVersion: string, toVersion: string): string[] {
    const path: string[] = [];
    const from = this.parseVersion(fromVersion);
    const to = this.parseVersion(toVersion);

    // Generate intermediate versions
    for (let major = from.major; major <= to.major; major++) {
      for (
        let minor = major === from.major ? from.minor : 0;
        minor <= (major === to.major ? to.minor : 999);
        minor++
      ) {
        for (
          let patch = major === from.major && minor === from.minor ? from.patch : 0;
          patch <= (major === to.major && minor === to.minor ? to.patch : 999);
          patch++
        ) {
          path.push(`${major}.${minor}.${patch}`);
        }
      }
    }

    return path;
  }

  /**
   * Check if version is supported
   */
  isVersionSupported(version: string): boolean {
    return this.versionManifest.supported.some(v => this.compareVersions(version, v.version) >= 0);
  }

  /**
   * Check if version is deprecated
   */
  isVersionDeprecated(version: string): boolean {
    return this.versionManifest.deprecated.some(v => v.version === version);
  }

  // ============================================================================
  // VERSION UPDATES
  // ============================================================================

  /**
   * Update to new version
   */
  async updateVersion(
    newVersion: string,
    options: {
      changelog?: string[];
      breakingChanges?: string[];
      migrationGuide?: string;
      rollbackSupported?: boolean;
    } = {}
  ): Promise<boolean> {
    try {
      const targetVersion = this.parseVersion(newVersion);
      const compatibility = this.checkCompatibility(this.currentVersion.version, newVersion);

      if (!compatibility.isCompatible && !options.force) {
        throw new Error(
          `Version ${newVersion} is not compatible with current version ${this.currentVersion.version}`
        );
      }

      const update: VersionUpdate = {
        id: `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fromVersion: this.currentVersion.version,
        toVersion: newVersion,
        type: this.getIncrementType(this.currentVersion.version, newVersion),
        changelog: options.changelog || [],
        breakingChanges: options.breakingChanges || [],
        migrationGuide: options.migrationGuide,
        rollbackSupported: options.rollbackSupported !== false,
        timestamp: new Date().toISOString(),
        applied: false,
        environment: this.environment,
      };

      // Pre-update validation
      await this.validateUpdate(update);

      // Execute update
      await this.executeUpdate(update);

      // Update current version
      this.currentVersion = targetVersion;
      update.applied = true;

      // Update manifest
      this.versionManifest.current = this.currentVersion;
      this.versionManifest.environments[this.environment] = this.currentVersion;

      // Add to history
      this.versionHistory.push(update);

      // Persist version change
      await this.persistVersionChange(update);

      // Emit events
      this.emit('version-updated', update);
      this.emit('version-changed', {
        from: update.fromVersion,
        to: update.toVersion,
        type: update.type,
      });

      console.log(`✅ Updated to version ${newVersion}`);
      return true;
    } catch (error) {
      console.error('❌ Version update failed:', error);
      this.emit('update-failed', { version: newVersion, error: error.message });
      return false;
    }
  }

  /**
   * Rollback to previous version
   */
  async rollbackVersion(targetVersion?: string): Promise<boolean> {
    try {
      const rollbackTarget = targetVersion || this.getPreviousVersion();

      if (!rollbackTarget) {
        throw new Error('No previous version available for rollback');
      }

      const compatibility = this.checkCompatibility(
        this.currentVersion.version,
        rollbackTarget.version
      );

      if (!compatibility.isCompatible) {
        throw new Error(`Cannot rollback to incompatible version ${rollbackTarget.version}`);
      }

      console.log(`🔄 Rolling back to version ${rollbackTarget.version}`);

      // Find rollback update in history
      const rollbackUpdate = this.versionHistory.find(
        update => update.toVersion === rollbackTarget.version && update.rollbackSupported
      );

      if (rollbackUpdate) {
        await this.executeRollback(rollbackUpdate);
      }

      // Update current version
      this.currentVersion = rollbackTarget;

      // Update manifest
      this.versionManifest.current = this.currentVersion;

      this.emit('version-rolled-back', {
        from: this.currentVersion.version,
        to: rollbackTarget.version,
      });

      console.log(`✅ Rolled back to version ${rollbackTarget.version}`);
      return true;
    } catch (error) {
      console.error('❌ Version rollback failed:', error);
      this.emit('rollback-failed', { error: error.message });
      return false;
    }
  }

  /**
   * Get previous version from history
   */
  private getPreviousVersion(): VersionInfo | null {
    const appliedUpdates = this.versionHistory.filter(update => update.applied);
    if (appliedUpdates.length === 0) return null;

    const lastUpdate = appliedUpdates[appliedUpdates.length - 1];
    return this.parseVersion(lastUpdate.fromVersion);
  }

  // ============================================================================
  // AUTO UPDATE CHECKING
  // ============================================================================

  /**
   * Setup automatic update checking
   */
  private setupAutoUpdateChecking(): void {
    // Check for updates every hour
    this.updateCheckInterval = setInterval(
      () => {
        this.checkForUpdates();
      },
      60 * 60 * 1000
    );

    // Initial check
    setTimeout(() => {
      this.checkForUpdates();
    }, 5000); // Check after 5 seconds
  }

  /**
   * Check for available updates
   */
  async checkForUpdates(): Promise<void> {
    if (!this.updateCheckUrl) return;

    try {
      console.log('🔍 Checking for updates...');

      const response = await fetch(this.updateCheckUrl, {
        headers: {
          'X-Current-Version': this.currentVersion.version,
          'X-Environment': this.environment,
        },
      });

      if (!response.ok) {
        throw new Error(`Update check failed: ${response.status}`);
      }

      const updateInfo = await response.json();

      if (this.compareVersions(updateInfo.latestVersion, this.currentVersion.version) > 0) {
        this.emit('update-available', {
          currentVersion: this.currentVersion.version,
          latestVersion: updateInfo.latestVersion,
          changelog: updateInfo.changelog,
          breakingChanges: updateInfo.breakingChanges,
          downloadUrl: updateInfo.downloadUrl,
        });

        console.log(`📦 Update available: ${updateInfo.latestVersion}`);
      } else {
        console.log('✅ Version is up to date');
      }
    } catch (error) {
      console.error('❌ Update check failed:', error);
      this.emit('update-check-failed', { error: error.message });
    }
  }

  /**
   * Download and install update
   */
  async downloadUpdate(version: string, downloadUrl: string): Promise<boolean> {
    try {
      console.log(`📥 Downloading update to version ${version}...`);

      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const updateData = await response.blob();

      // Here you would typically save the update and trigger installation
      // For demo purposes, we'll simulate the update process

      console.log(`✅ Update downloaded successfully`);

      // Trigger update installation
      return await this.installUpdate(version, updateData);
    } catch (error) {
      console.error('❌ Update download failed:', error);
      this.emit('download-failed', { version, error: error.message });
      return false;
    }
  }

  /**
   * Install downloaded update
   */
  private async installUpdate(version: string, updateData: Blob): Promise<boolean> {
    try {
      console.log(`🔧 Installing update to version ${version}...`);

      // Simulate installation process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Apply the update
      const success = await this.updateVersion(version, {
        changelog: ['Automatic update installation'],
        rollbackSupported: true,
      });

      if (success) {
        this.emit('update-installed', { version });
        console.log(`✅ Update to version ${version} installed successfully`);
      }

      return success;
    } catch (error) {
      console.error('❌ Update installation failed:', error);
      this.emit('installation-failed', { version, error: error.message });
      return false;
    }
  }

  // ============================================================================
  // VERSION PERSISTENCE
  // ============================================================================

  /**
   * Setup version persistence
   */
  private setupVersionPersistence(): void {
    // Load persisted version data
    this.loadPersistedVersionData();

    // Setup periodic persistence
    setInterval(() => {
      this.persistVersionData();
    }, 30000); // Persist every 30 seconds
  }

  /**
   * Load persisted version data
   */
  private loadPersistedVersionData(): void {
    try {
      const persistedData = localStorage.getItem('fire22_version_data');
      if (persistedData) {
        const data = JSON.parse(persistedData);

        if (data.versionHistory) {
          this.versionHistory = data.versionHistory.map((update: any) => ({
            ...update,
            timestamp: new Date(update.timestamp),
          }));
        }

        if (data.versionManifest) {
          this.versionManifest = data.versionManifest;
        }

        console.log('💾 Loaded persisted version data');
      }
    } catch (error) {
      console.warn('⚠️ Failed to load persisted version data:', error);
    }
  }

  /**
   * Persist version data
   */
  private persistVersionData(): void {
    try {
      const data = {
        currentVersion: this.currentVersion,
        versionHistory: this.versionHistory,
        versionManifest: this.versionManifest,
        lastPersisted: new Date().toISOString(),
      };

      localStorage.setItem('fire22_version_data', JSON.stringify(data));
    } catch (error) {
      console.warn('⚠️ Failed to persist version data:', error);
    }
  }

  /**
   * Persist version change
   */
  private async persistVersionChange(update: VersionUpdate): Promise<void> {
    try {
      const changeLog = {
        update,
        timestamp: new Date().toISOString(),
        environment: this.environment,
      };

      // In a real application, this would be sent to a server
      console.log('💾 Version change persisted:', changeLog);
    } catch (error) {
      console.warn('⚠️ Failed to persist version change:', error);
    }
  }

  // ============================================================================
  // VERSION VALIDATION
  // ============================================================================

  /**
   * Setup version validation
   */
  private setupVersionValidation(): void {
    // Validate current version
    this.validateCurrentVersion();

    // Setup version change validation
    this.on('version-changed', change => {
      this.validateVersionChange(change);
    });
  }

  /**
   * Validate current version
   */
  private validateCurrentVersion(): void {
    try {
      if (!this.validateVersion(this.currentVersion.version)) {
        throw new Error(`Invalid current version: ${this.currentVersion.version}`);
      }

      console.log(`✅ Current version ${this.currentVersion.version} is valid`);
    } catch (error) {
      console.error('❌ Version validation failed:', error);
      this.emit('version-validation-failed', { error: error.message });
    }
  }

  /**
   * Validate version update
   */
  private async validateUpdate(update: VersionUpdate): Promise<void> {
    // Validate version format
    if (!this.validateVersion(update.toVersion)) {
      throw new Error(`Invalid target version format: ${update.toVersion}`);
    }

    // Check for breaking changes
    if (update.breakingChanges && update.breakingChanges.length > 0) {
      console.warn(`⚠️ Breaking changes detected in version ${update.toVersion}:`);
      update.breakingChanges.forEach(change => console.warn(`  - ${change}`));
    }

    // Validate migration path
    const compatibility = this.checkCompatibility(update.fromVersion, update.toVersion);
    if (!compatibility.isCompatible) {
      throw new Error(`Version ${update.toVersion} is not compatible with ${update.fromVersion}`);
    }
  }

  /**
   * Validate version change
   */
  private validateVersionChange(change: any): void {
    console.log(`🔍 Validating version change: ${change.from} → ${change.to}`);

    // Additional validation logic can be added here
    // For example, checking system requirements, dependencies, etc.
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get version information
   */
  getVersionInfo(): VersionInfo {
    return { ...this.currentVersion };
  }

  /**
   * Get version manifest
   */
  getVersionManifest(): VersionManifest {
    return { ...this.versionManifest };
  }

  /**
   * Get version history
   */
  getVersionHistory(limit?: number): VersionUpdate[] {
    const history = [...this.versionHistory];
    if (limit) {
      return history.slice(-limit);
    }
    return history;
  }

  /**
   * Get supported versions
   */
  getSupportedVersions(): VersionInfo[] {
    return [...this.versionManifest.supported];
  }

  /**
   * Get deprecated versions
   */
  getDeprecatedVersions(): VersionInfo[] {
    return [...this.versionManifest.deprecated];
  }

  /**
   * Check if update is available
   */
  isUpdateAvailable(): boolean {
    return (
      this.compareVersions(this.versionManifest.latest.version, this.currentVersion.version) > 0
    );
  }

  /**
   * Get latest available version
   */
  getLatestVersion(): VersionInfo {
    return { ...this.versionManifest.latest };
  }

  /**
   * Get minimum required version
   */
  getMinimumRequiredVersion(): VersionInfo {
    return { ...this.versionManifest.minimumRequired };
  }

  /**
   * Format version for display
   */
  formatVersion(version: string, format: 'short' | 'full' = 'short'): string {
    const parsed = this.parseVersion(version);

    if (format === 'short') {
      return `${parsed.major}.${parsed.minor}.${parsed.patch}`;
    }

    let formatted = `${parsed.major}.${parsed.minor}.${parsed.patch}`;

    if (parsed.prerelease && parsed.prerelease.length > 0) {
      formatted += `-${parsed.prerelease.join('.')}`;
    }

    if (parsed.build) {
      formatted += `+${parsed.build}`;
    }

    return formatted;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
      this.updateCheckInterval = null;
    }

    this.removeAllListeners();
    console.log('🗑️ Version Manager destroyed');
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async executeUpdate(update: VersionUpdate): Promise<void> {
    // Simulate update execution
    console.log(`🔧 Executing update to version ${update.toVersion}...`);

    // Here you would implement the actual update logic
    // For example: downloading files, updating database schema, etc.

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private async executeRollback(update: VersionUpdate): Promise<void> {
    // Simulate rollback execution
    console.log(`🔄 Executing rollback to version ${update.fromVersion}...`);

    // Here you would implement the actual rollback logic

    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// ============================================================================
// VERSION CHECKER UTILITY
// ============================================================================

export class VersionChecker {
  private versionManager: VersionManager;

  constructor(versionManager: VersionManager) {
    this.versionManager = versionManager;
  }

  /**
   * Check if current version meets requirements
   */
  meetsRequirements(requirements: {
    minimumVersion?: string;
    maximumVersion?: string;
    supportedVersions?: string[];
    excludedVersions?: string[];
  }): boolean {
    const currentVersion = this.versionManager.getVersionInfo().version;

    // Check minimum version
    if (requirements.minimumVersion) {
      if (this.versionManager.compareVersions(currentVersion, requirements.minimumVersion) < 0) {
        return false;
      }
    }

    // Check maximum version
    if (requirements.maximumVersion) {
      if (this.versionManager.compareVersions(currentVersion, requirements.maximumVersion) > 0) {
        return false;
      }
    }

    // Check supported versions
    if (requirements.supportedVersions && requirements.supportedVersions.length > 0) {
      const isSupported = requirements.supportedVersions.some(version =>
        this.versionManager.satisfiesRange(currentVersion, version)
      );
      if (!isSupported) {
        return false;
      }
    }

    // Check excluded versions
    if (requirements.excludedVersions && requirements.excludedVersions.length > 0) {
      const isExcluded = requirements.excludedVersions.some(version => currentVersion === version);
      if (isExcluded) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get compatibility report
   */
  getCompatibilityReport(requirements: any): {
    compatible: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const currentVersion = this.versionManager.getVersionInfo().version;
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check minimum version
    if (requirements.minimumVersion) {
      if (this.versionManager.compareVersions(currentVersion, requirements.minimumVersion) < 0) {
        issues.push(
          `Current version ${currentVersion} is below minimum required ${requirements.minimumVersion}`
        );
        recommendations.push(`Update to version ${requirements.minimumVersion} or higher`);
      }
    }

    // Check deprecated versions
    if (this.versionManager.isVersionDeprecated(currentVersion)) {
      issues.push(`Current version ${currentVersion} is deprecated`);
      recommendations.push('Update to a supported version');
    }

    // Check supported versions
    if (!this.versionManager.isVersionSupported(currentVersion)) {
      issues.push(`Current version ${currentVersion} is not in the list of supported versions`);
      recommendations.push('Update to a supported version');
    }

    return {
      compatible: issues.length === 0,
      issues,
      recommendations,
    };
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export default VersionManager;
