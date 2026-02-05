#!/usr/bin/env bun

/**
 * Advanced Bun Shell Demo
 *
 * Demonstrates all Bun Shell features per:
 * https://bun.com/docs/runtime/shell
 *
 * Features:
 * - Template literal commands with interpolation
 * - Piping between commands
 * - Environment variable handling
 * - JSON output parsing
 * - Exit code handling
 * - Quiet mode
 */

import { $ } from "bun";

async function demo1BasicCommands() {
	console.log("🔧 Demo 1: Basic Shell Commands");
	console.log("================================\n");

	// Simple command
	console.log("📁 Current directory:");
	await $`pwd`;

	// Command with arguments
	console.log("\n📊 Disk usage:");
	await $`du -sh .`;

	// Quiet mode - suppress output
	console.log("\n🔇 Quiet mode (no output):");
	const result = await $`echo "silent but deadly"`.quiet();
	console.log(`   (Output was captured: ${result.text().trim()})`);
}

async function demo2TemplateLiterals() {
	console.log("\n🔧 Demo 2: Template Literal Interpolation");
	console.log("==========================================\n");

	// String interpolation
	const filename = "package.json";
	console.log(`📄 Checking ${filename}...`);
	await $`ls -la ${filename}`;

	// Number interpolation
	const count = 5;
	console.log(`\n📜 Git log (last ${count} commits):`);
	await $`git log --oneline -${count}`;

	// Multiple interpolations
	const dir = ".";
	const pattern = "*.ts";
	console.log(`\n🔍 Finding ${pattern} in ${dir}:`);
	await $`find ${dir} -name ${pattern} -maxdepth 1`;
}

async function demo3Piping() {
	console.log("\n🔧 Demo 3: Command Piping");
	console.log("=========================\n");

	// Simple pipe
	console.log("📊 Counting files:");
	await $`ls -1 | wc -l`;

	// Multiple pipes
	console.log("\n🔍 Finding TypeScript files and sorting:");
	await $`ls -1 | grep \\.ts$ | sort`;

	// Pipe with grep
	console.log("\n📝 Finding 'bun' in package.json:");
	await $`cat package.json | grep -i bun | head -5`;
}

async function demo4EnvironmentVariables() {
	console.log("\n🔧 Demo 4: Environment Variables");
	console.log("=================================\n");

	// Set env var for command
	console.log("🔐 With custom env var:");
	await $`MY_VAR="hello from bun" && echo $MY_VAR`;

	// Inherit from process.env
	process.env.DEMO_VAR = "inherited value";
	console.log("\n📎 Inherited from process.env:");
	await $`echo "DEMO_VAR = $DEMO_VAR"`;

	// Multiple env vars
	console.log("\n📊 Multiple variables:");
	const apiKey = "secret123";
	await $`API_URL="https://api.example.com" API_KEY=${apiKey} bash -c 'echo "URL: $API_URL, Key: $API_KEY"'`;
}

async function demo5CapturingOutput() {
	console.log("\n🔧 Demo 5: Capturing Output");
	console.log("============================\n");

	// Capture stdout
	console.log("📄 Capturing stdout:");
	const output = await $`echo "Hello, Bun Shell!"`.quiet();
	console.log(`   Captured: "${output.text().trim()}"`);

	// Capture both stdout and stderr
	console.log("\n📊 Capturing both streams:");
	const result =
		await $`bash -c 'echo "stdout content" && echo "stderr content" >&2'`.quiet();
	console.log(`   stdout: "${result.text().trim()}"`);
	console.log(`   stderr: "${new TextDecoder().decode(result.stderr).trim()}"`);

	// Capture as text
	console.log("\n📝 Reading file content:");
	const content = await $`cat package.json`.quiet().then((r) => r.text());
	console.log(`   File size: ${content.length} characters`);
}

async function demo6JsonOutput() {
	console.log("\n🔧 Demo 6: JSON Output");
	console.log("======================\n");

	// Parse JSON output
	console.log("📦 Package.json as JSON:");
	const pkg = await $`cat package.json`.quiet().then((r) => r.json());
	console.log(`   Name: ${pkg.name}`);
	console.log(`   Version: ${pkg.version}`);
	console.log(`   Description: ${pkg.description?.substring(0, 50)}...`);

	// Process JSON with jq-like filtering using Bun
	console.log("\n🔍 Scripts in package.json:");
	const scripts = pkg.scripts || {};
	const scriptNames = Object.keys(scripts).slice(0, 5);
	scriptNames.forEach((name) => {
		console.log(`   • ${name}`);
	});
}

