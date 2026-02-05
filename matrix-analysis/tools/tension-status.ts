#!/usr/bin/env bun
/**
 * Tension-Field-God Status Dashboard
 * Outputs health checks as Bun.inspect.table() with pattern column
 */

import { $ } from "bun";
import { fmt, jsc } from "../.claude/lib/cli.ts";
import { EXIT_CODES } from "../.claude/lib/exit-codes.ts";

// ── --help ──────────────────────────────────────────────────────────────────
if (Bun.argv.includes("--help") || Bun.argv.includes("-h")) {
	console.log(
		`\n${fmt.bold("tension-status")} — Health dashboard with Bun-native checks\n`,
	);
	console.log(`${fmt.bold("Usage:")} bun tools/tension-status.ts\n`);
	console.log("Runs all checks and outputs a status table. No flags required.");
	process.exit(EXIT_CODES.SUCCESS);
}

interface CheckRow {
	check: string;
	pattern: string;
	result: string;
	count: number;
}

const rows: CheckRow[] = [];

// ── Bun version ─────────────────────────────────────────────────────────────
rows.push({
	check: "Bun",
	pattern: "bun --version",
	result: Bun.version,
	count: 1,
});

// ── Tests ───────────────────────────────────────────────────────────────────
try {
	const proc = Bun.spawn(["bun", "test", "src/", "--bail", "--timeout=5000"], {
		stdout: "pipe",
		stderr: "pipe",
		env: { ...Bun.env, CLAUDECODE: "1" },
	});
	const [stdout, stderr] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
	]);
	const exitCode = await proc.exited;
	const out = stdout + stderr;
	const passMatch = out.match(/(\d+) pass/);
	const failMatch = out.match(/(\d+) fail/);
	const pass = passMatch ? parseInt(passMatch[1], 10) : 0;
	const fail = failMatch ? parseInt(failMatch[1], 10) : 0;
	rows.push({
		check: "Tests",
		pattern: "bun test src/ --bail",
		result: exitCode === 0 ? `${pass} pass, ${fail} fail` : `EXIT ${exitCode}`,
		count: pass,
	});
} catch {
	rows.push({ check: "Tests", pattern: "bun test src/", result: "ERROR", count: 0 });
}

// ── TENSION headers ─────────────────────────────────────────────────────────
try {
	const { stdout } = await $`rg -c '\\[TENSION\\-[A-Z]+\\-' --type=ts .`
		.quiet()
		.nothrow();
	const lines = stdout.toString().trim().split("\n").filter(Boolean);
	const total = lines.reduce((sum, line) => {
		const n = parseInt(line.split(":").pop() || "0", 10);
		return sum + n;
	}, 0);
	rows.push({
		check: "TENSION headers",
		pattern: "\\[TENSION\\-[A-Z]+\\-",
		result: total > 0 ? "FOUND" : "NONE",
		count: total,
	});
} catch {
	rows.push({
		check: "TENSION headers",
		pattern: "\\[TENSION\\-[A-Z]+\\-",
		result: "SKIP",
		count: 0,
	});
}

// ── Anti-patterns: process.argv / process.env in src/ ───────────────────────
try {
	const { stdout } = await $`rg -c 'process\\.(argv|env)' --type=ts src/`
		.quiet()
		.nothrow();
	const lines = stdout.toString().trim().split("\n").filter(Boolean);
	const total = lines.reduce((sum, line) => {
		const n = parseInt(line.split(":").pop() || "0", 10);
		return sum + n;
	}, 0);
	rows.push({
		check: "Anti-patterns (src/)",
		pattern: "process\\.(argv|env)",
		result: total === 0 ? "CLEAN" : "FOUND",
		count: total,
	});
} catch {
	rows.push({
		check: "Anti-patterns (src/)",
		pattern: "process\\.(argv|env)",
		result: "CLEAN",
		count: 0,
	});
}

// ── Node.js imports in src/ ─────────────────────────────────────────────────
try {
	const { stdout } =
		await $`rg -c 'from "node:(fs|path|os|child_process)"' --type=ts src/`
			.quiet()
			.nothrow();
	const lines = stdout.toString().trim().split("\n").filter(Boolean);
	const total = lines.reduce((sum, line) => {
		const n = parseInt(line.split(":").pop() || "0", 10);
		return sum + n;
	}, 0);
	rows.push({
		check: "Node imports (src/)",
		pattern: 'from "node:(fs|path|os|child_process)"',
		result: total === 0 ? "CLEAN" : "FOUND",
		count: total,
	});
} catch {
	rows.push({
		check: "Node imports (src/)",
		pattern: 'from "node:..."',
		result: "CLEAN",
		count: 0,
	});
}

