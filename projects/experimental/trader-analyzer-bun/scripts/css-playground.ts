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
		console.info(colors.cyan(`
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
	console.info(colors.cyan(`\n🔍 Detecting features in: ${filePath}\n`));

	try {
		const report = await bundler.detectFeatures(filePath);

		console.info(colors.green("✅ Features Detected:\n"));
		console.info(`  Nesting:           ${report.features.nesting ? "✅" : "❌"}`);
		console.info(`  color-mix():        ${report.features.colorMix ? "✅" : "❌"}`);
		console.info(`  Relative Colors:    ${report.features.relativeColors ? "✅" : "❌"}`);
		console.info(`  LAB Colors:         ${report.features.labColors ? "✅" : "❌"}`);
		console.info(`  HWB Colors:         ${report.features.hwbColors ? "✅" : "❌"}`);
		console.info(`  color() function:   ${report.features.colorFunction ? "✅" : "❌"}`);
		console.info(`  light-dark():       ${report.features.lightDark ? "✅" : "❌"}`);
		console.info(`  Logical Properties: ${report.features.logicalProperties ? "✅" : "❌"}`);
		console.info(`  Modern Selectors:   ${report.features.modernSelectors ? "✅" : "❌"}`);
		console.info(`  Math Functions:     ${report.features.mathFunctions ? "✅" : "❌"}`);
		console.info(`  Media Query Ranges: ${report.features.mediaQueryRanges ? "✅" : "❌"}`);
		console.info(`  Shorthands:         ${report.features.shorthands ? "✅" : "❌"}`);
		console.info(`  Double Pos Gradients: ${report.features.doublePositionGradients ? "✅" : "❌"}`);
		console.info(`  system-ui font:     ${report.features.systemUi ? "✅" : "❌"}`);
		console.info(`  Composition:        ${report.features.composes ? "✅" : "❌"}`);

		if (report.willLower.length > 0) {
			console.info(colors.yellow(`\n📦 Will be lowered:\n`));
			report.willLower.forEach((feature) => {
				console.info(`  • ${feature}`);
			});
		}

		if (report.requiresSupport.length > 0) {
			console.info(colors.yellow(`\n🌐 Requires browser support:\n`));
			report.requiresSupport.forEach((feature) => {
				console.info(`  • ${feature}`);
			});
		}

		console.info(colors.cyan(`\n📊 Browser Compatibility:\n`));
		console.info(`  Chrome:  ${report.compatibility.chrome}`);
		console.info(`  Firefox: ${report.compatibility.firefox}`);
		console.info(`  Safari:  ${report.compatibility.safari}`);
		console.info(`  Edge:    ${report.compatibility.edge}`);
	} catch (error) {
		console.error(colors.red(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n`));
		process.exit(1);
	}
}

async function compileCSS(filePath: string) {
	console.info(colors.cyan(`\n🔨 Compiling: ${filePath}\n`));

	try {
		const result = await bundler.bundle({
			input: filePath,
			output: undefined, // Don't write to file
			minify: false,
		});

		console.info(colors.green(`✅ Compiled successfully!\n`));
		console.info(`Size: ${result.size} bytes\n`);
		console.info(colors.cyan("Output:\n"));
		console.info(result.css);

		if (result.syntaxReport) {
			console.info(colors.yellow(`\n📊 Syntax Report:\n`));
			console.info(`  Features detected: ${Object.values(result.syntaxReport.features).filter(Boolean).length}`);
			console.info(`  Will lower: ${result.syntaxReport.willLower.length}`);
			console.info(`  Requires support: ${result.syntaxReport.requiresSupport.length}`);
		}
	} catch (error) {
		console.error(colors.red(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n`));
		process.exit(1);
	}
}

async function interactiveMode() {
	console.info(colors.cyan(`
🎨 CSS Playground - Interactive Mode

Available commands:
  1. Detect features in a CSS file
  2. Compile a CSS file
  3. Validate CSS syntax
  4. Exit

`));

	// Simple interactive mode - in a real implementation, you'd use readline
	console.info(colors.yellow("💡 Tip: Use --file or --compile flags for direct usage\n"));
	console.info("Example commands:\n");
	console.info("  bun run scripts/css-playground.ts --file styles/dashboard.css");
	console.info("  bun run scripts/css-playground.ts --compile styles/examples/nesting.css\n");
}

main().catch((error) => {
	console.error(colors.red(`\n❌ Fatal error: ${error instanceof Error ? error.message : String(error)}\n`));
	process.exit(1);
});
