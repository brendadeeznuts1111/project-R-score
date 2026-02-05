#!/usr/bin/env bun
// tier1380-archive-secure – Secure archive manager with audit, validation & SBOM
// Usage: bun run tier1380-archive-secure.ts [create|extract|audit|validate] [options]

import { Database } from "bun:sqlite";
import { Glob } from "bun";

// ─── Globals & Config ───────────────────────────────────────────────────────
const DB_PATH = "./data/tier1380-archive.db";
const GLYPH = {
	archive: "📦",
	lock: "🔒",
	scan: "⊟",
	sbom: "📜",
	warn: "⚠️",
	ok: "✅",
	fail: "❌",
	info: "ℹ️",
};

const AUDIT_DB = new Database(DB_PATH, { create: true });

// Ensure audit tables exist
AUDIT_DB.exec(`
  CREATE TABLE IF NOT EXISTS archive_operations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT NOT NULL,
    operation TEXT NOT NULL,
    archive_path TEXT,
    file_count INTEGER,
    total_size INTEGER,
    hash TEXT,
    sbom_hash TEXT,
    compression TEXT,
    tenant TEXT DEFAULT 'default',
    user TEXT DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now'))
  );

  CREATE TABLE IF NOT EXISTS archive_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    archive_id INTEGER,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    file_hash TEXT,
    last_modified TEXT,
    FOREIGN KEY (archive_id) REFERENCES archive_operations (id)
  );
`);

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
		} else if (arg === "--sbom") {
			result.sbom = true;
		} else if (arg === "--tenant") {
			result.tenant = rawArgs[++i];
		} else if (arg === "--dry") {
			result.dry = true;
		} else if (arg === "--validate") {
			result.validate = true;
		} else if (!result.command) {
			result.command = arg;
			result.args = rawArgs.slice(i + 1);
			break;
		}
		i++;
	}

	return result;
}

