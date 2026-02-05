#!/usr/bin/env bun
/**
 * Anti-Bun Pattern Scanner
 * Scans all .ts files for Node.js patterns that have Bun-native replacements
 */

import { $ } from "bun";
import { defineCommand } from "../.claude/lib/cli.ts";
import { EXIT_CODES } from "../.claude/lib/exit-codes.ts";

interface Hit {
	pattern: string;
	file: string;
	line: number;
	text: string;
}

const SCANS = [
	{
		pattern: 'from "node:fs/promises"',
		name: "node:fs/promises import",
		fix: "Bun.file() / Bun.write()",
	},
	{ pattern: 'from "node:fs"', name: "node:fs import", fix: "Bun.file() / Bun.write()" },
	{ pattern: 'from "node:os"', name: "node:os import", fix: "Bun.env.HOME / os info" },
	{
		pattern: 'from "node:child_process"',
		name: "node:child_process import",
		fix: "Bun.spawn() / Bun.$",
	},
	{
		pattern: 'from "(os|path|fs|child_process)"',
		name: "bare node import",
		fix: "use node: prefix or Bun API",
	},
	{
		pattern: "existsSync|readFileSync|writeFileSync",
		name: "sync FS calls",
		fix: "Bun.file().exists() / .text() / Bun.write()",
	},
	{
		pattern: "readFile\\(",
		name: "readFile()",
		fix: "Bun.file().text() / .json() / .arrayBuffer()",
	},
	{ pattern: "writeFile\\(", name: "writeFile()", fix: "Bun.write()" },
	{ pattern: "require\\(", name: "require()", fix: "ES import" },
	{ pattern: "process\\.argv", name: "process.argv", fix: "Bun.argv" },
	{ pattern: "process\\.env", name: "process.env", fix: "Bun.env" },
	{
		pattern: "new Promise.*setTimeout",
		name: "Promise(setTimeout)",
		fix: "Bun.sleep()",
	},
	{
		pattern: "export default \\{",
		name: "export default {}",
		fix: "named exports (unless CF Worker)",
	},
] as const;

const DIRS = ["src", "tools", "examples", ".claude"];

defineCommand({
	name: "antipattern-scan",
	description: "Scan .ts files for Node.js patterns that have Bun-native replacements",
	usage: "bun tools/antipattern-scan.ts [options] [dirs...]",
	options: {
		verbose: {
			type: "boolean",
			short: "v",
			default: false,
			description: "Show individual hits per pattern",
		},
		json: { type: "boolean", default: false, description: "Output results as JSON" },
		metrics: {
			type: "boolean",
			short: "m",
			default: false,
			description: "Show file-level breakdown",
		},
		patterns: {
			type: "boolean",
			short: "p",
			default: false,
			description: "Print pattern catalog and exit",
		},
		regex: {
			type: "boolean",
			short: "r",
			default: false,
			description: "Print raw regex patterns and exit",
		},
	},
	async run(values, positionals) {
		const verbose = !!values["verbose"];
		const jsonOut = !!values["json"];
		const showMetrics = !!values["metrics"];
		const showPatterns = !!values["patterns"];
		const showRegex = !!values["regex"];
		const scanDirs = positionals.length > 0 ? positionals : DIRS;

		// ── --patterns: print pattern catalog and exit ──────────────────────
		if (showPatterns) {
			const catalog = SCANS.map((s) => ({ name: s.name, fix: s.fix }));
			console.log("Anti-Bun Pattern Catalog\n");
			console.log(Bun.inspect.table(catalog, ["name", "fix"]));
			console.log(`${SCANS.length} patterns registered`);
			process.exit(EXIT_CODES.SUCCESS);
		}

		// ── --regex: print raw regex patterns and exit ──────────────────────
		if (showRegex) {
			const regexes = SCANS.map((s) => ({ name: s.name, regex: s.pattern }));
			console.log("Anti-Bun Raw Regex Patterns\n");
			console.log(Bun.inspect.table(regexes, ["name", "regex"]));
			console.log(`${SCANS.length} patterns registered`);
			process.exit(EXIT_CODES.SUCCESS);
		}

		const allHits: Hit[] = [];

		for (const scan of SCANS) {
			const { stdout } =
				await $`rg -n ${scan.pattern} --type=ts ${scanDirs} --glob '!node_modules/**' --glob '!dist/**' --glob '!**/antipattern-scan.ts' 2>/dev/null`
					.quiet()
					.nothrow();
			const lines = stdout.toString().trim().split("\n").filter(Boolean);

			for (const line of lines) {
				const match = line.match(/^(.+?):(\d+):(.+)$/);
				if (!match) continue;

				const text = match[3].trim();
				// Skip comments and string-literal references
				if (text.startsWith("//")) continue;
				if (
					scan.name === "require()" &&
					(text.includes('"require(') || text.includes("`require("))
				)
					continue;

				allHits.push({
					pattern: scan.name,
					file: match[1],
					line: parseInt(match[2], 10),
					text: text.slice(0, 80),
				});
			}
		}

		// ── Group hits by pattern ───────────────────────────────────────────
		const grouped = new Map<string, Hit[]>();
		for (const hit of allHits) {
			const arr = grouped.get(hit.pattern) || [];
			arr.push(hit);
			grouped.set(hit.pattern, arr);
		}

		// ── --metrics: file-level breakdown ─────────────────────────────────
		if (showMetrics) {
			const fileMap = new Map<string, number>();
			for (const hit of allHits) {
				fileMap.set(hit.file, (fileMap.get(hit.file) || 0) + 1);
			}
			const byFile = [...fileMap.entries()]
				.sort((a, b) => b[1] - a[1])
				.map(([file, count]) => ({ file, hits: count }));

			const patternCounts = SCANS.map((s) => ({
				pattern: s.name,
				hits: (grouped.get(s.name) || []).length,
			}))
				.filter((p) => p.hits > 0)
				.sort((a, b) => b.hits - a.hits);

			console.log(`Anti-Bun Metrics (${scanDirs.join(", ")})\n`);
			console.log("── By Pattern ──\n");
			console.log(Bun.inspect.table(patternCounts, ["pattern", "hits"]));
			console.log("── By File ──\n");
			console.log(Bun.inspect.table(byFile, ["file", "hits"]));
			console.log(
				`${allHits.length} hits across ${fileMap.size} files, ${patternCounts.length}/${SCANS.length} patterns triggered`,
			);
			process.exit(EXIT_CODES.SUCCESS);
		}

		// ── Default / --json / --verbose output ─────────────────────────────
		if (jsonOut) {
			console.log(JSON.stringify(allHits, null, 2));
		} else {
			console.log(`Anti-Bun Pattern Scan (${scanDirs.join(", ")})\n`);

			const summary: { pattern: string; fix: string; count: number }[] = [];
			for (const scan of SCANS) {
				const hits = grouped.get(scan.name) || [];
				summary.push({ pattern: scan.name, fix: scan.fix, count: hits.length });

				if (verbose && hits.length > 0) {
					for (const h of hits) {
						console.log(`  ${h.file}:${h.line}  ${h.text}`);
					}
					console.log("");
				}
			}

			console.log(Bun.inspect.table(summary, ["pattern", "fix", "count"]));
			console.log(`Total: ${allHits.length} hits`);
		}
	},
});
