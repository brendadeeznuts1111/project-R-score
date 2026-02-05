#!/usr/bin/env bun
/**
 * Build .options.index for CLI options queries.
 * @col_93 balanced_braces
 */

async function main(): Promise<void> {
	const proc = Bun.spawn(
		["rg", "--files-with-matches", "BUN_TEST_CLI_OPTIONS", "mcp-bun-docs/"],
		{
			stdio: ["ignore", "pipe", "inherit"],
		},
	);
	const out = await new Response(proc.stdout).text();
	const files = out.split("\n").filter(Boolean).sort();
	await Bun.write(".options.index", files.join("\n") + (files.length ? "\n" : ""));
	console.log("Built .options.index");
	console.log(`${files.length} file(s)`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
