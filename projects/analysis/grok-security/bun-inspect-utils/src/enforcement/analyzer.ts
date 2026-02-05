/**
 * [SECURITY][ANALYSIS][ENGINE][META:{CARDINALITY:ANALYSIS}][#REF:table,data-analysis]{BUN-NATIVE}
 * Data analysis engine for intelligent column suggestions
 */

import type { TableDataAnalysis } from "./types";

/**
 * Analyze table data structure for column recommendations
 */
export function analyzeTableData(data: unknown[]): TableDataAnalysis {
  if (!Array.isArray(data) || data.length === 0) {
    return {
      totalColumns: 0,
      columnNames: [],
      columnTypes: {},
      cardinality: {},
      highCardinalityColumns: [],
      lowCardinalityColumns: [],
      dataRichnessScore: 0,
    };
  }

  const firstRow = data[0] as Record<string, unknown>;
  const columnNames = Object.keys(firstRow);
  const columnTypes: Record<string, string> = {};
  const cardinality: Record<string, number> = {};
  const uniqueValues: Record<string, Set<string>> = {};

  // Initialize tracking
  for (const columnName of columnNames) {
    uniqueValues[columnName] = new Set();
  }

  // Analyze all rows
  for (const row of data) {
    const record = row as Record<string, unknown>;
    for (const columnName of columnNames) {
      const cellValue = record[columnName];

      // Track type
      if (!columnTypes[columnName]) {
        columnTypes[columnName] = typeof cellValue;
      }

      // Track cardinality
      const stringValue = String(cellValue ?? "");
      uniqueValues[columnName].add(stringValue);
    }
  }

  // Calculate cardinality
  for (const columnName of columnNames) {
    cardinality[columnName] = uniqueValues[columnName].size;
  }

  // Classify columns by cardinality
  const avgCardinality =
    Object.values(cardinality).reduce((sum, count) => sum + count, 0) /
    columnNames.length;

  const highCardinalityColumns = columnNames.filter(
    (columnName) => cardinality[columnName] > avgCardinality * 0.7
  );

  const lowCardinalityColumns = columnNames.filter(
    (columnName) => cardinality[columnName] <= avgCardinality * 0.3
  );

  // Calculate data richness score
  const richness = (highCardinalityColumns.length / columnNames.length) * 100;

  return {
    totalColumns: columnNames.length,
    columnNames,
    columnTypes,
    cardinality,
    highCardinalityColumns,
    lowCardinalityColumns,
    dataRichnessScore: Math.round(richness),
  };
}

/**
 * Get recommended columns for display based on data analysis
 */
export function getRecommendedColumns(
  data: unknown[],
  maxColumns: number = 6
): string[] {
  const analysis = analyzeTableData(data);

  // Prefer high-cardinality columns
  const recommended = analysis.highCardinalityColumns.slice(0, maxColumns);

  // Fill remaining slots with other columns
  if (recommended.length < maxColumns) {
    const remaining = analysis.columnNames.filter(
      (col) => !recommended.includes(col)
    );
    recommended.push(...remaining.slice(0, maxColumns - recommended.length));
  }

  return recommended;
}

/**
 * Calculate data richness score (0-100)
 * Higher score = more diverse data = better for display
 */
export function calculateDataRichness(data: unknown[]): number {
  const analysis = analyzeTableData(data);
  return analysis.dataRichnessScore;
}

/**
 * Check if data is suitable for table display
 */
export function isTableSuitable(
  data: unknown[],
  minRichness: number = 40
): boolean {
  if (!Array.isArray(data) || data.length === 0) return false;

  const analysis = analyzeTableData(data);

  // Check if we have enough columns
  if (analysis.totalColumns < 3) return false;

  // Check data richness
  if (analysis.dataRichnessScore < minRichness) return false;

  // Check if we have meaningful data
  const hasData = analysis.columnNames.some(
    (col) => analysis.cardinality[col] > 1
  );

  return hasData;
}

/**
 * Get column statistics for debugging
 */
export function getColumnStats(data: unknown[]): Record<string, unknown> {
  const analysis = analyzeTableData(data);

  return {
    totalColumns: analysis.totalColumns,
    columnNames: analysis.columnNames,
    columnTypes: analysis.columnTypes,
    cardinality: analysis.cardinality,
    highCardinalityCount: analysis.highCardinalityColumns.length,
    lowCardinalityCount: analysis.lowCardinalityColumns.length,
    dataRichnessScore: analysis.dataRichnessScore,
    recommendedColumns: getRecommendedColumns(data),
  };
}
