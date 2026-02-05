#!/usr/bin/env bun

/**
 * ARM64 ASSEMBLY VERIFICATION UTILITY
 * Classification: SILICON-LEVEL INSPECTION TOOL
 * Designation: CCMP/CCMN INSTRUCTION DETECTOR
 *
 * Verifies that compiled binaries contain ARM64-specific optimizations:
 * - CCMP (Conditional Compare) instruction chains
 * - CCMN (Conditional Compare Negative) operations
 * - NEON vector register usage (v0-v31)
 * - SIMD load/store pair instructions (ldp/stp)
 */

import { EXIT_CODES } from "../../.claude/lib/exit-codes.ts";
import { HAS_ARM64_OPTIMIZATIONS, IS_ARM64, printDeploymentReport } from "./guardian";

// ═══════════════════════════════════════════════════════════════════════════════
// ASSEMBLY VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

interface InstructionPattern {
	name: string;
	pattern: RegExp;
	description: string;
	optimization: string;
}

/** ARM64 instruction patterns to detect */
const ARM64_PATTERNS: InstructionPattern[] = [
	{
		name: "CCMP",
		pattern: /\bccmp\s+/i,
		description: "Conditional Compare - chains multiple comparisons",
		optimization: "Compound boolean expressions",
	},
	{
		name: "CCMN",
		pattern: /\bccmn\s+/i,
		description: "Conditional Compare Negative",
		optimization: "Negative flag evaluations without branching",
	},
	{
		name: "NEON_FMOV",
		pattern: /fmov\s+v\d+\.\d/i,
		description: "Floating-point move to vector register",
		optimization: "FP constant materialization",
	},
	{
		name: "NEON_LDP",
		pattern: /ldp\s+v\d+,\s*v\d+/i,
		description: "Load Pair (vector registers)",
		optimization: "SIMD bulk memory operations",
	},
	{
		name: "NEON_STP",
		pattern: /stp\s+v\d+,\s*v\d+/i,
		description: "Store Pair (vector registers)",
		optimization: "SIMD bulk memory operations",
	},
	{
		name: "CSEL",
		pattern: /\bcsel\s+/i,
		description: "Conditional Select",
		optimization: "Branchless conditional assignment",
	},
	{
		name: "CSINC",
		pattern: /\bcsinc\s+/i,
		description: "Conditional Select Increment",
		optimization: "Optimized increment operations",
	},
	{
		name: "TBZ",
		pattern: /\btbz\s+/i,
		description: "Test bit and branch if zero",
		optimization: "Bit testing without full compare",
	},
	{
		name: "TBNZ",
		pattern: /\btbnz\s+/i,
		description: "Test bit and branch if not zero",
		optimization: "Bit testing without full compare",
	},
];

interface VerificationResult {
	binaryPath: string;
	instructions: Map<string, number>;
	samples: Map<string, string[]>;
	totalMatches: number;
	architecture: string;
}

/**
 * Disassemble binary and search for ARM64 optimization patterns
 */
async function verifyBinary(binaryPath: string): Promise<VerificationResult> {
	const result: VerificationResult = {
		binaryPath,
		instructions: new Map(),
		samples: new Map(),
		totalMatches: 0,
		architecture: "unknown",
	};

	try {
		// First check architecture
		const fileProc = Bun.spawn(["file", binaryPath], {
			stdout: "pipe",
			stderr: "ignore",
		});
		const fileOutput = await fileProc.stdout.text();

		if (fileOutput.includes("ARM64") || fileOutput.includes("arm64")) {
			result.architecture = "arm64";
		} else if (fileOutput.includes("x86_64") || fileOutput.includes("x86-64")) {
			result.architecture = "x86_64";
		}

		// Disassemble with objdump
		const objdumpProc = Bun.spawn(["objdump", "-d", "--no-show-raw-insn", binaryPath], {
			stdout: "pipe",
			stderr: "ignore",
		});

		const output = await objdumpProc.stdout.text();
		const lines = output.split("\n");

		for (const line of lines) {
			for (const pattern of ARM64_PATTERNS) {
				if (pattern.pattern.test(line)) {
					const count = result.instructions.get(pattern.name) || 0;
					result.instructions.set(pattern.name, count + 1);
					result.totalMatches++;

					// Collect sample instructions (max 3 per pattern)
					const samples = result.samples.get(pattern.name) || [];
					if (samples.length < 3) {
						samples.push(line.trim());
						result.samples.set(pattern.name, samples);
					}
				}
			}
		}
	} catch (error) {
		console.error(`Failed to verify ${binaryPath}:`, error);
	}

	return result;
}

/**
 * Verify Bun runtime itself for ARM64 optimizations
 */
async function verifyBunRuntime(): Promise<VerificationResult | null> {
	try {
		// Find Bun executable path
		const bunPath = Bun.which("bun");

		if (!bunPath) {
			console.log("⚠️  Bun executable not found in PATH");
			return null;
		}

		console.log(`🔍 Analyzing Bun runtime: ${bunPath}`);
		return await verifyBinary(bunPath);
	} catch (error) {
		console.error("Failed to verify Bun runtime:", error);
		return null;
	}
}

