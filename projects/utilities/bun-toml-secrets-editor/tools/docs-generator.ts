#!/usr/bin/env bun
// Automated Documentation Generator for Bun v1.3.7+
// Uses structured annotation protocol for API documentation

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

// Annotation parser based on structured protocol
interface Annotation {
	domain: string;
	scope: string;
	type: string;
	meta: string;
	class: string;
	function: string;
	interface: string;
	reference: string;
	native: string;
	hooks?: string[];
}

interface ParsedAPI {
	annotations: Annotation[];
	examples: Record<string, string[]>;
	metrics: Record<string, string>;
	compatibility: Record<string, string[]>;
}

class DocumentationGenerator {
	private outputDir: string;
	private templates: Record<string, string> = {};

	constructor(outputDir: string = "./docs/generated") {
		this.outputDir = outputDir;
		this.ensureOutputDir();
		this.initializeTemplates();
	}

	private ensureOutputDir(): void {
		if (!existsSync(this.outputDir)) {
			mkdirSync(this.outputDir, { recursive: true });
		}
	}

	private initializeTemplates(): void {
		this.templates = {
			api: `
# {{title}}

{{description}}

## API Reference

{{apiTable}}

## Examples

{{examples}}

## Performance Metrics

{{metrics}}

## Compatibility

{{compatibility}}

## See Also

{{seeAlso}}
			`,
			cli: `
# {{title}}

{{description}}

## Usage

\`\`\`bash
{{usage}}
\`\`\`

## Options

{{options}}

## Examples

{{examples}}

## Performance Impact

{{performance}}
			`,
			index: `
# Bun v1.3.7+ API Documentation

{{navigation}}

## Overview

{{overview}}

## Quick Start

{{quickStart}}

## Featured APIs

{{featuredApis}}

## Migration Guide

{{migration}}
			`,
		};
	}

	// Parse annotation strings using the structured protocol
	parseAnnotation(annotation: string): Annotation | null {
		// Remove outer brackets if present
		annotation = annotation.replace(/^\[|\]$/g, "");

		const parts = annotation.split("][");
		if (parts.length < 9) return null;

		const [
			domain,
			scope,
			type,
			meta,
			className,
			functionName,
			interfaceType,
			reference,
			native,
			...hooks
		] = parts;

		return {
			domain,
			scope,
			type,
			meta,
			class: className,
			function: functionName,
			interface: interfaceType,
			reference,
			native,
			hooks: hooks.length > 0 ? hooks : undefined,
		};
	}