async function demo7ExitCodes() {
	console.log("\n🔧 Demo 7: Exit Code Handling");
	console.log("=============================\n");

	// Successful command
	console.log("✅ Successful command:");
	const success = await $`echo "success"`;
	console.log(`   Exit code: ${success.exitCode}`);

	// Check if command exists
	console.log("\n🔍 Checking if 'bun' exists:");
	try {
		await $`which bun`;
		console.log("   ✅ bun is available");
	} catch {
		console.log("   ❌ bun not found");
	}

	// Handle expected failures
	console.log("\n⚠️  Handling expected failures:");
	try {
		await $`ls /nonexistent_directory_12345`;
	} catch (error: any) {
		console.log(
			`   Expected error caught (exit code: ${error.exitCode || "unknown"})`,
		);
	}
}

async function demo8LineProcessing() {
	console.log("\n🔧 Demo 8: Line-by-Line Processing");
	console.log("===================================\n");

	// Process output line by line
	console.log("📝 Processing lines from echo:");
	let lineCount = 0;
	for await (const line of $`printf "line1\nline2\nline3"`.lines()) {
		lineCount++;
		console.log(`   Line ${lineCount}: ${line}`);
	}

	// Real-world: Process directory listing
	console.log("\n📁 Processing directory listing:");
	const files: string[] = [];
	for await (const line of $`ls -1`.lines()) {
		if (line.trim()) {
			files.push(line.trim());
		}
	}
	console.log(`   Found ${files.length} items`);
	console.log(`   First 5: ${files.slice(0, 5).join(", ")}`);
}

async function demo9RealWorldExample() {
	console.log("\n🔧 Demo 9: Real-World Example");
	console.log("=============================\n");

	// Build info collection
	console.log("📊 Collecting build information...\n");

	// Get Node/Bun version
	const bunVersion = await $`bun --version`
		.quiet()
		.then((r) => r.text().trim());

	// Get git info (if available)
	let gitInfo = "N/A";
	try {
		const gitCommit = await $`git rev-parse --short HEAD`
			.quiet()
			.then((r) => r.text().trim());
		const gitBranch = await $`git branch --show-current`
			.quiet()
			.then((r) => r.text().trim());
		gitInfo = `${gitBranch}@${gitCommit}`;
	} catch {
		// Not a git repo
	}

	// Get system info
	const platform = process.platform;
	const arch = process.arch;

	console.log("📋 Build Information:");
	console.log(`   Platform: ${platform}`);
	console.log(`   Architecture: ${arch}`);
	console.log(`   Bun Version: ${bunVersion}`);
	console.log(`   Git: ${gitInfo}`);

	// Run tests if available
	console.log("\n🧪 Checking for test script:");
	try {
		const pkgText = await $`cat package.json`.quiet().then((r) => r.text());
		const pkg = JSON.parse(pkgText);
		if (pkg.scripts?.test) {
			console.log(`   Test command: ${pkg.scripts.test}`);
		} else {
			console.log("   No test script found");
		}
	} catch {
		console.log("   Could not read package.json");
	}
}

async function main() {
	console.log(`
╔══════════════════════════════════════════════════════════════╗
║              🚀 Advanced Bun Shell Demo                       ║
║    https://bun.com/docs/runtime/shell                        ║
╚══════════════════════════════════════════════════════════════╝
`);

	try {
		await demo1BasicCommands();
		await demo2TemplateLiterals();
		await demo3Piping();
		await demo4EnvironmentVariables();
		await demo5CapturingOutput();
		await demo6JsonOutput();
		await demo7ExitCodes();
		await demo8LineProcessing();
		await demo9RealWorldExample();

		console.log(`
╔══════════════════════════════════════════════════════════════╗
║              ✅ All demos completed!                          ║
╚══════════════════════════════════════════════════════════════╝

Key Takeaways:
• Use template literals: await $'echo \${variable}'
• Pipe naturally: await $'cat file | grep pattern'
• Capture output: const result = await $'cmd'.quiet()
• Parse JSON: const data = await $'cmd'.quiet().then(r => r.json())
• Process lines: for await (const line of $'cmd'.lines())
• Handle errors: try/catch for non-zero exit codes
`);
	} catch (error: any) {
		console.error("\n❌ Demo failed:", error.message);
		process.exit(1);
	}
}

// Run if executed directly
if (import.meta.main) {
	main();
}

export { main as runAdvancedShellDemo };
