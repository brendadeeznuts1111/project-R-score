/**
 * Tests for secrets-config-resolver
 *
 * Verifies hybrid configuration resolution (CLI flags + env vars + XDG + defaults)
 */

import { describe, expect, it } from "bun:test";
import {
	createMockEnv,
	formatConfigSummary,
	resolveAllConfig,
	resolveConfigFile,
	resolveProfile,
	resolveSecretsDir,
	validateConfigPaths,
} from "../config/secrets-config-resolver";

describe("resolveSecretsDir", () => {
	it("should use CLI flag --secrets-dir=/path (equals syntax)", () => {
		const result = resolveSecretsDir({
			args: ["--secrets-dir=/custom/path", "other-arg"],
			env: {},
		});

		expect(result.path).toEndWith("/custom/path");
		expect(result.source).toBe("cli-flag");
		expect(result.originalValue).toBe("/custom/path");
	});

	it("should use CLI flag --secrets-dir /path (space syntax)", () => {
		const result = resolveSecretsDir({
			args: ["--secrets-dir", "/space/syntax", "other-arg"],
			env: {},
		});

		expect(result.path).toEndWith("/space/syntax");
		expect(result.source).toBe("cli-flag");
	});

	it("should prefer CLI flag over env var", () => {
		const result = resolveSecretsDir({
			args: ["--secrets-dir=/cli/path"],
			env: { BUN_SECRETS_DIR: "/env/path" },
		});

		expect(result.path).toEndWith("/cli/path");
		expect(result.source).toBe("cli-flag");
	});

	it("should fall back to BUN_SECRETS_DIR env var", () => {
		const result = resolveSecretsDir({
			args: [],
			env: { BUN_SECRETS_DIR: "/env/path" },
		});

		expect(result.path).toEndWith("/env/path");
		expect(result.source).toBe("env-var");
	});

	it("should fall back to XDG_CONFIG_HOME", () => {
		const result = resolveSecretsDir({
			args: [],
			env: { XDG_CONFIG_HOME: "/xdg/config" },
		});

		expect(result.path).toEndWith("/xdg/config/bun-secrets");
		expect(result.source).toBe("xdg");
	});

	it("should prefer env var over XDG", () => {
		const result = resolveSecretsDir({
			args: [],
			env: {
				BUN_SECRETS_DIR: "/env/path",
				XDG_CONFIG_HOME: "/xdg/config",
			},
		});

		expect(result.path).toEndWith("/env/path");
		expect(result.source).toBe("env-var");
	});

	it("should use default when nothing specified", () => {
		const result = resolveSecretsDir({
			args: [],
			env: {},
		});

		expect(result.path).toContain(".config/bun-secrets");
		expect(result.source).toBe("default");
	});

	it("should resolve relative paths to absolute", () => {
		const result = resolveSecretsDir({
			args: ["--secrets-dir=./relative/path"],
			env: {},
		});

		expect(result.path).not.toContain("./");
		expect(result.path).toEndWith("/relative/path");
	});

	it("should handle paths with equals signs", () => {
		const result = resolveSecretsDir({
			args: ["--secrets-dir=/path/with=equals"],
			env: {},
		});

		expect(result.path).toEndWith("/path/with=equals");
	});
});

describe("resolveConfigFile", () => {
	it("should return null when no config specified", () => {
		const result = resolveConfigFile({
			args: [],
			env: {},
		});

		expect(result).toBeNull();
	});

	it("should use CLI flag --config-file=/path (equals syntax)", () => {
		const result = resolveConfigFile({
			args: ["--config-file=/etc/secrets.toml"],
			env: {},
		});

		expect(result?.path).toEndWith("/etc/secrets.toml");
		expect(result?.source).toBe("cli-flag");
	});

	it("should use CLI flag --config-file /path (space syntax)", () => {
		const result = resolveConfigFile({
			args: ["--config-file", "/space/config.json"],
			env: {},
		});

		expect(result?.path).toEndWith("/space/config.json");
		expect(result?.source).toBe("cli-flag");
	});

	it("should use BUN_SECRETS_CONFIG env var", () => {
		const result = resolveConfigFile({
			args: [],
			env: { BUN_SECRETS_CONFIG: "/env/config.toml" },
		});

		expect(result?.path).toEndWith("/env/config.toml");
		expect(result?.source).toBe("env-var");
	});

	it("should prefer CLI flag over env var", () => {
		const result = resolveConfigFile({
			args: ["--config-file=/cli/config.toml"],
			env: { BUN_SECRETS_CONFIG: "/env/config.toml" },
		});

		expect(result?.path).toEndWith("/cli/config.toml");
		expect(result?.source).toBe("cli-flag");
	});
});

describe("resolveProfile", () => {
	it("should use CLI flag --profile=<name>", () => {
		const result = resolveProfile({
			args: ["--profile=production"],
			env: {},
		});

		expect(result.path).toBe("production");
		expect(result.source).toBe("cli-flag");
	});

	it("should use CLI flag --profile <name> (space syntax)", () => {
		const result = resolveProfile({
			args: ["--profile", "staging"],
			env: {},
		});

		expect(result.path).toBe("staging");
		expect(result.source).toBe("cli-flag");
	});

	it("should use BUN_SECRETS_PROFILE env var", () => {
		const result = resolveProfile({
			args: [],
			env: { BUN_SECRETS_PROFILE: "development" },
		});

		expect(result.path).toBe("development");
		expect(result.source).toBe("env-var");
	});

	it("should map NODE_ENV=production to profile 'production'", () => {
		const result = resolveProfile({
			args: [],
			env: { NODE_ENV: "production" },
		});

		expect(result.path).toBe("production");
		expect(result.source).toBe("env-var");
	});

	it("should map NODE_ENV=development to profile 'development'", () => {
		const result = resolveProfile({
			args: [],
			env: { NODE_ENV: "development" },
		});

		expect(result.path).toBe("development");
		expect(result.source).toBe("env-var");
	});

	it("should prefer CLI flag over NODE_ENV", () => {
		const result = resolveProfile({
			args: ["--profile=custom"],
			env: { NODE_ENV: "production" },
		});

		expect(result.path).toBe("custom");
		expect(result.source).toBe("cli-flag");
	});

	it("should use 'default' when nothing specified", () => {
		const result = resolveProfile({
			args: [],
			env: {},
		});

		expect(result.path).toBe("default");
		expect(result.source).toBe("default");
	});
});

