#!/usr/bin/env bun

import {parseArgs} from 'node:util';
import {readdir, appendFile, mkdir} from 'node:fs/promises';
import {availableParallelism} from 'node:os';
import {dns} from 'bun';
import {z} from 'zod';
import {BUN_SCANNER_COLUMNS} from './scan-columns';
import {formatStatusCell, type StatusKey} from '../cli/renderers/status-glyphs';
import {
	getSession,
	removeCookieFromSession,
	deleteSession,
	cleanupExpiredSessions,
	createProjectSession,
	parseCookieString,
	formatSessionForTerminal,
	addCookieToSession,
	listSessionsForTerminal,
	type CookieInfo,
	type SessionConfig,
} from './cookie-sessions';
import {createCookieTerminalManager} from './cookie-terminal';
import {validateProjectId, createProjectContext, logProjectContext} from './project-utils';

// ── Bun Secrets API type augmentation ─────────────────────────────────
interface BunSecretsAPI {
	get(service: string, name: string): Promise<string | null>;
	set(service: string, name: string, value: string): Promise<void>;
	delete(service: string, name: string): Promise<boolean>;
}
declare global {
	var secrets: BunSecretsAPI | undefined;
}

// ── Broken-pipe guard ─────────────────────────────────────────────────
// When piped to a command that closes early (e.g., `scan | head`, `scan | true`),
// writes to stdout/stderr raise EPIPE. Exit cleanly instead of crashing.
function handlePipeError(err: NodeJS.ErrnoException): void {
	if (err.code === 'EPIPE' || err.code === 'ERR_STREAM_DESTROYED') {
		process.exit(0);
	}
	throw err;
}
process.stdout.on('error', handlePipeError);
process.stderr.on('error', handlePipeError);

// ── Bun-only guard ──────────────────────────────────────────────────────
if (typeof Bun === 'undefined') {
	console.error('This CLI is Bun-only. Please run with: bun scan.ts');
	process.exit(1);
}

// ── CLI flags ──────────────────────────────────────────────────────────
const {values: flags, positionals} = parseArgs({
	allowPositionals: true,
	args: Bun.argv.slice(2),
	options: {
		'help': {type: 'boolean', short: 'h', default: false},
		'detail': {type: 'boolean', default: false},
		'inspect': {type: 'string'},
		'sort': {type: 'string'},
		'filter': {type: 'string'},
		'json': {type: 'boolean', default: false},
		'with-bunfig': {type: 'boolean', default: false},
		'workspaces': {type: 'boolean', default: false},
		'without-pkg': {type: 'boolean', default: false},
		'audit': {type: 'boolean', default: false},
		'fix': {type: 'boolean', default: false},
		'dry-run': {type: 'boolean', default: false},
		'why': {type: 'string'},
		'outdated': {type: 'boolean', default: false},
		'update': {type: 'boolean', default: false},
		'fix-engine': {type: 'boolean', default: false},
		'info': {type: 'string'},
		'fix-registry': {type: 'string'},
		'pm-view': {type: 'string'},
		'path': {type: 'boolean', default: false},
		'fix-scopes': {type: 'string'},
		'fix-npmrc': {type: 'string'},
		'fix-trusted': {type: 'boolean', default: false},
		'fix-env-docs': {type: 'boolean', default: false},
		'fix-dns': {type: 'boolean', default: false},
		'no-ipc': {type: 'boolean', default: false},
		'patch': {type: 'boolean', default: false},
		'minor': {type: 'boolean', default: false},
		'verify': {type: 'boolean', default: false},
		'top': {type: 'boolean', default: false},
		'depth': {type: 'string'},
		'production': {type: 'boolean', short: 'p', default: false},
		'omit': {type: 'string'},
		'global': {type: 'boolean', short: 'g', default: false},
		'catalog': {type: 'boolean', short: 'r', default: false},
		'wf': {type: 'string', multiple: true},
		'snapshot': {type: 'boolean', default: false},
		'compare': {type: 'boolean', default: false},
		'audit-compare': {type: 'string'},
		'no-auto-snapshot': {type: 'boolean', default: false},
		'tz': {type: 'string'},
		'fix-dns-ttl': {type: 'boolean', default: false},
		'store-token': {type: 'string'},
		'delete-token': {type: 'string'},
		'list-tokens': {type: 'boolean', default: false},
		'check-tokens': {type: 'boolean', default: false},
		'rss': {type: 'boolean', default: false},
		'advisory-feed': {type: 'string'},
		'profile': {type: 'boolean', default: false},
		'debug-tokens': {type: 'boolean', default: false},
		'write-baseline': {type: 'boolean', default: false},
		'session-create': {type: 'string'},
		'session-domain': {type: 'string'},
		'session-list': {type: 'boolean', default: false},
		'session-show': {type: 'string'},
		'session-delete': {type: 'string'},
		'session-cleanup': {type: 'boolean', default: false},
		'cookie-add': {type: 'string'},
		'cookie-remove': {type: 'string'},
		'session-ttl': {type: 'string'},
		'session-interactive': {type: 'boolean', default: false},
		'session-monitor': {type: 'string'},
	},
	strict: true,
});

// ── Timezone ────────────────────────────────────────────────────────────
// Set process TZ early so all Date ops are consistent for the entire run.
// Priority: --tz flag > TZ env var > system default
const _tzExplicit = !!(flags.tz ?? process.env.TZ);
if (flags.tz) {
	process.env.TZ = flags.tz;
} else {
	process.env.TZ ??= Intl.DateTimeFormat().resolvedOptions().timeZone;
}
const _tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

// ── ANSI helpers ───────────────────────────────────────────────────────
const _useColor = (() => {
	if (Bun.env.FORCE_COLOR) return true;
	if (Bun.env.NO_COLOR !== undefined) return false;
	return process.stdout.isTTY ?? false;
})();

const _wrap = (code: string) => (_useColor ? (s: string) => `\x1b[${code}m${s}\x1b[0m` : (s: string) => s);

const c = {
	bold: _wrap('1'),
	cyan: _wrap('36'),
	green: _wrap('32'),
	yellow: _wrap('33'),
	dim: _wrap('2'),
	magenta: _wrap('35'),
	red: _wrap('31'),
};

/** Strip ANSI escape codes (used by extractBunError and parseBunOutdated). */
const stripAnsi = Bun.stripANSI;

// ── Lightweight profiling (opt-in) ────────────────────────────────────
const _profileEnabled = !!flags.profile || Bun.env.BUN_SCAN_PROFILE === '1' || Bun.env.BUN_SCAN_PROFILE === 'true';
const _profileTotals = new Map<string, number>();
const _profileCounts = new Map<string, number>();
const _profileProjectTotals = new Map<string, number>();
const _profileProjectCounts = new Map<string, number>();
let _profileStartNs: number | null = null;
let _profileStartMem: NodeJS.MemoryUsage | null = null;
let _profileSummary: {projectsScanned: number; scanMs: number; memoryDeltaBytes: number} | null = null;
const PROFILE_BASELINE_PATH = `${import.meta.dir}/profile-baseline.json`;
const PROFILE_BASELINE_KEY = 'profile-baseline.json';

function recordProfile(label: string, ms: number): void {
	_profileTotals.set(label, (_profileTotals.get(label) ?? 0) + ms);
	_profileCounts.set(label, (_profileCounts.get(label) ?? 0) + 1);
}

function recordProjectProfile(label: string, ms: number): void {
	_profileProjectTotals.set(label, (_profileProjectTotals.get(label) ?? 0) + ms);
	_profileProjectCounts.set(label, (_profileProjectCounts.get(label) ?? 0) + 1);
}

async function time<T>(label: string, fn: () => Promise<T>): Promise<T> {
	if (!_profileEnabled) return fn();
	const start = Bun.nanoseconds();
	const result = await fn();
	const ms = (Bun.nanoseconds() - start) / 1e6;
	recordProfile(label, ms);
	return result;
}

async function _timeProject<T>(label: string, fn: () => Promise<T>): Promise<T> {
	if (!_profileEnabled) return fn();
	const start = Bun.nanoseconds();
	const result = await fn();
	const ms = (Bun.nanoseconds() - start) / 1e6;
	recordProjectProfile(label, ms);
	return result;
}

function timeSync<T>(label: string, fn: () => T): T {
	if (!_profileEnabled) return fn();
	const start = Bun.nanoseconds();
	const result = fn();
	const ms = (Bun.nanoseconds() - start) / 1e6;
	recordProfile(label, ms);
	return result;
}

function printProfileSummary(): void {
	if (!_profileEnabled || _profileTotals.size === 0) return;
	console.log();
	console.log(c.bold('  Profiling (ms)'));
	console.log();
	const rows = [..._profileTotals.entries()]
		.map(([label, total]) => {
			const count = _profileCounts.get(label) ?? 1;
			return {
				Label: label,
				Total: total.toFixed(1),
				Count: count,
				Avg: (total / count).toFixed(1),
			};
		})
		.sort((a, b) => Number(b.Total) - Number(a.Total));
	displayTable(rows, ['Label', 'Total', 'Count', 'Avg'], {title: 'Performance Summary'});
}

function printProjectProfileSummary(): void {
	if (!_profileEnabled || _profileProjectTotals.size === 0) return;
	console.log();
	console.log(c.bold('  Project Profiling (ms)'));
	console.log();
	const rows = [..._profileProjectTotals.entries()]
		.map(([label, total]) => {
			const count = _profileProjectCounts.get(label) ?? 1;
			return {
				Label: label,
				Total: total.toFixed(1),
				Count: count,
				Avg: (total / count).toFixed(1),
			};
		})
		.sort((a, b) => Number(b.Total) - Number(a.Total));
	console.log(Bun.inspect.table(rows, ['Label', 'Total', 'Count', 'Avg'], {colors: _useColor}));
}

function pctDiff(current: number, baseline: number): number {
	if (baseline === 0) return current === 0 ? 0 : 100;
	return Math.abs((current - baseline) / baseline) * 100;
}

async function readProfileBaseline(): Promise<{
	projectsScanned: number;
	scanMs: number;
	memoryDeltaBytes: number;
} | null> {
	try {
		const cfg = getR2Config();
		let raw: string | null = null;
		if (cfg) {
			const key = getProfileBaselineKey();
			const res = await r2Fetch('GET', key);
			if (res.status === 404) return null;
			if (!res.ok) throw new Error(`R2 read failed: ${res.status} ${res.statusText}`);
			raw = await res.text();
		} else {
			const file = Bun.file(PROFILE_BASELINE_PATH);
			if (!(await file.exists())) return null;
			raw = await file.text();
		}
		const parsed = JSON.parse(raw);
		if (
			typeof parsed?.projectsScanned === 'number' &&
			typeof parsed?.scanMs === 'number' &&
			typeof parsed?.memoryDeltaBytes === 'number'
		) {
			return parsed;
		}
	} catch {
		/* ignore */
	}
	return null;
}

async function writeProfileBaseline(): Promise<void> {
	if (!_profileEnabled || !_profileSummary || !flags['write-baseline']) return;
	try {
		const payload =
			JSON.stringify(
				{
					projectsScanned: _profileSummary.projectsScanned,
					scanMs: _profileSummary.scanMs,
					memoryDeltaBytes: _profileSummary.memoryDeltaBytes,
				},
				null,
				2,
			) + '\n';
		const cfg = getR2Config();
		if (cfg) {
			const key = getProfileBaselineKey();
			const res = await r2Fetch('PUT', key, payload, 'application/json');
			if (!res.ok) throw new Error(`R2 write failed: ${res.status} ${res.statusText}`);
			console.log();
			console.log(c.green(`  Wrote profile baseline to R2: ${key}`));
			return;
		}
		const file = Bun.file(PROFILE_BASELINE_PATH);
		await Bun.write(file, payload);
		console.log();
		console.log(c.green(`  Wrote profile baseline: ${PROFILE_BASELINE_PATH}`));
	} catch (err) {
		console.log();
		console.error(c.red(`  Failed to write profile baseline: ${err instanceof Error ? err.message : String(err)}`));
	}
}

function printProfileSummaryTable(): void {
	if (!_profileEnabled || !_profileSummary) return;
	console.log();
	console.log(c.bold('  Profile Summary'));
	console.log();
	const rows = [
		{Field: 'Projects', Value: _profileSummary.projectsScanned},
		{Field: 'Elapsed', Value: `${_profileSummary.scanMs.toFixed(1)} ms`},
		{
			Field: 'Memory Δ',
			Value: `${_profileSummary.memoryDeltaBytes >= 0 ? '+' : ''}${(_profileSummary.memoryDeltaBytes / 1024).toFixed(1)} KiB`,
		},
	];
	console.log(Bun.inspect.table(rows, ['Field', 'Value'], {colors: _useColor}));
}

async function checkProfileRegression(): Promise<void> {
	if (!_profileEnabled || !_profileSummary) return;
	const baseline = await readProfileBaseline();
	if (!baseline) {
		console.log();
		console.log(c.dim(`  Profile baseline not found: ${PROFILE_BASELINE_PATH}`));
		return;
	}

	const driftProjects = pctDiff(_profileSummary.projectsScanned, baseline.projectsScanned);
	const driftMs = pctDiff(_profileSummary.scanMs, baseline.scanMs);
	const driftMem = pctDiff(_profileSummary.memoryDeltaBytes, baseline.memoryDeltaBytes);
	const hasRegression = driftProjects > 10 || driftMs > 10 || driftMem > 10;

	console.log();
	console.log(c.bold(`  Profile Regression (${hasRegression ? c.red('REGRESSION') : c.green('OK')})`));
	console.log();
	const rows = [
		{
			Metric: 'projectsScanned',
			Baseline: baseline.projectsScanned,
			Current: _profileSummary.projectsScanned,
			Drift: `${driftProjects.toFixed(1)}%`,
		},
		{
			Metric: 'scanMs',
			Baseline: baseline.scanMs,
			Current: _profileSummary.scanMs.toFixed(1),
			Drift: `${driftMs.toFixed(1)}%`,
		},
		{
			Metric: 'memoryDeltaBytes',
			Baseline: baseline.memoryDeltaBytes,
			Current: _profileSummary.memoryDeltaBytes,
			Drift: `${driftMem.toFixed(1)}%`,
		},
	];
	console.log(Bun.inspect.table(rows, ['Metric', 'Baseline', 'Current', 'Drift'], {colors: _useColor}));

	if (hasRegression && process.stdout.isTTY && typeof Bun.openInEditor === 'function') {
		Bun.openInEditor(import.meta.path, {line: 1});
	}
}

if (_profileEnabled) {
	process.on('beforeExit', () => {
		printProfileSummary();
		printProjectProfileSummary();
		printProfileSummaryTable();
		void (async () => {
			await writeProfileBaseline();
			await checkProfileRegression();
		})();
	});
}

/** Pad a string (possibly containing ANSI codes) to a target display width. */
const _padEnd = (s: string, w: number) => s + ' '.repeat(Math.max(0, w - Bun.stringWidth(s)));
const _padStart = (s: string, w: number) => ' '.repeat(Math.max(0, w - Bun.stringWidth(s))) + s;
const pad2 = (n: number) => String(n).padStart(2, '0');
const fmtDate = (d: Date) =>
	`${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
const fmtStamp = (d = new Date()) => `${fmtDate(d)} ${_tz}${_tzExplicit ? ` (TZ=${process.env.TZ})` : ''}`;

/** Log to stderr when BUN_SCAN_VERBOSE=1 for silent catch blocks in scanProject. */
function _verboseWarn(context: string, err: unknown): void {
	if (Bun.env.BUN_SCAN_VERBOSE === '1' || Bun.env.BUN_SCAN_VERBOSE === 'true') {
		process.stderr.write(`[scan] ${context}: ${err instanceof Error ? err.message : String(err)}\n`);
	}
}

/** Extract the first meaningful error line from bun stderr, skipping .env diagnostics and version banners. */
function extractBunError(stderr: string, fallback: string): string {
	for (const line of stderr.trim().split('\n')) {
		const clean = stripAnsi(line).trim();
		if (!clean) continue;
		if (clean.startsWith('".env')) continue; // .env auto-load diagnostic
		if (clean.startsWith('bun add')) continue; // version banner
		if (clean.startsWith('bun update')) continue; // version banner
		if (clean.startsWith('bun install')) continue; // version banner
		return clean;
	}
	return fallback;
}

// ── Threat feed validation (Bun Security Scanner API) ────────────────
// Schema for validating threat intelligence feed responses.
// See: https://bun.com/docs
// See: https://bun.com/docs/template#validation

export const ThreatFeedItemSchema = z.object({
	package: z.string(),
	version: z.string(),
	url: z.string().nullable(),
	description: z.string().nullable(),
	categories: z.array(z.enum(['backdoor', 'botnet', 'malware', 'protestware', 'adware'])),
});

export const ThreatFeedSchema = z.array(ThreatFeedItemSchema);

type ThreatFeedItem = z.infer<typeof ThreatFeedItemSchema>;

/** Validate a threat feed response. Throws on invalid data — installation should be cancelled. */
export function validateThreatFeed(data: unknown): ThreatFeedItem[] {
	return ThreatFeedSchema.parse(data);
}

// ── Package.json schema (minimal — covers fields read by scanProject) ─
export const PackageJsonSchema = z
	.object({
		name: z.string().optional(),
		version: z.string().optional(),
		description: z.string().optional(),
		author: z.union([z.string(), z.object({name: z.string()})]).optional(),
		license: z.string().optional(),
		dependencies: z.record(z.string(), z.string()).optional(),
		devDependencies: z.record(z.string(), z.string()).optional(),
		peerDependencies: z.record(z.string(), z.string()).optional(),
		peerDependenciesMeta: z.record(z.string(), z.object({optional: z.boolean().optional()})).optional(),
		engines: z.object({bun: z.string().optional()}).optional(),
		workspaces: z.union([z.array(z.string()), z.object({packages: z.array(z.string())})]).optional(),
		scripts: z.record(z.string(), z.string()).optional(),
		bin: z.union([z.string(), z.record(z.string(), z.string())]).optional(),
		trustedDependencies: z.array(z.string()).optional(),
		overrides: z.record(z.string(), z.any()).optional(),
		resolutions: z.record(z.string(), z.any()).optional(),
		repository: z.union([z.string(), z.object({url: z.string()})]).optional(),
		publishConfig: z.object({registry: z.string().optional()}).optional(),
	})
	.passthrough();

// ── npm packument schema (bun info <pkg> --json response) ─────────────
// Covers the standard npm registry packument fields returned by `bun info`.
// See: https://bun.com/docs/install

export const NpmPersonSchema = z.union([
	z.string(),
	z.object({name: z.string().optional(), email: z.string().optional(), url: z.string().optional()}),
]);

export const NpmDistSchema = z.object({
	shasum: z.string().optional(),
	tarball: z.string().optional(),
	fileCount: z.number().optional(),
	integrity: z.string().optional(),
	unpackedSize: z.number().optional(),
	signatures: z.array(z.object({sig: z.string(), keyid: z.string()})).optional(),
	attestations: z
		.object({
			url: z.string(),
			provenance: z.object({predicateType: z.string()}).optional(),
		})
		.optional(),
});

export const BunInfoResponseSchema = z
	.object({
		// ── identity ──
		'name': z.string().optional(),
		'version': z.string().optional(),
		'description': z.string().optional(),
		'keywords': z.array(z.string()).optional(),
		'license': z.string().optional(),
		'homepage': z.string().optional(),
		'bugs': z.union([z.string(), z.object({url: z.string().optional()})]).optional(),
		// ── people ──
		'author': NpmPersonSchema.optional(),
		'contributors': z.array(NpmPersonSchema).optional(),
		'maintainers': z.array(NpmPersonSchema).optional(),
		// ── repository ──
		'repository': z
			.union([
				z.string(),
				z.object({type: z.string().optional(), url: z.string(), directory: z.string().optional()}),
			])
			.optional(),
		// ── dependencies ──
		'dependencies': z.record(z.string(), z.string()).optional(),
		'devDependencies': z.record(z.string(), z.string()).optional(),
		'peerDependencies': z.record(z.string(), z.string()).optional(),
		'optionalDependencies': z.record(z.string(), z.string()).optional(),
		// ── distribution ──
		'dist': NpmDistSchema.optional(),
		'dist-tags': z.record(z.string(), z.string()).optional(),
		'versions': z.array(z.string()).optional(),
		// ── timing (full packument only — not in bun info single-version response) ──
		'time': z.record(z.string(), z.string()).optional(),
		// ── entry points ──
		'main': z.string().optional(),
		'module': z.string().optional(),
		'types': z.string().optional(),
		'type': z.string().optional(),
		'exports': z.any().optional(),
		'bin': z.union([z.string(), z.record(z.string(), z.string())]).optional(),
		// ── package metadata ──
		'engines': z.record(z.string(), z.string()).optional(),
		'scripts': z.record(z.string(), z.string()).optional(),
		'funding': z.any().optional(),
		'sideEffects': z.boolean().optional(),
		'directories': z.record(z.string(), z.string()).optional(),
		// ── npm internal ──
		'_id': z.string().optional(),
		'_npmUser': NpmPersonSchema.optional(),
		'_npmVersion': z.string().optional(),
		'_nodeVersion': z.string().optional(),
		'_hasShrinkwrap': z.boolean().optional(),
		'_npmOperationalInternal': z
			.object({host: z.string().optional(), tmp: z.string().optional()})
			.passthrough()
			.optional(),
		'gitHead': z.string().optional(),
	})
	.passthrough();

export type NpmPackument = z.infer<typeof BunInfoResponseSchema>;
export type NpmPerson = z.infer<typeof NpmPersonSchema>;
type _NpmDist = z.infer<typeof NpmDistSchema>;

// ── Feature flag helpers ──────────────────────────────────────────────

/** Returns true only for "1" or "true" — matches Bun's feature flag semantics. */
export function isFeatureFlagActive(val: string | undefined): boolean {
	return val === '1' || val === 'true';
}

/** Classify a DISABLE_ or SKIP_ env var for audit display. */
export function classifyEnvFlag(
	val: string | undefined,
	offLabel: string,
): {label: string; state: 'active' | 'inactive' | 'ambiguous'} {
	if (!val) return {label: offLabel, state: 'inactive'};
	if (val === '1' || val === 'true') return {label: 'OFF', state: 'active'};
	return {label: `set (${val})`, state: 'ambiguous'};
}

/** Compute effective linker strategy from explicit bunfig, configVersion, and workspace.
 *  Defaults: "isolated" for new workspaces, "hoisted" for new single-package and existing (pre-v1.3.2) projects. */
export function effectiveLinker(opts: {linker: string; configVersion: number; workspace: boolean}): {
	strategy: string;
	source: string;
} {
	if (opts.linker !== '-') return {strategy: opts.linker, source: 'bunfig'};
	if (opts.configVersion === 1) {
		return opts.workspace
			? {strategy: 'isolated', source: 'configVersion=1 + workspace'}
			: {strategy: 'hoisted', source: 'configVersion=1'};
	}
	if (opts.configVersion === 0) return {strategy: 'hoisted', source: 'configVersion=0 (compat)'};
	return {strategy: 'hoisted', source: 'default'};
}

/** Normalize git remote / package.json repository to a clean GitHub URL. */
function normalizeGitUrl(raw: string): string {
	let url = raw.trim();
	// git+https://github.com/user/repo.git → https://...
	url = url.replace(/^git\+/, '');
	// git@github.com:user/repo.git or git@github.com-personal:user/repo.git
	url = url.replace(/^git@github\.com[^:]*:/, 'https://github.com/');
	// https://user@github.com/... → https://github.com/...
	url = url.replace(/^https?:\/\/[^@]+@github\.com/, 'https://github.com');
	// strip trailing .git
	url = url.replace(/\.git$/, '');
	return url || '-';
}

/** Extract host and owner from a normalized repo URL. */
function parseRepoMeta(url: string): {host: string; owner: string} {
	try {
		const u = new URL(url);
		const parts = u.pathname.split('/').filter(Boolean);
		return {host: u.host, owner: parts[0] ?? '-'};
	} catch {
		return {host: '-', owner: '-'};
	}
}

function slugifyTokenPart(raw: string): string {
	const slug = raw
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return slug || 'default';
}

export function projectTokenOrg(p: ProjectInfo): string {
	if (p.name.startsWith('@')) {
		const scope = p.name.split('/')[0]?.slice(1) ?? '';
		if (scope) return slugifyTokenPart(scope);
	}
	if (p.repoOwner && p.repoOwner !== '-') return slugifyTokenPart(p.repoOwner);
	return 'default';
}

export function projectTokenProject(p: ProjectInfo): string {
	let raw = p.name;
	if (raw.startsWith('@')) raw = raw.split('/')[1] ?? p.folder;
	if (!raw || raw === '-') raw = p.folder;
	return slugifyTokenPart(raw);
}

export function projectTokenName(p: ProjectInfo, suffix?: string): string {
	const base = projectTokenProject(p);
	if (!suffix) return base;
	return `${base}-${slugifyTokenPart(suffix)}`;
}

export function projectTokenService(p: ProjectInfo): string {
	const org = projectTokenOrg(p);
	const project = projectTokenProject(p);
	return `com.vercel.cli.${org}.${project}`;
}

// ── Token status mapping ──────────────────────────────────────────────
function statusFromToken(status: string): StatusKey {
	switch (status) {
		case 'keychain':
			return 'success';
		case 'missing':
			return 'warning';
		case 'denied':
		case 'error':
			return 'error';
		case 'unsupported':
			return 'info';
		default:
			return 'warning';
	}
}

// ── R2 (S3-compatible) helpers for profile baseline ──────────────────
interface R2Config {
	accountId: string;
	accessKeyId: string;
	secretAccessKey: string;
	bucketName: string;
}

function getR2Config(): R2Config | null {
	const accountId = Bun.env.R2_ACCOUNT_ID ?? '';
	const accessKeyId = Bun.env.R2_ACCESS_KEY_ID ?? '';
	const secretAccessKey = Bun.env.R2_SECRET_ACCESS_KEY ?? '';
	const bucketName = Bun.env.R2_BUCKET_NAME ?? '';
	if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) return null;
	return {accountId, accessKeyId, secretAccessKey, bucketName};
}

function getProfileBaselineKey(): string {
	return Bun.env.R2_PROFILE_BASELINE_KEY ?? PROFILE_BASELINE_KEY;
}

function toAmzDate(d = new Date()): {amz: string; date: string} {
	const y = d.getUTCFullYear();
	const m = String(d.getUTCMonth() + 1).padStart(2, '0');
	const day = String(d.getUTCDate()).padStart(2, '0');
	const hh = String(d.getUTCHours()).padStart(2, '0');
	const mm = String(d.getUTCMinutes()).padStart(2, '0');
	const ss = String(d.getUTCSeconds()).padStart(2, '0');
	return {amz: `${y}${m}${day}T${hh}${mm}${ss}Z`, date: `${y}${m}${day}`};
}

function hashSha256Hex(data: string | Uint8Array): string {
	const hasher = new Bun.CryptoHasher('sha256');
	hasher.update(data);
	return hasher.digest('hex');
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
	const hasher = new Bun.CryptoHasher('sha256', key);
	hasher.update(data);
	return Buffer.from(hasher.digest());
}

function encodeR2Key(key: string): string {
	return key
		.split('/')
		.map(part => encodeURIComponent(part))
		.join('/');
}

async function r2Fetch(
	method: 'GET' | 'PUT',
	key: string,
	body?: string,
	contentType = 'application/json',
): Promise<Response> {
	const cfg = getR2Config();
	if (!cfg) throw new Error('Missing R2 configuration');
	const host = `${cfg.accountId}.r2.cloudflarestorage.com`;
	const canonicalUri = `/${cfg.bucketName}/${encodeR2Key(key)}`;
	const {amz, date} = toAmzDate();
	const payload = body ?? '';
	const payloadHash = hashSha256Hex(payload);
	const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amz}\n`;
	const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
	const canonicalRequest = `${method}\n${canonicalUri}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
	const scope = `${date}/auto/s3/aws4_request`;
	const stringToSign = `AWS4-HMAC-SHA256\n${amz}\n${scope}\n${hashSha256Hex(canonicalRequest)}`;
	const kDate = hmacSha256(`AWS4${cfg.secretAccessKey}`, date);
	const kRegion = hmacSha256(kDate, 'auto');
	const kService = hmacSha256(kRegion, 's3');
	const kSigning = hmacSha256(kService, 'aws4_request');
	const signature = hmacSha256(kSigning, stringToSign).toString('hex');
	const authorization = `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

	const url = `https://${host}/${cfg.bucketName}/${encodeR2Key(key)}`;
	const headers: Record<string, string> = {
		'Authorization': authorization,
		'x-amz-date': amz,
		'x-amz-content-sha256': payloadHash,
	};
	if (method === 'PUT') headers['Content-Type'] = contentType;

	return fetch(url, {
		method,
		headers,
		body: method === 'PUT' ? payload : undefined,
	});
}

/** Platform-aware CLI invocation command and optional PowerShell hint. */
export function platformHelp(platform: string): {cmd: string; hint: string | null} {
	if (platform === 'win32') {
		return {
			cmd: 'mise.exe exec -- bun',
			hint: "If using mise, call 'mise.exe' directly to ensure arguments like '--' are passed correctly to the runtime.",
		};
	}
	return {cmd: 'bun', hint: null};
}

/** Whether to show the mise.exe startup hint (win32 without MISE_SHELL set). */
export function shouldWarnMise(platform: string, miseShell: string | undefined): boolean {
	return platform === 'win32' && !miseShell;
}

/** Parse a variable from .env file contents. Returns last match (Bun load-order: last write wins). */
export function parseEnvVar(contents: string[], key: string): string {
	let val = '-';
	for (const text of contents) {
		const m = text.match(new RegExp(`^${key}\\s*=\\s*["']?([^\\s"'#]+)`, 'm'));
		if (m?.[1]) val = m[1];
	}
	return val;
}

/** Parse TZ= value from .env file contents. */
export function parseTzFromEnv(contents: string[]): string {
	return parseEnvVar(contents, 'TZ');
}

// ── Semver helpers (Bun.semver + bump classification) ─────────────────

/** Classify the bump from `a` → `b`. Uses Bun.semver.order for validation. */
export function semverBumpType(a: string, b: string): 'patch' | 'minor' | 'major' | null {
	const ma = a.match(/^(\d+)\.(\d+)\.(\d+)/);
	const mb = b.match(/^(\d+)\.(\d+)\.(\d+)/);
	if (!ma || !mb) return null;
	if (ma[1] !== mb[1]) return 'major';
	if (ma[2] !== mb[2]) return 'minor';
	if (ma[3] !== mb[3]) return 'patch';
	return null; // same version
}

/** Check if a package version falls within a vulnerability range. */
export function isVulnerable(version: string, range: string): boolean {
	return Bun.semver.satisfies(version, range);
}

/** Compare two semver strings. Returns 1 if a > b, -1 if a < b, 0 if equal. */
export function semverCompare(a: string, b: string): 0 | 1 | -1 {
	return Bun.semver.order(a, b);
}

/**
 * Deep comparison utility using Bun.deepEquals()
 * More reliable than JSON.stringify comparison for objects with undefined values
 */
export function deepEqual<T>(a: T, b: T, strict: boolean = false): boolean {
	return Bun.deepEquals(a, b, strict);
}

/**
 * Enhanced table display utility using Bun.inspect.table()
 * Provides consistent table formatting with color support
 */
export function displayTable<T extends Record<string, any>>(
	data: T[],
	columns?: (keyof T)[] | string[],
	options?: {colors?: boolean; title?: string},
): void {
	const table = Bun.inspect.table(data, columns as string[], {colors: options?.colors ?? _useColor});

	if (options?.title) {
		console.log(c.bold(options.title));
		console.log(table);
	} else {
		console.log(table);
	}
}

/**
 * Get the current git commit hash via Bun.spawnSync.
 * Returns the full SHA, or "" if not in a git repo.
 * @see https://bun.com/docs/bundler/macros#embed-latest-git-commit-hash
 */
export function getGitCommitHash(cwd?: string): string {
	try {
		// Check if git is available using Bun.which()
		const gitPath = Bun.which('git');
		if (!gitPath) {
			return '';
		}

		const {stdout, success} = Bun.spawnSync(['git', 'rev-parse', 'HEAD'], {
			cwd: cwd ?? import.meta.dir,
			stdout: 'pipe',
			stderr: 'ignore',
		});
		return success ? stdout.toString().trim() : '';
	} catch {
		return '';
	}
}

/** Short form (first 9 chars) matching Bun.revision display convention. */
export function getGitCommitHashShort(cwd?: string): string {
	const full = getGitCommitHash(cwd);
	return full ? full.slice(0, 9) : '';
}

// ── Shared outdated parsing ───────────────────────────────────────────
interface OutdatedPkg {
	name: string;
	depType: string;
	current: string;
	update: string;
	latest: string;
	workspace?: string;
}

function parseBunOutdated(output: string): OutdatedPkg[] {
	const pkgs: OutdatedPkg[] = [];
	for (const line of output.split('\n')) {
		const clean = stripAnsi(line);
		if (!clean.startsWith('│')) continue;
		const cols = clean
			.split('│')
			.map(c => c.trim())
			.filter(Boolean);
		if (cols.length >= 4 && cols[0] !== 'Package') {
			const nameMatch = cols[0].match(/^(.+?)\s*\((\w+)\)\s*$/);
			const name = nameMatch?.[1] ?? cols[0];
			const depType = nameMatch?.[2] ?? 'prod';
			const workspace = cols.length >= 5 ? cols[4] : undefined;
			pkgs.push({name, depType, current: cols[1] ?? '', update: cols[2] ?? '', latest: cols[3] ?? '', workspace});
		}
	}
	return pkgs;
}

