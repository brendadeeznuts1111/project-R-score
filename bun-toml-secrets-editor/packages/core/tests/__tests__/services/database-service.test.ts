// __tests__/services/database-service.test.ts
import { beforeEach, expect, test } from "bun:test";
import { DatabaseService } from "../../services/database-service";
import type { SecretLifecycle, TomlSecret } from "../../types/toml-secrets";

let db: DatabaseService;

beforeEach(() => {
	db = new DatabaseService(":memory:");
});

test("should initialize schema correctly", () => {
	// Schema initialization happens in constructor
	expect(db).toBeDefined();
});

test("should batch insert secrets", async () => {
	const secrets: TomlSecret[] = [
		{
			name: "TEST_SECRET",
			value: "${TEST_SECRET}",
			hasDefault: false,
			classification: "secret",
			isDangerous: true,
			location: { file: "test.toml", keyPath: "test.secret" },
		},
	];

	await db.batchInsertSecrets(secrets);

	// Verify insertion by checking if we can query
	const allSecrets = db.getSecretsWithPatterns();
	expect(allSecrets.length).toBeGreaterThan(0);
});

test("should save and load lifecycle", async () => {
	const lifecycle: SecretLifecycle = {
		created: new Date(),
		lastRotated: new Date(),
		expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
		rotationPolicy: "automatic",
		rotationIntervalDays: 90,
		lastUsed: new Date(),
		usageCount: 1,
		status: "active",
	};

	await db.saveLifecycle(lifecycle, "TEST_SECRET", "password");

	const loaded = await db.loadLifecycle("TEST_SECRET");
	expect(loaded).not.toBeNull();
	expect(loaded?.status).toBe("active");
	expect(loaded?.usageCount).toBe(1);
});

test("should handle lifecycle persistence across operations", async () => {
	const lifecycle: SecretLifecycle = {
		created: new Date(),
		lastRotated: new Date(),
		rotationPolicy: "manual",
		usageCount: 5,
		status: "active",
	};

	await db.saveLifecycle(lifecycle, "TEST_SECRET_2", "default");

	// Update lifecycle
	lifecycle.usageCount = 10;
	await db.saveLifecycle(lifecycle, "TEST_SECRET_2", "default");

	const loaded = await db.loadLifecycle("TEST_SECRET_2");
	expect(loaded?.usageCount).toBe(10);
});

test("should load all lifecycles", async () => {
	const lifecycle1: SecretLifecycle = {
		created: new Date(),
		lastRotated: new Date(),
		rotationPolicy: "automatic",
		usageCount: 1,
		status: "active",
	};

	const lifecycle2: SecretLifecycle = {
		created: new Date(),
		lastRotated: new Date(),
		rotationPolicy: "manual",
		usageCount: 2,
		status: "active",
	};

	await db.saveLifecycle(lifecycle1, "SECRET_1", "password");
	await db.saveLifecycle(lifecycle2, "SECRET_2", "api-key");

	const all = await db.loadAllLifecycles();
	expect(all.size).toBe(2);
	expect(all.has("SECRET_1")).toBe(true);
	expect(all.has("SECRET_2")).toBe(true);
});
