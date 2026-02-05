/**
 * @fileoverview AST-Aware Analysis MCP Tools
 * @description MCP tools for AST-aware code analysis, pattern matching, and security detection
 * @module mcp/tools/ast-analysis
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-MCP-AST-ANALYSIS@0.1.0;instance-id=MCP-AST-ANALYSIS-001;version=0.1.0}]
 * [PROPERTIES:{mcp={value:"ast-analysis-tools";@root:"ROOT-MCP";@chain:["BP-MCP-TOOLS","BP-AST","BP-SECURITY"];@version:"0.1.0"}}]
 * [CLASS:AstAnalysisMCPTools][#REF:v-0.1.0.BP.MCP.AST.ANALYSIS.1.0.A.1.1.MCP.1.1]]
 */

import { $ } from "bun";

/**
 * Generate Bun PM hash for tool signing
 */
function generateToolHash(toolName: string, toolDefinition: string): string {
	const hasher = new Bun.CryptoHasher("sha256");
	hasher.update(toolName);
	hasher.update(toolDefinition);
	return hasher.digest("hex");
}

/**
 * AST-aware analysis MCP tools
 */
export function createAstAnalysisTools(): Array<{
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
	signature?: string; // Bun PM hash signature
}> {
	return [
		{
			name: "ast-grep-search",
			description: "AST-aware grep with semantic pattern matching. Find code patterns using AST syntax with context awareness and type inference.",
			inputSchema: {
				type: "object",
				properties: {
					pattern: {
						type: "string",
						description: "AST pattern to match (e.g., 'eval($EXPR)')",
					},
					query: {
						type: "string",
						description: "Complex query syntax (e.g., '[CallExpr:has([Identifier[name=\"require\"]])]')",
					},
					context: {
						type: "number",
						description: "Number of context lines to show",
						default: 3,
					},
					transform: {
						type: "string",
						description: "Transformation pattern (e.g., 'safeEval($EXPR)')",
					},
					rewrite: {
						type: "string",
						description: "Rewrite pattern (used with query)",
					},
					directory: {
						type: "string",
						description: "Directory to search",
						default: "src",
					},
				},
				required: ["pattern"],
			},
			execute: async (args) => {
				try {
					const { AstGrep } = await import("../../../scripts/ast-grep");
					const grep = new AstGrep({
						pattern: args.pattern || args.query || "",
						query: args.query,
						transform: args.transform || args.rewrite,
						context: args.context || 3,
					});

					const matches = await grep.search(args.directory || "src");
					
					if (args.transform || args.rewrite) {
						await grep.applyTransform();
						return {
							content: [
								{
									type: "text",
									text: `✅ Applied transformation to ${matches.length} matches`,
								},
							],
						};
					}

					return {
						content: [
							{
								type: "text",
								text: `Found ${matches.length} AST matches:\n\n${matches.map(m => `📄 ${m.file}:${m.line}:${m.column}\n   Match: ${m.match}\n   Type: ${m.inferredType || "unknown"}`).join("\n\n")}`,
							},
							{
								type: "data",
								data: { matches, count: matches.length },
							},
						],
					};
				} catch (error: any) {
					return {
						content: [{ type: "text", text: `Error: ${error.message}` }],
						isError: true,
					};
				}
			},
			signature: generateToolHash("ast-grep-search", "AST-aware grep with semantic pattern matching"),
		},
		{
			name: "pattern-weave-correlate",
			description: "Cross-file pattern correlation with confidence scoring. Correlate multiple patterns across codebase to find relationships.",
			inputSchema: {
				type: "object",
				properties: {
					patterns: {
						type: "string",
						description: "Path to YAML patterns config file",
						default: "./patterns.yaml",
					},
					acrossFiles: {
						type: "boolean",
						description: "Enable cross-file pattern correlation",
						default: true,
					},
					minConfidence: {
						type: "number",
						description: "Minimum confidence threshold",
						default: 0.85,
					},
					minSupport: {
						type: "number",
						description: "Minimum support threshold",
						default: 0.7,
					},
					output: {
						type: "string",
						description: "Output file path",
						default: "pattern-graph.json",
					},
				},
			},
			execute: async (args) => {
				try {
					const { PatternWeaver } = await import("../../../scripts/pattern-weave");
					const weaver = new PatternWeaver(args.patterns || "./patterns.yaml", {
						output: args.output || "pattern-graph.json",
						minSupport: args.minSupport || 0.7,
						confidence: args.minConfidence || 0.85,
						acrossFiles: args.acrossFiles !== false,
					});

					await weaver.loadPatterns();
					const correlations = await weaver.correlate();

					if (args.output) {
						// Export to JSON
						const patternMatches = weaver["patternMatches"];
						const graphData = {
							correlations: correlations.map(c => ({
								patternA: c.patternA,
								patternB: c.patternB,
								support: c.support,
								confidence: c.confidence,
								files: c.files,
							})),
							patterns: Array.from(patternMatches.entries()).map(([name, matches]) => ({
								name,
								matches: matches.length,
								files: [...new Set(matches.map(m => m.file))],
							})),
						};
						await Bun.write(args.output, JSON.stringify(graphData, null, 2));
					}

					return {
						content: [
							{
								type: "text",
								text: `Found ${correlations.length} pattern correlations:\n\n${correlations.map(c => `  ${c.patternA} ↔ ${c.patternB}\n    Support: ${(c.support * 100).toFixed(1)}%\n    Confidence: ${(c.confidence * 100).toFixed(1)}%\n    Files: ${c.files.length}`).join("\n\n")}`,
							},
							{
								type: "data",
								data: { correlations, count: correlations.length },
							},
						],
					};
				} catch (error: any) {
					return {
						content: [{ type: "text", text: `Error: ${error.message}` }],
						isError: true,
					};
				}
			},
			signature: generateToolHash("pattern-weave-correlate", "Cross-file pattern correlation with confidence scoring"),
		},
		{
			name: "anti-pattern-detect",
			description: "Security anti-pattern detection with automatic fixes. Detect security vulnerabilities and apply fixes automatically.",
			inputSchema: {
				type: "object",
				properties: {
					config: {
						type: "string",
						description: "Path to security rules YAML config",
						default: "./security-rules.yaml",
					},
					severity: {
						type: "string",
						enum: ["low", "medium", "high", "critical"],
						description: "Filter by severity level",
					},
					autofix: {
						type: "boolean",
						description: "Automatically apply fixes",
						default: false,
					},
					backup: {
						type: "boolean",
						description: "Create backup files before fixing",
						default: false,
					},
					report: {
						type: "string",
						description: "Generate markdown report",
						default: "security-antipatterns.md",
					},
				},
			},
			execute: async (args) => {
				try {
					const { AntiPatternDetector } = await import("../../../scripts/anti-pattern");
					const detector = new AntiPatternDetector(args.config || "./security-rules.yaml", {
						severity: args.severity,
						autofix: args.autofix || false,
						backup: args.backup || false,
						report: args.report || "security-antipatterns.md",
					});

					await detector.loadRules();
					await detector.scan();

					if (args.autofix) {
						await detector.fix();
					}

					if (args.report) {
						await detector.generateReport(args.report);
					}

					const findings = detector["findings"];

					return {
						content: [
							{
								type: "text",
								text: `Found ${findings.length} security findings:\n\n${findings.map(f => `[${f.rule.severity.toUpperCase()}] ${f.rule.name}\n  ${f.file}:${f.line}\n  ${f.match}\n  ${f.rule.description}${f.fixed ? "\n  ✅ Fixed" : ""}`).join("\n\n")}`,
							},
							{
								type: "data",
								data: { findings, count: findings.length },
							},
						],
					};
				} catch (error: any) {
					return {
						content: [{ type: "text", text: `Error: ${error.message}` }],
						isError: true,
					};
				}
			},
			signature: generateToolHash("anti-pattern-detect", "Security anti-pattern detection with automatic fixes"),
		},
		{
			name: "smell-diffuse-analyze",
			description: "Code smell diffusion analysis with visualization. Analyze code smell propagation and identify hotspots.",
			inputSchema: {
				type: "object",
				properties: {
					source: {
						type: "string",
						description: "Source file or directory to analyze",
						default: "src",
					},
					radius: {
						type: "number",
						description: "Diffusion radius for smell propagation",
						default: 3,
					},
					visualize: {
						type: "boolean",
						description: "Generate HTML visualization",
						default: false,
					},
					hotspots: {
						type: "boolean",
						description: "Show code smell hotspots",
						default: true,
					},
					export: {
						type: "string",
						description: "Export analysis results (JSON or HTML)",
					},
				},
			},
			execute: async (args) => {
				try {
					const { SmellDiffuser } = await import("../../../scripts/smell-diffuse");
					const diffuser = new SmellDiffuser(args.source || "src", {
						source: args.source,
						radius: args.radius || 3,
						visualize: args.visualize || false,
						hotspots: args.hotspots !== false,
						export: args.export,
					});

					const hotspots = await diffuser.analyze();

					if (args.export) {
						if (args.visualize && args.export.endsWith(".html")) {
							await diffuser.exportHTML(args.export);
						} else {
							await diffuser.export(args.export);
						}
					}

					return {
						content: [
							{
								type: "text",
								text: `Found ${hotspots.length} code smell hotspots:\n\n${hotspots.slice(0, 10).map(h => `📄 ${h.file}\n   Smells: ${h.smellCount}\n   Severity: ${(h.severity * 100).toFixed(0)}%\n   Affected Files: ${h.affectedFiles.length}`).join("\n\n")}`,
							},
							{
								type: "data",
								data: { hotspots, count: hotspots.length },
							},
						],
					};
				} catch (error: any) {
					return {
						content: [{ type: "text", text: `Error: ${error.message}` }],
						isError: true,
					};
				}
			},
			signature: generateToolHash("smell-diffuse-analyze", "Code smell diffusion analysis with visualization"),
		},
		{
			name: "pattern-evolve-track",
			description: "Track patterns across git history with frequency analysis and prediction. Analyze pattern evolution over time.",
			inputSchema: {
				type: "object",
				properties: {
					pattern: {
						type: "string",
						description: "Pattern to track (e.g., 'eval(')",
					},
					gitHistory: {
						type: "boolean",
						description: "Analyze git history",
						default: true,
					},
					frequencyAnalysis: {
						type: "boolean",
						description: "Perform frequency analysis",
						default: true,
					},
					predictNext: {
						type: "boolean",
						description: "Predict next occurrence",
						default: false,
					},
					export: {
						type: "string",
						description: "Export evolution data (JSON)",
					},
				},
				required: ["pattern"],
			},
			execute: async (args) => {
				try {
					const { PatternEvolver } = await import("../../../scripts/pattern-evolve");
					const evolver = new PatternEvolver({
						gitHistory: args.gitHistory !== false,
						frequencyAnalysis: args.frequencyAnalysis !== false,
						predictNext: args.predictNext || false,
						export: args.export,
					});

					const evolution = await evolver.analyze(args.pattern);

					if (args.export) {
						await evolver.export(args.export);
					}

					return {
						content: [
							{
								type: "text",
								text: `Pattern Evolution Report:\n\nPattern: ${evolution.pattern}\n  Frequency: ${evolution.frequency} occurrences\n  First seen: ${evolution.firstSeen}\n  Last seen: ${evolution.lastSeen}\n  Trend: ${evolution.trend}\n  Hotspots: ${evolution.hotspots.slice(0, 3).join(", ")}${evolution.predictedNext ? `\n  Predicted next: ${evolution.predictedNext.estimatedDate} (${(evolution.predictedNext.probability * 100).toFixed(0)}% probability)` : ""}`,
							},
							{
								type: "data",
								data: { evolution },
							},
						],
					};
				} catch (error: any) {
					return {
						content: [{ type: "text", text: `Error: ${error.message}` }],
						isError: true,
					};
				}
			},
			signature: generateToolHash("pattern-evolve-track", "Track patterns across git history with frequency analysis"),
		},
	];
}
