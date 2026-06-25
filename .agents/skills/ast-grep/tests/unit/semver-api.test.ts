/**
 * Parity tests for Bun.semver — mirrors https://bun.com/docs/runtime/semver
 */
import { describe, expect, test } from "bun:test";
import { semver } from "bun";
import {
  compareVersions,
  isVulnerable,
  SemverMatcher,
  sortVersions,
} from "../../scripts/scan/transpiler/semver-matcher.ts";

describe("Bun.semver.satisfies (official examples)", () => {
  const cases: Array<[string, string, boolean]> = [
    ["1.0.0", "^1.0.0", true],
    ["1.0.0", "^1.0.1", false],
    ["1.0.0", "~1.0.0", true],
    ["1.0.0", "~1.0.1", false],
    ["1.0.0", "1.0.0", true],
    ["1.0.0", "1.0.1", false],
    ["1.0.1", "1.0.0", false],
    ["1.0.0", "1.0.x", true],
    ["1.0.0", "1.x.x", true],
    ["1.0.0", "x.x.x", true],
    ["1.0.0", "1.0.0 - 2.0.0", true],
    ["1.0.0", "1.0.0 - 1.0.1", true],
  ];

  for (const [version, range, expected] of cases) {
    test(`satisfies(${version}, ${range}) → ${expected}`, () => {
      expect(semver.satisfies(version, range)).toBe(expected);
      expect(isVulnerable(version, range)).toBe(expected);
      expect(Bun.semver.satisfies(version, range)).toBe(expected);
    });
  }

  test("invalid version → false", () => {
    expect(semver.satisfies("not-a-version", "^1.0.0")).toBe(false);
  });
});

describe("Bun.semver.order (official examples)", () => {
  test("pairwise comparisons", () => {
    expect(semver.order("1.0.0", "1.0.0")).toBe(0);
    expect(semver.order("1.0.0", "1.0.1")).toBe(-1);
    expect(semver.order("1.0.1", "1.0.0")).toBe(1);
    expect(compareVersions("1.0.0", "1.0.1")).toBe(-1);
  });

  test("filterSatisfying and latestSatisfying", () => {
    expect(SemverMatcher.filterSatisfying(["1.0.0", "1.5.0", "0.9.0"], "^1.0.0")).toEqual([
      "1.0.0",
      "1.5.0",
    ]);
    expect(SemverMatcher.latestSatisfying(["1.0.0", "1.5.0", "1.0.1"], "^1.0.0")).toBe("1.5.0");
  });

  test("sort prereleases before releases", () => {
    const unsorted = ["1.0.0", "1.0.1", "1.0.0-alpha", "1.0.0-beta", "1.0.0-rc"];
    expect(sortVersions(unsorted)).toEqual([
      "1.0.0-alpha",
      "1.0.0-beta",
      "1.0.0-rc",
      "1.0.0",
      "1.0.1",
    ]);
  });
});