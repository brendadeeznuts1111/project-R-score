/**
 * Code discovery and removal-preparation utilities for scan.ts.
 * Groups patterns, marks code for potential removal, and provides CLI audit commands.
 * Does NOT remove any code — only analyzes and reports.
 */

import {readdir} from 'node:fs/promises';
import {join} from 'node:path';

export type ExportMark = 'keep' | 'candidate' | 'verify' | 'none';

export interface ExportInfo {
	name: string;
	type: 'function' | 'const' | 'type' | 'interface' | 'schema';
	used: boolean;
	locations: string[];
	category: string;
	marked: ExportMark;
}

export interface FunctionInfo {
	name: string;
	exported: boolean;
	used: boolean;
	locations: string[];
	line?: number;
}

export interface ConstantInfo {
	name: string;
	exported: boolean;
	used: boolean;
	locations: string[];
	line?: number;
}

const SCANNER_ROOT = join(import.meta.dir, '..');

/** Export manifest: name, type, category, and removal marker. Matches scan.ts exports. */
export const BUN_EXPORT_MANIFEST: Array<{
	name: string;
	type: ExportInfo['type'];
	category: string;
	marked: ExportMark;
}> = [
	// Schemas
	{name: 'ThreatFeedItemSchema', type: 'schema', category: 'Schema', marked: 'verify'},
	{name: 'ThreatFeedSchema', type: 'schema', category: 'Schema', marked: 'verify'},
	{name: 'validateThreatFeed', type: 'function', category: 'Schema', marked: 'verify'},
	{name: 'PackageJsonSchema', type: 'schema', category: 'Schema', marked: 'verify'},
	{name: 'NpmPersonSchema', type: 'schema', category: 'Schema', marked: 'verify'},
	{name: 'NpmDistSchema', type: 'schema', category: 'Schema', marked: 'verify'},
	{name: 'BunInfoResponseSchema', type: 'schema', category: 'Schema', marked: 'keep'},
	{name: 'NpmPackument', type: 'type', category: 'Schema', marked: 'keep'},
	{name: 'NpmPerson', type: 'type', category: 'Schema', marked: 'verify'},
	{name: 'ProjectInfoSchema', type: 'schema', category: 'Schema', marked: 'verify'},
	{name: 'ProjectInfo', type: 'type', category: 'Schema', marked: 'keep'},
	{name: 'XrefEntrySchema', type: 'schema', category: 'Schema', marked: 'verify'},
	{name: 'XrefSnapshotSchema', type: 'schema', category: 'Schema', marked: 'verify'},
	// Utilities
	{name: 'isFeatureFlagActive', type: 'function', category: 'Utility', marked: 'verify'},
	{name: 'classifyEnvFlag', type: 'function', category: 'Utility', marked: 'verify'},
	{name: 'effectiveLinker', type: 'function', category: 'Utility', marked: 'verify'},
	{name: 'shouldWarnMise', type: 'function', category: 'Utility', marked: 'verify'},
	{name: 'parseEnvVar', type: 'function', category: 'Utility', marked: 'verify'},
	{name: 'parseTzFromEnv', type: 'function', category: 'Utility', marked: 'verify'},
	{name: 'semverBumpType', type: 'function', category: 'Utility', marked: 'verify'},
	{name: 'isVulnerable', type: 'function', category: 'Utility', marked: 'verify'},
	{name: 'semverCompare', type: 'function', category: 'Utility', marked: 'verify'},
	{name: 'getGitCommitHash', type: 'function', category: 'Utility', marked: 'verify'},
	{name: 'getGitCommitHashShort', type: 'function', category: 'Utility', marked: 'verify'},
	// Keychain/Secrets
	{name: 'BUN_KEYCHAIN_SERVICE', type: 'const', category: 'Keychain', marked: 'keep'},
	{name: 'BUN_KEYCHAIN_SERVICE_LEGACY', type: 'const', category: 'Keychain', marked: 'verify'},
	{name: 'BUN_KEYCHAIN_TOKEN_NAMES', type: 'const', category: 'Keychain', marked: 'keep'},
	{name: 'isValidTokenName', type: 'function', category: 'Keychain', marked: 'keep'},
	{name: 'validateTokenValue', type: 'function', category: 'Keychain', marked: 'keep'},
	{name: 'tokenValueWarnings', type: 'function', category: 'Keychain', marked: 'verify'},
	{name: 'timeSince', type: 'function', category: 'Keychain', marked: 'verify'},
	{name: 'KeychainErr', type: 'interface', category: 'Keychain', marked: 'keep'},
	{name: 'classifyKeychainError', type: 'function', category: 'Keychain', marked: 'keep'},
	{name: 'keychainGet', type: 'function', category: 'Keychain', marked: 'keep'},
	{name: 'keychainSet', type: 'function', category: 'Keychain', marked: 'keep'},
	{name: 'keychainDelete', type: 'function', category: 'Keychain', marked: 'keep'},
	{name: 'tokenSource', type: 'function', category: 'Keychain', marked: 'keep'},
	// RSS/XML
	{name: 'BUN_TOKEN_AUDIT_RSS_PATH', type: 'const', category: 'RSS', marked: 'verify'},
	{name: 'BUN_SCAN_RESULTS_RSS_PATH', type: 'const', category: 'RSS', marked: 'verify'},
	{name: 'BUN_ADVISORY_MATCHES_PATH', type: 'const', category: 'RSS', marked: 'verify'},
	{name: 'escapeXml', type: 'function', category: 'RSS', marked: 'keep'},
	{name: 'decodeXmlEntities', type: 'function', category: 'RSS', marked: 'keep'},
	{name: 'generateRssXml', type: 'function', category: 'RSS', marked: 'keep'},
	{name: 'parseRssFeed', type: 'function', category: 'RSS', marked: 'keep'},
	// Core
	{name: 'scanProject', type: 'function', category: 'Core', marked: 'keep'},
];

