/**
 * Semantic Versioning Utilities
 * Implements SemVer 2.0.0 specification (https://semver.org/)
 * 
 * Version format: MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]
 * - MAJOR: incompatible API changes
 * - MINOR: backwards-compatible functionality added
 * - PATCH: backwards-compatible bug fixes
 * - PRERELEASE: optional pre-release versions (alpha, beta, rc)
 * - BUILD: optional build metadata
 */

/**
 * Represents a semantic version
 */
export interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  metadata?: string;
  raw: string;
}

/**
 * Version comparison result
 */
export type VersionComparison = -1 | 0 | 1;

/**
 * Parses a semantic version string into its components
 * 
 * @param versionString - Version string (e.g., "1.2.3", "1.2.3-alpha.1", "1.2.3+build.123")
 * @returns Parsed semantic version object
 * @throws Error if version string is invalid
 * 
 * @example
 * parseVersion("1.2.3") // { major: 1, minor: 2, patch: 3, raw: "1.2.3" }
 * parseVersion("1.2.3-alpha.1") // { major: 1, minor: 2, patch: 3, prerelease: "alpha.1", raw: "..." }
 */
export function parseVersion(versionString: string): SemanticVersion {
  const versionRegex =
    /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.-]+))?(?:\+([a-zA-Z0-9.-]+))?$/;
  const match = versionString.trim().match(versionRegex);

  if (!match) {
    throw new Error(
      `Invalid semantic version: "${versionString}". Expected format: MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]`
    );
  }

  const [, majorStr, minorStr, patchStr, prerelease, metadata] = match;

  return {
    major: parseInt(majorStr, 10),
    minor: parseInt(minorStr, 10),
    patch: parseInt(patchStr, 10),
    prerelease,
    metadata,
    raw: versionString,
  };
}

/**
 * Converts a SemanticVersion object back to a version string
 * 
 * @param version - Semantic version object
 * @returns Formatted version string
 * 
 * @example
 * formatVersion({ major: 1, minor: 2, patch: 3, raw: "1.2.3" }) // "1.2.3"
 */
export function formatVersion(version: SemanticVersion): string {
  let result = `${version.major}.${version.minor}.${version.patch}`;

  if (version.prerelease) {
    result += `-${version.prerelease}`;
  }

  if (version.metadata) {
    result += `+${version.metadata}`;
  }

  return result;
}

/**
 * Compares two semantic versions according to SemVer 2.0.0
 * 
 * @param v1 - First version (string or parsed)
 * @param v2 - Second version (string or parsed)
 * @returns -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
 * 
 * @example
 * compareVersions("1.0.0", "2.0.0") // -1
 * compareVersions("2.0.0", "2.0.0") // 0
 * compareVersions("2.1.0", "2.0.0") // 1
 * compareVersions("1.0.0", "1.0.0-alpha") // 1 (pre-release is lower)
 */
export function compareVersions(
  v1: string | SemanticVersion,
  v2: string | SemanticVersion
): VersionComparison {
  const version1 = typeof v1 === "string" ? parseVersion(v1) : v1;
  const version2 = typeof v2 === "string" ? parseVersion(v2) : v2;

  // Compare major.minor.patch
  if (version1.major !== version2.major) {
    return version1.major > version2.major ? 1 : -1;
  }

  if (version1.minor !== version2.minor) {
    return version1.minor > version2.minor ? 1 : -1;
  }

  if (version1.patch !== version2.patch) {
    return version1.patch > version2.patch ? 1 : -1;
  }

  // Either both have prerelease or neither do
  const hasPrerelease1 = !!version1.prerelease;
  const hasPrerelease2 = !!version2.prerelease;

  if (hasPrerelease1 !== hasPrerelease2) {
    // Release version is greater than pre-release
    return hasPrerelease1 ? -1 : 1;
  }

  // If both have prerelease, compare them
  if (hasPrerelease1 && hasPrerelease2) {
    const prereleaseCmp = comparePrereleases(
      version1.prerelease!,
      version2.prerelease!
    );
    if (prereleaseCmp !== 0) {
      return prereleaseCmp;
    }
  }

  // Versions are equal (metadata is ignored in comparison)
  return 0;
}

