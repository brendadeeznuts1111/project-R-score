#!/usr/bin/env bun

/**
 * Frontmatter Extraction Benchmark
 *
 * Modes:
 *   (default)      In-process micro-benchmarks with statistical summary
 *   --hyperfine    Process-level benchmarks via hyperfine (extract, pipeline, batch)
 *   --quiet        Machine-friendly output (no banners)
 *   --json         Emit JSON results to stdout
 */

import { batchExtractFrontmatter, generateIndex } from "./batch";
import { extractFrontmatter } from "./extractor";
import { injectIntoHtml } from "./inject";
import { normalizeFrontmatter } from "./normalizer";
import { type FrontmatterSchema, validateFrontmatter } from "./validator";

const QUIET = process.argv.includes("--quiet") || !!process.env.CLAUDECODE;
const JSON_OUT = process.argv.includes("--json");
const HYPERFINE = process.argv.includes("--hyperfine");

// ─── Fixtures ───────────────────────────────────────────────────────────────

const YAML_MD = `---
title: "Benchmark Post: YAML Edition"
description: Performance testing the YAML frontmatter parser
date: 2026-02-01
tags:
  - benchmark
  - bun
  - frontmatter
  - performance
draft: false
author: Nola Rose
slug: bench-yaml
image: https://example.com/images/bench.png
---
# Benchmark Post

This is a **benchmark** post with various inline elements.

- List item 1
- List item 2
- List item 3

\`\`\`typescript
const result = extractFrontmatter(md);
\`\`\`

> A blockquote for testing.

| Col A | Col B |
|-------|-------|
| 1     | 2     |
`;

const TOML_MD = `+++
title = "Benchmark Post: TOML Edition"
description = "Performance testing the TOML frontmatter parser"
date = "2026-02-01"
tags = ["benchmark", "bun", "toml"]
draft = false
author = "Nola Rose"
slug = "bench-toml"
+++
# TOML Benchmark

Content after TOML frontmatter.
`;

const JSON_MD = `{
  "title": "Benchmark Post: JSON Edition",
  "description": "Performance testing JSON frontmatter",
  "date": "2026-02-01",
  "tags": ["benchmark", "bun", "json"],
  "draft": false,
  "author": "Nola Rose",
  "slug": "bench-json"
}

# JSON Benchmark

Content after JSON frontmatter.
`;

const PLAIN_MD = "# No Frontmatter\n\nJust plain markdown content.\n";

const SCHEMA: FrontmatterSchema = {
	title: { type: "string", required: true, min: 5, max: 200 },
	date: { type: "string", required: true },
	tags: { type: "array", min: 1 },
	draft: "boolean",
	slug: { type: "string", pattern: /^[a-z0-9-]+$/ },
};

// ─── Statistics ─────────────────────────────────────────────────────────────

interface BenchStats {
	samples: number[];
	min: number;
	max: number;
	mean: number;
	median: number;
	stddev: number;
	p5: number;
	p25: number;
	p75: number;
	p95: number;
	p99: number;
	iqr: number;
	cv: number;
}

function computeStats(samples: number[]): BenchStats {
	const sorted = [...samples].sort((a, b) => a - b);
	const n = sorted.length;
	const mean = sorted.reduce((s, v) => s + v, 0) / n;
	const variance = sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1 || 1);
	const stddev = Math.sqrt(variance);

	const percentile = (p: number) => {
		const idx = (p / 100) * (n - 1);
		const lo = Math.floor(idx);
		const hi = Math.ceil(idx);
		return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
	};

	return {
		samples: sorted,
		min: sorted[0],
		max: sorted[n - 1],
		mean,
		median: percentile(50),
		stddev,
		p5: percentile(5),
		p25: percentile(25),
		p75: percentile(75),
		p95: percentile(95),
		p99: percentile(99),
		iqr: percentile(75) - percentile(25),
		cv: (stddev / mean) * 100,
	};
}

// ─── Timing utility ─────────────────────────────────────────────────────────

const WARMUP_ITERS = 100;
const DEFAULT_ITERS = 2000;

interface BenchResult {
	name: string;
	stats: BenchStats;
	opsPerSec: number;
}

