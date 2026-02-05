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
export declare class Fire22Registry {
  private config;
  constructor(config?: Partial<RegistryConfig>);
  /**
   * Publish package to Fire22 registry with security scanning
   */
  publish(): Promise<PublishResult>;
  /**
   * Install package with security validation
   */
  install(packageName: string): Promise<InstallResult>;
  /**
   * Search packages in Fire22 registry
   */
  search(
    query: string,
    options?: {
      limit?: number;
      includePrerelease?: boolean;
    }
  ): Promise<any[]>;
  /**
   * Get package information
   */
  info(packageName: string): Promise<any>;
  /**
   * Read package.json from current directory
   */
  private readPackageJson;
  /**
   * Scan package for security vulnerabilities
   */
  private scanPackage;
  /**
   * Prepare package for publishing
   */
  private preparePackage;
  /**
   * Collect files to include in package
   */
  private collectPackageFiles;
  /**
   * Upload package to registry
   */
  private uploadPackage;
  /**
   * Fetch package metadata from registry
   */
  private fetchPackageMetadata;
  /**
   * Validate package security
   */
  private validatePackageSecurity;
  /**
   * Download package from registry
   */
  private downloadPackage;
  /**
   * Get authentication headers
   */
  private getAuthHeaders;
}
//# sourceMappingURL=Fire22Registry.d.ts.map
