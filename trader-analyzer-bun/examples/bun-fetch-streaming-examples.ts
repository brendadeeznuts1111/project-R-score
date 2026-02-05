#!/usr/bin/env bun
/**
 * @fileoverview Bun Fetch Streaming Response Examples
 * @description Practical examples of streaming response bodies with Bun's fetch API
 * @module examples/bun-fetch-streaming-examples
 *
 * @see {@link ../docs/BUN-FETCH-STREAMING-RESPONSES.md|Bun Fetch Streaming Responses Documentation}
 * @see {@link ../docs/BUN-FETCH-TIMEOUTS.md|Bun Fetch Timeouts Documentation}
 * @see {@link https://bun.com/docs/runtime/networking/fetch#streaming-response-bodies|Bun Official Docs}
 * @see {@link https://bun.com/docs/runtime/networking/fetch#fetching-a-url-with-a-timeout|Bun Timeout Docs}
 */

/**
 * Example 1: Basic streaming with async iterator
 * Stream response body chunk by chunk
 */
export async function streamBasicExample(url: string): Promise<void> {
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`HTTP ${response.status}: ${response.statusText}`);
	}

	if (!response.body) {
		throw new Error("Response body is not streamable");
	}

	console.log("Starting to stream response...");

	let totalBytes = 0;
	for await (const chunk of response.body) {
		totalBytes += chunk.length;
		console.log(`Received chunk: ${chunk.length} bytes (total: ${totalBytes})`);
	}

	console.log(`Stream complete. Total bytes: ${totalBytes}`);
}

/**
 * Example 2: Stream JSON lines (NDJSON)
 * Process newline-delimited JSON incrementally
 */
export async function* streamJSONLines(
	url: string,
): AsyncGenerator<Record<string, unknown>> {
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`HTTP ${response.status}: ${response.statusText}`);
	}

	if (!response.body) {
		throw new Error("Response body is not streamable");
	}

	const decoder = new TextDecoder();
	let buffer = "";

	for await (const chunk of response.body) {
		buffer += decoder.decode(chunk, { stream: true });
		const lines = buffer.split("\n");
		buffer = lines.pop() || ""; // Keep incomplete line in buffer

		for (const line of lines) {
			if (line.trim()) {
				try {
					yield JSON.parse(line) as Record<string, unknown>;
				} catch (error: unknown) {
					const errorMessage =
						error instanceof Error ? error.message : String(error);
					console.error(`Failed to parse JSON line: ${errorMessage}`);
				}
			}
		}
	}

	// Process remaining buffer
	if (buffer.trim()) {
		try {
			yield JSON.parse(buffer) as Record<string, unknown>;
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			console.error(`Failed to parse final JSON line: ${errorMessage}`);
		}
	}
}

/**
 * Example 3: Stream CSV data
 * Process CSV line by line without loading entire file
 */
export async function* streamCSV(
	url: string,
): AsyncGenerator<Record<string, string>> {
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`HTTP ${response.status}: ${response.statusText}`);
	}

	if (!response.body) {
		throw new Error("Response body is not streamable");
	}

	const decoder = new TextDecoder();
	let buffer = "";
	let headers: string[] | null = null;

	for await (const chunk of response.body) {
		buffer += decoder.decode(chunk, { stream: true });
		const lines = buffer.split("\n");
		buffer = lines.pop() || "";

		for (const line of lines) {
			if (!line.trim()) continue;

			const row = line.split(",").map((cell) => cell.trim());

			if (!headers) {
				headers = row;
				continue;
			}

			// Yield row as object
			const record: Record<string, string> = {};
			headers.forEach((header, i) => {
				record[header] = row[i] || "";
			});

			yield record;
		}
	}
}

/**
 * Example 4: Stream with progress tracking
 * Monitor download progress for large files
 */
export async function streamWithProgress(
	url: string,
	onProgress?: (progress: { received: number; total: number | null; percent: number | null }) => void,
): Promise<void> {
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`HTTP ${response.status}: ${response.statusText}`);
	}

	if (!response.body) {
		throw new Error("Response body is not streamable");
	}

	const contentLength = response.headers.get("content-length");
	const totalBytes = contentLength ? parseInt(contentLength, 10) : null;
	let receivedBytes = 0;

	for await (const chunk of response.body) {
		receivedBytes += chunk.length;

		if (onProgress) {
			const percent = totalBytes ? (receivedBytes / totalBytes) * 100 : null;
			onProgress({
				received: receivedBytes,
				total: totalBytes,
				percent,
			});
		}
	}
}

/**
 * Example 5: Stream to file
 * Download large file directly to disk
 */
