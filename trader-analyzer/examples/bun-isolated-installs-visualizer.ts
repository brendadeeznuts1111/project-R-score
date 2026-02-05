#!/usr/bin/env bun
/**
 * Bun Isolated Installs Visualizer
 *
 * Visual representation of isolated installs with:
 * - Mermaid tree diagrams
 * - ANSI color nodes
 * - Hex color scheme
 * - Property inspection
 * - Testing capabilities
 * - bun info integration
 * - bun pm pkg commands
 * - bun patch support
 *
 * @file examples/bun-isolated-installs-visualizer.ts
 * @see {@link https://bun.com/docs/pm|Bun Package Manager Documentation}
 * @see {@link ../docs/BUN-ISOLATED-INSTALLS.md|Isolated Installs Guide}
 * @see {@link ../docs/BUN-PM.md|Bun PM Commands}
 * @see {@link ../docs/BUN-PATCH.md|Bun Patch Guide}
 * @see {@link ../benchmarks/README.md|Benchmarks} - Performance benchmarking guide
 * @see {@link ../docs/BUN-V1.51-IMPACT-ANALYSIS.md|Bun v1.51 Impact Analysis} - Performance optimizations
 * @see {@link ./COMMANDS.md|Commands Reference}
 *
 * Usage:
 *   bun run examples/bun-isolated-installs-visualizer.ts tree
 *   bun run examples/bun-isolated-installs-visualizer.ts compare
 *   bun run examples/bun-isolated-installs-visualizer.ts mermaid
 *   bun run examples/bun-isolated-installs-visualizer.ts test
 *
 * Benchmarking:
 *   bun --cpu-prof run examples/bun-isolated-installs-visualizer.ts tree
 *   bun run scripts/benchmarks/create-benchmark.ts \
 *     --profile=isolated-installs.cpuprofile \
 *     --name="Isolated Installs Visualization" \
 *     --tags="isolated-installs,visualization"
 */


// ═══════════════════════════════════════════════════════════════
// Constants (UPPER_SNAKE_CASE)
// ═══════════════════════════════════════════════════════════════

/** Color scheme mapping (hex to ANSI escape codes) */
const COLORS = {
	// Primary colors
	primary: { hex: "#00ff88", ansi: "\x1b[38;2;0;255;136m" },
	secondary: { hex: "#00d4ff", ansi: "\x1b[38;2;0;212;255m" },
	accent: { hex: "#ffaa00", ansi: "\x1b[38;2;255;170;0m" },
	
	// Node types
	store: { hex: "#4a90e2", ansi: "\x1b[38;2;74;144;226m" },
	symlink: { hex: "#00ff88", ansi: "\x1b[38;2;0;255;136m" },
	workspace: { hex: "#ff6b9d", ansi: "\x1b[38;2;255;107;157m" },
	package: { hex: "#a78bfa", ansi: "\x1b[38;2;167;139;250m" },
	peer: { hex: "#fbbf24", ansi: "\x1b[38;2;251;191;36m" },
	
	// Status colors
	success: { hex: "#10b981", ansi: "\x1b[38;2;16;185;129m" },
	warning: { hex: "#f59e0b", ansi: "\x1b[38;2;245;158;11m" },
	error: { hex: "#ef4444", ansi: "\x1b[38;2;239;68;68m" },
	info: { hex: "#3b82f6", ansi: "\x1b[38;2;59;130;246m" },
	
	// Reset
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	dim: "\x1b[2m",
};

// ═══════════════════════════════════════════════════════════════
// Types & Interfaces (PascalCase)
// ═══════════════════════════════════════════════════════════════

/** Tree node structure for isolated installs visualization */
interface TreeNode {
	name: string;
	type: "store" | "symlink" | "workspace" | "package" | "peer";
	path: string;
	children?: TreeNode[];
	properties?: Record<string, any>;
}

/**
 * Generate isolated installs tree structure
 */
