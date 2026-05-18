/**
 * Type definitions for @fire22/security-audit package
 */

export interface PackageAuditResult {
  name: string;
  version: string;
  path: string;
  issues: SecurityIssue[];
  score: number;
  lastAudit: string;
  nextAuditDue: string;
  benchmarkResults?: BenchmarkResult;
}

export interface AuditSummary {
  totalPackages: number;
  securePackages: number;
  vulnerablePackages: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  compliancePassed: number;
  complianceFailed: number;
  overallScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  executionTime: number;
  timestamp: string;
}

export interface BenchmarkResult {
  performance: number;
  security: number;
  quality: number;
  compliance: number;
  overall: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'F';
}

export interface SecurityIssue {
  code: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  title: string;
  description: string;
  impact: string;
  suggestions: string[];
  remediation: string;
  evidence?: string;
  file?: string;
  line?: number;
  column?: number;
  cwe?: string;
  owasp?: string;
  references?: string[];
  detectedAt: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface Vulnerability {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  cve?: string;
  remediation: string;
  affectedVersions?: string[];
  published?: string;
  cvss?: number;
  cwe?: string;
  references?: string[];
}

export interface AuditOptions {
  packages?: string[];
  verbose?: boolean;
  report?: boolean;
  fix?: boolean;
  deepScan?: boolean;
  compliance?: string[];
  benchmark?: boolean;
  outputFormat?: 'json' | 'html' | 'markdown';
  failFast?: boolean;
  severity?: SecurityIssue['severity'];
  categories?: string[];
}

export interface AuditReport {
  summary: AuditSummary;
  packages: PackageAuditResult[];
  recommendations: string[];
  timeline: AuditTimeline[];
  metadata: AuditMetadata;
}

export interface AuditTimeline {
  timestamp: string;
  action: string;
  details: string;
  duration?: number;
}

export interface AuditMetadata {
  auditor: string;
  version: string;
  environment: string;
  duration: number;
  packagesScanned: number;
  filesAnalyzed: number;
  rulesApplied: number;
}

// CLI-specific types
export interface CLIOptions {
  packages?: string[];
  verbose?: boolean;
  report?: boolean;
  fix?: boolean;
  deepScan?: boolean;
  compliance?: string[];
  benchmark?: boolean;
  output?: string;
  format?: 'json' | 'html' | 'markdown';
  failFast?: boolean;
  severity?: string;
  categories?: string[];
  help?: boolean;
  version?: boolean;
}

export interface CLIResult {
  success: boolean;
  exitCode: number;
  message: string;
  report?: AuditReport;
  error?: string;
}