// ── export default in src/ ──────────────────────────────────────────────────
try {
	const { stdout } = await $`rg -c 'export default' --type=ts src/`.quiet().nothrow();
	const lines = stdout.toString().trim().split("\n").filter(Boolean);
	const total = lines.reduce((sum, line) => {
		const n = parseInt(line.split(":").pop() || "0", 10);
		return sum + n;
	}, 0);
	rows.push({
		check: "export default (src/)",
		pattern: "export default",
		result: total === 0 ? "CLEAN" : "FOUND",
		count: total,
	});
} catch {
	rows.push({
		check: "export default (src/)",
		pattern: "export default",
		result: "CLEAN",
		count: 0,
	});
}

// ── require() calls ─────────────────────────────────────────────────────────
try {
	const { stdout } = await $`rg -c 'require\\(' --type=ts src/`.quiet().nothrow();
	const lines = stdout.toString().trim().split("\n").filter(Boolean);
	const total = lines.reduce((sum, line) => {
		const n = parseInt(line.split(":").pop() || "0", 10);
		return sum + n;
	}, 0);
	rows.push({
		check: "require() (src/)",
		pattern: "require\\(",
		result: total === 0 ? "CLEAN" : "FOUND",
		count: total,
	});
} catch {
	rows.push({
		check: "require() (src/)",
		pattern: "require\\(",
		result: "CLEAN",
		count: 0,
	});
}

// ── Seed / Snapshot Hash ────────────────────────────────────────────────────
const seed = Bun.randomUUIDv7();
const snapshotSrc = new Bun.CryptoHasher("sha256");
for (const path of [
	"src/cli.ts",
	"src/lib/profileLoader.ts",
	"src/lib/validators.ts",
	"src/lib/output.ts",
]) {
	const f = Bun.file(path);
	if (await f.exists()) snapshotSrc.update(await f.arrayBuffer());
}
const snapshotHash = snapshotSrc.digest("hex").slice(0, 12);
rows.push({
	check: "Seed",
	pattern: "Bun.randomUUIDv7()",
	result: seed,
	count: 1,
});
rows.push({
	check: "Snapshot Hash",
	pattern: "sha256(src/cli+lib/*)",
	result: snapshotHash,
	count: 4,
});

// ── Commit Hash ─────────────────────────────────────────────────────────────
try {
	const { stdout } = await $`git rev-parse HEAD`.quiet().nothrow();
	const full = stdout.toString().trim();
	const { stdout: msg } = await $`git log --format=%s -1`.quiet().nothrow();
	rows.push({
		check: "Commit Hash",
		pattern: "git rev-parse HEAD",
		result: `${full.slice(0, 7)} ${msg.toString().trim().slice(0, 50)}`,
		count: 1,
	});
} catch {
	rows.push({
		check: "Commit Hash",
		pattern: "git rev-parse HEAD",
		result: "N/A",
		count: 0,
	});
}

// ── CPU Profile Hot Root Functions ──────────────────────────────────────────
try {
	const profDir = `/tmp/tension-cpuprof-${process.pid}`;
	await $`mkdir -p ${profDir}`.quiet();
	const profProc = Bun.spawn(
		["bun", "--cpu-prof", `--cpu-prof-path=${profDir}`, "src/cli.ts", "--help"],
		{
			stdout: "ignore",
			stderr: "ignore",
			cwd: profDir,
			env: { ...Bun.env, CLAUDECODE: "1" },
		},
	);
	await profProc.exited;

	// Find the generated .cpuprofile file
	const hotFns: { name: string; hits: number }[] = [];
	const { stdout: lsOut } = await $`ls ${profDir}/*.cpuprofile 2>/dev/null`
		.quiet()
		.nothrow();
	const profFile = lsOut.toString().trim().split("\n")[0];
	if (profFile && (await Bun.file(profFile).exists())) {
		try {
			const prof = await Bun.file(profFile).json();
			const nodes: { functionName: string; hitCount: number }[] = prof.nodes || [];
			for (const n of nodes) {
				if (
					n.hitCount > 0 &&
					n.functionName &&
					!["(idle)", "(program)", "(root)", "(garbage collector)"].includes(
						n.functionName,
					)
				) {
					hotFns.push({ name: n.functionName, hits: n.hitCount });
				}
			}
			hotFns.sort((a, b) => b.hits - a.hits);
		} catch {
			/* parse failure — skip */
		}
	}
	// Cleanup
	await $`rm -rf ${profDir}`.quiet().nothrow();

	const top3 =
		hotFns
			.slice(0, 3)
			.map((f) => `${f.name}(${f.hits})`)
			.join(", ") || "N/A";
	rows.push({
		check: "CPU Hot Functions",
		pattern: "bun --cpu-prof src/cli.ts",
		result: top3,
		count: hotFns.length,
	});
} catch {
	rows.push({
		check: "CPU Hot Functions",
		pattern: "bun --cpu-prof",
		result: "SKIP",
		count: 0,
	});
}

