/**
 * Bun API Snapshot Generator
 *
 * Dynamically scans scan.ts and cross-references every Bun native API call
 * against the running Bun runtime surface, documentation URLs, and unicode status.
 *
 * Usage:
 *   bun run benchmarks/bun-api-snapshot.ts            # dashboard + JSON file
 *   bun run benchmarks/bun-api-snapshot.ts --json      # JSON to stdout
 *   bun run benchmarks/bun-api-snapshot.ts --quiet     # JSON file only, no stdout
 *
 * Writes to bun-api-snapshot.json automatically.
 * Delta tracking compares against the previous snapshot on each run.
 */

const flags = new Set(Bun.argv.slice(2));
const FLAG_JSON = flags.has('--json');
const FLAG_QUIET = flags.has('--quiet');

const SCAN_PATH = `${import.meta.dir}/../scan.ts`;
const SNAPSHOT_PATH = `${import.meta.dir}/bun-api-snapshot.json`;
const BENCHRC_PATH = `${import.meta.dir}/../.benchrc.json`;
const source = await Bun.file(SCAN_PATH).text();
const lines = source.split('\n');

// ── Load team member profile ────────────────────────────────────────

interface MemberProfile {
	name: string;
	timezone: string;
	notes: string;
	machine: {os: string; arch: string; cpu: string; cores: number; memory_gb: number; bun_version: string};
}
interface BenchRC {
	team: Record<string, MemberProfile>;
}

let memberKey: string | null = null;
let memberProfile: MemberProfile | null = null;

{
	const benchrcFile = Bun.file(BENCHRC_PATH);
	if (await benchrcFile.exists()) {
		try {
			const rc = (await benchrcFile.json()) as BenchRC;
			const user = Bun.env.USER ?? '';
			if (rc.team?.[user]) {
				memberKey = user;
				memberProfile = rc.team[user];
			}
		} catch {}
	}
}

// ── Load previous snapshot as baseline for delta tracking ────────────

type PreviousSnapshot = Record<string, unknown> & {metrics?: Record<string, number>};
let previousSnapshot: PreviousSnapshot | null = null;
const snapshotFile = Bun.file(SNAPSHOT_PATH);
if (await snapshotFile.exists()) {
	try {
		previousSnapshot = (await snapshotFile.json()) as PreviousSnapshot;
	} catch {
		previousSnapshot = null;
	}
}

// ── API registry: pattern → metadata ────────────────────────────────
// Doc URLs verified against https://bun.com/docs/api/utils and https://bun.com/docs/api/spawn
// since: cross-referenced from https://bun.com/rss.xml release blog posts
//   "≤1.0.0" = existed before versioned release notes (pre Sep 2023)
// Notes contain only claims grounded in official Bun docs/blog or confirmed by test

type UnicodeStatus = 'full' | 'passthrough' | 'binary' | 'n/a';

interface ApiDef {
	pattern: RegExp;
	api: string;
	doc: string;
	since: string;
	unicode: UnicodeStatus;
	note: string;
}

const API_DEFS: ApiDef[] = [
	{
		pattern: /Bun\.argv/g,
		api: 'Bun.argv',
		doc: 'https://bun.com/docs/runtime/configuration#argv',
		since: '≤1.0.0',
		unicode: 'passthrough',
		note: 'CLI arg parsing; passes raw strings',
	},
	{
		pattern: /Bun\.env\b/g,
		api: 'Bun.env',
		doc: 'https://bun.com/docs/runtime/env',
		since: '≤1.0.0',
		unicode: 'passthrough',
		note: 'Environment variable access; returns string|undefined',
	},
	{
		pattern: /Bun\.stringWidth/g,
		api: 'Bun.stringWidth',
		doc: 'https://bun.com/docs/api/utils#bun-stringwidth',
		since: '1.0.29',
		unicode: 'full',
		note: '~6,756x faster string-width alternative; implemented in Zig with optimized SIMD instructions [docs]',
	},
	{
		pattern: /Bun\.semver\.satisfies/g,
		api: 'Bun.semver.satisfies',
		doc: 'https://bun.com/docs/api/utils#bun-semver',
		since: '1.0.11',
		unicode: 'n/a',
		note: 'Semver range matching; ASCII-only input',
	},
	{
		pattern: /Bun\.semver\.order/g,
		api: 'Bun.semver.order',
		doc: 'https://bun.com/docs/api/utils#bun-semver',
		since: '1.0.11',
		unicode: 'n/a',
		note: 'Semver comparison; returns -1|0|1',
	},
	{
		pattern: /Bun\.stripANSI/g,
		api: 'Bun.stripANSI',
		doc: 'https://bun.com/docs/api/utils#bun-stripansi',
		since: '1.2.21',
		unicode: 'full',
		note: 'SIMD-accelerated [blog]; ~6-57x faster strip-ansi alternative (vs npm package) [docs]',
	},
	{
		pattern: /Bun\.version\b/g,
		api: 'Bun.version',
		doc: 'https://bun.com/docs/runtime/configuration#version',
		since: '≤1.0.0',
		unicode: 'n/a',
		note: 'Semver string of running Bun',
	},
	{
		pattern: /Bun\.revision/g,
		api: 'Bun.revision',
		doc: 'https://bun.com/docs/runtime/configuration#revision',
		since: '≤1.0.0',
		unicode: 'n/a',
		note: 'Git SHA of running Bun build',
	},
	{
		pattern: /Bun\.spawn\b(?!Sync)/g,
		api: 'Bun.spawn',
		doc: 'https://bun.com/docs/api/spawn',
		since: '≤1.0.0',
		unicode: 'passthrough',
		note: 'Async subprocess; stdout→pipe (ReadableStream), stderr→inherit (undefined) [docs]',
	},
	{
		pattern: /Bun\.spawnSync/g,
		api: 'Bun.spawnSync',
		doc: 'https://bun.com/docs/api/spawn#blocking-api-bun-spawnsync',
		since: '≤1.0.0',
		unicode: 'passthrough',
		note: 'Sync subprocess; returns Buffer for stdout/stderr [docs]',
	},
	{
		pattern: /Bun\.file\b/g,
		api: 'Bun.file',
		doc: 'https://bun.com/docs/api/file-io#reading-files-bun-file',
		since: '≤1.0.0',
		unicode: 'full',
		note: 'Lazy file reference; .text() returns UTF-8; .json() parses; .exists() checks',
	},
	{
		pattern: /Bun\.write\b/g,
		api: 'Bun.write',
		doc: 'https://bun.com/docs/api/file-io#writing-files-bun-write',
		since: '≤1.0.0',
		unicode: 'full',
		note: 'Atomic file write; accepts string (UTF-8) or Uint8Array',
	},
	{
		pattern: /Bun\.hash\.\w+/g,
		api: 'Bun.hash.*',
		doc: 'https://bun.com/docs/api/hashing#bun-hash',
		since: '≤1.0.0',
		unicode: 'binary',
		note: 'Fast non-crypto hash; input treated as raw bytes (rapidhash added 1.2.16) [blog]',
	},
	{
		pattern: /Bun\.fileURLToPath/g,
		api: 'Bun.fileURLToPath',
		doc: 'https://bun.com/docs/api/utils#bun-fileurltopath',
		since: '≤1.0.0',
		unicode: 'full',
		note: 'Converts file:// URL to absolute path; accepts string or URL object [docs]',
	},
	{
		pattern: /new Bun\.Glob\b/g,
		api: 'Bun.Glob',
		doc: 'https://bun.com/docs/api/glob',
		since: '1.0.14',
		unicode: 'full',
		note: 'Native glob matching; handles unicode filenames',
	},
	{
		pattern: /Bun\.inspect\.table/g,
		api: 'Bun.inspect.table',
		doc: 'https://bun.com/docs/api/utils#bun-inspect-table',
		since: '1.1.31',
		unicode: 'full',
		note: 'Formatted table output with ANSI colors; uses Bun.stringWidth for alignment',
	},
	{
		pattern: /Bun\.nanoseconds/g,
		api: 'Bun.nanoseconds',
		doc: 'https://bun.com/docs/api/utils#bun-nanoseconds',
		since: '≤1.0.0',
		unicode: 'n/a',
		note: 'High-precision timer; nanoseconds since process start [docs]',
	},
	{
		pattern: /Bun\.gc\b/g,
		api: 'Bun.gc',
		doc: 'https://bun.com/docs/api/utils#bun-gc',
		since: '≤1.0.0',
		unicode: 'n/a',
		note: 'Manual garbage collection trigger',
	},
	{
		pattern: /Bun\.openInEditor/g,
		api: 'Bun.openInEditor',
		doc: 'https://bun.com/docs/api/utils#bun-openineditor',
		since: '≤1.0.0',
		unicode: 'full',
		note: 'Opens file in configured editor',
	},
	{
		pattern: /Bun\.color\b/g,
		api: 'Bun.color',
		doc: 'https://bun.com/docs/api/utils#bun-color',
		since: '1.1.30',
		unicode: 'n/a',
		note: 'Color parsing and conversion [blog]',
	},
	{
		pattern: /Bun\.wrapAnsi/g,
		api: 'Bun.wrapAnsi',
		doc: 'https://bun.com/docs/api/utils#bun-wrapansi',
		since: '1.3.7',
		unicode: 'full',
		note: '33-88x faster than wrap-ansi npm [blog]; ANSI-aware word wrapping',
	},
	{
		pattern: /Bun\.pathToFileURL/g,
		api: 'Bun.pathToFileURL',
		doc: 'https://bun.com/docs/api/utils#bun-pathtofileurl',
		since: '≤1.0.0',
		unicode: 'full',
		note: 'Converts absolute path to file:// URL',
	},
	{
		pattern: /proc\.stdout\.text\(\)/g,
		api: 'proc.stdout.text()',
		doc: 'https://bun.com/docs/api/spawn#reading-stdout',
		since: '≤1.0.0',
		unicode: 'full',
		note: 'ReadableStream from Bun.spawn stdout; .text() reads full stream as UTF-8 string [docs]',
	},
	{
		pattern: /proc\.stderr\.text\(\)/g,
		api: 'proc.stderr.text()',
		doc: 'https://bun.com/docs/api/spawn#reading-stdout',
		since: '≤1.0.0',
		unicode: 'full',
		note: "Requires stderr:'pipe'; defaults to inherit (undefined) if not set [docs]",
	},
	{
		pattern: /import\.meta\.dir/g,
		api: 'import.meta.dir',
		doc: 'https://bun.com/docs/api/import-meta',
		since: '≤1.0.0',
		unicode: 'full',
		note: 'Directory of current file; handles unicode paths',
	},
	{
		pattern: /import\.meta\.url/g,
		api: 'import.meta.url',
		doc: 'https://bun.com/docs/api/import-meta',
		since: '≤1.0.0',
		unicode: 'full',
		note: 'file:// URL of current file',
	},
	{
		pattern: /import\.meta\.main/g,
		api: 'import.meta.main',
		doc: 'https://bun.com/docs/api/import-meta',
		since: '≤1.0.0',
		unicode: 'n/a',
		note: 'true if file is direct entry point',
	},
];

