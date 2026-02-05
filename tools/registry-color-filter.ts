#!/usr/bin/env bun

import {parseArgs} from 'node:util';

type RiskLevel = 'high' | 'medium' | 'low' | 'all';

const {values: flags} = parseArgs({
	allowPositionals: true,
	args: Bun.argv.slice(2),
	options: {
		'filter-risk': {type: 'string', default: 'all'},
		'file': {type: 'string', default: 'registry-color-channel.toml'},
		'help': {type: 'boolean', short: 'h', default: false},
	},
	strict: true,
});

function usage(): void {
	console.log(`
  bun registry-color-filter.ts --filter-risk={high|medium|low|all} [--file <path>]

  Filters registry-color-channel.toml and prints TOML to stdout.
  R-Score thresholds:
    channels:   high >= 5.0, medium >= 2.5, low > 0
    throughput: high >= 1.5, medium >= 0.75, low > 0
`);
}

if (flags.help) {
	usage();
	process.exit(0);
}

const filterRisk = (flags['filter-risk'] as RiskLevel) ?? 'all';
const filePath = flags.file ?? 'registry-color-channel.toml';

const text = await Bun.file(filePath).text();
const data = Bun.TOML.parse(text) as {
	channel_registry?: Array<Record<string, unknown>>;
	throughput_ledger?: Array<Record<string, unknown>>;
};

function isMsLatency(entry: Record<string, unknown>): boolean {
	const p99 = String(entry.latency_p99 ?? '');
	if (p99.endsWith('m')) return true; // milliseconds marker
	const ms = Number(entry.latency_ms ?? 0);
	return ms > 0;
}

function channelScore(entry: Record<string, unknown>): number {
	let score = 0;
	const coverage = Number(entry.coverage_pct ?? 100);
	const synced = Boolean(entry.is_synced ?? true);
	if (coverage < 60) score += 5;
	if (!synced) score += 5;
	return score;
}

function throughputScore(entry: Record<string, unknown>): number {
	let score = 0;
	const efficiency = Number(entry.efficiency_pct ?? 100);
	if (isMsLatency(entry)) score += 1.5;
	if (efficiency < 8) score += 0.5;
	return score;
}

function keepByRisk(score: number, kind: 'channel' | 'throughput'): boolean {
	if (filterRisk === 'all') return true;
	const high = kind === 'channel' ? 5.0 : 1.5;
	const medium = kind === 'channel' ? 2.5 : 0.75;
	if (filterRisk === 'high') return score >= high;
	if (filterRisk === 'medium') return score >= medium && score < high;
	if (filterRisk === 'low') return score > 0 && score < medium;
	return true;
}

const channels = (data.channel_registry ?? []).map(e => ({...e, r_score: channelScore(e as any)}));
const throughput = (data.throughput_ledger ?? []).map(e => ({...e, r_score: throughputScore(e as any)}));

const filteredChannels = channels.filter(e => keepByRisk(Number(e.r_score), 'channel'));
const filteredThroughput = throughput.filter(e => keepByRisk(Number(e.r_score), 'throughput'));

const channelOrder = [
	'channel_id',
	'hex_red_value',
	'red_channel',
	'green_channel',
	'blue_channel',
	'alpha_channel',
	'red_byte_hex',
	'green_byte_hex',
	'blue_byte_hex',
	'alpha_byte_hex',
	'coverage_pct',
	'owner_code',
	'tier_level',
	'api_version',
	'encoding_type',
	'is_synced',
	'byte_position',
	'channel_mode',
	'engine_type',
	'source_type',
	'r_score',
];

const throughputOrder = [
	'operation_code',
	'latency_p99',
	'efficiency_pct',
	'red_hex',
	'green_hex',
	'blue_hex',
	'red_val',
	'green_val',
	'blue_val',
	'alpha_val',
	'alpha_hex',
	'jit_enabled',
	'memory_used',
	'cpu_percent',
	'ref_count',
	'throughput_mbs',
	'luminosity',
	'hue_angle',
	'latency_ms',
	'avx_accel',
	'r_score',
];

function tomlValue(v: unknown): string {
	if (typeof v === 'string') return JSON.stringify(v);
	if (typeof v === 'number' || typeof v === 'boolean') return String(v);
	if (v === null || v === undefined) return '""';
	return JSON.stringify(String(v));
}

function printTable(name: string, rows: Array<Record<string, unknown>>, order: string[]): void {
	for (const row of rows) {
		console.log(`[[${name}]]`);
		for (const key of order) {
			if (row[key] === undefined) continue;
			console.log(`${key} = ${tomlValue(row[key])}`);
		}
		console.log();
	}
}

printTable('channel_registry', filteredChannels, channelOrder);
printTable('throughput_ledger', filteredThroughput, throughputOrder);
