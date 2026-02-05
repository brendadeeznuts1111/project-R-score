// Core type definitions for the Tier-1380 Integrity System

export interface PackOptions {
  dryRun?: boolean;
  output?: string;
  verifySignatures?: boolean;
  sealTier?: number;
  auditTrail?: boolean;
  anomalyDetection?: boolean;
  realtime3D?: boolean;
}

export interface PackResult {
  tarball: Buffer;
  manifest: PackageManifest;
  integritySeal: string;
  auditId: string;
  stats: PackStats;
}

export interface PackStats {
  processingTime: number;
  tarballSize: number;
  compressionRatio: number;
  integrityScore: number;
}

export interface PackageManifest {
  name: string;
  version: string;
  description?: string;
  main?: string;
  exports?: Record<string, string>;
  bin?: string | Record<string, string>;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  files?: string[];
  publishConfig?: Record<string, any>;
  private?: boolean;
}

export interface AuditEntry {
  event: string;
  packageName: string;
  packageVersion: string;
  originalHash: string;
  finalHash: string;
  lifecycleScripts: string[];
  anomalyScore: number;
  processingTime: number;
  integrityScore: number;
  timestamp: bigint;
  seal: Buffer;
}

export interface MatrixEntry {
  term: string;
  minVer: string;
  lifecycleScripts: string[];
  securityProfile: string;
  tarballIntegrity: string;
  integrityScore: number;
  lastVerified: string;
  quantumSeal: boolean;
  mutationGuarded: boolean;
  auditTrail: boolean;
  zeroTrust: boolean;
  performanceArb: string;
  compressionRatio: string;
}

export interface MatrixReport {
  totalEntries: number;
  integrityScores: number[];
  averageScore: number;
  lastUpdated: string;
  violations: IntegrityViolation[];
  performanceMetrics: PerformanceMetrics;
}

export interface IntegrityViolation {
  package: string;
  version: string;
  violation: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
}

export interface PerformanceMetrics {
  avgProcessingTime: number;
  avgTarballSize: number;
  avgCompressionRatio: number;
  totalProcessed: number;
  successRate: number;
}

export interface ManifestDiff {
  path: string[];
  lhs: any;
  rhs: any;
  type: 'added' | 'modified' | 'deleted';
}

export interface ThreatAnalysis {
  anomalyScore: number;
  suspiciousPatterns: string[];
  unauthorizedMutations: ManifestDiff[];
  scriptAnomalies: ScriptAnomaly[];
  dependencyRisks: DependencyRisk[];
}

export interface ScriptAnomaly {
  script: string;
  pattern: string;
  severity: number;
  line?: number;
}

export interface DependencyRisk {
  name: string;
  risk: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
}

export interface QuantumSeal {
  algorithm: string;
  signature: Buffer;
  timestamp: bigint;
  entropy: number;
}

export interface WorkerPoolStats {
  workers: number;
  queueSize: number;
  processed: number;
  errors: number;
  avgLatency: number;
}

// Error classes
export class IntegritySealViolationError extends Error {
  constructor(message: string, public details: any) {
    super(message);
    this.name = 'IntegritySealViolationError';
  }
}

export class UnauthorizedMutationError extends Error {
  constructor(message: string, public details: any) {
    super(message);
    this.name = 'UnauthorizedMutationError';
  }
}

export class PackExecutionError extends Error {
  constructor(message: string, public details: any) {
    super(message);
    this.name = 'PackExecutionError';
  }
}

export class QuantumAuditError extends Error {
  constructor(message: string, public details: any) {
    super(message);
    this.name = 'QuantumAuditError';
  }
}

export class ThreatDetectionError extends Error {
  constructor(message: string, public details: any) {
    super(message);
    this.name = 'ThreatDetectionError';
  }
}