	// Extract annotations from source files
	async extractAnnotations(sourceFiles: string[]): Promise<ParsedAPI> {
		const parsed: ParsedAPI = {
			annotations: [],
			examples: {},
			metrics: {},
			compatibility: {},
		};

		for (const file of sourceFiles) {
			try {
				const content = await Bun.file(file).text();
				const lines = content.split("\n");

				for (let i = 0; i < lines.length; i++) {
					const line = lines[i].trim();
					if (
						line.includes("[") &&
						line.includes("]") &&
						(line.includes("BUN") || line.includes("NODE"))
					) {
						// Extract full annotation from line - capture everything between first [ and last ]
						const annotationMatch = line.match(
							/(?:\/\/\s*)?(\[(?:BUN|NODE)[^\]]*\](?:\[[^\]]*\])*)/,
						);
						if (annotationMatch) {
							const fullAnnotation = annotationMatch[1];
							const annotation = this.parseAnnotation(fullAnnotation);
							if (annotation) {
								parsed.annotations.push(annotation);

								// Extract examples from following lines
								if (line.includes("EXAMPLES:")) {
									const examples = this.extractExamples(lines, i + 1);
									if (examples.length > 0) {
										parsed.examples[
											`${annotation.class}.${annotation.function}`
										] = examples;
									}
								}

								// Extract performance metrics
								if (line.includes("PERF:")) {
									const metrics = this.extractMetrics(line);
									if (metrics) {
										parsed.metrics[
											`${annotation.class}.${annotation.function}`
										] = metrics;
									}
								}

								// Extract compatibility info
								if (line.includes("COMPAT:")) {
									const compat = this.extractCompatibility(line);
									if (compat) {
										parsed.compatibility[
											`${annotation.class}.${annotation.function}`
										] = compat;
									}
								}
							}
						}
					}
				}
			} catch (error) {
				console.warn(
					`Warning: Could not process file ${file}:`,
					(error as Error).message,
				);
			}
		}

		return parsed;
	}

	private extractExamples(lines: string[], startIndex: number): string[] {
		const examples: string[] = [];
		let inExample = false;
		let exampleLines: string[] = [];

		for (let i = startIndex; i < lines.length; i++) {
			const line = lines[i].trim();

			if (line.includes("EXAMPLES:") && !inExample) {
				inExample = true;
				continue;
			}

			if (inExample) {
				if (line.startsWith("//") || line.startsWith("/*") || line === "") {
					if (exampleLines.length > 0) {
						examples.push(exampleLines.join("\n").trim());
						exampleLines = [];
					}
					if (line === "" || line.includes("*/")) break;
				} else {
					exampleLines.push(line);
				}
			}
		}

		if (exampleLines.length > 0) {
			examples.push(exampleLines.join("\n").trim());
		}

		return examples;
	}

	private extractMetrics(line: string): string | null {
		const match = line.match(/PERF:\s*([^]]+)/);
		return match ? match[1].trim() : null;
	}

	private extractCompatibility(line: string): string[] | null {
		const match = line.match(/COMPAT:\s*([^]]+)/);
		if (!match) return null;

		return match[1]
			.split(",")
			.map((s) => s.trim())
			.filter((s) => s.length > 0);
	}

	// Generate API documentation
	generateAPIDocumentation(parsed: ParsedAPI): string {
		const apis = this.groupAnnotations(parsed.annotations);
		let output = "";

		for (const [category, items] of Object.entries(apis)) {
			output += this.generateCategorySection(category, items, parsed);
		}

		return output;
	}

	private groupAnnotations(
		annotations: Annotation[],
	): Record<string, Annotation[]> {
		const groups: Record<string, Annotation[]> = {};

		for (const annotation of annotations) {
			const key = `${annotation.domain}_${annotation.scope}_${annotation.type}`;
			if (!groups[key]) groups[key] = [];
			groups[key].push(annotation);
		}

		return groups;
	}

	private generateCategorySection(
		category: string,
		items: Annotation[],
		parsed: ParsedAPI,
	): string {
		const [domain, scope, type] = category.split("_");
		const title = `${domain} ${scope} ${type}`
			.replace(/_/g, " ")
			.replace(/\b\w/g, (l) => l.toUpperCase());

		let section = `## ${title}\n\n`;

		// Generate API table
		section += "| API | Type | Status | Description |\n";
		section += "|-----|------|--------|-------------|\n";

		for (const item of items) {
			const description = this.generateDescription(item);
			const status = this.getStatusEmoji(item.meta);
			section += `| \`${item.class}.${item.function}\` | ${item.interface} | ${status} ${item.meta} | ${description} |\n`;
		}

		section += "\n";

		// Add examples if available
		for (const item of items) {
			const key = `${item.class}.${item.function}`;
			if (parsed.examples[key]) {
				section += `### ${item.class}.${item.function}\n\n`;
				section += "#### Examples\n\n";

				for (const example of parsed.examples[key]) {
					section += "```typescript\n";
					section += example;
					section += "\n```\n\n";
				}
			}

			// Add metrics if available
			if (parsed.metrics[key]) {
				section += `#### Performance Metrics\n\n`;
				section += `${parsed.metrics[key]}\n\n`;
			}

			// Add compatibility if available
			if (parsed.compatibility[key]) {
				section += `#### Compatibility\n\n`;
				section +=
					parsed.compatibility[key].map((v) => `- ${v}`).join("\n") + "\n\n";
			}
		}

		return section;
	}

	private generateDescription(annotation: Annotation): string {
		const descriptions: Record<string, string> = {
			wrapAnsi: "88x faster ANSI text wrapping",
			JSON5: "Native JSON5 with comments",
			headerPreservation: "Exact HTTP header casing",
			etagCaching: "Conditional HTTP requests",
			profiling: "@profile decorators & timing",
			bucketStorage: "S3-compatible storage",
			cpuProf: "CPU profiling with Chrome DevTools",
			heapProf: "Heap snapshot with V8 format",
			inspector: "Node.js Inspector API",
			transpiler: "REPL mode transpiler",
			buffer: "Optimized Buffer operations",
		};

		return descriptions[annotation.function] || `${annotation.type} operation`;
	}

	private getStatusEmoji(meta: string): string {
		const emojis: Record<string, string> = {
			STABLE: "✅",
			NEW: "🆕",
			EXPERIMENTAL: "🧪",
			DEPRECATED: "⚠️",
		};

		return emojis[meta.replace(/[{}]/g, "")] || "❓";
	}

	// Generate CLI documentation
	generateCLIDocumentation(annotations: Annotation[]): string {
		const cliAnnotations = annotations.filter((a) => a.scope === "CLI");
		let output = "# CLI Reference\n\n";

		// Group by command
		const commands = this.groupBy(cliAnnotations, "class");

		for (const [command, items] of Object.entries(commands)) {
			output += `## ${command}\n\n`;
			output += "```bash\n";
			output += `bun run ${command.toLowerCase()} [options]\n`;
			output += "```\n\n";

			output += "### Options\n\n";
			output += "| Option | Type | Description |\n";
			output += "|--------|------|-------------|\n";

			for (const item of items) {
				const description = this.generateDescription(item);
				output += `| \`--${item.function}\` | ${item.interface} | ${description} |\n`;
			}

			output += "\n";
		}

		return output;
	}

	// Generate index page
	generateIndex(annotations: Annotation[]): string {
		let output = this.templates.index;

		// Generate navigation
		const categories = this.groupAnnotations(annotations);
		let navigation = "## API Categories\n\n";

		for (const [category] of Object.entries(categories)) {
			const [domain, scope, type] = category.split("_");
			const title = `${domain} ${scope} ${type}`
				.replace(/_/g, " ")
				.replace(/\b\w/g, (l) => l.toUpperCase());
			navigation += `- [${title}](#${title.toLowerCase().replace(/\s+/g, "-")})\n`;
		}

		// Generate featured APIs
		const featured = annotations
			.filter((a) => a.meta.includes("STABLE"))
			.slice(0, 10);
		let featuredApis = "### Core APIs\n\n";

		for (const api of featured) {
			featuredApis += `- **\`${api.class}.${api.function}\`** - ${this.generateDescription(api)}\n`;
		}

		output = output.replace("{{navigation}}", navigation);
		output = output.replace("{{featuredApis}}", featuredApis);
		output = output.replace("{{overview}}", this.generateOverview());
		output = output.replace("{{quickStart}}", this.generateQuickStart());
		output = output.replace("{{migration}}", this.generateMigration());

		return output;
	}

	private generateOverview(): string {
		return `
Bun v1.3.7 introduces significant performance improvements and new APIs:

- **88x faster ANSI text wrapping** with \`Bun.wrapAnsi()\`
- **Native JSON5 support** with comments and trailing commas
- **HTTP header preservation** for exact casing
- **ETag caching** for conditional requests
- **@profile decorators** for function profiling
- **Bucket storage** with S3-compatible operations
- **Enhanced Buffer operations** with CPU intrinsics
		`.trim();
	}

	private generateQuickStart(): string {
		return `
\`\`\`typescript
import { wrapText, loadJSON5, BucketClient } from 'bun137-features';

// ANSI text wrapping
const wrapped = wrapText(coloredText, 80);

// JSON5 parsing
const config = loadJSON5(configString);

// Bucket storage
const bucket = new BucketClient({ bucket: 'my-app' });
await bucket.uploadFile('data.json', content);
\`\`\`
		`.trim();
	}

	private generateMigration(): string {
		return `
### From v1.3.6 to v1.3.7

**Breaking Changes:**
- None - fully backward compatible

**New Features:**
- Add \`Bun.wrapAnsi()\` for text wrapping
- Add \`Bun.JSON5\` for configuration parsing
- Add HTTP header preservation
- Add ETag caching support
- Add \`@profile\` decorator
- Add bucket storage APIs

**Performance Improvements:**
- Buffer operations 50% faster
- ANSI wrapping 88x faster
- Reduced memory usage
		`.trim();
	}

	private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
		return array.reduce(
			(groups, item) => {
				const group = String(item[key]);
				if (!groups[group]) groups[group] = [];
				groups[group].push(item);
				return groups;
			},
			{} as Record<string, T[]>,
		);
	}

	// Generate all documentation
	async generateDocumentation(sourceFiles: string[]): Promise<void> {
		console.log("🚀 Generating Bun v1.3.7+ Documentation...\n");

		const parsed = await this.extractAnnotations(sourceFiles);
		console.log(`📊 Extracted ${parsed.annotations.length} annotations\n`);

		// Generate API documentation
		const apiDoc = this.generateAPIDocumentation(parsed);
		writeFileSync(join(this.outputDir, "api.md"), apiDoc);
		console.log("✅ Generated api.md");

		// Generate CLI documentation
		const cliDoc = this.generateCLIDocumentation(parsed.annotations);
		writeFileSync(join(this.outputDir, "cli.md"), cliDoc);
		console.log("✅ Generated cli.md");

		// Generate index
		const indexDoc = this.generateIndex(parsed.annotations);
		writeFileSync(join(this.outputDir, "index.md"), indexDoc);
		console.log("✅ Generated index.md");

		// Generate metrics report
		const metricsDoc = this.generateMetricsReport(parsed);
		writeFileSync(join(this.outputDir, "metrics.md"), metricsDoc);
		console.log("✅ Generated metrics.md");

		// Generate compatibility matrix
		const compatDoc = this.generateCompatibilityReport(parsed);
		writeFileSync(join(this.outputDir, "compatibility.md"), compatDoc);
		console.log("✅ Generated compatibility.md");

		console.log(`\n📚 Documentation generated in: ${this.outputDir}`);
	}

	private generateMetricsReport(parsed: ParsedAPI): string {
		let output = "# Performance Metrics\n\n";

		output += "## API Performance\n\n";
		output += "| API | Metrics |\n";
		output += "|-----|---------|\n";

		for (const [api, metrics] of Object.entries(parsed.metrics)) {
			output += `| \`${api}\` | ${metrics} |\n`;
		}

		output += "\n## Performance Improvements in v1.3.7\n\n";
		output += "- **Buffer.from()**: 50% faster using CPU intrinsics\n";
		output += "- **Buffer.swap16()**: 1.8x faster\n";
		output += "- **Buffer.swap64()**: 3.6x faster\n";
		output += "- **Bun.wrapAnsi()**: 88x faster than manual wrapping\n";
		output += "- **JSON5 parsing**: Native performance with comments\n";
		output += "- **HTTP headers**: Zero-copy header preservation\n";

		return output;
	}

	private generateCompatibilityReport(parsed: ParsedAPI): string {
		let output = "# Compatibility Matrix\n\n";

		output += "## Platform Support\n\n";
		output += "| Platform | Status | Notes |\n";
		output += "|----------|--------|-------|\n";
		output += "| macOS (Intel) | ✅ Full | All features supported |\n";
		output +=
			"| macOS (Apple Silicon) | ✅ Full | Optimized with intrinsics |\n";
		output += "| Linux (x64) | ✅ Full | All features supported |\n";
		output += "| Linux (ARM64) | ✅ Full | Optimized performance |\n";
		output += "| Windows (x64) | ✅ Full | All features supported |\n";

		output += "\n## Node.js Compatibility\n\n";

		for (const [api, compat] of Object.entries(parsed.compatibility)) {
			output += `### ${api}\n\n`;
			output += compat.map((v) => `- ${v}`).join("\n") + "\n\n";
		}

		output += "## Browser Compatibility\n\n";
		output += "| Feature | Chrome | Firefox | Safari | Edge |\n";
		output += "|---------|--------|---------|--------|------|\n";
		output += "| JSON5 parsing | ✅ | ✅ | ✅ | ✅ |\n";
		output += "| ANSI wrapping | ❌ | ❌ | ❌ | ❌ |\n";
		output += "| Buffer operations | ❌ | ❌ | ❌ | ❌ |\n";
		output += "| HTTP headers | ✅ | ✅ | ✅ | ✅ |\n";

		return output;
	}
}

// CLI interface
async function main() {
	const args = process.argv.slice(2);
	const sourceDir = args[0] || "./src";
	const outputDir = args[1] || "./docs/generated";

	// Find source files
	const sourceFiles: string[] = [];

	async function findFiles(dir: string) {
		try {
			// Use a simple approach with known files
			const files = [
				"src/utils/bun137-annotated.ts",
				"src/utils/bun137-features.ts",
				"src/cli/bun137-cli.ts",
				"src/cli/bun137-simple.ts",
				"examples/profile-usage.ts",
				"examples/bucket-integration.ts",
			];

			for (const file of files) {
				if (existsSync(file)) {
					sourceFiles.push(file);
					console.log(`📄 Found: ${file}`);
				}
			}
		} catch (error) {
			console.warn("Warning: Could not scan directory, using default files");
		}
	}

	await findFiles(sourceDir);

	if (sourceFiles.length === 0) {
		console.error("❌ No source files found");
		process.exit(1);
	}

	const generator = new DocumentationGenerator(outputDir);
	await generator.generateDocumentation(sourceFiles);
}

// Run if executed directly
if (import.meta.main) {
	main();
}

export { DocumentationGenerator, type Annotation, type ParsedAPI };