/**
 * Print verification results in tactical format
 */
function printVerificationResults(result: VerificationResult): void {
	console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                    ARM64 ASSEMBLY VERIFICATION REPORT                        ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ Binary:        ${result.binaryPath.slice(-55).padStart(55)} ║
║ Architecture:   ${result.architecture.padStart(55)} ║
║ Total Matches: ${String(result.totalMatches).padStart(55)} ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);

	if (result.instructions.size === 0) {
		console.log("⚠️  No ARM64 optimization patterns detected");
		console.log("   This may indicate:");
		console.log("   • Binary is not compiled for ARM64");
		console.log("   • Compiler optimizations are disabled");
		console.log("   • Binary is stripped of debug symbols");
		return;
	}

	console.log("📊 DETECTED OPTIMIZATIONS\n");

	for (const [name, count] of result.instructions) {
		const pattern = ARM64_PATTERNS.find((p) => p.name === name);
		const samples = result.samples.get(name) || [];

		console.log(`🔹 ${name}`);
		console.log(`   Count: ${count.toLocaleString()}`);
		if (pattern) {
			console.log(`   Description: ${pattern.description}`);
			console.log(`   Optimization: ${pattern.optimization}`);
		}

		if (samples.length > 0) {
			console.log("   Sample instructions:");
			for (const sample of samples) {
				console.log(`      ${sample}`);
			}
		}
		console.log();
	}
}

/**
 * Generate ARM64 optimization report
 */
function generateReport(results: VerificationResult[]): string {
	const lines: string[] = [
		"# ARM64 Assembly Verification Report",
		"",
		`Generated: ${new Date().toISOString()}`,
		`Platform: ${process.platform}`,
		`Architecture: ${process.arch}`,
		"",
		"## Summary",
		"",
	];

	for (const result of results) {
		lines.push(`### ${result.binaryPath}`);
		lines.push("");
		lines.push(`- **Architecture:** ${result.architecture}`);
		lines.push(`- **Total Optimization Patterns:** ${result.totalMatches}`);
		lines.push("");

		if (result.instructions.size > 0) {
			lines.push("| Instruction | Count | Description |");
			lines.push("|-------------|-------|-------------|");

			for (const [name, count] of result.instructions) {
				const pattern = ARM64_PATTERNS.find((p) => p.name === name);
				const desc = pattern?.description || "Unknown";
				lines.push(`| ${name} | ${count.toLocaleString()} | ${desc} |`);
			}
		} else {
			lines.push("*No ARM64 optimization patterns detected*");
		}

		lines.push("");
	}

	return lines.join("\n");
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLI INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
	const args = Bun.argv.slice(2);

	console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                    ARM64 ASSEMBLY VERIFICATION TOOL                          ║
║                    CCMP/CCMN Instruction Detector v1.0                       ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);

	// Print deployment status first
	printDeploymentReport();

	// Parse arguments
	const binaryPaths: string[] = [];
	let outputReport = false;
	let reportPath = "arm64-verification-report.md";

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		if (arg === "--help" || arg === "-h") {
			console.log(`
USAGE:
  bun verify-arm64.ts [OPTIONS] [BINARY_PATH...]

OPTIONS:
  -h, --help              Show this help
  -o, --output [path]     Save report to file (default: arm64-verification-report.md)
  --bun                   Verify Bun runtime specifically

EXAMPLES:
  # Verify Bun runtime
  bun verify-arm64.ts --bun

  # Verify specific binary
  bun verify-arm64.ts ./my-app

  # Verify multiple binaries and save report
  bun verify-arm64.ts -o report.md ./app1 ./app2
`);
			process.exit(EXIT_CODES.SUCCESS);
		} else if (arg === "--output" || arg === "-o") {
			outputReport = true;
			if (args[i + 1] && !args[i + 1].startsWith("-")) {
				reportPath = args[++i];
			}
		} else if (arg === "--bun") {
			// Will be handled below
		} else if (!arg.startsWith("-")) {
			binaryPaths.push(arg);
		}
	}

	const results: VerificationResult[] = [];

	// Verify Bun runtime if requested or no binaries specified
	if (args.includes("--bun") || binaryPaths.length === 0) {
		const bunResult = await verifyBunRuntime();
		if (bunResult) {
			results.push(bunResult);
			printVerificationResults(bunResult);
		}
	}

	// Verify specified binaries
	for (const binaryPath of binaryPaths) {
		console.log(`\n🔍 Analyzing: ${binaryPath}`);
		const result = await verifyBinary(binaryPath);
		results.push(result);
		printVerificationResults(result);
	}

	// Save report if requested
	if (outputReport) {
		const report = generateReport(results);
		await Bun.write(reportPath, report);
		console.log(`\n📝 Report saved to: ${reportPath}`);
	}

	// Final status
	console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                         VERIFICATION COMPLETE                                ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ Binaries Analyzed: ${String(results.length).padStart(52)} ║
║ ARM64 Optimizations: ${(results.some((r) => r.instructions.size > 0) ? "DETECTED ✅" : "NOT FOUND ⚠️").padStart(50)} ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);
}

main().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(EXIT_CODES.GENERIC_ERROR);
});
