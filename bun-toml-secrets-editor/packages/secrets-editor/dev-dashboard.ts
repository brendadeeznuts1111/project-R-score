#!/usr/bin/env bun
/**
 * Enhanced Development Dashboard
 *
 * Comprehensive development tool with:
 * - Interactive menu mode
 * - Category-specific tests & benchmarks
 * - Watch mode for continuous development
 * - Git integration
 * - Build automation
 * - Health checks
 * - Performance tracking
 * - HMR (Hot Module Replacement) monitoring
 */

import { $ } from "bun";
import { spawn } from "child_process";
import { readdir, readFile, stat, writeFile } from "fs/promises";
import { join, resolve } from "path";
import { autoRefresh, hmrMonitor, watchFiles } from "./dev-dashboard-hmr";

// ============================================================================
// HMR Monitoring
// ============================================================================

async function showHMRStatus() {
	printHeader("HMR Status", "Hot Module Replacement Monitoring");

	if (!hmrMonitor.isHMRAvailable()) {
		printWarning("HMR is not available");
		printInfo("Run with: bun --hot src/cli/dev-dashboard.ts");
		return;
	}

	const stats = hmrMonitor.getStats();

	printSection("Connection");
	if (stats.connected) {
		printSuccess("WebSocket Connected");
	} else {
		printError("WebSocket Disconnected");
	}

	printSection("Statistics");
	printInfo(`Total Updates: ${stats.updateCount}`);
	printInfo(`Full Reloads: ${stats.fullReloads}`);
	if (stats.errorCount > 0) {
		printError(`Errors: ${stats.errorCount}`);
	} else {
		printSuccess("Errors: 0");
	}

	if (stats.lastUpdate > 0) {
		const ago = Math.floor((Date.now() - stats.lastUpdate) / 1000);
		printInfo(`Last Update: ${ago}s ago`);
	}

	// Print recent errors
	if (stats.errors.length > 0) {
		printSection("Recent Errors");
		hmrMonitor.printErrors();
	}

	// Print recently updated modules
	if (stats.modulesUpdated.length > 0) {
		printSection("Recently Updated Modules");
		hmrMonitor.printModules();
	}
}

async function watchHMR(category?: string) {
	printHeader("HMR Watch Mode", "Auto-refresh on file changes");

	if (!hmrMonitor.isHMRAvailable()) {
		printWarning("HMR is not available");
		printInfo("Run with: bun --hot src/cli/dev-dashboard.ts watch");
		return;
	}

	printInfo("Watching for file changes...");
	printInfo("Press Ctrl+C to stop\n");

	// Set up auto-refresh
	const unsubscribe = autoRefresh(
		async () => {
			console.clear();
			printHeader("HMR Update", new Date().toLocaleTimeString());

			if (category === "test" || category === "tests") {
				await runTests();
			} else if (category === "bench" || category === "benchmarks") {
				await runBenchmarks();
			} else {
				await showStatus();
			}
		},
		{
			debounce: 500,
			onError: (err) => printError(`Refresh failed: ${err.message}`),
		},
	);

	// Keep process alive
	await new Promise(() => {});
}

async function showHMRErrors() {
	printHeader("HMR Errors", "Recent build/runtime errors");

	if (!hmrMonitor.isHMRAvailable()) {
		printWarning("HMR is not available");
		return;
	}

	hmrMonitor.printErrors();
}

// ============================================================================
// Types & Interfaces
// ============================================================================

interface CategoryInfo {
	name: string;
	description: string;
	examples: string[];
	tests?: string[];
	benchmarks?: string[];
}

interface TestResult {
	name: string;
	passed: boolean;
	duration: number;
	error?: string;
}

interface BenchmarkResult {
	name: string;
	duration: number;
	opsPerSec?: number;
	memoryMB?: number;
}

interface DashboardConfig {
	lastTestRun?: string;
	lastBenchmarkRun?: string;
	testHistory: TestHistoryEntry[];
	benchmarkHistory: BenchmarkHistoryEntry[];
}

interface TestHistoryEntry {
	date: string;
	passed: number;
	failed: number;
	duration: number;
}

interface BenchmarkHistoryEntry {
	date: string;
	suite: string;
	results: BenchmarkResult[];
}

// ============================================================================
// Configuration
// ============================================================================

