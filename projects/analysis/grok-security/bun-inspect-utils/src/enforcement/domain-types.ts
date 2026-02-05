/**
 * Domain-specific types for table enforcement
 */

import type { EnforcementTableOptions, ValidationResult } from "./types";

/**
 * Generic domain context - unified for all domains
 * Domain-specific fields use the metadata property
 */
export interface DomainContext {
  type: string;
  recordCount: number;
  sensitivity: "low" | "medium" | "high" | "critical";
  compliance: string[];
  domain: string;
  color: string;
  metadata?: Record<string, unknown>;
}

// Legacy type aliases for backward compatibility
export type MedicalContext = DomainContext;
export type FinancialContext = DomainContext & { auditLevel?: string };
export type EcommerceContext = DomainContext & {
  performanceMetrics?: Record<string, number>;
};

/**
 * Domain performance metrics
 */
export interface DomainMetrics {
  domain: string;
  complianceRate: number;
  averageColumns: number;
  securityScore: number;
  performance: {
    validationTime: number;
    suggestionAccuracy: number;
  };
  color: string;
}

/**
 * Domain-specific validation result
 */
export interface DomainSpecificResult {
  domain: string;
  validation: ValidationResult;
  enhancedOptions: EnforcementTableOptions;
  colorScheme: string;
  context: DomainContext;
}

/**
 * Domain factory options
 */
export interface DomainFactoryOptions {
  autoDetect?: boolean;
  defaultDomain?: string;
  strictMode?: boolean;
  performanceTracking?: boolean;
}

/**
 * Domain configuration interface
 */
export interface IDomainEnforcement {
  validate(data: any[], options: EnforcementTableOptions): ValidationResult;
  getDomainName(): string;
  getColorScheme(): string;
  getRequiredColumns(): string[];
}
