#!/usr/bin/env bun
import { existsSync, readdirSync, statSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { file, spawn } from 'bun';
import { zstdCompress } from 'bun';
import { createHash } from 'crypto';

interface PMOptions {
  dryRun?: boolean;
  quiet?: boolean;
  destination?: string;
  gzipLevel?: number;
  all?: boolean;
  json?: boolean;
  message?: string;
  noGitTagVersion?: boolean;
}

class BunPackageManager {
  private packagePath: string;
  private cachePath: string;

  constructor() {
    this.packagePath = resolve('./package.json');
    this.cachePath = join(process.env.HOME || '~', '.bun', 'cache');
  }

  // bun pm pack
  async pack(options: PMOptions = {}): Promise<string> {
    const { dryRun = false, quiet = false, destination = '.', gzipLevel = 9 } = options;

    if (!quiet) console.log('📦 Packing package...');

    // Read package.json
    const pkg = await this.readPackageJson();
    const version = pkg.version || '0.0.0';
    const name = pkg.name || 'package';

    // Collect files to pack
    const files = this.collectFiles(pkg);
    const tarballName = `${name}-${version}.tgz`;
    const tarballPath = join(destination, tarballName);

    if (dryRun) {
      console.log(`📦 Would pack ${files.length} files into ${tarballName}`);
      return tarballName;
    }

    // Create tarball (simulated - in real Bun this would use native tar creation)
    const startTime = performance.now();
    const tarballData = await this.createTarball(files, pkg);
    const compressed = await zstdCompress(Buffer.from(tarballData));
    await Bun.write(tarballPath, compressed);

    const duration = performance.now() - startTime;

    if (!quiet) {
      console.log(`📦 Packed ${files.length} files into ${tarballName} (${compressed.length} bytes, ${duration.toFixed(1)}ms)`);
    }

    return tarballPath;
  }

  // bun pm ls
  async ls(options: PMOptions = {}): Promise<void> {
    const { all = false, json = false } = options;

    const pkg = await this.readPackageJson();
    const deps = all ? { ...pkg.dependencies, ...pkg.devDependencies } : pkg.dependencies || {};

    if (json) {
      console.log(JSON.stringify(deps, null, 2));
      return;
    }

    const depList = Object.entries(deps).map(([name, version]) => `${name}@${version}`);

    if (depList.length === 0) {
      console.log('No dependencies found');
      return;
    }

    console.log('Dependencies:');
    depList.forEach(dep => console.log(`  ${dep}`));
  }

  // bun pm bin
  async bin(options: PMOptions = {}): Promise<void> {
    const { json = false } = options;

    // Get global bin path
    const globalBin = join(process.env.HOME || '~', '.bun', 'bin');

    // Get local bin path
    const localBin = join(process.cwd(), 'node_modules', '.bin');

    if (json) {
      console.log(JSON.stringify({
        global: globalBin,
        local: localBin
      }, null, 2));
      return;
    }

    console.log('Bin paths:');
    console.log(`  Global: ${globalBin}`);
    console.log(`  Local:  ${localBin}`);

    // List executables if they exist
    if (existsSync(localBin)) {
      const bins = readdirSync(localBin).filter(file => !file.startsWith('.'));
      if (bins.length > 0) {
        console.log('\nLocal executables:');
        bins.forEach(bin => console.log(`  ${bin}`));
      }
    }
  }

  // bun pm version
  async version(versionType: string, options: PMOptions = {}): Promise<void> {
    const { message, noGitTagVersion = false } = options;

    const pkg = await this.readPackageJson();
    const currentVersion = pkg.version || '0.0.0';

    let newVersion: string;

    switch (versionType) {
      case 'major':
        newVersion = this.bumpMajor(currentVersion);
        break;
      case 'minor':
        newVersion = this.bumpMinor(currentVersion);
        break;
      case 'patch':
        newVersion = this.bumpPatch(currentVersion);
        break;
      default:
        throw new Error(`Invalid version type: ${versionType}. Use major, minor, or patch.`);
    }

    // Update package.json
    pkg.version = newVersion;
    await Bun.write(this.packagePath, JSON.stringify(pkg, null, 2));

    console.log(`📦 Version bumped: ${currentVersion} → ${newVersion}`);

    // Git operations (if not disabled)
    if (!noGitTagVersion) {
      try {
        const commitMsg = message || `chore: bump version to ${newVersion}`;
        await this.runCommand('git', ['add', 'package.json']);
        await this.runCommand('git', ['commit', '-m', commitMsg]);
        await this.runCommand('git', ['tag', `v${newVersion}`]);
        console.log('🏷️  Git tag created');
      } catch (error) {
        console.warn('⚠️  Git operations failed (this is normal if not in a git repo)');
      }
    }
  }

  // bun pm pkg
  async pkg(command: string, ...args: string[]): Promise<void> {
    const pkg = await this.readPackageJson();

    switch (command) {
      case 'get':
        const key = args[0];
        if (!key) throw new Error('Usage: bun pm pkg get <key>');
        console.log(this.getNestedValue(pkg, key));
        break;

      case 'set':
        const setArg = args[0];
        if (!setArg) throw new Error('Usage: bun pm pkg set <key>=<value>');
        const [setKey, value] = setArg.split('=');
        if (!setKey || value === undefined) throw new Error('Invalid format. Use key=value');
        this.setNestedValue(pkg, setKey, value);
        await Bun.write(this.packagePath, JSON.stringify(pkg, null, 2));
        console.log(`✅ Set ${setKey} = ${value}`);
        break;

      case 'fix':
        // Basic package.json fixes
        if (!pkg.main && existsSync('index.js')) pkg.main = 'index.js';
        if (!pkg.module && existsSync('index.mjs')) pkg.module = 'index.mjs';
        if (!pkg.types && existsSync('index.d.ts')) pkg.types = 'index.d.ts';
        await Bun.write(this.packagePath, JSON.stringify(pkg, null, 2));
        console.log('🔧 Package.json fixes applied');
        break;

      default:
        throw new Error(`Unknown pkg command: ${command}`);
    }
  }

  // bun pm cache
  async cache(command: string = ''): Promise<void> {
    switch (command) {
      case 'rm':
      case 'clear':
        const startTime = performance.now();
        // Simulate cache clearing (in real Bun this would clear the actual cache)
        await new Promise(resolve => setTimeout(resolve, 5)); // Simulate 5ms operation
        const duration = performance.now() - startTime;
        console.log(`🗑️  Cache cleared in ${duration.toFixed(1)}ms`);
        break;

      case '':
        console.log(`📁 Cache path: ${this.cachePath}`);
        break;

      default:
        console.log(`📁 Cache path: ${this.cachePath}`);
    }
  }

  // bun pm migrate
  async migrate(options: PMOptions = {}): Promise<void> {
    const startTime = performance.now();

    // Check for different lockfiles
    const lockfiles = ['yarn.lock', 'pnpm-lock.yaml', 'package-lock.json'];
    const foundLockfiles = lockfiles.filter(file => existsSync(file));

    if (foundLockfiles.length === 0) {
      console.log('No lockfiles found to migrate');
      return;
    }

    console.log('🔄 Migrating lockfiles...');

    // Simulate migration (in real Bun this would actually migrate)
    await new Promise(resolve => setTimeout(resolve, 15)); // Simulate 15ms operation

    // Create bun.lock (simulated)
    const pkg = await this.readPackageJson();
    const lockfile = {
      version: pkg.version || '0.0.0',
      migratedFrom: foundLockfiles,
      timestamp: new Date().toISOString()
    };

    await Bun.write('bun.lock', JSON.stringify(lockfile, null, 2));

    const duration = performance.now() - startTime;
    console.log(`✅ Migration complete in ${duration.toFixed(1)}ms`);
    console.log(`📄 Migrated from: ${foundLockfiles.join(', ')}`);
  }

  // bun pm trust
  async trust(options: PMOptions = {}): Promise<void> {
    const { all = false } = options;

    if (all) {
      console.log('🔒 Trusted all dependencies');
      return;
    }

    const pkg = await this.readPackageJson();
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });

    console.log('🔒 Trusted dependencies:');
    deps.forEach(dep => console.log(`  ✅ ${dep}`));
  }

  // bun pm untrusted
  async untrusted(): Promise<void> {
    // Simulate finding untrusted dependencies
    const untrusted = [
      { name: '@biomejs/biome', version: '1.8.3', reason: 'blocked scripts' },
      { name: 'some-other-dep', version: '2.1.0', reason: 'suspicious scripts' }
    ];

    if (untrusted.length === 0) {
      console.log('✅ No untrusted dependencies found');
      return;
    }

    console.log('⚠️  Untrusted dependencies:');
    untrusted.forEach(dep => {
      console.log(`  ❌ ${dep.name}@${dep.version} - ${dep.reason}`);
    });
  }

  // bun pm whoami
  async whoami(): Promise<void> {
    // Simulate npm whoami
    const user = process.env.USER || 'anonymous';
    console.log(user);
  }

  // bun pm hash
  async hash(file?: string): Promise<void> {
    if (!file) {
      console.log('Usage: bun pm hash <file>');
      return;
    }

    if (!existsSync(file)) {
      throw new Error(`File not found: ${file}`);
    }

    const content = await Bun.file(file).arrayBuffer();
    const hash = createHash('sha256').update(Buffer.from(content)).digest('hex');

    console.log(hash);
  }

  private async readPackageJson(): Promise<any> {
    if (!existsSync(this.packagePath)) {
      throw new Error('package.json not found');
    }
    return await Bun.file(this.packagePath).json();
  }

  private collectFiles(pkg: any): string[] {
    const files: string[] = [];

    // Default files to include
    const defaultIncludes = ['package.json', 'README.md', 'LICENSE'];

    // Add files from package.json
    if (pkg.files) {
      files.push(...pkg.files);
    }

    // Add default files if they exist
    defaultIncludes.forEach(file => {
      if (existsSync(file)) files.push(file);
    });

    // Add main/module/types if they exist
    ['main', 'module', 'types'].forEach(field => {
      if (pkg[field] && existsSync(pkg[field])) {
        files.push(pkg[field]);
      }
    });

    return [...new Set(files)]; // Remove duplicates
  }

  private async createTarball(files: string[], pkg: any): Promise<string> {
    // Simulate tarball creation (in real Bun this would create actual tarballs)
    let content = '';

    for (const file of files) {
      if (existsSync(file)) {
        const fileContent = await Bun.file(file).text();
        content += `${file}\n${fileContent}\n---\n`;
      }
    }

    return content;
  }

  private bumpMajor(version: string): string {
    const [major] = version.split('.').map(Number);
    return `${major + 1}.0.0`;
  }

  private bumpMinor(version: string): string {
    const [major, minor] = version.split('.').map(Number);
    return `${major}.${minor + 1}.0`;
  }

  private bumpPatch(version: string): string {
    const [major, minor, patch] = version.split('.').map(Number);
    return `${major}.${minor}.${patch + 1}`;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!(key in current)) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  private async runCommand(cmd: string, args: string[]): Promise<void> {
    const proc = spawn([cmd, ...args], {
      stdout: 'inherit',
      stderr: 'inherit'
    });
    await proc.exited;
  }
}

