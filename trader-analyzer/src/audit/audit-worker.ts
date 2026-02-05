/**
 * @fileoverview 9.1.5.15.0.0.0: Audit Worker Thread
 * @description Worker thread for parallel pattern scanning and documentation audits
 * @module audit/audit-worker
 *
 * Cross-Reference Hub:
 * - @see 9.1.5.14.0.0.0 → WorkerAuditManager (spawns this worker)
 * - @see Bun Workers API → https://bun.com/docs/runtime/workers
 */

declare var self: Worker;

/**
 * 9.1.5.15.0.0.0: Audit Worker Thread
 *
 * Worker thread that performs pattern scanning and documentation audits.
 * Uses Bun's fast postMessage paths for optimal performance.
 */

// Import shared utilities (preloaded)
import {
	extractDocNumber,
	isValidDocNumber,
	WORKER_CONFIG,
} from "./audit-worker-shared";

/**
 * Message handler for audit requests
 */
self.onmessage = async (event: MessageEvent) => {
	const data = event.data;

	try {
		switch (data.type) {
			case "scan":
				await handlePatternScan(data.pattern, data.directory);
				break;

			case "audit":
				await handleAudit(data.targetPath, data.patterns);
				break;

			default:
				postMessage({
					type: "error",
					error: `Unknown message type: ${data.type}`,
				});
		}
	} catch (error) {
		postMessage({
			type: "error",
			error: error instanceof Error ? error.message : String(error),
		});
	}
};

/**
 * 9.1.5.15.1.0.0: Handle pattern scan request
 *
 * Scans a directory for a pattern using ripgrep and sends results via postMessage.
 */
async function handlePatternScan(
	pattern: string,
	directory: string,
): Promise<void> {
	try {
		// Use ripgrep for pattern matching via Bun.spawnSync
		const cmd = ["rg", "--type", "ts,md", "--json", pattern, directory];

		const result = Bun.spawnSync({
			cmd,
			stdio: ["ignore", "pipe", "pipe"],
		});

		if (!result.success && result.exitCode !== 1) {
			// ripgrep returns 1 for no matches, which is OK
			throw new Error(`ripgrep failed with exit code ${result.exitCode}`);
		}

		const output = result.stdout?.toString() || "";
		const lines = output.split("\n").filter((line) => line.trim());
		let matchCount = 0;

		for (const line of lines) {
			try {
				const match = JSON.parse(line);

				// Only process match type
				if (match.type === "match" && match.data) {
					matchCount++;

					// Use fast path for simple objects (2-241x faster)
					// Simple object with primitives triggers Bun's fast path
					postMessage({
						type: "match",
						file: match.data.path?.text || match.data.path?.bytes || "unknown",
						line: match.data.line_number || 0,
						content: match.data.lines?.text || "",
					});
				}
			} catch {
				// Invalid JSON line, continue
			}
		}

		// Send completion (fast path for simple object)
		postMessage({
			type: "complete",
			matches: matchCount,
		});
	} catch (error: any) {
		postMessage({
			type: "error",
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

/**
 * 9.1.5.15.2.0.0: Handle audit request
 *
 * Performs comprehensive audit with multiple patterns.
 */
async function handleAudit(
	targetPath: string,
	patterns: string[],
): Promise<void> {
	// Send progress update (fast path)
	postMessage({
		type: "progress",
		progress: 0,
		file: "Starting audit...",
	});

	const results: any[] = [];

	for (let i = 0; i < patterns.length; i++) {
		const pattern = patterns[i];

		// Scan pattern
		await handlePatternScan(pattern, targetPath);

		// Send progress update (fast path)
		postMessage({
			type: "progress",
			progress: Math.round(((i + 1) / patterns.length) * 100),
			file: `Completed pattern ${i + 1}/${patterns.length}`,
		});
	}

	// Send completion (fast path)
	postMessage({
		type: "complete",
		timestamp: new Date().toISOString(),
		results: results,
	});
}

/**
 * Handle worker errors
 */
self.onerror = (error) => {
	postMessage({
		type: "error",
		error: error.message || String(error),
	});
};
