#!/usr/bin/env bun
/**
 * Tier-1380 System Information Summary
 * Comprehensive overview of all infrastructure components
 * Usage: bun run tier1380:sysinfo [--json] [--health]
 */

import { Database } from "bun:sqlite";
import { existsSync } from "fs";

// ─── Glyphs ───────────────────────────────────────
const GLYPHS = {
	DRIFT: "▵⟂⥂",
	COHERENCE: "⥂⟂(▵⟜⟳)",
	LOCKED: "⟳⟲⟜(▵⊗⥂)",
	AUDIT: "⊟",
	RUN: "▶",
	LOCK: "🔒",
	WARN: "⚠",
	OK: "✓",
	FAIL: "✗",
};

// ─── Parse Args ───────────────────────────────────
const args = process.argv.slice(2);
const jsonMode = args.includes("--json");
const healthMode = args.includes("--health");

// ─── Component Checkers ───────────────────────────
async function checkPort(port: number, host = "127.0.0.1"): Promise<boolean> {
	try {
		const conn = await Bun.connect({ hostname: host, port });
		conn.end();
		return true;
	} catch {
		return false;
	}
}

async function getOpenClawInfo() {
	const configPath = `${process.env.HOME}/.openclaw/openclaw.json`;
	const config = existsSync(configPath)
		? await Bun.file(configPath)
				.json()
				.catch(() => null)
		: null;

	return {
		version: "v2026.1.30",
		running: await checkPort(18789),
		port: 18789,
		tailscale: "nolas-mac-mini.tailb53dda.ts.net",
		config: config ? "✓" : "✗",
		healthy: config !== null,
	};
}

async function getMatrixAgentInfo() {
	const configPath = `${process.env.HOME}/.matrix/agent/config.json`;
	const config = existsSync(configPath)
		? await Bun.file(configPath)
				.json()
				.catch(() => null)
		: null;

	return {
		version: config?.version || "v1.0.0",
		name: config?.name || "matrix-agent",
		model: config?.agents?.defaults?.model?.primary || "unknown",
		config: config ? "✓" : "✗",
		healthy: config !== null,
	};
}

async function getProfileInfo() {
	const profilesDir = `${process.env.HOME}/.matrix/profiles`;
	const profiles: string[] = [];

	if (existsSync(profilesDir)) {
		for await (const entry of new Bun.Glob("*.json").scan(profilesDir)) {
			profiles.push(entry.replace(".json", ""));
		}
	}

	return {
		count: profiles.length,
		profiles: profiles.slice(0, 5),
		all: profiles,
		healthy: profiles.length > 0,
	};
}

async function getAuditInfo() {
	const dbPath = "./data/tier1380.db";
	if (!existsSync(dbPath)) {
		return { violations: 0, executions: 0, packages: 0, healthy: true };
	}

	try {
		const db = new Database(dbPath, { readonly: true });
		const violations = (db.query("SELECT COUNT(*) as c FROM violations").get() as any).c;
		const executions = (db.query("SELECT COUNT(*) as c FROM executions").get() as any).c;
		const packages = (db.query("SELECT COUNT(*) as c FROM packages").get() as any).c;
		db.close();

		return { violations, executions, packages, healthy: true };
	} catch {
		return { violations: 0, executions: 0, packages: 0, healthy: false };
	}
}

async function getCronInfo() {
	try {
		const proc = Bun.spawn(["bash", "-c", "crontab -l 2>/dev/null || echo ''"], {
			stdout: "pipe",
			stderr: "pipe",
		});
		const stdout = await new Response(proc.stdout).text();
		await proc.exited;
		const jobs = stdout
			.trim()
			.split("\n")
			.filter((l) => l.trim() && !l.startsWith("#"));
		return { count: jobs.length, jobs: jobs.slice(0, 3), healthy: true };
	} catch {
		return { count: 0, jobs: [], healthy: false };
	}
}

