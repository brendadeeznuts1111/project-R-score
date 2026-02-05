#!/usr/bin/env bun

/**
 * 📦 Fire22 Build & Pack System
 *
 * Comprehensive build and package distribution management using Bun PM features
 */

import { $ } from 'bun';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

interface PackOptions {
  dryRun?: boolean;
  destination?: string;
  filename?: string;
  ignoreScripts?: boolean;
  gzipLevel?: number;
  quiet?: boolean;
}

interface ReleaseOptions {
  version?: string;
  prerelease?: boolean;
  preid?: string;
  message?: string;
}

export class BuildAndPackSystem {
  private readonly distDir = join(process.cwd(), 'dist');
  private readonly packagesDir = join(this.distDir, 'packages');
  private readonly releasesDir = join(this.distDir, 'releases');
  private readonly ciDir = join(this.distDir, 'ci');

  constructor() {
    this.ensureDirectories();
  }

  /**
   * Ensure all distribution directories exist
   */
  private ensureDirectories(): void {
    const dirs = [
      this.distDir,
      this.packagesDir,
      this.releasesDir,
      this.ciDir,
      join(this.distDir, 'latest'),
    ];

    for (const dir of dirs) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * Pack with advanced options
   */
  async pack(options: PackOptions = {}): Promise<string> {
    const args: string[] = ['pm', 'pack'];

    // Add options
    if (options.dryRun) args.push('--dry-run');
    if (options.destination) args.push('--destination', options.destination);
    if (options.filename) args.push('--filename', options.filename);
    if (options.ignoreScripts) args.push('--ignore-scripts');
    if (options.gzipLevel !== undefined) {
      args.push('--gzip-level', options.gzipLevel.toString());
    }
    if (options.quiet) args.push('--quiet');

    const result = await $`bun ${args}`.text();

    if (options.quiet) {
      return result.trim();
    }

    // Extract tarball name from verbose output
    const lines = result.split('\n');
    const tarballLine = lines.find(line => line.endsWith('.tgz'));
    return tarballLine || result;
  }

  /**
   * Pack in quiet mode for CI/CD
   */
  async packQuiet(destination?: string): Promise<string> {
    const options: PackOptions = {
      quiet: true,
      destination: destination || this.ciDir,
    };

    console.log('📦 Packing in quiet mode...');
    const tarball = await this.pack(options);
    console.log(`   Created: ${tarball}`);
    return tarball;
  }

  /**
   * Perform dry run to see what will be packed
   */
  async packDryRun(): Promise<void> {
    console.log('🔍 Dry Run - Files to be packed:');
    console.log('='.repeat(50));

    await $`bun pm pack --dry-run`;
  }

  /**
   * Pack all workspace packages
   */
  async packAllWorkspaces(): Promise<void> {
    console.log('📦 Packing All Workspace Packages');
    console.log('='.repeat(50));

    // Get current package info
    const mainPackage = await Bun.file('package.json').json();

    // Pack main package
    console.log('\n📦 Main Package:');
    const mainTarball = await this.pack({
      destination: this.packagesDir,
      quiet: true,
    });
    console.log(`   ✅ ${mainTarball}`);

    // Pack workspace packages
    const workspaces = mainPackage.workspaces || [];

    for (const workspace of workspaces) {
      const workspacePath = workspace.replace('/*', '');
      const packagesPath = join(process.cwd(), workspacePath);

      if (!existsSync(packagesPath)) continue;

      const packages = await $`ls ${packagesPath}`.text();
      const packageDirs = packages
        .trim()
        .split('\n')
        .filter(p => !p.includes('.') && !p.includes('README'));

      for (const pkg of packageDirs) {
        const pkgPath = join(packagesPath, pkg);
        const pkgJsonPath = join(pkgPath, 'package.json');

        if (!existsSync(pkgJsonPath)) continue;

        console.log(`\n📦 ${pkg}:`);
        process.chdir(pkgPath);

        try {
          const tarball = await this.pack({
            destination: this.packagesDir,
            quiet: true,
          });
          console.log(`   ✅ ${tarball}`);
        } catch (error) {
          console.log(`   ❌ Failed to pack`);
        }
      }
    }

    // Return to original directory
    process.chdir(join(this.packagesDir, '../..'));
    console.log('\n✅ All packages packed successfully!');
  }

  /**
   * Create a versioned release
   */
  async createRelease(options: ReleaseOptions = {}): Promise<void> {
    console.log('🚀 Creating Release');
    console.log('='.repeat(50));

    // Get current version
    const packageJson = await Bun.file('package.json').json();
    const version = options.version || packageJson.version;
    const releaseDir = join(this.releasesDir, `v${version}`);

    // Create release directory
    if (!existsSync(releaseDir)) {
      mkdirSync(releaseDir, { recursive: true });
    }

    // Pack to release directory
    console.log(`\n📦 Creating release v${version}...`);
    const tarball = await this.pack({
      destination: releaseDir,
      gzipLevel: 9,
      quiet: true,
    });
    console.log(`   ✅ Package: ${tarball}`);

    // Generate checksums
    await this.generateChecksums(releaseDir);

    // Get dependencies info
    console.log('\n📋 Generating dependency list...');
    const deps = await $`bun pm ls`.text();
    writeFileSync(join(releaseDir, 'dependencies.txt'), deps);
    console.log('   ✅ Dependencies saved');

    // Get hash info
    console.log('\n🔐 Generating lockfile hash...');
    const hash = await $`bun pm hash`.text();
    writeFileSync(join(releaseDir, 'lockfile-hash.txt'), hash.trim());
    console.log(`   ✅ Hash: ${hash.trim()}`);

    // Create symlink to latest
    const latestDir = join(this.distDir, 'latest');
    if (existsSync(latestDir)) {
      await $`rm -rf ${latestDir}`;
    }
    await $`ln -s ${releaseDir} ${latestDir}`;
    console.log('\n✅ Release created successfully!');
  }

  /**
   * Generate checksums for files in a directory
   */
  async generateChecksums(dir: string): Promise<void> {
    console.log('\n🔐 Generating checksums...');

    const files = await $`ls ${dir}/*.tgz 2>/dev/null || true`.text();
    if (!files.trim()) {
      console.log('   ⚠️  No .tgz files found');
      return;
    }

    const fileList = files.trim().split('\n').filter(Boolean);
    const checksums: string[] = [];

    for (const file of fileList) {
      const content = await Bun.file(file).bytes();
      const hash = createHash('sha256').update(content).digest('hex');
      const filename = file.split('/').pop();
      checksums.push(`${hash}  ${filename}`);
    }

    const checksumsPath = join(dir, 'checksums.txt');
    writeFileSync(checksumsPath, checksums.join('\n'));
    console.log(`   ✅ Checksums saved to ${checksumsPath}`);
  }

  /**
   * Create distribution manifest
   */
  async createManifest(): Promise<void> {
    console.log('📋 Creating Distribution Manifest');
    console.log('='.repeat(50));

    const manifest: any = {
      created: new Date().toISOString(),
      version: await this.getVersion(),
      hash: await $`bun pm hash`.text().then(h => h.trim()),
      packages: [],
      releases: [],
      cache: await $`bun pm cache`.text().then(c => c.trim()),
    };

    // List packages
    const packagesFiles = await $`ls ${this.packagesDir}/*.tgz 2>/dev/null || true`.text();
    if (packagesFiles.trim()) {
      manifest.packages = packagesFiles
        .trim()
        .split('\n')
        .filter(Boolean)
        .map(f => f.split('/').pop());
    }

    // List releases
    const releases = await $`ls -d ${this.releasesDir}/v* 2>/dev/null || true`.text();
    if (releases.trim()) {
      manifest.releases = releases
        .trim()
        .split('\n')
        .filter(Boolean)
        .map(d => d.split('/').pop());
    }

    // Save manifest
    const manifestPath = join(this.distDir, 'manifest.json');
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    console.log('\n📋 Manifest:');
    console.log(JSON.stringify(manifest, null, 2));
    console.log(`\n✅ Manifest saved to ${manifestPath}`);
  }

  /**
   * Get current version
   */
  private async getVersion(): Promise<string> {
    const packageJson = await Bun.file('package.json').json();
    return packageJson.version;
  }

  /**
   * Clean distribution directory
   */
  async clean(): Promise<void> {
    console.log('🧹 Cleaning Distribution Directory');
    console.log('='.repeat(50));

    await $`rm -rf ${this.distDir}`;
    this.ensureDirectories();

    console.log('✅ Distribution directory cleaned');
  }

  /**
   * Verify distribution
   */
  async verify(): Promise<void> {
    console.log('✓ Verifying Distribution');
    console.log('='.repeat(50));

    // Check directories
    console.log('\n📁 Directories:');
    const dirs = [this.packagesDir, this.releasesDir, this.ciDir];
    for (const dir of dirs) {
      const exists = existsSync(dir);
      const status = exists ? '✅' : '❌';
      console.log(`   ${status} ${dir}`);
    }

    // Count packages
    const packages = await $`ls ${this.packagesDir}/*.tgz 2>/dev/null | wc -l`.text();
    console.log(`\n📦 Packages: ${packages.trim()} tarball(s)`);

    // Check latest release
    const latestDir = join(this.distDir, 'latest');
    if (existsSync(latestDir)) {
      const target = await $`readlink ${latestDir}`.text();
      console.log(`\n🔗 Latest release: ${target.trim()}`);
    }

    // Check manifest
    const manifestPath = join(this.distDir, 'manifest.json');
    if (existsSync(manifestPath)) {
      console.log('\n✅ Manifest exists');
    } else {
      console.log('\n❌ Manifest missing');
    }
  }

  /**
   * Show cache info
   */
  async cacheInfo(): Promise<void> {
    console.log('💾 Cache Information');
    console.log('='.repeat(50));

    const cachePath = await $`bun pm cache`.text();
    console.log(`\n📁 Cache path: ${cachePath.trim()}`);

    // Get cache size
    try {
      const size = await $`du -sh ${cachePath.trim()} 2>/dev/null | cut -f1`.text();
      console.log(`📊 Cache size: ${size.trim()}`);
    } catch {
      console.log('📊 Cache size: Unable to determine');
    }

    console.log('\nTo clear cache, run: bun pm cache rm');
  }
}

// CLI Interface
if (import.meta.main) {
  const system = new BuildAndPackSystem();
  const [command, ...args] = process.argv.slice(2);

  try {
    switch (command) {
      case 'pack':
        await system.pack();
        break;

      case 'pack-quiet':
        await system.packQuiet();
        break;

      case 'pack-dry':
        await system.packDryRun();
        break;

      case 'pack-all':
        await system.packAllWorkspaces();
        break;

      case 'release':
        await system.createRelease({ version: args[0] });
        break;

      case 'manifest':
        await system.createManifest();
        break;

      case 'clean':
        await system.clean();
        break;

      case 'verify':
        await system.verify();
        break;

      case 'cache':
        await system.cacheInfo();
        break;

      default:
        console.log(`
🚀 Fire22 Build & Pack System
!==!==!==!==!====

Commands:
  pack            Standard pack
  pack-quiet      Pack with quiet output
  pack-dry        Dry run to see what will be packed
  pack-all        Pack all workspace packages
  release [ver]   Create versioned release
  manifest        Generate distribution manifest
  clean           Clean distribution directory
  verify          Verify distribution
  cache           Show cache information

Examples:
  bun run scripts/build-and-pack.ts pack
  bun run scripts/build-and-pack.ts pack-quiet
  bun run scripts/build-and-pack.ts release 3.0.8
  bun run scripts/build-and-pack.ts pack-all

Options are passed through to bun pm pack.
        `);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

export default BuildAndPackSystem;
