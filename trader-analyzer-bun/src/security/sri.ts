// [sri]
// Subresource Integrity (SRI) automation tool
// Generates and manages integrity hashes for static assets

import type { SRIAlgorithm, SRIConfig, SRIEntry, SRIReport } from "./types";

/**
 * SRI Generator and Manager
 * Generates subresource integrity hashes for JS/CSS files
 * and can auto-update HTML files with integrity attributes
 */
export class SRIGenerator {
	private config: Required<SRIConfig>;
	private entries: Map<string, SRIEntry> = new Map();

	constructor(config: SRIConfig) {
		this.config = {
			files: config.files,
			algorithm: config.algorithm ?? "sha384",
			outputFile: config.outputFile ?? "sri-manifest.json",
			htmlFiles: config.htmlFiles ?? [],
			autoUpdate: config.autoUpdate ?? false,
			crossorigin: config.crossorigin ?? "anonymous",
		};
	}

	/**
	 * Generate SRI hashes for all configured files
	 */
	async generate(): Promise<SRIReport> {
		const errors: string[] = [];
		const timestamp = Date.now();

		// Expand glob patterns
		const files = await this.expandGlobs(this.config.files);

		for (const file of files) {
			try {
				const entry = await this.generateHash(file);
				this.entries.set(file, entry);
			} catch (error) {
				errors.push(
					`Failed to hash ${file}: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}

		const report: SRIReport = {
			timestamp,
			algorithm: this.config.algorithm,
			entries: Array.from(this.entries.values()),
			errors: errors.length > 0 ? errors : undefined,
		};

		// Save manifest
		if (this.config.outputFile) {
			await this.saveManifest(report);
		}

		// Auto-update HTML files if enabled
		if (this.config.autoUpdate && this.config.htmlFiles.length > 0) {
			report.htmlFilesUpdated = await this.updateHtmlFiles();
		}

		return report;
	}

	/**
	 * Generate SRI hash for a single file
	 */
	async generateHash(filePath: string): Promise<SRIEntry> {
		const file = Bun.file(filePath);

		if (!(await file.exists())) {
			throw new Error(`File not found: ${filePath}`);
		}

		const content = await file.arrayBuffer();
		const stats = (await file.stat?.()) ?? {
			size: content.byteLength,
			mtime: new Date(),
		};

		// Use Bun's native crypto
		const hash = await this.computeHash(content, this.config.algorithm);
		const integrity = `${this.config.algorithm}-${hash}`;

		return {
			file: filePath,
			integrity,
			algorithm: this.config.algorithm,
			size: stats.size,
			lastModified:
				stats.mtime instanceof Date ? stats.mtime.getTime() : Date.now(),
		};
	}

	/**
	 * Compute hash using Web Crypto API (Bun native)
	 */
	private async computeHash(
		data: ArrayBuffer,
		algorithm: SRIAlgorithm,
	): Promise<string> {
		const algoMap: Record<SRIAlgorithm, string> = {
			sha256: "SHA-256",
			sha384: "SHA-384",
			sha512: "SHA-512",
		};

		const hashBuffer = await crypto.subtle.digest(algoMap[algorithm], data);
		const hashArray = new Uint8Array(hashBuffer);

		// Convert to base64
		return btoa(String.fromCharCode(...hashArray));
	}

	/**
	 * Expand glob patterns to actual file paths
	 */
	private async expandGlobs(patterns: string[]): Promise<string[]> {
		const files: string[] = [];

		for (const pattern of patterns) {
			const glob = new Bun.Glob(pattern);
			for await (const file of glob.scan({
				cwd: process.cwd(),
				absolute: true,
			})) {
				files.push(file);
			}
		}

		return [...new Set(files)]; // dedupe
	}

	/**
	 * Save SRI manifest to JSON file
	 */
	private async saveManifest(report: SRIReport): Promise<void> {
		const manifest = {
			generated: new Date(report.timestamp).toISOString(),
			algorithm: report.algorithm,
			files: Object.fromEntries(
				report.entries.map((e) => [
					e.file,
					{
						integrity: e.integrity,
						size: e.size,
						lastModified: new Date(e.lastModified).toISOString(),
					},
				]),
			),
		};

		await Bun.write(this.config.outputFile, JSON.stringify(manifest, null, 2));
	}

	/**
	 * Update HTML files with integrity attributes
	 */
	async updateHtmlFiles(): Promise<string[]> {
		const updated: string[] = [];
		const htmlFiles = await this.expandGlobs(this.config.htmlFiles);

		for (const htmlFile of htmlFiles) {
			try {
				const file = Bun.file(htmlFile);
				let content = await file.text();
				let modified = false;

				// Update script tags
				content = this.updateScriptTags(content, (src) => {
					const entry = this.findEntryByUrl(src);
					if (entry) {
						modified = true;
						return entry;
					}
					return null;
				});

				// Update link tags (stylesheets)
				content = this.updateLinkTags(content, (href) => {
					const entry = this.findEntryByUrl(href);
					if (entry) {
						modified = true;
						return entry;
					}
					return null;
				});

				if (modified) {
					await Bun.write(htmlFile, content);
					updated.push(htmlFile);
				}
			} catch (error) {
				console.error(`Failed to update ${htmlFile}:`, error);
			}
		}

		return updated;
	}

	/**
	 * Find entry by URL (handles relative/absolute paths)
	 */
	private findEntryByUrl(url: string): SRIEntry | null {
		// Normalize URL to match file path
		const normalized = url.startsWith("/") ? url.slice(1) : url;

		for (const [path, entry] of this.entries) {
			if (path.endsWith(normalized) || path.includes(normalized)) {
				return entry;
			}
		}
		return null;
	}

	/**
	 * Update script tags with integrity attributes
	 */
	private updateScriptTags(
		html: string,
		getEntry: (src: string) => SRIEntry | null,
	): string {
		// Match <script src="..."> tags
		const scriptRegex = /<script\s+([^>]*src=["']([^"']+)["'][^>]*)>/gi;

		return html.replace(scriptRegex, (match, attrs, src) => {
			const entry = getEntry(src);
			if (!entry) return match;

			// Check if integrity already exists
			if (/integrity=["'][^"']+["']/.test(attrs)) {
				// Update existing integrity
				const updated = attrs.replace(
					/integrity=["'][^"']+["']/,
					`integrity="${entry.integrity}"`,
				);
				return `<script ${updated}>`;
			}

			// Add integrity and crossorigin
			const newAttrs = `${attrs} integrity="${entry.integrity}" crossorigin="${this.config.crossorigin}"`;
			return `<script ${newAttrs}>`;
		});
	}

	/**
	 * Update link tags (stylesheets) with integrity attributes
	 */
	private updateLinkTags(
		html: string,
		getEntry: (href: string) => SRIEntry | null,
	): string {
		// Match <link rel="stylesheet" href="..."> tags
		const linkRegex =
			/<link\s+([^>]*href=["']([^"']+)["'][^>]*rel=["']stylesheet["'][^>]*)>/gi;
		const linkRegex2 =
			/<link\s+([^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*)>/gi;

		const updateLink = (match: string, attrs: string, href: string) => {
			const entry = getEntry(href);
			if (!entry) return match;

			if (/integrity=["'][^"']+["']/.test(attrs)) {
				const updated = attrs.replace(
					/integrity=["'][^"']+["']/,
					`integrity="${entry.integrity}"`,
				);
				return `<link ${updated}>`;
			}

			const newAttrs = `${attrs} integrity="${entry.integrity}" crossorigin="${this.config.crossorigin}"`;
			return `<link ${newAttrs}>`;
		};

		html = html.replace(linkRegex, updateLink);
		html = html.replace(linkRegex2, updateLink);
		return html;
	}

	/**
	 * Verify integrity of files against manifest
	 */
	async verify(
		manifestPath?: string,
	): Promise<{ valid: boolean; errors: string[] }> {
		const errors: string[] = [];
		const manifest = manifestPath ?? this.config.outputFile;

		try {
			const file = Bun.file(manifest);
			const data = (await file.json()) as {
				files: Record<string, { integrity: string }>;
			};

			for (const [filePath, info] of Object.entries(data.files)) {
				try {
					const entry = await this.generateHash(filePath);
					if (entry.integrity !== info.integrity) {
						errors.push(
							`${filePath}: integrity mismatch (expected ${info.integrity}, got ${entry.integrity})`,
						);
					}
				} catch (error) {
					errors.push(
						`${filePath}: ${error instanceof Error ? error.message : String(error)}`,
					);
				}
			}
		} catch (error) {
			errors.push(
				`Failed to read manifest: ${error instanceof Error ? error.message : String(error)}`,
			);
		}

		return { valid: errors.length === 0, errors };
	}

	/**
	 * Generate HTML snippet with SRI for a specific file
	 */
	getHtmlSnippet(filePath: string): string | null {
		const entry = this.entries.get(filePath) ?? this.findEntryByUrl(filePath);
		if (!entry) return null;

		const isJs = filePath.endsWith(".js") || filePath.endsWith(".mjs");
		const isCss = filePath.endsWith(".css");

		if (isJs) {
			return `<script src="${filePath}" integrity="${entry.integrity}" crossorigin="${this.config.crossorigin}"></script>`;
		}
		if (isCss) {
			return `<link rel="stylesheet" href="${filePath}" integrity="${entry.integrity}" crossorigin="${this.config.crossorigin}">`;
		}
		return null;
	}

	/**
	 * Get all entries
	 */
	getEntries(): SRIEntry[] {
		return Array.from(this.entries.values());
	}
}

/**
 * CLI-friendly functions
 */
export async function generateSRI(config: SRIConfig): Promise<SRIReport> {
	const generator = new SRIGenerator(config);
	return generator.generate();
}

export async function verifySRI(
	manifestPath: string,
	algorithm: SRIAlgorithm = "sha384",
): Promise<{ valid: boolean; errors: string[] }> {
	const generator = new SRIGenerator({ files: [], algorithm });
	return generator.verify(manifestPath);
}

export async function enforceSRI(
	htmlFiles: string[],
	jsFiles: string[],
	cssFiles: string[],
	algorithm: SRIAlgorithm = "sha384",
): Promise<SRIReport> {
	const generator = new SRIGenerator({
		files: [...jsFiles, ...cssFiles],
		htmlFiles,
		algorithm,
		autoUpdate: true,
	});
	return generator.generate();
}

/**
 * Quick hash for a single file (utility)
 */
export async function hashFile(
	filePath: string,
	algorithm: SRIAlgorithm = "sha384",
): Promise<string> {
	const generator = new SRIGenerator({ files: [filePath], algorithm });
	const entry = await generator.generateHash(filePath);
	return entry.integrity;
}