// ── Types ──────────────────────────────────────────────────────────────
export const ProjectInfoSchema = z.object({
	folder: z.string(),
	name: z.string(),
	version: z.string(),
	deps: z.number(),
	devDeps: z.number(),
	totalDeps: z.number(),
	engine: z.string(),
	lock: z.enum(['bun.lock', 'bun.lockb', 'none']),
	bunfig: z.boolean(),
	workspace: z.boolean(),
	keyDeps: z.array(z.string()),
	author: z.string(),
	license: z.string(),
	description: z.string(),
	scriptsCount: z.number(),
	bin: z.array(z.string()),
	registry: z.string(),
	authReady: z.boolean(),
	hasNpmrc: z.boolean(),
	hasBinDir: z.boolean(),
	scopes: z.array(z.string()),
	resilient: z.boolean(),
	hasPkg: z.boolean(),
	frozenLockfile: z.boolean(),
	dryRun: z.boolean(),
	production: z.boolean(),
	exact: z.boolean(),
	installOptional: z.boolean(),
	installDev: z.boolean(),
	installAuto: z.enum(['auto', 'force', 'disable', 'fallback', '-']),
	linker: z.enum(['hoisted', 'isolated', '-']),
	configVersion: z.number(),
	backend: z.string(),
	minimumReleaseAge: z.number(),
	minimumReleaseAgeExcludes: z.array(z.string()),
	saveTextLockfile: z.boolean(),
	cacheDisabled: z.boolean(),
	cacheDir: z.string(),
	cacheDisableManifest: z.boolean(),
	globalDir: z.string(),
	globalBinDir: z.string(),
	hasCa: z.boolean(),
	lockfileSave: z.boolean(),
	lockfilePrint: z.string(),
	installSecurityScanner: z.string(),
	linkWorkspacePackages: z.boolean(),
	noVerify: z.boolean(),
	verbose: z.boolean(),
	silent: z.boolean(),
	concurrentScripts: z.number(),
	networkConcurrency: z.number(),
	targetCpu: z.string(),
	targetOs: z.string(),
	overrides: z.record(z.string(), z.string()),
	resolutions: z.record(z.string(), z.string()),
	trustedDeps: z.array(z.string()),
	repo: z.string(),
	repoSource: z.string(),
	repoOwner: z.string(),
	repoHost: z.string(),
	envFiles: z.array(z.string()),
	projectTz: z.string(),
	projectDnsTtl: z.string(),
	bunfigEnvRefs: z.array(z.string()),
	peerDeps: z.array(z.string()),
	peerDepsMeta: z.array(z.string()),
	installPeer: z.boolean(),
	runShell: z.string(),
	runBun: z.boolean(),
	runSilent: z.boolean(),
	debugEditor: z.string(),
	hasTests: z.boolean(),
	nativeDeps: z.array(z.string()),
	workspacesList: z.array(z.string()),
	lockHash: z.string(),
});

export type ProjectInfo = z.infer<typeof ProjectInfoSchema>;

// ── Accepted install.auto values ──────────────────────────────────────
const VALID_AUTO = new Set(['auto', 'force', 'disable', 'fallback']);

// ── Accepted bun install --cpu / --os values ──────────────────────────
const VALID_CPU = new Set(['arm64', 'x64', 'ia32', 'ppc64', 's390x']);
const VALID_OS = new Set(['linux', 'darwin', 'win32', 'freebsd', 'openbsd', 'sunos', 'aix']);

// ── Notable dependency names to flag ───────────────────────────────────
const NOTABLE = new Set([
	'elysia',
	'hono',
	'express',
	'fastify',
	'koa',
	'react',
	'next',
	'vue',
	'svelte',
	'solid-js',
	'astro',
	'typescript',
	'zod',
	'drizzle-orm',
	'prisma',
	'@prisma/client',
	'tailwindcss',
	'vite',
	'webpack',
	'eslint',
	'prettier',
	'bun-types',
	'@anthropic-ai/sdk',
	'openai',
	'discord.js',
	'@modelcontextprotocol/sdk',
]);

// ── Recursive override flattener (npm nested overrides use ">") ──────
function flattenOverrides(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
	const result: Record<string, string> = {};
	for (const [key, value] of Object.entries(obj)) {
		const fullKey = prefix ? `${prefix}>${key}` : key;
		if (typeof value === 'string') {
			result[fullKey] = value;
		} else if (value && typeof value === 'object' && !Array.isArray(value)) {
			Object.assign(result, flattenOverrides(value as Record<string, unknown>, fullKey));
		} else {
			result[fullKey] = String(value);
		}
	}
	return result;
}

// ── Override value risk classification ────────────────────────────────
const SUSPICIOUS_OVERRIDE_PREFIXES = ['npm:', 'git:', 'git+', 'github:', 'file:', 'http:', 'https:', 'link:'];

function classifyOverrideValue(value: string): string | null {
	const v = value.trim().toLowerCase();
	for (const prefix of SUSPICIOUS_OVERRIDE_PREFIXES) {
		if (v.startsWith(prefix)) {
			if (prefix === 'npm:') return 'redirect';
			if (prefix === 'git:' || prefix === 'git+' || prefix === 'github:') return 'git-source';
			if (prefix === 'file:' || prefix === 'link:') return 'local-path';
			if (prefix === 'http:' || prefix === 'https:') return 'url';
		}
	}
	return null;
}

// ── Native dependency detection pattern ───────────────────────────────
const NATIVE_PATTERN = /napi|prebuild|node-gyp|node-pre-gyp|ffi-napi|binding\.gyp|cmake-js|cargo-cp-artifact/i;
const _nativeCache = new Map<string, boolean>();
function isNativeMatch(s: string): boolean {
	let r = _nativeCache.get(s);
	if (r === undefined) {
		r = NATIVE_PATTERN.test(s);
		_nativeCache.set(s, r);
	}
	return r;
}

/** Bun's built-in default trusted dependencies (bun 1.2.x).
 *  Source: github.com/oven-sh/bun/blob/main/src/install/default-trusted-dependencies.txt */
const BUN_DEFAULT_TRUSTED = new Set([
	'@airbnb/node-memwatch',
	'@apollo/protobufjs',
	'@apollo/rover',
	'@appsignal/nodejs',
	'@arkweid/lefthook',
	'@aws-amplify/cli',
	'@bahmutov/add-typescript-to-cypress',
	'@bazel/concatjs',
	'@bazel/cypress',
	'@bazel/esbuild',
	'@bazel/hide-bazel-files',
	'@bazel/jasmine',
	'@bazel/protractor',
	'@bazel/rollup',
	'@bazel/terser',
	'@bazel/typescript',
	'@bufbuild/buf',
	'@cdktf/node-pty-prebuilt-multiarch',
	'@ckeditor/ckeditor5-vue',
	'@cloudflare/wrangler',
	'@contrast/fn-inspect',
	'@cubejs-backend/cubestore',
	'@cubejs-backend/native',
	'@cypress/snapshot',
	'@danmarshall/deckgl-typings',
	'@datadog/mobile-react-native',
	'@discordjs/opus',
	'@eversdk/lib-node',
	'@evilmartians/lefthook',
	'@ffmpeg-installer/darwin-arm64',
	'@ffmpeg-installer/darwin-x64',
	'@ffmpeg-installer/linux-arm',
	'@ffmpeg-installer/linux-arm64',
	'@ffmpeg-installer/linux-ia32',
	'@ffmpeg-installer/linux-x64',
	'@ffprobe-installer/darwin-arm64',
	'@ffprobe-installer/darwin-x64',
	'@ffprobe-installer/linux-arm',
	'@ffprobe-installer/linux-arm64',
	'@ffprobe-installer/linux-ia32',
	'@ffprobe-installer/linux-x64',
	'@fingerprintjs/fingerprintjs-pro-react',
	'@ghaiklor/x509',
	'@go-task/cli',
	'@injectivelabs/sdk-ts',
	'@instana/autoprofile',
	'@intlify/vue-i18n-bridge',
	'@intlify/vue-router-bridge',
	'@matteodisabatino/gc_info',
	'@memlab/cli',
	'@microsoft.azure/autorest-core',
	'@microsoft/teamsfx-cli',
	'@microsoft/ts-command-line',
	'@napi-rs/pinyin',
	'@nativescript/core',
	'@netlify/esbuild',
	'@newrelic/native-metrics',
	'@notarize/qlc-cli',
	'@nx-dotnet/core',
	'@opensearch-project/oui',
	'@pact-foundation/pact-node',
	'@paloaltonetworks/postman-code-generators',
	'@pdftron/pdfnet-node',
	'@percy/core',
	'@pnpm/exe',
	'@prisma/client',
	'@prisma/engines',
	'@progress/kendo-licensing',
	'@pulumi/aws-native',
	'@pulumi/awsx',
	'@pulumi/command',
	'@pulumi/kubernetes',
	'@railway/cli',
	'@replayio/cypress',
	'@replayio/playwright',
	'@roots/bud-framework',
	'@sap/hana-client',
	'@sap/hana-performance-tools',
	'@sap/hana-theme-vscode',
	'@scarf/scarf',
	'@sematext/gc-stats',
	'@sentry/capacitor',
	'@sentry/profiling-node',
	'@serialport/bindings',
	'@serialport/bindings-cpp',
	'@shopify/ngrok',
	'@shopify/plugin-cloudflare',
	'@sitespeed.io/chromedriver',
	'@sitespeed.io/edgedriver',
	'@softvisio/core',
	'@splunk/otel',
	'@strapi/strapi',
	'@sveltejs/kit',
	'@syncfusion/ej2-angular-base',
	'@taquito/taquito',
	'@temporalio/core-bridge',
	'@tensorflow/tfjs-node',
	'@trufflesuite/bigint-buffer',
	'@typescript-tools/rust-implementation',
	'@vaadin/vaadin-usage-statistics',
	'@vscode/ripgrep',
	'@vscode/sqlite3',
	'abstract-socket',
	'admin-lte',
	'appdynamics',
	'appium-chromedriver',
	'appium-windows-driver',
	'applicationinsights-native-metrics',
	'argon2',
	'autorest',
	'aws-crt',
	'azure-functions-core-tools',
	'azure-streamanalytics-cicd',
	'backport',
	'bcrypt',
	'better-sqlite3',
	'bigint-buffer',
	'blake-hash',
	'bs-platform',
	'bufferutil',
	'bun',
	'canvacord',
	'canvas',
	'cbor-extract',
	'chromedriver',
	'chromium',
	'classic-level',
	'cld',
	'cldr-data',
	'clevertap-react-native',
	'clientjs',
	'cmark-gfm',
	'compresion',
	'contentlayer',
	'contextify',
	'cordova.plugins.diagnostic',
	'couchbase',
	'cpu-features',
	'cwebp-bin',
	'cy2',
	'cypress',
	'dd-trace',
	'deasync',
	'detox',
	'detox-recorder',
	'diskusage',
	'dotnet-2.0.0',
	'dprint',
	'drivelist',
	'dtrace-provider',
	'duckdb',
	'dugite',
	'eccrypto',
	'egg-bin',
	'egg-ci',
	'electron',
	'electron-chromedriver',
	'electron-prebuilt',
	'electron-winstaller',
	'elm',
	'elm-format',
	'esbuild',
	'esoftplay',
	'event-loop-stats',
	'exifreader',
	'farmhash',
	'fast-folder-size',
	'faunadb',
	'ffi',
	'ffi-napi',
	'ffmpeg-static',
	'fibers',
	'fmerge',
	'free-email-domains',
	'fs-xattr',
	'full-icu',
	'gatsby',
	'gc-stats',
	'gcstats.js',
	'geckodriver',
	'gentype',
	'ghooks',
	'gif2webp-bin',
	'gifsicle',
	'git-commit-msg-linter',
	'git-validate',
	'git-win',
	'gl',
	'go-ios',
	'grpc',
	'grpc-tools',
	'handbrake-js',
	'hasura-cli',
	'heapdump',
	'hiredis',
	'hnswlib-node',
	'hugo-bin',
	'hummus',
	'ibm_db',
	'iconv',
	'iedriver',
	'iltorb',
	'incremental-json-parser',
	'install-peers',
	'interruptor',
	'iobroker.js-controller',
	'iso-constants',
	'isolated-vm',
	'java',
	'jest-preview',
	'jpeg-recompress-bin',
	'jpegtran-bin',
	'keccak',
	'kerberos',
	'keytar',
	'lefthook',
	'leveldown',
	'libpg-query',
	'libpq',
	'libxmljs',
	'libxmljs2',
	'lightningcss-cli',
	'lint',
	'lmdb',
	'lmdb-store',
	'local-cypress',
	'lz4',
	'lzma-native',
	'lzo',
	'macos-alias',
	'mbt',
	'memlab',
	'microtime',
	'minidump',
	'mmmagic',
	'modern-syslog',
	'mongodb-client-encryption',
	'mongodb-crypt-library-dummy',
	'mongodb-crypt-library-version',
	'mongodb-memory-server',
	'mozjpeg',
	'ms-chromium-edge-driver',
	'msgpackr-extract',
	'msnodesqlv8',
	'msw',
	'muhammara',
	'netlify-cli',
	'ngrok',
	'ngx-popperjs',
	'nice-napi',
	'node',
	'node-expat',
	'node-hid',
	'node-jq',
	'node-libcurl',
	'node-mac-contacts',
	'node-pty',
	'node-rdkafka',
	'node-sass',
	'node-webcrypto-ossl',
	'node-zopfli',
	'node-zopfli-es',
	'nodegit',
	'nodejieba',
	'nodent-runtime',
	'nx',
	'odiff-bin',
	'oniguruma',
	'opencode-ai',
	'optipng-bin',
	'oracledb',
	'os-dns-native',
	'parse-server',
	'phantomjs',
	'phantomjs-prebuilt',
	'pkcs11js',
	'playwright-chromium',
	'playwright-firefox',
	'playwright-webkit',
	'pngout-bin',
	'pngquant-bin',
	'posix',
	'pprof',
	'pre-commit',
	'pre-push',
	'prisma',
	'protoc',
	'protoc-gen-grpc-web',
	'puppeteer',
	'purescript',
	're2',
	'react-jsx-parser',
	'react-native-stylex',
	'react-particles',
	'react-tsparticles',
	'react-vertical-timeline-component',
	'realm',
	'redis-memory-server',
	'ref',
	'ref-napi',
	'registry-js',
	'robotjs',
	'sauce-connect-launcher',
	'saucectl',
	'secp256k1',
	'segfault-handler',
	'shared-git-hooks',
	'sharp',
	'simple-git-hooks',
	'sleep',
	'slice2js',
	'snyk',
	'sockopt',
	'sodium-native',
	'sonar-scanner',
	'spago',
	'spectron',
	'spellchecker',
	'sq-native',
	'sqlite3',
	'sse4_crc32',
	'ssh2',
	'storage-engine',
	'subrequests',
	'subrequests-express',
	'subrequests-json-merger',
	'supabase',
	'svf-lib',
	'swagger-ui',
	'swiftlint',
	'taiko',
	'tldjs',
	'tree-sitter',
	'tree-sitter-cli',
	'tree-sitter-json',
	'tree-sitter-kotlin',
	'tree-sitter-typescript',
	'tree-sitter-yaml',
	'truffle',
	'tsparticles-engine',
	'ttag-cli',
	'ttf2woff2',
	'typemoq',
	'unix-dgram',
	'ursa-optional',
	'usb',
	'utf-8-validate',
	'v8-profiler-next',
	'vue-demi',
	'vue-echarts',
	'vue-inbrowser-compiler-demi',
	'wd',
	'wdeasync',
	'weak-napi',
	'webdev-toolkit',
	'windows-build-tools',
	'wix-style-react',
	'wordpos',
	'workerd',
	'wrtc',
	'xxhash',
	'yo',
	'yorkie',
	'zeromq',
	'zlib-sync',
	'zopflipng-bin',
]);

/** Root directory to scan; uses parent directory or BUN_PLATFORM_HOME if set */
const PROJECTS_ROOT = Bun.env.BUN_PLATFORM_HOME ?? '..';
const projectDir = (p: {folder: string}) => `${PROJECTS_ROOT}/${p.folder}`;

const _secrets = Bun.secrets;
// ── Keychain (Bun.secrets) ────────────────────────────────────────────
export const BUN_KEYCHAIN_SERVICE = 'dev.bun.scanner';
export const BUN_KEYCHAIN_SERVICE_LEGACY = 'bun-scanner';
export const BUN_KEYCHAIN_TOKEN_NAMES = ['FW_REGISTRY_TOKEN', 'REGISTRY_TOKEN'] as const;

export function isValidTokenName(name: string): boolean {
	return (BUN_KEYCHAIN_TOKEN_NAMES as readonly string[]).includes(name);
}

export function validateTokenValue(value: string): {valid: true} | {valid: false; reason: string} {
	if (value.length === 0) return {valid: false, reason: 'token value is empty'};
	if (value.trim().length === 0) return {valid: false, reason: 'token value is only whitespace'};
	if (value.length < 8) return {valid: false, reason: `token value is too short (${value.length} chars, minimum 8)`};
	if (new Set(value).size === 1) return {valid: false, reason: 'token value is a single repeated character'};
	return {valid: true};
}

const _PLACEHOLDER_TOKENS = new Set([
	'test1234',
	'password',
	'changeme',
	'12345678',
	'abcdefgh',
	'xxxxxxxx',
	'tokenhere',
	'secretkey',
	'changeit',
	'testtoken',
]);

export function tokenValueWarnings(value: string): string[] {
	const warnings: string[] = [];
	if (_PLACEHOLDER_TOKENS.has(value.toLowerCase())) {
		warnings.push(`"${value}" looks like a placeholder — make sure this is a real token`);
	}
	return warnings;
}

const _keychainLoadedTokens = new Set<string>();

// ── Keychain metrics ──────────────────────────────────────────────────
interface TokenMetrics {
	accessed: number;
	failed: number;
	lastAccessed: number | null; // epoch ms
	lastFailed: number | null; // epoch ms
	lastFailCode: KeychainErr['code'] | null;
	storedAt: string | null; // ISO from keychain comment
}
const _tokenMetrics = new Map<string, TokenMetrics>();

function getMetrics(name: string): TokenMetrics {
	let m = _tokenMetrics.get(name);
	if (!m) {
		m = {accessed: 0, failed: 0, lastAccessed: null, lastFailed: null, lastFailCode: null, storedAt: null};
		_tokenMetrics.set(name, m);
	}
	return m;
}

function recordAccess(name: string): void {
	const m = getMetrics(name);
	m.accessed++;
	m.lastAccessed = Date.now();
}

export function timeSince(date: Date): string {
	const sec = Math.floor((Date.now() - date.getTime()) / 1000);
	if (sec < 60) return `${sec}s ago`;
	const min = Math.floor(sec / 60);
	if (min < 60) return `${min}m ago`;
	const hr = Math.floor(min / 60);
	if (hr < 24) return `${hr}h ago`;
	const days = Math.floor(hr / 24);
	return `${days}d ago`;
}

function recordFailure(name: string, code: KeychainErr['code']): void {
	const m = getMetrics(name);
	m.failed++;
	m.lastFailed = Date.now();
	m.lastFailCode = code;
}

interface KeychainOk<T> {
	ok: true;
	value: T;
}
export interface KeychainErr {
	ok: false;
	code: 'NO_API' | 'ACCESS_DENIED' | 'NOT_FOUND' | 'OS_ERROR';
	reason: string;
}
type KeychainResult<T> = KeychainOk<T> | KeychainErr;

function keychainUnavailableErr(): KeychainErr {
	const v = typeof Bun !== 'undefined' ? Bun.version : 'unknown';
	return {
		ok: false,
		code: 'NO_API',
		reason: `Bun.secrets API not available (Bun ${v}; requires a build with keychain support)`,
	};
}

export function classifyKeychainError(err: unknown): KeychainErr {
	const msg = err instanceof Error ? err.message : String(err);
	const lower = msg.toLowerCase();
	if (
		lower.includes('denied') ||
		lower.includes('authorization') ||
		lower.includes('permission') ||
		lower.includes('not allowed')
	)
		return {ok: false, code: 'ACCESS_DENIED', reason: `Keychain access denied: ${msg}`};
	if (lower.includes('not found') || lower.includes('no such') || lower.includes('could not be found'))
		return {ok: false, code: 'NOT_FOUND', reason: `Keychain item not found: ${msg}`};
	return {ok: false, code: 'OS_ERROR', reason: `Keychain OS error: ${msg}`};
}

// -- dispatch: security CLI first, Bun.secrets fallback --------------------
const _hasBunSecrets = !!(globalThis.secrets?.get ?? (Bun as unknown as {secrets?: unknown}).secrets);
const _isDarwin = process.platform === 'darwin';

// macOS `security -w` hex-encodes passwords containing control chars (e.g. newlines).
// Detect all-hex output and decode it back to the original UTF-8 string.
function _tryHexDecode(hex: string): string | null {
	if (hex.length < 2 || hex.length % 2 !== 0 || !/^[0-9a-f]+$/.test(hex)) return null;
	try {
		const bytes = new Uint8Array(hex.length / 2);
		for (let i = 0; i < hex.length; i += 2) {
			bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
		}
		return new TextDecoder('utf-8', {fatal: true}).decode(bytes);
	} catch {
		return null;
	}
}

async function _securityCliGet(service: string, name: string): Promise<string | null> {
	if (!_isDarwin) return null;
	try {
		const proc = Bun.spawn(['security', 'find-generic-password', '-s', service, '-a', name, '-w'], {
			stdout: 'pipe',
			stderr: 'pipe',
		});
		const exitCode = await proc.exited;
		if (exitCode !== 0) return null;
		const output = await new Response(proc.stdout).text();
		const trimmed = output.trim();
		if (trimmed.length === 0) return null;
		return _tryHexDecode(trimmed) ?? trimmed;
	} catch {
		return null;
	}
}

async function _securityCliSet(service: string, name: string, value: string): Promise<boolean> {
	if (!_isDarwin) return false;
	try {
		const proc = Bun.spawn(['security', 'add-generic-password', '-U', '-s', service, '-a', name, '-w', value], {
			stdout: 'pipe',
			stderr: 'pipe',
		});
		return (await proc.exited) === 0;
	} catch {
		return false;
	}
}

async function _securityCliDelete(service: string, name: string): Promise<boolean> {
	if (!_isDarwin) return false;
	try {
		const proc = Bun.spawn(['security', 'delete-generic-password', '-s', service, '-a', name], {
			stdout: 'pipe',
			stderr: 'pipe',
		});
		return (await proc.exited) === 0;
	} catch {
		return false;
	}
}

export async function keychainGet(
	name: string,
	service = BUN_KEYCHAIN_SERVICE,
): Promise<KeychainResult<string | null>> {
	// macOS: try security CLI first to avoid Keychain popup
	const cliValue = await _securityCliGet(service, name);
	if (cliValue !== null) {
		recordAccess(name);
		return {ok: true, value: cliValue};
	}

	let result: KeychainResult<string | null>;
	if (_hasBunSecrets) {
		try {
			const bunSecrets = (Bun as unknown as {secrets?: BunSecretsAPI | undefined}).secrets;
			const value = bunSecrets
				? ((await bunSecrets.get(service, name)) ?? null)
				: ((await globalThis.secrets!.get(service, name)) ?? null);
			result = {ok: true, value};
		} catch (err) {
			result = classifyKeychainError(err);
		}
	} else {
		result = keychainUnavailableErr();
	}
	if (result.ok && result.value) recordAccess(name);
	else if (!result.ok) recordFailure(name, result.code);
	return result;
}

export async function keychainSet(name: string, value: string): Promise<KeychainResult<void>> {
	// macOS: try security CLI first to avoid Keychain popup
	if (await _securityCliSet(BUN_KEYCHAIN_SERVICE, name, value)) {
		return {ok: true, value: undefined};
	}

	let result: KeychainResult<void>;
	if (_hasBunSecrets) {
		try {
			const bunSecrets = (Bun as unknown as {secrets?: BunSecretsAPI | undefined}).secrets;
			if (bunSecrets) await bunSecrets.set(BUN_KEYCHAIN_SERVICE, name, value);
			else await globalThis.secrets!.set(BUN_KEYCHAIN_SERVICE, name, value);
			result = {ok: true, value: undefined};
		} catch (err) {
			result = classifyKeychainError(err);
		}
	} else {
		result = keychainUnavailableErr();
	}
	if (!result.ok) recordFailure(name, result.code);
	return result;
}

export async function keychainDelete(name: string): Promise<KeychainResult<boolean>> {
	// macOS: try security CLI first to avoid Keychain popup
	const cliDeleted = await _securityCliDelete(BUN_KEYCHAIN_SERVICE, name);
	if (cliDeleted) {
		return {ok: true, value: true};
	}

	let result: KeychainResult<boolean>;
	if (_hasBunSecrets) {
		try {
			const bunSecrets = (Bun as unknown as {secrets?: BunSecretsAPI | undefined}).secrets;
			if (bunSecrets) {
				result = {ok: true, value: await bunSecrets.delete(BUN_KEYCHAIN_SERVICE, name)};
			} else {
				result = {ok: true, value: await globalThis.secrets!.delete(BUN_KEYCHAIN_SERVICE, name)};
			}
		} catch (err) {
			result = classifyKeychainError(err);
		}
	} else {
		result = keychainUnavailableErr();
	}
	if (!result.ok) recordFailure(name, result.code);
	return result;
}

export function tokenSource(name: string): 'env' | 'keychain' | 'not set' {
	if (_keychainLoadedTokens.has(name)) return 'keychain';
	if (Bun.env[name]) return 'env';
	return 'not set';
}

async function migrateKeychainService(): Promise<void> {
	const deleteWithService = async (name: string, service: string): Promise<void> => {
		if (!_hasBunSecrets) return;
		const bunSecrets = (Bun as unknown as {secrets?: BunSecretsAPI | undefined}).secrets;
		try {
			if (bunSecrets) await bunSecrets.delete(service, name);
			else await globalThis.secrets!.delete(service, name);
		} catch {
			// ignore cleanup failure
		}
	};

	for (const name of BUN_KEYCHAIN_TOKEN_NAMES) {
		const legacy = await keychainGet(name, BUN_KEYCHAIN_SERVICE_LEGACY);
		if (!legacy.ok || !legacy.value) continue;
		const current = await keychainGet(name, BUN_KEYCHAIN_SERVICE);
		if (current.ok && current.value) {
			// already exists under new service — just clean up legacy
			await deleteWithService(name, BUN_KEYCHAIN_SERVICE_LEGACY);
			continue;
		}
		const stored = await keychainSet(name, legacy.value);
		if (stored.ok) {
			await deleteWithService(name, BUN_KEYCHAIN_SERVICE_LEGACY);
		}
	}
}

async function autoLoadKeychainTokens(): Promise<void> {
	await migrateKeychainService();
	for (const name of BUN_KEYCHAIN_TOKEN_NAMES) {
		if (Bun.env[name]) continue;
		const result = await keychainGet(name);
		if (result.ok && result.value) {
			const check = validateTokenValue(result.value);
			if (!check.valid) {
				console.error(`${c.yellow('⚠')} Skipping keychain token ${c.cyan(name)}: ${check.reason}`);
				await logTokenEvent({event: 'load_skip', tokenName: name, result: 'invalid', detail: check.reason});
				continue;
			}
			process.env[name] = result.value;
			_keychainLoadedTokens.add(name);
			await logTokenEvent({event: 'load', tokenName: name, result: 'ok'});
		}
	}
}

async function readTokenFromStdin(): Promise<string> {
	if (process.stdin.isTTY) {
		// Interactive terminal — prompt the user
		process.stderr.write('Enter token value: ');
		const chunks: Buffer[] = [];
		for await (const chunk of process.stdin) {
			chunks.push(chunk);
			// Stop at first newline for interactive input
			if (chunk.includes('\n')) break;
		}
		const value = Buffer.concat(chunks).toString('utf8').trim();
		return value;
	}
	// Piped input — read entire stdin
	const text = await Bun.stdin.text();
	return text.replace(/\n$/, '').replace(/\r$/, '');
}

async function discoverRegistryUrl(): Promise<string> {
	// 1. BUN_CONFIG_REGISTRY env var
	if (Bun.env.BUN_CONFIG_REGISTRY) return Bun.env.BUN_CONFIG_REGISTRY.replace(/\/$/, '');
	// 2. First project's bunfig.toml
	try {
		const entries = await readdir(PROJECTS_ROOT, {withFileTypes: true});
		for (const e of entries) {
			if (!e.isDirectory() || e.name.startsWith('.') || e.name === 'scanner') continue;
			const bunfigFile = Bun.file(`${PROJECTS_ROOT}/${e.name}/bunfig.toml`);
			if (await bunfigFile.exists()) {
				const text = await bunfigFile.text();
				const match = text.match(/registry\s*=\s*"([^"]+)"/);
				if (match) return match[1].replace(/\/$/, '');
			}
		}
	} catch {
		/* fall through */
	}
	return 'https://registry.npmjs.org';
}

async function checkTokenHealth(): Promise<void> {
	const registryUrl = await discoverRegistryUrl();
	console.log(`\n${c.bold('  Token Health Check')}`);
	console.log(`  ${c.dim(`registry: ${registryUrl}`)}\n`);

	for (const name of BUN_KEYCHAIN_TOKEN_NAMES) {
		const kcResult = await keychainGet(name);
		const envVal = Bun.env[name];
		const value = kcResult.ok && kcResult.value ? kcResult.value : envVal;

		if (!value) {
			console.log(`    ${c.cyan(name.padEnd(24))} ${c.yellow('MISS')}  not set in keychain or env`);
			continue;
		}

		const check = validateTokenValue(value);
		if (!check.valid) {
			console.log(`    ${c.cyan(name.padEnd(24))} ${c.red('BAD ')}  ${check.reason}`);
			await logTokenEvent({event: 'check_fail', tokenName: name, result: 'bad_format', detail: check.reason});
			continue;
		}

		// Hit /-/whoami on the registry
		try {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), 5000);
			const res = await fetch(`${registryUrl}/-/whoami`, {
				headers: {Authorization: `Bearer ${value}`},
				signal: controller.signal,
			});
			clearTimeout(timeout);

			if (res.ok) {
				let username = '';
				try {
					const body = (await res.json()) as {username?: string};
					if (body.username) username = `  (${body.username})`;
				} catch {
					/* no body */
				}
				console.log(`    ${c.cyan(name.padEnd(24))} ${c.green('AUTH')}  registry returned 200${username}`);
			} else if (res.status === 401 || res.status === 403) {
				console.log(
					`    ${c.cyan(name.padEnd(24))} ${c.red('DENY')}  registry returned ${res.status} (token rejected)`,
				);
				await logTokenEvent({
					event: 'check_fail',
					tokenName: name,
					result: 'denied',
					detail: `HTTP ${res.status}`,
				});
			} else {
				console.log(`    ${c.cyan(name.padEnd(24))} ${c.yellow('WARN')}  unexpected HTTP ${res.status}`);
				await logTokenEvent({
					event: 'check_fail',
					tokenName: name,
					result: 'unexpected',
					detail: `HTTP ${res.status}`,
				});
			}
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			const label = msg.includes('abort') ? 'timeout' : 'network error';
			console.log(`    ${c.cyan(name.padEnd(24))} ${c.red('NET ')}  ${label}: ${msg}`);
			await logTokenEvent({event: 'check_fail', tokenName: name, result: 'network', detail: msg});
		}
	}
	console.log();
}

// ── Xref types ────────────────────────────────────────────────────────
export const XrefEntrySchema = z.object({
	folder: z.string(),
	bunDefault: z.array(z.string()),
	explicit: z.array(z.string()),
	blocked: z.array(z.string()),
	lockHash: z.string().optional(),
});

type XrefEntry = z.infer<typeof XrefEntrySchema>;

export const XrefSnapshotSchema = z.object({
	timestamp: z.string(),
	date: z.string(),
	tz: z.string(),
	tzOverride: z.boolean(),
	projects: z.array(XrefEntrySchema),
	totalBunDefault: z.number(),
	totalProjects: z.number(),
});

type XrefSnapshot = z.infer<typeof XrefSnapshotSchema>;

const SNAPSHOT_DIR = `${import.meta.dir}/.audit`;
const SNAPSHOT_PATH = `${SNAPSHOT_DIR}/xref-snapshot.json`;
const TOKEN_AUDIT_PATH = `${SNAPSHOT_DIR}/token-events.jsonl`;
export const BUN_TOKEN_AUDIT_RSS_PATH = `${SNAPSHOT_DIR}/token-events.rss.xml`;
export const BUN_SCAN_RESULTS_RSS_PATH = `${SNAPSHOT_DIR}/scan-results.rss.xml`;
export const BUN_ADVISORY_MATCHES_PATH = `${SNAPSHOT_DIR}/advisory-matches.jsonl`;
let _snapshotDirReady = false;
async function ensureSnapshotDir(): Promise<void> {
	if (_snapshotDirReady) return;
	await mkdir(SNAPSHOT_DIR, {recursive: true});
	_snapshotDirReady = true;
}

