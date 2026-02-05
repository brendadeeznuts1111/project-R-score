#!/usr/bin/env bun

/**
 * 📦 Fire22 Package Manager Utilities
 *
 * Complete implementation of bun link and bun pm commands
 */

import { $ } from 'bun';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface LinkOptions {
  save?: boolean;
  cwd?: string;
}

interface PackOptions {
  dryRun?: boolean;
  destination?: string;
  filename?: string;
  ignoreScripts?: boolean;
  gzipLevel?: number;
  quiet?: boolean;
}

interface VersionOptions {
  noGitTagVersion?: boolean;
  allowSameVersion?: boolean;
  message?: string;
  preid?: string;
  force?: boolean;
}

interface PkgCommand {
  action: 'get' | 'set' | 'delete' | 'fix';
  properties?: string[];
  values?: Record<string, any>;
  json?: boolean;
}

export class PackageManager {
  /**
   * Link a local package for development
   */
  async link(packagePath?: string, options: LinkOptions = {}): Promise<void> {
    const args: string[] = ['link'];

    if (packagePath) {
      args.push(packagePath);
    }

    if (options.save) {
      args.push('--save');
    }

    console.log(`🔗 Running: bun ${args.join(' ')}`);
    await $`bun ${args}`.cwd(options.cwd || process.cwd());
  }

  /**
   * Unlink a linked package
   */
  async unlink(packageName?: string): Promise<void> {
    const args = ['unlink'];

    if (packageName) {
      args.push(packageName);
    }

    console.log(`🔓 Running: bun ${args.join(' ')}`);
    await $`bun ${args}`;
  }

  /**
   * Pack the current workspace into a tarball
   */
  async pack(options: PackOptions = {}): Promise<string> {
    const args: string[] = ['pm', 'pack'];

    if (options.dryRun) args.push('--dry-run');
    if (options.destination) args.push('--destination', options.destination);
    if (options.filename) args.push('--filename', options.filename);
    if (options.ignoreScripts) args.push('--ignore-scripts');
    if (options.gzipLevel !== undefined) {
      args.push('--gzip-level', options.gzipLevel.toString());
    }
    if (options.quiet) args.push('--quiet');

    console.log(`📦 Running: bun ${args.join(' ')}`);
    const result = await $`bun ${args}`.text();

    if (options.quiet) {
      return result.trim();
    }

    // Extract tarball name from output
    const lines = result.split('\n');
    const tarballLine = lines.find(line => line.endsWith('.tgz'));
    return tarballLine || result;
  }

  /**
   * Get bin directory path
   */
  async getBinPath(global: boolean = false): Promise<string> {
    const args = ['pm', 'bin'];
    if (global) args.push('-g');

    const result = await $`bun ${args}`.text();
    return result.trim();
  }

  /**
   * List installed packages
   */
  async list(all: boolean = false): Promise<void> {
    const args = ['pm', 'ls'];
    if (all) args.push('--all');

    console.log(`📋 Running: bun ${args.join(' ')}`);
    await $`bun ${args}`;
  }

  /**
   * Get npm username
   */
  async whoami(): Promise<string> {
    const result = await $`bun pm whoami`.text();
    return result.trim();
  }

  /**
   * Hash operations
   */
  async hash(operation: 'generate' | 'string' | 'print' = 'generate'): Promise<string> {
    const args = ['pm'];

    switch (operation) {
      case 'string':
        args.push('hash-string');
        break;
      case 'print':
        args.push('hash-print');
        break;
      default:
        args.push('hash');
    }

    const result = await $`bun ${args}`.text();
    return result.trim();
  }

  /**
   * Cache operations
   */
  async cache(operation: 'path' | 'clear' = 'path'): Promise<string | void> {
    const args = ['pm', 'cache'];

    if (operation === 'clear') {
      args.push('rm');
      console.log('🗑️  Clearing cache...');
      await $`bun ${args}`;
      console.log('✅ Cache cleared');
      return;
    }

    const result = await $`bun ${args}`.text();
    return result.trim();
  }

  /**
   * Migrate from another package manager's lockfile
   */
  async migrate(): Promise<void> {
    console.log('🔄 Migrating lockfile...');
    await $`bun pm migrate`;
    console.log('✅ Migration complete');
  }

  /**
   * Trust/untrusted dependency operations
   */
  async untrusted(): Promise<void> {
    console.log('🔒 Untrusted dependencies:');
    await $`bun pm untrusted`;
  }

  async trust(packages?: string[], all: boolean = false): Promise<void> {
    const args = ['pm', 'trust'];

    if (all) {
      args.push('--all');
    } else if (packages && packages.length > 0) {
      args.push(...packages);
    }

    console.log(`🔓 Running: bun ${args.join(' ')}`);
    await $`bun ${args}`;
  }

  async defaultTrusted(): Promise<void> {
    console.log('📋 Default trusted dependencies:');
    await $`bun pm default-trusted`;
  }

