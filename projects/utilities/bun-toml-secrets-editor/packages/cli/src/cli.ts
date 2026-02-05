#!/usr/bin/env bun

/**
 * Golden Template CLI Entry Point
 *
 * Commands:
 *   golden init [name]     Initialize a new Golden Template project
 *   golden fetch <url>     Fetch and parse RSS feed
 *   golden render          Render template with secrets resolution
 *   golden validate        Validate configuration
 *   golden --version       Show version
 *   golden --help          Show help
 */

import { join } from "node:path";
import { getConfigSummary, resolveConfig } from "@golden/core/config";
import { TableFormatter } from "@golden/core/table";
import {
	generateGoldenTemplate,
	vfsList,
	vfsWrite,
} from "@golden/core/templates";
import { colorize } from "@golden/core/utils";
import { fetchRSS } from "@golden/rss";

const VERSION = "1.3.7";

// ============================================================================
// CLI Parser
// ============================================================================

interface ParsedArgs {
	command: string;
	args: string[];
	flags: Map<string, string | boolean>;
}

function parseArgs(argv: string[]): ParsedArgs {
	const args: string[] = [];
	const flags = new Map<string, string | boolean>();

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];

		if (arg.startsWith("--")) {
			const eqIndex = arg.indexOf("=");
			if (eqIndex !== -1) {
				flags.set(arg.slice(2, eqIndex), arg.slice(eqIndex + 1));
			} else if (i + 1 < argv.length && !argv[i + 1].startsWith("-")) {
				flags.set(arg.slice(2), argv[++i]);
			} else {
				flags.set(arg.slice(2), true);
			}
		} else if (arg.startsWith("-")) {
			flags.set(arg.slice(1), true);
		} else {
			args.push(arg);
		}
	}

	return {
		command: args[0] || "help",
		args: args.slice(1),
		flags,
	};
}

// ============================================================================
// Commands
// ============================================================================

const commands: Record<string, (args: ParsedArgs) => Promise<void>> = {
	async init({ args, flags }) {
		const name = args[0] || "golden-project";
		const profile = (flags.get("profile") as string) || "default";

		console.log(colorize(`Initializing Golden Template: ${name}`, "cyan"));

		// Generate and save template
		const template = generateGoldenTemplate({
			name,
			version: "1.0.0",
			profile,
		});

		vfsWrite("golden-template.toml", template);
		vfsWrite(
			".gitignore",
			`# Secrets - DO NOT COMMIT\n*.secrets.toml\n.env*.local\n`,
		);

		// Persist to disk
		const outputDir = process.cwd();
		for (const file of vfsList()) {
			const path = join(outputDir, file);
			await Bun.write(path, vfsRead(file)!);
			console.log(colorize(`Created: ${file}`, "green"));
		}

		console.log(colorize("\nNext steps:", "yellow"));
		console.log(`  1. Edit golden-template.toml`);
		console.log(`  2. Run: golden validate`);
		console.log(`  3. Run: golden render`);
	},

	async fetch({ args, flags }) {
		const url = args[0];
		if (!url) {
			console.error(colorize("Error: URL required", "red"));
			process.exit(1);
		}

		console.log(colorize(`Fetching: ${url}`, "cyan"));

		const result = await fetchRSS(url, {
			http2: flags.has("http2"),
			timeout: flags.has("timeout")
				? parseInt(flags.get("timeout") as string, 10)
				: undefined,
		});

		console.log(colorize(`\nFeed: ${result.feed.title}`, "bold"));
		console.log(`Items: ${result.feed.items.length}`);
		console.log(`Duration: ${result.meta.duration}ms`);

		// Display in table
		if (result.feed.items.length > 0) {
			const table = new TableFormatter({ useColors: true });

			table.addColumn({
				key: "title",
				header: "Title",
				width: 40,
				truncate: true,
			});
			table.addColumn({ key: "pubDate", header: "Published", width: 20 });
			table.addColumn({ key: "author", header: "Author", width: 15 });

			result.feed.items.slice(0, 10).forEach((item) => {
				table.addRow({
					title: item.title,
					pubDate: item.pubDate || "N/A",
					author: item.author || "N/A",
				});
			});

			console.log(`\n${table.render()}`);
		}
	},

	async render({ flags }) {
		const config = resolveConfig();

		if (flags.has("verbose")) {
			console.log(getConfigSummary(config));
		}

		console.log(colorize(`Rendering with profile: ${config.profile}`, "cyan"));

		// TODO: Implement full render logic
		console.log(colorize("Done!", "green"));
	},

	async validate({ flags }) {
		const config = resolveConfig();

		console.log(colorize("Validating configuration...", "cyan"));

		const table = new TableFormatter({ useColors: true });
		table.addColumn({ key: "source", header: "Source", width: 15 });
		table.addColumn({ key: "path", header: "Path", width: 50, truncate: true });
		table.addColumn({ key: "status", header: "Status", width: 10 });

		// Check secrets dir
		const secretsExists = await Bun.file(config.secretsDir.path).exists();
		table.addRow({
			source: "Secrets Dir",
			path: config.secretsDir.path,
			status: secretsExists
				? colorize("OK", "green")
				: colorize("MISSING", "yellow"),
		});

		// Check config file
		const configExists = await Bun.file(config.configFile.path).exists();
		table.addRow({
			source: "Config File",
			path: config.configFile.path,
			status: configExists
				? colorize("OK", "green")
				: colorize("MISSING", "yellow"),
		});

		console.log(`\n${table.render()}`);
	},

	async version() {
		console.log(`Golden Template CLI v${VERSION}`);
		console.log(`Bun ${Bun.version}`);
	},

	async help() {
		console.log(colorize("Golden Template CLI", "bold"));
		console.log(`\nVersion: ${VERSION}\n`);

		console.log("Commands:");
		console.log("  init [name]       Initialize a new project");
		console.log("  fetch <url>       Fetch RSS feed");
		console.log("  render            Render template with secrets");
		console.log("  validate          Validate configuration");
		console.log("  version           Show version");
		console.log("  help              Show this help\n");

		console.log("Flags:");
		console.log("  --profile=<name>  Use specific profile");
		console.log("  --secrets-dir=<p> Set secrets directory");
		console.log("  --verbose         Enable verbose output");
		console.log("  --http2           Use HTTP/2 for fetching");
		console.log("  --timeout=<ms>    Set timeout\n");

		console.log("Examples:");
		console.log("  golden init my-project");
		console.log("  golden fetch https://example.com/feed.xml");
		console.log("  golden render --profile=production");
	},
};

// ============================================================================
// Main
// ============================================================================

async function main() {
	const args = parseArgs(process.argv.slice(2));

	// Global flags
	if (args.flags.has("version") || args.flags.has("v")) {
		await commands.version(args);
		return;
	}

	if (args.flags.has("help") || args.flags.has("h")) {
		await commands.help(args);
		return;
	}

	// Execute command
	const command = commands[args.command];
	if (!command) {
		console.error(colorize(`Unknown command: ${args.command}`, "red"));
		console.log(`Run 'golden help' for usage.`);
		process.exit(1);
	}

	await command(args);
}

main().catch((err) => {
	console.error(colorize(`Error: ${err.message}`, "red"));
	if (process.env.DEBUG) {
		console.error(err.stack);
	}
	process.exit(1);
});