type TokenEvent = 'store' | 'delete' | 'load' | 'load_skip' | 'store_fail' | 'delete_fail' | 'check_fail';

async function logTokenEvent(evt: {
	event: TokenEvent;
	tokenName: string;
	result: string;
	detail?: string;
}): Promise<void> {
	try {
		await ensureSnapshotDir();
		const entry = {
			timestamp: new Date().toISOString(),
			event: evt.event,
			tokenName: evt.tokenName,
			user: Bun.env.USER ?? Bun.env.LOGNAME ?? 'unknown',
			result: evt.result,
			...(evt.detail ? {detail: evt.detail} : {}),
		};
		await appendFile(TOKEN_AUDIT_PATH, JSON.stringify(entry) + '\n');
	} catch {
		// audit must never break operations
	}
}

// ── XML / RSS helpers ──────────────────────────────────────────────────

export function escapeXml(text: string): string {
	return Bun.escapeHTML(text);
}

export function decodeXmlEntities(text: string): string {
	return text
		.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
		.replace(/&apos;|&#x27;/g, "'")
		.replace(/&quot;/g, '"')
		.replace(/&gt;/g, '>')
		.replace(/&lt;/g, '<')
		.replace(/&amp;/g, '&');
}

interface RssChannel {
	title: string;
	description: string;
	link: string;
	language?: string;
	ttl?: number;
	items: Array<{title: string; description: string; link?: string; pubDate: string; guid?: string}>;
}

export function generateRssXml(channel: RssChannel): string {
	const items = [...channel.items].sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
	const itemsXml = items
		.map(
			it =>
				`    <item>
      <title>${escapeXml(it.title)}</title>${it.link ? `\n      <link>${escapeXml(it.link)}</link>` : ''}
      <guid${!it.guid && it.link ? '' : ` isPermaLink="false"`}>${escapeXml(it.guid ?? it.link ?? it.title)}</guid>
      <description>${escapeXml(it.description)}</description>
      <pubDate>${escapeXml(it.pubDate)}</pubDate>
    </item>`,
		)
		.join('\n');
	const buildDate = new Date().toUTCString();
	const lang = channel.language ?? 'en-us';
	return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(channel.title)}</title>
    <link>${escapeXml(channel.link)}</link>
    <description>${escapeXml(channel.description)}</description>
    <language>${escapeXml(lang)}</language>
    <atom:link href="${escapeXml(channel.link)}" rel="self" type="application/rss+xml"/>
    <generator>Bun-Scanner</generator>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <pubDate>${buildDate}</pubDate>${channel.ttl != null ? `\n    <ttl>${channel.ttl}</ttl>` : ''}
${itemsXml}
  </channel>
</rss>
`;
}

interface RssFeedItem {
	title: string;
	link: string;
	description: string;
	pubDate: string;
}

export function parseRssFeed(xmlText: string): RssFeedItem[] {
	const results: RssFeedItem[] = [];

	// Try RSS 2.0 <item> elements
	const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
	let match: RegExpExecArray | null;
	while ((match = itemRegex.exec(xmlText)) !== null) {
		const block = match[1] ?? '';
		const title = decodeXmlEntities(block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');
		const link = decodeXmlEntities(block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] ?? '');
		const description = decodeXmlEntities(
			block.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1] ??
				block.match(/<content[^>]*>([\s\S]*?)<\/content>/i)?.[1] ??
				'',
		);
		const pubDate = decodeXmlEntities(block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1] ?? '');
		results.push({title, link, description, pubDate});
	}
	if (results.length > 0) return results;

	// Try Atom <entry> elements
	const entryRegex = /<entry[\s>]([\s\S]*?)<\/entry>/gi;
	while ((match = entryRegex.exec(xmlText)) !== null) {
		const block = match[1] ?? '';
		const title = decodeXmlEntities(block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');
		const linkMatch = block.match(/<link[^>]*href=["']([^"']*)["'][^>]*\/?>/i);
		const link = decodeXmlEntities(linkMatch?.[1] ?? block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] ?? '');
		const description = decodeXmlEntities(
			block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i)?.[1] ??
				block.match(/<content[^>]*>([\s\S]*?)<\/content>/i)?.[1] ??
				'',
		);
		const pubDate = decodeXmlEntities(
			block.match(/<published[^>]*>([\s\S]*?)<\/published>/i)?.[1] ??
				block.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i)?.[1] ??
				'',
		);
		results.push({title, link, description, pubDate});
	}

	return results;
}

// ── RSS feature functions ──────────────────────────────────────────────

async function publishTokenEventsRss(): Promise<void> {
	try {
		const file = Bun.file(TOKEN_AUDIT_PATH);
		if (!(await file.exists())) return;
		const text = await file.text();
		const lines = text.trim().split('\n').filter(Boolean);
		const events = lines
			.map(l => {
				try {
					return JSON.parse(l);
				} catch {
					return null;
				}
			})
			.filter(Boolean)
			.slice(-100)
			.reverse();
		if (events.length === 0) return;
		const items = events.map(
			(e: {event: string; tokenName: string; result: string; detail?: string; timestamp: string}) => ({
				title: `Token ${e.event}: ${e.tokenName}`,
				description: `Result: ${e.result}${e.detail ? ` — ${e.detail}` : ''}`,
				pubDate: e.timestamp ? new Date(e.timestamp).toUTCString() : new Date().toUTCString(),
				guid: `${e.timestamp}-${e.event}-${e.tokenName}`,
			}),
		);
		const xml = generateRssXml({
			title: 'Token Audit Events',
			description: 'Token lifecycle events from Bun-Scanner',
			link: `file://${BUN_TOKEN_AUDIT_RSS_PATH}`,
			items,
		});

		await ensureSnapshotDir();
		await Bun.write(BUN_TOKEN_AUDIT_RSS_PATH, xml);
		console.log(`  RSS  ${BUN_TOKEN_AUDIT_RSS_PATH} (${items.length} events)`);
	} catch (err) {
		console.error(
			'  Warning: failed to generate token events RSS:',
			err instanceof Error ? err.message : String(err),
		);
	}
}

async function consumeAdvisoryFeed(feedUrl: string, projects: ProjectInfo[]): Promise<void> {
	try {
		const ctrl = new AbortController();
		const timer = setTimeout(() => ctrl.abort(), 10_000);
		const res = await fetch(feedUrl, {
			signal: ctrl.signal,
			headers: {'User-Agent': 'Bun-Scanner/1.0'},
		});
		clearTimeout(timer);
		if (!res.ok) {
			console.error(`  Warning: advisory feed returned HTTP ${res.status}`);
			return;
		}
		const xmlText = await res.text();
		const advisories = parseRssFeed(xmlText);
		if (advisories.length === 0) {
			console.log('  Advisory feed: no entries found.');
			return;
		}

		const pkgNames = new Set<string>();
		for (const p of projects) {
			for (const dep of p.keyDeps) pkgNames.add(dep);
		}

		const matches: Array<{advisory: string; date: string; link: string; packages: string[]; folders: string[]}> =
			[];
		for (const adv of advisories) {
			const text = `${adv.title} ${adv.description}`;
			const matched: string[] = [];
			for (const pkg of pkgNames) {
				const re = new RegExp(`\\b${pkg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
				if (re.test(text)) matched.push(pkg);
			}
			if (matched.length > 0) {
				const folders = projects.filter(p => p.keyDeps.some(d => matched.includes(d))).map(p => p.folder);
				matches.push({advisory: adv.title, date: adv.pubDate, link: adv.link, packages: matched, folders});
			}
		}

		if (matches.length === 0) {
			console.log(`  Advisory feed: ${advisories.length} entries, no matches to local packages.`);
			return;
		}

		sectionHeader(`Advisory Matches (${matches.length})`);
		const advisoryRows = matches.map(m => ({
			Advisory: m.advisory,
			Date: m.date || '-',
			Link: m.link || '-',
			Packages: m.packages.join(', '),
			Projects: m.folders.join(', '),
		}));
		renderMatrix(advisoryRows, BUN_SCANNER_COLUMNS.ADVISORY_MATCHES);

		await ensureSnapshotDir();
		const lines = matches.map(m => JSON.stringify({...m, fetchedAt: new Date().toISOString()})).join('\n') + '\n';
		await appendFile(BUN_ADVISORY_MATCHES_PATH, lines);
		console.log(`  Appended ${matches.length} match(es) to ${BUN_ADVISORY_MATCHES_PATH}`);
	} catch (err) {
		const msg =
			err instanceof Error ? (err.name === 'AbortError' ? 'request timed out' : err.message) : String(err);
		console.error(`  Warning: advisory feed failed: ${msg}`);
	}
}

async function publishScanResultsRss(projects: ProjectInfo[]): Promise<void> {
	try {
		const notable = projects.filter(p => {
			if (!p.authReady) return true;
			if (p.engine === 'unknown') return true;
			if (p.lock === 'none') return true;
			if (Object.keys(p.overrides).length > 0 || Object.keys(p.resolutions).length > 0) return true;
			if (!p.resilient) return true;
			if (p.cacheDisabled) return true;
			if (p.noVerify) return true;
			return false;
		});
		if (notable.length === 0) return;

		const now = new Date().toUTCString();
		const ts = Date.now();
		const items = notable.map((p, i) => {
			const findings: string[] = [];
			if (!p.authReady) findings.push('auth not ready');
			if (p.engine === 'unknown') findings.push('unknown engine');
			if (p.lock === 'none') findings.push('no lockfile');
			if (Object.keys(p.overrides).length > 0) findings.push(`${Object.keys(p.overrides).length} override(s)`);
			if (Object.keys(p.resolutions).length > 0)
				findings.push(`${Object.keys(p.resolutions).length} resolution(s)`);
			if (!p.resilient) findings.push('not resilient');
			if (p.cacheDisabled) findings.push('cache disabled');
			if (p.noVerify) findings.push('verification disabled');
			return {
				title: `${p.name}@${p.version} — ${findings.length} finding(s)`,
				description: `Folder: ${p.folder}\nFindings: ${findings.join(', ')}`,
				pubDate: now,
				guid: `${p.folder}-${ts}-${i}`,
			};
		});

		const xml = generateRssXml({
			title: 'Scan Results',
			description: 'Notable findings from Bun-Scanner',
			link: `file://${BUN_SCAN_RESULTS_RSS_PATH}`,
			items,
		});

		await ensureSnapshotDir();
		await Bun.write(BUN_SCAN_RESULTS_RSS_PATH, xml);
		console.log(`  RSS  ${BUN_SCAN_RESULTS_RSS_PATH} (${items.length} project(s))`);
	} catch (err) {
		console.error(
			'  Warning: failed to generate scan results RSS:',
			err instanceof Error ? err.message : String(err),
		);
	}
}

async function saveXrefSnapshot(data: XrefEntry[], totalProjects: number): Promise<void> {
	await ensureSnapshotDir();
	const now = new Date();
	const snapshot: XrefSnapshot = {
		timestamp: now.toISOString(),
		date: fmtDate(now),
		tz: _tz,
		tzOverride: _tzExplicit,
		projects: data,
		totalBunDefault: data.reduce((s, x) => s + x.bunDefault.length, 0),
		totalProjects,
	};
	await Bun.write(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2) + '\n');
}

async function loadXrefSnapshot(path?: string): Promise<XrefSnapshot | null> {
	const file = Bun.file(path ?? SNAPSHOT_PATH);
	if (!(await file.exists())) return null;
	try {
		const raw = JSON.parse(await file.text());
		return XrefSnapshotSchema.parse(raw);
	} catch {
		return null;
	}
}

const LIFECYCLE_HOOKS = [
	'preinstall',
	'postinstall',
	'preuninstall',
	'prepare',
	'preprepare',
	'postprepare',
	'prepublishOnly',
] as const;

async function scanXrefData(
	projects: ProjectInfo[],
	prev?: XrefSnapshot | null,
): Promise<{entries: XrefEntry[]; skipped: number}> {
	const prevMap = prev ? new Map(prev.projects.map(x => [x.folder, x])) : null;
	let skipped = 0;

	const scanOne = async (p: ProjectInfo): Promise<XrefEntry | null> => {
		// Reuse cached entry when lockHash is unchanged
		if (prevMap && p.lockHash !== '-') {
			const cached = prevMap.get(p.folder);
			if (cached?.lockHash && cached.lockHash === p.lockHash) {
				skipped++;
				return cached;
			}
		}

		const nmDir = `${projectDir(p)}/node_modules`;
		let entries: string[];
		try {
			entries = await readdir(nmDir);
		} catch {
			return null;
		}
		const trusted = new Set(p.trustedDeps);
		const xref: XrefEntry = {folder: p.folder, bunDefault: [], explicit: [], blocked: [], lockHash: p.lockHash};
		const seen = new Set<string>();
		const classify = (pkgName: string, scripts: Record<string, string>) => {
			let hasAnyHook = false;
			for (const h of LIFECYCLE_HOOKS) {
				if (scripts[h]) {
					hasAnyHook = true;
					break;
				}
			}
			if (hasAnyHook && !seen.has(pkgName)) {
				seen.add(pkgName);
				if (BUN_DEFAULT_TRUSTED.has(pkgName)) xref.bunDefault.push(pkgName);
				else if (trusted.has(pkgName)) xref.explicit.push(pkgName);
				else xref.blocked.push(pkgName);
			}
		};

		// Expand scoped entries into flat list of [pkgName, pkgJsonPath] pairs
		const reads: [string, string][] = [];
		for (const entry of entries) {
			if (entry.startsWith('@')) {
				let scoped: string[];
				try {
					scoped = await readdir(`${nmDir}/${entry}`);
				} catch {
					continue;
				}
				for (const sub of scoped) reads.push([`${entry}/${sub}`, `${nmDir}/${entry}/${sub}/package.json`]);
			} else {
				reads.push([entry, `${nmDir}/${entry}/package.json`]);
			}
		}

		// Read + parse all package.json files in parallel
		await Promise.all(
			reads.map(async ([name, path]) => {
				try {
					const pkg = JSON.parse(await Bun.file(path).text());
					if (pkg.scripts) classify(name, pkg.scripts);
				} catch {
					/* skip */
				}
			}),
		);

		return xref.bunDefault.length + xref.explicit.length + xref.blocked.length > 0 ? xref : null;
	};

	// Scan all projects in parallel
	const results = await Promise.all(projects.filter(p => p.hasPkg).map(scanOne));
	return {entries: results.filter((x): x is XrefEntry => x !== null), skipped};
}

// ── Default metadata for --fix ─────────────────────────────────────────
const DEFAULTS = {
	author: 'mike.hunt@factory.wager.com',
	license: 'MIT',
};

const AUDIT_FIELDS = ['author', 'license', 'description', 'version', 'engine'] as const;
type AuditField = (typeof AUDIT_FIELDS)[number];

// ── Scan a single project directory ────────────────────────────────────
export async function scanProject(dir: string): Promise<ProjectInfo> {
	const folder = dir.split('/').pop() ?? '';
	const profTag = `project:${folder}`;
	let profStart = 0;
	const profMark = (label: string) => {
		if (!_profileEnabled) return;
		const now = Bun.nanoseconds();
		if (profStart > 0) {
			const ms = (now - profStart) / 1e6;
			recordProjectProfile(`${profTag}:${label}`, ms);
		}
		profStart = now;
	};
	if (_profileEnabled) profStart = Bun.nanoseconds();

	const base: ProjectInfo = {
		folder,
		name: folder,
		version: '-',
		deps: 0,
		devDeps: 0,
		totalDeps: 0,
		engine: '-',
		lock: 'none',
		bunfig: false,
		workspace: false,
		keyDeps: [],
		author: '-',
		license: '-',
		description: '-',
		scriptsCount: 0,
		bin: [],
		registry: '-',
		authReady: false,
		hasNpmrc: false,
		hasBinDir: false,
		scopes: [],
		resilient: false,
		hasPkg: false,
		frozenLockfile: false,
		dryRun: false,
		production: false,
		exact: false,
		installOptional: true,
		installDev: true,
		installAuto: '-',
		linker: '-',
		configVersion: -1,
		backend: '-',
		minimumReleaseAge: 0,
		minimumReleaseAgeExcludes: [],
		saveTextLockfile: false,
		cacheDisabled: false,
		cacheDir: '-',
		cacheDisableManifest: false,
		globalDir: '-',
		globalBinDir: '-',
		hasCa: false,
		lockfileSave: true,
		lockfilePrint: '-',
		installSecurityScanner: '-',
		linkWorkspacePackages: false,
		noVerify: false,
		verbose: false,
		silent: false,
		concurrentScripts: 0,
		networkConcurrency: 0,
		targetCpu: '-',
		targetOs: '-',
		overrides: {},
		resolutions: {},
		trustedDeps: [],
		repo: '-',
		repoSource: '-',
		repoOwner: '-',
		repoHost: '-',
		envFiles: [],
		projectTz: 'UTC',
		projectDnsTtl: '-',
		bunfigEnvRefs: [],
		peerDeps: [],
		peerDepsMeta: [],
		installPeer: true, // Bun default is true
		runShell: '-',
		runBun: false,
		runSilent: false,
		debugEditor: '-',
		hasTests: false,
		nativeDeps: [],
		workspacesList: [],
		lockHash: '-',
	};

	// package.json
	let pkg: z.infer<typeof PackageJsonSchema> | null = null;
	const pkgFile = Bun.file(`${dir}/package.json`);
	const pkgExists = await pkgFile.exists();
	if (pkgExists) {
		try {
			const parsed = PackageJsonSchema.safeParse(await pkgFile.json());
			if (parsed.success) {
				pkg = parsed.data;
				base.hasPkg = true;
				base.name = pkg.name ?? folder;
				base.version = pkg.version ?? '-';

				const depsObj = pkg.dependencies ?? {};
				const devObj = pkg.devDependencies ?? {};
				base.deps = Object.keys(depsObj).length;
				base.devDeps = Object.keys(devObj).length;
				base.totalDeps = base.deps + base.devDeps;

				base.engine = pkg.engines?.bun ?? '-';
				base.workspace =
					Array.isArray(pkg.workspaces) || (typeof pkg.workspaces === 'object' && pkg.workspaces !== null);
				base.author = typeof pkg.author === 'string' ? pkg.author : (pkg.author?.name ?? '-');
				base.license = pkg.license ?? '-';
				base.description = pkg.description ?? '-';
				base.scriptsCount = pkg.scripts ? Object.keys(pkg.scripts).length : 0;
				base.hasTests = !!pkg.scripts?.test;

				// workspaces list
				if (Array.isArray(pkg.workspaces)) {
					base.workspacesList = pkg.workspaces;
				} else if (
					pkg.workspaces &&
					typeof pkg.workspaces === 'object' &&
					Array.isArray(pkg.workspaces.packages)
				) {
					base.workspacesList = pkg.workspaces.packages;
				}

				// bin field: string → single name, object → keys
				if (typeof pkg.bin === 'string') {
					base.bin = [base.name.split('/').pop() ?? base.name];
				} else if (pkg.bin && typeof pkg.bin === 'object') {
					base.bin = Object.keys(pkg.bin);
				}

				const allDeps = {...depsObj, ...devObj};
				base.keyDeps = Object.keys(allDeps).filter(d => NOTABLE.has(d));

				// trustedDependencies — packages allowed to run lifecycle scripts
				if (Array.isArray(pkg.trustedDependencies)) {
					base.trustedDeps = pkg.trustedDependencies;
					base.nativeDeps = base.trustedDeps.filter(name => NATIVE_PATTERN.test(name));
				}

				// overrides (npm/pnpm) / resolutions (yarn) — metadependency version pins
				const rawOverrides = pkg.overrides ?? pkg.pnpm?.overrides;
				if (rawOverrides && typeof rawOverrides === 'object') {
					base.overrides = flattenOverrides(rawOverrides as Record<string, unknown>);
				}
				if (pkg.resolutions && typeof pkg.resolutions === 'object') {
					base.resolutions = flattenOverrides(pkg.resolutions as Record<string, unknown>);
				}

				// peerDependencies / peerDependenciesMeta
				if (pkg.peerDependencies && typeof pkg.peerDependencies === 'object') {
					base.peerDeps = Object.keys(pkg.peerDependencies);
				}
				if (pkg.peerDependenciesMeta && typeof pkg.peerDependenciesMeta === 'object') {
					base.peerDepsMeta = Object.entries(pkg.peerDependenciesMeta)
						.filter(([, v]) => v?.optional === true)
						.map(([k]) => k);
				}

				// repository — string shorthand or { url } object
				const rawRepo = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url;
				if (rawRepo) {
					base.repo = normalizeGitUrl(rawRepo);
					base.repoSource = 'pkg';
					const meta = parseRepoMeta(base.repo);
					base.repoHost = meta?.host;
					base.repoOwner = meta?.owner;
				}
			}
		} catch (err) {
			_verboseWarn('package.json parse', err);
		}
	}
	profMark('pkg');

	// Git remote fallback when package.json has no repository
	if (base.repo === '-') {
		try {
			const result = Bun.spawnSync(['git', 'remote', 'get-url', 'origin'], {
				cwd: dir,
				stdout: 'pipe',
				stderr: 'ignore',
			});
			if (result.success) {
				const remote = result.stdout.toString().trim();
				if (remote) {
					base.repo = normalizeGitUrl(remote);
					base.repoSource = 'git';
					const meta = parseRepoMeta(base.repo);
					base.repoHost = meta?.host;
					base.repoOwner = meta?.owner;
				}
			}
		} catch (err) {
			_verboseWarn('git remote', err);
		}
	}
	profMark('git');

	// .env file detection + content read in a single I/O pass
	// (Bun load order: .env.local → .env.[NODE_ENV] → .env)
	const envCandidates = ['.env', '.env.local', '.env.development', '.env.production', '.env.test'];
	const envResults = await Promise.all(
		envCandidates.map(async f =>
			Bun.file(`${dir}/${f}`)
				.text()
				.catch(() => null),
		),
	);
	base.envFiles = envCandidates.filter((_, i) => envResults[i] !== null);
	const envContents = envResults.filter((c): c is string => c !== null);
	if (envContents.length > 0) {
		const envTz = parseTzFromEnv(envContents);
		if (envTz !== '-') base.projectTz = envTz;
		const envDns = parseEnvVar(envContents, 'BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS');
		if (envDns !== '-') base.projectDnsTtl = envDns;
	}
	profMark('env');

	// Lock file detection
	const [hasLock, hasLockb] = await Promise.all([
		Bun.file(`${dir}/bun.lock`).exists(),
		Bun.file(`${dir}/bun.lockb`).exists(),
	]);
	if (hasLock) {
		base.lock = 'bun.lock';
		try {
			const lockContent = await Bun.file(`${dir}/bun.lock`).text();
			base.lockHash = Bun.hash.wyhash(lockContent).toString(16);
			// bun.lock is JSONC (trailing commas) — regex the header instead of JSON.parse
			const lockHead = lockContent.slice(0, 200);
			const cvMatch = lockHead.match(/"configVersion"\s*:\s*(\d+)/);
			if (cvMatch) base.configVersion = parseInt(cvMatch[1], 10);
		} catch (err) {
			_verboseWarn('bun.lock read', err);
		}
	} else if (hasLockb) {
		base.lock = 'bun.lockb';
		try {
			const lockBytes = await Bun.file(`${dir}/bun.lockb`).arrayBuffer();
			base.lockHash = Bun.hash.wyhash(new Uint8Array(lockBytes)).toString(16);
		} catch (err) {
			_verboseWarn('bun.lockb read', err);
		}
	}
	profMark('lock');

	// bunfig.toml — detect presence, parse registry, scopes, and [install] options
	const bunfigFile = Bun.file(`${dir}/bunfig.toml`);
	base.bunfig = await bunfigFile.exists();
	if (base.bunfig) {
		try {
			const toml = await bunfigFile.text();
			// Match registry under [install] section: registry = "..."
			const match = toml.match(/^\s*registry\s*=\s*"([^"]+)"/m);
			if (match) base.registry = match[1].replace(/^https?:\/\//, '');

			// Detect [install.scopes] — extract scope names like "@factorywager", "@duoplus"
			const scopeMatches = toml.matchAll(/^\s*"(@[^"]+)"\s*=/gm);
			const inScopes = toml.includes('[install.scopes]');
			if (inScopes) {
				for (const m of scopeMatches) {
					base.scopes.push(m[1]);
				}
			}

			// Boolean [install] options
			const boolOpt = (key: string): boolean => {
				const m = toml.match(new RegExp(`^\\s*${key}\\s*=\\s*(true|false)`, 'm'));
				return m?.[1] === 'true';
			};
			base.frozenLockfile = boolOpt('frozenLockfile');
			base.dryRun = boolOpt('dryRun');
			base.production = boolOpt('production');
			base.exact = boolOpt('exact');
			base.saveTextLockfile = boolOpt('saveTextLockfile');
			base.linkWorkspacePackages = boolOpt('linkWorkspacePackages');

			// optional, dev, peer default to true in Bun — only store false as explicit override
			const optionalVal = toml.match(/^\s*optional\s*=\s*(true|false)/m);
			if (optionalVal) base.installOptional = optionalVal[1] === 'true';
			const devVal = toml.match(/^\s*dev\s*=\s*(true|false)/m);
			if (devVal) base.installDev = devVal[1] === 'true';
			const peerVal = toml.match(/^\s*peer\s*=\s*(true|false)/m);
			if (peerVal) base.installPeer = peerVal[1] === 'true';

			// String [install] options
			const strOpt = (key: string): string | undefined => {
				const m = toml.match(new RegExp(`^\\s*${key}\\s*=\\s*"([^"]+)"`, 'm'));
				return m?.[1];
			};
			const autoVal = strOpt('auto');
			if (autoVal) base.installAuto = autoVal as '-' | 'auto' | 'force' | 'disable' | 'fallback';
			const linkerVal = strOpt('linker');
			if (linkerVal) base.linker = linkerVal as '-' | 'isolated' | 'hoisted';
			const backendVal = strOpt('backend');
			if (backendVal) base.backend = backendVal;
			const cpuVal = strOpt('cpu');
			if (cpuVal) base.targetCpu = cpuVal;
			const osVal = strOpt('os');
			if (osVal) base.targetOs = osVal;
			base.noVerify = boolOpt('noVerify');
			base.verbose = boolOpt('verbose');
			base.silent = boolOpt('silent');

			// Number [install] options
			const numOpt = (key: string): number => {
				const m = toml.match(new RegExp(`^\\s*${key}\\s*=\\s*(\\d+)`, 'm'));
				return m ? parseInt(m[1], 10) : 0;
			};
			base.minimumReleaseAge = numOpt('minimumReleaseAge');
			const excludesMatch = toml.match(/^\s*minimumReleaseAgeExcludes\s*=\s*\[([^\]]*)\]/m);
			if (excludesMatch) {
				base.minimumReleaseAgeExcludes = [...excludesMatch[1].matchAll(/"([^"]+)"/g)].map(m => m[1]);
			}
			base.concurrentScripts = numOpt('concurrentScripts');
			base.networkConcurrency = numOpt('networkConcurrency');

			// Nested: [install.cache] or cache.disable / cache.dir
			const cacheDirMatch = toml.match(/^\s*(?:cache\.)?dir\s*=\s*"([^"]+)"/m);
			if (cacheDirMatch && toml.includes('[install.cache]')) base.cacheDir = cacheDirMatch[1];
			// Also handle flat form: cache.dir = "..."
			const flatCacheDir = toml.match(/^\s*cache\.dir\s*=\s*"([^"]+)"/m);
			if (flatCacheDir) base.cacheDir = flatCacheDir[1];
			base.cacheDisabled =
				toml.includes('cache.disable = true') || (toml.includes('[install.cache]') && boolOpt('disable'));
			base.cacheDisableManifest = toml.includes('disableManifest = true');

			// install.globalDir / install.globalBinDir
			const globalDirVal = strOpt('globalDir');
			if (globalDirVal) base.globalDir = globalDirVal;
			const globalBinDirVal = strOpt('globalBinDir');
			if (globalBinDirVal) base.globalBinDir = globalBinDirVal;

			// install.ca / install.cafile
			base.hasCa = /^\s*ca\s*=\s*/m.test(toml) || /^\s*cafile\s*=\s*/m.test(toml);

			// install.security.scanner — all valid TOML representations:
			// [install.security] scanner = "...", install.security.scanner = "...",
			// security.scanner = "...", security-scanner = "..."
			const scannerMatch = toml.match(/^\s*(?:install\.)?(?:security[.\-])?scanner\s*=\s*"([^"]+)"/m);
			if (scannerMatch) base.installSecurityScanner = scannerMatch[1];

			// Env var references: $VAR or ${VAR} or ${VAR?} in bunfig.toml
			const envRefs = new Set<string>();
			for (const m of toml.matchAll(/\$\{?([A-Z_][A-Z0-9_]*)\??\}?/g)) {
				envRefs.add(m[1]);
			}
			base.bunfigEnvRefs = [...envRefs].sort();

			// Helper: extract section content between [header] and next [header]
			const section = (name: string): string | null => {
				const re = new RegExp(`^\\[${name.replace(/\./g, '\\.')}\\]\\s*\\n([\\s\\S]*?)(?=^\\[|$)`, 'm');
				return re.exec(toml)?.[1] ?? null;
			};

			// [install.lockfile] save / print
			const lockfileBlock = section('install.lockfile');
			if (lockfileBlock) {
				if (/^\s*save\s*=\s*false/m.test(lockfileBlock)) base.lockfileSave = false;
				const printMatch = lockfileBlock.match(/^\s*print\s*=\s*"([^"]+)"/m);
				if (printMatch) base.lockfilePrint = printMatch[1];
			}

			// [run] section
			const runBlock = section('run');
			if (runBlock) {
				const shellMatch = runBlock.match(/^\s*shell\s*=\s*"([^"]+)"/m);
				if (shellMatch) base.runShell = shellMatch[1];
				if (/^\s*bun\s*=\s*true/m.test(runBlock)) base.runBun = true;
				if (/^\s*silent\s*=\s*true/m.test(runBlock)) base.runSilent = true;
			}

			// [debug] section
			const debugBlock = section('debug');
			if (debugBlock) {
				const editorMatch = debugBlock.match(/^\s*editor\s*=\s*"([^"]+)"/m);
				if (editorMatch) base.debugEditor = editorMatch[1];
			}
		} catch (err) {
			_verboseWarn('bunfig parse', err);
		}
	}
	profMark('bunfig');

	// Fallback: package.json publishConfig.registry
	if (base.registry === '-' && pkg) {
		const reg = pkg.publishConfig?.registry;
		if (reg) base.registry = reg.replace(/^https?:\/\//, '');
	}

	// .npmrc existence + auth token detection
	const npmrcFile = Bun.file(`${dir}/.npmrc`);
	if (await npmrcFile.exists()) {
		base.hasNpmrc = true;
		try {
			const content = await npmrcFile.text();
			// Env-linked: ${FW_REGISTRY_TOKEN?} — only "ready" if the env var is actually set
			const isEnvLinked = content.includes('${FW_REGISTRY_TOKEN?}');
			base.resilient = isEnvLinked;
			if (isEnvLinked) {
				base.authReady = !!Bun.env.FW_REGISTRY_TOKEN;
			} else {
				base.authReady = content.includes('_authToken');
			}
		} catch (err) {
			_verboseWarn('.npmrc read', err);
		}
	}
	profMark('npmrc');

	// bin/ directory detection ($PROJECT_HOME/bin)
	const binEntries = await readdir(`${dir}/bin`).catch(() => null);
	base.hasBinDir = binEntries !== null && binEntries.length > 0;
	profMark('bin');

	return base;
}

// ── IPC worker pool for parallel project scanning ─────────────────────

const _IPCToWorkerSchema = z.discriminatedUnion('type', [
	z.object({type: z.literal('scan'), id: z.number(), dir: z.string()}),
	z.object({type: z.literal('shutdown')}),
]);

const IPCFromWorkerSchema = z.discriminatedUnion('type', [
	z.object({type: z.literal('ready')}),
	z.object({type: z.literal('result'), id: z.number(), data: ProjectInfoSchema}),
	z.object({type: z.literal('error'), id: z.number(), error: z.string()}),
]);

type IPCToWorker = z.infer<typeof IPCToWorkerSchema>;
type IPCFromWorker = z.infer<typeof IPCFromWorkerSchema>;