const CATEGORIES: Record<string, CategoryInfo> = {
	benchmarks: {
		name: "Benchmarks",
		description: "Performance benchmarking scripts",
		examples: [
			"50-col-matrix.ts",
			"bench.ts",
			"dns-prefetch-bench.ts",
			"http-server-bench.ts",
			"spawn-performance-demo.ts",
		],
		benchmarks: [
			"examples/benchmarks/bench.ts",
			"examples/benchmarks/50-col-matrix.ts",
		],
	},
	cli: {
		name: "CLI",
		description: "CLI feature demonstrations",
		examples: [
			"bun-builtin-table-comparison.ts",
			"bunx-argument-parsing-test.ts",
			"cli-demo.ts",
			"currency-formatting-example.ts",
			"matrix-suggestions-demo.ts",
			"profile-name-parser-demo.ts",
			"progress-bar-example.ts",
			"string-width-unicode-test.ts",
			"string-width-indic-scripts.ts",
			"string-width-advanced-indic.ts",
			"string-width-practical-examples.ts",
			"table-formatting-example.ts",
			"url-domain-validation-test.ts",
		],
		tests: ["tests/cli-fixes.test.ts"],
		benchmarks: [
			"examples/cli/string-width-unicode-test.ts",
			"examples/cli/table-formatting-example.ts",
		],
	},
	demos: {
		name: "Demos",
		description: "Interactive feature demos",
		examples: [
			"demo-console-reading.ts",
			"demo-cross-platform-env.ts",
			"demo-env-vars.ts",
			"demo-final-cli.ts",
			"demo-nanosecond-precision.ts",
			"demo-process-management.ts",
			"demo-shell-lines.ts",
			"demo-bun-shell-advanced.ts",
			"demo-sigint-simple.ts",
			"demo-signals.ts",
		],
	},
	ffi: {
		name: "FFI",
		description: "Foreign Function Interface (bun:ffi) examples",
		examples: [
			"bun-ffi-env-vars.ts",
			"bun-ffi-advanced.ts",
			"hello.c",
			"complex.c",
			"test-bun-ffi-env.sh",
		],
	},
	"native-addons": {
		name: "Native Addons",
		description: "V8 native addon examples",
		examples: ["native-addon-v8-example.ts"],
	},
	profiling: {
		name: "Profiling",
		description: "CPU and heap profiling examples",
		examples: ["bun-v1.3.7-profiling-examples.ts"],
	},
	secrets: {
		name: "Secrets",
		description: "TOML and secrets management examples",
		examples: [
			"bun-native-toml-example.ts",
			"bun-toml-advanced.ts",
			"bun-toml-loader-example.ts",
			"define-optimization-demo.ts",
			"enterprise-integration-demo.ts",
			"secrets-hybrid-demo.ts",
			"toml-function-usage.ts",
		],
		tests: ["tests/feature-flags.test.ts"],
		benchmarks: ["examples/secrets/define-optimization-demo.ts"],
	},
};

