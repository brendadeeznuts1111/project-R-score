/**
 * Component #64: Hoisted-Install-Restorer
 * Logic Tier: Level 0 (Build)
 * Resource Tax: Disk +15%
 * Parity Lock: 7p8q...9r0s
 * Protocol: npm/yarn compat
 *
 * Restores hoisted installs for existing workspaces.
 * Ensures compatibility with npm/yarn migrated projects.
 *
 * @module infrastructure/hoisted-install-restorer
 */

import { isFeatureEnabled } from '../types/feature-flags';

/**
 * Restoration result
 */
export interface RestorationResult {
  restored: boolean;
  bunfigCreated: boolean;
  bunfigUpdated: boolean;
  previousLinker?: string;
  newLinker: 'hoisted' | 'isolated';
  reason: string;
}

/**
 * Project detection result
 */
export interface ProjectDetection {
  isExisting: boolean;
  hasWorkspaces: boolean;
  fromNpm: boolean;
  fromYarn: boolean;
  fromPnpm: boolean;
  hasBunLock: boolean;
  hasBunfig: boolean;
}

/**
 * Hoisted Install Restorer for npm/yarn compatibility
 * Restores hoisted linker for existing workspace migrations
 */
export class HoistedInstallRestorer {
  private static readonly BUNFIG_PATH = 'bunfig.toml';
  private static restorationCount = 0;

  /**
   * Restore hoisted installs for existing workspace
   */
  static restoreForExistingWorkspace(cwd?: string): RestorationResult {
    if (!isFeatureEnabled('CATALOG_RESOLUTION')) {
      return {
        restored: false,
        bunfigCreated: false,
        bunfigUpdated: false,
        newLinker: 'isolated',
        reason: 'Feature disabled',
      };
    }

    const basePath = cwd || process.cwd();
    const detection = this.detectProject(basePath);

    // Only restore for existing projects with workspaces
    if (!detection.isExisting) {
      return {
        restored: false,
        bunfigCreated: false,
        bunfigUpdated: false,
        newLinker: 'isolated',
        reason: 'New project, using isolated linker',
      };
    }

    if (!detection.hasWorkspaces) {
      return {
        restored: false,
        bunfigCreated: false,
        bunfigUpdated: false,
        newLinker: 'isolated',
        reason: 'No workspaces detected',
      };
    }

    // Check if restoration is needed
    const needsRestoration = detection.fromNpm || detection.fromYarn || detection.fromPnpm;

    if (!needsRestoration && detection.hasBunLock) {
      return {
        restored: false,
        bunfigCreated: false,
        bunfigUpdated: false,
        newLinker: 'isolated',
        reason: 'Native Bun project, no restoration needed',
      };
    }

    // Perform restoration
    const result = this.createBunfigOverride(basePath, detection.hasBunfig);
    this.restorationCount++;

    // Log restoration
    this.logRestoration(basePath, result);

    return result;
  }

  /**
   * Detect project characteristics
   */
  static detectProject(basePath: string): ProjectDetection {
    const detection: ProjectDetection = {
      isExisting: false,
      hasWorkspaces: false,
      fromNpm: false,
      fromYarn: false,
      fromPnpm: false,
      hasBunLock: false,
      hasBunfig: false,
    };

    try {
      const fs = require('fs');

      // Check for existing lockfiles using fs.existsSync for reliability
      detection.fromNpm = fs.existsSync(`${basePath}/package-lock.json`);
      detection.fromYarn = fs.existsSync(`${basePath}/yarn.lock`);
      detection.fromPnpm = fs.existsSync(`${basePath}/pnpm-lock.yaml`);
      detection.hasBunLock = fs.existsSync(`${basePath}/bun.lockb`);
      detection.hasBunfig = fs.existsSync(`${basePath}/${this.BUNFIG_PATH}`);

      // Check for node_modules (existing project indicator)
      try {
        const stats = require('fs').statSync(`${basePath}/node_modules`);
        detection.isExisting = stats.isDirectory();
      } catch {
        // Check for any lockfile as existing project indicator
        detection.isExisting = detection.fromNpm || detection.fromYarn || detection.fromPnpm || detection.hasBunLock;
      }

      // Check for workspaces
      detection.hasWorkspaces = this.hasWorkspaces(basePath);
    } catch {
      // Silent fail, detection remains false
    }

    return detection;
  }

