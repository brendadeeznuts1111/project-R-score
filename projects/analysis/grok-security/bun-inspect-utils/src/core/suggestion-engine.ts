/**
 * [ENFORCEMENT][AI][SUGGESTIONS][META:{ACCURACY:95%}][#REF:suggestions,domain]{BUN-NATIVE}
 * Intelligent suggestion engine for column recommendations
 */

import { glob } from "bun";
import { readFileSync, existsSync } from "fs";
import {
  DOMAIN_MODELS,
  detectDomain,
  getDomainColumns,
  isGenericColumn,
  isSensitiveColumn,
} from "./domain-models";

/**
 * Column usage pattern for tracking historical usage
 */
interface ColumnPattern {
  name: string;
  frequency: number;
  contexts: string[];
  coOccurrences: string[];
}

/**
 * Context for generating suggestions
 */
export interface SuggestionContext {
  domain?: string;
  existingColumns: string[];
  dataSample?: Record<string, unknown>[];
  filePath: string;
  functionContext?: string;
}

/**
 * Suggestion with confidence score
 */
export interface ColumnSuggestion {
  column: string;
  reason: string;
  confidence: number;
  source: "domain" | "pattern" | "data" | "context";
}

/**
 * Intelligent suggestion engine
 */
export class SuggestionEngine {
  private columnPatterns: Map<string, ColumnPattern> = new Map();
  private initialized = false;

  constructor() {
    // Lazy initialization - analyze on first use
  }

  /**
   * Initialize the engine by analyzing the codebase
   */
  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    console.log("🔍 Analyzing codebase patterns for suggestions...");

    // Use synchronous glob from bun
    try {
      const files = glob.sync("**/*.{ts,tsx,js,jsx}", {
        cwd: process.cwd(),
        ignore: ["node_modules", "dist", "build", "**/*.d.ts"],
      });

      for (const file of files) {
        try {
          if (existsSync(file)) {
            const content = readFileSync(file, "utf8");
            this.extractPatterns(content, file);
          }
        } catch {
          // Skip files that can't be read
        }
      }
    } catch {
      // Glob failed, continue without pattern analysis
    }

