#!/usr/bin/env bun
/**
 * Metadata Refresh Script
 * Updates checksums and validation timestamps for component manifests
 * 
 * Usage:
 *   bun run scripts/metadata-refresh.ts --section 14.5.0.0.0.0.0
 *   bun run scripts/metadata-refresh.ts --file apps/@registry-dashboard/src/manifest.json
 */

import { dirname, join } from "path";

interface RefreshOptions {
	section?: string;
	file?: string;
	all?: boolean;
}

function parseArgs(): RefreshOptions {
	const args = process.argv.slice(2);
	const options: Partial<RefreshOptions> = {};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		const nextArg = args[i + 1];

		if (arg === "--section" && nextArg) {
			options.section = nextArg;
			i++;
		} else if (arg === "--file" && nextArg) {
			options.file = nextArg;
			i++;
		} else if (arg === "--all") {
			options.all = true;
		}
	}

	return options as RefreshOptions;
}

async function calculateFileChecksum(filePath: string): Promise<string> {
	const file = Bun.file(filePath);
	if (!(await file.exists())) {
		throw new Error(`File not found: ${filePath}`);
	}

	const content = await file.text();
	const hasher = new Bun.CryptoHasher("sha256");
	hasher.update(content);
	return `sha256:${hasher.digest("hex")}`;
}

async function refreshManifest(manifestPath: string): Promise<void> {
	const manifestFile = Bun.file(manifestPath);
	if (!(await manifestFile.exists())) {
		console.warn(`Manifest not found: ${manifestPath}`);
		return;
	}

	const manifest = JSON.parse(await manifestFile.text());
	
	// Update metadata timestamps
	manifest.metadata = manifest.metadata || {};
	manifest.metadata.last_audit = new Date().toISOString();
	manifest.metadata.last_validated = new Date().toISOString();

	// Calculate checksum
	const manifestContent = JSON.stringify(manifest, null, 2);
	const hasher = new Bun.CryptoHasher("sha256");
	hasher.update(manifestContent);
	manifest.metadata.checksum = `sha256:${hasher.digest("hex")}`;

	// Update component checksums if they reference files
	if (manifest.components) {
		const manifestDir = dirname(manifestPath);
		for (const [componentName, component] of Object.entries(manifest.components as Record<string, any>)) {
			if (component.path) {
				try {
					// Resolve path: paths in manifest are relative to manifest directory
					// If path starts with "src/", it's relative to manifest dir; otherwise try as-is
					let componentFilePath: string;
					if (component.path.startsWith("apps/") || component.path.startsWith("/")) {
						// Absolute path
						componentFilePath = component.path;
					} else if (component.path.startsWith("src/")) {
						// Relative to manifest directory (which is already in src/)
						// Remove "src/" prefix since manifest is already in src/
						componentFilePath = join(manifestDir, component.path.replace(/^src\//, ""));
					} else {
						// Relative to manifest directory
						componentFilePath = join(manifestDir, component.path);
					}
					
					const componentChecksum = await calculateFileChecksum(componentFilePath);
					component.checksum = componentChecksum;
					component["last-validated"] = new Date().toISOString();
				} catch (error: any) {
					console.warn(`⚠️  Could not calculate checksum for ${component.path}: ${error.message}`);
				}
			}
		}
	}

	// Write updated manifest
	const updatedContent = JSON.stringify(manifest, null, 2);
	await Bun.write(manifestPath, updatedContent);
	
	console.log(`✅ Refreshed manifest: ${manifestPath}`);
	console.log(`   Checksum: ${manifest.metadata.checksum}`);
}

async function main() {
	const options = parseArgs();

	if (options.file) {
		await refreshManifest(options.file);
	} else if (options.section) {
		// Map section to manifest file (simplified - could be expanded)
		const manifestPath = "apps/@registry-dashboard/src/manifest.json";
		await refreshManifest(manifestPath);
	} else if (options.all) {
		// Refresh all manifests
		const manifests = [
			"apps/@registry-dashboard/src/manifest.json",
		];
		
		for (const manifestPath of manifests) {
			try {
				await refreshManifest(manifestPath);
			} catch (error: any) {
				console.error(`❌ Failed to refresh ${manifestPath}: ${error.message}`);
			}
		}
	} else {
		console.error("Error: --file, --section, or --all is required");
		console.error("Usage: bun run scripts/metadata-refresh.ts --file <path>");
		console.error("       bun run scripts/metadata-refresh.ts --section <section>");
		console.error("       bun run scripts/metadata-refresh.ts --all");
		process.exit(1);
	}
}

if (import.meta.main) {
	main();
}
