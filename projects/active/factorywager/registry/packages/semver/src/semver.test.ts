#!/usr/bin/env bun
import { describe, it, expect } from "bun:test";

// SemVer utilities
function parse(version: string): { major: number; minor: number; patch: number; prerelease?: string } {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  if (!match) throw new Error(`Invalid version: ${version}`);
  return {
    major: parseInt(match[1]),
    minor: parseInt(match[2]),
    patch: parseInt(match[3]),
    prerelease: match[4],
  };
}

function compare(a: string, b: string): number {
  const va = parse(a);
  const vb = parse(b);
  
  if (va.major !== vb.major) return va.major - vb.major;
  if (va.minor !== vb.minor) return va.minor - vb.minor;
  if (va.patch !== vb.patch) return va.patch - vb.patch;
  
  // Prerelease versions are lower than release versions
  if (va.prerelease && !vb.prerelease) return -1;
  if (!va.prerelease && vb.prerelease) return 1;
  if (va.prerelease && vb.prerelease) {
    return va.prerelease.localeCompare(vb.prerelease);
  }
  
  return 0;
}

function satisfies(version: string, range: string): boolean {
  if (range.startsWith('^')) {
    const base = parse(range.slice(1));
    const v = parse(version);
    if (v.major !== base.major) return false;
    if (v.major === 0) {
      return v.minor >= base.minor;
    }
    return v.minor >= base.minor || (v.minor === base.minor && v.patch >= base.patch);
  }
  
  if (range.startsWith('~')) {
    const base = parse(range.slice(1));
    const v = parse(version);
    return v.major === base.major && v.minor === base.minor && v.patch >= base.patch;
  }
  
  return version === range;
}

function increment(version: string, type: 'major' | 'minor' | 'patch'): string {
  const v = parse(version);
  switch (type) {
    case 'major':
      return `${v.major + 1}.0.0`;
    case 'minor':
      return `${v.major}.${v.minor + 1}.0`;
    case 'patch':
      return `${v.major}.${v.minor}.${v.patch + 1}`;
  }
}

describe("SemVer", () => {
  describe("parse", () => {
    it("should parse simple versions", () => {
      const v = parse("1.2.3");
      expect(v.major).toBe(1);
      expect(v.minor).toBe(2);
      expect(v.patch).toBe(3);
    });

    it("should parse versions with prerelease", () => {
      const v = parse("2.0.0-beta.1");
      expect(v.major).toBe(2);
      expect(v.prerelease).toBe("beta.1");
    });

    it("should throw on invalid versions", () => {
      expect(() => parse("1.2")).toThrow();
      expect(() => parse("1.2.3.4")).toThrow();
      expect(() => parse("invalid")).toThrow();
    });
  });

  describe("compare", () => {
    it("should compare major versions", () => {
      expect(compare("2.0.0", "1.0.0")).toBeGreaterThan(0);
      expect(compare("1.0.0", "2.0.0")).toBeLessThan(0);
    });

    it("should compare minor versions", () => {
      expect(compare("1.2.0", "1.1.0")).toBeGreaterThan(0);
      expect(compare("1.1.0", "1.2.0")).toBeLessThan(0);
    });

    it("should compare patch versions", () => {
      expect(compare("1.0.2", "1.0.1")).toBeGreaterThan(0);
    });

    it("should consider prerelease lower than release", () => {
      expect(compare("1.0.0-beta", "1.0.0")).toBeLessThan(0);
      expect(compare("1.0.0", "1.0.0-beta")).toBeGreaterThan(0);
    });

    it("should return 0 for equal versions", () => {
      expect(compare("1.2.3", "1.2.3")).toBe(0);
    });
  });

  describe("satisfies", () => {
    it("should handle caret (^) ranges", () => {
      expect(satisfies("1.2.3", "^1.0.0")).toBe(true);
      expect(satisfies("1.5.0", "^1.0.0")).toBe(true);
      expect(satisfies("2.0.0", "^1.0.0")).toBe(false);
    });

    it("should handle tilde (~) ranges", () => {
      expect(satisfies("1.2.3", "~1.2.0")).toBe(true);
      expect(satisfies("1.2.5", "~1.2.0")).toBe(true);
      expect(satisfies("1.3.0", "~1.2.0")).toBe(false);
    });

    it("should handle exact versions", () => {
      expect(satisfies("1.2.3", "1.2.3")).toBe(true);
      expect(satisfies("1.2.4", "1.2.3")).toBe(false);
    });
  });

  describe("increment", () => {
    it("should increment major version", () => {
      expect(increment("1.2.3", "major")).toBe("2.0.0");
    });

    it("should increment minor version", () => {
      expect(increment("1.2.3", "minor")).toBe("1.3.0");
    });

    it("should increment patch version", () => {
      expect(increment("1.2.3", "patch")).toBe("1.2.4");
    });
  });
});
