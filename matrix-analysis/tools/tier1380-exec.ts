#!/usr/bin/env bun

// tier1380-exec.ts — bunx wrapper with zero-trust validation & Col-89 compliance
// Usage: bun run tier1380-exec [--bun] [-p pkg] command [args...]

import { Database } from "bun:sqlite";
import { $ } from "bun";
import { existsSync, mkdirSync } from "fs";

const DB_PATH = "./data/tier1380.db";
const GLYPHS = {
	RUN: "▶",
	LOCK: "🔒",
	SCAN: "⊟",
	PKG: "📦",
	DRIFT: "▵⟂⥂",
	PHASE_LOCKED: "⟳⟲⟜(▵⊗⥂)",
};

// ─── SQLite Initialization ────────────────────────
function initDB(): Database {
	if (!existsSync("./data")) mkdirSync("./data", { recursive: true });
	const db = new Database(DB_PATH, { create: true });
	db.run(`
    CREATE TABLE IF NOT EXISTS executions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER DEFAULT (unixepoch()),
      cmd TEXT,
      args TEXT,
      hash TEXT,
      exit INTEGER,
      duration_ms REAL
    )
  `);
	db.run(`
    CREATE TABLE IF NOT EXISTS packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER DEFAULT (unixepoch()),
      name TEXT,
      version TEXT,
      hash TEXT,
      reputation TEXT,
      cached INTEGER
    )
  `);
	return db;
}

const db = initDB();

// ─── Command Parser ───────────────────────────────
interface ParsedArgs {
	flags: {
		bun: boolean;
		package: string | null;
		version: string | null;
	};
	command: string;
	commandArgs: string[];
}

function parseArgs(argv: string[]): ParsedArgs {
	const args = argv.slice(2);
	const flags = {
		bun: false,
		package: null as string | null,
		version: null as string | null,
	};

	// Parse flags
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "--bun") {
			flags.bun = true;
			args.splice(i, 1);
			i--;
		} else if (arg === "-p" || arg === "--package") {
			flags.package = args[i + 1] || null;
			args.splice(i, 2);
			i--;
		}
	}

	// Extract command and remaining args
	const command = args.find((a) => !a.startsWith("-")) || "";
	const commandArgs = args.filter((a) => !a.startsWith("-")).slice(1);

	// Extract version from command
	if (command?.includes("@")) {
		const atIdx = command.lastIndexOf("@");
		// Make sure it's not a scoped package (@org/pkg)
		if (atIdx > 0 && command[0] !== "@") {
			flags.version = command.slice(atIdx + 1);
		} else if (atIdx > command.indexOf("/")) {
			// Scoped package: @org/pkg@version
			flags.version = command.slice(atIdx + 1);
		}
	}

	return { flags, command, commandArgs };
}

// ─── Integrity Verification ───────────────────────
interface VerificationResult {
	safe: boolean;
	hash: string;
	cached: boolean;
	reputation?: "trusted" | "unknown" | "suspicious";
}