/**
 * Compares two pre-release version strings
 * 
 * @internal
 */
function comparePrereleases(pre1: string, pre2: string): VersionComparison {
  const parts1 = pre1.split(".");
  const parts2 = pre2.split(".");

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i];
    const part2 = parts2[i];

    if (part1 === undefined) {
      return -1; // v1 is shorter (lower)
    }

    if (part2 === undefined) {
      return 1; // v2 is shorter (v1 is higher)
    }

    const isNum1 = /^\d+$/.test(part1);
    const isNum2 = /^\d+$/.test(part2);

    if (isNum1 && isNum2) {
      const cmp = parseInt(part1, 10) - parseInt(part2, 10);
      if (cmp !== 0) {
        return cmp > 0 ? 1 : -1;
      }
    } else if (isNum1) {
      return -1; // Numbers are lower than strings
    } else if (isNum2) {
      return 1;
    } else if (part1 !== part2) {
      return part1 > part2 ? 1 : -1;
    }
  }

  return 0;
}

/**
 * Increments a semantic version
 * 
 * @param version - Current version (string or parsed)
 * @param type - Type of increment: "major", "minor", or "patch"
 * @returns New incremented version
 * 
 * @example
 * incrementVersion("1.2.3", "major") // "2.0.0"
 * incrementVersion("1.2.3", "minor") // "1.3.0"
 * incrementVersion("1.2.3", "patch") // "1.2.4"
 */
export function incrementVersion(
  version: string | SemanticVersion,
  type: "major" | "minor" | "patch"
): string {
  const current = typeof version === "string" ? parseVersion(version) : version;

  let newVersion: SemanticVersion;

  switch (type) {
    case "major":
      newVersion = {
        ...current,
        major: current.major + 1,
        minor: 0,
        patch: 0,
        prerelease: undefined,
        metadata: undefined,
      };
      break;

    case "minor":
      newVersion = {
        ...current,
        minor: current.minor + 1,
        patch: 0,
        prerelease: undefined,
        metadata: undefined,
      };
      break;

    case "patch":
      newVersion = {
        ...current,
        patch: current.patch + 1,
        prerelease: undefined,
        metadata: undefined,
      };
      break;
  }

  return formatVersion(newVersion);
}

/**
 * Creates a pre-release version
 * 
 * @param version - Base version (string or parsed)
 * @param prerelease - Pre-release identifier (e.g., "alpha.1", "beta", "rc.2")
 * @returns Pre-release version string
 * 
 * @example
 * createPrerelease("1.2.3", "alpha.1") // "1.2.3-alpha.1"
 * createPrerelease("1.2.3", "beta") // "1.2.3-beta"
 */
export function createPrerelease(
  version: string | SemanticVersion,
  prerelease: string
): string {
  const current = typeof version === "string" ? parseVersion(version) : version;

  if (!prerelease.match(/^[a-zA-Z0-9.-]+$/)) {
    throw new Error(
      `Invalid pre-release identifier: "${prerelease}". Must contain only alphanumeric characters and dots.`
    );
  }

  const newVersion: SemanticVersion = {
    ...current,
    prerelease,
    metadata: undefined,
  };

  return formatVersion(newVersion);
}

/**
 * Adds build metadata to a version
 * 
 * @param version - Current version (string or parsed)
 * @param metadata - Build metadata identifier
 * @returns Version with metadata
 * 
 * @example
 * addMetadata("1.2.3", "build.123") // "1.2.3+build.123"
 */
export function addMetadata(
  version: string | SemanticVersion,
  metadata: string
): string {
  const current = typeof version === "string" ? parseVersion(version) : version;

  if (!metadata.match(/^[a-zA-Z0-9.-]+$/)) {
    throw new Error(
      `Invalid metadata: "${metadata}". Must contain only alphanumeric characters and dots.`
    );
  }

  const newVersion: SemanticVersion = {
    ...current,
    metadata,
  };

  return formatVersion(newVersion);
}

