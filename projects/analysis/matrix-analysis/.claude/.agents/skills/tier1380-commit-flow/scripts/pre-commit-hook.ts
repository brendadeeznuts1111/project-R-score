#!/usr/bin/env bun

/**
 * Tier-1380 OMEGA Pre-Commit Hook
 * Comprehensive checks before allowing commits
 */

import { Database } from "bun:sqlite";
import { $ } from "bun";

interface PreCommitConfig {
	enableLint: boolean;
	enableTypeCheck: boolean;
	enableTests: boolean;
	enableSecretsScan: boolean;
	enableCol89: boolean;
	autoFix: boolean;
}

interface CheckResult {
	name: string;
	passed: boolean;
	duration: number;
	details?: string;
}

const DEFAULT_CONFIG: PreCommitConfig = {
	enableLint: true,
	enableTypeCheck: true,
	enableTests: true,
	enableSecretsScan: true,
	enableCol89: true,
	autoFix: false,
};

// Secret patterns to scan for
const SECRET_PATTERNS = [
	{ pattern: /password\s*=\s*["'][^"']{8,}["']/i, name: "Password" },
	{ pattern: /api[_-]?key\s*=\s*["'][^"']{16,}["']/i, name: "API Key" },
	{ pattern: /secret\s*=\s*["'][^"']{16,}["']/i, name: "Secret" },
	{ pattern: /token\s*=\s*["'][^"']{16,}["']/i, name: "Token" },
	{ pattern: /private[_-]?key/i, name: "Private Key" },
	{ pattern: /aws_access_key_id/i, name: "AWS Access Key" },
	{ pattern: /github[_-]?token/i, name: "GitHub Token" },
];

async function runPreCommitChecks(
	config: PreCommitConfig = DEFAULT_CONFIG,
): Promise<CheckResult[]> {
	const results: CheckResult[] = [];
	const _startTime = Bun.nanoseconds();

	// Get staged files
	const stagedFiles = await $`git diff --cached --name-only`.text();
	const files = stagedFiles.trim().split("\n").filter(Boolean);

	if (files.length === 0) {
		return [
			{
				name: "Staged Files",
				passed: false,
				duration: 0,
				details: "No files staged",
			},
		];
	}

	console.log(`📦 Checking ${files.length} staged files...\n`);

	// Secrets scan
	if (config.enableSecretsScan) {
		const checkStart = Bun.nanoseconds();
		const result = await scanSecrets(files);
		result.duration = Number(Bun.nanoseconds() - checkStart) / 1e6;
		results.push(result);
	}

	// Col-89 check
	if (config.enableCol89) {
		const checkStart = Bun.nanoseconds();
		const result = await checkCol89(files);
		result.duration = Number(Bun.nanoseconds() - checkStart) / 1e6;
		results.push(result);
	}

	// Lint check
	if (config.enableLint) {
		const checkStart = Bun.nanoseconds();
		const result = await runLintCheck(config.autoFix);
		result.duration = Number(Bun.nanoseconds() - checkStart) / 1e6;
		results.push(result);
	}

	// Type check
	if (config.enableTypeCheck) {
		const checkStart = Bun.nanoseconds();
		const result = await runTypeCheck();
		result.duration = Number(Bun.nanoseconds() - checkStart) / 1e6;
		results.push(result);
	}

	// Tests check
	if (config.enableTests) {
		const checkStart = Bun.nanoseconds();
		const result = await runTests(files);
		result.duration = Number(Bun.nanoseconds() - checkStart) / 1e6;
		results.push(result);
	}

	return results;
}

async function scanSecrets(files: string[]): Promise<CheckResult> {
	const issues: string[] = [];

	for (const file of files) {
		if (!file.match(/\.(ts|js|json|yaml|yml|toml|env)$/)) continue;

		try {
			const content = await Bun.file(file).text();
			const lines = content.split("\n");

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				for (const { pattern, name } of SECRET_PATTERNS) {
					if (
						pattern.test(line) &&
						!line.includes("// safe") &&
						!line.includes("# safe")
					) {
						issues.push(`${file}:${i + 1}: Potential ${name}`);
					}
				}
			}
		} catch {
			// Skip unreadable files
		}
	}

	return {
		name: "Secrets Scan",
		passed: issues.length === 0,
		duration: 0,
		details: issues.length > 0 ? issues.join("\n") : undefined,
	};
}

