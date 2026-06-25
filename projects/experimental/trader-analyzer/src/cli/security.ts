#!/usr/bin/env bun
// [security-cli]
// Security testing CLI entry point

import {
	ApiPentester,
	enforceSRI,
	generateSRI,
	HeadersAnalyzer,
	hashFile,
	quickScan,
	SRIGenerator,
	verifySRI,
	WebPentester,
} from "../security";
import type {
	ApiPentestConfig,
	HeadersConfig,
	PentestConfig,
	SeverityLevel,
	SRIConfig,
} from "../security/types";

const HELP = `
NEXUS Security Testing CLI

COMMANDS:
  pentest web      Run web penetration test
  pentest api      Run API penetration test
  pentest quick    Quick security scan

  headers analyze  Analyze security headers
  headers optimize Get optimization recommendations
  headers impl     Generate implementation code

  sri generate     Generate SRI hashes
  sri verify       Verify files against manifest
  sri enforce      Update HTML files with SRI
  sri hash         Hash a single file

OPTIONS:
  --help, -h       Show this help message
  --json           Output as JSON
  --verbose, -v    Verbose output

EXAMPLES:
  bun security pentest web --target=https://example.com
  bun security pentest api --openapi=./api.yaml --fuzz
  bun security headers analyze --url=https://example.com
  bun security sri generate --files="dist/*.js,dist/*.css"
`;

type OutputFormat = "text" | "json";

interface CLIContext {
	format: OutputFormat;
	verbose: boolean;
}

// Parse CLI arguments
function parseArgs(args: string[]): {
	command: string[];
	options: Record<string, string | boolean>;
} {
	const command: string[] = [];
	const options: Record<string, string | boolean> = {};

	for (const arg of args) {
		if (arg.startsWith("--")) {
			const [key, value] = arg.slice(2).split("=");
			options[key] = value ?? true;
		} else if (arg.startsWith("-")) {
			options[arg.slice(1)] = true;
		} else {
			command.push(arg);
		}
	}

	return { command, options };
}

