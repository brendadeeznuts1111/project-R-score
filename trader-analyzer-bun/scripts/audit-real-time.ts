#!/usr/bin/env bun
/**
 * @fileoverview 9.1.5.12.0.0.0: Real-Time Audit Worker Script
 * @description Designed to be spawned by RealTimeProcessManager for parallel documentation audits
 * @module scripts/audit-real-time
 * 
 * Cross-Reference Hub:
 * - @see 9.1.5.11.0.0.0 → RealTimeProcessManager (spawns this script)
 * - @see 9.1.5.7.0.0.0 → Orphan Detection System (uses similar logic)
 * - @see 7.4.3.0.0.0.0 → Bun.spawn API Documentation
 */

/**
 * 9.1.5.12.0.0.0: Real-Time Audit Worker Script
 * 
 * This script is designed to be spawned by RealTimeProcessManager for parallel
 * documentation audits. It uses ripgrep for efficient pattern matching and sends
 * real-time updates via IPC.
 */

// Simple argument parser (Bun doesn't have parseArgs in util)
function parseArgs() {
	const args: Record<string, string | string[]> = {};
	const argv = Bun.argv.slice(2);

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg.startsWith("--")) {
			const key = arg.slice(2);
			const nextArg = argv[i + 1];
			if (nextArg && !nextArg.startsWith("--")) {
				args[key] = nextArg;
				i++;
			} else {
				args[key] = "true";
			}
		} else if (arg.startsWith("-")) {
			const key = arg.slice(1);
			const nextArg = argv[i + 1];
			if (nextArg && !nextArg.startsWith("-")) {
				args[key] = nextArg;
				i++;
			} else {
				args[key] = "true";
			}
		}
	}

	return {
		values: args as Record<string, string>,
	};
}

// Parse command line arguments
const args = parseArgs();

/**
 * 9.1.5.12.1.0.0: Main audit function
 * 
 * Performs real-time audit with pattern matching and orphan detection.
 */
async function performRealTimeAudit() {
	const patterns = args.values.pattern?.split("|") || [];
	const targetPath = args.values.path || ".";
	const outputFormat = args.values.output || "json";

	// Send progress update via IPC (if IPC is enabled)
	// Note: process.send is available when spawned with ipc option
	try {
		if (typeof process.send === "function") {
			process.send({
				type: "progress",
				progress: 0,
				file: "Starting audit...",
			});
		}
	} catch (error) {
		// IPC not available, continue without IPC updates
		console.warn("IPC not available, running in standalone mode");
	}

	// Perform pattern matching with streaming output
	const results = [];
	for (let i = 0; i < patterns.length; i++) {
		const pattern = patterns[i];
		const result = await scanPattern(pattern, targetPath);
		results.push(result);

		// Send progress update
		try {
			if (typeof process.send === "function") {
				process.send({
					type: "progress",
					progress: Math.round(((i + 1) / patterns.length) * 100),
					file: `Completed pattern ${i + 1}/${patterns.length}`,
				});
			}
		} catch {
			// IPC not available, continue silently
		}
	}

	// Send completion message
	try {
		if (typeof process.send === "function") {
			process.send({
				type: "complete",
				timestamp: new Date().toISOString(),
				results: results,
			});
		}
	} catch {
		// IPC not available, continue silently
	}

	// Output results if not using IPC
	if (outputFormat === "json") {
		console.log(JSON.stringify({ results }, null, 2));
	}
}

/**
 * 9.1.5.12.2.0.0: Scan pattern in directory
 * 
 * Uses ripgrep for efficient pattern matching with streaming JSON output.
 * 
 * @param pattern - Regex pattern to search for
 * @param directory - Directory to scan
 * @returns Scan result with match count
 */
