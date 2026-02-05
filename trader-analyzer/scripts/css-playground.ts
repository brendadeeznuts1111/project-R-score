#!/usr/bin/env bun
/**
 * CSS Playground Script
 * Interactive script to test CSS syntax lowering
 * 
 * Usage:
 *   bun run scripts/css-playground.ts
 *   bun run scripts/css-playground.ts --file styles/dashboard.css
 *   bun run scripts/css-playground.ts --compile styles/examples/nesting.css
 */

import { BunCSSBundler } from "../src/utils/css-bundler";
import { colors } from "../src/utils/bun-color";

const bundler = new BunCSSBundler();

async function main() {
	const args = process.argv.slice(2);
	const fileArg = args.find((arg) => arg.startsWith("--file="));
	const compileArg = args.find((arg) => arg.startsWith("--compile="));
	const help = args.includes("--help") || args.includes("-h");

	if (help) {
		console.log(colors.cyan(`
CSS Playground - Test CSS Syntax Lowering

Usage:
  bun run scripts/css-playground.ts [options]

Options:
  --file=<path>        Detect features in CSS file
  --compile=<path>     Compile CSS file and show output
  --help, -h           Show this help message

Examples:
  bun run scripts/css-playground.ts --file styles/dashboard.css
  bun run scripts/css-playground.ts --compile styles/examples/nesting.css
`));
		return;
	}

	if (fileArg) {
		const filePath = fileArg.split("=")[1];
		await detectFeatures(filePath);
	} else if (compileArg) {
		const filePath = compileArg.split("=")[1];
		await compileCSS(filePath);
	} else {
		// Interactive mode
		await interactiveMode();
	}
}

async function detectFeatures(filePath: string) {
	console.log(colors.cyan(`\n🔍 Detecting features in: ${filePath}\n`));

	try {
		const report = await bundler.detectFeatures(filePath);

		console.log(colors.green("✅ Features Detected:\n"));
		console.log(`  Nesting:           ${report.features.nesting ? "✅" : "❌"}`);
		console.log(`  color-mix():        ${report.features.colorMix ? "✅" : "❌"}`);
		console.log(`  Relative Colors:    ${report.features.relativeColors ? "✅" : "❌"}`);
		console.log(`  LAB Colors:         ${report.features.labColors ? "✅" : "❌"}`);
		console.log(`  HWB Colors:         ${report.features.hwbColors ? "✅" : "❌"}`);
		console.log(`  color() function:   ${report.features.colorFunction ? "✅" : "❌"}`);
		console.log(`  light-dark():       ${report.features.lightDark ? "✅" : "❌"}`);
		console.log(`  Logical Properties: ${report.features.logicalProperties ? "✅" : "❌"}`);
		console.log(`  Modern Selectors:   ${report.features.modernSelectors ? "✅" : "❌"}`);
		console.log(`  Math Functions:     ${report.features.mathFunctions ? "✅" : "❌"}`);
		console.log(`  Media Query Ranges: ${report.features.mediaQueryRanges ? "✅" : "❌"}`);
		console.log(`  Shorthands:         ${report.features.shorthands ? "✅" : "❌"}`);
		console.log(`  Double Pos Gradients: ${report.features.doublePositionGradients ? "✅" : "❌"}`);
		console.log(`  system-ui font:     ${report.features.systemUi ? "✅" : "❌"}`);
		console.log(`  Composition:        ${report.features.composes ? "✅" : "❌"}`);

		if (report.willLower.length > 0) {
			console.log(colors.yellow(`\n📦 Will be lowered:\n`));
			report.willLower.forEach((feature) => {
				console.log(`  • ${feature}`);
			});
		}

		if (report.requiresSupport.length > 0) {
			console.log(colors.yellow(`\n🌐 Requires browser support:\n`));
			report.requiresSupport.forEach((feature) => {
				console.log(`  • ${feature}`);
			});
		}

		console.log(colors.cyan(`\n📊 Browser Compatibility:\n`));
		console.log(`  Chrome:  ${report.compatibility.chrome}`);
		console.log(`  Firefox: ${report.compatibility.firefox}`);
		console.log(`  Safari:  ${report.compatibility.safari}`);
		console.log(`  Edge:    ${report.compatibility.edge}`);
	} catch (error) {
		console.error(colors.red(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n`));
		process.exit(1);
	}
}

async function compileCSS(filePath: string) {
	console.log(colors.cyan(`\n🔨 Compiling: ${filePath}\n`));

	try {
		const result = await bundler.bundle({
			input: filePath,
			output: undefined, // Don't write to file
			minify: false,
		});

		console.log(colors.green(`✅ Compiled successfully!\n`));
		console.log(`Size: ${result.size} bytes\n`);
		console.log(colors.cyan("Output:\n"));
		console.log(result.css);

		if (result.syntaxReport) {
			console.log(colors.yellow(`\n📊 Syntax Report:\n`));
			console.log(`  Features detected: ${Object.values(result.syntaxReport.features).filter(Boolean).length}`);
			console.log(`  Will lower: ${result.syntaxReport.willLower.length}`);
			console.log(`  Requires support: ${result.syntaxReport.requiresSupport.length}`);
		}
	} catch (error) {
		console.error(colors.red(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n`));
		process.exit(1);
	}
}

async function interactiveMode() {
	console.log(colors.cyan(`
🎨 CSS Playground - Interactive Mode

Available commands:
  1. Detect features in a CSS file
  2. Compile a CSS file
  3. Validate CSS syntax
  4. Exit

`));

	// Simple interactive mode - in a real implementation, you'd use readline
	console.log(colors.yellow("💡 Tip: Use --file or --compile flags for direct usage\n"));
	console.log("Example commands:\n");
	console.log("  bun run scripts/css-playground.ts --file styles/dashboard.css");
	console.log("  bun run scripts/css-playground.ts --compile styles/examples/nesting.css\n");
}

main().catch((error) => {
	console.error(colors.red(`\n❌ Fatal error: ${error instanceof Error ? error.message : String(error)}\n`));
	process.exit(1);
});
