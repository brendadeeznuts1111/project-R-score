#!/usr/bin/env bun
/**
 * Tier-1380 OMEGA Snapshot Comparison
 * Diff between two tenant snapshots with compliance tracking
 */

interface Violation {
	id: string;
	event: string;
	width: number;
	preview: string;
	ts: string;
}

interface SnapshotData {
	metadata: {
		tenant: string;
		snapshot_at: string;
		total_violations: number;
		max_width: number;
	};
	violations: Violation[];
}

interface DiffResult {
	added: Violation[];
	removed: Violation[];
	unchanged: Violation[];
	widthIncreased: Array<{ before: Violation; after: Violation }>;
	widthDecreased: Array<{ before: Violation; after: Violation }>;
	summary: {
		totalBefore: number;
		totalAfter: number;
		netChange: number;
		complianceImprovement: boolean;
	};
}

async function loadSnapshot(path: string): Promise<SnapshotData> {
	const bytes = await Bun.file(path).arrayBuffer();
	const archive = new Bun.Archive(bytes);
	const files = await archive.files();

	let metadata: SnapshotData["metadata"] | null = null;
	let violations: Violation[] = [];

	for (const [name, content] of files) {
		if (name === "metadata.json") {
			metadata = JSON.parse(await content.text());
		} else if (name === "violations.jsonl") {
			const text = await content.text();
			violations = text
				.trim()
				.split("\n")
				.filter(Boolean)
				.map((line) => JSON.parse(line));
		}
	}

	if (!metadata) throw new Error("Invalid snapshot: missing metadata");

	return { metadata, violations };
}

function compareSnapshots(before: SnapshotData, after: SnapshotData): DiffResult {
	const beforeMap = new Map(before.violations.map((v) => [v.id, v]));
	const afterMap = new Map(after.violations.map((v) => [v.id, v]));

	const added: Violation[] = [];
	const removed: Violation[] = [];
	const unchanged: Violation[] = [];
	const widthIncreased: Array<{ before: Violation; after: Violation }> = [];
	const widthDecreased: Array<{ before: Violation; after: Violation }> = [];

	// Find added and changed
	for (const [id, vAfter] of afterMap) {
		const vBefore = beforeMap.get(id);
		if (!vBefore) {
			added.push(vAfter);
		} else if (vAfter.width > vBefore.width) {
			widthIncreased.push({ before: vBefore, after: vAfter });
		} else if (vAfter.width < vBefore.width) {
			widthDecreased.push({ before: vBefore, after: vAfter });
		} else {
			unchanged.push(vAfter);
		}
	}

	// Find removed
	for (const [id, vBefore] of beforeMap) {
		if (!afterMap.has(id)) {
			removed.push(vBefore);
		}
	}

	const totalBefore = before.violations.length;
	const totalAfter = after.violations.length;

	return {
		added,
		removed,
		unchanged,
		widthIncreased,
		widthDecreased,
		summary: {
			totalBefore,
			totalAfter,
			netChange: totalAfter - totalBefore,
			complianceImprovement:
				totalAfter < totalBefore || widthIncreased.length < widthDecreased.length,
		},
	};
}

