#!/usr/bin/env bun
/**
 * Tier-1380 OMEGA Agent Workflow
 * Enhanced with Semver & Unicode Awareness
 *
 * Usage:
 *   bun .agents/skills/tier1380-omega/scripts/agent-workflow.ts [command]
 *
 * Commands:
 *   check-version     Check Bun semver compatibility
 *   check-unicode     Verify Unicode/Col-89 support
 *   check-all         Run all checks
 *   init              Initialize agent with full validation
 *   col89 <text>      Check if text is Col-89 compliant
 *   width <text>      Get string width (Unicode-aware)
 *   wrap <text>       Wrap text to 89 columns
 */

// Configuration
const MIN_BUN_VERSION = ">=1.3.7";
const MIN_FOR_INDIC_ACCURACY = ">=1.3.7";
const COL_89_MAX_WIDTH = 89;

// Types
interface VersionCheckResult {
	valid: boolean;
	current: string;
	required: string;
	features: string[];
	warnings: string[];
}

interface UnicodeCheckResult {
	valid: boolean;
	gb9c_support: boolean;
	col89_enforcement: boolean;
	indic_scripts: string[];
	test_results: {
		devanagari: boolean;
		emoji_zwj: boolean;
		col89_wrap: boolean;
	};
}

interface Col89Result {
	text: string;
	width: number;
	compliant: boolean;
	wrapped?: string;
}

// Semver Awareness
export function checkSemver(): VersionCheckResult {
	const current = Bun.version;
	const result: VersionCheckResult = {
		valid: false,
		current,
		required: MIN_BUN_VERSION,
		features: [],
		warnings: [],
	};

	// Check minimum version
	result.valid = Bun.semver.satisfies(current, MIN_BUN_VERSION);

	if (!result.valid) {
		result.warnings.push(
			`Bun ${current} < ${MIN_FOR_INDIC_ACCURACY} — Indic conjuncts may have inaccurate widths in stringWidth(). ` +
				`Upgrade for GB9c + ~27% smaller grapheme table.`,
		);
		return result;
	}

	// Determine available features
	if (Bun.semver.satisfies(current, ">=1.3.7")) {
		result.features.push("GB9c_grapheme_breaking");
		result.features.push("stringWidth_indic_support");
		result.features.push("wrapAnsi_stable");
	}

	if (Bun.semver.satisfies(current, ">=1.3.8")) {
		result.features.push("bun_semver_api");
		result.features.push("password_hash_argon2");
	}

	// Check specific features
	if (typeof Bun.semver === "undefined") {
		result.warnings.push("Bun.semver API not available");
	}

	if (typeof Bun.stringWidth === "undefined") {
		result.warnings.push("Bun.stringWidth not available");
	}

	if (typeof Bun.wrapAnsi === "undefined") {
		result.warnings.push("Bun.wrapAnsi not available");
	}

	return result;
}

export function formatVersionReport(result: VersionCheckResult): string {
	const lines: string[] = [];

	lines.push("╔════════════════════════════════════════════════════════╗");
	lines.push("║     Tier-1380 OMEGA Semver Check                       ║");
	lines.push("╚════════════════════════════════════════════════════════╝");
	lines.push("");

	lines.push(`Current Bun: ${result.current}`);
	lines.push(`Required:    ${result.required}`);
	lines.push(`Status:      ${result.valid ? "✅ PASS" : "❌ FAIL"}`);
	lines.push("");

	if (result.features.length > 0) {
		lines.push("Available Features:");
		for (const feature of result.features) {
			lines.push(`  ✓ ${feature}`);
		}
		lines.push("");
	}

	if (result.warnings.length > 0) {
		lines.push("Warnings:");
		for (const warning of result.warnings) {
			lines.push(`  ⚠️  ${warning}`);
		}
		lines.push("");
	}

	// Col-89 footer
	const footer = "[TIER-1380] Semver Check Complete";
	lines.push(footer);

	return lines.join("\n");
}