const COLORS = {
	reset: "\x1b[0m",
	bright: "\x1b[1m",
	dim: "\x1b[2m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	magenta: "\x1b[35m",
	cyan: "\x1b[36m",
	white: "\x1b[37m",
};

// ============================================================================
// Utility Functions
// ============================================================================

function print(text: string) {
	console.log(text);
}

function printHeader(title: string, subtitle?: string) {
	console.log(
		`\n${COLORS.bright}${COLORS.cyan}╔${"═".repeat(48)}╗${COLORS.reset}`,
	);
	console.log(
		`${COLORS.bright}${COLORS.cyan}║${COLORS.reset} ${title.padEnd(46)} ${COLORS.bright}${COLORS.cyan}║${COLORS.reset}`,
	);
	if (subtitle) {
		console.log(
			`${COLORS.bright}${COLORS.cyan}║${COLORS.reset} ${COLORS.dim}${subtitle.padEnd(46)}${COLORS.reset} ${COLORS.bright}${COLORS.cyan}║${COLORS.reset}`,
		);
	}
	console.log(
		`${COLORS.bright}${COLORS.cyan}╚${"═".repeat(48)}╝${COLORS.reset}`,
	);
}

function printSection(title: string) {
	console.log(`\n${COLORS.bright}${COLORS.blue}▶ ${title}${COLORS.reset}`);
	console.log(COLORS.dim + "─".repeat(50) + COLORS.reset);
}

function printSuccess(text: string, icon = "✓") {
	console.log(`${COLORS.green}${icon}${COLORS.reset} ${text}`);
}

function printError(text: string, icon = "✗") {
	console.log(`${COLORS.red}${icon}${COLORS.reset} ${text}`);
}

function printWarning(text: string, icon = "⚠") {
	console.log(`${COLORS.yellow}${icon}${COLORS.reset} ${text}`);
}

function printInfo(text: string, icon = "ℹ") {
	console.log(`${COLORS.blue}${icon}${COLORS.reset} ${text}`);
}

function formatDuration(ms: number): string {
	if (ms < 1000) return `${ms.toFixed(0)}ms`;
	if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
	return `${(ms / 60000).toFixed(2)}m`;
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes}B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
	if (bytes < 1024 * 1024 * 1024)
		return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GB`;
}

// ============================================================================
// Configuration Management
// ============================================================================

async function getConfigPath(): Promise<string> {
	const home = process.env.HOME || process.env.USERPROFILE || "/tmp";
	return join(home, ".config", "bun-toml-secrets-editor", "dashboard.json");
}

async function loadConfig(): Promise<DashboardConfig> {
	try {
		const path = await getConfigPath();
		const content = await readFile(path, "utf-8");
		return JSON.parse(content);
	} catch {
		return { testHistory: [], benchmarkHistory: [] };
	}
}

async function saveConfig(config: DashboardConfig): Promise<void> {
	try {
		const path = await getConfigPath();
		await $`mkdir -p ${join(path, "..")}`.quiet();
		await writeFile(path, JSON.stringify(config, null, 2));
	} catch (err: any) {
		printWarning(`Could not save config: ${err.message}`);
	}
}

// ============================================================================
// Version & System Info
// ============================================================================

async function getVersionInfo(): Promise<Record<string, string>> {
	const info: Record<string, string> = {};

	try {
		const pkgText = await Bun.file("../../../package.json").text();
		const pkg = JSON.parse(pkgText);
		info["Package"] = `${pkg.name}@${pkg.version}`;
		info["Description"] = pkg.description?.substring(0, 40) + "..." || "N/A";
	} catch {
		info["Package"] = "unknown";
	}

	try {
		const bunVersion = await $`bun --version`
			.quiet()
			.then((r) => r.text().trim());
		info["Bun"] = bunVersion;
	} catch {
		info["Bun"] = "unknown";
	}

	info["Platform"] = process.platform;
	info["Architecture"] = process.arch;
	info["Node"] = process.version;
	info["PID"] = process.pid.toString();
	info["Uptime"] = formatDuration(process.uptime() * 1000);

	// Memory usage
	const memUsage = process.memoryUsage();
	info["Memory RSS"] = formatBytes(memUsage.rss);
	info["Memory Heap"] = formatBytes(memUsage.heapUsed);

	// Git info
	try {
		const commit = await $`git rev-parse --short HEAD`
			.quiet()
			.then((r) => r.text().trim());
		const branch = await $`git branch --show-current`
			.quiet()
			.then((r) => r.text().trim());
		const status = await $`git status --porcelain`
			.quiet()
			.then((r) => r.text().trim());
		info["Git Branch"] = branch;
		info["Git Commit"] = commit;
		info["Git Status"] = status ? "modified" : "clean";
	} catch {
		info["Git"] = "N/A";
	}

	return info;
}

async function showVersion() {
	printHeader("Version Information");
	const info = await getVersionInfo();

	const maxKey = Math.max(...Object.keys(info).map((k) => k.length));
	for (const [key, value] of Object.entries(info)) {
		const paddedKey = key.padEnd(maxKey);
		console.log(
			`  ${COLORS.dim}${paddedKey}${COLORS.reset}  ${COLORS.bright}${value}${COLORS.reset}`,
		);
	}
}

// ============================================================================
// System Status
// ============================================================================

async function showStatus() {
	printHeader("System Status", `Generated at ${new Date().toLocaleString()}`);

	// Examples
	printSection("Examples");
	let totalExamples = 0;
	for (const [key, info] of Object.entries(CATEGORIES)) {
		const dir = join(import.meta.dir, "../../examples", key);
		try {
			const files = await readdir(dir);
			const count = files.filter(
				(f) => f.endsWith(".ts") || f.endsWith(".js"),
			).length;
			totalExamples += count;
			printSuccess(`${info.name}: ${count} files`);
		} catch {
			printError(`${info.name}: directory missing`);
		}
	}
	printInfo(`Total: ${totalExamples} example files`);

	// Tests
	printSection("Tests");
	try {
		const testFiles = await readdir(join(import.meta.dir, "../../tests"));
		const tests = testFiles.filter((f) => f.endsWith(".test.ts"));
		printSuccess(`Test files: ${tests.length}`);

		// Count total test cases (approximate)
		let totalTests = 0;
		for (const test of tests) {
			const content = await readFile(
				join(import.meta.dir, "../../tests", test),
				"utf-8",
			);
			const matches = content.match(/test\(|it\(/g);
			if (matches) totalTests += matches.length;
		}
		printInfo(`Test cases (approx): ${totalTests}`);
	} catch {
		printError("Tests: unable to scan");
	}

	// Bins
	printSection("Binaries");
	const bins = ["secrets-editor", "duoplus-cli", "matrix", "dev-dashboard"];
	for (const bin of bins) {
		try {
			// Use Bun.spawn with timeout instead of $ for better control
			const proc = Bun.spawn(["which", bin], {
				stdout: "pipe",
				stderr: "pipe",
				timeout: 2000,
			});
			const exitCode = await proc.exited;
			if (exitCode === 0) {
				printSuccess(`${bin}: linked`);
			} else {
				printWarning(`${bin}: not linked (run: bun link)`);
			}
		} catch {
			printWarning(`${bin}: not linked (run: bun link)`);
		}
	}

	// Directories
	printSection("Directories");
	const dirs = ["profiles", "logs", "temp", "dist"];
	for (const dir of dirs) {
		try {
			const stats = await stat(join(import.meta.dir, "../..", dir));
			if (stats.isDirectory()) {
				printSuccess(`${dir}/ exists`);
			}
		} catch {
			printWarning(`${dir}/ missing`);
		}
	}

	// Config
	printSection("Configuration");
	const config = await loadConfig();
	if (config.lastTestRun) {
		printInfo(
			`Last test run: ${new Date(config.lastTestRun).toLocaleString()}`,
		);
	}
	if (config.lastBenchmarkRun) {
		printInfo(
			`Last benchmark: ${new Date(config.lastBenchmarkRun).toLocaleString()}`,
		);
	}
}

// ============================================================================
// Category Management
// ============================================================================

async function listCategories(detailed = false) {
	printHeader("Example Categories");

	for (const [key, info] of Object.entries(CATEGORIES)) {
		console.log(
			`\n  ${COLORS.bright}${COLORS.cyan}${info.name}${COLORS.reset} (${key})`,
		);
		console.log(`  ${COLORS.dim}${info.description}${COLORS.reset}`);

		const counts: string[] = [`${info.examples.length} examples`];
		if (info.tests?.length) counts.push(`${info.tests.length} tests`);
		if (info.benchmarks?.length)
			counts.push(`${info.benchmarks.length} benchmarks`);
		console.log(`  ${COLORS.yellow}→ ${counts.join(" | ")}${COLORS.reset}`);

		if (detailed) {
			console.log(`  ${COLORS.dim}  Examples:${COLORS.reset}`);
			for (const ex of info.examples.slice(0, 5)) {
				console.log(`    • ${ex}`);
			}
			if (info.examples.length > 5) {
				console.log(
					`    ${COLORS.dim}    ... and ${info.examples.length - 5} more${COLORS.reset}`,
				);
			}
		}
	}
}

async function showCategory(category: string) {
	if (!CATEGORIES[category]) {
		printError(`Unknown category: ${category}`);
		console.log("\nAvailable categories:");
		for (const key of Object.keys(CATEGORIES)) {
			console.log(`  - ${key}`);
		}
		return;
	}

	const info = CATEGORIES[category];
	printHeader(info.name, info.description);

	printSection("Examples");
	for (const ex of info.examples) {
		console.log(`  ${COLORS.cyan}•${COLORS.reset} ${ex}`);
	}

	if (info.tests) {
		printSection("Tests");
		for (const test of info.tests) {
			console.log(`  ${COLORS.green}✓${COLORS.reset} ${test}`);
		}
	}

	if (info.benchmarks) {
		printSection("Benchmarks");
		for (const bench of info.benchmarks) {
			console.log(`  ${COLORS.yellow}⚡${COLORS.reset} ${bench}`);
		}
	}

	console.log(
		`\n${COLORS.dim}Run: dev-dashboard run ${category} <example-name>${COLORS.reset}`,
	);
}

// ============================================================================
// Running Examples
// ============================================================================

async function runExample(category: string, example?: string) {
	if (!CATEGORIES[category]) {
		printError(`Unknown category: ${category}`);
		return;
	}

	if (example) {
		// Run specific example
		const examplePath = join(
			import.meta.dir,
			"../../examples",
			category,
			example,
		);
		printHeader(`Running: ${example}`);
		const startTime = Date.now();

		try {
			await $`bun run ${examplePath}`;
			const duration = Date.now() - startTime;
			printSuccess(`Completed in ${formatDuration(duration)}`);
		} catch (err: any) {
			printError(`Failed: ${err.message}`);
			process.exit(1);
		}
	} else {
		// Show category details
		await showCategory(category);
	}
}

async function runAllExamples() {
	printHeader("Running All Examples");

	for (const [key, info] of Object.entries(CATEGORIES)) {
		printSection(info.name);

		for (const example of info.examples) {
			if (example.endsWith(".ts")) {
				process.stdout.write(`  ${example}... `);
				const startTime = Date.now();

				try {
					// Run with timeout
					const proc = Bun.spawn(
						[
							"bun",
							"run",
							join(import.meta.dir, "../../examples", key, example),
						],
						{
							timeout: 30000,
							stdout: "pipe",
							stderr: "pipe",
						},
					);
					await proc.exited;

					const duration = Date.now() - startTime;
					if (proc.exitCode === 0) {
						console.log(
							`${COLORS.green}✓${COLORS.reset} ${formatDuration(duration)}`,
						);
					} else {
						console.log(`${COLORS.red}✗${COLORS.reset} exit ${proc.exitCode}`);
					}
				} catch {
					console.log(`${COLORS.red}✗${COLORS.reset} error`);
				}
			}
		}
	}
}

// ============================================================================
// Testing
// ============================================================================

async function runTests(category?: string, watch = false) {
	if (watch) {
		printHeader("Watch Mode", `Testing ${category || "all"}`);
		printInfo("Press Ctrl+C to stop watching");

		try {
			await $`bun test --watch`.cwd(join(import.meta.dir, "../.."));
		} catch {
			// User interrupted
		}
		return;
	}

	if (!category || category === "all") {
		printHeader("Running All Tests");
		const startTime = Date.now();

		try {
			await $`bun test`.cwd(join(import.meta.dir, "../.."));
			const duration = Date.now() - startTime;
			printSuccess(`All tests passed in ${formatDuration(duration)}`);

			// Save to history
			const config = await loadConfig();
			config.lastTestRun = new Date().toISOString();
			config.testHistory.push({
				date: new Date().toISOString(),
				passed: 1,
				failed: 0,
				duration,
			});
			await saveConfig(config);
		} catch (err: any) {
			printError(`Tests failed: ${err.message}`);
			process.exit(1);
		}
	} else {
		// Run category-specific tests
		printHeader(`Testing ${CATEGORIES[category]?.name || category}`);

		const tests = CATEGORIES[category]?.tests;
		if (!tests || tests.length === 0) {
			printWarning(`No tests configured for ${category}`);
			return;
		}

		const startTime = Date.now();
		let passed = 0;
		let failed = 0;

		for (const test of tests) {
			process.stdout.write(`  ${test}... `);

			try {
				await $`bun test ${test}`.cwd(join(import.meta.dir, "../.."));
				console.log(`${COLORS.green}✓${COLORS.reset}`);
				passed++;
			} catch {
				console.log(`${COLORS.red}✗${COLORS.reset}`);
				failed++;
			}
		}

		const duration = Date.now() - startTime;
		printSection("Results");
		printSuccess(`Passed: ${passed}`);
		if (failed > 0) printError(`Failed: ${failed}`);
		printInfo(`Duration: ${formatDuration(duration)}`);

		// Save to history
		const config = await loadConfig();
		config.lastTestRun = new Date().toISOString();
		config.testHistory.push({
			date: new Date().toISOString(),
			passed,
			failed,
			duration,
		});
		await saveConfig(config);
	}
}

// ============================================================================
// Benchmarking
// ============================================================================

async function runBenchmarks(category?: string) {
	if (!category || category === "all") {
		printHeader("Running All Benchmarks");

		// Collect all benchmarks
		const allBenchmarks: string[] = [];
		for (const [key, info] of Object.entries(CATEGORIES)) {
			if (info.benchmarks) {
				allBenchmarks.push(...info.benchmarks);
			}
		}

		if (allBenchmarks.length === 0) {
			printWarning("No benchmarks configured");
			return;
		}

		const startTime = Date.now();
		const results: BenchmarkResult[] = [];

		for (const bench of allBenchmarks) {
			printSection(`Running: ${bench}`);
			const benchStart = Date.now();

			try {
				await $`bun run ${bench}`.cwd(join(import.meta.dir, "../.."));
				const duration = Date.now() - benchStart;
				results.push({ name: bench, duration });
				printSuccess(`Completed in ${formatDuration(duration)}`);
			} catch (err: any) {
				printError(`Failed: ${err.message}`);
			}
		}

		const totalDuration = Date.now() - startTime;
		printSection("Benchmark Summary");
		printInfo(`Total: ${results.length} benchmarks`);
		printInfo(`Duration: ${formatDuration(totalDuration)}`);

		// Save to history
		const config = await loadConfig();
		config.lastBenchmarkRun = new Date().toISOString();
		config.benchmarkHistory.push({
			date: new Date().toISOString(),
			suite: "all",
			results,
		});
		await saveConfig(config);
	} else {
		// Run category-specific benchmarks
		printHeader(`Benchmarking ${CATEGORIES[category]?.name || category}`);

		const benchmarks = CATEGORIES[category]?.benchmarks;
		if (!benchmarks || benchmarks.length === 0) {
			printWarning(`No benchmarks configured for ${category}`);
			return;
		}

		for (const bench of benchmarks) {
			printSection(`Running: ${bench}`);

			try {
				await $`bun run ${bench}`.cwd(join(import.meta.dir, "../.."));
				printSuccess("Completed");
			} catch (err: any) {
				printError(`Failed: ${err.message}`);
			}
		}
	}
}

// ============================================================================
// Build Commands
// ============================================================================

async function build(target?: string) {
	printHeader("Build", target || "all targets");

	const buildScripts: Record<string, string> = {
		dev: "build:dev",
		production: "build",
		community: "build:community",
		premium: "build:premium",
		all: "build:all",
		linux: "build:linux",
		darwin: "build:darwin",
		win32: "build:win32",
	};

	if (!target) {
		printSection("Available Targets");
		for (const [key, script] of Object.entries(buildScripts)) {
			console.log(
				`  ${COLORS.cyan}•${COLORS.reset} ${key.padEnd(12)} → bun run ${script}`,
			);
		}
		console.log(
			`\n${COLORS.dim}Run: dev-dashboard build <target>${COLORS.reset}`,
		);
		return;
	}

	const script = buildScripts[target];
	if (!script) {
		printError(`Unknown build target: ${target}`);
		console.log("\nAvailable targets:");
		for (const key of Object.keys(buildScripts)) {
			console.log(`  - ${key}`);
		}
		return;
	}

	printInfo(`Running: bun run ${script}`);
	const startTime = Date.now();

	try {
		await $`bun run ${script}`.cwd(join(import.meta.dir, "../.."));
		const duration = Date.now() - startTime;
		printSuccess(`Build completed in ${formatDuration(duration)}`);
	} catch (err: any) {
		printError(`Build failed: ${err.message}`);
		process.exit(1);
	}
}

// ============================================================================
// Profiling Commands
// ============================================================================

async function profile(type?: string, target?: string) {
	printHeader("Profiling", type || "all types");

	const profileTypes: Record<
		string,
		{ script: string; description: string; output: string }
	> = {
		cpu: {
			script: "profile:cpu",
			description: "CPU profiling with Markdown output",
			output: "profiles/cpu-*.md",
		},
		heap: {
			script: "profile:heap",
			description: "Heap profiling with Markdown output",
			output: "profiles/heap-*.md",
		},
		both: {
			script: "profile:cpu:advanced",
			description: "Both CPU and heap profiles",
			output: "profiles/*.md",
		},
		analyze: {
			script: "profile:analyze",
			description: "Analyze existing profiles",
			output: "console",
		},
		patterns: {
			script: "profile:patterns",
			description: "Detect performance patterns",
			output: "console",
		},
		leaks: {
			script: "profile:leaks",
			description: "Search for memory leaks",
			output: "console",
		},
		status: {
			script: "profile:status",
			description: "Show profiling status",
			output: "console",
		},
		smart: {
			script: "profile:smart",
			description: "Smart adaptive profiling",
			output: "profiles/",
		},
		auto: {
			script: "profile:auto",
			description: "Auto-profiling with thresholds",
			output: "profiles/auto/",
		},
		dashboard: {
			script: "profile:dashboard",
			description: "Web profiling dashboard",
			output: "http://localhost:8080",
		},
	};

	if (!type) {
		printSection("Available Profile Types");
		for (const [key, info] of Object.entries(profileTypes)) {
			console.log(
				`  ${COLORS.cyan}•${COLORS.reset} ${key.padEnd(12)} ${COLORS.dim}${info.description}${COLORS.reset}`,
			);
			console.log(`    ${COLORS.dim}→ bun run ${info.script}${COLORS.reset}`);
			console.log(`    ${COLORS.dim}  Output: ${info.output}${COLORS.reset}`);
		}
		console.log(
			`\n${COLORS.dim}Run: dev-dashboard profile <type>${COLORS.reset}`,
		);
		return;
	}

	const profileInfo = profileTypes[type];
	if (!profileInfo) {
		printError(`Unknown profile type: ${type}`);
		console.log("\nAvailable types:");
		for (const key of Object.keys(profileTypes)) {
			console.log(`  - ${key}`);
		}
		return;
	}

	printInfo(`Running: bun run ${profileInfo.script}`);
	printInfo(`Output: ${profileInfo.output}`);
	const startTime = Date.now();

	try {
		await $`bun run ${profileInfo.script}`.cwd(join(import.meta.dir, "../.."));
		const duration = Date.now() - startTime;
		printSuccess(`Profile completed in ${formatDuration(duration)}`);
	} catch (err: any) {
		printError(`Profile failed: ${err.message}`);
		process.exit(1);
	}
}

async function profileWatch() {
	printHeader("Profile Watch Mode", "Continuous monitoring");

	printInfo("Starting continuous profiling...");
	printInfo("Press Ctrl+C to stop\n");

	try {
		await $`bun run profile:memory-guardian`.cwd(
			join(import.meta.dir, "../.."),
		);
	} catch {
		// User interrupted
	}
}

async function profileSearch(pattern: string) {
	if (!pattern) {
		printHeader("Profile Search", "Grep through profiles");
		printInfo("Usage: dev-dashboard profile search <pattern>");
		printInfo("Example: dev-dashboard profile search 'leak'");
		return;
	}

	printHeader("Profile Search", `Pattern: ${pattern}`);

	try {
		const result =
			await $`grep -r ${pattern} profiles/ --include="*.md" --include="*.json" 2>/dev/null || echo "No matches found"`.cwd(
				join(import.meta.dir, "../.."),
			);
		console.log(result.text());
	} catch (err: any) {
		printError(`Search failed: ${err.message}`);
	}
}

async function profileCompare(baseline?: string, current?: string) {
	printHeader("Profile Comparison", "Compare performance trends");

	const baselineFile = baseline || "profiles/baseline.md";
	const currentFile = current || "profiles/current.md";

	printInfo(`Baseline: ${baselineFile}`);
	printInfo(`Current: ${currentFile}`);

	try {
		await $`bun scripts/compare-profiles.js --baseline ${baselineFile} --current ${currentFile}`.cwd(
			join(import.meta.dir, "../.."),
		);
	} catch (err: any) {
		printError(`Comparison failed: ${err.message}`);
	}
}

// ============================================================================
// Git Integration
// ============================================================================

async function gitStatus() {
	printHeader("Git Status");

	try {
		// Branch info
		const branch = await $`git branch --show-current`
			.quiet()
			.then((r) => r.text().trim());
		printInfo(`Branch: ${branch}`);

		// Last commit
		const lastCommit = await $`git log -1 --oneline`
			.quiet()
			.then((r) => r.text().trim());
		printInfo(`Last commit: ${lastCommit}`);

		// Status
		const status = await $`git status --short`
			.quiet()
			.then((r) => r.text().trim());
		if (status) {
			printWarning("Uncommitted changes:");
			console.log(status);
		} else {
			printSuccess("Working tree clean");
		}

		// Recent commits
		printSection("Recent Commits");
		const log = await $`git log --oneline -5`
			.quiet()
			.then((r) => r.text().trim());
		console.log(log);
	} catch (err: any) {
		printError(`Git error: ${err.message}`);
	}
}

// ============================================================================
// Health Check
// ============================================================================

async function healthCheck() {
	printHeader("Health Check");

	const checks: { name: string; fn: () => Promise<boolean> }[] = [
		{
			name: "Bun version",
			fn: async () => {
				const v = await $`bun --version`.quiet().then((r) => r.text().trim());
				return v.startsWith("1.");
			},
		},
		{
			name: "Node compatibility",
			fn: async () => process.version.startsWith("v"),
		},
		{
			name: "Package.json valid",
			fn: async () => {
				try {
					await Bun.file("../../../package.json").text();
					return true;
				} catch {
					return false;
				}
			},
		},
		{
			name: "Examples directory",
			fn: async () => {
				try {
					await stat(join(import.meta.dir, "../../examples"));
					return true;
				} catch {
					return false;
				}
			},
		},
		{
			name: "Tests directory",
			fn: async () => {
				try {
					await stat(join(import.meta.dir, "../../tests"));
					return true;
				} catch {
					return false;
				}
			},
		},
		{
			name: "Git repository",
			fn: async () => {
				try {
					await $`git rev-parse --git-dir`.quiet();
					return true;
				} catch {
					return false;
				}
			},
		},
	];

	let passed = 0;
	let failed = 0;

	for (const check of checks) {
		process.stdout.write(`  ${check.name.padEnd(20)} `);
		try {
			const result = await check.fn();
			if (result) {
				console.log(`${COLORS.green}✓${COLORS.reset}`);
				passed++;
			} else {
				console.log(`${COLORS.red}✗${COLORS.reset}`);
				failed++;
			}
		} catch {
			console.log(`${COLORS.red}✗${COLORS.reset}`);
			failed++;
		}
	}

	printSection("Summary");
	printSuccess(`Passed: ${passed}/${checks.length}`);
	if (failed > 0) printError(`Failed: ${failed}/${checks.length}`);

	return failed === 0;
}

// ============================================================================
// Interactive Mode
// ============================================================================

async function interactiveMode() {
	printHeader("Interactive Dev Dashboard", "Select an option");

	const options = [
		{ key: "v", label: "Version Info", fn: showVersion },
		{ key: "s", label: "System Status", fn: showStatus },
		{ key: "l", label: "List Categories", fn: () => listCategories(true) },
		{ key: "t", label: "Run Tests", fn: () => runTests() },
		{ key: "b", label: "Run Benchmarks", fn: () => runBenchmarks() },
		{ key: "h", label: "Health Check", fn: healthCheck },
		{ key: "m", label: "HMR Status", fn: showHMRStatus },
		{ key: "p", label: "Profile Performance", fn: () => profile() },
		{ key: "g", label: "Git Status", fn: gitStatus },
		{
			key: "r",
			label: "RSS Profiling Integration",
			fn: () => runRSSIntegration(),
		},
		{ key: "q", label: "Quit", fn: async () => process.exit(0) },
	];

	for (const opt of options) {
		console.log(`  ${COLORS.cyan}${opt.key}${COLORS.reset}) ${opt.label}`);
	}

	console.log(
		"\n" +
			COLORS.dim +
			"Use: dev-dashboard <command> [options] for CLI mode" +
			COLORS.reset,
	);
	console.log(
		COLORS.dim +
			"Or run with a command directly: dev-dashboard version" +
			COLORS.reset,
	);
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function runRSSIntegration() {
	try {
		// Run the RSS R2 integration script
		const result = await Bun.$`bun run examples/profiling/rss-r2-integration.ts`
			.cwd(process.cwd())
			.quiet();

		// Check if command succeeded (exit code 0)
		if (result.exitCode === 0) {
			console.log("\n✅ RSS R2 integration completed successfully!");

			// Try to read and display a quick summary
			try {
				const reportPath = "rss-profile-results/rss-r2-integration-report.md";
				const reportExists = await Bun.file(reportPath).exists();

				if (reportExists) {
					const reportContent = await Bun.file(reportPath).text();
					const lines = reportContent.split("\n");

					console.log("\n📊 Quick Summary:");
					for (const line of lines) {
						if (
							line.includes("Total Feeds Tested") ||
							line.includes("Successful Profiles") ||
							line.includes("Average Fetch Time") ||
							line.includes("Average Parse Time")
						) {
							console.log(`  ${line.replace(/^- /, "").trim()}`);
						}
					}

					console.log(`\n📋 Full report: ${reportPath}`);
				}
			} catch (summaryError) {
				console.log("Note: Could not generate quick summary");
			}
		} else {
			console.error("\n❌ RSS R2 integration failed");
		}
	} catch (error) {
		console.error("\n❌ Failed to run RSS R2 integration:", error);
	}
}

function showHelp() {
	console.log(`
