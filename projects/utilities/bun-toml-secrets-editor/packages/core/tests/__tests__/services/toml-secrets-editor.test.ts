// __tests__/services/toml-secrets-editor.test.ts
import { beforeEach, expect, test } from "bun:test";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { TomlSecretsEditor } from "../../services/toml-secrets-editor";
import { createTestToml } from "../setup";

const TEST_FILE = join(process.cwd(), "test-secrets.toml");

beforeEach(async () => {
	// Create test file
	await writeFile(TEST_FILE, createTestToml());
});

test("should create editor instance", () => {
	const editor = new TomlSecretsEditor(TEST_FILE);
	expect(editor).toBeDefined();
});

test("should extract secrets from TOML", async () => {
	const editor = new TomlSecretsEditor(TEST_FILE);
	const toml = {
		database: {
			host: "${DB_HOST:-localhost}",
			password: "${DB_PASSWORD}",
		},
		api: {
			key: "${API_KEY}",
		},
	};

	const secrets = editor.extractAllSecrets(toml);
	expect(secrets.length).toBeGreaterThan(0);
	expect(secrets.some((s) => s.name === "DB_PASSWORD")).toBe(true);
});

test("should validate secrets", async () => {
	const editor = new TomlSecretsEditor(TEST_FILE);
	const result = await editor.validate();

	expect(result).toBeDefined();
	expect(result.valid).toBeDefined();
	expect(result.riskScore).toBeGreaterThanOrEqual(0);
});

test("should register secret lifecycle", async () => {
	const editor = new TomlSecretsEditor(TEST_FILE);
	const secret = {
		name: "TEST_SECRET",
		value: "${TEST_SECRET}",
		hasDefault: false,
		classification: "secret" as const,
		isDangerous: true,
		location: { file: TEST_FILE, keyPath: "test.secret" },
	};

	await editor.registerSecretLifecycle(secret);

	const lifecycle = await editor.checkSecretLifecycle("TEST_SECRET");
	expect(lifecycle).toBeDefined();
	expect(lifecycle.status).toBe("active");
});

test("should handle file read errors gracefully", async () => {
	const editor = new TomlSecretsEditor("/nonexistent/file.toml");

	await expect(editor.validate()).rejects.toThrow();
});
