#!/usr/bin/env bun
/**
 * Index Bun documentation topics from docs.json.
 * Produces precise counts by tab, group, and page—no approximations.
 *
 * Usage: bun scripts/index-docs-topics.ts [path-to-docs.json]
 * Example: bun scripts/index-docs-topics.ts matrix-analysis/mcp-bun-docs/docs.json
 */

import {resolve} from 'path';

const BUN_DOCS_BASE = 'https://bun.com/docs';

interface DocsJson {
	navigation?: {
		tabs?: Array<{
			tab: string;
			icon?: string;
			href?: string;
			groups?: Array<{
				group: string;
				icon?: string;
				expanded?: boolean;
				pages?: string[];
			}>;
			pages?: string[];
		}>;
	};
}

interface IndexedPage {
	path: string;
	url: string;
	tab: string;
	group: string;
	tabIdx: number;
	groupIdx: number;
}

interface IndexStats {
	totalEntries: number;
	uniquePages: number;
	tabCount: number;
	groupCount: number;
	tabsWithGroups: number;
}

async function indexDocs(docsPath: string): Promise<{
	entries: IndexedPage[];
	byTab: Map<string, IndexedPage[]>;
	byGroup: Map<string, IndexedPage[]>;
	uniquePaths: Set<string>;
	stats: IndexStats;
}> {
	const raw = Bun.file(resolve(docsPath));
	if (!(await raw.exists())) {
		throw new Error(`docs.json not found: ${docsPath}`);
	}

	const doc = (await raw.json()) as DocsJson;
	const tabs = doc.navigation?.tabs ?? [];

	const entries: IndexedPage[] = [];
	const uniquePaths = new Set<string>();

	for (const [tabIdx, tab] of tabs.entries()) {
		// External tabs (href only) have no groups
		if (tab.href) {
			continue;
		}

		const groups = tab.groups ?? [];
		const pages = tab.pages ?? [];

		// Groups
		for (const [groupIdx, group] of groups.entries()) {
			const groupPages = group.pages ?? [];
			for (const path of groupPages) {
				const url = path.startsWith('http') ? path : `${BUN_DOCS_BASE}${path}`;
				entries.push({
					path,
					url,
					tab: tab.tab,
					group: group.group,
					tabIdx,
					groupIdx,
				});
				uniquePaths.add(path);
			}
		}

		// Top-level pages (e.g. Feedback)
		if (pages.length > 0 && groups.length === 0) {
			for (const path of pages) {
				const url = path.startsWith('http') ? path : `${BUN_DOCS_BASE}${path}`;
				entries.push({
					path,
					url,
					tab: tab.tab,
					group: '(root)',
					tabIdx,
					groupIdx: -1,
				});
				uniquePaths.add(path);
			}
		}
	}

	const byTab = new Map<string, IndexedPage[]>();
	const byGroup = new Map<string, IndexedPage[]>();

	for (const e of entries) {
		const tabKey = e.tab;
		if (!byTab.has(tabKey)) byTab.set(tabKey, []);
		const tabPages = byTab.get(tabKey);
		if (tabPages) tabPages.push(e);

		const groupKey = `${e.tab} › ${e.group}`;
		if (!byGroup.has(groupKey)) byGroup.set(groupKey, []);
		const groupPages = byGroup.get(groupKey);
		if (groupPages) groupPages.push(e);
	}

	const tabsWithGroups = tabs.filter(t => !t.href && (t.groups?.length ?? 0) > 0).length;
	const groupCount = new Set(entries.map(e => `${e.tab} › ${e.group}`)).size;

	return {
		entries,
		byTab,
		byGroup,
		uniquePaths,
		stats: {
			totalEntries: entries.length,
			uniquePages: uniquePaths.size,
			tabCount: tabs.length,
			groupCount,
			tabsWithGroups,
		},
	};
}

async function main(): Promise<void> {
	const docsPath = process.argv[2] ?? resolve(import.meta.dir, '../../matrix-analysis/mcp-bun-docs/docs.json');

	const idx = await indexDocs(docsPath);

	console.log('=== Bun documentation topics index ===\n');
	console.log('Source:', docsPath);
	console.log('\nStats:');
	console.log('  Total navigation entries:', idx.stats.totalEntries);
	console.log('  Unique pages:', idx.stats.uniquePages);
	console.log('  Tabs (including external):', idx.stats.tabCount);
	console.log('  Unique tab+group combinations:', idx.stats.groupCount);

	console.log('\n--- Topics by tab ---\n');

	for (const [tab, pages] of idx.byTab.entries()) {
		const groups = [...new Set(pages.map(p => p.group))];
		const uniqueInTab = new Set(pages.map(p => p.path)).size;
		console.log(`${tab}`);
		console.log(`  Entries: ${pages.length}, Unique pages: ${uniqueInTab}`);
		console.log(`  Groups: ${groups.length}`);
		for (const g of groups) {
			const groupPages = pages.filter(p => p.group === g);
			const paths = [...new Set(groupPages.map(p => p.path))];
			console.log(`    - ${g}: ${paths.length} pages`);
		}
		console.log('');
	}

	console.log('--- Full group index (tab › group → page count) ---\n');

	const rows: {tab: string; group: string; count: number; unique: number}[] = [];
	for (const [key, pages] of idx.byGroup.entries()) {
		const [tab, group] = key.split(' › ');
		const unique = new Set(pages.map(p => p.path)).size;
		rows.push({tab, group, count: pages.length, unique});
	}

	rows.sort((a, b) => (a.tab !== b.tab ? a.tab.localeCompare(b.tab) : a.group.localeCompare(b.group)));

	for (const r of rows) {
		const dup = r.count !== r.unique ? ` (${r.count - r.unique} dup)` : '';
		console.log(`${r.tab} › ${r.group}: ${r.unique} pages${dup}`);
	}

	console.log('\n--- All unique page paths (' + idx.uniquePaths.size + ') ---\n');
	const sortedPaths = [...idx.uniquePaths].sort();
	for (const p of sortedPaths) {
		console.log(p);
	}
}

void main();
