/**
 * [CORE][RSS][TABLE][INTEGRATION]{BUN-NATIVE}
 * RSS feed table integration with table-utils
 * Institutional-grade tabular rendering for Bun RSS feeds
 */

import type { RSSFeedEntry } from "./rss-feed-schema";
import { RSSFeedTableValidator, RSSFeedTableEnricher } from "./rss-feed-schema";

/**
 * [1.0.0.0] RSS Table Renderer
 * Renders RSS feed entries as formatted tables
 *
 * @tags rss,table,renderer,formatting
 */
export class RSSTableRenderer {
  private validator: RSSFeedTableValidator;
  private enricher: RSSFeedTableEnricher;

  constructor() {
    this.validator = new RSSFeedTableValidator();
    this.enricher = new RSSFeedTableEnricher();
  }

  /**
   * [1.1.0.0] Render entries as ASCII table
   * @param entries - RSS feed entries
   * @returns Formatted ASCII table string
   */
  renderASCII(entries: RSSFeedEntry[]): string {
    // Validate entries
    const validation = this.validator.validateEntries(entries);
    if (!validation.valid) {
      console.warn(
        `⚠️  ${validation.invalidEntries.length} invalid entries detected`
      );
    }

    // Enrich entries
    const enriched = this.enricher.enrichEntries(entries);

    // Calculate column widths
    const columns = [
      "title",
      "feedType",
      "entryDate",
      "authorRef",
      "summaryLength",
      "tags",
      "timestamp",
      "owner",
      "metrics",
    ];

    const widths = this.calculateColumnWidths(enriched, columns);

    // Build table
    let table = "";

    // Header
    table += this.buildRow(columns, widths);
    table += this.buildSeparator(widths);

    // Rows
    for (const entry of enriched) {
      const values = columns.map((col) =>
        String(entry[col as keyof RSSFeedEntry] || "")
      );
      table += this.buildRow(values, widths);
    }

    return table;
  }

  /**
   * [1.2.0.0] Render entries as JSON
   * @param entries - RSS feed entries
   * @returns JSON string
   */
  renderJSON(entries: RSSFeedEntry[]): string {
    const enriched = this.enricher.enrichEntries(entries);
    return JSON.stringify(enriched, null, 2);
  }

  /**
   * [1.3.0.0] Render entries as CSV
   * @param entries - RSS feed entries
   * @returns CSV string
   */
  renderCSV(entries: RSSFeedEntry[]): string {
    const enriched = this.enricher.enrichEntries(entries);
    const columns = [
      "title",
      "feedType",
      "entryDate",
      "authorRef",
      "summaryLength",
      "tags",
      "timestamp",
      "owner",
      "metrics",
    ];

    // Header
    const header = columns.map((col) => `"${col}"`).join(",");

    // Rows
    const rows = enriched.map((entry) =>
      columns
        .map((col) => {
          const value = String(entry[col as keyof RSSFeedEntry] || "");
          return `"${value.replace(/"/g, '""')}"`;
        })
        .join(",")
    );

    return [header, ...rows].join("\n");
  }

  /**
   * [1.4.0.0] Render entries as HTML table
   * @param entries - RSS feed entries
   * @returns HTML string
   */
  renderHTML(entries: RSSFeedEntry[]): string {
    const enriched = this.enricher.enrichEntries(entries);
    const columns = [
      "title",
      "feedType",
      "entryDate",
      "authorRef",
      "summaryLength",
      "tags",
      "timestamp",
      "owner",
      "metrics",
    ];

    let html = '<table style="border-collapse: collapse; width: 100%;">\n';

    // Header
    html += "  <thead>\n    <tr>\n";
    for (const col of columns) {
      html += `      <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">${col}</th>\n`;
    }
    html += "    </tr>\n  </thead>\n";

    // Body
    html += "  <tbody>\n";
    for (const entry of enriched) {
      html += "    <tr>\n";
      for (const col of columns) {
        const value = String(entry[col as keyof RSSFeedEntry] || "");
        html += `      <td style="border: 1px solid #ddd; padding: 8px;">${this.escapeHTML(value)}</td>\n`;
      }
      html += "    </tr>\n";
    }
    html += "  </tbody>\n</table>";

    return html;
  }

  /**
   * [1.5.0.0] Calculate column widths
   * @private
   */
  private calculateColumnWidths(
    entries: RSSFeedEntry[],
    columns: string[]
  ): number[] {
    return columns.map((col) => {
      let maxWidth = col.length;

      for (const entry of entries) {
        const value = String(entry[col as keyof RSSFeedEntry] || "");
        const width = Bun.stringWidth(value);
        maxWidth = Math.max(maxWidth, width);
      }

      return Math.min(maxWidth + 2, 50); // Cap at 50 chars
    });
  }

  /**
   * [1.6.0.0] Build table row
   * @private
   */
  private buildRow(values: string[], widths: number[]): string {
    const cells = values.map((cellValue, index) => {
      const width = widths[index];
      const paddedValue = cellValue.padEnd(width);
      return paddedValue;
    });

    return "| " + cells.join(" | ") + " |\n";
  }

  /**
   * [1.7.0.0] Build table separator
   * @private
   */
  private buildSeparator(widths: number[]): string {
    const separators = widths.map((w) => "-".repeat(w));
    return "+-" + separators.join("-+-") + "-+\n";
  }

  /**
   * [1.8.0.0] Escape HTML entities
   * @private
   */
  private escapeHTML(text: string): string {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return text.replace(/[&<>"']/g, (char) => map[char]);
  }
}

/**
 * [2.0.0.0] RSS Table Utilities
 * Helper functions for RSS table operations
 *
 * @tags rss,table,utilities
 */
export const RSSTableUtils = {
  /**
   * [2.1.0.0] Create renderer instance
   */
  renderer: () => new RSSTableRenderer(),

  /**
   * [2.2.0.0] Render entries with format
   */
  render: (
    entries: RSSFeedEntry[],
    format: "ascii" | "json" | "csv" | "html" = "ascii"
  ): string => {
    const renderer = new RSSTableRenderer();
    switch (format) {
      case "json":
        return renderer.renderJSON(entries);
      case "csv":
        return renderer.renderCSV(entries);
      case "html":
        return renderer.renderHTML(entries);
      default:
        return renderer.renderASCII(entries);
    }
  },

  /**
   * [2.3.0.0] Validate and render
   */
  validateAndRender: (
    entries: RSSFeedEntry[],
    format: "ascii" | "json" | "csv" | "html" = "ascii"
  ): { valid: boolean; output: string; errors?: string[] } => {
    const validator = new RSSFeedTableValidator();
    const validation = validator.validateEntries(entries);

    if (!validation.valid) {
      return {
        valid: false,
        output: "",
        errors: validation.invalidEntries.flatMap((e) => e.errors),
      };
    }

    const renderer = new RSSTableRenderer();
    return {
      valid: true,
      output: RSSTableUtils.render(entries, format),
    };
  },
};
