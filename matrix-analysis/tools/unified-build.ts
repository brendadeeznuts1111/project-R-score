#!/usr/bin/env bun
/**
 * Unified Build Command
 *
 * Consolidates all build-related commands into a single interface.
 *
 * Usage:
 *   bun tools/unified-build.ts <target> [options]
 *
 * Targets:
 *   files <operation>   File-related builds (types, practical)
 *   bundle [options]    Bundling (outdir, publicpath, naming, env)
 *   optimize [options]  Optimization (sourcemap, minify, memory)
 *   preview             CWD root behavior
 *   demo <name>         Run demo (bunx-demo, bun-update-demo)
 *
 * Examples:
 *   bun tools/unified-build.ts files types
 *   bun tools/unified-build.ts bundle --outdir=dist --publicpath=/static
 *   bun tools/unified-build.ts optimize --sourcemap --minify
 *   bun tools/unified-build.ts preview
 */

import { fmt } from "../.claude/lib/cli.ts";
import { EXIT_CODES } from "../.claude/lib/exit-codes.ts";

interface BuildTarget {
	name: string;
	description: string;
	examples: string[];
}

const BUILD_TARGETS: BuildTarget[] = [
	{
		name: "files",
		description: "File-related build operations",
		examples: ["types", "practical"],
	},
	{
		name: "bundle",
		description: "Bundling configuration",
		examples: ["--outdir=dist", "--publicpath=/static", "--naming=[name]-[hash]"],
	},
	{
		name: "optimize",
		description: "Optimization operations",
		examples: ["--sourcemap", "--minify", "--memory"],
	},
	{
		name: "preview",
		description: "Preview build behavior (cwd-root)",
		examples: [],
	},
	{
		name: "demo",
		description: "Run build demos",
		examples: ["bunx-demo", "bun-update-demo"],
	},
];

function printUsage(): void {
	console.log(`
${fmt.bold("🔨 Unified Build Command")}

${fmt.bold("Usage:")} bun tools/unified-build.ts <target> [options]

${fmt.bold("Targets:")}

  ${fmt.cyan("files <operation>")}   File-related builds
    Operations: ${["types", "practical"].join(", ")}
    Example: bun tools/unified-build.ts files types

  ${fmt.cyan("bundle [options]")}    Bundling configuration
    Options: --outdir=<dir>, --publicpath=<path>, --naming=<pattern>, --env[=<prefix>]
    Example: bun tools/unified-build.ts bundle --outdir=dist --publicpath=/static

  ${fmt.cyan("optimize [options]")}  Optimization operations
    Options: --sourcemap, --minify, --memory[=simple]
    Example: bun tools/unified-build.ts optimize --sourcemap --minify

  ${fmt.cyan("preview")}            Preview CWD root behavior
    Example: bun tools/unified-build.ts preview

  ${fmt.cyan("demo <name>")}        Run build demo
    Demos: bunx-demo, bun-update-demo
    Example: bun tools/unified-build.ts demo bunx-demo

${fmt.bold("Examples:")}
  ${fmt.dim("$")} bun tools/unified-build.ts files types
  ${fmt.dim("$")} bun tools/unified-build.ts bundle --outdir=dist --publicpath=/assets
  ${fmt.dim("$")} bun tools/unified-build.ts optimize --sourcemap --minify
  ${fmt.dim("$")} bun tools/unified-build.ts preview
  ${fmt.dim("$")} bun tools/unified-build.ts demo bunx-demo
`);
}

