#!/usr/bin/env bun
/**
 * Tier-1380 OMEGA Snapshot Retention Policy
 * Automated cleanup of old snapshots with audit logging
 */

import { $ } from "bun";

interface RetentionPolicy {
	maxAgeDays: number;
	maxCount: number;
	minKeep: number;
	dryRun: boolean;
}

interface SnapshotInfo {
	path: string;
	filename: string;
	tenant: string;
	timestamp: Date;
	size: number;
}

async function listSnapshots(snapshotDir: string): Promise<SnapshotInfo[]> {
	const snapshots: SnapshotInfo[] = [];

	try {
		const files = await $`ls -la ${snapshotDir}/*.tar.gz 2>/dev/null || echo ""`.text();

		for (const line of files.trim().split("\n")) {
			const parts = line.trim().split(/\s+/);
			if (parts.length < 9) continue;

			const filename = parts[8];
			const size = parseInt(parts[4], 10);

			// Parse filename: audit-snapshot-{tenant}-{timestamp}.tar.gz
			const match = filename.match(
				/audit-snapshot-(.+)-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})\.tar\.gz/,
			);
			if (!match) continue;

			const [, tenant, timestampStr] = match;
			const timestamp = new Date(timestampStr.replace(/-/g, ":").replace("T", " "));

			snapshots.push({
				path: `${snapshotDir}/${filename}`,
				filename,
				tenant,
				timestamp,
				size,
			});
		}
	} catch {
		// Directory doesn't exist or is empty
	}

	return snapshots.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

function applyRetentionPolicy(
	snapshots: SnapshotInfo[],
	policy: RetentionPolicy,
): { keep: SnapshotInfo[]; remove: SnapshotInfo[] } {
	const now = new Date();
	const cutoffDate = new Date(now.getTime() - policy.maxAgeDays * 24 * 60 * 60 * 1000);

	const keep: SnapshotInfo[] = [];
	const remove: SnapshotInfo[] = [];

	// Group by tenant
	const byTenant = new Map<string, SnapshotInfo[]>();
	for (const s of snapshots) {
		if (!byTenant.has(s.tenant)) {
			byTenant.set(s.tenant, []);
		}
		byTenant.get(s.tenant)!.push(s);
	}

	// Apply policy per tenant
	for (const [_tenant, tenantSnapshots] of byTenant) {
		let kept = 0;

		for (const snapshot of tenantSnapshots) {
			const isRecent = snapshot.timestamp > cutoffDate;
			const underLimit = kept < policy.maxCount;
			const aboveMin = kept < policy.minKeep;

			if (aboveMin || (isRecent && underLimit)) {
				keep.push(snapshot);
				kept++;
			} else {
				remove.push(snapshot);
			}
		}
	}

	return { keep, remove };
}

async function deleteSnapshots(
	snapshots: SnapshotInfo[],
	dryRun: boolean,
): Promise<void> {
	for (const s of snapshots) {
		if (dryRun) {
			console.log(`  [DRY RUN] Would delete: ${s.filename}`);
		} else {
			try {
				await $`rm ${s.path}`.quiet();
				console.log(`  🗑️  Deleted: ${s.filename}`);
			} catch (_error) {
				console.error(`  ❌ Failed to delete: ${s.filename}`);
			}
		}
	}
}

// Main
if (import.meta.main) {
	const args = Bun.argv.slice(2);
	const snapshotDir =
		args.find((a) => a.startsWith("--dir="))?.split("=")[1] || "./snapshots";
	const maxAgeDays = parseInt(
		args.find((a) => a.startsWith("--max-age="))?.split("=")[1] || "30",
		10,
	);
	const maxCount = parseInt(
		args.find((a) => a.startsWith("--max-count="))?.split("=")[1] || "10",
		10,
	);
	const minKeep = parseInt(
		args.find((a) => a.startsWith("--min-keep="))?.split("=")[1] || "3",
		10,
	);
	const dryRun = args.includes("--dry-run");

	console.log("╔════════════════════════════════════════════════════════╗");
	console.log("║     Tier-1380 OMEGA Snapshot Retention Policy          ║");
	console.log(`${`║     Mode: ${dryRun ? "DRY RUN" : "LIVE"}`.padEnd(55)}║`);
	console.log("╚════════════════════════════════════════════════════════╝");
	console.log();
	console.log(`Snapshot Directory: ${snapshotDir}`);
	console.log(`Max Age: ${maxAgeDays} days`);
	console.log(`Max Count: ${maxCount} per tenant`);
	console.log(`Min Keep: ${minKeep} per tenant`);
	console.log();

	const snapshots = await listSnapshots(snapshotDir);

	if (snapshots.length === 0) {
		console.log("No snapshots found.");
		process.exit(0);
	}

	console.log(`Found ${snapshots.length} snapshots`);
	console.log();

	const policy: RetentionPolicy = { maxAgeDays, maxCount, minKeep, dryRun };
	const { keep, remove } = applyRetentionPolicy(snapshots, policy);

	console.log(`Retention Policy:`);
	console.log(`  Keep: ${keep.length} snapshots`);
	console.log(`  Remove: ${remove.length} snapshots`);
	console.log();

	if (remove.length > 0) {
		console.log("Deleting old snapshots...");
		await deleteSnapshots(remove, dryRun);
		console.log();
	}

	const totalSize = keep.reduce((sum, s) => sum + s.size, 0);
	console.log(`Storage Summary:`);
	console.log(`  Remaining snapshots: ${keep.length}`);
	console.log(`  Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

	if (dryRun) {
		console.log();
		console.log("This was a dry run. No files were deleted.");
		console.log("Run without --dry-run to apply changes.");
	}
}

export {
	listSnapshots,
	applyRetentionPolicy,
	deleteSnapshots,
	type RetentionPolicy,
	type SnapshotInfo,
};
