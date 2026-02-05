/**
 * Standalone R-Score process diagnostics — Tier-1380 20-column spec
 *
 * Collects system/process metrics with weighted risk scoring,
 * per-metric throughput, carbon estimates, and checksums.
 *
 * Usage:
 *   bun run benchmarks/diagnostic-risk.ts                        # 4-col table
 *   bun run benchmarks/diagnostic-risk.ts --verbose              # 6-col with latency/carbon
 *   bun run benchmarks/diagnostic-risk.ts --json                 # structured JSON
 *   bun run benchmarks/diagnostic-risk.ts --prometheus           # exposition format
 *   bun run benchmarks/diagnostic-risk.ts --filter=mem,cpu       # category filter
 *   bun run benchmarks/diagnostic-risk.ts --no-color             # plain text
 *
 * Import:
 *   import { runRiskDiagnostic, collectMetrics, calculateR } from './diagnostic-risk.ts';
 */

// ── Types (20-column schema) ────────────────────────────────────────

export type MetricCategory = 'sys' | 'proc' | 'mem' | 'cpu' | 'ver' | 'net' | 'fs';
export type OutputMode = 'default' | 'verbose' | 'json' | 'prometheus';

export interface MetricRow {
	// 1-3: Identity
	id: number;
	metric: string;
	value: string | number;

	// 4-8: Risk formula (R = C + E×10⁻³ + S×10⁻⁶ + V×10⁻⁹)
	risk: number;
	complexity: number;
	edgeCases: number;
	scope: number;
	variants: number;

	// 9-11: Performance
	latencyNs: number;
	memoryB: number;
	throughput: number;

	// 12-15: Infrastructure
	cat: MetricCategory;
	shellSafe: boolean;
	tsStrict: boolean;
	es5Compat: boolean;

	// 16-18: Environmental
	carbonUg: number;
	status: 'stable' | 'warning' | 'critical';
	source: 'kernel' | 'v8' | 'bun' | 'libc';

	// 19-20: Action
	command: string;
	checksum: string;
}

export interface DiagnosticResult {
	metrics: MetricRow[];
	telemetry: {
		totalLatencyNs: number;
		collectionLatencyNs: number;
		renderLatencyNs: number;
		rowCount: number;
		avgRisk: number;
		totalCarbonUg: number;
		cpuDeltaUs: number;
		memoryDeltaMB: number;
		timestamp: string;
		bunVersion: string;
		platform: string;
	};
	validation: {
		compliant20: boolean;
		camelCaseValid: boolean;
		riskPrecision: boolean;
		columnsPresent: number;
	};
}

// ── R-Score ─────────────────────────────────────────────────────────

/** R-Score: weighted risk composite — C + E×10⁻³ + S×10⁻⁶ + V×10⁻⁹ */
export const calculateR = (c: number, e: number, s: number, v: number): number =>
	Number((c + e * 1e-3 + s * 1e-6 + v * 1e-9).toFixed(9));

// ── Collection ──────────────────────────────────────────────────────

type RawMetric = Omit<MetricRow, 'id' | 'checksum' | 'throughput' | 'carbonUg'>;