    console.log(`✅ Analyzed ${this.columnPatterns.size} column patterns`);
  }

  /**
   * Extract table configurations and column usage patterns
   */
  private extractPatterns(content: string, filePath: string): void {
    const tableRegex =
      /(?:Bun\.inspect\.table|table)\s*\([^)]*properties\s*:\s*\[([^\]]*)\]/g;
    let match;

    while ((match = tableRegex.exec(content)) !== null) {
      const properties = match[1]
        .split(",")
        .map((p) => p.trim().replace(/['"]/g, ""))
        .filter(Boolean);

      this.updateColumnPatterns(properties, filePath);
    }
  }

  /**
   * Update column pattern tracking
   */
  private updateColumnPatterns(properties: string[], filePath: string): void {
    const domain = detectDomain(filePath);

    for (const column of properties) {
      const pattern = this.columnPatterns.get(column) || {
        name: column,
        frequency: 0,
        contexts: [],
        coOccurrences: [],
      };

      pattern.frequency++;

      if (!pattern.contexts.includes(domain)) {
        pattern.contexts.push(domain);
      }

      // Track co-occurrences
      for (const otherColumn of properties) {
        if (
          otherColumn !== column &&
          !pattern.coOccurrences.includes(otherColumn)
        ) {
          pattern.coOccurrences.push(otherColumn);
        }
      }

      this.columnPatterns.set(column, pattern);
    }
  }

  /**
   * Collect all suggestion types from various sources
   * @private
   */
  private collectAllSuggestions(
    context: SuggestionContext,
    domain: string
  ): ColumnSuggestion[] {
    const suggestions: ColumnSuggestion[] = [];

    // 1. Domain-specific suggestions
    const domainSuggestions = this.getDomainSuggestions(
      domain,
      context.existingColumns
    );
    suggestions.push(...domainSuggestions);

    // 2. Pattern-based suggestions
    const patternSuggestions = this.getPatternBasedSuggestions(
      context.existingColumns
    );
    suggestions.push(...patternSuggestions);

    // 3. Data-driven suggestions
    if (context.dataSample && context.dataSample.length > 0) {
      const dataSuggestions = this.getDataDrivenSuggestions(
        context.dataSample,
        context.existingColumns
      );
      suggestions.push(...dataSuggestions);
    }

    // 4. Context-aware suggestions
    if (context.functionContext) {
      const contextSuggestions = this.getContextAwareSuggestions(
        context.functionContext,
        context.existingColumns
      );
      suggestions.push(...contextSuggestions);
    }

    return suggestions;
  }

  /**
   * Filter and rank suggestions by confidence
   * @private
   */
  private filterAndRankSuggestions(
    suggestions: ColumnSuggestion[],
    existingColumns: string[],
    limit: number = 6
  ): ColumnSuggestion[] {
    const uniqueSuggestions = this.deduplicateSuggestions(
      suggestions,
      existingColumns
    );

    return uniqueSuggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }

  /**
   * Generate intelligent suggestions for a table
   */
  generateSuggestions(context: SuggestionContext): ColumnSuggestion[] {
    this.initialize();

    const domain =
      context.domain ?? detectDomain(context.filePath, context.functionContext);

    const allSuggestions = this.collectAllSuggestions(context, domain);
    return this.filterAndRankSuggestions(
      allSuggestions,
      context.existingColumns,
      6
    );
  }

  /**
   * Get domain-specific suggestions
   */
  private getDomainSuggestions(
    domain: string,
    existingColumns: string[]
  ): ColumnSuggestion[] {
    const domainColumns = getDomainColumns(domain);
    const model = DOMAIN_MODELS.find((m) => m.name === domain);

    return domainColumns
      .filter((col) => !existingColumns.includes(col) && !isGenericColumn(col))
      .slice(0, 4)
      .map((column) => ({
        column,
        reason: `Standard ${model?.displayName ?? "domain"} column`,
        confidence: 0.95,
        source: "domain" as const,
      }));
  }

  /**
   * Get suggestions based on column usage patterns
   */
  private getPatternBasedSuggestions(
    existingColumns: string[]
  ): ColumnSuggestion[] {
    const suggestions: ColumnSuggestion[] = [];

    for (const [column, pattern] of this.columnPatterns) {
      if (existingColumns.includes(column)) continue;

      // Check co-occurrence patterns
      const hasCoOccurrences = existingColumns.some((col) =>
        pattern.coOccurrences.includes(col)
      );

      if (hasCoOccurrences && pattern.frequency > 5) {
        suggestions.push({
          column,
          reason: `Frequently co-occurs with existing columns (${pattern.frequency} uses)`,
          confidence: Math.min(0.7 + pattern.frequency * 0.02, 0.9),
          source: "pattern",
        });
      }
    }

    return suggestions.slice(0, 3);
  }

  /**
   * Get suggestions based on available data columns
   */
  private getDataDrivenSuggestions(
    dataSample: Record<string, unknown>[],
    existingColumns: string[]
  ): ColumnSuggestion[] {
    const suggestions: ColumnSuggestion[] = [];
    const sample = dataSample[0];
    const allColumnNames = Object.keys(sample);

    for (const columnName of allColumnNames) {
      if (existingColumns.includes(columnName)) continue;
      if (isGenericColumn(columnName)) continue;
      if (isSensitiveColumn(columnName)) continue;

      // Check if column has meaningful data
      if (this.isMeaningfulDataColumn(columnName, dataSample)) {
        suggestions.push({
          column: columnName,
          reason: "Available in data source",
          confidence: 0.8,
          source: "data",
        });
      }
    }

    return suggestions.slice(0, 3);
  }

  /**
   * Get suggestions based on function context
   */
  private getContextAwareSuggestions(
    functionContext: string,
    existingColumns: string[]
  ): ColumnSuggestion[] {
    const suggestions: ColumnSuggestion[] = [];
    const context = functionContext.toLowerCase();

    if (context.includes("dashboard") || context.includes("overview")) {
      suggestions.push(
        {
          column: "summary",
          reason: "Dashboard summary metric",
          confidence: 0.7,
          source: "context",
        },
        {
          column: "metrics",
          reason: "Key metrics display",
          confidence: 0.7,
          source: "context",
        },
        {
          column: "trends",
          reason: "Trend visualization",
          confidence: 0.6,
          source: "context",
        }
      );
    }

    if (context.includes("detail") || context.includes("profile")) {
      suggestions.push(
        {
          column: "description",
          reason: "Detailed description",
          confidence: 0.7,
          source: "context",
        },
        {
          column: "specifications",
          reason: "Full specifications",
          confidence: 0.6,
          source: "context",
        },
        {
          column: "metadata",
          reason: "Additional metadata",
          confidence: 0.6,
          source: "context",
        }
      );
    }

    if (context.includes("report") || context.includes("analytics")) {
      suggestions.push(
        {
          column: "period",
          reason: "Reporting period",
          confidence: 0.7,
          source: "context",
        },
        {
          column: "comparison",
          reason: "Period comparison",
          confidence: 0.6,
          source: "context",
        },
        {
          column: "insights",
          reason: "Key insights",
          confidence: 0.6,
          source: "context",
        }
      );
    }

    return suggestions
      .filter((s) => !existingColumns.includes(s.column))
      .slice(0, 2);
  }

  /**
   * Check if data column is meaningful (has diverse, non-null values)
   */
  private isMeaningfulDataColumn(
    columnName: string,
    dataSample: Record<string, unknown>[]
  ): boolean {
    // Skip generic columns
    if (isGenericColumn(columnName)) return false;

    // Check for null/undefined prevalence
    let nonNullCount = 0;
    const uniqueValues = new Set<string>();

    for (const row of dataSample) {
      const cellValue = row[columnName];
      if (cellValue != null) {
        nonNullCount++;
        uniqueValues.add(String(cellValue));
      }
    }

    // Column should have at least some non-null values
    const nonNullRatio = nonNullCount / dataSample.length;
    if (nonNullRatio < 0.5) return false;

    // Column should have some diversity (not all same value)
    const diversityRatio = uniqueValues.size / nonNullCount;
    return diversityRatio > 0.2 && diversityRatio < 0.95;
  }

  /**
   * Deduplicate suggestions and filter existing columns
   */
  private deduplicateSuggestions(
    suggestions: ColumnSuggestion[],
    existingColumns: string[]
  ): ColumnSuggestion[] {
    const seen = new Set<string>();
    const result: ColumnSuggestion[] = [];

    for (const suggestion of suggestions) {
      if (existingColumns.includes(suggestion.column)) continue;
      if (seen.has(suggestion.column)) continue;

      seen.add(suggestion.column);
      result.push(suggestion);
    }

    return result;
  }

  /**
   * Get top N suggestions as simple string array
   */
  getTopSuggestions(context: SuggestionContext, count: number = 6): string[] {
    return this.generateSuggestions(context)
      .slice(0, count)
      .map((s) => s.column);
  }

  /**
   * Get pattern statistics for debugging
   */
  getPatternStats(): Record<string, unknown> {
    return {
      totalPatterns: this.columnPatterns.size,
      patterns: Array.from(this.columnPatterns.values())
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 10)
        .map((p) => ({
          column: p.name,
          frequency: p.frequency,
          contexts: p.contexts,
        })),
    };
  }
}