  /**
   * Version management
   */
  async version(increment?: string, options: VersionOptions = {}): Promise<string> {
    const args = ['pm', 'version'];

    if (increment) {
      args.push(increment);
    }

    if (options.noGitTagVersion) args.push('--no-git-tag-version');
    if (options.allowSameVersion) args.push('--allow-same-version');
    if (options.message) args.push('--message', options.message);
    if (options.preid) args.push('--preid', options.preid);
    if (options.force) args.push('--force');

    console.log(`📝 Running: bun ${args.join(' ')}`);
    const result = await $`bun ${args}`.text();
    return result.trim();
  }

  /**
   * Package.json management
   */
  async pkg(command: PkgCommand): Promise<void> {
    const args = ['pm', 'pkg', command.action];

    switch (command.action) {
      case 'get':
        if (command.properties) {
          args.push(...command.properties);
        }
        break;

      case 'set':
        if (command.values) {
          if (command.json) {
            args.push(JSON.stringify(command.values), '--json');
          } else {
            for (const [key, value] of Object.entries(command.values)) {
              args.push(`${key}=${JSON.stringify(value)}`);
            }
          }
        }
        break;

      case 'delete':
        if (command.properties) {
          args.push(...command.properties);
        }
        break;

      case 'fix':
        // No additional args needed
        break;
    }

    console.log(`📋 Running: bun ${args.join(' ')}`);
    await $`bun ${args}`;
  }

  /**
   * Link workflow for workspace packages
   */
  async linkWorkspacePackages(): Promise<void> {
    console.log('\n🔗 Linking Workspace Packages');
    console.log('='.repeat(50));

    const packages = [
      '@fire22/benchmark-suite',
      '@fire22/memory-profiler',
      '@fire22/micro-benchmarks',
      '@fire22/load-testing',
      '@fire22/benchmark-formatter',
    ];

    // First, register each package
    for (const pkg of packages) {
      const pkgPath = join(process.cwd(), 'packages', pkg.replace('@fire22/', ''));
      if (existsSync(pkgPath)) {
        console.log(`\n📦 Registering ${pkg}...`);
        await $`bun link`.cwd(pkgPath);
      }
    }

    // Then link them in the bench directory
    const benchPath = join(process.cwd(), 'bench');
    if (existsSync(benchPath)) {
      console.log('\n🎯 Linking packages in bench directory...');
      for (const pkg of packages) {
        await $`bun link ${pkg} --save`.cwd(benchPath);
      }
    }

    console.log('\n✅ All workspace packages linked!');
  }

  /**
   * Create distribution packages
   */
  async createDistribution(): Promise<void> {
    console.log('\n📦 Creating Distribution Packages');
    console.log('='.repeat(50));

    const distDir = join(process.cwd(), 'bench', 'dist');
    if (!existsSync(distDir)) {
      mkdirSync(distDir, { recursive: true });
    }

    // Pack main bench package
    console.log('\n📦 Packing bench package...');
    const benchTarball = await this.pack({
      destination: distDir,
      gzipLevel: 9,
    });
    console.log(`   Created: ${benchTarball}`);

    // Pack each workspace package
    const packages = [
      'benchmark-suite',
      'memory-profiler',
      'micro-benchmarks',
      'load-testing',
      'benchmark-formatter',
    ];

    for (const pkg of packages) {
      const pkgPath = join(process.cwd(), 'packages', pkg);
      if (existsSync(pkgPath)) {
        console.log(`\n📦 Packing ${pkg}...`);
        process.chdir(pkgPath);
        const tarball = await this.pack({
          destination: distDir,
          gzipLevel: 9,
        });
        console.log(`   Created: ${tarball}`);
      }
    }

    console.log(`\n✅ All packages created in ${distDir}`);
  }

