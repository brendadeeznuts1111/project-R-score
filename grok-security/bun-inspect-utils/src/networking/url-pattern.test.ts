/**
 * [TEST][URL-PATTERN][UNIT]{BUN-NATIVE}
 * Tests for URLPattern utilities
 */

import { describe, it, expect } from "bun:test";
import {
  URLPatternMatcher,
  URLPatterns,
  URLPatternValidator,
  type URLPatternResult,
} from "./url-pattern";

describe("[NETWORKING][URL-PATTERN] url-pattern", () => {
  describe("[1.2.0.0] URLPatternMatcher", () => {
    it("should create pattern from string", () => {
      const matcher = new URLPatternMatcher("https://example.com/api/:id");
      expect(matcher).toBeDefined();
    });

    it("should create pattern from URLPatternInit", () => {
      const matcher = new URLPatternMatcher({
        protocol: "https",
        hostname: "example.com",
        pathname: "/api/:id",
      });
      expect(matcher).toBeDefined();
    });

    it("should throw on invalid pattern", () => {
      expect(() => {
        new URLPatternMatcher({
          protocol: "ht!tp",
        });
      }).toThrow();
    });
  });

  describe("[1.2.2.0] test()", () => {
    it("should match valid URLs", () => {
      const matcher = new URLPatternMatcher({
        pathname: "/api/:version/:resource",
      });
      expect(matcher.test("/api/v1/users")).toBe(true);
      expect(matcher.test("/api/v2/posts")).toBe(true);
    });

    it("should reject non-matching URLs", () => {
      const matcher = new URLPatternMatcher({
        pathname: "/api/:version/:resource",
      });
      expect(matcher.test("/admin/users")).toBe(false);
      expect(matcher.test("/api")).toBe(false);
    });

    it("should handle protocol matching", () => {
      const matcher = new URLPatternMatcher({
        protocol: "https",
        hostname: "example.com",
      });
      expect(matcher.test("https://example.com")).toBe(true);
      expect(matcher.test("http://example.com")).toBe(false);
    });
  });

  describe("[1.2.3.0] exec()", () => {
    it("should extract matched groups", () => {
      const matcher = new URLPatternMatcher({
        pathname: "/api/:version/:resource/:id",
      });
      const result = matcher.exec("/api/v1/users/123");
      expect(result).toBeDefined();
      expect(result?.pathname.groups.version).toBe("v1");
      expect(result?.pathname.groups.resource).toBe("users");
      expect(result?.pathname.groups.id).toBe("123");
    });

    it("should return null for non-matching URLs", () => {
      const matcher = new URLPatternMatcher({
        pathname: "/api/:version/:resource",
      });
      const result = matcher.exec("/admin/users");
      expect(result).toBeNull();
    });

    it("should handle optional groups", () => {
      const matcher = new URLPatternMatcher({
        pathname: "/files/:path*",
      });
      const result = matcher.exec("/files/docs/readme.md");
      expect(result).toBeDefined();
    });
  });

  describe("[1.2.4.0] getProperties()", () => {
    it("should return all pattern properties", () => {
      const matcher = new URLPatternMatcher({
        protocol: "https",
        hostname: "example.com",
        pathname: "/api/:id",
      });
      const props = matcher.getProperties();
      expect(props.protocol).toBeDefined();
      expect(props.hostname).toBeDefined();
      expect(props.pathname).toBeDefined();
    });
  });

  describe("[1.2.5.0] hasRegExpGroups()", () => {
    it("should detect regex groups", () => {
      const matcher = new URLPatternMatcher({
        pathname: "/api/:id(\\d+)",
      });
      expect(matcher.hasRegExpGroups()).toBeDefined();
    });
  });

  describe("[1.3.0.0] URLPatterns presets", () => {
    it("should match REST API pattern", () => {
      const matcher = URLPatterns.restAPI("/api");
      expect(matcher.test("/api/v1/users/123")).toBe(true);
      expect(matcher.test("/api/v2/posts")).toBe(true);
    });

    it("should match file download pattern", () => {
      const matcher = URLPatterns.fileDownload("/downloads");
      expect(matcher.test("/downloads/file.pdf")).toBe(true);
      expect(matcher.test("/downloads/image.png")).toBe(true);
    });

    it("should match hash routing pattern", () => {
      const matcher = URLPatterns.hashRouting();
      expect(matcher.test("/#/dashboard")).toBe(true);
      expect(matcher.test("/#/settings")).toBe(true);
    });
  });

  describe("[1.4.0.0] URLPatternValidator", () => {
    it("should register and test patterns", () => {
      const validator = new URLPatternValidator();
      validator.register("api", URLPatterns.restAPI("/api"));
      validator.register("files", URLPatterns.fileDownload("/downloads"));

      const matches = validator.testAll("/api/v1/users");
      expect(matches).toContain("api");
      expect(matches).not.toContain("files");
    });

    it("should find first matching pattern", () => {
      const validator = new URLPatternValidator();
      validator.register("api", URLPatterns.restAPI("/api"));
      validator.register("files", URLPatterns.fileDownload("/downloads"));

      const match = validator.findFirst("/api/v1/users");
      expect(match).toBe("api");
    });

    it("should extract from first matching pattern", () => {
      const validator = new URLPatternValidator();
      validator.register("api", URLPatterns.restAPI("/api"));

      const result = validator.extractFirst("/api/v1/users/123");
      expect(result).toBeDefined();
      expect(result?.pathname.groups.version).toBe("v1");
    });

    it("should return null when no patterns match", () => {
      const validator = new URLPatternValidator();
      validator.register("api", URLPatterns.restAPI("/api"));

      const result = validator.extractFirst("/admin/users");
      expect(result).toBeNull();
    });
  });

  describe("[1.2.6.0] toString()", () => {
    it("should return pattern string representation", () => {
      const matcher = new URLPatternMatcher("/api/:id");
      const str = matcher.toString();
      expect(str).toBeDefined();
      expect(typeof str).toBe("string");
    });
  });
});