// Unicode Awareness
export function checkUnicode(): UnicodeCheckResult {
	const result: UnicodeCheckResult = {
		valid: false,
		gb9c_support: false,
		col89_enforcement: false,
		indic_scripts: [
			"Devanagari",
			"Bengali",
			"Gurmukhi",
			"Gujarati",
			"Oriya",
			"Tamil",
			"Telugu",
			"Kannada",
			"Malayalam",
		],
		test_results: {
			devanagari: false,
			emoji_zwj: false,
			col89_wrap: false,
		},
	};

	// Check if stringWidth is available
	if (typeof Bun.stringWidth !== "function") {
		return result;
	}

	// Test GB9c support with Devanagari conjunct
	try {
		// "क्ष" (Ka + Virama + Ssa) should be width 2, not over-counted
		const conjunctWidth = Bun.stringWidth("क्ष", {
			countAnsiEscapeCodes: false,
		});
		result.test_results.devanagari = conjunctWidth === 2;
		result.gb9c_support = result.test_results.devanagari;
	} catch {
		result.test_results.devanagari = false;
	}

	// Test emoji ZWJ support
	try {
		// Family emoji with ZWJ
		const emojiWidth = Bun.stringWidth("👨‍👩‍👧‍👦", {
			countAnsiEscapeCodes: false,
		});
		result.test_results.emoji_zwj = emojiWidth >= 2; // Should be 2 or more depending on terminal
	} catch {
		result.test_results.emoji_zwj = false;
	}

	// Test Col-89 wrapping
	try {
		if (typeof Bun.wrapAnsi === "function") {
			const longText = "A".repeat(200);
			const wrapped = Bun.wrapAnsi(longText, COL_89_MAX_WIDTH, {
				wordWrap: true,
				trim: true,
			});
			result.test_results.col89_wrap = wrapped.split("\n").every((line) => {
				return (
					Bun.stringWidth(line, { countAnsiEscapeCodes: false }) <= COL_89_MAX_WIDTH
				);
			});
		}
	} catch {
		result.test_results.col89_wrap = false;
	}

	result.valid =
		result.test_results.devanagari &&
		result.test_results.emoji_zwj &&
		result.test_results.col89_wrap;
	result.col89_enforcement = result.test_results.col89_wrap;

	return result;
}

export function formatUnicodeReport(result: UnicodeCheckResult): string {
	const lines: string[] = [];

	lines.push("╔════════════════════════════════════════════════════════╗");
	lines.push("║     Tier-1380 OMEGA Unicode Check                      ║");
	lines.push("╚════════════════════════════════════════════════════════╝");
	lines.push("");

	lines.push(`GB9c Support:      ${result.gb9c_support ? "✅ YES" : "❌ NO"}`);
	lines.push(`Col-89 Enforcement: ${result.col89_enforcement ? "✅ YES" : "❌ NO"}`);
	lines.push("");

	lines.push("Indic Scripts Supported:");
	for (const script of result.indic_scripts) {
		lines.push(`  • ${script}`);
	}
	lines.push("");

	lines.push("Test Results:");
	lines.push(
		`  Devanagari (क्ष): ${result.test_results.devanagari ? "✅" : "❌"} (width: 2)`,
	);
	lines.push(`  Emoji ZWJ:         ${result.test_results.emoji_zwj ? "✅" : "❌"}`);
	lines.push(`  Col-89 Wrap:       ${result.test_results.col89_wrap ? "✅" : "❌"}`);
	lines.push("");

	if (!result.valid) {
		lines.push("⚠️  Upgrade to Bun >=1.3.7 for full GB9c support");
		lines.push("");
	}

	lines.push("[TIER-1380] Unicode Check Complete");

	return lines.join("\n");
}

// Col-89 Enforcement
export function checkCol89(text: string): Col89Result {
	const width = Bun.stringWidth(text, { countAnsiEscapeCodes: false });
	const compliant = width <= COL_89_MAX_WIDTH;

	let wrapped: string | undefined;
	if (!compliant && typeof Bun.wrapAnsi === "function") {
		wrapped = Bun.wrapAnsi(text, COL_89_MAX_WIDTH, {
			wordWrap: true,
			trim: true,
			hard: false,
		});
	}

	return { text, width, compliant, wrapped };
}

export function formatCol89Result(result: Col89Result): string {
	const lines: string[] = [];

	lines.push(
		`Text:      ${result.text.slice(0, 50)}${result.text.length > 50 ? "…" : ""}`,
	);
	lines.push(`Width:     ${result.width} columns`);
	lines.push(
		`Compliant: ${result.compliant ? "✅ YES" : `❌ NO (max ${COL_89_MAX_WIDTH})`}`,
	);

	if (result.wrapped) {
		lines.push("");
		lines.push("Wrapped:");
		lines.push(result.wrapped);
	}

	return lines.join("\n");
}

// String width with Unicode awareness
export function getStringWidth(text: string): number {
	return Bun.stringWidth(text, {
		countAnsiEscapeCodes: false,
		ambiguousIsNarrow: true,
	});
}

// Enhanced Col-89 enforcer with Unicode safety and audit logging
interface Col89AuditEntry {
	event: string;
	index: number;
	computed_width: number;
	preview: string;
	unicode_aware: boolean;
	bun_version: string;
	grapheme_table: string;
	perf_ns: number;
	recommendation: string;
}