/**
 * Checks if a version satisfies a version range specification
 * 
 * Uses Bun's native semver implementation when available for better performance.
 * Falls back to custom implementation for additional range types.
 * 
 * Supports:
 * - Exact: "1.2.3"
 * - Caret: "^1.2.3" (allows minor/patch changes)
 * - Tilde: "~1.2.3" (allows patch changes)
 * - Comparison: ">=1.2.0", ">1.0.0", "<=2.0.0", "<2.0.0"
 * - Range: "1.0.0 - 2.0.0"
 * 
 * @param version - Version to check
 * @param range - Version range specification
 * @returns True if version satisfies the range
 * 
 * @example
 * satisfiesRange("1.2.3", "^1.0.0") // true
 * satisfiesRange("2.0.0", "^1.0.0") // false
 * satisfiesRange("1.2.5", "~1.2.0") // true
 * satisfiesRange("1.3.0", "~1.2.0") // false
 */
export function satisfiesRange(version: string, range: string): boolean {
  // Try using Bun's native semver implementation first (more performant)
  try {
    if (typeof Bun !== "undefined") {
      const bunSemver = (Bun as any).semver;
      if (bunSemver && typeof bunSemver.satisfies === "function") {
        return bunSemver.satisfies(version, range);
      }
    }
  } catch (error) {
    // Fall through to manual implementation
  }

  // Fallback to custom implementation for edge cases or when Bun.semver unavailable
  const v = parseVersion(version);

  // Exact version
  if (!/[~^><=\-\s]/.test(range)) {
    return compareVersions(version, range) === 0;
  }

  // Caret range (^)
  if (range.startsWith("^")) {
    const baseVersion = parseVersion(range.slice(1));
    const cmp = compareVersions(v, baseVersion);

    if (cmp < 0) return false;

    if (baseVersion.major === 0) {
      // 0.x.y - only patch changes allowed
      return v.major === 0 && v.minor === baseVersion.minor;
    } else {
      // x.y.z - minor and patch changes allowed
      return v.major === baseVersion.major;
    }
  }

  // Tilde range (~)
  if (range.startsWith("~")) {
    const baseVersion = parseVersion(range.slice(1));
    const cmp = compareVersions(v, baseVersion);

    if (cmp < 0) return false;

    return (
      v.major === baseVersion.major && v.minor === baseVersion.minor
    );
  }

  // Comparison operators
  if (range.startsWith(">=")) {
    return compareVersions(version, range.slice(2)) >= 0;
  }

  if (range.startsWith(">")) {
    return compareVersions(version, range.slice(1)) > 0;
  }

  if (range.startsWith("<=")) {
    return compareVersions(version, range.slice(2)) <= 0;
  }

  if (range.startsWith("<")) {
    return compareVersions(version, range.slice(1)) < 0;
  }

  // Range (x.y.z - a.b.c)
  if (range.includes(" - ")) {
    const [start, end] = range.split(" - ").map((s) => s.trim());
    return (
      compareVersions(version, start) >= 0 &&
      compareVersions(version, end) <= 0
    );
  }

  throw new Error(`Unsupported version range: "${range}"`);
}

/**
 * Gets the current version from package.json
 * 
 * @internal
 */
export function getCurrentVersion(): string {
  try {
    const packageJson = require("../../package.json");
    return packageJson.version || "0.0.0";
  } catch (error) {
    return "0.0.0";
  }
}

/**
 * Validates if a string is a valid semantic version
 * 
 * @param versionString - Version string to validate
 * @returns True if valid semver
 * 
 * @example
 * isValidVersion("1.2.3") // true
 * isValidVersion("1.2") // false
 * isValidVersion("v1.2.3") // false
 */
export function isValidVersion(versionString: string): boolean {
  try {
    parseVersion(versionString);
    return true;
  } catch {
    return false;
  }
}
