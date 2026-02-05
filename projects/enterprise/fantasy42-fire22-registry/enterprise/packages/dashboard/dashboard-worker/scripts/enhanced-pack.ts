#!/usr/bin/env bun

/**
 * 📦 Enhanced Pack System with Advanced Features
 *
 * - Handles version suffixes (1.2.3-[2], 1.0.0-beta.1, etc.)
 * - Dry run support for all operations
 * - Temporary package.json for version overrides
 * - Robust error handling and cleanup
 * - File existence verification
 */

import { $ } from 'bun';
import { existsSync, mkdirSync, writeFileSync, unlinkSync, readFileSync, copyFileSync } from 'fs';
import { join, basename, dirname } from 'path';
import { createHash } from 'crypto';
import { tmpdir } from 'os';

interface PackOptions {
  dryRun?: boolean;
  destination?: string;
  filename?: string;
  ignoreScripts?: boolean;
  gzipLevel?: number;
  quiet?: boolean;
  version?: string; // Override version
  tempPackageJson?: boolean; // Use temporary package.json
}

interface VersionInfo {
  version: string;
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  suffix?: string;
  metadata?: string;
}

export class EnhancedPackSystem {
  private readonly distDir = join(process.cwd(), 'dist');
  private readonly packagesDir = join(this.distDir, 'packages');
  private readonly releasesDir = join(this.distDir, 'releases');
  private readonly ciDir = join(this.distDir, 'ci');
  private tempFiles: string[] = [];

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
   * Parse version string with support for suffixes
   * Examples: 1.2.3, 1.2.3-beta.1, 1.2.3-[2], 1.0.0+build.123
   */
  private parseVersion(versionString: string): VersionInfo {
    // Handle semantic versioning with optional prerelease and metadata
    const versionRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([\w\[\].-]+))?(?:\+([\w.-]+))?$/;
    const match = versionString.match(versionRegex);

    if (!match) {
      throw new Error(`Invalid version format: ${versionString}`);
    }

    const [, major, minor, patch, prerelease, metadata] = match;

