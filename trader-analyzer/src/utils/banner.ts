/**
 * @fileoverview Banner Utility for Bun
 * @description Draw formatted banners using Bun's stdout.write() and ANSI colors
 * @module utils/banner
 */

import { stdout } from "bun";

/**
 * Draw a formatted banner with metadata
 */
export function drawBanner(meta: Record<string, string | string[]>) {
	const esc = (s: string) => `\x1b[1m\x1b[36m${s}\x1b[0m`; // bold cyan
	const pad = (s: string, n = 16) => s.padEnd(n);
	const line = (k: string, v: string) => `│ ${esc(pad(k))} ${v} `;

	const sources = Array.isArray(meta.sources) 
		? meta.sources.map((s: string) => `│   • ${s}`).join("\n")
		: `│   • ${String(meta.sources)}`;

	stdout.write(`
╭─ NEXUS v${meta.version} ───────────────────────────────────────────╮
│ NEXUS Unified Trading Intelligence          │
│                                                               │
│ Runtime    Bun ${Bun.version}                                 │
│ Server     ${meta.server}                     │
│ Docs       ${meta.docs}                     │
│ Memory     ${meta.memory}                       │
│                                                               │
│ Data Sources:                                        │
${sources}
│                                                               │
│ HMR        Enabled (use bun --hot)                   │
│                                                               │
│ Startup: ${meta.startup}ms                                      │
╰───────────────────────────────────────────────────────────────╯
`);
}

/**
 * Draw a correlation graph banner
 */
export function drawCorrelationGraphBanner(meta: {
	eventId: string;
	timeWindow: number;
	nodes: number;
	edges: number;
	bookmakers: number;
	duration: string;
	operationId?: string;
}) {
	const esc = (s: string) => `\x1b[1m\x1b[36m${s}\x1b[0m`; // bold cyan
	const pad = (s: string, n = 20) => s.padEnd(n);
	const line = (k: string, v: string) => `│ ${esc(pad(k))} ${v} `;

	const operationLine = meta.operationId 
		? `${line("Operation ID", meta.operationId)}\n`
		: "";

	stdout.write(`
╭─ Correlation Graph ────────────────────────────────────────────╮
│ Multi-Layer Correlation Visualization                          │
│                                                               │
${line("Event ID", meta.eventId)}
${line("Time Window", `${meta.timeWindow}h`)}
${line("Nodes", meta.nodes.toString())}
${line("Edges", meta.edges.toString())}
${line("Bookmakers", meta.bookmakers.toString())}
${line("Duration", meta.duration)}${operationLine}│                                                               │
╰───────────────────────────────────────────────────────────────╯
`);
}

/**
 * Draw a compact correlation graph summary banner
 */
export function drawCorrelationGraphSummary(meta: {
	eventId: string;
	nodes: number;
	edges: number;
	duration: string;
}) {
	const esc = (s: string) => `\x1b[1m\x1b[36m${s}\x1b[0m`; // bold cyan
	
	stdout.write(
		`${esc("Correlation Graph")} ${meta.eventId} │ ` +
		`${meta.nodes} nodes │ ${meta.edges} edges │ ${meta.duration}\n`
	);
}
