#!/usr/bin/env bun
/**
 * Tier-1380 OMEGA: VS Code Extension Helper
 * Provides integration with VS Code tasks and snippets
 *
 * Usage: bun vscode-extension.ts <command>
 */

import { $ } from "bun";

const COMMANDS = {
	get: {
		title: "Get Column",
		description: "Show column details",
		args: [{ name: "column", type: "number", description: "Column ID (0-96)" }],
	},
	search: {
		title: "Search Columns",
		description: "Fuzzy search",
		args: [{ name: "term", type: "string", description: "Search term" }],
	},
	tension: {
		title: "Tension Zone",
		description: "Show tension zone (31-45)",
		args: [],
	},
	cloudflare: {
		title: "Cloudflare Zone",
		description: "Show Cloudflare zone (21-30)",
		args: [],
	},
	matrix: {
		title: "Matrix View",
		description: "Show full matrix grid",
		args: [],
	},
};

// Generate VS Code tasks.json configuration
function generateTasks(): void {
	const tasks = {
		version: "2.0.0",
		tasks: Object.entries(COMMANDS).map(([cmd, config]) => ({
			label: `🔥 matrix: ${config.title}`,
			type: "shell",
			command: "bun",
			args: ["matrix/column-standards-all.ts", cmd, "${input:column}"],
			group: "build",
			presentation: {
				echo: true,
				reveal: "always",
				focus: false,
				panel: "shared",
			},
			problemMatcher: [],
		})),
	};

	console.log(JSON.stringify(tasks, null, 2));
}

// Generate VS Code snippets
function generateSnippets(): void {
	const snippets = {
		"Matrix Column Get": {
			prefix: "mcol",
			body: [
				"// Get column ${1:45} details",
				"const col = await getColumn(${1:45});",
				"console.log(col.name, col.type, col.zone);",
			],
			description: "Get matrix column details",
		},
		"Matrix Column Search": {
			prefix: "msearch",
			body: [
				"// Search columns for '${1:tension}'",
				"const hits = await searchColumns('${1:tension}');",
				"hits.forEach(h => console.log(h.index, h.name));",
			],
			description: "Search matrix columns",
		},
		"Matrix Column Definition": {
			prefix: "mdef",
			body: [
				"{",
				"  index: ${1:99},",
				"  name: '${2:my-column}',",
				"  type: '${3:string}',",
				"  owner: '${4:infra}',",
				"  color: '${5:⚪}',",
				"  description: '${6:Description here}',",
				"  required: ${7:false},",
				"  zone: '${8:extensibility}'",
				"}",
			],
			description: "Define new matrix column",
		},
	};

	console.log(JSON.stringify(snippets, null, 2));
}

// Generate VS Code settings
function generateSettings(): void {
	const settings = {
		"terminal.integrated.profiles.osx": {
			"matrix-cols": {
				path: "zsh",
				args: ["-c", "source matrix/shell-integration.zsh && zsh"],
				name: "🔥 Matrix Cols",
			},
		},
		"terminal.integrated.defaultProfile.osx": "matrix-cols",
		"editor.quickSuggestions": {
			strings: true,
		},
	};

	console.log(JSON.stringify(settings, null, 2));
}

// Generate launch.json configuration
function generateLaunchConfig(): void {
	const config = {
		version: "0.2.0",
		configurations: [
			{
				name: "Debug Matrix CLI",
				type: "bun",
				request: "launch",
				program: "${workspaceFolder}/matrix/column-standards-all.ts",
				args: ["get", "45"],
				cwd: "${workspaceFolder}",
			},
			{
				name: "Run Matrix Tests",
				type: "bun",
				request: "launch",
				program: "${workspaceFolder}/matrix/column-standards.test.ts",
				cwd: "${workspaceFolder}",
			},
		],
	};

	console.log(JSON.stringify(config, null, 2));
}

// Main
const cmd = Bun.argv[2];

switch (cmd) {
	case "tasks":
		generateTasks();
		break;
	case "snippets":
		generateSnippets();
		break;
	case "settings":
		generateSettings();
		break;
	case "launch":
		generateLaunchConfig();
		break;
	case "all":
		console.log("=== tasks.json ===");
		generateTasks();
		console.log("\n=== snippets.json ===");
		generateSnippets();
		console.log("\n=== settings.json ===");
		generateSettings();
		console.log("\n=== launch.json ===");
		generateLaunchConfig();
		break;
	default:
		console.log("Usage: bun vscode-extension.ts <tasks|snippets|settings|launch|all>");
		console.log("");
		console.log("Generates VS Code configuration for matrix:cols integration:");
		console.log("  tasks    - tasks.json configuration");
		console.log("  snippets - Code snippets for TypeScript/JavaScript");
		console.log("  settings - VS Code settings.json additions");
		console.log("  launch   - Debug launch configuration");
		console.log("  all      - Generate all configurations");
}
