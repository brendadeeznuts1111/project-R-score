#!/usr/bin/env bun

/**
 * Demo: Bun Shell Line Processing
 * Shows how to process shell command output line by line
 */

import { $ } from "bun";

async function main() {
	console.info("🔧 Bun Shell Line Processing Demo");
	console.info("==================================");

	// Demo 1: Basic ls -l processing
	console.info("\n1️⃣ Basic directory listing:");
	console.info("Processing ls -l output line by line...\n");

	try {
		let fileCount = 0;
		let totalSize = 0;

		for await (const line of $`ls -l`.lines()) {
			// Skip header lines
			if (line.startsWith("total")) {
				console.info(`📊 ${line}`);
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

				console.info(
					`${icon} ${filename.padEnd(20)} ${size.toString().padStart(10)} bytes`,
				);
			}
		}

		console.info(`\n📈 Summary: ${fileCount} items, ${totalSize} total bytes`);
	} catch (error: any) {
		console.error("❌ Error processing directory listing:", error.message);
	}

	// Demo 2: Process monitoring
	console.info("\n2️⃣ Process monitoring (ps aux):");
	console.info("Finding Node.js/Bun processes...\n");

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

					console.info(
						`🔧 PID ${pid.padStart(6)} CPU ${cpu.padStart(5)}% MEM ${mem.padStart(5)}% ${command}`,
					);
				}
			}
		}

		console.info(`\n🔍 Found ${processCount} Node.js/Bun processes`);
	} catch (error: any) {
		console.error("❌ Error monitoring processes:", error.message);
	}

	// Demo 3: Git log processing
	console.info("\n3️⃣ Git log processing:");
	console.info("Recent commit history...\n");

	try {
		let commitCount = 0;

		for await (const line of $`git log --oneline -5`.lines()) {
			commitCount++;
			const [hash, ...messageParts] = line.split(" ");
			const message = messageParts.join(" ");

			console.info(`📝 ${hash.padEnd(8)} ${message}`);
		}

		console.info(`\n📚 Showing ${commitCount} recent commits`);
	} catch (_error: any) {
		console.info("ℹ️  Not a git repository or git not available");
	}

	console.info("\n✅ Bun Shell line processing demo complete!");
}

// Run the demo
main().catch(console.error);
