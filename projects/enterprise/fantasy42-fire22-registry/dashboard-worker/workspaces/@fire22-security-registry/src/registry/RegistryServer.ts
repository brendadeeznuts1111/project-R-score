/**
 * Fire22 Registry Server Implementation
 *
 * Secure npm-compatible registry with integrated security scanning
 */

import type { RegistryConfig, SecurityReport } from '../index';

export interface RegistryPackage {
  name: string;
  version: string;
  description?: string;
  main?: string;
  types?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  keywords?: string[];
  author?: string;
  license?: string;
  publishedAt: string;
  publishedBy: string;
  downloads: number;
  security: {
    scannedAt: string;
    score: number;
    vulnerabilities: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  };
  integrity: {
    sha256: string;
    sha512: string;
  };
}

export interface RegistryStats {
  totalPackages: number;
  totalVersions: number;
  totalDownloads: number;
  securityStats: {
    scannedPackages: number;
    avgSecurityScore: number;
    vulnerablePackages: number;
  };
  recentPublishes: RegistryPackage[];
}

export class Fire22RegistryServer {
  private config: RegistryConfig;
  private packages = new Map<string, Map<string, RegistryPackage>>();
  private securityScanner?: any;

  constructor(config: RegistryConfig) {
    this.config = config;
  }

  /**
   * Initialize registry server
   */
  async initialize(): Promise<void> {
    try {
      // Initialize security scanner if enabled
      if (this.config.security.scanning) {
        const { SecurityScanner } = await import('../scanner/SecurityScanner');
        this.securityScanner = new SecurityScanner({
          strict: this.config.security.strict,
        });
        console.log('🔍 Security scanner initialized');
      }

      // Load existing packages from storage
      await this.loadPackages();

      console.log(`🚀 Fire22 Registry Server initialized at ${this.config.url}`);
    } catch (error) {
      throw new Error(`Registry initialization failed: ${error.message}`);
    }
  }

  /**
   * Publish a package to the registry
   */
  async publishPackage(packageData: any, tarball: ArrayBuffer): Promise<RegistryPackage> {
    try {
      // Validate package metadata
      this.validatePackageMetadata(packageData);

      // Security scan if enabled
      let securityReport: SecurityReport | null = null;
      if (this.config.security.scanning && this.securityScanner) {
        securityReport = await this.scanPackageForSecurity(packageData, tarball);

        // Block publishing if security score is too low
        if (this.config.security.strict && securityReport.score < 50) {
          throw new Error(`Package rejected: Security score too low (${securityReport.score}/100)`);
        }
      }

      // Calculate integrity hashes
      const integrity = await this.calculateIntegrity(tarball);

      // Create package record
      const registryPackage: RegistryPackage = {
        name: packageData.name,
        version: packageData.version,
        description: packageData.description,
        main: packageData.main,
        types: packageData.types,
        dependencies: packageData.dependencies,
        devDependencies: packageData.devDependencies,
        keywords: packageData.keywords,
        author: packageData.author,
        license: packageData.license,
        publishedAt: new Date().toISOString(),
        publishedBy: 'fire22-system', // Would be actual user in production
        downloads: 0,
        security: {
          scannedAt: securityReport?.timestamp || new Date().toISOString(),
          score: securityReport?.score || 100,
          vulnerabilities: securityReport?.vulnerabilities.length || 0,
          riskLevel: securityReport?.riskLevel || 'low',
        },
        integrity,
      };

      // Store package
      await this.storePackage(registryPackage, tarball);

      console.log(`📦 Package published: ${packageData.name}@${packageData.version}`);
      console.log(`🔐 Security score: ${registryPackage.security.score}/100`);

      return registryPackage;
    } catch (error) {
      throw new Error(`Package publishing failed: ${error.message}`);
    }
  }

