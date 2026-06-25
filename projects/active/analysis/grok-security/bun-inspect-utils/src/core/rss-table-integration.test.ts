/**
 * [TEST][RSS][TABLE][INTEGRATION]{BUN-NATIVE}
 * Unit tests for RSS table rendering and integration
 */

import { describe, it, expect } from "bun:test";
import { RSSTableRenderer, RSSTableUtils, type RSSFeedEntry } from "./rss-table-integration";

/**
 * [1.0.0.0] Sample RSS feed entries
 * @private
 */
const SAMPLE_ENTRIES: RSSFeedEntry[] = [
  {
    title: "Bun v1.3.5: Terminal API, Feature Flags, stringWidth Unicode",
    feedType: "Blog Release",
    entryDate: "2025-12-17T00:00:00Z",
    authorRef: "Jarred Sumner",
    summaryLength: "1200 chars",
    tags: "release,terminal,features,stringwidth",
    timestamp: "2026-01-18T06:58:00Z",
    owner: "maintainer.author.name",
    metrics: "PTY for interactive TensionTCPServer, dead-code elim",
  },
  {
    title: "Bun v1.3.4: Custom Proxy Headers, http.Agent Reuse",
    feedType: "Blog Release",
    entryDate: "2025-12-10T00:00:00Z",
    authorRef: "Jarred Sumner",
    summaryLength: "1100 chars",
    tags: "release,proxy,agent,compile",
    timestamp: "2026-01-18T06:58:00Z",
    owner: "maintainer.author.name",
    metrics: "Proxy auth for odds APIs, -20ms startup in bundles",
  },
];

describe("[1.0.0.0] RSSTableRenderer", () => {
  describe("[1.1.0.0] ASCII Rendering", () => {
    it("[1.1.1.0] should render ASCII table", () => {
      const renderer = new RSSTableRenderer();
      const output = renderer.renderASCII(SAMPLE_ENTRIES);

      expect(output).toContain("Bun v1.3.5");
      expect(output).toContain("Blog Release");
      expect(output).toContain("|");
    });

    it("[1.1.2.0] should include all columns", () => {
      const renderer = new RSSTableRenderer();
      const output = renderer.renderASCII(SAMPLE_ENTRIES);

      expect(output).toContain("title");
      expect(output).toContain("feedType");
      expect(output).toContain("entryDate");
      expect(output).toContain("authorRef");
    });

    it("[1.1.3.0] should handle multiple entries", () => {
      const renderer = new RSSTableRenderer();
      const output = renderer.renderASCII(SAMPLE_ENTRIES);

      expect(output).toContain("Bun v1.3.5");
      expect(output).toContain("Bun v1.3.4");
    });
  });

  describe("[1.2.0.0] JSON Rendering", () => {
    it("[1.2.1.0] should render JSON", () => {
      const renderer = new RSSTableRenderer();
      const output = renderer.renderJSON(SAMPLE_ENTRIES);

      expect(output).toContain("Bun v1.3.5");
      expect(output).toContain("Blog Release");
    });

    it("[1.2.2.0] should be valid JSON", () => {
      const renderer = new RSSTableRenderer();
      const output = renderer.renderJSON(SAMPLE_ENTRIES);

      expect(() => JSON.parse(output)).not.toThrow();
    });

    it("[1.2.3.0] should preserve all fields", () => {
      const renderer = new RSSTableRenderer();
      const output = renderer.renderJSON(SAMPLE_ENTRIES);
      const parsed = JSON.parse(output);

      expect(parsed[0].title).toBe(SAMPLE_ENTRIES[0].title);
      expect(parsed[0].feedType).toBe(SAMPLE_ENTRIES[0].feedType);
    });
  });

  describe("[1.3.0.0] CSV Rendering", () => {
    it("[1.3.1.0] should render CSV", () => {
      const renderer = new RSSTableRenderer();
      const output = renderer.renderCSV(SAMPLE_ENTRIES);

      expect(output).toContain("title");
      expect(output).toContain("feedType");
      expect(output).toContain("Bun v1.3.5");
    });

    it("[1.3.2.0] should have header row", () => {
      const renderer = new RSSTableRenderer();
      const output = renderer.renderCSV(SAMPLE_ENTRIES);
      const lines = output.split("\n");

      expect(lines[0]).toContain("title");
    });

    it("[1.3.3.0] should escape quotes", () => {
      const renderer = new RSSTableRenderer();
      const entry: RSSFeedEntry = {
        ...SAMPLE_ENTRIES[0],
        title: 'Title with "quotes"',
      };
      const output = renderer.renderCSV([entry]);

      expect(output).toContain('""');
    });
  });

  describe("[1.4.0.0] HTML Rendering", () => {
    it("[1.4.1.0] should render HTML table", () => {
      const renderer = new RSSTableRenderer();
      const output = renderer.renderHTML(SAMPLE_ENTRIES);

      expect(output).toContain("<table");
      expect(output).toContain("</table>");
      expect(output).toContain("<thead>");
      expect(output).toContain("<tbody>");
    });

    it("[1.4.2.0] should include table headers", () => {
      const renderer = new RSSTableRenderer();
      const output = renderer.renderHTML(SAMPLE_ENTRIES);

      expect(output).toContain("<th");
      expect(output).toContain("title");
      expect(output).toContain("feedType");
    });

    it("[1.4.3.0] should escape HTML entities", () => {
      const renderer = new RSSTableRenderer();
      const entry: RSSFeedEntry = {
        ...SAMPLE_ENTRIES[0],
        title: "Title with <tags> & entities",
      };
      const output = renderer.renderHTML([entry]);

      expect(output).toContain("&lt;");
      expect(output).toContain("&gt;");
      expect(output).toContain("&amp;");
    });
  });
});

describe("[2.0.0.0] RSSTableUtils", () => {
  describe("[2.1.0.0] Render Function", () => {
    it("[2.1.1.0] should render ASCII by default", () => {
      const output = RSSTableUtils.render(SAMPLE_ENTRIES);

      expect(output).toContain("|");
      expect(output).toContain("Bun v1.3.5");
    });

    it("[2.1.2.0] should render JSON format", () => {
      const output = RSSTableUtils.render(SAMPLE_ENTRIES, "json");

      expect(() => JSON.parse(output)).not.toThrow();
    });

    it("[2.1.3.0] should render CSV format", () => {
      const output = RSSTableUtils.render(SAMPLE_ENTRIES, "csv");

      expect(output).toContain("title");
      expect(output.split("\n").length).toBeGreaterThan(1);
    });

    it("[2.1.4.0] should render HTML format", () => {
      const output = RSSTableUtils.render(SAMPLE_ENTRIES, "html");

      expect(output).toContain("<table");
      expect(output).toContain("</table>");
    });
  });

  describe("[2.2.0.0] Validate and Render", () => {
    it("[2.2.1.0] should validate and render valid entries", () => {
      const result = RSSTableUtils.validateAndRender(SAMPLE_ENTRIES);

      expect(result.valid).toBe(true);
      expect(result.output).toContain("Bun v1.3.5");
    });

    it("[2.2.2.0] should reject invalid entries", () => {
      const invalidEntry: RSSFeedEntry = {
        ...SAMPLE_ENTRIES[0],
        title: "",
      };
      const result = RSSTableUtils.validateAndRender([invalidEntry]);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it("[2.2.3.0] should support format parameter", () => {
      const result = RSSTableUtils.validateAndRender(SAMPLE_ENTRIES, "json");

      expect(result.valid).toBe(true);
      expect(() => JSON.parse(result.output)).not.toThrow();
    });
  });
});

