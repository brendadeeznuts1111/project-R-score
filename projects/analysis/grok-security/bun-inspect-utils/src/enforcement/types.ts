/**
 * [SECURITY][MODULE][TYPES][META:{VERSION:1.0.0}][#REF:table,enforcement]{BUN-NATIVE}
 * Type definitions for table enforcement system
 */

/**
 * Configuration for table column enforcement
 */
export interface TableEnforcementConfig {
  /** Minimum number of meaningful columns required (default: 6) */
  minMeaningfulColumns: number;
  /** Generic column names to exclude from count */
  genericColumns: string[];
  /** Enable validation warnings */
  enableWarnings: boolean;
  /** Throw errors in test environments */
  throwInTest: boolean;
  /** Enable intelligent column suggestions */
  enableSuggestions: boolean;
  /** Sensitive column patterns to exclude */
  sensitivePatterns: string[];
}

/**
 * Result of table column validation
 */
export interface TableValidationResult {
  /** Whether validation passed */
  isValid: boolean;
  /** Number of meaningful columns found */
  meaningfulColumns: number;
  /** Columns that are considered generic */
  genericColumns: string[];
  /** Suggested additional columns */
  suggestions: string[];
  /** Validation message */
  message: string;
  /** Severity level */
  severity: "error" | "warning" | "info";
}

/**
 * Analysis of table data structure
 */
export interface TableDataAnalysis {
  /** Total number of columns */
  totalColumns: number;
  /** Column names */
  columnNames: string[];
  /** Data types for each column */
  columnTypes: Record<string, string>;
  /** Cardinality (unique values) for each column */
  cardinality: Record<string, number>;
  /** Columns with high cardinality (good for display) */
  highCardinalityColumns: string[];
  /** Columns with low cardinality (generic) */
  lowCardinalityColumns: string[];
  /** Estimated data richness score (0-100) */
  dataRichnessScore: number;
}

/**
 * Suggestion for improving table columns
 */
export interface ColumnSuggestion {
  /** Suggested column name */
  column: string;
  /** Reason for suggestion */
  reason: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Example values from data */
  examples: unknown[];
}

/**
 * Enforcement violation details
 */
export interface EnforcementViolation {
  /** Violation type */
  type: "insufficient-columns" | "generic-only" | "missing-properties";
  /** Severity level */
  severity: "error" | "warning";
  /** Detailed message */
  message: string;
  /** Current column count */
  currentCount: number;
  /** Required column count */
  requiredCount: number;
  /** Suggested fixes */
  suggestions: ColumnSuggestion[];
  /** Location in code (if available) */
  location?: {
    file: string;
    line: number;
    column: number;
  };
}

/**
 * Compliance metrics for team tracking
 */
export interface ComplianceMetrics {
  /** Total table calls analyzed */
  totalTableCalls: number;
  /** Compliant table calls */
  compliantCalls: number;
  /** Non-compliant table calls */
  nonCompliantCalls: number;
  /** Compliance percentage */
  complianceRate: number;
  /** Most common violations */
  commonViolations: string[];
  /** Timestamp of last update */
  lastUpdated: Date;
}

/**
 * Security assessment for domain-specific tables
 */
export interface SecurityAssessment {
  /** Whether validation passed */
  isValid: boolean;
  /** Whether encryption is required */
  requiresEncryption: boolean;
  /** Required access level */
  accessLevel: string;
  /** Whether audit is required */
  auditRequired: boolean;
  /** Data classification level */
  dataClassification?: string;
  /** Data retention period */
  dataRetention?: string;
  /** Anonymization level */
  anonymizationLevel?: string;
  /** Regulatory requirements */
  regulations?: string[];
  /** Compliance violations */
  violations?: string[];
  /** Next audit date */
  nextAuditDate?: Date;
  /** Dual control requirement */
  dualControl?: boolean;
  /** PCI compliance status */
  pciCompliance?: boolean;
}

/**
 * Options for table enforcement validation
 * (Distinct from core TableOptions in src/types.ts which is for Bun.inspect.table rendering)
 */
export interface EnforcementTableOptions {
  /** Column properties to display */
  properties?: string[];
  /** Enable verbose output */
  verbose?: boolean;
  /** Domain-specific options */
  domain?: string;
  /** Custom validation rules */
  customRules?: Record<string, unknown>;
}

/**
 * @deprecated Use EnforcementTableOptions instead - kept for backward compatibility
 */
export type TableOptions = EnforcementTableOptions;

/**
 * Result of domain-specific validation
 */
export interface ValidationResult {
  /** Whether validation passed */
  isValid: boolean;
  /** Compliance status */
  compliance: SecurityAssessment;
  /** Suggested columns */
  suggestions: string[];
  /** Security assessment */
  securityAssessment?: SecurityAssessment;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}
