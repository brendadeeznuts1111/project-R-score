#!/usr/bin/env bun
/**
 * @fileoverview Open Workspace Dashboard
 * @description Opens the interactive workspace dashboard using file:// protocol
 */

import { $ } from "bun";

const dashboardPath = new URL("../dashboard/workspace.html", import.meta.url).pathname;
const fileUrl = `file://${dashboardPath}`;

console.log("🔑 Opening Developer Workspace Dashboard...");
console.log(`📁 Path: ${dashboardPath}`);
console.log(`🌐 URL: ${fileUrl}\n`);

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
	console.log(`❌ Unsupported platform: ${process.platform}`);
	console.log(`   Please open manually: ${fileUrl}`);
	process.exit(1);
}

console.log("✅ Dashboard opened in your default browser!");
console.log("\n💡 Tip: Make sure your API server is running at http://localhost:3001");
console.log("   Start it with: bun run dev");
