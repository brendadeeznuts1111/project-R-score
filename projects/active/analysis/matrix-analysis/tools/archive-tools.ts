#!/usr/bin/env bun
// archive-tools - Quick CLI for Bun.Archive operations with enterprise security
// Usage: bun run archive-tools.ts <command> [options]

import { Database } from "bun:sqlite";

// ─── Globals & Config ───────────────────────────────────────────────────────
const GLYPH = {
	archive: "📦",
	lock: "🔒",
	scan: "⊟",
	ok: "✅",
	fail: "❌",
	info: "ℹ️",
	warn: "⚠️",
};

// ─── Argument Parser ───────────────────────────────────────────────────────
// @ts-expect-error - Implicit any types for runtime compatibility
function parseArgs(argv) {
	const rawArgs = argv.slice(2);
	/** @type {any} */
	const result = { args: [] };

	let i = 0;
	while (i < rawArgs.length) {
		const arg = rawArgs[i];
		if (arg === "--compress") {
			result.compress = rawArgs[++i] || "gzip";
		} else if (arg === "--level") {
			result.level = parseInt(rawArgs[++i]) || 6;
		} else if (arg === "--tenant") {
			result.tenant = rawArgs[++i];
		} else if (arg === "--audit") {
			result.audit = true;
		} else if (arg === "--validate") {
			result.validate = true;
		} else if (arg === "--verbose") {
			result.verbose = true;
		} else if (!result.command) {
			result.command = arg;
			result.args = rawArgs.slice(i + 1);
			break;
		}
		i++;
	}

	return result;
}

// ─── Core Operations ───────────────────────────────────────────────────────
async function createArchive(source, output, options = {}) {
	console.info(`${GLYPH.archive} Creating archive: ${source} → ${output}`);

	const startTime = Date.now();
	/** @type {{ [key: string]: Uint8Array }} */
	const files: { [key: string]: Uint8Array } = {};
	let fileCount = 0;

	try {
		const sourceStat = await Bun.file(source).stat();
		if (sourceStat.isFile()) {
			// Single file
			const content = await Bun.file(source).bytes();
			files[source.split("/").pop() || source] = content;
			fileCount = 1;
		} else if (sourceStat.isDirectory()) {
			// Directory
			const glob = new Bun.Glob("**/*");
			for await (const path of glob.scan(source)) {
				const fullPath = `${source}/${path}`;
				const archivePath = path.replaceAll("\\", "/");

				try {
					const content = await Bun.file(fullPath).bytes();
					files[archivePath] = content;
					fileCount++;
				} catch (error) {
					if (options.verbose) {
						console.warn(
							`${GLYPH.warn} Skipping ${path}: ${error instanceof Error ? error.message : String(error)}`,
						);
					}
				}
			}
		}

		// Create archive
		const archiveOptions = {};
		if (options.compress) {
			archiveOptions.compress = options.compress;
			if (options.level) {
				archiveOptions.level = options.level;
			}
		}

		const archive = new Bun.Archive(files, archiveOptions);
		await Bun.write(output, archive);

		const duration = Date.now() - startTime;
		console.info(`${GLYPH.ok} Archive created: ${output}`);
		console.info(`${GLYPH.info} Files: ${fileCount}, Duration: ${duration}ms`);

		if (options.validate) {
			const hash = await generateHash(output);
			console.info(`${GLYPH.lock} SHA-256: ${hash.slice(0, 16)}…`);
		}

		if (options.audit) {
			await logOperation("create", output, {
				fileCount,
				duration,
				tenant: options.tenant,
			});
		}
	} catch (error) {
		console.error(
			`${GLYPH.fail} Error: ${error instanceof Error ? error.message : String(error)}`,
		);
		throw error;
	}
}

async function extractArchive(archive, output, options = {}) {
	console.info(`${GLYPH.archive} Extracting archive: ${archive} → ${output}`);

	const startTime = Date.now();

	try {
		const archiveData = await Bun.file(archive).arrayBuffer();
		const archiveObj = new Bun.Archive(archiveData);

		if (options.validate) {
			const hash = await generateHash(archive);
			console.info(`${GLYPH.lock} Archive SHA-256: ${hash.slice(0, 16)}…`);
		}

		const count = await archiveObj.extract(output);
		const duration = Date.now() - startTime;

		console.info(`${GLYPH.ok} Extracted ${count} entries to ${output}`);
		console.info(`${GLYPH.info} Duration: ${duration}ms`);

		if (options.audit) {
			await logOperation("extract", archive, {
				entries: count,
				duration,
				tenant: options.tenant,
			});
		}
	} catch (error) {
		console.error(
			`${GLYPH.fail} Error: ${error instanceof Error ? error.message : String(error)}`,
		);
		throw error;
	}
}

