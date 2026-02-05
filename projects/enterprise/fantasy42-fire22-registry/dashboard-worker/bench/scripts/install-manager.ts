#!/usr/bin/env bun

/**
 * 📦 Fire22 Benchmark Installation Manager
 *
 * Comprehensive package installation utilities using all Bun flags
 */

import { $ } from 'bun';

interface InstallOptions {
  // General Configuration
  config?: string; // --config=<path>
  cwd?: string; // --cwd=<path>

  // Dependency Scope & Management
  production?: boolean; // --production
  noSave?: boolean; // --no-save
  save?: boolean; // --save
  omit?: ('dev' | 'optional' | 'peer')[]; // --omit=<val>
  onlyMissing?: boolean; // --only-missing

  // Dependency Type & Versioning
  dev?: boolean; // --dev
  optional?: boolean; // --optional
  peer?: boolean; // --peer
  exact?: boolean; // --exact

  // Lockfile Control
  yarn?: boolean; // --yarn
  frozenLockfile?: boolean; // --frozen-lockfile
  saveTextLockfile?: boolean; // --save-text-lockfile
  lockfileOnly?: boolean; // --lockfile-only

  // Network & Registry Settings
  ca?: string; // --ca=<val>
  cafile?: string; // --cafile=<path>
  registry?: string; // --registry=<url>

  // Installation Process Control
  dryRun?: boolean; // --dry-run
  force?: boolean; // --force
  global?: boolean; // --global
  backend?: 'clonefile' | 'hardlink' | 'symlink' | 'copyfile'; // --backend=<val>
  filter?: string[]; // --filter=<val>
  analyze?: boolean; // --analyze

  // Caching Options
  cacheDir?: string; // --cache-dir=<path>
  noCache?: boolean; // --no-cache

  // Output & Logging
  silent?: boolean; // --silent
  verbose?: boolean; // --verbose
  noProgress?: boolean; // --no-progress
  noSummary?: boolean; // --no-summary

  // Security & Integrity
  noVerify?: boolean; // --no-verify
  trust?: string[]; // --trust

  // Concurrency & Performance
  concurrentScripts?: number; // --concurrent-scripts=<val>
  networkConcurrency?: number; // --network-concurrency=<val>

  // Lifecycle Script Management
  ignoreScripts?: boolean; // --ignore-scripts
}

interface PublishOptions {
  access?: 'public' | 'restricted'; // --access
  tag?: string; // --tag
  dryRun?: boolean; // --dry-run
  gzipLevel?: number; // --gzip-level
  authType?: 'web' | 'legacy'; // --auth-type
  otp?: string; // --otp
}

export class InstallManager {
  private defaultOptions: InstallOptions = {
    save: true,
    concurrentScripts: 4,
    networkConcurrency: 48,
  };

  /**
   * Build install command with all options
   */
  private buildInstallCommand(options: InstallOptions = {}): string[] {
    const opts = { ...this.defaultOptions, ...options };
    const args: string[] = ['install'];

    // General Configuration
    if (opts.config) args.push('--config', opts.config);
    if (opts.cwd) args.push('--cwd', opts.cwd);

    // Dependency Scope & Management
    if (opts.production) args.push('--production');
    if (opts.noSave) args.push('--no-save');
    if (opts.save === false) args.push('--no-save');
    if (opts.omit) {
      opts.omit.forEach(type => args.push(`--omit=${type}`));
    }
    if (opts.onlyMissing) args.push('--only-missing');

    // Lockfile Control
    if (opts.yarn) args.push('--yarn');
    if (opts.frozenLockfile) args.push('--frozen-lockfile');
    if (opts.saveTextLockfile) args.push('--save-text-lockfile');
    if (opts.lockfileOnly) args.push('--lockfile-only');

    // Network & Registry Settings
    if (opts.ca) args.push('--ca', opts.ca);
    if (opts.cafile) args.push('--cafile', opts.cafile);
    if (opts.registry) args.push('--registry', opts.registry);

    // Installation Process Control
    if (opts.dryRun) args.push('--dry-run');
    if (opts.force) args.push('--force');
    if (opts.global) args.push('--global');
    if (opts.backend) args.push('--backend', opts.backend);
    if (opts.filter) {
      opts.filter.forEach(f => args.push('--filter', f));
    }
    if (opts.analyze) args.push('--analyze');

    // Caching Options
    if (opts.cacheDir) args.push('--cache-dir', opts.cacheDir);
    if (opts.noCache) args.push('--no-cache');

    // Output & Logging
    if (opts.silent) args.push('--silent');
    if (opts.verbose) args.push('--verbose');
    if (opts.noProgress) args.push('--no-progress');
    if (opts.noSummary) args.push('--no-summary');

    // Security & Integrity
    if (opts.noVerify) args.push('--no-verify');
    if (opts.trust) {
      opts.trust.forEach(pkg => args.push('--trust', pkg));
    }

    // Concurrency & Performance
    if (opts.concurrentScripts) {
      args.push(`--concurrent-scripts=${opts.concurrentScripts}`);
    }
    if (opts.networkConcurrency) {
      args.push(`--network-concurrency=${opts.networkConcurrency}`);
    }

    // Lifecycle Script Management
    if (opts.ignoreScripts) args.push('--ignore-scripts');

    return args;
  }