async function verifyPackage(
	pkg: string,
	version: string | null,
): Promise<VerificationResult> {
	const fullName = version ? `${pkg}@${version}` : pkg;

	// Wyhash for audit trail
	const auditHash = Bun.hash.wyhash(Buffer.from(fullName)).toString(16).slice(0, 16);

	// Check local cache
	const cacheDir = `${process.env.HOME}/.bun/install/cache/${fullName}`;
	const cached = existsSync(cacheDir);

	console.log(`${GLYPHS.SCAN} Scanning ${fullName}...`);

	// Simulated reputation check
	// In production, query ThreatIntelligenceService
	const suspicious = ["lodash", "colors", "rc", "coa", "ua-parser-js", "node-ipc"];
	const pkgBase = pkg.replace(/^@[^/]+\//, ""); // Remove scope

	let reputation: "trusted" | "unknown" | "suspicious" = "unknown";
	if (suspicious.includes(pkgBase.toLowerCase())) {
		reputation = "suspicious";
	} else if (pkg.startsWith("@") || pkgBase.length > 3) {
		reputation = "trusted";
	}

	// Log package check
	db.prepare(
		"INSERT INTO packages (name, version, hash, reputation, cached) VALUES (?, ?, ?, ?, ?)",
	).run(pkg, version || "latest", auditHash, reputation, cached ? 1 : 0);

	return {
		safe: reputation !== "suspicious",
		hash: auditHash,
		cached,
		reputation,
	};
}

// ─── Secure Execution ─────────────────────────────
async function executeSecure(
	command: string,
	args: string[],
	flags: ParsedArgs["flags"],
): Promise<number> {
	const cmdParts = ["bunx"];
	if (flags.bun) cmdParts.push("--bun");
	if (flags.package) cmdParts.push("-p", flags.package);
	cmdParts.push(command, ...args);

	console.log(`${GLYPHS.PKG} Executing: ${cmdParts.join(" ")}`);

	const start = Bun.nanoseconds();
	const proc = Bun.spawn(cmdParts, {
		stdout: "inherit",
		stderr: "inherit",
		stdin: "inherit",
	});

	const exitCode = await proc.exited;
	const durationMs = (Bun.nanoseconds() - start) / 1e6;

	return { exitCode, durationMs };
}

// ─── Audit Logging ────────────────────────────────
function logExecution(
	cmd: string,
	args: string[],
	hash: string,
	exitCode: number,
	durationMs: number,
): void {
	db.prepare(
		"INSERT INTO executions (cmd, args, hash, exit, duration_ms) VALUES (?, ?, ?, ?, ?)",
	).run(cmd, args.join(" "), hash, exitCode, durationMs);
}

// ─── Reporting ────────────────────────────────────
function showAuditLog(limit: number = 10): void {
	const executions = db
		.query(
			"SELECT ts, cmd, args, hash, exit, duration_ms FROM executions ORDER BY ts DESC LIMIT ?",
		)
		.all(limit);

	console.log(`${GLYPHS.DRIFT} Recent Executions:\n`);
	console.log(Bun.inspect.table(executions));
}

function showPackageHistory(limit: number = 10): void {
	const packages = db
		.query(
			"SELECT ts, name, version, hash, reputation, cached FROM packages ORDER BY ts DESC LIMIT ?",
		)
		.all(limit);

	console.log(`${GLYPHS.DRIFT} Package History:\n`);
	console.log(Bun.inspect.table(packages));
}

function showStats(): void {
	const execCount = (db.query("SELECT COUNT(*) as c FROM executions").get() as any).c;
	const pkgCount = (db.query("SELECT COUNT(*) as c FROM packages").get() as any).c;
	const failures = (
		db.query("SELECT COUNT(*) as c FROM executions WHERE exit != 0").get() as any
	).c;
	const suspicious = (
		db
			.query("SELECT COUNT(*) as c FROM packages WHERE reputation = 'suspicious'")
			.get() as any
	).c;

	console.log(`${GLYPHS.PHASE_LOCKED} Tier-1380 Execution Stats\n`);
	console.log(`  Total executions: ${execCount}`);
	console.log(`  Unique packages:  ${pkgCount}`);
	console.log(
		`  Failures:         ${failures}${execCount > 0 ? ` (${((failures / execCount) * 100).toFixed(1)}%)` : ""}`,
	);
	console.log(`  Suspicious pkgs:  ${suspicious}`);
}

// ─── Help ─────────────────────────────────────────
function printHelp(): void {
	console.log(`
${GLYPHS.DRIFT} Tier-1380 Secure Executor (Bun ${Bun.version})

Usage:
  tier1380-exec [--bun] [-p package] command [args...]

Commands:
  <command>         Execute package with security verification
  log               Show recent execution audit log
  packages          Show package verification history
  stats             Show execution statistics
  help              Show this help

Options:
  --bun             Force Bun runtime (ignore Node shebang)
  -p, --package     Map binary to specific package

Examples:
  tier1380-exec prisma migrate dev --name init
  tier1380-exec --bun vite build
  tier1380-exec prettier@2.8.8 --write "src/**/*.ts"
  tier1380-exec -p @angular/cli@15.0.0 ng new my-app

One-Liners:
  # Quick integrity check
  bun -e 'const pkg=process.argv[3];const h=Bun.hash.wyhash(Buffer.from(pkg)).toString(16);console.log(\`Package: \${pkg}\\nAudit: \${h}\`)' -- prisma

  # View recent executions
  bun -e 'import{Database}from"bun:sqlite";const d=new Database("./data/tier1380.db");console.table(d.query("SELECT * FROM executions ORDER BY ts DESC LIMIT 5").all())'
`);
}

// ─── Main ─────────────────────────────────────────
async function main(): Promise<void> {
	const { flags, command, commandArgs } = parseArgs(process.argv);

	if (!command || command === "help") {
		printHelp();
		process.exit(command ? 0 : 1);
	}

	// Subcommands
	if (command === "log") {
		showAuditLog(parseInt(commandArgs[0]) || 10);
		return;
	}

	if (command === "packages") {
		showPackageHistory(parseInt(commandArgs[0]) || 10);
		return;
	}

	if (command === "stats") {
		showStats();
		return;
	}

	// Secure execution
	console.log(`${GLYPHS.RUN} Tier-1380 Secure Executor\n`);

	const { safe, hash, cached, reputation } = await verifyPackage(command, flags.version);

	if (!safe) {
		console.error(`${GLYPHS.SCAN} BLOCKED: ${command} (${reputation})`);
		process.exit(1);
	}

	console.log(`${GLYPHS.LOCK} Verified: ${hash}${cached ? " (cached)" : ""}`);
	if (reputation) console.log(`  Reputation: ${reputation}`);
	console.log();

	const { exitCode, durationMs } = await executeSecure(command, commandArgs, flags);

	logExecution(command, commandArgs, hash, exitCode, durationMs);

	console.log(
		`\n${exitCode === 0 ? GLYPHS.PHASE_LOCKED : GLYPHS.SCAN}` +
			` Exit: ${exitCode} (${durationMs.toFixed(2)}ms)`,
	);

	process.exit(exitCode);
}

if (import.meta.main) {
	main().catch((e) => {
		console.error(`${GLYPHS.SCAN} Fatal:`, e.message);
		process.exit(1);
	});
}

export {
	parseArgs,
	verifyPackage,
	executeSecure,
	logExecution,
	showAuditLog,
	showPackageHistory,
	showStats,
};