async function scanPattern(pattern: string, directory: string) {
	// Use ripgrep for efficient pattern matching
	const cmd = ["rg", "--type", "ts,md", "--json", pattern, directory];

	const subprocess = Bun.spawn({
		cmd,
		stdio: ["ignore", "pipe", "pipe"],
		onExit: (proc, code) => {
			if (code !== 0 && code !== 1) {
				// ripgrep returns 1 for no matches, which is OK
				console.error(`Pattern scan failed: ${pattern} (exit code: ${code})`);
			}
		},
	});

	// Stream results in real-time
	const reader = subprocess.stdout?.getReader();
	let lineCount = 0;
	const matches: any[] = [];

	if (reader) {
		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const text = new TextDecoder().decode(value);
				const lines = text.split("\n").filter((line) => line.trim());

				for (const line of lines) {
					lineCount++;

					try {
						const match = JSON.parse(line);

						// Only process match type (ripgrep outputs different JSON types)
						if (match.type === "match" && match.data) {
							matches.push(match);

							// Send match via IPC for real-time updates
							try {
								if (typeof process.send === "function") {
									process.send({
										type: "match",
										pattern,
										file: match.data.path?.text || match.data.path?.bytes || "unknown",
										line: match.data.line_number || 0,
										content: match.data.lines?.text || "",
									});
								}
							} catch {
								// IPC not available, continue silently
							}

							// Check for orphaned documentation patterns
							const filePath = match.data.path?.text || match.data.path?.bytes || "";
							if (filePath.includes("docs/") || filePath.includes(".md")) {
								await checkOrphanedDocumentation(match);
							}
						}
					} catch (error) {
						// Invalid JSON line, continue
						// ripgrep may output non-JSON lines for errors
					}
				}
			}
		} finally {
			reader.releaseLock();
		}
	}

	await subprocess.exited;

	return { pattern, matches: lineCount, details: matches };
}

/**
 * 9.1.5.12.3.0.0: Check for orphaned documentation
 * 
 * Detects documentation numbers that may be orphaned (not referenced in code).
 * 
 * @param match - Ripgrep match result
 */
async function checkOrphanedDocumentation(match: any): Promise<void> {
	const text = match.data.lines?.text || "";
	const docNumber = extractDocNumber(text);

	if (docNumber && !(await isDocumentationReferenced(docNumber))) {
		// Found potentially orphaned documentation
		try {
			if (typeof process.send === "function") {
				process.send({
					type: "orphan",
					docNumber,
					file: match.data.path?.text || match.data.path?.bytes || "unknown",
					line: match.data.line_number || 0,
				});
			}
		} catch {
			// IPC not available, continue silently
		}
	}
}

/**
 * Extract documentation number from text
 * 
 * @param text - Text to search
 * @returns Documentation number or null
 */
function extractDocNumber(text: string): string | null {
	// Match version pattern: x.x.x.x.x or x.x.x.x.x.x or x.x.x.x.x.x.x
	const match = text.match(/\d+\.\d+\.\d+\.\d+\.\d+(\.\d+)?(\.\d+)?/);
	return match ? match[0] : null;
}

/**
 * Check if documentation number is referenced in source code
 * 
 * @param docNumber - Documentation number to check
 * @returns true if referenced, false otherwise
 */
async function isDocumentationReferenced(docNumber: string): Promise<boolean> {
	// Escape dots for regex
	const escapedDocNumber = docNumber.replace(/\./g, "\\.");

	// Check if this documentation number is referenced in source code
	const cmd = ["rg", "--type", "ts", "--quiet", escapedDocNumber, "src/"];

	const result = Bun.spawnSync({
		cmd,
		stdio: ["ignore", "pipe", "pipe"],
	});

	// ripgrep returns 0 if found, 1 if not found
	return result.success;
}

/**
 * 9.1.5.12.4.0.0: Handle graceful shutdown
 * 
 * Handles SIGTERM and SIGINT signals for graceful shutdown.
 */
process.on("SIGTERM", () => {
	console.log("Received SIGTERM, shutting down gracefully...");
	try {
		if (typeof process.send === "function") {
			process.send({
				type: "shutdown",
				reason: "SIGTERM",
				timestamp: new Date().toISOString(),
			});
		}
	} catch {
		// IPC not available, continue with shutdown
	}
	process.exit(0);
});

process.on("SIGINT", () => {
	console.log("Received SIGINT, shutting down...");
	try {
		if (typeof process.send === "function") {
			process.send({
				type: "shutdown",
				reason: "SIGINT",
				timestamp: new Date().toISOString(),
			});
		}
	} catch {
		// IPC not available, continue with shutdown
	}
	process.exit(0);
});

// Main execution
if (import.meta.main) {
	performRealTimeAudit().catch((error) => {
		console.error("Audit failed:", error);
		try {
			if (typeof process.send === "function") {
				process.send({
					type: "error",
					error: String(error),
					timestamp: new Date().toISOString(),
				});
			}
		} catch {
			// IPC not available, continue with error exit
		}
		process.exit(1);
	});
}