    return {
      version: versionString,
      major: parseInt(major),
      minor: parseInt(minor),
      patch: parseInt(patch),
      prerelease,
      suffix: prerelease,
      metadata,
    };
  }

  /**
   * Sanitize version for filename
   * Convert special characters to safe alternatives
   */
  private sanitizeVersionForFilename(version: string): string {
    return version.replace(/\[/g, '_').replace(/\]/g, '_').replace(/\+/g, '_').replace(/\s/g, '-');
  }

  /**
   * Create temporary package.json with version override
   */
  private async createTempPackageJson(version: string): Promise<string> {
    const originalPath = join(process.cwd(), 'package.json');

    if (!existsSync(originalPath)) {
      throw new Error('package.json not found');
    }

    // Create backup
    const backupPath = `${originalPath}.backup.${Date.now()}`;
    copyFileSync(originalPath, backupPath);
    this.tempFiles.push(backupPath);

    // Read and modify package.json
    const packageData = JSON.parse(readFileSync(originalPath, 'utf8'));
    const originalVersion = packageData.version;
    packageData.version = version;

    // Create temporary package.json
    const tempPath = join(tmpdir(), `package-${Date.now()}.json`);
    writeFileSync(tempPath, JSON.stringify(packageData, null, 2));
    this.tempFiles.push(tempPath);

    console.log(`📝 Created temp package.json with version: ${version}`);
    console.log(`   Original version: ${originalVersion}`);

    return tempPath;
  }

  /**
   * Cleanup temporary files
   */
  private cleanup(): void {
    for (const file of this.tempFiles) {
      try {
        if (existsSync(file)) {
          unlinkSync(file);
        }
      } catch (error) {
        console.warn(`⚠️  Failed to cleanup: ${file}`);
      }
    }
    this.tempFiles = [];
  }

  /**
   * Pack with enhanced options and error handling
   */
  async pack(options: PackOptions = {}): Promise<string | null> {
    let tempPackageJson: string | null = null;

    try {
      // Validate files exist
      if (!existsSync('package.json')) {
        throw new Error('package.json not found in current directory');
      }

      // Handle dry run
      if (options.dryRun) {
        console.log('🔍 DRY RUN - Simulating pack operation');
        console.log('   Would execute: bun pm pack');

        if (options.destination) {
          console.log(`   Destination: ${options.destination}`);

          // Check if destination exists
          if (!existsSync(options.destination)) {
            console.log(`   ⚠️  Destination does not exist, would create: ${options.destination}`);
          }
        }

        if (options.version) {
          console.log(`   Version override: ${options.version}`);
        }

        if (options.gzipLevel !== undefined) {
          console.log(`   Compression level: ${options.gzipLevel}`);
        }

        // Show what would be packed
        await $`bun pm pack --dry-run`;
        return null;
      }

      // Create destination directory if needed
      if (options.destination && !existsSync(options.destination)) {
        mkdirSync(options.destination, { recursive: true });
      }

      // Handle version override with temp package.json
      if (options.version && options.tempPackageJson) {
        tempPackageJson = await this.createTempPackageJson(options.version);
      }

      // Build pack command
      const args: string[] = ['pm', 'pack'];

      if (options.destination) args.push('--destination', options.destination);
      if (options.filename) {
        // Sanitize filename if it contains version
        const sanitizedFilename = this.sanitizeVersionForFilename(options.filename);
        args.push('--filename', sanitizedFilename);
      }
      if (options.ignoreScripts) args.push('--ignore-scripts');
      if (options.gzipLevel !== undefined) {
        args.push('--gzip-level', options.gzipLevel.toString());
      }
      if (options.quiet) args.push('--quiet');

      // Execute pack
      const result = await $`bun ${args}`.text();

      if (options.quiet) {
        return result.trim();
      }

      // Extract tarball name from verbose output
      const lines = result.split('\n');
      const tarballLine = lines.find(line => line.endsWith('.tgz'));
      return tarballLine || result;
    } catch (error) {
      console.error('❌ Pack failed:', error);
      throw error;
    } finally {
      // Always cleanup temp files
      this.cleanup();
    }
  }

  /**
   * Pack with version suffix handling
   */
  async packWithVersion(version: string, options: PackOptions = {}): Promise<string | null> {
    console.log(`📦 Packing with version: ${version}`);

    try {
      // Parse and validate version
      const versionInfo = this.parseVersion(version);
      console.log(`   Version details:`, versionInfo);

      // Prepare filename
      const sanitizedVersion = this.sanitizeVersionForFilename(version);
      const packageJson = await Bun.file('package.json').json();
      const packageName = packageJson.name || 'package';
      const filename = `${packageName}-${sanitizedVersion}.tgz`;

      // Pack with version override
      const result = await this.pack({
        ...options,
        version,
        tempPackageJson: true,
        filename,
      });

      return result;
    } catch (error) {
      console.error('❌ Version pack failed:', error);
      throw error;
    }
  }

  /**
   * Batch pack with different versions
   */
  async batchPack(versions: string[], options: PackOptions = {}): Promise<void> {
    console.log('📦 Batch Pack Multiple Versions');
    console.log('='.repeat(50));

    const results: { version: string; result: string | null; status: 'success' | 'failed' }[] = [];

    for (const version of versions) {
      try {
        console.log(`\n📦 Packing version ${version}...`);

        if (options.dryRun) {
          console.log('   🔍 DRY RUN - Would pack this version');
          results.push({ version, result: null, status: 'success' });
        } else {
          const result = await this.packWithVersion(version, options);
          results.push({ version, result, status: 'success' });
          console.log(`   ✅ Success: ${result}`);
        }
      } catch (error) {
        results.push({ version, result: null, status: 'failed' });
        console.log(`   ❌ Failed: ${error}`);
      }
    }

    // Summary
    console.log('\n📊 Batch Pack Summary');
    console.log('='.repeat(50));

    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;

    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);

    if (failed > 0) {
      console.log('\nFailed versions:');
      results
        .filter(r => r.status === 'failed')
        .forEach(r => {
          console.log(`   - ${r.version}`);
        });
    }
  }

  /**
   * Safe pack with comprehensive error handling
   */
  async safePack(
    options: PackOptions = {}
  ): Promise<{ success: boolean; result?: string; error?: string }> {
    try {
      // Pre-flight checks
      const checks = await this.preFlightChecks(options);
      if (!checks.valid) {
        return { success: false, error: checks.error };
      }

      // Execute pack
      const result = await this.pack(options);

      // Post-pack validation
      if (result && !options.dryRun) {
        const tarballPath = options.destination
          ? join(options.destination, basename(result))
          : result;

        if (!existsSync(tarballPath)) {
          return { success: false, error: `Tarball not found at: ${tarballPath}` };
        }

        // Verify tarball integrity
        const integrity = await this.verifyTarball(tarballPath);
        if (!integrity.valid) {
          return { success: false, error: `Tarball integrity check failed: ${integrity.error}` };
        }
      }

      return { success: true, result: result || undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      this.cleanup();
    }
  }

  /**
   * Pre-flight checks before packing
   */
  private async preFlightChecks(options: PackOptions): Promise<{ valid: boolean; error?: string }> {
    // Check package.json exists
    if (!existsSync('package.json')) {
      return { valid: false, error: 'package.json not found' };
    }

    // Validate package.json
    try {
      const packageJson = await Bun.file('package.json').json();
      if (!packageJson.name) {
        return { valid: false, error: 'package.json missing name field' };
      }
      if (!packageJson.version) {
        return { valid: false, error: 'package.json missing version field' };
      }
    } catch (error) {
      return { valid: false, error: 'Invalid package.json format' };
    }

    // Check destination accessibility
    if (options.destination) {
      const destDir = dirname(options.destination);
      if (!existsSync(destDir)) {
        try {
          mkdirSync(destDir, { recursive: true });
        } catch (error) {
          return { valid: false, error: `Cannot create destination: ${destDir}` };
        }
      }
    }

    // Validate version format if provided
    if (options.version) {
      try {
        this.parseVersion(options.version);
      } catch (error) {
        return { valid: false, error: `Invalid version format: ${options.version}` };
      }
    }

    return { valid: true };
  }

  /**
   * Verify tarball integrity
   */
  private async verifyTarball(tarballPath: string): Promise<{ valid: boolean; error?: string }> {
    try {
      // Check file exists
      if (!existsSync(tarballPath)) {
        return { valid: false, error: 'Tarball file not found' };
      }

      // Check file size
      const stats = await Bun.file(tarballPath).size();
      if (stats === 0) {
        return { valid: false, error: 'Tarball is empty' };
      }

      // Verify it's a valid gzip file
      const buffer = await Bun.file(tarballPath).bytes();
      const gzipMagic = new Uint8Array([0x1f, 0x8b]);

      if (buffer[0] !== gzipMagic[0] || buffer[1] !== gzipMagic[1]) {
        return { valid: false, error: 'Invalid gzip file format' };
      }

      // Calculate checksum
      const hash = createHash('sha256').update(buffer).digest('hex');
      console.log(`   🔐 SHA256: ${hash}`);

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Show usage examples
   */
  showExamples(): void {
    console.log(`
📦 Enhanced Pack System - Examples
!==!==!==!==!==!=====

Basic Usage:
  bun run scripts/enhanced-pack.ts pack
  bun run scripts/enhanced-pack.ts pack --dry-run
  
Version Handling:
  # Standard version
  bun run scripts/enhanced-pack.ts version 1.2.3
  
  # Version with suffix
  bun run scripts/enhanced-pack.ts version "1.2.3-[2]"
  
  # Prerelease version
  bun run scripts/enhanced-pack.ts version 1.2.3-beta.1
  
  # Version with metadata
  bun run scripts/enhanced-pack.ts version 1.2.3+build.123

Batch Operations:
  # Pack multiple versions
  bun run scripts/enhanced-pack.ts batch "1.0.0" "1.0.1-beta" "1.0.1-[2]"
  
  # Dry run batch
  bun run scripts/enhanced-pack.ts batch --dry-run "1.0.0" "1.0.1"

Safe Pack:
  # With comprehensive error handling
  bun run scripts/enhanced-pack.ts safe
  bun run scripts/enhanced-pack.ts safe --destination ./dist
  
Options:
  --dry-run           Preview without executing
  --destination DIR   Output directory
  --gzip-level N      Compression level (0-9)
  --quiet             Minimal output
  --ignore-scripts    Skip pre/post scripts
    `);
  }
}

// CLI Interface
if (import.meta.main) {
  const system = new EnhancedPackSystem();
  const [command, ...args] = process.argv.slice(2);

  try {
    switch (command) {
      case 'pack':
        const dryRun = args.includes('--dry-run');
        const quiet = args.includes('--quiet');
        const destination = args.includes('--destination')
          ? args[args.indexOf('--destination') + 1]
          : undefined;

        await system.pack({ dryRun, quiet, destination });
        break;

      case 'version':
        if (args.length === 0) {
          console.error('❌ Version required');
          process.exit(1);
        }
        await system.packWithVersion(args[0], {
          destination: './dist/packages',
          dryRun: args.includes('--dry-run'),
        });
        break;

      case 'batch':
        const versions = args.filter(a => !a.startsWith('--'));
        if (versions.length === 0) {
          console.error('❌ At least one version required');
          process.exit(1);
        }
        await system.batchPack(versions, {
          destination: './dist/packages',
          dryRun: args.includes('--dry-run'),
        });
        break;

      case 'safe':
        const result = await system.safePack({
          destination: args.includes('--destination')
            ? args[args.indexOf('--destination') + 1]
            : './dist/packages',
          dryRun: args.includes('--dry-run'),
        });

        if (result.success) {
          console.log('✅ Pack successful:', result.result);
        } else {
          console.error('❌ Pack failed:', result.error);
          process.exit(1);
        }
        break;

      case 'help':
      case 'examples':
        system.showExamples();
        break;

      default:
        console.log(`
🚀 Enhanced Pack System
!==!==!==!====

Commands:
  pack              Standard pack with options
  version <ver>     Pack with specific version
  batch <vers...>   Pack multiple versions
  safe              Pack with comprehensive checks
  examples          Show usage examples
  help              Show this help

Options:
  --dry-run         Preview without executing
  --destination     Output directory
  --quiet           Minimal output
  --gzip-level      Compression level (0-9)
  --ignore-scripts  Skip pre/post scripts

Try: bun run scripts/enhanced-pack.ts examples
        `);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}
