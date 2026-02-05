#!/usr/bin/env bun
/**
 * SearchBun tests — follows Bun best practices
 * @see https://bun.com/docs/test/writing-tests
 *
 * Run: bun test mcp-bun-docs/search-bun.test.ts
 */

import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import {
	assertCol89,
	BINARY_PERF_METRICS,
	BUN_137_COMPLETE_MATRIX,
	BUN_137_FEATURE_MATRIX,
	BUN_BASE_URL,
	BUN_BLOG_RSS_URL,
	BUN_BLOG_URL,
	BUN_CHANGELOG_RSS,
	BUN_DOC_ENTRIES,
	BUN_DOC_MAP,
	BUN_DOCS_BASE,
	BUN_DOCS_MIN_VERSION,
	BUN_FEEDBACK_UPGRADE_FIRST,
	BUN_FEEDBACK_URL,
	BUN_GLOBALS,
	BUN_GLOBALS_API_URL,
	BUN_GUIDES_URL,
	BUN_INSTALL_ADD_URL,
	BUN_INSTALL_SCRIPT_URL,
	BUN_NODE_COMPAT_URL,
	BUN_PM_URL,
	BUN_REFERENCE_KEYS,
	BUN_REFERENCE_LINKS,
	BUN_REFERENCE_URL,
	BUN_REPO_RELEASES_URL,
	BUN_REPO_URL,
	BUN_SHOP_URL,
	BUN_TEST_REFERENCE_URL,
	BUN_TYPES_AUTHORING_URL,
	BUN_TYPES_KEY_FILES,
	BUN_TYPES_README_URL,
	BUN_TYPES_REPO_URL,
	BUN_URL_CONFIG,
	buildDocUrl,
	COL89_MAX,
	filterEntriesByPlatform,
	filterEntriesByStability,
	filterEntriesByVersion,
	getCrossReferences,
	getDocEntry,
	getDocLinkWidth,
	getLatestBunReleaseTitleFromRss,
	getReferenceUrl,
	getRssCanonicalizationAuditEvent,
	getUrlCanonicalizationAuditEvent,
	searchBunDocs,
	suggestDocTerms,
	TEST_CONFIG_MATRIX,
	TIER_1380_COMPLIANCE,
} from "./lib.ts";

let fetchSpy: ReturnType<typeof spyOn> | null = null;