async function getGitInfo() {
	try {
		const proc = Bun.spawn(
			["bash", "-c", "git rev-parse --short HEAD 2>/dev/null || echo 'unknown'"],
			{
				stdout: "pipe",
			},
		);
		const commit = (await new Response(proc.stdout).text()).trim();
		await proc.exited;
		return { commit, healthy: commit !== "unknown" };
	} catch {
		return { commit: "unknown", healthy: false };
	}
}

async function getBunInfo() {
	return {
		version: Bun.version,
		revision: Bun.revision,
		healthy: true,
	};
}

// ─── Health Check ─────────────────────────────────
async function runHealthCheck(): Promise<void> {
	const results: {
		component: string;
		status: "healthy" | "degraded" | "failing";
		details: string;
	}[] = [];

	// Check OpenClaw
	const openclaw = await getOpenClawInfo();
	results.push({
		component: "OpenClaw Gateway",
		status: openclaw.running ? "healthy" : "failing",
		details: openclaw.running
			? `Port ${openclaw.port} responding`
			: `Port ${openclaw.port} not responding`,
	});

	// Check Matrix Agent
	const agent = await getMatrixAgentInfo();
	results.push({
		component: "Matrix Agent",
		status: agent.healthy ? "healthy" : "failing",
		details: agent.healthy ? `Config found (${agent.version})` : "Config not found",
	});

	// Check Profiles
	const profiles = await getProfileInfo();
	results.push({
		component: "Environment Profiles",
		status: profiles.count > 0 ? "healthy" : "degraded",
		details: `${profiles.count} profiles available`,
	});

	// Check Audit Database
	const audit = await getAuditInfo();
	results.push({
		component: "Audit System",
		status: audit.healthy ? "healthy" : "degraded",
		details: `${audit.violations} violations, ${audit.executions} executions`,
	});

	// Check Cron
	const cron = await getCronInfo();
	results.push({
		component: "Cron Jobs",
		status: cron.healthy ? "healthy" : "degraded",
		details: `${cron.count} jobs configured`,
	});

	// Display results
	console.log(`\n${GLYPHS.DRIFT} Tier-1380 Health Check\n`);
	console.log("-".repeat(70));

	for (const r of results) {
		const icon =
			r.status === "healthy"
				? GLYPHS.OK
				: r.status === "degraded"
					? GLYPHS.WARN
					: GLYPHS.FAIL;
		const statusColor =
			r.status === "healthy"
				? "\x1b[32m"
				: r.status === "degraded"
					? "\x1b[33m"
					: "\x1b[31m";
		const reset = "\x1b[39m";
		console.log(
			`${icon} ${r.component.padEnd(25)} ${statusColor}${r.status.toUpperCase()}${reset}`,
		);
		console.log(`   ${r.details}`);
	}

	console.log("-".repeat(70));

	const healthy = results.filter((r) => r.status === "healthy").length;
	const total = results.length;

	if (healthy === total) {
		console.log(`\n${GLYPHS.LOCKED} All ${total} components healthy`);
	} else {
		console.log(`\n${GLYPHS.WARN} ${healthy}/${total} components healthy`);
	}
	console.log();

	process.exit(healthy === total ? 0 : 1);
}

