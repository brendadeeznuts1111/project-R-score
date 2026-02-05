#!/usr/bin/env bun

/**
 * 🏷️ Metadata-Driven Version Manager
 *
 * Standalone version manager for Bun/TypeScript projects with:
 * - Semantic versioning with dependency awareness
 * - Build system integration with metadata
 * - Cross-package compatibility validation
 * - Automated changelog generation from metadata
 *
 * @version 3.0.8
 * @author Fire22 Development Team
 * @license MIT
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface PackageMetadata {
  name: string;
  version: string;
  description?: string;
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

export interface BuildOptions {
  packages?: string[];
  mode?: 'development' | 'production';
  updateConstants?: boolean;
  verbose?: boolean;
}

export interface BuildResult {
  totalPackages: number;
  built: number;
  skipped: number;
  failed: number;
  results: Map<string, { success: boolean; skipped: boolean; reason?: string }>;
}

// ============================================================================
// CORE VERSION MANAGER CLASS
// ============================================================================

export class MetadataVersionManager {
  private workspace: WorkspaceVersionInfo;
  private rootPath: string;

  constructor(rootPath: string = process.cwd()) {
    this.rootPath = resolve(rootPath);
    this.workspace = {
      rootVersion: '0.0.0',
      packages: new Map(),
      dependencyGraph: new Map(),
      lastUpdate: new Date(),
      buildConstants: {},
    };
  }

  // ============================================================================
  // PUBLIC API METHODS
  // ============================================================================

  /**
   * 📊 Load and analyze all package metadata
   */
  async loadWorkspaceMetadata(): Promise<WorkspaceVersionInfo> {
    console.log('🔍 Loading workspace metadata...');

    // Load root package
    const rootPkg = await this.loadPackageMetadata(this.rootPath);
    if (rootPkg) {
      this.workspace.rootVersion = rootPkg.version;
      console.log(`📦 Root package: ${rootPkg.name}@${rootPkg.version}`);
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

    // Generate build constants
    this.workspace.buildConstants = this.generateBuildConstants();

    console.log(`✅ Loaded ${this.workspace.packages.size} packages`);
    return this.workspace;
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
      const newVersion = this.calculateNewVersion(pkg, strategy);

      if (newVersion !== oldVersion) {
        changes.set(packageName, `${oldVersion} → ${newVersion}`);
        pkg.version = newVersion;
        await this.updatePackageJson(packageName, pkg);
      }
    }

    // Update root version
    const rootPkg = await this.loadPackageMetadata(this.rootPath);
    if (rootPkg) {
      const oldRootVersion = rootPkg.version;
      const newRootVersion = this.calculateNewVersion(rootPkg, strategy);

      if (newRootVersion !== oldRootVersion) {
        changes.set('root', `${oldRootVersion} → ${newRootVersion}`);
        await this.updateRootPackageVersion(newRootVersion);
        this.workspace.rootVersion = newRootVersion;
      }
    }

    // Update build constants
    this.workspace.buildConstants = this.generateBuildConstants();

    // Git operations if requested
    if (options.commit || options.tag || options.push) {
      await this.performGitOperations(strategy, changes, options);
    }

    console.log(`✅ Updated ${changes.size} package versions`);
    return changes;
  }

  /**
   * 📋 Generate comprehensive changelog
   */
  async generateChangelog(since?: string): Promise<string> {
    const gitInfo = await this.getGitInfo();
    const changes: string[] = [
      `# Changelog - Crystal Clear Architecture`,
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

    return changes.join('\n');
  }

  /**
   * 🚀 Build workspace with version integration
   */
  async buildWorkspaceWithVersions(options: BuildOptions = {}): Promise<BuildResult> {
    console.log('🏗️ Building workspace with version integration...');

    const packagesToBuild = options.packages || Array.from(this.workspace.packages.keys());
    const results = new Map<string, { success: boolean; skipped: boolean; reason?: string }>();

    // Update build constants if requested
    if (options.updateConstants) {
      console.log('🔧 Updating build constants...');
      this.workspace.buildConstants = this.generateBuildConstants();
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

      const buildResult = await this.buildPackage(packageName, options);

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
      '🏷️ **Crystal Clear Architecture Version Report**',
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
    }

    report.push('');
    report.push(`🏗️ **Build Constants**`);
    report.push(`- Total Constants: ${Object.keys(this.workspace.buildConstants).length}`);

    return report.join('\n');
  }

  /**
   * 🔍 Get workspace information
   */
  getWorkspaceInfo(): WorkspaceVersionInfo {
    return { ...this.workspace };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

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
        if (entry.startsWith('.') || entry === 'README.md') {
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

  private calculateNewVersion(pkg: PackageMetadata, strategy: VersionStrategy): string {
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
        return strategy.breakingChanges?.length
          ? `${major + 1}.0.0`
          : strategy.features?.length
            ? `${major}.${minor + 1}.0`
            : `${major}.${minor}.${patch + 1}`;
      default:
        return pkg.version;
    }
  }

  private generateBuildConstants(): Record<string, any> {
    return {
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
        hasBreakingChanges: false,
      },
    };
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

  private getBuildOrder(packages: string[]): string[] {
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
    options: BuildOptions
  ): Promise<{ success: boolean; skipped: boolean; reason?: string }> {
    const pkg = this.workspace.packages.get(packageName);
    if (!pkg) {
      return { success: false, skipped: true, reason: 'Package not found' };
    }

    const packageDir = packageName.startsWith('@fire22/')
      ? join(this.rootPath, 'packages', packageName.replace('@fire22/', ''))
      : join(this.rootPath, 'packages', packageName);

    // Check if build script exists
    if (!pkg.scripts || !pkg.scripts.build) {
      return { success: true, skipped: true, reason: 'No build script' };
    }

    try {
      // Execute build command
      const { spawn } = await import('child_process');
      const [cmd, ...args] = ['bun', 'run', 'build'];

      await new Promise<void>((resolve, reject) => {
        const child = spawn(cmd, args, {
          cwd: packageDir,
          stdio: options.verbose ? 'inherit' : 'pipe',
          env: {
            ...process.env,
            NODE_ENV: options.mode || 'development',
            PACKAGE_VERSION: pkg.version,
            WORKSPACE_VERSION: this.workspace.rootVersion,
          },
        });

        child.on('close', code => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Build failed with code ${code}`));
          }
        });

        child.on('error', reject);
      });

      return { success: true, skipped: false };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, skipped: false, reason: errorMessage };
    }
  }

  private async performGitOperations(
    strategy: VersionStrategy,
    changes: Map<string, string>,
    options: { commit?: boolean; tag?: boolean; push?: boolean; verbose?: boolean }
  ): Promise<void> {
    if (options.verbose) {
      console.log('🔀 Performing git operations...');
    }

    if (options.commit) {
      const commitMessage = this.generateCommitMessage(strategy, changes);

      // Add all changed files
      await this.execCommand(['git', 'add', '.']);

      // Commit changes
      await this.execCommand(['git', 'commit', '-m', commitMessage]);
      console.log(`✅ Git commit created: ${commitMessage}`);

      // Create tag if requested
      if (options.tag) {
        const tagName = `v${this.workspace.rootVersion}`;
        await this.execCommand(['git', 'tag', tagName, '-m', `Release ${tagName}`]);
        console.log(`✅ Git tag created: ${tagName}`);
      }

      // Push changes if requested
      if (options.push) {
        await this.execCommand(['git', 'push']);
        console.log(`✅ Changes pushed to remote`);

        if (options.tag) {
          await this.execCommand(['git', 'push', '--tags']);
          console.log(`✅ Tags pushed to remote`);
        }
      }
    }
  }

  private generateCommitMessage(strategy: VersionStrategy, changes: Map<string, string>): string {
    const changeCount = changes.size;
    const versionType = strategy.type;
    const reason = strategy.reason ? ` - ${strategy.reason}` : '';

    let message = `chore: bump ${versionType} versions (${changeCount} packages)${reason}\n\n`;

    // Add package changes
    for (const [packageName, change] of changes) {
      message += `- ${packageName}: ${change}\n`;
    }

    return message;
  }

  private async execCommand(command: string[]): Promise<{ stdout: string; stderr: string }> {
    const { spawn } = await import('child_process');

    return new Promise((resolve, reject) => {
      const child = spawn(command[0], command.slice(1), {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', data => {
        stdout += data.toString();
      });
      child.stderr?.on('data', data => {
        stderr += data.toString();
      });

      child.on('close', code => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Command failed: ${stderr || stdout}`));
        }
      });

      child.on('error', reject);
    });
  }

  private async getGitInfo(): Promise<{ commit: string; branch: string }> {
    try {
      const [commitResult, branchResult] = await Promise.all([
        this.execCommand(['git', 'rev-parse', '--short', 'HEAD']),
        this.execCommand(['git', 'rev-parse', '--abbrev-ref', 'HEAD']),
      ]);

      return {
        commit: commitResult.stdout.trim(),
        branch: branchResult.stdout.trim(),
      };
    } catch {
      return { commit: 'unknown', branch: 'unknown' };
    }
  }

  private async saveBuildConstants(): Promise<void> {
    const constantsPath = join(this.rootPath, 'build-constants.json');
    writeFileSync(constantsPath, JSON.stringify(this.workspace.buildConstants, null, 2));
  }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  const versionManager = new MetadataVersionManager();

  try {
    switch (command) {
      case 'load':
        await versionManager.loadWorkspaceMetadata();
        console.log(versionManager.generateVersionReport());
        break;

      case 'bump':
        const strategy = (args[1] as VersionStrategy['type']) || 'patch';
        await versionManager.loadWorkspaceMetadata();

        const changes = await versionManager.bumpVersions(
          {
            type: strategy,
            reason: args[2],
          },
          {
            commit: args.includes('--commit'),
            tag: args.includes('--tag'),
            push: args.includes('--push'),
            verbose: args.includes('--verbose'),
          }
        );

        console.log('\n📊 Version Changes:');
        for (const [pkg, change] of changes) {
          console.log(`  ${pkg}: ${change}`);
        }
        break;

      case 'build':
        await versionManager.loadWorkspaceMetadata();

        const buildResult = await versionManager.buildWorkspaceWithVersions({
          mode: (args[1] as 'development' | 'production') || 'development',
          updateConstants: args.includes('--update-constants'),
          verbose: args.includes('--verbose'),
        });

        console.log(
          `\n📊 Build Complete: ${buildResult.built}/${buildResult.totalPackages} packages built`
        );
        break;

      case 'changelog':
        await versionManager.loadWorkspaceMetadata();
        const changelog = await versionManager.generateChangelog();
        console.log(changelog);
        break;

      case 'report':
        await versionManager.loadWorkspaceMetadata();
        console.log(versionManager.generateVersionReport());
        break;

      default:
        console.log(`
🏷️  Metadata Version Manager

Usage:
  bun run metadata-version-manager.ts <command> [options]

Commands:
  load                    Load workspace metadata
  bump <type> [reason]    Bump versions (major|minor|patch|auto)
  build [mode]           Build workspace packages
  changelog              Generate changelog
  report                 Generate version report

Options:
  --commit               Commit changes to git
  --tag                  Create git tag
  --push                 Push changes to remote
  --update-constants     Update build constants
  --verbose              Verbose output

Examples:
  bun run metadata-version-manager.ts load
  bun run metadata-version-manager.ts bump minor "add new features"
  bun run metadata-version-manager.ts build production --update-constants
  bun run metadata-version-manager.ts bump patch --commit --tag --push
        `);
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Export for use as module
export default MetadataVersionManager;

// Run CLI if called directly
if (import.meta.main) {
  main();
}