async function main(): Promise<void> {
	const args = Bun.argv.slice(2);

	if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
		printUsage();
		process.exit(EXIT_CODES.SUCCESS);
	}

	const target = args[0];
	const operation = args[1];
	const options = args.slice(2);

	try {
		switch (target) {
			case "files": {
				if (!operation) {
					console.error(fmt.fail("Operation required for files target"));
					console.log("Operations: types, practical");
					process.exit(EXIT_CODES.USAGE_ERROR);
				}
				const fileCommands: Record<string, string> = {
					types: "bun run build:files:types",
					practical: "bun run build:files:practical",
				};
				const command = fileCommands[operation];
				if (!command) {
					console.error(fmt.fail(`Unknown operation: ${operation}`));
					console.log(`Available: ${Object.keys(fileCommands).join(", ")}`);
					process.exit(EXIT_CODES.USAGE_ERROR);
				}
				console.log(`${fmt.info("Running")}: ${command}`);
				const result = Bun.spawnSync({
					cmd: command,
					args: options,
					stdio: "inherit",
				});
				process.exit(result.code);
			}

			case "bundle": {
				// For now, just show what would be run
				console.log(`${fmt.info("Bundle configuration")}:`);
				const opts: Record<string, string> = {};
				for (const opt of options) {
					if (opt.startsWith("--")) {
						const [key, value] = opt.slice(2).split("=");
						opts[key] = value || "true";
					}
				}

				if (opts.outdir) console.log(`  Output dir: ${opts.outdir}`);
				if (opts.publicpath) console.log(`  Public path: ${opts.publicpath}`);
				if (opts.naming) console.log(`  Naming pattern: ${opts.naming}`);
				if (opts.env) console.log(`  Environment prefix: ${opts.env}`);

				console.log(
					`${fmt.warn("Note")}: This would run bun build with the specified options`,
				);
				console.log(
					`${fmt.dim("Would execute")}: bun build <entry> ${options.map((o) => (o.startsWith("--") ? o : `"${o}"`)).join(" ")}`,
				);
				// In a real implementation, this would actually build
				break;
			}

			case "optimize": {
				console.log(`${fmt.info("Optimization")}:`);
				const hasSourcemap = options.includes("--sourcemap");
				const hasMinify = options.includes("--minify");
				const memoryOpt = options.find((o) => o.startsWith("--memory"));

				if (hasSourcemap) console.log(`  ✓ Source maps`);
				if (hasMinify) console.log(`  ✓ Minification`);
				if (memoryOpt)
					console.log(
						`  ✓ Memory profiling${memoryOpt === "--memory:simple" ? " (simple)" : ""}`,
					);

				if (!hasSourcemap && !hasMinify && !memoryOpt) {
					console.log(`${fmt.warn("No optimization flags specified")}`);
					console.log(`Available: --sourcemap, --minify, --memory[=simple]`);
				}
				break;
			}

			case "preview": {
				const command = "bun run build:cwd-root";
				console.log(`${fmt.info("Running preview")}: ${command}`);
				const result = Bun.spawnSync({
					cmd: command,
					stdio: "inherit",
				});
				process.exit(result.code);
			}

			case "demo": {
				if (!operation) {
					console.error(fmt.fail("Demo name required"));
					console.log(`Demos: ${["bunx-demo", "bun-update-demo"].join(", ")}`);
					process.exit(EXIT_CODES.USAGE_ERROR);
				}
				const demoCommands: Record<string, string> = {
					"bunx-demo": "bun run bunx-demo",
					"bun-update-demo": "bun run bun-update-demo",
				};
				const command = demoCommands[operation];
				if (!command) {
					console.error(fmt.fail(`Unknown demo: ${operation}`));
					console.log(`Available: ${Object.keys(demoCommands).join(", ")}`);
					process.exit(EXIT_CODES.USAGE_ERROR);
				}
				console.log(`${fmt.info("Running demo")}: ${command}`);
				const result = Bun.spawnSync({
					cmd: command,
					stdio: "inherit",
				});
				process.exit(result.code);
			}

			default:
				console.error(fmt.fail(`Unknown target: ${target}`));
				printUsage();
				process.exit(EXIT_CODES.USAGE_ERROR);
		}
	} catch (error) {
		console.error(fmt.fail(`Error: ${error}`));
		if (process.env.DEBUG) {
			console.error(error);
		}
		process.exit(EXIT_CODES.GENERIC_ERROR);
	}
}

main();
