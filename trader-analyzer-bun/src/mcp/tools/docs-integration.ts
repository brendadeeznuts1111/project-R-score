/**
 * @fileoverview Documentation Integration MCP Tools
 * @description MCP tools for documentation headers, footers, Bun docs, and tooling integration
 * @module mcp/tools/docs-integration
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-MCP-DOCS-INTEGRATION@0.1.0;instance-id=MCP-DOCS-INTEGRATION-001;version=0.1.0}]
 * [PROPERTIES:{mcp={value:"docs-integration";@root:"ROOT-MCP";@chain:["BP-MCP-TOOLS","BP-DOCS"];@version:"0.1.0"}}]
 * [CLASS:DocsIntegrationMCP][#REF:v-0.1.0.BP.MCP.DOCS.INTEGRATION.1.0.A.1.1.MCP.1.1]]
 */

import { $ } from "bun";
import { join } from "path";

/**
 * Documentation integration MCP tools
 */
export function createDocsIntegrationTools(): Array<{
	name: string;
	description: string;
	inputSchema: {
		type: "object";
		properties: Record<string, any>;
		required?: string[];
	};
	execute: (args: Record<string, any>) => Promise<{
		content: Array<{ type?: string; text?: string; data?: any }>;
		isError?: boolean;
	}>;
}> {
	return [
		{
			name: "docs-get-headers",
			description:
				"Get documentation headers from markdown files using grepable [DOMAIN.CATEGORY.KEYWORD.RG] format",
			inputSchema: {
				type: "object",
				properties: {
					domain: {
						type: "string",
						description: "Filter by domain (e.g., ORCA, API, MCP, NODE)",
					},
					category: {
						type: "string",
						description:
							"Filter by category (e.g., INTEGRATION, STORAGE, SERVER)",
					},
					file: {
						type: "string",
						description: "Specific markdown file to search",
					},
				},
			},
			execute: async (args: Record<string, any>) => {
				try {
					const domain = args.domain as string | undefined;
					const category = args.category as string | undefined;
					const file = args.file as string | undefined;

					// Build grep pattern
					let pattern = "\\[.*\\.RG\\]";
					if (domain) {
						pattern = `\\[${domain.toUpperCase()}`;
						if (category) {
							pattern += `\\.${category.toUpperCase()}`;
						}
						pattern += ".*\\.RG\\]";
					}

					// Search files
					let files: string[] = [];
					if (file) {
						files = [file];
					} else {
						try {
							const result = await $`rg -l "${pattern}" *.md **/*.md`.text();
							files = result.trim().split("\n").filter(Boolean);
						} catch {
							// No matches or rg not available, try manual search
							files = [];
						}
					}

					const headers: Array<{
						file: string;
						header: string;
						line: number;
						domain?: string;
						category?: string;
						keyword?: string;
					}> = [];

					for (const filePath of files) {
						const file = Bun.file(filePath);
						if (!(await file.exists())) continue;

						try {
							const content = await file.text();
							const lines = content.split("\n");

							for (let i = 0; i < lines.length; i++) {
								const line = lines[i];
								const match = line.match(
									/\[([A-Z_]+)\.([A-Z_]+)\.([A-Z_]+)\.RG\]/,
								);
								if (match) {
									const [, dom, cat, keyword] = match;
									if (
										(!domain || dom === domain.toUpperCase()) &&
										(!category || cat === category.toUpperCase())
									) {
										headers.push({
											file: filePath,
											header: line.trim(),
											line: i + 1,
											domain: dom,
											category: cat,
											keyword,
										});
									}
								}
							}
						} catch {
							// Skip files that can't be read
						}
					}

					return {
						content: [
							{
								text:
									`Documentation Headers Found: ${headers.length}\n\n` +
									headers
										.map(
											(h) =>
												`${h.file}:${h.line}\n  ${h.header}\n  Domain: ${h.domain}, Category: ${h.category}, Keyword: ${h.keyword}\n`,
										)
										.join("\n"),
							},
						],
					};
				} catch (error: any) {
					return {
						content: [
							{
								text: `Error getting headers: ${error.message}`,
							},
						],
						isError: true,
					};
				}
			},
		},
		{
			name: "docs-get-footers",
			description: "Get documentation footers and metadata from markdown files",
			inputSchema: {
				type: "object",
				properties: {
					file: {
						type: "string",
						description: "Specific markdown file to read",
					},
				},
			},
			execute: async (args: Record<string, any>) => {
				try {
					const file = args.file as string | undefined;

					if (!file) {
						return {
							content: [
								{
									text: "Please provide a valid file path",
								},
							],
							isError: true,
						};
					}

					const fileRef = Bun.file(file);
					if (!(await fileRef.exists())) {
						return {
							content: [
								{
									text: "Please provide a valid file path",
								},
							],
							isError: true,
						};
					}

					const content = await fileRef.text();
					const lines = content.split("\n");

					// Find footer (usually last 10-20 lines with metadata)
					const footerStart = Math.max(0, lines.length - 20);
					const footerLines = lines.slice(footerStart);

					// Extract metadata patterns
					const metadata: Record<string, string> = {};
					const refMatches = content.match(/#REF:([^\s]+)/g);
					const blueprintMatches = content.match(/blueprint=([^\s@]+)/g);
					const versionMatches = content.match(/version=([^\s}]+)/g);

					if (refMatches) {
						metadata.references = refMatches.join(", ");
					}
					if (blueprintMatches) {
						metadata.blueprints = blueprintMatches.join(", ");
					}
					if (versionMatches) {
						metadata.versions = versionMatches.join(", ");
					}

					return {
						content: [
							{
								text:
									`Documentation Footer for ${file}:\n\n` +
									`Footer Lines:\n${footerLines.join("\n")}\n\n` +
									`Metadata:\n${JSON.stringify(metadata, null, 2)}`,
							},
						],
					};
				} catch (error: any) {
					return {
						content: [
							{
								text: `Error getting footer: ${error.message}`,
							},
						],
						isError: true,
					};
				}
			},
		},
		{
			name: "docs-bun-reference",
			description:
				"Get Bun documentation references and links for specific APIs",
			inputSchema: {
				type: "object",
				properties: {
					api: {
						type: "string",
						description: "Bun API name (e.g., Bun.serve, Bun.file, bun:sqlite)",
					},
				},
			},
			execute: async (args: Record<string, any>) => {
				try {
					const api = (args.api as string) || "";

					const bunDocs: Record<string, string> = {
						"Bun.serve": "https://bun.com/docs/runtime/bun-apis",
						"Bun.file": "https://bun.com/docs/runtime/bun-apis",
						"bun:sqlite": "https://bun.com/reference",
						"Bun.websocket": "https://bun.com/docs/runtime/bun-apis",
						"Bun.shell": "https://bun.com/docs/runtime/bun-apis",
						"Bun.secrets": "https://bun.com/docs/runtime/bun-apis",
						"Bun.nanoseconds": "https://bun.com/docs/runtime/bun-apis",
						"Bun.sleep": "https://bun.com/docs/runtime/bun-apis",
						"Bun.write": "https://bun.com/docs/runtime/bun-apis",
						"Bun.read": "https://bun.com/docs/runtime/bun-apis",
						"Bun.hash": "https://bun.com/docs/runtime/bun-apis",
						"Bun.randomUUIDv5": "https://bun.com/docs/runtime/bun-apis",
						"Bun.generateHeapSnapshot": "https://bun.com/docs/runtime/bun-apis",
						"Bun.ffi": "https://bun.com/docs/runtime/bun-apis",
						"Bun.Worker": "https://bun.com/docs/runtime/bun-apis",
						"Bun.Glob": "https://bun.com/docs/runtime/bun-apis",
						"Bun.inspect": "https://bun.com/docs/runtime/bun-apis",
						URLSearchParams:
							"https://bun.com/reference/globals/URLSearchParams",
					};

					if (api) {
						const url = bunDocs[api];
						if (url) {
							return {
								content: [
									{
										text: `Bun API: ${api}\nDocumentation: ${url}\n\nFull Bun Reference: https://bun.com/reference\nBun Globals: https://bun.com/reference/globals`,
									},
								],
							};
						}
						return {
							content: [
								{
									text: `API "${api}" not found. Available APIs:\n${Object.keys(bunDocs).join("\n")}\n\nFull Bun Reference: https://bun.com/reference\nBun Globals: https://bun.com/reference/globals`,
								},
							],
						};
					}

					return {
						content: [
							{
								text:
									`Bun Documentation References:\n\n` +
									Object.entries(bunDocs)
										.map(([apiName, url]) => `  ${apiName}: ${url}`)
										.join("\n") +
									`\n\nFull Bun Reference: https://bun.com/reference\nBun Globals: https://bun.com/reference/globals`,
							},
						],
					};
				} catch (error: any) {
					return {
						content: [
							{
								text: `Error getting Bun docs: ${error.message}`,
							},
						],
						isError: true,
					};
				}
			},
		},
		{
			name: "docs-tooling-info",
			description:
				"Get tooling information including Bun version, available tools, and CLI commands",
			inputSchema: {
				type: "object",
				properties: {},
			},
			execute: async () => {
				try {
					const bunVersion = await $`bun --version`.text();
					const platform = `${process.platform}-${process.arch}`;

					// Read package.json for scripts
					const packageJsonPath = join(process.cwd(), "package.json");
					let scripts: Record<string, string> = {};
					const packageJsonFile = Bun.file(packageJsonPath);
					if (await packageJsonFile.exists()) {
						const packageJson = await packageJsonFile.json();
						scripts = packageJson.scripts || {};
					}

					// Get available Bun APIs
					const bunApis = [
						"Bun.serve",
						"Bun.file",
						"bun:sqlite",
						"Bun.websocket",
						"Bun.shell",
						"Bun.secrets",
						"Bun.nanoseconds",
						"Bun.sleep",
						"Bun.write",
						"Bun.read",
						"Bun.hash",
						"Bun.randomUUIDv5",
						"Bun.generateHeapSnapshot",
						"Bun.ffi",
						"Bun.Worker",
						"Bun.Glob",
						"Bun.inspect",
					];

					return {
						content: [
							{
								text:
									`Tooling Information:\n\n` +
									`Bun Version: ${bunVersion.trim()}\n` +
									`Platform: ${platform}\n` +
									`Node Version: ${process.version}\n\n` +
									`Available Scripts:\n${Object.entries(scripts)
										.map(([name, cmd]) => `  ${name}: ${cmd}`)
										.join("\n")}\n\n` +
									`Bun APIs Used:\n${bunApis.map((api) => `  - ${api}`).join("\n")}\n\n` +
									`Documentation:\n` +
									`  Bun Reference: https://bun.com/reference\n` +
									`  MCP Server: See MCP-SERVER.md\n` +
									`  API Docs: http://localhost:3000/docs\n` +
									`  Error Registry: http://localhost:3000/docs/errors`,
							},
						],
					};
				} catch (error: any) {
					return {
						content: [
							{
								text: `Error getting tooling info: ${error.message}`,
							},
						],
						isError: true,
					};
				}
			},
		},
		{
			name: "docs-get-sitemap",
			description:
				"Get component sitemap with CSS classes, components, and layers using 1.x.x.x hierarchical numbering",
			inputSchema: {
				type: "object",
				properties: {
					section: {
						type: "string",
						enum: [
							"css",
							"components",
							"layers",
							"interfaces",
							"functions",
							"colors",
							"all",
						],
						description: "Section to retrieve",
					},
				},
			},
			execute: async (args: Record<string, any>) => {
				try {
					const section = (args.section as string) || "all";
					const sitemapPath = join(process.cwd(), "COMPONENT-SITEMAP.md");
					const sitemapFile = Bun.file(sitemapPath);

					if (!(await sitemapFile.exists())) {
						return {
							content: [
								{
									text: `Component sitemap not found at ${sitemapPath}. Run docs-generate-sitemap first.`,
								},
							],
							isError: true,
						};
					}

					const content = await sitemapFile.text();
					const lines = content.split("\n");

					// Extract specific section if requested
					if (section !== "all") {
						const sectionMap: Record<string, string> = {
							css: "## 2. [CSS.CLASSES.RG]",
							components: "## 3. [COMPONENTS.CLASSES.RG]",
							layers: "## 4. [LAYERS.ARCHITECTURE.RG]",
							interfaces: "## 5. [INTERFACES.REFERENCE.RG]",
							functions: "## 6. [FUNCTIONS.REFERENCE.RG]",
							colors: "## 7. [COLORS.REFERENCE.RG]",
						};

						const startMarker = sectionMap[section];
						if (!startMarker) {
							return {
								content: [
									{
										text: `Invalid section: ${section}. Valid sections: ${Object.keys(sectionMap).join(", ")}`,
									},
								],
								isError: true,
							};
						}

						const startIdx = lines.findIndex((l) => l.startsWith(startMarker));
						if (startIdx === -1) {
							return {
								content: [
									{
										text: `Section "${section}" not found in sitemap`,
									},
								],
								isError: true,
							};
						}

						// Find next section or end of file
						const nextSectionIdx = lines
							.slice(startIdx + 1)
							.findIndex((l) => l.match(/^## \d+\. \[/));
						const endIdx =
							nextSectionIdx === -1
								? lines.length
								: startIdx + 1 + nextSectionIdx;

						const sectionContent = lines.slice(startIdx, endIdx).join("\n");

						return {
							content: [
								{
									text: `Component Sitemap - ${section.toUpperCase()} Section:\n\n${sectionContent}`,
								},
							],
						};
					}

					return {
						content: [
							{
								text: `Component Sitemap (Full):\n\n${content}`,
							},
						],
					};
				} catch (error: any) {
					return {
						content: [
							{
								text: `Error getting sitemap: ${error.message}`,
							},
						],
						isError: true,
					};
				}
			},
		},
		{
			name: "docs-metadata-mapping",
			description:
				"Get metadata mapping between code tags, API tags, and documentation headers",
			inputSchema: {
				type: "object",
				properties: {
					format: {
						type: "string",
						enum: ["code", "api", "docs"],
						description: "Filter by format type",
					},
				},
			},
			execute: async (args: Record<string, any>) => {
				try {
					const format = args.format as string | undefined;

					const mappings = {
						code: {
							format:
								"[[TECH][MODULE][INSTANCE][META:{blueprint=BP-XXX@v}][PROPERTIES:{...}][CLASS:ClassName][#REF:...]]",
							example:
								'[[TECH][MODULE][INSTANCE][META:{blueprint=BP-MCP-SERVER@0.1.0}][PROPERTIES:{mcp={value:"mcp-server"}}][CLASS:MCPServer][#REF:v-0.1.0.BP.MCP.SERVER.1.0.A.1.1.MCP.1.1]]',
							components: [
								"[[TECH]] - Technical domain marker",
								"[MODULE] - Module identifier",
								"[INSTANCE] - Instance identifier",
								"[META:{...}] - Metadata object",
								"[PROPERTIES:{...}] - Properties",
								"[CLASS:...] - Class name",
								"[#REF:...] - Reference identifier",
							],
						},
						api: {
							format: "[DOMAIN][SCOPE][TYPE][META:{PROPERTY}][CLASS][#REF:*]",
							example:
								"[CORE][SYSTEM][STATUS]{uptime,version}[HealthController][#REF:routes.ts:15]",
							components: [
								"[DOMAIN] - Domain (CORE, SPORTS, PREDICTION, TRADING, DEV)",
								"[SCOPE] - Scope (SYSTEM, DATA, COMPUTE, EXTERNAL, REALTIME, PERSIST)",
								"[TYPE] - Type (STATUS, IMPORT, QUERY, STATS, WEBSOCKET, etc.)",
								"[META:{PROPERTY}] - Metadata properties",
								"[CLASS] - Class name (optional)",
								"[#REF:*] - Reference to code location",
							],
						},
						docs: {
							format: "[DOMAIN.CATEGORY.KEYWORD.RG]",
							example: "[MCP.SERVER.RG] Model Context Protocol Server",
							components: [
								"DOMAIN - High-level domain (ORCA, PIPELINE, RBAC, API, STORAGE)",
								"CATEGORY - Category within domain (ARBITRAGE, INTEGRATION, STORAGE, SECURITY)",
								"KEYWORD - Specific keyword for ripgrep (INTEGRATION, REVIEW, VALIDATION)",
								"RG - Ripgrep marker",
							],
						},
					};

					if (format && mappings[format as keyof typeof mappings]) {
						const mapping = mappings[format as keyof typeof mappings];
						return {
							content: [
								{
									text:
										`${format.toUpperCase()} Metadata Format:\n\n` +
										`Format: ${mapping.format}\n\n` +
										`Example:\n${mapping.example}\n\n` +
										`Components:\n${mapping.components.map((c) => `  - ${c}`).join("\n")}`,
								},
							],
						};
					}

					return {
						content: [
							{
								text:
									`Metadata Mapping System:\n\n` +
									Object.entries(mappings)
										.map(
											([key, value]) =>
												`${key.toUpperCase()}:\n  Format: ${value.format}\n  Example: ${value.example}\n`,
										)
										.join("\n") +
									`\nSee METADATA-DOCUMENTATION-MAPPING.md for full details.`,
							},
						],
					};
				} catch (error: any) {
					return {
						content: [
							{
								text: `Error getting metadata mapping: ${error.message}`,
							},
						],
						isError: true,
					};
				}
			},
		},
	];
}
