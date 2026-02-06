#!/usr/bin/env bun
/**
 * Tier-1380 OMEGA Agent R2 Integration
 * Store agent audit logs, version checks, and Col-89 reports in R2
 *
 * Usage:
 *   bun .agents/skills/tier1380-omega/scripts/agent-r2-integration.ts [command]
 */

import { getBucket } from "../../../../config/r2-client";
import type { Col89AuditEntry } from "./agent-workflow";

// Configuration
const AUDIT_BUCKET = "audits";
const AGENT_PREFIX = "agent-workflow";

interface StoredAuditReport {
	id: string;
	timestamp: string;
	bun_version: string;
	agent_version: string;
	results: {
		semver_check: boolean;
		unicode_check: boolean;
		col89_violations: number;
	};
	entries: Col89AuditEntry[];
	metadata: {
		"x-factory-wager-tier": string;
		"x-factory-wager-service": string;
		"x-factory-wager-classification": string;
	};
}

interface VersionCheckReport {
	id: string;
	timestamp: string;
	bun_version: string;
	required_version: string;
	passed: boolean;
	features: string[];
	warnings: string[];
	grapheme_table: string;
}

/**
 * Upload Col-89 audit report to R2
 */
export async function uploadCol89Report(
	entries: Col89AuditEntry[],
	options: {
		tier?: string;
		commit?: string;
		branch?: string;
	} = {},
): Promise<{ key: string; url: string }> {
	const bucket = await getBucket(AUDIT_BUCKET);

	const report: StoredAuditReport = {
		id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		timestamp: new Date().toISOString(),
		bun_version: Bun.version,
		agent_version: "1.2.0",
		results: {
			semver_check: Bun.semver.satisfies(Bun.version, ">=1.3.7"),
			unicode_check: entries.every((e) => e.unicode_aware),
			col89_violations: entries.length,
		},
		entries,
		metadata: {
			"x-factory-wager-tier": options.tier || "1380",
			"x-factory-wager-service": "agent-workflow",
			"x-factory-wager-classification": "internal",
		},
	};

	const date = new Date().toISOString().split("T")[0];
	const key = `${AGENT_PREFIX}/col89/${date}/${report.id}.json`;

	const result = await bucket.upload(key, JSON.stringify(report, null, 2), {
		tier: options.tier || "1380",
		commit: options.commit || "unknown",
		contentType: "application/json",
		customMetadata: {
			"x-factory-wager-branch": options.branch || "main",
			"x-factory-wager-audit-id": report.id,
		},
	});

	// Generate presigned URL for retrieval
	const url = await bucket.presign(key, 86400); // 24 hours

	console.log(`📤 Uploaded Col-89 audit report:`);
	console.log(`   Key:  ${key}`);
	console.log(`   ID:   ${report.id}`);
	console.log(`   Violations: ${entries.length}`);

	return { key: result.key, url };
}

/**
 * Upload version check report to R2
 */
