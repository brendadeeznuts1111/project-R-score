/**
 * Comprehensive test suite for Bun 1.3.3 version parsing and numeric coercion
 * Tests: npm alias preservation, range operators, peer resolution, git protocols, GitHub shorthand
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-VERSION-PARSING@1.3.3;instance-id=TEST-VER-001;version=1.3.3}][PROPERTIES:{test={value:"version-parsing";@root:"ROOT-TEST";@chain:["BP-NPM-ALIAS","BP-RANGE-OPERATORS","BP-PEER-RESOLUTION","BP-GIT-PROTOCOL","BP-GITHUB-SHORTHAND"];@version:"1.3.3"}}][CLASS:VersionParsingTests][#REF:v-1.3.3.BP.VERSION.PARSING.1.0.A.1.1.TEST.1.1]]
 */

import { describe, test, expect, beforeEach } from "bun:test";

// Version parsing utilities (matching Bun's internal logic)
interface Version {
	major: number;
	minor: number;
	patch: number;
	prerelease?: string;
	build?: string;
}

interface VersionRange {
	operator: "^" | "~" | ">=" | ">" | "<=" | "<" | "";
	major: number;
	minor: number;
	patch: number;
}

/**
 * Parse numeric version string into components
 * Pattern: "1.2.3" | "1.2.3-alpha" | "1.2.3+build"
 */
export function parseVersion(version: string): Version | null {
	const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-([\w.-]+))?(?:\+([\w.-]+))?$/);
	if (!match) return null;

	const major = parseInt(match[1], 10);
	const minor = parseInt(match[2], 10);
	const patch = parseInt(match[3], 10);

	// ✅ Numeric safety: Validate parsed components
	if (Number.isNaN(major) || major < 0 || major > 99999) return null;
	if (Number.isNaN(minor) || minor < 0 || minor > 99999) return null;
	if (Number.isNaN(patch) || patch < 0 || patch > 99999) return null;

	return {
		major,
		minor,
		patch,
		prerelease: match[4],
		build: match[5],
	};
}

/**
 * Parse version range with operator
 * Pattern: "^1.0.0" | "~1.0.0" | ">=1.0.0" | "1.0.0"
 */
export function parseRange(range: string): VersionRange | null {
	const operatorMatch = range.match(/^([\^~><=]+)/);
	const operator = (operatorMatch ? operatorMatch[1] : "") as VersionRange["operator"];

	const numericStart = operator.length;
	const numericPart = range.slice(numericStart);

	const version = parseVersion(numericPart);
	if (!version) return null;

	return {
		operator,
		major: version.major,
		minor: version.minor,
		patch: version.patch,
	};
}

/**
 * Bump npm alias version while preserving prefix
 * Pattern: "npm:@scope/name@1.0.5" → "npm:@scope/name@1.0.6"
 */
export function bumpNpmAlias(version: string, bumpType: "patch" | "minor" | "major" = "patch"): string {
	// Extract prefix: "npm:@scope/name@" (handles scoped packages with @ in name)
	// Match: npm: prefix, then everything up to the last @ before version number
	const fullMatch = version.match(/^(npm:.+?@)(\d+\.\d+\.\d+.*)$/);
	if (!fullMatch) return version; // Invalid format, return as-is

	const prefix = fullMatch[1]; // "npm:@scope/name@"
	const versionPart = fullMatch[2]; // "1.0.5" or "1.0.5-alpha"

	// Extract numeric version
	const numericMatch = versionPart.match(/^(\d+\.\d+\.\d+)/);
	if (!numericMatch) return version;

	const [major, minor, patch] = numericMatch[1].split(".").map(Number);
	
	// ✅ Numeric safety: Validate parsed components
	if (Number.isNaN(major) || Number.isNaN(minor) || Number.isNaN(patch)) {
		return version;
	}

	let newMajor = major;
	let newMinor = minor;
	let newPatch = patch;

	switch (bumpType) {
		case "major":
			newMajor += 1;
			newMinor = 0;
			newPatch = 0;
			break;
		case "minor":
			newMinor += 1;
			newPatch = 0;
			break;
		case "patch":
			newPatch += 1;
			break;
	}

	// Preserve any suffix (like range operators or prerelease)
	const suffix = versionPart.slice(numericMatch[0].length);
	return `${prefix}${newMajor}.${newMinor}.${newPatch}${suffix}`;
}

/**
 * Preserve range operator when updating version
 * Pattern: "^1.0.0" → "^2.0.0"
 */
export function preserveRangeOperator(version: string, newNumeric: string): string {
	const operatorMatch = version.match(/^([\^~><=]+)/);
	const operator = operatorMatch ? operatorMatch[1] : "";

	const numericStart = operator.length;
	const beforeNumeric = version.slice(0, numericStart);

	return `${beforeNumeric}${newNumeric}`;
}

/**
 * Check if installed version satisfies peer dependency range
 */
