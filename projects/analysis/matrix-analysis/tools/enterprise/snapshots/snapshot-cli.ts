#!/usr/bin/env bun
/**
 * Tier-1380 Snapshot CLI - hardened multi-tenant archive management
 *
 * Usage: bun snapshot-cli.ts <command> [options]
 */

import {
	cleanupOldSnapshots,
	createTenantSnapshot,
	extractSnapshot,
	getStorageStats,
	listRecentSnapshots,
	verifySnapshot,
} from "./Tier1380SnapshotManager.js";

const COMMAND = process.argv[2];
const OPTIONS = process.argv.slice(3);

// Col-89 safe logging helper
function safeLog(message: string): void {
	const width = Bun.stringWidth(message, { countAnsiEscapeCodes: false });
	console.info(width <= 89 ? message : Bun.escapeHTML(message.slice(0, 86)) + "…");
}

// CLI Commands
async function main() {
	try {
		switch (COMMAND) {
			case "create":
				await handleCreate();
				break;
			case "list":
				await handleList();
				break;
			case "extract":
				await handleExtract();
				break;
			case "verify":
				await handleVerify();
				break;
			case "cleanup":
				await handleCleanup();
				break;
			case "stats":
				await handleStats();
				break;
			case "help":
			case "--help":
			case "-h":
				showHelp();
				break;
			default:
				console.error(`❌ Unknown command: ${COMMAND}`);
				showHelp();
				process.exit(1);
		}
	} catch (error) {
		console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
		process.exit(1);
	}
}

async function handleCreate(): Promise<void> {
	const tenant = OPTIONS[0];
	if (!tenant) {
		console.error("❌ Usage: create <tenant-id> [options]");
		console.error(
			"   Options: --variant=<name> --pool-size=<n> --compression=<1-9> --include-config",
		);
		return;
	}

	const options: any = {};

	// Parse options
	for (const opt of OPTIONS.slice(1)) {
		if (opt.startsWith("--variant=")) options.variant = opt.split("=")[1];
		if (opt.startsWith("--pool-size=")) options.poolSize = parseInt(opt.split("=")[1]);
		if (opt.startsWith("--compression="))
			options.compressionLevel = parseInt(opt.split("=")[1]);
		if (opt === "--include-config") options.includeConfig = true;
	}

	safeLog(`📸 Creating Tier-1380 snapshot for tenant: ${tenant}`);
	const result = await createTenantSnapshot(tenant, options);

	console.info(`✅ Snapshot created successfully:`);
	console.info(`   ID: ${result.id}`);
	console.info(`   Path: ${result.path}`);
	console.info(`   Size: ${Math.round(result.size / 1024)} KiB`);
	console.info(`   SHA-256: ${result.sha256}`);
	console.info(`   Entries: ${result.entries}`);
}

async function handleList(): Promise<void> {
	const limit = parseInt(OPTIONS[0]) || 10;
	const filters: any = {};

	// Parse filters
	for (const opt of OPTIONS.slice(1)) {
		if (opt.startsWith("--tenant=")) filters.tenant = opt.split("=")[1];
		if (opt.startsWith("--variant=")) filters.variant = opt.split("=")[1];
		if (opt.startsWith("--min-size=")) filters.minSize = parseFloat(opt.split("=")[1]);
		if (opt.startsWith("--max-size=")) filters.maxSize = parseFloat(opt.split("=")[1]);
	}

	const snapshots = listRecentSnapshots(limit, filters);

	if (snapshots.length === 0) {
		safeLog("📭 No snapshots found matching criteria");
		return;
	}

	console.info(`📋 Recent Snapshots (${snapshots.length} found):`);
	console.table(
		snapshots.map((s) => ({
			Tenant: s.tenant,
			Created: new Date(s.created_at).toLocaleString(),
			"Size (KiB)": Math.round(s.size_kb),
			Entries: s.entry_count,
			Compression: s.compression_level,
			Variant: s.variant || "N/A",
		})),
	);
}

async function handleExtract(): Promise<void> {
	const snapshotPath = OPTIONS[0];
	const targetDir = OPTIONS[1];

	if (!snapshotPath || !targetDir) {
		console.error("❌ Usage: extract <snapshot-path> <target-dir> [options]");
		console.error("   Options: --validate --max-size=<bytes>");
		return;
	}

	const options: any = {};
	if (OPTIONS.includes("--validate")) options.validateIntegrity = true;
	for (const opt of OPTIONS.slice(2)) {
		if (opt.startsWith("--max-size="))
			options.maxExtractSize = parseInt(opt.split("=")[1]);
	}

	safeLog(`📦 Extracting snapshot: ${snapshotPath}`);
	const result = await extractSnapshot(snapshotPath, targetDir, options);

	console.info(`✅ Extraction completed:`);
	console.info(`   Entries extracted: ${result.entries}`);
	console.info(`   Integrity: ${result.integrity.valid ? "✅ Valid" : "❌ Invalid"}`);
	console.info(`   Files: ${result.files.length}`);

	if (result.files.length <= 10) {
		console.info(`   File list: ${result.files.join(", ")}`);
	}
}

