/**
 * [SECURITY][VALIDATION][ENGINE][META:{MIN_COLS:6}][#REF:table,Bun.inspect.table]{BUN-NATIVE}
 * Core validation engine for table column enforcement
 */

import type {
  TableEnforcementConfig,
  TableValidationResult,
  EnforcementViolation,
} from "./types";
import { GENERIC_COLUMNS, SENSITIVE_PATTERNS } from "../core/domain-models";

/**
 * Default enforcement configuration
 */
const DEFAULT_CONFIG: TableEnforcementConfig = {
  minMeaningfulColumns: 6,
  genericColumns: GENERIC_COLUMNS,
  enableWarnings: true,
  throwInTest: true,
  enableSuggestions: true,
  sensitivePatterns: SENSITIVE_PATTERNS,
};

/**
 * Validate table columns against enforcement rules
 * @param properties - Column names to validate
 * @param data - Data being displayed (for analysis)
 * @param config - Enforcement configuration
 * @returns Validation result with details
 */
export function validateTableColumns(
  properties: string[] | undefined,
  data: unknown[],
  config: Partial<TableEnforcementConfig> = {}
): TableValidationResult {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  // No properties specified - analyze data
  if (!properties && Array.isArray(data) && data.length > 0) {
    const firstRow = data[0] as Record<string, unknown>;
    properties = Object.keys(firstRow);
  }

  if (!properties || properties.length === 0) {
    return {
      isValid: false,
      meaningfulColumns: 0,
      genericColumns: [],
      suggestions: [],
      message: "No columns specified or data is empty",
      severity: "error",
    };
  }

  // Filter out generic columns
  const meaningfulColumns = properties.filter(
    (column) => !mergedConfig.genericColumns.includes(column.toLowerCase())
  );
  const genericColumnsFound = properties.filter((column) =>
    mergedConfig.genericColumns.includes(column.toLowerCase())
  );

  const isValid = meaningfulColumns.length >= mergedConfig.minMeaningfulColumns;

  return {
    isValid,
    meaningfulColumns: meaningfulColumns.length,
    genericColumns: genericColumnsFound,
    suggestions: isValid ? [] : suggestColumns(data, properties, mergedConfig),
    message: isValid
      ? `✓ Table has ${meaningfulColumns.length} meaningful columns`
      : `✗ Table has only ${meaningfulColumns.length} meaningful columns (need ${mergedConfig.minMeaningfulColumns})`,
    severity: isValid ? "info" : "error",
  };
}

/**
 * Suggest additional columns based on data analysis
 */
function suggestColumns(
  data: unknown[],
  currentProps: string[],
  config: TableEnforcementConfig
): string[] {
  if (!Array.isArray(data) || data.length === 0) return [];

  const firstRow = data[0] as Record<string, unknown>;
  const allColumnNames = Object.keys(firstRow);

  // Find unused columns that aren't generic
  const unusedColumns = allColumnNames.filter(
    (columnName) =>
      !currentProps.includes(columnName) &&
      !config.genericColumns.includes(columnName.toLowerCase()) &&
      !config.sensitivePatterns.some((pattern) =>
        columnName.toLowerCase().includes(pattern)
      )
  );

  return unusedColumns.slice(0, 3); // Return top 3 suggestions
}

/**
 * Create enforcement violation from validation result
 */
export function createViolation(
  result: TableValidationResult,
  data: unknown[]
): EnforcementViolation | null {
  if (result.isValid) return null;

  return {
    type: "insufficient-columns",
    severity: "error",
    message: result.message,
    currentCount: result.meaningfulColumns,
    requiredCount: DEFAULT_CONFIG.minMeaningfulColumns,
    suggestions: result.suggestions.map((col) => ({
      column: col,
      reason: `Add "${col}" to provide more context`,
      confidence: 0.8,
      examples: extractColumnExamples(data, col),
    })),
  };
}

/**
 * Extract example values from a column
 */
function extractColumnExamples(data: unknown[], column: string): unknown[] {
  const examples: unknown[] = [];
  for (const row of data.slice(0, 3)) {
    const val = (row as Record<string, unknown>)[column];
    if (val !== undefined && val !== null) {
      examples.push(val);
    }
  }
  return examples;
}

/**
 * Format validation result as structured log message
 */
export function formatValidationMessage(result: TableValidationResult): string {
  const lines = [
    `[TABLE-VALIDATION] ${result.severity.toUpperCase()}`,
    `Message: ${result.message}`,
    `Meaningful Columns: ${result.meaningfulColumns}`,
  ];

  if (result.genericColumns.length > 0) {
    lines.push(`Generic Columns: ${result.genericColumns.join(", ")}`);
  }

  if (result.suggestions.length > 0) {
    lines.push(`Suggestions: ${result.suggestions.join(", ")}`);
  }

  return lines.join("\n");
}