describe("resolveAllConfig", () => {
	it("should resolve all configuration sources", () => {
		const result = resolveAllConfig({
			args: ["--secrets-dir=/custom", "--profile=prod"],
			env: { BUN_SECRETS_CONFIG: "/config.toml" },
		});

		expect(result.secretsDir.path).toEndWith("/custom");
		expect(result.secretsDir.source).toBe("cli-flag");
		expect(result.profile.path).toBe("prod");
		expect(result.profile.source).toBe("cli-flag");
		expect(result.configFile?.path).toEndWith("/config.toml");
		expect(result.configFile?.source).toBe("env-var");
	});

	it("should handle mixed sources correctly", () => {
		const result = resolveAllConfig({
			args: ["--secrets-dir=/cli/path"],
			env: {
				BUN_SECRETS_PROFILE: "staging",
				// No BUN_SECRETS_CONFIG
			},
		});

		expect(result.secretsDir.source).toBe("cli-flag");
		expect(result.profile.source).toBe("env-var");
		expect(result.configFile).toBeNull();
	});
});

describe("validateConfigPaths", () => {
	it("should validate valid configuration", () => {
		const config = resolveAllConfig({
			args: ["--secrets-dir=/valid/path", "--profile=production"],
			env: {},
		});

		const validation = validateConfigPaths(config);
		expect(validation.valid).toBe(true);
		expect(validation.errors).toHaveLength(0);
	});

	it("should detect path traversal in secrets directory", () => {
		const config = resolveAllConfig({
			args: ["--secrets-dir=/path/../traversal"],
			env: {},
		});

		const validation = validateConfigPaths(config);
		expect(validation.valid).toBe(false);
		expect(validation.errors.length).toBeGreaterThan(0);
		expect(validation.errors[0]).toContain("Invalid");
	});

	it("should detect invalid profile names", () => {
		const config = resolveAllConfig({
			args: ["--profile=invalid/profile"],
			env: {},
		});

		const validation = validateConfigPaths(config);
		expect(validation.valid).toBe(false);
		expect(validation.errors.some((e) => e.includes("profile"))).toBe(true);
	});

	it("should allow alphanumeric profile names with underscore and hyphen", () => {
		const config = resolveAllConfig({
			args: ["--profile=prod-v1_test"],
			env: {},
		});

		const validation = validateConfigPaths(config);
		expect(validation.valid).toBe(true);
	});
});

describe("formatConfigSummary", () => {
	it("should format configuration summary", () => {
		const config = resolveAllConfig({
			args: ["--secrets-dir=/custom", "--profile=prod"],
			env: { BUN_SECRETS_CONFIG: "/config.toml" },
		});

		const summary = formatConfigSummary(config);

		expect(summary).toContain("Configuration Resolution");
		expect(summary).toContain("/custom");
		expect(summary).toContain("cli-flag");
		expect(summary).toContain("prod");
		expect(summary).toContain("/config.toml");
	});

	it("should handle missing config file gracefully", () => {
		const config = resolveAllConfig({
			args: [],
			env: {},
		});

		const summary = formatConfigSummary(config);

		expect(summary).toContain("Config File: (not specified)");
	});
});

describe("createMockEnv", () => {
	it("should create mock environment with defaults", () => {
		const env = createMockEnv();

		expect(env.HOME).toBe("/home/test");
		expect(env.USER).toBe("testuser");
	});

	it("should allow overriding defaults", () => {
		const env = createMockEnv({ HOME: "/custom/home" });

		expect(env.HOME).toBe("/custom/home");
		expect(env.USER).toBe("testuser"); // Default preserved
	});
});

describe("Priority order integration", () => {
	it("should follow correct priority: CLI > ENV > XDG > DEFAULT", () => {
		// Test CLI flag wins
		const cliResult = resolveSecretsDir({
			args: ["--secrets-dir=/cli"],
			env: {
				BUN_SECRETS_DIR: "/env",
				XDG_CONFIG_HOME: "/xdg",
			},
		});
		expect(cliResult.source).toBe("cli-flag");

		// Test env var wins over XDG
		const envResult = resolveSecretsDir({
			args: [],
			env: {
				BUN_SECRETS_DIR: "/env",
				XDG_CONFIG_HOME: "/xdg",
			},
		});
		expect(envResult.source).toBe("env-var");

		// Test XDG wins over default
		const xdgResult = resolveSecretsDir({
			args: [],
			env: { XDG_CONFIG_HOME: "/xdg" },
		});
		expect(xdgResult.source).toBe("xdg");

		// Test default when nothing else
		const defaultResult = resolveSecretsDir({
			args: [],
			env: {},
		});
		expect(defaultResult.source).toBe("default");
	});
});
