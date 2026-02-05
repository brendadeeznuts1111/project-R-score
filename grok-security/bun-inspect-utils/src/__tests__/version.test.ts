// [1.0.0.0] Version System Tests - Bun Native
// Tests for semantic versioning, parsing, and comparison

import { describe, it, expect } from "bun:test";
import {
  VersionParser,
  VersionComparator,
  VersionManager,
  BuildVersionGenerator,
} from "../version";

describe("VersionParser", () => {
  it("should parse basic semantic version", () => {
    const version = VersionParser.parse("1.0.0");
    expect(version.major).toBe(1);
    expect(version.minor).toBe(0);
    expect(version.patch).toBe(0);
  });

  it("should parse version with build metadata", () => {
    const version = VersionParser.parse("1.0.0+abc123");
    expect(version.major).toBe(1);
    expect(version.buildMetadata).toBe("abc123");
  });

  it("should parse version with prerelease", () => {
    const version = VersionParser.parse("1.0.0-alpha");
    expect(version.prerelease).toBe("alpha");
  });

  it("should parse complex version", () => {
    const version = VersionParser.parse("2.1.3-beta.1+build.123");
    expect(version.major).toBe(2);
    expect(version.minor).toBe(1);
    expect(version.patch).toBe(3);
    expect(version.prerelease).toBe("beta.1");
    expect(version.buildMetadata).toBe("build.123");
  });

  it("should throw on invalid version", () => {
    expect(() => VersionParser.parse("invalid")).toThrow();
    expect(() => VersionParser.parse("1.0")).toThrow();
  });

  it("should format version correctly", () => {
    const version = {
      major: 1,
      minor: 2,
      patch: 3,
      prerelease: "alpha",
      buildMetadata: "abc123",
    };
    const formatted = VersionParser.format(version);
    expect(formatted).toBe("1.2.3-alpha+abc123");
  });
});

describe("VersionComparator", () => {
  it("should compare major versions", () => {
    const v1 = VersionParser.parse("1.0.0");
    const v2 = VersionParser.parse("2.0.0");
    expect(VersionComparator.isLess(v1, v2)).toBe(true);
    expect(VersionComparator.isGreater(v2, v1)).toBe(true);
  });

  it("should compare minor versions", () => {
    const v1 = VersionParser.parse("1.0.0");
    const v2 = VersionParser.parse("1.1.0");
    expect(VersionComparator.isLess(v1, v2)).toBe(true);
  });

  it("should compare patch versions", () => {
    const v1 = VersionParser.parse("1.0.0");
    const v2 = VersionParser.parse("1.0.1");
    expect(VersionComparator.isLess(v1, v2)).toBe(true);
  });

  it("should handle prerelease versions", () => {
    const v1 = VersionParser.parse("1.0.0-alpha");
    const v2 = VersionParser.parse("1.0.0");
    expect(VersionComparator.isLess(v1, v2)).toBe(true);
  });

  it("should handle equal versions", () => {
    const v1 = VersionParser.parse("1.0.0");
    const v2 = VersionParser.parse("1.0.0");
    expect(VersionComparator.isEqual(v1, v2)).toBe(true);
  });

  it("should ignore build metadata in comparison", () => {
    const v1 = VersionParser.parse("1.0.0+abc123");
    const v2 = VersionParser.parse("1.0.0+def456");
    expect(VersionComparator.isEqual(v1, v2)).toBe(true);
  });
});

describe("VersionManager", () => {
  it("should get package version", () => {
    const version = VersionManager.getPackageVersion();
    expect(version).toBeTruthy();
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("should get build metadata", () => {
    const metadata = VersionManager.getBuildMetadata();
    expect(metadata).toBeTruthy();
  });

  it("should get full version", () => {
    const fullVersion = VersionManager.getFullVersion();
    expect(fullVersion).toContain("+");
  });

  it("should get version object", () => {
    const versionObj = VersionManager.getVersionObject();
    expect(versionObj.major).toBeGreaterThanOrEqual(0);
    expect(versionObj.minor).toBeGreaterThanOrEqual(0);
    expect(versionObj.patch).toBeGreaterThanOrEqual(0);
  });
});

describe("BuildVersionGenerator", () => {
  it("should generate version constant", () => {
    const constant = BuildVersionGenerator.generateConstant();
    expect(constant).toContain("BUILD_VERSION");
    expect(constant).toContain("BUILD_TIMESTAMP");
    expect(constant).toContain("export const");
  });

  it("should generate version JSON", () => {
    const json = BuildVersionGenerator.generateJSON();
    const parsed = JSON.parse(json);
    expect(parsed.version).toBeTruthy();
    expect(parsed.timestamp).toBeTruthy();
    expect(parsed.major).toBeGreaterThanOrEqual(0);
  });

  it("should generate header", () => {
    const header = BuildVersionGenerator.generateHeader();
    expect(header).toContain("BUILD VERSION");
    expect(header).toContain("BUILD TIMESTAMP");
  });
});