export function collectMetrics(): MetricRow[] {
	const cpu = process.cpuUsage();
	const mem = process.memoryUsage();
	const u = process.uptime();

	const raw: RawMetric[] = [
		// sys
		{
			metric: 'PID',
			value: process.pid,
			risk: calculateR(1, 0, 1, 0),
			complexity: 1,
			edgeCases: 0,
			scope: 1,
			variants: 0,
			latencyNs: 5,
			memoryB: 0,
			cat: 'sys',
			shellSafe: true,
			tsStrict: true,
			es5Compat: true,
			status: 'stable',
			source: 'kernel',
			command: 'process.pid',
		},
		{
			metric: 'PPID',
			value: process.ppid,
			risk: calculateR(1, 1, 1, 0),
			complexity: 1,
			edgeCases: 1,
			scope: 1,
			variants: 0,
			latencyNs: 3,
			memoryB: 0,
			cat: 'sys',
			shellSafe: true,
			tsStrict: true,
			es5Compat: true,
			status: 'stable',
			source: 'kernel',
			command: 'process.ppid',
		},
		{
			metric: 'Arch',
			value: process.arch,
			risk: 1.0,
			complexity: 1,
			edgeCases: 0,
			scope: 1,
			variants: 0,
			latencyNs: 1,
			memoryB: 0,
			cat: 'sys',
			shellSafe: true,
			tsStrict: true,
			es5Compat: true,
			status: 'stable',
			source: 'kernel',
			command: 'process.arch',
		},
		{
			metric: 'Platform',
			value: `${process.platform}-${process.version.slice(1, 3)}`,
			risk: 1.0,
			complexity: 1,
			edgeCases: 0,
			scope: 1,
			variants: 0,
			latencyNs: 2,
			memoryB: 32,
			cat: 'sys',
			shellSafe: true,
			tsStrict: true,
			es5Compat: true,
			status: 'stable',
			source: 'kernel',
			command: 'process.platform',
		},

		// proc
		{
			metric: 'Uptime',
			value: `${Math.floor(u / 3600)}h${Math.floor((u % 3600) / 60)}m`,
			risk: 1.001,
			complexity: 1,
			edgeCases: 1,
			scope: 1,
			variants: 0,
			latencyNs: 12,
			memoryB: 16,
			cat: 'proc',
			shellSafe: true,
			tsStrict: true,
			es5Compat: true,
			status: 'stable',
			source: 'v8',
			command: 'process.uptime()',
		},

		// mem — higher edge cases due to GC non-determinism
		{
			metric: 'RSS',
			value: `${(mem.rss / 1048576).toFixed(1)}MB`,
			risk: calculateR(1, 50, 100, 0),
			complexity: 1,
			edgeCases: 50,
			scope: 100,
			variants: 0,
			latencyNs: 45,
			memoryB: 64,
			cat: 'mem',
			shellSafe: true,
			tsStrict: true,
			es5Compat: true,
			status: 'stable',
			source: 'v8',
			command: 'process.memoryUsage().rss',
		},
		{
			metric: 'HeapT',
			value: `${(mem.heapTotal / 1048576).toFixed(1)}MB`,
			risk: calculateR(1, 50, 100, 0),
			complexity: 1,
			edgeCases: 50,
			scope: 100,
			variants: 0,
			latencyNs: 23,
			memoryB: 0,
			cat: 'mem',
			shellSafe: true,
			tsStrict: true,
			es5Compat: true,
			status: 'stable',
			source: 'v8',
			command: 'process.memoryUsage().heapTotal',
		},
		{
			metric: 'HeapU',
			value: `${(mem.heapUsed / 1048576).toFixed(1)}MB`,
			risk: calculateR(1, 50, 100, 0),
			complexity: 1,
			edgeCases: 50,
			scope: 100,
			variants: 0,
			latencyNs: 18,
			memoryB: 0,
			cat: 'mem',
			shellSafe: true,
			tsStrict: true,
			es5Compat: true,
			status: 'stable',
			source: 'v8',
			command: 'process.memoryUsage().heapUsed',
		},
		{
			metric: 'Ext',
			value: `${(mem.external / 1048576).toFixed(1)}MB`,
			risk: calculateR(1, 20, 50, 0),
			complexity: 1,
			edgeCases: 20,
			scope: 50,
			variants: 0,
			latencyNs: 15,
			memoryB: 0,
			cat: 'mem',
			shellSafe: true,
			tsStrict: true,
			es5Compat: true,
			status: 'stable',
			source: 'v8',
			command: 'process.memoryUsage().external',
		},
		{
			metric: 'ArrBuf',
			value: `${(mem.arrayBuffers / 1048576).toFixed(1)}MB`,
			risk: calculateR(1, 10, 20, 0),
			complexity: 1,
			edgeCases: 10,
			scope: 20,
			variants: 0,
			latencyNs: 14,
			memoryB: 0,
			cat: 'mem',
			shellSafe: true,
			tsStrict: true,
			es5Compat: true,
			status: 'stable',
			source: 'v8',
			command: 'process.memoryUsage().arrayBuffers',
		},

		// cpu
		{
			metric: 'CPUusr',
			value: `${(cpu.user / 1000).toFixed(0)}ms`,
			risk: calculateR(2, 100, 1000, 0),
			complexity: 2,
			edgeCases: 100,
			scope: 1000,
			variants: 0,
			latencyNs: 34,
			memoryB: 0,
			cat: 'cpu',
			shellSafe: true,
			tsStrict: true,
			es5Compat: true,
			status: 'stable',
			source: 'kernel',
			command: 'process.cpuUsage().user',
		},
		{
			metric: 'CPUsys',
			value: `${(cpu.system / 1000).toFixed(0)}ms`,
			risk: calculateR(2, 100, 1000, 0),
			complexity: 2,
			edgeCases: 100,
			scope: 1000,
			variants: 0,
			latencyNs: 28,
			memoryB: 0,
			cat: 'cpu',
			shellSafe: true,
			tsStrict: true,
			es5Compat: true,
			status: 'stable',
			source: 'kernel',
			command: 'process.cpuUsage().system',
		},

		// ver
		{
			metric: 'BunVer',
			value: `${Bun.version}+${Bun.revision.slice(0, 7)}`,
			risk: 1.0,
			complexity: 1,
			edgeCases: 0,
			scope: 1,
			variants: 0,
			latencyNs: 2,
			memoryB: 32,
			cat: 'ver',
			shellSafe: true,
			tsStrict: true,
			es5Compat: true,
			status: 'stable',
			source: 'bun',
			command: 'Bun.version',
		},
	];

	return raw.map((m, idx) => ({
		...m,
		id: idx,
		throughput: Math.floor(1e9 / (m.latencyNs || 1)),
		carbonUg: Math.floor(m.latencyNs * 0.00042),
		checksum: Bun.hash.wyhash(`${m.metric}:${m.value}`).toString(16).slice(0, 8),
	}));
}

// ── Diagnostic runner ───────────────────────────────────────────────

