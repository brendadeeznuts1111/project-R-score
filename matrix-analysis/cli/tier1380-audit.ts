#!/usr/bin/env bun
// ╔═════════════════════════════════════════════════════════╗
// ║ tier1380-audit.ts — Col-89 OMEGA Compliance Engine     ║
// ║ PATH: /Users/nolarose/cli/tier1380-audit.ts            ║
// ║ TYPE: CLI  CTX: Audit  COMPONENTS: SQLite+CSS+Col89    ║
// ╚═════════════════════════════════════════════════════════╝

/**
 * Tier-1380 Audit CLI — subcommand-based compliance engine.
 *
 * Commands:
 *   check <file|dir> Col-89 violation scan (--glob="...")
 *   css <file>      LightningCSS minification + sourcemap
 *   rss [url]       Feed audit (default: bun.sh/blog/rss.xml)
 *   scan [exts] [dir] Scan for bad file extensions
 *   globals         Audit available Bun.* APIs
 *   health          System health snapshot
 *   db [limit]      Show last N violations (default: 10)
 *   export [limit]  Dump violations as JSON (--jsonl)
 *   dashboard       Launch http://127.0.0.1:1380 monitor
 *   clean           Clear all audit data
 *   help            Show usage
 *
 * Usage:
 *   bun run cli/tier1380-audit.ts check README.md
 *   bun run cli/tier1380-audit.ts css css/sample.css
 *   bun run cli/tier1380-audit.ts dashboard
 *   bun run tier1380:audit -- check src/index.ts
 */

import { Database } from "bun:sqlite";
import { existsSync, mkdirSync, statSync } from "fs";

// ═════════════════════════════════════════════════════════
// Constants & Startup
// ═════════════════════════════════════════════════════════

const COL_LIMIT = 89;
const PORT = 1380;
const DB_DIR = "./data";
const DB_PATH = `${DB_DIR}/tier1380-audit.db`;

const GLYPHS = {
	STRUCTURAL_DRIFT: "▵⟂⥂",
	DEPENDENCY_COHERENCE: "⥂⟂(▵⟜⟳)",
	PHASE_LOCKED: "⟳⟲⟜(▵⊗⥂)",
	AUDIT: "⊟",
} as const;

const MIN_BUN = ">=1.3.7";
if (!Bun.semver.satisfies(Bun.version, MIN_BUN)) {
	console.error(`[TIER-1380] Bun ${Bun.version} < ${MIN_BUN} — upgrade`);
	process.exit(1);
}

// ═════════════════════════════════════════════════════════
// Database Layer
// ═════════════════════════════════════════════════════════

function initDB(): Database {
	if (!existsSync(DB_DIR)) {
		mkdirSync(DB_DIR, { recursive: true });
	}
	const db = new Database(DB_PATH);
	db.exec("PRAGMA journal_mode = WAL;");
	db.exec("PRAGMA synchronous = NORMAL;");

	db.exec(`
    CREATE TABLE IF NOT EXISTS violations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER DEFAULT (unixepoch()),
      file TEXT NOT NULL,
      line INTEGER NOT NULL,
      width INTEGER NOT NULL,
      preview TEXT NOT NULL
    )
  `);
	db.exec("CREATE INDEX IF NOT EXISTS idx_viol_ts ON violations(ts)");

	db.exec(`
    CREATE TABLE IF NOT EXISTS audits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER DEFAULT (unixepoch()),
      command TEXT NOT NULL,
      duration_ms REAL NOT NULL,
      result TEXT NOT NULL
    )
  `);

	return db;
}

const db = initDB();

function recordAudit(command: string, durationMs: number, result: string): void {
	db.prepare(
		"INSERT INTO audits (command, duration_ms, result) " + "VALUES (?, ?, ?)",
	).run(command, durationMs, result);
}

// ═════════════════════════════════════════════════════════
// Commands: Scanners & Auditors
// ═════════════════════════════════════════════════════════