  /**
   * Install dependencies with specific options
   */
  async install(options: InstallOptions = {}): Promise<void> {
    const args = this.buildInstallCommand(options);
    console.log(`🚀 Running: bun ${args.join(' ')}`);

    await $`bun ${args}`;
  }

  /**
   * Add a package with options
   */
  async add(
    packages: string[],
    options: Omit<InstallOptions, 'production' | 'lockfileOnly'> & {
      dev?: boolean;
      optional?: boolean;
      peer?: boolean;
      exact?: boolean;
    } = {}
  ): Promise<void> {
    const args: string[] = ['add', ...packages];

    if (options.dev) args.push('--dev');
    if (options.optional) args.push('--optional');
    if (options.peer) args.push('--peer');
    if (options.exact) args.push('--exact');
    if (options.global) args.push('--global');
    if (options.trust) {
      options.trust.forEach(pkg => args.push('--trust', pkg));
    }

    console.log(`📦 Running: bun ${args.join(' ')}`);
    await $`bun ${args}`;
  }

  /**
   * Update packages with interactive mode
   */
  async update(
    options: {
      interactive?: boolean;
      latest?: boolean;
      packages?: string[];
    } = {}
  ): Promise<void> {
    const args: string[] = ['update'];

    if (options.interactive) args.push('--interactive');
    if (options.latest) args.push('--latest');
    if (options.packages) args.push(...options.packages);

    console.log(`🔄 Running: bun ${args.join(' ')}`);
    await $`bun ${args}`;
  }

  /**
   * Publish package with all options
   */
  async publish(options: PublishOptions = {}): Promise<void> {
    const args: string[] = ['publish'];

    if (options.access) args.push('--access', options.access);
    if (options.tag) args.push('--tag', options.tag);
    if (options.dryRun) args.push('--dry-run');
    if (options.gzipLevel !== undefined) {
      args.push(`--gzip-level=${options.gzipLevel}`);
    }
    if (options.authType) args.push('--auth-type', options.authType);
    if (options.otp) args.push('--otp', options.otp);

    console.log(`📤 Running: bun ${args.join(' ')}`);
    await $`bun ${args}`;
  }

  /**
   * Remove packages
   */
  async remove(packages: string[]): Promise<void> {
    const args = ['remove', ...packages];
    console.log(`🗑️  Running: bun ${args.join(' ')}`);
    await $`bun ${args}`;
  }

  /**
   * Run predefined installation scenarios
   */
  async runScenario(scenario: string): Promise<void> {
    console.log(`\n🎯 Running scenario: ${scenario}`);
    console.log('='.repeat(50));

    switch (scenario) {
      case 'production':
        await this.install({
          production: true,
          frozenLockfile: true,
          omit: ['dev', 'optional'],
          concurrentScripts: 8,
        });
        break;

      case 'development':
        await this.install({
          force: true,
          verbose: true,
        });
        break;

      case 'ci':
        await this.install({
          frozenLockfile: true,
          ignoreScripts: true,
          noProgress: true,
          silent: false,
        });
        break;

      case 'minimal':
        await this.install({
          omit: ['dev', 'optional', 'peer'],
          noCache: false,
          backend: 'symlink',
        });
        break;

      case 'secure':
        await this.install({
          frozenLockfile: true,
          noVerify: false,
          trust: ['@fire22/benchmark-suite'],
          ignoreScripts: true,
        });
        break;

      case 'fast':
        await this.install({
          backend: 'clonefile',
          networkConcurrency: 96,
          concurrentScripts: 16,
          noProgress: true,
        });
        break;

      case 'offline':
        await this.install({
          frozenLockfile: true,
          noCache: false,
          networkConcurrency: 0,
        });
        break;

      default:
        console.log(`Unknown scenario: ${scenario}`);
    }
  }

