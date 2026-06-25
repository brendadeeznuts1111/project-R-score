#!/usr/bin/env bun
/**
 * @fileoverview Open Workspace Dashboard
 * @description Opens the interactive workspace dashboard using file:// protocol
 */

import { $ } from "bun";

const dashboardPath = new URL("../dashboard/workspace.html", import.meta.url).pathname;
const fileUrl = `file://${dashboardPath}`;

console.info("🔑 Opening Developer Workspace Dashboard...");
console.info(`📁 Path: ${dashboardPath}`);
console.info(`🌐 URL: ${fileUrl}\n`);

// Open with default browser
if (process.platform === "darwin") {
	// macOS
	await $`open "${fileUrl}"`;
} else if (process.platform === "linux") {
	// Linux
	await $`xdg-open "${fileUrl}"`;
} else if (process.platform === "win32") {
	// Windows
	await $`start "${fileUrl}"`;
} else {
	console.info(`❌ Unsupported platform: ${process.platform}`);
	console.info(`   Please open manually: ${fileUrl}`);
	process.exit(1);
}

console.info("✅ Dashboard opened in your default browser!");
console.info("\n💡 Tip: Make sure your API server is running at http://localhost:3001");
console.info("   Start it with: bun run dev");
