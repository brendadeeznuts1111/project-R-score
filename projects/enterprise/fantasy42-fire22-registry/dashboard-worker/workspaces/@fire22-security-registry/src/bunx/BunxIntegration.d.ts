/**
 * Bunx Integration for Fire22 Security Registry
 *
 * Seamless integration with bun's package execution system
 */
import type { BunxConfig } from '../index';
export interface BunxSecurityReport {
  totalPackages: number;
  vulnerablePackages: number;
  overallScore: number;
  recommendations: string[];
  packages: {
    name: string;
    version: string;
    vulnerabilities: number;
    score: number;
  }[];
}
export declare class BunxIntegration {
  private config;
  constructor(config?: Partial<BunxConfig>);
  /**
   * Setup bunx integration with Fire22 security
   */
  setup(): Promise<void>;
  /**
   * Execute package with security validation
   */
  execute(
    packageName: string,
    args?: string[],
    options?: {
      validate?: boolean;
    }
  ): Promise<void>;
  /**
   * Install package globally with security scanning
   */
  installGlobal(
    packageName: string,
    options?: {
      force?: boolean;
    }
  ): Promise<void>;
  /**
   * Scan global packages for vulnerabilities
   */
  scanGlobalPackages(): Promise<BunxSecurityReport>;
  /**
   * Update all global packages
   */
  updateGlobalPackages(options?: { dryRun?: boolean }): Promise<void>;
  /**
   * Remove global package
   */
  removeGlobal(packageName: string): Promise<void>;
  /**
   * Configure bun registry settings
   */
  private configureBunRegistry;
  /**
   * Setup security hooks for bunx execution
   */
  private setupSecurityHooks;
  /**
   * Install configured global packages
   */
  private installGlobalPackages;
  /**
   * Check if package is globally installed
   */
  private isGloballyInstalled;
  /**
   * Get list of globally installed packages
   */
  private getGlobalPackages;
  /**
   * Validate package security before execution
   */
  private validatePackageSecurity;
  /**
   * Scan individual package for vulnerabilities
   */
  private scanPackage;
  /**
   * Calculate overall security score
   */
  private calculateOverallScore;
  /**
   * Generate security recommendations
   */
  private generateRecommendations;
  /**
   * Save configuration to disk
   */
  private saveConfig;
}
//# sourceMappingURL=BunxIntegration.d.ts.map
