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
	console.log(width <= 89 ? message : Bun.escapeHTML(message.slice(0, 86)) + "…");
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

	console.log(`✅ Snapshot created successfully:`);
	console.log(`   ID: ${result.id}`);
	console.log(`   Path: ${result.path}`);
	console.log(`   Size: ${Math.round(result.size / 1024)} KiB`);
	console.log(`   SHA-256: ${result.sha256}`);
	console.log(`   Entries: ${result.entries}`);
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

	console.log(`📋 Recent Snapshots (${snapshots.length} found):`);
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

	console.log(`✅ Extraction completed:`);
	console.log(`   Entries extracted: ${result.entries}`);
	console.log(`   Integrity: ${result.integrity.valid ? "✅ Valid" : "❌ Invalid"}`);
	console.log(`   Files: ${result.files.length}`);

	if (result.files.length <= 10) {
		console.log(`   File list: ${result.files.join(", ")}`);
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

	console.log(`📊 Verification Results:`);
	console.log(`   File exists: ${result.file_exists ? "✅ Yes" : "❌ No"}`);
	console.log(`   Size matches: ${result.size_matches ? "✅ Yes" : "❌ No"}`);
	console.log(`   Hash valid: ${result.valid ? "✅ Yes" : "❌ No"}`);

	if (result.expected_hash) {
		console.log(`   Expected hash: ${result.expected_hash.slice(0, 16)}…`);
		console.log(`   Actual hash: ${result.actual_hash.slice(0, 16)}…`);
	}
}

async function handleCleanup(): Promise<void> {
	const retentionDays = parseInt(OPTIONS[0]) || 30;
	const dryRun = !OPTIONS.includes("--execute");

	safeLog(
		`🗑️ Cleanup snapshots older than ${retentionDays} days (${dryRun ? "DRY RUN" : "EXECUTING"})`,
	);

	const result = cleanupOldSnapshots(retentionDays, dryRun);

	console.log(`📊 Cleanup Results:`);
	console.log(`   Snapshots to delete: ${result.deleted}`);
	console.log(`   Total size: ${Math.round(result.totalSize / 1024 / 1024)} MiB`);

	if (result.snapshots.length > 0 && result.snapshots.length <= 5) {
		console.log(`   Affected snapshots:`);
		result.snapshots.forEach((s) => {
			console.log(`     - ${s.tenant}: ${new Date(s.created_at).toLocaleString()}`);
		});
	}
}

async function handleStats(): Promise<void> {
	safeLog("📊 Storage Statistics");

	const stats = getStorageStats();

	console.log(`📈 Overall Statistics:`);
	console.log(`   Total snapshots: ${stats.totalSnapshots}`);
	console.log(`   Total storage: ${stats.totalSizeMB} MiB`);
	console.log(`   Average size: ${stats.averageSizeMB} MiB`);
	console.log(`   Unique tenants: ${Object.keys(stats.tenantCounts).length}`);

	if (stats.oldestSnapshot) {
		console.log(`   Oldest snapshot: ${stats.oldestSnapshot.toLocaleString()}`);
	}
	if (stats.newestSnapshot) {
		console.log(`   Newest snapshot: ${stats.newestSnapshot.toLocaleString()}`);
	}

	console.log(`📊 Tenant Breakdown:`);
	Object.entries(stats.tenantCounts)
		.sort(([, a], [, b]) => b - a)
		.slice(0, 10)
		.forEach(([tenant, count]) => {
			console.log(`   ${tenant}: ${count} snapshots`);
		});
}

function showHelp(): void {
	console.log(`🏢 Tier-1380 Snapshot CLI - hardened multi-tenant archive management`);
	console.log(``);
	console.log(`Usage: bun snapshot-cli.ts <command> [options]`);
	console.log(``);
	console.log(`Commands:`);
	console.log(`  create <tenant>        Create snapshot for tenant`);
	console.log(`  list [limit]           List recent snapshots`);
	console.log(`  extract <path> <dir>   Extract snapshot to directory`);
	console.log(`  verify <path>          Verify snapshot integrity`);
	console.log(`  cleanup [days]         Cleanup old snapshots`);
	console.log(`  stats                  Show storage statistics`);
	console.log(`  help                   Show this help`);
	console.log(``);
	console.log(`Create Options:`);
	console.log(`  --variant=<name>       Tenant variant (default: production)`);
	console.log(`  --pool-size=<n>        Pool size (default: 10)`);
	console.log(`  --compression=<1-9>    Compression level (default: 7)`);
	console.log(`  --include-config       Include tenant configuration`);
	console.log(``);
	console.log(`List Options:`);
	console.log(`  --tenant=<id>          Filter by tenant`);
	console.log(`  --variant=<name>       Filter by variant`);
	console.log(`  --min-size=<MB>        Minimum size filter`);
	console.log(`  --max-size=<MB>        Maximum size filter`);
	console.log(``);
	console.log(`Extract Options:`);
	console.log(`  --validate             Verify integrity during extraction`);
	console.log(`  --max-size=<bytes>     Maximum extraction size`);
	console.log(``);
	console.log(`Cleanup Options:`);
	console.log(`  --execute              Actually delete (default: dry run)`);
	console.log(``);
	console.log(`Examples:`);
	console.log(
		`  bun snapshot-cli.ts create tenant-a --variant=production --compression=9`,
	);
	console.log(`  bun snapshot-cli.ts list 20 --tenant=tenant-a`);
	console.log(
		`  bun snapshot-cli.ts extract ./snapshots/tenant-a-2026-01-31T12-34-56.tar.gz ./restore/`,
	);
	console.log(
		`  bun snapshot-cli.ts verify ./snapshots/tenant-a-2026-01-31T12-34-56.tar.gz`,
	);
	console.log(`  bun snapshot-cli.ts cleanup 30 --execute`);
	console.log(`  bun snapshot-cli.ts stats`);
}

// Run CLI
if (import.meta.main) {
	main();
}
