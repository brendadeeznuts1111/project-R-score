/**
 * Component #56: ConfigVersion-Stabilizer
 * Logic Tier: Level 3 (Package Manager)
 * Resource Tax: I/O <5ms
 * Parity Lock: n4o5...6p7q
 * Protocol: bun.lockb v1
 *
 * Locks hoisted/isolated defaults; prevents flip-flopping between
 * package manager configurations during upgrades.
 *
 * @module infrastructure/configversion-stabilizer
 */

import { isFeatureEnabled } from '../types/feature-flags';

/**
 * Config version constants
 */
export const CONFIG_VERSIONS = {
  /** New projects: isolated linker default */
  V1: 1 as const,
  /** Existing projects: hoisted linker default */
  V0: 0 as const,
} as const;

export type ConfigVersion = typeof CONFIG_VERSIONS[keyof typeof CONFIG_VERSIONS];

/**
 * Lockfile structure for config version tracking
 */
export interface LockfileConfig {
  configVersion?: ConfigVersion;
  linker?: 'hoisted' | 'isolated';
  workspace?: boolean;
  timestamp?: number;
}

/**
 * Stabilization result
 */
export interface StabilizationResult {
  configVersion: ConfigVersion;
  linker: 'hoisted' | 'isolated';
  workspace: boolean;
  action: 'preserved' | 'created' | 'migrated';
}

/**
 * ConfigVersion Stabilizer for lockfile version management
 * Prevents package manager config flip-flopping during upgrades
 */
export class ConfigVersionStabilizer {
  private static readonly LOCKFILE_NAME = 'bun.lockb';

  /**
   * Initialize lockfile with stable config version
   */
  static initializeLockfile(cwd?: string): StabilizationResult | null {
    if (!isFeatureEnabled('CATALOG_RESOLUTION')) {
      return null;
    }

    const basePath = cwd || process.cwd();
    const lockfilePath = `${basePath}/${this.LOCKFILE_NAME}`;

    // Read existing lockfile
    const lockfile = this.readLockfile(lockfilePath);

    // Determine appropriate configVersion
    const isWorkspace = this.hasWorkspaces(basePath);
    const fromNpmYarn = this.wasFromNpmOrYarn(basePath);

    let configVersion: ConfigVersion;
    let action: StabilizationResult['action'];

    if (lockfile && lockfile.configVersion !== undefined) {
      // Preserve existing version
      configVersion = lockfile.configVersion;
      action = 'preserved';
    } else if (isWorkspace) {
      // New workspace: V1 (isolated)
      configVersion = CONFIG_VERSIONS.V1;
      action = 'created';
    } else if (fromNpmYarn) {
      // Migration: V0 (hoisted, npm/yarn compatible)
      configVersion = CONFIG_VERSIONS.V0;
      action = 'migrated';
    } else {
      // Default to V1 for new projects
      configVersion = CONFIG_VERSIONS.V1;
      action = 'created';
    }

    // Determine linker
    const linker = this.determineLinker(configVersion, isWorkspace);

    // Write stabilized config
    this.writeConfigVersion(lockfilePath, configVersion, isWorkspace);

    // Log to audit system
    this.logVersionStabilization(configVersion, isWorkspace, action);

    return {
      configVersion,
      linker,
      workspace: isWorkspace,
      action,
    };
  }

  /**
   * Get default linker based on config version
   */
  static getDefaultLinker(cwd?: string): 'isolated' | 'hoisted' {
    if (!isFeatureEnabled('CATALOG_RESOLUTION')) {
      return 'isolated';
    }

    const basePath = cwd || process.cwd();
    const lockfile = this.readLockfile(`${basePath}/${this.LOCKFILE_NAME}`);
    const configVersion = lockfile?.configVersion;

    return this.determineLinker(configVersion, this.hasWorkspaces(basePath));
  }

  /**
   * Get current config version
   */
  static getConfigVersion(cwd?: string): ConfigVersion | null {
    const basePath = cwd || process.cwd();
    const lockfile = this.readLockfile(`${basePath}/${this.LOCKFILE_NAME}`);
    return lockfile?.configVersion ?? null;
  }

  /**
   * Check if project uses workspaces
   */
  static hasWorkspaces(basePath?: string): boolean {
    try {
      const pkgPath = `${basePath || process.cwd()}/package.json`;
      const fs = require('fs');
      const content = fs.readFileSync(pkgPath, 'utf-8') as string;
      const pkg = JSON.parse(content);
      return Array.isArray(pkg.workspaces) && pkg.workspaces.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Determine linker based on config version and workspace status
   */
  private static determineLinker(
    configVersion: ConfigVersion | undefined,
    isWorkspace: boolean
  ): 'hoisted' | 'isolated' {
    if (configVersion === CONFIG_VERSIONS.V1) {
      return isWorkspace ? 'isolated' : 'hoisted';
    }
    return 'hoisted'; // V0 and legacy default
  }

  /**
   * Check if project was migrated from npm or yarn
   */
  private static wasFromNpmOrYarn(basePath: string): boolean {
    try {
      const yarnIntegrity = Bun.file(`${basePath}/node_modules/.yarn-integrity`);
      const packageLock = Bun.file(`${basePath}/package-lock.json`);

      return yarnIntegrity.size > 0 || packageLock.size > 0;
    } catch {
      return false;
    }
  }

  /**
   * Read lockfile configuration
   */
  private static readLockfile(path: string): LockfileConfig | null {
    try {
      const fs = require('fs');
      if (!fs.existsSync(path)) return null;

      // Note: In production, bun.lockb is binary
      // For this implementation, we store config as JSON sidecar
      const configPath = path.replace('.lockb', '.config.json');

      if (!fs.existsSync(configPath)) return null;
      const content = fs.readFileSync(configPath, 'utf-8') as string;
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Write config version to lockfile sidecar
   */
  private static writeConfigVersion(
    path: string,
    version: ConfigVersion,
    workspace: boolean
  ): void {
    try {
      const configPath = path.replace('.lockb', '.config.json');
      const config: LockfileConfig = {
        configVersion: version,
        linker: this.determineLinker(version, workspace),
        workspace,
        timestamp: Date.now(),
      };

      Bun.write(configPath, JSON.stringify(config, null, 2));
    } catch {
      // Silent fail for config write
    }
  }

  /**
   * Log version stabilization to audit system
   */
  private static logVersionStabilization(
    version: ConfigVersion,
    workspace: boolean,
    action: StabilizationResult['action']
  ): void {
    if (!isFeatureEnabled('MEMORY_AUDIT')) return;

    // Audit log for Component #11 integration
    console.debug('[ConfigVersion-Stabilizer]', {
      component: 56,
      configVersion: version,
      workspace,
      action,
      defaultLinker: this.determineLinker(version, workspace),
      timestamp: Date.now(),
    });
  }
}

/**
 * Zero-cost exports
 */
export const initializeLockfile = isFeatureEnabled('CATALOG_RESOLUTION')
  ? ConfigVersionStabilizer.initializeLockfile.bind(ConfigVersionStabilizer)
  : () => null;

export const getDefaultLinker = isFeatureEnabled('CATALOG_RESOLUTION')
  ? ConfigVersionStabilizer.getDefaultLinker.bind(ConfigVersionStabilizer)
  : () => 'isolated' as const;

export const getConfigVersion = isFeatureEnabled('CATALOG_RESOLUTION')
  ? ConfigVersionStabilizer.getConfigVersion.bind(ConfigVersionStabilizer)
  : () => null;

export const hasWorkspaces = ConfigVersionStabilizer.hasWorkspaces.bind(ConfigVersionStabilizer);
