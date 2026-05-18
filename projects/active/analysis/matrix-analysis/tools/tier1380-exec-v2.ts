#!/usr/bin/env bun
// tier1380-exec-v2 – Enhanced zero-trust bunx wrapper with SBOM, reputation check & audit
// Usage: bun run tier1380-exec-v2.ts [--bun] [-p pkg[@ver]] [--sbom] [--dry] [--tenant NAME] command [args...]

import { Database } from "bun:sqlite";

// ─── Globals & Config ───────────────────────────────────────────────────────
const DB_PATH = "./data/tier1380-exec-v2.db";
const GLYPH = {
	run: "▶",
	lock: "🔒",
	scan: "⊟",
	pkg: "📦",
	sbom: "📜",
	warn: "⚠️",
	ok: "✅",
	fail: "❌",
	info: "ℹ️",
};

// ─── Database Setup ───────────────────────────────────────────────────────
const AUDIT_DB = new Database(DB_PATH, { create: true });

// Enhanced audit table with tenant support
AUDIT_DB.exec(`
  CREATE TABLE IF NOT EXISTS executions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT NOT NULL,
    command TEXT NOT NULL,
    args TEXT,
    pkg TEXT,
    version TEXT,
    hash TEXT,
    sbom_hash TEXT,
    threat_score REAL,
    exit INTEGER,
    duration_ms INTEGER,
    tenant TEXT DEFAULT 'default',
    user TEXT DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
    uuid TEXT DEFAULT (hex(randomblob(16)))
  );

  CREATE INDEX IF NOT EXISTS idx_executions_ts ON executions(ts);
  CREATE INDEX IF NOT EXISTS idx_executions_pkg ON executions(pkg);
  CREATE INDEX IF NOT EXISTS idx_executions_tenant ON executions(tenant);
`);

// ─── Argument Parser (Bun-compatible) ───────────────────────────────────────
// @ts-expect-error - Implicit any types for runtime compatibility
function parseArgs(argv) {
	const rawArgs = argv.slice(2);
	/** @type {any} */
	const result = { args: [] };

	let i = 0;
	while (i < rawArgs.length) {
		const arg = rawArgs[i];
		if (arg === "--bun") {
			result.bun = true;
		} else if (arg === "--sbom") {
			result.sbom = true;
		} else if (arg === "--dry") {
			result.dry = true;
		} else if (arg === "--tenant") {
			result.tenant = rawArgs[++i];
		} else if (arg === "-p" || arg === "--package") {
			const pkgSpec = rawArgs[++i];
			if (pkgSpec.includes("@")) {
				const [pkg, ver] = pkgSpec.split("@");
				result.package = pkg;
				result.version = ver;
			} else {
				result.package = pkgSpec;
			}
		} else if (!result.command) {
			result.command = arg;
			result.args = rawArgs.slice(i + 1);
			break;
		}
		i++;
	}

	// Extract @version if present in command
	if (result.command?.includes("@")) {
		const [pkg, ver] = result.command.split("@");
		result.package = result.package ?? pkg;
		result.version = ver;
		result.command = pkg;
	}

	return result;
}

// ─── Enhanced Threat Intelligence Check ─────────────────────────────────────
// @ts-expect-error - Implicit any types for runtime compatibility
async function checkThreatIntelligence(pkg) {
	console.info(`${GLYPH.scan} Scanning ${pkg} for threats...`);

	// Simulated threat intelligence with multiple checks
	const checks = {
		malicious_patterns: pkg.includes("malicious") || pkg.includes("test-malware"),
		low_download_count: pkg.includes("rare") || pkg.includes("unpopular"),
		known_vulnerabilities: pkg.includes("vulnerable") || pkg.includes("outdated"),
		repository_health: pkg.includes("abandoned") || pkg.includes("unmaintained"),
	};

	const failedChecks = Object.entries(checks).filter(([_, failed]) => failed).length;
	const score = Math.max(0, 1.0 - failedChecks * 0.25);

	const reasons = [];
	if (checks.malicious_patterns) reasons.push("Malicious patterns detected");
	if (checks.low_download_count) reasons.push("Low download count");
	if (checks.known_vulnerabilities) reasons.push("Known vulnerabilities");
	if (checks.repository_health) reasons.push("Poor repository health");

	return {
		safe: score > 0.5,
		score: Math.round(score * 100) / 100,
		reasons: reasons.length > 0 ? reasons : undefined,
		checks,
	};
}