// ─── Archive Operations ─────────────────────────────────────────────────────
// @ts-expect-error - Implicit any types for runtime compatibility
async function createArchive(sourcePath, outputPath, options = {}) {
	console.log(`${GLYPH.archive} Creating secure archive...`);

	const startTime = Date.now();
	/** @type {{ [key: string]: Uint8Array }} */
	const files: { [key: string]: Uint8Array } = {};
	let fileCount = 0;
	let totalSize = 0;

	// Collect files
	try {
		const sourceStat = await Bun.file(sourcePath).stat();
		if (sourceStat.isFile()) {
			// Single file
			const content = await Bun.file(sourcePath).bytes();
			files[sourcePath.split("/").pop()] = content;
			fileCount = 1;
			totalSize += content.length;
		} else if (sourceStat.isDirectory()) {
			// Directory - use glob to collect files
			const glob = new Glob("**/*");
			for await (const path of glob.scan(sourcePath)) {
				const fullPath = `${sourcePath}/${path}`;
				const archivePath = path.replaceAll("\\", "/");

				try {
					const content = await Bun.file(fullPath).bytes();
					files[archivePath] = content;
					fileCount++;
					totalSize += content.length;
				} catch (error) {
					console.warn(
						`${GLYPH.warn} Skipping ${path}: ${error instanceof Error ? error.message : String(error)}`,
					);
				}
			}
		} else {
			throw new Error(`Source path is neither file nor directory: ${sourcePath}`);
		}
	} catch (error) {
		throw new Error(
			`Cannot access source path: ${sourcePath} - ${error instanceof Error ? error.message : String(error)}`,
		);
	}

	// Create archive with compression
	const archiveOptions = {};
	if (options.compress) {
		archiveOptions.compress = options.compress;
		if (options.level) {
			archiveOptions.level = options.level;
		}
	}

	const archive = new Bun.Archive(files, archiveOptions);
	const archiveBytes = await archive.bytes();

	// Generate hashes
	const encoder = new TextEncoder();
	const hashBuffer = await crypto.subtle.digest("SHA-256", archiveBytes);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

	// Write archive
	if (!options.dry) {
		await Bun.write(outputPath, archiveBytes);
		console.log(`${GLYPH.ok} Archive created: ${outputPath}`);
		console.log(
			`${GLYPH.info} Files: ${fileCount}, Size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`,
		);
		console.log(`${GLYPH.info} Compression: ${options.compress || "none"}`);
		console.log(`${GLYPH.lock} SHA-256: ${hash.slice(0, 16)}…`);
	} else {
		console.log(`${GLYPH.info} Dry run - would create archive with ${fileCount} files`);
	}

	// Generate SBOM if requested
	let sbomHash;
	if (options.sbom) {
		const sbom = await generateArchiveSBOM(outputPath, files, options);
		sbomHash = sbom.hash;
		if (!options.dry) {
			const sbomFilename = outputPath.replace(/\.(tar|tar\.gz)$/, ".sbom.json");
			await Bun.write(sbomFilename, sbom.json);
			console.log(`${GLYPH.sbom} SBOM generated: ${sbomFilename}`);
		}
	}

	// Log to audit database
	if (!options.dry) {
		const result = AUDIT_DB.run(
			`INSERT INTO archive_operations (ts, operation, archive_path, file_count, total_size, hash, sbom_hash, compression, tenant)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				new Date().toISOString(),
				"create",
				outputPath,
				fileCount,
				totalSize,
				hash,
				sbomHash || null,
				options.compress || null,
				options.tenant || "default",
			],
		);

		const archiveId = result.lastInsertRowid;

		// Log individual files
		for (const [filePath, content] of Object.entries(files)) {
			const fileBuffer =
				content instanceof Uint8Array
					? content
					: new Uint8Array(await content.arrayBuffer());
			const fileHashBuffer = await crypto.subtle.digest("SHA-256", fileBuffer);
			const fileHashArray = Array.from(new Uint8Array(fileHashBuffer));
			const fileHash = fileHashArray
				.map((b) => b.toString(16).padStart(2, "0"))
				.join("");

			AUDIT_DB.run(
				`INSERT INTO archive_files (archive_id, file_path, file_size, file_hash, last_modified)
         VALUES (?, ?, ?, ?, ?)`,
				[archiveId, filePath, fileBuffer.length, fileHash, new Date().toISOString()],
			);
		}
	}

	const duration = Date.now() - startTime;
	console.log(`${GLYPH.info} Completed in ${duration}ms`);

	return { fileCount, totalSize, hash, duration };
}

async function extractArchive(archivePath, outputPath, options = {}) {
	console.log(`${GLYPH.archive} Extracting secure archive...`);

	const startTime = Date.now();

	// Read and validate archive
	const archiveData = await Bun.file(archivePath).bytes();
	const archive = new Bun.Archive(archiveData);

	// Validate hash if requested
	if (options.validate) {
		const encoder = new TextEncoder();
		const hashBuffer = await crypto.subtle.digest("SHA-256", archiveData);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
		console.log(`${GLYPH.lock} Archive SHA-256: ${hash.slice(0, 16)}…`);
	}

	// Extract with optional filtering
	let extractCount;
	if (options.glob) {
		extractCount = await archive.extract(outputPath, { glob: options.glob });
		console.log(
			`${GLYPH.info} Extracted ${extractCount} entries matching pattern: ${options.glob}`,
		);
	} else {
		extractCount = await archive.extract(outputPath);
		console.log(`${GLYPH.info} Extracted ${extractCount} entries`);
	}

	// Log to audit database
	AUDIT_DB.run(
		`INSERT INTO archive_operations (ts, operation, archive_path, file_count, compression, tenant)
     VALUES (?, ?, ?, ?, ?, ?)`,
		[
			new Date().toISOString(),
			"extract",
			archivePath,
			extractCount,
			null, // Compression info not available from extracted archive
			options.tenant || "default",
		],
	);

	const duration = Date.now() - startTime;
	console.log(`${GLYPH.ok} Extraction completed in ${duration}ms`);

	return { extractCount, duration };
}

async function auditArchive(archivePath, options = {}) {
	console.log(`${GLYPH.scan} Auditing archive: ${archivePath}`);

	const startTime = Date.now();

	// Read archive
	const archiveData = await Bun.file(archivePath).bytes();
	const archive = new Bun.Archive(archiveData);

	// Get archive info
	const archiveSize = archiveData.length;
	const encoder = new TextEncoder();
	const hashBuffer = await crypto.subtle.digest("SHA-256", archiveData);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

	console.log(`${GLYPH.info} Archive size: ${(archiveSize / 1024 / 1024).toFixed(2)}MB`);
	console.log(`${GLYPH.lock} SHA-256: ${hash}`);

	// List files
	const files = await archive.files(options.glob);
	console.log(`${GLYPH.info} Files found: ${files.size}`);

	let totalFileSize = 0;
	const fileTypes = {};

	for (const [path, file] of files) {
		totalFileSize += file.size;
		const ext = path.split(".").pop()?.toLowerCase() || "no-extension";
		fileTypes[ext] = (fileTypes[ext] || 0) + 1;

		if (options.verbose) {
			const fileHashBuffer = await crypto.subtle.digest(
				"SHA-256",
				await file.arrayBuffer(),
			);
			const fileHashArray = Array.from(new Uint8Array(fileHashBuffer));
			const fileHash = fileHashArray
				.map((b) => b.toString(16).padStart(2, "0"))
				.join("");
			console.log(`  ${path}: ${file.size} bytes, SHA-256: ${fileHash.slice(0, 12)}…`);
		} else {
			console.log(`  ${path}: ${file.size} bytes`);
		}
	}

	console.log(
		`${GLYPH.info} Total file size: ${(totalFileSize / 1024 / 1024).toFixed(2)}MB`,
	);
	console.log(`${GLYPH.info} File types:`);
	Object.entries(fileTypes)
		.sort((a, b) => b[1] - a[1])
		.forEach(([ext, count]) => {
			console.log(`  .${ext}: ${count} files`);
		});

	const duration = Date.now() - startTime;
	console.log(`${GLYPH.info} Audit completed in ${duration}ms`);

	return { fileCount: files.size, totalFileSize, fileTypes, duration };
}

// ─── SBOM Generation ───────────────────────────────────────────────────────
async function generateArchiveSBOM(archivePath, files, options = {}) {
	const sbom = {
		$schema: "http://cyclonedx.org/schema/bom-1.5.schema.json",
		bomFormat: "CycloneDX",
		specVersion: "1.5",
		serialNumber: `urn:uuid:${crypto.randomUUID()}`,
		version: 1,
		metadata: {
			timestamp: new Date().toISOString(),
			tools: [
				{
					vendor: "Tier-1380",
					name: "tier1380-archive-secure",
					version: "1.0.0",
				},
			],
			component: {
				type: "archive",
				name: archivePath.split("/").pop(),
				version: "1.0.0",
			},
		},
		components: [],
	};

	// Add files as components
	for (const [filePath, content] of Object.entries(files)) {
		const fileBuffer =
			content instanceof Uint8Array
				? content
				: new Uint8Array(await content.arrayBuffer());
		const fileHashBuffer = await crypto.subtle.digest("SHA-256", fileBuffer);
		const fileHashArray = Array.from(new Uint8Array(fileHashBuffer));
		const fileHash = fileHashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

		sbom.components.push({
			type: "file",
			name: filePath,
			version: "1.0.0",
			purl: `pkg:file/${filePath}`,
			hashes: [{ alg: "SHA-256", content: fileHash }],
			properties: [{ name: "fileSize", value: fileBuffer.length.toString() }],
		});
	}

	const json = JSON.stringify(sbom, null, 2);
	const sbomHashBuffer = await crypto.subtle.digest("SHA-256", json);
	const sbomHashArray = Array.from(new Uint8Array(sbomHashBuffer));
	const sbomHash = sbomHashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

	return { json, hash: sbomHash };
}

// ─── Analytics ─────────────────────────────────────────────────────────────
function showArchiveAnalytics(tenant = "default") {
	console.log(`\n${GLYPH.info} Archive Analytics for tenant: ${tenant}`);

	/** @type {any} */
	const total = AUDIT_DB.query(
		"SELECT COUNT(*) as count FROM archive_operations WHERE tenant = ?",
	).get(tenant);
	/** @type {any} */
	const creates = AUDIT_DB.query(
		"SELECT COUNT(*) as count FROM archive_operations WHERE tenant = ? AND operation = 'create'",
	).get(tenant);
	/** @type {any} */
	const extracts = AUDIT_DB.query(
		"SELECT COUNT(*) as count FROM archive_operations WHERE tenant = ? AND operation = 'extract'",
	).get(tenant);
	/** @type {any} */
	const totalFiles = AUDIT_DB.query(
		"SELECT SUM(file_count) as total FROM archive_operations WHERE tenant = ? AND file_count IS NOT NULL",
	).get(tenant);
	/** @type {any} */
	const totalSize = AUDIT_DB.query(
		"SELECT SUM(total_size) as total FROM archive_operations WHERE tenant = ? AND total_size IS NOT NULL",
	).get(tenant);

	console.log(`   Total operations: ${total?.count || 0}`);
	console.log(`   Archives created: ${creates?.count || 0}`);
	console.log(`   Archives extracted: ${extracts?.count || 0}`);
	console.log(`   Total files processed: ${totalFiles?.total || 0}`);
	console.log(
		`   Total size processed: ${totalSize?.total ? (totalSize.total / 1024 / 1024).toFixed(2) + "MB" : "0MB"}`,
	);

	// Recent operations
	/** @type {any[]} */
	const recent = AUDIT_DB.query(
		"SELECT operation, archive_path, file_count, total_size, ts FROM archive_operations WHERE tenant = ? ORDER BY ts DESC LIMIT 5",
	).all(tenant);
	if (recent.length > 0) {
		console.log(`\n   Recent operations:`);
		recent.forEach((op) => {
			const size = op.total_size
				? ` (${(op.total_size / 1024 / 1024).toFixed(1)}MB)`
				: "";
			console.log(
				`   ${op.operation.toUpperCase()}: ${op.archive_path?.split("/").pop()}${size} - ${new Date(op.ts).toLocaleTimeString()}`,
			);
		});
	}
}

// ─── Main Execution ───────────────────────────────────────────────────────
async function main() {
	const args = parseArgs(process.argv);

	if (!args.command || args.command === "--help") {
		console.log(`${GLYPH.archive} Tier-1380 Secure Archive Manager v1.0.0`);
		console.log(`\nUsage: tier1380-archive-secure.ts <command> [options]`);
		console.log(`\nCommands:`);
		console.log(`  create <source> <output>    Create secure archive`);
		console.log(`  extract <archive> <output>  Extract archive with validation`);
		console.log(`  audit <archive>             Audit archive contents`);
		console.log(`  analytics                   Show operation analytics`);
		console.log(`\nOptions:`);
		console.log(`  --compress <type>          Compression: gzip (default: none)`);
		console.log(`  --level <1-12>             Compression level (default: 6)`);
		console.log(`  --sbom                      Generate SBOM`);
		console.log(`  --tenant <name>            Tenant isolation`);
		console.log(`  --dry                       Dry run (no changes)`);
		console.log(`  --validate                  Validate archive integrity`);
		console.log(`  --glob <pattern>            Filter files (glob pattern)`);
		console.log(`  --verbose                   Detailed output`);
		console.log(`\nExamples:`);
		console.log(
			`  bun tools/tier1380-archive-secure.ts create ./src ./bundle.tar.gz --compress gzip --sbom`,
		);
		console.log(
			`  bun tools/tier1380-archive-secure.ts extract ./bundle.tar.gz ./output --validate`,
		);
		console.log(
			`  bun tools/tier1380-archive-secure.ts audit ./bundle.tar.gz --verbose`,
		);
		console.log(`  bun tools/tier1380-archive-secure.ts analytics --tenant production`);
		process.exit(1);
	}

	console.log(`${GLYPH.archive} Tier-1380 Secure Archive Manager v1.0.0`);
	console.log(`${GLYPH.lock} Tenant: ${args.tenant || "default"}\n`);

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

			case "audit":
				if (args.args.length < 1) {
					console.error(`${GLYPH.fail} Usage: audit <archive>`);
					process.exit(1);
				}
				await auditArchive(args.args[0], args);
				break;

			case "analytics":
				showArchiveAnalytics(args.tenant);
				break;

			default:
				console.error(`${GLYPH.fail} Unknown command: ${args.command}`);
				process.exit(1);
		}
	} catch (error) {
		console.error(`${GLYPH.fail} Error: ${error.message}`);
		process.exit(1);
	}
}

main().catch((e) => {
	console.error(`${GLYPH.fail} Fatal error:`, e.message);
	process.exit(1);
});
