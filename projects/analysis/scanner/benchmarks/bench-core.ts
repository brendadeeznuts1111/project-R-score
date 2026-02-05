/**
 * Shared benchmark core: harness, formatting, ANSI helpers, and profile loading.
 *
 * Imported by bench-native.ts and bench-rss.ts to eliminate duplication.
 *
 * References:
 *   - Bun.nanoseconds: https://bun.com/docs/api/utils#bun-nanoseconds
 *   - Bun.color: https://bun.com/docs/api/utils#bun-color
 *   - Bun.enableANSIColors: https://bun.com/docs/api/utils#bun-enableansicolors
 *   - Bun.stringWidth: https://bun.com/docs/api/utils#bun-stringwidth
 *   - Bun.inspect.table: https://bun.com/docs/api/utils#bun-inspect-table
 */

// ── Constants ───────────────────────────────────────────────────────

export const ITERATIONS = 10_000;
export const WARMUP = 500;

// ── Types ───────────────────────────────────────────────────────────

export interface BenchResult {
	mean_ns: number;
	min_ns: number;
	max_ns: number;
}

export interface MemberProfile {
	name: string;
	email?: string;
	timezone: string;
	notes: string;
	machine: {
		os: string;
		arch: string;
		cpu: string;
		cores: number;
		memory_gb: number;
		bun_version: string;
	};
}

export interface BenchRC {
	team: Record<string, MemberProfile>;
}

// ── Harness ─────────────────────────────────────────────────────────

export function bench(label: string, fn: () => void, iters = ITERATIONS): BenchResult {
	for (let i = 0; i < WARMUP; i++) fn();

	let min = Number.POSITIVE_INFINITY;
	let max = 0;
	let total = 0;

	for (let i = 0; i < iters; i++) {
		const start = Bun.nanoseconds();
		fn();
		const elapsed = Bun.nanoseconds() - start;
		total += elapsed;
		if (elapsed < min) min = elapsed;
		if (elapsed > max) max = elapsed;
	}

	return {mean_ns: total / iters, min_ns: min, max_ns: max};
}

export async function benchAsync(label: string, fn: () => Promise<void>, iters = ITERATIONS): Promise<BenchResult> {
	for (let i = 0; i < Math.min(WARMUP, iters); i++) await fn();

	let min = Number.POSITIVE_INFINITY;
	let max = 0;
	let total = 0;

	for (let i = 0; i < iters; i++) {
		const start = Bun.nanoseconds();
		await fn();
		const elapsed = Bun.nanoseconds() - start;
		total += elapsed;
		if (elapsed < min) min = elapsed;
		if (elapsed > max) max = elapsed;
	}

	return {mean_ns: total / iters, min_ns: min, max_ns: max};
}

// ── Formatting ──────────────────────────────────────────────────────

export const fmt = (ns: number): string =>
	ns < 1_000
		? `${ns.toFixed(1)} ns`
		: ns < 1_000_000
			? `${(ns / 1_000).toFixed(2)} µs`
			: `${(ns / 1_000_000).toFixed(2)} ms`;

export const opsPerSec = (mean_ns: number): string => {
	const ops = 1_000_000_000 / mean_ns;
	if (ops >= 1_000_000) return `${(ops / 1_000_000).toFixed(2)}M`;
	if (ops >= 1_000) return `${(ops / 1_000).toFixed(1)}K`;
	return `${ops.toFixed(0)}`;
};

export const throughput = (mean_ns: number, bytes: number): string => {
	const bytesPerSec = (bytes / mean_ns) * 1_000_000_000;
	if (bytesPerSec >= 1_073_741_824) return `${(bytesPerSec / 1_073_741_824).toFixed(2)} GB/s`;
	if (bytesPerSec >= 1_048_576) return `${(bytesPerSec / 1_048_576).toFixed(1)} MB/s`;
	if (bytesPerSec >= 1_024) return `${(bytesPerSec / 1_024).toFixed(1)} KB/s`;
	return `${bytesPerSec.toFixed(0)} B/s`;
};

// ── ANSI styles ─────────────────────────────────────────────────────

export const useColor = Bun.enableANSIColors && !!process.stdout.isTTY;

export const S = {
	reset: '\x1b[0m',
	bold: '\x1b[1m',
	dim: '\x1b[2m',
	red: Bun.color('red', 'ansi-16m') ?? '\x1b[31m',
	green: Bun.color('green', 'ansi-16m') ?? '\x1b[32m',
	yellow: '\x1b[33m',
	cyan: '\x1b[36m',
} as const;

export const o = (s: string): string => (useColor ? s : '');
export const R = o(S.reset);
export const B = o(S.bold);
export const D = o(S.dim);

