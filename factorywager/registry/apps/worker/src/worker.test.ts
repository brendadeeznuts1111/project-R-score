#!/usr/bin/env bun
import { describe, it, expect } from "bun:test";

// CDN cache control utilities
function getCacheHeaders(contentType: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
  };

  // Immutable tarballs - cache forever
  if (contentType === "application/octet-stream") {
    headers["Cache-Control"] = "public, max-age=31536000, immutable";
    headers["CDN-Cache-Control"] = "public, max-age=31536000";
  }
  // Package metadata - short cache
  else if (contentType === "application/json") {
    headers["Cache-Control"] = "public, max-age=60";
    headers["CDN-Cache-Control"] = "public, max-age=60";
  }
  // Default - no cache
  else {
    headers["Cache-Control"] = "no-cache";
  }

  return headers;
}

function isTarballRequest(path: string): boolean {
  return path.endsWith(".tgz") || path.endsWith(".tar.gz");
}

function extractPackageInfo(path: string): { name: string; version?: string } | null {
  // /cdn/@scope/name/-/name-1.0.0.tgz
  const match = path.match(/\/@([^/]+)\/([^/]+)\/-\/[^/]+-(.+)\.tgz$/);
  if (match) {
    return { name: `@${match[1]}/${match[2]}`, version: match[3] };
  }
  
  // /cdn/name/-/name-1.0.0.tgz
  const simpleMatch = path.match(/\/([^/]+)\/-\/[^/]+-(.+)\.tgz$/);
  if (simpleMatch) {
    return { name: simpleMatch[1], version: simpleMatch[2] };
  }
  
  return null;
}

describe("CDN Worker", () => {
  describe("cache headers", () => {
    it("should set immutable cache for tarballs", () => {
      const headers = getCacheHeaders("application/octet-stream");
      expect(headers["Cache-Control"]).toContain("immutable");
      expect(headers["Cache-Control"]).toContain("max-age=31536000");
    });

    it("should set short cache for JSON metadata", () => {
      const headers = getCacheHeaders("application/json");
      expect(headers["Cache-Control"]).toContain("max-age=60");
    });

    it("should set CORS headers", () => {
      const headers = getCacheHeaders("application/json");
      expect(headers["Access-Control-Allow-Origin"]).toBe("*");
    });
  });

  describe("request parsing", () => {
    it("should identify tarball requests", () => {
      expect(isTarballRequest("/cdn/pkg/-/pkg-1.0.0.tgz")).toBe(true);
      expect(isTarballRequest("/cdn/pkg/-/pkg-1.0.0.tar.gz")).toBe(true);
      expect(isTarballRequest("/npm/pkg")).toBe(false);
    });

    it("should extract scoped package info", () => {
      const info = extractPackageInfo("/cdn/@factorywager/core/-/core-2.0.0.tgz");
      expect(info).toEqual({ name: "@factorywager/core", version: "2.0.0" });
    });

    it("should extract unscoped package info", () => {
      const info = extractPackageInfo("/cdn/lodash/-/lodash-4.17.21.tgz");
      expect(info).toEqual({ name: "lodash", version: "4.17.21" });
    });

    it("should return null for invalid paths", () => {
      expect(extractPackageInfo("/invalid/path")).toBeNull();
    });
  });
});