async function checkCol89(files: string[]): Promise<CheckResult> {
	const violations: string[] = [];

	for (const file of files) {
		if (!file.endsWith(".ts") && !file.endsWith(".js") && !file.endsWith(".md"))
			continue;

		try {
			const content = await Bun.file(file).text();
			const lines = content.split("\n");

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				// Skip code blocks in markdown
				if (file.endsWith(".md") && line.startsWith("```")) continue;

				const width = Bun.stringWidth(line, { countAnsiEscapeCodes: false });
				if (width > 89) {
					violations.push(`${file}:${i + 1}: ${width} chars (max 89)`);
				}
			}
		} catch {
			// Skip unreadable files
		}
	}

	return {
		name: "Col-89 Compliance",
		passed: violations.length === 0,
		duration: 0,
		details:
			violations.length > 0
				? `${violations.slice(0, 5).join("\n")}${violations.length > 5 ? `\n... and ${violations.length - 5} more` : ""}`
				: undefined,
	};
}

async function runLintCheck(autoFix: boolean): Promise<CheckResult> {
	try {
		if (autoFix) {
			await $`bunx @biomejs/biome check --write --staged`.quiet();
		} else {
			await $`bunx @biomejs/biome check --staged`.quiet();
		}
		return { name: "Biome Lint", passed: true, duration: 0 };
	} catch {
		return {
			name: "Biome Lint",
			passed: false,
			duration: 0,
			details: autoFix
				? "Lint errors remain after auto-fix"
				: "Run with --fix to auto-fix",
		};
	}
}

async function runTypeCheck(): Promise<CheckResult> {
	try {
		await $`bun tsc --noEmit`.quiet();
		return { name: "TypeScript", passed: true, duration: 0 };
	} catch {
		return {
			name: "TypeScript",
			passed: false,
			duration: 0,
			details: "Type errors found. Run 'bun tsc --noEmit' for details",
		};
	}
}

async function runTests(files: string[]): Promise<CheckResult> {
	// Run only tests related to changed files
	const testPatterns = files
		.filter((f) => !f.includes("test"))
		.map((f) => {
			const base = f.replace(/\.(ts|js)$/, "");
			return `${base}.test.ts`;
		});

	try {
		if (testPatterns.length > 0) {
			// Try to run specific tests first
			await $`bun test ${testPatterns}`.quiet();
		} else {
			await $`bun test`.quiet();
		}
		return { name: "Tests", passed: true, duration: 0 };
	} catch {
		return {
			name: "Tests",
			passed: false,
			duration: 0,
			details: "Some tests failed",
		};
	}
}

// Main
if (import.meta.main) {
	const args = Bun.argv.slice(2);
	const autoFix = args.includes("--fix");
	const quick = args.includes("--quick");

	const config: PreCommitConfig = {
		...DEFAULT_CONFIG,
		autoFix,
		enableTests: !quick,
		enableTypeCheck: !quick,
	};

	console.log("╔════════════════════════════════════════════════════════╗");
	console.log("║     Tier-1380 OMEGA Pre-Commit Hook                    ║");
	console.log(
		`${`║     Mode: ${quick ? "Quick (no tests/types)" : "Full"}`.padEnd(55)}║`,
	);
	console.log("╚════════════════════════════════════════════════════════╝");
	console.log();

	const results = await runPreCommitChecks(config);

	// Display results
	console.log("\n📊 Results:");
	console.log();

	let passed = 0;
	let failed = 0;

	for (const result of results) {
		const icon = result.passed ? "✅" : "❌";
		console.log(`${icon} ${result.name} (${result.duration.toFixed(1)}ms)`);

		if (!result.passed && result.details) {
			console.log(`   ${result.details.split("\n").join("\n   ")}`);
		}

		if (result.passed) passed++;
		else failed++;
	}

	// Store in SQLite for analytics
	try {
		const db = new Database(`${process.env.HOME}/.matrix/commit-history.db`);
		db.exec(`
			CREATE TABLE IF NOT EXISTS precommit_checks (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
				passed INTEGER,
				failed INTEGER,
				duration REAL
			)
		`);
		db.query(
			"INSERT INTO precommit_checks (passed, failed, duration) VALUES (?, ?, ?)",
		).run(
			passed,
			failed,
			results.reduce((a, b) => a + b.duration, 0),
		);
		db.close();
	} catch {
		// Ignore DB errors
	}

	console.log();
	console.log(`Total: ${passed} passed, ${failed} failed`);

	if (failed > 0) {
		console.log();
		console.log("⚠️  Fix failing checks before committing");
		console.log();
		console.log("Options:");
		console.log("  --fix    Auto-fix lint issues");
		console.log("  --quick  Skip tests and type check");
		process.exit(1);
	} else {
		console.log();
		console.log("✨ All checks passed! Ready to commit.");
		console.log();
		console.log('Next: git commit -m "[MESSAGE]"');
	}
}

export { runPreCommitChecks, DEFAULT_CONFIG, type PreCommitConfig, type CheckResult };
