/**
 * @fire22/security-registry
 *
 * Enterprise-grade security registry with comprehensive scanning and bunx integration
 */
export { SecurityScanner } from './scanner/SecurityScanner';
export { VulnerabilityScanner } from './scanner/VulnerabilityScanner';
export { DependencyScanner } from './scanner/DependencyScanner';
export { Fire22Registry } from './registry/Fire22Registry';
export { RegistryClient } from './registry/RegistryClient';
export { PackageManager } from './registry/PackageManager';
export { BunxIntegration } from './bunx/BunxIntegration';
export { BunxScanner } from './bunx/BunxScanner';
export { BunxRegistry } from './bunx/BunxRegistry';
export { CLI } from './cli/CLI';
export { SecurityCLI } from './cli/SecurityCLI';
export interface SecurityReport {
  timestamp: string;
  packageName: string;
  version: string;
  vulnerabilities: Vulnerability[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  recommendations: string[];
}
export interface Vulnerability {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cve?: string;
  cwe?: string;
  cvss?: number;
  affectedVersions: string[];
  patchedVersions: string[];
  references: string[];
}
export interface RegistryConfig {
  url: string;
  token?: string;
  scopes: string[];
  security: {
    scanning: boolean;
    audit: boolean;
    strict: boolean;
  };
}
export interface BunxConfig {
  enabled: boolean;
  globalPackages: string[];
  securityChecks: boolean;
  autoUpdate: boolean;
  registry: RegistryConfig;
}
export * from './schemas/security.schema';
export * from './schemas/registry.schema';
export * from './schemas/bunx.schema';
export * from './utils/crypto';
export * from './utils/validation';
export * from './utils/logger';
//# sourceMappingURL=index.d.ts.map
