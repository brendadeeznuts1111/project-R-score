#!/usr/bin/env bun
/**
 * 🚀 bun x Integration for Registry Packages
 * 
 * Features:
 * - Execute packages from private registry
 * - Version resolution with bun.semver
 * - Caching and optimization
 * - Secure credential handling
 */

import { styled } from '../theme/colors';
import { R2StorageAdapter } from './r2-storage';
import { RegistrySecretsManager } from './secrets-manager';

// Use bun.semver if available
const semver = (Bun as any).semver || {
  satisfies: () => true,
  valid: (v: string) => v,
  maxSatisfying: (versions: string[], range: string) => versions[0],
};

export interface BunXOptions {
  package: string;
  version?: string;
  registry?: string;
  args?: string[];
  cacheDir?: string;
  force?: boolean;
  quiet?: boolean;
}

export interface CachedPackage {
  name: string;
  version: string;
  path: string;
  binPath?: string;
  installedAt: string;
  lastUsed: string;
  size: number;
}

export class BunXIntegration {
  private storage: R2StorageAdapter;
  private secretsManager: RegistrySecretsManager;
  private cacheDir: string;
  private metadataCache = new Map<string, any>();

  constructor(
    options: {
      cacheDir?: string;
      registry?: string;
    } = {}
  ) {
    this.cacheDir = options.cacheDir || `${process.env.HOME}/.bun/registry-cache`;
    this.storage = new R2StorageAdapter({
      bucketName: process.env.R2_REGISTRY_BUCKET || 'npm-registry',
    });
    this.secretsManager = new RegistrySecretsManager();
  }

  /**
   * Execute a package (like bun x)
   */
  async execute(options: BunXOptions): Promise<{ exitCode: number; output?: string }> {
    const { package: pkgName, version, args = [] } = options;

    console.log(styled(`🚀 Executing ${pkgName}${version ? `@${version}` : ''}`, 'accent'));

    try {
      // Resolve version
      const resolvedVersion = await this.resolveVersion(pkgName, version);
      if (!resolvedVersion) {
        console.error(styled(`❌ Could not resolve version for ${pkgName}`, 'error'));
        return { exitCode: 1 };
      }

      console.log(styled(`📦 Resolved to ${pkgName}@${resolvedVersion}`, 'success'));

      // Check cache
      let cached = await this.getCachedPackage(pkgName, resolvedVersion);
      
      if (!cached || options.force) {
        // Download and cache
        cached = await this.downloadAndCache(pkgName, resolvedVersion);
      }

      if (!cached) {
        console.error(styled(`❌ Failed to download ${pkgName}`, 'error'));
        return { exitCode: 1 };
      }

      // Update last used
      await this.updateLastUsed(cached);

      // Execute
      return await this.runPackage(cached, args, options.quiet);
    } catch (error) {
      console.error(styled(`❌ Execution failed: ${error.message}`, 'error'));
      return { exitCode: 1 };
    }
  }

  /**
   * Resolve version using bun.semver
   */
  async resolveVersion(pkgName: string, range?: string): Promise<string | null> {
    // Get available versions from registry
    const versions = await this.getPackageVersions(pkgName);
    
    if (versions.length === 0) {
      return null;
    }

    if (!range || range === 'latest') {
      return versions[0];
    }

    // Use bun.semver to find best match
    try {
      const validVersions = versions.filter(v => semver.valid(v));
      const maxSatisfying = semver.maxSatisfying?.(validVersions, range);
      
      if (maxSatisfying) {
        return maxSatisfying;
      }

      // Fallback to exact match
      if (versions.includes(range)) {
        return range;
      }

      return null;
    } catch {
      return versions[0];
    }
  }