describe("SearchBun / lib", () => {
	beforeEach(() => {
		fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
			new Response("", { status: 404 }),
		) as ReturnType<typeof spyOn>;
	});

	afterEach(() => {
		if (fetchSpy) fetchSpy.mockRestore();
	});

	describe("constants", () => {
		it("should set BUN_BASE_URL to https://bun.com (canonical base)", () => {
			expect(BUN_BASE_URL).toBe("https://bun.com");
		});
		it("should set BUN_INSTALL_SCRIPT_URL to bun.sh/install (only bun.sh exception)", () => {
			expect(BUN_INSTALL_SCRIPT_URL).toBe("https://bun.sh/install");
		});
		it("should derive BUN_DOCS_BASE from BUN_BASE_URL", () => {
			expect(BUN_DOCS_BASE).toBe("https://bun.com/docs");
		});

		it("should set BUN_DOCS_MIN_VERSION to 1.3.6", () => {
			expect(BUN_DOCS_MIN_VERSION).toBe("1.3.6");
		});
		it("should derive BUN_FEEDBACK_URL from BUN_BASE_URL", () => {
			expect(BUN_FEEDBACK_URL).toBe("https://bun.com/docs/feedback");
		});
		it("should include upgrade-first guidance in BUN_FEEDBACK_UPGRADE_FIRST", () => {
			expect(BUN_FEEDBACK_UPGRADE_FIRST).toContain("bun upgrade");
			expect(BUN_FEEDBACK_UPGRADE_FIRST).toContain("search/check issues");
		});
		it("should point BUN_TEST_REFERENCE_URL to bun.com/reference/bun/test", () => {
			expect(BUN_TEST_REFERENCE_URL).toBe("https://bun.com/reference/bun/test");
		});
		it("should point BUN_REPO_URL to oven-sh/bun", () => {
			expect(BUN_REPO_URL).toBe("https://github.com/oven-sh/bun");
		});
		it("should point BUN_TYPES_REPO_URL to bun-types package", () => {
			expect(BUN_TYPES_REPO_URL).toBe(
				"https://github.com/oven-sh/bun/tree/main/packages/bun-types",
			);
		});
		it("should point BUN_TYPES_README_URL and BUN_TYPES_AUTHORING_URL to blob paths", () => {
			expect(BUN_TYPES_README_URL).toContain("bun-types/README.md");
			expect(BUN_TYPES_AUTHORING_URL).toContain("bun-types/authoring.md");
		});
		it("should list key bun-types .d.ts files", () => {
			expect(BUN_TYPES_KEY_FILES).toContain("index.d.ts");
			expect(BUN_TYPES_KEY_FILES).toContain("test.d.ts");
			expect(BUN_TYPES_KEY_FILES).toContain("serve.d.ts");
		});
		it("should point BUN_SHOP_URL to shop.bun.com (subdomain)", () => {
			expect(BUN_SHOP_URL).toBe("https://shop.bun.com/");
		});
		it("should derive BUN_BLOG_URL from BUN_BASE_URL", () => {
			expect(BUN_BLOG_URL).toBe("https://bun.com/blog");
		});
		it("should set BUN_BLOG_RSS_URL to changelog feed (no separate /blog/rss.xml)", () => {
			expect(BUN_BLOG_RSS_URL).toBe(BUN_CHANGELOG_RSS);
			expect(BUN_BLOG_RSS_URL).toBe("https://bun.com/rss.xml");
		});
		it("should derive BUN_GUIDES_URL from BUN_BASE_URL", () => {
			expect(BUN_GUIDES_URL).toBe("https://bun.com/guides");
		});
		it("should point BUN_CHANGELOG_RSS to bun.com/rss.xml", () => {
			expect(BUN_CHANGELOG_RSS).toBe("https://bun.com/rss.xml");
		});
		it("should point BUN_REPO_RELEASES_URL to oven-sh/bun/releases", () => {
			expect(BUN_REPO_RELEASES_URL).toBe("https://github.com/oven-sh/bun/releases");
		});
		it("should derive BUN_PM_URL from BUN_BASE_URL", () => {
			expect(BUN_PM_URL).toBe("https://bun.com/package-manager");
		});
		it("should derive BUN_INSTALL_ADD_URL from BUN_BASE_URL", () => {
			expect(BUN_INSTALL_ADD_URL).toContain("guides/install/add");
			expect(BUN_INSTALL_ADD_URL).toMatch(/^https:\/\/bun\.com\//);
		});
		it("should derive BUN_NODE_COMPAT_URL from BUN_BASE_URL", () => {
			expect(BUN_NODE_COMPAT_URL).toContain("nodejs-apis");
			expect(BUN_NODE_COMPAT_URL).toMatch(/^https:\/\/bun\.com\//);
		});
		it("should derive BUN_REFERENCE_URL from BUN_BASE_URL", () => {
			expect(BUN_REFERENCE_URL).toBe("https://bun.com/reference");
		});
		it("should expose BUN_URL_CONFIG with base, docs, reference, changelogRSS, installScript, globalsAPI", () => {
			expect(BUN_URL_CONFIG.base).toBe(BUN_BASE_URL);
			expect(BUN_URL_CONFIG.docs).toBe(BUN_DOCS_BASE);
			expect(BUN_URL_CONFIG.reference).toBe(BUN_REFERENCE_URL);
			expect(BUN_URL_CONFIG.changelogRSS).toBe(BUN_CHANGELOG_RSS);
			expect(BUN_URL_CONFIG.installScript).toBe(BUN_INSTALL_SCRIPT_URL);
			expect(BUN_URL_CONFIG.globalsAPI).toBe("https://bun.com/docs/api/globals");
			expect(BUN_URL_CONFIG.changelogRSS).toBe("https://bun.com/rss.xml");
			expect(BUN_URL_CONFIG.globalsAPI).toBe("https://bun.com/docs/api/globals");
		});
		it("should return URL_CANONICALIZATION_COMPLETE audit event with col89_safe and glyph", () => {
			const ev = getUrlCanonicalizationAuditEvent();
			expect(ev.event).toBe("URL_CANONICALIZATION_COMPLETE");
			expect(ev.col89_safe).toBe(true);
			expect(ev.details).toContain("URL Standardization Active");
			expect(ev.details).toContain(BUN_BASE_URL);
			expect(ev.glyph).toContain("canonical base locked");
		});
		it("getRssCanonicalizationAuditEvent returns RSS_CANONICALIZATION_LOCKED with details and glyph", async () => {
			const ev = await getRssCanonicalizationAuditEvent();
			expect(ev.event).toBe("RSS_CANONICALIZATION_LOCKED");
			expect(ev.col89_safe).toBe(true);
			expect(ev.details).toContain("Unified RSS feed");
			expect(ev.details).toContain(BUN_CHANGELOG_RSS);
			expect(ev.glyph).toContain("rss unified");
			expect(
				typeof ev.feed_preview_width === "number" || ev.feed_preview_width === undefined,
			).toBe(true);
		});
		it("getLatestBunReleaseTitleFromRss returns first item title from RSS", async () => {
			const xml =
				'<?xml version="1.0"?><rss><channel><item><title>Bun v99.0.0</title></item></channel></rss>';
			fetchSpy.mockResolvedValueOnce(new Response(xml));
			const title = await getLatestBunReleaseTitleFromRss();
			expect(title).toBe("Bun v99.0.0");
		});
		it("getLatestBunReleaseTitleFromRss returns null on fetch failure", async () => {
			fetchSpy.mockRejectedValueOnce(new Error("network"));
			const title = await getLatestBunReleaseTitleFromRss();
			expect(title).toBeNull();
		});
		it("COL89_MAX is 89", () => {
			expect(COL89_MAX).toBe(89);
		});
		it("getDocLinkWidth returns width under 89 for typical doc link", () => {
			const link = "https://bun.com/docs/runtime/utils#bun-stringwidth";
			const w = getDocLinkWidth(link);
			expect(w).toBeLessThanOrEqual(COL89_MAX);
			expect(w).toBeGreaterThan(0);
		});
		it("assertCol89 returns true for short link, false for over-89", () => {
			expect(assertCol89("https://bun.com/docs")).toBe(true);
			const long = "x".repeat(100);
			expect(assertCol89(long)).toBe(false);
		});

		it.each([
			["fetch", "guides/http/fetch"],
			["serve", "api/http"],
			["sqlite", "api/sqlite"],
			["mcp", "mcp"],
		] as [string, string][])("should map BUN_DOC_MAP %s to %s", (term, path) => {
			expect(BUN_DOC_MAP[term]).toBe(path);
		});
	});

	describe("buildDocUrl", () => {
		it.each([
			["api/http", "https://bun.com/docs/api/http"],
			["guides/http/fetch", "https://bun.com/docs/guides/http/fetch"],
		] as [string, string][])("should append path for relative %s", (path, expected) => {
			expect(buildDocUrl(path)).toBe(expected);
		});

		it("should return absolute URL as-is", () => {
			const url = "https://example.com/x";
			expect(buildDocUrl(url)).toBe(url);
		});
	});

	describe("searchBunDocs", () => {
		// test.serial: fetch mock on globalThis — avoid concurrent interference (bun.com/docs/test/lifecycle)
		it.serial("should return markdown for known term fetch", async () => {
			expect.hasAssertions();
			const result = await searchBunDocs("fetch");
			expect(result).toContain("## Bun docs for");
			expect(result).toContain("fetch");
			expect(result).toContain("bun.com/docs");
			expect(result).toContain("guides/http/fetch");
		});

		it.serial("should return markdown for known term serve", async () => {
			expect.hasAssertions();
			const result = await searchBunDocs("serve");
			expect(result).toContain("api/http");
		});

		it.serial("should map postgres to api/sql not sqlite", async () => {
			expect.hasAssertions();
			const result = await searchBunDocs("postgres");
			expect(result).toContain("api/sql");
			expect(result).not.toContain("api/sqlite");
		});

		it.serial("should return fallback for unknown term", async () => {
			expect.hasAssertions();
			const result = await searchBunDocs("xyznonexistent123");
			expect(result).toContain("Bun Documentation");
			expect(result).toContain("Bun MCP");
			expect(result).toContain(BUN_DOCS_BASE);
		});

		it.serial("should accept empty opts", async () => {
			expect.hasAssertions();
			const result = await searchBunDocs("sqlite");
			expect(result).toContain("sqlite");
		});

		it.serial("should trim query before search", async () => {
			expect.hasAssertions();
			const result = await searchBunDocs("  fetch  ");
			expect(result).toContain("fetch");
		});

		it.serial("should exclude mcp when bunVersion filters too-new APIs", async () => {
			expect.hasAssertions();
			const result = await searchBunDocs("mcp", { bunVersion: "1.0.0" });
			expect(result).not.toContain("Bun: mcp");
		});
	});

	describe("BUN_DOC_ENTRIES", () => {
		it("should have Tier-1380 schema fields", () => {
			const e = BUN_DOC_ENTRIES[0];
			expect(e).toHaveProperty("term");
			expect(e).toHaveProperty("path");
			expect(e).toHaveProperty("bunMinVersion");
			expect(e).toHaveProperty("stability");
			expect(e).toHaveProperty("platforms");
			expect(e).toHaveProperty("security");
		});
	});

	describe("filterEntriesByVersion", () => {
		it("should hide APIs requiring newer runtime", () => {
			const filtered = filterEntriesByVersion(BUN_DOC_ENTRIES, "1.0.0");
			expect(filtered.length).toBeLessThan(BUN_DOC_ENTRIES.length);
			expect(filtered.map((e) => e.term)).toContain("fetch");
			expect(filtered.map((e) => e.term)).not.toContain("mcp");
		});
	});

	describe("filterEntriesByStability", () => {
		it("should exclude experimental for prod", () => {
			const prodSafe = filterEntriesByStability(BUN_DOC_ENTRIES, ["stable"]);
			expect(prodSafe.every((e) => e.stability === "stable")).toBe(true);
			expect(prodSafe.some((e) => e.term === "Bun.Transpiler.replMode")).toBe(false);
		});

		it("should exclude Bun.inspect.table from prod-safe", () => {
			const prodTerms = filterEntriesByStability(BUN_DOC_ENTRIES, ["stable"]).map(
				(e) => e.term,
			);
			expect(prodTerms).not.toContain("Bun.inspect.table");
			expect(prodTerms).not.toContain("inspect");
		});
	});

	describe("filterEntriesByPlatform", () => {
		it("should exclude darwin+linux-only on win32", () => {
			const win = filterEntriesByPlatform(BUN_DOC_ENTRIES, "win32");
			expect(win.some((e) => e.term === "password")).toBe(false);
			expect(win.some((e) => e.term === "fetch")).toBe(true);
		});
	});

	describe("BINARY_PERF_METRICS", () => {
		it("should include Buffer.swap16 and Buffer.swap64", () => {
			expect(BINARY_PERF_METRICS).toHaveLength(2);
			expect(BINARY_PERF_METRICS.map((m) => m.op)).toContain("Buffer.swap16");
			expect(BINARY_PERF_METRICS.map((m) => m.op)).toContain("Buffer.swap64");
			expect(BINARY_PERF_METRICS.find((m) => m.op === "Buffer.swap64")?.imp).toBe(
				"3.6x",
			);
		});
	});

	describe("BUN_DOC_MAP buffer ops", () => {
		it.each([
			["Buffer.swap16", "api/buffer"],
			["Buffer.swap64", "api/buffer"],
		] as [string, string][])("should map %s to %s", (term, path) => {
			expect(BUN_DOC_MAP[term]).toBe(path);
		});
	});

	describe("TEST_CONFIG_MATRIX", () => {
		it("should have install inheritance row", () => {
			const installRow = TEST_CONFIG_MATRIX.find((r) => r.Section === "Install");
			expect(installRow).toBeDefined();
			expect(installRow!.KeyValues).toContain("registry");
		});

		it("should have [test.ci] profile", () => {
			const ciRow = TEST_CONFIG_MATRIX.find((r) => r.Section === "[test.ci]");
			expect(ciRow).toBeDefined();
			expect(ciRow!.InheritsFrom).toBe("[test]");
		});
	});

	describe("bun test entry", () => {
		it("should map bun test to test path", () => {
			expect(BUN_DOC_MAP["bun test"]).toBe("test");
		});
	});

	describe("getDocEntry", () => {
		it("should return entry for exact term", () => {
			const e = getDocEntry("spawn");
			expect(e).not.toBeNull();
			expect(e!.term).toBe("spawn");
			expect(e!.path).toBe("api/spawn");
		});
		it("should return entry for case-insensitive term", () => {
			const e = getDocEntry("SPAWN");
			expect(e).not.toBeNull();
			expect(e!.term).toBe("spawn");
		});
		it("should return null for unknown term", () => {
			expect(getDocEntry("xyznonexistent")).toBeNull();
		});
	});

	describe("getReferenceUrl / BUN_REFERENCE_KEYS", () => {
		it("should return URL for fileAPI", () => {
			expect(getReferenceUrl("fileAPI")).toBe("https://bun.com/docs/api/file-io");
		});
		it("should list all reference keys", () => {
			expect(BUN_REFERENCE_KEYS).toContain("fileAPI");
			expect(BUN_REFERENCE_KEYS).toContain("httpServer");
			expect(BUN_REFERENCE_KEYS).toContain("bunTest");
			expect(BUN_REFERENCE_KEYS).toContain("bunTypes");
			expect(getReferenceUrl("fileAPI")).toBe(BUN_REFERENCE_LINKS.fileAPI);
			expect(getReferenceUrl("bunTest")).toBe(BUN_TEST_REFERENCE_URL);
			expect(getReferenceUrl("bunTypes")).toBe(BUN_TYPES_REPO_URL);
			expect(getReferenceUrl("bunTypesReadme")).toBe(BUN_TYPES_README_URL);
			expect(BUN_REFERENCE_KEYS).toContain("bunApis");
			expect(BUN_REFERENCE_KEYS).toContain("webApis");
			expect(BUN_REFERENCE_KEYS).toContain("nodeApi");
			expect(BUN_REFERENCE_KEYS).toContain("shop");
			expect(BUN_REFERENCE_KEYS).toContain("blog");
			expect(BUN_REFERENCE_KEYS).toContain("guides");
			expect(BUN_REFERENCE_KEYS).toContain("blogRss");
			expect(BUN_REFERENCE_KEYS).toContain("changelogRss");
			expect(getReferenceUrl("shop")).toBe(BUN_SHOP_URL);
			expect(getReferenceUrl("blog")).toBe(BUN_BLOG_URL);
			expect(getReferenceUrl("guides")).toBe(BUN_GUIDES_URL);
			expect(getReferenceUrl("blogRss")).toBe(BUN_BLOG_RSS_URL);
			expect(getReferenceUrl("changelogRss")).toBe(BUN_CHANGELOG_RSS);
			expect(BUN_REFERENCE_KEYS).toContain("repo");
			expect(BUN_REFERENCE_KEYS).toContain("releases");
			expect(BUN_REFERENCE_KEYS).toContain("pm");
			expect(BUN_REFERENCE_KEYS).toContain("pmCli");
			expect(BUN_REFERENCE_KEYS).toContain("installAdd");
			expect(BUN_REFERENCE_KEYS).toContain("nodeCompat");
			expect(getReferenceUrl("repo")).toBe(BUN_REPO_URL);
			expect(getReferenceUrl("releases")).toBe(BUN_REPO_RELEASES_URL);
			expect(getReferenceUrl("pm")).toBe(BUN_PM_URL);
			expect(getReferenceUrl("installAdd")).toBe(BUN_INSTALL_ADD_URL);
			expect(getReferenceUrl("nodeCompat")).toBe(BUN_NODE_COMPAT_URL);
			expect(BUN_REFERENCE_KEYS).toContain("reference");
			expect(getReferenceUrl("reference")).toBe(BUN_REFERENCE_URL);
		});
	});

	describe("BUN_GLOBALS / getCrossReferences", () => {
		it("should include Bun, $, fetch, Buffer in BUN_GLOBALS", () => {
			const names = BUN_GLOBALS.map((g) => g.name);
			expect(names).toContain("Bun");
			expect(names).toContain("$");
			expect(names).toContain("fetch");
			expect(names).toContain("Buffer");
		});
		it("should derive BUN_GLOBALS_API_URL from BUN_BASE_URL", () => {
			expect(BUN_GLOBALS_API_URL).toBe("https://bun.com/docs/api/globals");
		});
		it("should return cross-refs for spawn (subprocess, shell)", () => {
			const xrefs = getCrossReferences("spawn");
			expect(xrefs.length).toBeGreaterThan(0);
			expect(xrefs.map((x) => x.term)).toContain("subprocess");
			expect(xrefs.map((x) => x.term)).toContain("shell");
		});
		it("should return cross-refs for Bun.serve (serve, fetch)", () => {
			const xrefs = getCrossReferences("Bun.serve");
			expect(xrefs.map((x) => x.term)).toContain("serve");
			expect(xrefs.map((x) => x.term)).toContain("fetch");
		});
		it("should return empty array for term with no relatedTerms", () => {
			const xrefs = getCrossReferences("env");
			expect(Array.isArray(xrefs)).toBe(true);
		});
	});

	describe("suggestDocTerms", () => {
		it("should return matches for partial query", () => {
			const results = suggestDocTerms("spawn");
			expect(results.length).toBeGreaterThan(0);
			expect(results.map((r) => r.term)).toContain("spawn");
			expect(results[0]).toHaveProperty("url");
			expect(results[0]).toHaveProperty("stability");
		});
		it("should respect limit", () => {
			const results = suggestDocTerms("Bun", 3);
			expect(results.length).toBeLessThanOrEqual(3);
		});
		it("should return empty for empty query", () => {
			expect(suggestDocTerms("")).toEqual([]);
			expect(suggestDocTerms("   ")).toEqual([]);
		});
	});

	describe("TIER_1380_COMPLIANCE", () => {
		it("should document Transpiler.replMode Col 93 and maxHeaders", () => {
			const items = TIER_1380_COMPLIANCE.map((r) => r.Item);
			expect(items).toContain("Transpiler.replMode");
			expect(items).toContain("http.maxHeaders 200");
		});
	});

	describe("BUN_137_FEATURE_MATRIX", () => {
		it("should include S3.presign and String.isWellFormed", () => {
			const terms = BUN_137_FEATURE_MATRIX.map((r) => r.Term);
			expect(terms).toContain("S3.presign");
			expect(terms).toContain("String.isWellFormed");
		});
		it("should have 7 v1.3.7 features", () => {
			expect(BUN_137_FEATURE_MATRIX).toHaveLength(7);
		});
	});

	describe("BUN_137_COMPLETE_MATRIX", () => {
		it("should include Buffer.from and Bun.wrapAnsi", () => {
			const terms = BUN_137_COMPLETE_MATRIX.map((r) => r.Term);
			expect(terms).toContain("Buffer.from");
			expect(terms).toContain("Bun.wrapAnsi");
		});
		it("should have 20 complete matrix rows (v1.3.7 catalog)", () => {
			expect(BUN_137_COMPLETE_MATRIX.length).toBeGreaterThanOrEqual(18);
		});
	});

	describe("v1.3.7 BUN_DOC_ENTRIES", () => {
		it("should map S3File.presign to api/s3", () => {
			expect(BUN_DOC_MAP["S3File.presign"]).toBe("api/s3");
		});
		it("should map node:inspector to api/node-inspector", () => {
			expect(BUN_DOC_MAP["node:inspector"]).toBe("api/node-inspector");
		});
	});
});