async function collectTsFiles(dir: string, base: string, out: string[]): Promise<void> {
	const entries = await readdir(dir, {withFileTypes: true});
	for (const e of entries) {
		const full = join(dir, e.name);
		const rel = full.slice(base.length + 1).replace(/\\/g, '/');
		if (e.name === 'node_modules' || e.name === 'dist' || e.name === '.git') continue;
		if (e.isDirectory()) {
			await collectTsFiles(full, base, out);
		} else if (e.isFile() && (e.name.endsWith('.ts') || e.name.endsWith('.tsx'))) {
			out.push(rel);
		}
	}
}

/** Find all files that reference `name` as a word (import or usage). Excludes definition in scan.ts. */
export async function findUsage(projectRoot: string, name: string, excludeScanTs = true): Promise<string[]> {
	const files: string[] = [];
	await collectTsFiles(projectRoot, projectRoot, files);
	const locations: string[] = [];
	const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
	for (const rel of files) {
		if (excludeScanTs && (rel === 'scan.ts' || rel === 'src/scan.ts')) continue;
		const path = join(projectRoot, rel);
		try {
			const text = await Bun.file(path).text();
			if (re.test(text)) locations.push(rel);
		} catch {
			// skip unreadable
		}
	}
	return locations;
}

export async function auditExports(projectRoot: string = SCANNER_ROOT): Promise<ExportInfo[]> {
	const results: ExportInfo[] = [];
	for (const entry of BUN_EXPORT_MANIFEST) {
		const locations = await findUsage(projectRoot, entry.name);
		results.push({
			name: entry.name,
			type: entry.type,
			used: locations.length > 0,
			locations,
			category: entry.category,
			marked: entry.marked,
		});
	}
	return results;
}