function generateIsolatedTree(): TreeNode {
	return {
		name: "node_modules",
		type: "package",
		path: "node_modules",
		children: [
			{
				name: ".bun",
				type: "store",
				path: "node_modules/.bun",
				properties: {
					description: "Central package store",
					strategy: "isolated",
				},
				children: [
					{
						name: "react@18.2.0",
						type: "store",
						path: "node_modules/.bun/react@18.2.0",
						properties: {
							version: "18.2.0",
							peerDependencies: {},
						},
						children: [
							{
								name: "node_modules",
								type: "package",
								path: "node_modules/.bun/react@18.2.0/node_modules",
								children: [
									{
										name: "react",
										type: "package",
										path: "node_modules/.bun/react@18.2.0/node_modules/react",
										properties: {
											files: ["index.js", "package.json"],
										},
									},
								],
							},
						],
					},
					{
						name: "zod@3.21.4",
						type: "store",
						path: "node_modules/.bun/zod@3.21.4",
						properties: {
							version: "3.21.4",
							peerDependencies: {},
						},
						children: [
							{
								name: "node_modules",
								type: "package",
								path: "node_modules/.bun/zod@3.21.4/node_modules",
								children: [
									{
										name: "zod",
										type: "package",
										path: "node_modules/.bun/zod@3.21.4/node_modules/zod",
										properties: {
											files: ["index.d.ts", "package.json"],
										},
									},
								],
							},
						],
					},
					{
						name: "react-dom@18.2.0_react@18.2.0",
						type: "peer",
						path: "node_modules/.bun/react-dom@18.2.0_react@18.2.0",
						properties: {
							version: "18.2.0",
							peerDependencies: { react: "18.2.0" },
							description: "Peer dependency resolution",
						},
						children: [
							{
								name: "node_modules",
								type: "package",
								path: "node_modules/.bun/react-dom@18.2.0_react@18.2.0/node_modules",
								children: [
									{
										name: "react-dom",
										type: "package",
										path: "node_modules/.bun/react-dom@18.2.0_react@18.2.0/node_modules/react-dom",
									},
								],
							},
						],
					},
				],
			},
			{
				name: "react",
				type: "symlink",
				path: "node_modules/react",
				properties: {
					target: ".bun/react@18.2.0/node_modules/react",
					symlink: true,
				},
			},
			{
				name: "react-dom",
				type: "symlink",
				path: "node_modules/react-dom",
				properties: {
					target: ".bun/react-dom@18.2.0_react@18.2.0/node_modules/react-dom",
					symlink: true,
				},
			},
			{
				name: "zod",
				type: "symlink",
				path: "node_modules/zod",
				properties: {
					target: ".bun/zod@3.21.4/node_modules/zod",
					symlink: true,
				},
			},
			{
				name: "@nexus-radiance/core",
				type: "workspace",
				path: "node_modules/@nexus-radiance/core",
				properties: {
					target: "../../packages/core",
					workspace: true,
					protocol: "workspace:*",
				},
			},
		],
	};
}

/**
 * Generate hoisted tree for comparison
 */
function generateHoistedTree(): TreeNode {
	return {
		name: "node_modules",
		type: "package",
		path: "node_modules",
		properties: {
			strategy: "hoisted",
			description: "Traditional npm/Yarn structure",
		},
		children: [
			{
				name: "react",
				type: "package",
				path: "node_modules/react",
				properties: {
					version: "18.2.0",
					hoisted: true,
				},
			},
			{
				name: "react-dom",
				type: "package",
				path: "node_modules/react-dom",
				properties: {
					version: "18.2.0",
					hoisted: true,
				},
			},
			{
				name: "zod",
				type: "package",
				path: "node_modules/zod",
				properties: {
					version: "3.21.4",
					hoisted: true,
				},
			},
		],
	};
}

/**
 * Render tree with ANSI colors
 */
function renderAnsiTree(node: TreeNode, prefix = "", isLast = true, depth = 0): string {
	const color = COLORS[node.type] || COLORS.package;
	const icon = node.type === "symlink" ? "→" : node.type === "workspace" ? "🔗" : node.type === "store" ? "📦" : "📄";
	
	let output = "";
	const connector = isLast ? "└── " : "├── ";
	const name = `${color.ansi}${icon} ${node.name}${COLORS.reset}`;
	const typeLabel = `${COLORS.dim}[${node.type}]${COLORS.reset}`;
	
	output += `${prefix}${connector}${name} ${typeLabel}\n`;
	
	if (node.properties) {
		const propsPrefix = prefix + (isLast ? "    " : "│   ");
		for (const [key, value] of Object.entries(node.properties)) {
			const propValue = typeof value === "object" ? JSON.stringify(value) : String(value);
			output += `${propsPrefix}${COLORS.dim}  ${key}: ${propValue}${COLORS.reset}\n`;
		}
	}
	
	if (node.children && node.children.length > 0) {
		const childPrefix = prefix + (isLast ? "    " : "│   ");
		for (let i = 0; i < node.children.length; i++) {
			const isLastChild = i === node.children.length - 1;
			output += renderAnsiTree(node.children[i], childPrefix, isLastChild, depth + 1);
		}
	}
	
	return output;
}