  /**
   * Get package metadata
   */
  async getPackage(name: string): Promise<{ versions: Record<string, RegistryPackage> } | null> {
    const packageVersions = this.packages.get(name);
    if (!packageVersions) return null;

    const versions: Record<string, RegistryPackage> = {};
    for (const [version, pkg] of packageVersions.entries()) {
      versions[version] = pkg;
    }

    return { versions };
  }

  /**
   * Get specific package version
   */
  async getPackageVersion(name: string, version: string): Promise<RegistryPackage | null> {
    const packageVersions = this.packages.get(name);
    if (!packageVersions) return null;

    return packageVersions.get(version) || null;
  }

  /**
   * Download package tarball
   */
  async downloadPackage(name: string, version: string): Promise<ArrayBuffer | null> {
    const pkg = await this.getPackageVersion(name, version);
    if (!pkg) return null;

    // Increment download counter
    pkg.downloads++;

    // Load tarball from storage
    return this.loadPackageTarball(name, version);
  }

  /**
   * Search packages
   */
  async searchPackages(
    query: string,
    options: {
      limit?: number;
      offset?: number;
      includePrerelease?: boolean;
    } = {}
  ): Promise<RegistryPackage[]> {
    const results: RegistryPackage[] = [];
    const queryLower = query.toLowerCase();

    for (const [name, versions] of this.packages.entries()) {
      // Check if package name or description matches query
      const latestVersion = this.getLatestVersion(versions);
      if (!latestVersion) continue;

      const matches =
        name.toLowerCase().includes(queryLower) ||
        latestVersion.description?.toLowerCase().includes(queryLower) ||
        latestVersion.keywords?.some(k => k.toLowerCase().includes(queryLower));

      if (matches) {
        results.push(latestVersion);
      }
    }

    // Sort by relevance (downloads, security score, etc.)
    results.sort((a, b) => {
      const scoreA = a.downloads * 0.6 + a.security.score * 0.4;
      const scoreB = b.downloads * 0.6 + b.security.score * 0.4;
      return scoreB - scoreA;
    });

    // Apply pagination
    const offset = options.offset || 0;
    const limit = options.limit || 20;

    return results.slice(offset, offset + limit);
  }

  /**
   * Get registry statistics
   */
  async getStats(): Promise<RegistryStats> {
    let totalPackages = 0;
    let totalVersions = 0;
    let totalDownloads = 0;
    let totalSecurityScore = 0;
    let scannedPackages = 0;
    let vulnerablePackages = 0;
    const recentPublishes: RegistryPackage[] = [];

    for (const [name, versions] of this.packages.entries()) {
      totalPackages++;

      for (const [version, pkg] of versions.entries()) {
        totalVersions++;
        totalDownloads += pkg.downloads;

        if (pkg.security.score > 0) {
          totalSecurityScore += pkg.security.score;
          scannedPackages++;
        }

        if (pkg.security.vulnerabilities > 0) {
          vulnerablePackages++;
        }

        recentPublishes.push(pkg);
      }
    }

    // Sort recent publishes by date
    recentPublishes.sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

    return {
      totalPackages,
      totalVersions,
      totalDownloads,
      securityStats: {
        scannedPackages,
        avgSecurityScore:
          scannedPackages > 0 ? Math.round(totalSecurityScore / scannedPackages) : 100,
        vulnerablePackages,
      },
      recentPublishes: recentPublishes.slice(0, 10),
    };
  }

  /**
   * Validate package metadata
   */
  private validatePackageMetadata(packageData: any): void {
    if (!packageData.name || typeof packageData.name !== 'string') {
      throw new Error('Package name is required and must be a string');
    }

    if (!packageData.version || typeof packageData.version !== 'string') {
      throw new Error('Package version is required and must be a string');
    }

    // Check if package name matches allowed scopes
    const isValidScope = this.config.scopes.some(scope => packageData.name.startsWith(scope));

    if (!isValidScope) {
      throw new Error(`Package name must start with one of: ${this.config.scopes.join(', ')}`);
    }

    // Validate version format (semver)
    const semverRegex = /^\d+\.\d+\.\d+(-[\w.-]+)?(\+[\w.-]+)?$/;
    if (!semverRegex.test(packageData.version)) {
      throw new Error('Package version must follow semantic versioning');
    }
  }