/** Extract function names from scan.ts source (function name() or export function name()). */
function extractFunctionNames(source: string): Array<{name: string; exported: boolean; line: number}> {
	const out: Array<{name: string; exported: boolean; line: number}> = [];
	const lines = source.split('\n');
	const reExport = /^\s*export\s+(async\s+)?function\s+(\w+)\s*\(/;
	const reInternal = /^\s*function\s+(\w+)\s*\(/;
	for (let i = 0; i < lines.length; i++) {
		const mExport = lines[i].match(reExport);
		const mInternal = lines[i].match(reInternal);
		if (mExport) out.push({name: mExport[2], exported: true, line: i + 1});
		else if (mInternal) out.push({name: mInternal[1], exported: false, line: i + 1});
	}
	return out;
}

/** Extract const names from scan.ts (const NAME = or export const NAME =). */
function extractConstantNames(source: string): Array<{name: string; exported: boolean; line: number}> {
	const out: Array<{name: string; exported: boolean; line: number}> = [];
	const lines = source.split('\n');
	const reExport = /^\s*export\s+const\s+([A-Za-z_][A-Za-z0-9_]*)\s*[=:]/;
	const reInternal = /^\s*const\s+([A-Za-z_][A-Za-z0-9_]*)\s*[=:]/;
	for (let i = 0; i < lines.length; i++) {
		const mExport = lines[i].match(reExport);
		const mInternal = lines[i].match(reInternal);
		if (mExport) out.push({name: mExport[1], exported: true, line: i + 1});
		else if (mInternal) out.push({name: mInternal[1], exported: false, line: i + 1});
	}
	return out;
}

export async function auditFunctions(projectRoot: string = SCANNER_ROOT): Promise<FunctionInfo[]> {
	const scanPath = join(projectRoot, 'scan.ts');
	const source = await Bun.file(scanPath).text();
	const fns = extractFunctionNames(source);
	const results: FunctionInfo[] = [];
	for (const fn of fns) {
		const locations = await findUsage(projectRoot, fn.name);
		// Definition in scan.ts counts as one use; if only definition, consider "used" internally
		const used = locations.length > 0 || !fn.exported;
		results.push({
			name: fn.name,
			exported: fn.exported,
			used,
			locations,
			line: fn.line,
		});
	}
	return results;
}

export async function auditConstants(projectRoot: string = SCANNER_ROOT): Promise<ConstantInfo[]> {
	const scanPath = join(projectRoot, 'scan.ts');
	const source = await Bun.file(scanPath).text();
	const consts = extractConstantNames(source);
	const results: ConstantInfo[] = [];
	for (const c of consts) {
		const locations = await findUsage(projectRoot, c.name);
		const used = locations.length > 0 || !c.exported;
		results.push({
			name: c.name,
			exported: c.exported,
			used,
			locations,
			line: c.line,
		});
	}
	return results;
}

export interface CodeStats {
	totalLines: number;
	exports: {total: number; byCategory: Record<string, number>; byMark: Record<string, number>};
	functions: {total: number; internal: number; exported: number; unused: number};
	constants: {total: number; upperCase: number; regular: number; unused: number};
	markedForRemoval: {exports: number; functions: number; constants: number};
}

export async function showCodeStats(projectRoot: string = SCANNER_ROOT): Promise<CodeStats> {
	const scanPath = join(projectRoot, 'scan.ts');
	const source = await Bun.file(scanPath).text();
	const lines = source.split('\n');

	const exports = await auditExports(projectRoot);
	const byCategory: Record<string, number> = {};
	const byMark: Record<string, number> = {};
	for (const e of exports) {
		byCategory[e.category] = (byCategory[e.category] ?? 0) + 1;
		byMark[e.marked] = (byMark[e.marked] ?? 0) + 1;
	}

	const fns = await auditFunctions(projectRoot);
	const internal = fns.filter(f => !f.exported).length;
	const exported = fns.filter(f => f.exported).length;
	const unusedFns = fns.filter(f => !f.used).length;

	const consts = await auditConstants(projectRoot);
	const upperCase = consts.filter(c => /^[A-Z_][A-Z0-9_]*$/.test(c.name)).length;
	const regular = consts.length - upperCase;
	const unusedConsts = consts.filter(c => !c.used).length;

	const candidateExports = exports.filter(e => e.marked === 'candidate').length;

	return {
		totalLines: lines.length,
		exports: {
			total: exports.length,
			byCategory,
			byMark,
		},
		functions: {
			total: fns.length,
			internal,
			exported,
			unused: unusedFns,
		},
		constants: {
			total: consts.length,
			upperCase,
			regular,
			unused: unusedConsts,
		},
		markedForRemoval: {
			exports: candidateExports,
			functions: unusedFns,
			constants: unusedConsts,
		},
	};
}

/** List exports that have [REMOVAL-CANDIDATE] or [VERIFY] markers (from BUN_EXPORT_MANIFEST). */
export function listMarkedExports(): Array<{name: string; type: string; category: string; marked: ExportMark}> {
	return BUN_EXPORT_MANIFEST.filter(e => e.marked === 'candidate' || e.marked === 'verify').map(e => ({
		name: e.name,
		type: e.type,
		category: e.category,
		marked: e.marked,
	}));
}
