/**
 * @fire22/security-scanner/types - TypeScript definitions
 *
 * Complete type system for Bun Security Scanner API compliance
 */

// !== Bun Security Scanner API Types !==

export interface ScanRequest {
  packages: Array<{
    name: string;
    version: string;
    registry?: string;
  }>;
  context?: {
    installType?: 'install' | 'add' | 'update';
    production?: boolean;
    environment?: string;
  };
}

export interface ScanResult {
  advisories: SecurityAdvisory[];
  metadata?: {
    scannerName: string;
    scannerVersion: string;
    scanTime: number;
    threatFeedVersion?: string;
    packagesScanned: number;
  };
}

export interface SecurityAdvisory {
  level: 'fatal' | 'warn';
  package: string;
  version: string;
  title: string;
  description: string;
  recommendation: string;
  url?: string | null;
  cve?: string | null;
  metadata?: Record<string, any>;
}

// !== Threat Feed Types !==

export interface ThreatFeedItem {
  package: string;
  version: string;
  url: string | null;
  description: string | null;
  categories: ThreatCategory[];
  severity: 'fatal' | 'warn';
  cve?: string | null;
  publishedAt?: string;
  lastModified?: string;
}

export type ThreatCategory =
  | 'backdoor'
  | 'botnet'
  | 'malware'
  | 'token-stealer'
  | 'crypto-miner'
  | 'protestware'
  | 'adware'
  | 'deprecated'
  | 'typosquatting'
  | 'suspicious';

export interface ThreatFeed {
  version: string;
  lastUpdated: string;
  items: ThreatFeedItem[];
}

// !== Fire22 Specific Types !==

export interface Fire22SecurityPolicy {
  name: string;
  pattern: RegExp;
  level: 'fatal' | 'warn';
  category: ThreatCategory;
  description: string;
  excludePatterns?: string[];
  enabled?: boolean;
}

export interface Fire22ScanContext {
  workspace: string;
  environment: 'development' | 'staging' | 'production' | 'test';
  strictMode: boolean;
  allowedRegistries: string[];
  trustedScopes: string[];
}

// !== Vulnerability Database Types !==

export interface VulnerabilityRecord {
  package: string;
  versionRange: string;
  cve: string;
  level: 'fatal' | 'warn';
  description: string;
  publishedAt: string;
  lastModified?: string;
  cvssScore?: number;
  references?: string[];
}

export interface VulnerabilityDatabase {
  version: string;
  lastUpdated: string;
  vulnerabilities: VulnerabilityRecord[];
}

// !== Scanner Configuration Types !==

export interface ScannerConfig {
  threatFeed: {
    enabled: boolean;
    url: string;
    updateInterval: number;
    timeout: number;
  };
  policies: {
    fire22Workspace: boolean;
    customPolicies: Fire22SecurityPolicy[];
  };
  vulnerabilityDb: {
    enabled: boolean;
    sources: string[];
  };
  typosquatDetection: {
    enabled: boolean;
    popularPackages: string[];
    threshold: number;
  };
  caching: {
    enabled: boolean;
    ttl: number;
  };
}

// !== Analytics and Reporting Types !==

export interface ScanStatistics {
  totalScans: number;
  packagesScanned: number;
  threatsDetected: number;
  fatalThreats: number;
  warnings: number;
  averageScanTime: number;
  lastScanTime: number;
}

export interface ScanReport {
  scanId: string;
  timestamp: string;
  request: ScanRequest;
  result: ScanResult;
  statistics: ScanStatistics;
  performance: {
    scanTime: number;
    threatFeedUpdateTime?: number;
    memoryUsage: number;
  };
}

// !== Error Types !==

export class ScannerError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly fatal: boolean = false,
    public readonly metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'ScannerError';
  }
}

export class ThreatFeedError extends ScannerError {
  constructor(message: string, metadata?: Record<string, any>) {
    super(message, 'THREAT_FEED_ERROR', true, metadata);
    this.name = 'ThreatFeedError';
  }
}

export class ValidationError extends ScannerError {
  constructor(message: string, field: string, metadata?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', true, { field, ...metadata });
    this.name = 'ValidationError';
  }
}

// !== Integration Types !==

export interface Fire22Integration {
  workspaceConfig: Fire22ScanContext;
  securityPolicies: Fire22SecurityPolicy[];
  trustedPackages: string[];
  registryConfig: {
    primary: string;
    scoped: Record<string, string>;
  };
}

// !== Test Types !==

export interface MockThreatFeedItem extends ThreatFeedItem {
  testOnly?: boolean;
  mockMetadata?: Record<string, any>;
}

export interface TestScanRequest extends ScanRequest {
  testMode?: boolean;
  expectedAdvisories?: number;
  expectedLevel?: 'fatal' | 'warn';
}

export interface TestScanResult extends ScanResult {
  testMetadata?: {
    testPassed: boolean;
    expectedVsActual: {
      expected: number;
      actual: number;
    };
  };
}