// ── check: Col-89 Scanner ───────────────────────────────

async function checkCol89(filePath: string): Promise<number> {
	const start = Bun.nanoseconds();

	if (!(await Bun.file(filePath).exists())) {
		console.error(`${GLYPHS.AUDIT} File not found: ${filePath}`);
		return 1;
	}

	const content = await Bun.file(filePath).text();
	const lines = content.split("\n");
	let violations = 0;

	const stmt = db.prepare(
		"INSERT INTO violations (file, line, width, preview) " + "VALUES (?, ?, ?, ?)",
	);

	for (let i = 0; i < lines.length; i++) {
		const width = Bun.stringWidth(lines[i], {
			countAnsiEscapeCodes: false,
		});
		if (width > COL_LIMIT) {
			violations++;
			const raw = Bun.stripANSI(lines[i]);
			const preview = Bun.escapeHTML(raw.slice(0, 86)) + "...";
			stmt.run(filePath, i + 1, width, preview);
			console.log(
				`  \x1b[31m${GLYPHS.AUDIT} Line ${i + 1}\x1b[0m:` +
					` ${width} cols -> ${raw.slice(0, 60)}...`,
			);
		}
	}

	const durationMs = (Bun.nanoseconds() - start) / 1e6;
	recordAudit(`check ${filePath}`, durationMs, `${violations} violations`);

	console.log(
		`\n${GLYPHS.STRUCTURAL_DRIFT}` +
			` Scanned ${lines.length} lines` +
			` in ${durationMs.toFixed(2)}ms` +
			` | ${violations} violation` +
			`${violations === 1 ? "" : "s"}`,
	);
	return violations;
}

// ── css: LightningCSS Optimizer ─────────────────────────

async function optimizeCSS(inputPath: string): Promise<void> {
	const start = Bun.nanoseconds();

	if (!(await Bun.file(inputPath).exists())) {
		console.error(`${GLYPHS.AUDIT} File not found: ${inputPath}`);
		return;
	}

	let transform: typeof import("lightningcss").transform;
	try {
		({ transform } = await import("lightningcss"));
	} catch {
		console.error(
			`${GLYPHS.AUDIT} lightningcss not installed.` + " Run: bun add lightningcss",
		);
		return;
	}

	const code = await Bun.file(inputPath).text();

	const result = transform({
		filename: inputPath,
		code: Buffer.from(code),
		minify: true,
		sourceMap: true,
	});

	const outPath = inputPath.replace(/\.css$/, ".min.css");
	await Bun.write(outPath, result.code);
	if (result.map) {
		await Bun.write(outPath + ".map", result.map);
	}

	if (result.warnings.length > 0) {
		console.log("Warnings:", result.warnings);
	}

	const saved = ((1 - result.code.length / code.length) * 100).toFixed(1);
	const durationMs = (Bun.nanoseconds() - start) / 1e6;

	recordAudit(
		`css ${inputPath}`,
		durationMs,
		`${code.length}B -> ${result.code.length}B (-${saved}%)`,
	);

	console.log(
		`${GLYPHS.PHASE_LOCKED} Minified:` +
			` ${code.length}B -> ${result.code.length}B` +
			` (-${saved}%) in ${durationMs.toFixed(2)}ms`,
	);
	console.log(`Output: ${outPath}`);
	if (result.map) console.log(`Map:    ${outPath}.map`);
}

// ── rss: Feed Monitor ───────────────────────────────────

interface RSSItem {
	title: string;
	pubDate: string;
	link: string;
}

function parseRSSItems(xml: string): RSSItem[] {
	const items: RSSItem[] = [];
	const itemRegex = /<item>([\s\S]*?)<\/item>/g;
	let match: RegExpExecArray | null;

	while ((match = itemRegex.exec(xml)) !== null) {
		const block = match[1];
		const title =
			block.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/)?.[1] ?? "N/A";
		const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? "N/A";
		const link = block.match(/<link>(.*?)<\/link>/)?.[1] ?? "N/A";
		items.push({ title, pubDate, link });
	}

	return items;
}

