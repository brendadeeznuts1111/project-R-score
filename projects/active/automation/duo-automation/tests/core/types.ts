// tests/types.ts - Type definitions for test files

// Basic validation result interface
export interface ValidationResult {
  node: string;
  status: 'valid' | 'warning' | 'error';
  message: string;
  recommendations?: string[];
}

// Extended validation result interface
export interface ExtendedValidationResult extends Omit<ValidationResult, 'status'> {
  status: 'valid' | 'warning' | 'error' | 'info';
}

// Custom validation rule interface
export interface CustomValidationRule {
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  validate: (node: any) => ValidationResult | ExtendedValidationResult | null;
}

// Rule breakdown interface
export interface RuleBreakdown {
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  total: number;
  errors: number;
  warnings: number;
  info: number;
}

// Custom statistics interface
export interface CustomStats {
  totalRules: number;
  ruleBreakdown: RuleBreakdown[];
  totalCustomViolations: number;
}

// Taxonomy report interface
export interface TaxonomyReport {
  timestamp: string;
  totalNodes: number;
  domains: string[];
  types: string[];
  classes: string[];
  crossReferences: CrossReference[];
  validationResults: ValidationResult[];
}

// Cross reference interface
export interface CrossReference {
  from: string;
  to: string;
  relationship: string;
  strength: 'strong' | 'medium' | 'weak';
}

// Enhanced taxonomy report interface
export interface EnhancedTaxonomyReport extends TaxonomyReport {
  customRuleStats: CustomStats;
}

// Mock validator interface
export interface MockValidator {
  validateTaxonomy(): ValidationResult[];
  generateReport(): TaxonomyReport;
}

// Mock custom validator interface
export interface MockCustomValidator extends MockValidator {
  customRules: CustomValidationRule[];
  addCustomRule(rule: CustomValidationRule): void;
  getCustomRules(): CustomValidationRule[];
  removeCustomRule(name: string): void;
  clearCustomRules(): void;
  getCustomRule(name: string): CustomValidationRule | undefined;
  generateEnhancedReport(): EnhancedTaxonomyReport;
}

// Taxonomy node interface
export interface TaxonomyNode {
  domain: string;
  scope?: string;
  type: string;
  meta?: Record<string, string>;
}