${COLORS.bright}Development Dashboard${COLORS.reset} - Comprehensive development tool

${COLORS.bright}Usage:${COLORS.reset}
  dev-dashboard <command> [options]

${COLORS.bright}Commands:${COLORS.reset}
  ${COLORS.cyan}version${COLORS.reset}              Show version information
  ${COLORS.cyan}status${COLORS.reset}               Show detailed system status
  ${COLORS.cyan}list${COLORS.reset} [detailed]       List example categories
  ${COLORS.cyan}show <category>${COLORS.reset}        Show category details
  ${COLORS.cyan}run <category> [file]${COLORS.reset}  Run example(s)
  ${COLORS.cyan}run-all${COLORS.reset}              Run all examples
  ${COLORS.cyan}test [category|all]${COLORS.reset}   Run tests (use --watch for watch mode)
  ${COLORS.cyan}bench [category]${COLORS.reset}      Run benchmarks
  ${COLORS.cyan}build [target]${COLORS.reset}        Build project
  ${COLORS.cyan}git${COLORS.reset}                  Show git status
  ${COLORS.cyan}health${COLORS.reset}               Run health checks
  ${COLORS.cyan}hmr${COLORS.reset}                  Show HMR status
  ${COLORS.cyan}hmr watch [category]${COLORS.reset}  Watch mode with HMR auto-refresh
  ${COLORS.cyan}hmr errors${COLORS.reset}           Show recent HMR errors
  ${COLORS.cyan}profile [type]${COLORS.reset}       Run performance profiling
  ${COLORS.cyan}profile watch${COLORS.reset}        Continuous profiling
  ${COLORS.cyan}profile search <pattern>${COLORS.reset}  Search profiles
  ${COLORS.cyan}profile compare [baseline] [current]${COLORS.reset} Compare profiles
  ${COLORS.cyan}interactive${COLORS.reset}          Interactive menu mode

