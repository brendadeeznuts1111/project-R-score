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
	console.info("🔧 Demo 1: Basic Shell Commands");
	console.info("================================\n");

	// Simple command
	console.info("📁 Current directory:");
	await $`pwd`;

	// Command with arguments
	console.info("\n📊 Disk usage:");
	await $`du -sh .`;

	// Quiet mode - suppress output
	console.info("\n🔇 Quiet mode (no output):");
	const result = await $`echo "silent but deadly"`.quiet();
	console.info(`   (Output was captured: ${result.text().trim()})`);
}

async function demo2TemplateLiterals() {
	console.info("\n🔧 Demo 2: Template Literal Interpolation");
	console.info("==========================================\n");

	// String interpolation
	const filename = "package.json";
	console.info(`📄 Checking ${filename}...`);
	await $`ls -la ${filename}`;

	// Number interpolation
	const count = 5;
	console.info(`\n📜 Git log (last ${count} commits):`);
	await $`git log --oneline -${count}`;

	// Multiple interpolations
	const dir = ".";
	const pattern = "*.ts";
	console.info(`\n🔍 Finding ${pattern} in ${dir}:`);
	await $`find ${dir} -name ${pattern} -maxdepth 1`;
}

async function demo3Piping() {
	console.info("\n🔧 Demo 3: Command Piping");
	console.info("=========================\n");

	// Simple pipe
	console.info("📊 Counting files:");
	await $`ls -1 | wc -l`;

	// Multiple pipes
	console.info("\n🔍 Finding TypeScript files and sorting:");
	await $`ls -1 | grep \\.ts$ | sort`;

	// Pipe with grep
	console.info("\n📝 Finding 'bun' in package.json:");
	await $`cat package.json | grep -i bun | head -5`;
}

async function demo4EnvironmentVariables() {
	console.info("\n🔧 Demo 4: Environment Variables");
	console.info("=================================\n");

	// Set env var for command
	console.info("🔐 With custom env var:");
	await $`MY_VAR="hello from bun" && echo $MY_VAR`;

	// Inherit from process.env
	process.env.DEMO_VAR = "inherited value";
	console.info("\n📎 Inherited from process.env:");
	await $`echo "DEMO_VAR = $DEMO_VAR"`;

	// Multiple env vars
	console.info("\n📊 Multiple variables:");
	const apiKey = "secret123";
	await $`API_URL="https://api.example.com" API_KEY=${apiKey} bash -c 'echo "URL: $API_URL, Key: $API_KEY"'`;
}

async function demo5CapturingOutput() {
	console.info("\n🔧 Demo 5: Capturing Output");
	console.info("============================\n");

	// Capture stdout
	console.info("📄 Capturing stdout:");
	const output = await $`echo "Hello, Bun Shell!"`.quiet();
	console.info(`   Captured: "${output.text().trim()}"`);

	// Capture both stdout and stderr
	console.info("\n📊 Capturing both streams:");
	const result =
		await $`bash -c 'echo "stdout content" && echo "stderr content" >&2'`.quiet();
	console.info(`   stdout: "${result.text().trim()}"`);
	console.info(`   stderr: "${new TextDecoder().decode(result.stderr).trim()}"`);

	// Capture as text
	console.info("\n📝 Reading file content:");
	const content = await $`cat package.json`.quiet().then((r) => r.text());
	console.info(`   File size: ${content.length} characters`);
}

async function demo6JsonOutput() {
	console.info("\n🔧 Demo 6: JSON Output");
	console.info("======================\n");

	// Parse JSON output
	console.info("📦 Package.json as JSON:");
	const pkg = await $`cat package.json`.quiet().then((r) => r.json());
	console.info(`   Name: ${pkg.name}`);
	console.info(`   Version: ${pkg.version}`);
	console.info(`   Description: ${pkg.description?.substring(0, 50)}...`);

	// Process JSON with jq-like filtering using Bun
	console.info("\n🔍 Scripts in package.json:");
	const scripts = pkg.scripts || {};
	const scriptNames = Object.keys(scripts).slice(0, 5);
	scriptNames.forEach((name) => {
		console.info(`   • ${name}`);
	});
}

async function demo7ExitCodes() {
	console.info("\n🔧 Demo 7: Exit Code Handling");
	console.info("=============================\n");

	// Successful command
	console.info("✅ Successful command:");
	const success = await $`echo "success"`;
	console.info(`   Exit code: ${success.exitCode}`);

	// Check if command exists
	console.info("\n🔍 Checking if 'bun' exists:");
	try {
		await $`which bun`;
		console.info("   ✅ bun is available");
	} catch {
		console.info("   ❌ bun not found");
	}

	// Handle expected failures
	console.info("\n⚠️  Handling expected failures:");
	try {
		await $`ls /nonexistent_directory_12345`;
	} catch (error: any) {
		console.info(
			`   Expected error caught (exit code: ${error.exitCode || "unknown"})`,
		);
	}
}

async function demo8LineProcessing() {
	console.info("\n🔧 Demo 8: Line-by-Line Processing");
	console.info("===================================\n");

	// Process output line by line
	console.info("📝 Processing lines from echo:");
	let lineCount = 0;
	for await (const line of $`printf "line1\nline2\nline3"`.lines()) {
		lineCount++;
		console.info(`   Line ${lineCount}: ${line}`);
	}

	// Real-world: Process directory listing
	console.info("\n📁 Processing directory listing:");
	const files: string[] = [];
	for await (const line of $`ls -1`.lines()) {
		if (line.trim()) {
			files.push(line.trim());
		}
	}
	console.info(`   Found ${files.length} items`);
	console.info(`   First 5: ${files.slice(0, 5).join(", ")}`);
}

async function demo9RealWorldExample() {
	console.info("\n🔧 Demo 9: Real-World Example");
	console.info("=============================\n");

	// Build info collection
	console.info("📊 Collecting build information...\n");

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

	console.info("📋 Build Information:");
	console.info(`   Platform: ${platform}`);
	console.info(`   Architecture: ${arch}`);
	console.info(`   Bun Version: ${bunVersion}`);
	console.info(`   Git: ${gitInfo}`);

	// Run tests if available
	console.info("\n🧪 Checking for test script:");
	try {
		const pkgText = await $`cat package.json`.quiet().then((r) => r.text());
		const pkg = JSON.parse(pkgText);
		if (pkg.scripts?.test) {
			console.info(`   Test command: ${pkg.scripts.test}`);
		} else {
			console.info("   No test script found");
		}
	} catch {
		console.info("   Could not read package.json");
	}
}

async function main() {
	console.info(`
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

		console.info(`
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