// ─── Enhanced SBOM Generation (CycloneDX v1.5) ───────────────────────────────
// @ts-expect-error - Implicit any types for runtime compatibility
async function generateSBOM(pkg, version) {
	const sbom = {
		$schema: "http://cyclonedx.org/schema/bom-1.5.schema.json",
		bomFormat: "CycloneDX",
		specVersion: "1.5",
		serialNumber: `urn:uuid:${crypto.randomUUID()}`,
		version: 1,
		metadata: {
			timestamp: new Date().toISOString(),
			tools: [
				{
					vendor: "Tier-1380",
					name: "tier1380-exec-v2",
					version: "2.0.0",
				},
			],
			component: {
				type: "application",
				name: pkg,
				version: version || "latest",
			},
		},
		components: [
			{
				type: "library",
				name: pkg,
				version: version || "latest",
				purl: `pkg:npm/${pkg}${version ? `@${version}` : ""}`,
				licenses: [{ license: { name: "Unknown" } }],
				supplier: { name: "npm" },
				author: { name: "Unknown" },
			},
		],
		dependencies: [
			{
				ref: `pkg:npm/${pkg}${version ? `@${version}` : ""}`,
				dependsOn: [],
			},
		],
	};

	const json = JSON.stringify(sbom, null, 2);
	const encoder = new TextEncoder();
	const data = encoder.encode(json);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

	return { json, hash };
}

// ─── Audit Analytics ───────────────────────────────────────────────────────
function showAuditAnalytics(tenant = "default") {
	console.info(`\n${GLYPH.info} Audit Analytics for tenant: ${tenant}`);

	/** @type {any} */
	const total = AUDIT_DB.query(
		"SELECT COUNT(*) as count FROM executions WHERE tenant = ?",
	).get(tenant);
	/** @type {any} */
	const successful = AUDIT_DB.query(
		"SELECT COUNT(*) as count FROM executions WHERE tenant = ? AND exit = 0",
	).get(tenant);
	/** @type {any} */
	const failed = AUDIT_DB.query(
		"SELECT COUNT(*) as count FROM executions WHERE tenant = ? AND exit != 0",
	).get(tenant);
	/** @type {any} */
	const avgThreatScore = AUDIT_DB.query(
		"SELECT AVG(threat_score) as score FROM executions WHERE tenant = ? AND threat_score IS NOT NULL",
	).get(tenant);

	const totalCount = total?.count || 0;
	const successCount = successful?.count || 0;
	const failCount = failed?.count || 0;
	const avgScore = avgThreatScore?.score;

	console.info(`   Total executions: ${totalCount}`);
	console.info(
		`   Success rate: ${totalCount ? ((successCount / totalCount) * 100).toFixed(1) : "0"}%`,
	);
	console.info(`   Failures: ${failCount}`);
	console.info(
		`   Avg threat score: ${avgScore ? (avgScore * 100).toFixed(1) + "%" : "N/A"}`,
	);

	// Recent executions
	/** @type {any[]} */
	const recent = AUDIT_DB.query(
		"SELECT command, pkg, exit, threat_score, ts FROM executions WHERE tenant = ? ORDER BY ts DESC LIMIT 5",
	).all(tenant);
	if (recent.length > 0) {
		console.info(`\n   Recent executions:`);
		recent.forEach((exec) => {
			const status = exec.exit === 0 ? GLYPH.ok : GLYPH.fail;
			const threat = exec.threat_score
				? ` (${(exec.threat_score * 100).toFixed(0)}%)`
				: "";
			console.info(
				`   ${status} ${exec.pkg || exec.command}${threat} - ${new Date(exec.ts).toLocaleTimeString()}`,
			);
		});
	}
}

