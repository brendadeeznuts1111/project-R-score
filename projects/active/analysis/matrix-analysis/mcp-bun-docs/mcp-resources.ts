/**
 * Tier-1380 ACP Integration — Expose matrix to Agent Communication Protocol
 * @col_93 balanced_braces
 */
import {
	BINARY_PERF_METRICS,
	BUN_137_COMPLETE_MATRIX,
	BUN_137_FEATURE_MATRIX,
	BUN_DOCS_BASE,
	BUN_DOCS_VERSION,
} from "./lib.ts";

export const MATRIX_ACP_RESOURCES = [
	{
		uri: "bun://docs/matrix/v1.3.7",
		mimeType: "application/json",
		name: "Tier-1380 Feature Matrix",
		metadata: {
			bunVersion: BUN_DOCS_VERSION,
			baseUrl: BUN_DOCS_BASE,
			checksum: "sha256:...",
		},
	},
	{
		uri: "bun://docs/matrix/v1.3.7-complete",
		mimeType: "application/json",
		name: "Tier-1380 Complete Matrix (28 entries)",
		metadata: {
			bunVersion: BUN_DOCS_VERSION,
			entryCount: BUN_137_COMPLETE_MATRIX.length,
		},
	},
	{
		uri: "bun://docs/matrix/perf-baselines",
		mimeType: "text/markdown",
		name: "Performance Regression Gates",
		content: [
			"# Tier-1380 Performance Baselines",
			"",
			"| Op | Before | After | Use Case |",
			"|----|--------|-------|----------|",
			...BINARY_PERF_METRICS.map(
				(m) => `| ${m.op} | ${m.before} | ${m.after} | ${m.use} |`,
			),
			"",
			"**Buffer.swap64 baseline:** 0.56µs/64KB",
		].join("\n"),
	},
	{
		uri: "bun://profiles/cpu-heap-md",
		mimeType: "text/markdown",
		name: "CPU & Heap Profiling (Markdown)",
		content: [
			"# Tier-1380 CPU & Heap Profiling",
			"",
			"## CLI Flags (Bun v1.3.7+)",
			"",
			"| Flag | Platforms | Output | Use Case |",
			"|------|-----------|--------|----------|",
			"| `--cpu-prof-md` | darwin, linux | Markdown profiles | GitHub/LLM analysis |",
			"| `--heap-prof` | darwin, linux, win32 | Chrome DevTools + Markdown | Memory leak grep |",
			"",
			"## Usage",
			"",
			"```bash",
			"# Capture CPU profile (Markdown, LLM-parseable)",
			"bun --cpu-prof-md script.ts",
			"",
			"# Capture heap snapshot (grep-friendly)",
			"bun --heap-prof script.ts",
			"```",
			"",
			"## Security",
			"",
			"All profiling flags are gated behind `--inspect` in production (5-region ZTNA).",
			"",
			"## Related",
			"",
			"- [bun.com/docs/cli/cpu-prof](https://bun.com/docs/cli/cpu-prof)",
			"- [bun.com/docs/cli/heap-prof](https://bun.com/docs/cli/heap-prof)",
			"- `node:inspector` Profiler API",
		].join("\n"),
		metadata: { bunVersion: BUN_DOCS_VERSION, category: "profiling" },
	},
	{
		uri: "bun://security/matrix-classifications",
		mimeType: "application/json",
		name: "Security Classifications for Matrix Features",
		metadata: {
			bunVersion: BUN_DOCS_VERSION,
			provider: "Skills Registry",
			authRequired: true,
		},
	},
	{
		uri: "bun://security/audit-report",
		mimeType: "application/json",
		name: "Real-time Security Audit Report",
		metadata: {
			bunVersion: BUN_DOCS_VERSION,
			provider: "Skills Registry",
			autoRefresh: "30s",
		},
	},
	{
		uri: "bun://security/tools",
		mimeType: "application/json",
		name: "Available Security Tools",
		metadata: { bunVersion: BUN_DOCS_VERSION, provider: "Skills Registry" },
	},
];
