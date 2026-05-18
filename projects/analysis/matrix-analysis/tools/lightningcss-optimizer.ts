#!/usr/bin/env bun
// lightningcss-optimizer.ts — LightningCSS size diff with detailed reporting

import { transform } from "lightningcss";

const cssFile = process.argv[2] || "app.css";

try {
	const cssContent = await Bun.file(cssFile).text();

	if (!cssContent) {
		console.error(`❌ CSS file not found or empty: ${cssFile}`);
		process.exit(1);
	}

	const result = transform({
		filename: cssFile,
		code: new TextEncoder().encode(cssContent),
		minify: true,
		sourceMap: false,
	});

	const originalSize = cssContent.length;
	const minifiedSize = result.code.length;
	const savedBytes = originalSize - minifiedSize;
	const savedPercentage = ((savedBytes / originalSize) * 100).toFixed(1);

	console.info(`🎨 LightningCSS Optimization Report`);
	console.info(`📁 File: ${cssFile}`);
	console.info(`📊 Original: ${originalSize.toLocaleString()} bytes`);
	console.info(`🗜️  Minified: ${minifiedSize.toLocaleString()} bytes`);
	console.info(`💾 Saved: ${savedBytes.toLocaleString()} bytes (${savedPercentage}%)`);
	console.info(`⚡ Compression ratio: ${(originalSize / minifiedSize).toFixed(2)}x`);

	// Write minified output
	const outputPath = cssFile.replace(".css", ".min.css");
	await Bun.write(outputPath, new TextDecoder().decode(result.code));
	console.info(`✅ Minified file written to: ${outputPath}`);
} catch (error: any) {
	console.error(`❌ Error processing CSS: ${error?.message || error}`);
	if (error?.message?.includes("lightningcss")) {
		console.error(`💡 Install with: bun add lightningcss`);
	}
	process.exit(1);
}