// ── Scan source for matches ─────────────────────────────────────────

interface ApiResult {
	api: string;
	doc: string;
	since: string;
	lines: number[];
	calls: number;
	unicode: UnicodeStatus;
	note: string;
}

const results: ApiResult[] = [];

for (const def of API_DEFS) {
	const matchLines: number[] = [];

	for (let i = 0; i < lines.length; i++) {
		// Reset regex state for each line
		def.pattern.lastIndex = 0;
		if (def.pattern.test(lines[i])) {
			matchLines.push(i + 1); // 1-indexed
		}
	}

	if (matchLines.length > 0) {
		results.push({
			api: def.api,
			doc: def.doc,
			since: def.since,
			lines: matchLines,
			calls: matchLines.length,
			unicode: def.unicode,
			note: def.note,
		});
	}
}

// Sort by call count descending
results.sort((a, b) => b.calls - a.calls);

// ── Bun.spawn full surface analysis ─────────────────────────────────
// Ref: https://bun.com/docs/api/spawn
// Type ref: SpawnOptions.OptionsObject, Subprocess, SyncSubprocess

// All SpawnOptions.OptionsObject keys from Bun type definitions
const SPAWN_OPTION_KEYS = [
	'cwd',
	'env',
	'stdio',
	'stdin',
	'stdout',
	'stderr',
	'onExit',
	'ipc',
	'serialization',
	'windowsHide',
	'windowsVerbatimArguments',
	'argv0',
	'signal',
	'timeout',
	'killSignal',
	'maxBuffer',
	'terminal',
] as const;
type SpawnOptionKey = (typeof SPAWN_OPTION_KEYS)[number];

// All Subprocess instance members from Bun type definitions
const SUBPROCESS_MEMBERS = [
	// properties
	'pid',
	'exited',
	'exitCode',
	'signalCode',
	'killed',
	'stdin',
	'stdout',
	'stderr',
	'readable',
	'terminal',
	// methods
	'kill',
	'ref',
	'unref',
	'send',
	'disconnect',
	'resourceUsage',
] as const;
type SubprocessMember = (typeof SUBPROCESS_MEMBERS)[number];

// SyncSubprocess members
const SYNC_SUBPROCESS_MEMBERS = [
	'stdout',
	'stderr',
	'exitCode',
	'success',
	'resourceUsage',
	'signalCode',
	'exitedDueToTimeout',
	'pid',
] as const;

interface SpawnSite {
	line: number;
	cmd: string;
	sync: boolean;
	options: Partial<Record<SpawnOptionKey, string>>;
	subprocessAccess: Partial<Record<SubprocessMember, number[]>>;
}