${COLORS.bright}Categories:${COLORS.reset}
  benchmarks, cli, demos, ffi, native-addons, profiling, secrets

${COLORS.bright}Build Targets:${COLORS.reset}
  dev, production, community, premium, all, linux, darwin, win32

${COLORS.bright}Examples:${COLORS.reset}
  dev-dashboard version                    # Show version
  dev-dashboard status                     # System status
  dev-dashboard list detailed              # List with details
  dev-dashboard show cli                   # Show CLI category
  dev-dashboard run cli cli-demo.ts        # Run specific example
  dev-dashboard run-all                    # Run all examples
  dev-dashboard test cli                   # Run CLI tests
  dev-dashboard test --watch               # Watch mode
  dev-dashboard bench benchmarks           # Run benchmarks
  dev-dashboard build production           # Build for production
  dev-dashboard health                     # Health check
  dev-dashboard hmr                        # Show HMR status
  dev-dashboard hmr watch                  # Watch with auto-refresh
  dev-dashboard hmr watch tests            # Auto-run tests on change
  dev-dashboard hmr errors                 # Show HMR errors
  dev-dashboard profile                    # List profile types
  dev-dashboard profile cpu                # CPU profiling
  dev-dashboard profile heap               # Heap profiling
  dev-dashboard profile both               # Both profiles
  dev-dashboard profile watch              # Continuous monitoring
  dev-dashboard profile search leak        # Search for leaks
  dev-dashboard profile compare            # Compare profiles
  dev-dashboard rss                        # RSS profiling integration
  dev-dashboard interactive                # Interactive mode
