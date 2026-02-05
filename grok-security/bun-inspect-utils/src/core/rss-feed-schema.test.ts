/**
 * [TEST][RSS][SCHEMA]{BUN-NATIVE}
 * Unit tests for RSS feed schema validation and enrichment
 */

import { describe, it, expect } from "bun:test";
import {
  RSSFeedTableValidator,
  RSSFeedTableEnricher,
  type RSSFeedEntry,
} from "./rss-feed-schema";

/**
 * [1.0.0.0] Sample RSS feed entry
 * @private
 */
const SAMPLE_ENTRY: RSSFeedEntry = {
  title: "Bun v1.3.5: Terminal API, Feature Flags, stringWidth Unicode",
  feedType: "Blog Release",
  entryDate: "2025-12-17T00:00:00Z",
  authorRef: "Jarred Sumner",
  summaryLength: "1200 chars",
  tags: "release,terminal,features,stringwidth",
  timestamp: "2026-01-18T06:58:00Z",
  owner: "maintainer.author.name",
  metrics: "PTY for interactive TensionTCPServer, dead-code elim",
};

describe("[1.0.0.0] RSSFeedTableValidator", () => {
  describe("[1.1.0.0] Entry Validation", () => {
    it("[1.1.1.0] should validate correct entry", () => {
      const validator = new RSSFeedTableValidator();
      const result = validator.validateEntry(SAMPLE_ENTRY);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it("[1.1.2.0] should reject missing title", () => {
      const validator = new RSSFeedTableValidator();
      const entry = { ...SAMPLE_ENTRY, title: "" };

      const result = validator.validateEntry(entry);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("title"))).toBe(true);
    });

    it("[1.1.3.0] should reject invalid ISO 8601 date", () => {
      const validator = new RSSFeedTableValidator();
      const entry = { ...SAMPLE_ENTRY, entryDate: "invalid-date" };

      const result = validator.validateEntry(entry);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("entryDate"))).toBe(true);
    });

    it("[1.1.4.0] should validate ISO 8601 dates", () => {
      const validator = new RSSFeedTableValidator();
      const entry = {
        ...SAMPLE_ENTRY,
        entryDate: "2025-12-17T00:00:00Z",
        timestamp: "2026-01-18T06:58:00Z",
      };

      const result = validator.validateEntry(entry);

      expect(result.valid).toBe(true);
    });

    it("[1.1.5.0] should require all mandatory fields", () => {
      const validator = new RSSFeedTableValidator();
      const entry: RSSFeedEntry = {
        title: "",
        feedType: "",
        entryDate: "",
        authorRef: "",
        summaryLength: "",
        tags: "",
        timestamp: "",
        owner: "",
        metrics: "",
      };

      const result = validator.validateEntry(entry);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("[1.2.0.0] Multiple Entry Validation", () => {
    it("[1.2.1.0] should validate multiple entries", () => {
      const validator = new RSSFeedTableValidator();
      const entries = [SAMPLE_ENTRY, SAMPLE_ENTRY];

      const result = validator.validateEntries(entries);

      expect(result.valid).toBe(true);
      expect(result.validEntries).toBe(2);
      expect(result.invalidEntries.length).toBe(0);
    });

    it("[1.2.2.0] should report invalid entries", () => {
      const validator = new RSSFeedTableValidator();
      const invalidEntry = { ...SAMPLE_ENTRY, title: "" };
      const entries = [SAMPLE_ENTRY, invalidEntry];

      const result = validator.validateEntries(entries);

      expect(result.valid).toBe(false);
      expect(result.validEntries).toBe(1);
      expect(result.invalidEntries.length).toBe(1);
    });
  });

  describe("[1.3.0.0] Minimum Columns", () => {
    it("[1.3.1.0] should meet minimum columns requirement", () => {
      const validator = new RSSFeedTableValidator({ minColumns: 6 });

      expect(validator.meetsMinimumColumns(SAMPLE_ENTRY)).toBe(true);
    });

    it("[1.3.2.0] should fail with insufficient columns", () => {
      const validator = new RSSFeedTableValidator({ minColumns: 10 });
      const entry: RSSFeedEntry = {
        title: "Title",
        feedType: "Blog",
        entryDate: "2025-12-17T00:00:00Z",
        authorRef: "Author",
        summaryLength: "100 chars",
        tags: "",
        timestamp: "",
        owner: "",
        metrics: "",
      };

      expect(validator.meetsMinimumColumns(entry)).toBe(false);
    });
  });
});

describe("[2.0.0.0] RSSFeedTableEnricher", () => {
  describe("[2.1.0.0] Entry Enrichment", () => {
    it("[2.1.1.0] should enrich entry with metrics", () => {
      const enricher = new RSSFeedTableEnricher();
      const enriched = enricher.enrichEntry(SAMPLE_ENTRY);

      expect(enriched.metrics).toContain("deep-dive");
      expect(enriched.metrics).toContain("version-critical");
    });

    it("[2.1.2.0] should add quick-read for short summaries", () => {
      const enricher = new RSSFeedTableEnricher();
      const entry = { ...SAMPLE_ENTRY, summaryLength: "200 chars" };
      const enriched = enricher.enrichEntry(entry);

      expect(enriched.metrics).toContain("quick-read");
    });

    it("[2.1.3.0] should add medium-read for medium summaries", () => {
      const enricher = new RSSFeedTableEnricher();
      const entry = { ...SAMPLE_ENTRY, summaryLength: "600 chars" };
      const enriched = enricher.enrichEntry(entry);

      expect(enriched.metrics).toContain("medium-read");
    });

    it("[2.1.4.0] should detect security patches", () => {
      const enricher = new RSSFeedTableEnricher();
      const entry = {
        ...SAMPLE_ENTRY,
        tags: "release,security,patch",
      };
      const enriched = enricher.enrichEntry(entry);

      expect(enriched.metrics).toContain("security-patch");
    });

    it("[2.1.5.0] should detect performance impacts", () => {
      const enricher = new RSSFeedTableEnricher();
      const entry = {
        ...SAMPLE_ENTRY,
        tags: "release,perf,optimization",
      };
      const enriched = enricher.enrichEntry(entry);

      expect(enriched.metrics).toContain("performance-impact");
    });
  });

  describe("[2.2.0.0] Multiple Entry Enrichment", () => {
    it("[2.2.1.0] should enrich multiple entries", () => {
      const enricher = new RSSFeedTableEnricher();
      const entries = [SAMPLE_ENTRY, SAMPLE_ENTRY];
      const enriched = enricher.enrichEntries(entries);

      expect(enriched.length).toBe(2);
      expect(enriched[0].metrics).toContain("deep-dive");
      expect(enriched[1].metrics).toContain("deep-dive");
    });
  });
});