function bench(name: string, fn: () => void, iterations = DEFAULT_ITERS): BenchResult {
	// Warmup
	for (let i = 0; i < WARMUP_ITERS; i++) fn();

	// Collect per-iteration timings in batches to reduce overhead
	const batchSize = Math.max(10, Math.floor(iterations / 100));
	const batchCount = Math.ceil(iterations / batchSize);
	const batchTimes: number[] = [];

	for (let b = 0; b < batchCount; b++) {
		const t0 = Bun.nanoseconds();
		for (let i = 0; i < batchSize; i++) fn();
		const elapsed = (Bun.nanoseconds() - t0) / 1e6;
		batchTimes.push(elapsed / batchSize); // ms per op for this batch
	}

	const stats = computeStats(batchTimes);
	return { name, stats, opsPerSec: 1000 / stats.median };
}

// ─── Formatting ─────────────────────────────────────────────────────────────

function fmtTime(ms: number): string {
	if (ms < 0.001) return `${(ms * 1e6).toFixed(0)}ns`;
	if (ms < 0.01) return `${(ms * 1000).toFixed(1)}us`;
	if (ms < 1) return `${(ms * 1000).toFixed(0)}us`;
	if (ms < 1000) return `${ms.toFixed(2)}ms`;
	return `${(ms / 1000).toFixed(2)}s`;
}

function fmtOps(ops: number): string {
	if (ops >= 1e6) return `${(ops / 1e6).toFixed(1)}M`;
	if (ops >= 1e3) return `${(ops / 1e3).toFixed(1)}k`;
	return ops.toFixed(0);
}

function fmtCv(cv: number): string {
	if (cv <= 5) return `${cv.toFixed(1)}%`;
	if (cv <= 15) return `${cv.toFixed(1)}%`;
	return `${cv.toFixed(1)}%`;
}

function speedBar(opsPerSec: number, maxOps: number): string {
	const width = 20;
	// Use log scale for wide dynamic range
	const logVal = Math.log10(opsPerSec + 1);
	const logMax = Math.log10(maxOps + 1);
	const filled = Math.round((logVal / logMax) * width);
	return "\u2588".repeat(filled) + "\u2591".repeat(width - filled);
}

// ─── Benchmarks ─────────────────────────────────────────────────────────────

const benchResults: BenchResult[] = [];

// 1. Extract YAML
benchResults.push(bench("extract(YAML)", () => extractFrontmatter(YAML_MD)));

// 2. Extract TOML
benchResults.push(bench("extract(TOML)", () => extractFrontmatter(TOML_MD)));

// 3. Extract JSON
benchResults.push(bench("extract(JSON)", () => extractFrontmatter(JSON_MD)));

// 4. Extract none
benchResults.push(bench("extract(none)", () => extractFrontmatter(PLAIN_MD)));

// 5. Normalize
const yamlData = extractFrontmatter(YAML_MD).data;
benchResults.push(
	bench("normalize", () => normalizeFrontmatter(yamlData, { seoMapping: true })),
);

// 6. Validate
const normalized = normalizeFrontmatter(yamlData, { seoMapping: true });
benchResults.push(bench("validate", () => validateFrontmatter(normalized, SCHEMA)));

// 7. Full pipeline: extract + normalize + validate
benchResults.push(
	bench("full pipeline", () => {
		const ex = extractFrontmatter(YAML_MD);
		const n = normalizeFrontmatter(ex.data, { seoMapping: true });
		validateFrontmatter(n, SCHEMA);
	}),
);

// 8. HTML injection
benchResults.push(
	bench("injectIntoHtml", () => {
		injectIntoHtml(
			"<html><head><title>T</title></head><body><p>B</p></body></html>",
			normalized,
			{ modes: ["meta", "opengraph", "jsonld"], siteUrl: "https://example.com" },
		);
	}),
);

// 9. Full render pipeline: extract + normalize + markdown.html + inject
benchResults.push(
	bench(
		"render pipeline",
		() => {
			const ex = extractFrontmatter(YAML_MD);
			const n = normalizeFrontmatter(ex.data, { seoMapping: true });
			const html = Bun.markdown.html(ex.content);
			injectIntoHtml(`<html><head></head><body>${html}</body></html>`, n, {
				modes: ["meta", "opengraph", "jsonld"],
			});
		},
		1000,
	),
);

// ─── Batch benchmark (file I/O) ────────────────────────────────────────────

const BATCH_DIR = "/tmp/frontmatter-bench";
const BATCH_SIZE = 100;

async function setupBatchDir(): Promise<void> {
	await Bun.$`rm -rf ${BATCH_DIR} && mkdir -p ${BATCH_DIR}`.quiet();
	const templates = [YAML_MD, TOML_MD, JSON_MD, PLAIN_MD];
	const writes: Promise<number>[] = [];
	for (let i = 0; i < BATCH_SIZE; i++) {
		const md = templates[i % templates.length];
		writes.push(Bun.write(`${BATCH_DIR}/post-${String(i).padStart(4, "0")}.md`, md));
	}
	await Promise.all(writes);
}