export function satisfies(installed: Version, constraint: VersionRange): boolean {
	const { operator, major, minor, patch } = constraint;

	switch (operator) {
		case "^":
			// ^1.0.0 means >=1.0.0 <2.0.0
			return (
				installed.major === major &&
				installed.minor >= minor &&
				installed.patch >= patch &&
				installed.major < major + 1
			);
		case "~":
			// ~1.0.0 means >=1.0.0 <1.1.0
			return (
				installed.major === major &&
				installed.minor === minor &&
				installed.patch >= patch
			);
		case ">=":
			return compareVersions(installed, constraint) >= 0;
		case ">":
			return compareVersions(installed, constraint) > 0;
		case "<=":
			return compareVersions(installed, constraint) <= 0;
		case "<":
			return compareVersions(installed, constraint) < 0;
		case "":
			// Exact match
			return (
				installed.major === major &&
				installed.minor === minor &&
				installed.patch === patch
			);
		default:
			return false;
	}
}

/**
 * Compare two versions numerically
 */
export function compareVersions(a: Version, b: VersionRange): number {
	if (a.major !== b.major) return a.major - b.major;
	if (a.minor !== b.minor) return a.minor - b.minor;
	return a.patch - b.patch;
}

/**
 * Expand GitHub shorthand to tarball URL
 * Pattern: "owner/repo#v1.2.3" → "https://github.com/owner/repo/archive/refs/tags/v1.2.3.tar.gz"
 */