async function inspectArchive(archive, options = {}) {
	console.info(`${GLYPH.scan} Inspecting archive: ${archive}`);

	try {
		const archiveData = await Bun.file(archive).arrayBuffer();
		const archiveObj = new Bun.Archive(archiveData);
		const files = await archiveObj.files();

		const archiveSize = archiveData.byteLength;
		const totalSize = [...files.values()].reduce((sum, file) => sum + file.size, 0);
		const maxPathWidth = Math.max(...[...files.keys()].map((p) => Bun.stringWidth(p)));

		console.info(
			`${GLYPH.info} Archive size: ${(archiveSize / 1024 / 1024).toFixed(2)}MB`,
		);
		console.info(
			`${GLYPH.info} Files: ${files.size}, Total content: ${(totalSize / 1024 / 1024).toFixed(2)}MB`,
		);
		console.info(`${GLYPH.info} Max path width: ${maxPathWidth} cols`);

		if (options.verbose) {
			console.info(`\n${GLYPH.info} File list:`);
			for (const [path, file] of files) {
				const safePath = Bun.stringWidth(path) > 86 ? path.slice(0, 83) + "…" : path;
				console.info(`  ${safePath}: ${file.size} bytes`);
			}
		}

		if (options.validate) {
			const hash = await generateHash(archive);
			console.info(`${GLYPH.lock} SHA-256: ${hash.slice(0, 16)}…`);

			// Check for suspicious paths
			const suspicious = [...files.keys()].filter(
				(p) => p.startsWith("/") || p.startsWith("../") || p.startsWith("."),
			);
			if (suspicious.length > 0) {
				console.info(`${GLYPH.warn} Suspicious paths: ${suspicious.join(", ")}`);
			} else {
				console.info(`${GLYPH.ok} No suspicious paths detected`);
			}
		}
	} catch (error) {
		console.error(
			`${GLYPH.fail} Error: ${error instanceof Error ? error.message : String(error)}`,
		);
		throw error;
	}
}

// ─── Utility Functions ─────────────────────────────────────────────────────
async function generateHash(filePath) {
	const data = await Bun.file(filePath).arrayBuffer();
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function logOperation(operation, target, metadata) {
	const logEntry = {
		ts: new Date().toISOString(),
		operation,
		target,
		...metadata,
	};

	const logLine = `${logEntry.ts} | ${operation.toUpperCase()} | ${target} | ${JSON.stringify(metadata)}\n`;
	await Bun.write("archive-tools.log", { append: true }, logLine);
}

// ─── Main Execution ───────────────────────────────────────────────────────
async function main() {
	const args = parseArgs(process.argv);

	if (!args.command || args.command === "--help") {
		console.info(`${GLYPH.archive} Archive Tools - Quick CLI for Bun.Archive`);
		console.info(`\nUsage: archive-tools.ts <command> [options]`);
		console.info(`\nCommands:`);
		console.info(`  create <source> <output>    Create archive from file or directory`);
		console.info(`  extract <archive> <output>  Extract archive to directory`);
		console.info(`  inspect <archive>           Inspect archive contents`);
		console.info(`\nOptions:`);
		console.info(`  --compress <type>          Compression: gzip (default: none)`);
		console.info(`  --level <1-12>             Compression level (default: 6)`);
		console.info(`  --tenant <name>            Tenant identifier for logging`);
		console.info(`  --audit                    Log operation to audit file`);
		console.info(`  --validate                 Validate archive integrity`);
		console.info(`  --verbose                  Detailed output`);
		console.info(`\nExamples:`);
		console.info(
			`  bun tools/archive-tools.ts create ./src ./backup.tar.gz --compress gzip --audit`,
		);
		console.info(
			`  bun tools/archive-tools.ts extract ./backup.tar.gz ./restore --validate`,
		);
		console.info(`  bun tools/archive-tools.ts inspect ./backup.tar.gz --verbose`);
		process.exit(1);
	}

	console.info(`${GLYPH.archive} Archive Tools v1.0.0`);
	if (args.tenant) console.info(`${GLYPH.lock} Tenant: ${args.tenant}`);
	console.info();

	try {
		switch (args.command) {
			case "create":
				if (args.args.length < 2) {
					console.error(`${GLYPH.fail} Usage: create <source> <output>`);
					process.exit(1);
				}
				await createArchive(args.args[0], args.args[1], args);
				break;

			case "extract":
				if (args.args.length < 2) {
					console.error(`${GLYPH.fail} Usage: extract <archive> <output>`);
					process.exit(1);
				}
				await extractArchive(args.args[0], args.args[1], args);
				break;

			case "inspect":
				if (args.args.length < 1) {
					console.error(`${GLYPH.fail} Usage: inspect <archive>`);
					process.exit(1);
				}
				await inspectArchive(args.args[0], args);
				break;

			default:
				console.error(`${GLYPH.fail} Unknown command: ${args.command}`);
				process.exit(1);
		}
	} catch (error) {
		process.exit(1);
	}
}

main().catch((e) => {
	console.error(
		`${GLYPH.fail} Fatal error:`,
		e instanceof Error ? e.message : String(e),
	);
	process.exit(1);
});
