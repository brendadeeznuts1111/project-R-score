#!/usr/bin/env bun

/**
 * Fire22 Dashboard Version Manager
 * Automated versioning, changelog generation, and release management
 *
 * @version 1.0.0
 * @author Fire22 Maintenance Team
 * @usage bun maintenance/version-manager.ts [patch|minor|major] [--dry-run]
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { $ } from 'bun';

interface VersionInfo {
  current: string;
  new: string;
  type: 'patch' | 'minor' | 'major';
  timestamp: string;
  changes: string[];
}

interface ChangelogEntry {
  version: string;
  date: string;
  type: 'patch' | 'minor' | 'major';
  changes: {
    added: string[];
    changed: string[];
    deprecated: string[];
    removed: string[];
    fixed: string[];
    security: string[];
  };
}

class VersionManager {
  private packagePath: string;
  private changelogPath: string;
  private dryRun: boolean;

  constructor(dryRun = false) {
    this.packagePath = join(process.cwd(), 'package.json');
    this.changelogPath = join(process.cwd(), 'CHANGELOG.md');
    this.dryRun = dryRun;
  }

  /**
   * 🔢 Bump version and update all related files
   */
  async bumpVersion(type: 'patch' | 'minor' | 'major'): Promise<VersionInfo> {
    console.log(`🔢 Fire22 Dashboard Version Manager`);
    console.log(`!==!==!==!==!==!==!==`);
    console.log(`📦 Bumping ${type} version...`);

    if (this.dryRun) {
      console.log(`🧪 DRY RUN MODE - No files will be modified\n`);
    }

    // Get current version
    const currentVersion = await this.getCurrentVersion();
    const newVersion = this.calculateNewVersion(currentVersion, type);

    console.log(`📊 Version: ${currentVersion} → ${newVersion}`);

    // Get recent changes from git
    const changes = await this.getRecentChanges();

    const versionInfo: VersionInfo = {
      current: currentVersion,
      new: newVersion,
      type,
      timestamp: new Date().toISOString(),
      changes,
    };

    // Update files
    if (!this.dryRun) {
      await this.updatePackageJson(newVersion);
      await this.updateChangelog(versionInfo);
      await this.updateDocumentationVersions(newVersion);
      await this.createGitTag(newVersion);
    }

    console.log(`\n✅ Version bump completed: ${newVersion}`);
    return versionInfo;
  }

  /**
   * 📖 Get current version from package.json
   */
  private async getCurrentVersion(): Promise<string> {
    if (!existsSync(this.packagePath)) {
      throw new Error('package.json not found');
    }

    const packageJson = JSON.parse(readFileSync(this.packagePath, 'utf-8'));
    return packageJson.version || '0.0.0';
  }

  /**
   * 🧮 Calculate new version based on semver rules
   */
  private calculateNewVersion(current: string, type: 'patch' | 'minor' | 'major'): string {
    const [major, minor, patch] = current.split('.').map(Number);

    switch (type) {
      case 'major':
        return `${major + 1}.0.0`;
      case 'minor':
        return `${major}.${minor + 1}.0`;
      case 'patch':
        return `${major}.${minor}.${patch + 1}`;
      default:
        throw new Error(`Invalid version type: ${type}`);
    }
  }

  /**
   * 📝 Get recent changes from git commits
   */
  private async getRecentChanges(): Promise<string[]> {
    try {
      // Get commits since last tag
      const lastTag = await $`git describe --tags --abbrev=0`.text().catch(() => '');
      const gitRange = lastTag ? `${lastTag.trim()}..HEAD` : '--all';

      const commits = await $`git log ${gitRange} --oneline --no-merges`.text();

      return commits
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.replace(/^[a-f0-9]+\s+/, '').trim())
        .slice(0, 20); // Limit to 20 most recent commits
    } catch (error) {
      console.warn('⚠️ Could not retrieve git changes:', error);
      return ['Manual version bump'];
    }
  }

  /**
   * 📦 Update package.json with new version
   */
  private async updatePackageJson(newVersion: string): Promise<void> {
    console.log('📦 Updating package.json...');

    const packageJson = JSON.parse(readFileSync(this.packagePath, 'utf-8'));
    packageJson.version = newVersion;

    writeFileSync(this.packagePath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`  ✅ Updated package.json to ${newVersion}`);
  }

  /**
   * 📋 Update CHANGELOG.md with new version entry
   */
  private async updateChangelog(versionInfo: VersionInfo): Promise<void> {
    console.log('📋 Updating CHANGELOG.md...');

    const changelogEntry = this.generateChangelogEntry(versionInfo);

    if (existsSync(this.changelogPath)) {
      const existingChangelog = readFileSync(this.changelogPath, 'utf-8');
      const updatedChangelog = this.insertChangelogEntry(existingChangelog, changelogEntry);
      writeFileSync(this.changelogPath, updatedChangelog);
    } else {
      const newChangelog = this.createNewChangelog(changelogEntry);
      writeFileSync(this.changelogPath, newChangelog);
    }

    console.log(`  ✅ Updated CHANGELOG.md with ${versionInfo.new}`);
  }

  /**
   * 📄 Generate changelog entry for version
   */
  private generateChangelogEntry(versionInfo: VersionInfo): string {
    const date = new Date().toISOString().split('T')[0];
    const typeEmoji =
      versionInfo.type === 'major' ? '🚀' : versionInfo.type === 'minor' ? '✨' : '🐛';

    let entry = `## [${versionInfo.new}] - ${date} ${typeEmoji}\n\n`;

    // Categorize changes
    const categorized = this.categorizeChanges(versionInfo.changes);

    if (categorized.added.length > 0) {
      entry += `### Added\n`;
      categorized.added.forEach(change => (entry += `- ${change}\n`));
      entry += '\n';
    }

    if (categorized.changed.length > 0) {
      entry += `### Changed\n`;
      categorized.changed.forEach(change => (entry += `- ${change}\n`));
      entry += '\n';
    }

    if (categorized.fixed.length > 0) {
      entry += `### Fixed\n`;
      categorized.fixed.forEach(change => (entry += `- ${change}\n`));
      entry += '\n';
    }

    if (categorized.security.length > 0) {
      entry += `### Security\n`;
      categorized.security.forEach(change => (entry += `- ${change}\n`));
      entry += '\n';
    }

    return entry;
  }

  /**
   * 🏷️ Categorize changes based on commit messages
   */
  private categorizeChanges(changes: string[]) {
    const categories = {
      added: [] as string[],
      changed: [] as string[],
      deprecated: [] as string[],
      removed: [] as string[],
      fixed: [] as string[],
      security: [] as string[],
    };

    changes.forEach(change => {
      const lower = change.toLowerCase();

      if (lower.includes('add') || lower.includes('new') || lower.includes('create')) {
        categories.added.push(change);
      } else if (lower.includes('fix') || lower.includes('bug') || lower.includes('resolve')) {
        categories.fixed.push(change);
      } else if (lower.includes('security') || lower.includes('vulnerability')) {
        categories.security.push(change);
      } else if (lower.includes('remove') || lower.includes('delete')) {
        categories.removed.push(change);
      } else if (lower.includes('deprecate')) {
        categories.deprecated.push(change);
      } else {
        categories.changed.push(change);
      }
    });

    return categories;
  }

  /**
   * 📝 Insert changelog entry into existing changelog
   */
  private insertChangelogEntry(existingChangelog: string, newEntry: string): string {
    const lines = existingChangelog.split('\n');
    const headerIndex = lines.findIndex(line => line.startsWith('# '));

    if (headerIndex === -1) {
      return newEntry + '\n' + existingChangelog;
    }

    // Find first version entry
    const firstVersionIndex = lines.findIndex(
      (line, index) => index > headerIndex && line.startsWith('## [')
    );

    if (firstVersionIndex === -1) {
      // No existing versions, add after header
      lines.splice(headerIndex + 1, 0, '', newEntry.trim());
    } else {
      // Insert before first existing version
      lines.splice(firstVersionIndex, 0, newEntry.trim(), '');
    }

    return lines.join('\n');
  }

  /**
   * 📄 Create new changelog file
   */
  private createNewChangelog(firstEntry: string): string {
    return `# Changelog

All notable changes to the Fire22 Dashboard project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

${firstEntry}`;
  }

  /**
   * 📚 Update documentation versions
   */
  private async updateDocumentationVersions(newVersion: string): Promise<void> {
    console.log('📚 Updating documentation versions...');

    const docFiles = [
      'docs/api/TASK-MANAGEMENT-API.md',
      'maintenance/fire22-maintenance-framework.md',
      'projects/fire22-department-outreach-project.md',
    ];

    let updatedFiles = 0;

    for (const docFile of docFiles) {
      const fullPath = join(process.cwd(), docFile);

      if (existsSync(fullPath)) {
        try {
          let content = readFileSync(fullPath, 'utf-8');

          // Update version references
          content = content.replace(
            /\*\*API Version:\*\* \d+\.\d+\.\d+/g,
            `**API Version:** ${newVersion}`
          );
          content = content.replace(
            /\*\*Version:\*\* \d+\.\d+\.\d+/g,
            `**Version:** ${newVersion}`
          );
          content = content.replace(/@version \d+\.\d+\.\d+/g, `@version ${newVersion}`);

          writeFileSync(fullPath, content);
          updatedFiles++;
        } catch (error) {
          console.warn(`  ⚠️ Could not update ${docFile}:`, error);
        }
      }
    }

    console.log(`  ✅ Updated ${updatedFiles} documentation files`);
  }

  /**
   * 🏷️ Create git tag for new version
   */
  private async createGitTag(newVersion: string): Promise<void> {
    console.log('🏷️ Creating git tag...');

    try {
      // Add changed files
      await $`git add package.json CHANGELOG.md docs/ maintenance/ projects/`;

      // Commit version bump
      await $`git commit -m "chore: bump version to ${newVersion}"`;

      // Create annotated tag
      await $`git tag -a v${newVersion} -m "Release version ${newVersion}"`;

      console.log(`  ✅ Created git tag v${newVersion}`);
      console.log(`  📝 Committed version bump changes`);
    } catch (error) {
      console.warn('  ⚠️ Could not create git tag:', error);
    }
  }

  /**
   * 📊 Generate version report
   */
  async generateVersionReport(): Promise<void> {
    console.log('📊 Generating version report...');

    try {
      const currentVersion = await this.getCurrentVersion();
      const tags = await $`git tag --sort=-version:refname`.text();
      const recentTags = tags
        .split('\n')
        .filter(tag => tag.trim())
        .slice(0, 10);

      const report = {
        currentVersion,
        recentTags,
        lastCommit: await $`git log -1 --oneline`.text().then(s => s.trim()),
        branch: await $`git branch --show-current`.text().then(s => s.trim()),
        timestamp: new Date().toISOString(),
      };

      const reportPath = join(process.cwd(), 'maintenance', 'reports', 'version-report.json');
      writeFileSync(reportPath, JSON.stringify(report, null, 2));

      console.log(`  ✅ Version report saved to ${reportPath}`);
    } catch (error) {
      console.warn('  ⚠️ Could not generate version report:', error);
    }
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const versionType = args[0] as 'patch' | 'minor' | 'major';
  const dryRun = args.includes('--dry-run');

  if (!versionType || !['patch', 'minor', 'major'].includes(versionType)) {
    console.error('Usage: bun maintenance/version-manager.ts [patch|minor|major] [--dry-run]');
    console.error('');
    console.error('Examples:');
    console.error('  bun maintenance/version-manager.ts patch        # 1.0.0 → 1.0.1');
    console.error('  bun maintenance/version-manager.ts minor        # 1.0.0 → 1.1.0');
    console.error('  bun maintenance/version-manager.ts major        # 1.0.0 → 2.0.0');
    console.error('  bun maintenance/version-manager.ts patch --dry-run  # Preview changes');
    process.exit(1);
  }

  try {
    const versionManager = new VersionManager(dryRun);
    const versionInfo = await versionManager.bumpVersion(versionType);
    await versionManager.generateVersionReport();

    console.log('\n🎉 Version management completed successfully!');

    if (!dryRun) {
      console.log('\n📋 Next steps:');
      console.log('1. Review the changes in CHANGELOG.md');
      console.log('2. Push changes: git push origin main');
      console.log('3. Push tags: git push origin --tags');
      console.log('4. Create release notes if needed');
    }
  } catch (error) {
    console.error('❌ Version management failed:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}

export { VersionManager };