async function checkRSS(feedUrl = "https://bun.sh/blog/rss.xml"): Promise<void> {
	const start = Bun.nanoseconds();

	const res = await fetch(feedUrl).catch(() => null);
	if (!res || !res.ok) {
		console.error(`${GLYPHS.AUDIT} Failed to fetch: ${feedUrl}`);
		return;
	}

	const text = await res.text();
	const items = parseRSSItems(text);
	const durationMs = (Bun.nanoseconds() - start) / 1e6;

	recordAudit(`rss ${feedUrl}`, durationMs, `${items.length} items, ${text.length}B`);

	console.log(
		`${GLYPHS.DEPENDENCY_COHERENCE}` + ` RSS Audit (${durationMs.toFixed(0)}ms):`,
	);
	console.log(`  Feed:  ${feedUrl}`);
	console.log(`  Size:  ${text.length.toLocaleString()} bytes`);
	console.log(`  Items: ${items.length}`);

	if (items.length > 0) {
		console.log("\nLatest:");
		const display = items.slice(0, 5).map((item) => ({
			title: item.title.length > 55 ? item.title.slice(0, 52) + "..." : item.title,
			pubDate: item.pubDate,
		}));
		console.log(Bun.inspect.table(display));
	}
}

// ── scan: File Extension Security Scanner ───────────────

async function scanExtensions(extensions: Set<string>, dir: string): Promise<number> {
	const start = Bun.nanoseconds();
	let scanned = 0;
	let found = 0;

	console.log(`${GLYPHS.AUDIT} Scanning ${dir} for bad extensions:`);
	console.log(`  ${[...extensions].join(", ")}\n`);

	for await (const f of new Bun.Glob("**/*").scan(dir)) {
		scanned++;
		const dot = f.lastIndexOf(".");
		if (dot === -1) continue;
		const ext = f.slice(dot);
		if (extensions.has(ext)) {
			found++;
			console.log(`  \x1b[33m${GLYPHS.AUDIT}\x1b[0m ${f}`);
			db.prepare(
				"INSERT INTO violations" +
					" (file, line, width, preview)" +
					" VALUES (?, ?, ?, ?)",
			).run(`${dir}/${f}`, 0, 0, `Bad extension: ${ext}`);
		}
	}

	const durationMs = (Bun.nanoseconds() - start) / 1e6;
	recordAudit(`scan ${dir}`, durationMs, `${found} bad files`);

	console.log(
		`\n${GLYPHS.PHASE_LOCKED}` +
			` Scanned ${scanned} files` +
			` in ${durationMs.toFixed(2)}ms`,
	);
	console.log(`  Found: ${found} suspicious files`);
	if (found > 0) {
		console.log("  Run 'tier1380:audit db' to view details");
	}

	return found;
}

// ── globals: Bun API Audit ──────────────────────────────

function auditGlobals(): void {
	const keys = Object.keys(Bun).sort();
	const grouped: Record<string, string[]> = {
		crypto: [],
		io: [],
		data: [],
		network: [],
		utils: [],
		other: [],
	};

	for (const key of keys) {
		const t = typeof (Bun as any)[key];
		const entry = `${key} (${t})`;

		if (/hash|sha|md[45]|crc|password|csrf|crypto/i.test(key)) {
			grouped.crypto.push(entry);
		} else if (/file|write|read|stream|mmap|stdin|stdout|stderr/i.test(key)) {
			grouped.io.push(entry);
		} else if (/sql|sqlite|s3|redis|json|toml|yaml/i.test(key)) {
			grouped.data.push(entry);
		} else if (/serve|fetch|connect|listen|dns|spawn|udp/i.test(key)) {
			grouped.network.push(entry);
		} else if (
			/inspect|color|string|strip|wrap|escape|sleep|deep|semver|which|peek/i.test(key)
		) {
			grouped.utils.push(entry);
		} else {
			grouped.other.push(entry);
		}
	}

	console.log(`Bun ${Bun.version} — ${keys.length} APIs\n`);

	for (const [category, entries] of Object.entries(grouped)) {
		if (entries.length === 0) continue;
		console.log(`  ${category} (${entries.length}):`);
		for (const e of entries) {
			console.log(`    ${e}`);
		}
		console.log("");
	}
}