  /**
   * Show all pm commands with examples
   */
  showCommands(): void {
    console.log(`
📦 Bun Package Manager Commands
!==!==!==!==!==!==

LINK COMMANDS:
  bun link                    Register current package as linkable
  bun link <pkg>              Link a registered package
  bun link <pkg> --save       Link and add to dependencies
  bun unlink <pkg>            Remove linked package

PACK COMMANDS:
  bun pm pack                 Create tarball of current package
  bun pm pack --dry-run       Show what would be packed
  bun pm pack --destination ./dist    Custom output directory
  bun pm pack --filename custom.tgz   Custom filename
  bun pm pack --quiet         Output only tarball name
  bun pm pack --gzip-level 9  Set compression level

BIN COMMANDS:
  bun pm bin                  Show local bin directory
  bun pm bin -g               Show global bin directory

LIST COMMANDS:
  bun pm ls                   List direct dependencies
  bun pm ls --all             List all dependencies

CACHE COMMANDS:
  bun pm cache                Show cache directory
  bun pm cache rm             Clear cache

TRUST COMMANDS:
  bun pm untrusted            Show untrusted dependencies
  bun pm trust <pkg>          Trust specific package
  bun pm trust --all          Trust all packages
  bun pm default-trusted      Show default trusted list

VERSION COMMANDS:
  bun pm version              Show current version
  bun pm version patch        Bump patch version
  bun pm version minor        Bump minor version
  bun pm version major        Bump major version
  bun pm version 1.2.3        Set specific version
  bun pm version prerelease --preid beta
  bun pm version from-git     Use git tag version
  bun pm version patch --no-git-tag-version

PKG COMMANDS:
  bun pm pkg get name         Get package.json property
  bun pm pkg get scripts.build    Get nested property
  bun pm pkg set name="pkg"   Set property
  bun pm pkg set {"private":"true"} --json
  bun pm pkg delete scripts.test
  bun pm pkg fix              Auto-fix issues

OTHER COMMANDS:
  bun pm hash                 Generate lockfile hash
  bun pm hash-string          Show hash input string
  bun pm hash-print           Show stored hash
  bun pm whoami               Show npm username
  bun pm migrate              Migrate from npm/yarn/pnpm
    `);
  }
}

// CLI Interface
if (import.meta.main) {
  const pm = new PackageManager();
  const [command, ...args] = process.argv.slice(2);

  try {
    switch (command) {
      case 'link':
        if (args[0] === 'workspace') {
          await pm.linkWorkspacePackages();
        } else {
          await pm.link(args[0], { save: args.includes('--save') });
        }
        break;

      case 'unlink':
        await pm.unlink(args[0]);
        break;

      case 'pack':
        const packOptions: PackOptions = {
          dryRun: args.includes('--dry-run'),
          quiet: args.includes('--quiet'),
        };
        const destIndex = args.indexOf('--destination');
        if (destIndex !== -1) packOptions.destination = args[destIndex + 1];

        const tarball = await pm.pack(packOptions);
        if (!packOptions.quiet) {
          console.log(`\n📦 Tarball created: ${tarball}`);
        } else {
          console.log(tarball);
        }
        break;

      case 'distribute':
        await pm.createDistribution();
        break;

      case 'bin':
        const binPath = await pm.getBinPath(args.includes('-g'));
        console.log(binPath);
        break;

      case 'ls':
      case 'list':
        await pm.list(args.includes('--all'));
        break;

      case 'cache':
        if (args[0] === 'clear' || args[0] === 'rm') {
          await pm.cache('clear');
        } else {
          const cachePath = await pm.cache('path');
          console.log(cachePath);
        }
        break;

      case 'trust':
        if (args[0] === '--all') {
          await pm.trust([], true);
        } else {
          await pm.trust(args);
        }
        break;

      case 'untrusted':
        await pm.untrusted();
        break;

      case 'version':
        const version = await pm.version(args[0], {
          noGitTagVersion: args.includes('--no-git-tag-version'),
          force: args.includes('--force') || args.includes('-f'),
        });
        console.log(version);
        break;

      case 'pkg':
        const pkgAction = args[0] as 'get' | 'set' | 'delete' | 'fix';
        if (pkgAction === 'get') {
          await pm.pkg({ action: 'get', properties: args.slice(1) });
        } else if (pkgAction === 'set') {
          const values: Record<string, any> = {};
          args.slice(1).forEach(arg => {
            const [key, value] = arg.split('=');
            if (key && value) {
              values[key] = value;
            }
          });
          await pm.pkg({ action: 'set', values, json: args.includes('--json') });
        } else if (pkgAction === 'delete') {
          await pm.pkg({ action: 'delete', properties: args.slice(1) });
        } else if (pkgAction === 'fix') {
          await pm.pkg({ action: 'fix' });
        }
        break;

      case 'migrate':
        await pm.migrate();
        break;

      case 'whoami':
        const username = await pm.whoami();
        console.log(username);
        break;

      case 'commands':
      case 'help':
        pm.showCommands();
        break;

      default:
        console.log(`
🚀 Fire22 Package Manager
!==!==!==!=====

COMMANDS:
  link [pkg|workspace]     Link packages for development
  unlink <pkg>            Unlink package
  pack                    Create tarball
  distribute              Create all distribution packages
  bin [-g]                Show bin directory
  ls [--all]              List packages
  cache [clear]           Manage cache
  trust <pkg|--all>       Trust packages
  untrusted               Show untrusted packages
  version <increment>     Bump version
  pkg <action>            Manage package.json
  migrate                 Migrate lockfile
  whoami                  Show npm username
  commands                Show all commands

EXAMPLES:
  bun run bench/scripts/package-manager.ts link workspace
  bun run bench/scripts/package-manager.ts pack --quiet
  bun run bench/scripts/package-manager.ts distribute
  bun run bench/scripts/package-manager.ts commands
        `);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

export default PackageManager;