  /**
   * List all available installation options
   */
  listOptions(): void {
    console.log(`
📦 Bun Installation Options
!==!==!==!==!===

GENERAL CONFIGURATION
  --config=<path>         Specify bunfig.toml path
  --cwd=<path>           Set working directory

DEPENDENCY SCOPE
  --production           Skip devDependencies
  --omit=<type>          Exclude dev/optional/peer
  --only-missing         Only add missing deps
  --no-save              Don't update package.json

DEPENDENCY TYPE
  --dev                  Add to devDependencies
  --optional             Add to optionalDependencies
  --peer                 Add to peerDependencies
  --exact                Pin exact version

LOCKFILE CONTROL
  --frozen-lockfile      Disallow lockfile changes
  --yarn                 Write yarn.lock
  --save-text-lockfile   Save text lockfile
  --lockfile-only        Generate lockfile only

NETWORK & REGISTRY
  --registry=<url>       Use specific registry
  --ca=<cert>           CA certificate
  --cafile=<path>       CA certificate file

INSTALLATION PROCESS
  --dry-run              Simulate install
  --force                Force reinstall
  --global               Install globally
  --backend=<type>       clonefile/hardlink/symlink/copyfile
  --filter=<pattern>     Install workspace packages
  --analyze              Analyze dependencies

CACHING
  --cache-dir=<path>     Cache directory
  --no-cache             Ignore cache

OUTPUT & LOGGING
  --silent               No output
  --verbose              Detailed output
  --no-progress          Hide progress bar
  --no-summary           Skip summary

SECURITY & INTEGRITY
  --no-verify            Skip integrity check
  --trust                Add to trustedDependencies

CONCURRENCY
  --concurrent-scripts=N  Max parallel scripts
  --network-concurrency=N Max network requests

LIFECYCLE SCRIPTS
  --ignore-scripts       Skip lifecycle scripts
    `);
  }

  /**
   * Show workspace-specific commands
   */
  showWorkspaceCommands(): void {
    console.log(`
🏗️  Workspace Commands
!==!==!==!===

Install specific workspace:
  bun install --filter "@fire22/benchmark-suite"
  bun install --filter "./packages/benchmark-*"
  
Install multiple workspaces:
  bun install --filter "bench" --filter "packages/*"
  
Exclude workspaces:
  bun install --filter "!bench"
  
Run scripts in workspaces:
  bun --filter "@fire22/*" test
  bun --filter "./packages/*" build
  
Update workspace packages:
  bun update --filter "@fire22/benchmark-suite" --latest
    `);
  }

  /**
   * Show Git and tarball dependency examples
   */
  showSpecialDependencies(): void {
    console.log(`
🔗 Special Dependencies
!==!==!==!====

GIT DEPENDENCIES:
  bun add github:user/repo
  bun add git@github.com:user/repo.git
  bun add git+https://github.com/user/repo.git
  bun add git+ssh://github.com/user/repo.git#v1.0.0

TARBALL DEPENDENCIES:
  bun add package@https://example.com/package.tgz
  bun add file:./local-package.tgz

WORKSPACE PROTOCOL:
  "dependencies": {
    "@fire22/utils": "workspace:*",
    "@fire22/core": "workspace:^",
    "@fire22/cli": "workspace:~",
    "@fire22/api": "workspace:1.0.0"
  }

CATALOG PROTOCOL:
  "dependencies": {
    "typescript": "catalog:benchmark",
    "vitest": "catalog:testing"
  }
    `);
  }
}

// CLI Interface
if (import.meta.main) {
  const manager = new InstallManager();
  const [command, ...args] = process.argv.slice(2);

  switch (command) {
    case 'install':
      await manager.runScenario(args[0] || 'development');
      break;

    case 'production':
      await manager.runScenario('production');
      break;

    case 'ci':
      await manager.runScenario('ci');
      break;

    case 'minimal':
      await manager.runScenario('minimal');
      break;

    case 'secure':
      await manager.runScenario('secure');
      break;

    case 'fast':
      await manager.runScenario('fast');
      break;

    case 'options':
      manager.listOptions();
      break;

    case 'workspaces':
      manager.showWorkspaceCommands();
      break;

    case 'special':
      manager.showSpecialDependencies();
      break;

    default:
      console.log(`
🚀 Fire22 Installation Manager
!==!==!==!==!=====

COMMANDS:
  install [scenario]   Run installation scenario
  production          Production install
  ci                  CI/CD install
  minimal             Minimal dependencies
  secure              Secure installation
  fast                Fast installation
  options             List all options
  workspaces          Show workspace commands
  special             Show special dependencies

EXAMPLES:
  bun run bench/scripts/install-manager.ts production
  bun run bench/scripts/install-manager.ts options
  bun run bench/scripts/install-manager.ts workspaces
      `);
  }
}

export default InstallManager;
