/**
 * Team Member Profile Init
 *
 * Auto-detects machine info and writes a member profile to .benchrc.json
 * for benchmark reproducibility. Preserves existing team member entries.
 *
 * Usage:
 *   bun run benchmarks/team-init.ts --name "Nola Rose" --email "nola@example.com" --notes "M3 Max, plugged in"
 *   bun run benchmarks/team-init.ts                    # uses defaults or existing values
 *   bun run benchmarks/team-init.ts --check            # validate all profiles in .benchrc.json
 *   bun run benchmarks/team-init.ts --fix              # interactive fix (y/n/a/q per member)
 *   bun run benchmarks/team-init.ts --fix --yes        # auto-apply all fixes (no prompts)
 *   bun run benchmarks/team-init.ts --metrics          # append process metrics with R-score
 *   bun run benchmarks/team-init.ts --metrics --verbose # include per-metric latency column
 *   bun run benchmarks/team-init.ts --console-depth 4  # set inspect depth for this run
 *
 * Configuration (bunfig.toml):
 *   [console]
 *   depth = 4          # persistent inspect depth (overridden by --console-depth)
 *
 * The .benchrc.json file is shared across the team (committed to git).
 */

import * as os from 'os';
import {runRiskDiagnostic} from './diagnostic-risk.ts';

const BENCHRC_PATH = `${import.meta.dir}/../.benchrc.json`;

// ── ANSI helpers (Bun.color for colors, manual for text attributes) ─

const useColor = Bun.enableANSIColors && !!process.stdout.isTTY;
const B = useColor ? '\x1b[1m' : ''; // bold
const D = useColor ? '\x1b[2m' : ''; // dim
const R = useColor ? '\x1b[0m' : ''; // reset
const cRed = useColor ? Bun.color('red', 'ansi') : '';
const cGreen = useColor ? Bun.color('green', 'ansi') : '';
const cYellow = useColor ? Bun.color('yellow', 'ansi') : '';
const cCyan = useColor ? Bun.color('cyan', 'ansi') : '';

// ── Parse CLI args ──────────────────────────────────────────────────

function parseCliArgs(argv: string[]): Record<string, string> {
	const args: Record<string, string> = {};
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === '--check') {
			args.check = 'true';
		} else if (arg === '--fix') {
			args.fix = 'true';
		} else if (arg === '--yes' || arg === '-y') {
			args.yes = 'true';
		} else if (arg === '--metrics') {
			args.metrics = 'true';
		} else if (arg === '--verbose') {
			args.verbose = 'true';
		} else if (arg === '--console-depth' && i + 1 < argv.length) {
			const v = Number(argv[i + 1]);
			if (Number.isInteger(v) && v >= 0) {
				args['console-depth'] = String(v);
			} else {
				console.error(`--console-depth requires a non-negative integer, got "${argv[i + 1]}"`);
				process.exit(1);
			}
			i++;
		} else if (arg.startsWith('--') && i + 1 < argv.length) {
			args[arg.slice(2)] = argv[i + 1];
			i++;
		}
	}
	return args;
}

const cliArgs = parseCliArgs(Bun.argv.slice(2));

// ── Resolve console depth (CLI flag > bunfig.toml > undefined) ──────

