#!/usr/bin/env bun
/**
 * Fire22 Version Manager - Following Bun Semver Conventions
 * Enterprise-grade version management with semantic versioning
 */

import { $ } from 'bun';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import semver from 'semver';

interface VersionConfig {
  current: string;
  bump:
    | 'major'
    | 'minor'
    | 'patch'
    | 'prerelease'
    | 'premajor'
    | 'preminor'
    | 'prepatch'
    | 'prerelease';
  prerelease?: string;
  build?: string;
  channel?: 'stable' | 'testing' | 'development' | 'architecture';
}

interface DomainVersion {
  name: string;
  version: string;
  status: 'live' | 'testing' | 'development' | 'planned';
}

class Fire22VersionManager {
  private config: VersionConfig;
  private packagePath: string;
  private bunfigPath: string;
  private domains: DomainVersion[];

  constructor() {
    this.packagePath = join(process.cwd(), 'package.json');
    this.bunfigPath = join(process.cwd(), 'bunfig.toml');
    this.config = this.loadConfig();
    this.domains = this.loadDomainVersions();
  }

  private loadConfig(): VersionConfig {
    if (!existsSync(this.packagePath)) {
      throw new Error('package.json not found');
    }

    const packageJson = JSON.parse(readFileSync(this.packagePath, 'utf-8'));
    const currentVersion = packageJson.version || '0.1.0';

    return {
      current: currentVersion,
      bump: 'patch',
      channel: 'stable',
    };
  }

  private loadDomainVersions(): DomainVersion[] {
    // Load domain versions from architecture documents
    const domains: DomainVersion[] = [
      { name: 'collections', version: '1.0.0', status: 'live' },
      { name: 'balance', version: '1.0.0', status: 'live' },
      { name: 'wager-system', version: '1.0.0', status: 'live' },
      { name: 'settlement', version: '0.1.0-testing', status: 'testing' },
      { name: 'vip-management', version: '1.0.0', status: 'live' },
      { name: 'user-management', version: '1.0.0', status: 'live' },
      { name: 'fantasy42', version: '1.0.0', status: 'live' },
      { name: 'telegram-integration', version: '1.0.0', status: 'live' },
      { name: 'dashboard', version: '1.0.0', status: 'live' },
      { name: 'health-monitoring', version: '1.0.0', status: 'live' },
      { name: 'security', version: '1.0.0', status: 'live' },
      { name: 'database', version: '1.0.0', status: 'live' },
    ];

    return domains;
  }

  private validateVersion(version: string): boolean {
    return semver.valid(version) !== null;
  }

  private async generateBuildMetadata(): Promise<string> {
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const commit = await $`git rev-parse --short HEAD`.text().trim();
    return `${timestamp}.${commit}`;
  }

