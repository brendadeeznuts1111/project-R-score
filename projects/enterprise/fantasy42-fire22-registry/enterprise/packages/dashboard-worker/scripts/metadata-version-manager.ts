#!/usr/bin/env bun

/**
 * 🏷️ Metadata-Driven Version Manager for Fire22 Workspace
 *
 * Leverages rich package metadata for sophisticated versioning across the monorepo:
 * - Semantic versioning with dependency awareness
 * - Build system integration with metadata
 * - Cross-package compatibility validation
 * - Automated changelog generation from metadata
 * - Integration with Fire22 build constants
 *
 * @version 3.0.8
 * @author Fire22 Development Team
 * @see docs/BUILD-INDEX.md for usage guide
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { generateBuildConstants } from './build-constants.ts';
import { AdvancedProcessManager } from './advanced-process-manager.ts';

export interface PackageMetadata {
  name: string;
  version: string;
  description: string;
  metadata?: {
    component?: string;
    responsibilities?: string[];
    testing?: Record<string, string>;
    benchmarks?: Record<string, string>;
    integration?: Record<string, string>;
    [key: string]: any;
  };
  config?: Record<string, any>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

export interface VersionStrategy {
  type: 'major' | 'minor' | 'patch' | 'prerelease' | 'auto';
  packages?: string[];
  reason?: string;
  breakingChanges?: string[];
  features?: string[];
  fixes?: string[];
}

export interface WorkspaceVersionInfo {
  rootVersion: string;
  packages: Map<string, PackageMetadata>;
  dependencyGraph: Map<string, string[]>;
  lastUpdate: Date;
  buildConstants: Record<string, any>;
}

export class MetadataVersionManager {
  private workspace: WorkspaceVersionInfo;
  private processManager: AdvancedProcessManager;

  constructor(private rootPath: string = process.cwd()) {
    this.processManager = new AdvancedProcessManager();
    this.workspace = {
      rootVersion: '0.0.0',
      packages: new Map(),
      dependencyGraph: new Map(),
      lastUpdate: new Date(),
      buildConstants: {},
    };
  }

  /**
   * 📊 Load and analyze all package metadata
   */
  async loadWorkspaceMetadata(): Promise<WorkspaceVersionInfo> {
    console.log('🔍 Loading workspace metadata...');

    // Load root package
    const rootPkg = await this.loadPackageMetadata(this.rootPath);
    if (rootPkg) {
      this.workspace.rootVersion = rootPkg.version;
    }

    // Load all packages in packages/ directory
    const packagesDir = join(this.rootPath, 'packages');
    if (existsSync(packagesDir)) {
      const packageDirs = await this.getPackageDirectories(packagesDir);

      for (const dir of packageDirs) {
        const pkg = await this.loadPackageMetadata(join(packagesDir, dir));
        if (pkg) {
          this.workspace.packages.set(pkg.name, pkg);
          const component = pkg.metadata?.component || pkg.name;
          console.log(`📦 Loaded ${pkg.name}@${pkg.version} (${component})`);
        }
      }
    }

    // Build dependency graph
    this.buildDependencyGraph();

    // Generate build constants with versioning info
    this.workspace.buildConstants = await this.generateVersionedBuildConstants();

    console.log(`✅ Loaded ${this.workspace.packages.size} packages`);
    return this.workspace;
  }

  /**
   * 🏗️ Generate build constants with versioning metadata
   */
  async generateVersionedBuildConstants(): Promise<Record<string, any>> {
    const baseConstants = await generateBuildConstants();

    // Add workspace version information
    const versionConstants = {
      WORKSPACE_VERSION: this.workspace.rootVersion,
      WORKSPACE_PACKAGES_COUNT: this.workspace.packages.size,
      WORKSPACE_BUILD_TIME: new Date().toISOString(),

      // Package versions
      PACKAGE_VERSIONS: Object.fromEntries(
        Array.from(this.workspace.packages.entries()).map(([name, pkg]) => [
          name.replace('@fire22/', '').toUpperCase() + '_VERSION',
          pkg.version,
        ])
      ),

      // Component metadata
      WORKSPACE_COMPONENTS: Array.from(this.workspace.packages.values()).map(pkg => ({
        name: pkg.metadata?.component || pkg.name,
        version: pkg.version,
        responsibilities: pkg.metadata?.responsibilities || [],
      })),

      // Dependency graph
      DEPENDENCY_GRAPH: Object.fromEntries(this.workspace.dependencyGraph),

      // Build metadata
      BUILD_METADATA: {
        timestamp: Date.now(),
        packagesBuilt: this.workspace.packages.size,
        dependencyCount: this.workspace.dependencyGraph.size,
        hasBreakingChanges: false, // Will be set by version strategy
      },
    };

    return {
      ...baseConstants,
      ...versionConstants,
    };
  }

  /**
   * 🔄 Bump versions across workspace with strategy
   */
  async bumpVersions(
    strategy: VersionStrategy,
    options: {
      commit?: boolean;
      tag?: boolean;
      push?: boolean;
      verbose?: boolean;
    } = {}
  ): Promise<Map<string, string>> {
    console.log(`🏷️ Bumping versions with strategy: ${strategy.type}`);
    const changes = new Map<string, string>();

    // Determine packages to version
    const packagesToVersion = strategy.packages
      ? Array.from(this.workspace.packages.keys()).filter(name =>
          strategy.packages!.some(pattern => name.includes(pattern))
        )
      : Array.from(this.workspace.packages.keys());

    // Apply versioning strategy
    for (const packageName of packagesToVersion) {
      const pkg = this.workspace.packages.get(packageName);
      if (!pkg) continue;

      const oldVersion = pkg.version;
      const newVersion = await this.calculateNewVersion(pkg, strategy);

      if (newVersion !== oldVersion) {
        changes.set(packageName, `${oldVersion} → ${newVersion}`);

        // Update package metadata
        pkg.version = newVersion;

        // Write updated package.json
        await this.updatePackageJson(packageName, pkg);
      }
    }

    // Update root version for all strategy types
    const rootPkg = await this.loadPackageMetadata(this.rootPath);
    if (rootPkg) {
      const oldRootVersion = rootPkg.version;
      const newRootVersion = await this.calculateNewVersion(rootPkg, strategy);

      if (newRootVersion !== oldRootVersion) {
        changes.set('root', `${oldRootVersion} → ${newRootVersion}`);
        await this.updateRootPackageVersion(newRootVersion);
        this.workspace.rootVersion = newRootVersion;
        console.log(`📦 Root package: ${oldRootVersion} → ${newRootVersion}`);
      }
    }

    // Update build constants with new versions
    this.workspace.buildConstants = await this.generateVersionedBuildConstants();

    // Git operations if requested
    if (options.commit || options.tag || options.push) {
      await this.performGitOperations(strategy, changes, options);
    }

    console.log(`✅ Updated ${changes.size} package versions`);
    return changes;
  }

  /**
   * 📋 Generate comprehensive changelog from metadata
   */
  async generateChangelog(since?: string): Promise<string> {
    const gitInfo = await this.getGitInfo();
    const changes: string[] = [
      `# Changelog - Fire22 Dashboard Worker`,
      ``,
      `## [${this.workspace.rootVersion}] - ${new Date().toISOString().split('T')[0]}`,
      ``,
    ];

    // Group changes by package
    const packageChangeLog = new Map<string, string[]>();

    for (const [name, pkg] of this.workspace.packages) {
      const componentChanges: string[] = [];

      // Add responsibilities as context
      if (pkg.metadata?.responsibilities) {
        componentChanges.push(`**Responsibilities**: ${pkg.metadata.responsibilities.join(', ')}`);
      }

      // Add version info
      componentChanges.push(`**Version**: ${pkg.version}`);

      // Add component-specific info
      if (pkg.metadata?.component) {
        componentChanges.push(`**Component**: ${pkg.metadata.component}`);
      }

      // Add configuration highlights
      if (pkg.config) {
        const configKeys = Object.keys(pkg.config);
        if (configKeys.length > 0) {
          componentChanges.push(`**Configuration**: ${configKeys.join(', ')}`);
        }
      }

      packageChangeLog.set(name, componentChanges);
    }

    // Format changelog sections
    for (const [packageName, packageChanges] of packageChangeLog) {
      changes.push(`### ${packageName}`);
      changes.push('');

      for (const change of packageChanges) {
        changes.push(`- ${change}`);
      }
      changes.push('');
    }

    // Add build system information
    changes.push(`### 🏗️ Build System`);
    changes.push('');
    changes.push(
      `- **Build Constants**: ${Object.keys(this.workspace.buildConstants).length} constants`
    );
    changes.push(`- **Packages Built**: ${this.workspace.packages.size}`);
    changes.push(`- **Dependencies**: ${this.workspace.dependencyGraph.size} relationships`);
    changes.push(`- **Git Commit**: ${gitInfo.commit}`);
    changes.push(`- **Git Branch**: ${gitInfo.branch}`);
    changes.push('');

    // Add compatibility matrix
    changes.push(`### 🔗 Package Compatibility`);
    changes.push('');
    changes.push('| Package | Version | Dependencies |');
    changes.push('|---------|---------|--------------|');

    for (const [name, pkg] of this.workspace.packages) {
      const deps = this.workspace.dependencyGraph.get(name) || [];
      const component = pkg.metadata?.component || name;
      changes.push(`| ${component} | ${pkg.version} | ${deps.length} |`);
    }

    return changes.join('\n');
  }

  /**
   * 🚀 Build workspace with version integration
   */
  async buildWorkspaceWithVersions(
    options: {
      packages?: string[];
      mode?: 'development' | 'production';
      updateConstants?: boolean;
      verbose?: boolean;
    } = {}
  ): Promise<{
    totalPackages: number;
    built: number;
    skipped: number;
    failed: number;
    results: Map<string, { success: boolean; skipped: boolean; reason?: string }>;
  }> {
    console.log('🏗️ Building workspace with version integration...');

    const packagesToBuild = options.packages || Array.from(this.workspace.packages.keys());
    const results = new Map<string, { success: boolean; skipped: boolean; reason?: string }>();

    // Update build constants if requested
    if (options.updateConstants) {
      console.log('🔧 Updating build constants...');
      this.workspace.buildConstants = await this.generateVersionedBuildConstants();
      await this.saveBuildConstants();
    }

    // Build packages in dependency order
    const buildOrder = this.getBuildOrder(packagesToBuild);
    let built = 0,
      skipped = 0,
      failed = 0;

    console.log(`📦 Building ${buildOrder.length} packages in dependency order...`);

    for (const packageName of buildOrder) {
      const pkg = this.workspace.packages.get(packageName);
      if (!pkg) {
        failed++;
        results.set(packageName, { success: false, skipped: false, reason: 'Package not found' });
        continue;
      }

      if (!options.verbose) {
        console.log(`📦 Building ${packageName}@${pkg.version}...`);
      }

      const buildResult = await this.buildPackage(packageName, {
        mode: options.mode || 'development',
        constants: this.workspace.buildConstants,
        verbose: options.verbose,
      });

      results.set(packageName, buildResult);

      if (buildResult.skipped) {
        skipped++;
      } else if (buildResult.success) {
        built++;
      } else {
        failed++;
      }
    }

    // Print summary
    console.log('\n📊 Build Summary:');
    console.log(`✅ Built: ${built}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`❌ Failed: ${failed}`);

    if (failed > 0) {
      console.log('\n❌ Failed Builds:');
      for (const [packageName, result] of results) {
        if (!result.success && !result.skipped) {
          console.log(`  - ${packageName}: ${result.reason || 'Unknown error'}`);
        }
      }
    }

    console.log('✅ Workspace build completed');

    return {
      totalPackages: packagesToBuild.length,
      built,
      skipped,
      failed,
      results,
    };
  }

  /**
   * 📊 Generate version status report
   */
  generateVersionReport(): string {
    const report: string[] = [
      '🏷️ **Fire22 Workspace Version Report**',
      '='.repeat(50),
      '',
      `📊 **Summary**`,
      `- Root Version: ${this.workspace.rootVersion}`,
      `- Total Packages: ${this.workspace.packages.size}`,
      `- Dependencies: ${this.workspace.dependencyGraph.size} relationships`,
      `- Last Updated: ${this.workspace.lastUpdate.toISOString()}`,
      '',
      `📦 **Package Versions**`,
    ];

    // Sort packages by name
    const sortedPackages = Array.from(this.workspace.packages.entries()).sort(([a], [b]) =>
      a.localeCompare(b)
    );

    for (const [name, pkg] of sortedPackages) {
      const component = pkg.metadata?.component || name;
      report.push(`- **${component}** (${name}): v${pkg.version}`);

      if (pkg.metadata?.responsibilities && pkg.metadata.responsibilities.length > 0) {
        report.push(
          `  - Responsibilities: ${pkg.metadata.responsibilities.slice(0, 2).join(', ')}${pkg.metadata.responsibilities.length > 2 ? '...' : ''}`
        );
      }

      const deps = this.workspace.dependencyGraph.get(name);
      if (deps && deps.length > 0) {
        report.push(`  - Dependencies: ${deps.join(', ')}`);
      }
    }

    report.push('');
    report.push(`🏗️ **Build Constants**`);
    report.push(`- Total Constants: ${Object.keys(this.workspace.buildConstants).length}`);
    report.push(
      `- Package Versions: ${Object.keys(this.workspace.buildConstants.PACKAGE_VERSIONS || {}).length}`
    );
    report.push(
      `- Components: ${(this.workspace.buildConstants.WORKSPACE_COMPONENTS || []).length}`
    );

    return report.join('\n');
  }

  /**
   * 🔀 Perform git operations (commit, tag, push)
   */
  private async performGitOperations(
    strategy: VersionStrategy,
    changes: Map<string, string>,
    options: { commit?: boolean; tag?: boolean; push?: boolean; verbose?: boolean }
  ): Promise<void> {
    if (options.verbose) {
      console.log('🔀 Performing git operations...');
    }

    // Create commit if requested
    if (options.commit) {
      const commitMessage = this.generateCommitMessage(strategy, changes);

      // Add all changed files
      const addResult = await this.processManager.execute({
        command: ['git', 'add', '.'],
        timeout: 30000,
      });

      if (!addResult.success) {
        console.warn(`⚠️ Git add failed: ${addResult.error}`);
        return;
      }

      // Commit changes
      const commitResult = await this.processManager.execute({
        command: ['git', 'commit', '-m', commitMessage],
        timeout: 30000,
      });

      if (commitResult.success) {
        console.log(`✅ Git commit created: ${commitMessage}`);
      } else {
        console.warn(`⚠️ Git commit failed: ${commitResult.error}`);
        return;
      }

      // Create tag if requested
      if (options.tag) {
        const tagName = `v${this.workspace.rootVersion}`;
        const tagResult = await this.processManager.execute({
          command: ['git', 'tag', tagName, '-m', `Release ${tagName}`],
          timeout: 15000,
        });

        if (tagResult.success) {
          console.log(`✅ Git tag created: ${tagName}`);
        } else {
          console.warn(`⚠️ Git tag failed: ${tagResult.error}`);
        }
      }

      // Push changes if requested
      if (options.push) {
        const pushResult = await this.processManager.execute({
          command: ['git', 'push'],
          timeout: 60000,
        });

        if (pushResult.success) {
          console.log(`✅ Changes pushed to remote`);

          // Push tags if created
          if (options.tag) {
            const pushTagResult = await this.processManager.execute({
              command: ['git', 'push', '--tags'],
              timeout: 30000,
            });

            if (pushTagResult.success) {
              console.log(`✅ Tags pushed to remote`);
            } else {
              console.warn(`⚠️ Push tags failed: ${pushTagResult.error}`);
            }
          }
        } else {
          console.warn(`⚠️ Git push failed: ${pushResult.error}`);
        }
      }
    }
  }

  /**
   * 💬 Generate commit message for version bump
   */
  private generateCommitMessage(strategy: VersionStrategy, changes: Map<string, string>): string {
    const changeCount = changes.size;
    const versionType = strategy.type;
    const reason = strategy.reason ? ` - ${strategy.reason}` : '';

    let message = `chore: bump ${versionType} versions (${changeCount} packages)${reason}\n\n`;

    // Add package changes
    for (const [packageName, change] of changes) {
      message += `- ${packageName}: ${change}\n`;
    }

    message += `\n🤖 Generated with [Claude Code](https://claude.ai/code)\n`;
    message += `Co-Authored-By: Claude <noreply@anthropic.com>`;

    return message;
  }

  // === PRIVATE METHODS ===

  private async loadPackageMetadata(packagePath: string): Promise<PackageMetadata | null> {
    const packageJsonPath = join(packagePath, 'package.json');

    if (!existsSync(packageJsonPath)) {
      return null;
    }

    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      return packageJson as PackageMetadata;
    } catch (error) {
      console.warn(`⚠️ Failed to load package.json from ${packagePath}:`, error);
      return null;
    }
  }

  private async getPackageDirectories(packagesDir: string): Promise<string[]> {
    try {
      const entries = readdirSync(packagesDir);
      const directories: string[] = [];

      for (const entry of entries) {
        if (entry.startsWith('.') || entry === 'README.md' || entry.endsWith('.ts')) {
          continue;
        }

        // Check if it's a directory with a package.json
        const entryPath = join(packagesDir, entry);
        const stat = statSync(entryPath);

        if (stat.isDirectory()) {
          const packageJsonPath = join(entryPath, 'package.json');

          if (existsSync(packageJsonPath)) {
            directories.push(entry);
          }
        }
      }

      return directories;
    } catch (error) {
      console.warn(`⚠️ Failed to read packages directory ${packagesDir}:`, error);
      return [];
    }
  }

  private buildDependencyGraph(): void {
    // Build internal dependency relationships
    for (const [name, pkg] of this.workspace.packages) {
      const deps: string[] = [];

      // Check dependencies for internal packages
      if (pkg.dependencies) {
        for (const depName of Object.keys(pkg.dependencies)) {
          if (this.workspace.packages.has(depName)) {
            deps.push(depName);
          }
        }
      }

      this.workspace.dependencyGraph.set(name, deps);
    }
  }

  private async calculateNewVersion(
    pkg: PackageMetadata,
    strategy: VersionStrategy
  ): Promise<string> {
    const [major, minor, patch] = pkg.version.split('.').map(Number);

    switch (strategy.type) {
      case 'major':
        return `${major + 1}.0.0`;
      case 'minor':
        return `${major}.${minor + 1}.0`;
      case 'patch':
        return `${major}.${minor}.${patch + 1}`;
      case 'prerelease':
        return `${major}.${minor}.${patch + 1}-alpha.1`;
      case 'auto':
        // Auto-determine based on metadata
        return strategy.breakingChanges?.length
          ? `${major + 1}.0.0`
          : strategy.features?.length
            ? `${major}.${minor + 1}.0`
            : `${major}.${minor}.${patch + 1}`;
      default:
        return pkg.version;
    }
  }

  private async updatePackageJson(packageName: string, pkg: PackageMetadata): Promise<void> {
    const packageDir = packageName.startsWith('@fire22/')
      ? join(this.rootPath, 'packages', packageName.replace('@fire22/', ''))
      : join(this.rootPath, 'packages', packageName);

    const packageJsonPath = join(packageDir, 'package.json');

    if (existsSync(packageJsonPath)) {
      writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2));
    }
  }

  private async updateRootPackageVersion(newVersion: string): Promise<void> {
    const rootPackageJsonPath = join(this.rootPath, 'package.json');

    if (existsSync(rootPackageJsonPath)) {
      const rootPkg = JSON.parse(readFileSync(rootPackageJsonPath, 'utf-8'));
      rootPkg.version = newVersion;
      writeFileSync(rootPackageJsonPath, JSON.stringify(rootPkg, null, 2));
    }
  }

  private async getGitInfo(): Promise<{ commit: string; branch: string }> {
    const commitResult = await this.processManager.execute({
      command: ['git', 'rev-parse', '--short', 'HEAD'],
      timeout: 5000,
    });

    const branchResult = await this.processManager.execute({
      command: ['git', 'rev-parse', '--abbrev-ref', 'HEAD'],
      timeout: 5000,
    });

    return {
      commit: commitResult.success ? commitResult.output.trim() : 'unknown',
      branch: branchResult.success ? branchResult.output.trim() : 'unknown',
    };
  }

  private getBuildOrder(packages: string[]): string[] {
    // Simple topological sort based on dependencies
    const visited = new Set<string>();
    const result: string[] = [];

    const visit = (packageName: string) => {
      if (visited.has(packageName)) return;

      visited.add(packageName);

      // Visit dependencies first
      const deps = this.workspace.dependencyGraph.get(packageName) || [];
      for (const dep of deps) {
        if (packages.includes(dep)) {
          visit(dep);
        }
      }

      result.push(packageName);
    };

    for (const packageName of packages) {
      visit(packageName);
    }

    return result;
  }

  private async buildPackage(
    packageName: string,
    options: {
      mode: 'development' | 'production';
      constants: Record<string, any>;
      verbose?: boolean;
    }
  ): Promise<{ success: boolean; output: string; skipped: boolean; reason?: string }> {
    const pkg = this.workspace.packages.get(packageName);
    if (!pkg) {
      return { success: false, output: '', skipped: true, reason: 'Package not found' };
    }

    const packageDir = packageName.startsWith('@fire22/')
      ? join(this.rootPath, 'packages', packageName.replace('@fire22/', ''))
      : join(this.rootPath, 'packages', packageName);

    // Check if build script exists
    if (!pkg.scripts || !pkg.scripts.build) {
      if (options.verbose) {
        console.log(`⏭️  Skipping ${packageName} - no build script`);
      }
      return { success: true, output: '', skipped: true, reason: 'No build script' };
    }

    try {
      // Build with enhanced constants
      const result = await this.processManager.execute({
        command: ['bun', 'run', 'build'],
        cwd: packageDir,
        env: {
          NODE_ENV: options.mode,
          PACKAGE_VERSION: pkg.version,
          WORKSPACE_VERSION: this.workspace.rootVersion,
          ...process.env,
        },
        timeout: 120000,
      });

      if (result.success) {
        if (options.verbose) {
          console.log(`✅ Built ${packageName}@${pkg.version}`);
        }
        return { success: true, output: result.output || '', skipped: false };
      } else {
        console.error(`❌ Build failed for ${packageName}: ${result.error || 'Unknown error'}`);
        return {
          success: false,
          output: result.output || '',
          skipped: false,
          reason: result.error,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Build error for ${packageName}: ${errorMessage}`);
      return { success: false, output: '', skipped: false, reason: errorMessage };
    }
  }

  private async saveBuildConstants(): Promise<void> {
    const constantsPath = join(this.rootPath, 'build-constants.json');
    writeFileSync(constantsPath, JSON.stringify(this.workspace.buildConstants, null, 2));
  }
}

export default MetadataVersionManager;
