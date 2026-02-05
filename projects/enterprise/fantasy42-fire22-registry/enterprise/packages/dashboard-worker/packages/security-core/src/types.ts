/**
 * @fire22/security-core/types - Security type definitions
 *
 * Comprehensive type system for Fire22 security features
 */

import { z } from 'zod';
import type { Fire22Config } from '@fire22/core';

// !== Credential Management Types !==

export interface CredentialConfig {
  service: string;
  name: string;
  value: string;
  description?: string;
  environment?: string;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface CredentialRetrievalOptions {
  service: string;
  name: string;
  environment?: string;
  fallback?: string;
}

export interface CredentialValidationRule {
  pattern: RegExp;
  message: string;
  required: boolean;
}

// !== Security Scanner Types !==

export type SecuritySeverity = 'fatal' | 'warn';
export type SecurityIssueType = 'vulnerability' | 'malicious' | 'license' | 'policy';

export interface SecurityIssue {
  package: string;
  version: string;
  severity: SecuritySeverity;
  type: SecurityIssueType;
  cve?: string;
  description: string;
  recommendation: string;
  metadata?: {
    cvssScore?: number;
    publishedDate?: string;
    lastModified?: string;
    references?: string[];
  };
}

export interface ScanResult {
  passed: boolean;
  issues: SecurityIssue[];
  scanTime: number;
  packagesScanned: number;
  summary: {
    fatal: number;
    warn: number;
    clean: number;
  };
}

export interface SecurityPolicy {
  name: string;
  pattern: RegExp;
  severity: SecuritySeverity;
  description: string;
  exception?: string[];
  enabled: boolean;
}

// !== Environment Management Types !==

export interface EnvironmentCredential {
  name: string;
  description: string;
  required: boolean;
  sensitive: boolean;
  defaultValue?: string;
  validation?: RegExp;
  environments: string[];
}

export interface EnvironmentAuditResult {
  environment: string;
  timestamp: Date;
  issues: Array<{
    type: 'error' | 'warning' | 'info';
    credential: string;
    message: string;
    fix?: string;
  }>;
  summary: {
    total: number;
    errors: number;
    warnings: number;
    secure: number;
  };
}

// !== Configuration Schemas !==

export const SecurityConfigSchema = z.object({
  service: z.string().default('fire22-dashboard'),
  environments: z.array(z.string()).default(['development', 'staging', 'production']),
  scanner: z
    .object({
      enabled: z.boolean().default(true),
      policies: z
        .array(
          z.object({
            name: z.string(),
            pattern: z.string(),
            severity: z.enum(['fatal', 'warn']),
            description: z.string(),
            enabled: z.boolean().default(true),
          })
        )
        .optional(),
      excludePackages: z.array(z.string()).optional(),
    })
    .optional(),
  credentials: z
    .object({
      validation: z.boolean().default(true),
      rotation: z
        .object({
          enabled: z.boolean().default(false),
          interval: z.string().default('30d'),
        })
        .optional(),
    })
    .optional(),
  audit: z
    .object({
      enabled: z.boolean().default(true),
      schedule: z.string().optional(),
      reportPath: z.string().optional(),
    })
    .optional(),
});

export type SecurityConfig = z.infer<typeof SecurityConfigSchema>;

// !== Error Types !==

export class SecurityError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly severity: SecuritySeverity = 'warn',
    public readonly metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'SecurityError';
  }
}

export class CredentialError extends SecurityError {
  constructor(message: string, credentialName: string, metadata?: Record<string, unknown>) {
    super(message, 'CREDENTIAL_ERROR', 'fatal', { credentialName, ...metadata });
    this.name = 'CredentialError';
  }
}

export class ScannerError extends SecurityError {
  constructor(message: string, packageName?: string, metadata?: Record<string, unknown>) {
    super(message, 'SCANNER_ERROR', 'warn', { packageName, ...metadata });
    this.name = 'ScannerError';
  }
}

// !== Integration Types !==

export interface Fire22SecurityIntegration {
  core: Fire22Config;
  security: SecurityConfig;
  initialized: boolean;
  version: string;
}

export interface SecurityAuditResult {
  timestamp: Date;
  environment: string;
  credentialAudit: EnvironmentAuditResult;
  dependencyAudit: ScanResult;
  overallStatus: 'secure' | 'warnings' | 'critical';
  recommendations: string[];
  nextAuditDue?: Date;
}

// !== CLI Types !==

export interface CLICommand {
  name: string;
  description: string;
  options?: Array<{
    name: string;
    description: string;
    required?: boolean;
    type: 'string' | 'boolean' | 'number';
  }>;
  action: (args: Record<string, any>) => Promise<void>;
}

export interface CLIContext {
  config: SecurityConfig;
  verbose: boolean;
  dryRun: boolean;
  environment: string;
}

// !== Workspace Integration Types !==

export interface WorkspaceSecurityConfig {
  workspaces: Record<
    string,
    {
      securityLevel: 'strict' | 'standard' | 'permissive';
      customPolicies?: SecurityPolicy[];
      credentialScope: 'workspace' | 'shared';
    }
  >;
  sharedCredentials: string[];
  centralizedAudit: boolean;
}

// !== Performance Types !==

export interface SecurityPerformanceMetrics {
  credentialRetrievalTime: number;
  scanTime: number;
  auditTime: number;
  cacheHitRate: number;
  memoryUsage: number;
}

export interface SecurityBenchmark {
  operation: string;
  iterations: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  standardDeviation: number;
}

// !== Export all types !==
export type { Fire22Config, DatabaseConfig, ApiConfig } from '@fire22/core';