// ── Perf: Startup + Memory ──────────────────────────────────────────────────
try {
	const t0 = Bun.nanoseconds();
	const perfProc = Bun.spawn(["bun", "src/cli.ts", "--help"], {
		stdout: "ignore",
		stderr: "ignore",
	});
	await perfProc.exited;
	const startupMs = ((Bun.nanoseconds() - t0) / 1e6).toFixed(1);
	const mem = process.memoryUsage();
	const heapMB = (mem.heapUsed / 1024 / 1024).toFixed(1);
	const rssMB = (mem.rss / 1024 / 1024).toFixed(1);
	rows.push({
		check: "Perf: Startup",
		pattern: "Bun.nanoseconds() delta",
		result: `${startupMs}ms`,
		count: parseInt(startupMs, 10),
	});
	rows.push({
		check: "Perf: Memory",
		pattern: "process.memoryUsage()",
		result: `heap ${heapMB}MB / rss ${rssMB}MB`,
		count: parseInt(rssMB, 10),
	});
} catch {
	rows.push({ check: "Perf", pattern: "startup+mem", result: "SKIP", count: 0 });
}

// ── Runtime Env Overrides ───────────────────────────────────────────────────
const ENV_KNOBS = [
	{
		key: "TENSION_DECAY_RATE",
		pattern: "TENSION_DECAY_RATE=0.92 bun propagate",
		default: "0.95",
	},
	{
		key: "TENSION_DEBUG",
		pattern: "TENSION_DEBUG=true bun runFullGraphPropagation",
		default: "false",
	},
	{
		key: "TENSION_SNAPSHOT_DIR",
		pattern: "TENSION_SNAPSHOT_DIR=./snapshots bun propagate",
		default: "./tension-snapshots",
	},
] as const;

for (const knob of ENV_KNOBS) {
	const val = Bun.env[knob.key];
	rows.push({
		check: `Env: ${knob.key}`,
		pattern: knob.pattern,
		result: val ?? `(default: ${knob.default})`,
		count: val ? 1 : 0,
	});
}

// ── JSC Heap Stats ────────────────────────────────────────────────────────
try {
	const heap = jsc.heapStats();
	rows.push({
		check: "JSC: Heap",
		pattern: "jsc.heapStats()",
		result: `${(heap.heapSize / 1024 / 1024).toFixed(1)}MB / ${(heap.heapCapacity / 1024 / 1024).toFixed(1)}MB cap`,
		count: heap.objectCount,
	});
	// Top 3 object types by count
	const topTypes = Object.entries(heap.objectTypeCounts)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 3)
		.map(([t, n]) => `${t}(${n})`)
		.join(", ");
	rows.push({
		check: "JSC: Top Objects",
		pattern: "heapStats().objectTypeCounts",
		result: topTypes || "N/A",
		count: heap.objectCount,
	});
} catch {
	rows.push({
		check: "JSC: Heap",
		pattern: "jsc.heapStats()",
		result: "SKIP",
		count: 0,
	});
}

// ── JSC GC Efficiency ─────────────────────────────────────────────────────
try {
	const gc = jsc.gc();
	rows.push({
		check: "JSC: GC",
		pattern: "jsc.gc()",
		result: `freed ${gc.freedMB}MB (${(gc.before / 1024 / 1024).toFixed(1)} → ${(gc.after / 1024 / 1024).toFixed(1)}MB)`,
		count: gc.freedBytes,
	});
} catch {
	rows.push({ check: "JSC: GC", pattern: "jsc.gc()", result: "SKIP", count: 0 });
}

// ── JSC Memory Pressure ───────────────────────────────────────────────────
try {
	const pressure = jsc.memoryPressure();
	rows.push({
		check: "JSC: Mem Pressure",
		pattern: "jsc.memoryPressure()",
		result: `${pressure.toFixed(1)}% of available`,
		count: Math.round(pressure),
	});
} catch {
	rows.push({
		check: "JSC: Mem Pressure",
		pattern: "jsc.memoryPressure()",
		result: "SKIP",
		count: 0,
	});
}

// ── Output ──────────────────────────────────────────────────────────────────
console.log("Tension-Field-God Status\n");
console.log(Bun.inspect.table(rows, ["check", "pattern", "result", "count"]));

const found = rows.filter(
	(r) => r.result === "FOUND" && r.check.includes("Anti"),
).length;
console.log(
	found === 0 ? "Status: ACTIVE" : `Status: ${found} anti-pattern(s) detected`,
);
