#!/usr/bin/env bun

/**
 * 🚀 Fire22 Dashboard Enhanced Version Manager
 * Advanced semantic versioning with changelog generation and deployment integration
 *
 * Usage:
 *   bun run version:manager status      # Show version status
 *   bun run version:manager bump patch  # Increment patch version
 *   bun run version:manager bump minor  # Increment minor version
 *   bun run version:manager bump major  # Increment major version
 *   bun run version:manager changelog   # Generate changelog
 *   bun run version:manager validate    # Validate version configuration
 *   bun run version:manager release     # Create release with notes
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

interface VersionInfo {
  current: string;
  previous: string;
  next: string;
  buildNumber: number;
  buildDate: string;
  changelog: string[];
  breakingChanges: string[];
  newFeatures: string[];
  bugFixes: string[];
  securityUpdates: string[];
}

interface ReleaseInfo {
  version: string;
  type: 'patch' | 'minor' | 'major' | 'prerelease';
  date: string;
  description: string;
  author: string;
  changes: string[];
  breakingChanges: string[];
  newFeatures: string[];
  bugFixes: string[];
  securityUpdates: string[];
}

interface ChangelogEntry {
  version: string;
  date: string;
  type: 'patch' | 'minor' | 'major' | 'prerelease';
  changes: string[];
  breakingChanges: string[];
  newFeatures: string[];
  bugFixes: string[];
  securityUpdates: string[];
}

class EnhancedVersionManager {
  private packagePath = './package.json';
  private changelogPath = './CHANGELOG.md';
  private versionRcPath = './.versionrc';
  private releasesPath = './releases';

  constructor() {
    this.ensureReleasesDirectory();
  }

  private ensureReleasesDirectory(): void {
    if (!existsSync(this.releasesPath)) {
      execSync(`mkdir -p ${this.releasesPath}`);
    }
  }

  async getCurrentVersion(): Promise<string> {
    try {
      const packageJson = JSON.parse(readFileSync(this.packagePath, 'utf8'));
      return packageJson.version;
    } catch (error) {
      throw new Error(`Failed to read package.json: ${error.message}`);
    }
  }

  async getMetadata(path: string): Promise<string> {
    try {
      const packageJson = JSON.parse(readFileSync(this.packagePath, 'utf8'));
      const keys = path.split('.');
      let value: any = packageJson;

      for (const key of keys) {
        value = value[key];
        if (value === undefined) return 'unknown';
      }

      return typeof value === 'string' ? value : JSON.stringify(value);
    } catch (error) {
      return 'unknown';
    }
  }

  async bumpVersion(type: 'patch' | 'minor' | 'major' | 'prerelease'): Promise<void> {
    console.log(`🚀 Bumping version (${type})...`);

    try {
      // Check if this is a git repository
      const isGitRepo = await this.checkGitRepository();

      if (isGitRepo) {
        // Run the appropriate version bump command
        const command = `bun run version:${type}`;
        execSync(command, { stdio: 'inherit' });
      } else {
        // Manual version bump for non-git repositories
        await this.manualVersionBump(type);
      }

      // Get the new version
      const newVersion = await this.getCurrentVersion();
      console.log(`✅ Version bumped to ${newVersion}`);

      // Update metadata
      await this.updateVersionMetadata(newVersion, type);

      // Generate changelog entry
      await this.generateChangelogEntry(newVersion, type);

      // Create release notes
      await this.createReleaseNotes(newVersion, type);
    } catch (error) {
      console.error(`❌ Failed to bump version (${type}):`, error);
      throw error;
    }
  }

  private async checkGitRepository(): Promise<boolean> {
    try {
      execSync('git rev-parse --git-dir', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  private async manualVersionBump(type: 'patch' | 'minor' | 'major' | 'prerelease'): Promise<void> {
    console.log(`📝 Manual version bump for non-git repository...`);

    try {
      const packageJson = JSON.parse(readFileSync(this.packagePath, 'utf8'));
      const currentVersion = packageJson.version;
      const newVersion = this.calculateNextVersion(currentVersion, type);

      // Update package.json version
      packageJson.version = newVersion;
      writeFileSync(this.packagePath, JSON.stringify(packageJson, null, 2));

      console.log(`✅ Version updated: ${currentVersion} → ${newVersion}`);
    } catch (error) {
      throw new Error(`Manual version bump failed: ${error.message}`);
    }
  }

  private calculateNextVersion(
    currentVersion: string,
    type: 'patch' | 'minor' | 'major' | 'prerelease'
  ): string {
    const [major, minor, patch] = currentVersion.split('.').map(Number);

    switch (type) {
      case 'major':
        return `${major + 1}.0.0`;
      case 'minor':
        return `${major}.${minor + 1}.0`;
      case 'patch':
        return `${major}.${minor}.${patch + 1}`;
      case 'prerelease':
        return `${major}.${minor}.${patch + 1}-beta.1`;
      default:
        return currentVersion;
    }
  }

  private async updateVersionMetadata(version: string, type: string): Promise<void> {
    try {
      const packageJson = JSON.parse(readFileSync(this.packagePath, 'utf8'));

      if (!packageJson.metadata) {
        packageJson.metadata = {};
      }

      if (!packageJson.metadata.versioning) {
        packageJson.metadata.versioning = {};
      }

      packageJson.metadata.versioning = {
        ...packageJson.metadata.versioning,
        lastRelease: packageJson.metadata.versioning?.current || 'unknown',
        current: version,
        lastUpdated: new Date().toISOString(),
        releaseType: type,
        buildNumber: Date.now(),
      };

      writeFileSync(this.packagePath, JSON.stringify(packageJson, null, 2));
      console.log(`✅ Updated version metadata`);
    } catch (error) {
      console.error(`⚠️ Failed to update metadata: ${error.message}`);
    }
  }

  async generateChangelogEntry(
    version: string,
    type: 'patch' | 'minor' | 'major' | 'prerelease'
  ): Promise<void> {
    const entry: ChangelogEntry = {
      version,
      date: new Date().toISOString().split('T')[0],
      type,
      changes: [],
      breakingChanges: [],
      newFeatures: [],
      bugFixes: [],
      securityUpdates: [],
    };

    // Generate default changelog content based on type
    switch (type) {
      case 'major':
        entry.breakingChanges = ['Breaking changes introduced in this version'];
        entry.newFeatures = ['Major new features added'];
        break;
      case 'minor':
        entry.newFeatures = ['New features added'];
        entry.bugFixes = ['Bug fixes and improvements'];
        break;
      case 'patch':
        entry.bugFixes = ['Bug fixes and minor improvements'];
        break;
      case 'prerelease':
        entry.changes = ['Pre-release version for testing'];
        break;
    }

    // Add to changelog
    await this.addToChangelog(entry);
    console.log(`✅ Generated changelog entry for ${version}`);
  }

  private async addToChangelog(entry: ChangelogEntry): Promise<void> {
    let changelog = '';

    if (existsSync(this.changelogPath)) {
      changelog = readFileSync(this.changelogPath, 'utf8');
    } else {
      changelog = this.getDefaultChangelog();
    }

    const entryContent = this.formatChangelogEntry(entry);
    const newChangelog = entryContent + '\n\n' + changelog;

    writeFileSync(this.changelogPath, newChangelog);
  }

  private formatChangelogEntry(entry: ChangelogEntry): string {
    let content = `## [${entry.version}] - ${entry.date}\n\n`;

    if (entry.breakingChanges.length > 0) {
      content += '### ⚠️ BREAKING CHANGES\n';
      entry.breakingChanges.forEach(change => {
        content += `- ${change}\n`;
      });
      content += '\n';
    }

    if (entry.newFeatures.length > 0) {
      content += '### ✨ New Features\n';
      entry.newFeatures.forEach(feature => {
        content += `- ${feature}\n`;
      });
      content += '\n';
    }

    if (entry.bugFixes.length > 0) {
      content += '### 🐛 Bug Fixes\n';
      entry.bugFixes.forEach(fix => {
        content += `- ${fix}\n`;
      });
      content += '\n';
    }

    if (entry.securityUpdates.length > 0) {
      content += '### 🔒 Security Updates\n';
      entry.securityUpdates.forEach(update => {
        content += `- ${update}\n`;
      });
      content += '\n';
    }

    if (entry.changes.length > 0) {
      content += '### 📝 Changes\n';
      entry.changes.forEach(change => {
        content += `- ${change}\n`;
      });
      content += '\n';
    }

    return content;
  }

  private getDefaultChangelog(): string {
    return `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project setup
- Basic functionality

### Changed
- None

### Deprecated
- None

### Removed
- None

### Fixed
- None

### Security
- None

`;
  }

  async createReleaseNotes(
    version: string,
    type: 'patch' | 'minor' | 'major' | 'prerelease'
  ): Promise<void> {
    const releaseInfo: ReleaseInfo = {
      version,
      type,
      date: new Date().toISOString(),
      description: `${type.charAt(0).toUpperCase() + type.slice(1)} release ${version}`,
      author: 'Fire22 Dashboard Team',
      changes: [],
      breakingChanges: [],
      newFeatures: [],
      bugFixes: [],
      securityUpdates: [],
    };

    // Generate release notes content
    const releaseContent = this.generateReleaseNotes(releaseInfo);
    const releaseFile = `${this.releasesPath}/release-${version}.md`;

    writeFileSync(releaseFile, releaseContent);
    console.log(`✅ Created release notes: ${releaseFile}`);
  }

  private generateReleaseNotes(release: ReleaseInfo): string {
    return `# Release ${release.version}

**Release Date:** ${new Date(release.date).toLocaleDateString()}
**Release Type:** ${release.type.toUpperCase()}
**Author:** ${release.author}

## 📋 Release Summary

${release.description}

## 🔄 Changes in This Release

${release.changes.length > 0 ? release.changes.map(c => `- ${c}`).join('\n') : 'No general changes'}

## ⚠️ Breaking Changes

${release.breakingChanges.length > 0 ? release.breakingChanges.map(c => `- ${c}`).join('\n') : 'No breaking changes'}

## ✨ New Features

${release.newFeatures.length > 0 ? release.newFeatures.map(f => `- ${f}`).join('\n') : 'No new features'}

## 🐛 Bug Fixes

${release.bugFixes.length > 0 ? release.bugFixes.map(f => `- ${f}`).join('\n') : 'No bug fixes'}

## 🔒 Security Updates

${release.securityUpdates.length > 0 ? release.securityUpdates.map(s => `- ${s}`).join('\n') : 'No security updates'}

## 🚀 Deployment Notes

1. **Pre-deployment Checklist:**
   - [ ] All tests passing
   - [ ] Environment variables configured
   - [ ] Database migrations applied
   - [ ] Security audit completed

2. **Deployment Commands:**
   \`\`\`bash
   # Build the application
   bun run build
   
   # Run pre-deployment tests
   bun run test:checklist
   
   # Deploy to Cloudflare
   bun run deploy
   
   # Validate deployment
   bun run deploy:check
   \`\`\`

3. **Post-deployment Validation:**
   - [ ] Health checks passing
   - [ ] API endpoints responding
   - [ ] Dashboard accessible
   - [ ] Performance metrics normal

## 📊 Version Information

- **Previous Version:** ${this.getPreviousVersionSync()}
- **Current Version:** ${release.version}
- **Build Number:** ${Date.now()}
- **Build Date:** ${new Date().toISOString()}

## 🔗 Related Links

- [Dashboard](https://dashboard-worker.brendawill2233.workers.dev)
- [API Documentation](https://dashboard-worker.brendawill2233.workers.dev/docs)
- [Changelog](./CHANGELOG.md)

---
*Generated by Fire22 Dashboard Version Manager*
`;
  }

  private async getPreviousVersion(): Promise<string> {
    try {
      const packageJson = JSON.parse(readFileSync(this.packagePath, 'utf8'));
      return packageJson.metadata?.versioning?.lastRelease || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  private getPreviousVersionSync(): string {
    try {
      const packageJson = JSON.parse(readFileSync(this.packagePath, 'utf8'));
      return packageJson.metadata?.versioning?.lastRelease || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  async showStatus(): Promise<void> {
    const currentVersion = await this.getCurrentVersion();
    const metadata = await this.getMetadata('metadata.versioning');

    console.log('🚀 Fire22 Dashboard Version Status\n');
    console.log(`Current Version: ${currentVersion}`);
    console.log(`Last Release: ${await this.getPreviousVersion()}`);
    console.log(`Build Number: ${Date.now()}`);
    console.log(`Build Date: ${new Date().toISOString()}`);

    if (metadata !== 'unknown') {
      console.log(`\nVersion Metadata:\n${metadata}`);
    }

    console.log('\nAvailable Commands:');
    console.log('  bun run version:manager status      # Show this status');
    console.log('  bun run version:manager bump patch  # Increment patch version');
    console.log('  bun run version:manager bump minor  # Increment minor version');
    console.log('  bun run version:manager bump major  # Increment major version');
    console.log('  bun run version:manager changelog   # Generate changelog');
    console.log('  bun run version:manager validate    # Validate configuration');
    console.log('  bun run version:manager release     # Create release notes');
  }

  async validateConfiguration(): Promise<void> {
    console.log('🔍 Validating version configuration...\n');

    const checks = [
      { name: 'Package.json exists', check: () => existsSync(this.packagePath) },
      {
        name: 'Version field present',
        check: async () => {
          try {
            const version = await this.getCurrentVersion();
            return version && version !== 'unknown';
          } catch {
            return false;
          }
        },
      },
      { name: 'Changelog exists', check: () => existsSync(this.changelogPath) },
      { name: 'Releases directory exists', check: () => existsSync(this.releasesPath) },
      {
        name: 'Version scripts available',
        check: async () => {
          try {
            const packageJson = JSON.parse(readFileSync(this.packagePath, 'utf8'));
            return (
              packageJson.scripts &&
              (packageJson.scripts['version:patch'] ||
                packageJson.scripts['version:minor'] ||
                packageJson.scripts['version:major'])
            );
          } catch {
            return false;
          }
        },
      },
    ];

    let passedChecks = 0;

    for (const check of checks) {
      const result = await check.check();
      const status = result ? '✅' : '❌';
      console.log(`${status} ${check.name}`);
      if (result) passedChecks++;
    }

    console.log(`\nValidation Results: ${passedChecks}/${checks.length} checks passed`);

    if (passedChecks === checks.length) {
      console.log('🎉 Version configuration is valid!');
    } else {
      console.log('⚠️ Some configuration issues found. Run version:manager init to fix.');
    }
  }

  async initializeVersioning(): Promise<void> {
    console.log('🔧 Initializing enhanced versioning system...\n');

    // Create changelog if it doesn't exist
    if (!existsSync(this.changelogPath)) {
      writeFileSync(this.changelogPath, this.getDefaultChangelog());
      console.log('✅ Created CHANGELOG.md');
    }

    // Create .versionrc if it doesn't exist
    if (!existsSync(this.versionRcPath)) {
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
          { type: 'breaking', section: 'Breaking Changes' },
          { type: 'security', section: 'Security Updates' },
        ],
        releaseCommitMessageFormat: 'chore(release): {{currentTag}}',
        issuePrefixes: ['#'],
        commitUrlFormat:
          'https://github.com/brendadeeznuts1111/fire22-dashboard-worker/commit/{{hash}}',
        compareUrlFormat:
          'https://github.com/brendadeeznuts1111/fire22-dashboard-worker/compare/{{previousTag}}...{{currentTag}}',
        issueUrlFormat:
          'https://github.com/brendadeeznuts1111/fire22-dashboard-worker/issues/{{id}}',
      };

      writeFileSync(this.versionRcPath, JSON.stringify(versionRc, null, 2));
      console.log('✅ Created .versionrc');
    }

    // Ensure releases directory exists
    this.ensureReleasesDirectory();
    console.log('✅ Created releases directory');

    // Update package.json scripts
    await this.updatePackageScripts();

    console.log('\n🎉 Enhanced versioning system initialized!');
    console.log('📝 Run "bun run version:manager status" to see current status');
  }

  private async updatePackageScripts(): Promise<void> {
    try {
      const packageJson = JSON.parse(readFileSync(this.packagePath, 'utf8'));

      if (!packageJson.scripts) {
        packageJson.scripts = {};
      }

      const versionScripts = {
        'version:patch': 'bun run scripts/version.ts patch',
        'version:minor': 'bun run scripts/version.ts minor',
        'version:major': 'bun run scripts/version.ts major',
        'version:show': 'bun run scripts/version.ts show',
        'version:init': 'bun run scripts/version.ts init',
        'version:manager': 'bun run scripts/version-manager.ts',
      };

      Object.assign(packageJson.scripts, versionScripts);
      writeFileSync(this.packagePath, JSON.stringify(packageJson, null, 2));

      console.log('✅ Updated package.json scripts');
    } catch (error) {
      console.error(`⚠️ Failed to update package.json: ${error.message}`);
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const subcommand = args[1];

  const manager = new EnhancedVersionManager();

  try {
    switch (command) {
      case 'status':
        await manager.showStatus();
        break;

      case 'bump':
        if (!subcommand || !['patch', 'minor', 'major', 'prerelease'].includes(subcommand)) {
          console.log('❌ Invalid bump type. Use: patch, minor, major, or prerelease');
          process.exit(1);
        }
        await manager.bumpVersion(subcommand as any);
        break;

      case 'changelog':
        const version = await manager.getCurrentVersion();
        await manager.generateChangelogEntry(version, 'patch');
        break;

      case 'validate':
        await manager.validateConfiguration();
        break;

      case 'release':
        const currentVersion = await manager.getCurrentVersion();
        await manager.createReleaseNotes(currentVersion, 'patch');
        break;

      case 'init':
        await manager.initializeVersioning();
        break;

      default:
        console.log('🚀 Fire22 Dashboard Enhanced Version Manager\n');
        console.log('Usage:');
        console.log('  bun run version:manager status      # Show version status');
        console.log('  bun run version:manager bump patch  # Increment patch version');
        console.log('  bun run version:manager bump minor  # Increment minor version');
        console.log('  bun run version:manager bump major  # Increment major version');
        console.log('  bun run version:manager changelog   # Generate changelog');
        console.log('  bun run version:manager validate    # Validate configuration');
        console.log('  bun run version:manager release     # Create release notes');
        console.log('  bun run version:manager init        # Initialize versioning');
        console.log('\nExamples:');
        console.log('  bun run version:manager status      # Check current status');
        console.log('  bun run version:manager bump patch  # 1.0.0 → 1.0.1');
        console.log('  bun run version:manager bump minor  # 1.0.0 → 1.1.0');
        console.log('  bun run version:manager bump major  # 1.0.0 → 2.0.0');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Version manager error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main();
}