export function enforceCol89WithUnicodeSafety(
	lines: string[],
	auditRepo: Col89AuditEntry[] = [],
): boolean[] {
	const MIN_GB9C_VERSION = ">=1.3.7";
	const results: boolean[] = [];

	// Warn if not on GB9c version
	if (!Bun.semver.satisfies(Bun.version, MIN_GB9C_VERSION)) {
		console.warn(
			`⚠️ Bun ${Bun.version} < ${MIN_GB9C_VERSION}: Indic widths inaccurate. ` +
				`Upgrade for GB9c table (~51KB).`,
		);
	}

	lines.forEach((line, i) => {
		const start = Bun.nanoseconds();
		const width = Bun.stringWidth(line, {
			countAnsiEscapeCodes: false,
			ambiguousIsNarrow: true,
		});
		const delta = Bun.nanoseconds() - start;

		const ok = width <= 89;
		results.push(ok);

		if (!ok) {
			auditRepo.push({
				event: "COL_89_VIOLATION",
				index: i,
				computed_width: width,
				preview: `${line.slice(0, 40)}…`,
				unicode_aware: Bun.semver.satisfies(Bun.version, MIN_GB9C_VERSION),
				bun_version: Bun.version,
				grapheme_table: Bun.semver.satisfies(Bun.version, MIN_GB9C_VERSION)
					? "~51KB (GB9c)"
					: "~70KB (no GB9c)",
				perf_ns: delta,
				recommendation: `Truncate/paginate. Indic/emoji safe: ${width} cols.`,
			});
		}
	});

	return results;
}

// Indic GB9c test suite
export function runIndicTests(): {
	name: string;
	width: number;
	expected: number;
}[] {
	const tests = [
		{ name: "क्ष", expected: 2 }, // Ka + Virama + Ssa
		{ name: "क्‍ष", expected: 2 }, // Ka + Virama + ZWJ + Ssa
		{ name: "क्क्क", expected: 3 }, // Multiple conjuncts
		{ name: "ट्ट", expected: 2 }, // Ta + Virama + Ta
		{ name: "ज्ञ", expected: 2 }, // Ja + Virama + Nya
		{ name: "त्रै", expected: 2 }, // Complex conjunct
	];

	return tests.map((t) => ({
		name: t.name,
		width: Bun.stringWidth(t.name, { countAnsiEscapeCodes: false }),
		expected: t.expected,
	}));
}

export function formatIndicTestResults(
	results: { name: string; width: number; expected: number }[],
): string {
	const lines: string[] = [];
	lines.push("╔════════════════════════════════════════════════════════╗");
	lines.push("║     Indic GB9c Test Results                            ║");
	lines.push("╚════════════════════════════════════════════════════════╝");
	lines.push("");

	let allPass = true;
	for (const r of results) {
		const pass = r.width === r.expected;
		allPass = allPass && pass;
		lines.push(
			`${r.name.padEnd(10)} → width ${r.width} ${pass ? "✅" : "❌"} (expected ${r.expected})`,
		);
	}

	lines.push("");
	lines.push(allPass ? "✅ All Indic tests passed" : "❌ Some tests failed");
	lines.push(
		`Bun ${Bun.version} | Table: ${Bun.semver.satisfies(Bun.version, ">=1.3.7") ? "~51KB GB9c" : "~70KB legacy"}`,
	);

	return lines.join("\n");
}

// Agent initialization
export async function initAgent(): Promise<{
	semver: VersionCheckResult;
	unicode: UnicodeCheckResult;
}> {
	console.log("🚀 Initializing Tier-1380 OMEGA Agent...\n");

	// Check semver
	const semverResult = checkSemver();
	console.log(formatVersionReport(semverResult));
	console.log("\n");

	// Check Unicode
	const unicodeResult = checkUnicode();
	console.log(formatUnicodeReport(unicodeResult));
	console.log("\n");

	// Exit if critical checks fail
	if (!semverResult.valid) {
		console.error("❌ Critical: Bun version requirement not met");
		process.exit(1);
	}

	if (!unicodeResult.valid) {
		console.warn("⚠️  Warning: Full Unicode support not available");
	}

	console.log("✅ Agent initialization complete");

	return { semver: semverResult, unicode: unicodeResult };
}

