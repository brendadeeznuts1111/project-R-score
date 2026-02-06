#!/usr/bin/env bun

/**
 * Tier-1380 OMEGA Snapshot Cron
 * Automated nightly snapshot creation with notifications
 */

import { Database } from "bun:sqlite";
import { $ } from "bun";

interface CronConfig {
	intervalHours: number;
	snapshotDir: string;
	notifyUrl?: string;
	enabled: boolean;
}

const DEFAULT_CONFIG: CronConfig = {
	intervalHours: 24,
	snapshotDir: "./snapshots",
	enabled: true,
};

class SnapshotCron {
	private config: CronConfig;
	private timer: Timer | null = null;

	constructor(config: Partial<CronConfig> = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };
	}

	async start(): Promise<void> {
		if (!this.config.enabled) {
			console.log("⏸️  Cron disabled");
			return;
		}

		console.log(`🕐 Starting snapshot cron (every ${this.config.intervalHours}h)`);

		// Run immediately
		await this.runSnapshotJob();

		// Schedule next run
		const intervalMs = this.config.intervalHours * 60 * 60 * 1000;
		this.timer = setInterval(() => this.runSnapshotJob(), intervalMs);

		console.log(`   Next run: ${new Date(Date.now() + intervalMs).toISOString()}`);
	}

	stop(): void {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = null;
			console.log("⏹️  Cron stopped");
		}
	}

	private async runSnapshotJob(): Promise<void> {
		console.log(`\n[${new Date().toISOString()}] Running snapshot job...`);

		try {
			const tenants = await this.getActiveTenants();
			console.log(`   Found ${tenants.length} active tenants`);

			const results = [];
			for (const tenant of tenants) {
				try {
					const result = await this.createSnapshot(tenant);
					results.push(result);

					// Notify if URL configured
					if (this.config.notifyUrl) {
						await this.notifySnapshotCreated(tenant, result);
					}
				} catch (err) {
					console.error(
						`   ❌ Failed for ${tenant}:`,
						err instanceof Error ? err.message : err,
					);
				}
			}

			console.log(`   ✅ Created ${results.length} snapshots`);

			// Run retention cleanup
			await this.cleanupOldSnapshots();
		} catch (error) {
			console.error("   ❌ Job failed:", error);
		}
	}

	private async getActiveTenants(): Promise<string[]> {
		// Try to get from database
		try {
			const db = new Database(`${process.env.HOME}/.matrix/commit-history.db`);
			const rows = db
				.query("SELECT DISTINCT domain as tenant FROM commits LIMIT 100")
				.all() as Array<{ tenant: string }>;
			db.close();
			return rows.map((r) => r.tenant).filter(Boolean);
		} catch {
			// Fallback: scan snapshot directory
			try {
				const files =
					await $`ls ${this.config.snapshotDir}/*.tar.gz 2>/dev/null || echo ""`.text();
				const tenants = new Set<string>();

				for (const file of files.trim().split("\n")) {
					const match = file.match(/audit-snapshot-(.+)-\d{4}/);
					if (match) tenants.add(match[1]);
				}

				return Array.from(tenants);
			} catch {
				return [];
			}
		}
	}

	private async createSnapshot(
		tenant: string,
	): Promise<{ path: string; sha256: string; size: number }> {
		const { $ } = await import("bun");

		// Create snapshot directory
		await $`mkdir -p ${this.config.snapshotDir}`.quiet();

		// Generate snapshot using the archiver
		const result =
			await $`bun ${import.meta.dir}/snapshot-create.ts ${tenant} ${this.config.snapshotDir}`.json();

		return result;
	}

	private async notifySnapshotCreated(
		tenant: string,
		result: { path: string; sha256: string; size: number },
	): Promise<void> {
		if (!this.config.notifyUrl) return;

		try {
			await fetch(this.config.notifyUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					type: "snapshot_created",
					tenant,
					filename: result.path.split("/").pop(),
					sha256: result.sha256,
					size: result.size,
					timestamp: new Date().toISOString(),
				}),
			});
		} catch {
			// Notification failed, but snapshot succeeded
			console.log(`   ⚠️  Notification failed for ${tenant}`);
		}
	}

	private async cleanupOldSnapshots(): Promise<void> {
		console.log("   Running retention cleanup...");

		try {
			const { $ } = await import("bun");
			await $`bun ${import.meta.dir}/snapshot-retention.ts --dir=${this.config.snapshotDir} --max-age=30 --max-count=10`.quiet();
			console.log("   🧹 Cleanup complete");
		} catch {
			console.log("   ⚠️  Cleanup skipped");
		}
	}
}

// Main
if (import.meta.main) {
	const args = Bun.argv.slice(2);
	const interval = parseInt(
		args.find((a) => a.startsWith("--interval="))?.split("=")[1] || "24",
		10,
	);
	const dir = args.find((a) => a.startsWith("--dir="))?.split("=")[1] || "./snapshots";
	const notifyUrl = args.find((a) => a.startsWith("--notify="))?.split("=")[1];
	const once = args.includes("--once");

	console.log("╔════════════════════════════════════════════════════════╗");
	console.log("║     Tier-1380 OMEGA Snapshot Cron                      ║");
	console.log("╚════════════════════════════════════════════════════════╝");
	console.log();

	const cron = new SnapshotCron({
		intervalHours: once ? 0 : interval,
		snapshotDir: dir,
		notifyUrl,
		enabled: true,
	});

	if (once) {
		console.log("Running once...\n");
		await cron.runSnapshotJob();
		process.exit(0);
	} else {
		cron.start();

		// Handle graceful shutdown
		process.on("SIGINT", () => {
			console.log("\n");
			cron.stop();
			process.exit(0);
		});

		process.on("SIGTERM", () => {
			cron.stop();
			process.exit(0);
		});
	}
}

export { SnapshotCron, type CronConfig };