// ─── Main Display ─────────────────────────────────
async function main(): Promise<void> {
	// Run health check mode
	if (healthMode) {
		await runHealthCheck();
		return;
	}

	// Gather all data
	const [bun, openclaw, agent, profiles, audit, cron, git] = await Promise.all([
		getBunInfo(),
		getOpenClawInfo(),
		getMatrixAgentInfo(),
		getProfileInfo(),
		getAuditInfo(),
		getCronInfo(),
		getGitInfo(),
	]);

	// JSON output mode
	if (jsonMode) {
		console.log(
			JSON.stringify(
				{
					timestamp: new Date().toISOString(),
					bun,
					openclaw,
					matrixAgent: agent,
					profiles,
					audit,
					cron,
					git,
				},
				null,
				2,
			),
		);
		return;
	}

	// Terminal output
	console.log(`\n${GLYPHS.DRIFT} Tier-1380 System Information Summary\n`);

	// Header
	console.log("-".repeat(70));
	console.log("  Runtime Environment");
	console.log("-".repeat(70));
	console.log(`  Bun Version:     ${bun.version} (${bun.revision.slice(0, 8)})`);
	console.log(`  Working Dir:     ${process.cwd()}`);
	console.log(`  Home Dir:        ${process.env.HOME}`);
	console.log(`  Git Commit:      ${git.commit}`);

	// OpenClaw
	console.log("\n" + "-".repeat(70));
	console.log("  OpenClaw Gateway");
	console.log("-".repeat(70));
	const ocStatus = openclaw.running ? `${GLYPHS.OK} Running` : `${GLYPHS.FAIL} Stopped`;
	console.log(`  Status:          ${ocStatus}`);
	console.log(`  Version:         ${openclaw.version}`);
	console.log(`  Local Port:      ${openclaw.port}`);
	console.log(`  Tailscale:       ${openclaw.tailscale}`);
	console.log(`  Config:          ${openclaw.config}`);

	// Matrix Agent
	console.log("\n" + "-".repeat(70));
	console.log("  Matrix Agent");
	console.log("-".repeat(70));
	console.log(`  Name:            ${agent.name}`);
	console.log(`  Version:         ${agent.version}`);
	console.log(`  Config:          ${agent.config}`);
	console.log(`  Primary Model:   ${agent.model}`);

	// Profiles
	console.log("\n" + "-".repeat(70));
	console.log("  Environment Profiles");
	console.log("-".repeat(70));
	console.log(`  Total Profiles:  ${profiles.count}`);
	if (profiles.count > 0) {
		console.log(
			`  Recent:          ${profiles.profiles.join(", ")}${profiles.count > 5 ? " ..." : ""}`,
		);
	}

	// Audit System
	console.log("\n" + "-".repeat(70));
	console.log("  Tier-1380 Audit System");
	console.log("-".repeat(70));
	const vWarn = audit.violations > 0 ? GLYPHS.WARN + " " : GLYPHS.OK + " ";
	console.log(`  Col-89 Violations:  ${vWarn}${audit.violations}`);
	console.log(`  Secure Executions:  ${audit.executions}`);
	console.log(`  Packages Verified:  ${audit.packages}`);

	// Cron Jobs
	console.log("\n" + "-".repeat(70));
	console.log("  Scheduled Tasks (Cron)");
	console.log("-".repeat(70));
	console.log(`  Active Jobs:     ${cron.count}`);
	if (cron.jobs.length > 0) {
		cron.jobs.forEach((job, i) => {
			const cmd = job.length > 50 ? job.slice(0, 47) + "..." : job;
			console.log(`  ${i + 1}. ${cmd}`);
		});
		if (cron.count > 3) console.log(`     ... and ${cron.count - 3} more`);
	}

	// Quick Links
	console.log("\n" + "-".repeat(70));
	console.log("  Quick Commands");
	console.log("-".repeat(70));
	console.log(`  bun run tier1380:sysinfo          Show this summary`);
	console.log(`  bun run tier1380:sysinfo --json   JSON output`);
	console.log(`  bun run tier1380:sysinfo --health Health check`);
	console.log(`  bun run matrix:openclaw:status    Check OpenClaw status`);
	console.log(`  bun run tier1380:audit db         View audit database`);
	console.log(`  bun run tier1380:exec:stats       View execution stats`);

	// Footer
	console.log("\n" + "-".repeat(70));
	console.log(`  ${GLYPHS.LOCKED} Tier-1380 OMEGA System v1.0.0`);
	console.log("-".repeat(70) + "\n");
}

if (import.meta.main) {
	main().catch(console.error);
}

export {
	getOpenClawInfo,
	getMatrixAgentInfo,
	getProfileInfo,
	getAuditInfo,
	runHealthCheck,
};