/**
 * Generate Mermaid diagram
 */
function generateMermaidTree(node: TreeNode, parentId = "root"): string {
	let output = "";
	let nodeId = 0;
	const nodeMap = new Map<TreeNode, string>();
	
	function getNodeId(n: TreeNode): string {
		if (!nodeMap.has(n)) {
			nodeMap.set(n, `node${nodeId++}`);
		}
		return nodeMap.get(n)!;
	}
	
	function renderMermaidNode(n: TreeNode, parent: string | null): void {
		const id = getNodeId(n);
		const color = COLORS[n.type]?.hex || COLORS.package.hex;
		const shape = n.type === "symlink" ? "((symlink))" : n.type === "workspace" ? "{{workspace}}" : n.type === "store" ? "[store]" : "[package]";
		
		const label = `${n.name}\\n${n.type}`;
		output += `    ${id}${shape}["${label}"]:::${n.type}\n`;
		
		if (parent) {
			output += `    ${parent} --> ${id}\n`;
		}
		
		if (n.children) {
			for (const child of n.children) {
				renderMermaidNode(child, id);
			}
		}
	}
	
	output += "```mermaid\n";
	output += "graph TD\n";
	output += `    classDef store fill:${COLORS.store.hex},stroke:#fff,stroke-width:2px,color:#fff\n`;
	output += `    classDef symlink fill:${COLORS.symlink.hex},stroke:#fff,stroke-width:2px,color:#000\n`;
	output += `    classDef workspace fill:${COLORS.workspace.hex},stroke:#fff,stroke-width:2px,color:#fff\n`;
	output += `    classDef package fill:${COLORS.package.hex},stroke:#fff,stroke-width:2px,color:#fff\n`;
	output += `    classDef peer fill:${COLORS.peer.hex},stroke:#fff,stroke-width:2px,color:#000\n`;
	
	renderMermaidNode(node, null);
	output += "```\n";
	
	return output;
}

/**
 * Test isolated installs properties
 */
async function testIsolatedInstalls() {
	console.log(`${COLORS.bold}${COLORS.info.ansi}Testing Isolated Installs Properties${COLORS.reset}\n`);
	
	const tests = [
		{
			name: "Check bunfig.toml configuration",
			test: async () => {
				const bunfigPath = Bun.file("config/bunfig.toml");
				if (await bunfigPath.exists()) {
					const content = await bunfigPath.text();
					const hasIsolated = content.includes('linker = "isolated"');
					return {
						pass: hasIsolated,
						message: hasIsolated ? "Isolated linker configured" : "Hoisted linker configured",
					};
				}
				return { pass: false, message: "bunfig.toml not found" };
			},
		},
		{
			name: "Check lockfile configVersion",
			test: async () => {
				const lockfilePath = Bun.file("bun.lock");
				if (await lockfilePath.exists()) {
					const content = await lockfilePath.text();
					const hasConfigVersion = content.includes('"configVersion"');
					return {
						pass: hasConfigVersion,
						message: hasConfigVersion ? "Lockfile has configVersion" : "Lockfile missing configVersion",
					};
				}
				return { pass: false, message: "bun.lock not found" };
			},
		},
		{
			name: "Check node_modules structure",
			test: async () => {
				const nodeModulesPath = Bun.file("node_modules/.bun");
				try {
					const exists = await nodeModulesPath.exists();
					return {
						pass: exists,
						message: exists ? "Isolated installs detected (.bun directory exists)" : "Hoisted installs (no .bun directory)",
					};
				} catch {
					return { pass: false, message: "node_modules not found or hoisted installs" };
				}
			},
		},
	];
	
	for (const test of tests) {
		try {
			const result = await test.test();
			const status = result.pass ? `${COLORS.success.ansi}✅${COLORS.reset}` : `${COLORS.warning.ansi}⚠️${COLORS.reset}`;
			console.log(`${status} ${test.name}: ${result.message}`);
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error);
			console.log(`${COLORS.error.ansi}❌${COLORS.reset} ${test.name}: ${message}`);
		}
	}
	
	console.log("");
}

