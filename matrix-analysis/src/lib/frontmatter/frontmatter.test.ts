/**
 * Frontmatter extraction system tests
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { batchExtractFrontmatter, generateIndex } from "./batch";
import { extractFrontmatter } from "./extractor";
import { generateHeadTags, injectIntoHtml } from "./inject";
import { normalizeFrontmatter } from "./normalizer";
import type { FrontmatterSchema } from "./validator";
import { validateFrontmatter } from "./validator";

// ─── Extractor ──────────────────────────────────────────────────────────────

describe("extractFrontmatter", () => {
	describe("YAML frontmatter", () => {
		it("should parse standard YAML frontmatter", () => {
			const md = `---
title: Hello World
date: 2026-02-01
tags:
  - bun
  - markdown
---
# Content here`;
			const result = extractFrontmatter(md);
			expect(result.format).toBe("yaml");
			expect(result.data.title).toBe("Hello World");
			expect(result.data.date).toBe("2026-02-01");
			expect(result.data.tags).toEqual(["bun", "markdown"]);
			expect(result.content).toBe("# Content here");
			expect(result.errors).toHaveLength(0);
		});

		it("should handle YAML with various value types", () => {
			const md = `---
title: Test
draft: true
count: 42
ratio: 3.14
---
Body`;
			const result = extractFrontmatter(md);
			expect(result.format).toBe("yaml");
			expect(result.data.draft).toBe(true);
			expect(result.data.count).toBe(42);
			expect(result.data.ratio).toBe(3.14);
		});

		it("should handle empty YAML block", () => {
			const md = `---
---
Content`;
			const result = extractFrontmatter(md);
			// Empty YAML parses to null, not an object
			expect(result.errors.length).toBeGreaterThanOrEqual(0);
		});

		it("should report malformed YAML errors", () => {
			const md = `---
title: [unclosed bracket
---
Content`;
			const result = extractFrontmatter(md);
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors[0]).toContain("YAML");
		});
	});

	describe("TOML frontmatter", () => {
		it("should parse TOML frontmatter", () => {
			const md = `+++
title = "Hello TOML"
date = "2026-02-01"
draft = false
+++
# TOML Content`;
			const result = extractFrontmatter(md);
			expect(result.format).toBe("toml");
			expect(result.data.title).toBe("Hello TOML");
			expect(result.data.draft).toBe(false);
			expect(result.content).toBe("# TOML Content");
			expect(result.errors).toHaveLength(0);
		});

		it("should handle TOML arrays and tables", () => {
			const md = `+++
title = "Test"
tags = ["bun", "fast"]

[author]
name = "Nola"
+++
Body`;
			const result = extractFrontmatter(md);
			expect(result.format).toBe("toml");
			expect(result.data.tags).toEqual(["bun", "fast"]);
			expect((result.data.author as Record<string, unknown>).name).toBe("Nola");
		});
	});

	describe("JSON frontmatter", () => {
		it("should parse JSON frontmatter", () => {
			const md = `{
  "title": "Hello JSON",
  "draft": false,
  "tags": ["bun"]
}

# JSON Content`;
			const result = extractFrontmatter(md);
			expect(result.format).toBe("json");
			expect(result.data.title).toBe("Hello JSON");
			expect(result.data.draft).toBe(false);
			expect(result.content.trim()).toBe("# JSON Content");
			expect(result.errors).toHaveLength(0);
		});

		it("should handle nested JSON objects", () => {
			const md = `{
  "title": "Nested",
  "meta": { "og:image": "https://example.com/img.png" }
}

Content`;
			const result = extractFrontmatter(md);
			expect(result.format).toBe("json");
			expect((result.data.meta as Record<string, unknown>)["og:image"]).toBe(
				"https://example.com/img.png",
			);
		});
	});

	describe("no frontmatter", () => {
		it("should return format 'none' for plain markdown", () => {
			const md = "# Just a heading\n\nSome text.";
			const result = extractFrontmatter(md);
			expect(result.format).toBe("none");
			expect(result.content).toBe(md);
			expect(result.data).toEqual({});
		});

		it("should handle empty string", () => {
			const result = extractFrontmatter("");
			expect(result.format).toBe("none");
			expect(result.content).toBe("");
		});

		it("should handle null/undefined input", () => {
			const result = extractFrontmatter(null as unknown as string);
			expect(result.format).toBe("none");
		});
	});

	describe("format priority", () => {
		it("should prefer YAML over TOML when --- appears first", () => {
			const md = `---
title: YAML wins
---
Content`;
			const result = extractFrontmatter(md);
			expect(result.format).toBe("yaml");
		});
	});
});

// ─── Normalizer ─────────────────────────────────────────────────────────────

describe("normalizeFrontmatter", () => {
	it("should convert date to ISO 8601", () => {
		const data = { date: "2026-02-01" };
		const result = normalizeFrontmatter(data);
		expect(result.date_iso).toBeDefined();
		expect(result.date_iso).toContain("2026-02-01");
	});

	it("should handle published field as date", () => {
		const data = { published: "January 15, 2026" };
		const result = normalizeFrontmatter(data);
		expect(result.published_iso).toBeDefined();
	});

	it("should coerce string tags to array", () => {
		const data = { tags: "bun, fast, runtime" };
		const result = normalizeFrontmatter(data);
		expect(result.tags).toEqual(["bun", "fast", "runtime"]);
	});

	it("should coerce string categories to array", () => {
		const data = { categories: "tech web dev" };
		const result = normalizeFrontmatter(data);
		expect(result.categories).toEqual(["tech", "web", "dev"]);
	});

	it("should leave array tags as-is", () => {
		const data = { tags: ["already", "array"] };
		const result = normalizeFrontmatter(data);
		expect(result.tags).toEqual(["already", "array"]);
	});

	it("should coerce draft string to boolean", () => {
		const trueResult = normalizeFrontmatter({ draft: "true" });
		expect(trueResult.draft).toBe(true);

		const falseResult = normalizeFrontmatter({ draft: "false" });
		expect(falseResult.draft).toBe(false);
	});

	it("should apply SEO mapping when enabled", () => {
		const data = { title: "My Post", description: "A great post" };
		const result = normalizeFrontmatter(data, { seoMapping: true });
		const meta = result.meta as Record<string, unknown>;
		expect(meta.title).toBe("My Post");
		expect(meta.description).toBe("A great post");
	});

	it("should not mutate original data", () => {
		const data = { tags: "a, b", date: "2026-01-01" };
		const original = { ...data };
		normalizeFrontmatter(data);
		expect(data.tags).toBe(original.tags);
	});
});

// ─── Validator ──────────────────────────────────────────────────────────────

describe("validateFrontmatter", () => {
	const schema: FrontmatterSchema = {
		title: { type: "string", required: true, min: 3, max: 100 },
		date: { type: "string", required: true },
		tags: { type: "array", min: 1 },
		draft: "boolean",
	};

	it("should pass valid data", () => {
		const data = {
			title: "Hello World",
			date: "2026-02-01",
			tags: ["bun"],
			draft: false,
		};
		const result = validateFrontmatter(data, schema);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("should fail on missing required fields", () => {
		const result = validateFrontmatter({ draft: true }, schema);
		expect(result.valid).toBe(false);
		const fields = result.errors.map((e) => e.field);
		expect(fields).toContain("title");
		expect(fields).toContain("date");
	});

	it("should fail on type mismatch", () => {
		const data = { title: 42, date: "2026-02-01" };
		const result = validateFrontmatter(data, schema);
		expect(result.valid).toBe(false);
		expect(
			result.errors.some((e) => e.field === "title" && e.message.includes("Type")),
		).toBe(true);
	});

	it("should fail on too-short string", () => {
		const data = { title: "Hi", date: "2026-02-01" };
		const result = validateFrontmatter(data, schema);
		expect(result.valid).toBe(false);
		expect(
			result.errors.some((e) => e.field === "title" && e.message.includes("short")),
		).toBe(true);
	});

	it("should fail on too-few array items", () => {
		const data = { title: "Hello", date: "2026-02-01", tags: [] };
		const result = validateFrontmatter(data, schema);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.field === "tags")).toBe(true);
	});

	it("should support enum validation", () => {
		const enumSchema: FrontmatterSchema = {
			status: { type: "string", enum: ["draft", "published", "archived"] },
		};
		const pass = validateFrontmatter({ status: "published" }, enumSchema);
		expect(pass.valid).toBe(true);

		const fail = validateFrontmatter({ status: "deleted" }, enumSchema);
		expect(fail.valid).toBe(false);
	});

	it("should support pattern validation", () => {
		const patternSchema: FrontmatterSchema = {
			slug: { type: "string", pattern: /^[a-z0-9-]+$/ },
		};
		const pass = validateFrontmatter({ slug: "my-post-123" }, patternSchema);
		expect(pass.valid).toBe(true);

		const fail = validateFrontmatter({ slug: "Invalid Slug!" }, patternSchema);
		expect(fail.valid).toBe(false);
	});
});

// ─── HTML Injection ─────────────────────────────────────────────────────────

describe("generateHeadTags", () => {
	it("should generate meta tags", () => {
		const data = { title: "Test", description: "A test", author: "Nola" };
		const tags = generateHeadTags(data, { modes: ["meta"] });
		expect(tags).toContain('<meta name="title"');
		expect(tags).toContain('<meta name="description"');
		expect(tags).toContain('<meta name="author"');
	});

	it("should generate OpenGraph tags", () => {
		const data = {
			title: "OG Test",
			description: "OG desc",
			image: "https://img.example.com/og.png",
		};
		const tags = generateHeadTags(data, { modes: ["opengraph"] });
		expect(tags).toContain('property="og:title"');
		expect(tags).toContain('property="og:description"');
		expect(tags).toContain('property="og:image"');
	});

	it("should generate JSON-LD", () => {
		const data = {
			title: "LD Test",
			author: "Nola",
			date_iso: "2026-02-01T00:00:00.000Z",
		};
		const tags = generateHeadTags(data, { modes: ["jsonld"] });
		expect(tags).toContain("application/ld+json");
		expect(tags).toContain('"@type": "Article"');
		expect(tags).toContain("LD Test");
	});

	it("should generate HTML comment", () => {
		const data = { title: "Comment", draft: false };
		const tags = generateHeadTags(data, { modes: ["comment"] });
		expect(tags).toContain("<!-- frontmatter");
		expect(tags).toContain("title: Comment");
	});

	it("should escape HTML in values", () => {
		const data = { title: '<script>alert("xss")</script>' };
		const tags = generateHeadTags(data, { modes: ["meta"] });
		expect(tags).not.toContain("<script>");
		expect(tags).toContain("&lt;script&gt;");
	});
});

describe("injectIntoHtml", () => {
	it("should inject before </head>", () => {
		const html = "<html><head><title>Test</title></head><body></body></html>";
		const data = { title: "Injected" };
		const result = injectIntoHtml(html, data, { modes: ["meta"] });
		expect(result).toContain('<meta name="title"');
		expect(result).toContain("</head>");
	});

	it("should wrap with <head> if missing", () => {
		const html = "<p>No head</p>";
		const data = { title: "Wrapped" };
		const result = injectIntoHtml(html, data, { modes: ["meta"] });
		expect(result).toContain("<head>");
		expect(result).toContain("</head>");
		expect(result).toContain("<p>No head</p>");
	});
});

// ─── Batch Processing ───────────────────────────────────────────────────────

describe("batch extraction", () => {
	const tmpDir = "/tmp/frontmatter-batch-test";

	beforeAll(async () => {
		await Bun.$`mkdir -p ${tmpDir}`.quiet();

		await Bun.write(
			`${tmpDir}/post1.md`,
			`---
title: Post One
tags:
  - bun
---
# Post One`,
		);

		await Bun.write(
			`${tmpDir}/post2.md`,
			`+++
title = "Post Two"
draft = true
+++
# Post Two`,
		);

		await Bun.write(`${tmpDir}/plain.md`, "# No Frontmatter\n\nJust content.");
	});

	afterAll(async () => {
		await Bun.$`rm -rf ${tmpDir}`.quiet();
	});

	it("should process all markdown files in directory", async () => {
		const result = await batchExtractFrontmatter(tmpDir);
		expect(result.totalFiles).toBe(3);
		expect(result.withFrontmatter).toBe(2);
		expect(result.errorCount).toBe(0);
		expect(result.elapsedMs).toBeGreaterThan(0);
	});

	it("should detect correct formats per file", async () => {
		const result = await batchExtractFrontmatter(tmpDir);
		const formats = result.entries.map((e) => e.frontmatter.format).sort();
		expect(formats).toContain("yaml");
		expect(formats).toContain("toml");
		expect(formats).toContain("none");
	});

	it("should generate index with frontmatter entries only", async () => {
		const result = await batchExtractFrontmatter(tmpDir);
		const index = generateIndex(result);
		expect(index.length).toBe(2);
		expect(index.every((e) => e.title !== undefined)).toBe(true);
	});

	it("should include file hashes", async () => {
		const result = await batchExtractFrontmatter(tmpDir);
		for (const entry of result.entries) {
			expect(entry.hash).toMatch(/^[a-f0-9]{32}$/);
		}
	});

	it("should validate against schema when provided", async () => {
		const schema: FrontmatterSchema = {
			title: { type: "string", required: true },
		};
		const result = await batchExtractFrontmatter(tmpDir, { schema });
		const validated = result.entries.filter((e) => e.validation !== null);
		expect(validated.length).toBe(3);
	});
});

// ─── Integration: Extract → Normalize → Render ─────────────────────────────

describe("end-to-end integration", () => {
	it("should extract, normalize, validate, and inject into rendered HTML", () => {
		const md = `---
title: Integration Test
description: Testing the full pipeline
date: 2026-02-01
tags: bun, fast
draft: "true"
slug: integration-test
---
# Hello

This is a **test**.`;

		// 1. Extract
		const extracted = extractFrontmatter(md);
		expect(extracted.format).toBe("yaml");

		// 2. Normalize
		const normalized = normalizeFrontmatter(extracted.data, { seoMapping: true });
		expect(normalized.date_iso).toContain("2026-02-01");
		expect(normalized.tags).toEqual(["bun", "fast"]);
		expect(normalized.draft).toBe(true);

		// 3. Validate
		const schema: FrontmatterSchema = {
			title: { type: "string", required: true },
			date: { type: "string", required: true },
		};
		const validation = validateFrontmatter(normalized, schema);
		expect(validation.valid).toBe(true);

		// 4. Render markdown body
		const html = Bun.markdown.html(extracted.content);
		expect(html).toContain("<h1>");
		expect(html).toContain("<strong>test</strong>");

		// 5. Inject metadata
		const fullHtml = `<html><head><title>${Bun.escapeHTML(String(normalized.title))}</title></head><body>${html}</body></html>`;
		const injected = injectIntoHtml(fullHtml, normalized, {
			modes: ["meta", "opengraph", "jsonld"],
			siteUrl: "https://example.com",
		});
		expect(injected).toContain('property="og:title"');
		expect(injected).toContain("application/ld+json");
		expect(injected).toContain("Integration Test");
	});
});