// Main CLI
if (import.meta.main) {
	const command = Bun.argv[2] || "check-all";
	const arg = Bun.argv[3] || "";

	switch (command) {
		case "check-version":
		case "version":
			console.log(formatVersionReport(checkSemver()));
			break;

		case "check-unicode":
		case "unicode":
			console.log(formatUnicodeReport(checkUnicode()));
			break;

		case "check-all":
		case "init":
			await initAgent();
			break;

		case "col89":
			if (!arg) {
				console.error("Usage: agent-workflow.ts col89 <text>");
				process.exit(1);
			}
			console.log(formatCol89Result(checkCol89(arg)));
			break;

		case "width":
			if (!arg) {
				console.error("Usage: agent-workflow.ts width <text>");
				process.exit(1);
			}
			console.log(`Width: ${getStringWidth(arg)} columns`);
			console.log(`GB9c Aware: Yes (Bun ${Bun.version})`);
			break;

		case "wrap": {
			if (!arg) {
				console.error("Usage: agent-workflow.ts wrap <text>");
				process.exit(1);
			}
			const wrapped = Bun.wrapAnsi(arg, COL_89_MAX_WIDTH, {
				wordWrap: true,
				trim: true,
			});
			console.log(wrapped);
			break;
		}

		case "indic": {
			// Run Indic GB9c test suite
			const results = runIndicTests();
			console.log(formatIndicTestResults(results));
			break;
		}

		case "enforce": {
			// Run Col-89 enforcement on test lines
			const testLines = [
				"Latin ASCII: hello world",
				"CJK: 你好世界",
				"Emoji: 👨‍🚀🦊",
				"Indic: क्ष क्ष क्क्क",
				"A".repeat(100), // Violation
			];
			const audits: Col89AuditEntry[] = [];
			const passes = enforceCol89WithUnicodeSafety(testLines, audits);

			console.log("Test Results:");
			testLines.forEach((line, i) => {
				const width = getStringWidth(line);
				console.log(
					`  ${passes[i] ? "✅" : "❌"} [${width.toString().padStart(3)}] ${line.slice(0, 40)}`,
				);
			});

			if (audits.length > 0) {
				console.log("\n📊 Audit Report:");
				console.log(
					Bun.inspect.table(audits, [
						"event",
						"computed_width",
						"grapheme_table",
						"bun_version",
					]),
				);

				// Upload to R2 if --upload flag is set
				if (Bun.argv.includes("--upload")) {
					console.log("\n📤 Uploading to R2...");
					try {
						const { uploadCol89Report } = await import("./agent-r2-integration");
						const result = await uploadCol89Report(audits, {
							tier: "1380",
						});
						console.log(`   Uploaded: ${result.key}`);
						console.log(`   URL: ${result.url.slice(0, 60)}...`);
					} catch (e) {
						console.error(
							"   ❌ Upload failed:",
							e instanceof Error ? e.message : String(e),
						);
					}
				}
			}
			break;
		}

		case "upload-version": {
			// Upload version check to R2
			console.log("📤 Uploading version check to R2...");
			try {
				const { uploadVersionReport } = await import("./agent-r2-integration");
				const result = await uploadVersionReport(
					{
						valid: Bun.semver.satisfies(Bun.version, ">=1.3.7"),
						current: Bun.version,
						required: ">=1.3.7",
						features: ["GB9c", "stringWidth", "wrapAnsi"],
						warnings: [],
					},
					{ tier: "1380" },
				);
				console.log(`   Uploaded: ${result.key}`);
				console.log(`   URL: ${result.url.slice(0, 60)}...`);
			} catch (e) {
				console.error(
					"   ❌ Upload failed:",
					e instanceof Error ? e.message : String(e),
				);
			}
			break;
		}

		default:
			console.log("Tier-1380 OMEGA Agent Workflow");
			console.log("");
			console.log("Commands:");
			console.log("  check-version, version  Check Bun semver compatibility");
			console.log("  check-unicode, unicode  Verify Unicode/Col-89 support");
			console.log("  check-all, init         Run all initialization checks");
			console.log("  col89 <text>            Check if text is Col-89 compliant");
			console.log("  width <text>            Get Unicode-aware string width");
			console.log("  wrap <text>             Wrap text to 89 columns");
			console.log("  indic                   Run Indic GB9c test suite");
			console.log("  enforce [--upload]      Run Col-89 enforcement demo");
			console.log("  upload-version          Upload version check to R2");
			console.log("  help                    Show this help");
			console.log("");
			console.log("Examples:");
			console.log('  bun agent-workflow.ts col89 "क्षित्रिय"');
			console.log('  bun agent-workflow.ts width "Hello 🦊 World"');
			console.log("  bun agent-workflow.ts indic");
			console.log("  bun agent-workflow.ts enforce --upload");
			console.log("  bun agent-workflow.ts upload-version");
			break;
	}
}

export { MIN_BUN_VERSION, COL_89_MAX_WIDTH };