  /**
   * Scan package for security vulnerabilities
   */
  private async scanPackageForSecurity(
    packageData: any,
    tarball: ArrayBuffer
  ): Promise<SecurityReport> {
    if (!this.securityScanner) {
      throw new Error('Security scanner not initialized');
    }

    // Create temporary directory for scanning
    const tempDir = `/tmp/fire22-scan-${Date.now()}`;

    try {
      // Extract tarball to temporary directory
      await this.extractTarball(tarball, tempDir);

      // Run security scan
      const report = await this.securityScanner.scan({
        path: tempDir,
        packageName: packageData.name,
        version: packageData.version,
      });

      return report;
    } finally {
      // Clean up temporary directory
      await this.cleanupTempDir(tempDir);
    }
  }

  /**
   * Calculate integrity hashes for tarball
   */
  private async calculateIntegrity(
    tarball: ArrayBuffer
  ): Promise<{ sha256: string; sha512: string }> {
    const sha256 = await crypto.subtle.digest('SHA-256', tarball);
    const sha512 = await crypto.subtle.digest('SHA-512', tarball);

    return {
      sha256: this.arrayBufferToHex(sha256),
      sha512: this.arrayBufferToHex(sha512),
    };
  }

  /**
   * Convert ArrayBuffer to hex string
   */
  private arrayBufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Store package in registry
   */
  private async storePackage(pkg: RegistryPackage, tarball: ArrayBuffer): Promise<void> {
    // Store package metadata
    if (!this.packages.has(pkg.name)) {
      this.packages.set(pkg.name, new Map());
    }

    const versions = this.packages.get(pkg.name)!;
    versions.set(pkg.version, pkg);

    // Store tarball (in production, this would go to object storage)
    await this.storeTarball(pkg.name, pkg.version, tarball);

    // Save registry state
    await this.savePackages();
  }

  /**
   * Get latest version from package versions
   */
  private getLatestVersion(versions: Map<string, RegistryPackage>): RegistryPackage | null {
    const versionArray = Array.from(versions.values());
    if (versionArray.length === 0) return null;

    // Sort versions and return latest
    versionArray.sort((a, b) => {
      const aDate = new Date(a.publishedAt).getTime();
      const bDate = new Date(b.publishedAt).getTime();
      return bDate - aDate;
    });

    return versionArray[0];
  }

  /**
   * Load packages from storage
   */
  private async loadPackages(): Promise<void> {
    // In production, this would load from database or file system
    console.log('📦 Loaded 0 packages from storage');
  }

  /**
   * Save packages to storage
   */
  private async savePackages(): Promise<void> {
    // In production, this would save to database or file system
    console.log('💾 Registry state saved');
  }

  /**
   * Store package tarball
   */
  private async storeTarball(name: string, version: string, tarball: ArrayBuffer): Promise<void> {
    // In production, this would store to object storage (S3, R2, etc.)
    console.log(`📦 Tarball stored: ${name}@${version}`);
  }

  /**
   * Load package tarball
   */
  private async loadPackageTarball(name: string, version: string): Promise<ArrayBuffer> {
    // In production, this would load from object storage
    return new ArrayBuffer(0);
  }

  /**
   * Extract tarball to directory
   */
  private async extractTarball(tarball: ArrayBuffer, targetDir: string): Promise<void> {
    // In production, this would use tar library to extract
    console.log(`📂 Extracted to: ${targetDir}`);
  }

  /**
   * Clean up temporary directory
   */
  private async cleanupTempDir(dir: string): Promise<void> {
    // In production, this would recursively delete directory
    console.log(`🧹 Cleaned up: ${dir}`);
  }
}