`);
}

async function main() {
	const args = process.argv.slice(2);
	const command = args[0];

	switch (command) {
		case "version":
		case "v":
			await showVersion();
			break;

		case "status":
		case "s":
			await showStatus();
			break;

		case "list":
		case "ls":
			await listCategories(args.includes("detailed") || args.includes("-d"));
			break;

		case "show":
			await showCategory(args[1]);
			break;

		case "run":
			await runExample(args[1], args[2]);
			break;

		case "run-all":
			await runAllExamples();
			break;

		case "test":
		case "t": {
			const watch = args.includes("--watch") || args.includes("-w");
			// Find the first argument that is not the command itself and not a flag
			const categoryArg = args.slice(1).find((a) => !a.startsWith("-"));
			const category = categoryArg || "all";
			await runTests(category, watch);
			break;
		}

		case "bench":
		case "benchmark":
			await runBenchmarks(args[1]);
			break;

		case "build":
		case "b":
			await build(args[1]);
			break;

		case "git":
		case "g":
			await gitStatus();
			break;

		case "health":
		case "h":
			await healthCheck();
			break;

		case "hmr": {
			const subCommand = args[1];
			if (subCommand === "watch" || subCommand === "w") {
				await watchHMR(args[2]);
			} else if (subCommand === "errors" || subCommand === "e") {
				await showHMRErrors();
			} else {
				await showHMRStatus();
			}
			break;
		}

		case "profile":
		case "p": {
			const subCommand = args[1];
			if (subCommand === "watch" || subCommand === "w") {
				await profileWatch();
			} else if (subCommand === "search" || subCommand === "s") {
				await profileSearch(args[2]);
			} else if (subCommand === "compare" || subCommand === "c") {
				await profileCompare(args[2], args[3]);
			} else {
				await profile(subCommand);
			}
			break;
		}

		case "rss":
		case "r": {
			await runRSSIntegration();
			break;
		}

		case "interactive":
		case "i":
		case "menu":
			await interactiveMode();
			break;

		case "help":
		case "--help":
		case "-h":
			showHelp();
			break;

		default:
			if (
				command &&
				command !== "help" &&
				command !== "--help" &&
				command !== "-h"
			) {
				console.log(`${COLORS.red}Unknown command: ${command}${COLORS.reset}`);
			}
			showHelp();
			break;
	}
}

if (import.meta.main) {
	main().catch((err) => {
		console.error(`${COLORS.red}Error:${COLORS.reset}`, err.message);
		process.exit(1);
	});
}

export {
	getVersionInfo,
	showVersion,
	showStatus,
	listCategories,
	showCategory,
	runExample,
	runAllExamples,
	runTests,
	runBenchmarks,
	build,
	gitStatus,
	healthCheck,
	interactiveMode,
};
