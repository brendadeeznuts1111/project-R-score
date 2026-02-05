#!/usr/bin/env bun
/**
 * Validate Pointers — Check URLs and local file paths in project
 *
 * Validates a curated list of URLs and paths used by the scanner and dashboard.
 * Run: bun scripts/validate-pointers.ts
 *      bun scripts/validate-pointers.ts --compare  # Compare with baseline
 *      bun scripts/validate-pointers.ts --save     # Save baseline
 */

import {join} from 'path';

const README_PATH = join(import.meta.dir, '..', 'README.md');
const BASELINE_PATH = join(import.meta.dir, '..', '.validate-pointers-baseline.json');

function extractUrlsFromDoc(content: string): string[] {
	const refs = content.match(/https?:\/\/[^\s)]+/g) || [];
	return [...new Set(refs.map(u => u.replace(/[.,;:!?)]+$/, '')))];
}

const POINTERS = [
	// Bun documentation (dashboard links)
	'https://bun.com/docs',
	'https://bun.com/docs/reference',
	'https://bun.com/docs/pm/bunx',
	'https://bun.com/rss.xml',
	'https://github.com/oven-sh/bun/tree/main/packages/bun-types',
	// Bun utils / API reference
	'https://bun.com/docs/api/utils',
	'https://bun.com/docs/runtime/shell',
	'https://bun.com/docs/runtime/utils#bun-deepequals',
	// Local paths (relative to scanner project root)
	join(import.meta.dir, '..', 'scan.ts'),
	join(import.meta.dir, '..', 'src', 'cli-constants.ts'),
	join(import.meta.dir, '..', '..', 'docs', 'visual', 'dashboard.html'),
];

async function validatePointer(pointer: string): Promise<{status: string; details: string}> {
	try {
		if (pointer.startsWith('http')) {
			const res = await fetch(pointer, {method: 'HEAD'});
			return {status: res.ok ? 'OK' : 'ERROR', details: `Status: ${res.status}`};
		} else {
			const file = Bun.file(pointer);
			const exists = await file.exists();
			return {
				status: exists ? 'OK' : 'MISSING',
				details: exists ? `Size: ${file.size} bytes` : 'File not found',
			};
		}
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return {status: 'ERROR', details: msg};
	}
}

interface ValidationResult {
	pointer: string;
	status: string;
	details: string;
}

function sortResults(results: ValidationResult[]): ValidationResult[] {
	return [...results].sort((a, b) => a.pointer.localeCompare(b.pointer));
}

async function main() {
	const args = process.argv.slice(2);
	const doCompare = args.includes('--compare');
	const doSave = args.includes('--save');

	// Curated pointers + URLs extracted from README.md
	const docFile = Bun.file(README_PATH);
	const docRefs = (await docFile.exists()) ? extractUrlsFromDoc(await docFile.text()) : [];
	const allPointers = [...new Set([...POINTERS, ...docRefs])];

	const results = sortResults(
		await Promise.all(allPointers.map(async p => ({pointer: p, ...(await validatePointer(p))}))),
	);
	console.log(Bun.inspect.table(results, ['pointer', 'status', 'details'], {colors: true}));

	// Compare with baseline using Bun.deepEquals
	if (doCompare) {
		const baselineFile = Bun.file(BASELINE_PATH);
		if (!(await baselineFile.exists())) {
			console.log('\n⚠️  No baseline found. Run with --save to create one.');
			return;
		}
		const baseline = sortResults((await baselineFile.json()) as ValidationResult[]);
		if (Bun.deepEquals(results, baseline)) {
			console.log('\n✅ Results match baseline (Bun.deepEquals)');
		} else {
			console.log('\n❌ Results differ from baseline');
			const byPtr = new Map(baseline.map(r => [r.pointer, r]));
			for (const r of results) {
				const b = byPtr.get(r.pointer);
				if (b?.status !== r.status || b.details !== r.details) {
					console.log(`   ${r.pointer}: ${b ? `${b.status} → ${r.status}` : 'NEW'}`);
				}
			}
		}
	}

	if (doSave) {
		await Bun.write(BASELINE_PATH, JSON.stringify(results, null, 2));
		console.log(`\n💾 Baseline saved to ${BASELINE_PATH}`);
	}
}

main().catch(console.error);
