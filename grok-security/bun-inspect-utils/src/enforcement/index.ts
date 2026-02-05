/**
 * [SECURITY][MODULE][EXPORT][META:{VERSION:1.0.0}][#REF:enforcement,validation]{BUN-NATIVE}
 * Table enforcement system - public API
 */

export {
  validateTableColumns,
  createViolation,
  formatValidationMessage,
} from "./validator";

export {
  analyzeTableData,
  getRecommendedColumns,
  calculateDataRichness,
  isTableSuitable,
  getColumnStats,
} from "./analyzer";

export type {
  TableEnforcementConfig,
  TableValidationResult,
  TableDataAnalysis,
  ColumnSuggestion,
  EnforcementViolation,
  ComplianceMetrics,
  SecurityAssessment,
  EnforcementTableOptions,
  TableOptions, // Deprecated alias for EnforcementTableOptions
  ValidationResult,
} from "./types";

// Domain enforcement - consolidated
export {
  BaseDomainEnforcement,
  type DomainConfig,
  type DomainTableType,
} from "./base-domain";
export {
  MedicalDomainEnforcement,
  FinancialDomainEnforcement,
  EcommerceDomainEnforcement,
  DOMAIN_CONFIGS,
} from "./domains";
export {
  DomainEnforcementFactory,
  defaultDomainFactory,
} from "./domain-factory";

export type {
  MedicalContext,
  FinancialContext,
  EcommerceContext,
  DomainContext,
  DomainMetrics,
  DomainSpecificResult,
  DomainFactoryOptions,
  IDomainEnforcement,
} from "./domain-types";

/**
 * Quick validation helper for common use cases
 * @example
 * import { quickValidate } from '@bun/inspect-utils/enforcement';
 * const result = quickValidate(users, ['name', 'email', 'role', 'status', 'joinDate', 'department']);
 */
export async function quickValidate(
  data: unknown[],
  properties: string[]
): Promise<{ isValid: boolean; message: string }> {
  const { validateTableColumns } = await import("./validator");
  const result = validateTableColumns(properties, data);
  return {
    isValid: result.isValid,
    message: result.message,
  };
}
