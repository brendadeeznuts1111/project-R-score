#!/usr/bin/env bun

/**
 * 🏷️ Fire22 Metadata-Driven Version CLI
 *
 * Command-line interface for sophisticated workspace versioning using package metadata.
 * Integrates with the Fire22 build system for seamless version management.
 *
 * @version 3.0.8
 * @author Fire22 Development Team
 * @see docs/BUILD-INDEX.md for usage guide
 */

import { MetadataVersionManager, type VersionStrategy } from './metadata-version-manager.ts';
import { generateBuildConstants } from './build-constants.ts';

interface CLIOptions {
  action: string;
  strategy?: string;
  packages?: string[];
  reason?: string;
  output?: string;
  build?: boolean;
  verbose?: boolean;
  commit?: boolean;
  tag?: boolean;
  push?: boolean;
  changelog?: boolean;
}

class VersionCLI {
  private versionManager: MetadataVersionManager;

  constructor() {
    this.versionManager = new MetadataVersionManager();
  }

  async run(args: string[]): Promise<void> {
    const options = this.parseArgs(args);

    if (options.verbose) {
      console.info('🏷️ Fire22 Metadata-Driven Version Manager');
      console.info('='.repeat(50));
    }

    // Load workspace metadata
    await this.versionManager.loadWorkspaceMetadata();

    switch (options.action) {
      case 'status':
      case 'info':
        await this.showStatus(options);
        break;

      case 'bump':
      case 'version':
        await this.bumpVersion(options);
        break;

      case 'build':
        await this.buildWithVersions(options);
        break;

      case 'changelog':
        await this.generateChangelog(options);
        break;

      case 'list':
        await this.listPackages(options);
        break;

      case 'graph':
        await this.showDependencyGraph(options);
        break;

      case 'constants':
        await this.showBuildConstants(options);
        break;

      case 'help':
      default:
        this.showHelp();
        break;
    }
  }

  private async showStatus(options: CLIOptions): Promise<void> {
    console.info('📊 Workspace Status\n');

    const report = this.versionManager.generateVersionReport();
    console.info(report);

    if (options.output) {
      await Bun.write(options.output, report);
      console.info(`\n💾 Report saved to: ${options.output}`);
    }
  }

  private async bumpVersion(options: CLIOptions): Promise<void> {
    const strategy: VersionStrategy = {
      type: (options.strategy as any) || 'patch',
      packages: options.packages,
      reason: options.reason,
    };

    console.info(`🏷️ Bumping versions: ${strategy.type}`);
    if (strategy.packages) {
      console.info(`📦 Target packages: ${strategy.packages.join(', ')}`);
    }
    if (strategy.reason) {
      console.info(`📝 Reason: ${strategy.reason}`);
    }
    if (options.commit || options.tag || options.push) {
      console.info(
        `🔀 Git operations: ${[
          options.commit && 'commit',
          options.tag && 'tag',
          options.push && 'push',
        ]
          .filter(Boolean)
          .join(', ')}`
      );
    }

    const changes = await this.versionManager.bumpVersions(strategy, {
      commit: options.commit,
      tag: options.tag,
      push: options.push,
      verbose: options.verbose,
    });

    console.info('\n✅ Version Changes:');
    for (const [pkg, change] of changes) {
      console.info(`  📦 ${pkg}: ${change}`);
    }

    // Generate changelog if requested
    if (options.changelog) {
      console.info('\n📋 Generating changelog...');
      const changelog = await this.versionManager.generateChangelog();

      if (options.output) {
        await Bun.write(options.output, changelog);
        console.info(`💾 Changelog saved to: ${options.output}`);
      } else {
        await Bun.write('CHANGELOG.md', changelog);
        console.info(`💾 Changelog saved to: CHANGELOG.md`);
      }
    }

    if (options.build) {
      console.info('\n🏗️ Building with new versions...');
      const buildResults = await this.versionManager.buildWorkspaceWithVersions({
        updateConstants: true,
        mode: 'production',
        verbose: options.verbose,
      });

      if (buildResults.failed > 0) {
        console.warn(`⚠️ ${buildResults.failed} package(s) failed to build`);
      }
    }

    console.info('\n🎉 Version bump completed!');
  }

