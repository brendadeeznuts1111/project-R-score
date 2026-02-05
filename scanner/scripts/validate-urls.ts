#!/usr/bin/env bun
/**
 * URL and Link Validation Script
 *
 * Validates all external URLs and links in the project to ensure they're
 * correctly pointing and accessible.
 */

import {readdir, readFile} from 'node:fs/promises';
import {join} from 'node:path';

interface ValidationResult {
	url: string;
	status: number;
	ok: boolean;
	error?: string;
}

async function checkUrl(url: string): Promise<ValidationResult> {
	try {
		const response = await fetch(url, {method: 'HEAD'});
		return {
			url,
			status: response.status,
			ok: response.ok,
		};
	} catch (error) {
		return {
			url,
			status: 0,
			ok: false,
			error: error instanceof Error ? error.message : 'Unknown error',
		};
	}
}

async function extractUrlsFromFile(filePath: string): Promise<string[]> {
	try {
		const content = await readFile(filePath, 'utf-8');

		// Extract HTTP/HTTPS URLs
		const urlRegex = /https?:\/\/[^\s\)"'\}>]+/g;
		const matches = content.match(urlRegex) || [];

		// Filter out common false positives and deduplicate
		return [
			...new Set(
				matches.filter(
					url =>
						!url.includes('example.com') &&
						!url.includes('localhost') &&
						!url.includes('127.0.0.1') &&
						!url.endsWith('.git') &&
						!url.includes('json.schemastore.org'), // Schema URLs are expected to work
				),
			),
		];
	} catch (error) {
		console.error(`Error reading ${filePath}:`, error);
		return [];
	}
}

async function findFilesToScan(dir: string, extensions: string[] = ['.ts', '.md', '.js', '.json']): Promise<string[]> {
	const files: string[] = [];

	async function scanDirectory(currentDir: string) {
		const entries = await readdir(currentDir, {withFileTypes: true});

		for (const entry of entries) {
			const fullPath = join(currentDir, entry.name);

			if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
				await scanDirectory(fullPath);
			} else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
				files.push(fullPath);
			}
		}
	}

	await scanDirectory(dir);
	return files;
}

async function main() {
	console.log('🔍 URL and Link Validation for Bun MCP Project\n');

	const filesToScan = await findFilesToScan(process.cwd(), ['.ts', '.md', '.js']);
	console.log(`📁 Scanning ${filesToScan.length} files...\n`);

	const allUrls = new Map<string, string[]>(); // url -> [files]

	// Extract URLs from all files
	for (const file of filesToScan) {
		const urls = await extractUrlsFromFile(file);
		for (const url of urls) {
			if (!allUrls.has(url)) {
				allUrls.set(url, []);
			}
			allUrls.get(url)!.push(file);
		}
	}

	console.log(`🔗 Found ${allUrls.size} unique URLs to validate\n`);

	// Check URLs
	const results: ValidationResult[] = [];
	for (const [url] of allUrls) {
		process.stdout.write(`Checking: ${url}... `);
		const result = await checkUrl(url);
		results.push(result);

		if (result.ok) {
			console.log(`✅ ${result.status}`);
		} else {
			console.log(`❌ ${result.status}${result.error ? ` (${result.error})` : ''}`);
		}
	}

	// Summary
	const okUrls = results.filter(r => r.ok);
	const badUrls = results.filter(r => !r.ok);

	console.log('\n📊 Validation Summary:');
	console.log(`   Total URLs: ${results.length}`);
	console.log(`   ✅ Valid: ${okUrls.length}`);
	console.log(`   ❌ Invalid: ${badUrls.length}`);

	if (badUrls.length > 0) {
		console.log('\n❌ Invalid URLs:');
		for (const bad of badUrls) {
			const files = allUrls.get(bad.url) || [];
			console.log(`   ${bad.url} (${bad.status})`);
			console.log(`      Found in: ${files.map(f => f.replace(process.cwd(), '.')).join(', ')}`);
		}
	}

	// Check for important Bun.com URLs specifically
	const bunUrls = results.filter(r => r.url.includes('bun.com'));
	const bunOk = bunUrls.filter(r => r.ok);

	console.log('\n🍔 Bun.com URLs:');
	console.log(`   Total: ${bunUrls.length}`);
	console.log(`   ✅ Valid: ${bunOk.length}`);
	console.log(`   ❌ Invalid: ${bunUrls.length - bunOk.length}`);

	if (bunUrls.length - bunOk.length > 0) {
		console.log('\n❌ Invalid Bun.com URLs:');
		for (const bad of bunUrls.filter(r => !r.ok)) {
			console.log(`   ${bad.url} (${bad.status})`);
		}
	}

	process.exit(badUrls.length > 0 ? 1 : 0);
}

if (import.meta.path === Bun.main) {
	main().catch(console.error);
}