export async function streamToFile(
	url: string,
	outputPath: string,
): Promise<void> {
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`HTTP ${response.status}: ${response.statusText}`);
	}

	// Bun optimizes this - uses sendfile when possible
	await Bun.write(outputPath, response);
	console.log(`File saved to: ${outputPath}`);
}

/**
 * Example 6: Stream with error handling and cleanup
 * Proper error handling with resource cleanup
 */
export async function streamWithErrorHandling(
	url: string,
): Promise<void> {
	let response: Response | null = null;
	let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

	try {
		response = await fetch(url);

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		if (!response.body) {
			throw new Error("Response body is not streamable");
		}

		reader = response.body.getReader();
		const decoder = new TextDecoder();

		while (true) {
			const { value, done } = await reader.read();
			if (done) break;

			const text = decoder.decode(value, { stream: true });
			console.log("Chunk:", text.substring(0, 100)); // Log first 100 chars
		}
	} catch (error: unknown) {
		const errorMessage =
			error instanceof Error ? error.message : String(error);
		console.error("Streaming error:", errorMessage);
		throw error;
	} finally {
		// Always cleanup
		if (reader) {
			reader.releaseLock();
		}
	}
}

/**
 * Example 7: Stream correlation graph data
 * Stream large correlation graph responses from API
 * @see src/api/routes.ts - Correlation graph endpoint
 */
export async function streamCorrelationGraph(
	eventId: string,
	apiBaseUrl = "http://localhost:3001",
): Promise<void> {
	const url = `${apiBaseUrl}/api/dashboard/correlation-graph?event_id=${eventId}&time_window=24`;

	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`HTTP ${response.status}: ${response.statusText}`);
	}

	if (!response.body) {
		throw new Error("Response body is not streamable");
	}

	const decoder = new TextDecoder();
	let buffer = "";

	console.log(`Streaming correlation graph for event: ${eventId}`);

	for await (const chunk of response.body) {
		buffer += decoder.decode(chunk, { stream: true });

		// Try to parse complete JSON objects as they arrive
		try {
			const data = JSON.parse(buffer);
			console.log("Graph data received:", {
				eventId: data.eventId,
				layers: data.layers?.length || 0,
				nodes: data.nodes?.length || 0,
				edges: data.edges?.length || 0,
			});
			buffer = "";
		} catch {
			// Incomplete JSON, keep buffering
			continue;
		}
	}
}

/**
 * Example 8: Stream logs from API
 * Stream log responses incrementally
 * @see src/api/websocket/log-stream.ts - WebSocket log streaming
 */
export async function streamLogs(
	apiBaseUrl = "http://localhost:3001",
	level?: string,
): Promise<void> {
	const url = new URL(`${apiBaseUrl}/api/logs`);
	if (level) url.searchParams.set("level", level);

	const response = await fetch(url.toString());

	if (!response.ok) {
		throw new Error(`HTTP ${response.status}: ${response.statusText}`);
	}

	if (!response.body) {
		throw new Error("Response body is not streamable");
	}

	const decoder = new TextDecoder();

	for await (const chunk of response.body) {
		const text = decoder.decode(chunk, { stream: true });
		const lines = text.split("\n").filter(Boolean);

		for (const line of lines) {
			try {
				const log = JSON.parse(line) as {
					level?: string;
					message?: string;
					timestamp?: string;
				};
				console.log(
					`[${log.level || "INFO"}] ${log.timestamp || ""} ${log.message || line}`,
				);
			} catch {
				// Not JSON, print as-is
				console.log(line);
			}
		}
	}
}

/**
 * Example 9: Stream with timeout
 * Stream response body with timeout protection
 * @see docs/BUN-FETCH-TIMEOUTS.md - Timeout documentation
 */
