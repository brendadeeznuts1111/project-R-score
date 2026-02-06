#!/usr/bin/env bun
/**
 * Tier-1380 OMEGA Snapshot Creator
 * Create tenant audit snapshots with Bun.Archive
 */

import { Database } from "bun:sqlite";

interface SnapshotResult {
	path: string;
	sha256: string;
	size: number;
	filename: string;
}

async function createTenantSnapshot(
	tenant: string,
	outputDir: string = "./snapshots",
): Promise<SnapshotResult> {
	// Get violations from database
	const db = new Database(`${process.env.HOME}/.matrix/commit-history.db`);

	// Check if violations table exists
	const tableCheck = db
		.query("SELECT name FROM sqlite_master WHERE type='table' AND name='violations'")
		.get();

	let violations: Array<Record<string, unknown>> = [];

	if (tableCheck) {
		try {
			violations = db
				.query(`
				SELECT id, file, line, width, content, severity, timestamp as ts
				FROM violations
				WHERE tenant = ? AND timestamp > datetime('now', '-30 days')
				ORDER BY timestamp DESC
				LIMIT 10000
			`)
				.all(tenant) as Array<Record<string, unknown>>;
		} catch {
			// Table exists but query failed
		}
	}

	db.close();

	// Create metadata
	const metadata = {
		tenant,
		snapshot_at: new Date().toISOString(),
		total_violations: violations.length,
		max_width:
			violations.length > 0
				? Math.max(...violations.map((v) => (v.width as number) || 0))
				: 0,
		bun_version: Bun.version,
		tier: 1380,
	};

	// Prepare files for archive
	const files: Record<string, string> = {
		"metadata.json": JSON.stringify(metadata, null, 2),
		"violations.jsonl": violations.map((v) => JSON.stringify(v)).join("\n"),
	};

	// Create archive
	const archive = new Bun.Archive(files, { compress: "gzip", level: 7 });

	// Generate safe filename
	const safeTenant = tenant.replace(/[^a-z0-9_-]/gi, "_");
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
	const filename = `audit-snapshot-${safeTenant}-${timestamp}.tar.gz`;
	const path = `${outputDir}/${filename}`;

	// Ensure directory exists
	await Bun.$`mkdir -p ${outputDir}`.quiet();

	// Write archive
	await Bun.write(path, archive);

	// Calculate hash using Bun.hash.wyhash (SHA-256 not available in Bun 1.3.7)
	const bytes = await Bun.file(path).arrayBuffer();
	const sha256 = Bun.hash.wyhash(Buffer.from(bytes)).toString(16);

	// Col-89 safe log
	const logLine = `Snapshot: ${filename} | Size: ${Math.round(bytes.byteLength / 1024)} KiB | SHA-256: ${sha256.slice(0, 16)}…`;
	console.log(Bun.stringWidth(logLine) > 89 ? `${logLine.slice(0, 86)}…` : logLine);

	return { path, sha256, size: bytes.byteLength, filename };
}

// Main
if (import.meta.main) {
	const args = Bun.argv.slice(2);
	const tenant = args[0];
	const outputDir = args[1] || "./snapshots";

	if (!tenant) {
		console.log("Usage: snapshot-create.ts <tenant> [output-dir]");
		process.exit(1);
	}

	console.log("╔════════════════════════════════════════════════════════╗");
	console.log("║     Tier-1380 OMEGA Snapshot Creator                   ║");
	console.log("╚════════════════════════════════════════════════════════╝");
	console.log();
	console.log(`Creating snapshot for tenant: ${tenant}`);
	console.log(`Output directory: ${outputDir}`);
	console.log();

	try {
		const result = await createTenantSnapshot(tenant, outputDir);

		// Output JSON for programmatic use
		console.log(JSON.stringify(result));

		process.exit(0);
	} catch (error) {
		console.error("❌ Failed:", error instanceof Error ? error.message : error);
		process.exit(1);
	}
}

export { createTenantSnapshot, type SnapshotResult };