/** Visual width accounting for ANSI escape sequences. */
export const vw = (s: string): number => Bun.stringWidth(s);

// ── Section / check helpers ─────────────────────────────────────────

export function sectionHeader(title: string, ref?: string): void {
	console.log(`\n${B}═══ ${title} ═══${R}`);
	if (ref) console.log(`${D}   ref: ${ref}${R}\n`);
	else console.log();
}

export function checkPass(label: string, ok: boolean, detail?: string): void {
	const icon = ok ? `${o(S.green)}pass${R}` : `${o(S.red)}FAIL${R}`;
	console.log(`  ${label}: ${icon}${detail ? ` ${D}(${detail})${R}` : ''}`);
}

// ── Ratio coloring (HSL via Bun.color) ──────────────────────────────
// Maps speedup ratio to HSL hue: 0.5x → red (0°), 1.0x → yellow (60°), 1.5x+ → green (120°)

export function ratioColor(ratio: number): string {
	const clamped = Math.max(0.5, Math.min(ratio, 1.5));
	const hue = Math.round(((clamped - 0.5) / 1.0) * 120);
	return o(Bun.color(`hsl(${hue}, 90%, 55%)`, 'ansi-16m') ?? '');
}

export function report(label: string, old: BenchResult, neo: BenchResult): void {
	const ratio = old.mean_ns / neo.mean_ns;
	const diff = old.mean_ns - neo.mean_ns;
	const rows = [
		{' ': `old (${label})`, 'Mean': fmt(old.mean_ns), 'Min': fmt(old.min_ns), 'Max': fmt(old.max_ns)},
		{' ': `new (${label})`, 'Mean': fmt(neo.mean_ns), 'Min': fmt(neo.min_ns), 'Max': fmt(neo.max_ns)},
	];
	// @ts-expect-error Bun.inspect.table accepts options as third arg
	console.log(Bun.inspect.table(rows, [' ', 'Mean', 'Min', 'Max'], {colors: useColor}));
	const deltaColor = diff > 0 ? o(S.green) : diff < 0 ? o(S.red) : '';
	const rc = ratioColor(ratio);
	console.log(
		`  ${deltaColor}Δ: ${diff > 0 ? '+' : ''}${fmt(diff)}/op  ${rc}ratio: ${ratio.toFixed(2)}x${R}  ${ratio > 1 ? '(new is faster)' : ratio < 1 ? '(old is faster)' : '(equal)'}${R}`,
	);
}

// ── Profile loading ─────────────────────────────────────────────────

export async function loadMemberProfile(): Promise<{key: string | null; profile: MemberProfile | null}> {
	const benchrcPath = `${import.meta.dir}/../.benchrc.json`;
	const benchrcFile = Bun.file(benchrcPath);
	if (await benchrcFile.exists()) {
		try {
			const rc = (await benchrcFile.json()) as BenchRC;
			const user = Bun.env.USER ?? '';
			if (rc.team?.[user]) {
				return {key: user, profile: rc.team[user]};
			}
		} catch {}
	}
	return {key: null, profile: null};
}

// ── Summary rendering ───────────────────────────────────────────────

export function renderSummary(opts: {
	t0: number;
	iterLabel?: string;
	memberKey: string | null;
	memberProfile: MemberProfile | null;
}): void {
	sectionHeader('SUMMARY');

	const totalRuntime = (Bun.nanoseconds() - opts.t0) / 1_000_000;

	const rows: {Field: string; Value: string}[] = [
		{Field: 'Total runtime', Value: `${totalRuntime.toFixed(0)} ms`},
		{Field: 'Iterations', Value: opts.iterLabel ?? String(ITERATIONS)},
		{Field: 'Warmup', Value: String(WARMUP)},
		{Field: 'Bun version', Value: Bun.version},
		{Field: 'Platform', Value: `${process.platform} ${process.arch}`},
		{Field: 'Timestamp', Value: new Date().toISOString()},
		{Field: 'Timezone', Value: Intl.DateTimeFormat().resolvedOptions().timeZone},
	];

	if (opts.memberProfile) {
		const m = opts.memberProfile;
		rows.push(
			{Field: 'Member', Value: `${opts.memberKey} (${m.name})`},
			{Field: 'Machine', Value: `${m.machine.cpu}, ${m.machine.cores} cores, ${m.machine.memory_gb} GB`},
			{Field: 'Timezone (member)', Value: m.timezone},
			{Field: 'Notes', Value: m.notes || '(none)'},
		);
	} else {
		rows.push({Field: 'Member', Value: '(unknown — run: bun run benchmarks/team-init.ts)'});
	}

	// @ts-expect-error Bun.inspect.table accepts options as third arg
	console.log(Bun.inspect.table(rows, ['Field', 'Value'], {colors: useColor}));
}