/**
 * Display color scheme
 */
function displayColorScheme() {
	console.log(`${COLORS.bold}Color Scheme (Hex → ANSI)${COLORS.reset}\n`);
	
	const colorTypes = [
		{ name: "Store", color: COLORS.store },
		{ name: "Symlink", color: COLORS.symlink },
		{ name: "Workspace", color: COLORS.workspace },
		{ name: "Package", color: COLORS.package },
		{ name: "Peer", color: COLORS.peer },
	];
	
	for (const { name, color } of colorTypes) {
		console.log(`${color.ansi}${name.padEnd(12)}${COLORS.reset} Hex: ${color.hex} ANSI: ${color.ansi}sample${COLORS.reset}`);
	}
	
	console.log("");
}

/**
 * Get package info using bun info (alias for bun pm view)
 * 
 * Usage:
 *   bun info <package-name>              # Basic info
 *   bun info <package-name>@<version>    # Specific version
 *   bun info <package-name> <property>  # Specific property
 *   bun info <package-name> --json       # JSON output
 */
async function getPackageInfo(packageName: string, property?: string, json = false): Promise<any> {
	try {
		const args = ["info", packageName];
		if (property) {
			args.push(property);
		}
		if (json) {
			args.push("--json");
		}
		
		const proc = Bun.spawn(["bun", ...args], {
			stdout: "pipe",
			stderr: "pipe",
		});
		
		const output = await new Response(proc.stdout).text();
		const error = await new Response(proc.stderr).text();
		const exitCode = await proc.exited;
		
		if (exitCode !== 0 && error && !output) {
			return { error: error.trim() };
		}
		
		if (json) {
			try {
				return { output: JSON.parse(output.trim()), raw: output };
			} catch {
				return { output: output.trim(), raw: output };
			}
		}
		
		return { output: output.trim(), raw: output };
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		return { error: message };
	}
}

/**
 * Get package.json property using bun pm pkg get
 */
async function getPackageProperty(property: string): Promise<any> {
	try {
		const proc = Bun.spawn(["bun", "pm", "pkg", "get", property], {
			stdout: "pipe",
			stderr: "pipe",
			cwd: process.cwd(),
		});
		
		const output = await new Response(proc.stdout).text();
		const error = await new Response(proc.stderr).text();
		
		if (error && !output) {
			return { error: error.trim() };
		}
		
		return { value: output.trim(), raw: output };
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		return { error: message };
	}
}

/**
 * Set package.json property using bun pm pkg set
 */
async function setPackageProperty(property: string, value: string): Promise<any> {
	try {
		const proc = Bun.spawn(["bun", "pm", "pkg", "set", `${property}=${value}`], {
			stdout: "pipe",
			stderr: "pipe",
			cwd: process.cwd(),
		});
		
		const output = await new Response(proc.stdout).text();
		const error = await new Response(proc.stderr).text();
		
		if (error && !output) {
			return { error: error.trim() };
		}
		
		return { success: true, output: output.trim() };
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		return { error: message };
	}
}

/**
 * Delete package.json property using bun pm pkg delete
 */
async function deletePackageProperty(property: string): Promise<any> {
	try {
		const proc = Bun.spawn(["bun", "pm", "pkg", "delete", property], {
			stdout: "pipe",
			stderr: "pipe",
			cwd: process.cwd(),
		});
		
		const output = await new Response(proc.stdout).text();
		const error = await new Response(proc.stderr).text();
		
		if (error && !output) {
			return { error: error.trim() };
		}
		
		return { success: true, output: output.trim() };
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		return { error: message };
	}
}

/**
 * Fix package.json using bun pm pkg fix
 */