  private async updatePackageJson(newVersion: string): Promise<void> {
    try {
      // Use Bun's native package management for version updates
      await $`bun pm pkg set version="${newVersion}"`;

      // Verify the update was successful
      const updatedVersion = await $`bun pm pkg get version`.text().trim();
      const cleanVersion = updatedVersion.replace(/"/g, '').trim();

      if (cleanVersion !== newVersion) {
        throw new Error(`Version update failed: expected ${newVersion}, got ${cleanVersion}`);
      }

      console.log(`✅ Updated package.json version to: ${newVersion} (using Bun native commands)`);
    } catch (error) {
      // Fallback to manual file update if Bun commands fail
      console.log(`⚠️  Falling back to manual package.json update...`);
      const packageJson = JSON.parse(readFileSync(this.packagePath, 'utf-8'));
      packageJson.version = newVersion;
      writeFileSync(this.packagePath, JSON.stringify(packageJson, null, 2));
      console.log(`✅ Updated package.json version to: ${newVersion} (manual update)`);
    }
  }

  private async updateArchitectureDocuments(newVersion: string): Promise<void> {
    const architectureFiles = [
      'FIRE22_DOMAIN_ARCHITECTURE.md',
      'FIRE22_DOMAIN_ARCHITECTURE_V2.3.md',
      'FIRE22_DOMAIN_ARCHITECTURE_ENHANCED.md',
    ];

    for (const file of architectureFiles) {
      const filePath = join(process.cwd(), file);
      if (existsSync(filePath)) {
        let content = readFileSync(filePath, 'utf-8');
        content = content.replace(
          /ARCHITECTURE VERSION.*$/m,
          `ARCHITECTURE VERSION: FF-Domain-Architecture-${newVersion}`
        );
        writeFileSync(filePath, content);
        console.log(`✅ Updated ${file} version to: ${newVersion}`);
      }
    }
  }

  private async createGitTag(version: string): Promise<void> {
    const tagName = `v${version}`;
    const message = `Release ${version}

Fire22 Enterprise System v${version}
- Following Bun semver conventions
- Domain-Driven Architecture
- Enterprise-grade versioning

Architecture: FF-Domain-Architecture-${version}
Status: Production Live 🟢`;

    await $`git add .`;
    await $`git commit -m "chore: Release v${version}"`;
    await $`git tag -a ${tagName} -m "${message}"`;
    console.log(`✅ Created git tag: ${tagName}`);
  }

  private async generateChangelog(version: string): Promise<void> {
    const changelogPath = join(process.cwd(), 'CHANGELOG.md');

    let changelog = '';
    if (existsSync(changelogPath)) {
      changelog = readFileSync(changelogPath, 'utf-8');
    }

    const newEntry = `# Changelog

## [${version}] - ${new Date().toISOString().split('T')[0]}

### Added
- Fire22 Domain Architecture v${version}
- Bun semver version management system
- Enterprise-grade versioning conventions
- Domain-driven design implementation

### Changed
- Updated package.json with proper versioning
- Enhanced bunfig.toml with version management
- Standardized version format across all documents

### Technical Details
- **Architecture**: Domain-Driven Design
- **Runtime**: Bun v1.x with enhanced performance
- **Version Format**: Semantic versioning with Bun conventions
- **Build Metadata**: Timestamp and commit hash included

---

${changelog}`;

    writeFileSync(changelogPath, newEntry);
    console.log(`✅ Generated changelog for version: ${version}`);
  }

  // Public API methods

  async bumpVersion(
    type: VersionConfig['bump'],
    options: Partial<VersionConfig> = {}
  ): Promise<string> {
    const { prerelease, build, channel } = options;

    let newVersion = this.config.current;

    switch (type) {
      case 'major':
        newVersion = semver.inc(this.config.current, 'major')!;
        break;
      case 'minor':
        newVersion = semver.inc(this.config.current, 'minor')!;
        break;
      case 'patch':
        newVersion = semver.inc(this.config.current, 'patch')!;
        break;
      case 'prerelease':
        newVersion = semver.inc(this.config.current, 'prerelease', prerelease || 'beta')!;
        break;
      case 'premajor':
        newVersion = semver.inc(this.config.current, 'premajor', prerelease || 'beta')!;
        break;
      case 'preminor':
        newVersion = semver.inc(this.config.current, 'preminor', prerelease || 'beta')!;
        break;
      case 'prepatch':
        newVersion = semver.inc(this.config.current, 'prepatch', prerelease || 'beta')!;
        break;
    }

    // Add build metadata if provided
    if (build || channel) {
      const buildMeta = build || (await this.generateBuildMetadata());
      newVersion = `${newVersion}+${buildMeta}`;
    }

    // Add prerelease identifier for non-stable channels
    if (channel && channel !== 'stable') {
      newVersion = `${newVersion}-${channel}`;
    }

    if (!this.validateVersion(newVersion)) {
      throw new Error(`Invalid version generated: ${newVersion}`);
    }

    console.log(`📈 Version bump: ${this.config.current} → ${newVersion}`);
    return newVersion;
  }

  async release(newVersion?: string): Promise<void> {
    const version = newVersion || this.config.current;

    if (!this.validateVersion(version)) {
      throw new Error(`Invalid version: ${version}`);
    }

    console.log(`🚀 Starting release process for version: ${version}`);

    // Update package.json
    await this.updatePackageJson(version);

    // Update architecture documents
    await this.updateArchitectureDocuments(version);

    // Generate changelog
    await this.generateChangelog(version);

    // Create git tag
    await this.createGitTag(version);

    console.log(`✅ Release ${version} completed successfully!`);
    console.log(`🔗 Git tag created: v${version}`);
    console.log(`📝 Changelog updated in CHANGELOG.md`);
  }

  async status(): Promise<void> {
    console.log(`📊 Fire22 Version Status`);
    console.log(`═══════════════════════════════`);
    console.log(`Current Version: ${this.config.current}`);
    console.log(`Next Major: ${semver.inc(this.config.current, 'major')}`);
    console.log(`Next Minor: ${semver.inc(this.config.current, 'minor')}`);
    console.log(`Next Patch: ${semver.inc(this.config.current, 'patch')}`);
    console.log(``);

    console.log(`🏗️ Domain Versions:`);
    this.domains.forEach(domain => {
      const statusEmoji = {
        live: '🟢',
        testing: '🟡',
        development: '🟠',
        planned: '🔴',
      }[domain.status];

      console.log(`  ${statusEmoji} ${domain.name}: ${domain.version}`);
    });
  }

  async validate(): Promise<boolean> {
    console.log(`🔍 Validating version configuration...`);

    const issues: string[] = [];

    // Validate current version
    if (!this.validateVersion(this.config.current)) {
      issues.push(`❌ Invalid current version: ${this.config.current}`);
    }

    // Check required files exist
    const requiredFiles = ['package.json', 'bunfig.toml'];
    for (const file of requiredFiles) {
      if (!existsSync(join(process.cwd(), file))) {
        issues.push(`❌ Missing required file: ${file}`);
      }
    }

    // Check architecture documents
    const archFiles = [
      'FIRE22_DOMAIN_ARCHITECTURE.md',
      'COMPREHENSIVE_SYSTEM_BLUEPRINT.md',
      'SYSTEM_ARCHITECTURE_OVERVIEW.md',
    ];
    for (const file of archFiles) {
      if (!existsSync(join(process.cwd(), file))) {
        issues.push(`⚠️ Missing architecture document: ${file}`);
      }
    }

    if (issues.length === 0) {
      console.log(`✅ All validations passed!`);
      return true;
    } else {
      console.log(`❌ Validation failed:`);
      issues.forEach(issue => console.log(`   ${issue}`));
      return false;
    }
  }

  async changelog(): Promise<void> {
    const version = this.config.current;
    await this.generateChangelog(version);
    console.log(`📝 Changelog generated for version: ${version}`);
  }

  async tag(): Promise<void> {
    const version = this.config.current;
    await this.createGitTag(version);
    console.log(`🏷️ Git tag created: v${version}`);
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const manager = new Fire22VersionManager();

  try {
    if (args.length === 0) {
      await manager.status();
      return;
    }

    const command = args[0];
    const options = args.slice(1);

    switch (command) {
      case '--bump':
        const bumpType = options[0] as VersionConfig['bump'];
        const newVersion = await manager.bumpVersion(bumpType, {
          prerelease: options.includes('--prerelease')
            ? options[options.indexOf('--prerelease') + 1]
            : undefined,
          build: options.includes('--build') ? options[options.indexOf('--build') + 1] : undefined,
          channel: options.includes('--channel')
            ? (options[options.indexOf('--channel') + 1] as any)
            : undefined,
        });
        console.log(`📈 New version: ${newVersion}`);
        break;

      case '--release':
        const releaseVersion = options[0] || manager['config'].current;
        await manager.release(releaseVersion);
        break;

      case '--status':
        await manager.status();
        break;

      case '--validate':
        const isValid = await manager.validate();
        process.exit(isValid ? 0 : 1);
        break;

      case '--changelog':
        await manager.changelog();
        break;

      case '--tag':
        await manager.tag();
        break;

      default:
        console.log(`🔧 Fire22 Version Manager - Bun Semver Conventions`);
        console.log(``);
        console.log(`Usage:`);
        console.log(`  bun run scripts/version-manager.ts --bump <type> [options]`);
        console.log(`  bun run scripts/version-manager.ts --release [version]`);
        console.log(`  bun run scripts/version-manager.ts --status`);
        console.log(`  bun run scripts/version-manager.ts --validate`);
        console.log(`  bun run scripts/version-manager.ts --changelog`);
        console.log(`  bun run scripts/version-manager.ts --tag`);
        console.log(``);
        console.log(`Bump Types: major, minor, patch, prerelease, premajor, preminor, prepatch`);
        console.log(
          `Options: --prerelease <id>, --build <meta>, --channel <stable|testing|development|architecture>`
        );
        break;
    }
  } catch (error) {
    console.error(`❌ Error:`, error.message);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}

export { Fire22VersionManager, type VersionConfig, type DomainVersion };
