#!/usr/bin/env bun

/**
 * 🔢 Fire22 Workspace Versioning Strategy
 *
 * Manages versioning across all Fire22 workspaces:
 * - Semantic versioning enforcement
 * - Synchronized version bumping
 * - Changelog generation
 * - Git tagging
 * - Release notes
 *
 * @version 1.0.0
 */

import { $ } from 'bun';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

type VersionStrategy = 'independent' | 'synchronized' | 'grouped';
type BumpType = 'major' | 'minor' | 'patch' | 'prerelease';

interface VersionChange {
  workspace: string;
  oldVersion: string;
  newVersion: string;
  changes: string[];
  breaking: boolean;
}

interface ReleaseConfig {
  strategy: VersionStrategy;
  groups?: Record<string, string[]>;
  changelog: boolean;
  git: boolean;
  tag: boolean;
  push: boolean;
  publish: boolean;
}

class WorkspaceVersioningStrategy {
  private workspacesPath: string;
  private workspaces: string[];
  private config: ReleaseConfig;

  constructor(config?: Partial<ReleaseConfig>) {
    this.workspacesPath = join(process.cwd(), 'workspaces');
    this.workspaces = [
      '@fire22-pattern-system',
      '@fire22-api-client',
      '@fire22-core-dashboard',
      '@fire22-sports-betting',
      '@fire22-telegram-integration',
      '@fire22-build-system',
    ];

    this.config = {
      strategy: 'synchronized',
      changelog: true,
      git: true,
      tag: true,
      push: false,
      publish: false,
      ...config,
    };
  }

  /**
   * 🚀 Main versioning command
   */
  async execute(bumpType: BumpType, options: any = {}): Promise<void> {
    console.info('🔢 Fire22 Workspace Versioning Strategy');
    console.info('='.repeat(60));
    console.info(`📊 Strategy: ${this.config.strategy}`);
    console.info(`📈 Bump Type: ${bumpType}`);
    console.info('');

    // Get current versions
    const currentVersions = await this.getCurrentVersions();

    // Calculate new versions
    const versionChanges = await this.calculateVersionChanges(currentVersions, bumpType);

    // Display changes
    this.displayVersionChanges(versionChanges);

    // Confirm changes
    if (!options.force) {
      const confirmed = await this.confirmChanges();
      if (!confirmed) {
        console.info('❌ Version bump cancelled');
        return;
      }
    }

    // Apply version changes
    await this.applyVersionChanges(versionChanges);

    // Generate changelog
    if (this.config.changelog) {
      await this.generateChangelog(versionChanges);
    }

    // Git operations
    if (this.config.git) {
      await this.performGitOperations(versionChanges);
    }

    // Publish packages
    if (this.config.publish) {
      await this.publishPackages(versionChanges);
    }

    console.info('\n✅ Version bump completed successfully!');
  }

  /**
   * 📊 Get current versions
   */
  private async getCurrentVersions(): Promise<Map<string, string>> {
    const versions = new Map<string, string>();

    for (const workspace of this.workspaces) {
      const packageJsonPath = join(this.workspacesPath, workspace, 'package.json');
      if (existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
        versions.set(workspace, packageJson.version || '1.0.0');
      }
    }

    return versions;
  }

  /**
   * 📈 Calculate version changes
   */
  private async calculateVersionChanges(
    currentVersions: Map<string, string>,
    bumpType: BumpType
  ): Promise<VersionChange[]> {
    const changes: VersionChange[] = [];

    // Get git changes for each workspace
    const workspaceChanges = await this.getWorkspaceChanges();

    for (const [workspace, currentVersion] of currentVersions) {
      const newVersion = this.bumpVersion(currentVersion, bumpType);
      const workspaceChange: VersionChange = {
        workspace,
        oldVersion: currentVersion,
        newVersion,
        changes: workspaceChanges.get(workspace) || [],
        breaking: bumpType === 'major',
      };

      // Apply versioning strategy
      if (this.config.strategy === 'synchronized') {
        // All workspaces get the same version
        const maxVersion = Math.max(
          ...Array.from(currentVersions.values()).map(v => this.versionToNumber(v))
        );
        workspaceChange.newVersion = this.numberToVersion(maxVersion, bumpType);
      } else if (this.config.strategy === 'grouped' && this.config.groups) {
        // Groups get synchronized versions
        for (const [group, members] of Object.entries(this.config.groups)) {
          if (members.includes(workspace)) {
            const groupVersions = members
              .filter(m => currentVersions.has(m))
              .map(m => currentVersions.get(m)!);
            const maxGroupVersion = Math.max(...groupVersions.map(v => this.versionToNumber(v)));
            workspaceChange.newVersion = this.numberToVersion(maxGroupVersion, bumpType);
            break;
          }
        }
      }

      changes.push(workspaceChange);
    }

    return changes;
  }