// ── health: System Health Snapshot ──────────────────────

function healthCheck(): void {
	const mem = process.memoryUsage();

	const health = [
		{
			metric: "Bun version",
			value: Bun.version,
			status: Bun.semver.satisfies(Bun.version, MIN_BUN) ? "ok" : "upgrade",
		},
		{
			metric: "CPU cores",
			value: String(navigator.hardwareConcurrency),
			status: "ok",
		},
		{
			metric: "RSS memory",
			value: `${(mem.rss / 1024 / 1024).toFixed(1)} MB`,
			status: mem.rss < 256 * 1024 * 1024 ? "ok" : "high",
		},
		{
			metric: "Heap used",
			value: `${(mem.heapUsed / 1024).toFixed(0)} KB`,
			status: "ok",
		},
		{
			metric: "Uptime",
			value: `${(Bun.nanoseconds() / 1e6).toFixed(1)} ms`,
			status: "ok",
		},
		{
			metric: "Audit DB",
			value: existsSync(DB_PATH) ? "exists" : "new",
			status: "ok",
		},
	];

	console.log(Bun.inspect.table(health, ["metric", "value", "status"]));

	const vCount = (db.query("SELECT COUNT(*) as c FROM violations").get() as any).c;
	const aCount = (db.query("SELECT COUNT(*) as c FROM audits").get() as any).c;

	console.log(`  Violations recorded: ${vCount}`);
	console.log(`  Audits recorded:     ${aCount}`);

	const topFiles = db
		.prepare(
			"SELECT file, COUNT(*) as cnt, MAX(width) as maxW " +
				"FROM violations GROUP BY file " +
				"ORDER BY cnt DESC LIMIT 5",
		)
		.all() as any[];

	if (topFiles.length > 0) {
		console.log(`\n${GLYPHS.AUDIT} Top files by violations:`);
		const topDisplay = topFiles.map((r: any) => ({
			file: r.file.length > 40 ? "..." + r.file.slice(-37) : r.file,
			violations: r.cnt,
			maxWidth: r.maxW,
		}));
		console.log(Bun.inspect.table(topDisplay, ["file", "violations", "maxWidth"]));
	}
}

// ═════════════════════════════════════════════════════════
// DB Queries
// ═════════════════════════════════════════════════════════

function showViolations(limit = 10): void {
	const rows = db
		.prepare(
			"SELECT file, line, width, preview, " +
				"datetime(ts, 'unixepoch', 'localtime') as time " +
				"FROM violations ORDER BY ts DESC LIMIT ?",
		)
		.all(limit) as any[];

	if (rows.length === 0) {
		console.log("No violations recorded.");
		return;
	}

	const display = rows.map((r: any) => ({
		time: r.time,
		file: r.file.length > 30 ? "..." + r.file.slice(-27) : r.file,
		line: r.line,
		width: r.width,
	}));

	console.log(
		`${GLYPHS.STRUCTURAL_DRIFT} Last ${rows.length}` +
			` violation${rows.length === 1 ? "" : "s"}:`,
	);
	console.log(Bun.inspect.table(display));

	const audits = db
		.prepare(
			"SELECT command, duration_ms, result, " +
				"datetime(ts, 'unixepoch', 'localtime') as time " +
				"FROM audits ORDER BY ts DESC LIMIT ?",
		)
		.all(limit) as any[];

	if (audits.length > 0) {
		console.log(`\n${GLYPHS.PHASE_LOCKED}` + ` Last ${audits.length} audits:`);
		const auditDisplay = audits.map((r: any) => ({
			time: r.time,
			command: r.command,
			ms: Number(r.duration_ms).toFixed(1),
			result: r.result,
		}));
		console.log(Bun.inspect.table(auditDisplay));
	}
}

