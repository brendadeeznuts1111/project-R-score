/**
 * @fileoverview 1.1.1.1.3.1.2: Pattern Matching Engine
 * @description Multi-pattern matching engine for documentation audit
 * @module audit/pattern-matching-engine
 */

import { EventEmitter } from "events";
import { spawn, type Subprocess } from "bun";

/**
 * Pattern match result
 */
export interface PatternMatch {
	pattern: string;
	file: string;
	line: number;
	content: string;
	matchGroups?: string[];
}

/**
 * Pattern matching options
 */
export interface PatternMatchingOptions {
	patterns: string[];
	directories: string[];
	fileExtensions?: string[];
	caseSensitive?: boolean;
	multiline?: boolean;
	timeout?: number;
}

/**
 * 1.1.1.1.3.1.2: Pattern Matching Engine
 *
 * Efficiently matches multiple patterns across codebase using ripgrep
 */
export class PatternMatchingEngine extends EventEmitter {
	private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
	private activeProcesses: Set<Subprocess> = new Set();

	/**
	 * Match multiple patterns across directories
	 *
	 * @param options - Pattern matching options
	 * @returns Array of pattern matches
	 */
	async matchPatterns(
		options: PatternMatchingOptions,
	): Promise<PatternMatch[]> {
		const matches: PatternMatch[] = [];
		const timeout = options.timeout || this.DEFAULT_TIMEOUT;

		// Build ripgrep command
		const patterns = options.patterns
			.map((p) => this.escapePattern(p))
			.join("|");
		const extensions = options.fileExtensions || [
			"ts",
			"tsx",
			"js",
			"jsx",
			"md",
		];

		for (const directory of options.directories) {
			try {
				const cmd = [
					"rg",
					"--type-add",
					`custom:*.{${extensions.join(",")}}`,
					"--type",
					"custom",
					"--json",
					"--line-number",
					patterns,
					directory,
				];

				if (!options.caseSensitive) {
					cmd.push("--ignore-case");
				}

				if (options.multiline) {
					cmd.push("--multiline");
				}

				const subprocess = spawn({
					cmd,
					stdio: ["ignore", "pipe", "pipe"],
					onExit: (proc, code) => {
						this.activeProcesses.delete(proc);
						if (code !== 0 && code !== 1) {
							// ripgrep returns 1 for no matches, which is OK
							this.emit(
								"error",
								new Error(`Pattern match failed: exit code ${code}`),
							);
						}
					},
				});

				this.activeProcesses.add(subprocess);

				// Set timeout
				const timeoutId = setTimeout(() => {
					subprocess.kill();
					this.activeProcesses.delete(subprocess);
					this.emit("timeout", { directory, patterns });
				}, timeout);

				// Collect results
				const reader = subprocess.stdout?.getReader();
				if (reader) {
					try {
						while (true) {
							const { done, value } = await reader.read();
							if (done) break;

							const text = new TextDecoder().decode(value);
							const lines = text.split("\n").filter((line) => line.trim());

							for (const line of lines) {
								try {
									const json = JSON.parse(line);
									if (json.type === "match") {
										const match = this.parseRipgrepMatch(
											json,
											options.patterns,
										);
										if (match) {
											matches.push(match);
											this.emit("match", match);
										}
									}
								} catch {
									// Invalid JSON line, skip
								}
							}
						}
					} finally {
						reader.releaseLock();
						clearTimeout(timeoutId);
					}
				}

				await subprocess.exited;
			} catch (error) {
				this.emit("error", error);
			}
		}

		return matches;
	}

	/**
	 * Match single pattern (optimized)
	 */
	async matchSinglePattern(
		pattern: string,
		directory: string,
		options?: { timeout?: number; caseSensitive?: boolean },
	): Promise<PatternMatch[]> {
		return this.matchPatterns({
			patterns: [pattern],
			directories: [directory],
			timeout: options?.timeout,
			caseSensitive: options?.caseSensitive,
		});
	}

	/**
	 * Cancel all active pattern matches
	 */
	cancelAll(): void {
		for (const process of this.activeProcesses) {
			process.kill();
		}
		this.activeProcesses.clear();
	}

	/**
	 * Parse ripgrep JSON match output
	 */
	private parseRipgrepMatch(
		json: any,
		patterns: string[],
	): PatternMatch | null {
		if (!json.data || !json.data.path || !json.data.lines) {
			return null;
		}

		const file = json.data.path.text || "";
		const line = json.data.line_number || 0;
		const content = json.data.lines.text || "";

		// Find which pattern matched
		let matchedPattern = patterns[0];
		let matchGroups: string[] | undefined;

		for (const pattern of patterns) {
			const regex = new RegExp(pattern, "g");
			const match = regex.exec(content);
			if (match) {
				matchedPattern = pattern;
				matchGroups = match.slice(1); // Capture groups
				break;
			}
		}

		return {
			pattern: matchedPattern,
			file,
			line,
			content: content.trim(),
			matchGroups,
		};
	}

	/**
	 * Escape pattern for ripgrep
	 */
	private escapePattern(pattern: string): string {
		// Escape special regex characters but preserve regex syntax
		return pattern;
	}
}