// CLI Interface
async function main() {
  const [,, subcommand, ...args] = process.argv;

  const pm = new BunPackageManager();

  try {
    switch (subcommand) {
      case 'pack':
        const packOptions: PMOptions = {
          dryRun: args.includes('--dry-run'),
          quiet: args.includes('--quiet'),
          destination: args.find(arg => arg.startsWith('--destination='))?.split('=')[1] || '.',
          gzipLevel: parseInt(args.find(arg => arg.startsWith('--gzip-level='))?.split('=')[1] || '9')
        };
        await pm.pack(packOptions);
        break;

      case 'ls':
        const lsOptions: PMOptions = {
          all: args.includes('--all'),
          json: args.includes('--json')
        };
        await pm.ls(lsOptions);
        break;

      case 'bin':
        const binOptions: PMOptions = {
          json: args.includes('--json')
        };
        await pm.bin(binOptions);
        break;

      case 'version':
        const versionType = args[0];
        const versionOptions: PMOptions = {
          message: args.find(arg => arg.startsWith('--message='))?.split('=')[1],
          noGitTagVersion: args.includes('--no-git-tag-version')
        };
        await pm.version(versionType, versionOptions);
        break;

      case 'pkg':
        const pkgCommand = args[0];
        await pm.pkg(pkgCommand, ...args.slice(1));
        break;

      case 'cache':
        await pm.cache(args[0]);
        break;

      case 'migrate':
        await pm.migrate();
        break;

      case 'trust':
        const trustOptions: PMOptions = {
          all: args.includes('--all')
        };
        await pm.trust(trustOptions);
        break;

      case 'untrusted':
        await pm.untrusted();
        break;

      case 'whoami':
        await pm.whoami();
        break;

      case 'hash':
        await pm.hash(args[0]);
        break;

      default:
        console.log(`
Bun Package Manager v1.3

Usage: bun pm <command> [options]

Commands:
  pack [options]           Create a tarball from package
  ls [options]             List dependencies
  bin [options]            Show bin paths
  version <type> [options] Bump version (major/minor/patch)
  pkg <command> [args]     Manipulate package.json
  cache [command]          Manage package cache
  migrate [options]        Migrate from other package managers
  trust [options]          Trust dependencies
  untrusted                Show untrusted dependencies
  whoami                   Show current user
  hash <file>              Generate SHA256 hash of file

Options:
  --dry-run               Dry run mode
  --quiet                 Suppress output
  --all                   Show all dependencies
  --json                  JSON output
  --destination=<dir>     Output directory for pack
  --gzip-level=<level>    Compression level (1-9)
  --message=<msg>         Git commit message
  --no-git-tag-version    Skip git operations
        `);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}

export { BunPackageManager };