  private async buildWithVersions(options: CLIOptions): Promise<void> {
    console.info('🏗️ Building workspace with version integration...');

    const buildResults = await this.versionManager.buildWorkspaceWithVersions({
      packages: options.packages,
      mode: (options.strategy as any) || 'development',
      updateConstants: true,
      verbose: options.verbose,
    });

    console.info(
      `\n✅ Build completed: ${buildResults.built} built, ${buildResults.skipped} skipped, ${buildResults.failed} failed`
    );

    if (buildResults.failed > 0) {
      process.exit(1);
    }
  }

  private async generateChangelog(options: CLIOptions): Promise<void> {
    console.info('📋 Generating changelog from metadata...');

    const changelog = await this.versionManager.generateChangelog();

    if (options.output) {
      await Bun.write(options.output, changelog);
      console.info(`💾 Changelog saved to: ${options.output}`);
    } else {
      console.info('\n' + changelog);
    }
  }

  private async listPackages(options: CLIOptions): Promise<void> {
    const workspace = await this.versionManager.loadWorkspaceMetadata();

    console.info('📦 Workspace Packages\n');

    const packages = Array.from(workspace.packages.entries()).sort(([a], [b]) =>
      a.localeCompare(b)
    );

    for (const [name, pkg] of packages) {
      const component = pkg.metadata?.component || pkg.name;
      console.info(`🔥 **${component}** (${name})`);
      console.info(`   Version: v${pkg.version}`);
      console.info(`   Description: ${pkg.description}`);

      if (pkg.metadata?.responsibilities) {
        console.info(`   Responsibilities:`);
        for (const responsibility of pkg.metadata.responsibilities.slice(0, 3)) {
          console.info(`     • ${responsibility}`);
        }
        if (pkg.metadata.responsibilities.length > 3) {
          console.info(`     ... and ${pkg.metadata.responsibilities.length - 3} more`);
        }
      }

      console.info('');
    }
  }

  private async showDependencyGraph(options: CLIOptions): Promise<void> {
    const workspace = await this.versionManager.loadWorkspaceMetadata();

    console.info('🔗 Package Dependency Graph\n');

    for (const [packageName, deps] of workspace.dependencyGraph) {
      const pkg = workspace.packages.get(packageName);
      const component = pkg?.metadata?.component || packageName;

      console.info(`📦 ${component} (${packageName})`);

      if (deps.length === 0) {
        console.info(`   └── No internal dependencies`);
      } else {
        deps.forEach((dep, index) => {
          const depPkg = workspace.packages.get(dep);
          const depComponent = depPkg?.metadata?.component || dep;
          const isLast = index === deps.length - 1;
          const prefix = isLast ? '└──' : '├──';
          console.info(`   ${prefix} ${depComponent} (${dep})`);
        });
      }

      console.info('');
    }
  }

  private async showBuildConstants(options: CLIOptions): Promise<void> {
    console.info('🏗️ Build Constants with Version Metadata\n');

    const constants = await generateBuildConstants();
    const workspace = await this.versionManager.loadWorkspaceMetadata();

    // Show workspace version constants
    console.info('📊 **Workspace Versions**');
    console.info(`   Root Version: ${workspace.rootVersion}`);
    console.info(`   Packages: ${workspace.packages.size}`);
    console.info(`   Build Time: ${constants.BUILD_TIME}`);
    console.info('');

    // Show package versions
    if (workspace.buildConstants.PACKAGE_VERSIONS) {
      console.info('📦 **Package Versions**');
      for (const [key, version] of Object.entries(workspace.buildConstants.PACKAGE_VERSIONS)) {
        console.info(`   ${key}: ${version}`);
      }
      console.info('');
    }

    // Show component information
    if (workspace.buildConstants.WORKSPACE_COMPONENTS) {
      console.info('🔥 **Components**');
      for (const component of workspace.buildConstants.WORKSPACE_COMPONENTS as any[]) {
        console.info(`   ${component.name} v${component.version}`);
        console.info(
          `     Responsibilities: ${component.responsibilities.slice(0, 2).join(', ')}${component.responsibilities.length > 2 ? '...' : ''}`
        );
      }
      console.info('');
    }

    // Show Fire22 integration constants
    console.info('🔥 **Fire22 Integration**');
    console.info(`   Environment: ${constants.ENVIRONMENT}`);
    console.info(`   API URL: ${constants.API_URL}`);
    console.info(`   Debug Mode: ${constants.DEBUG_MODE}`);
    console.info(`   Analytics: ${constants.ENABLE_ANALYTICS}`);
    console.info('');

    if (options.output) {
      await Bun.write(
        options.output,
        JSON.stringify(
          {
            workspace: workspace.buildConstants,
            base: constants,
          },
          null,
          2
        )
      );
      console.info(`💾 Build constants saved to: ${options.output}`);
    }
  }