async function fixPackageJson(): Promise<any> {
	try {
		const proc = Bun.spawn(["bun", "pm", "pkg", "fix"], {
			stdout: "pipe",
			stderr: "pipe",
			cwd: process.cwd(),
		});
		
		const output = await new Response(proc.stdout).text();
		const error = await new Response(proc.stderr).text();
		
		if (error && !output) {
			return { error: error.trim() };
		}
		
		return { success: true, output: output.trim() };
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		return { error: message };
	}
}

/**
 * Run bun pm command (generic wrapper)
 */
async function runBunPmCommand(command: string, args: string[] = []): Promise<any> {
	try {
		const proc = Bun.spawn(["bun", "pm", command, ...args], {
			stdout: "pipe",
			stderr: "pipe",
			cwd: process.cwd(),
		});
		
		const output = await new Response(proc.stdout).text();
		const error = await new Response(proc.stderr).text();
		const exitCode = await proc.exited;
		
		if (exitCode !== 0 && error && !output) {
			return { error: error.trim() };
		}
		
		return { success: true, output: output.trim(), stdout: output.trim(), stderr: error.trim() };
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		return { error: message };
	}
}

/**
 * Run bun patch command
 * 
 * Usage:
 *   bun patch <package>              # Prepare package for patching
 *   bun patch --commit <package>    # Commit patch to patches/
 */
async function runPatch(packageName: string, commit = false, patchesDir?: string): Promise<any> {
	try {
		const args: string[] = [];
		if (commit) {
			args.push("--commit");
			if (patchesDir) {
				args.push("--patches-dir", patchesDir);
			}
		}
		args.push(packageName);
		
		const proc = Bun.spawn(["bun", "patch", ...args], {
			stdout: "pipe",
			stderr: "pipe",
			cwd: process.cwd(),
		});
		
		const output = await new Response(proc.stdout).text();
		const error = await new Response(proc.stderr).text();
		const exitCode = await proc.exited;
		
		if (exitCode !== 0 && error && !output) {
			return { error: error.trim() };
		}
		
		return { success: true, output: output.trim(), stdout: output.trim(), stderr: error.trim() };
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		return { error: message };
	}
}

// CLI interface
const command = process.argv[2] || "help";
const isInteractive = process.argv.includes("--interactive");

if (isInteractive) {
	// Interactive mode - provide JSON output for web interface
	const action = process.argv[3] || "tree";
	const arg = process.argv[4];
	
	switch (action) {
		case "info":
			if (arg) {
				const property = process.argv[5];
				const json = process.argv.includes("--json");
				const info = await getPackageInfo(arg, property, json);
				console.log(JSON.stringify(info));
			} else {
				console.log(JSON.stringify({ error: "Package name required" }));
			}
			break;
		case "pkg-get":
			if (arg) {
				const result = await getPackageProperty(arg);
				console.log(JSON.stringify(result));
			} else {
				const result = await getPackageProperty("");
				console.log(JSON.stringify(result));
			}
			break;
		case "pkg-set":
			if (arg && process.argv[5]) {
				const result = await setPackageProperty(arg, process.argv[5]);
				console.log(JSON.stringify(result));
			} else {
				console.log(JSON.stringify({ error: "Property and value required" }));
			}
			break;
		case "pkg-delete":
			if (arg) {
				const result = await deletePackageProperty(arg);
				console.log(JSON.stringify(result));
			} else {
				console.log(JSON.stringify({ error: "Property required" }));
			}
			break;
		case "pkg-fix":
			const result = await fixPackageJson();
			console.log(JSON.stringify(result));
			break;
		case "pm":
			if (arg && process.argv[5]) {
				const pmArgs = process.argv.slice(5);
				const pmResult = await runBunPmCommand(arg, pmArgs);
				console.log(JSON.stringify(pmResult));
			} else if (arg) {
				const pmResult = await runBunPmCommand(arg);
				console.log(JSON.stringify(pmResult));
			} else {
				console.log(JSON.stringify({ error: "Command required" }));
			}
			break;
		case "patch":
			if (arg) {
				const commit = process.argv.includes("--commit");
				const patchesDirIndex = process.argv.indexOf("--patches-dir");
				const patchesDir = patchesDirIndex !== -1 && patchesDirIndex + 1 < process.argv.length ? process.argv[patchesDirIndex + 1] : undefined;
				const patchResult = await runPatch(arg, commit, patchesDir);
				console.log(JSON.stringify(patchResult));
			} else {
				console.log(JSON.stringify({ error: "Package name required" }));
			}
			break;
		case "tree":
			console.log(JSON.stringify({ tree: generateIsolatedTree() }));
			break;
		case "mermaid":
			console.log(JSON.stringify({ mermaid: generateMermaidTree(generateIsolatedTree()) }));
			break;
		default:
			console.log(JSON.stringify({ error: "Unknown action" }));
	}
	process.exit(0);
}