async function scanProjectsViaIPC(dirs: string[]): Promise<ProjectInfo[]> {
	const cpuCount = availableParallelism();
	const poolSize = Math.min(cpuCount, dirs.length, 8);
	const workerPath = Bun.fileURLToPath(new URL('./scan-worker.ts', import.meta.url));
	const results = new Map<number, ProjectInfo>();
	let nextIdx = 0;

	return new Promise<ProjectInfo[]>((resolve, reject) => {
		const workers: ReturnType<typeof Bun.spawn>[] = [];
		let settled = false;

		const timer = setTimeout(() => {
			if (!settled) {
				settled = true;
				cleanup();
				reject(new Error('IPC worker pool timed out after 30s'));
			}
		}, 30_000);

		function cleanup() {
			clearTimeout(timer);
			process.removeListener('SIGINT', sigHandler);
			for (const w of workers) {
				try {
					w.kill();
				} catch {
					/* expected: process may already be dead */
				}
			}
		}

		function finish() {
			if (settled) return;
			settled = true;
			cleanup();
			// All indices are filled before finish() is called (results.size === dirs.length).
			resolve(dirs.map((_, i) => results.get(i)!));
		}

		function dispatch(worker: ReturnType<typeof Bun.spawn>) {
			if (nextIdx < dirs.length) {
				const id = nextIdx++;
				worker.send({type: 'scan', id, dir: dirs[id]} satisfies IPCToWorker);
			} else {
				worker.send({type: 'shutdown'} satisfies IPCToWorker);
			}
		}

		function handleMessage(worker: ReturnType<typeof Bun.spawn>, msg: IPCFromWorker) {
			if (settled) return;
			if (msg.type === 'ready') {
				dispatch(worker);
			} else if (msg.type === 'result') {
				const validated = ProjectInfoSchema.parse(msg.data);
				results.set(msg.id, validated);
				if (results.size === dirs.length) finish();
				else dispatch(worker);
			} else if (msg.type === 'error') {
				// Per-project fallback: scan inline if worker fails for this project
				const failedId = msg.id;
				scanProject(dirs[failedId])
					.then(data => {
						results.set(failedId, data);
						if (results.size === dirs.length) finish();
						else dispatch(worker);
					})
					.catch(() => {
						if (!settled) {
							settled = true;
							cleanup();
							reject(new Error(`Failed to scan ${dirs[failedId]}`));
						}
					});
			}
		}

		for (let i = 0; i < poolSize; i++) {
			const worker = Bun.spawn(['bun', workerPath], {
				stdio: ['ignore', 'ignore', 'ignore'],
				ipc(message) {
					try {
						handleMessage(worker, IPCFromWorkerSchema.parse(message));
					} catch {
						if (!settled) {
							settled = true;
							cleanup();
							reject(new Error('IPC worker sent invalid message'));
						}
					}
				},
			});
			workers.push(worker);
		}

		const sigHandler = () => {
			if (!settled) {
				settled = true;
				cleanup();
			}
			process.exit(130);
		};
		process.on('SIGINT', sigHandler);
	});
}

// ── Filter matching (globs + boolean field expressions) ────────────────
type BoolFieldName =
	| 'bunfig'
	| 'workspace'
	| 'authReady'
	| 'hasNpmrc'
	| 'hasBinDir'
	| 'hasPkg'
	| 'resilient'
	| 'frozenLockfile'
	| 'production'
	| 'exact'
	| 'saveTextLockfile'
	| 'cacheDisabled'
	| 'linkWorkspacePackages';

const BOOL_FIELDS = new Set<BoolFieldName | 'scoped'>([
	'bunfig',
	'workspace',
	'authReady',
	'hasNpmrc',
	'hasBinDir',
	'hasPkg',
	'scoped',
	'resilient',
	'frozenLockfile',
	'production',
	'exact',
	'saveTextLockfile',
	'cacheDisabled',
	'linkWorkspacePackages',
]);

const _globCache = new Map<string, InstanceType<typeof Bun.Glob>>();
function matchFilter(p: ProjectInfo, pattern: string): boolean {
	// Boolean field expression: "authReady", "!authReady", "\!hasNpmrc", etc.
	// Strip shell-escaped backslash before !
	const cleaned = pattern.replace(/^\\!/, '!');
	const negated = cleaned.startsWith('!');
	const field = negated ? cleaned.slice(1) : cleaned;
	if (BOOL_FIELDS.has(field)) {
		const val = field === 'scoped' ? p.scopes.length > 0 : !!p[field as BoolFieldName];
		return negated ? !val : val;
	}

	// Glob match against folder or name
	let glob = _globCache.get(pattern);
	if (!glob) {
		glob = new Bun.Glob(pattern);
		_globCache.set(pattern, glob);
	}
	return glob.match(p.folder) || glob.match(p.name);
}