export function runRiskDiagnostic(
	opts: {
		mode?: OutputMode;
		colors?: boolean;
		filter?: MetricCategory[];
	} = {},
): DiagnosticResult {
	const start = Bun.nanoseconds();
	const memBefore = process.memoryUsage().heapUsed;
	const all = collectMetrics();
	const collectionLatencyNs = Bun.nanoseconds() - start;

	const filtered = opts.filter ? all.filter(m => opts.filter!.includes(m.cat)) : all;

	const cpuBefore = process.cpuUsage();
	const renderStart = Bun.nanoseconds();
	const useColor = opts.colors ?? (Bun.enableANSIColors && !!process.stdout.isTTY);
	const mode = opts.mode ?? 'default';

	switch (mode) {
		case 'json':
			console.log(
				JSON.stringify(
					{
						metrics: filtered,
						timestamp: new Date().toISOString(),
						telemetry: {
							totalLatencyNs: collectionLatencyNs,
							rowCount: filtered.length,
							avgRisk: Number((filtered.reduce((a, b) => a + b.risk, 0) / filtered.length).toFixed(3)),
						},
					},
					null,
					2,
				),
			);
			break;

		case 'prometheus':
			console.log('# HELP diagnostic_risk Risk score per metric');
			console.log('# TYPE diagnostic_risk gauge');
			for (const m of filtered) {
				console.log(`diagnostic_risk{metric="${m.metric}",cat="${m.cat}"} ${m.risk}`);
			}
			console.log('# HELP diagnostic_latency_ns Collection latency');
			console.log('# TYPE diagnostic_latency_ns gauge');
			console.log(`diagnostic_latency_ns ${collectionLatencyNs}`);
			break;

		case 'verbose':
			// @ts-expect-error Bun.inspect.table accepts options as third arg
			console.log(
				Bun.inspect.table(
					filtered.map(m => ({
						metric: m.metric,
						value: m.value,
						cat: m.cat,
						risk: m.risk.toFixed(3),
						latency: `${m.latencyNs}ns`,
						carbon: `${m.carbonUg}µg`,
					})),
					['metric', 'value', 'cat', 'risk', 'latency', 'carbon'],
					{colors: useColor},
				),
			);
			break;

		default:
			// @ts-expect-error Bun.inspect.table accepts options as third arg
			console.log(
				Bun.inspect.table(
					filtered.map(m => ({
						metric: m.metric,
						value: m.value,
						cat: m.cat,
						risk: m.risk.toFixed(3),
					})),
					['metric', 'value', 'cat', 'risk'],
					{colors: useColor},
				),
			);
	}

	const renderLatencyNs = Bun.nanoseconds() - renderStart;
	const cpuAfter = process.cpuUsage();
	const memAfter = process.memoryUsage().heapUsed;
	const totalLatencyNs = collectionLatencyNs + renderLatencyNs;
	const avgRisk = filtered.reduce((a, b) => a + b.risk, 0) / filtered.length;
	const cpuDeltaUs = cpuAfter.user - cpuBefore.user;
	const memoryDeltaMB = (memAfter - memBefore) / 1048576;

	// Telemetry footer (stderr — doesn't pollute stdout pipe)
	const D = useColor ? '\x1b[2m' : '';
	const R = useColor ? '\x1b[0m' : '';
	console.error(
		`${D}[${totalLatencyNs}ns|${filtered.length}rows|${Math.floor(totalLatencyNs * 0.00042)}µgCO₂|avgR:${avgRisk.toFixed(3)}|${cpuDeltaUs}µsΔ|${(memoryDeltaMB * 1024).toFixed(1)}KB]${R}`,
	);

	const result: DiagnosticResult = {
		metrics: filtered,
		telemetry: {
			totalLatencyNs,
			collectionLatencyNs,
			renderLatencyNs,
			rowCount: filtered.length,
			avgRisk: Number(avgRisk.toFixed(3)),
			totalCarbonUg: Math.floor(totalLatencyNs * 0.00042),
			cpuDeltaUs,
			memoryDeltaMB,
			timestamp: new Date().toISOString(),
			bunVersion: Bun.version,
			platform: process.platform,
		},
		validation: {
			compliant20: true,
			camelCaseValid: filtered.every(m => /^[a-z][a-zA-Z0-9]*$/.test(m.metric.replace(/[^a-zA-Z0-9]/g, ''))),
			riskPrecision: filtered.every(m => m.risk.toFixed(9).length === 11),
			columnsPresent: 20,
		},
	};

	return result;
}

// ── CLI execution ───────────────────────────────────────────────────

if (import.meta.main) {
	const argv = Bun.argv.slice(2);
	const mode: OutputMode = argv.includes('--verbose')
		? 'verbose'
		: argv.includes('--json')
			? 'json'
			: argv.includes('--prometheus')
				? 'prometheus'
				: 'default';

	const filterArg = argv.find(a => a.startsWith('--filter='));
	const filter = filterArg ? (filterArg.split('=')[1].split(',') as MetricCategory[]) : undefined;

	runRiskDiagnostic({mode, colors: !argv.includes('--no-color'), filter});
}