// Color output helpers
const colors = {
	red: (s: string) => `\x1b[31m${s}\x1b[0m`,
	green: (s: string) => `\x1b[32m${s}\x1b[0m`,
	yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
	blue: (s: string) => `\x1b[34m${s}\x1b[0m`,
	cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
	gray: (s: string) => `\x1b[90m${s}\x1b[0m`,
	bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

const severityColors: Record<SeverityLevel, (s: string) => string> = {
	critical: colors.red,
	high: colors.red,
	medium: colors.yellow,
	low: colors.cyan,
	info: colors.gray,
};

// Output helpers
function output(data: unknown, ctx: CLIContext): void {
	if (ctx.format === "json") {
		console.info(JSON.stringify(data, null, 2));
	} else if (typeof data === "string") {
		console.info(data);
	} else {
		console.info(data);
	}
}

function printBanner(): void {
	console.info(
		colors.cyan(`
╔═══════════════════════════════════════╗
║  NEXUS Security Testing Suite         ║
╚═══════════════════════════════════════╝
`),
	);
}

// Pentest commands
async function pentestWeb(
	options: Record<string, string | boolean>,
	ctx: CLIContext,
): Promise<void> {
	const target = options.target as string;
	if (!target) {
		console.error(colors.red("Error: --target is required"));
		process.exit(1);
	}

	printBanner();
	console.info(colors.bold("Web Penetration Test"));
	console.info(colors.gray(`Target: ${target}\n`));

	const config: PentestConfig = {
		target,
		scope: options.scope ? (options.scope as string).split(",") : undefined,
		depth: (options.depth as PentestConfig["depth"]) ?? "standard",
		maxRequests: options.maxRequests
			? parseInt(options.maxRequests as string)
			: undefined,
		rateLimit: options.rateLimit
			? parseInt(options.rateLimit as string)
			: undefined,
	};

	const pentester = new WebPentester(config, {
		onVulnerabilityFound: (vuln) => {
			const color = severityColors[vuln.severity];
			console.info(color(`[${vuln.severity.toUpperCase()}] ${vuln.title}`));
			if (ctx.verbose) {
				console.info(colors.gray(`  URL: ${vuln.url}`));
				console.info(colors.gray(`  ${vuln.description}`));
			}
		},
		onProgress: (p) => {
			if (ctx.verbose) {
				process.stdout.write(
					`\r${colors.gray(`[${p.current}/${p.total}] ${p.url}`)}`,
				);
			}
		},
	});

	const result = await pentester.scan();

	console.info("\n");
	console.info(colors.bold("Results Summary"));
	console.info("─".repeat(40));
	console.info(`Critical: ${colors.red(String(result.summary.critical))}`);
	console.info(`High:     ${colors.red(String(result.summary.high))}`);
	console.info(`Medium:   ${colors.yellow(String(result.summary.medium))}`);
	console.info(`Low:      ${colors.cyan(String(result.summary.low))}`);
	console.info(`Info:     ${colors.gray(String(result.summary.info))}`);
	console.info("─".repeat(40));
	console.info(`Total:    ${result.summary.total}`);
	console.info(`Duration: ${(result.duration / 1000).toFixed(2)}s`);
	console.info(`Requests: ${result.requestCount}`);

	if (ctx.format === "json") {
		output(result, ctx);
	}
}

async function pentestApi(
	options: Record<string, string | boolean>,
	ctx: CLIContext,
): Promise<void> {
	const target = options.target as string;
	if (!target) {
		console.error(colors.red("Error: --target is required"));
		process.exit(1);
	}

	printBanner();
	console.info(colors.bold("API Penetration Test"));
	console.info(colors.gray(`Target: ${target}\n`));

	const config: ApiPentestConfig = {
		target,
		openApiSpec: options.openapi as string,
		fuzz: options.fuzz === true,
		smartScan: options["smart-scan"] === true,
		depth: (options.depth as PentestConfig["depth"]) ?? "standard",
	};

	const pentester = new ApiPentester(config, {
		onVulnerabilityFound: (vuln) => {
			const color = severityColors[vuln.severity];
			console.info(color(`[${vuln.severity.toUpperCase()}] ${vuln.title}`));
			if (ctx.verbose) {
				console.info(colors.gray(`  ${vuln.method} ${vuln.url}`));
				if (vuln.parameter)
					console.info(colors.gray(`  Parameter: ${vuln.parameter}`));
			}
		},
		onProgress: (p) => {
			if (ctx.verbose) {
				process.stdout.write(
					`\r${colors.gray(`[${p.current}/${p.total}] ${p.url}`)}`,
				);
			}
		},
	});

	const result = await pentester.scan();

	console.info("\n");
	console.info(colors.bold("Results Summary"));
	console.info("─".repeat(40));
	console.info(`Critical: ${colors.red(String(result.summary.critical))}`);
	console.info(`High:     ${colors.red(String(result.summary.high))}`);
	console.info(`Medium:   ${colors.yellow(String(result.summary.medium))}`);
	console.info(`Low:      ${colors.cyan(String(result.summary.low))}`);
	console.info(`Info:     ${colors.gray(String(result.summary.info))}`);
	console.info("─".repeat(40));
	console.info(`Endpoints tested: ${result.coverage.endpointsTested}`);
	console.info(`Parameters tested: ${result.coverage.parametersTested}`);

	if (ctx.format === "json") {
		output(result, ctx);
	}
}

async function pentestQuick(
	options: Record<string, string | boolean>,
	ctx: CLIContext,
): Promise<void> {
	const target = options.target as string;
	if (!target) {
		console.error(colors.red("Error: --target is required"));
		process.exit(1);
	}

	printBanner();
	console.info(colors.bold("Quick Security Scan"));
	console.info(colors.gray(`Target: ${target}\n`));

	const result = await quickScan(target);

	for (const vuln of result.vulnerabilities) {
		const color = severityColors[vuln.severity];
		console.info(color(`[${vuln.severity.toUpperCase()}] ${vuln.title}`));
		console.info(colors.gray(`  ${vuln.description}`));
	}

	console.info("\n");
	console.info(
		`Found ${result.summary.total} issue(s) in ${(result.duration / 1000).toFixed(2)}s`,
	);

	if (ctx.format === "json") {
		output(result, ctx);
	}
}

// Headers commands
async function headersAnalyze(
	options: Record<string, string | boolean>,
	ctx: CLIContext,
): Promise<void> {
	const url = options.url as string;
	if (!url) {
		console.error(colors.red("Error: --url is required"));
		process.exit(1);
	}

	printBanner();
	console.info(colors.bold("Security Headers Analysis"));
	console.info(colors.gray(`URL: ${url}\n`));

	const analyzer = new HeadersAnalyzer({ url });
	const report = await analyzer.analyze();

	const gradeColors: Record<string, (s: string) => string> = {
		"A+": colors.green,
		A: colors.green,
		B: colors.cyan,
		C: colors.yellow,
		D: colors.yellow,
		F: colors.red,
	};

	console.info(
		`Overall Grade: ${gradeColors[report.overallGrade](report.overallGrade)}`,
	);
	console.info(`Score: ${report.score}/100\n`);

	console.info(colors.bold("Headers:"));
	for (const h of report.headers) {
		const status = h.present ? colors.green("✓") : colors.red("✗");
		const grade = gradeColors[h.grade](h.grade);
		console.info(`  ${status} ${h.header} [${grade}]`);
		if (h.value && ctx.verbose) {
			console.info(
				colors.gray(
					`    Value: ${h.value.slice(0, 60)}${h.value.length > 60 ? "..." : ""}`,
				),
			);
		}
		if (h.recommendation) {
			console.info(colors.gray(`    ${h.recommendation}`));
		}
	}

	if (report.missing.length > 0) {
		console.info(colors.bold("\nMissing Headers:"));
		for (const h of report.missing) {
			console.info(colors.red(`  ✗ ${h}`));
		}
	}

	if (ctx.format === "json") {
		output(report, ctx);
	}
}

async function headersOptimize(
	options: Record<string, string | boolean>,
	ctx: CLIContext,
): Promise<void> {
	const url = options.url as string;
	if (!url) {
		console.error(colors.red("Error: --url is required"));
		process.exit(1);
	}

	printBanner();
	console.info(colors.bold("Security Headers Optimization"));
	console.info(colors.gray(`URL: ${url}\n`));

	const analyzer = new HeadersAnalyzer({ url, generateCsp: true });
	const report = await analyzer.analyze();
	const optimized = analyzer.getOptimizedHeaders();

	console.info(colors.bold("Recommended Headers:\n"));

	for (const [header, value] of Object.entries(optimized)) {
		console.info(colors.cyan(header));
		console.info(`  ${value}\n`);
	}

	if (ctx.format === "json") {
		output({ report, optimized }, ctx);
	}
}

async function headersImpl(
	options: Record<string, string | boolean>,
	ctx: CLIContext,
): Promise<void> {
	const url = options.url as string;
	const platform = (options.platform as string) ?? "hono";

	if (!url) {
		console.error(colors.red("Error: --url is required"));
		process.exit(1);
	}

	printBanner();
	console.info(colors.bold(`Security Headers Implementation (${platform})`));
	console.info(colors.gray(`URL: ${url}\n`));

	const analyzer = new HeadersAnalyzer({ url, generateCsp: true });
	await analyzer.analyze();

	const { generateImplementation } = await import("../security/headers");
	const code = generateImplementation(
		analyzer.getOptimizedHeaders(),
		platform as "nginx" | "apache" | "express" | "hono",
	);

	console.info(code);

	if (ctx.format === "json") {
		output({ platform, code }, ctx);
	}
}

// SRI commands
async function sriGenerate(
	options: Record<string, string | boolean>,
	ctx: CLIContext,
): Promise<void> {
	const files = options.files as string;
	if (!files) {
		console.error(colors.red("Error: --files is required (glob pattern)"));
		process.exit(1);
	}

	printBanner();
	console.info(colors.bold("SRI Hash Generation"));
	console.info(colors.gray(`Pattern: ${files}\n`));

	const config: SRIConfig = {
		files: files.split(","),
		algorithm: (options.algorithm as SRIConfig["algorithm"]) ?? "sha384",
		outputFile: options.output as string,
	};

	const report = await generateSRI(config);

	console.info(`Generated ${report.entries.length} hash(es)\n`);

	for (const entry of report.entries) {
		console.info(colors.cyan(entry.file));
		console.info(`  ${entry.integrity}`);
		console.info(colors.gray(`  Size: ${entry.size} bytes\n`));
	}

	if (report.errors && report.errors.length > 0) {
		console.info(colors.red("\nErrors:"));
		for (const err of report.errors) {
			console.info(colors.red(`  ${err}`));
		}
	}

	if (config.outputFile) {
		console.info(colors.green(`\nManifest saved to: ${config.outputFile}`));
	}

	if (ctx.format === "json") {
		output(report, ctx);
	}
}

async function sriVerify(
	options: Record<string, string | boolean>,
	ctx: CLIContext,
): Promise<void> {
	const manifest = (options.manifest as string) ?? "sri-manifest.json";

	printBanner();
	console.info(colors.bold("SRI Verification"));
	console.info(colors.gray(`Manifest: ${manifest}\n`));

	const result = await verifySRI(manifest);

	if (result.valid) {
		console.info(colors.green("✓ All files verified successfully"));
	} else {
		console.info(colors.red("✗ Verification failed:\n"));
		for (const err of result.errors) {
			console.info(colors.red(`  ${err}`));
		}
	}

	if (ctx.format === "json") {
		output(result, ctx);
	}

	process.exit(result.valid ? 0 : 1);
}

async function sriEnforce(
	options: Record<string, string | boolean>,
	ctx: CLIContext,
): Promise<void> {
	const htmlFiles = options["html-files"] as string;
	if (!htmlFiles) {
		console.error(colors.red("Error: --html-files is required"));
		process.exit(1);
	}

	printBanner();
	console.info(colors.bold("SRI Enforcement"));

	const jsFiles = (options.js as string)?.split(",") ?? ["**/*.js"];
	const cssFiles = (options.css as string)?.split(",") ?? ["**/*.css"];

	const report = await enforceSRI(
		htmlFiles.split(","),
		jsFiles,
		cssFiles,
		(options.algorithm as SRIConfig["algorithm"]) ?? "sha384",
	);

	console.info(`\nGenerated ${report.entries.length} hash(es)`);

	if (report.htmlFilesUpdated && report.htmlFilesUpdated.length > 0) {
		console.info(colors.green(`\nUpdated HTML files:`));
		for (const file of report.htmlFilesUpdated) {
			console.info(colors.green(`  ✓ ${file}`));
		}
	}

	if (ctx.format === "json") {
		output(report, ctx);
	}
}

async function sriHash(
	options: Record<string, string | boolean>,
	ctx: CLIContext,
): Promise<void> {
	const file = options.file as string;
	if (!file) {
		console.error(colors.red("Error: --file is required"));
		process.exit(1);
	}

	const algorithm = (options.algorithm as SRIConfig["algorithm"]) ?? "sha384";
	const hash = await hashFile(file, algorithm);

	if (ctx.format === "json") {
		output({ file, integrity: hash, algorithm }, ctx);
	} else {
		console.info(hash);
	}
}

// Main entry point
async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const { command, options } = parseArgs(args);

	if (options.help || options.h || command.length === 0) {
		console.info(HELP);
		process.exit(0);
	}

	const ctx: CLIContext = {
		format: options.json ? "json" : "text",
		verbose: Boolean(options.verbose || options.v),
	};

	const [group, action] = command;

	try {
		switch (group) {
			case "pentest":
				switch (action) {
					case "web":
						await pentestWeb(options, ctx);
						break;
					case "api":
						await pentestApi(options, ctx);
						break;
					case "quick":
						await pentestQuick(options, ctx);
						break;
					default:
						console.error(colors.red(`Unknown pentest action: ${action}`));
						process.exit(1);
				}
				break;

			case "headers":
				switch (action) {
					case "analyze":
						await headersAnalyze(options, ctx);
						break;
					case "optimize":
						await headersOptimize(options, ctx);
						break;
					case "impl":
						await headersImpl(options, ctx);
						break;
					default:
						console.error(colors.red(`Unknown headers action: ${action}`));
						process.exit(1);
				}
				break;

			case "sri":
				switch (action) {
					case "generate":
						await sriGenerate(options, ctx);
						break;
					case "verify":
						await sriVerify(options, ctx);
						break;
					case "enforce":
						await sriEnforce(options, ctx);
						break;
					case "hash":
						await sriHash(options, ctx);
						break;
					default:
						console.error(colors.red(`Unknown sri action: ${action}`));
						process.exit(1);
				}
				break;

			default:
				console.error(colors.red(`Unknown command: ${group}`));
				console.info(HELP);
				process.exit(1);
		}
	} catch (error) {
		console.error(
			colors.red(
				`Error: ${error instanceof Error ? error.message : String(error)}`,
			),
		);
		if (ctx.verbose && error instanceof Error) {
			console.error(error.stack);
		}
		process.exit(1);
	}
}

main();
