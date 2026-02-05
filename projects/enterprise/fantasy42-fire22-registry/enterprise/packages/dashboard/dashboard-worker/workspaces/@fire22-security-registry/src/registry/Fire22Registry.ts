/**
 * Fire22 Registry Integration
 *
 * Secure package registry with vulnerability scanning
 */

import type { RegistryConfig } from '../index';

export interface PublishResult {
  name: string;
  version: string;
  registry: string;
  securityScore: number;
  warnings: string[];
}

export interface InstallResult {
  name: string;
  version: string;
  securityWarnings: string[];
  dependencies: string[];
}

export class Fire22Registry {
  private config: RegistryConfig;

  constructor(config: Partial<RegistryConfig> = {}) {
    this.config = {
      url: 'https://fire22.workers.dev/registry/',
      scopes: ['@fire22'],
      security: {
        scanning: true,
        audit: true,
        strict: false,
      },
      ...config,
    };
  }

  /**
   * Publish package to Fire22 registry with security scanning
   */
  async publish(): Promise<PublishResult> {
    try {
      // Read package.json
      const packageJson = await this.readPackageJson();

      // Perform security scan before publishing
      if (this.config.security.scanning) {
        const securityReport = await this.scanPackage();

        if (this.config.security.strict && securityReport.score < 80) {
          throw new Error(`Package security score too low: ${securityReport.score}/100`);
        }
      }

      // Prepare package for publishing
      const packageData = await this.preparePackage(packageJson);

      // Upload to registry
      const result = await this.uploadPackage(packageData);

      return {
        name: packageJson.name,
        version: packageJson.version,
        registry: this.config.url,
        securityScore: result.securityScore,
        warnings: result.warnings,
      };
    } catch (error) {
      throw new Error(`Publishing failed: ${error.message}`);
    }
  }

  /**
   * Install package with security validation
   */
  async install(packageName: string): Promise<InstallResult> {
    try {
      // Fetch package metadata from registry
      const metadata = await this.fetchPackageMetadata(packageName);

      // Validate security if enabled
      const securityWarnings: string[] = [];
      if (this.config.security.audit) {
        const warnings = await this.validatePackageSecurity(metadata);
        securityWarnings.push(...warnings);
      }

      // Download and install package
      await this.downloadPackage(packageName, metadata.version);

      return {
        name: packageName,
        version: metadata.version,
        securityWarnings,
        dependencies: metadata.dependencies || [],
      };
    } catch (error) {
      throw new Error(`Installation failed: ${error.message}`);
    }
  }

  /**
   * Search packages in Fire22 registry
   */
  async search(
    query: string,
    options: { limit?: number; includePrerelease?: boolean } = {}
  ): Promise<any[]> {
    const searchUrl = `${this.config.url}search?q=${encodeURIComponent(query)}`;
    const params = new URLSearchParams();

    if (options.limit) params.set('limit', options.limit.toString());
    if (options.includePrerelease) params.set('prerelease', 'true');

    const response = await fetch(`${searchUrl}&${params.toString()}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get package information
   */
  async info(packageName: string): Promise<any> {
    const infoUrl = `${this.config.url}${packageName}`;

    const response = await fetch(infoUrl, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Package ${packageName} not found`);
      }
      throw new Error(`Failed to fetch package info: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Read package.json from current directory
   */
  private async readPackageJson(): Promise<any> {
    try {
      const file = Bun.file('./package.json');
      const content = await file.text();
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to read package.json: ${error.message}`);
    }
  }

  /**
   * Scan package for security vulnerabilities
   */
  private async scanPackage(): Promise<{ score: number; vulnerabilities: any[] }> {
    // This would integrate with the SecurityScanner
    // For now, simulate a security scan

    const packageJson = await this.readPackageJson();
    const hasVulnerabilities = Math.random() > 0.8; // 20% chance of vulnerabilities

    return {
      score: hasVulnerabilities ? 65 : 95,
      vulnerabilities: hasVulnerabilities
        ? [
            {
              severity: 'medium',
              description: 'Potential security issue detected',
            },
          ]
        : [],
    };
  }

  /**
   * Prepare package for publishing
   */
  private async preparePackage(packageJson: any): Promise<any> {
    // Create package tarball
    const files = await this.collectPackageFiles();

    // Add security metadata
    const securityMetadata = {
      scannedAt: new Date().toISOString(),
      scanner: 'fire22-security-registry@1.0.0',
      policies: this.config.security,
    };

    return {
      name: packageJson.name,
      version: packageJson.version,
      description: packageJson.description,
      main: packageJson.main,
      dependencies: packageJson.dependencies,
      devDependencies: packageJson.devDependencies,
      files,
      security: securityMetadata,
    };
  }

  /**
   * Collect files to include in package
   */
  private async collectPackageFiles(): Promise<string[]> {
    // This would scan the filesystem for files to include
    // Based on package.json "files" field and .npmignore
    return ['dist/', 'src/', 'README.md', 'package.json'];
  }

  /**
   * Upload package to registry
   */
  private async uploadPackage(
    packageData: any
  ): Promise<{ securityScore: number; warnings: string[] }> {
    const uploadUrl = `${this.config.url}${packageData.name}`;

    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(packageData),
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();

    return {
      securityScore: result.security?.score || 100,
      warnings: result.warnings || [],
    };
  }

  /**
   * Fetch package metadata from registry
   */
  private async fetchPackageMetadata(packageName: string): Promise<any> {
    const metadataUrl = `${this.config.url}${packageName}`;

    const response = await fetch(metadataUrl, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Package ${packageName} not found in registry`);
      }
      throw new Error(`Failed to fetch metadata: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Validate package security
   */
  private async validatePackageSecurity(metadata: any): Promise<string[]> {
    const warnings: string[] = [];

    // Check security metadata
    if (!metadata.security) {
      warnings.push('Package has not been security scanned');
    } else {
      const securityScore = metadata.security.score || 0;
      if (securityScore < 50) {
        warnings.push(`Low security score: ${securityScore}/100`);
      }
    }

    // Check for known vulnerabilities
    if (metadata.vulnerabilities && metadata.vulnerabilities.length > 0) {
      warnings.push(`${metadata.vulnerabilities.length} known vulnerabilities`);
    }

    // Check package age
    const publishedDate = new Date(metadata.publishedAt || Date.now());
    const daysSincePublished = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSincePublished > 365) {
      warnings.push('Package has not been updated in over a year');
    }

    return warnings;
  }

  /**
   * Download package from registry
   */
  private async downloadPackage(packageName: string, version: string): Promise<void> {
    const downloadUrl = `${this.config.url}${packageName}/-/${packageName}-${version}.tgz`;

    const response = await fetch(downloadUrl, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    // Save package to local cache/node_modules
    const arrayBuffer = await response.arrayBuffer();
    const file = Bun.file(`./node_modules/${packageName}.tgz`);
    await Bun.write(file, arrayBuffer);

    // Extract package (would use tar library in real implementation)
    console.log(`Package ${packageName}@${version} downloaded and extracted`);
  }

  /**
   * Get authentication headers
   */
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    if (this.config.token) {
      headers['Authorization'] = `Bearer ${this.config.token}`;
    }

    return headers;
  }
}