// ── Deep inspect view ──────────────────────────────────────────────────
function inspectProject(p: ProjectInfo): void {
	const line = (label: string, value: string | number | boolean) =>
		console.log(`  ${c.cyan(label.padEnd(16))} ${value}`);

	console.log();
	console.log(c.bold(c.magenta(`  ╭─ ${p.name} ─╮`)));
	console.log();
	line('Folder', p.folder);
	line('Name', p.name);
	line('Version', p.version);
	line('Description', p.description);
	line('Author', p.author);
	line('License', p.license);
	console.log();
	line('Dependencies', p.deps);
	line('DevDeps', p.devDeps);
	line('Total Deps', p.totalDeps);
	line('Scripts', p.scriptsCount);
	console.log();
	line('Engine (bun)', p.engine);
	line('Lock File', p.lock);
	line('Bunfig', p.bunfig ? c.green('yes') : c.dim('no'));
	line('Workspace', p.workspace ? c.green('yes') : c.dim('no'));
	const envReg = Bun.env.BUN_CONFIG_REGISTRY;
	if (envReg) {
		const envDisplay = envReg.replace(/^https?:\/\//, '');
		line('Registry', `${envDisplay} ${c.dim('(BUN_CONFIG_REGISTRY override)')}`);
		if (p.registry !== '-' && p.registry !== envDisplay) line('', c.dim(`bunfig/pkg: ${p.registry} (shadowed)`));
	} else {
		line('Registry', p.registry !== '-' ? p.registry : c.dim('default'));
	}
	line('Scopes', p.scopes.length ? c.green(p.scopes.join(', ')) : c.dim('none'));
	line('.npmrc', p.hasNpmrc ? c.green('yes') : c.dim('no'));
	line('Auth Ready', p.authReady ? c.green('YES') : c.dim('no'));
	line('Resilient', p.resilient ? c.green('YES') : c.dim('no'));
	for (const tkn of BUN_KEYCHAIN_TOKEN_NAMES) {
		const src = tokenSource(tkn);
		const colored = src === 'env' ? c.green(src) : src === 'keychain' ? c.cyan(src) : c.yellow(src);
		line(`  ${tkn}`, colored);
	}
	line('bin/', p.hasBinDir ? c.green('yes') : c.dim('no'));
	line('Has pkg.json', p.hasPkg ? c.green('yes') : c.red('no'));
	line('TZ', p.projectTz === 'UTC' ? c.dim('UTC (default)') : c.cyan(p.projectTz));
	line('DNS TTL', p.projectDnsTtl !== '-' ? c.cyan(`${p.projectDnsTtl}s`) : c.yellow('not set (--fix → 5s)'));
	console.log();
	line('Bin', p.bin.length ? p.bin.join(', ') : c.dim('none'));
	line('Key Deps', p.keyDeps.length ? p.keyDeps.join(', ') : c.dim('none'));
	line('Peer Deps', p.peerDeps.length ? p.peerDeps.join(', ') : c.dim('none'));
	if (p.peerDepsMeta.length) {
		line('  Optional', p.peerDepsMeta.join(', '));
	}

	// bunfig [install] settings
	if (p.bunfig) {
		console.log();
		console.log(`  ${c.bold(c.cyan('bunfig [install]'))}`);
		console.log();
		line(
			'Auto',
			p.installAuto !== '-'
				? !VALID_AUTO.has(p.installAuto)
					? c.red(`${p.installAuto} (invalid)`)
					: p.installAuto === 'disable'
						? c.yellow(p.installAuto)
						: p.installAuto === 'force'
							? c.cyan(p.installAuto)
							: p.installAuto
				: c.dim('auto (default)'),
		);
		line('Frozen Lock', p.frozenLockfile ? c.green('yes') : c.dim('no'));
		line('Dry Run', p.dryRun ? c.yellow('yes') : c.dim('no'));
		line('Production', p.production ? c.yellow('yes') : c.dim('no'));
		line('Exact', p.exact ? c.green('yes') : c.dim('no'));
		const eff = effectiveLinker(p);
		line('Linker', p.linker !== '-' ? p.linker : c.dim('not set'));
		line(
			'configVersion',
			p.configVersion >= 0 ? String(p.configVersion) : c.dim(p.lock === 'bun.lockb' ? 'binary' : 'none'),
		);
		line(
			'Effective',
			`${eff.strategy === 'isolated' ? c.cyan(eff.strategy) : eff.strategy} ${c.dim(`(${eff.source})`)}`,
		);

		const defaultBackend = process.platform === 'darwin' ? 'clonefile' : 'hardlink';
		line('Backend', p.backend !== '-' ? p.backend : c.dim(`default (${defaultBackend})`));
		line(
			'Release Age',
			p.minimumReleaseAge > 0
				? `${p.minimumReleaseAge}s (${(p.minimumReleaseAge / 86400).toFixed(1)}d)`
				: c.dim('none'),
		);
		if (p.minimumReleaseAgeExcludes.length) {
			line('  Excludes', p.minimumReleaseAgeExcludes.join(', '));
		}
		line('Text Lock', p.saveTextLockfile ? c.green('yes') : c.dim('no'));
		line('Optional', p.installOptional ? c.green('yes (default)') : c.yellow('disabled'));
		line('Dev', p.installDev ? c.green('yes (default)') : c.yellow('disabled'));
		line('Peer', p.installPeer ? c.green('yes (default)') : c.yellow('disabled'));
		line('Link WS Pkgs', p.linkWorkspacePackages ? c.green('yes') : c.dim('no'));
		line('Cache', p.cacheDisabled ? c.yellow('disabled') : p.cacheDir !== '-' ? p.cacheDir : c.dim('default'));
		if (p.cacheDisableManifest) line('  Manifest', c.yellow('disabled (always resolve latest)'));
		if (p.globalDir !== '-') line('Global Dir', p.globalDir);
		if (p.globalBinDir !== '-') line('Global Bin', p.globalBinDir);
		if (p.hasCa) line('CA/TLS', c.green('configured'));
		if (!p.lockfileSave) line('Lockfile', c.yellow('save disabled'));
		if (p.lockfilePrint !== '-') line('Lock Print', p.lockfilePrint);
		line('No Verify', p.noVerify ? c.red('yes') : c.dim('no'));
		line(
			'Logging',
			p.verbose ? c.yellow('verbose (lifecycle scripts visible)') : p.silent ? c.dim('silent') : c.dim('default'),
		);
		const cpuCount = availableParallelism();
		const defaultScriptConc = cpuCount > 0 ? cpuCount * 2 : 'cpu\u00d72';
		line(
			'Scripts Conc.',
			p.concurrentScripts > 0 ? String(p.concurrentScripts) : c.dim(`default (${defaultScriptConc})`),
		);
		line('Network Conc.', p.networkConcurrency > 0 ? String(p.networkConcurrency) : c.dim('default (48)'));
		const hasCross = p.targetCpu !== '-' || p.targetOs !== '-';
		if (hasCross) {
			const cpuDisplay =
				p.targetCpu !== '-'
					? VALID_CPU.has(p.targetCpu)
						? p.targetCpu
						: c.red(`${p.targetCpu} (invalid)`)
					: process.arch;
			const osDisplay =
				p.targetOs !== '-'
					? VALID_OS.has(p.targetOs)
						? p.targetOs
						: c.red(`${p.targetOs} (invalid)`)
					: process.platform;
			line('Target', `${cpuDisplay}/${osDisplay} ${c.yellow('(cross-platform)')}`);
		} else {
			line('Target', c.dim(`${process.arch}/${process.platform} (native)`));
		}
		line('Security', p.installSecurityScanner !== '-' ? p.installSecurityScanner : c.dim('none'));
		line(
			'Lifecycle',
			p.trustedDeps.length === 0
				? c.green('BLOCKED (default-secure)')
				: c.yellow(`${p.trustedDeps.length} trusted`),
		);
		if (p.trustedDeps.length > 0) line('Trusted Deps', p.trustedDeps.join(', '));

		// bunfig [run] section
		const hasRun = p.runShell !== '-' || p.runBun || p.runSilent;
		if (hasRun) {
			console.log();
			console.log(c.bold('  bunfig [run]'));
			console.log();
			if (p.runShell !== '-') line('Shell', p.runShell);
			if (p.runBun) line('Bun Alias', c.green('yes (node → bun)'));
			if (p.runSilent) line('Silent', c.dim('yes'));
		}

		// bunfig [debug] section
		if (p.debugEditor !== '-') {
			console.log();
			console.log(c.bold('  bunfig [debug]'));
			console.log();
			line('Editor', p.debugEditor);
		}
	}

	// Overrides / resolutions (package.json)
	const overrideKeys = Object.keys(p.overrides);
	const resolutionKeys = Object.keys(p.resolutions);
	const hasOverrides = overrideKeys.length > 0 || resolutionKeys.length > 0;
	if (hasOverrides) {
		console.log();
		console.log(`  ${c.bold(c.cyan('Dependency Overrides'))}`);
		console.log();
		const printEntries = (label: string, entries: Record<string, string>) => {
			const keys = Object.keys(entries);
			line(label, `${c.yellow(String(keys.length))} mapping(s)`);
			for (const [k, v] of Object.entries(entries)) {
				const risk = classifyOverrideValue(v);
				const flag = risk ? ` ${c.red(`[${risk}]`)}` : '';
				console.log(`      ${c.dim('•')} ${k} ${c.dim('→')} ${v}${flag}`);
			}
		};
		if (overrideKeys.length > 0) printEntries('overrides', p.overrides);
		if (resolutionKeys.length > 0) printEntries('resolutions', p.resolutions);
	}
	console.log();
}

// ── Table rendering ────────────────────────────────────────────────────
function renderTable(projects: ProjectInfo[], detail: boolean, tokenStatusByFolder: Map<string, string> | null) {
	const columnDefs = BUN_SCANNER_COLUMNS.PROJECT_SCAN;

	const columnValueMap: Record<string, (p: ProjectInfo, idx: number) => string | number> = {
		idx: (_p, i) => i,
		status: p => {
			const tokenStatus = tokenStatusByFolder?.get(p.folder) ?? 'missing';
			const svc = projectTokenService(p);
			return formatStatusCell(statusFromToken(tokenStatus), svc);
		},
		folder: p => p.folder,
		name: p => p.name,
		version: p => p.version,
		configVersion: p => p.configVersion,
		bunVersion: p => p.engine,
		lockfile: p => p.lock,
		registry: p => (p.registry !== '-' ? p.registry : '-'),
		token: p => tokenStatusByFolder?.get(p.folder) ?? '-',
		workspaces: p => (p.workspacesList.length ? p.workspacesList.join(', ') : '-'),
		hasTests: p => (p.hasTests ? 'yes' : '-'),
		workspace: p => (p.workspace ? 'yes' : '-'),
		linker: p => {
			const eff = effectiveLinker(p);
			return eff.source === 'bunfig' ? eff.strategy : `${eff.strategy} (default)`;
		},
		trustedDeps: p => (p.trustedDeps.length ? p.trustedDeps.join(', ') : '-'),
		nativeDeps: p => (p.nativeDeps.length ? p.nativeDeps.join(', ') : '-'),
		scripts: p => p.scriptsCount || '-',
		envVars: p => (p.bunfigEnvRefs.length ? p.bunfigEnvRefs.join(', ') : '-'),
	};

	const rows = projects.map((p, idx) => {
		const row: Record<string, string | number> = {};
		for (const col of columnDefs) {
			const fn = columnValueMap[col.key];
			row[col.header] = fn ? fn(p, idx) : '-';
		}
		if (detail) {
			row['Author'] = p.author;
			row['License'] = p.license;
			row['Description'] = p.description.length > 40 ? p.description.slice(0, 37) + '...' : p.description;
		}
		return row;
	});

	const headers = columnDefs.map(col => col.header);
	if (detail) headers.push('Author', 'License', 'Description');
	console.log(Bun.inspect.table(rows, headers, {colors: _useColor}));
}

function renderMatrix(
	rows: Record<string, string | number>[],
	columns: ReadonlyArray<{readonly key: string; readonly header: string}>,
): void {
	console.log(
		Bun.inspect.table(
			rows,
			columns.map(c => c.header),
			{colors: _useColor},
		),
	);
}

function sectionHeader(title: string): void {
	console.log();
	console.log(`  ${c.bold(c.cyan(title))}${c.dim('  ' + fmtStamp())}`);
}

// ── Sort comparator ────────────────────────────────────────────────────
type SortKey = 'name' | 'totalDeps' | 'deps' | 'version' | 'lock';
const VALID_SORT_KEYS = new Set<SortKey>(['name', 'totalDeps', 'deps', 'version', 'lock']);

function sortProjects(projects: ProjectInfo[], key: SortKey): ProjectInfo[] {
	const sorted = [...projects];
	switch (key) {
		case 'name':
			return sorted.sort((a, b) => a.name.localeCompare(b.name));
		case 'totalDeps':
		case 'deps':
			return sorted.sort((a, b) => b.totalDeps - a.totalDeps);
		case 'version':
			return sorted.sort((a, b) => {
				if (a.version === '-') return 1;
				if (b.version === '-') return -1;
				return semverCompare(a.version, b.version);
			});
		case 'lock':
			return sorted.sort((a, b) => a.lock.localeCompare(b.lock));
		default: {
			const _exhaustive: never = key;
			console.error(c.yellow(`Unknown sort key: ${_exhaustive}. Using default order.`));
			return sorted;
		}
	}
}

// ── Audit: report missing fields ───────────────────────────────────────
function getMissing(p: ProjectInfo): AuditField[] {
	if (!p.hasPkg) return [];
	const missing: AuditField[] = [];
	if (p.author === '-') missing.push('author');
	if (p.license === '-') missing.push('license');
	if (p.description === '-') missing.push('description');
	if (p.version === '-') missing.push('version');
	if (p.engine === '-') missing.push('engine');
	return missing;
}

async function renderAudit(projects: ProjectInfo[]): Promise<void> {
	const withPkg = projects.filter(p => p.hasPkg);
	const withoutPkg = projects.filter(p => !p.hasPkg);

	if (withPkg.length === 0) {
		sectionHeader('Metadata Audit');
		console.log();
		console.log(c.yellow('  No projects with package.json found.'));
		if (withoutPkg.length > 0) {
			console.log();
			console.log(
				c.dim(
					`  ${withoutPkg.length} directories without package.json: ${withoutPkg.map(p => p.folder).join(', ')}`,
				),
			);
		}
		console.log();
		return;
	}

	// Per-field totals
	const totals: Record<string, number> = {};
	for (const f of AUDIT_FIELDS) totals[f] = 0;

	const issues: {name: string; folder: string; missing: string}[] = [];

	for (const p of withPkg) {
		const missing = getMissing(p);
		for (const f of missing) totals[f]++;
		if (missing.length > 0) {
			issues.push({
				name: p.name,
				folder: p.folder,
				missing: missing.map(f => c.red(f)).join(', '),
			});
		}
	}

	sectionHeader('Metadata Audit');
	console.log();

	// Summary counts
	sectionHeader(`Field Coverage (${withPkg.length} projects)`);
	console.log();
	for (const f of AUDIT_FIELDS) {
		const present = withPkg.length - totals[f];
		const pct = ((present / withPkg.length) * 100).toFixed(0);
		const bar = present === withPkg.length ? c.green('OK') : c.yellow(`${totals[f]} missing`);
		console.log(`    ${c.cyan(f.padEnd(14))} ${String(present).padStart(2)}/${withPkg.length}  (${pct}%)  ${bar}`);
	}

	// Global environment overrides (BUN_CONFIG_* have higher priority than bunfig.toml)
	const BUN_ENV_VARS: {key: string; desc: string; offLabel?: string; recommend?: string}[] = [
		{key: 'BUN_PLATFORM_HOME', desc: 'scan root'},
		{key: 'BUN_CONFIG_REGISTRY', desc: 'overrides all bunfig.toml [install] registry'},
		{key: 'BUN_CONFIG_TOKEN', desc: 'auth token (currently unused by Bun)'},
		{key: 'BUN_CONFIG_FROZEN_LOCKFILE', desc: 'refuse lockfile updates on mismatch'},
		{key: 'BUN_CONFIG_SAVE_TEXT_LOCKFILE', desc: 'text-based bun.lock (v1.2+)'},
		{key: 'BUN_CONFIG_SKIP_SAVE_LOCKFILE', desc: 'lockfile saving', offLabel: 'ON'},
		{key: 'BUN_CONFIG_SKIP_LOAD_LOCKFILE', desc: 'lockfile loading', offLabel: 'ON'},
		{key: 'BUN_CONFIG_SKIP_INSTALL_PACKAGES', desc: 'package installs', offLabel: 'ON'},
		{key: 'BUN_CONFIG_YARN_LOCKFILE', desc: 'yarn.lock compat'},
		{key: 'BUN_CONFIG_LINK_NATIVE_BINS', desc: 'platform-specific bin linking'},
		{key: 'BUN_CONFIG_DRY_RUN', desc: 'simulate install (no changes)'},
		{key: 'BUN_CONFIG_DISABLE_CACHE', desc: 'disable global cache reads'},
		{key: 'BUN_CONFIG_MINIMUM_RELEASE_AGE', desc: 'min package version age (seconds)'},
		{key: 'BUN_INSTALL_CACHE_DIR', desc: 'custom cache directory'},
		{key: 'BUN_INSTALL_GLOBAL_DIR', desc: 'global packages directory'},
		{key: 'BUN_INSTALL_BIN', desc: 'global binaries directory'},
		{key: 'BUN_FEATURE_FLAG_DISABLE_IGNORE_SCRIPTS', desc: 'lifecycle scripts blocked', offLabel: 'BLOCKED'},
		{key: 'BUN_FEATURE_FLAG_DISABLE_NATIVE_DEPENDENCY_LINKER', desc: 'native bin linking', offLabel: 'ON'},
		// Runtime & networking
		{key: 'TZ', desc: 'runtime timezone (bun test forces UTC)', recommend: 'UTC'},
		{key: 'NODE_TLS_REJECT_UNAUTHORIZED', desc: 'SSL cert validation (0 = INSECURE)'},
		{key: 'BUN_CONFIG_MAX_HTTP_REQUESTS', desc: 'max concurrent HTTP requests (default 256)'},
		{key: 'BUN_CONFIG_VERBOSE_FETCH', desc: 'log fetch requests (curl | true | false)', recommend: 'curl'},
		{key: 'BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS', desc: 'DNS cache TTL in seconds (default 30)', recommend: '5'},
		{
			key: 'BUN_CONFIG_NETWORK_CONCURRENCY',
			desc: 'parallel HTTP requests during install (default 48)',
			recommend: '256',
		},
		{
			key: 'BUN_CONFIG_CONCURRENT_SCRIPTS',
			desc: 'parallel lifecycle script execution (default cpu×2)',
			recommend: '16',
		},
		{key: 'BUN_OPTIONS', desc: 'prepend CLI args to every bun invocation'},
		// Caching & temp
		{
			key: 'BUN_RUNTIME_TRANSPILER_CACHE_PATH',
			desc: 'transpiler cache dir ("" or "0" = disabled)',
			recommend: '${BUN_PLATFORM_HOME}/.bun-cache',
		},
		{key: 'TMPDIR', desc: 'temp directory for bundler intermediates'},
		// Display
		{key: 'NO_COLOR', desc: 'ANSI color output', offLabel: 'ON'},
		{key: 'FORCE_COLOR', desc: 'force ANSI color (overrides NO_COLOR)'},
		// Dev experience
		{key: 'BUN_CONFIG_NO_CLEAR_TERMINAL_ON_RELOAD', desc: 'keep console on --watch reload'},
		// Telemetry
		{key: 'DO_NOT_TRACK', desc: 'disable crash reports & telemetry', recommend: '1'},
	];

	sectionHeader('Global Overrides');
	console.log();
	const PAD = 42;
	for (const {key, desc, offLabel, recommend} of BUN_ENV_VARS) {
		const val = Bun.env[key];
		if (offLabel) {
			const flag = classifyEnvFlag(val, offLabel);
			const display =
				flag.state === 'inactive'
					? c.green(flag.label)
					: flag.state === 'active'
						? c.yellow(flag.label)
						: c.dim(flag.label);
			console.log(`    ${c.cyan(key.padEnd(PAD))} ${display}  ${c.dim(desc)}`);
		} else if (val) {
			// Flag NODE_TLS_REJECT_UNAUTHORIZED=0 as a security risk
			const valColor = key === 'NODE_TLS_REJECT_UNAUTHORIZED' && val === '0' ? c.red : c.green;
			console.log(`    ${c.cyan(key.padEnd(PAD))} ${valColor(val)}  ${c.dim(desc)}`);
		} else if (recommend) {
			console.log(
				`    ${c.cyan(key.padEnd(PAD))} ${c.yellow('not set')}  ${c.dim(desc)}  ${c.yellow(`-> recommend ${key}=${recommend}`)}`,
			);
		} else {
			console.log(`    ${c.cyan(key.padEnd(PAD))} ${c.dim('not set')}  ${c.dim(desc)}`);
		}
	}

	// DNS cache stats
	sectionHeader('DNS Cache');
	console.log();
	const dnsStats = dns.getCacheStats();
	const dnsRows = [
		{Stat: 'cacheHitsCompleted', Value: dnsStats.cacheHitsCompleted, Description: 'resolved from cache'},
		{Stat: 'cacheHitsInflight', Value: dnsStats.cacheHitsInflight, Description: 'deduplicated in-flight'},
		{Stat: 'cacheMisses', Value: dnsStats.cacheMisses, Description: 'fresh lookups'},
		{Stat: 'size', Value: dnsStats.size, Description: 'entries cached now'},
		{Stat: 'errors', Value: dnsStats.errors, Description: 'failed lookups'},
		{Stat: 'totalCount', Value: dnsStats.totalCount, Description: 'total requests'},
	];
	console.log(Bun.inspect.table(dnsRows, {colors: _useColor}));
	const hitRate =
		dnsStats.totalCount > 0
			? (((dnsStats.cacheHitsCompleted + dnsStats.cacheHitsInflight) / dnsStats.totalCount) * 100).toFixed(0)
			: null;
	if (dnsStats.errors > 0) {
		console.log(
			`    ${c.red('⚠')} ${c.red(`${dnsStats.errors} DNS error(s)`)} — check connectivity or registry URLs`,
		);
	}
	if (hitRate !== null && Number(hitRate) < 50 && dnsStats.totalCount >= 5) {
		console.log(
			`    ${c.yellow('→')} hit rate ${c.yellow(hitRate + '%')} — use ${c.cyan('dns.prefetch(host, port)')} for known hosts`,
		);
	}
	console.log(`    ${c.dim('Tip: use dns.prefetch(host, 443) for known registry domains at startup.')}`);
	console.log(`    ${c.dim('Run --fix-dns to auto-generate dns-prefetch.ts across all projects.')}`);
	console.log(`    ${c.dim('Monitor: bun install --verbose shows DNS prefetch activity in real time.')}`);

	// dns-prefetch.ts coverage
	const prefetchChecks = await Promise.all(
		withPkg.map(async p => Bun.file(`${projectDir(p)}/dns-prefetch.ts`).exists()),
	);
	const prefetchCount = prefetchChecks.filter(Boolean).length;
	const prefetchPct = ((prefetchCount / withPkg.length) * 100).toFixed(0);
	const prefetchBar =
		prefetchCount === withPkg.length
			? c.green('OK')
			: prefetchCount === 0
				? c.yellow(`0/${withPkg.length}`)
				: c.yellow(`${prefetchCount}/${withPkg.length}`);
	console.log(
		`    ${c.cyan('dns-prefetch'.padEnd(14))} ${String(prefetchCount).padStart(2)}/${withPkg.length}  (${prefetchPct}%)  ${prefetchBar}  ${c.dim('dns-prefetch.ts present (run --fix-dns)')}`,
	);

	// Infrastructure readiness
	sectionHeader('Infrastructure Readiness');
	const withNpmrc = withPkg.filter(p => p.hasNpmrc).length;
	const withAuth = withPkg.filter(p => p.authReady).length;
	const withScopes = withPkg.filter(p => p.scopes.length > 0).length;
	const withResilient = withPkg.filter(p => p.resilient).length;
	const withBinDir = withPkg.filter(p => p.hasBinDir).length;
	const infra = [
		{label: '.npmrc', count: withNpmrc, desc: 'connected to registry'},
		{label: 'auth token', count: withAuth, desc: 'publish-ready'},
		{label: 'resilient', count: withResilient, desc: '\\${VAR?} graceful undefined'},
		{label: 'scoped', count: withScopes, desc: '[install.scopes] configured'},
		{label: 'bin/', count: withBinDir, desc: 'custom tools'},
	];

	// Lifecycle security — default-secure is green
	const defaultSecure = withPkg.filter(p => p.trustedDeps.length === 0).length;
	const withTrusted = withPkg.length - defaultSecure;
	// Array field totals — fold into infra rows
	const arrayStats = {
		trustedDeps: withPkg.reduce((sum, p) => sum + p.trustedDeps.length, 0),
		nativeDeps: withPkg.reduce((sum, p) => sum + p.nativeDeps.length, 0),
		scopes: withPkg.reduce((sum, p) => sum + p.scopes.length, 0),
	};

	const infraRows = infra.map(({label, count, desc}) => {
		const pct = ((count / withPkg.length) * 100).toFixed(0);
		const status =
			count === withPkg.length ? 'OK' : count === 0 ? `${count}/${withPkg.length}` : `${count}/${withPkg.length}`;
		return {
			'Field': label,
			'Count': `${count}/${withPkg.length}`,
			'%': `${pct}%`,
			'Status': status,
			'Description': desc,
		};
	});
	infraRows.push(
		{
			'Field': 'trustedDeps',
			'Count': String(arrayStats.trustedDeps),
			'%': '',
			'Status': '',
			'Description': 'total across all projects',
		},
		{
			'Field': 'nativeDeps',
			'Count': String(arrayStats.nativeDeps),
			'%': '',
			'Status': '',
			'Description': 'detected',
		},
		{
			'Field': 'scopes',
			'Count': String(arrayStats.scopes),
			'%': '',
			'Status': '',
			'Description': 'total scope registrations',
		},
	);
	renderMatrix(infraRows, BUN_SCANNER_COLUMNS.INFRA_READINESS);

	// Token sources
	sectionHeader('Token Sources');
	const tokenRows = BUN_KEYCHAIN_TOKEN_NAMES.map(tkn => {
		const src = tokenSource(tkn);
		const hint = src === 'not set' ? `(--store-token ${tkn})` : '';
		return {Token: tkn, Source: src, Hint: hint};
	});
	console.log(Bun.inspect.table(tokenRows, ['Token', 'Source', 'Hint'], {colors: _useColor}));

	// Dependency overrides / resolutions
	const withOverrides = withPkg.filter(p => Object.keys(p.overrides).length > 0);
	const withResolutions = withPkg.filter(p => Object.keys(p.resolutions).length > 0);
	const totalOverrideCount = withOverrides.reduce((n, p) => n + Object.keys(p.overrides).length, 0);
	const totalResolutionCount = withResolutions.reduce((n, p) => n + Object.keys(p.resolutions).length, 0);
	if (withOverrides.length > 0 || withResolutions.length > 0) {
		sectionHeader('Dependency Overrides');
		console.log();
		if (withOverrides.length > 0) {
			console.log(
				`    ${c.cyan('overrides'.padEnd(14))} ${c.yellow(String(withOverrides.length))} project(s), ${totalOverrideCount} pinned metadependencies`,
			);
			for (const p of withOverrides) {
				const mappings = Object.entries(p.overrides)
					.map(([k, v]) => `${k} -> ${v}`)
					.join(', ');
				console.log(`      ${c.dim('•')} ${p.folder.padEnd(28)} ${c.dim(mappings)}`);
			}
		}
		if (withResolutions.length > 0) {
			console.log(
				`    ${c.cyan('resolutions'.padEnd(14))} ${c.yellow(String(withResolutions.length))} project(s), ${totalResolutionCount} pinned metadependencies`,
			);
			for (const p of withResolutions) {
				const mappings = Object.entries(p.resolutions)
					.map(([k, v]) => `${k} -> ${v}`)
					.join(', ');
				console.log(`      ${c.dim('•')} ${p.folder.padEnd(28)} ${c.dim(mappings)}`);
			}
		}
		// Suspicious overrides summary
		const suspicious: {folder: string; pkg: string; value: string; risk: string}[] = [];
		for (const p of [...withOverrides, ...withResolutions]) {
			const allEntries = {...p.overrides, ...p.resolutions};
			for (const [k, v] of Object.entries(allEntries)) {
				const risk = classifyOverrideValue(v);
				if (risk) suspicious.push({folder: p.folder, pkg: k, value: v, risk});
			}
		}
		if (suspicious.length > 0) {
			console.log();
			console.log(`    ${c.red('Suspicious overrides:')} ${c.yellow(String(suspicious.length))} detected`);
			for (const s of suspicious) {
				console.log(
					`      ${c.red('!')} ${s.folder.padEnd(28)} ${s.pkg} -> ${s.value} ${c.red(`[${s.risk}]`)}`,
				);
			}
		}
	}

	// Peer dependencies
	const withPeers = withPkg.filter(p => p.peerDeps.length > 0);
	const withOptionalPeers = withPkg.filter(p => p.peerDepsMeta.length > 0);
	const totalPeerCount = withPeers.reduce((n, p) => n + p.peerDeps.length, 0);
	const totalOptionalCount = withOptionalPeers.reduce((n, p) => n + p.peerDepsMeta.length, 0);
	if (withPeers.length > 0) {
		sectionHeader('Peer Dependencies');
		console.log();
		console.log(
			`    ${c.cyan('declared'.padEnd(14))} ${c.green(String(withPeers.length))} project(s), ${totalPeerCount} peer(s) total`,
		);
		for (const p of withPeers) {
			const optionals = new Set(p.peerDepsMeta);
			const labels = p.peerDeps.map(d => (optionals.has(d) ? `${d} ${c.dim('(optional)')}` : d));
			console.log(`      ${c.dim('•')} ${p.folder.padEnd(28)} ${c.dim(labels.join(', '))}`);
		}
		if (totalOptionalCount > 0) {
			console.log(
				`    ${c.cyan('optional'.padEnd(14))} ${totalOptionalCount} peer(s) marked optional via peerDependenciesMeta`,
			);
		}
	}

	// Project timezones
	{
		const tzGroups = new Map<string, string[]>();
		for (const p of withPkg) {
			const list = tzGroups.get(p.projectTz) ?? [];
			list.push(p.folder);
			tzGroups.set(p.projectTz, list);
		}
		sectionHeader('Project Timezones (.env TZ)');
		console.log();
		for (const [tz, folders] of [...tzGroups.entries()].sort((a, b) => b[1].length - a[1].length)) {
			const label = tz === 'UTC' ? `${tz} (default)` : tz;
			console.log(`    ${c.cyan(label.padEnd(24))} ${folders.length} project(s)`);
		}
	}

	// Per-project DNS TTL
	{
		const withDnsTtl = withPkg.filter(p => p.projectDnsTtl !== '-');
		const withoutDnsTtl = withPkg.length - withDnsTtl.length;
		const ttlGroups = new Map<string, string[]>();
		for (const p of withDnsTtl) {
			const list = ttlGroups.get(p.projectDnsTtl) ?? [];
			list.push(p.folder);
			ttlGroups.set(p.projectDnsTtl, list);
		}
		sectionHeader('DNS Cache TTL');
		console.log();
		for (const [ttl, folders] of [...ttlGroups.entries()].sort((a, b) => Number(a) - Number(b))) {
			console.log(
				`    ${c.cyan(`${ttl}s`.padEnd(24))} ${folders.length} project(s)  ${c.dim(folders.join(', '))}`,
			);
		}
		if (withoutDnsTtl > 0) {
			console.log(`    ${c.yellow('not set'.padEnd(24))} ${withoutDnsTtl} project(s)  ${c.dim('--fix → 5s')}`);
		}
	}

	// Lifecycle security posture — scan node_modules for per-hook metrics
	sectionHeader('Lifecycle Security');
	const envOverride = isFeatureFlagActive(Bun.env.BUN_FEATURE_FLAG_DISABLE_IGNORE_SCRIPTS);

	// Scan node_modules for actual lifecycle scripts per hook
	const hookTotals: Record<
		string,
		{found: number; trusted: number; blocked: number; nativeDetected: number; nativeTrusted: number}
	> = {};
	for (const h of LIFECYCLE_HOOKS)
		hookTotals[h] = {found: 0, trusted: 0, blocked: 0, nativeDetected: 0, nativeTrusted: 0};

	const xrefData: XrefEntry[] = [];

	for (const p of withPkg) {
		const nmDir = `${projectDir(p)}/node_modules`;
		let entries: string[] = [];
		try {
			entries = await readdir(nmDir);
		} catch {
			continue;
		}

		const trusted = new Set(p.trustedDeps);
		const xref: XrefEntry = {folder: p.folder, bunDefault: [], explicit: [], blocked: [], lockHash: p.lockHash};
		const xrefSeen = new Set<string>();

		const classifyPkg = (pkgName: string, scripts: Record<string, string>) => {
			const scriptValues = Object.values(scripts).join(' ');
			const isNative = isNativeMatch(pkgName) || isNativeMatch(scriptValues);
			let hasAnyHook = false;
			for (const h of LIFECYCLE_HOOKS) {
				if (scripts[h]) {
					hasAnyHook = true;
					hookTotals[h].found++;
					if (trusted.has(pkgName)) hookTotals[h].trusted++;
					else hookTotals[h].blocked++;
					if (isNative) {
						hookTotals[h].nativeDetected++;
						if (trusted.has(pkgName)) hookTotals[h].nativeTrusted++;
					}
				}
			}
			if (hasAnyHook && !xrefSeen.has(pkgName)) {
				xrefSeen.add(pkgName);
				if (BUN_DEFAULT_TRUSTED.has(pkgName)) xref.bunDefault.push(pkgName);
				else if (trusted.has(pkgName)) xref.explicit.push(pkgName);
				else xref.blocked.push(pkgName);
			}
		};

		const reads: [string, string][] = [];
		for (const entry of entries) {
			if (entry.startsWith('@')) {
				let scoped: string[] = [];
				try {
					scoped = await readdir(`${nmDir}/${entry}`);
				} catch {
					continue;
				}
				for (const sub of scoped) reads.push([`${entry}/${sub}`, `${nmDir}/${entry}/${sub}/package.json`]);
			} else {
				reads.push([entry, `${nmDir}/${entry}/package.json`]);
			}
		}
		await Promise.all(
			reads.map(async ([name, path]) => {
				try {
					const pkg = await Bun.file(path).json();
					classifyPkg(name, pkg.scripts ?? {});
				} catch (err) {
					_verboseWarn(`node_modules pkg scan: ${name}`, err);
				}
			}),
		);
		xrefData.push(xref);
	}

	// Avg time per blocked script (conservative estimates based on typical npm postinstall behavior)
	const HOOK_AVG_MS: Record<string, number> = {
		preinstall: 500,
		postinstall: 2500,
		preuninstall: 300,
		prepare: 1000,
		preprepare: 300,
		postprepare: 300,
		prepublishOnly: 500,
	};

	// Per-hook metadata: owner + recommended action (with code snippets)
	type HookStats = (typeof hookTotals)[string];
	const HOOK_META: Record<string, {owner: (t: HookStats) => string; action: (t: HookStats) => string}> = {
		preinstall: {
			owner: t => (t.found === 0 ? 'System Default' : t.found <= 3 ? 'clawdbot' : `Power ${withTrusted}`),
			action: t =>
				t.found === 0
					? 'No action'
					: `Keep trusted; add engine verify: "preinstall": "bun --version" (${t.nativeDetected} native)`,
		},
		postinstall: {
			owner: t => (t.found === 0 ? 'System Default' : `Power ${withTrusted}`),
			action: t => {
				if (t.found === 0) return 'No action';
				if (t.blocked > 0)
					return `Scan with --fix-trusted; block in CI. ${t.nativeDetected} native (${t.nativeTrusted} trusted, ${t.nativeDetected - t.nativeTrusted} uncovered)`;
				return 'Verified — audit with bun pm ls --all periodically';
			},
		},
		preuninstall: {
			owner: () => 'System Default',
			action: t =>
				t.found === 0
					? 'No action; add "preuninstall": "rm -rf temp/" if temp dirs present'
					: 'Review cleanup scripts',
		},
		prepare: {
			owner: t => (t.found === 0 ? 'System Default' : `Power ${withTrusted}`),
			action: t =>
				t.found === 0
					? 'No action'
					: t.blocked > 0
						? `${t.blocked} blocked — review for build steps`
						: 'Verified',
		},
		preprepare: {
			owner: () => 'System Default',
			action: t => (t.found === 0 ? 'No action' : 'Review pre-prepare hooks'),
		},
		postprepare: {
			owner: () => 'System Default',
			action: t => (t.found === 0 ? 'No action' : 'Review post-prepare hooks'),
		},
		prepublishOnly: {
			owner: () => 'R2 Auditor',
			action: t =>
				t.found === 0
					? 'Implement audit gate: "prepublishOnly": "bun scan.ts --audit"'
					: t.blocked > 0
						? `${t.blocked} consumer-side hooks blocked (expected)`
						: 'Verified',
		},
	};

	// Build lifecycle hook rows
	const hookRows: Record<string, string | number>[] = [];

	// Default posture row
	if (envOverride) {
		hookRows.push({
			'Hook': 'default',
			'Total': '-',
			'Trust': '-',
			'Block': '-',
			'Secure': '-',
			'Saved': '-',
			'Risk': 'High',
			'Status': 'OPEN',
			'Native': '-',
			'Cov%': '-',
			'Owner': 'OVERRIDE',
			'Action': 'WARNING: DISABLE_IGNORE_SCRIPTS is set — all lifecycle scripts run globally',
		});
	} else {
		hookRows.push({
			'Hook': 'default',
			'Total': '-',
			'Trust': '-',
			'Block': '-',
			'Secure': '100%',
			'Saved': '-',
			'Risk': 'Min',
			'Status': 'Blocked',
			'Native': '-',
			'Cov%': '-',
			'Owner': 'Bun Runtime',
			'Action': 'Default-secure: all lifecycle scripts blocked unless in trustedDependencies',
		});
	}

	let totalTimeSaved = 0;
	for (const h of LIFECYCLE_HOOKS) {
		const {found, trusted, blocked, nativeDetected, nativeTrusted} = hookTotals[h];
		const pctSecure =
			found === 0 ? '100%' : trusted === found ? '100%' : `${((trusted / found) * 100).toFixed(0)}%`;
		const savedMs = blocked * HOOK_AVG_MS[h];
		totalTimeSaved += savedMs;
		const savedStr =
			savedMs === 0
				? '-'
				: savedMs >= 60000
					? `${(savedMs / 60000).toFixed(1)}m`
					: `${(savedMs / 1000).toFixed(1)}s`;
		const riskRaw =
			found === 0
				? 'Min'
				: blocked > 0 && trusted > 0
					? 'Med'
					: blocked === 0 && trusted > 0
						? 'Low'
						: blocked === found
							? 'Low'
							: 'Min';
		const statusRaw =
			found === 0 && h === 'prepublishOnly'
				? 'Ready'
				: found === 0
					? 'Inactive'
					: blocked > 0
						? 'Restricted'
						: trusted === found
							? 'Verified'
							: 'Inactive';
		const nativeCovRaw =
			nativeDetected === 0
				? '-'
				: nativeTrusted === nativeDetected
					? '100%'
					: `${((nativeTrusted / nativeDetected) * 100).toFixed(0)}%`;
		const meta = HOOK_META[h];
		hookRows.push({
			'Hook': h,
			'Total': found,
			'Trust': trusted,
			'Block': blocked,
			'Secure': pctSecure,
			'Saved': savedStr,
			'Risk': riskRaw,
			'Status': statusRaw,
			'Native': nativeDetected === 0 ? '-' : nativeDetected,
			'Cov%': nativeCovRaw,
			'Owner': meta?.owner(hookTotals[h]),
			'Action': meta?.action(hookTotals[h]),
		});
	}

	// Totals row
	const totalSavedStr =
		totalTimeSaved >= 60000 ? `${(totalTimeSaved / 60000).toFixed(1)}m` : `${(totalTimeSaved / 1000).toFixed(1)}s`;
	const allFound = LIFECYCLE_HOOKS.reduce((s, h) => s + hookTotals[h].found, 0);
	const allBlocked = LIFECYCLE_HOOKS.reduce((s, h) => s + hookTotals[h].blocked, 0);
	const allTrusted = LIFECYCLE_HOOKS.reduce((s, h) => s + hookTotals[h].trusted, 0);
	const allNative = LIFECYCLE_HOOKS.reduce((s, h) => s + hookTotals[h].nativeDetected, 0);
	const allNativeTrusted = LIFECYCLE_HOOKS.reduce((s, h) => s + hookTotals[h].nativeTrusted, 0);
	const totalPct = allFound === 0 ? '100%' : `${((allTrusted / allFound) * 100).toFixed(0)}%`;
	const totalNativeCov = allNative === 0 ? '-' : `${((allNativeTrusted / allNative) * 100).toFixed(0)}%`;
	hookRows.push({
		'Hook': 'total',
		'Total': allFound,
		'Trust': allTrusted,
		'Block': allBlocked,
		'Secure': totalPct,
		'Saved': totalSavedStr,
		'Risk': '',
		'Status': '',
		'Native': allNative,
		'Cov%': totalNativeCov,
		'Owner': '100% managed',
		'Action': '',
	});

	renderMatrix(hookRows, BUN_SCANNER_COLUMNS.LIFECYCLE_HOOKS);

	console.log();
	console.log(
		`    ${c.cyan('locked down'.padEnd(14))} ${String(defaultSecure).padStart(2)}/${withPkg.length}  ${defaultSecure === withPkg.length ? c.green('OK') : c.green(`${defaultSecure}`)}  ${c.dim('no trustedDependencies — all scripts blocked')}`,
	);
	if (withTrusted > 0) {
		console.log(
			`    ${c.cyan('explicit trust'.padEnd(14))} ${String(withTrusted).padStart(2)}/${withPkg.length}  ${c.yellow(`${withTrusted}`)}  ${c.dim('trustedDependencies declared — scripts allowed for listed packages')}`,
		);
		const trustedProjects = withPkg.filter(p => p.trustedDeps.length > 0);
		for (const p of trustedProjects) {
			console.log(`      ${c.dim('•')} ${p.folder.padEnd(28)} ${c.dim(p.trustedDeps.join(', '))}`);
		}
	}

	// Bun default trust cross-reference
	const xrefWithScripts = xrefData.filter(x => x.bunDefault.length + x.explicit.length + x.blocked.length > 0);
	if (xrefWithScripts.length > 0) {
		const totalBunDefault = xrefWithScripts.reduce((s, x) => s + x.bunDefault.length, 0);
		const prevSnapshot = await loadXrefSnapshot(flags['audit-compare'] ?? undefined);
		const prevMap = new Map<string, XrefEntry>();
		if (prevSnapshot) {
			for (const p of prevSnapshot.projects) prevMap.set(p.folder, p);
		}
		const hasDelta = prevSnapshot !== null;

		const formatDelta = (cur: number, prev: number | undefined): string => {
			if (prev === undefined) return c.cyan('new'.padStart(5));
			const diff = cur - prev;
			if (diff > 0) return c.green(`+${diff}`.padStart(5));
			if (diff < 0) return c.red(`${diff}`.padStart(5));
			return c.dim('='.padStart(5));
		};

		console.log();
		console.log(c.bold(`  Bun default trust cross-reference (${BUN_DEFAULT_TRUSTED.size} known packages):`));
		console.log();
		const deltaHeader = hasDelta ? `  ${'Δ Def'.padStart(5)}  ${'Δ Exp'.padStart(5)}  ${'Δ Blk'.padStart(5)}` : '';
		console.log(
			`    ${'Project'.padEnd(30)} ${'Default'.padStart(7)}  ${'Explicit'.padStart(8)}  ${'Blocked'.padStart(7)}${deltaHeader}  Packages`,
		);
		for (const x of xrefWithScripts) {
			const parts: string[] = [];
			if (x.bunDefault.length > 0) parts.push(x.bunDefault.join(', '));
			if (x.explicit.length > 0) parts.push(x.explicit.join(', '));
			if (x.blocked.length > 0) parts.push(c.yellow(x.blocked.join(', ')));
			const defColor = x.bunDefault.length > 0 ? c.dim : (s: string) => s;
			const expColor = x.explicit.length > 0 ? c.cyan : (s: string) => s;
			let deltaCols = '';
			if (hasDelta) {
				const prev = prevMap.get(x.folder);
				deltaCols = `  ${formatDelta(x.bunDefault.length, prev?.bunDefault.length)}  ${formatDelta(x.explicit.length, prev?.explicit.length)}  ${formatDelta(x.blocked.length, prev?.blocked.length)}`;
			}
			console.log(
				`    ${x.folder.padEnd(30)} ${defColor(String(x.bunDefault.length).padStart(7))}  ${expColor(String(x.explicit.length).padStart(8))}  ${(x.blocked.length > 0 ? c.yellow : (s: string) => s)(String(x.blocked.length).padStart(7))}${deltaCols}   ${parts.join(c.dim(' | '))}`,
			);
		}
		console.log();
		console.log(
			`  Summary: ${c.bold(String(totalBunDefault))} packages auto-trusted by Bun defaults across ${xrefData.length} projects`,
		);

		// Comparison summary block
		if (prevSnapshot) {
			const currentFolders = new Set(xrefWithScripts.map(x => x.folder));
			const prevFolders = new Set(prevSnapshot.projects.map(p => p.folder));
			const newProjects = xrefWithScripts.filter(x => !prevFolders.has(x.folder));
			const removedProjects = prevSnapshot.projects.filter(p => !currentFolders.has(p.folder));
			const changedProjects: string[] = [];
			const unchangedCount = {value: 0};
			for (const x of xrefWithScripts) {
				const prev = prevMap.get(x.folder);
				if (!prev) continue;
				const diffs: string[] = [];
				const dDef = x.bunDefault.length - prev.bunDefault.length;
				const dExp = x.explicit.length - prev.explicit.length;
				const dBlk = x.blocked.length - prev.blocked.length;
				if (dDef !== 0) diffs.push(`default ${dDef > 0 ? '+' : ''}${dDef}`);
				if (dExp !== 0) diffs.push(`explicit ${dExp > 0 ? '+' : ''}${dExp}`);
				if (dBlk !== 0) diffs.push(`blocked ${dBlk > 0 ? '+' : ''}${dBlk}`);
				if (diffs.length > 0) changedProjects.push(`${x.folder} (${diffs.join(', ')})`);
				else unchangedCount.value++;
			}
			console.log();
			console.log(
				c.bold(
					`  Cross-reference delta (vs ${prevSnapshot.date ?? prevSnapshot.timestamp}${prevSnapshot.tz ? ` ${prevSnapshot.tz}` : ''}):`,
				),
			);
			console.log(
				`    ${'New projects:'.padEnd(18)} ${c.cyan(String(newProjects.length))}${newProjects.length > 0 ? '   ' + newProjects.map(x => x.folder).join(', ') : ''}`,
			);
			console.log(
				`    ${'Removed:'.padEnd(18)} ${removedProjects.length > 0 ? c.red(String(removedProjects.length)) : c.dim(String(removedProjects.length))}${removedProjects.length > 0 ? '   ' + removedProjects.map(p => p.folder).join(', ') : ''}`,
			);
			console.log(
				`    ${'Changed:'.padEnd(18)} ${changedProjects.length > 0 ? c.yellow(String(changedProjects.length)) : c.dim(String(changedProjects.length))}${changedProjects.length > 0 ? '   ' + changedProjects.join(', ') : ''}`,
			);
			console.log(`    ${'Unchanged:'.padEnd(18)} ${c.dim(String(unchangedCount.value))}`);
		}

		// Save snapshot (unless --compare or --no-auto-snapshot)
		if (!flags.compare && !flags['no-auto-snapshot']) {
			await saveXrefSnapshot(xrefWithScripts, withPkg.length);
		}

		// --snapshot early return: save and exit after xref section
		if (flags.snapshot) {
			console.log();
			console.log(`  Snapshot saved to .audit/xref-snapshot.json (${xrefWithScripts.length} projects)`);
			return;
		}
	}

	// Global bunfig.toml detection
	const home = Bun.env.HOME ?? Bun.env.USERPROFILE ?? '';
	const xdg = Bun.env.XDG_CONFIG_HOME;
	const globalBunfigPath = xdg ? `${xdg}/.bunfig.toml` : `${home}/.bunfig.toml`;
	const globalBunfigFile = Bun.file(globalBunfigPath);
	const hasGlobalBunfig = await globalBunfigFile.exists();

	sectionHeader('Global bunfig');
	console.log();
	if (hasGlobalBunfig) {
		try {
			const gToml = await globalBunfigFile.text();
			console.log(`    ${c.cyan('path'.padEnd(20))} ${c.green(globalBunfigPath)}`);
			const gReg = gToml.match(/^\s*registry\s*=\s*"([^"]+)"/m);
			if (gReg) console.log(`    ${c.cyan('registry'.padEnd(20))} ${gReg[1]}`);
			const gLinker = gToml.match(/^\s*linker\s*=\s*"([^"]+)"/m);
			if (gLinker) console.log(`    ${c.cyan('linker'.padEnd(20))} ${gLinker[1]}`);
			const gFrozen = gToml.match(/^\s*frozenLockfile\s*=\s*(true|false)/m);
			if (gFrozen) console.log(`    ${c.cyan('frozenLockfile'.padEnd(20))} ${gFrozen[1]}`);
			const gAge = gToml.match(/^\s*minimumReleaseAge\s*=\s*(\d+)/m);
			if (gAge)
				console.log(
					`    ${c.cyan('minimumReleaseAge'.padEnd(20))} ${gAge[1]}s (${(parseInt(gAge[1]) / 86400).toFixed(1)}d)`,
				);
			const gCache =
				gToml.match(/^\s*cache\.dir\s*=\s*"([^"]+)"/m) ??
				gToml.match(/\[install\.cache\][\s\S]*?dir\s*=\s*"([^"]+)"/m);
			if (gCache) console.log(`    ${c.cyan('cache.dir'.padEnd(20))} ${gCache[1]}`);
			console.log(`    ${c.dim('(shallow-merged under local bunfig.toml)')}`);
		} catch {
			console.log(`    ${c.yellow(globalBunfigPath)} ${c.red('(unreadable)')}`);
		}
	} else {
		console.log(`    ${c.dim('~/.bunfig.toml not found')}`);
	}

	// bunfig [install] coverage across projects
	const withBunfig = withPkg.filter(p => p.bunfig);
	sectionHeader(`bunfig Coverage (${withBunfig.length} projects)`);
	const installStats: {label: string; count: number; desc: string}[] = [
		{
			label: 'auto',
			count: withBunfig.filter(p => p.installAuto !== '-').length,
			desc: 'install.auto (auto|force|disable|fallback)',
		},
		{
			label: 'frozenLockfile',
			count: withBunfig.filter(p => p.frozenLockfile).length,
			desc: 'CI-safe lockfile enforcement',
		},
		{label: 'dryRun', count: withBunfig.filter(p => p.dryRun).length, desc: 'install.dryRun (no actual install)'},
		{label: 'production', count: withBunfig.filter(p => p.production).length, desc: 'skip devDependencies'},
		{label: 'exact', count: withBunfig.filter(p => p.exact).length, desc: 'pin exact versions (no ^/~)'},
		{label: 'linker', count: withBunfig.filter(p => p.linker !== '-').length, desc: 'explicit linker strategy'},
		{label: 'backend', count: withBunfig.filter(p => p.backend !== '-').length, desc: 'explicit fs backend'},
		{
			label: 'minimumReleaseAge',
			count: withBunfig.filter(p => p.minimumReleaseAge > 0).length,
			desc: 'supply-chain age gate (seconds)',
		},
		{
			label: '  Excludes',
			count: withBunfig.filter(p => p.minimumReleaseAgeExcludes.length > 0).length,
			desc: 'minimumReleaseAgeExcludes',
		},
		{label: 'saveTextLock', count: withBunfig.filter(p => p.saveTextLockfile).length, desc: 'text-based bun.lock'},
		{label: 'linkWsPkgs', count: withBunfig.filter(p => p.linkWorkspacePackages).length, desc: 'workspace linking'},
		{label: 'cacheDisabled', count: withBunfig.filter(p => p.cacheDisabled).length, desc: 'global cache bypassed'},
		{label: 'cacheDir', count: withBunfig.filter(p => p.cacheDir !== '-').length, desc: 'custom cache path'},
		{
			label: '  disableManifest',
			count: withBunfig.filter(p => p.cacheDisableManifest).length,
			desc: 'always resolve latest from registry',
		},
		{
			label: 'globalDir',
			count: withBunfig.filter(p => p.globalDir !== '-').length,
			desc: 'custom global install dir',
		},
		{
			label: 'globalBinDir',
			count: withBunfig.filter(p => p.globalBinDir !== '-').length,
			desc: 'custom global bin dir',
		},
		{label: 'ca/cafile', count: withBunfig.filter(p => p.hasCa).length, desc: 'CA certificate configured'},
		{
			label: 'lockfile.save',
			count: withBunfig.filter(p => !p.lockfileSave).length,
			desc: 'lockfile generation disabled',
		},
		{
			label: 'lockfile.print',
			count: withBunfig.filter(p => p.lockfilePrint !== '-').length,
			desc: 'non-Bun lockfile output (yarn)',
		},
		{label: 'noVerify', count: withBunfig.filter(p => p.noVerify).length, desc: 'skip integrity verification'},
		{
			label: 'verbose',
			count: withBunfig.filter(p => p.verbose).length,
			desc: 'debug logging (lifecycle scripts visible)',
		},
		{label: 'silent', count: withBunfig.filter(p => p.silent).length, desc: 'no logging'},
		{
			label: 'concurrentScripts',
			count: withBunfig.filter(p => p.concurrentScripts > 0).length,
			desc: 'custom lifecycle concurrency (default cpu\u00d72)',
		},
		{
			label: 'networkConc.',
			count: withBunfig.filter(p => p.networkConcurrency > 0).length,
			desc: 'custom network concurrency (default 48)',
		},
		{
			label: 'targetCpu',
			count: withBunfig.filter(p => p.targetCpu !== '-').length,
			desc: 'cross-platform cpu override',
		},
		{
			label: 'targetOs',
			count: withBunfig.filter(p => p.targetOs !== '-').length,
			desc: 'cross-platform os override',
		},
		{
			label: 'security.scanner',
			count: withBunfig.filter(p => p.installSecurityScanner !== '-').length,
			desc: 'install.security.scanner',
		},
		{
			label: 'trustedDeps',
			count: withBunfig.filter(p => p.trustedDeps.length > 0).length,
			desc: 'lifecycle scripts allowed',
		},
		{
			label: 'optional',
			count: withBunfig.filter(p => !p.installOptional).length,
			desc: 'optional deps disabled (default: on)',
		},
		{label: 'dev', count: withBunfig.filter(p => !p.installDev).length, desc: 'dev deps disabled (default: on)'},
		{
			label: 'peer',
			count: withBunfig.filter(p => !p.installPeer).length,
			desc: 'peer auto-install disabled (default: on)',
		},
	];
	// bunfig [run] coverage — merge into installStats rows
	const withRunShell = withBunfig.filter(p => p.runShell !== '-');
	const withRunBun = withBunfig.filter(p => p.runBun);
	const withRunSilent = withBunfig.filter(p => p.runSilent);
	const hasAnyRun = withRunShell.length > 0 || withRunBun.length > 0 || withRunSilent.length > 0;
	if (hasAnyRun) {
		installStats.push(
			{label: '[run] shell', count: withRunShell.length, desc: 'run.shell ("system" | "bun")'},
			{label: '[run] bun', count: withRunBun.length, desc: 'run.bun (node → bun alias)'},
			{label: '[run] silent', count: withRunSilent.length, desc: 'run.silent (suppress command output)'},
		);
	}

	const bunfigRows = installStats.map(s => ({
		Setting: s.label,
		Count: `${s.count}/${withBunfig.length}`,
		Description: s.desc,
	}));
	renderMatrix(bunfigRows, BUN_SCANNER_COLUMNS.BUNFIG_COVERAGE);

	// bunfig [debug] coverage
	const withDebugEditor = withBunfig.filter(p => p.debugEditor !== '-');
	if (withDebugEditor.length > 0) {
		sectionHeader('bunfig [debug] Coverage');
		console.log();
		const display = c.green(`${withDebugEditor.length}/${withBunfig.length}`);
		console.log(`    ${c.cyan('editor'.padEnd(18))} ${display}  ${c.dim('debug.editor (Bun.openInEditor)')}`);
	}

	// Cross-platform target validation
	const crossProjects = withBunfig.filter(p => p.targetCpu !== '-' || p.targetOs !== '-');
	if (crossProjects.length > 0) {
		console.log();
		console.log(c.bold(`  Cross-platform targets (${crossProjects.length} project(s)):`));
		console.log(`    ${c.dim(`cpu: ${[...VALID_CPU].join(', ')}`)}`);
		console.log(`    ${c.dim(`os:  ${[...VALID_OS].join(', ')}`)}`);
		console.log();
		for (const p of crossProjects) {
			const cpuOk = p.targetCpu === '-' || VALID_CPU.has(p.targetCpu);
			const osOk = p.targetOs === '-' || VALID_OS.has(p.targetOs);
			const cpuStr = p.targetCpu !== '-' ? (cpuOk ? p.targetCpu : c.red(p.targetCpu)) : c.dim('native');
			const osStr = p.targetOs !== '-' ? (osOk ? p.targetOs : c.red(p.targetOs)) : c.dim('native');
			const status = cpuOk && osOk ? c.green('OK') : c.red('INVALID');
			console.log(`    ${p.folder.padEnd(28)} ${cpuStr}/${osStr}  ${status}`);
		}
	}

	// Linker strategy distribution (v1.3.2: configVersion determines default)
	const withLock = withPkg.filter(p => p.lock !== 'none');
	if (withLock.length > 0) {
		console.log();
		console.log(c.bold(`  Linker strategy (${withLock.length} projects with lockfile):`));
		console.log();

		// Decision matrix (Bun v1.3.2 rules)
		console.log(`    ${c.dim('configVersion')}  ${c.dim('Workspaces?')}  ${c.dim('Default Linker')}`);
		console.log(`    ${c.cyan('0')}              ${c.dim('any')}          hoisted ${c.dim('(backward compat)')}`);
		console.log(`    ${c.cyan('1')}              no           hoisted`);
		console.log(`    ${c.cyan('1')}              yes          ${c.cyan('isolated')}`);
		console.log();

		const cv0 = withLock.filter(p => p.configVersion === 0).length;
		const cv1 = withLock.filter(p => p.configVersion === 1).length;
		const cvUnknown = withLock.filter(p => p.configVersion === -1).length;
		console.log(
			`    ${c.cyan('configVersion'.padEnd(18))} ${c.dim('v0=')}${cv0}  ${c.dim('v1=')}${cv1}${cvUnknown > 0 ? `  ${c.dim('unknown=')}${cvUnknown}` : ''}`,
		);

		const hoisted = withLock.filter(p => effectiveLinker(p).strategy === 'hoisted').length;
		const isolated = withLock.filter(p => effectiveLinker(p).strategy === 'isolated').length;
		console.log(
			`    ${c.cyan('effective'.padEnd(18))} hoisted=${hoisted}  ${isolated > 0 ? c.cyan(`isolated=${isolated}`) : `isolated=${isolated}`}`,
		);

		const explicit = withLock.filter(p => p.linker !== '-').length;
		if (explicit > 0) {
			console.log(
				`    ${c.cyan('explicit bunfig'.padEnd(18))} ${explicit} project(s) override configVersion default`,
			);
		}
	}

	if (withoutPkg.length > 0) {
		console.log();
		console.log(
			c.dim(
				`  ${withoutPkg.length} directories without package.json: ${withoutPkg.map(p => p.folder).join(', ')}`,
			),
		);
	}

	// Per-project breakdown
	if (issues.length > 0) {
		console.log();
		console.log(c.bold('  Projects with missing fields:'));
		console.log();
		for (const row of issues) {
			console.log(`    ${c.yellow(row.folder.padEnd(30))} ${row.missing}`);
		}
	} else {
		console.log();
		console.log(c.green('  All projects have complete metadata!'));
	}

	console.log();

	// Hint about --fix
	const fixableMeta = withPkg.filter(p => p.author === '-' || p.license === '-').length;
	const fixableInit = withoutPkg.length;
	const totalFixable = fixableMeta + fixableInit;
	if (totalFixable > 0) {
		const parts: string[] = [];
		if (fixableMeta > 0) parts.push(`patch ${fixableMeta} package.json(s)`);
		if (fixableInit > 0) parts.push(`init ${fixableInit} missing package.json(s) + bun install`);
		console.log(c.dim(`  Tip: run with --fix to ${parts.join(' & ')}`));
		console.log(c.dim(`       run with --fix --dry-run to preview changes first`));
		console.log();
	}
}