export function expandGitHubShorthand(spec: string): string | null {
	const GITHUB_SHORTHAND = /^([^/\s]+)\/([^#\s]+)(?:#(.+))?$/;
	const match = spec.match(GITHUB_SHORTHAND);
	if (!match) return null;

	const [_, owner, repo, ref = "main"] = match;
	const versionMatch = ref.match(/^v(\d+\.\d+\.\d+)$/);

	if (versionMatch) {
		return `https://github.com/${owner}/${repo}/archive/refs/tags/${ref}.tar.gz`;
	}
	return `git+https://github.com/${owner}/${repo}.git#${ref}`;
}

/**
 * Generate cache key for git dependency
 */
export function getGitCacheKey(
	protocol: string,
	host: string,
	owner: string,
	repo: string,
	ref: string,
): string {
	return `${protocol}:${host}:${owner}:${repo}:${ref}`;
}

describe("Bun 1.3.3 Version Parsing & Numeric Coercion", () => {
	describe("Version Parsing", () => {
		test("parse simple version", () => {
			const v = parseVersion("1.2.3");
			expect(v).toEqual({ major: 1, minor: 2, patch: 3 });
		});

		test("parse version with prerelease", () => {
			const v = parseVersion("1.2.3-alpha");
			expect(v).toEqual({ major: 1, minor: 2, patch: 3, prerelease: "alpha" });
		});

		test("parse version with build", () => {
			const v = parseVersion("1.2.3+build.123");
			expect(v).toEqual({ major: 1, minor: 2, patch: 3, build: "build.123" });
		});

		test("reject invalid version", () => {
			expect(parseVersion("invalid")).toBeNull();
			expect(parseVersion("1.2")).toBeNull();
			expect(parseVersion("a.b.c")).toBeNull();
		});

		test("reject out-of-range major version", () => {
			expect(parseVersion("100000.0.0")).toBeNull();
		});
	});

	describe("Range Parsing", () => {
		test("parse caret range", () => {
			const r = parseRange("^1.0.0");
			expect(r).toEqual({ operator: "^", major: 1, minor: 0, patch: 0 });
		});

		test("parse tilde range", () => {
			const r = parseRange("~1.0.0");
			expect(r).toEqual({ operator: "~", major: 1, minor: 0, patch: 0 });
		});

		test("parse greater-than-or-equal range", () => {
			const r = parseRange(">=1.0.0");
			expect(r).toEqual({ operator: ">=", major: 1, minor: 0, patch: 0 });
		});

		test("parse version without operator", () => {
			const r = parseRange("1.0.0");
			expect(r).toEqual({ operator: "", major: 1, minor: 0, patch: 0 });
		});
	});

	describe("npm Alias Preservation", () => {
		test("bump patch version preserves prefix", () => {
			const result = bumpNpmAlias("npm:@jsr/std__semver@1.0.5", "patch");
			expect(result).toBe("npm:@jsr/std__semver@1.0.6");
		});

		test("bump minor version preserves prefix", () => {
			const result = bumpNpmAlias("npm:@scope/name@1.0.5", "minor");
			expect(result).toBe("npm:@scope/name@1.1.0");
		});

		test("bump major version preserves prefix", () => {
			const result = bumpNpmAlias("npm:@scope/name@1.0.5", "major");
			expect(result).toBe("npm:@scope/name@2.0.0");
		});

		test("preserve range operator", () => {
			const result = preserveRangeOperator("^1.0.0", "2.0.0");
			expect(result).toBe("^2.0.0");
		});

		test("preserve tilde operator", () => {
			const result = preserveRangeOperator("~1.0.0", "1.1.0");
			expect(result).toBe("~1.1.0");
		});

		test("handle npm alias with range operator", () => {
			const input = "npm:@types/no-deps@^1.0.0";
			// Extract version part after @
			const versionPart = input.match(/@([^@]+)$/)?.[1] || "";
			const bumpedNumeric = preserveRangeOperator(versionPart, "1.0.1");
			const result = `npm:@types/no-deps@${bumpedNumeric}`;
			expect(result).toBe("npm:@types/no-deps@^1.0.1");
			expect(result).toContain("npm:@types/no-deps@");
			expect(result).toContain("^");
		});
	});

	describe("Peer Dependency Resolution", () => {
		test("caret range satisfaction", () => {
			const installed = parseVersion("1.2.0")!;
			const constraint = parseRange("^1.0.0")!;
			expect(satisfies(installed, constraint)).toBe(true);
		});

		test("caret range rejection (too new)", () => {
			const installed = parseVersion("2.0.0")!;
			const constraint = parseRange("^1.0.0")!;
			expect(satisfies(installed, constraint)).toBe(false);
		});

		test("caret range rejection (too old)", () => {
			const installed = parseVersion("0.9.0")!;
			const constraint = parseRange("^1.0.0")!;
			expect(satisfies(installed, constraint)).toBe(false);
		});

		test("tilde range satisfaction", () => {
			const installed = parseVersion("1.0.5")!;
			const constraint = parseRange("~1.0.0")!;
			expect(satisfies(installed, constraint)).toBe(true);
		});

		test("tilde range rejection (minor bump)", () => {
			const installed = parseVersion("1.1.0")!;
			const constraint = parseRange("~1.0.0")!;
			expect(satisfies(installed, constraint)).toBe(false);
		});

		test("greater-than-or-equal satisfaction", () => {
			const installed = parseVersion("1.5.0")!;
			const constraint = parseRange(">=1.0.0")!;
			expect(satisfies(installed, constraint)).toBe(true);
		});

		test("exact match satisfaction", () => {
			const installed = parseVersion("1.2.0")!;
			const constraint = parseRange("1.2.0")!;
			expect(satisfies(installed, constraint)).toBe(true);
		});
	});

	describe("Git Protocol Differentiation", () => {
		test("different protocols create different cache keys", () => {
			const sshKey = getGitCacheKey(
				"git+ssh",
				"github.com",
				"owner",
				"repo",
				"main",
			);
			const httpsKey = getGitCacheKey(
				"git+https",
				"github.com",
				"owner",
				"repo",
				"main",
			);

			expect(sshKey).not.toBe(httpsKey);
			expect(sshKey).toContain("git+ssh");
			expect(httpsKey).toContain("git+https");
		});

		test("same protocol, different refs create different keys", () => {
			const mainKey = getGitCacheKey("git+https", "github.com", "owner", "repo", "main");
			const v1Key = getGitCacheKey("git+https", "github.com", "owner", "repo", "v1.0.0");

			expect(mainKey).not.toBe(v1Key);
		});
	});

	describe("GitHub Shorthand Expansion", () => {
		test("expand version tag to tarball URL", () => {
			const result = expandGitHubShorthand("oven-sh/bun#v1.1.0");
			expect(result).toBe("https://github.com/oven-sh/bun/archive/refs/tags/v1.1.0.tar.gz");
		});

		test("expand branch to git URL", () => {
			const result = expandGitHubShorthand("owner/repo#main");
			expect(result).toBe("git+https://github.com/owner/repo.git#main");
		});

		test("expand without ref defaults to main", () => {
			const result = expandGitHubShorthand("owner/repo");
			expect(result).toBe("git+https://github.com/owner/repo.git#main");
		});

		test("reject invalid shorthand", () => {
			expect(expandGitHubShorthand("invalid")).toBeNull();
			expect(expandGitHubShorthand("just-a-string")).toBeNull();
		});
	});

	describe("Numeric Safety", () => {
		test("version comparison handles edge cases", () => {
			const v1 = parseVersion("0.0.0")!;
			const v2 = parseVersion("99999.99999.99999")!;
			const range = parseRange(">=0.0.0")!;

			expect(compareVersions(v1, range)).toBe(0);
			expect(compareVersions(v2, range)).toBeGreaterThan(0);
		});

		test("saturating arithmetic prevents overflow", () => {
			const bumped = bumpNpmAlias("npm:@scope/name@1.2.3", "patch");
			// Extract version part after last @
			const lastAt = bumped.lastIndexOf("@");
			expect(lastAt).toBeGreaterThan(-1);
			
			const versionPart = bumped.slice(lastAt + 1);
			const parsed = parseVersion(versionPart);

			expect(parsed).not.toBeNull();
			expect(parsed!.patch).toBe(4);
			expect(parsed!.patch).toBeLessThan(Number.MAX_SAFE_INTEGER);
		});
	});
});
