#!/usr/bin/env bun
/**
 * migrate-python-to-bun.ts
 *
 * Removes all Python references from the codebase and replaces them
 * with Bun/TypeScript equivalents:
 *
 *   1. LSP orchestrator  — drop pylsp entry
 *   2. UI components     — replace Python labels with Bun-native labels
 *   3. Algorithm sample  — rewrite Python pseudocode as TypeScript
 *   4. Full-repo scan    — report any remaining "python" references
 *
 * Usage:
 *   bun run migrate:python            # apply changes
 *   bun run migrate:python --dry-run  # preview only
 */

const ROOT = import.meta.dir + '/..';
const DRY_RUN = Bun.argv.includes('--dry-run');

let changed = 0;
let skipped = 0;

// ── Helpers ─────────────────────────────────────────────────────────

async function patch(
	filePath: string,
	description: string,
	replacements: [old: string, replacement: string][],
): Promise<boolean> {
	const abs = `${ROOT}/${filePath}`;
	const file = Bun.file(abs);
	if (!(await file.exists())) {
		console.log(`  SKIP  ${filePath} (not found)`);
		skipped++;
		return false;
	}

	let content = await file.text();
	let touched = false;

	for (const [old, replacement] of replacements) {
		if (!content.includes(old)) continue;
		content = content.replace(old, replacement);
		touched = true;
	}

	if (!touched) {
		console.log(`  SKIP  ${filePath} (already migrated)`);
		skipped++;
		return false;
	}

	if (DRY_RUN) {
		console.log(`  WOULD ${description}`);
		console.log(`         ${filePath}`);
	} else {
		await Bun.write(abs, content);
		console.log(`  DONE  ${description}`);
		console.log(`         ${filePath}`);
	}
	changed++;
	return true;
}

// ── 1. LSP Orchestrator — remove pylsp ──────────────────────────────

console.log('\n1. LSP Orchestrator');

const LSP_FILES = ['packages/core/src/control/lsp-orchestrator.ts'];

for (const f of LSP_FILES) {
	await patch(f, 'Remove python/pylsp entry from language server map', [
		["      python: { command: 'pylsp' },\n", ''],
	]);
}

// ── 2. UI Components — replace Python labels ────────────────────────

console.log('\n2. UI Components');

const PKG_CLI_FILES = [
	'components/PackageManagerCLI.tsx',
	'dashboard/src/components/PackageManagerCLI.tsx',
];

for (const f of PKG_CLI_FILES) {
	await patch(f, 'Replace "No Python Dep" badge with "Bun Native"', [
		['{"No Python Dep"}', '{"Bun Native"}'],
	]);
}

// ── 3. PatternDetector — rewrite Python algorithm as TypeScript ──────

console.log('\n3. Pattern Detector Algorithm');

const TS_CODE = `function detectPattern17(volumeSeries: number[], priceSeries: number[], T: number) {
  // 1. Fit AC trajectory
  const { kappa, xEst } = fitAlmgrenChriss(volumeSeries, T);

  // 2. Calculate metrics
  const frontRatio = cumulativeVolume(0, T / 3) / totalVolume;
  const impactAsym = priceChange(0, 1) / totalPriceChange;

  // 3. Statistical tests
  const residuals = volumeSeries.map((v, i) => v - acPrediction[i]);
  const ljungBox = testWhiteNoise(residuals);
  const adf = testStationarity(priceSeriesAfterInit);

  // 4. Pattern scoring
  const score =
    +(kappa > 1.2) * 0.3 +
    +(frontRatio > 0.65) * 0.25 +
    +(impactAsym > 0.7) * 0.2 +
    +(ljungBox.p > 0.05) * 0.15 +
    +(adf.p < 0.05) * 0.1;

  return { detected: score > 0.7, kappa, frontRatio };
}`;

const PATTERN_FILES = [
	'components/PatternDetector.tsx',
	'dashboard/src/components/PatternDetector.tsx',
];

for (const f of PATTERN_FILES) {
	// 3a. Replace label
	await patch(f, 'Replace "Python / NumPy" label with "Bun / TypeScript"', [
		['>Python / NumPy<', '>Bun / TypeScript<'],
	]);

	// 3b. Replace code block via regex
	const abs = `${ROOT}/${f}`;
	const file = Bun.file(abs);
	if (!(await file.exists())) continue;
	let content = await file.text();
	const codeRe = /<pre>\{`def detect_pattern_17[\s\S]*?`\}<\/pre>/;
	if (codeRe.test(content)) {
		content = content.replace(codeRe, `<pre>{\`${TS_CODE}\`}</pre>`);
		if (!DRY_RUN) {
			await Bun.write(abs, content);
			console.log(`  DONE  Rewrite detection algorithm to TypeScript`);
		} else {
			console.log(`  WOULD Rewrite detection algorithm to TypeScript`);
		}
		console.log(`         ${f}`);
		changed++;
	}
}

// ── 4. Multi-project audit ───────────────────────────────────────────

console.log('\n4. Auditing all projects for Python references...\n');

const PROJECTS_ROOT = `${ROOT}/..`;
const IGNORE_PATTERNS = [
	'/node_modules/',
	'/.bun/',
	'/.git/',
	'/$HOME/',
	'/bun.lock',
	'/.cache/',
	'/dist/',
	'/build/',
	'/.next/',
];
const EXTENSIONS = [
	'*.ts',
	'*.tsx',
	'*.json',
	'*.yml',
	'*.yaml',
	'*.md',
	'*.mjs',
	'*.sh',
	'*.toml',
];

type HitCategory = 'type' | 'package' | 'code' | 'config' | 'docs';

interface Hit {
	project: string;
	folder: string;
	file: string;
	line: number;
	text: string;
	category: HitCategory;
}