  /**
   * 📊 Get workspace changes from git
   */
  private async getWorkspaceChanges(): Promise<Map<string, string[]>> {
    const changes = new Map<string, string[]>();

    try {
      // Get last tag
      const lastTag = await $`git describe --tags --abbrev=0`.quiet();
      const lastTagStr = lastTag.stdout.toString().trim();

      for (const workspace of this.workspaces) {
        const workspacePath = `workspaces/${workspace}`;
        const gitLog = await $`git log ${lastTagStr}..HEAD --oneline -- ${workspacePath}`.quiet();
        const commits = gitLog.stdout.toString().trim().split('\n').filter(Boolean);
        changes.set(workspace, commits);
      }
    } catch {
      // No tags yet, get all commits
      for (const workspace of this.workspaces) {
        changes.set(workspace, ['Initial release']);
      }
    }

    return changes;
  }

  /**
   * 🔢 Bump version
   */
  private bumpVersion(currentVersion: string, bumpType: BumpType): string {
    const [major, minor, patch] = currentVersion.split('.').map(Number);

    switch (bumpType) {
      case 'major':
        return `${major + 1}.0.0`;
      case 'minor':
        return `${major}.${minor + 1}.0`;
      case 'patch':
        return `${major}.${minor}.${patch + 1}`;
      case 'prerelease':
        return `${major}.${minor}.${patch}-beta.${Date.now()}`;
      default:
        return currentVersion;
    }
  }

  /**
   * 🔢 Convert version to number for comparison
   */
  private versionToNumber(version: string): number {
    const [major, minor, patch] = version.split('.').map(Number);
    return major * 10000 + minor * 100 + patch;
  }

  /**
   * 🔢 Convert number to version
   */
  private numberToVersion(num: number, bumpType: BumpType): string {
    const major = Math.floor(num / 10000);
    const minor = Math.floor((num % 10000) / 100);
    const patch = num % 100;

    return this.bumpVersion(`${major}.${minor}.${patch}`, bumpType);
  }

  /**
   * 📊 Display version changes
   */
  private displayVersionChanges(changes: VersionChange[]): void {
    console.info('📊 Version Changes');
    console.info('-'.repeat(60));

    for (const change of changes) {
      const arrow = change.oldVersion === change.newVersion ? '=' : '→';
      console.info(`${change.workspace}:`);
      console.info(`  ${change.oldVersion} ${arrow} ${change.newVersion}`);

      if (change.changes.length > 0) {
        console.info(`  Changes (${change.changes.length}):`);
        change.changes.slice(0, 3).forEach(c => {
          console.info(`    • ${c}`);
        });
        if (change.changes.length > 3) {
          console.info(`    ... and ${change.changes.length - 3} more`);
        }
      }
    }
  }

  /**
   * ✅ Confirm changes
   */
  private async confirmChanges(): Promise<boolean> {
    console.info('\n⚠️  This will update all package.json files');
    console.info('Continue? (y/N): ');

    // For automated environments, auto-confirm
    if (process.env.CI || process.env.GITHUB_ACTIONS) {
      console.info('Auto-confirming in CI environment');
      return true;
    }

    // In interactive mode, we'll auto-confirm for now
    console.info('Auto-confirming for demonstration');
    return true;
  }

  /**
   * 📝 Apply version changes
   */
  private async applyVersionChanges(changes: VersionChange[]): Promise<void> {
    console.info('\n📝 Applying version changes...');

    for (const change of changes) {
      const packageJsonPath = join(this.workspacesPath, change.workspace, 'package.json');
      if (existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
        packageJson.version = change.newVersion;

        // Update workspace dependencies
        if (packageJson.dependencies) {
          for (const dep of Object.keys(packageJson.dependencies)) {
            if (dep.startsWith('@fire22/')) {
              const depChange = changes.find(
                c => c.workspace === dep.replace('@fire22/', '@fire22-')
              );
              if (depChange) {
                packageJson.dependencies[dep] = depChange.newVersion;
              }
            }
          }
        }

        writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
        console.info(`  ✅ ${change.workspace}: ${change.newVersion}`);
      }
    }

    // Update root package.json
    const rootPackageJsonPath = join(process.cwd(), 'package.json');
    if (existsSync(rootPackageJsonPath)) {
      const rootPackageJson = JSON.parse(readFileSync(rootPackageJsonPath, 'utf-8'));

      // Use the highest version across all workspaces
      const maxVersion = changes.reduce((max, change) => {
        return this.versionToNumber(change.newVersion) > this.versionToNumber(max)
          ? change.newVersion
          : max;
      }, '0.0.0');

      rootPackageJson.version = maxVersion;
      writeFileSync(rootPackageJsonPath, JSON.stringify(rootPackageJson, null, 2));
      console.info(`  ✅ Root package.json: ${maxVersion}`);
    }
  }

