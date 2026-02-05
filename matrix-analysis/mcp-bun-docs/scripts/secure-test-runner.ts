#!/usr/bin/env bun
/**
 * SecureTestRunner — Config inheritance with security validation
 * Tier-1380: Inherits [install] for private registry auth, validates env isolation
 * @col_93 balanced_braces (skills)
 *
 * Run: bun mcp-bun-docs/scripts/secure-test-runner.ts [ci|local|staging]
 */
import { existsSync, readFileSync } from "node:fs";

/** Configuration schema with inheritance (maps to bunfig.toml sections) */
export interface BunTestConfig {
	install: {
		registry?: string;
		cafile?: string;
		prefer?: "offline" | "online";
		exact?: boolean;
	};
	test: {
		root?: string;
		preload?: string[];
		timeout?: number;
		smol?: boolean;
		coverage?:
			| boolean
			| {
					reporter: ("text" | "lcov")[];
					threshold: { lines: number; functions: number };
					pathIgnore: string[];
			  };
	};
	"test.ci"?: Partial<BunTestConfig["test"]>;
	"test.staging"?: Partial<BunTestConfig["test"]>;
}

const PROD_PATTERNS = [
	/prod\.api\./i,
	/production\./i,
	/\.prod\b/i,
	/prod-[a-z0-9-]+\./i,
];

/** Pre-test security audit — gates deployment in CI */
export const preTestAudit = {
	verifyNoProdSecrets: async (envFile: string): Promise<boolean> => {
		if (!existsSync(envFile)) return true;
		const content = await Bun.file(envFile).text();
		return !content.includes("prod.api.company.com");
	},

	validateRegistryToken: async (_registry: string): Promise<boolean> => {
		// Stub: wire to SecureCookieManager / CSRFProtector.verifyTokenScope
		return true;
	},

	coverageThreshold: {
		lines: 0.85,
		functions: 0.9,
		blocks: 0.8,
	} as const,
};

export class SecureTestRunner {
	private config: BunTestConfig;

	constructor(bunfigPath: string) {
		this.config = this.loadSecureConfig(bunfigPath);
		this.validateEnvironmentIsolation();
	}

	private loadSecureConfig(_bunfigPath: string): BunTestConfig {
		// Stub: For full bunfig.toml parsing, use a TOML parser (e.g. @iarna/toml).
		// Bun inherits [install] automatically when running `bun test`.
		return {
			install: {
				registry: process.env.npm_config_registry ?? "https://registry.npmjs.org",
				cafile: process.env.NODE_EXTRA_CA_CERTS,
				prefer: "offline",
				exact: true,
			},
			test: {
				root: ".",
				preload: ["./test-setup.ts", "./global-mocks.ts"],
				timeout: 10000,
				smol: false,
				coverage: false,
			},
			"test.ci": { coverage: true, timeout: 30000 },
			"test.staging": { timeout: 15000 },
		};
	}

	private validateEnvironmentIsolation(): void {
		const testEnvPath = ".env.test";
		if (!existsSync(testEnvPath)) return;
		const content = readFileSync(testEnvPath, "utf8");
		for (const pat of PROD_PATTERNS) {
			if (pat.test(content)) {
				throw new Error(
					`Environment isolation failed: .env.test contains prod-like pattern: ${pat}`,
				);
			}
		}
	}

	private async getRegistryToken(): Promise<string | undefined> {
		// Stub: Use Bun.secrets for token: Bun.secrets.get({ service, name })
		return process.env.NPM_TOKEN ?? process.env.GITHUB_TOKEN;
	}

	private getSecureTestDbUrl(): string {
		return process.env.TEST_DATABASE_URL ?? "postgresql://localhost:5432/test_db";
	}

	async runWithSecurity(context: "ci" | "local" | "staging"): Promise<number> {
		const profileKey = `test.${context}` as keyof BunTestConfig;
		const profile =
			(this.config[profileKey] as BunTestConfig["test"]) ?? this.config.test;

		const envFile = `.env.${context}`;
		const ok = await preTestAudit.verifyNoProdSecrets(envFile);
		if (!ok) {
			throw new Error(`preTestAudit failed: ${envFile} contains prod secrets`);
		}

		const registry = this.config.install.registry ?? "https://registry.npmjs.org";
		const tokenValid = await preTestAudit.validateRegistryToken(registry);
		if (!tokenValid) {
			throw new Error(`preTestAudit failed: registry token invalid for ${registry}`);
		}

		const installAuth = {
			registry: this.config.install.registry,
			cafile: this.config.install.cafile,
			token: await this.getRegistryToken(),
		};

		const preload = profile.preload?.[0] ?? "./global-mocks.ts";
		const args = ["bun", "test"];
		if (existsSync(envFile)) args.push(`--env-file=${envFile}`);
		// --config=ci loads [test.ci]; only pass when section exists in bunfig.toml
		if (context === "ci") args.push("--config=ci");
		args.push("--preload", preload);

		const proc = Bun.spawn(args, {
			env: {
				...process.env,
				TEST_DATABASE_URL: this.getSecureTestDbUrl(),
				CSRF_TEST_MODE: "enabled",
				NPM_TOKEN: installAuth.token ?? "",
			},
			stdout: "inherit",
			stderr: "inherit",
		});

		return proc.exited;
	}
}

const context = (process.argv[2] ?? "local") as "ci" | "local" | "staging";
if (!["ci", "local", "staging"].includes(context)) {
	console.error(
		"Usage: bun mcp-bun-docs/scripts/secure-test-runner.ts [ci|local|staging]",
	);
	process.exit(1);
}

const runner = new SecureTestRunner(".bunfig.toml");
runner.runWithSecurity(context).then((code) => process.exit(code));