function categorize(filePath: string, lineText: string): HitCategory {
	const lower = lineText.toLowerCase();
	// Type definitions: import type, type alias, interface with python
	if (/\b(type|interface|declare)\b/.test(lower) && /python/i.test(lower)) return 'type';
	// Package refs: dependencies, devDependencies, require, import
	if (
		/(dependencies|"python|'python|require\(|from\s+['"])/.test(lower) ||
		/^\s*"[^"]*python[^"]*"\s*:/.test(lower)
	)
		return 'package';
	// Docs: markdown, comments, jsdoc
	if (filePath.endsWith('.md') || /^\s*(\/\/|\/\*|\*|#)/.test(lineText)) return 'docs';
	// Config: json, yaml, toml, rc files
	if (/\.(json|ya?ml|toml|mjs)$/.test(filePath)) return 'config';
	return 'code';
}

const dirs = await Array.fromAsync(
	new Bun.Glob('*/').scanSync({ cwd: PROJECTS_ROOT, onlyFiles: false }),
);

const allHits: Hit[] = [];

for (const dir of dirs.sort()) {
	const projectPath = `${PROJECTS_ROOT}/${dir}`;
	const proc = Bun.spawn(
		['grep', '-rni', ...EXTENSIONS.flatMap((e) => ['--include', e]), 'python', projectPath],
		{ stdout: 'pipe', stderr: 'pipe' },
	);
	const output = await new Response(proc.stdout).text();
	const lines = output
		.split('\n')
		.filter(Boolean)
		.filter((l) => !IGNORE_PATTERNS.some((p) => l.includes(p)));

	for (const line of lines) {
		// format: /absolute/path/to/file:linenum:text
		const match = line.match(/^(.+?):(\d+):(.*)$/);
		if (!match) continue;
		const [, absPath, lineNum, text] = match;
		const relPath = absPath.replace(PROJECTS_ROOT + '/', '');
		const project = relPath.split('/')[0];
		const folder = relPath.split('/').slice(1, -1).join('/') || '.';
		const file = relPath.split('/').pop()!;
		allHits.push({
			project,
			folder,
			file,
			line: Number(lineNum),
			text: text.trim(),
			category: categorize(absPath, text),
		});
	}
}

// ── Breakdown ────────────────────────────────────────────────────────

const byProject = new Map<string, Hit[]>();
for (const h of allHits) {
	if (!byProject.has(h.project)) byProject.set(h.project, []);
	byProject.get(h.project)!.push(h);
}

const CATEGORY_LABEL: Record<HitCategory, string> = {
	type: 'Types',
	package: 'Packages',
	code: 'Code',
	config: 'Config',
	docs: 'Docs',
};

let totalProjects = 0;
let totalFiles = 0;
let totalLines = 0;

for (const [project, hits] of [...byProject.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
	totalProjects++;
	const uniqueFiles = new Set(hits.map((h) => `${h.folder}/${h.file}`));
	const uniqueFolders = new Set(hits.map((h) => h.folder));
	totalFiles += uniqueFiles.size;
	totalLines += hits.length;

	console.log(`  ${project}/`);
	console.log(`    ${hits.length} line(s) across ${uniqueFiles.size} file(s) in ${uniqueFolders.size} folder(s)`);

	// Category breakdown
	const byCat = new Map<HitCategory, Hit[]>();
	for (const h of hits) {
		if (!byCat.has(h.category)) byCat.set(h.category, []);
		byCat.get(h.category)!.push(h);
	}
	for (const cat of ['type', 'package', 'code', 'config', 'docs'] as HitCategory[]) {
		const catHits = byCat.get(cat);
		if (!catHits) continue;
		const catFiles = new Set(catHits.map((h) => `${h.folder}/${h.file}`));
		console.log(`      ${CATEGORY_LABEL[cat]}: ${catHits.length} line(s) in ${catFiles.size} file(s)`);
		for (const h of catHits.slice(0, 3)) {
			const loc = h.folder === '.' ? h.file : `${h.folder}/${h.file}`;
			console.log(`        ${loc}:${h.line}  ${h.text.slice(0, 80)}`);
		}
		if (catHits.length > 3) {
			console.log(`        ... and ${catHits.length - 3} more`);
		}
	}
	console.log('');
}

// ── Totals ───────────────────────────────────────────────────────────

console.log('  Audit totals');
console.log(`    Projects : ${totalProjects}`);
console.log(`    Folders  : ${new Set(allHits.map((h) => `${h.project}/${h.folder}`)).size}`);
console.log(`    Files    : ${totalFiles}`);
console.log(`    Lines    : ${totalLines}`);
const typeCt = allHits.filter((h) => h.category === 'type').length;
const pkgCt = allHits.filter((h) => h.category === 'package').length;
const codeCt = allHits.filter((h) => h.category === 'code').length;
const cfgCt = allHits.filter((h) => h.category === 'config').length;
const docCt = allHits.filter((h) => h.category === 'docs').length;
console.log(`    Types    : ${typeCt}`);
console.log(`    Packages : ${pkgCt}`);
console.log(`    Code     : ${codeCt}`);
console.log(`    Config   : ${cfgCt}`);
console.log(`    Docs     : ${docCt}`);

if (totalLines === 0) {
	console.log('\n  No Python references found across any project.');
}

// ── Summary ─────────────────────────────────────────────────────────

console.log(`\n${DRY_RUN ? 'DRY RUN ' : ''}Migration: ${changed} file(s) patched, ${skipped} skipped`);
console.log(`Audit: ${totalLines} Python reference(s) across ${totalProjects} project(s), ${totalFiles} file(s)`);
if (DRY_RUN) {
	console.log('Re-run without --dry-run to apply changes.\n');
}
