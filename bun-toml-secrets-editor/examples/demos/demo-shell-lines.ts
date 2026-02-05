#!/usr/bin/env bun

/**
 * Demo: Bun Shell Line Processing
 * Shows how to process shell command output line by line
 */

import { $ } from "bun";

async function main() {
	console.log("🔧 Bun Shell Line Processing Demo");
	console.log("==================================");

	// Demo 1: Basic ls -l processing
	console.log("\n1️⃣ Basic directory listing:");
	console.log("Processing ls -l output line by line...\n");

	try {
		let fileCount = 0;
		let totalSize = 0;

		for await (const line of $`ls -l`.lines()) {
			// Skip header lines
			if (line.startsWith("total")) {
				console.log(`📊 ${line}`);
				continue;
			}

			// Parse file info
			const parts = line.trim().split(/\s+/);
			if (parts.length >= 9) {
				const permissions = parts[0];
				const size = parseInt(parts[4], 10);
				const filename = parts.slice(8).join(" ");

				fileCount++;
				totalSize += size;

				// Format with icons based on file type
				let icon = "📄";
				if (permissions.startsWith("d")) icon = "📁";
				if (permissions.startsWith("l")) icon = "🔗";
				if (permissions.startsWith("-") && parts[0].includes("x")) icon = "⚡";

				console.log(
					`${icon} ${filename.padEnd(20)} ${size.toString().padStart(10)} bytes`,
				);
			}
		}

		console.log(`\n📈 Summary: ${fileCount} items, ${totalSize} total bytes`);
	} catch (error: any) {
		console.error("❌ Error processing directory listing:", error.message);
	}

	// Demo 2: Process monitoring
	console.log("\n2️⃣ Process monitoring (ps aux):");
	console.log("Finding Node.js/Bun processes...\n");

	try {
		let processCount = 0;

		for await (const line of $`ps aux`.lines()) {
			// Skip header
			if (line.includes("USER") && line.includes("PID")) continue;

			// Look for Node.js or Bun processes
			if (line.includes("node") || line.includes("bun")) {
				processCount++;
				const parts = line.trim().split(/\s+/);
				if (parts.length >= 11) {
					const pid = parts[1];
					const cpu = parts[2];
					const mem = parts[3];
					const command = parts.slice(10).join(" ");

					console.log(
						`🔧 PID ${pid.padStart(6)} CPU ${cpu.padStart(5)}% MEM ${mem.padStart(5)}% ${command}`,
					);
				}
			}
		}

		console.log(`\n🔍 Found ${processCount} Node.js/Bun processes`);
	} catch (error: any) {
		console.error("❌ Error monitoring processes:", error.message);
	}

	// Demo 3: Git log processing
	console.log("\n3️⃣ Git log processing:");
	console.log("Recent commit history...\n");

	try {
		let commitCount = 0;

		for await (const line of $`git log --oneline -5`.lines()) {
			commitCount++;
			const [hash, ...messageParts] = line.split(" ");
			const message = messageParts.join(" ");

			console.log(`📝 ${hash.padEnd(8)} ${message}`);
		}

		console.log(`\n📚 Showing ${commitCount} recent commits`);
	} catch (_error: any) {
		console.log("ℹ️  Not a git repository or git not available");
	}

	console.log("\n✅ Bun Shell line processing demo complete!");
}

// Run the demo
main().catch(console.error);