function analyzeSpawnSites() {
	const sites: SpawnSite[] = [];
	const optionUsage: Record<string, number> = {};
	const memberUsage: Record<string, number> = {};
	const spawnRe = /Bun\.spawn(Sync)?\s*\(/g;

	for (let i = 0; i < lines.length; i++) {
		spawnRe.lastIndex = 0;
		const spawnMatch = spawnRe.exec(lines[i]);
		if (!spawnMatch) continue;

		const isSync = !!spawnMatch[1];

		// Gather context: spawn call + surrounding lines for options and subprocess access
		const optContext = lines.slice(i, Math.min(i + 10, lines.length)).join('\n');
		// Look ahead further for subprocess member access (proc.exited, proc.kill, etc.)
		const accessContext = lines.slice(i, Math.min(i + 20, lines.length)).join('\n');

		// Extract command array
		const cmdMatch = optContext.match(/Bun\.spawn(?:Sync)?\s*\(\s*\[([^\]]*)\]/);
		const cmd = cmdMatch ? cmdMatch[1].replace(/"/g, '').replace(/,\s*/g, ' ').trim() : 'dynamic';

		// Detect spawn options (key: value and shorthand method syntax)
		const opts: Partial<Record<SpawnOptionKey, string>> = {};
		for (const key of SPAWN_OPTION_KEYS) {
			const kvRe = new RegExp(`\\b${key}\\s*:\\s*([^,}\\n]+)`);
			const methodRe = new RegExp(`\\b${key}\\s*\\([^)]*\\)\\s*\\{`);
			const kvMatch = optContext.match(kvRe);
			const methodMatch = optContext.match(methodRe);
			if (kvMatch) {
				opts[key] = kvMatch[1].trim().replace(/,\s*$/, '');
				optionUsage[key] = (optionUsage[key] ?? 0) + 1;
			} else if (methodMatch) {
				opts[key] = 'function';
				optionUsage[key] = (optionUsage[key] ?? 0) + 1;
			}
		}

		// Detect subprocess member access (proc.exited, proc.kill(), proc.pid, etc.)
		const members = isSync ? SYNC_SUBPROCESS_MEMBERS : SUBPROCESS_MEMBERS;
		const subprocessAccess: Partial<Record<SubprocessMember, number[]>> = {};
		// Find the variable name assigned to the spawn result
		const varMatch = lines[i].match(/(?:const|let|var)\s+(\w+)\s*=/);
		if (varMatch) {
			const varName = varMatch[1];
			for (const member of members) {
				const memberLines: number[] = [];
				// Search from spawn line forward for varName.member access
				for (let j = i; j < Math.min(i + 30, lines.length); j++) {
					const memberRe = new RegExp(`\\b${varName}\\.${member}\\b`);
					if (memberRe.test(lines[j])) {
						memberLines.push(j + 1);
					}
				}
				if (memberLines.length > 0) {
					subprocessAccess[member as SubprocessMember] = memberLines;
					memberUsage[member] = (memberUsage[member] ?? 0) + memberLines.length;
				}
			}
		}

		sites.push({line: i + 1, cmd, sync: isSync, options: opts, subprocessAccess});
	}

	// Build full surface coverage
	const optionCoverage: Record<string, {used: boolean; sites: number}> = {};
	for (const key of SPAWN_OPTION_KEYS) {
		optionCoverage[key] = {used: (optionUsage[key] ?? 0) > 0, sites: optionUsage[key] ?? 0};
	}
	const memberCoverage: Record<string, {used: boolean; sites: number}> = {};
	for (const member of SUBPROCESS_MEMBERS) {
		memberCoverage[member] = {used: (memberUsage[member] ?? 0) > 0, sites: memberUsage[member] ?? 0};
	}

	return {
		sites,
		optionUsage,
		memberUsage,
		optionCoverage,
		memberCoverage,
		totals: {
			spawn_sites: sites.filter(s => !s.sync).length,
			spawnSync_sites: sites.filter(s => s.sync).length,
			options_used: Object.keys(optionUsage).length,
			options_available: SPAWN_OPTION_KEYS.length,
			members_used: Object.keys(memberUsage).length,
			members_available: SUBPROCESS_MEMBERS.length,
		},
	};
}

const spawnAnalysis = analyzeSpawnSites();

// ── Signal analysis ─────────────────────────────────────────────────
// Ref: https://bun.com/docs/runtime/child-process#reference (Signal type)
// Tracks all POSIX/platform signals and where they appear in the codebase.

const SIGNALS = [
	'SIGABRT',
	'SIGALRM',
	'SIGBUS',
	'SIGCHLD',
	'SIGCONT',
	'SIGFPE',
	'SIGHUP',
	'SIGILL',
	'SIGINT',
	'SIGIO',
	'SIGIOT',
	'SIGKILL',
	'SIGPIPE',
	'SIGPOLL',
	'SIGPROF',
	'SIGPWR',
	'SIGQUIT',
	'SIGSEGV',
	'SIGSTKFLT',
	'SIGSTOP',
	'SIGSYS',
	'SIGTERM',
	'SIGTRAP',
	'SIGTSTP',
	'SIGTTIN',
	'SIGTTOU',
	'SIGUNUSED',
	'SIGURG',
	'SIGUSR1',
	'SIGUSR2',
	'SIGVTALRM',
	'SIGWINCH',
	'SIGXCPU',
	'SIGXFSZ',
	'SIGBREAK',
	'SIGLOST',
	'SIGINFO',
] as const;

type SignalContext =
	| 'process.on'
	| 'process.off'
	| 'process.removeListener'
	| 'proc.kill'
	| 'spawn.killSignal'
	| 'spawn.signal'
	| 'other';

interface SignalSite {
	signal: string;
	line: number;
	context: SignalContext;
}

function analyzeSignals() {
	const sites: SignalSite[] = [];
	const signalUsage: Record<string, number> = {};

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		for (const sig of SIGNALS) {
			if (!line.includes(sig)) continue;

			// Determine context
			let context: SignalContext = 'other';
			if (/process\.on\s*\(/.test(line)) context = 'process.on';
			else if (/process\.off\s*\(/.test(line)) context = 'process.off';
			else if (/process\.removeListener\s*\(/.test(line)) context = 'process.removeListener';
			else if (/\.kill\s*\(/.test(line)) context = 'proc.kill';
			else if (/killSignal\s*:/.test(line)) context = 'spawn.killSignal';
			else if (/\bsignal\s*:/.test(line)) context = 'spawn.signal';

			sites.push({signal: sig, line: i + 1, context});
			signalUsage[sig] = (signalUsage[sig] ?? 0) + 1;
		}
	}

	const coverage: Record<string, {used: boolean; sites: number}> = {};
	for (const sig of SIGNALS) {
		coverage[sig] = {used: (signalUsage[sig] ?? 0) > 0, sites: signalUsage[sig] ?? 0};
	}

	const contexts: Record<string, number> = {};
	for (const site of sites) {
		contexts[site.context] = (contexts[site.context] ?? 0) + 1;
	}

	return {
		total_signals_available: SIGNALS.length,
		total_signals_used: Object.keys(signalUsage).length,
		contexts,
		coverage,
		sites,
	};
}

const signalAnalysis = analyzeSignals();

// ── Terminal (PTY) analysis ──────────────────────────────────────────
// Ref: https://bun.com/docs/api/spawn#terminal
// Type ref: TerminalOptions, Terminal
// Bun.spawn({ terminal: true }) gives a PTY-backed subprocess.
// Terminal is accessed via proc.terminal.

// TerminalOptions keys (passed in spawn options when terminal: true/TerminalOptions)
const TERMINAL_OPTIONS_KEYS = [
	'cols',
	'rows',
	'name',
	// callbacks
	'data',
	'exit',
	'drain',
] as const;

// Terminal instance members (from proc.terminal)
const TERMINAL_MEMBERS = [
	// methods
	'write',
	'resize',
	'setRawMode',
	'ref',
	'unref',
	'close',
] as const;

function analyzeTerminal() {
	const optionSites: {key: string; line: number}[] = [];
	const memberSites: {member: string; line: number}[] = [];
	const optionUsage: Record<string, number> = {};
	const memberUsage: Record<string, number> = {};

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		// Check for terminal option usage in spawn calls (terminal: true/TerminalOptions)
		for (const key of TERMINAL_OPTIONS_KEYS) {
			// Match as spawn option in a terminal options object
			const re = new RegExp(`\\b${key}\\s*:`);
			// Only match within terminal-related context
			if (re.test(line) && (line.includes('terminal') || line.includes('pty') || line.includes('PTY'))) {
				optionSites.push({key, line: i + 1});
				optionUsage[key] = (optionUsage[key] ?? 0) + 1;
			}
		}

		// Check for Terminal member access (proc.terminal.write, etc.)
		for (const member of TERMINAL_MEMBERS) {
			const re = new RegExp(`\\.terminal\\.${member}\\b`);
			if (re.test(line)) {
				memberSites.push({member, line: i + 1});
				memberUsage[member] = (memberUsage[member] ?? 0) + 1;
			}
		}
	}

	const optionCoverage: Record<string, {used: boolean; sites: number}> = {};
	for (const key of TERMINAL_OPTIONS_KEYS) {
		optionCoverage[key] = {used: (optionUsage[key] ?? 0) > 0, sites: optionUsage[key] ?? 0};
	}
	const memberCoverage: Record<string, {used: boolean; sites: number}> = {};
	for (const member of TERMINAL_MEMBERS) {
		memberCoverage[member] = {used: (memberUsage[member] ?? 0) > 0, sites: memberUsage[member] ?? 0};
	}

	return {
		options_used: Object.keys(optionUsage).length,
		options_available: TERMINAL_OPTIONS_KEYS.length,
		members_used: Object.keys(memberUsage).length,
		members_available: TERMINAL_MEMBERS.length,
		option_coverage: optionCoverage,
		member_coverage: memberCoverage,
		option_sites: optionSites,
		member_sites: memberSites,
	};
}

const terminalAnalysis = analyzeTerminal();

// ── ResourceUsage analysis ───────────────────────────────────────────
// Ref: https://bun.com/docs/api/spawn#resourceusage
// Accessed via proc.resourceUsage() (Subprocess) or result.resourceUsage (SyncSubprocess)
// Returns detailed OS-level resource consumption metrics.

const RESOURCE_USAGE_FIELDS = [
	'contextSwitches',
	'cpuTime',
	'maxRSS',
	'messages',
	'ops',
	'shmSize',
	'signalCount',
	'swapCount',
] as const;

// Sub-fields of cpuTime
const CPU_TIME_FIELDS = ['user', 'system', 'total'] as const;
// Sub-fields of contextSwitches
const CONTEXT_SWITCH_FIELDS = ['voluntary', 'involuntary'] as const;
// Sub-fields of messages
const MESSAGES_FIELDS = ['sent', 'received'] as const;
// Sub-fields of ops
const OPS_FIELDS = ['in', 'out'] as const;

function analyzeResourceUsage() {
	const sites: {field: string; line: number}[] = [];
	const fieldUsage: Record<string, number> = {};

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		// Check for resourceUsage() call
		if (/\.resourceUsage\b/.test(line)) {
			sites.push({field: 'resourceUsage', line: i + 1});
			fieldUsage['resourceUsage'] = (fieldUsage['resourceUsage'] ?? 0) + 1;
		}

		// Check for individual field access
		for (const field of RESOURCE_USAGE_FIELDS) {
			const re = new RegExp(`resourceUsage[^.]*\\.${field}\\b`);
			if (re.test(line)) {
				sites.push({field, line: i + 1});
				fieldUsage[field] = (fieldUsage[field] ?? 0) + 1;
			}
		}
	}

	const fieldCoverage: Record<string, {used: boolean; sites: number}> = {};
	for (const field of RESOURCE_USAGE_FIELDS) {
		fieldCoverage[field] = {used: (fieldUsage[field] ?? 0) > 0, sites: fieldUsage[field] ?? 0};
	}

	return {
		call_sites: fieldUsage['resourceUsage'] ?? 0,
		fields_used: Object.keys(fieldUsage).filter(k => k !== 'resourceUsage').length,
		fields_available: RESOURCE_USAGE_FIELDS.length,
		field_coverage: fieldCoverage,
		sub_fields: {
			cpuTime: CPU_TIME_FIELDS.slice(),
			contextSwitches: CONTEXT_SWITCH_FIELDS.slice(),
			messages: MESSAGES_FIELDS.slice(),
			ops: OPS_FIELDS.slice(),
		},
		sites,
	};
}

const resourceUsageAnalysis = analyzeResourceUsage();

// ── Legacy pattern detection ────────────────────────────────────────

function countPattern(re: RegExp): number {
	let count = 0;
	for (const line of lines) {
		re.lastIndex = 0;
		if (re.test(line)) count++;
	}
	return count;
}

const legacyPatterns = {
	'new Response(proc.*)': countPattern(/new Response\(proc\./g),
	'URL(...).pathname (file)': countPattern(/new URL\([^)]*import\.meta\.url\)\.pathname/g),
	'manual stripAnsi regex': countPattern(/\.replace\(\/\\x1b\\\[/g),
};

// ── Runtime surface ─────────────────────────────────────────────────

const availableApis = Object.keys(Bun)
	.filter(k => !k.startsWith('_'))
	.sort();
const usedApiNames = results.map(
	r =>
		r.api
			.replace(/^(Bun\.|import\.meta\.|proc\.)/, '')
			.replace(/\.\*$/, '')
			.split('.')[0],
);
const unusedApis = availableApis.filter(k => !usedApiNames.includes(k));

// ── API categorization ──────────────────────────────────────────────
// Groups all available Bun runtime APIs into functional categories.

const API_CATEGORY_RULES: [string, RegExp][] = [
	['HTTP & Networking', /^(serve|fetch|connect|listen|dns|udpSocket|Socket|TCPSocket|TLSSocket|Listener)/],
	['Shell & Process', /^(spawn|spawnSync|\$|which|argv|env|sleep)/],
	['File I/O', /^(file|write|read|stdin|stdout|stderr|openFile|mmap|indexOfLine|BunFile)/],
	['Build & Bundling', /^(build|Transpiler|plugin|resolve)/],
	['Hashing & Security', /^(hash|CryptoHasher|SHA|MD[45]|password|TOTP|Crypto)/],
	['Databases', /^(sql|SQL|S3Client|s3|redis|Redis)/],
	['Compression', /^(gzip|deflate|inflate|gunzip|brotli|zlib)/],
	['Streaming', /^(ArrayBufferSink|readableStreamTo|concatArrayBuffers)/],
	['Routing', /^(FileSystemRouter|Router)/],
	['Advanced', /^(gc|generateHeapSnapshot|shrink|jsc|allocUnsafe|unsafe|peek)/],
	['Semver', /^(semver)/],
	['Configuration', /^(version|revision|main|origin|cwd|assetPrefix|enableANSIColors)/],
];

function categorizeApi(name: string): string {
	for (const [category, re] of API_CATEGORY_RULES) {
		if (re.test(name)) return category;
	}
	return 'Utilities';
}

function buildApiCategories() {
	const cats: Record<
		string,
		{used: string[]; unused: string[]; available: number; used_count: number; coverage: string}
	> = {};

	for (const api of availableApis) {
		const cat = categorizeApi(api);
		if (!cats[cat]) cats[cat] = {used: [], unused: [], available: 0, used_count: 0, coverage: '0.0%'};
		cats[cat].available++;
		if (usedApiNames.includes(api)) {
			cats[cat].used.push(api);
			cats[cat].used_count++;
		} else {
			cats[cat].unused.push(api);
		}
	}

	for (const c of Object.values(cats)) {
		c.coverage = c.available > 0 ? `${((c.used_count / c.available) * 100).toFixed(1)}%` : 'n/a';
	}
	return cats;
}

const apiCategories = buildApiCategories();

// ── Signal categorization ───────────────────────────────────────────

const SIGNAL_CATEGORY_DEFS: Record<string, string[]> = {
	'Error signals': ['SIGABRT', 'SIGBUS', 'SIGFPE', 'SIGILL', 'SIGSEGV'],
	'Termination signals': ['SIGTERM', 'SIGKILL', 'SIGHUP', 'SIGQUIT', 'SIGINT'],
	'User signals': ['SIGUSR1', 'SIGUSR2'],
	'Child signals': ['SIGCHLD'],
	'Input signals': ['SIGTTIN', 'SIGTTOU'],
	'Operation signals': ['SIGPIPE', 'SIGALRM', 'SIGPROF', 'SIGVTALRM', 'SIGIO', 'SIGPOLL'],
	'Job control': ['SIGSTOP', 'SIGTSTP', 'SIGCONT', 'SIGURG'],
	'Misc': [
		'SIGTRAP',
		'SIGSYS',
		'SIGXCPU',
		'SIGXFSZ',
		'SIGWINCH',
		'SIGPWR',
		'SIGSTKFLT',
		'SIGIOT',
		'SIGUNUSED',
		'SIGBREAK',
		'SIGLOST',
		'SIGINFO',
	],
};

function buildSignalCategories() {
	const cats: Record<string, {used: number; available: number; coverage: string; used_signals: string[]}> = {};
	for (const [cat, sigs] of Object.entries(SIGNAL_CATEGORY_DEFS)) {
		const usedSigs = sigs.filter(s => signalAnalysis.coverage[s]?.used);
		cats[cat] = {
			used: usedSigs.length,
			available: sigs.length,
			coverage: sigs.length > 0 ? `${((usedSigs.length / sigs.length) * 100).toFixed(1)}%` : 'n/a',
			used_signals: usedSigs,
		};
	}
	return cats;
}

const signalCategories = buildSignalCategories();

// ── Subprocess per-site member coverage ─────────────────────────────

const SUBPROCESS_MEMBER_TYPES: Record<string, string> = {
	pid: 'number',
	exited: 'Promise<number>',
	exitCode: 'number',
	signalCode: 'NodeJS.Signals',
	killed: 'boolean',
	stdin: 'FileSink',
	stdout: 'ReadableStream',
	stderr: 'ReadableStream',
	readable: 'ReadableStream',
	terminal: 'Terminal',
	kill: 'method',
	ref: 'method',
	unref: 'method',
	send: 'method',
	disconnect: 'method',
	resourceUsage: 'method',
};

function buildSubprocessPerSite() {
	const asyncSites = spawnAnalysis.sites.filter(s => !s.sync);
	const total = asyncSites.length;
	const perMember: Record<
		string,
		{type: string; used: boolean; sites_using: number; total_sites: number; ratio: string}
	> = {};

	for (const member of SUBPROCESS_MEMBERS) {
		const sitesUsing = asyncSites.filter(s => member in s.subprocessAccess).length;
		perMember[member] = {
			type: SUBPROCESS_MEMBER_TYPES[member] ?? 'unknown',
			used: sitesUsing > 0,
			sites_using: sitesUsing,
			total_sites: total,
			ratio: `${sitesUsing}/${total}`,
		};
	}
	return perMember;
}

const subprocessPerSite = buildSubprocessPerSite();

// ── Unicode summary ─────────────────────────────────────────────────

const unicodeCounts = {
	'full': results.filter(r => r.unicode === 'full').length,
	'passthrough': results.filter(r => r.unicode === 'passthrough').length,
	'binary': results.filter(r => r.unicode === 'binary').length,
	'n/a': results.filter(r => r.unicode === 'n/a').length,
};
const unicodeHandled = unicodeCounts.full + unicodeCounts.passthrough + unicodeCounts.binary;

// ── Helpers ─────────────────────────────────────────────────────────

function pct(used: number, available: number): string {
	return available > 0 ? `${((used / available) * 100).toFixed(1)}%` : 'n/a';
}

function pctNum(used: number, available: number): number {
	return available > 0 ? (used / available) * 100 : 0;
}

function bar(ratio: number, width = 18): string {
	const filled = Math.round(ratio * width);
	return '\u2588'.repeat(filled) + '\u00b7'.repeat(width - filled);
}

function heatLabel(p: number): string {
	if (p === 0) return 'None';
	if (p < 10) return 'Very Low';
	if (p < 30) return 'Low';
	if (p < 60) return 'Medium';
	if (p < 80) return 'High';
	return 'Very High';
}

// ── Metrics: flat table of every tracked number ─────────────────────

const totalCalls = results.reduce((sum, r) => sum + r.calls, 0);

const metrics: Record<string, number> = {
	// file
	'file.size_bytes': new TextEncoder().encode(source).byteLength,
	'file.lines': lines.length,

	// runtime surface
	'runtime.available_apis': availableApis.length,
	'runtime.used_apis': results.length,

	// api call sites
	'apis.unique': results.length,
	'apis.total_call_sites': totalCalls,

	// unicode breakdown
	'unicode.full': unicodeCounts.full,
	'unicode.passthrough': unicodeCounts.passthrough,
	'unicode.binary': unicodeCounts.binary,
	'unicode.n_a': unicodeCounts['n/a'],
	'unicode.handled_total': unicodeHandled,

	// legacy patterns (should stay at 0)
	'legacy.response_wrapper': countPattern(/new Response\(proc\./g),
	'legacy.url_pathname': countPattern(/new URL\([^)]*import\.meta\.url\)\.pathname/g),
	'legacy.strip_ansi_regex': countPattern(/\.replace\(\/\\x1b\\\[/g),

	// spawn surface
	'spawn.sites_async': spawnAnalysis.totals.spawn_sites,
	'spawn.sites_sync': spawnAnalysis.totals.spawnSync_sites,
	'spawn.sites_total': spawnAnalysis.totals.spawn_sites + spawnAnalysis.totals.spawnSync_sites,
	'spawn.options_available': SPAWN_OPTION_KEYS.length,
	'spawn.options_used': spawnAnalysis.totals.options_used,
	'spawn.members_available': SUBPROCESS_MEMBERS.length,
	'spawn.members_used': spawnAnalysis.totals.members_used,
	'spawn.sync_members_available': SYNC_SUBPROCESS_MEMBERS.length,

	// signals
	'signals.available': SIGNALS.length,
	'signals.used': signalAnalysis.total_signals_used,
	'signals.sites': signalAnalysis.sites.length,

	// terminal (PTY)
	'terminal.options_available': TERMINAL_OPTIONS_KEYS.length,
	'terminal.options_used': terminalAnalysis.options_used,
	'terminal.members_available': TERMINAL_MEMBERS.length,
	'terminal.members_used': terminalAnalysis.members_used,

	// resource usage
	'resource_usage.call_sites': resourceUsageAnalysis.call_sites,
	'resource_usage.fields_available': RESOURCE_USAGE_FIELDS.length,
	'resource_usage.fields_used': resourceUsageAnalysis.fields_used,

	// per-signal context counts
	...Object.fromEntries(Object.entries(signalAnalysis.contexts).map(([ctx, n]) => [`signals.ctx.${ctx}`, n])),

	// per-api call counts
	...Object.fromEntries(results.map(r => [`api.${r.api}.calls`, r.calls])),

	// per-category counts
	...Object.fromEntries(Object.entries(apiCategories).map(([cat, d]) => [`category.${cat}.used`, d.used_count])),
	...Object.fromEntries(Object.entries(apiCategories).map(([cat, d]) => [`category.${cat}.available`, d.available])),

	// per-signal-category counts
	...Object.fromEntries(Object.entries(signalCategories).map(([cat, d]) => [`signal_cat.${cat}.used`, d.used])),
};

// ── Delta: compare against previous snapshot ────────────────────────

interface DeltaEntry {
	metric: string;
	previous: number;
	current: number;
	delta: number;
	changed: boolean;
}

function computeDelta(current: Record<string, number>, previous: Record<string, number> | null): DeltaEntry[] {
	if (!previous) return [];
	const allKeys = new Set([...Object.keys(current), ...Object.keys(previous)]);
	const entries: DeltaEntry[] = [];
	for (const key of [...allKeys].sort()) {
		const cur = current[key] ?? 0;
		const prev = previous[key] ?? 0;
		entries.push({metric: key, previous: prev, current: cur, delta: cur - prev, changed: cur !== prev});
	}
	return entries;
}

const previousMetrics: Record<string, number> | null = previousSnapshot?.metrics ?? null;
const deltaEntries = computeDelta(metrics, previousMetrics);
const changedEntries = deltaEntries.filter(e => e.changed);

// ── Coverage ────────────────────────────────────────────────────────

const coverage = {
	runtime_apis: pct(results.length, availableApis.length),
	spawn_options: pct(spawnAnalysis.totals.options_used, SPAWN_OPTION_KEYS.length),
	spawn_members: pct(spawnAnalysis.totals.members_used, SUBPROCESS_MEMBERS.length),
	signals: pct(signalAnalysis.total_signals_used, SIGNALS.length),
	terminal_options: pct(terminalAnalysis.options_used, TERMINAL_OPTIONS_KEYS.length),
	terminal_members: pct(terminalAnalysis.members_used, TERMINAL_MEMBERS.length),
	resource_usage: pct(resourceUsageAnalysis.fields_used, RESOURCE_USAGE_FIELDS.length),
	unicode: pct(unicodeHandled, results.length),
};

// ── Heatmap data ────────────────────────────────────────────────────

const heatmap = [
	{surface: 'Runtime APIs', pct: pctNum(results.length, availableApis.length)},
	{surface: 'Spawn Options', pct: pctNum(spawnAnalysis.totals.options_used, SPAWN_OPTION_KEYS.length)},
	{surface: 'Subprocess Props', pct: pctNum(spawnAnalysis.totals.members_used, SUBPROCESS_MEMBERS.length)},
	{surface: 'Signals', pct: pctNum(signalAnalysis.total_signals_used, SIGNALS.length)},
	{
		surface: 'Terminal',
		pct: pctNum(
			terminalAnalysis.options_used + terminalAnalysis.members_used,
			TERMINAL_OPTIONS_KEYS.length + TERMINAL_MEMBERS.length,
		),
	},
	{surface: 'ResourceUsage', pct: pctNum(resourceUsageAnalysis.fields_used, RESOURCE_USAGE_FIELDS.length)},
	{surface: 'Unicode', pct: pctNum(unicodeHandled, results.length)},
];

// ── Spawn option matrix ─────────────────────────────────────────────

const spawnOptionMatrix = SPAWN_OPTION_KEYS.map(key => ({
	option: key,
	status: spawnAnalysis.optionCoverage[key]?.used ? 'Used' : 'Unused',
	sites: spawnAnalysis.optionCoverage[key]?.sites ?? 0,
}));

// ── Output JSON ─────────────────────────────────────────────────────

const processUsed = spawnAnalysis.totals.options_used + spawnAnalysis.totals.members_used;
const processAvail = SPAWN_OPTION_KEYS.length + SUBPROCESS_MEMBERS.length;

const snapshot = {
	generated: new Date().toISOString(),
	previous_generated: previousSnapshot?.generated ?? null,
	file: 'scan.ts',
	runtime: {
		name: 'bun',
		version: Bun.version,
		revision: Bun.revision,
		platform: `${process.platform} ${process.arch}`,
	},
	member: memberProfile
		? {
				key: memberKey,
				name: memberProfile.name,
				timezone: memberProfile.timezone,
				notes: memberProfile.notes,
				machine: memberProfile.machine,
			}
		: null,
	metrics,
	delta: {
		has_baseline: previousMetrics !== null,
		total_metrics: deltaEntries.length,
		changed_count: changedEntries.length,
		unchanged_count: deltaEntries.length - changedEntries.length,
		changes: changedEntries,
	},
	coverage,
	heatmap,
	summary: {
		surface_table: [
			{
				surface: 'Bun Runtime APIs',
				used: results.length,
				available: availableApis.length,
				coverage: coverage.runtime_apis,
			},
			{surface: 'API Call Sites', used: totalCalls, available: null, coverage: null},
			{
				surface: 'Spawn Options',
				used: spawnAnalysis.totals.options_used,
				available: SPAWN_OPTION_KEYS.length,
				coverage: coverage.spawn_options,
			},
			{
				surface: 'Subprocess Members',
				used: spawnAnalysis.totals.members_used,
				available: SUBPROCESS_MEMBERS.length,
				coverage: coverage.spawn_members,
			},
			{surface: 'Spawn Sites (async)', used: spawnAnalysis.totals.spawn_sites, available: null, coverage: null},
			{
				surface: 'Spawn Sites (sync)',
				used: spawnAnalysis.totals.spawnSync_sites,
				available: null,
				coverage: null,
			},
			{
				surface: 'Signals',
				used: signalAnalysis.total_signals_used,
				available: SIGNALS.length,
				coverage: coverage.signals,
			},
			{surface: 'Signal Sites', used: signalAnalysis.sites.length, available: null, coverage: null},
			{
				surface: 'Terminal Options',
				used: terminalAnalysis.options_used,
				available: TERMINAL_OPTIONS_KEYS.length,
				coverage: coverage.terminal_options,
			},
			{
				surface: 'Terminal Members',
				used: terminalAnalysis.members_used,
				available: TERMINAL_MEMBERS.length,
				coverage: coverage.terminal_members,
			},
			{surface: 'ResourceUsage Calls', used: resourceUsageAnalysis.call_sites, available: null, coverage: null},
			{
				surface: 'ResourceUsage Fields',
				used: resourceUsageAnalysis.fields_used,
				available: RESOURCE_USAGE_FIELDS.length,
				coverage: coverage.resource_usage,
			},
			{surface: 'Unicode: full', used: unicodeCounts.full, available: null, coverage: null},
			{surface: 'Unicode: passthrough', used: unicodeCounts.passthrough, available: null, coverage: null},
			{surface: 'Unicode: binary', used: unicodeCounts.binary, available: null, coverage: null},
			{surface: 'Unicode: n/a', used: unicodeCounts['n/a'], available: null, coverage: null},
			{
				surface: 'Legacy Patterns',
				used:
					metrics['legacy.response_wrapper'] +
					metrics['legacy.url_pathname'] +
					metrics['legacy.strip_ansi_regex'],
				available: null,
				coverage: null,
			},
		],
		min_bun_version: '1.0.0',
		file_size_bytes: metrics['file.size_bytes'],
		file_lines: metrics['file.lines'],
	},
	api_categories: apiCategories,
	signal_categories: signalCategories,
	subprocess_per_site: subprocessPerSite,
	spawn_option_matrix: spawnOptionMatrix,
	apis: results,
	spawn: {
		doc: 'https://bun.com/docs/api/spawn',
		type_ref: 'https://bun.com/docs/runtime/child-process#reference',
		totals: spawnAnalysis.totals,
		option_coverage: spawnAnalysis.optionCoverage,
		member_coverage: spawnAnalysis.memberCoverage,
		sites: spawnAnalysis.sites,
	},
	signals: {
		doc: 'https://bun.com/docs/runtime/child-process#reference',
		total_available: signalAnalysis.total_signals_available,
		total_used: signalAnalysis.total_signals_used,
		contexts: signalAnalysis.contexts,
		coverage: signalAnalysis.coverage,
		sites: signalAnalysis.sites,
	},
	terminal: {
		doc: 'https://bun.com/docs/api/spawn#terminal',
		type_ref: 'TerminalOptions, Terminal',
		options_available: terminalAnalysis.options_available,
		options_used: terminalAnalysis.options_used,
		members_available: terminalAnalysis.members_available,
		members_used: terminalAnalysis.members_used,
		option_coverage: terminalAnalysis.option_coverage,
		member_coverage: terminalAnalysis.member_coverage,
		option_sites: terminalAnalysis.option_sites,
		member_sites: terminalAnalysis.member_sites,
	},
	resource_usage: {
		doc: 'https://bun.com/docs/api/spawn#resourceusage',
		type_ref: 'ResourceUsage',
		call_sites: resourceUsageAnalysis.call_sites,
		fields_available: resourceUsageAnalysis.fields_available,
		fields_used: resourceUsageAnalysis.fields_used,
		field_coverage: resourceUsageAnalysis.field_coverage,
		sub_fields: resourceUsageAnalysis.sub_fields,
		sites: resourceUsageAnalysis.sites,
	},
	unused_bun_apis: unusedApis,
};

// ── Write JSON ──────────────────────────────────────────────────────

await Bun.write(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2) + '\n');

if (FLAG_JSON) {
	console.log(JSON.stringify(snapshot, null, 2));
	process.exit(0);
}
if (FLAG_QUIET) {
	process.exit(0);
}

// ── ANSI styles ─────────────────────────────────────────────────────

const S = {
	reset: '\x1b[0m',
	bold: '\x1b[1m',
	dim: '\x1b[2m',
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	cyan: '\x1b[36m',
	white: '\x1b[37m',
	gray: '\x1b[90m',
	bRed: '\x1b[91m',
	bGreen: '\x1b[92m',
	bYellow: '\x1b[93m',
	bCyan: '\x1b[96m',
	bWhite: '\x1b[97m',
	bgCyan: '\x1b[46m',
	bgBlue: '\x1b[44m',
} as const;

const o = (s: string) => (Bun.enableANSIColors ? s : '');
const R = o(S.reset);
const B = o(S.bold);
const D = o(S.dim);

// ── Layout helpers (ANSI-width-aware) ───────────────────────────────

// Bun.stringWidth gives display width ignoring ANSI escape codes
const vw = (s: string): number => Bun.stringWidth(s);
const lpad = (s: string, n: number) => {
	const w = vw(s);
	return w >= n ? s : s + ' '.repeat(n - w);
};
const rpad = (s: string, n: number) => {
	const w = vw(s);
	return w >= n ? s : ' '.repeat(n - w) + s;
};

const W = 80;
const rule = (ch = '\u2500') => `${D}${ch.repeat(W)}${R}`;
const thinRule = () => `  ${D}${'─'.repeat(W - 4)}${R}`;

// ── Color helpers ───────────────────────────────────────────────────

function covColor(p: number): string {
	if (!Bun.enableANSIColors) return '';
	if (p >= 80) return S.bGreen;
	if (p >= 50) return S.bCyan;
	if (p >= 25) return S.bYellow;
	if (p > 0) return S.yellow;
	return S.gray;
}

function covLabel(p: number): string {
	if (p === 0) return `${o(S.gray)}none${R}`;
	if (p < 10) return `${o(S.red)}critical${R}`;
	if (p < 25) return `${o(S.yellow)}low${R}`;
	if (p < 50) return `${o(S.bYellow)}moderate${R}`;
	if (p < 75) return `${o(S.bCyan)}good${R}`;
	return `${o(S.bGreen)}high${R}`;
}

function colorBar(ratio: number, width = 20): string {
	const filled = Math.round(ratio * width);
	const empty = width - filled;
	const c = covColor(ratio * 100);
	return `${c}${'█'.repeat(filled)}${o(S.gray)}${'░'.repeat(empty)}${R}`;
}

function statusMark(used: boolean): string {
	return used ? `${o(S.bGreen)}●${R}` : `${o(S.gray)}○${R}`;
}

function numStr(n: number, dimZero = true): string {
	if (n === 0 && dimZero) return `${D}0${R}`;
	return `${o(S.bWhite)}${n}${R}`;
}

function fracStr(used: number, avail: number): string {
	const c = covColor(pctNum(used, avail));
	return `${c}${used}${D}/${R}${avail}`;
}

function pctStr(p: number): string {
	return `${covColor(p)}${p.toFixed(1)}%${R}`;
}

function deltaStr(d: number): string {
	if (d > 0) return `${o(S.bGreen)}+${d}${R}`;
	if (d < 0) return `${o(S.bRed)}${d}${R}`;
	return `${D}±0${R}`;
}

// ── Dashboard rendering ─────────────────────────────────────────────

const legacyTotal =
	metrics['legacy.response_wrapper'] + metrics['legacy.url_pathname'] + metrics['legacy.strip_ansi_regex'];
const metricsCount = Object.keys(metrics).length;
const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);

// Header
console.log();
console.log(`  ${B}${o(S.bCyan)}BUN API SURFACE AUDIT${R}  ${D}${metricsCount} metrics · ${ts}${R}`);
console.log(
	`  ${D}scan.ts · ${lines.length} lines · ${(metrics['file.size_bytes'] / 1024).toFixed(1)} KB · Bun ${Bun.version} · ${process.platform} ${process.arch}${R}`,
);
if (memberProfile) {
	console.log(
		`  ${D}Member: ${memberKey} (${memberProfile.name}) · ${memberProfile.machine.cpu}, ${memberProfile.machine.cores} cores, ${memberProfile.machine.memory_gb} GB${R}`,
	);
} else {
	console.log(`  ${D}Member: (unknown — run: bun run benchmarks/team-init.ts)${R}`);
}
console.log();
console.log(rule('━'));

// ── Coverage heatmap ───────────────────────────────
console.log();
console.log(`  ${B}COVERAGE${R}`);
console.log();

for (const h of heatmap) {
	const p = h.pct;
	const b = colorBar(p / 100);
	console.log(`  ${lpad(h.surface, 20)} ${b} ${rpad(pctStr(p), 14)} ${covLabel(p)}`);
}

console.log();
console.log(rule());

// ── Runtime API categories ─────────────────────────
console.log();
console.log(`  ${B}RUNTIME API SURFACE${R}  ${D}${results.length}/${availableApis.length} used${R}`);
console.log();
console.log(`  ${D}${lpad('Category', 24)} ${rpad('Used', 6)} ${rpad('Avail', 6)} ${rpad('Coverage', 8)}${R}`);
console.log(thinRule());

for (const [cat, d] of Object.entries(apiCategories).sort(
	(a, b) => b[1].used_count - a[1].used_count || b[1].available - a[1].available,
)) {
	const p = pctNum(d.used_count, d.available);
	console.log(
		`  ${lpad(cat, 24)} ${rpad(numStr(d.used_count), 12)} ${rpad(String(d.available), 6)} ${rpad(pctStr(p), 16)}`,
	);
}

console.log(thinRule());
console.log(
	`  ${B}${lpad('Total', 24)}${R} ${rpad(numStr(results.length, false), 12)} ${rpad(String(availableApis.length), 6)} ${rpad(pctStr(pctNum(results.length, availableApis.length)), 16)}`,
);

console.log();
console.log(rule());

// ── Spawn option matrix ────────────────────────────
console.log();
console.log(
	`  ${B}SPAWN OPTIONS${R}  ${D}${spawnAnalysis.totals.options_used}/${SPAWN_OPTION_KEYS.length} used across ${spawnAnalysis.totals.spawn_sites + spawnAnalysis.totals.spawnSync_sites} spawn sites${R}`,
);
console.log();
console.log(`  ${D}${lpad('Option', 30)} ${'Status'}   ${rpad('Sites', 6)}${R}`);
console.log(thinRule());

for (const row of spawnOptionMatrix) {
	const mark = statusMark(row.status === 'Used');
	const sites = row.sites > 0 ? `${o(S.bWhite)}${row.sites}${R}` : `${D}·${R}`;
	console.log(
		`  ${D}${lpad(row.option, 30)}${R} ${mark} ${lpad(row.status === 'Used' ? `${o(S.green)}used${R}` : `${D}unused${R}`, 16)} ${rpad(sites, 8)}`,
	);
}

console.log();
console.log(rule());

// ── Subprocess interface ───────────────────────────
console.log();
console.log(
	`  ${B}SUBPROCESS INTERFACE${R}  ${D}${spawnAnalysis.totals.members_used}/${SUBPROCESS_MEMBERS.length} members accessed${R}`,
);
console.log();
console.log(`  ${D}${lpad('Member', 18)} ${lpad('Type', 18)} ${rpad('Sites', 8)}${R}`);
console.log(thinRule());

for (const [member, d] of Object.entries(subprocessPerSite)) {
	const mark = statusMark(d.used);
	const ratio = d.used
		? `${covColor(pctNum(d.sites_using, d.total_sites))}${d.sites_using}${D}/${R}${d.total_sites}`
		: `${D}·${R}`;
	console.log(`  ${mark} ${lpad(member, 17)} ${D}${lpad(d.type, 18)}${R} ${rpad(ratio, 14)}`);
}

console.log();
console.log(rule());

// ── Signals ────────────────────────────────────────
console.log();
console.log(
	`  ${B}SIGNALS${R}  ${D}${signalAnalysis.total_signals_used}/${SIGNALS.length} used · ${signalAnalysis.sites.length} call sites${R}`,
);
console.log();
console.log(`  ${D}${lpad('Category', 22)} ${rpad('Used', 6)} ${rpad('Avail', 6)} ${rpad('Coverage', 8)}${R}`);
console.log(thinRule());

for (const [cat, d] of Object.entries(signalCategories)) {
	const p = pctNum(d.used, d.available);
	const detail = d.used > 0 ? `  ${D}(${d.used_signals.join(', ')})${R}` : '';
	console.log(
		`  ${lpad(cat, 22)} ${rpad(numStr(d.used), 12)} ${rpad(String(d.available), 6)} ${rpad(pctStr(p), 16)}${detail}`,
	);
}

console.log();
console.log(rule());

// ── Unicode ────────────────────────────────────────
console.log();
console.log(`  ${B}UNICODE${R}  ${D}${unicodeHandled}/${results.length} APIs handle unicode (${coverage.unicode})${R}`);
console.log();

const uRows: [string, number, string, string][] = [
	['full', unicodeCounts.full, 'Full ICU/UTF-8 processing', S.bGreen],
	['passthrough', unicodeCounts.passthrough, 'Native string pass-through', S.bCyan],
	['binary', unicodeCounts.binary, 'Byte-level operations', S.bYellow],
	['n/a', unicodeCounts['n/a'], 'Not text-related', S.gray],
];

for (const [cat, count, desc, color] of uRows) {
	console.log(`  ${o(color)}${lpad(cat, 14)}${R}  ${numStr(count)}  ${D}${desc}${R}`);
}

console.log();
console.log(rule());

// ── Terminal + ResourceUsage ───────────────────────
console.log();
console.log(`  ${B}TERMINAL & RESOURCE USAGE${R}  ${D}not used in scan.ts${R}`);
console.log();
console.log(
	`  ${D}Terminal Options    ${terminalAnalysis.options_used}/${TERMINAL_OPTIONS_KEYS.length}    Terminal Members   ${terminalAnalysis.members_used}/${TERMINAL_MEMBERS.length}${R}`,
);
console.log(
	`  ${D}ResourceUsage       ${resourceUsageAnalysis.call_sites} calls           Fields used       ${resourceUsageAnalysis.fields_used}/${RESOURCE_USAGE_FIELDS.length}${R}`,
);

console.log();
console.log(rule());

// ── Legacy ─────────────────────────────────────────
console.log();
if (legacyTotal === 0) {
	console.log(`  ${B}LEGACY${R}  ${o(S.bGreen)}clean${R}  ${D}no deprecated patterns detected${R}`);
} else {
	console.log(
		`  ${B}LEGACY${R}  ${o(S.bRed)}${legacyTotal} deprecated pattern${legacyTotal > 1 ? 's' : ''} found${R}`,
	);
	if (metrics['legacy.response_wrapper'] > 0)
		console.log(`    ${o(S.red)}●${R} new Response(proc.*): ${metrics['legacy.response_wrapper']}`);
	if (metrics['legacy.url_pathname'] > 0)
		console.log(`    ${o(S.red)}●${R} URL.pathname: ${metrics['legacy.url_pathname']}`);
	if (metrics['legacy.strip_ansi_regex'] > 0)
		console.log(`    ${o(S.red)}●${R} strip-ansi regex: ${metrics['legacy.strip_ansi_regex']}`);
}

console.log();
console.log(rule());

// ── Delta ──────────────────────────────────────────
console.log();
if (!previousMetrics) {
	console.log(`  ${B}DELTA${R}  ${D}no baseline — first run. Re-run to track changes.${R}`);
} else if (changedEntries.length === 0) {
	console.log(`  ${B}DELTA${R}  ${o(S.bGreen)}stable${R}  ${D}${deltaEntries.length} metrics · 0 changes${R}`);
} else {
	console.log(
		`  ${B}DELTA${R}  ${o(S.bYellow)}${changedEntries.length} change${changedEntries.length > 1 ? 's' : ''}${R}  ${D}${deltaEntries.length} metrics tracked${R}`,
	);
	console.log();
	console.log(`  ${D}${lpad('Metric', 40)} ${rpad('Prev', 6)} ${rpad('Curr', 6)} ${rpad('Delta', 8)}${R}`);
	console.log(thinRule());
	for (const c of changedEntries.slice(0, 25)) {
		console.log(
			`  ${lpad(c.metric, 40)} ${rpad(String(c.previous), 6)} ${rpad(String(c.current), 6)} ${rpad(deltaStr(c.delta), 14)}`,
		);
	}
	if (changedEntries.length > 25) {
		console.log(`  ${D}… and ${changedEntries.length - 25} more${R}`);
	}
}

console.log();
console.log(rule('━'));
console.log();

// ── Footer ─────────────────────────────────────────
console.log(`  ${D}snapshot written → ${SNAPSHOT_PATH}${R}`);
console.log(`  ${D}use --json for machine-readable output · --quiet to suppress${R}`);
console.log();