  /**
   * Check if project has workspaces
   */
  static hasWorkspaces(basePath: string): boolean {
    try {
      const pkgPath = `${basePath}/package.json`;
      const fs = require('fs');
      const content = fs.readFileSync(pkgPath, 'utf-8') as string;
      const pkg = JSON.parse(content);
      return Array.isArray(pkg.workspaces) && pkg.workspaces.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get current linker setting
   */
  static getCurrentLinker(basePath: string): 'hoisted' | 'isolated' | null {
    try {
      const bunfigPath = `${basePath}/${this.BUNFIG_PATH}`;
      const fs = require('fs');

      if (!fs.existsSync(bunfigPath)) return null;
      const content = fs.readFileSync(bunfigPath, 'utf-8') as string;

      const linkerMatch = content.match(/linker\s*=\s*"?(hoisted|isolated)"?/);
      return linkerMatch && linkerMatch[1]
        ? (linkerMatch[1] as 'hoisted' | 'isolated')
        : null;
    } catch {
      return null;
    }
  }

  /**
   * Create or update bunfig.toml with hoisted linker
   */
  private static createBunfigOverride(basePath: string, exists: boolean): RestorationResult {
    const bunfigPath = `${basePath}/${this.BUNFIG_PATH}`;
    const fs = require('fs');

    try {
      let content = '';
      let previousLinker: string | undefined;

      if (exists) {
        // Read existing config
        content = fs.readFileSync(bunfigPath, 'utf-8') as string;
        const linkerMatch = content.match(/linker\s*=\s*"?(hoisted|isolated)"?/);
        previousLinker = linkerMatch?.[1];

        // Check if already hoisted
        if (previousLinker === 'hoisted') {
          return {
            restored: false,
            bunfigCreated: false,
            bunfigUpdated: false,
            previousLinker,
            newLinker: 'hoisted',
            reason: 'Already using hoisted linker',
          };
        }

        // Update existing config
        if (content.includes('[install]')) {
          // Add or update linker in [install] section
          if (content.match(/linker\s*=/)) {
            content = content.replace(/linker\s*=\s*"?[^"\n]+"?/, 'linker = "hoisted"');
          } else {
            content = content.replace(/\[install\]/, '[install]\nlinker = "hoisted"');
          }
        } else {
          // Add [install] section
          content += '\n[install]\nlinker = "hoisted"\n';
        }
      } else {
        // Create new config
        content = `# Restored by Bun v1.3.3 for existing workspace compatibility
# This ensures npm/yarn migrated projects use hoisted installs

[install]
linker = "hoisted"
`;
      }

      // Write config
      Bun.write(bunfigPath, content);

      return {
        restored: true,
        bunfigCreated: !exists,
        bunfigUpdated: exists,
        previousLinker,
        newLinker: 'hoisted',
        reason: 'Restored hoisted linker for workspace compatibility',
      };
    } catch (error) {
      return {
        restored: false,
        bunfigCreated: false,
        bunfigUpdated: false,
        newLinker: 'isolated',
        reason: `Failed to create bunfig: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Get restoration statistics
   */
  static getStats(): { restorationCount: number } {
    return { restorationCount: this.restorationCount };
  }

  /**
   * Log restoration for audit
   */
  private static logRestoration(basePath: string, result: RestorationResult): void {
    if (!isFeatureEnabled('MEMORY_AUDIT')) return;

    console.debug('[HoistedInstallRestorer]', {
      component: 64,
      path: basePath,
      restored: result.restored,
      bunfigCreated: result.bunfigCreated,
      bunfigUpdated: result.bunfigUpdated,
      previousLinker: result.previousLinker,
      newLinker: result.newLinker,
      reason: result.reason,
      timestamp: Date.now(),
    });
  }

  /**
   * Reset statistics (for testing)
   */
  static resetStats(): void {
    this.restorationCount = 0;
  }
}

/**
 * Zero-cost exports
 */
export const restoreForExistingWorkspace = isFeatureEnabled('CATALOG_RESOLUTION')
  ? HoistedInstallRestorer.restoreForExistingWorkspace.bind(HoistedInstallRestorer)
  : () => ({
      restored: false,
      bunfigCreated: false,
      bunfigUpdated: false,
      newLinker: 'isolated' as const,
      reason: 'Feature disabled',
    });

export const detectProject = HoistedInstallRestorer.detectProject.bind(HoistedInstallRestorer);
export const hasWorkspaces = HoistedInstallRestorer.hasWorkspaces.bind(HoistedInstallRestorer);
export const getCurrentLinker = HoistedInstallRestorer.getCurrentLinker.bind(HoistedInstallRestorer);
export const getRestorationStats = HoistedInstallRestorer.getStats.bind(HoistedInstallRestorer);
