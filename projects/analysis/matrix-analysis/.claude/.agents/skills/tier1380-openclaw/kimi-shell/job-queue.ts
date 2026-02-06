#!/usr/bin/env bun
/**
 * Kimi Shell Job Queue
 * Background job execution with SQLite persistence
 */

import { Database } from "bun:sqlite";
import { randomUUID } from "crypto";
import { homedir } from "os";
import { join } from "path";

const COLORS = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	cyan: "\x1b[36m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	red: "\x1b[31m",
	gray: "\x1b[90m",
};

const DB_PATH = join(homedir(), ".kimi", "jobs.db");

export type JobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export interface Job {
	id: string;
	command: string;
	args: string[];
	status: JobStatus;
	createdAt: number;
	startedAt?: number;
	completedAt?: number;
	exitCode?: number;
	output?: string;
	error?: string;
	pid?: number;
	priority: number;
	retries: number;
	maxRetries: number;
}

export interface JobSchedule {
	id: string;
	jobId: string;
	cron: string;
	enabled: boolean;
	lastRun?: number;
	nextRun?: number;
}

class JobQueue {
	private db: Database;

	constructor() {
		this.db = new Database(DB_PATH);
		this.init();
	}

	private init(): void {
		this.db.run(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        command TEXT NOT NULL,
        args TEXT DEFAULT '[]',
        status TEXT DEFAULT 'pending',
        createdAt INTEGER DEFAULT (unixepoch() * 1000),
        startedAt INTEGER,
        completedAt INTEGER,
        exitCode INTEGER,
        output TEXT,
        error TEXT,
        pid INTEGER,
        priority INTEGER DEFAULT 0,
        retries INTEGER DEFAULT 0,
        maxRetries INTEGER DEFAULT 3
      )
    `);

		this.db.run(`
      CREATE TABLE IF NOT EXISTS schedules (
        id TEXT PRIMARY KEY,
        jobId TEXT NOT NULL,
        cron TEXT NOT NULL,
        enabled INTEGER DEFAULT 1,
        lastRun INTEGER,
        nextRun INTEGER
      )
    `);

		// Mark running jobs as failed (recovery after crash)
		this.db.run(`
      UPDATE jobs 
      SET status = 'failed', error = 'Process crashed'
      WHERE status = 'running'
    `);
	}

	async submit(
		command: string,
		args: string[] = [],
		options: {
			priority?: number;
			maxRetries?: number;
		} = {},
	): Promise<Job> {
		const id = randomUUID();
		const job: Job = {
			id,
			command,
			args,
			status: "pending",
			createdAt: Date.now(),
			priority: options.priority || 0,
			retries: 0,
			maxRetries: options.maxRetries || 3,
		};

		this.db.run(
			`
      INSERT INTO jobs (id, command, args, priority, maxRetries)
      VALUES (?, ?, ?, ?, ?)
    `,
			[id, command, JSON.stringify(args), job.priority, job.maxRetries],
		);

		return job;
	}

	async run(jobId: string): Promise<void> {
		const job = this.get(jobId);
		if (!job || job.status !== "pending") return;

		// Mark as running
		this.db.run(
			`
      UPDATE jobs SET status = 'running', startedAt = ?, pid = ?
      WHERE id = ?
    `,
			[Date.now(), process.pid, jobId],
		);

		try {
			const { $ } = await import("bun");
			const result = await $`${{ raw: job.command }} ${job.args}`.nothrow();

			const output = result.stdout.toString();
			const error = result.stderr.toString();
			const exitCode = result.exitCode;

			// Update job status
			const status: JobStatus = exitCode === 0 ? "completed" : "failed";

			this.db.run(
				`
        UPDATE jobs 
        SET status = ?, completedAt = ?, exitCode = ?, output = ?, error = ?
        WHERE id = ?
      `,
				[status, Date.now(), exitCode, output, error, jobId],
			);

			// Retry if failed and retries remaining
			if (status === "failed" && job.retries < job.maxRetries) {
				this.db.run(
					`
          UPDATE jobs SET retries = retries + 1, status = 'pending'
          WHERE id = ?
        `,
					[jobId],
				);
			}
		} catch (e) {
			this.db.run(
				`
        UPDATE jobs 
        SET status = 'failed', completedAt = ?, error = ?
        WHERE id = ?
      `,
				[Date.now(), String(e), jobId],
			);
		}
	}

	get(id: string): Job | null {
		const row = this.db.query("SELECT * FROM jobs WHERE id = ?").get(id) as any;
		return row ? this.rowToJob(row) : null;
	}

	list(status?: JobStatus): Job[] {
		const query = status
			? "SELECT * FROM jobs WHERE status = ? ORDER BY createdAt DESC"
			: "SELECT * FROM jobs ORDER BY createdAt DESC LIMIT 50";

		const rows = this.db.query(query).all(status ? [status] : []) as any[];
		return rows.map((r) => this.rowToJob(r));
	}

	cancel(id: string): boolean {
		const job = this.get(id);
		if (!job || job.status === "running") return false;

		this.db.run("UPDATE jobs SET status = 'cancelled' WHERE id = ?", [id]);
		return true;
	}

	delete(id: string): boolean {
		const result = this.db.run("DELETE FROM jobs WHERE id = ?", [id]);
		return result.changes > 0;
	}

	async processQueue(): Promise<void> {
		// Get pending jobs ordered by priority
		const pending = this.db
			.query(`
      SELECT * FROM jobs 
      WHERE status = 'pending'
      ORDER BY priority DESC, createdAt ASC
      LIMIT 5
    `)
			.all() as any[];

		for (const row of pending) {
			await this.run(row.id);
		}
	}

	private rowToJob(row: any): Job {
		return {
			id: row.id,
			command: row.command,
			args: JSON.parse(row.args || "[]"),
			status: row.status as JobStatus,
			createdAt: row.createdAt,
			startedAt: row.startedAt,
			completedAt: row.completedAt,
			exitCode: row.exitCode,
			output: row.output,
			error: row.error,
			pid: row.pid,
			priority: row.priority,
			retries: row.retries,
			maxRetries: row.maxRetries,
		};
	}

	cleanup(maxAge: number = 7 * 24 * 60 * 60 * 1000): number {
		// Delete jobs older than maxAge (default 7 days)
		const cutoff = Date.now() - maxAge;
		const result = this.db.run(
			`
      DELETE FROM jobs 
      WHERE createdAt < ? AND status IN ('completed', 'failed', 'cancelled')
    `,
			[cutoff],
		);
		return result.changes;
	}

	close(): void {
		this.db.close();
	}
}

async function main() {
	const args = Bun.argv.slice(2);
	const command = args[0];
	const queue = new JobQueue();

	switch (command) {
		case "run": {
			const cmd = args[1];
			if (!cmd) {
				console.error("Usage: job run <command> [args...]");
				process.exit(1);
			}

			const jobArgs = args.slice(2);
			const job = await queue.submit(cmd, jobArgs);

			console.log(
				`${COLORS.green}✓${COLORS.reset} Job submitted: ${COLORS.cyan}${job.id.slice(0, 8)}${COLORS.reset}`,
			);
			console.log(`${COLORS.gray}  Command: ${cmd} ${jobArgs.join(" ")}${COLORS.reset}`);

			// Run immediately in background
			queue.run(job.id).catch(() => {});
			break;
		}

		case "list": {
			const status = args[1] as JobStatus | undefined;
			const jobs = queue.list(status);

			console.log(`${COLORS.bold}Jobs:${COLORS.reset}\n`);

			for (const job of jobs) {
				const statusColor = {
					pending: COLORS.yellow,
					running: COLORS.cyan,
					completed: COLORS.green,
					failed: COLORS.red,
					cancelled: COLORS.gray,
				}[job.status];

				const indicator =
					job.status === "running"
						? "▶"
						: job.status === "completed"
							? "✓"
							: job.status === "failed"
								? "✗"
								: "○";

				console.log(
					`  ${statusColor}${indicator}${COLORS.reset} ${job.command.slice(0, 30).padEnd(30)} ${statusColor}${job.status}${COLORS.reset}`,
				);
				console.log(
					`    ${COLORS.gray}ID: ${job.id.slice(0, 8)} | Created: ${new Date(job.createdAt).toLocaleTimeString()}${COLORS.reset}`,
				);

				if (job.exitCode !== undefined) {
					console.log(
						`    Exit: ${job.exitCode === 0 ? COLORS.green : COLORS.red}${job.exitCode}${COLORS.reset}`,
					);
				}
				console.log();
			}
			break;
		}

		case "status": {
			const id = args[1];
			if (!id) {
				console.error("Usage: job status <id>");
				process.exit(1);
			}

			const job = queue.get(id);
			if (!job) {
				console.error(`${COLORS.red}✗${COLORS.reset} Job not found: ${id}`);
				process.exit(1);
			}

			console.log(`${COLORS.bold}Job ${id.slice(0, 8)}:${COLORS.reset}`);
			console.log(`  Status: ${job.status}`);
			console.log(`  Command: ${job.command} ${job.args.join(" ")}`);
			console.log(`  Created: ${new Date(job.createdAt).toLocaleString()}`);

			if (job.output) {
				console.log(`\n${COLORS.bold}Output:${COLORS.reset}`);
				console.log(job.output);
			}

			if (job.error) {
				console.log(`\n${COLORS.red}Error:${COLORS.reset}`);
				console.log(job.error);
			}
			break;
		}

		case "logs": {
			const id = args[1];
			if (!id) {
				console.error("Usage: job logs <id>");
				process.exit(1);
			}

			const job = queue.get(id);
			if (!job) {
				console.error(`${COLORS.red}✗${COLORS.reset} Job not found: ${id}`);
				process.exit(1);
			}

			if (job.output) console.log(job.output);
			if (job.error) console.error(job.error);
			break;
		}

		case "cancel": {
			const id = args[1];
			if (!id) {
				console.error("Usage: job cancel <id>");
				process.exit(1);
			}

			const success = queue.cancel(id);
			if (success) {
				console.log(
					`${COLORS.green}✓${COLORS.reset} Job cancelled: ${COLORS.cyan}${id.slice(0, 8)}${COLORS.reset}`,
				);
			} else {
				console.error(
					`${COLORS.red}✗${COLORS.reset} Could not cancel job (may be running)`,
				);
				process.exit(1);
			}
			break;
		}

		case "delete": {
			const id = args[1];
			if (!id) {
				console.error("Usage: job delete <id>");
				process.exit(1);
			}

			const success = queue.delete(id);
			if (success) {
				console.log(
					`${COLORS.green}✓${COLORS.reset} Job deleted: ${COLORS.cyan}${id.slice(0, 8)}${COLORS.reset}`,
				);
			} else {
				console.error(`${COLORS.red}✗${COLORS.reset} Job not found`);
				process.exit(1);
			}
			break;
		}

		case "cleanup": {
			const deleted = queue.cleanup();
			console.log(`${COLORS.green}✓${COLORS.reset} Cleaned up ${deleted} old jobs`);
			break;
		}

		case "process": {
			console.log(`${COLORS.cyan}Processing job queue...${COLORS.reset}`);
			await queue.processQueue();
			console.log(`${COLORS.green}✓${COLORS.reset} Done`);
			break;
		}

		default: {
			console.log(`${COLORS.bold}🐚 Kimi Job Queue${COLORS.reset}\n`);
			console.log("Usage:");
			console.log("  job run <command> [args...]     Submit a background job");
			console.log(
				"  job list [status]               List jobs (pending|running|completed|failed)",
			);
			console.log("  job status <id>                 Show job details");
			console.log("  job logs <id>                   Show job output");
			console.log("  job cancel <id>                 Cancel a pending job");
			console.log("  job delete <id>                 Delete a job");
			console.log("  job cleanup                     Remove old completed jobs");
			console.log("  job process                     Process pending jobs");
			console.log("\nExamples:");
			console.log("  job run 'sleep 10 && echo done'");
			console.log("  job run openclaw status");
			console.log("  job list running");
		}
	}

	queue.close();
}

if (import.meta.main) {
	main().catch(console.error);
}

export { JobQueue };
export type { Job, JobStatus, JobSchedule };
