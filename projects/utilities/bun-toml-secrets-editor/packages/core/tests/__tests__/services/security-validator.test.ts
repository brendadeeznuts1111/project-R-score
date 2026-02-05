// __tests__/services/security-validator.test.ts
import { expect, test } from "bun:test";
import { SecurityValidator } from "../../services/security-validator";
import type { TomlSecret } from "../../types/toml-secrets";

const validator = new SecurityValidator();

test("should validate TOML with valid secrets", () => {
	const toml = {
		database: {
			host: "${DB_HOST:-localhost}",
			password: "${DB_PASSWORD}",
		},
	};

	const result = validator.validateToml(toml, "test.toml");
	expect(result.valid).toBe(true);
	expect(result.errors.length).toBe(0);
});

test("should detect dangerous secrets", () => {
	const secrets: TomlSecret[] = [
		{
			name: "DB_PASSWORD",
			value: "${DB_PASSWORD}",
			hasDefault: false,
			classification: "dangerous",
			isDangerous: true,
			location: { file: "test.toml", keyPath: "database.password" },
		},
		{
			name: "API_TOKEN",
			value: "${API_TOKEN}",
			hasDefault: false,
			classification: "secret",
			isDangerous: true,
			location: { file: "test.toml", keyPath: "api.token" },
		},
		{
			name: "NORMAL_VAR",
			value: "${NORMAL_VAR}",
			hasDefault: true,
			classification: "public",
			isDangerous: false,
			location: { file: "test.toml", keyPath: "app.var" },
		},
	];

	const dangerous = validator.scanDangerousSecrets(secrets);
	expect(dangerous.length).toBe(2);
	expect(dangerous.map((s) => s.name)).toContain("DB_PASSWORD");
	expect(dangerous.map((s) => s.name)).toContain("API_TOKEN");
});

test("should calculate risk score correctly", () => {
	const toml = {
		database: {
			password: "${DB_PASSWORD}", // No default, dangerous
		},
		api: {
			key: "${API_KEY}", // No default
		},
	};

	const result = validator.validateToml(toml, "test.toml");
	expect(result.riskScore).toBeGreaterThan(0);
});

test("should validate secrets in parallel", async () => {
	const secrets: TomlSecret[] = [
		{
			name: "SECRET_1",
			value: "${SECRET_1}",
			hasDefault: false,
			classification: "secret",
			isDangerous: true,
			location: { file: "test.toml", keyPath: "secret1" },
		},
		{
			name: "SECRET_2",
			value: "${SECRET_2}",
			hasDefault: false,
			classification: "secret",
			isDangerous: true,
			location: { file: "test.toml", keyPath: "secret2" },
		},
	];

	const results = await validator.validateSecretsParallel(secrets);
	expect(results.length).toBe(2);
	expect(results.every((r) => r === true)).toBe(true);
});
