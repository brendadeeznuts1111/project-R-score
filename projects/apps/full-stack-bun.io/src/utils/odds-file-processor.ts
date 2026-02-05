#!/usr/bin/env bun
/**
 * [ODDS-FILE-PROCESSOR][READLINES][STREAM-PROCESSING]
 * Efficient line-by-line odds file processing using Node.js fs/promises
 */

import { open } from "node:fs/promises";
import { MLGSGraph } from "../graph/MLGSGraph";

interface OddsLine {
	league: string;
	market: string;
	bookie_a: string;
	bookie_b: string;
	odds_a: number;
	odds_b: number;
	profit_pct: number;
	timestamp: number;
}

/**
 * Process odds file line by line (memory efficient)
 */
export async function processOddsFile(
	filePath: string,
	mlgs: MLGSGraph
): Promise<{ processed: number; arbs: number; errors: number }> {
	const file = await open(filePath);
	let processed = 0;
	let arbs = 0;
	let errors = 0;

	try {
		for await (const line of file.readLines({ encoding: "utf8" })) {
			try {
				// Skip empty lines
				if (!line.trim()) continue;

				// Parse NDJSON line
				const odds: OddsLine = JSON.parse(line);
				processed++;

				// Process high-value arbitrage opportunities
				if (odds.profit_pct > 3.5) {
					// Build graph first to ensure schema is ready
					await mlgs.buildFullGraph(odds.league);
					
					arbs++;
					console.log('%j', {
						arb_found: true,
						league: odds.league,
						market: odds.market,
						profit_pct: odds.profit_pct,
						bookies: `${odds.bookie_a} vs ${odds.bookie_b}`
					});
				}
			} catch (error) {
				errors++;
				console.error('%j', {
					line_parse_error: error,
					line_number: processed + 1,
					line_preview: line.substring(0, 100)
				});
			}
		}
	} finally {
		await file.close();
	}

	return { processed, arbs, errors };
}

/**
 * Stream process multiple odds files in parallel
 */
export async function processOddsFiles(
	filePaths: string[],
	mlgs: MLGSGraph
): Promise<{ totalProcessed: number; totalArbs: number; totalErrors: number }> {
	const results = await Promise.allSettled(
		filePaths.map(filePath => processOddsFile(filePath, mlgs))
	);

	let totalProcessed = 0;
	let totalArbs = 0;
	let totalErrors = 0;

	for (const result of results) {
		if (result.status === 'fulfilled') {
			totalProcessed += result.value.processed;
			totalArbs += result.value.arbs;
			totalErrors += result.value.errors;
		} else {
			totalErrors++;
			console.error('%j', { file_process_error: result.reason });
		}
	}

	return { totalProcessed, totalArbs, totalErrors };
}

/**
 * Real-time odds file watcher (processes new lines as they're added)
 * Uses efficient incremental reading with partial line handling
 */
export async function watchOddsFile(
	filePath: string,
	mlgs: MLGSGraph,
	onArbFound?: (odds: OddsLine) => void,
	options?: {
		interval?: number;
		signal?: AbortSignal;
	}
): Promise<void> {
	let lastPosition = 0;
	let partialLine = '';
	const interval = options?.interval || 1000;
	const signal = options?.signal;

	while (!signal?.aborted) {
		try {
			const file = await open(filePath, 'r');
			
			try {
				// Get current file size
				const stats = await file.stat();
				const currentSize = stats.size;

				if (currentSize > lastPosition) {
					// Read new content since last position
					const buffer = Buffer.alloc(currentSize - lastPosition);
					const { bytesRead } = await file.read(buffer, 0, buffer.length, lastPosition);

					if (bytesRead > 0) {
						const newContent = buffer.toString('utf8', 0, bytesRead);
						
						// Handle partial line from previous read
						const fullContent = partialLine + newContent;
						const lines = fullContent.split('\n');
						
						// Last line might be incomplete, save it for next iteration
						partialLine = lines.pop() || '';

						// Process complete lines
						for (const line of lines) {
							if (!line.trim()) continue;

							try {
								const odds: OddsLine = JSON.parse(line);

								if (odds.profit_pct > 3.5) {
									// Build graph to process the odds
									await mlgs.buildFullGraph(odds.league);

									if (onArbFound) {
										onArbFound(odds);
									}
								}
							} catch (error) {
								console.error('%j', {
									line_parse_error: error,
									line_preview: line.substring(0, 100)
								});
							}
						}

						lastPosition += bytesRead;
					}
				} else if (currentSize < lastPosition) {
					// File was truncated or recreated
					lastPosition = 0;
					partialLine = '';
				}
			} finally {
				await file.close();
			}

			// Wait before checking again
			await new Promise(resolve => setTimeout(resolve, interval));
		} catch (error: any) {
			// Handle file not found or permission errors
			if (error.code === 'ENOENT') {
				console.warn('%j', {
					watch_warning: 'File not found, waiting...',
					file_path: filePath
				});
				await new Promise(resolve => setTimeout(resolve, interval * 5));
			} else {
				console.error('%j', {
					watch_error: error,
					file_path: filePath
				});
				await new Promise(resolve => setTimeout(resolve, interval * 5));
			}
		}
	}

	// Cleanup on abort
	if (signal?.aborted) {
		console.log('%j', {
			watch_stopped: true,
			file_path: filePath,
			reason: 'AbortSignal received'
		});
	}
}

