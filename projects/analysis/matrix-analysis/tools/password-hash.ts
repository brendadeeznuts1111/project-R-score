#!/usr/bin/env bun
/**
 * Bun Password Hashing Utility
 *
 * Production-ready Argon2id password hashing with sensible defaults
 * based on OWASP and NIST recommendations.
 *
 * @see https://bun.sh/docs/api/hashing
 */

// OWASP-recommended Argon2id configurations
export const ARGON2_CONFIGS = {
	// Production (recommended for most applications)
	production: {
		algorithm: "argon2id" as const,
		memoryCost: 65536, // 64 MiB (2^16 KB)
		timeCost: 3, // 3 iterations
		parallelism: 4, // 4 threads
	},

	// High security (financial, healthcare)
	highSecurity: {
		algorithm: "argon2id" as const,
		memoryCost: 131072, // 128 MiB (2^17 KB)
		timeCost: 4, // 4 iterations
		parallelism: 4, // 4 threads
	},

	// Balanced (default)
	balanced: {
		algorithm: "argon2id" as const,
		memoryCost: 32768, // 32 MiB (2^15 KB)
		timeCost: 2, // 2 iterations
		parallelism: 2, // 2 threads
	},

	// Development (faster, less secure)
	development: {
		algorithm: "argon2id" as const,
		memoryCost: 16384, // 16 MiB (2^14 KB)
		timeCost: 1, // 1 iteration
		parallelism: 1, // 1 thread
	},
} as const;

type ConfigLevel = keyof typeof ARGON2_CONFIGS;

/**
 * Hash a password with Argon2id
 */
export async function hashPassword(
	password: string,
	level: ConfigLevel = "production",
): Promise<string> {
	if (!password || password.length < 8) {
		throw new Error("Password must be at least 8 characters");
	}

	const config = ARGON2_CONFIGS[level];
	return await Bun.password.hash(password, config);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
	try {
		return await Bun.password.verify(password, hash);
	} catch {
		return false;
	}
}

/**
 * Benchmark Argon2id configurations on current hardware
 */
export async function benchmarkConfigs(): Promise<Record<ConfigLevel, number>> {
	const results = {} as Record<ConfigLevel, number>;
	const testPassword = "test-password-for-benchmark";

	console.log("🔍 Benchmarking Argon2id configurations...\n");

	for (const [level, config] of Object.entries(ARGON2_CONFIGS)) {
		const iterations = 5;
		const times: number[] = [];

		// Warmup
		await Bun.password.hash(testPassword, config);

		// Benchmark
		for (let i = 0; i < iterations; i++) {
			const start = performance.now();
			await Bun.password.hash(testPassword, config);
			times.push(performance.now() - start);
		}

		const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
		results[level as ConfigLevel] = avgTime;

		console.log(
			`${level.padEnd(15)} ${config.memoryCost / 1024}MiB, t=${config.timeCost}, p=${config.parallelism}  →  ${avgTime.toFixed(1)}ms`,
		);
	}

	console.log("\n💡 Recommendation: Use 'production' for most apps (100-500ms target)");
	return results;
}

/**
 * Check if a hash needs to be upgraded to stronger settings
 */
export function needsRehash(hash: string, targetLevel: ConfigLevel): boolean {
	// Bun's hash format: $argon2id$v=19$m=65536,t=3,p=4$...
	const match = hash.match(/\$m=(\d+),t=(\d+),p=(\d+)\$/);
	if (!match) return true;

	const [, m, t, p] = match.map(Number);
	const target = ARGON2_CONFIGS[targetLevel];

	return m < target.memoryCost || t < target.timeCost || p < target.parallelism;
}

// CLI Interface
async function main() {
	const args = process.argv.slice(2);
	const command = args[0];

	if (command === "hash") {
		const password = args[1];
		const level = (args[2] as ConfigLevel) || "production";

		if (!password) {
			console.error("Usage: bun password-hash.ts hash <password> [level]");
			process.exit(1);
		}

		const hash = await hashPassword(password, level);
		console.log(`Level: ${level}`);
		console.log(`Hash: ${hash}`);
	} else if (command === "verify") {
		const password = args[1];
		const hash = args[2];

		if (!password || !hash) {
			console.error("Usage: bun password-hash.ts verify <password> <hash>");
			process.exit(1);
		}

		const valid = await verifyPassword(password, hash);
		console.log(valid ? "✅ Valid" : "❌ Invalid");
		process.exit(valid ? 0 : 1);
	} else if (command === "benchmark") {
		await benchmarkConfigs();
	} else if (command === "check-rehash") {
		const hash = args[1];
		const level = (args[2] as ConfigLevel) || "production";

		if (!hash) {
			console.error("Usage: bun password-hash.ts check-rehash <hash> [level]");
			process.exit(1);
		}

		const needs = needsRehash(hash, level);
		console.log(needs ? "⚠️  Needs rehash" : "✅ Hash is up to date");
		process.exit(needs ? 1 : 0);
	} else {
		console.log(`
Bun Password Hashing Utility

USAGE:
  bun tools/password-hash.ts <command> [options]

COMMANDS:
  hash <password> [level]        Hash a password
  verify <password> <hash>       Verify a password
  benchmark                      Benchmark all configs
  check-rehash <hash> [level]    Check if hash needs upgrade

LEVELS:
  production    64MiB, t=3, p=4  (recommended, ~150-300ms)
  highSecurity  128MiB, t=4, p=4 (financial/healthcare, ~250-500ms)
  balanced      32MiB, t=2, p=2  (moderate, ~50-150ms)
  development   16MiB, t=1, p=1  (fast, ~10-50ms)

EXAMPLES:
  bun tools/password-hash.ts hash "my-password"
  bun tools/password-hash.ts hash "my-password" highSecurity
  bun tools/password-hash.ts verify "my-password" "$argon2id$..."
  bun tools/password-hash.ts benchmark
`);
	}
}

if (import.meta.main) {
	main().catch((err) => {
		console.error(err);
		process.exit(1);
	});
}