// ─── Secure Execution & Audit ───────────────────────────────────────────────
async function main() {
	const args = parseArgs(process.argv);

	if (!args.command) {
		console.info(`${GLYPH.info} Tier-1380 Secure Executor v2.0.0`);
		console.info(
			`\nUsage: tier1380-exec-v2.ts [--bun] [-p pkg[@ver]] [--sbom] [--dry] [--tenant NAME] command [args...]`,
		);
		console.info(`\nExamples:`);
		console.info(`  bun tools/tier1380-exec-v2.ts prisma migrate dev`);
		console.info(
			`  bun tools/tier1380-exec-v2.ts --bun -p prettier@2.8.8 prettier --write src`,
		);
		console.info(`  bun tools/tier1380-exec-v2.ts --sbom --tenant production vite build`);
		console.info(`  bun tools/tier1380-exec-v2.ts --dry npm install`);
		console.info(`\nAnalytics:`);
		console.info(`  bun tools/tier1380-exec-v2.ts --analytics`);
		console.info(`  bun tools/tier1380-exec-v2.ts --analytics --tenant production`);

		// Show analytics if requested
		if (args.command === "--analytics") {
			showAuditAnalytics(args.tenant || "default");
		}

		process.exit(1);
	}

	// Analytics mode
	if (args.command === "--analytics") {
		showAuditAnalytics(args.tenant || "default");
		process.exit(0);
	}

	console.info(`${GLYPH.run} Tier-1380 Secure Executor v2.0.0`);
	console.info(`${GLYPH.lock} Tenant: ${args.tenant || "default"}\n`);

	const startTime = Date.now();

	// Threat intelligence check
	const threatCheck = await checkThreatIntelligence(args.package || args.command);
	console.info(
		`${GLYPH.scan} Threat scan: ${threatCheck.safe ? GLYPH.ok : GLYPH.fail} ${threatCheck.score * 100}%`,
	);

	if (threatCheck.reasons) {
		threatCheck.reasons.forEach((reason) => {
			console.info(`   ${GLYPH.warn} ${reason}`);
		});
	}

	if (!threatCheck.safe) {
		console.error(
			`${GLYPH.fail} Blocked: ${args.package || args.command} (threat score: ${threatCheck.score * 100}%)`,
		);
		process.exit(1);
	}

	// SBOM generation if requested
	let sbomHash;
	if (args.sbom && args.package) {
		console.info(`${GLYPH.sbom} Generating SBOM...`);
		const { json, hash } = await generateSBOM(args.package, args.version);
		sbomHash = hash;
		const filename = `sbom-${args.package}-${args.version || "latest"}-${Date.now()}.cdx.json`;
		await Bun.write(filename, json);
		console.info(`${GLYPH.ok} SBOM generated: ${filename}`);
		console.info(`${GLYPH.lock} SBOM SHA-256: ${hash.slice(0, 16)}…`);
	}

	// Dry run mode
	if (args.dry) {
		console.info(`${GLYPH.info} Dry run complete. No execution performed.`);
		process.exit(0);
	}

	// Build command
	const cmdParts = ["bunx"];
	if (args.bun) cmdParts.push("--bun");
	if (args.package)
		cmdParts.push("-p", `${args.package}${args.version ? "@" + args.version : ""}`);
	cmdParts.push(args.command, ...args.args);

	const cmdLine = cmdParts.join(" ");
	const encoder = new TextEncoder();
	const cmdData = encoder.encode(cmdLine);
	const cmdHashBuffer = await crypto.subtle.digest("SHA-256", cmdData);
	const cmdHashArray = Array.from(new Uint8Array(cmdHashBuffer));
	const cmdHash = cmdHashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

	// Col-89 safe command display
	const safeCmd = Bun.escapeHTML(
		Bun.stringWidth(cmdLine) > 86
			? cmdLine.slice(0, 83).replace(/\S+$/, "").trim() + "…"
			: cmdLine,
	);

	console.info(`${GLYPH.pkg} Executing: ${safeCmd}`);
	console.info(`${GLYPH.lock} Command hash: ${cmdHash.slice(0, 16)}…`);

	// Execute command
	const proc = Bun.spawn(cmdParts, {
		stdout: "inherit",
		stderr: "inherit",
		stdin: "inherit",
	});

	await proc.exited;
	const duration = Date.now() - startTime;

	// Audit logging
	AUDIT_DB.run(
		`INSERT INTO executions (ts, command, args, pkg, version, hash, sbom_hash, threat_score, exit, duration_ms, tenant)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		[
			new Date().toISOString(),
			args.command,
			JSON.stringify(args.args),
			args.package || null,
			args.version || null,
			cmdHash,
			sbomHash || null,
			threatCheck.score,
			proc.exitCode,
			duration,
			args.tenant || "default",
		],
	);

	console.info(`\n${GLYPH.info} Execution completed in ${duration}ms`);

	if (proc.exitCode !== 0) {
		console.error(`${GLYPH.fail} Command failed with exit code: ${proc.exitCode}`);
	} else {
		console.info(`${GLYPH.ok} Command completed successfully`);
	}

	process.exit(proc.exitCode || 0);
}

main().catch((e) => {
	console.error(`${GLYPH.fail} Fatal error:`, e.message);
	process.exit(1);
});
