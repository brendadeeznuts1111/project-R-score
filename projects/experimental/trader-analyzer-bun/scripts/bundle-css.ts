#!/usr/bin/env bun

/**
 * CSS Bundler Script
 * Uses Bun's native CSS bundler to bundle CSS files
 * 
 * Usage:
 *   bun run scripts/bundle-css.ts
 *   bun run scripts/bundle-css.ts --input ./styles --output ./dist/bundle.css --minify
 */

import { cssBundler } from "../src/utils/css-bundler";

const args = process.argv.slice(2);

// Parse arguments
const inputIndex = args.indexOf("--input");
const outputIndex = args.indexOf("--output");
const minifyIndex = args.indexOf("--minify");
const sourcemapIndex = args.indexOf("--sourcemap");

const input = inputIndex >= 0 && args[inputIndex + 1] 
	? args[inputIndex + 1] 
	: "./styles/dashboard.css";

const output = outputIndex >= 0 && args[outputIndex + 1]
	? args[outputIndex + 1]
	: "./dist/dashboard.bundle.css";

const minify = minifyIndex >= 0 || args.includes("--minify");
const sourcemap = sourcemapIndex >= 0 || args.includes("--sourcemap");

console.info(`Bundling CSS...`);
console.info(`  Input: ${input}`);
console.info(`  Output: ${output}`);
console.info(`  Minify: ${minify}`);
console.info(`  Sourcemap: ${sourcemap}`);

try {
	const result = await cssBundler.bundle({
		input,
		output,
		minify,
		sourcemap,
	});

	console.info(`✅ CSS bundled successfully!`);
	console.info(`  Size: ${(result.size / 1024).toFixed(2)} KB`);
	console.info(`  Files: ${result.inputs.length}`);
	console.info(`  Output: ${output}`);
} catch (error) {
	console.error(`❌ Error bundling CSS:`, error);
	process.exit(1);
}