  private parseArgs(args: string[]): CLIOptions {
    const options: CLIOptions = {
      action: 'help',
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (!arg.startsWith('-')) {
        if (!options.action || options.action === 'help') {
          options.action = arg;
        }
        continue;
      }

      switch (arg) {
        case '-s':
        case '--strategy':
          options.strategy = args[++i];
          break;

        case '-p':
        case '--packages':
          options.packages = args[++i]?.split(',') || [];
          break;

        case '-r':
        case '--reason':
          options.reason = args[++i];
          break;

        case '-o':
        case '--output':
          options.output = args[++i];
          break;

        case '-b':
        case '--build':
          options.build = true;
          break;

        case '-v':
        case '--verbose':
          options.verbose = true;
          break;

        case '-c':
        case '--commit':
          options.commit = true;
          break;

        case '-t':
        case '--tag':
          options.tag = true;
          break;

        case '--push':
          options.push = true;
          break;

        case '--changelog':
          options.changelog = true;
          break;

        case '-h':
        case '--help':
          options.action = 'help';
          break;
      }
    }

    return options;
  }

  private showHelp(): void {
    console.info(`
🏷️ **Fire22 Metadata-Driven Version Manager**

USAGE:
  bun run scripts/version-cli.ts <command> [options]

COMMANDS:
  status          Show workspace version status
  bump            Bump package versions
  build           Build workspace with version integration  
  changelog       Generate changelog from metadata
  list            List all packages with metadata
  graph           Show dependency graph
  constants       Show build constants with versions
  help            Show this help message

OPTIONS:
  -s, --strategy   Version strategy: major|minor|patch|prerelease|auto
  -p, --packages   Comma-separated package names to target
  -r, --reason     Reason for version bump
  -o, --output     Output file for reports/changelog
  -b, --build      Build after version bump
  -c, --commit     Create git commit after version bump
  -t, --tag        Create git tag after version bump
      --push       Push changes and tags to remote
      --changelog  Generate/update CHANGELOG.md
  -v, --verbose    Verbose output
  -h, --help       Show help

EXAMPLES:
  # Show workspace status
  bun run scripts/version-cli.ts status

  # Bump patch version for all packages
  bun run scripts/version-cli.ts bump --strategy patch

  # Bump minor version with full release workflow
  bun run scripts/version-cli.ts bump --strategy minor --build --commit --tag --changelog

  # Bump patch version for specific packages with reason
  bun run scripts/version-cli.ts bump --strategy patch --packages wager-system,env-manager --reason "Bug fixes"

  # Release workflow: bump major version with git operations
  bun run scripts/version-cli.ts bump --strategy major --build --commit --tag --push --changelog --verbose

  # Generate changelog only
  bun run scripts/version-cli.ts changelog --output CHANGELOG.md

  # Build with version integration and verbose output
  bun run scripts/version-cli.ts build --strategy production --verbose

  # Show package dependency graph
  bun run scripts/version-cli.ts graph

  # Show build constants with version metadata
  bun run scripts/version-cli.ts constants --output build-constants.json

🔥 **Fire22 Development Team** - Advanced Workspace Management
`);
  }
}

// Run CLI if called directly
if (import.meta.main) {
  const cli = new VersionCLI();
  const args = process.argv.slice(2);

  try {
    await cli.run(args);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