  /**
   * 📝 Generate changelog
   */
  private async generateChangelog(changes: VersionChange[]): Promise<void> {
    console.info('\n📝 Generating changelog...');

    const date = new Date().toISOString().split('T')[0];
    const version = changes[0].newVersion;

    let changelog = `# Changelog\n\n## [${version}] - ${date}\n\n`;

    // Group changes by type
    const breaking = changes.filter(c => c.breaking && c.changes.length > 0);
    const features = changes.filter(c => !c.breaking && c.changes.length > 0);

    if (breaking.length > 0) {
      changelog += '### 💥 Breaking Changes\n\n';
      for (const change of breaking) {
        changelog += `#### ${change.workspace}\n`;
        change.changes.forEach(c => (changelog += `- ${c}\n`));
        changelog += '\n';
      }
    }

    if (features.length > 0) {
      changelog += '### ✨ Features & Fixes\n\n';
      for (const change of features) {
        changelog += `#### ${change.workspace}\n`;
        change.changes.forEach(c => (changelog += `- ${c}\n`));
        changelog += '\n';
      }
    }

    changelog += '### 📦 Version Updates\n\n';
    for (const change of changes) {
      changelog += `- ${change.workspace}: ${change.oldVersion} → ${change.newVersion}\n`;
    }

    // Append to existing changelog or create new
    const changelogPath = join(process.cwd(), 'CHANGELOG.md');
    if (existsSync(changelogPath)) {
      const existing = readFileSync(changelogPath, 'utf-8');
      changelog = changelog + '\n' + existing;
    }

    writeFileSync(changelogPath, changelog);
    console.info('  ✅ CHANGELOG.md updated');
  }

  /**
   * 🔀 Perform git operations
   */
  private async performGitOperations(changes: VersionChange[]): Promise<void> {
    if (!this.config.git) return;

    console.info('\n🔀 Git operations...');

    const version = changes[0].newVersion;
    const message = `chore: release v${version}`;

    // Add changed files
    await $`git add .`;
    console.info('  ✅ Files staged');

    // Commit
    try {
      await $`git commit -m ${message}`;
      console.info('  ✅ Changes committed');
    } catch {
      console.info('  ⚠️  No changes to commit');
    }

    // Tag
    if (this.config.tag) {
      const tagName = `v${version}`;
      await $`git tag -a ${tagName} -m ${message}`;
      console.info(`  ✅ Tagged as ${tagName}`);
    }

    // Push
    if (this.config.push) {
      await $`git push origin HEAD`;
      console.info('  ✅ Pushed to origin');

      if (this.config.tag) {
        await $`git push origin --tags`;
        console.info('  ✅ Tags pushed');
      }
    }
  }

  /**
   * 📦 Publish packages
   */
  private async publishPackages(changes: VersionChange[]): Promise<void> {
    if (!this.config.publish) return;

    console.info('\n📦 Publishing packages...');

    for (const change of changes) {
      const workspacePath = join(this.workspacesPath, change.workspace);
      try {
        await $`cd ${workspacePath} && bun publish --access public`;
        console.info(`  ✅ ${change.workspace} published`);
      } catch (error) {
        console.info(`  ❌ Failed to publish ${change.workspace}:`, error);
      }
    }
  }
}

// === CLI Interface ===

if (import.meta.main) {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  const validCommands = ['major', 'minor', 'patch', 'prerelease'];

  if (validCommands.includes(command)) {
    const strategy = new WorkspaceVersioningStrategy({
      strategy: args.includes('--independent') ? 'independent' : 'synchronized',
      changelog: !args.includes('--no-changelog'),
      git: !args.includes('--no-git'),
      tag: !args.includes('--no-tag'),
      push: args.includes('--push'),
      publish: args.includes('--publish'),
    });

    await strategy.execute(command as BumpType, {
      force: args.includes('--force'),
    });
  } else {
    console.info('Usage: bun workspace-versioning-strategy.ts [command] [options]');
    console.info('');
    console.info('Commands:');
    console.info('  major       - Bump major version (breaking changes)');
    console.info('  minor       - Bump minor version (new features)');
    console.info('  patch       - Bump patch version (bug fixes)');
    console.info('  prerelease  - Create prerelease version');
    console.info('');
    console.info('Options:');
    console.info('  --independent    - Version workspaces independently');
    console.info('  --no-changelog   - Skip changelog generation');
    console.info('  --no-git        - Skip git operations');
    console.info('  --no-tag        - Skip git tagging');
    console.info('  --push          - Push to remote');
    console.info('  --publish       - Publish to npm');
    console.info('  --force         - Skip confirmation');
  }
}

export default WorkspaceVersioningStrategy;
