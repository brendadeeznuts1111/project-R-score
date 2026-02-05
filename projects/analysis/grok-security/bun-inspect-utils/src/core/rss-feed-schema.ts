/**
 * [CORE][RSS][SCHEMA]{BUN-NATIVE}
 * Bun RSS feed table schema with enriched metadata
 * Institutional-grade tabular rendering for https://bun.com/rss.xml
 */

/**
 * [1.0.0.0] RSS Feed Entry Schema
 * Enriched RSS item with metadata for table rendering
 *
 * @tags rss,feed,schema,metadata,table
 */
export interface RSSFeedEntry {
  // Core RSS fields
  title: string;
  feedType: "Blog Release" | "Blog Tutorial" | "Blog Guide" | "Blog Case" | string;
  entryDate: string; // ISO 8601 UTC
  authorRef: string;
  summaryLength: string; // e.g., "1200 chars"

  // Metadata fields
  tags: string; // Comma-separated
  timestamp: string; // ISO 8601 UTC (fetch time)
  owner: string;
  metrics: string; // Performance/impact notes

  // Optional enrichment
  link?: string;
  description?: string;
  guid?: string;
  category?: string[];
}

/**
 * [1.1.0.0] RSS Feed Table Configuration
 * Options for table rendering and validation
 *
 * @tags rss,config,table,options
 */
export interface RSSFeedTableConfig {
  minColumns?: number;
  sortByWidth?: boolean;
  colors?: boolean;
  maxWidth?: number;
  validateDeepEquals?: boolean;
  enrichMetadata?: boolean;
}

/**
 * [1.2.0.0] RSS Feed Table Validator
 * Validates RSS entries against schema
 *
 * @tags rss,validator,schema,enforcement
 */
export class RSSFeedTableValidator {
  private minColumns: number;
  private validateDeepEquals: boolean;

  constructor(config: RSSFeedTableConfig = {}) {
    this.minColumns = config.minColumns ?? 6;
    this.validateDeepEquals = config.validateDeepEquals ?? true;
  }

  /**
   * [1.2.1.0] Validate single RSS entry
   * @param entry - RSS feed entry to validate
   * @returns Validation result with errors
   */
  validateEntry(entry: RSSFeedEntry): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Required fields
    if (!entry.title || typeof entry.title !== "string") {
      errors.push("title: required string");
    }
    if (!entry.feedType || typeof entry.feedType !== "string") {
      errors.push("feedType: required string");
    }
    if (!entry.entryDate || typeof entry.entryDate !== "string") {
      errors.push("entryDate: required ISO 8601 string");
    }
    if (!entry.authorRef || typeof entry.authorRef !== "string") {
      errors.push("authorRef: required string");
    }
    if (!entry.summaryLength || typeof entry.summaryLength !== "string") {
      errors.push("summaryLength: required string");
    }
    if (!entry.tags || typeof entry.tags !== "string") {
      errors.push("tags: required comma-separated string");
    }
    if (!entry.timestamp || typeof entry.timestamp !== "string") {
      errors.push("timestamp: required ISO 8601 string");
    }
    if (!entry.owner || typeof entry.owner !== "string") {
      errors.push("owner: required string");
    }
    if (!entry.metrics || typeof entry.metrics !== "string") {
      errors.push("metrics: required string");
    }

    // Validate ISO 8601 dates
    if (entry.entryDate && !this.isValidISO8601(entry.entryDate)) {
      errors.push("entryDate: invalid ISO 8601 format");
    }
    if (entry.timestamp && !this.isValidISO8601(entry.timestamp)) {
      errors.push("timestamp: invalid ISO 8601 format");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * [1.2.2.0] Validate multiple entries
   * @param entries - Array of RSS feed entries
   * @returns Validation results
   */
  validateEntries(entries: RSSFeedEntry[]): {
    valid: boolean;
    totalEntries: number;
    validEntries: number;
    invalidEntries: Array<{ index: number; errors: string[] }>;
  } {
    const invalidEntries: Array<{ index: number; errors: string[] }> = [];
    let validCount = 0;

    for (let i = 0; i < entries.length; i++) {
      const result = this.validateEntry(entries[i]);
      if (result.valid) {
        validCount++;
      } else {
        invalidEntries.push({ index: i, errors: result.errors });
      }
    }

    return {
      valid: invalidEntries.length === 0,
      totalEntries: entries.length,
      validEntries: validCount,
      invalidEntries,
    };
  }

  /**
   * [1.2.3.0] Check if entry meets minimum column requirement
   * @param entry - RSS feed entry
   * @returns True if entry has at least minColumns non-empty fields
   */
  meetsMinimumColumns(entry: RSSFeedEntry): boolean {
    const fields = [
      entry.title,
      entry.feedType,
      entry.entryDate,
      entry.authorRef,
      entry.summaryLength,
      entry.tags,
      entry.timestamp,
      entry.owner,
      entry.metrics,
    ];

    const nonEmptyCount = fields.filter((f) => f && String(f).trim().length > 0)
      .length;
    return nonEmptyCount >= this.minColumns;
  }

  /**
   * [1.2.4.0] Deep equality check for entries
   * @private
   */
  private isValidISO8601(dateString: string): boolean {
    try {
      const date = new Date(dateString);
      return date instanceof Date && !isNaN(date.getTime());
    } catch {
      return false;
    }
  }
}

/**
 * [1.3.0.0] RSS Feed Table Enricher
 * Enriches RSS entries with additional metadata
 *
 * @tags rss,enricher,metadata,enhancement
 */
export class RSSFeedTableEnricher {
  /**
   * [1.3.1.0] Enrich entry with computed metrics
   * @param entry - RSS feed entry
   * @returns Enriched entry
   */
  enrichEntry(entry: RSSFeedEntry): RSSFeedEntry {
    // Parse summary length
    const summaryChars = parseInt(entry.summaryLength, 10) || 0;

    // Enrich metrics with computed values
    const enrichedMetrics = this.computeMetrics(entry, summaryChars);

    return {
      ...entry,
      metrics: enrichedMetrics,
    };
  }

  /**
   * [1.3.2.0] Compute metrics from entry data
   * @private
   */
  private computeMetrics(entry: RSSFeedEntry, summaryChars: number): string {
    const parts: string[] = [];

    // Add original metrics
    if (entry.metrics) {
      parts.push(entry.metrics);
    }

    // Add computed metrics
    if (summaryChars > 1000) {
      parts.push("deep-dive");
    } else if (summaryChars > 500) {
      parts.push("medium-read");
    } else {
      parts.push("quick-read");
    }

    // Add tag-based metrics
    const tags = entry.tags.split(",").map((t) => t.trim());
    if (tags.includes("release")) {
      parts.push("version-critical");
    }
    if (tags.includes("security")) {
      parts.push("security-patch");
    }
    if (tags.includes("perf")) {
      parts.push("performance-impact");
    }

    return parts.join(", ");
  }

  /**
   * [1.3.3.0] Enrich multiple entries
   * @param entries - Array of RSS feed entries
   * @returns Enriched entries
   */
  enrichEntries(entries: RSSFeedEntry[]): RSSFeedEntry[] {
    return entries.map((entry) => this.enrichEntry(entry));
  }
}

/**
 * [1.4.0.0] Export schema utilities
 */
export const RSSFeedSchema = {
  validator: (config?: RSSFeedTableConfig) =>
    new RSSFeedTableValidator(config),
  enricher: () => new RSSFeedTableEnricher(),
};