interface BatchTimingResult {
	batchStats: BenchStats;
	perFileStats: BenchStats;
	indexGenMs: number;
}

async function runBatchBench(): Promise<BatchTimingResult> {
	await setupBatchDir();

	// Warmup
	await batchExtractFrontmatter(BATCH_DIR);

	const iterations = 10;
	const batchTimes: number[] = [];
	const perFileTimes: number[] = [];
	let indexGenMs = 0;

	for (let i = 0; i < iterations; i++) {
		const t0 = Bun.nanoseconds();
		const result = await batchExtractFrontmatter(BATCH_DIR, { schema: SCHEMA });
		const elapsed = (Bun.nanoseconds() - t0) / 1e6;
		batchTimes.push(elapsed);
		perFileTimes.push(elapsed / result.totalFiles);

		if (i === 0) {
			const t = Bun.nanoseconds();
			generateIndex(result);
			indexGenMs = (Bun.nanoseconds() - t) / 1e6;
		}
	}

	// Cleanup
	await Bun.$`rm -rf ${BATCH_DIR}`.quiet();

	return {
		batchStats: computeStats(batchTimes),
		perFileStats: computeStats(perFileTimes),
		indexGenMs,
	};
}

// ─── Hyperfine mode ─────────────────────────────────────────────────────────