async function handleVerify(): Promise<void> {
	const snapshotPath = OPTIONS[0];

	if (!snapshotPath) {
		console.error("❌ Usage: verify <snapshot-path>");
		return;
	}

	safeLog(`🔍 Verifying snapshot integrity: ${snapshotPath}`);
	const result = await verifySnapshot(snapshotPath);

	console.info(`📊 Verification Results:`);
	console.info(`   File exists: ${result.file_exists ? "✅ Yes" : "❌ No"}`);
	console.info(`   Size matches: ${result.size_matches ? "✅ Yes" : "❌ No"}`);
	console.info(`   Hash valid: ${result.valid ? "✅ Yes" : "❌ No"}`);

	if (result.expected_hash) {
		console.info(`   Expected hash: ${result.expected_hash.slice(0, 16)}…`);
		console.info(`   Actual hash: ${result.actual_hash.slice(0, 16)}…`);
	}
}

async function handleCleanup(): Promise<void> {
	const retentionDays = parseInt(OPTIONS[0]) || 30;
	const dryRun = !OPTIONS.includes("--execute");

	safeLog(
		`🗑️ Cleanup snapshots older than ${retentionDays} days (${dryRun ? "DRY RUN" : "EXECUTING"})`,
	);

	const result = cleanupOldSnapshots(retentionDays, dryRun);

	console.info(`📊 Cleanup Results:`);
	console.info(`   Snapshots to delete: ${result.deleted}`);
	console.info(`   Total size: ${Math.round(result.totalSize / 1024 / 1024)} MiB`);

	if (result.snapshots.length > 0 && result.snapshots.length <= 5) {
		console.info(`   Affected snapshots:`);
		result.snapshots.forEach((s) => {
			console.info(`     - ${s.tenant}: ${new Date(s.created_at).toLocaleString()}`);
		});
	}
}

async function handleStats(): Promise<void> {
	safeLog("📊 Storage Statistics");

	const stats = getStorageStats();

	console.info(`📈 Overall Statistics:`);
	console.info(`   Total snapshots: ${stats.totalSnapshots}`);
	console.info(`   Total storage: ${stats.totalSizeMB} MiB`);
	console.info(`   Average size: ${stats.averageSizeMB} MiB`);
	console.info(`   Unique tenants: ${Object.keys(stats.tenantCounts).length}`);

	if (stats.oldestSnapshot) {
		console.info(`   Oldest snapshot: ${stats.oldestSnapshot.toLocaleString()}`);
	}
	if (stats.newestSnapshot) {
		console.info(`   Newest snapshot: ${stats.newestSnapshot.toLocaleString()}`);
	}

	console.info(`📊 Tenant Breakdown:`);
	Object.entries(stats.tenantCounts)
		.sort(([, a], [, b]) => b - a)
		.slice(0, 10)
		.forEach(([tenant, count]) => {
			console.info(`   ${tenant}: ${count} snapshots`);
		});
}

function showHelp(): void {
	console.info(`🏢 Tier-1380 Snapshot CLI - hardened multi-tenant archive management`);
	console.info(``);
	console.info(`Usage: bun snapshot-cli.ts <command> [options]`);
	console.info(``);
	console.info(`Commands:`);
	console.info(`  create <tenant>        Create snapshot for tenant`);
	console.info(`  list [limit]           List recent snapshots`);
	console.info(`  extract <path> <dir>   Extract snapshot to directory`);
	console.info(`  verify <path>          Verify snapshot integrity`);
	console.info(`  cleanup [days]         Cleanup old snapshots`);
	console.info(`  stats                  Show storage statistics`);
	console.info(`  help                   Show this help`);
	console.info(``);
	console.info(`Create Options:`);
	console.info(`  --variant=<name>       Tenant variant (default: production)`);
	console.info(`  --pool-size=<n>        Pool size (default: 10)`);
	console.info(`  --compression=<1-9>    Compression level (default: 7)`);
	console.info(`  --include-config       Include tenant configuration`);
	console.info(``);
	console.info(`List Options:`);
	console.info(`  --tenant=<id>          Filter by tenant`);
	console.info(`  --variant=<name>       Filter by variant`);
	console.info(`  --min-size=<MB>        Minimum size filter`);
	console.info(`  --max-size=<MB>        Maximum size filter`);
	console.info(``);
	console.info(`Extract Options:`);
	console.info(`  --validate             Verify integrity during extraction`);
	console.info(`  --max-size=<bytes>     Maximum extraction size`);
	console.info(``);
	console.info(`Cleanup Options:`);
	console.info(`  --execute              Actually delete (default: dry run)`);
	console.info(``);
	console.info(`Examples:`);
	console.info(
		`  bun snapshot-cli.ts create tenant-a --variant=production --compression=9`,
	);
	console.info(`  bun snapshot-cli.ts list 20 --tenant=tenant-a`);
	console.info(
		`  bun snapshot-cli.ts extract ./snapshots/tenant-a-2026-01-31T12-34-56.tar.gz ./restore/`,
	);
	console.info(
		`  bun snapshot-cli.ts verify ./snapshots/tenant-a-2026-01-31T12-34-56.tar.gz`,
	);
	console.info(`  bun snapshot-cli.ts cleanup 30 --execute`);
	console.info(`  bun snapshot-cli.ts stats`);
}

// Run CLI
if (import.meta.main) {
	main();
}