function renderDiff(result: DiffResult): void {
	console.log("\n📊 Snapshot Comparison");
	console.log("═══════════════════════════════════════════════════\n");

	const { summary } = result;
	const trend = summary.complianceImprovement ? "📈" : "📉";

	console.log(`${trend} Summary:`);
	console.log(`  Before: ${summary.totalBefore} violations`);
	console.log(`  After:  ${summary.totalAfter} violations`);
	console.log(`  Change: ${summary.netChange > 0 ? "+" : ""}${summary.netChange}`);
	console.log(
		`  Status: ${summary.complianceImprovement ? "Improving ✅" : "Needs attention ⚠️"}`,
	);
	console.log();

	if (result.added.length > 0) {
		console.log(`🔴 New Violations (${result.added.length}):`);
		for (const v of result.added.slice(0, 5)) {
			console.log(`  + ${v.event} (${v.width} chars)`);
		}
		if (result.added.length > 5) {
			console.log(`  ... and ${result.added.length - 5} more`);
		}
		console.log();
	}

	if (result.removed.length > 0) {
		console.log(`🟢 Fixed Violations (${result.removed.length}):`);
		for (const v of result.removed.slice(0, 5)) {
			console.log(`  - ${v.event} (${v.width} chars)`);
		}
		if (result.removed.length > 5) {
			console.log(`  ... and ${result.removed.length - 5} more`);
		}
		console.log();
	}

	if (result.widthIncreased.length > 0) {
		console.log(`⚠️  Width Increased (${result.widthIncreased.length}):`);
		for (const { before, after } of result.widthIncreased.slice(0, 3)) {
			console.log(`  ${before.event}: ${before.width} → ${after.width} chars`);
		}
		console.log();
	}

	if (result.widthDecreased.length > 0) {
		console.log(`✅ Width Decreased (${result.widthDecreased.length}):`);
		for (const { before, after } of result.widthDecreased.slice(0, 3)) {
			console.log(`  ${before.event}: ${before.width} → ${after.width} chars`);
		}
		console.log();
	}

	console.log(`📋 Unchanged: ${result.unchanged.length} violations`);
}

function generateMarkdownReport(
	beforePath: string,
	afterPath: string,
	result: DiffResult,
): string {
	const timestamp = new Date().toISOString();
	let md = `# Snapshot Comparison Report\n\n`;
	md += `**Generated:** ${timestamp}\n`;
	md += `**Before:** \`${beforePath}\`\n`;
	md += `**After:** \`${afterPath}\`\n\n`;

	md += `## Summary\n\n`;
	md += `| Metric | Value |\n`;
	md += `|--------|-------|\n`;
	md += `| Violations Before | ${result.summary.totalBefore} |\n`;
	md += `| Violations After | ${result.summary.totalAfter} |\n`;
	md += `| Net Change | ${result.summary.netChange > 0 ? "+" : ""}${result.summary.netChange} |\n`;
	md += `| Compliance Trend | ${result.summary.complianceImprovement ? "📈 Improving" : "📉 Declining"} |\n\n`;

	md += `## Changes\n\n`;
	md += `### 🟢 Fixed (${result.removed.length})\n`;
	for (const v of result.removed) {
		md += `- ${v.event} (${v.width} chars)\n`;
	}

	md += `\n### 🔴 New (${result.added.length})\n`;
	for (const v of result.added) {
		md += `- ${v.event} (${v.width} chars)\n`;
	}

	return md;
}

// Main
if (import.meta.main) {
	const args = Bun.argv.slice(2);
	const beforePath = args[0];
	const afterPath = args[1];
	const output = args.find((a) => a.startsWith("--output="))?.split("=")[1];

	if (!beforePath || !afterPath) {
		console.log(
			"Usage: snapshot-compare.ts <before-snapshot> <after-snapshot> [--output=report.md]",
		);
		console.log();
		console.log("Examples:");
		console.log(
			"  snapshot-compare.ts tenant-a-2026-01-01.tar.gz tenant-a-2026-01-31.tar.gz",
		);
		process.exit(1);
	}

	console.log("╔════════════════════════════════════════════════════════╗");
	console.log("║     Tier-1380 OMEGA Snapshot Comparison                ║");
	console.log("╚════════════════════════════════════════════════════════╝");
	console.log();
	console.log(`Before: ${beforePath}`);
	console.log(`After:  ${afterPath}`);

	try {
		const before = await loadSnapshot(beforePath);
		const after = await loadSnapshot(afterPath);

		if (before.metadata.tenant !== after.metadata.tenant) {
			console.error("❌ Cannot compare snapshots from different tenants");
			process.exit(1);
		}

		const result = compareSnapshots(before, after);
		renderDiff(result);

		if (output) {
			const report = generateMarkdownReport(beforePath, afterPath, result);
			await Bun.write(output, report);
			console.log(`\n📝 Report saved to ${output}`);
		}

		process.exit(result.summary.complianceImprovement ? 0 : 1);
	} catch (error) {
		console.error("❌ Error:", error instanceof Error ? error.message : error);
		process.exit(1);
	}
}

export {
	loadSnapshot,
	compareSnapshots,
	renderDiff,
	generateMarkdownReport,
	type DiffResult,
};
