// lib/har-analyzer/url-parser.test.ts — Tests for URL parser

import { test, expect, describe, expectTypeOf } from "bun:test";
import { parseURL, MIME_MAP } from "./url-parser";
import type { ParsedURL, FragmentAnalysis } from "./types";

// ─── Type tests ─────────────────────────────────────────────────────

expectTypeOf(parseURL).toBeFunction();
expectTypeOf(parseURL).parameters.toEqualTypeOf<[urlString: string]>();
expectTypeOf(parseURL).returns.toEqualTypeOf<ParsedURL>();

expectTypeOf(parseURL("https://example.com")).toMatchObjectType<{
  href: string;
  scheme: string;
  host: string;
  pathname: string;
  query: string;
  fragment: FragmentAnalysis;
  extension: string;
  mimeHint: string;
  origin: string;
  cacheKey: string;
  isDataURI: boolean;
  isBlob: boolean;
}>();

expectTypeOf(MIME_MAP).toEqualTypeOf<Record<string, string>>();

// ─── Runtime tests ──────────────────────────────────────────────────

describe("parseURL", () => {
  describe("with a standard HTTPS URL", () => {
    test("should decompose scheme, host, pathname, query, and fragment", () => {
      const p = parseURL("https://example.com/path?q=1#top");
      expect(p.scheme).toBe("https:");
      expect(p.host).toBe("example.com");
      expect(p.pathname).toBe("/path");
      expect(p.query).toBe("?q=1");
      expect(p.fragment.type).toBe("anchor");
      expect(p.fragment.content.anchor).toBe("top");
      expect(p.origin).toBe("https://example.com");
      expect(p.cacheKey).toBe("https://example.com/path?q=1");
      expect(p.isDataURI).toBeFalse();
      expect(p.isBlob).toBeFalse();
    });
  });

  describe("with file extensions", () => {
    test("should extract extension and infer correct MIME type for common assets", () => {
      expect(parseURL("https://cdn.io/app.js").extension).toBe(".js");
      expect(parseURL("https://cdn.io/app.js").mimeHint).toBe("application/javascript");
      expect(parseURL("https://cdn.io/style.css").mimeHint).toBe("text/css");
      expect(parseURL("https://cdn.io/img.png").mimeHint).toBe("image/png");
      expect(parseURL("https://cdn.io/font.woff2").mimeHint).toBe("font/woff2");
    });

    test("should return empty extension and mimeHint for extensionless paths", () => {
      const p = parseURL("https://api.io/users/123");
      expect(p.extension).toBe("");
      expect(p.mimeHint).toBe("");
    });

    test("should normalize uppercase extensions to lowercase before MIME lookup", () => {
      expect(parseURL("https://x.com/FILE.JS").extension).toBe(".js");
      expect(parseURL("https://x.com/FILE.JS").mimeHint).toBe("application/javascript");
    });

    test("should resolve additional module and config extensions to correct MIME types", () => {
      expect(parseURL("https://x.com/f.cjs").mimeHint).toBe("application/javascript");
      expect(parseURL("https://x.com/f.mts").mimeHint).toBe("application/typescript");
      expect(parseURL("https://x.com/f.yaml").mimeHint).toBe("text/yaml");
      expect(parseURL("https://x.com/f.yml").mimeHint).toBe("text/yaml");
      expect(parseURL("https://x.com/f.txt").mimeHint).toBe("text/plain");
    });
  });

  describe("with special URI schemes", () => {
    test("should identify data: URIs and extract the embedded MIME type", () => {
      const p = parseURL("data:image/png;base64,abc123");
      expect(p.isDataURI).toBeTrue();
      expect(p.scheme).toBe("data:");
      expect(p.mimeHint).toBe("image/png");
      expect(p.host).toBe("");
    });

    test("should extract MIME type from data: URIs without base64 encoding", () => {
      const p = parseURL("data:text/plain,hello world");
      expect(p.isDataURI).toBeTrue();
      expect(p.mimeHint).toBe("text/plain");
    });

    test("should identify blob: URIs as blob but not data URI", () => {
      const p = parseURL("blob:https://example.com/uuid-here");
      expect(p.isBlob).toBeTrue();
      expect(p.isDataURI).toBeFalse();
    });
  });

  describe("with fragments", () => {
    test("should exclude the fragment from the cache key", () => {
      const a = parseURL("https://x.com/page#section");
      const b = parseURL("https://x.com/page#other");
      expect(a.cacheKey).toBe(b.cacheKey);
    });

    test("should detect a hash-route fragment and extract its path", () => {
      const p = parseURL("https://app.io/#/dashboard/settings");
      expect(p.fragment.type).toBe("route");
      expect(p.fragment.content.route?.path).toBe("/dashboard/settings");
    });
  });

  describe("with malformed input", () => {
    test("should return a best-effort shell with empty scheme and host", () => {
      const p = parseURL("not a url");
      expect(p.scheme).toBe("");
      expect(p.host).toBe("");
      expect(p.pathname).toBe("not a url");
      expect(p.fragment.type).toBe("empty");
    });
  });
});

describe("MIME_MAP", () => {
  test("should export a map with at least 28 extension-to-MIME entries", () => {
    expect(MIME_MAP[".js"]).toBe("application/javascript");
    expect(MIME_MAP[".wasm"]).toBe("application/wasm");
    expect(Object.keys(MIME_MAP).length).toBeGreaterThanOrEqual(28);
  });
});