function exportViolations(limit = 100, format: "json" | "jsonl" = "json"): void {
	const rows = db
		.prepare(
			"SELECT file, line, width, preview, ts, " +
				"datetime(ts, 'unixepoch', 'localtime') as time " +
				"FROM violations ORDER BY ts DESC LIMIT ?",
		)
		.all(limit) as any[];

	if (format === "jsonl") {
		for (const row of rows) {
			console.log(JSON.stringify(row));
		}
	} else {
		console.log(JSON.stringify(rows, null, 2));
	}
}

// ═════════════════════════════════════════════════════════
// Dashboard
// ═════════════════════════════════════════════════════════

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tier-1380 Audit Dashboard</title>
<style>
:root{color-scheme:light dark;--bg:light-dark(#fafafa,#0a0a0a);
--fg:light-dark(#222,#ddd);--accent:#82589f;--err:#e74c3c;
--ok:#2ecc71;
--border:light-dark(#ddd,#333);--card:light-dark(#fff,#141414)}
*{margin:0;box-sizing:border-box}
body{font-family:ui-monospace,monospace;background:var(--bg);
color:var(--fg);max-width:89ch;margin:0 auto;padding:1rem}
h1{font-size:1.2rem;border-bottom:1px solid var(--border);
padding-bottom:.5rem;margin-bottom:1rem}
.cards{display:grid;grid-template-columns:repeat(auto-fit,
minmax(200px,1fr));gap:1rem;margin-bottom:1.5rem}
.card{background:var(--card);border:1px solid var(--border);
border-radius:6px;padding:1rem}
.card h3{font-size:.75rem;text-transform:uppercase;
letter-spacing:.05em;opacity:.6;margin-bottom:.25rem}
.card .val{font-size:1.8rem;font-weight:700}
.card .val.err{color:var(--err)}
.card .val.ok{color:var(--ok)}
table{width:100%;border-collapse:collapse;font-size:.8rem}
th,td{text-align:left;padding:.4rem .6rem;
border-bottom:1px solid var(--border)}
th{opacity:.6;font-size:.7rem;text-transform:uppercase}
.links{margin-top:1.5rem;font-size:.8rem}
.links a{color:var(--accent);margin-right:1rem}
footer{margin-top:2rem;font-size:.7rem;opacity:.4;
text-align:center}
</style>
</head>
<body>
<h1>Tier-1380 Audit Dashboard</h1>
<div class="cards">
<div class="card"><h3>Col-89 Violations</h3>
<div class="val" id="v">--</div></div>
<div class="card"><h3>Total Audits</h3>
<div class="val" id="a">--</div></div>
<div class="card"><h3>7-Day Violations</h3>
<div class="val" id="trend">--</div></div>
</div>
<h2 style="font-size:.9rem;margin-bottom:.5rem">Recent Audits</h2>
<table><thead><tr><th>Time</th><th>Command</th>
<th>Duration</th><th>Result</th></tr></thead>
<tbody id="t"></tbody></table>
<div class="links">
<a href="/api/stats">/api/stats</a>
<a href="/api/violations">/api/violations</a>
<a href="/api/health">/api/health</a>
</div>
<footer>Tier-1380 | Bun | Col-89 Enforced | 30s refresh</footer>
<script>
async function load(){try{
var s=await fetch("/api/stats").then(function(r){return r.json()});
var ve=document.getElementById("v");
ve.textContent=s.violations;
ve.className="val "+(s.violations>0?"err":"ok");
document.getElementById("a").textContent=s.audits;
var td=s.trend||[];
var tc=td.reduce(function(a,d){return a+d.cnt},0);
var te=document.getElementById("trend");
te.textContent=tc;te.className="val "+(tc>0?"err":"ok");
document.getElementById("t").innerHTML=s.recent.map(function(r){
return "<tr><td>"+r.time+"</td><td>"+r.command+
"</td><td>"+Number(r.duration_ms).toFixed(1)+
"ms</td><td>"+r.result+"</td></tr>"}).join("");
}catch(e){console.error(e)}}
load();setInterval(load,30000);
</script>
</body>
</html>`;

function launchDashboard(): void {
	const server = Bun.serve({
		port: PORT,
		hostname: "127.0.0.1",

		async fetch(req) {
			const url = new URL(req.url);

			if (url.pathname === "/api/stats") {
				const vCount = (db.query("SELECT COUNT(*) as c FROM violations").get() as any).c;
				const aCount = (db.query("SELECT COUNT(*) as c FROM audits").get() as any).c;
				const trend = db
					.prepare(
						"SELECT date(ts, 'unixepoch') as day," +
							" COUNT(*) as cnt" +
							" FROM violations" +
							" WHERE ts >= unixepoch() - 604800" +
							" GROUP BY day ORDER BY day",
					)
					.all();
				const recent = db
					.prepare(
						"SELECT command, duration_ms, result, " +
							"datetime(ts, 'unixepoch', 'localtime')" +
							" as time " +
							"FROM audits ORDER BY ts DESC LIMIT 10",
					)
					.all();
				return Response.json({
					violations: vCount,
					audits: aCount,
					trend,
					recent,
				});
			}

			if (url.pathname === "/api/violations") {
				const limit = Number(url.searchParams.get("limit")) || 20;
				const rows = db
					.prepare(
						"SELECT file, line, width, preview, " +
							"datetime(ts, 'unixepoch', 'localtime')" +
							" as time " +
							"FROM violations ORDER BY ts DESC LIMIT ?",
					)
					.all(limit);
				return Response.json(rows);
			}

			if (url.pathname === "/api/health") {
				const vCount = (db.query("SELECT COUNT(*) as c FROM violations").get() as any).c;
				return Response.json({
					status: vCount === 0 ? "healthy" : "violations_found",
					violations: vCount,
					bun: Bun.version,
				});
			}

			return new Response(DASHBOARD_HTML, {
				headers: {
					"Content-Type": "text/html; charset=utf-8",
				},
			});
		},
	});

	console.log(
		`${GLYPHS.STRUCTURAL_DRIFT} Dashboard:` + ` http://127.0.0.1:${server.port}`,
	);
	console.log("  GET /                 HTML dashboard");
	console.log("  GET /api/stats        Audit summary");
	console.log("  GET /api/violations   Violation list");
	console.log("  GET /api/health       Health check");
}

// ═════════════════════════════════════════════════════════
// CLI Interface
// ═════════════════════════════════════════════════════════

function printHelp(): void {
	console.log(
		`${GLYPHS.STRUCTURAL_DRIFT}` +
			` Tier-1380 Audit CLI (Bun ${Bun.version})

Commands:
  check <file|dir> Col-89 scan (--glob="pattern")
  css <file>      LightningCSS minify + sourcemap
  rss [url]       Feed audit (default: bun.sh/blog)
  scan [exts] [dir] Scan for bad file extensions
  globals         Audit available Bun.* APIs
  health          System health snapshot
  db [limit]      Show last N violations (default: 10)
  export [limit]  Dump violations as JSON (--jsonl)
  dashboard       Launch http://127.0.0.1:${PORT} monitor
  clean           Clear all audit data
  help            Show this help

Examples:
  bun run cli/tier1380-audit.ts check README.md
  bun run cli/tier1380-audit.ts check src/
  bun run cli/tier1380-audit.ts check --glob="**/*.md"
  bun run cli/tier1380-audit.ts css css/sample.css
  bun run cli/tier1380-audit.ts export --jsonl
  bun run cli/tier1380-audit.ts dashboard
  bun run cli/tier1380-audit.ts scan
  bun run cli/tier1380-audit.ts scan ".exe,.bat" ./build`,
	);
}

const COMMANDS: Record<string, (args: string[]) => Promise<void> | void> = {
	async check(args) {
		const globOpt = args.find((a) => a.startsWith("--glob="));
		const globPattern = globOpt?.slice(7) ?? null;
		const file = args.find((a) => !a.startsWith("--"));

		if (!file && !globPattern) {
			console.error("Usage: tier1380-audit check <file|dir>" + ' [--glob="pattern"]');
			process.exit(1);
		}

		let totalViolations = 0;
		let fileCount = 0;

		if (globPattern) {
			const glob = new Bun.Glob(globPattern);
			for await (const f of glob.scan({ cwd: "." })) {
				fileCount++;
				totalViolations += await checkCol89(f);
			}
		} else if (file && existsSync(file) && statSync(file).isDirectory()) {
			const glob = new Bun.Glob("**/*");
			for await (const f of glob.scan({
				cwd: file,
				onlyFiles: true,
			})) {
				fileCount++;
				totalViolations += await checkCol89(`${file}/${f}`);
			}
		} else {
			fileCount = 1;
			totalViolations = await checkCol89(file!);
		}

		if (fileCount > 1) {
			console.log(
				`\n${GLYPHS.STRUCTURAL_DRIFT} Total:` +
					` ${fileCount} files,` +
					` ${totalViolations} violation` +
					`${totalViolations === 1 ? "" : "s"}`,
			);
		}
		process.exit(totalViolations > 0 ? 1 : 0);
	},

	async css(args) {
		const file = args[0];
		if (!file) {
			console.error("Usage: tier1380-audit css <file>");
			process.exit(1);
		}
		await optimizeCSS(file);
	},

	async rss(args) {
		await checkRSS(args[0]);
	},

	async scan(args) {
		const bad = new Set(args[0]?.split(",") || [".exe", ".dll", ".sh", ".bat", ".cmd"]);
		const dir = args[1] || "./dist";
		const found = await scanExtensions(bad, dir);
		process.exit(found > 0 ? 1 : 0);
	},

	globals() {
		auditGlobals();
	},

	health() {
		healthCheck();
	},

	db(args) {
		showViolations(Number(args[0]) || 10);
	},

	export(args) {
		const limit = Number(args.find((a) => !a.startsWith("--")) ?? 100);
		const format = args.includes("--jsonl") ? ("jsonl" as const) : ("json" as const);
		exportViolations(limit, format);
	},

	dashboard() {
		launchDashboard();
	},

	clean() {
		db.exec("DELETE FROM violations");
		db.exec("DELETE FROM audits");
		console.log(`${GLYPHS.PHASE_LOCKED} Database cleaned`);
	},

	help() {
		printHelp();
	},
};

async function main(): Promise<void> {
	const [cmd, ...args] = process.argv.slice(2);
	const handler = cmd ? COMMANDS[cmd] : null;

	if (handler) {
		await handler(args);
	} else {
		printHelp();
	}
}

// ═════════════════════════════════════════════════════════
// Entry Point
// ═════════════════════════════════════════════════════════

if (import.meta.main) {
	main().catch((err) => {
		console.error(err);
		process.exit(1);
	});
}

if (process.argv[2] === "dashboard") {
	process.stdin.resume();
}

export {
	checkCol89,
	optimizeCSS,
	checkRSS,
	parseRSSItems,
	scanExtensions,
	auditGlobals,
	healthCheck,
	showViolations,
	exportViolations,
	initDB,
};
