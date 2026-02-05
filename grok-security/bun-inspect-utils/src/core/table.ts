/**
 * [SECURITY][TABLE][UTILITY][META:{ENFORCEMENT:ENABLED}][#REF:Bun.inspect.table,validation]{BUN-NATIVE}
 * Bun.inspect.table() wrapper with enforcement validation
 */

import type { TableOptions } from "../types";
import {
  validateTableColumns,
  formatValidationMessage,
} from "../enforcement/validator";
import { analyzeTableData } from "../enforcement/analyzer";
import type { TableValidationResult } from "../enforcement/types";

/**
 * Format data as ASCII table with enforcement validation
 * [SECURITY][TABLE][METHOD][META:{VALIDATION:ENABLED}][#REF:Bun.inspect.table]{BUN-NATIVE}
 * @example
 * // Compliant: 6+ meaningful columns
 * const users = [{id: 1, name: 'Alice', email: 'a@x.com', role: 'admin', status: 'active', joinDate: '2024-01-01'}];
 * table(users, ['name', 'email', 'role', 'status', 'joinDate', 'department']);
 */
export function table(
  data: unknown[],
  properties?: string[],
  options: TableOptions = {}
): string {
  const mergedOptions = {
    indent: options.indent ?? "",
    newline: options.newline ?? "\n",
    maxColumns: options.maxColumns ?? Infinity,
    maxRows: options.maxRows ?? Infinity,
    skipValidation:
      (options as Record<string, unknown>).skipValidation === true,
  };

  // Validate table columns unless explicitly skipped
  if (!mergedOptions.skipValidation && shouldValidate()) {
    const validation = validateTableColumns(properties, data);

    if (!validation.isValid) {
      const message = formatValidationMessage(validation);
      const isTest = isTestEnvironment();

      if (isTest) {
        throw new Error(`[TABLE-ENFORCEMENT] ${message}`);
      } else if (validation.severity === "error") {
        console.warn(`\n⚠️  ${message}\n`);
      }
    }
  }

  // Use native Bun.inspect.table
  return Bun.inspect.table(data, properties, {
    indent: mergedOptions.indent,
    newline: mergedOptions.newline,
  });
}

/**
 * Check if validation should be performed
 */
function shouldValidate(): boolean {
  // Skip if explicitly disabled
  if (process.env.SKIP_TABLE_VALIDATION === "true") return false;
  // Skip in production unless explicitly enabled
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ENFORCE_TABLES !== "true"
  ) {
    return false;
  }
  return true;
}

/**
 * Check if running in test environment
 */
function isTestEnvironment(): boolean {
  return (
    process.env.NODE_ENV === "test" ||
    process.env.BUN_ENV === "test" ||
    typeof process.env.VITEST !== "undefined"
  );
}

/**
 * Format data as markdown table with validation
 * [SECURITY][TABLE][METHOD][META:{FORMAT:MARKDOWN}][#REF:tableMarkdown,validation]{BUN-NATIVE}
 */
export function tableMarkdown(
  data: unknown[],
  properties?: string[],
  skipValidation: boolean = false
): string {
  if (!Array.isArray(data) || data.length === 0) return "";

  // Validate columns
  if (!skipValidation && shouldValidate()) {
    const validation = validateTableColumns(properties, data);
    if (!validation.isValid && isTestEnvironment()) {
      throw new Error(
        `[TABLE-ENFORCEMENT] Markdown table: ${validation.message}`
      );
    }
  }

  const rows = data.slice(0, 100);
  const keys = properties || Object.keys(rows[0] as Record<string, unknown>);

  // Header
  let md = `| ${keys.join(" | ")} |\n`;
  md += `| ${keys.map(() => "---").join(" | ")} |\n`;

  // Rows
  for (const row of rows) {
    const values = keys.map((key) => {
      const cellValue = (row as Record<string, unknown>)[key];
      return String(cellValue ?? "");
    });
    md += `| ${values.join(" | ")} |\n`;
  }

  return md;
}

/**
 * Format data as CSV with validation
 * [SECURITY][TABLE][METHOD][META:{FORMAT:CSV}][#REF:tableCsv,validation]{BUN-NATIVE}
 */
export function tableCsv(
  data: unknown[],
  properties?: string[],
  skipValidation: boolean = false
): string {
  if (!Array.isArray(data) || data.length === 0) return "";

  // Validate columns
  if (!skipValidation && shouldValidate()) {
    const validation = validateTableColumns(properties, data);
    if (!validation.isValid && isTestEnvironment()) {
      throw new Error(`[TABLE-ENFORCEMENT] CSV table: ${validation.message}`);
    }
  }

  const rows = data.slice(0, 1000);
  const keys = properties || Object.keys(rows[0] as Record<string, unknown>);

  // Header
  let csv = keys.map((key) => `"${key}"`).join(",") + "\n";

  // Rows
  for (const row of rows) {
    const values = keys.map((key) => {
      const cellValue = (row as Record<string, unknown>)[key];
      const stringValue = String(cellValue ?? "");
      return `"${stringValue.replace(/"/g, '""')}"`;
    });
    csv += values.join(",") + "\n";
  }

  return csv;
}

/**
 * Format data as JSON lines
 * [INSPECT][TABLE][METHOD][#REF:tableJsonLines]{BUN-NATIVE}
 */
export function tableJsonLines(data: unknown[], properties?: string[]): string {
  if (!Array.isArray(data)) return "";

  return data
    .slice(0, 1000)
    .map((row) => {
      if (properties) {
        const filtered: Record<string, unknown> = {};
        for (const prop of properties) {
          filtered[prop] = (row as Record<string, unknown>)[prop];
        }
        return JSON.stringify(filtered);
      }
      return JSON.stringify(row);
    })
    .join("\n");
}

/**
 * Get table dimensions
 * [INSPECT][TABLE][METHOD][#REF:getTableDimensions]{BUN-NATIVE}
 */
export function getTableDimensions(
  data: unknown[],
  properties?: string[]
): { rows: number; columns: number } {
  const rows = Array.isArray(data) ? data.length : 0;
  const columns = properties
    ? properties.length
    : rows > 0
      ? Object.keys(data[0] as Record<string, unknown>).length
      : 0;

  return { rows, columns };
}