switch (command) {
	case "tree":
	case "ansi":
		console.log(`${COLORS.bold}${COLORS.primary.ansi}Isolated Installs Tree Structure${COLORS.reset}\n`);
		console.log(renderAnsiTree(generateIsolatedTree()));
		break;
		
	case "hoisted":
		console.log(`${COLORS.bold}${COLORS.secondary.ansi}Hoisted Installs Tree Structure${COLORS.reset}\n`);
		console.log(renderAnsiTree(generateHoistedTree()));
		break;
		
	case "compare":
		console.log(`${COLORS.bold}${COLORS.primary.ansi}Isolated Installs${COLORS.reset}\n`);
		console.log(renderAnsiTree(generateIsolatedTree()));
		console.log(`\n${COLORS.bold}${COLORS.secondary.ansi}Hoisted Installs${COLORS.reset}\n`);
		console.log(renderAnsiTree(generateHoistedTree()));
		break;
		
	case "mermaid":
		console.log(generateMermaidTree(generateIsolatedTree()));
		break;
		
	case "test":
		await testIsolatedInstalls();
		break;
		
	case "colors":
		displayColorScheme();
		break;
		
	case "all":
		console.log(`${COLORS.bold}${COLORS.primary.ansi}Complete Isolated Installs Visualization${COLORS.reset}\n`);
		displayColorScheme();
		console.log(`${COLORS.bold}${COLORS.primary.ansi}Isolated Installs Tree${COLORS.reset}\n`);
		console.log(renderAnsiTree(generateIsolatedTree()));
		console.log(`\n${COLORS.bold}${COLORS.secondary.ansi}Mermaid Diagram${COLORS.reset}\n`);
		console.log(generateMermaidTree(generateIsolatedTree()));
		console.log(`\n${COLORS.bold}${COLORS.info.ansi}Tests${COLORS.reset}\n`);
		await testIsolatedInstalls();
		break;
		
	case "help":
	default:
		console.log(`${COLORS.bold}${COLORS.primary.ansi}Bun Isolated Installs Visualizer${COLORS.reset}\n`);
		console.log("Usage:");
		console.log("  bun run examples/bun-isolated-installs-visualizer.ts tree      # ANSI tree (isolated)");
		console.log("  bun run examples/bun-isolated-installs-visualizer.ts hoisted     # ANSI tree (hoisted)");
		console.log("  bun run examples/bun-isolated-installs-visualizer.ts compare    # Compare both");
		console.log("  bun run examples/bun-isolated-installs-visualizer.ts mermaid    # Mermaid diagram");
		console.log("  bun run examples/bun-isolated-installs-visualizer.ts test       # Test properties");
		console.log("  bun run examples/bun-isolated-installs-visualizer.ts colors     # Show color scheme");
		console.log("  bun run examples/bun-isolated-installs-visualizer.ts all        # Show everything");
		console.log("\nInteractive Mode:");
		console.log("  bun run examples/bun-isolated-installs-visualizer.ts --interactive <action> [args...]");
		console.log("  Actions: info, pkg-get, pkg-set, pkg-delete, pkg-fix, pm, patch, tree, mermaid");
		console.log("\nDocumentation:");
		console.log("  📚 docs/BUN-ISOLATED-INSTALLS.md - Complete isolated installs guide");
		console.log("  📚 docs/BUN-PM.md - All bun pm commands");
		console.log("  📚 docs/BUN-PATCH.md - Package patching guide");
		console.log("  🌐 examples/bun-isolated-installs-interactive.html - Interactive visualizer");
		console.log("  📋 examples/COMMANDS.md - All commands reference");
		break;
}

export { };