  /**
   * Get available versions from registry
   */
  async getPackageVersions(pkgName: string): Promise<string[]> {
    const cacheKey = `versions:${pkgName}`;
    
    if (this.metadataCache.has(cacheKey)) {
      return this.metadataCache.get(cacheKey);
    }

    try {
      const registry = process.env.REGISTRY_URL || 'https://npm.factory-wager.com';
      const credentials = await this.secretsManager.getRegistryCredentials(registry);
      
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };

      if (credentials?.token) {
        headers['Authorization'] = `Bearer ${credentials.token}`;
      }

      const response = await fetch(`${registry}/${pkgName}`, { headers });
      
      if (!response.ok) {
        return [];
      }

      const manifest = await response.json();
      const versions = Object.keys(manifest.versions || {});
      
      // Sort by semver (highest first)
      versions.sort((a, b) => {
        const semverA = semver.parse?.(a);
        const semverB = semver.parse?.(b);
        if (semverA && semverB) {
          return semver.compare?.(b, a) || 0;
        }
        return b.localeCompare(a);
      });

      this.metadataCache.set(cacheKey, versions);
      return versions;
    } catch (error) {
      console.error(styled(`❌ Failed to fetch versions: ${error.message}`, 'error'));
      return [];
    }
  }

  /**
   * Download and cache package
   */
  private async downloadAndCache(pkgName: string, version: string): Promise<CachedPackage | null> {
    try {
      const registry = process.env.REGISTRY_URL || 'https://npm.factory-wager.com';
      const credentials = await this.secretsManager.getRegistryCredentials(registry);
      
      // Get manifest
      const manifestResponse = await fetch(`${registry}/${pkgName}`, {
        headers: credentials?.token ? { 'Authorization': `Bearer ${credentials.token}` } : {},
      });

      if (!manifestResponse.ok) {
        return null;
      }

      const manifest = await manifestResponse.json();
      const versionData = manifest.versions?.[version];
      
      if (!versionData?.dist?.tarball) {
        return null;
      }

      // Download tarball
      const tarballUrl = versionData.dist.tarball;
      console.log(styled(`📥 Downloading from ${tarballUrl}`, 'info'));

      const tarballResponse = await fetch(tarballUrl, {
        headers: credentials?.token ? { 'Authorization': `Bearer ${credentials.token}` } : {},
      });

      if (!tarballResponse.ok) {
        return null;
      }

      const tarballData = await tarballResponse.arrayBuffer();

      // Extract to cache directory
      const cachePath = `${this.cacheDir}/${pkgName}@${version}`;
      await Bun.write(`${cachePath}.tgz`, tarballData);

      // Extract
      await this.extractTarball(`${cachePath}.tgz`, cachePath);

      // Find bin path
      const binPath = await this.findBinPath(cachePath, manifest);

      const cached: CachedPackage = {
        name: pkgName,
        version,
        path: cachePath,
        binPath,
        installedAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        size: tarballData.byteLength,
      };

      // Save cache metadata
      await this.saveCacheMetadata(cached);

      console.log(styled(`✅ Cached to ${cachePath}`, 'success'));
      return cached;
    } catch (error) {
      console.error(styled(`❌ Download failed: ${error.message}`, 'error'));
      return null;
    }
  }

  /**
   * Get cached package
   */
  private async getCachedPackage(pkgName: string, version: string): Promise<CachedPackage | null> {
    try {
      const metadataPath = `${this.cacheDir}/.${pkgName}@${version}.json`;
      const metadata = await Bun.file(metadataPath).json();
      
      if (metadata) {
        // Verify still exists
        const exists = await Bun.file(metadata.path).exists();
        if (exists) {
          return metadata as CachedPackage;
        }
      }
      
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Update last used timestamp
   */
  private async updateLastUsed(cached: CachedPackage): Promise<void> {
    cached.lastUsed = new Date().toISOString();
    await this.saveCacheMetadata(cached);
  }

  /**
   * Save cache metadata
   */
  private async saveCacheMetadata(cached: CachedPackage): Promise<void> {
    const metadataPath = `${this.cacheDir}/.${cached.name}@${cached.version}.json`;
    await Bun.write(metadataPath, JSON.stringify(cached, null, 2));
  }

  /**
   * Extract tarball
   */
  private async extractTarball(tarballPath: string, destPath: string): Promise<void> {
    // Ensure cache directory exists
    await Bun.$`mkdir -p ${destPath}`;
    
    // Extract using tar
    await Bun.$`tar -xzf ${tarballPath} -C ${destPath} --strip-components=1`;
    
    // Remove tarball
    await Bun.$`rm ${tarballPath}`;
  }

  /**
   * Find binary path
   */
  private async findBinPath(cachePath: string, manifest: any): Promise<string | undefined> {
    const packageJsonPath = `${cachePath}/package.json`;
    
    try {
      const packageJson = await Bun.file(packageJsonPath).json();
      const bin = packageJson.bin;

      if (typeof bin === 'string') {
        return `${cachePath}/${bin}`;
      }

      if (typeof bin === 'object') {
        // Use first bin entry
        const firstBin = Object.values(bin)[0];
        return `${cachePath}/${firstBin}`;
      }

      // Fallback to common bin directories
      const commonBins = ['bin/cli.js', 'bin/index.js', 'cli.js', 'index.js'];
      for (const bin of commonBins) {
        const binPath = `${cachePath}/${bin}`;
        if (await Bun.file(binPath).exists()) {
          return binPath;
        }
      }

      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Run the package
   */
  private async runPackage(
    cached: CachedPackage, 
    args: string[],
    quiet?: boolean
  ): Promise<{ exitCode: number; output?: string }> {
    if (!cached.binPath) {
      console.error(styled(`❌ No binary found in ${cached.name}`, 'error'));
      return { exitCode: 1 };
    }

    try {
      const proc = Bun.spawn({
        cmd: ['bun', 'run', cached.binPath, ...args],
        stdout: quiet ? 'pipe' : 'inherit',
        stderr: quiet ? 'pipe' : 'inherit',
        cwd: cached.path,
      });

      const exitCode = await proc.exited;
      
      return { exitCode };
    } catch (error) {
      console.error(styled(`❌ Execution failed: ${error.message}`, 'error'));
      return { exitCode: 1 };
    }
  }

  /**
   * Clean old cache entries
   */
  async cleanCache(maxAgeDays: number = 30): Promise<number> {
    try {
      const entries = await Array.fromAsync(
        new Bun.Glob(`${this.cacheDir}/.*.json`).scan()
      );

      let cleaned = 0;
      const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;

      for (const entry of entries) {
        const metadata = await Bun.file(entry).json();
        const lastUsed = new Date(metadata.lastUsed).getTime();
        
        if (Date.now() - lastUsed > maxAge) {
          // Remove cached package
          await Bun.$`rm -rf ${metadata.path}`;
          await Bun.$`rm ${entry}`;
          cleaned++;
        }
      }

      console.log(styled(`🧹 Cleaned ${cleaned} old cache entries`, 'success'));
      return cleaned;
    } catch (error) {
      console.error(styled(`❌ Clean failed: ${error.message}`, 'error'));
      return 0;
    }
  }

  /**
   * List cached packages
   */
  async listCache(): Promise<CachedPackage[]> {
    try {
      const entries = await Array.fromAsync(
        new Bun.Glob(`${this.cacheDir}/.*.json`).scan()
      );

      const packages: CachedPackage[] = [];
      for (const entry of entries) {
        const metadata = await Bun.file(entry).json();
        packages.push(metadata);
      }

      return packages.sort((a, b) => 
        new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
      );
    } catch {
      return [];
    }
  }
}

// CLI interface
if (import.meta.main) {
  const bunx = new BunXIntegration();
  const args = process.argv.slice(2);
  const command = args[0];

  console.log(styled('🚀 bun x Registry Integration', 'accent'));
  console.log(styled('=============================', 'accent'));

  switch (command) {
    case 'run': {
      const pkgSpec = args[1];
      if (!pkgSpec) {
        console.error(styled('Usage: bunx run <package>[@version] [args...]', 'error'));
        process.exit(1);
      }

      const [pkgName, version] = pkgSpec.split('@');
      const pkgArgs = args.slice(2);

      const result = await bunx.execute({
        package: pkgName,
        version,
        args: pkgArgs,
      });

      process.exit(result.exitCode);
    }

    case 'resolve': {
      const pkgSpec = args[1];
      const range = args[2];
      
      if (!pkgSpec) {
        console.error(styled('Usage: bunx resolve <package> [range]', 'error'));
        process.exit(1);
      }

      const versions = await bunx.getPackageVersions(pkgSpec);
      console.log(styled(`\n📦 ${pkgSpec} versions:`, 'info'));
      versions.slice(0, 10).forEach(v => console.log(styled(`  • ${v}`, 'muted')));

      if (range) {
        const resolved = await bunx.resolveVersion(pkgSpec, range);
        console.log(styled(`\n✅ Resolved ${range} → ${resolved}`, 'success'));
      }
      break;
    }

    case 'cache': {
      const packages = await bunx.listCache();
      console.log(styled(`\n📦 Cached Packages (${packages.length}):`, 'info'));
      
      for (const pkg of packages) {
        const size = (pkg.size / 1024 / 1024).toFixed(2);
        const lastUsed = new Date(pkg.lastUsed).toLocaleDateString();
        console.log(styled(`  • ${pkg.name}@${pkg.version} (${size} MB) - Last used: ${lastUsed}`, 'muted'));
      }
      break;
    }

    case 'clean': {
      const days = parseInt(args[1] || '30');
      const cleaned = await bunx.cleanCache(days);
      console.log(styled(`\n✅ Cleaned ${cleaned} packages older than ${days} days`, 'success'));
      break;
    }

    default:
      console.log(styled('\nCommands:', 'info'));
      console.log(styled('  run <pkg>[@v] [args]  Execute a package', 'muted'));
      console.log(styled('  resolve <pkg> [range] Resolve version', 'muted'));
      console.log(styled('  cache                 List cached packages', 'muted'));
      console.log(styled('  clean [days]          Clean old cache', 'muted'));
  }
}