export async function streamWithTimeout(
	url: string,
	timeoutMs: number,
): Promise<void> {
	console.log(`Streaming ${url} with ${timeoutMs}ms timeout...`);

	try {
		const response = await fetch(url, {
			signal: AbortSignal.timeout(timeoutMs),
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		if (!response.body) {
			throw new Error("Response body is not streamable");
		}

		const decoder = new TextDecoder();
		let totalBytes = 0;

		for await (const chunk of response.body) {
			totalBytes += chunk.length;
			const text = decoder.decode(chunk, { stream: true });
			console.log(`Received: ${chunk.length} bytes (total: ${totalBytes})`);
		}

		console.log(`Stream complete. Total: ${totalBytes} bytes`);
	} catch (error: unknown) {
		if (error instanceof Error && error.name === "AbortError") {
			console.error(`❌ Request timed out after ${timeoutMs}ms`);
			process.exit(1);
		}
		throw error;
	}
}

/**
 * Example 10: Stream with timeout and retry
 * Retry on timeout with exponential backoff
 * @see docs/BUN-FETCH-TIMEOUTS.md - Timeout retry patterns
 */
export async function streamWithTimeoutRetry(
	url: string,
	timeoutMs: number,
	maxRetries: number = 3,
): Promise<void> {
	console.log(
		`Streaming ${url} with ${timeoutMs}ms timeout (max ${maxRetries} retries)...`,
	);

	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			if (attempt > 0) {
				const backoffMs = 1000 * Math.pow(2, attempt - 1);
				console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${backoffMs}ms...`);
				await new Promise((resolve) => setTimeout(resolve, backoffMs));
			}

			const response = await fetch(url, {
				signal: AbortSignal.timeout(timeoutMs),
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			if (!response.body) {
				throw new Error("Response body is not streamable");
			}

			const decoder = new TextDecoder();
			let totalBytes = 0;

			for await (const chunk of response.body) {
				totalBytes += chunk.length;
				const text = decoder.decode(chunk, { stream: true });
				console.log(`Received: ${chunk.length} bytes (total: ${totalBytes})`);
			}

			console.log(`✅ Stream complete. Total: ${totalBytes} bytes`);
			return;
		} catch (error: unknown) {
			if (error instanceof Error && error.name === "AbortError") {
				if (attempt === maxRetries - 1) {
					console.error(
						`❌ Request timed out after ${maxRetries} attempts (${timeoutMs}ms each)`,
					);
					process.exit(1);
				}
				// Will retry
				continue;
			}
			throw error;
		}
	}
}

// ═══════════════════════════════════════════════════════════════
// CLI Usage Examples
// ═══════════════════════════════════════════════════════════════

if (import.meta.main) {
	const command = process.argv[2];

	switch (command) {
		case "basic":
			await streamBasicExample(process.argv[3] || "https://example.com");
			break;

		case "json-lines":
			for await (const item of streamJSONLines(
				process.argv[3] || "https://example.com/ndjson",
			)) {
				console.log("Item:", item);
			}
			break;

		case "csv":
			for await (const row of streamCSV(
				process.argv[3] || "https://example.com/data.csv",
			)) {
				console.log("Row:", row);
			}
			break;

		case "progress":
			await streamWithProgress(process.argv[3] || "https://example.com", (progress) => {
				if (progress.percent !== null) {
					console.log(`Progress: ${progress.percent.toFixed(2)}%`);
				} else {
					console.log(`Received: ${progress.received} bytes`);
				}
			});
			break;

		case "to-file":
			await streamToFile(
				process.argv[3] || "https://example.com/file.zip",
				process.argv[4] || "./downloads/file.zip",
			);
			break;

		case "correlation-graph":
			await streamCorrelationGraph(process.argv[3] || "event-123");
			break;

		case "logs":
			await streamLogs("http://localhost:3001", process.argv[3]);
			break;

		case "timeout":
			await streamWithTimeout(
				process.argv[3] || "https://httpbin.org/delay/10",
				parseInt(process.argv[4] || "5000"),
			);
			break;

		case "timeout-retry":
			await streamWithTimeoutRetry(
				process.argv[3] || "https://httpbin.org/delay/10",
				parseInt(process.argv[4] || "5000"),
				parseInt(process.argv[5] || "3"),
			);
			break;

		default:
			console.log(`
Bun Fetch Streaming Examples

Usage:
  bun run examples/bun-fetch-streaming-examples.ts <command> [args...]

Commands:
  basic <url>                    Stream basic response
  json-lines <url>               Stream NDJSON (newline-delimited JSON)
  csv <url>                      Stream CSV data
  progress <url>                 Stream with progress tracking
  to-file <url> <output>         Stream to file
  correlation-graph <eventId>    Stream correlation graph data
  logs [level]                   Stream logs from API
  timeout <url> [ms]             Stream with timeout (default: 5000ms)
  timeout-retry <url> [ms] [retries]  Stream with timeout and retry

Examples:
  bun run examples/bun-fetch-streaming-examples.ts basic https://example.com
  bun run examples/bun-fetch-streaming-examples.ts json-lines https://api.example.com/feed.ndjson
  bun run examples/bun-fetch-streaming-examples.ts correlation-graph event-123
  bun run examples/bun-fetch-streaming-examples.ts logs error
  bun run examples/bun-fetch-streaming-examples.ts timeout https://httpbin.org/delay/10 5000
  bun run examples/bun-fetch-streaming-examples.ts timeout-retry https://httpbin.org/delay/10 5000 3
			`);
			process.exit(1);
	}
}