async function readBunfigDepth(): Promise<number | undefined> {
	const bunfigPath = `${import.meta.dir}/../bunfig.toml`;
	const file = Bun.file(bunfigPath);
	if (!(await file.exists())) return undefined;
	try {
		const text = await file.text();
		// Look for [console] section, then depth = <number>
		const sectionMatch = text.match(/\[console\]\s*\n((?:[^\[]*\n?)*)/);
		if (!sectionMatch) return undefined;
		const depthMatch = sectionMatch[1].match(/^\s*depth\s*=\s*(\d+)/m);
		if (!depthMatch) return undefined;
		return Number(depthMatch[1]);
	} catch {
		return undefined;
	}
}

const bunfigDepth = await readBunfigDepth();
const consoleDepth: number | undefined =
	cliArgs['console-depth'] != null ? Number(cliArgs['console-depth']) : bunfigDepth;

/** Options object for Bun.inspect.table — includes depth when set */
const inspectOpts: {colors: boolean; depth?: number} = {colors: useColor};
if (consoleDepth != null) inspectOpts.depth = consoleDepth;

// ── Process metrics (--metrics) ─────────────────────────────────────

function printMetrics(): void {
	if (!cliArgs.metrics) return;
	console.log(`\n${B}Process Metrics${R}`);
	runRiskDiagnostic({
		mode: cliArgs.verbose ? 'verbose' : 'default',
		colors: useColor,
	});
}

// ── Interactive stdin (console as AsyncIterable) ────────────────────

const isTTY = !!process.stdin.isTTY;
const autoApply = !!cliArgs.yes;
const noInteraction = !isTTY && !autoApply;

/** Shared stdin iterator — reused across all prompts in a session */
const stdinIter = (console as unknown as AsyncIterable<string>)[Symbol.asyncIterator]();

/**
 * Prompt the user and read a single line via console AsyncIterable.
 * Returns the trimmed, lowercased response. Returns `fallback` on EOF.
 */
async function prompt(msg: string, fallback = ''): Promise<string> {
	console.write(msg);
	const result = await stdinIter.next();
	if (result.done) return fallback;
	return String(result.value).trim().toLowerCase();
}

type FixAction = 'yes' | 'no' | 'all' | 'quit';

/**
 * Ask the user to confirm a fix action.
 * Returns 'yes', 'no', 'all', or 'quit'. Repeats on invalid input.
 */
async function confirmFix(memberKey: string): Promise<FixAction> {
	const hint = `${D}[y]es / [n]o / [a]ll / [q]uit${R}`;
	while (true) {
		const answer = await prompt(`  Apply fixes for ${B}${memberKey}${R}? ${hint}: `);
		switch (answer) {
			case 'y':
			case 'yes':
				return 'yes';
			case 'n':
			case 'no':
				return 'no';
			case 'a':
			case 'all':
				return 'all';
			case 'q':
			case 'quit':
				return 'quit';
			default:
				console.write(`  ${cYellow}Invalid choice "${answer}"${R} — enter y, n, a, or q.\n`);
		}
	}
}

// ── Types ───────────────────────────────────────────────────────────

interface MachineInfo {
	os: string;
	arch: string;
	cpu: string;
	cores: number;
	memory_gb: number;
	bun_version: string;
}

function detectMachine(): MachineInfo {
	const cpuInfo = os.cpus();
	return {
		os: process.platform,
		arch: process.arch,
		cpu: cpuInfo[0]?.model ?? 'unknown',
		cores: cpuInfo.length,
		memory_gb: Math.round(os.totalmem() / 1024 ** 3),
		bun_version: Bun.version,
	};
}

interface MemberProfile {
	name: string;
	email?: string;
	timezone: string;
	notes: string;
	machine: MachineInfo;
}

interface BenchRC {
	team: Record<string, MemberProfile>;
}

// ── Validation ──────────────────────────────────────────────────────

type Severity = 'error' | 'warn';
interface Issue {
	field: string;
	message: string;
	severity: Severity;
	value?: string;
	fix?: string;
}

const VALID_OS = new Set(['darwin', 'linux', 'win32', 'freebsd', 'openbsd', 'sunos', 'aix']);
const VALID_ARCH = new Set(['arm64', 'x64', 'arm', 'ia32', 'ppc64', 's390x', 'riscv64']);

// Valid OS+arch combos (common real-world pairings)
const VALID_OS_ARCH: Record<string, Set<string>> = {
	darwin: new Set(['arm64', 'x64']),
	linux: new Set(['arm64', 'x64', 'arm', 'ia32', 'ppc64', 's390x', 'riscv64']),
	win32: new Set(['x64', 'arm64', 'ia32']),
	freebsd: new Set(['x64', 'arm64']),
	openbsd: new Set(['x64', 'arm64']),
	sunos: new Set(['x64']),
	aix: new Set(['ppc64']),
};

// Known CPU model families for brand recognition
const CPU_FAMILIES: [RegExp, string][] = [
	[/Apple\s+M\d/i, 'Apple Silicon'],
	[/Intel.*Core/i, 'Intel Core'],
	[/Intel.*Xeon/i, 'Intel Xeon'],
	[/AMD.*Ryzen/i, 'AMD Ryzen'],
	[/AMD.*EPYC/i, 'AMD EPYC'],
	[/AMD.*Threadripper/i, 'AMD Threadripper'],
	[/Qualcomm.*Snapdragon/i, 'Qualcomm Snapdragon'],
	[/Ampere.*Altra/i, 'Ampere Altra'],
];

// Common timezone abbreviation → IANA mapping for suggestions
const TZ_ABBREV_MAP: Record<string, string> = {
	EST: 'America/New_York',
	EDT: 'America/New_York',
	CST: 'America/Chicago',
	CDT: 'America/Chicago',
	MST: 'America/Denver',
	MDT: 'America/Denver',
	PST: 'America/Los_Angeles',
	PDT: 'America/Los_Angeles',
	GMT: 'Europe/London',
	BST: 'Europe/London',
	CET: 'Europe/Paris',
	CEST: 'Europe/Paris',
	JST: 'Asia/Tokyo',
	KST: 'Asia/Seoul',
	IST: 'Asia/Kolkata',
	AEST: 'Australia/Sydney',
	AEDT: 'Australia/Sydney',
	NZST: 'Pacific/Auckland',
};

// Disposable email domains
const DISPOSABLE_DOMAINS = new Set([
	'mailinator.com',
	'guerrillamail.com',
	'tempmail.com',
	'throwaway.email',
	'yopmail.com',
	'10minutemail.com',
	'trashmail.com',
	'sharklasers.com',
	'guerrillamailblock.com',
	'grr.la',
	'dispostable.com',
]);

// Placeholder patterns in notes
const PLACEHOLDER_RE = /\b(TODO|FIXME|TBD|PLACEHOLDER|CHANGEME|XXX|HACK|TEMP|WIP|N\/A)\b/i;

// Reserved/system usernames
const RESERVED_USERNAMES = new Set([
	'root',
	'admin',
	'administrator',
	'system',
	'daemon',
	'nobody',
	'guest',
	'test',
	'user',
	'operator',
	'mail',
	'www',
	'ftp',
]);

function titleCase(s: string): string {
	return s
		.split(/\s+/)
		.map(w => (w.length > 0 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
		.join(' ');
}

function fixName(name: string): string {
	let n = name
		.trim()
		.replace(/\s{2,}/g, ' ')
		.normalize('NFC');
	if (n === n.toUpperCase() && n.length > 2) n = titleCase(n);
	const words = n.split(' ');
	n = words.map(w => (w.length > 0 && w[0] !== w[0].toUpperCase() ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
	return n;
}

function validateName(name: string): Issue[] {
	const issues: Issue[] = [];
	if (!name || name.trim().length === 0) {
		issues.push({field: 'name', message: 'name is empty', severity: 'error'});
		return issues;
	}
	if (name !== name.trim()) {
		const fixed = name.trim();
		issues.push({
			field: 'name',
			message: 'name has leading/trailing whitespace',
			severity: 'error',
			value: JSON.stringify(name),
			fix: fixed,
		});
	}
	if (name.length < 2) {
		issues.push({field: 'name', message: 'name is too short (< 2 chars)', severity: 'warn', value: name});
	}
	if (name.length > 64) {
		issues.push({
			field: 'name',
			message: 'name is too long (> 64 chars)',
			severity: 'warn',
			value: `${name.length} chars`,
		});
	}
	if (/\d/.test(name)) {
		issues.push({field: 'name', message: 'name contains digits', severity: 'warn', value: name});
	}
	// Double/multiple internal spaces
	if (/\s{2,}/.test(name)) {
		const fixed = name.replace(/\s{2,}/g, ' ');
		issues.push({
			field: 'name',
			message: 'name has consecutive spaces',
			severity: 'error',
			value: JSON.stringify(name),
			fix: fixed,
		});
	}
	// ALL CAPS detection
	if (name === name.toUpperCase() && name.length > 2) {
		const fixed = titleCase(name);
		issues.push({field: 'name', message: 'name is ALL CAPS', severity: 'warn', value: name, fix: fixed});
	}
	// Unicode normalization: NFC vs NFD mismatch
	if (name !== name.normalize('NFC')) {
		const fixed = name.normalize('NFC');
		issues.push({
			field: 'name',
			message: 'name is not NFC-normalized (may cause comparison issues)',
			severity: 'warn',
			value: name,
			fix: fixed,
		});
	}
	// Check capitalization: each word should start with uppercase
	const words = name.split(/\s+/);
	for (const word of words) {
		if (word.length > 0 && word[0] !== word[0].toUpperCase()) {
			const fixed = words.map(w => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
			issues.push({
				field: 'name',
				message: `word "${word}" not capitalized`,
				severity: 'warn',
				value: name,
				fix: fixed,
			});
			break;
		}
	}
	// Single-character words (initials without period)
	for (const word of words) {
		if (word.length === 1 && !/[.-]/.test(word)) {
			issues.push({
				field: 'name',
				message: `single-char word "${word}" — missing period for initial?`,
				severity: 'warn',
				value: name,
			});
			break;
		}
	}
	// Check for suspicious patterns
	if (/[<>{}[\]|\\^~`]/.test(name)) {
		const fixed = name.replace(/[<>{}[\]|\\^~`]/g, '');
		issues.push({
			field: 'name',
			message: 'name contains unusual characters',
			severity: 'warn',
			value: name,
			fix: fixed,
		});
	}
	// Placeholder/test names
	if (/^(test|unknown|user|name|none|null|undefined|n\/a)$/i.test(name.trim())) {
		issues.push({field: 'name', message: 'name looks like a placeholder', severity: 'error', value: name});
	}
	// Repeated characters (e.g. "aaaa")
	if (/(.)\1{3,}/.test(name)) {
		issues.push({field: 'name', message: 'name has 4+ repeated characters', severity: 'warn', value: name});
	}
	return issues;
}

function fixEmail(email: string): string {
	let e = email.trim().toLowerCase();
	const [local, domain] = [e.split('@')[0], e.split('@')[1]];
	if (!domain) return e;
	const typoMap: Record<string, string> = {
		'gmial.com': 'gmail.com',
		'gamil.com': 'gmail.com',
		'gmal.com': 'gmail.com',
		'gmaill.com': 'gmail.com',
		'gnail.com': 'gmail.com',
		'gmail.co': 'gmail.com',
		'outlok.com': 'outlook.com',
		'outllook.com': 'outlook.com',
		'outlook.co': 'outlook.com',
		'yahooo.com': 'yahoo.com',
		'yaho.com': 'yahoo.com',
		'yahoo.co': 'yahoo.com',
		'hotmal.com': 'hotmail.com',
		'hotmial.com': 'hotmail.com',
		'protonmal.com': 'protonmail.com',
		'protonmai.com': 'protonmail.com',
		'iclould.com': 'icloud.com',
		'icoud.com': 'icloud.com',
	};
	const fixedDomain = typoMap[domain] ?? domain;
	const fixedLocal = local.replace(/\.{2,}/g, '.').replace(/^\.|\.$/g, '');
	return `${fixedLocal}@${fixedDomain}`;
}

function validateEmail(email: string | undefined): Issue[] {
	const issues: Issue[] = [];
	if (email === undefined || email === '') return issues; // optional field
	if (email !== email.trim()) {
		const fixed = email.trim();
		issues.push({
			field: 'email',
			message: 'email has leading/trailing whitespace',
			severity: 'error',
			value: JSON.stringify(email),
			fix: fixed,
		});
	}
	// RFC 5322 simplified: local@domain.tld
	const emailRe =
		/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
	if (!emailRe.test(email)) {
		issues.push({field: 'email', message: 'email format is invalid', severity: 'error', value: email});
		return issues;
	}
	const [local, domain] = [email.split('@')[0], email.split('@')[1]];
	if (!domain.includes('.')) {
		issues.push({field: 'email', message: 'email domain has no TLD', severity: 'error', value: email});
	}
	const tld = domain.split('.').pop() ?? '';
	if (tld.length < 2) {
		issues.push({field: 'email', message: 'email TLD is too short', severity: 'warn', value: email});
	}
	// Consecutive dots in local part
	if (/\.{2,}/.test(local)) {
		const fixed = `${local.replace(/\.{2,}/g, '.')}@${domain}`;
		issues.push({
			field: 'email',
			message: 'local part has consecutive dots',
			severity: 'error',
			value: email,
			fix: fixed,
		});
	}
	// Plus-addressing detection (not an error, just informational)
	if (local.includes('+')) {
		issues.push({
			field: 'email',
			message: 'email uses plus-addressing (may be intentional)',
			severity: 'warn',
			value: email,
		});
	}
	// Local part starts or ends with a dot
	if (local.startsWith('.') || local.endsWith('.')) {
		const fixed = `${local.replace(/^\.|\.$/g, '')}@${domain}`;
		issues.push({
			field: 'email',
			message: 'local part starts/ends with a dot',
			severity: 'error',
			value: email,
			fix: fixed,
		});
	}
	// Mixed case local part (not an error, but unusual for profiles)
	if (local !== local.toLowerCase() && local !== local.toUpperCase()) {
		const fixed = `${local.toLowerCase()}@${domain}`;
		issues.push({
			field: 'email',
			message: 'local part has mixed case (emails are case-insensitive)',
			severity: 'warn',
			value: email,
			fix: fixed,
		});
	}
	// Disposable domain detection
	if (DISPOSABLE_DOMAINS.has(domain.toLowerCase())) {
		issues.push({
			field: 'email',
			message: 'email uses a disposable/temporary domain',
			severity: 'warn',
			value: email,
		});
	}
	// Common typos
	const typoMap: Record<string, string> = {
		'gmial.com': 'gmail.com',
		'gamil.com': 'gmail.com',
		'gmal.com': 'gmail.com',
		'gmaill.com': 'gmail.com',
		'gnail.com': 'gmail.com',
		'gmail.co': 'gmail.com',
		'outlok.com': 'outlook.com',
		'outllook.com': 'outlook.com',
		'outlook.co': 'outlook.com',
		'yahooo.com': 'yahoo.com',
		'yaho.com': 'yahoo.com',
		'yahoo.co': 'yahoo.com',
		'hotmal.com': 'hotmail.com',
		'hotmial.com': 'hotmail.com',
		'protonmal.com': 'protonmail.com',
		'protonmai.com': 'protonmail.com',
		'iclould.com': 'icloud.com',
		'icoud.com': 'icloud.com',
	};
	if (typoMap[domain]) {
		const fixed = `${local}@${typoMap[domain]}`;
		issues.push({
			field: 'email',
			message: `possible typo: "${domain}" → did you mean "${typoMap[domain]}"?`,
			severity: 'warn',
			value: email,
			fix: fixed,
		});
	}
	// Consecutive dots in domain
	if (/\.{2,}/.test(domain)) {
		const fixed = `${local}@${domain.replace(/\.{2,}/g, '.')}`;
		issues.push({
			field: 'email',
			message: 'domain has consecutive dots',
			severity: 'error',
			value: email,
			fix: fixed,
		});
	}
	// Domain starts/ends with hyphen
	if (domain.startsWith('-') || domain.endsWith('-')) {
		issues.push({field: 'email', message: 'domain starts/ends with a hyphen', severity: 'error', value: email});
	}
	return issues;
}

const DEPRECATED_TZ_MAP: Record<string, string> = {
	'US/Eastern': 'America/New_York',
	'US/Central': 'America/Chicago',
	'US/Mountain': 'America/Denver',
	'US/Pacific': 'America/Los_Angeles',
	'US/Hawaii': 'Pacific/Honolulu',
	'US/Alaska': 'America/Anchorage',
	'Canada/Eastern': 'America/Toronto',
	'Canada/Central': 'America/Winnipeg',
	'Canada/Pacific': 'America/Vancouver',
};

function validateTimezone(tz: string): Issue[] {
	const issues: Issue[] = [];
	if (!tz || tz.trim().length === 0) {
		// Auto-detect from runtime as fix
		const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
		issues.push({field: 'timezone', message: 'timezone is empty', severity: 'error', fix: detected});
		return issues;
	}
	if (tz !== tz.trim()) {
		const fixed = tz.trim();
		issues.push({
			field: 'timezone',
			message: 'timezone has leading/trailing whitespace',
			severity: 'error',
			value: JSON.stringify(tz),
			fix: fixed,
		});
	}
	// Detect common abbreviations and suggest IANA equivalents
	if (TZ_ABBREV_MAP[tz.toUpperCase()]) {
		const fixed = TZ_ABBREV_MAP[tz.toUpperCase()];
		issues.push({
			field: 'timezone',
			severity: 'error',
			message: `"${tz}" is an abbreviation — use IANA format: ${fixed}`,
			value: tz,
			fix: fixed,
		});
		return issues;
	}
	// Detect UTC offset format (e.g. "UTC+5", "GMT-8", "+05:30")
	if (/^(UTC|GMT)?[+-]\d{1,2}(:\d{2})?$/.test(tz)) {
		issues.push({
			field: 'timezone',
			severity: 'error',
			message: `"${tz}" is a UTC offset — use IANA format (e.g. America/Chicago)`,
			value: tz,
		});
		return issues;
	}
	// IANA timezone: Region/City or Region/Sub/City
	if (!/^[A-Z][a-zA-Z0-9_]+\/[A-Za-z0-9_/+-]+$/.test(tz) && tz !== 'UTC') {
		issues.push({
			field: 'timezone',
			message: 'timezone is not IANA format (e.g. America/Chicago)',
			severity: 'error',
			value: tz,
		});
		return issues;
	}
	// Verify the runtime accepts it
	try {
		Intl.DateTimeFormat(undefined, {timeZone: tz});
	} catch {
		issues.push({
			field: 'timezone',
			message: 'timezone is not recognized by the runtime',
			severity: 'error',
			value: tz,
		});
	}
	// Deprecated timezones
	if (DEPRECATED_TZ_MAP[tz]) {
		const fixed = DEPRECATED_TZ_MAP[tz];
		issues.push({
			field: 'timezone',
			message: `"${tz}" is a deprecated alias — prefer canonical IANA form`,
			severity: 'warn',
			value: tz,
			fix: fixed,
		});
	}
	return issues;
}

function validateMachine(machine: unknown): Issue[] {
	const issues: Issue[] = [];
	if (!machine || typeof machine !== 'object') {
		issues.push({field: 'machine', message: 'machine is missing or not an object', severity: 'error'});
		return issues;
	}
	const m = machine as Record<string, unknown>;

	// Check for unexpected extra keys
	const validKeys = new Set(['os', 'arch', 'cpu', 'cores', 'memory_gb', 'bun_version']);
	for (const k of Object.keys(m)) {
		if (!validKeys.has(k)) {
			issues.push({
				field: `machine.${k}`,
				message: `unexpected field "${k}" in machine object`,
				severity: 'warn',
				value: String(m[k]),
				fix: `remove:machine.${k}`,
			});
		}
	}

	// os
	if (typeof m.os !== 'string') {
		issues.push({field: 'machine.os', message: 'os is missing or not a string', severity: 'error'});
	} else if (!VALID_OS.has(m.os)) {
		issues.push({field: 'machine.os', message: `unrecognized os value`, severity: 'warn', value: m.os});
	}

	// arch
	if (typeof m.arch !== 'string') {
		issues.push({field: 'machine.arch', message: 'arch is missing or not a string', severity: 'error'});
	} else if (!VALID_ARCH.has(m.arch)) {
		issues.push({field: 'machine.arch', message: `unrecognized arch value`, severity: 'warn', value: m.arch});
	}

	// OS+arch combo validation
	if (typeof m.os === 'string' && typeof m.arch === 'string' && VALID_OS.has(m.os) && VALID_ARCH.has(m.arch)) {
		const allowed = VALID_OS_ARCH[m.os];
		if (allowed && !allowed.has(m.arch)) {
			issues.push({
				field: 'machine.os+arch',
				message: `unusual combo: ${m.os}/${m.arch}`,
				severity: 'warn',
				value: `${m.os} ${m.arch}`,
			});
		}
	}

	// cpu
	if (typeof m.cpu !== 'string') {
		issues.push({field: 'machine.cpu', message: 'cpu is missing or not a string', severity: 'error'});
	} else {
		if (m.cpu.length < 3) {
			issues.push({field: 'machine.cpu', message: 'cpu description too short', severity: 'warn', value: m.cpu});
		}
		if (/^unknown$/i.test(m.cpu)) {
			issues.push({
				field: 'machine.cpu',
				message: 'cpu is "unknown" — detection may have failed',
				severity: 'warn',
				value: m.cpu,
			});
		}
		// Recognize known CPU families
		const family = CPU_FAMILIES.find(([re]) => re.test(m.cpu as string));
		if (!family && m.cpu.length >= 3 && !/unknown/i.test(m.cpu)) {
			issues.push({
				field: 'machine.cpu',
				message: 'cpu model not from a recognized family (Apple/Intel/AMD/Qualcomm/Ampere)',
				severity: 'warn',
				value: m.cpu,
			});
		}
		// Apple Silicon on non-darwin
		if (/Apple\s+M\d/i.test(m.cpu) && typeof m.os === 'string' && m.os !== 'darwin') {
			issues.push({
				field: 'machine.cpu',
				message: `Apple Silicon CPU on non-darwin OS "${m.os}"`,
				severity: 'warn',
				value: `${m.cpu} on ${m.os}`,
			});
		}
	}

	// cores
	if (typeof m.cores !== 'number') {
		issues.push({field: 'machine.cores', message: 'cores is missing or not a number', severity: 'error'});
	} else if (!Number.isInteger(m.cores) || m.cores < 1) {
		issues.push({
			field: 'machine.cores',
			message: 'cores must be a positive integer',
			severity: 'error',
			value: String(m.cores),
		});
	} else if (m.cores > 256) {
		issues.push({
			field: 'machine.cores',
			message: 'cores value seems unusually high',
			severity: 'warn',
			value: String(m.cores),
		});
	}

	// memory_gb
	if (typeof m.memory_gb !== 'number') {
		issues.push({field: 'machine.memory_gb', message: 'memory_gb is missing or not a number', severity: 'error'});
	} else if (m.memory_gb < 1) {
		issues.push({
			field: 'machine.memory_gb',
			message: 'memory_gb must be >= 1',
			severity: 'error',
			value: String(m.memory_gb),
		});
	} else if (m.memory_gb > 2048) {
		issues.push({
			field: 'machine.memory_gb',
			message: 'memory_gb value seems unusually high',
			severity: 'warn',
			value: String(m.memory_gb),
		});
	} else {
		// Power-of-2 check (common RAM sizes: 4, 8, 16, 32, 64, 96, 128, 192, 256, ...)
		const commonSizes = [4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256, 384, 512, 768, 1024, 1536, 2048];
		const commonSet = new Set(commonSizes);
		if (!commonSet.has(m.memory_gb)) {
			const nearest = commonSizes.reduce((a, b) =>
				Math.abs(b - (m.memory_gb as number)) < Math.abs(a - (m.memory_gb as number)) ? b : a,
			);
			issues.push({
				field: 'machine.memory_gb',
				message: `${m.memory_gb} GB is not a common RAM size — rounding error?`,
				severity: 'warn',
				value: `${m.memory_gb} GB`,
				fix: String(nearest),
			});
		}
	}

	// bun_version
	if (typeof m.bun_version !== 'string') {
		issues.push({
			field: 'machine.bun_version',
			message: 'bun_version is missing or not a string',
			severity: 'error',
		});
	} else if (!/^\d+\.\d+\.\d+/.test(m.bun_version)) {
		issues.push({
			field: 'machine.bun_version',
			message: "bun_version doesn't look like semver",
			severity: 'warn',
			value: m.bun_version,
		});
	} else {
		// Staleness check: compare major.minor against current runtime
		const [profMajor, profMinor] = m.bun_version.split('.').map(Number);
		const [curMajor, curMinor] = Bun.version.split('.').map(Number);
		if (profMajor < curMajor || (profMajor === curMajor && profMinor < curMinor - 2)) {
			issues.push({
				field: 'machine.bun_version',
				severity: 'warn',
				message: `profile has ${m.bun_version}, current runtime is ${Bun.version} — consider updating`,
				value: `${m.bun_version} → ${Bun.version}`,
				fix: Bun.version,
			});
		}
		// Pre-release or canary tags
		if (/-(canary|nightly|dev|alpha|beta|rc)/.test(m.bun_version)) {
			issues.push({
				field: 'machine.bun_version',
				message: 'bun_version contains a pre-release tag',
				severity: 'warn',
				value: m.bun_version,
			});
		}
	}

	return issues;
}

function validateUsername(key: string): Issue[] {
	const issues: Issue[] = [];
	if (!key || key.trim().length === 0) {
		issues.push({field: 'username (key)', message: 'username key is empty', severity: 'error'});
		return issues;
	}
	if (key !== key.toLowerCase()) {
		issues.push({
			field: 'username (key)',
			message: 'username key should be lowercase',
			severity: 'warn',
			value: key,
		});
	}
	if (/\s/.test(key)) {
		issues.push({
			field: 'username (key)',
			message: 'username key contains whitespace',
			severity: 'error',
			value: JSON.stringify(key),
		});
	}
	if (key.length > 32) {
		issues.push({
			field: 'username (key)',
			message: 'username key is too long (> 32 chars)',
			severity: 'warn',
			value: `${key.length} chars`,
		});
	}
	if (key.length < 2) {
		issues.push({
			field: 'username (key)',
			message: 'username key is very short (< 2 chars)',
			severity: 'warn',
			value: key,
		});
	}
	// Reserved/system usernames
	if (RESERVED_USERNAMES.has(key.toLowerCase())) {
		issues.push({
			field: 'username (key)',
			message: `"${key}" is a reserved/system username`,
			severity: 'warn',
			value: key,
		});
	}
	// Only allow alphanumeric, hyphen, underscore, dot
	if (!/^[a-zA-Z0-9._-]+$/.test(key)) {
		issues.push({
			field: 'username (key)',
			message: 'username contains invalid characters (allow: a-z 0-9 . _ -)',
			severity: 'error',
			value: key,
		});
	}
	// Starts/ends with special char
	if (/^[._-]|[._-]$/.test(key)) {
		issues.push({
			field: 'username (key)',
			message: 'username starts/ends with a special character',
			severity: 'warn',
			value: key,
		});
	}
	// Consecutive special chars
	if (/[._-]{2,}/.test(key)) {
		issues.push({
			field: 'username (key)',
			message: 'username has consecutive special characters',
			severity: 'warn',
			value: key,
		});
	}
	return issues;
}

function validateNotes(notes: string): Issue[] {
	const issues: Issue[] = [];
	if (typeof notes !== 'string') {
		issues.push({field: 'notes', message: 'notes is not a string', severity: 'error'});
		return issues;
	}
	if (notes.length > 200) {
		issues.push({
			field: 'notes',
			message: 'notes is very long (> 200 chars)',
			severity: 'warn',
			value: `${notes.length} chars`,
		});
	}
	// Placeholder patterns
	const placeholderMatch = notes.match(PLACEHOLDER_RE);
	if (placeholderMatch) {
		issues.push({
			field: 'notes',
			message: `notes contains placeholder "${placeholderMatch[0]}"`,
			severity: 'warn',
			value: notes,
		});
	}
	// Control characters (except newline/tab)
	if (/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(notes)) {
		const fixed = notes.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
		issues.push({
			field: 'notes',
			message: 'notes contains control characters',
			severity: 'error',
			value: JSON.stringify(notes),
			fix: fixed,
		});
	}
	// Trailing whitespace on any line
	if (notes !== notes.trimEnd()) {
		const fixed = notes.trimEnd();
		issues.push({
			field: 'notes',
			message: 'notes has trailing whitespace',
			severity: 'warn',
			value: JSON.stringify(notes),
			fix: fixed,
		});
	}
	return issues;
}

function validateProfile(key: string, profile: MemberProfile): Issue[] {
	return [
		...validateUsername(key),
		...validateName(profile.name),
		...validateEmail(profile.email),
		...validateTimezone(profile.timezone),
		...validateNotes(profile.notes),
		...validateMachine(profile.machine),
	];
}

// Levenshtein distance for near-duplicate detection
function levenshtein(a: string, b: string): number {
	const m = a.length,
		n = b.length;
	const dp: number[][] = Array.from({length: m + 1}, () => Array(n + 1).fill(0));
	for (let i = 0; i <= m; i++) dp[i][0] = i;
	for (let j = 0; j <= n; j++) dp[0][j] = j;
	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			dp[i][j] =
				a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
		}
	}
	return dp[m][n];
}

function validateCrossProfile(team: Record<string, MemberProfile>): Issue[] {
	const issues: Issue[] = [];
	const keys = Object.keys(team);

	// Duplicate display names
	const nameMap = new Map<string, string[]>();
	for (const k of keys) {
		const norm = team[k].name.toLowerCase().trim();
		if (!nameMap.has(norm)) nameMap.set(norm, []);
		nameMap.get(norm)!.push(k);
	}
	for (const [name, owners] of nameMap) {
		if (owners.length > 1) {
			issues.push({
				field: 'cross-profile',
				message: `duplicate display name "${name}"`,
				severity: 'warn',
				value: owners.join(', '),
			});
		}
	}

	// Duplicate emails
	const emailMap = new Map<string, string[]>();
	for (const k of keys) {
		const email = team[k].email?.toLowerCase().trim();
		if (email) {
			if (!emailMap.has(email)) emailMap.set(email, []);
			emailMap.get(email)!.push(k);
		}
	}
	for (const [email, owners] of emailMap) {
		if (owners.length > 1) {
			issues.push({
				field: 'cross-profile',
				message: `duplicate email "${email}"`,
				severity: 'error',
				value: owners.join(', '),
			});
		}
	}

	// Near-duplicate usernames (Levenshtein ≤ 1, excluding self)
	for (let i = 0; i < keys.length; i++) {
		for (let j = i + 1; j < keys.length; j++) {
			const dist = levenshtein(keys[i], keys[j]);
			if (dist === 1) {
				issues.push({
					field: 'cross-profile',
					message: `similar usernames: "${keys[i]}" ↔ "${keys[j]}" (edit distance: 1)`,
					severity: 'warn',
				});
			}
		}
	}

	// Identical machine configs
	for (let i = 0; i < keys.length; i++) {
		for (let j = i + 1; j < keys.length; j++) {
			if (Bun.deepEquals(team[keys[i]].machine, team[keys[j]].machine)) {
				issues.push({
					field: 'cross-profile',
					message: `identical machine config: "${keys[i]}" ↔ "${keys[j]}"`,
					severity: 'warn',
					value: `${team[keys[i]].machine.cpu}, ${team[keys[i]].machine.cores} cores`,
				});
			}
		}
	}

	return issues;
}

// ── Column schema validation ─────────────────────────────────────────

// Known abbreviations/symbols that are valid as-is (no title-case needed)
const HEADER_EXCEPTIONS = new Set(['#', 'WS', 'CWD', 'Δ']);

// Known intentional key↔header aliases (key → acceptable header stems)
const KEY_HEADER_ALIASES: Record<string, string[]> = {
	folder: ['project', 'dir', 'directory', 'path'],
	idx: ['#', 'index', 'no'],
	cwd: ['cwd', 'directory', 'path'],
};

// Required column properties and their expected types
const COLUMN_REQUIRED_PROPS: [string, string][] = [
	['key', 'string'],
	['header', 'string'],
	['width', 'number'],
];

// Boolean key prefixes (key starts with these → default should be boolean-like)
const BOOL_KEY_PREFIXES = ['is', 'has', 'can', 'should', 'enable', 'disable', 'allow', 'no'];

// Classify a default value into a type category
function classifyDefault(val: unknown): string {
	if (typeof val === 'function') return 'function';
	if (typeof val === 'boolean') return 'boolean';
	if (typeof val === 'number') return 'number';
	if (typeof val === 'string') return 'string';
	if (val === null) return 'null';
	if (val === undefined) return 'undefined';
	return typeof val;
}

interface ColumnMetrics {
	tables: number;
	columns: number;
	invalidTables: number;
	invalidEntries: number;
	guardErrors: number;
	propErrors: number;
	widthIssues: number;
	defaultIssues: number;
	coherenceWarnings: number;
	crossTableDupes: number;
}

function validateColumns(
	schema: Record<string, readonly {key: string; header: string; width: number; default: unknown}[]>,
): {issues: Issue[]; metrics: ColumnMetrics} {
	const issues: Issue[] = [];
	const globalKeys = new Map<string, string>(); // key → tableName (for cross-table dupe detection)
	const metrics: ColumnMetrics = {
		tables: 0,
		columns: 0,
		invalidTables: 0,
		invalidEntries: 0,
		guardErrors: 0,
		propErrors: 0,
		widthIssues: 0,
		defaultIssues: 0,
		coherenceWarnings: 0,
		crossTableDupes: 0,
	};

	for (const [tableName, columns] of Object.entries(schema)) {
		metrics.tables++;

		// ── table-level guards ──
		if (!Array.isArray(columns)) {
			metrics.invalidTables++;
			metrics.guardErrors++;
			issues.push({
				field: tableName,
				message: `table value is ${typeof columns}, expected array`,
				severity: 'error',
				value: String(columns),
			});
			continue;
		}
		if (columns.length === 0) {
			issues.push({field: tableName, message: 'table has no columns', severity: 'warn'});
			continue;
		}

		const seenKeys = new Set<string>();
		const seenHeaders = new Set<string>();
		const defaultTypes = new Map<string, {type: string; key: string; index: number}[]>(); // type → [{key, index}]

		for (let i = 0; i < columns.length; i++) {
			const raw = columns[i];
			const prefix = `${tableName}[${i}]`;
			metrics.columns++;

			// ── entry-level guard ──
			if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
				metrics.invalidEntries++;
				metrics.guardErrors++;
				issues.push({
					field: prefix,
					message: `column entry is ${raw === null ? 'null' : Array.isArray(raw) ? 'array' : typeof raw}, expected object`,
					severity: 'error',
					value: String(raw),
				});
				continue;
			}
			const col = raw as Record<string, unknown>;

			// ── required property checks ──
			for (const [prop, expectedType] of COLUMN_REQUIRED_PROPS) {
				if (!(prop in col)) {
					metrics.propErrors++;
					issues.push({
						field: `${prefix}`,
						message: `missing required property "${prop}"`,
						severity: 'error',
					});
				} else if (typeof col[prop] !== expectedType) {
					metrics.propErrors++;
					issues.push({
						field: `${prefix}.${prop}`,
						message: `"${prop}" should be ${expectedType}, got ${typeof col[prop]}`,
						severity: 'error',
						value: String(col[prop]),
					});
				}
			}

			// Check for unknown/extra properties
			const knownProps = new Set(['key', 'header', 'width', 'default']);
			for (const prop of Object.keys(col)) {
				if (!knownProps.has(prop)) {
					metrics.propErrors++;
					issues.push({
						field: `${prefix}.${prop}`,
						message: `unexpected property "${prop}" on column definition`,
						severity: 'warn',
						value: String(col[prop]),
					});
				}
			}

			// 'default' must be present (even if falsy)
			if (!('default' in col)) {
				issues.push({
					field: `${prefix}`,
					message: 'missing "default" property',
					severity: 'error',
				});
			} else if (col.default === undefined) {
				issues.push({
					field: `${prefix}.default`,
					message: 'default is undefined — use an explicit value',
					severity: 'error',
				});
			}

			// ── key checks ──
			if (!col.key || col.key.trim().length === 0) {
				issues.push({field: `${prefix}.key`, message: 'key is empty', severity: 'error'});
			} else {
				// camelCase check
				if (/[A-Z]/.test(col.key[0])) {
					const fixed = col.key[0].toLowerCase() + col.key.slice(1);
					issues.push({
						field: `${prefix}.key`,
						message: `key "${col.key}" starts with uppercase — use camelCase`,
						severity: 'warn',
						value: col.key,
						fix: fixed,
					});
				}
				if (/[\s-]/.test(col.key)) {
					const fixed = col.key.replace(/[\s-]+(.)/g, (_, c: string) => c.toUpperCase());
					issues.push({
						field: `${prefix}.key`,
						message: `key "${col.key}" has spaces/hyphens — use camelCase`,
						severity: 'error',
						value: col.key,
						fix: fixed,
					});
				}
				// Duplicate key
				if (seenKeys.has(col.key)) {
					issues.push({
						field: `${prefix}.key`,
						message: `duplicate key "${col.key}" in ${tableName}`,
						severity: 'error',
						value: col.key,
					});
				}
				seenKeys.add(col.key);
			}

			// ── header checks ──
			if (!col.header || col.header.trim().length === 0) {
				issues.push({field: `${prefix}.header`, message: 'header is empty', severity: 'error'});
			} else if (!HEADER_EXCEPTIONS.has(col.header) && !col.header.includes('Δ')) {
				// Leading/trailing whitespace
				if (col.header !== col.header.trim()) {
					const fixed = col.header.trim();
					issues.push({
						field: `${prefix}.header`,
						message: `header has leading/trailing whitespace`,
						severity: 'error',
						value: JSON.stringify(col.header),
						fix: fixed,
					});
				}
				// Double spaces
				if (/\s{2,}/.test(col.header)) {
					const fixed = col.header.replace(/\s{2,}/g, ' ');
					issues.push({
						field: `${prefix}.header`,
						message: `header has consecutive spaces`,
						severity: 'error',
						value: JSON.stringify(col.header),
						fix: fixed,
					});
				}
				// Title Case: first letter of each word should be uppercase (unless it's a short preposition/article mid-header)
				const skipWords = new Set([
					'a',
					'an',
					'the',
					'of',
					'in',
					'on',
					'at',
					'to',
					'for',
					'and',
					'or',
					'but',
					'is',
					'vs',
				]);
				const words = col.header.split(/\s+/);
				const fixedWords: string[] = [];
				let needsFix = false;
				for (let w = 0; w < words.length; w++) {
					const word = words[w];
					// Allow all-uppercase short words (abbreviations like "CWD", "WS", "ms")
					if (word === word.toUpperCase() && word.length <= 4) {
						fixedWords.push(word);
						continue;
					}
					// Allow parenthesized content as-is
					if (word.startsWith('(')) {
						fixedWords.push(word);
						continue;
					}
					// Skip words in mid-position (not first)
					if (w > 0 && skipWords.has(word.toLowerCase())) {
						fixedWords.push(word.toLowerCase());
						if (word !== word.toLowerCase()) needsFix = true;
						continue;
					}
					// First letter should be uppercase
					if (word.length > 0 && word[0] !== word[0].toUpperCase()) {
						fixedWords.push(word[0].toUpperCase() + word.slice(1));
						needsFix = true;
					} else {
						fixedWords.push(word);
					}
				}
				if (needsFix) {
					const fixed = fixedWords.join(' ');
					issues.push({
						field: `${prefix}.header`,
						message: `header "${col.header}" not in Title Case`,
						severity: 'warn',
						value: col.header,
						fix: fixed,
					});
				}
				// Duplicate header within same table
				if (seenHeaders.has(col.header.toLowerCase())) {
					issues.push({
						field: `${prefix}.header`,
						message: `duplicate header "${col.header}" in ${tableName}`,
						severity: 'warn',
						value: col.header,
					});
				}
				seenHeaders.add(col.header.toLowerCase());
			}

			// ── width checks ──
			if (typeof col.width !== 'number' || col.width < 1) {
				metrics.widthIssues++;
				issues.push({
					field: `${prefix}.width`,
					message: 'width must be a positive number',
					severity: 'error',
					value: String(col.width),
				});
			} else if (col.header) {
				const visibleWidth = Bun.stringWidth(col.header);
				if (visibleWidth > col.width) {
					metrics.widthIssues++;
					const fixed = String(visibleWidth + 2);
					issues.push({
						field: `${prefix}.width`,
						message: `width ${col.width} is narrower than header "${col.header}" (${visibleWidth} visible chars)`,
						severity: 'warn',
						value: `${col.width} < ${visibleWidth}`,
						fix: fixed,
					});
				}
			}

			// ── default value type checks ──
			if ('default' in col && col.default !== undefined) {
				const dType = classifyDefault(col.default);

				// Track type distribution for consistency check
				if (!defaultTypes.has(dType)) defaultTypes.set(dType, []);
				defaultTypes.get(dType)!.push({type: dType, key: String(col.key), index: i});

				// String default exceeding column width
				if (typeof col.default === 'string' && typeof col.width === 'number') {
					const defaultVisible = Bun.stringWidth(col.default);
					if (defaultVisible > col.width && col.default !== '-') {
						metrics.defaultIssues++;
						issues.push({
							field: `${prefix}.default`,
							message: `default "${col.default}" (${defaultVisible} chars) exceeds width ${col.width}`,
							severity: 'warn',
							value: `${defaultVisible} > ${col.width}`,
						});
					}
				}

				// Boolean key naming convention
				if (typeof col.key === 'string') {
					const keyLower = col.key.toLowerCase();
					const looksBoolean = BOOL_KEY_PREFIXES.some(
						p =>
							keyLower.startsWith(p) &&
							keyLower.length > p.length &&
							col.key[p.length] === col.key[p.length].toUpperCase(),
					);
					if (
						looksBoolean &&
						typeof col.default !== 'boolean' &&
						col.default !== 'true' &&
						col.default !== 'false' &&
						col.default !== '-'
					) {
						metrics.defaultIssues++;
						issues.push({
							field: `${prefix}.default`,
							message: `key "${col.key}" looks boolean but default is ${dType}: ${JSON.stringify(col.default)}`,
							severity: 'warn',
							value: `${col.key} → ${dType}`,
						});
					}
				}
			}

			// ── cross-table duplicate key ──
			if (typeof col.key === 'string' && col.key.length > 0) {
				const existing = globalKeys.get(col.key);
				if (existing && existing !== tableName) {
					metrics.crossTableDupes++;
					issues.push({
						field: `${prefix}.key`,
						message: `key "${col.key}" also exists in ${existing}`,
						severity: 'warn',
						value: `${existing} ↔ ${tableName}`,
					});
				}
				globalKeys.set(col.key, tableName);
			}

			// ── key↔header coherence ──
			// key "fooBar" should loosely relate to header (not a mismatch like key="name" header="Timestamp")
			// Skip short headers (≤ 3 chars) — often abbreviations ("Ver", "WS", "Bun")
			if (
				col.key &&
				col.header &&
				col.header.length > 3 &&
				!HEADER_EXCEPTIONS.has(col.header) &&
				!col.header.includes('Δ')
			) {
				// Check known aliases first
				const aliases = KEY_HEADER_ALIASES[col.key];
				const headerLower = col.header.toLowerCase();
				const aliasMatch = aliases?.some(a => headerLower.includes(a));

				if (!aliasMatch) {
					const keyWords = col.key
						.replace(/([A-Z])/g, ' $1')
						.toLowerCase()
						.split(/\s+/)
						.filter(Boolean);
					const headerWords = headerLower
						.replace(/[^a-z\s]/g, '')
						.split(/\s+/)
						.filter(Boolean);
					const keySet = new Set(keyWords.map(w => w.slice(0, 4))); // first 4 chars as stem
					const headerSet = new Set(headerWords.map(w => w.slice(0, 4)));
					const overlap = [...keySet].some(s => headerSet.has(s));
					if (!overlap && keyWords.length > 0 && headerWords.length > 0) {
						metrics.coherenceWarnings++;
						issues.push({
							field: `${prefix}`,
							message: `key "${col.key}" doesn't match header "${col.header}" — possible mismatch`,
							severity: 'warn',
						});
					}
				}
			}
		}

		// ── per-table type consistency ──
		// Flag if defaults mix incompatible types (e.g. some strings, some numbers) without functions
		const typeGroups = [...defaultTypes.entries()].filter(([t]) => t !== 'function');
		if (typeGroups.length > 2) {
			const typeSummary = typeGroups.map(([t, cols]) => `${t}(${cols.length})`).join(', ');
			issues.push({
				field: `${tableName}`,
				message: `defaults use ${typeGroups.length} different types: ${typeSummary} — consider normalizing`,
				severity: 'warn',
			});
		}
	}

	return {issues, metrics};
}

function printIssues(
	memberKey: string,
	issues: Issue[],
	showFix = false,
): {errors: number; warnings: number; fixable: number} {
	let errors = 0;
	let warnings = 0;
	let fixable = 0;
	for (const issue of issues) {
		const fixTag = issue.fix ? ` ${cCyan}→ ${issue.fix}${R}` : '';
		if (issue.fix) fixable++;
		if (issue.severity === 'error') {
			errors++;
			console.log(
				`    ${cRed}error${R}  ${issue.field}: ${issue.message}${issue.value ? ` ${D}[${issue.value}]${R}` : ''}${showFix ? fixTag : ''}`,
			);
		} else {
			warnings++;
			console.log(
				`    ${cYellow}warn${R}   ${issue.field}: ${issue.message}${issue.value ? ` ${D}[${issue.value}]${R}` : ''}${showFix ? fixTag : ''}`,
			);
		}
	}
	return {errors, warnings, fixable};
}

// ── Load existing .benchrc.json ─────────────────────────────────────

let benchrc: BenchRC = {team: {}};

const benchrcFile = Bun.file(BENCHRC_PATH);
if (await benchrcFile.exists()) {
	try {
		benchrc = (await benchrcFile.json()) as BenchRC;
		if (!benchrc.team) benchrc.team = {};
	} catch {
		benchrc = {team: {}};
	}
}

// ── Check mode ──────────────────────────────────────────────────────

if (cliArgs.check) {
	console.log(`${B}Validating .benchrc.json${R}\n`);

	const teamKeys = Object.keys(benchrc.team);
	if (teamKeys.length === 0) {
		console.log(`  ${cYellow}No team members found.${R}`);
		process.exit(0);
	}

	let totalErrors = 0;
	let totalWarnings = 0;

	for (const key of teamKeys) {
		const profile = benchrc.team[key];
		const issues = validateProfile(key, profile);
		const icon = issues.some(i => i.severity === 'error')
			? `${cRed}✗${R}`
			: issues.length > 0
				? `${cYellow}~${R}`
				: `${cGreen}✓${R}`;
		console.log(`  ${icon} ${B}${key}${R} ${D}(${profile.name})${R}`);

		if (issues.length === 0) {
			console.log(`    ${cGreen}all checks passed${R}`);
		} else {
			const {errors, warnings} = printIssues(key, issues);
			totalErrors += errors;
			totalWarnings += warnings;
		}
		console.log();
	}

	// Machine drift detection (current machine vs stored profile)
	const currentUser = Bun.env.USER ?? 'unknown';
	const storedProfile = benchrc.team[currentUser];
	if (storedProfile?.machine) {
		const currentMachine = detectMachine();
		if (!Bun.deepEquals(storedProfile.machine, currentMachine)) {
			console.log(`  ${cYellow}~${R} ${B}${currentUser}${R} machine drift detected:`);
			for (const k of Object.keys(currentMachine) as (keyof MachineInfo)[]) {
				if (!Bun.deepEquals((storedProfile.machine as any)[k], currentMachine[k])) {
					console.log(`    ${k}: ${D}${(storedProfile.machine as any)[k]}${R} → ${currentMachine[k]}`);
				}
			}
			totalWarnings++;
			console.log();
		}
	}

	// Cross-profile checks
	if (teamKeys.length > 1) {
		const crossIssues = validateCrossProfile(benchrc.team);
		if (crossIssues.length > 0) {
			console.log(`  ${B}Cross-profile checks${R}`);
			const {errors, warnings} = printIssues('(team)', crossIssues);
			totalErrors += errors;
			totalWarnings += warnings;
			console.log();
		}
	}

	// Column schema checks
	let colMetrics: ColumnMetrics | null = null;
	try {
		const {BUN_SCANNER_COLUMNS} = await import('../scan-columns.ts');
		const {issues: colIssues, metrics: cm} = validateColumns(BUN_SCANNER_COLUMNS as any);
		colMetrics = cm;
		if (colIssues.length > 0) {
			const colIcon = colIssues.some(i => i.severity === 'error') ? `${cRed}✗${R}` : `${cYellow}~${R}`;
			console.log(`  ${colIcon} ${B}scan-columns.ts${R} ${D}(${cm.tables} tables, ${cm.columns} columns)${R}`);
			const {errors, warnings} = printIssues('columns', colIssues);
			totalErrors += errors;
			totalWarnings += warnings;
			console.log();
		} else {
			console.log(
				`  ${cGreen}✓${R} ${B}scan-columns.ts${R} — all column checks passed ${D}(${cm.tables} tables, ${cm.columns} columns)${R}\n`,
			);
		}
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		console.log(`  ${cYellow}~${R} ${B}scan-columns.ts${R} — import failed: ${msg}\n`);
	}

	// Summary table
	const summaryRows = [
		{Field: 'Members', Value: String(teamKeys.length)},
		{Field: 'Errors', Value: totalErrors > 0 ? `${totalErrors}` : '0'},
		{Field: 'Warnings', Value: totalWarnings > 0 ? `${totalWarnings}` : '0'},
		...(colMetrics
			? [
					{Field: 'Tables', Value: String(colMetrics.tables)},
					{Field: 'Columns', Value: String(colMetrics.columns)},
					...(colMetrics.guardErrors > 0
						? [{Field: 'Guard errors', Value: `${colMetrics.guardErrors}`}]
						: []),
					...(colMetrics.propErrors > 0 ? [{Field: 'Prop errors', Value: `${colMetrics.propErrors}`}] : []),
					...(colMetrics.widthIssues > 0
						? [{Field: 'Width issues', Value: `${colMetrics.widthIssues}`}]
						: []),
					...(colMetrics.defaultIssues > 0
						? [{Field: 'Default issues', Value: `${colMetrics.defaultIssues}`}]
						: []),
					...(colMetrics.coherenceWarnings > 0
						? [{Field: 'Coherence', Value: `${colMetrics.coherenceWarnings}`}]
						: []),
					...(colMetrics.crossTableDupes > 0
						? [{Field: 'Cross-table dupes', Value: `${colMetrics.crossTableDupes}`}]
						: []),
				]
			: []),
		{Field: 'Status', Value: totalErrors > 0 ? 'FAIL' : totalWarnings > 0 ? 'PASS (with warnings)' : 'PASS'},
	];
	// @ts-expect-error Bun.inspect.table accepts options as third arg
	console.log(Bun.inspect.table(summaryRows, ['Field', 'Value'], inspectOpts));

	printMetrics();
	process.exit(totalErrors > 0 ? 1 : 0);
}

// ── Fix mode ─────────────────────────────────────────────────────────

function applyFixes(key: string, profile: MemberProfile, issues: Issue[]): {applied: string[]; profile: MemberProfile} {
	const applied: string[] = [];
	const p = {...profile, machine: {...profile.machine}};

	for (const issue of issues) {
		if (!issue.fix) continue;

		// Remove unexpected machine fields
		if (issue.fix.startsWith('remove:machine.')) {
			const k = issue.fix.slice('remove:machine.'.length);
			delete (p.machine as Record<string, unknown>)[k];
			applied.push(`removed machine.${k}`);
			continue;
		}

		switch (issue.field) {
			case 'name':
				p.name = fixName(p.name);
				applied.push(`name → "${p.name}"`);
				break;
			case 'email':
				p.email = fixEmail(p.email ?? '');
				applied.push(`email → "${p.email}"`);
				break;
			case 'timezone':
				p.timezone = issue.fix;
				applied.push(`timezone → "${p.timezone}"`);
				break;
			case 'notes':
				p.notes = issue.fix;
				applied.push(`notes trimmed/cleaned`);
				break;
			case 'machine.memory_gb':
				p.machine.memory_gb = Number(issue.fix);
				applied.push(`memory_gb → ${issue.fix}`);
				break;
			case 'machine.bun_version':
				p.machine.bun_version = issue.fix;
				applied.push(`bun_version → "${issue.fix}"`);
				break;
		}
	}

	// Deduplicate applied messages (multiple name issues → one fix)
	return {applied: [...new Set(applied)], profile: p};
}

if (cliArgs.fix) {
	console.log(`${B}Auto-fixing .benchrc.json${R}\n`);

	const teamKeys = Object.keys(benchrc.team);
	if (teamKeys.length === 0) {
		console.log(`  ${cYellow}No team members found.${R}`);
		process.exit(0);
	}

	let totalFixed = 0;
	let totalUnfixable = 0;
	let totalSkipped = 0;
	let applyAll = autoApply; // --yes → auto-apply, else prompt

	if (noInteraction) {
		console.log(`  ${D}(non-interactive stdin — use --yes to auto-apply, or run in a terminal)${R}\n`);
	}

	for (const key of teamKeys) {
		const profile = benchrc.team[key];
		const issues = validateProfile(key, profile);

		if (issues.length === 0) {
			console.log(`  ${cGreen}✓${R} ${B}${key}${R} — no issues`);
			continue;
		}

		const fixable = issues.filter(i => i.fix);
		const unfixable = issues.filter(i => !i.fix);

		// Show what we found and what we'll fix
		console.log(`  ${cCyan}⚡${R} ${B}${key}${R} ${D}(${issues.length} issues, ${fixable.length} fixable)${R}`);
		printIssues(key, issues, true);

		if (fixable.length > 0) {
			// Preview proposed fixes before prompting
			for (const issue of fixable) {
				console.log(`    ${cCyan}would fix${R}  ${issue.field}: ${issue.fix}`);
			}

			let apply = applyAll;
			if (!apply && noInteraction) {
				// Can't prompt — skip
				totalSkipped += fixable.length;
				console.log(`    ${D}skipped (non-interactive)${R}`);
			} else if (!apply) {
				const action = await confirmFix(key);
				switch (action) {
					case 'yes':
						apply = true;
						break;
					case 'all':
						apply = true;
						applyAll = true;
						break;
					case 'quit':
						console.log(`\n  ${D}Quit — no changes written.${R}\n`);
						process.exit(0);
					case 'no':
						totalSkipped += fixable.length;
						console.log(`    ${D}skipped${R}`);
				}
			}

			if (apply) {
				const {applied, profile: fixed} = applyFixes(key, profile, issues);
				benchrc.team[key] = fixed;
				totalFixed += applied.length;
				for (const a of applied) {
					console.log(`    ${cGreen}fixed${R}  ${a}`);
				}
			}
		}

		totalUnfixable += unfixable.length;
		console.log();
	}

	// Write
	if (totalFixed > 0) {
		await Bun.write(BENCHRC_PATH, JSON.stringify(benchrc, null, 2) + '\n');
	}

	// Verify after fixes
	let remainingIssues = 0;
	for (const key of teamKeys) {
		remainingIssues += validateProfile(key, benchrc.team[key]).length;
	}

	// Column schema checks (report-only in fix mode — source code, not JSON)
	let colWarnings = 0;
	let colMetrics: ColumnMetrics | null = null;
	try {
		const {BUN_SCANNER_COLUMNS} = await import('../scan-columns.ts');
		const {issues: colIssues, metrics: cm} = validateColumns(BUN_SCANNER_COLUMNS as any);
		colMetrics = cm;
		colWarnings = colIssues.length;
		if (colIssues.length > 0) {
			const colIcon = colIssues.some(i => i.severity === 'error') ? `${cRed}✗${R}` : `${cYellow}~${R}`;
			console.log(
				`  ${colIcon} ${B}scan-columns.ts${R} ${D}(report only — ${cm.tables} tables, ${cm.columns} columns)${R}`,
			);
			printIssues('columns', colIssues, true);
			console.log();
		} else {
			console.log(
				`  ${cGreen}✓${R} ${B}scan-columns.ts${R} — all column checks passed ${D}(${cm.tables} tables, ${cm.columns} columns)${R}\n`,
			);
		}
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		console.log(`  ${cYellow}~${R} ${B}scan-columns.ts${R} — import failed: ${msg}\n`);
	}

	// Summary table
	const summaryRows = [
		{Field: 'Members', Value: String(teamKeys.length)},
		{Field: 'Fixed', Value: totalFixed > 0 ? `${cGreen}${totalFixed}${R}` : '0'},
		...(totalSkipped > 0 ? [{Field: 'Skipped', Value: `${cYellow}${totalSkipped}${R}`}] : []),
		{Field: 'Unfixable', Value: totalUnfixable > 0 ? `${cYellow}${totalUnfixable}${R}` : '0'},
		{Field: 'Remaining', Value: remainingIssues > 0 ? `${cYellow}${remainingIssues}${R}` : `${cGreen}0${R}`},
		...(colMetrics
			? [
					{Field: 'Tables', Value: String(colMetrics.tables)},
					{Field: 'Columns', Value: String(colMetrics.columns)},
					...(colMetrics.guardErrors > 0
						? [{Field: 'Guard errors', Value: `${cYellow}${colMetrics.guardErrors}${R}`}]
						: []),
					...(colMetrics.propErrors > 0
						? [{Field: 'Prop errors', Value: `${cYellow}${colMetrics.propErrors}${R}`}]
						: []),
					...(colMetrics.widthIssues > 0
						? [{Field: 'Width issues', Value: `${cYellow}${colMetrics.widthIssues}${R}`}]
						: []),
					...(colMetrics.defaultIssues > 0
						? [{Field: 'Default issues', Value: `${cYellow}${colMetrics.defaultIssues}${R}`}]
						: []),
					...(colMetrics.coherenceWarnings > 0
						? [{Field: 'Coherence', Value: `${cYellow}${colMetrics.coherenceWarnings}${R}`}]
						: []),
					...(colMetrics.crossTableDupes > 0
						? [{Field: 'Cross-table dupes', Value: `${cYellow}${colMetrics.crossTableDupes}${R}`}]
						: []),
				]
			: colWarnings > 0
				? [{Field: 'Column issues', Value: `${cYellow}${colWarnings}${R}`}]
				: []),
		{Field: 'Written', Value: totalFixed > 0 ? `${cGreen}yes${R}` : `${D}no changes${R}`},
	];
	// @ts-expect-error Bun.inspect.table accepts options as third arg
	console.log(Bun.inspect.table(summaryRows, ['Field', 'Value'], inspectOpts));

	printMetrics();
	process.exit(remainingIssues > 0 ? 1 : 0);
}

// ── Auto-detect machine info ────────────────────────────────────────

const detected = detectMachine();
const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const username = Bun.env.USER ?? 'unknown';

// ── Merge profile ───────────────────────────────────────────────────

const existing = benchrc.team[username];

// Machine drift detection
if (existing?.machine && !Bun.deepEquals(existing.machine, detected)) {
	console.log(`${cYellow}Machine config changed since last profile write:${R}`);
	for (const k of Object.keys(detected) as (keyof MachineInfo)[]) {
		if (!Bun.deepEquals((existing.machine as any)[k], detected[k])) {
			console.log(`  ${k}: ${D}${(existing.machine as any)[k]}${R} → ${detected[k]}`);
		}
	}
	console.log();
}

const profile: MemberProfile = {
	name: cliArgs.name ?? existing?.name ?? username,
	...(cliArgs.email || existing?.email ? {email: cliArgs.email ?? existing?.email} : {}),
	timezone: detectedTimezone,
	notes: cliArgs.notes ?? existing?.notes ?? '',
	machine: detected,
};

// ── Validate before writing ─────────────────────────────────────────

const issues = validateProfile(username, profile);
if (issues.length > 0) {
	console.log(`${B}Validation results:${R}\n`);
	const {errors, warnings} = printIssues(username, issues);
	console.log();
	if (errors > 0) {
		console.log(`  ${cRed}${errors} error(s) found. Fix before writing.${R}`);
		console.log(`  ${D}Use --name, --email, --notes to set values.${R}`);
		process.exit(1);
	}
	if (warnings > 0) {
		console.log(`  ${cYellow}${warnings} warning(s) — writing anyway.${R}\n`);
	}
}

benchrc.team[username] = profile;

// ── Write .benchrc.json ─────────────────────────────────────────────

await Bun.write(BENCHRC_PATH, JSON.stringify(benchrc, null, 2) + '\n');

// ── Print result ────────────────────────────────────────────────────

console.log(`Profile written to .benchrc.json\n`);

const resultRows = [
	{Field: 'User', Value: username},
	{Field: 'Name', Value: profile.name},
	...(profile.email ? [{Field: 'Email', Value: profile.email}] : []),
	{Field: 'Timezone', Value: profile.timezone},
	{Field: 'Notes', Value: profile.notes || '(none)'},
	{Field: 'CPU', Value: `${profile.machine.cpu}, ${profile.machine.cores} cores`},
	{Field: 'Memory', Value: `${profile.machine.memory_gb} GB`},
	{Field: 'OS', Value: `${profile.machine.os} ${profile.machine.arch}`},
	{Field: 'Bun', Value: profile.machine.bun_version},
];

// @ts-expect-error Bun.inspect.table accepts options as third arg
console.log(Bun.inspect.table(resultRows, ['Field', 'Value'], inspectOpts));

printMetrics();
