#!/usr/bin/env bun

/**
 * 🚀 Fire22 Dashboard Worker Version Management
 * Automated semantic versioning following Bun.semver standards
 *
 * Usage:
 *   bun run scripts/version.ts [patch|minor|major|show|init]
 *
 * Examples:
 *   bun run scripts/version.ts patch    # 1.0.0 → 1.0.1
 *   bun run scripts/version.ts minor    # 1.0.0 → 1.1.0
 *   bun run scripts/version.ts major    # 1.0.0 → 2.0.0
 *   bun run scripts/version.ts show     # Display current version
 *   bun run scripts/version.ts init     # Initialize versioning
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

interface PackageJson {
  name: string;
  version: string;
  description?: string;
  scripts: Record<string, string>;
  metadata?: {
    versioning?: {
      changelog?: string;
      releaseNotes?: string;
      compatibility?: string[];
      lastRelease?: string;
      nextRelease?: string;
    };
  };
}

interface VersionInfo {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
}

class VersionManager {
  private packageJsonPath = 'package.json';
  private changelogPath = 'CHANGELOG.md';
  private versionRcPath = '.versionrc';

  constructor() {
    console.log('🚀 Fire22 Dashboard Worker Version Manager');
    console.log('Following Bun.semver standards\n');
  }

  /**
   * Parse semantic version string into components
   */
  private parseVersion(version: string): VersionInfo {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?(?:\+(.+))?$/);
    if (!match) {
      throw new Error(`Invalid version format: ${version}`);
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
   * Format version components into semantic version string
   */
  private formatVersion(info: VersionInfo): string {
    let version = `${info.major}.${info.minor}.${info.patch}`;
    if (info.prerelease) {
      version += `-${info.prerelease}`;
    }
    if (info.build) {
      version += `+${info.build}`;
    }
    return version;
  }

  /**
   * Read package.json file
   */
  private readPackageJson(): PackageJson {
    try {
      const content = readFileSync(this.packageJsonPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to read ${this.packageJsonPath}: ${error.message}`);
    }
  }

  /**
   * Write package.json file
   */
  private writePackageJson(packageJson: PackageJson): void {
    try {
      writeFileSync(this.packageJsonPath, JSON.stringify(packageJson, null, 2));
    } catch (error) {
      throw new Error(`Failed to write ${this.packageJsonPath}: ${error.message}`);
    }
  }

  /**
   * Get current version from package.json
   */
  private getCurrentVersion(): string {
    const packageJson = this.readPackageJson();
    return packageJson.version;
  }

  /**
   * Update version in package.json
   */
  private updateVersion(type: 'major' | 'minor' | 'patch'): string {
    const packageJson = this.readPackageJson();
    const currentVersion = packageJson.version;
    const versionInfo = this.parseVersion(currentVersion);

    let newVersion: string;
    switch (type) {
      case 'major':
        newVersion = this.formatVersion({
          ...versionInfo,
          major: versionInfo.major + 1,
          minor: 0,
          patch: 0,
        });
        break;
      case 'minor':
        newVersion = this.formatVersion({
          ...versionInfo,
          minor: versionInfo.minor + 1,
          patch: 0,
        });
        break;
      case 'patch':
        newVersion = this.formatVersion({
          ...versionInfo,
          patch: versionInfo.patch + 1,
        });
        break;
      default:
        throw new Error(`Invalid version type: ${type}`);
    }

    // Update package.json version
    packageJson.version = newVersion;

    // Update metadata
    if (!packageJson.metadata) {
      packageJson.metadata = {};
    }
    if (!packageJson.metadata.versioning) {
      packageJson.metadata.versioning = {};
    }

    packageJson.metadata.versioning.lastRelease = currentVersion;
    packageJson.metadata.versioning.nextRelease = newVersion;

    this.writePackageJson(packageJson);
    return newVersion;
  }

  /**
   * Execute Git commands
   */
  private executeGitCommands(newVersion: string): void {
    try {
      console.log('📝 Committing version change...');
      execSync('git add package.json', { stdio: 'inherit' });
      execSync(`git commit -m "chore: bump version to ${newVersion}"`, { stdio: 'inherit' });

      console.log('🏷️  Creating Git tag...');
      execSync(`git tag -a v${newVersion} -m "Release ${newVersion}"`, { stdio: 'inherit' });

      console.log('🚀 Pushing changes...');
      execSync('git push', { stdio: 'inherit' });
      execSync(`git push origin v${newVersion}`, { stdio: 'inherit' });
    } catch (error) {
      console.warn('⚠️  Git operations failed, but version was updated in package.json');
      console.warn(`Error: ${error.message}`);
    }
  }

  /**
   * Generate changelog entry
   */
  private generateChangelogEntry(newVersion: string, type: string): void {
    const date = new Date().toISOString().split('T')[0];
    const entry = `\n## [${newVersion}] - ${date}\n### ${type.charAt(0).toUpperCase() + type.slice(1)}\n- Version bump from ${this.getCurrentVersion()} to ${newVersion}\n- Automated release via Bun version manager\n\n`;

    try {
      let changelog = '';
      if (existsSync(this.changelogPath)) {
        changelog = readFileSync(this.changelogPath, 'utf8');
      } else {
        changelog = this.getDefaultChangelog();
      }

      // Insert new entry after ## [Unreleased]
      const unreleasedIndex = changelog.indexOf('## [Unreleased]');
      if (unreleasedIndex !== -1) {
        const beforeUnreleased = changelog.substring(0, unreleasedIndex);
        const afterUnreleased = changelog.substring(unreleasedIndex);
        changelog = beforeUnreleased + entry + afterUnreleased;
      } else {
        changelog = entry + changelog;
      }

      writeFileSync(this.changelogPath, changelog);
      console.log(`📝 Changelog updated: ${this.changelogPath}`);
    } catch (error) {
      console.warn('⚠️  Failed to update changelog');
      console.warn(`Error: ${error.message}`);
    }
  }

  /**
   * Get default changelog template
   */
  private getDefaultChangelog(): string {
    return `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

<!-- Add unreleased changes here -->

`;
  }

  /**
   * Initialize versioning system
   */
  private initializeVersioning(): void {
    console.log('🔧 Initializing versioning system...');

    // Create .versionrc
    const versionRc = {
      types: [
        { type: 'feat', section: 'Features' },
        { type: 'fix', section: 'Bug Fixes' },
        { type: 'docs', section: 'Documentation' },
        { type: 'style', section: 'Styles' },
        { type: 'refactor', section: 'Code Refactoring' },
        { type: 'perf', section: 'Performance Improvements' },
        { type: 'test', section: 'Tests' },
        { type: 'chore', section: 'Chores' },
      ],
      releaseCommitMessageFormat: 'chore(release): {{currentTag}}',
      issuePrefixes: ['#'],
      commitUrlFormat:
        'https://github.com/brendadeeznuts1111/fire22-dashboard-worker/commit/{{hash}}',
      compareUrlFormat:
        'https://github.com/brendadeeznuts1111/fire22-dashboard-worker/compare/{{previousTag}}...{{currentTag}}',
      issueUrlFormat: 'https://github.com/brendadeeznuts1111/fire22-dashboard-worker/issues/{{id}}',
    };

    writeFileSync(this.versionRcPath, JSON.stringify(versionRc, null, 2));
    console.log(`✅ Created ${this.versionRcPath}`);

    // Create CHANGELOG.md
    if (!existsSync(this.changelogPath)) {
      writeFileSync(this.changelogPath, this.getDefaultChangelog());
      console.log(`✅ Created ${this.changelogPath}`);
    }

    // Update package.json scripts
    const packageJson = this.readPackageJson();
    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }

    const versionScripts = {
      'version:patch': 'bun run scripts/version.ts patch',
      'version:minor': 'bun run scripts/version.ts minor',
      'version:major': 'bun run scripts/version.ts major',
      'version:show': 'bun run scripts/version.ts show',
      'version:init': 'bun run scripts/version.ts init',
    };

    Object.assign(packageJson.scripts, versionScripts);
    this.writePackageJson(packageJson);

    console.log('✅ Versioning system initialized!');
    console.log('📝 Added version scripts to package.json');
    console.log('🔧 Created .versionrc configuration');
    console.log('📋 Created CHANGELOG.md template');
  }

  /**
   * Show current version information
   */
  private showVersion(): void {
    const packageJson = this.readPackageJson();
    const currentVersion = packageJson.version;
    const versionInfo = this.parseVersion(currentVersion);

    console.log('📦 Current Version Information:');
    console.log(`   Package: ${packageJson.name}`);
    console.log(`   Version: ${currentVersion}`);
    console.log(`   Major: ${versionInfo.major}`);
    console.log(`   Minor: ${versionInfo.minor}`);
    console.log(`   Patch: ${versionInfo.patch}`);

    if (packageJson.metadata?.versioning) {
      console.log(`   Last Release: ${packageJson.metadata.versioning.lastRelease || 'N/A'}`);
      console.log(`   Next Release: ${packageJson.metadata.versioning.nextRelease || 'N/A'}`);
    }

    console.log('\n🚀 Available Commands:');
    console.log('   bun run version:patch  # Bump patch version');
    console.log('   bun run version:minor  # Bump minor version');
    console.log('   bun run version:major  # Bump major version');
    console.log('   bun run version:show   # Show version info');
    console.log('   bun run version:init   # Initialize versioning');
  }

  /**
   * Bump version
   */
  private bumpVersion(type: 'major' | 'minor' | 'patch'): void {
    const currentVersion = this.getCurrentVersion();
    console.log(`🔄 Bumping ${type} version...`);
    console.log(`   Current: ${currentVersion}`);

    const newVersion = this.updateVersion(type);
    console.log(`   New: ${newVersion}`);

    this.executeGitCommands(newVersion);
    this.generateChangelogEntry(newVersion, type);

    console.log('\n🎉 Version bump completed successfully!');
    console.log(`✅ Version: ${currentVersion} → ${newVersion}`);
    console.log(`✅ Git tag: v${newVersion}`);
    console.log(`✅ Changelog: Updated`);
  }

  /**
   * Main execution method
   */
  async run(): Promise<void> {
    const args = process.argv.slice(2);
    const command = args[0];

    try {
      switch (command) {
        case 'patch':
          this.bumpVersion('patch');
          break;
        case 'minor':
          this.bumpVersion('minor');
          break;
        case 'major':
          this.bumpVersion('major');
          break;
        case 'show':
          this.showVersion();
          break;
        case 'init':
          this.initializeVersioning();
          break;
        default:
          console.log('❌ Invalid command. Usage:');
          console.log('   bun run scripts/version.ts [patch|minor|major|show|init]');
          console.log('\nExamples:');
          console.log('   bun run scripts/version.ts patch    # 1.0.0 → 1.0.1');
          console.log('   bun run scripts/version.ts minor    # 1.0.0 → 1.1.0');
          console.log('   bun run scripts/version.ts major    # 1.0.0 → 2.0.0');
          console.log('   bun run scripts/version.ts show     # Display current version');
          console.log('   bun run scripts/version.ts init     # Initialize versioning');
          process.exit(1);
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  }
}

// Main execution
if (import.meta.main) {
  const versionManager = new VersionManager();
  versionManager.run();
}