// ── Fix: write missing defaults + init missing package.json ─────────────
async function fixProjects(projects: ProjectInfo[], dryRun: boolean): Promise<void> {
	const patchable = projects.filter(p => p.hasPkg && (p.author === '-' || p.license === '-'));
	const initable = projects.filter(p => !p.hasPkg);

	if (patchable.length === 0 && initable.length === 0) {
		console.log(c.green('\n  Nothing to fix — all projects have package.json with author + license.\n'));
		return;
	}

	console.log();
	console.log(c.bold(c.cyan(`  ${dryRun ? 'Dry Run' : 'Fixing'}`)));
	console.log(c.dim(`  Defaults: author="${DEFAULTS.author}", license="${DEFAULTS.license}"`));

	// ── Patch existing package.json files ────────────────────────────
	if (patchable.length > 0) {
		console.log();
		console.log(c.bold(`  Patching ${patchable.length} existing package.json(s):`));
		console.log();

		let patched = 0;
		for (const p of patchable) {
			const pkgPath = `${projectDir(p)}/package.json`;
			try {
				const pkg = await Bun.file(pkgPath).json();
				const changes: string[] = [];

				if (!pkg.author) {
					pkg.author = DEFAULTS.author;
					changes.push('author');
				}
				if (!pkg.license) {
					pkg.license = DEFAULTS.license;
					changes.push('license');
				}

				if (changes.length === 0) continue;
				const label = changes.map(f => c.green(`+${f}`)).join(' ');

				if (dryRun) {
					console.log(`    ${c.yellow('DRY')} ${p.folder.padEnd(30)} ${label}`);
				} else {
					await Bun.write(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
					console.log(`    ${c.green('FIX')} ${p.folder.padEnd(30)} ${label}`);
					patched++;
				}
			} catch {
				console.log(`    ${c.red('ERR')} ${p.folder.padEnd(30)} could not read/write package.json`);
			}
		}
		if (!dryRun) console.log(c.dim(`\n  Patched ${patched} file(s).`));
	}

	// ── Init missing package.json + bun install ──────────────────────
	if (initable.length > 0) {
		console.log();
		console.log(c.bold(`  Initializing ${initable.length} project(s) without package.json:`));
		console.log();

		let inited = 0;
		for (const p of initable) {
			const dir = projectDir(p);
			const pkgPath = `${dir}/package.json`;
			const pkg = {
				name: p.folder,
				version: '0.1.0',
				author: DEFAULTS.author,
				license: DEFAULTS.license,
				description: '',
			};

			if (dryRun) {
				console.log(
					`    ${c.yellow('DRY')} ${p.folder.padEnd(30)} ${c.green('+package.json')} ${c.cyan('+bun install')}`,
				);
				continue;
			}

			try {
				await Bun.write(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
				console.log(`    ${c.green('NEW')} ${p.folder.padEnd(30)} ${c.green('+package.json')}`);

				// Run bun install to generate lock file
				const proc = Bun.spawn(['bun', 'install'], {cwd: dir, stdout: 'pipe', stderr: 'pipe'});
				const exitCode = await proc.exited;
				if (exitCode === 0) {
					console.log(`    ${c.cyan('  ↳')} ${p.folder.padEnd(30)} ${c.cyan('bun install ✓')}`);
				} else {
					const stderr = await proc.stderr.text();
					console.log(
						`    ${c.yellow('  ↳')} ${p.folder.padEnd(30)} bun install exited ${exitCode}: ${stderr.trim().split('\n')[0]}`,
					);
				}
				inited++;
			} catch (err) {
				console.log(`    ${c.red('ERR')} ${p.folder.padEnd(30)} ${err}`);
			}
		}
		if (!dryRun) console.log(c.dim(`\n  Initialized ${inited} project(s).`));
	}

	console.log();
	if (dryRun) {
		console.log(c.dim(`  Run without --dry-run to apply changes.`));
		console.log();
	}
}

// ── Fix Engine: unify engines.bun across all projects ──────────────────
async function fixEngine(projects: ProjectInfo[], dryRun: boolean): Promise<void> {
	const bunVersion = Bun.version;
	const target = `>=${bunVersion}`;
	const withPkg = projects.filter(p => p.hasPkg);
	const needsFix = withPkg.filter(p => p.engine !== target);

	if (needsFix.length === 0) {
		console.log(c.green(`\n  All ${withPkg.length} projects already have engines.bun = "${target}".\n`));
		return;
	}

	console.log();
	console.log(c.bold(c.cyan(`  ${dryRun ? 'Dry Run' : 'Unifying'} engines.bun → "${target}"`)));
	console.log(c.dim(`  ${needsFix.length}/${withPkg.length} projects need updating`));
	console.log();

	let updated = 0;

	for (const p of needsFix) {
		const pkgPath = `${projectDir(p)}/package.json`;
		try {
			const pkg = await Bun.file(pkgPath).json();
			const old = pkg.engines?.bun ?? '(none)';

			pkg.engines ??= {};
			pkg.engines.bun = target;

			const label =
				old === '(none)' ? c.green(`+engines.bun = "${target}"`) : `${c.dim(old)} → ${c.green(target)}`;

			if (dryRun) {
				console.log(`    ${c.yellow('DRY')} ${p.folder.padEnd(30)} ${label}`);
			} else {
				await Bun.write(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
				console.log(`    ${c.green('FIX')} ${p.folder.padEnd(30)} ${label}`);
				updated++;
			}
		} catch {
			console.log(`    ${c.red('ERR')} ${p.folder.padEnd(30)} could not read/write package.json`);
		}
	}

	console.log();
	if (dryRun) {
		console.log(c.dim(`  Run without --dry-run to apply.`));
	} else {
		console.log(c.green(`  Updated ${updated} package.json file(s) to engines.bun = "${target}".`));
	}
	console.log();
}

// ── Fix DNS: TTL recommendation + per-project dns-prefetch.ts ─────────
async function fixDns(projects: ProjectInfo[], dryRun: boolean): Promise<void> {
	const withPkg = projects.filter(p => p.hasPkg);

	console.log();
	console.log(c.bold(c.cyan(`  ${dryRun ? 'Dry Run:' : 'Generating'} DNS prefetch snippets`)));
	console.log();

	// ── .env.template update ──────────────────────────────────────
	const templatePath = `${PROJECTS_ROOT}/scanner/.env.template`;
	const templateFile = Bun.file(templatePath);
	const templateContent = (await templateFile.exists()) ? await templateFile.text() : '';

	if (!templateContent.includes('BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS')) {
		const dnsBlock = [
			'',
			'# DNS cache TTL — AWS recommends 5s for dynamic environments (Bun default: 30)',
			'# BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS=5',
		].join('\n');

		if (dryRun) {
			console.log(`  .env.template:`);
			console.log(`    ${c.yellow('DRY')}  BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS=5`);
		} else {
			await Bun.write(templatePath, templateContent.trimEnd() + '\n' + dnsBlock + '\n');
			console.log(`  .env.template:`);
			console.log(`    ${c.green('FIX')}  BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS=5`);
		}
	} else {
		console.log(`  .env.template:`);
		console.log(c.dim(`    SKIP already contains BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS`));
	}

	console.log();

	// ── Per-project dns-prefetch.ts ───────────────────────────────
	let totalDomains = new Set<string>();
	let generated = 0;
	let skipped = 0;

	for (const p of withPkg) {
		const dir = projectDir(p);
		const domains = new Set<string>();

		// Extract from bunfig.toml
		const bunfigFile = Bun.file(`${dir}/bunfig.toml`);
		if (await bunfigFile.exists()) {
			try {
				const toml = await bunfigFile.text();
				// [install] registry
				const regMatch = toml.match(/registry\s*=\s*"([^"]+)"/);
				if (regMatch) {
					try {
						domains.add(new URL(regMatch[1]).hostname);
					} catch {
						/* invalid registry URL, skip */
					}
				}
				// [install.scopes] urls
				for (const m of toml.matchAll(/url\s*=\s*"([^"]+)"/g)) {
					try {
						domains.add(new URL(m[1]).hostname);
					} catch {
						/* invalid scope URL, skip */
					}
				}
			} catch (err) {
				_verboseWarn('bunfig.toml parse', err);
			}
		}

		// Extract from .npmrc
		const npmrcFile = Bun.file(`${dir}/.npmrc`);
		if (await npmrcFile.exists()) {
			try {
				const npmrc = await npmrcFile.text();
				// global registry
				for (const m of npmrc.matchAll(/^registry\s*=\s*(.+)$/gm)) {
					try {
						const urlStr = m[1]?.trim() ?? '';
						if (urlStr) {
							domains.add(new URL(urlStr).hostname);
						}
					} catch {
						/* invalid URL, skip */
					}
				}
				// scoped registries
				for (const m of npmrc.matchAll(/^@[^:\s]+:registry\s*=\s*(.+)$/gm)) {
					try {
						const urlStr = m[1]?.trim() ?? '';
						if (urlStr) {
							domains.add(new URL(urlStr).hostname);
						}
					} catch {
						/* invalid URL, skip */
					}
				}
			} catch (err) {
				_verboseWarn('.npmrc parse', err);
			}
		}

		// Extract from package.json publishConfig
		const pkgFile = Bun.file(`${dir}/package.json`);
		if (await pkgFile.exists()) {
			try {
				const pkg = await pkgFile.json();
				const pubReg = pkg.publishConfig?.registry;
				if (pubReg) {
					try {
						domains.add(new URL(pubReg).hostname);
					} catch {
						/* invalid URL, skip */
					}
				}
			} catch (err) {
				_verboseWarn('package.json publishConfig', err);
			}
		}

		// Always include npmjs as fallback
		domains.add('registry.npmjs.org');

		for (const d of domains) totalDomains.add(d);

		const sorted = [...domains].sort();
		const lines = [
			`// dns-prefetch.ts — auto-generated by scan.ts --fix-dns`,
			`// These domains are explicitly prefetched at runtime by Bun for lower latency`,
			`// Re-run: bun run ../scanner/scan.ts --fix-dns`,
			``,
			`import { dns } from "bun";`,
			``,
			...sorted.map(d => `dns.prefetch("${d}", 443);`),
			``,
		].join('\n');

		const prefetchPath = `${dir}/dns-prefetch.ts`;
		const prefetchFile = Bun.file(prefetchPath);
		const existing = (await prefetchFile.exists()) ? await prefetchFile.text() : null;

		if (existing === lines) {
			console.log(`    ${c.dim('SKIP')} ${p.folder.padEnd(32)} dns-prefetch.ts already up-to-date`);
			skipped++;
			continue;
		}

		const domainList = sorted.join(', ');
		if (dryRun) {
			console.log(`    ${c.yellow('DRY')}  ${p.folder.padEnd(32)} ${domainList}`);
		} else {
			await Bun.write(prefetchPath, lines);
			console.log(`    ${c.green('FIX')}  ${p.folder.padEnd(32)} ${domainList}`);
			generated++;
		}
	}

	console.log();
	if (dryRun) {
		console.log(c.dim(`  ${totalDomains.size} domain(s) detected across ${withPkg.length} projects.`));
		console.log(c.dim(`  Run without --dry-run to apply.`));
	} else {
		console.log(c.green(`  Generated ${generated} dns-prefetch.ts file(s). ${skipped} already up-to-date.`));
	}
	console.log();
}

// ── Fix Scopes: inject [install.scopes] into bunfig.toml ─────────────
// Usage: --fix-scopes https://npm.factory-wager.com @factorywager @duoplus
async function fixScopes(
	projects: ProjectInfo[],
	registryUrl: string,
	scopeNames: string[],
	dryRun: boolean,
): Promise<void> {
	const url = (registryUrl.startsWith('http') ? registryUrl : `https://${registryUrl}`).replace(/\/+$/, '') + '/';
	const withPkg = projects.filter(p => p.hasPkg);

	console.log();
	console.log(c.bold(c.cyan(`  ${dryRun ? 'Dry Run' : 'Configuring'} scoped registries → ${url}`)));
	console.log(c.dim(`  Scopes: ${scopeNames.join(', ')}`));
	console.log(c.dim(`  ${withPkg.length} projects | token via $FW_REGISTRY_TOKEN`));
	console.log();

	// Build the [install.scopes] TOML block
	const scopeLines = scopeNames.map(s => `"${s}" = { token = "$FW_REGISTRY_TOKEN", url = "${url}" }`).join('\n');
	const scopeBlock = `[install.scopes]\n${scopeLines}`;

	let updated = 0;
	let created = 0;

	for (const p of withPkg) {
		const dir = projectDir(p);
		const bunfigPath = `${dir}/bunfig.toml`;
		const bunfigFile = Bun.file(bunfigPath);
		const exists = await bunfigFile.exists();
		const changes: string[] = [];

		if (exists) {
			try {
				let toml = await bunfigFile.text();
				const hasScopes = toml.includes('[install.scopes]');

				if (hasScopes) {
					// Check if all requested scopes are already present
					const missing = scopeNames.filter(s => !toml.includes(`"${s}"`));
					if (missing.length === 0) continue; // already fully configured

					// Append missing scopes into existing section
					const insertLines = missing
						.map(s => `"${s}" = { token = "$FW_REGISTRY_TOKEN", url = "${url}" }`)
						.join('\n');
					toml = toml.replace(/(\[install\.scopes\]\s*\n)/, `$1${insertLines}\n`);
					changes.push(`+scopes: ${c.green(missing.join(', '))}`);
				} else {
					// Append entire [install.scopes] section
					toml = toml.trimEnd() + '\n\n' + scopeBlock + '\n';
					changes.push(`+${c.green('[install.scopes]')}: ${scopeNames.join(', ')}`);
				}

				if (!dryRun) {
					await Bun.write(bunfigPath, toml);
					updated++;
				}
			} catch {
				changes.push(c.red('read/write error'));
			}
		} else {
			// No bunfig.toml — create one with scopes
			changes.push(`${c.green('+bunfig.toml')} with ${scopeNames.join(', ')}`);
			if (!dryRun) {
				await Bun.write(bunfigPath, scopeBlock + '\n');
				created++;
			}
		}

		if (changes.length > 0) {
			const tag = dryRun ? c.yellow('DRY') : c.green('FIX');
			console.log(`    ${tag} ${p.folder.padEnd(30)} ${changes.join('  ')}`);
		}
	}

	console.log();
	if (dryRun) {
		console.log(c.dim('  Run without --dry-run to apply.'));
	} else {
		console.log(c.green(`  Updated ${updated} bunfig.toml(s), created ${created} new.`));
		console.log(c.dim(`  Set $FW_REGISTRY_TOKEN env var for auth.`));
	}
	console.log();
}

// ── Fix Npmrc: rewrite .npmrc with scoped v1.3.5+ template ───────────
// Usage: --fix-npmrc https://npm.factory-wager.com @factorywager @duoplus
async function fixNpmrc(
	projects: ProjectInfo[],
	registryUrl: string,
	scopeNames: string[],
	dryRun: boolean,
): Promise<void> {
	const url = (registryUrl.startsWith('http') ? registryUrl : `https://${registryUrl}`).replace(/\/+$/, '') + '/';
	const display = url.replace(/^https?:\/\//, '');
	const withPkg = projects.filter(p => p.hasPkg);

	// Build the template
	const scopeLines = scopeNames.map(s => `${s}:registry=${url}`).join('\n');
	const template = [
		scopeLines,
		'',
		'always-auth=true',
		'',
		`//${display}:_authToken=\${FW_REGISTRY_TOKEN?}`,
		'',
	].join('\n');

	console.log();
	console.log(c.bold(c.cyan(`  ${dryRun ? 'Dry Run' : 'Rewriting'} .npmrc → v1.3.5+ scoped template`)));
	console.log(c.dim(`  Registry: ${url}`));
	console.log(c.dim(`  Scopes: ${scopeNames.join(', ')}`));
	console.log(c.dim(`  Token: \${FW_REGISTRY_TOKEN?} (graceful undefined)`));
	console.log(c.dim(`  ${withPkg.length} projects`));
	console.log();

	let updated = 0;
	let created = 0;

	for (const p of withPkg) {
		const dir = projectDir(p);
		const npmrcPath = `${dir}/.npmrc`;
		const npmrcFile = Bun.file(npmrcPath);
		const exists = await npmrcFile.exists();

		let action: string;
		if (exists) {
			const current = await npmrcFile.text();
			if (current.includes('${FW_REGISTRY_TOKEN?}') && current.includes('always-auth')) {
				continue; // already v1.3.5+ template
			}
			action = `${c.yellow('rewrite')} → scoped + \${FW_REGISTRY_TOKEN?}`;
			if (!dryRun) {
				await Bun.write(npmrcPath, template);
				updated++;
			}
		} else {
			action = `${c.green('+new')} scoped + \${FW_REGISTRY_TOKEN?}`;
			if (!dryRun) {
				await Bun.write(npmrcPath, template);
				created++;
			}
		}

		const tag = dryRun ? c.yellow('DRY') : c.green('FIX');
		console.log(`    ${tag} ${p.folder.padEnd(30)} ${action}`);
	}

	console.log();
	if (dryRun) {
		console.log(c.dim('  Run without --dry-run to apply.'));
	} else {
		console.log(c.green(`  Rewrote ${updated}, created ${created} .npmrc file(s).`));
		console.log(c.dim(`  Set $FW_REGISTRY_TOKEN env var for auth.`));
	}
	console.log();
}

// ── Fix Registry: unify registry across all projects ─────────────────
// Updates: bunfig.toml [install] + [publish], package.json publishConfig, .npmrc auth
async function fixRegistry(projects: ProjectInfo[], registryUrl: string, dryRun: boolean): Promise<void> {
	// Normalize: ensure https:// prefix, strip trailing slash
	const url = (registryUrl.startsWith('http') ? registryUrl : `https://${registryUrl}`).replace(/\/+$/, '');
	const display = url.replace(/^https?:\/\//, '');
	const withPkg = projects.filter(p => p.hasPkg);

	console.log();
	console.log(c.bold(c.cyan(`  ${dryRun ? 'Dry Run' : 'Unifying'} registry → ${url}`)));
	console.log(c.dim(`  ${withPkg.length} projects with package.json`));
	console.log(c.dim(`  Targets: bunfig.toml [install] + [publish], package.json publishConfig, .npmrc auth`));
	console.log();

	let updatedPkg = 0;
	let updatedBunfig = 0;
	let updatedNpmrc = 0;

	for (const p of withPkg) {
		const dir = projectDir(p);
		const changes: string[] = [];

		// ── 1. package.json publishConfig.registry ──────────────
		const pkgPath = `${dir}/package.json`;
		try {
			const pkg = await Bun.file(pkgPath).json();
			const oldReg = pkg.publishConfig?.registry;
			if (oldReg !== url) {
				pkg.publishConfig ??= {};
				pkg.publishConfig.registry = url;
				const label = oldReg
					? `${c.dim(oldReg.replace(/^https?:\/\//, ''))} → ${c.green(display)}`
					: c.green(`+publishConfig.registry`);
				changes.push(`pkg: ${label}`);
				if (!dryRun) {
					await Bun.write(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
					updatedPkg++;
				}
			}
		} catch {
			changes.push(`pkg: ${c.red('read/write error')}`);
		}

		// ── 2. bunfig.toml [install] + [publish] registry ──────
		const bunfigPath = `${dir}/bunfig.toml`;
		const bunfigFile = Bun.file(bunfigPath);
		if (await bunfigFile.exists()) {
			try {
				let toml = await bunfigFile.text();
				let bunfigChanged = false;

				// [install] registry
				const installRegMatch = toml.match(/^(\s*registry\s*=\s*)"([^"]+)"/m);
				if (installRegMatch && installRegMatch[2] !== url) {
					toml = toml.replace(/^(\s*registry\s*=\s*)"[^"]+"/m, `$1"${url}"`);
					changes.push(
						`bunfig[install]: ${c.dim(installRegMatch[2].replace(/^https?:\/\//, ''))} → ${c.green(display)}`,
					);
					bunfigChanged = true;
				} else if (!installRegMatch) {
					if (toml.includes('[install]')) {
						toml = toml.replace(/(\[install\]\s*\n)/, `$1registry = "${url}"\n`);
					} else {
						toml += `\n[install]\nregistry = "${url}"\n`;
					}
					changes.push(`bunfig[install]: ${c.green('+registry')}`);
					bunfigChanged = true;
				}

				// [publish] registry
				const publishSection = toml.match(/^\[publish\]\s*\n([\s\S]*?)(?=^\[|$)/m);
				const publishRegMatch = publishSection?.[1]?.match(/registry\s*=\s*"([^"]+)"/);
				if (publishSection && publishRegMatch && publishRegMatch[1] !== url) {
					toml = toml.replace(/(\[publish\]\s*\n[\s\S]*?)registry\s*=\s*"[^"]+"/m, `$1registry = "${url}"`);
					changes.push(
						`bunfig[publish]: ${c.dim(publishRegMatch[1].replace(/^https?:\/\//, ''))} → ${c.green(display)}`,
					);
					bunfigChanged = true;
				} else if (!publishSection) {
					toml += `\n[publish]\nregistry = "${url}"\n`;
					changes.push(`bunfig[publish]: ${c.green('+section')}`);
					bunfigChanged = true;
				} else if (publishSection && !publishRegMatch) {
					toml = toml.replace(/(\[publish\]\s*\n)/, `$1registry = "${url}"\n`);
					changes.push(`bunfig[publish]: ${c.green('+registry')}`);
					bunfigChanged = true;
				}

				if (bunfigChanged && !dryRun) {
					await Bun.write(bunfigPath, toml);
					updatedBunfig++;
				}
			} catch {
				changes.push(`bunfig: ${c.red('read/write error')}`);
			}
		}

		// ── 3. .npmrc auth token ────────────────────────────────
		const npmrcPath = `${dir}/.npmrc`;
		const npmrcFile = Bun.file(npmrcPath);
		const authLine = `//${display}/:_authToken=\${REGISTRY_TOKEN}`;
		const npmrcExists = await npmrcFile.exists();
		if (npmrcExists) {
			try {
				const content = await npmrcFile.text();
				if (!content.includes(`//${display}/`)) {
					const updated = content.trimEnd() + '\n' + authLine + '\n';
					changes.push(`.npmrc: ${c.green('+auth')}`);
					if (!dryRun) {
						await Bun.write(npmrcPath, updated);
						updatedNpmrc++;
					}
				}
			} catch {
				changes.push(`.npmrc: ${c.red('read/write error')}`);
			}
		} else {
			changes.push(`.npmrc: ${c.green('+new')}`);
			if (!dryRun) {
				await Bun.write(npmrcPath, authLine + '\n');
				updatedNpmrc++;
			}
		}

		if (changes.length > 0) {
			const tag = dryRun ? c.yellow('DRY') : c.green('FIX');
			console.log(`    ${tag} ${p.folder.padEnd(30)} ${changes.join('  ')}`);
		}
	}

	console.log();
	if (dryRun) {
		console.log(c.dim(`  Run without --dry-run to apply.`));
		console.log(c.dim(`  Set $REGISTRY_TOKEN env var for auth before publishing.`));
	} else {
		console.log(
			c.green(
				`  Updated ${updatedPkg} package.json(s), ${updatedBunfig} bunfig.toml(s), ${updatedNpmrc} .npmrc(s) → ${url}`,
			),
		);
		console.log(c.dim(`  Set $REGISTRY_TOKEN env var, then: bun publish --dry-run (to verify)`));
	}
	console.log();
}

// ── Fix Trusted: detect native deps and add to trustedDependencies ────
// Scans node_modules for packages with lifecycle scripts, heuristic-matches
// native dep patterns, and writes to package.json trustedDependencies.

async function fixTrusted(projects: ProjectInfo[], dryRun: boolean): Promise<void> {
	const withPkg = projects.filter(p => p.hasPkg);

	console.log();
	console.log(c.bold(c.cyan(`  ${dryRun ? 'Dry Run' : 'Fixing'} trustedDependencies`)));
	console.log(c.dim(`  Scanning node_modules for native deps with lifecycle scripts`));
	console.log(c.dim(`  Heuristic: ${NATIVE_PATTERN.source}`));
	console.log();

	let totalUpdated = 0;
	let totalDetected = 0;

	for (const p of withPkg) {
		const dir = projectDir(p);
		const nmDir = `${dir}/node_modules`;
		let entries: string[] = [];
		try {
			entries = await readdir(nmDir);
		} catch {
			continue;
		}

		const existing = new Set(p.trustedDeps);
		const detected: string[] = [];

		const reads: [string, string][] = [];
		for (const entry of entries) {
			if (entry.startsWith('@')) {
				let scoped: string[] = [];
				try {
					scoped = await readdir(`${nmDir}/${entry}`);
				} catch {
					continue;
				}
				for (const sub of scoped) reads.push([`${entry}/${sub}`, `${nmDir}/${entry}/${sub}/package.json`]);
			} else {
				reads.push([entry, `${nmDir}/${entry}/package.json`]);
			}
		}
		await Promise.all(
			reads.map(async ([pkgName, pkgJsonPath]) => {
				try {
					const pkg = await Bun.file(pkgJsonPath).json();
					const scripts = pkg.scripts ?? {};
					const hasLifecycle = LIFECYCLE_HOOKS.some(h => !!scripts[h]);
					if (!hasLifecycle) return;

					const scriptValues = Object.values(scripts).join(' ');
					if (isNativeMatch(pkgName) || isNativeMatch(scriptValues)) {
						if (!existing.has(pkgName)) {
							detected.push(pkgName);
						}
					}
				} catch (err) {
					_verboseWarn(`native dep scan: ${pkgName}`, err);
				}
			}),
		);

		if (detected.length === 0) continue;
		totalDetected += detected.length;

		const merged = [...new Set([...p.trustedDeps, ...detected])].sort();

		if (dryRun) {
			console.log(
				`    ${c.yellow('DRY')} ${p.folder.padEnd(30)} +${detected.length} native: ${c.dim(detected.join(', '))}`,
			);
		} else {
			const pkgPath = `${dir}/package.json`;
			try {
				const pkg = await Bun.file(pkgPath).json();
				pkg.trustedDependencies = merged;
				await Bun.write(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
				console.log(
					`    ${c.green('FIX')} ${p.folder.padEnd(30)} +${detected.length} native: ${c.dim(detected.join(', '))}`,
				);
				totalUpdated++;
			} catch {
				console.log(`    ${c.red('ERR')} ${p.folder.padEnd(30)} could not write package.json`);
			}
		}
	}

	console.log();
	if (totalDetected === 0) {
		console.log(c.green(`  No new native deps detected across ${withPkg.length} projects.`));
		console.log(c.dim(`  Existing trustedDependencies are up to date.`));
	} else if (dryRun) {
		console.log(c.dim(`  ${totalDetected} native dep(s) detected. Run without --dry-run to apply.`));
	} else {
		console.log(c.green(`  Updated ${totalUpdated} package.json(s) with ${totalDetected} native dep(s).`));
	}
	console.log();
}

// ── Why: run `bun why <pkg>` across all projects ───────────────────────
async function whyAcrossProjects(
	projects: ProjectInfo[],
	pkg: string,
	opts: {top?: boolean; depth?: string},
): Promise<void> {
	const withLock = projects.filter(p => p.lock !== 'none');

	const flagParts: string[] = [];
	if (opts.top) flagParts.push('--top');
	if (opts.depth) flagParts.push(`--depth ${opts.depth}`);
	const flagStr = flagParts.length > 0 ? ` ${flagParts.join(' ')}` : '';

	console.log();
	console.log(
		c.bold(c.cyan(`  bun why ${pkg}${flagStr}`)) + c.dim(` — scanning ${withLock.length} projects with lock files`),
	);
	console.log();

	interface WhyHit {
		folder: string;
		versions: string[];
		depType: string;
		directBy: string;
	}
	const hits: WhyHit[] = [];

	const whyResults = await Promise.all(
		withLock.map(async p => {
			const dir = projectDir(p);
			const args = ['bun', 'why', pkg];
			if (opts.top) args.push('--top');
			if (opts.depth) args.push('--depth', opts.depth);
			const proc = Bun.spawn(args, {cwd: dir, stdout: 'pipe', stderr: 'pipe'});
			const exitCode = await proc.exited;
			const stdout = await proc.stdout.text();
			const trimmed = stdout.trim();

			if (exitCode !== 0 || trimmed.length === 0) return null;

			const lines = trimmed.split('\n');
			const clean = lines.map(stripAnsi);

			const versions = [
				...new Set(
					clean
						.filter(l => /@\S+/.test(l) && !l.includes('(requires'))
						.map(l => l.match(/@(\S+)/)?.[1])
						.filter(Boolean) as string[],
				),
			];

			const isDirect = clean.some(l => l.includes(p.name) && l.includes('(requires'));
			const hasOptionalPeer = clean.some(l => /optional peer\s/.test(l));
			const hasDev = clean.some(l => /(?:├─|└─)\s+dev\s/.test(l));
			const hasPeer = clean.some(l => /(?:├─|└─)\s+peer\s/.test(l));
			const depType = isDirect
				? hasDev
					? 'dev'
					: 'direct'
				: hasOptionalPeer
					? 'optional'
					: hasPeer
						? 'peer'
						: hasDev
							? 'dev'
							: 'transitive';

			const reqLine = clean.find(l => l.includes('(requires'));
			let directBy = '-';
			if (reqLine) {
				const m = reqLine.match(/(?:├─|└─)\s+(?:(?:dev|peer|optional peer)\s+)?(.+?)(?:@|\s*\()/);
				if (m) directBy = m[1].trim();
			}

			return {folder: p.folder, versions, depType, directBy, lines};
		}),
	);
	for (const r of whyResults) {
		if (!r) continue;
		hits.push({folder: r.folder, versions: r.versions, depType: r.depType, directBy: r.directBy});
		console.log(c.bold(c.green(`  ┌─ ${r.folder}`)));
		for (const line of r.lines) {
			console.log(c.dim('  │ ') + line);
		}
		console.log(c.dim('  └─'));
		console.log();
	}

	if (hits.length === 0) {
		console.log(c.yellow(`  "${pkg}" not found in any project.`));
		console.log();
		return;
	}

	// Summary table
	console.log(c.bold('  Summary'));
	console.log();
	console.log(`    ${c.cyan('Project'.padEnd(32))} ${'Version'.padEnd(16)} ${'Type'.padEnd(12)} Required By`);
	for (const h of hits) {
		const typeColor =
			h.depType === 'direct'
				? c.green
				: h.depType === 'dev'
					? c.magenta
					: h.depType === 'peer'
						? c.yellow
						: h.depType === 'optional'
							? c.cyan
							: c.dim;
		const verStr = h.versions.length <= 2 ? h.versions.join(', ') : `${h.versions[0]} +${h.versions.length - 1}`;
		console.log(
			`    ${h.folder.padEnd(32)} ${verStr.padEnd(16)} ${typeColor(h.depType.padEnd(12))} ${c.dim(h.directBy)}`,
		);
	}
	console.log();
	// Version spread
	const allVersions = [...new Set(hits.flatMap(h => h.versions))].sort();
	if (allVersions.length > 1) {
		console.log(c.dim(`  ${allVersions.length} versions in use: ${allVersions.join(', ')}`));
	}
	console.log(c.dim(`  Found in ${hits.length} project(s).`));
	console.log();
}

// ── Outdated: run `bun outdated` across all projects ───────────────────
interface OutdatedOpts {
	filter?: string[];
	production?: boolean;
	omit?: string;
	global?: boolean;
	catalog?: boolean;
	wf?: string[];
}

async function outdatedAcrossProjects(projects: ProjectInfo[], opts: OutdatedOpts): Promise<void> {
	// With -r (catalog) or --wf, only scan workspace roots; otherwise all projects with locks
	const candidates =
		opts.catalog || opts.wf?.length
			? projects.filter(p => p.workspace && p.lock !== 'none')
			: projects.filter(p => p.lock !== 'none');

	// Build display label
	const parts: string[] = [];
	if (opts.catalog) parts.push('-r');
	if (opts.wf?.length) parts.push(opts.wf.map(w => `--filter '${w}'`).join(' '));
	if (opts.filter?.length) parts.push(opts.filter.join(' '));
	if (opts.production) parts.push('--production');
	if (opts.omit) parts.push(`--omit ${opts.omit}`);
	if (opts.global) parts.push('--global');
	const flagStr = parts.length > 0 ? ` ${parts.join(' ')}` : '';

	console.log();
	console.log(
		c.bold(c.cyan('  bun outdated')) +
			(flagStr ? c.yellow(flagStr) : '') +
			c.dim(` — checking ${candidates.length} project(s)`),
	);
	console.log();

	interface ProjectHit {
		folder: string;
		pkgs: OutdatedPkg[];
	}
	const hits: ProjectHit[] = [];
	let projectsWithOutdated = 0;

	const outdatedResults = await Promise.all(
		candidates.map(async p => {
			const dir = projectDir(p);

			// bun ≤1.3 breaks with multiple --filter flags — run separate calls and merge
			const wfList = opts.wf?.length ? opts.wf : [undefined];
			let pkgs: OutdatedPkg[] = [];

			for (const wf of wfList) {
				const args = ['bun', 'outdated', ...(opts.filter ?? [])];
				if (opts.catalog) args.push('-r');
				if (wf) args.push('--filter', wf);
				if (opts.global) args.push('--global');
				const proc = Bun.spawn(args, {cwd: dir, stdout: 'pipe', stderr: 'pipe'});
				await proc.exited;
				const stdout = await proc.stdout.text();
				if (stdout.trim().length > 0) pkgs.push(...parseBunOutdated(stdout));
			}

			// Dedupe by name+workspace (multiple --wf runs can overlap via catalogs)
			const seen = new Set<string>();
			pkgs = pkgs.filter(pkg => {
				const key = `${pkg.name}@${pkg.current}:${pkg.workspace ?? ''}`;
				if (seen.has(key)) return false;
				seen.add(key);
				return true;
			});

			// Apply dep type filters (bun ≤1.3 doesn't filter outdated by type)
			if (opts.production) pkgs = pkgs.filter(pkg => pkg.depType === 'prod');
			if (opts.omit) {
				const omitTypes = opts.omit.split(',').map(s => s.trim());
				pkgs = pkgs.filter(pkg => !omitTypes.includes(pkg.depType));
			}

			return {folder: p.folder, pkgs};
		}),
	);
	for (const {folder, pkgs} of outdatedResults) {
		if (pkgs.length > 0) {
			projectsWithOutdated++;
			console.log(c.bold(c.yellow(`  ┌─ ${folder}`)));
			const maxName = Math.max(
				...pkgs.map(pkg => pkg.name.length + (pkg.depType !== 'prod' ? pkg.depType.length + 3 : 0)),
			);
			const maxCur = Math.max(7, ...pkgs.map(pkg => pkg.current.length));
			const maxUpd = Math.max(6, ...pkgs.map(pkg => pkg.update.length));
			const _maxLat = Math.max(6, ...pkgs.map(pkg => pkg.latest.length));
			for (const pkg of pkgs) {
				const label = pkg.depType !== 'prod' ? `${pkg.name} ${c.dim(`(${pkg.depType})`)}` : pkg.name;
				const padName = pkg.depType !== 'prod' ? pkg.name.length + pkg.depType.length + 3 : pkg.name.length;
				const wsCol = pkg.workspace ? `  ${c.cyan(pkg.workspace)}` : '';
				console.log(
					c.dim('  │ ') +
						`  ${label}${''.padEnd(maxName - padName)}  ${c.dim(pkg.current.padEnd(maxCur))}  ${pkg.update.padEnd(maxUpd)}  ${pkg.current === pkg.latest ? c.green(pkg.latest) : c.yellow(pkg.latest)}${wsCol}`,
				);
			}
			console.log(c.dim('  └─'));
			console.log();
			hits.push({folder, pkgs});
		}
	}

	if (projectsWithOutdated === 0) {
		console.log(
			c.green(
				opts.filter?.length
					? `  No outdated packages matching ${opts.filter.join(' ')}.`
					: '  All projects are up to date!',
			),
		);
	} else {
		console.log(c.dim(`  ${projectsWithOutdated}/${candidates.length} project(s) have outdated dependencies.`));
	}

	// Summary table
	if (hits.length > 0) {
		// Aggregate by package name
		const byPkg = new Map<
			string,
			{projects: string[]; depType: string; currents: Set<string>; latest: string; workspaces: Set<string>}
		>();
		for (const h of hits) {
			for (const pkg of h.pkgs) {
				let entry = byPkg.get(pkg.name);
				if (!entry) {
					entry = {
						projects: [],
						depType: pkg.depType,
						currents: new Set(),
						latest: pkg.latest,
						workspaces: new Set(),
					};
					byPkg.set(pkg.name, entry);
				}
				entry.projects.push(h.folder);
				entry.currents.add(pkg.current);
				if (semverCompare(pkg.latest, entry.latest) > 0) entry.latest = pkg.latest;
				if (pkg.workspace) entry.workspaces.add(pkg.workspace);
			}
		}

		console.log();
		console.log(c.bold('  Summary'));
		console.log();
		const hasWs = [...byPkg.values()].some(v => v.workspaces.size > 0);
		const hdr = `    ${c.cyan('Package'.padEnd(32))} ${'Type'.padEnd(6)} ${'Current'.padEnd(20)} ${'Latest'.padEnd(12)} ${hasWs ? 'Workspace'.padEnd(20) : ''}Projects`;
		const sep = `    ${'─'.repeat(32)} ${'─'.repeat(6)} ${'─'.repeat(20)} ${'─'.repeat(12)} ${hasWs ? '─'.repeat(20) + ' ' : ''}${'─'.repeat(8)}`;
		console.log(hdr);
		console.log(sep);

		const sorted = [...byPkg.entries()].sort((a, b) => b[1].projects.length - a[1].projects.length);
		for (const [name, info] of sorted) {
			const currents = [...info.currents].sort();
			const curStr = currents.length <= 2 ? currents.join(', ') : `${currents[0]} +${currents.length - 1}`;
			const allSame = currents.length === 1 && currents[0] === info.latest;
			const latestStr = allSame ? c.green(info.latest) : c.yellow(info.latest);
			const typeColor = info.depType === 'dev' ? c.magenta : info.depType === 'peer' ? c.yellow : c.green;
			const wsStr = hasWs ? c.cyan([...info.workspaces].join(', ').padEnd(20)) + ' ' : '';
			console.log(
				`    ${name.padEnd(32)} ${typeColor(info.depType.padEnd(6))} ${c.dim(curStr.padEnd(20))} ${latestStr.padEnd(12)} ${wsStr}${c.dim(String(info.projects.length))}`,
			);
		}

		console.log();
		const totalPkgs = byPkg.size;
		const totalHits = hits.reduce((s, h) => s + h.pkgs.length, 0);
		console.log(
			c.dim(`  ${totalPkgs} unique package(s), ${totalHits} total instance(s) across ${hits.length} project(s).`),
		);
	}
	console.log();
}

// ── Update: run `bun update` across all projects ───────────────────────
interface UpdateOpts {
	dryRun: boolean;
	patch?: boolean;
	minor?: boolean;
}

async function updateAcrossProjects(projects: ProjectInfo[], opts: UpdateOpts): Promise<void> {
	const {dryRun, patch, minor} = opts;
	const semverFilter = patch ? 'patch' : minor ? 'minor' : null;
	const withLock = projects.filter(p => p.lock !== 'none');

	const label = ['bun update', semverFilter ? `--${semverFilter}` : '', dryRun ? '--dry-run' : '']
		.filter(Boolean)
		.join(' ');

	console.log();
	console.log(c.bold(c.cyan(`  ${label}`)) + c.dim(` — ${withLock.length} projects`));
	if (semverFilter) {
		const desc = semverFilter === 'patch' ? 'same major.minor, patch bump only' : 'same major, minor + patch bumps';
		console.log(c.dim(`  Filter: ${desc}`));
	}
	console.log();

	// ── Phase 1: Discovery (silent — stdout piped) ─────────────────
	interface UpdatePlan {
		project: ProjectInfo;
		pkgs: OutdatedPkg[];
		names: string[];
	}
	const plans: UpdatePlan[] = [];
	let skipped = 0;

	const discoveryResults = await Promise.all(
		withLock.map(async p => {
			const dir = projectDir(p);
			const checkProc = Bun.spawn(['bun', 'outdated'], {cwd: dir, stdout: 'pipe', stderr: 'pipe'});
			await checkProc.exited;
			const checkOut = await checkProc.stdout.text();

			if (checkOut.trim().length === 0) return null;

			let pkgs = parseBunOutdated(checkOut);

			if (semverFilter && pkgs.length > 0) {
				pkgs = pkgs.filter(pkg => {
					const bump = semverBumpType(pkg.current, pkg.latest);
					if (!bump) return false;
					return semverFilter === 'patch' ? bump === 'patch' : bump !== 'major';
				});
			}

			if (pkgs.length === 0) return null;

			return {project: p, pkgs, names: pkgs.map(pkg => pkg.name)} as UpdatePlan;
		}),
	);
	for (const r of discoveryResults) {
		if (r) plans.push(r);
		else skipped++;
	}

	// ── Phase 2: Preview ───────────────────────────────────────────
	let totalPkgs = 0;
	for (const {project: p, pkgs, names} of plans) {
		const isAdd = p.exact && semverFilter;
		const trusted = new Set(p.trustedDeps);
		const extras: string[] = [];
		if (isAdd) extras.push('bun add -E');
		if (isAdd && p.registry !== '-') extras.push('registry');
		if (isAdd && trusted.size > 0) extras.push('trust');
		const method = extras.length > 0 ? c.dim(` (${extras.join(', ')})`) : '';
		const tag = dryRun ? c.yellow('DRY') : c.yellow('...');

		if (semverFilter) {
			console.log(`    ${tag} ${p.folder.padEnd(30)} ${c.dim(`${names.length} ${semverFilter}:`)}${method}`);
			for (const pkg of pkgs) {
				const typeLabel = pkg.depType !== 'prod' ? c.dim(` (${pkg.depType})`) : '';
				const trustLabel = trusted.has(pkg.name) ? c.dim(' [trusted]') : '';
				console.log(
					`         ${''.padEnd(30)} ${pkg.name}${typeLabel} ${c.dim(pkg.current)} → ${c.green(pkg.latest)}${trustLabel}`,
				);
			}
		} else {
			console.log(`    ${tag} ${p.folder.padEnd(30)} ${c.dim(`${pkgs.length} outdated package(s)`)}${method}`);
		}
		totalPkgs += pkgs.length;
	}

	console.log();

	if (plans.length === 0) {
		console.log(
			c.dim(
				`  All ${skipped} project(s) ${semverFilter ? `have no ${semverFilter} updates` : 'are already up to date'}.`,
			),
		);
		console.log();
		return;
	}

	if (dryRun) {
		console.log(
			c.dim(
				`  ${plans.length} project(s) would be updated (${totalPkgs} package(s)), ${skipped} ${semverFilter ? `have no ${semverFilter} updates` : 'already up to date'}.`,
			),
		);
		console.log(c.dim(`  Run without --dry-run to apply updates.`));
		console.log();
		return;
	}

	// ── Phase 3: Confirm ───────────────────────────────────────────
	process.stdout.write(c.yellow(`  Apply ${totalPkgs} update(s) across ${plans.length} project(s)? (y/n): `));
	let confirmed = false;
	for await (const line of console) {
		if (line.trim().toLowerCase() === 'y') {
			confirmed = true;
			break;
		}
		console.log(c.dim('\n  Cancelled.'));
		console.log();
		return;
	}
	if (!confirmed) {
		console.log(c.dim('\n  No input received — cancelled.'));
		console.log();
		return;
	}
	console.log();

	// ── Phase 4: Execute (stdout inherited — interactive) ──────────
	let updated = 0;
	let interrupted = false;
	let summaryPrinted = false;
	const completedFolders: string[] = [];

	const onSignal = () => {
		if (interrupted) {
			console.log(c.red('\n  Force quit.'));
			process.exit(1);
		}
		interrupted = true;
		console.log(c.yellow('\n  Finishing current project… (ctrl+c again to force quit)'));
	};
	process.on('SIGINT', onSignal);
	process.on('SIGTERM', onSignal);

	const onExit = (code: number) => {
		if (summaryPrinted) return;
		console.log();
		console.log(
			c.yellow(
				`  Exit (code ${code}) — ${completedFolders.length}/${plans.length} project(s) updated before exit.`,
			),
		);
		if (completedFolders.length > 0) {
			for (const f of completedFolders) console.log(`    ${c.green('OK')}  ${f}`);
		}
	};
	process.on('exit', onExit);

	for (const {project: p, pkgs, names} of plans) {
		if (interrupted) break;

		const dir = projectDir(p);

		// Exact-pinned projects need `bun add -E pkg@version` since `bun update` respects the pinned range.
		// Group by dep type so dev/optional/peer deps stay in the correct section.
		// Pass --registry when project has a custom registry, --trust for trustedDependencies.
		const useAdd = p.exact && semverFilter;
		if (useAdd) {
			const DEP_FLAG: Record<string, string | undefined> = {
				prod: undefined,
				dev: '--dev',
				optional: '--optional',
				peer: '--peer',
			};
			const trusted = new Set(p.trustedDeps);
			const registryUrl =
				p.registry !== '-' ? (p.registry.startsWith('http') ? p.registry : `https://${p.registry}`) : null;

			const groups = new Map<string, OutdatedPkg[]>();
			for (const pkg of pkgs) {
				const key = pkg.depType;
				if (!groups.has(key)) groups.set(key, []);
				groups.get(key)!.push(pkg);
			}

			let ok = true;
			for (const [depType, group] of groups) {
				if (interrupted) {
					ok = false;
					break;
				}

				const specs = group.map(pkg => `${pkg.name}@${pkg.latest}`);
				const needsTrust = group.some(pkg => trusted.has(pkg.name));
				const args = ['bun', 'add', '--exact', ...specs];
				const flag = DEP_FLAG[depType];
				if (flag) args.splice(3, 0, flag);
				if (registryUrl) args.push('--registry', registryUrl);
				if (needsTrust) args.push('--trust');

				const proc = Bun.spawn(args, {cwd: dir, stdout: 'inherit', stderr: 'pipe'});
				const exitCode = await proc.exited;
				if (exitCode !== 0) {
					const errText = await proc.stderr.text();
					const errLine = extractBunError(errText, `exit code ${exitCode}`);
					console.log(`    ${c.red('ERR')} ${p.folder.padEnd(30)} ${errLine}`);
					ok = false;
					break;
				}
			}

			if (ok) {
				const extras: string[] = [];
				if (registryUrl) extras.push('registry');
				if (trusted.size > 0) extras.push('trust');
				const via = extras.length > 0 ? ` [${extras.join(', ')}]` : '';
				console.log(
					`    ${c.green('UPD')} ${p.folder.padEnd(30)} ${c.dim(`${pkgs.length} ${semverFilter} update(s) via bun add -E${via}`)}`,
				);
				for (const pkg of pkgs) {
					const typeLabel = pkg.depType !== 'prod' ? c.dim(` (${pkg.depType})`) : '';
					const trustLabel = trusted.has(pkg.name) ? c.dim(' [trusted]') : '';
					console.log(
						`         ${''.padEnd(30)} ${pkg.name}${typeLabel} ${c.dim(pkg.current)} → ${c.green(pkg.latest)}${trustLabel}`,
					);
				}
				updated++;
				completedFolders.push(p.folder);
			}
		} else {
			// Standard: bun update (blanket or targeted)
			const args = semverFilter ? ['bun', 'update', ...names] : ['bun', 'update'];
			const proc = Bun.spawn(args, {cwd: dir, stdout: 'inherit', stderr: 'pipe'});
			const exitCode = await proc.exited;

			if (exitCode === 0) {
				const detail = semverFilter ? `${names.length} ${semverFilter} update(s)` : 'done';
				console.log(`    ${c.green('UPD')} ${p.folder.padEnd(30)} ${c.dim(detail)}`);
				if (semverFilter) {
					for (const pkg of pkgs) {
						console.log(
							`         ${''.padEnd(30)} ${pkg.name} ${c.dim(pkg.current)} → ${c.green(pkg.latest)}`,
						);
					}
				}
				updated++;
				completedFolders.push(p.folder);
			} else {
				const errText = await proc.stderr.text();
				const errLine = extractBunError(errText, `exit code ${exitCode}`);
				console.log(`    ${c.red('ERR')} ${p.folder.padEnd(30)} ${errLine}`);
			}
		}
	}

	process.off('SIGINT', onSignal);
	process.off('SIGTERM', onSignal);
	process.off('exit', onExit);
	summaryPrinted = true;

	console.log();
	if (interrupted) {
		const remaining = plans.length - updated;
		console.log(c.yellow(`  Interrupted — ${updated} project(s) updated, ${remaining} skipped.`));
		if (completedFolders.length > 0) {
			for (const f of completedFolders) console.log(`    ${c.green('OK')}  ${f}`);
		}
	} else {
		console.log(
			c.green(
				`  Updated ${updated} project(s), ${skipped} ${semverFilter ? `have no ${semverFilter} updates` : 'already up to date'}.`,
			),
		);
	}
	console.log();
}

// ── Verify: run `bun install --frozen-lockfile` across projects ──────
async function verifyLockfiles(projects: ProjectInfo[]): Promise<void> {
	const withLock = projects.filter(p => p.lock !== 'none');

	console.log();
	console.log(
		c.bold(c.cyan('  bun install --frozen-lockfile')) + c.dim(` — verifying ${withLock.length} project(s)`),
	);
	console.log();

	let passed = 0;
	let failed = 0;
	const failures: {folder: string; error: string}[] = [];

	const verifyResults = await Promise.all(
		withLock.map(async p => {
			const dir = projectDir(p);
			const proc = Bun.spawn(['bun', 'install', '--frozen-lockfile'], {cwd: dir, stdout: 'pipe', stderr: 'pipe'});
			const exitCode = await proc.exited;
			const stderr = exitCode !== 0 ? await proc.stderr.text() : '';
			return {folder: p.folder, exitCode, stderr};
		}),
	);
	for (const {folder, exitCode, stderr} of verifyResults) {
		if (exitCode === 0) {
			console.log(`    ${c.green('PASS')} ${folder}`);
			passed++;
		} else {
			const errLine = extractBunError(stderr, `exit code ${exitCode}`);
			console.log(`    ${c.red('FAIL')} ${folder.padEnd(30)} ${c.dim(errLine)}`);
			failures.push({folder, error: errLine});
			failed++;
		}
	}

	console.log();
	if (failed === 0) {
		console.log(c.green(`  All ${passed} project(s) passed lockfile verification.`));
	} else {
		console.log(c.yellow(`  ${passed} passed, ${c.red(`${failed} failed`)} lockfile verification.`));
		console.log();
		console.log(c.bold('  Failed projects:'));
		for (const f of failures) {
			console.log(`    ${c.red('•')} ${f.folder.padEnd(30)} ${c.dim(f.error)}`);
		}
		console.log();
		console.log(c.dim('  Run `bun install` in failed projects to regenerate lockfiles.'));
	}
	console.log();
}

// ── Info: run `bun info <pkg>` and show registry metadata ────────────
async function infoPackage(pkg: string, projects: ProjectInfo[], jsonOut: boolean, property?: string): Promise<void> {
	// Run bun info from a dir that has package.json (bun requires it)
	const firstWithPkg = projects.find(p => p.hasPkg);
	const cwd = firstWithPkg ? projectDir(firstWithPkg) : PROJECTS_ROOT;

	// If a specific property is requested, run bun info <pkg> <property> directly
	if (property) {
		const args = ['bun', 'info', pkg, property];
		if (jsonOut) args.push('--json');
		const proc = Bun.spawn(args, {cwd, stdout: 'pipe', stderr: 'pipe'});
		const exitCode = await proc.exited;
		const stdout = await proc.stdout.text();
		const stderr = await proc.stderr.text();
		if (exitCode !== 0) {
			console.error(c.red(`  bun info ${pkg} ${property}: ${stderr.trim()}`));
			process.exit(1);
		}
		console.log(stdout.trimEnd());
		return;
	}

	const proc = Bun.spawn(['bun', 'info', pkg, '--json'], {cwd, stdout: 'pipe', stderr: 'pipe'});
	const exitCode = await proc.exited;
	const stdout = await proc.stdout.text();
	const stderr = await proc.stderr.text();

	if (exitCode !== 0) {
		console.error(c.red(`  bun info ${pkg} failed: ${stderr.trim().split('\n')[0]}`));
		process.exit(1);
	}

	let meta: NpmPackument;
	try {
		meta = BunInfoResponseSchema.parse(JSON.parse(stdout));
	} catch {
		// Fallback: non-JSON or unexpected shape, just print it
		console.log(stdout);
		return;
	}

	if (jsonOut) {
		console.log(JSON.stringify(meta, null, 2));
		return;
	}

	// Pretty print
	const line = (label: string, value: string | number | boolean | undefined) =>
		value !== undefined && value !== '' && console.log(`  ${c.cyan(label.padEnd(18))} ${value}`);

	console.log();
	console.log(c.bold(c.magenta(`  ╭─ ${meta?.name ?? pkg} ─╮`)));
	console.log();
	line('Name', meta?.name);
	line('Version', meta?.version ?? meta['dist-tags']?.latest);
	line('Description', meta?.description);
	line('License', meta?.license);
	line('Homepage', meta?.homepage);

	const author =
		typeof meta?.author === 'string'
			? meta?.author
			: meta?.author?.name
				? `${meta?.author.name}${typeof meta?.author === 'object' && meta?.author.email ? ` <${meta?.author.email}>` : ''}`
				: undefined;
	line('Author', author ?? '');

	const repository = meta?.repository;
	const repo =
		typeof repository === 'string'
			? repository
			: typeof repository === 'object' && repository?.url !== undefined
				? repository.url
				: '';
	line('Repository', repo);

	// Dependencies
	const deps = meta?.dependencies ? Object.keys(meta?.dependencies ?? {}) : [];
	const devDeps = meta?.devDependencies ? Object.keys(meta?.devDependencies ?? {}) : [];
	if (deps.length > 0 || devDeps.length > 0) {
		console.log();
		line('Dependencies', deps.length || 0);
		line('DevDependencies', devDeps.length || 0);
		if (deps.length > 0 && deps.length <= 15) {
			console.log();
			for (const d of deps) {
				console.log(`    ${c.dim('•')} ${d} ${c.dim(meta?.dependencies?.[d] ?? '')}`);
			}
		} else if (deps.length > 15) {
			console.log();
			for (const d of deps.slice(0, 12)) {
				console.log(`    ${c.dim('•')} ${d} ${c.dim(meta?.dependencies?.[d] ?? '')}`);
			}
			console.log(c.dim(`    ... and ${deps.length - 12} more`));
		}
	}

	// dist-tags
	const tags = meta['dist-tags'];
	if (tags && Object.keys(tags).length > 0) {
		console.log();
		console.log(`  ${c.cyan('Dist Tags'.padEnd(18))}`);
		for (const [tag, ver] of Object.entries(tags)) {
			console.log(`    ${c.dim('•')} ${tag.padEnd(12)} ${ver}`);
		}
	}

	// Maintainers
	const maintainers = meta?.maintainers;
	if (Array.isArray(maintainers) && maintainers.length > 0) {
		console.log();
		console.log(`  ${c.cyan('Maintainers'.padEnd(18))}`);
		for (const m of maintainers.slice(0, 8)) {
			const name = typeof m === 'string' ? m : (m.name ?? m.email ?? JSON.stringify(m));
			console.log(`    ${c.dim('•')} ${name}`);
		}
		if (maintainers.length > 8) console.log(c.dim(`    ... and ${maintainers.length - 8} more`));
	}

	// Cross-reference: which local projects use this package?
	// Strip version qualifier (e.g. react@18.0.0 → react) for local lookup
	const bareName = pkg.replace(/@[^/]+$/, '').replace(/^(@[^/]+\/[^@]+)@.*$/, '$1');
	const localUsers = (
		await Promise.all(
			projects
				.filter(p => p.hasPkg)
				.map(async p => {
					try {
						const pkgJson = await Bun.file(`${projectDir(p)}/package.json`).json();
						const allDeps = {...pkgJson.dependencies, ...pkgJson.devDependencies};
						if (allDeps[bareName]) return `${p.folder} ${c.dim(allDeps[bareName])}`;
					} catch (err) {
						_verboseWarn(`dep version check: ${p.folder}`, err);
					}
					return null;
				}),
		)
	).filter((x): x is string => x !== null);

	if (localUsers.length > 0) {
		console.log();
		console.log(`  ${c.cyan('Used Locally'.padEnd(18))} ${c.dim(`in ${localUsers.length} project(s)`)}`);
		for (const u of localUsers) {
			console.log(`    ${c.green('•')} ${u}`);
		}
	}

	console.log();
}

// ── Main ───────────────────────────────────────────────────────────────
async function main(): Promise<void> {
	// Windows + mise function wrapper: if mise is active but MISE_SHELL isn't set,
	// the PowerShell function wrapper may be mangling argv before bun sees it
	if (shouldWarnMise(process.platform, Bun.env.MISE_SHELL)) {
		console.log(c.dim("  Hint: On Windows, use 'mise.exe' for stable argument parsing."));
		console.log();
	}

	if (flags.help) {
		const ph = platformHelp(process.platform);
		console.log(`
${c.bold(c.cyan('  bun scan.ts'))} — multi-project scanner for $BUN_PLATFORM_HOME

${c.dim('  Usage:')}
    ${ph.cmd} scan.ts [flags]
${ph.hint ? `\n${c.dim('  Tip for PowerShell users:')}\n    ${ph.hint}\n` : ''}
${c.bold('  Modes:')}
    ${c.cyan('(default)')}                          Table of all projects
    ${c.cyan('--detail')}                           Extended table (author, license, description)
    ${c.cyan('--inspect')} <name>                   Deep view of a single project
    ${c.cyan('--json')}                             JSON output
    ${c.cyan('--audit')}                            Metadata + infra + lifecycle security report
    ${c.cyan('--fix')} [--dry-run]                  Patch missing author/license, init missing pkg
    ${c.cyan('--fix-engine')} [--dry-run]           Unify engines.bun across all projects
    ${c.cyan('--fix-registry')} <url> [--dry-run]   Unify registry (bunfig + pkg + .npmrc)
    ${c.cyan('--fix-scopes')} <url> @s.. [--dry-run] Inject [install.scopes] into bunfig.toml
    ${c.cyan('--fix-npmrc')} <url> @s.. [--dry-run] Rewrite .npmrc with scoped template
    ${c.cyan('--fix-trusted')} [--dry-run]          Auto-detect native deps → trustedDependencies
    ${c.cyan('--fix-env-docs')}                     Inject audit recommendations into .env.template
    ${c.cyan('--fix-dns')} [--dry-run]              Set DNS TTL + generate prefetch snippets
    ${c.cyan('--why')} <pkg> [--top] [--depth N]    bun why across all projects
    ${c.cyan('--outdated')} [-r] [--wf] [-p]        bun outdated across all projects
    ${c.cyan('--update')} [--dry-run]               bun update across all projects
    ${c.cyan('--update --patch')} [--dry-run]       Update patch-level bumps only
    ${c.cyan('--update --minor')} [--dry-run]       Update minor + patch bumps only
    ${c.cyan('--verify')}                           bun install --frozen-lockfile across all projects
    ${c.cyan('--info')} <pkg> [--json]              Registry metadata + local cross-reference
    ${c.cyan('--path')}                             Emit export PATH for projects with bin/
    ${c.cyan('--store-token')} <name>               Store a token in OS keychain (reads from stdin)
    ${c.cyan('--delete-token')} <name>              Remove a token from OS keychain
    ${c.cyan('--list-tokens')}                      Show stored token names and sources
    ${c.cyan('--check-tokens')}                     Verify stored tokens authenticate with registry
    ${c.cyan('--rss')}                              Generate RSS feeds (.audit/*.rss.xml)
    ${c.cyan('--advisory-feed')} <url>              Fetch & cross-ref security advisory RSS/Atom feed

${c.bold('  Cookie Sessions:')}
    ${c.cyan('--session-create')} <project-id> --domain <domain> [--ttl <ms>] [--interactive]  Create a new cookie session
    ${c.cyan('--session-list')} [project-id]           List all sessions for a project
    ${c.cyan('--session-show')} <session-id> [project-id]  Show session details
    ${c.cyan('--session-delete')} <session-id> [project-id]  Delete a session
    ${c.cyan('--session-cleanup')} [project-id]        Clean up expired sessions
    ${c.cyan('--session-monitor')} <session-id> [project-id]  Monitor session activity
    ${c.cyan('--cookie-add')} <session-id> [project-id] <cookie-string>  Add cookies to session
    ${c.cyan('--cookie-remove')} <session-id> [project-id] <cookie-name>  Remove cookie from session

${c.bold('  Filters:')}
    ${c.cyan('--filter')} <glob|bool>               Filter by name, folder, or boolean field
    ${c.cyan('--with-bunfig')}                      Only projects with bunfig.toml
    ${c.cyan('--workspaces')}                       Only workspace roots
    ${c.cyan('--without-pkg')}                      Only dirs missing package.json
    ${c.cyan('--sort')} <key>                       Sort by name, deps, version, lock

${c.bold('  Dependency scope:')}
    ${c.cyan('-p, --production')}                   Exclude devDependencies
    ${c.cyan('-g, --global')}                       Check global packages
    ${c.cyan('-r, --catalog')}                      Catalog dependencies (workspace roots)
    ${c.cyan('--wf')} <workspace>                   Filter by workspace name (repeatable)
    ${c.cyan('--omit')} <type>                      Skip dev, optional, or peer

${c.bold('  Update behavior (exact-pinned projects):')}
    ${c.cyan('--exact')}                            Passed to bun add -E automatically
    ${c.cyan('--dev/--optional/--peer')}             Auto-grouped by dep type
    ${c.cyan('--registry')}                         Passed from project bunfig.toml
    ${c.cyan('--trust')}                            Passed when pkg is in trustedDependencies

${c.bold('  Other:')}
    ${c.cyan('--dry-run')}                          Preview changes without applying
    ${c.cyan('--depth')} <N>                        Depth for --why
    ${c.cyan('--top')}                              Top-level only for --why
    ${c.cyan('--no-ipc')}                           Disable parallel IPC scanning (use Promise.all)
    ${c.cyan('--profile')}                          Emit timing summary (or set BUN_SCAN_PROFILE=1)
    ${c.cyan('--debug-tokens')}                     Print per-project token service/name pairs
    ${c.cyan('--write-baseline')}                   Write profile baseline (R2 if configured)
    ${c.cyan('-h, --help')}                         Show this help
`);
		return;
	}

	// ── Keychain token commands ───────────────────────────────────────────
	if (flags['store-token']) {
		const name = flags['store-token'];
		if (!isValidTokenName(name)) {
			console.error(`${c.red('error:')} unknown token name ${c.cyan(name)}`);
			console.error(`  ${c.dim('allowed:')} ${BUN_KEYCHAIN_TOKEN_NAMES.join(', ')}`);
			process.exit(1);
		}
		let value: string;
		if (positionals[0]) {
			console.error(
				`${c.yellow('⚠')} Token passed as argument — visible in ps/history. Prefer: echo $TOKEN | bun run scan.ts --store-token ${name}`,
			);
			value = positionals[0];
		} else {
			value = await readTokenFromStdin();
		}
		const check = validateTokenValue(value);
		if (!check.valid) {
			console.error(`${c.red('error:')} ${check.reason}`);
			await logTokenEvent({event: 'store_fail', tokenName: name, result: 'invalid', detail: check.reason});
			process.exit(1);
		}
		for (const w of tokenValueWarnings(value)) {
			console.error(`${c.yellow('⚠')} ${w}`);
		}
		const result = await keychainSet(name, value);
		if (result.ok) {
			console.log(`${c.green('✓')} Stored ${c.cyan(name)} in OS keychain (service: ${BUN_KEYCHAIN_SERVICE})`);
			await logTokenEvent({event: 'store', tokenName: name, result: 'ok'});
		} else {
			const hints: Record<KeychainErr['code'], string> = {
				NO_API: 'upgrade Bun to a version with keychain support, or export the token as an env var instead',
				ACCESS_DENIED: 'unlock your keychain or grant terminal access in System Settings → Privacy → Security',
				NOT_FOUND: 'unexpected; the item should have been created',
				OS_ERROR:
					'check Console.app for keychain errors, or try: security add-generic-password -a $USER -s dev.bun.scanner -w',
			};
			console.error(`${c.red('error:')} failed to store ${c.cyan(name)}: ${result.reason}`);
			console.error(`  ${c.dim('hint:')} ${hints[result.code]}`);
			await logTokenEvent({event: 'store_fail', tokenName: name, result: result.code, detail: result.reason});
			process.exit(1);
		}
		return;
	}

	if (flags['delete-token']) {
		const name = flags['delete-token'];
		if (!isValidTokenName(name)) {
			console.error(`${c.red('error:')} unknown token name ${c.cyan(name)}`);
			console.error(`  ${c.dim('allowed:')} ${BUN_KEYCHAIN_TOKEN_NAMES.join(', ')}`);
			process.exit(1);
		}
		const result = await keychainDelete(name);
		if (!result.ok) {
			const hints: Record<KeychainErr['code'], string> = {
				NO_API: 'upgrade Bun to a version with keychain support',
				ACCESS_DENIED: 'unlock your keychain or grant terminal access in System Settings → Privacy → Security',
				NOT_FOUND: 'token was already absent from the keychain',
				OS_ERROR: 'check Console.app for keychain errors',
			};
			console.error(`${c.red('error:')} failed to delete ${c.cyan(name)}: ${result.reason}`);
			console.error(`  ${c.dim('hint:')} ${hints[result.code]}`);
			await logTokenEvent({event: 'delete_fail', tokenName: name, result: result.code, detail: result.reason});
			process.exit(1);
		} else if (result.value) {
			console.log(`${c.green('✓')} Removed ${c.cyan(name)} from OS keychain`);
			await logTokenEvent({event: 'delete', tokenName: name, result: 'ok'});
		} else {
			console.log(`${c.yellow('⚠')} ${c.cyan(name)} not found in OS keychain (nothing to remove)`);
		}
		return;
	}

	if (flags['list-tokens']) {
		const t0 = Bun.nanoseconds();
		const detail = flags.detail;
		const backend = _hasBunSecrets ? 'Bun.secrets' : process.platform === 'darwin' ? 'security CLI' : 'unavailable';
		let keychainNote = '';

		// Collect token data
		const tokenData: {
			name: string;
			source: string;
			inEnv: boolean;
			inKeychain: boolean;
			lookupMs: number;
			storedAt: string | null;
			m: TokenMetrics;
		}[] = [];
		for (const name of BUN_KEYCHAIN_TOKEN_NAMES) {
			const t1 = Bun.nanoseconds();
			const inEnv = !!Bun.env[name];
			const kcResult = await keychainGet(name);
			const inKeychain = kcResult.ok && !!kcResult.value;
			const lookupMs = (Bun.nanoseconds() - t1) / 1e6;
			if (!kcResult.ok && !keychainNote) keychainNote = kcResult.reason;
			let source: string;
			if (inEnv && inKeychain) source = 'env + keychain';
			else if (inEnv) source = 'env';
			else if (inKeychain) source = 'keychain';
			else source = 'not set';
			const storedAt = null;
			tokenData.push({name, source, inEnv, inKeychain, lookupMs, storedAt, m: getMetrics(name)});
		}

		const totalMs = (Bun.nanoseconds() - t0) / 1e6;
		const found = tokenData.filter(t => t.inEnv || t.inKeychain).length;
		const _totalAccess = tokenData.reduce((s, t) => s + t.m.accessed, 0);
		const _totalFailed = tokenData.reduce((s, t) => s + t.m.failed, 0);

		if (!detail) {
			// Compact view (default)
			console.log(`\n${c.bold('  Token sources:')}\n`);
			for (const t of tokenData) {
				const colored =
					t.source === 'env + keychain'
						? c.green(t.source)
						: t.source === 'env'
							? c.green(t.source)
							: t.source === 'keychain'
								? c.cyan(t.source)
								: c.yellow(t.source);
				console.log(`    ${c.cyan(t.name.padEnd(24))} ${colored}  ${c.dim(`${t.lookupMs.toFixed(1)}ms`)}`);
			}
			console.log();
			console.log(
				`  ${c.dim(`${found}/${tokenData.length} resolved  ${totalMs.toFixed(1)}ms  backend: ${backend}  service: ${BUN_KEYCHAIN_SERVICE}`)}`,
			);

			console.log();
			console.log(`${c.bold('  Lifecycle:')}\n`);
			for (const t of tokenData) {
				const age = t.storedAt ? c.dim(timeSince(new Date(t.storedAt))) : c.dim('-');
				const accessed = t.m.accessed > 0 ? c.green(String(t.m.accessed)) : c.dim('0');
				const failed = t.m.failed > 0 ? c.red(String(t.m.failed)) : c.dim('0');
				const lastFail = t.m.lastFailCode ? c.red(t.m.lastFailCode) : c.dim('-');
				console.log(
					`    ${c.cyan(t.name.padEnd(24))} accessed: ${accessed}  failed: ${failed}  last-err: ${lastFail}  stored: ${t.storedAt ? c.dim(t.storedAt) : c.dim('-')}  age: ${age}`,
				);
			}
		} else {
			// Detail view (--detail) — Token Health & Security Assessment
			const ROTATION_DAYS = 90;
			console.log(`\n  ${c.bold(c.cyan('Token Health & Security Assessment'))}`);
			console.log(
				`  ${c.dim(`${found}/${tokenData.length} resolved  ${totalMs.toFixed(1)}ms  backend: ${backend}  service: ${BUN_KEYCHAIN_SERVICE}`)}\n`,
			);

			const rows = tokenData.map(t => {
				const active = t.inEnv || t.inKeychain;
				const age = t.storedAt ? timeSince(new Date(t.storedAt)) : '-';
				const storedDate = t.storedAt ? new Date(t.storedAt) : null;
				const ageDays = storedDate ? Math.floor((Date.now() - storedDate.getTime()) / 86_400_000) : 0;
				const rotationDue = ageDays >= ROTATION_DAYS;
				const security = !active
					? 'MISSING'
					: t.m.failed > 0
						? 'DEGRADED'
						: rotationDue
							? 'ROTATE'
							: 'VERIFIED';
				const leakRisk = !active
					? 'N/A'
					: t.source === 'env'
						? 'MEDIUM'
						: t.source === 'env + keychain'
							? 'MEDIUM'
							: 'LOW';
				return {
					'Token Name': t.name,
					'Type': 'Registry',
					'Backend': active ? (t.source.includes('keychain') ? 'Keychain' : 'Env') : '-',
					'Latency': `${t.lookupMs.toFixed(1)}ms`,
					'Status': active ? 'ACTIVE' : 'NOT SET',
					'Accessed': t.m.accessed,
					'Failed': t.m.failed,
					'Last Error': t.m.lastFailCode ?? '-',
					'Age': age,
					'Security': security,
					'Rotation': rotationDue ? `${ageDays}d (overdue)` : `${ROTATION_DAYS - ageDays}d left`,
					'Leak Risk': leakRisk,
				};
			});
			console.log(Bun.inspect.table(rows));
			console.log(`  ${c.dim(`Rendered in ${((Bun.nanoseconds() - t0) / 1e6).toFixed(1)}ms`)}`);
		}

		if (keychainNote) {
			console.log(`\n  ${c.yellow('note:')} ${keychainNote}`);
			console.log(`  ${c.dim('Tokens can still be provided via env vars: export FW_REGISTRY_TOKEN=<value>')}`);
		}
		console.log();
		return;
	}

	if (flags['check-tokens']) {
		await checkTokenHealth();
		return;
	}

	// ── Cookie Session Commands ─────────────────────────────────────────────
	if (flags['session-create']) {
		const projectId = validateProjectId(flags['session-create']);
		const domain = String(flags['session-domain'] ?? 'localhost');

		if (flags['session-interactive']) {
			const projectContext = createProjectContext(projectId);
			const terminalManager = createCookieTerminalManager({interactive: true, color: _useColor});
			const service = projectTokenService(projectContext.projectInfo);
			const project = projectTokenProject(projectContext.projectInfo);

			const session = await terminalManager.createSessionInteractive(service, project);
			if (session) {
				console.log(`${c.green('✓')} Created interactive session ${c.cyan(session.id)}`);
				logProjectContext(projectContext, flags.verbose);
			} else {
				console.error(`${c.red('error:')} failed to create interactive session`);
				process.exit(1);
			}
			return;
		}

		if (!domain) {
			console.error(`${c.red('error:')} --session-domain is required when creating a session`);
			process.exit(1);
		}

		// Parse TTL if provided
		let config: SessionConfig = {};
		if (flags['session-ttl']) {
			const ttl = parseInt(flags['session-ttl']);
			if (isNaN(ttl) || ttl <= 0) {
				console.error(`${c.red('error:')} --session-ttl must be a positive number (milliseconds)`);
				process.exit(1);
			}
			config.ttl = ttl;
		}

		const projectContext = createProjectContext(projectId);
		const session = await createProjectSession(projectContext.projectInfo, domain, config);

		console.log(`${c.green('✓')} Created session ${c.cyan(session.id)}`);
		console.log(`${c.dim('Service:')} ${session.service}`);
		console.log(`${c.dim('Project:')} ${session.project}`);
		console.log(`${c.dim('Domain:')} ${session.domain}`);
		console.log(
			`${c.dim('Expires:')} ${session.expiresAt ? new Date(session.expiresAt).toLocaleString() : 'Never'}`,
		);
		logProjectContext(projectContext, flags.verbose);
		return;
	}

	if (flags['session-list']) {
		const projectId = positionals[0] ?? process.env.PROJECT_ID ?? process.env.FW_PROJECT_ID ?? 'default';
		const projectContext = createProjectContext(projectId);
		const service = projectTokenService(projectContext.projectInfo);
		const project = projectTokenProject(projectContext.projectInfo);

		const output = await listSessionsForTerminal(service, project);
		console.log(output);
		return;
	}

	if (flags['session-show']) {
		const sessionId = flags['session-show'];
		const projectId = positionals[0] ?? process.env.PROJECT_ID ?? process.env.FW_PROJECT_ID ?? 'default';
		const projectContext = createProjectContext(projectId);
		const service = projectTokenService(projectContext.projectInfo);
		const project = projectTokenProject(projectContext.projectInfo);

		const session = await getSession(service, project, sessionId);
		if (!session) {
			console.error(`${c.red('error:')} session ${c.cyan(sessionId)} not found`);
			process.exit(1);
		}

		console.log(formatSessionForTerminal(session));
		return;
	}

	if (flags['session-delete']) {
		const sessionId = flags['session-delete'];
		const projectId = positionals[0] ?? process.env.PROJECT_ID ?? process.env.FW_PROJECT_ID ?? 'default';
		const projectContext = createProjectContext(projectId);
		const service = projectTokenService(projectContext.projectInfo);
		const project = projectTokenProject(projectContext.projectInfo);

		const deleted = await deleteSession(service, project, sessionId);
		if (deleted) {
			console.log(`${c.green('✓')} Deleted session ${c.cyan(sessionId)}`);
		} else {
			console.error(`${c.red('error:')} failed to delete session ${c.cyan(sessionId)}`);
			process.exit(1);
		}
		return;
	}

	if (flags['session-cleanup']) {
		const projectId = positionals[0] ?? process.env.PROJECT_ID ?? process.env.FW_PROJECT_ID ?? 'default';
		const projectContext = createProjectContext(projectId);
		const service = projectTokenService(projectContext.projectInfo);
		const project = projectTokenProject(projectContext.projectInfo);

		const cleaned = await cleanupExpiredSessions(service, project);
		console.log(`${c.green('✓')} Cleaned up ${cleaned} expired sessions`);
		return;
	}

	if (flags['session-monitor']) {
		const sessionId = flags['session-monitor'];
		const projectId = positionals[0] ?? process.env.PROJECT_ID ?? process.env.FW_PROJECT_ID ?? 'default';
		const projectContext = createProjectContext(projectId);
		const service = projectTokenService(projectContext.projectInfo);
		const project = projectTokenProject(projectContext.projectInfo);

		const terminalManager = createCookieTerminalManager({interactive: true, color: _useColor});
		await terminalManager.monitorSession(service, project, sessionId);
		return;
	}

	if (flags['cookie-add']) {
		const sessionId = flags['cookie-add'];

		// Validate arguments
		if (positionals.length === 0) {
			console.error(`${c.red('error:')} insufficient arguments`);
			console.error(`${c.dim('usage:')} bun run scan.ts --cookie-add <session-id> [project-id] <cookie-string>`);
			process.exit(1);
		}

		// Handle both patterns: <session-id> <cookie-string> and <session-id> <project> <cookie-string>
		let projectId: string;
		let cookieString: string;

		if (positionals.length === 1) {
			// Pattern: --cookie-add <session-id> <cookie-string>
			projectId = process.env.PROJECT_ID ?? process.env.FW_PROJECT_ID ?? 'default';
			cookieString = positionals[0] ?? '';
		} else {
			// Pattern: --cookie-add <session-id> <project-id> <cookie-string>
			projectId = positionals[0] ?? '';
			cookieString = positionals[1] ?? '';
		}

		if (!cookieString) {
			console.error(`${c.red('error:')} cookie string required`);
			console.error(`${c.dim('usage:')} bun run scan.ts --cookie-add <session-id> [project-id] <cookie-string>`);
			process.exit(1);
		}

		const projectContext = createProjectContext(projectId);
		const service = projectTokenService(projectContext.projectInfo);
		const project = projectTokenProject(projectContext.projectInfo);

		const session = await getSession(service, project, sessionId);
		if (!session) {
			console.error(`${c.red('error:')} session ${c.cyan(sessionId)} not found`);
			process.exit(1);
		}

		const cookies = parseCookieString(cookieString);
		let added = 0;

		for (const [name, value] of Object.entries(cookies)) {
			const cookie: CookieInfo = {
				name,
				value,
				domain: session.domain,
				path: '/',
				secure: session.secure,
				httpOnly: false, // User-added cookies are typically not HttpOnly
				sameSite: session.sameSite,
			};

			const success = await addCookieToSession(service, project, sessionId, cookie);
			if (success) added++;
		}

		console.log(`${c.green('✓')} Added ${added} cookies to session ${c.cyan(sessionId)}`);
		return;
	}

	if (flags['cookie-remove']) {
		const sessionId = flags['cookie-remove'];

		// Validate arguments
		if (positionals.length === 0) {
			console.error(`${c.red('error:')} insufficient arguments`);
			console.error(`${c.dim('usage:')} bun run scan.ts --cookie-remove <session-id> [project-id] <cookie-name>`);
			process.exit(1);
		}

		// Handle both patterns: <session-id> <cookie-name> and <session-id> <project> <cookie-name>
		let projectId: string;
		let cookieName: string;

		if (positionals.length === 1) {
			// Pattern: --cookie-remove <session-id> <cookie-name>
			projectId = process.env.PROJECT_ID ?? process.env.FW_PROJECT_ID ?? 'default';
			cookieName = positionals[0] ?? '';
		} else {
			// Pattern: --cookie-remove <session-id> <project-id> <cookie-name>
			projectId = positionals[0] ?? '';
			cookieName = positionals[1] ?? '';
		}

		if (!cookieName) {
			console.error(`${c.red('error:')} cookie name required`);
			console.error(`${c.dim('usage:')} bun run scan.ts --cookie-remove <session-id> [project-id] <cookie-name>`);
			process.exit(1);
		}

		const projectContext = createProjectContext(projectId);
		const service = projectTokenService(projectContext.projectInfo);
		const project = projectTokenProject(projectContext.projectInfo);

		const success = await removeCookieFromSession(service, project, sessionId, cookieName);
		if (success) {
			console.log(`${c.green('✓')} Removed cookie ${c.cyan(cookieName)} from session ${c.cyan(sessionId)}`);
		} else {
			console.error(
				`${c.red('error:')} failed to remove cookie ${c.cyan(cookieName)} from session ${c.cyan(sessionId)}`,
			);
			process.exit(1);
		}
		return;
	}

	await autoLoadKeychainTokens();

	if (_profileEnabled) {
		_profileStartNs = Bun.nanoseconds();
		_profileStartMem = process.memoryUsage();
	}

	const t0 = Bun.nanoseconds();

	// Discover project directories (top-level only)
	const dirs = await time('fs:discover-projects', async () => {
		const entries = await readdir(PROJECTS_ROOT, {withFileTypes: true});
		return entries
			.filter(e => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'scanner')
			.map(e => `${PROJECTS_ROOT}/${e.name}`);
	});

	// Scan all — IPC worker pool for true parallelism, fallback to Promise.all
	let projects: ProjectInfo[] = [];
	await time('scan:projects', async () => {
		if (flags['no-ipc']) {
			projects = await Promise.all(dirs.map(scanProject));
		} else {
			try {
				projects = await scanProjectsViaIPC(dirs);
			} catch {
				projects = await Promise.all(dirs.map(scanProject));
			}
		}
	});

	// ── Filters ──────────────────────────────────────────────────────
	timeSync('filter:projects', () => {
		if (flags['with-bunfig']) {
			projects = projects.filter(p => p.bunfig);
		}
		if (flags.workspaces) {
			projects = projects.filter(p => p.workspace);
		}
		if (flags['without-pkg']) {
			projects = projects.filter(p => !p.hasPkg);
		}
		if (flags.filter) {
			projects = projects.filter(p => matchFilter(p, flags.filter!));
		}
	});

	// ── Sort ─────────────────────────────────────────────────────────
	timeSync('sort:projects', () => {
		if (flags.sort) {
			const sortKey = flags.sort;
			if (!VALID_SORT_KEYS.has(sortKey as SortKey)) {
				console.error(c.yellow(`Unknown sort key: ${sortKey}. Using default order.`));
			} else {
				projects = sortProjects(projects, sortKey as SortKey);
			}
		} else {
			projects.sort((a, b) => a.folder.localeCompare(b.folder));
		}
	});

	const dryRun = !!flags['dry-run'];

	// ── Path mode: emit shell export for projects with bin/ ────────
	if (flags.path) {
		const binDirs = projects.filter(p => p.hasBinDir).map(p => `${projectDir(p)}/bin`);

		if (binDirs.length === 0) {
			console.error('No projects with bin/ directories found.');
			return;
		}

		// Detect common registry across all scanned projects
		const registries = projects.map(p => p.registry).filter(r => r !== '-');
		const uniqueRegistries = [...new Set(registries)];
		const commonRegistry = uniqueRegistries.length === 1 ? uniqueRegistries[0] : null;
		const fullUrl = commonRegistry
			? commonRegistry.startsWith('http')
				? commonRegistry
				: `https://${commonRegistry}`
			: null;

		// stdout: clean export statements, safe to eval
		console.log(`export BUN_PLATFORM_HOME="${PROJECTS_ROOT}"`);
		if (fullUrl) {
			console.log(`export BUN_CONFIG_REGISTRY="${fullUrl}"`);
		}
		const pathPrefix = binDirs.join(':');
		console.log(`export PATH="${pathPrefix}:$PATH"`);

		// stderr: human-readable summary (won't pollute eval)
		process.stderr.write(`# BUN_PLATFORM_HOME=${PROJECTS_ROOT}\n`);
		if (fullUrl) {
			process.stderr.write(`# BUN_CONFIG_REGISTRY=${fullUrl} (global override)\n`);
		}
		process.stderr.write(`# ${binDirs.length} project bin/ dirs prepended to PATH:\n`);
		for (const dir of binDirs) {
			process.stderr.write(`#   ${dir}\n`);
		}
		return;
	}

	// ── Snapshot-only mode (no full audit) ─────────────────────────
	if (flags.snapshot && !flags.audit) {
		const prevSnap = await time('xref:load-snapshot', async () => loadXrefSnapshot());
		const {entries: xrefResult, skipped} = await time('xref:scan', async () => scanXrefData(projects, prevSnap));
		const withPkg = projects.filter(p => p.hasPkg);
		await time('xref:save-snapshot', async () => saveXrefSnapshot(xrefResult, withPkg.length));
		console.log(
			`  Snapshot saved to .audit/xref-snapshot.json (${xrefResult.length} projects${skipped > 0 ? `, ${skipped} unchanged` : ''})`,
		);
		return;
	}

	// ── Compare-only mode (no full audit) ──────────────────────────
	if (flags.compare && !flags.audit) {
		const snapshotPath = flags['audit-compare'] ?? undefined;
		const prevSnapshot = await time('xref:load-snapshot', async () => loadXrefSnapshot(snapshotPath));
		if (!prevSnapshot) {
			const label = snapshotPath ?? '.audit/xref-snapshot.json';
			console.log(`  No snapshot found at ${label} — run --audit or --snapshot first.`);
			process.exit(1);
		}
		const {entries: cmpXrefData} = await time('xref:scan', async () => scanXrefData(projects, prevSnapshot));

		const prevMap = new Map<string, XrefEntry>();
		for (const p of prevSnapshot.projects) prevMap.set(p.folder, p);
		const currentFolders = new Set(cmpXrefData.map(x => x.folder));
		const prevFolders = new Set(prevSnapshot.projects.map(p => p.folder));
		const newProjects = cmpXrefData.filter(x => !prevFolders.has(x.folder));
		const removedProjects = prevSnapshot.projects.filter(p => !currentFolders.has(p.folder));
		const changedProjects: string[] = [];
		let unchangedCount = 0;
		for (const x of cmpXrefData) {
			const prev = prevMap.get(x.folder);
			if (!prev) continue;
			const diffs: string[] = [];
			const dDef = x.bunDefault.length - prev.bunDefault.length;
			const dExp = x.explicit.length - prev.explicit.length;
			const dBlk = x.blocked.length - prev.blocked.length;
			if (dDef !== 0) diffs.push(`default ${dDef > 0 ? '+' : ''}${dDef}`);
			if (dExp !== 0) diffs.push(`explicit ${dExp > 0 ? '+' : ''}${dExp}`);
			if (dBlk !== 0) diffs.push(`blocked ${dBlk > 0 ? '+' : ''}${dBlk}`);
			if (diffs.length > 0) changedProjects.push(`${x.folder} (${diffs.join(', ')})`);
			else unchangedCount++;
		}

		console.log();
		console.log(
			c.bold(
				`  Cross-reference delta (vs ${prevSnapshot.date ?? prevSnapshot.timestamp}${prevSnapshot.tz ? ` ${prevSnapshot.tz}` : ''}):`,
			),
		);
		console.log(
			`    ${'New projects:'.padEnd(18)} ${c.cyan(String(newProjects.length))}${newProjects.length > 0 ? '   ' + newProjects.map(x => x.folder).join(', ') : ''}`,
		);
		console.log(
			`    ${'Removed:'.padEnd(18)} ${removedProjects.length > 0 ? c.red(String(removedProjects.length)) : c.dim(String(removedProjects.length))}${removedProjects.length > 0 ? '   ' + removedProjects.map(p => p.folder).join(', ') : ''}`,
		);
		console.log(
			`    ${'Changed:'.padEnd(18)} ${changedProjects.length > 0 ? c.yellow(String(changedProjects.length)) : c.dim(String(changedProjects.length))}${changedProjects.length > 0 ? '   ' + changedProjects.join(', ') : ''}`,
		);
		console.log(`    ${'Unchanged:'.padEnd(18)} ${c.dim(String(unchangedCount))}`);
		console.log();
		const hasDrift = newProjects.length > 0 || removedProjects.length > 0 || changedProjects.length > 0;
		if (hasDrift) process.exit(1);
		return;
	}

	// ── Audit mode ──────────────────────────────────────────────────
	if (flags.audit) {
		await time('mode:audit', async () => renderAudit(projects));
		if (flags.rss) {
			await time('rss:token-events', async () => publishTokenEventsRss());
			await time('rss:scan-results', async () => publishScanResultsRss(projects));
		}
		if (flags['advisory-feed']) {
			await time('advisory:consume', async () => consumeAdvisoryFeed(flags['advisory-feed'], projects));
		}
		return;
	}

	// ── Fix mode ───────────────────────────────────────────────────
	if (flags.fix) {
		await time('mode:fix', async () => fixProjects(projects, dryRun));
		return;
	}

	// ── Fix engine mode ────────────────────────────────────────────
	if (flags['fix-engine']) {
		await time('mode:fix-engine', async () => fixEngine(projects, dryRun));
		return;
	}

	// ── Fix trusted mode ──────────────────────────────────────────
	if (flags['fix-trusted']) {
		await time('mode:fix-trusted', async () => fixTrusted(projects, dryRun));
		return;
	}

	// ── Fix env docs mode ────────────────────────────────────────
	if (flags['fix-env-docs']) {
		const templatePath = `${PROJECTS_ROOT}/scanner/.env.template`;
		const file = Bun.file(templatePath);
		let content = (await file.exists()) ? await file.text() : '';
		let changed = false;

		// Promote transpiler cache from commented recommendation to active value
		if (content.includes('# BUN_RUNTIME_TRANSPILER_CACHE_PATH=')) {
			content = content.replace(
				/# BUN_RUNTIME_TRANSPILER_CACHE_PATH=.*/,
				'BUN_RUNTIME_TRANSPILER_CACHE_PATH=${BUN_PLATFORM_HOME}/.bun-cache',
			);
			changed = true;
			if (dryRun) {
				console.log(
					`  ${c.yellow('DRY')}  BUN_RUNTIME_TRANSPILER_CACHE_PATH=\${BUN_PLATFORM_HOME}/.bun-cache (promoted from comment)`,
				);
			} else {
				console.log(
					`  ${c.green('FIX')}  BUN_RUNTIME_TRANSPILER_CACHE_PATH=\${BUN_PLATFORM_HOME}/.bun-cache (promoted from comment)`,
				);
			}
		} else if (!content.includes('BUN_RUNTIME_TRANSPILER_CACHE_PATH')) {
			content += '\nBUN_RUNTIME_TRANSPILER_CACHE_PATH=${BUN_PLATFORM_HOME}/.bun-cache\n';
			changed = true;
			if (dryRun) {
				console.log(`  ${c.yellow('DRY')}  BUN_RUNTIME_TRANSPILER_CACHE_PATH=\${BUN_PLATFORM_HOME}/.bun-cache`);
			} else {
				console.log(`  ${c.green('FIX')}  BUN_RUNTIME_TRANSPILER_CACHE_PATH=\${BUN_PLATFORM_HOME}/.bun-cache`);
			}
		} else {
			console.log(c.dim('  SKIP  BUN_RUNTIME_TRANSPILER_CACHE_PATH already set'));
		}

		// Add concurrency tuning vars
		for (const [key, val, desc] of [
			['BUN_CONFIG_NETWORK_CONCURRENCY', '256', 'parallel HTTP requests during install'],
			['BUN_CONFIG_CONCURRENT_SCRIPTS', '16', 'parallel lifecycle script execution'],
		] as const) {
			if (!content.includes(key)) {
				content += `\n${key}=${val}\n`;
				changed = true;
				if (dryRun) {
					console.log(`  ${c.yellow('DRY')}  ${key}=${val}  (${desc})`);
				} else {
					console.log(`  ${c.green('FIX')}  ${key}=${val}  (${desc})`);
				}
			} else {
				console.log(c.dim(`  SKIP  ${key} already present`));
			}
		}

		// Add verbose fetch and telemetry recommendations if missing
		if (!content.includes('BUN_CONFIG_VERBOSE_FETCH')) {
			content +=
				'\n# Debug network requests — prints fetch/http as curl commands\n# BUN_CONFIG_VERBOSE_FETCH=curl\n';
			changed = true;
		}
		if (!content.includes('DO_NOT_TRACK')) {
			content += '\n# Disable telemetry & crash reports (privacy best practice)\n# DO_NOT_TRACK=1\n';
			changed = true;
		}

		if (changed && !dryRun) {
			await Bun.write(templatePath, content);
			console.log(c.green('  Updated .env.template with runtime recommendations'));
		} else if (changed && dryRun) {
			console.log(c.dim('  Run without --dry-run to apply.'));
		} else {
			console.log(c.dim('  .env.template already contains all runtime recommendations — no changes'));
		}
		return;
	}
	// ── Fix DNS mode ───────────────────────────────────────────────
	if (flags['fix-dns']) {
		await fixDns(projects, dryRun);
		return;
	}

	// ── Fix DNS TTL mode ──────────────────────────────────────────
	if (flags['fix-dns-ttl']) {
		const ttlVal = '5';
		const envKey = 'BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS';
		const missing = projects.filter(p => p.hasPkg && p.projectDnsTtl === '-');
		if (missing.length === 0) {
			console.log(c.green('  All projects already have DNS TTL configured.'));
			return;
		}
		console.log(c.bold(`  Setting ${envKey}=${ttlVal} in ${missing.length} project .env files:`));
		console.log();
		for (const p of missing) {
			const envPath = `${projectDir(p)}/.env`;
			if (dryRun) {
				console.log(`    ${c.dim('dry-run')} ${p.folder}/.env  +${envKey}=${ttlVal}`);
				continue;
			}
			const file = Bun.file(envPath);
			let content = (await file.exists()) ? await file.text() : '';
			if (!content.endsWith('\n') && content.length > 0) content += '\n';
			content += `${envKey}=${ttlVal}\n`;
			await Bun.write(envPath, content);
			console.log(`    ${c.green('✓')} ${p.folder}/.env`);
		}
		if (!dryRun) console.log(c.green(`\n  Done — ${missing.length} projects updated.`));
		return;
	}

	// ── Fix registry mode ─────────────────────────────────────────
	if (flags['fix-registry']) {
		await fixRegistry(projects, flags['fix-registry'], dryRun);
		return;
	}

	// ── Fix scopes mode ────────────────────────────────────────────
	// Usage: --fix-scopes https://url @scope1 @scope2
	if (flags['fix-scopes']) {
		const scopeNames = positionals.filter(a => a.startsWith('@'));
		if (scopeNames.length === 0) {
			console.log(c.red('\n  Usage: --fix-scopes <registry-url> @scope1 @scope2 ...\n'));
			return;
		}
		await fixScopes(projects, flags['fix-scopes'], scopeNames, dryRun);
		return;
	}

	// ── Fix npmrc mode ──────────────────────────────────────────────
	// Usage: --fix-npmrc https://url @scope1 @scope2
	if (flags['fix-npmrc']) {
		const scopeNames = positionals.filter(a => a.startsWith('@'));
		if (scopeNames.length === 0) {
			console.log(c.red('\n  Usage: --fix-npmrc <registry-url> @scope1 @scope2 ...\n'));
			return;
		}
		await fixNpmrc(projects, flags['fix-npmrc'], scopeNames, dryRun);
		return;
	}

	// ── Why mode ───────────────────────────────────────────────────
	if (flags.why) {
		await whyAcrossProjects(projects, flags.why, {top: !!flags.top, depth: flags.depth});
		return;
	}

	// ── Outdated mode ─────────────────────────────────────────────
	if (flags.outdated) {
		await outdatedAcrossProjects(projects, {
			filter: positionals.length > 0 ? positionals : undefined,
			production: !!flags.production,
			omit: flags.omit,
			global: !!flags.global,
			catalog: !!flags.catalog,
			wf: flags.wf,
		});
		return;
	}

	// ── Update mode ──────────────────────────────────────────────
	if (flags.update) {
		await updateAcrossProjects(projects, {
			dryRun,
			patch: !!flags.patch,
			minor: !!flags.minor,
		});
		return;
	}

	// ── Verify mode ─────────────────────────────────────────────
	if (flags.verify) {
		await verifyLockfiles(projects);
		return;
	}

	// ── Info mode (--info or --pm-view) ─────────────────────────────
	const infoTarget = flags.info ?? flags['pm-view'];
	if (infoTarget) {
		await infoPackage(infoTarget, projects, !!flags.json, positionals[0]);
		return;
	}

	// ── Inspect mode ─────────────────────────────────────────────────
	if (flags.inspect) {
		const target = projects.find(p => p.folder === flags.inspect || p.name === flags.inspect);
		if (!target) {
			console.error(c.red(`Project "${flags.inspect}" not found.`));
			process.exit(1);
		}
		inspectProject(target);
		return;
	}

	// ── JSON output ──────────────────────────────────────────────────
	if (flags.json) {
		console.log(JSON.stringify(projects, null, 2));
		return;
	}

	// ── Table output ─────────────────────────────────────────────────
	if (projects.length === 0) {
		console.log(c.yellow('No projects matched the given filters.'));
		return;
	}

	const tokenStatusByFolder = await time('tokens:project', async () => {
		const pairs = await Promise.all(
			projects.map(async p => {
				const service = projectTokenService(p);
				const tokenName = projectTokenName(p);
				const res = await keychainGet(tokenName, service);
				let status = 'missing';
				if (res.ok) {
					status = res.value ? 'keychain' : 'missing';
				} else {
					status = res.code === 'NO_API' ? 'unsupported' : res.code === 'ACCESS_DENIED' ? 'denied' : 'error';
				}
				return [p.folder, status] as const;
			}),
		);
		return new Map(pairs);
	});

	if (flags['debug-tokens']) {
		console.log();
		console.log(c.bold('  Token Debug (service/name)'));
		console.log();
		for (const p of projects) {
			const service = projectTokenService(p);
			const tokenName = projectTokenName(p);
			console.log(`    ${c.cyan(p.folder.padEnd(28))} ${service} / ${tokenName}`);
		}
	}

	const elapsed = ((Bun.nanoseconds() - t0) / 1e6).toFixed(1);
	if (_profileEnabled && _profileStartNs !== null && _profileStartMem) {
		const endMem = process.memoryUsage();
		_profileSummary = {
			projectsScanned: projects.length,
			scanMs: Number(elapsed),
			memoryDeltaBytes: endMem.rss - _profileStartMem.rss,
		};
	}
	console.log();
	const now = new Date();
	const scanTime = fmtStamp(now);
	const _commitHash = getGitCommitHash();
	console.log(
		c.bold(
			c.cyan(
				`  Project Scanner — ${projects.length} projects scanned in ${elapsed}ms (bun ${Bun.version} ${Bun.revision.slice(0, 9)}${_commitHash ? ` ${_commitHash.slice(0, 9)}` : ''})`,
			),
		),
	);
	console.log(c.dim(`  ${scanTime}`));
	console.log();

	renderTable(projects, !!flags.detail, tokenStatusByFolder);

	// ── Inline xref delta (default mode) ────────────────────────────
	const prevSnapshot = await loadXrefSnapshot(flags['audit-compare'] ?? undefined);
	if (prevSnapshot) {
		const {entries: currentXref} = await scanXrefData(projects, prevSnapshot);
		const prevMap = new Map<string, XrefEntry>();
		for (const p of prevSnapshot.projects) prevMap.set(p.folder, p);
		const currentFolders = new Set(currentXref.map(x => x.folder));
		const prevFolders = new Set(prevSnapshot.projects.map(p => p.folder));
		const newCount = currentXref.filter(x => !prevFolders.has(x.folder)).length;
		const removedCount = prevSnapshot.projects.filter(p => !currentFolders.has(p.folder)).length;
		let changedCount = 0;
		let trustedDelta = 0;
		let nativeDelta = 0;
		for (const x of currentXref) {
			const prev = prevMap.get(x.folder);
			if (!prev) continue;
			if (
				x.bunDefault.length !== prev.bunDefault.length ||
				x.explicit.length !== prev.explicit.length ||
				x.blocked.length !== prev.blocked.length
			)
				changedCount++;
			trustedDelta += x.explicit.length - prev.explicit.length;
			nativeDelta += x.bunDefault.length - prev.bunDefault.length;
		}
		const hasDrift = newCount > 0 || removedCount > 0 || changedCount > 0;

		// Structured delta footer table
		const footer: Record<string, string> = {
			'Snapshot': prevSnapshot.timestamp.slice(0, 10),
			'Projects Δ': `+${newCount}/-${removedCount}`,
			'Trusted Δ': trustedDelta >= 0 ? `+${trustedDelta}` : String(trustedDelta),
			'Native Δ': nativeDelta >= 0 ? `+${nativeDelta}` : String(nativeDelta),
			'Linker Δ': '0',
			'Drift': hasDrift ? 'DETECTED' : 'none',
		};
		console.log(Bun.inspect.table([footer], {colors: _useColor}));

		if (!flags['no-auto-snapshot']) {
			await saveXrefSnapshot(currentXref, projects.filter(p => p.hasPkg).length);
		}

		// ── Audit log entry ────────────────────────────────────────────
		const auditLogPath = `${SNAPSHOT_DIR}/audit.jsonl`;
		const logNow = new Date();
		const entry = {
			timestamp: logNow.toISOString(),
			date: fmtDate(logNow),
			tz: _tz,
			tzOverride: _tzExplicit,
			scanDuration: elapsed,
		};
		await appendFile(auditLogPath, JSON.stringify(entry) + '\n');
	}

	// ── RSS feed generation ──────────────────────────────────────────
	if (flags.rss) {
		console.log();
		await publishTokenEventsRss();
		await publishScanResultsRss(projects);
	}
	if (flags['advisory-feed']) {
		await consumeAdvisoryFeed(flags['advisory-feed'], projects);
	}
}

if (import.meta.main) {
	main().catch(err => {
		console.error(c.red('Fatal:'), err);
		process.exit(1);
	});
}
const _nn = (v: string | undefined): string => v ?? '';
