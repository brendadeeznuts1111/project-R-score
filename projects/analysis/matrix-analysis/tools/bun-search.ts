#!/usr/bin/env bun

/**
 * Bun Package Search Tool
 * Searches the npm registry for packages
 */

import { defineCommand, fmt } from "../.claude/lib/cli.ts";
import { EXIT_CODES } from "../.claude/lib/exit-codes.ts";

defineCommand({
	name: "bun-search",
	description: "Search the npm registry for packages",
	usage: "bun tools/bun-search.ts <query>",
	options: {},
	async run(_values, positionals) {
		const query = positionals.join(" ");

		if (!query) {
			console.error(fmt.fail("No search query provided"));
			console.error("Usage: bun tools/bun-search.ts <package-name>");
			process.exit(EXIT_CODES.USAGE_ERROR);
		}

		const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=20`;

		const res = await fetch(url);
		const data = await res.json();

		console.log(`\nSearch results for "${query}":\n`);

		for (const pkg of data.objects || []) {
			const p = pkg.package;
			console.log(`  ${p.name}@${p.version}`);
			console.log(
				`   ${p.description?.slice(0, 80) || "No description"}${p.description?.length > 80 ? "..." : ""}`,
			);
			console.log(
				`   Downloads: ${pkg.downloads?.weekly?.toLocaleString() || "N/A"}/week`,
			);
			console.log(`   https://www.npmjs.com/package/${p.name}\n`);
		}

		console.log(`Found ${data.total} packages total`);
	},
});