export async function uploadVersionReport(
	versionResult: {
		valid: boolean;
		current: string;
		required: string;
		features: string[];
		warnings: string[];
	},
	options: {
		tier?: string;
		commit?: string;
		branch?: string;
	} = {},
): Promise<{ key: string; url: string }> {
	const bucket = await getBucket(AUDIT_BUCKET);

	const report: VersionCheckReport = {
		id: `version-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		timestamp: new Date().toISOString(),
		bun_version: versionResult.current,
		required_version: versionResult.required,
		passed: versionResult.valid,
		features: versionResult.features,
		warnings: versionResult.warnings,
		grapheme_table: Bun.semver.satisfies(versionResult.current, ">=1.3.7")
			? "~51KB (GB9c)"
			: "~70KB (legacy)",
	};

	const date = new Date().toISOString().split("T")[0];
	const key = `${AGENT_PREFIX}/version/${date}/${report.id}.json`;

	const result = await bucket.upload(key, JSON.stringify(report, null, 2), {
		tier: options.tier || "1380",
		commit: options.commit || "unknown",
		contentType: "application/json",
		customMetadata: {
			"x-factory-wager-branch": options.branch || "main",
			"x-factory-wager-audit-id": report.id,
		},
	});

	const url = await bucket.presign(key, 86400);

	console.log(`📤 Uploaded version check report:`);
	console.log(`   Key:  ${key}`);
	console.log(`   ID:   ${report.id}`);
	console.log(`   Status: ${report.passed ? "✅ PASS" : "❌ FAIL"}`);

	return { key: result.key, url };
}

/**
 * List stored audit reports
 */
export async function listAuditReports(
	options: { prefix?: string; maxKeys?: number } = {},
): Promise<
	Array<{
		key: string;
		id: string;
		date: string;
		type: string;
		size: number;
	}>
> {
	const bucket = await getBucket(AUDIT_BUCKET);

	const result = await bucket.list({
		prefix: options.prefix || `${AGENT_PREFIX}/`,
		maxKeys: options.maxKeys || 100,
	});

	return result.objects.map((obj) => {
		const parts = obj.key.split("/");
		const filename = parts[parts.length - 1];
		const id = filename.replace(".json", "");
		const type = parts[2] || "unknown"; // col89, version, etc.

		return {
			key: obj.key,
			id,
			date: parts[3] || "unknown",
			type,
			size: obj.size,
		};
	});
}

/**
 * Download and parse audit report
 */
export async function downloadAuditReport(
	key: string,
): Promise<StoredAuditReport | VersionCheckReport | null> {
	try {
		const bucket = await getBucket(AUDIT_BUCKET);
		const object = await bucket.download(key);
		const text = await object.text();
		return JSON.parse(text);
	} catch (error) {
		console.error(`❌ Failed to download report: ${key}`, error);
		return null;
	}
}

/**
 * Generate summary report of all audits
 */
export async function generateAuditSummary(days: number = 7): Promise<{
	total_reports: number;
	col89_violations: number;
	version_failures: number;
	by_date: Record<string, number>;
}> {
	const reports = await listAuditReports();
	const cutoff = new Date();
	cutoff.setDate(cutoff.getDate() - days);

	let col89Violations = 0;
	let versionFailures = 0;
	const byDate: Record<string, number> = {};

	for (const report of reports) {
		const reportDate = new Date(report.date);
		if (reportDate < cutoff) continue;

		byDate[report.date] = (byDate[report.date] || 0) + 1;

		const data = await downloadAuditReport(report.key);
		if (!data) continue;

		if (report.type === "col89" && "entries" in data) {
			col89Violations += data.entries.length;
		} else if (report.type === "version" && "passed" in data) {
			if (!data.passed) versionFailures++;
		}
	}

	return {
		total_reports: reports.length,
		col89_violations: col89Violations,
		version_failures: versionFailures,
		by_date: byDate,
	};
}

// CLI commands
if (import.meta.main) {
	const command = Bun.argv[2] || "help";

	switch (command) {
		case "upload-col89": {
			// Demo: Upload sample Col-89 report
			const sampleEntries: Col89AuditEntry[] = [
				{
					event: "COL_89_VIOLATION",
					index: 0,
					computed_width: 120,
					preview: "Long line example...",
					unicode_aware: true,
					bun_version: Bun.version,
					grapheme_table: "~51KB (GB9c)",
					perf_ns: 150,
					recommendation: "Truncate to 89 cols",
				},
			];

			const result = await uploadCol89Report(sampleEntries, {
				tier: "1380",
				commit: "abc123",
			});
			console.log(`\n🔗 Presigned URL (24h): ${result.url}`);
			break;
		}

		case "upload-version": {
			const result = await uploadVersionReport(
				{
					valid: true,
					current: Bun.version,
					required: ">=1.3.7",
					features: ["GB9c", "stringWidth"],
					warnings: [],
				},
				{ tier: "1380" },
			);
			console.log(`\n🔗 Presigned URL (24h): ${result.url}`);
			break;
		}

		case "list": {
			const reports = await listAuditReports();
			console.log("📋 Stored Audit Reports:");
			console.log(Bun.inspect.table(reports, ["id", "type", "date", "size"]));
			break;
		}

		case "summary": {
			const days = Number.parseInt(Bun.argv[3] || "7", 10);
			const summary = await generateAuditSummary(days);
			console.log(`📊 Audit Summary (last ${days} days):`);
			console.log(
				Bun.inspect.table(
					[summary],
					["total_reports", "col89_violations", "version_failures"],
				),
			);
			console.log("\nBy Date:");
			console.log(
				Bun.inspect.table(
					Object.entries(summary.by_date).map(([date, count]) => ({
						date,
						count,
					})),
					["date", "count"],
				),
			);
			break;
		}

		default:
			console.log("Tier-1380 OMEGA Agent R2 Integration");
			console.log("");
			console.log("Commands:");
			console.log("  upload-col89    Upload sample Col-89 audit report");
			console.log("  upload-version  Upload version check report");
			console.log("  list            List stored audit reports");
			console.log("  summary [days]  Generate audit summary (default: 7 days)");
			console.log("  help            Show this help");
			console.log("");
			console.log("Examples:");
			console.log("  bun agent-r2-integration.ts upload-col89");
			console.log("  bun agent-r2-integration.ts summary 30");
			break;
	}
}

export {
	uploadCol89Report,
	uploadVersionReport,
	listAuditReports,
	downloadAuditReport,
	generateAuditSummary,
	AUDIT_BUCKET,
	AGENT_PREFIX,
};
export type { StoredAuditReport, VersionCheckReport, Col89AuditEntry };
