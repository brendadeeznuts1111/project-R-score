#!/usr/bin/env bun
/**
 * Validate JSON schema + check for 404s in navigation
 *
 * Validates docs.json structure and checks HTTP status codes for documentation pages.
 *
 * Usage:
 *   bun scripts/validate-docs-links.ts [docs.json path]
 *
 * Examples:
 *   # Check all pages
 *   bun scripts/validate-docs-links.ts docs.json
 *
 *   # Check first 10 pages only
 *   CHECK_LIMIT=10 bun scripts/validate-docs-links.ts docs.json
 *
 *   # Use custom base URL
 *   DOCS_BASE_URL=https://bun.com/docs bun scripts/validate-docs-links.ts docs.json
 *
 *   # Quick one-liner equivalent:
 *   bun -e 'const c=await Bun.file("docs.json").json(); const reqs=c.navigation.tabs.flatMap(t=>t.groups?.flatMap(g=>g.pages)||[]); console.table(await Promise.all(reqs.slice(0,10).map(async p=>({path:p,status:(await fetch(`https://bun.com/docs${p}`).catch(()=>({status:0}))).status}))))'
 */

const docsPath = process.argv[2] ?? 'docs.json';
const baseUrl = process.env.DOCS_BASE_URL ?? 'https://bun.com/docs';
const checkLimit = process.env.CHECK_LIMIT ? parseInt(process.env.CHECK_LIMIT) : undefined;
const useHead = process.env.USE_HEAD !== 'false'; // Default to HEAD requests (faster)

interface DocsJson {
	navigation?: {
		tabs?: Array<{
			tab?: string;
			groups?: Array<{
				pages?: string[];
			}>;
		}>;
	};
}

interface LinkResult {
	path: string;
	url: string;
	status: number;
	ok: boolean;
	statusText?: string;
	error?: string;
}

async function validateDocsLinks(): Promise<void> {
	try {
		// Read and parse docs.json
		const file = Bun.file(docsPath);
		if (!(await file.exists())) {
			console.error(`❌ File not found: ${docsPath}`);
			process.exit(1);
		}

		const config = (await file.json()) as DocsJson;

		// Validate JSON schema structure
		if (!config.navigation?.tabs) {
			console.error('❌ Invalid docs.json: missing navigation.tabs');
			process.exit(1);
		}

		// Extract all page paths from navigation
		const pages: string[] = config.navigation.tabs.flatMap(
			tab => tab.groups?.flatMap(group => group.pages ?? []) ?? [],
		);

		console.log(`📄 Found ${pages.length} pages in navigation`);
		console.log(`🔍 Checking links against ${baseUrl}...\n`);

		// Check pages (limit if specified)
		const pagesToCheck: string[] = checkLimit ? pages.slice(0, checkLimit) : pages;
		console.log(`Checking ${pagesToCheck.length} of ${pages.length} pages...\n`);

		const results: LinkResult[] = await Promise.all(
			pagesToCheck.map(async (path: string): Promise<LinkResult> => {
				const url = `${baseUrl}${path}`;
				try {
					const response = await fetch(url, {
						method: useHead ? 'HEAD' : 'GET',
						signal: AbortSignal.timeout(10000), // 10 second timeout
					});
					return {
						path,
						url,
						status: response.status,
						ok: response.ok,
						statusText: response.statusText,
					};
				} catch (error) {
					return {
						path,
						url,
						status: 0,
						ok: false,
						error: error instanceof Error ? error.message : String(error),
					};
				}
			}),
		);

		// Display results
		if (results.length <= 20) {
			console.table(results);
		} else {
			// For large results, show summary table
			const summary = results.map(r => ({
				path: r.path,
				status: r.status,
				ok: r.ok ? '✅' : '❌',
			}));
			console.table(summary);
		}

		// Summary
		const total: number = results.length;
		const ok: number = results.filter(r => r.ok === true).length;
		const broken: LinkResult[] = results.filter(r => r.ok === false);
		const redirects: LinkResult[] = results.filter(r => r.status >= 300 && r.status < 400);

		console.log(`\n📊 Summary:`);
		console.log(`   Total checked: ${total}`);
		console.log(`   ✅ OK (200-299): ${ok}`);
		if (redirects.length > 0) {
			console.log(`   🔄 Redirects (300-399): ${redirects.length}`);
		}
		console.log(`   ❌ Broken: ${broken.length}`);

		if (broken.length > 0) {
			console.log(`\n🔴 Broken links:`);
			console.table(
				broken.map(r => ({
					path: r.path,
					status: r.status.toString(),
					statusText: r.statusText ?? r.error ?? 'Error',
				})),
			);
			process.exit(1);
		} else {
			console.log(`\n✅ All checked links are valid!`);
			if (checkLimit !== undefined && pages.length > checkLimit) {
				console.log(`   Note: Only checked ${checkLimit} of ${pages.length} total pages`);
			}
			process.exit(0);
		}
	} catch (error) {
		console.error('❌ Error:', error instanceof Error ? error.message : String(error));
		process.exit(1);
	}
}

if (import.meta.main) {
	void validateDocsLinks();
}