async function runHyperfine(): Promise<void> {
	const tmpDir = "/tmp/frontmatter-hyperfine";
	await Bun.$`rm -rf ${tmpDir} && mkdir -p ${tmpDir}`.quiet();

	// Resolve the absolute path to this directory for imports
	const libDir = import.meta.dir;

	// Generate standalone scripts for hyperfine
	const scripts: { name: string; file: string }[] = [];

	const extractYamlScript = `#!/usr/bin/env bun
import { extractFrontmatter } from "${libDir}/extractor";
const md = await Bun.file("${tmpDir}/fixture-yaml.md").text();
for (let i = 0; i < 5000; i++) extractFrontmatter(md);
`;
	await Bun.write(`${tmpDir}/fixture-yaml.md`, YAML_MD);
	await Bun.write(`${tmpDir}/bench-extract-yaml.ts`, extractYamlScript);
	scripts.push({ name: "extract(YAML) x5000", file: `${tmpDir}/bench-extract-yaml.ts` });

	const extractTomlScript = `#!/usr/bin/env bun
import { extractFrontmatter } from "${libDir}/extractor";
const md = await Bun.file("${tmpDir}/fixture-toml.md").text();
for (let i = 0; i < 5000; i++) extractFrontmatter(md);
`;
	await Bun.write(`${tmpDir}/fixture-toml.md`, TOML_MD);
	await Bun.write(`${tmpDir}/bench-extract-toml.ts`, extractTomlScript);
	scripts.push({ name: "extract(TOML) x5000", file: `${tmpDir}/bench-extract-toml.ts` });

	const extractJsonScript = `#!/usr/bin/env bun
import { extractFrontmatter } from "${libDir}/extractor";
const md = await Bun.file("${tmpDir}/fixture-json.md").text();
for (let i = 0; i < 5000; i++) extractFrontmatter(md);
`;
	await Bun.write(`${tmpDir}/fixture-json.md`, JSON_MD);
	await Bun.write(`${tmpDir}/bench-extract-json.ts`, extractJsonScript);
	scripts.push({ name: "extract(JSON) x5000", file: `${tmpDir}/bench-extract-json.ts` });

	const pipelineScript = `#!/usr/bin/env bun
import { extractFrontmatter } from "${libDir}/extractor";
import { normalizeFrontmatter } from "${libDir}/normalizer";
import { validateFrontmatter } from "${libDir}/validator";
const schema = {
  title: { type: "string", required: true, min: 5, max: 200 },
  date: { type: "string", required: true },
  tags: { type: "array", min: 1 },
  draft: "boolean",
  slug: { type: "string", pattern: /^[a-z0-9-]+$/ },
};
const md = await Bun.file("${tmpDir}/fixture-yaml.md").text();
for (let i = 0; i < 2000; i++) {
  const ex = extractFrontmatter(md);
  const n = normalizeFrontmatter(ex.data, { seoMapping: true });
  validateFrontmatter(n, schema);
}
`;
	await Bun.write(`${tmpDir}/bench-pipeline.ts`, pipelineScript);
	scripts.push({ name: "pipeline x2000", file: `${tmpDir}/bench-pipeline.ts` });

	const renderScript = `#!/usr/bin/env bun
import { extractFrontmatter } from "${libDir}/extractor";
import { normalizeFrontmatter } from "${libDir}/normalizer";
import { injectIntoHtml } from "${libDir}/inject";
const md = await Bun.file("${tmpDir}/fixture-yaml.md").text();
for (let i = 0; i < 500; i++) {
  const ex = extractFrontmatter(md);
  const n = normalizeFrontmatter(ex.data, { seoMapping: true });
  const html = Bun.markdown.html(ex.content);
  injectIntoHtml("<html><head></head><body>" + html + "</body></html>", n, {
    modes: ["meta", "opengraph", "jsonld"],
  });
}
`;
	await Bun.write(`${tmpDir}/bench-render.ts`, renderScript);
	scripts.push({ name: "render x500", file: `${tmpDir}/bench-render.ts` });

	// Setup batch directory for batch benchmark
	await setupBatchDir();
	const batchScript = `#!/usr/bin/env bun
import { batchExtractFrontmatter } from "${libDir}/batch";
const schema = {
  title: { type: "string", required: true, min: 5, max: 200 },
  date: { type: "string", required: true },
  tags: { type: "array", min: 1 },
  draft: "boolean",
  slug: { type: "string", pattern: /^[a-z0-9-]+$/ },
};
await batchExtractFrontmatter("${BATCH_DIR}", { schema });
`;
	await Bun.write(`${tmpDir}/bench-batch.ts`, batchScript);
	scripts.push({ name: "batch(100 files)", file: `${tmpDir}/bench-batch.ts` });

	const jsonFile = `${tmpDir}/hyperfine-results.json`;

	// Build hyperfine command
	const cmds = scripts.map((s) => `bun ${s.file}`);
	const names = scripts.map((s) => s.name);

	const hfArgs = [
		"hyperfine",
		"--warmup",
		"3",
		"--min-runs",
		"10",
		"--export-json",
		jsonFile,
		"--style",
		"full",
	];
	for (let i = 0; i < cmds.length; i++) {
		hfArgs.push("--command-name", names[i], cmds[i]);
	}

	if (!QUIET) {
		console.log("\nhyperfine: benchmarking frontmatter operations\n");
	}

	const proc = Bun.spawn(hfArgs, {
		stdout: "inherit",
		stderr: "inherit",
	});
	await proc.exited;

	// Parse hyperfine JSON results for summary
	const hfJson = await Bun.file(jsonFile).json();
	const hfResults = hfJson.results as {
		command: string;
		mean: number;
		stddev: number;
		median: number;
		min: number;
		max: number;
		times: number[];
	}[];

	if (!QUIET) {
		console.log("\n\n--- Hyperfine Summary ---\n");
	}

	const summaryRows = hfResults.map((r) => ({
		benchmark: r.command,
		mean: fmtTime(r.mean * 1000),
		median: fmtTime(r.median * 1000),
		stddev: fmtTime(r.stddev * 1000),
		min: fmtTime(r.min * 1000),
		max: fmtTime(r.max * 1000),
		runs: r.times.length,
	}));
	console.log(
		Bun.inspect.table(summaryRows, [
			"benchmark",
			"mean",
			"median",
			"stddev",
			"min",
			"max",
			"runs",
		]),
	);

	// Cleanup
	await Bun.$`rm -rf ${tmpDir} ${BATCH_DIR}`.quiet();
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
	if (HYPERFINE) {
		await runHyperfine();
		return;
	}

	// Run batch benchmark
	const batchResult = await runBatchBench();

	// ─── Results table ────────────────────────────────────────────────────

	const maxOps = Math.max(...benchResults.map((r) => r.opsPerSec));

	const tableRows = benchResults.map((r) => ({
		benchmark: r.name,
		"ops/sec": fmtOps(r.opsPerSec),
		median: fmtTime(r.stats.median),
		mean: fmtTime(r.stats.mean),
		stddev: fmtTime(r.stats.stddev),
		p95: fmtTime(r.stats.p95),
		cv: fmtCv(r.stats.cv),
		throughput: speedBar(r.opsPerSec, maxOps),
	}));

	if (JSON_OUT) {
		const jsonResults = {
			benchmarks: benchResults.map((r) => ({
				name: r.name,
				opsPerSec: r.opsPerSec,
				median: r.stats.median,
				mean: r.stats.mean,
				stddev: r.stats.stddev,
				min: r.stats.min,
				max: r.stats.max,
				p5: r.stats.p5,
				p25: r.stats.p25,
				p75: r.stats.p75,
				p95: r.stats.p95,
				p99: r.stats.p99,
				iqr: r.stats.iqr,
				cv: r.stats.cv,
			})),
			batch: {
				median: batchResult.batchStats.median,
				mean: batchResult.batchStats.mean,
				stddev: batchResult.batchStats.stddev,
				perFile: batchResult.perFileStats.median,
				indexGenMs: batchResult.indexGenMs,
				cv: batchResult.batchStats.cv,
			},
			meta: {
				bun: Bun.version,
				platform: process.platform,
				arch: process.arch,
				timestamp: new Date().toISOString(),
			},
		};
		console.log(JSON.stringify(jsonResults, null, 2));
		return;
	}

	if (!QUIET) {
		console.log("\n--- Frontmatter Benchmark ---\n");
	}

	// Micro-benchmarks table
	console.log(
		Bun.inspect.table(tableRows, [
			"benchmark",
			"ops/sec",
			"median",
			"mean",
			"stddev",
			"p95",
			"cv",
			"throughput",
		]),
	);

	// Batch results table
	const batchRows = [
		{
			metric: `batch(${BATCH_SIZE} files)`,
			median: fmtTime(batchResult.batchStats.median),
			mean: fmtTime(batchResult.batchStats.mean),
			stddev: fmtTime(batchResult.batchStats.stddev),
			min: fmtTime(batchResult.batchStats.min),
			max: fmtTime(batchResult.batchStats.max),
			cv: fmtCv(batchResult.batchStats.cv),
		},
		{
			metric: "per-file",
			median: fmtTime(batchResult.perFileStats.median),
			mean: fmtTime(batchResult.perFileStats.mean),
			stddev: fmtTime(batchResult.perFileStats.stddev),
			min: fmtTime(batchResult.perFileStats.min),
			max: fmtTime(batchResult.perFileStats.max),
			cv: fmtCv(batchResult.perFileStats.cv),
		},
		{
			metric: "index generation",
			median: fmtTime(batchResult.indexGenMs),
			mean: "-",
			stddev: "-",
			min: "-",
			max: "-",
			cv: "-",
		},
	];

	if (!QUIET) {
		console.log("\n--- Batch I/O ---\n");
	}
	console.log(
		Bun.inspect.table(batchRows, [
			"metric",
			"median",
			"mean",
			"stddev",
			"min",
			"max",
			"cv",
		]),
	);

	// ─── Summary ──────────────────────────────────────────────────────────

	if (!QUIET) {
		// Find fastest/slowest extractors
		const extractors = benchResults.filter((r) => r.name.startsWith("extract("));
		const fastest = extractors.reduce((a, b) => (a.opsPerSec > b.opsPerSec ? a : b));
		const slowest = extractors.reduce((a, b) => (a.opsPerSec < b.opsPerSec ? a : b));
		const speedup = fastest.opsPerSec / slowest.opsPerSec;

		const pipeline = benchResults.find((r) => r.name === "full pipeline");
		const render = benchResults.find((r) => r.name === "render pipeline");

		const summaryRows = [
			{
				stat: "fastest extractor",
				value: `${fastest.name} @ ${fmtOps(fastest.opsPerSec)} ops/s`,
			},
			{
				stat: "slowest extractor",
				value: `${slowest.name} @ ${fmtOps(slowest.opsPerSec)} ops/s`,
			},
			{ stat: "extract spread", value: `${speedup.toFixed(1)}x` },
			{
				stat: "pipeline throughput",
				value: pipeline
					? `${fmtOps(pipeline.opsPerSec)} ops/s (${fmtTime(pipeline.stats.median)}/op)`
					: "-",
			},
			{
				stat: "render throughput",
				value: render
					? `${fmtOps(render.opsPerSec)} ops/s (${fmtTime(render.stats.median)}/op)`
					: "-",
			},
			{
				stat: "batch throughput",
				value: `${BATCH_SIZE} files in ${fmtTime(batchResult.batchStats.median)} (${fmtTime(batchResult.perFileStats.median)}/file)`,
			},
			{ stat: "index generation", value: fmtTime(batchResult.indexGenMs) },
		];

		console.log("\n--- Summary ---\n");
		console.log(Bun.inspect.table(summaryRows, ["stat", "value"]));
		console.log(
			`Bun ${Bun.version} | ${process.platform}/${process.arch} | ${new Date().toISOString()}`,
		);
		console.log(
			"hint: run with --hyperfine for process-level benchmarks via hyperfine\n",
		);
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
