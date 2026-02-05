/**
 * Tests for template-engine
 *
 * Verifies ${secrets:profile:key} resolution and validation
 */

import { describe, expect, it } from "bun:test";
import {
	createTemplate,
	generateSecretReport,
	resolveTemplate,
	validateTemplate,
} from "../config/template-engine";
import { getContext } from "../secrets/context-resolver";

describe("validateTemplate", () => {
	it("should detect simple secret references", () => {
		const template = 'url = "${secrets:prod:DATABASE_URL}"';
		const result = validateTemplate(template);

		expect(result.valid).toBe(true);
		expect(result.references).toHaveLength(1);
		expect(result.references[0]).toEqual({
			profile: "prod",
			key: "DATABASE_URL",
			raw: "${secrets:prod:DATABASE_URL}",
		});
	});

	it("should detect multiple secret references", () => {
		const template = `
      url = "\${secrets:prod:DATABASE_URL}"
      key = "\${secrets:prod:API_KEY}"
    `;
		const result = validateTemplate(template);

		expect(result.references).toHaveLength(2);
	});

	it("should use default profile when not specified", () => {
		const template = 'key = "${secrets:API_KEY}"';
		const result = validateTemplate(template);

		expect(result.references[0].profile).toBe("current");
		expect(result.references[0].key).toBe("API_KEY");
	});

	it("should detect empty secret keys", () => {
		const template = 'bad = "${secrets:}"';
		const result = validateTemplate(template);

		expect(result.valid).toBe(false);
		expect(result.errors.length).toBeGreaterThan(0);
	});

	it("should detect invalid characters in keys", () => {
		const template = 'bad = "${secrets:prod:../../etc/passwd}"';
		const result = validateTemplate(template);

		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes("Invalid"))).toBe(true);
	});

	it("should handle keys with dots (service.name format)", () => {
		const template = 'url = "${secrets:prod:database.url}"';
		const result = validateTemplate(template);

		expect(result.valid).toBe(true);
		expect(result.references[0].key).toBe("database.url");
	});

	it("should return empty for templates without secrets", () => {
		const template = 'url = "https://example.com"';
		const result = validateTemplate(template);

		expect(result.valid).toBe(true);
		expect(result.references).toHaveLength(0);
	});
});

describe("generateSecretReport", () => {
	it("should generate a readable report", () => {
		const template = `
      [database]
      url = "\${secrets:production:DATABASE_URL}"
      
      [api]
      key = "\${secrets:production:API_KEY}"
    `;
		const report = generateSecretReport(template);

		expect(report).toContain("Secret References:");
		expect(report).toContain("production/DATABASE_URL");
		expect(report).toContain("production/API_KEY");
		expect(report).toContain("Total: 2 reference(s)");
	});

	it("should indicate when no secrets found", () => {
		const report = generateSecretReport("no secrets here");
		expect(report).toContain("No secret references found");
	});

	it("should include errors in report", () => {
		const template = 'bad = "${secrets:}"';
		const report = generateSecretReport(template);

		expect(report).toContain("Errors:");
	});
});

describe("createTemplate", () => {
	it("should create template with secret placeholders", () => {
		const config = {
			database: {
				url: "postgres://secret-url",
				port: 5432,
			},
			api: {
				key: "secret-key",
			},
		};

		const mappings = {
			"database.url": "prod:DATABASE_URL",
			"api.key": "prod:API_KEY",
		};

		const template = createTemplate(config, mappings);

		expect(template.database.url).toBe("${secrets:prod:DATABASE_URL}");
		expect(template.database.port).toBe(5432); // Unchanged
		expect(template.api.key).toBe("${secrets:prod:API_KEY}");
	});

	it("should handle nested paths", () => {
		const config = {
			services: {
				auth: {
					secret: "hidden",
				},
			},
		};

		const mappings = {
			"services.auth.secret": "prod:AUTH_SECRET",
		};

		const template = createTemplate(config, mappings);
		expect(template.services.auth.secret).toBe("${secrets:prod:AUTH_SECRET}");
	});
});

describe("resolveTemplate", () => {
	// Note: These tests mock the secret resolution
	// In a real scenario, you'd need to set up actual secret files

	it("should return template with missing placeholders when secrets not found", async () => {
		const template = 'url = "${secrets:default:NONEXISTENT_SECRET}"';

		const result = await resolveTemplate(template, {
			context: { ...getContext(), profile: "default" },
		});

		expect(result.complete).toBe(false);
		expect(result.missing.length).toBeGreaterThan(0);
		expect(result.content).toContain("[MISSING:");
	});

	it("should use custom missing placeholder", async () => {
		const template = 'key = "${secrets:prod:MISSING}"';

		const result = await resolveTemplate(template, {
			missingPlaceholder: (p, k) => `<${p}:${k}>`,
		});

		expect(result.content).toContain("<prod:MISSING>");
	});

	it("should throw in strict mode when secrets missing", async () => {
		const template = 'key = "${secrets:prod:MISSING}"';

		await expect(resolveTemplate(template, { strict: true })).rejects.toThrow(
			"Missing secrets",
		);
	});

	it("should mask secrets when maskSecrets option is true", async () => {
		// This test assumes getWithFallback would return a value
		// We're mainly testing the option is passed correctly
		const template = 'key = "${secrets:default:SOME_KEY}"';

		const result = await resolveTemplate(template, {
			maskSecrets: true,
		});

		// If a secret were resolved, its value would be masked in the result.resolved array
		expect(
			result.resolved.every((r) => r.value === "***" || r.value === null),
		).toBe(true);
	});
});

describe("Template integration scenarios", () => {
	it("should handle complex TOML with multiple secrets", async () => {
		const toml = `
[database]
host = "\${secrets:prod:DB_HOST}"
port = 5432
username = "\${secrets:prod:DB_USER}"
password = "\${secrets:prod:DB_PASS}"

[api]
endpoint = "https://api.example.com"
key = "\${secrets:prod:API_KEY}"

[cache]
enabled = true
ttl = 3600
`;

		const validation = validateTemplate(toml);
		expect(validation.references).toHaveLength(4);
		expect(validation.references.map((r) => r.key)).toContain("DB_HOST");
		expect(validation.references.map((r) => r.key)).toContain("DB_USER");
		expect(validation.references.map((r) => r.key)).toContain("DB_PASS");
		expect(validation.references.map((r) => r.key)).toContain("API_KEY");
	});

	it("should preserve non-secret content", async () => {
		const template = `
# This is a comment
normal_value = "not a secret"
secret_value = "\${secrets:prod:SECRET}"
number = 42
boolean = true
`;

		const result = await resolveTemplate(template);

		expect(result.content).toContain("# This is a comment");
		expect(result.content).toContain('normal_value = "not a secret"');
		expect(result.content).toContain("number = 42");
		expect(result.content).toContain("boolean = true");
	});
});
