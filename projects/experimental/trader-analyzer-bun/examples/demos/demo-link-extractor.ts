#!/usr/bin/env bun
/**
 * @fileoverview HTML Link Extractor Demo
 * @description Demonstrates extracting links from HTML using HTMLRewriter
 * @module examples/demos/demo-link-extractor
 * 
 * @see https://bun.sh/docs/guides/html-rewriter/extract-links
 */

import {
	extractLinks,
	extractLinksSync,
	extractDomains,
	groupLinksByDomain,
	type ExtractedLink,
} from "../../src/utils/html-link-extractor";

const HTML_EXAMPLE = `
<!DOCTYPE html>
<html>
<head>
	<title>Example Page</title>
</head>
<body>
	<h1>Welcome</h1>
	<p>Check out these links:</p>
	<ul>
		<li><a href="https://example.com">Example Site</a></li>
		<li><a href="https://bun.sh" title="Bun Runtime">Bun</a></li>
		<li><a href="/about">About Us</a></li>
		<li><a href="#section1">Section 1</a></li>
		<li><a href="mailto:contact@example.com">Contact</a></li>
		<li><a href="tel:+1234567890">Call Us</a></li>
		<li><a href="https://github.com" rel="nofollow">GitHub</a></li>
		<li><a href="https://example.com/page" target="_blank">New Tab</a></li>
	</ul>
</body>
</html>
`;

async function main() {
	console.log("🔗 HTML Link Extractor Demo\n");
	console.log("=" .repeat(60));

	// Demo 1: Extract all links
	console.log("\n1. Extract All Links:");
	console.log("-".repeat(60));
	const allLinks = extractLinksSync(HTML_EXAMPLE);
	console.log(`Found ${allLinks.length} links:`);
	allLinks.forEach((link, i) => {
		console.log(`  ${i + 1}. ${link.url}`);
		console.log(`     Text: "${link.text}"`);
		console.log(`     External: ${link.isExternal}`);
		if (link.title) console.log(`     Title: ${link.title}`);
		if (link.target) console.log(`     Target: ${link.target}`);
		if (link.rel) console.log(`     Rel: ${link.rel}`);
	});

	// Demo 2: Extract only external links
	console.log("\n2. Extract Only External Links:");
	console.log("-".repeat(60));
	const externalLinks = extractLinksSync(HTML_EXAMPLE, { externalOnly: true });
	console.log(`Found ${externalLinks.length} external links:`);
	externalLinks.forEach((link, i) => {
		console.log(`  ${i + 1}. ${link.url} - "${link.text}"`);
	});

	// Demo 3: Extract only internal links
	console.log("\n3. Extract Only Internal Links:");
	console.log("-".repeat(60));
	const internalLinks = extractLinksSync(HTML_EXAMPLE, { internalOnly: true });
	console.log(`Found ${internalLinks.length} internal links:`);
	internalLinks.forEach((link, i) => {
		console.log(`  ${i + 1}. ${link.url} - "${link.text}"`);
	});

	// Demo 4: Filter by URL pattern
	console.log("\n4. Filter Links by Pattern (example.com):");
	console.log("-".repeat(60));
	const filteredLinks = extractLinksSync(HTML_EXAMPLE, {
		urlPattern: /example\.com/i,
	});
	console.log(`Found ${filteredLinks.length} matching links:`);
	filteredLinks.forEach((link, i) => {
		console.log(`  ${i + 1}. ${link.url} - "${link.text}"`);
	});

	// Demo 5: Extract domains
	console.log("\n5. Extract Unique Domains:");
	console.log("-".repeat(60));
	const domains = extractDomains(allLinks);
	console.log(`Found ${domains.size} unique domains:`);
	Array.from(domains).forEach((domain, i) => {
		console.log(`  ${i + 1}. ${domain}`);
	});

	// Demo 6: Group links by domain
	console.log("\n6. Group Links by Domain:");
	console.log("-".repeat(60));
	const grouped = groupLinksByDomain(allLinks);
	for (const [domain, links] of grouped.entries()) {
		console.log(`\n  ${domain}:`);
		links.forEach((link) => {
			console.log(`    - ${link.url} - "${link.text}"`);
		});
	}

	// Demo 7: Extract from Response
	console.log("\n7. Extract Links from Response:");
	console.log("-".repeat(60));
	const response = new Response(HTML_EXAMPLE, {
		headers: { "Content-Type": "text/html" },
	});
	const responseLinks = await extractLinks(response);
	console.log(`Found ${responseLinks.length} links from Response`);

	// Demo 8: Limit number of links
	console.log("\n8. Limit Number of Links (max 3):");
	console.log("-".repeat(60));
	const limitedLinks = extractLinksSync(HTML_EXAMPLE, { maxLinks: 3 });
	console.log(`Found ${limitedLinks.length} links (limited to 3):`);
	limitedLinks.forEach((link, i) => {
		console.log(`  ${i + 1}. ${link.url} - "${link.text}"`);
	});

	console.log("\n" + "=".repeat(60));
	console.log("✅ Demo complete!");
}

if (import.meta.main) {
	main().catch(console.error);
}
