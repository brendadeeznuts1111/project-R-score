/**
 * Fire22 Security Scanner
 *
 * Comprehensive security vulnerability scanning for packages and projects
 */
import type { SecurityReport, Vulnerability } from '../index';
export interface SecurityScannerConfig {
  strict?: boolean;
  path?: string;
  auditLevel?: 'low' | 'medium' | 'high' | 'critical';
  includeDevDependencies?: boolean;
  timeout?: number;
}
export interface AuditResult {
  packagesScanned: number;
  issuesFound: number;
  fixed: number;
  vulnerabilities: Vulnerability[];
  recommendations: string[];
}
export declare class SecurityScanner {
  private config;
  constructor(config?: SecurityScannerConfig);
  /**
   * Perform comprehensive security scan
   */
  scan(): Promise<SecurityReport>;
  /**
   * Audit dependencies for vulnerabilities
   */
  audit(options?: { autoFix?: boolean; level?: string }): Promise<AuditResult>;
  /**
   * Read and validate package.json
   */
  private readPackageJson;
  /**
   * Scan dependencies for known vulnerabilities
   */
  private scanDependencies;
  /**
   * Check specific package for vulnerabilities
   */
  private checkPackageVulnerabilities;
  /**
   * Scan source code for security patterns
   */
  private scanCode;
  /**
   * Find source files to scan
   */
  private findSourceFiles;
  /**
   * Analyze code content for security issues
   */
  private analyzeCodeSecurity;
  /**
   * Calculate risk level and security score
   */
  private calculateRisk;
  /**
   * Generate security recommendations
   */
  private generateRecommendations;
  /**
   * Generate audit-specific recommendations
   */
  private generateAuditRecommendations;
}
//# sourceMappingURL=SecurityScanner.d.ts.map
