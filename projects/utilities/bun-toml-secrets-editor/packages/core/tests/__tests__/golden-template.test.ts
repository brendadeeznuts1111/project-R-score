/**
 * Tests for Golden Template Loader
 */

import { describe, expect, it } from "bun:test";
import {
	type GoldenTemplateConfig,
	generateConfigSummary,
	loadGoldenTemplate,
	validateGoldenTemplate,
} from "../config/golden-template-loader.js";

describe("validateGoldenTemplate", () => {
	it("should validate minimal config", () => {
		const config: GoldenTemplateConfig = {
			meta: {
				name: "test",
				version: "1.0.0",
				description: "",
				author: "",
				license: "",
				template_engine: "",
			},
		};

		const result = validateGoldenTemplate(config);
		expect(result.valid).toBe(true);
	});

	it("should fail on missing meta.name", () => {
		const config: GoldenTemplateConfig = {};
		const result = validateGoldenTemplate(config);
		expect(result.valid).toBe(false);
		expect(result.errors).toContain("Missing meta.name");
	});

	it("should warn on missing version", () => {
		const config: GoldenTemplateConfig = {
			meta: {
				name: "test",
				version: "",
				description: "",
				author: "",
				license: "",
				template_engine: "",
			},
		};
		const result = validateGoldenTemplate(config);
		expect(result.warnings).toContain("Missing meta.version");
	});

	it("should validate RSS feeds", () => {
		const config: GoldenTemplateConfig = {
			meta: {
				name: "test",
				version: "1.0.0",
				description: "",
				author: "",
				license: "",
				template_engine: "",
			},
			rss: {
				feeds: [
					{ name: "", url: "https://example.com/rss" },
					{ name: "Valid Feed", url: "" },
					{
						name: "Fast Feed",
						url: "https://fast.com/rss",
						refresh_interval: 5,
					},
				],
			},
		};

		const result = validateGoldenTemplate(config);
		expect(result.errors).toContain("RSS feed missing name");
		expect(result.errors).toContain('RSS feed "Valid Feed" missing url');
		expect(result.warnings.some((w) => w.includes("short refresh"))).toBe(true);
	});

	it("should validate database config", () => {
		const config: GoldenTemplateConfig = {
			meta: {
				name: "test",
				version: "1.0.0",
				description: "",
				author: "",
				license: "",
				template_engine: "",
			},
			database: { port: 5432 },
		};

		const result = validateGoldenTemplate(config);
		expect(result.errors).toContain("Database host not configured");
	});

	it("should warn on high max_per_file", () => {
		const config: GoldenTemplateConfig = {
			meta: {
				name: "test",
				version: "1.0.0",
				description: "",
				author: "",
				license: "",
				template_engine: "",
			},
			secrets: {
				validation: {
					max_per_file: 2000,
				},
			},
		};

		const result = validateGoldenTemplate(config);
		expect(result.warnings).toContain("max_per_file is very high (>1000)");
	});
});

describe("loadGoldenTemplate", () => {
	it("should load and resolve the golden template", async () => {
		const result = await loadGoldenTemplate("./config/golden-template.toml", {
			strict: false,
			verbose: false,
		});

		expect(result.config).toBeDefined();
		expect(result.source).toBe("./config/golden-template.toml");
		expect(result.context).toBeDefined();
		expect(result.context.profile).toBeDefined();
	});

	it("should respect profile override", async () => {
		const result = await loadGoldenTemplate("./config/golden-template.toml", {
			profile: "production",
			strict: false,
		});

		expect(result.context.profile).toBe("production");
	});

	it("should resolve secrets", async () => {
		const result = await loadGoldenTemplate("./config/golden-template.toml", {
			strict: false,
		});

		// The template has many secret references
		// Some will be resolved, some will be missing
		expect(typeof result.secretsResolved).toBe("number");
		expect(typeof result.secretsMissing).toBe("number");
	});

	it("should parse RSS configuration", async () => {
		const result = await loadGoldenTemplate("./config/golden-template.toml", {
			strict: false,
		});

		expect(result.config.rss).toBeDefined();
		expect(Array.isArray(result.config.rss?.feeds)).toBe(true);
		expect(result.config.rss?.feeds?.length).toBeGreaterThan(0);
	});

	it("should parse database configuration", async () => {
		const result = await loadGoldenTemplate("./config/golden-template.toml", {
			strict: false,
		});

		expect(result.config.database).toBeDefined();
		expect(result.config.database?.host).toBeDefined();
	});

	it("should parse UI configuration", async () => {
		const result = await loadGoldenTemplate("./config/golden-template.toml", {
			strict: false,
		});

		expect(result.config.ui).toBeDefined();
		expect(result.config.ui?.theme).toBeDefined();
	});

	it("should parse bun_create configuration", async () => {
		const result = await loadGoldenTemplate("./config/golden-template.toml", {
			strict: false,
		});

		expect(result.config.bun_create).toBeDefined();
		expect(result.config.bun_create?.enabled).toBe(true);
	});
});

describe("generateConfigSummary", () => {
	it("should generate formatted summary", async () => {
		const result = await loadGoldenTemplate("./config/golden-template.toml", {
			strict: false,
		});

		const summary = generateConfigSummary(result);

		expect(summary).toContain("Golden Template Configuration Summary");
		expect(summary).toContain(result.source);
		expect(summary).toContain(result.context.profile);
	});

	it("should include database info when available", async () => {
		const result = await loadGoldenTemplate("./config/golden-template.toml", {
			strict: false,
		});

		const summary = generateConfigSummary(result);

		if (result.config.database?.host) {
			expect(summary).toContain("Database:");
		}
	});

	it("should include RSS feed count", async () => {
		const result = await loadGoldenTemplate("./config/golden-template.toml", {
			strict: false,
		});

		const summary = generateConfigSummary(result);

		if (result.config.rss?.feeds?.length) {
			expect(summary).toContain("RSS Feeds:");
		}
	});
});
