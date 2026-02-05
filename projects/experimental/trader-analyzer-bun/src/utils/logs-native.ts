/**
 * @fileoverview Native Bun Log Viewer
 * @description Log viewing and streaming using Bun Shell and native APIs
 * @module utils/logs-native
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-LOGS-NATIVE@0.1.0;instance-id=LOGS-NATIVE-001;version=0.1.0}]
 * [PROPERTIES:{logs={value:"native-logs";@root:"ROOT-OBSERVABILITY";@chain:["BP-LOGS","BP-BUN"];@version:"0.1.0"}}]
 * [CLASS:NativeLogViewer][#REF:v-0.1.0.BP.LOGS.NATIVE.1.0.A.1.1.OBSERVABILITY.1.1]]
 */

import { $ } from "bun";

/**
 * Log entry
 */
export interface LogEntry {
	timestamp: string;
	level: string;
	message: string;
	source?: string;
}

/**
 * Log filter options
 */
export interface LogFilter {
	level?: "error" | "warn" | "info" | "debug";
	source?: string;
	search?: string;
	limit?: number;
}

/**
 * Native log viewer using Bun Shell
 */
export class NativeLogViewer {
	/**
	 * Read log file with filtering using Bun Shell piping
	 */
	async readLogs(filePath: string, filter?: LogFilter): Promise<LogEntry[]> {
		try {
			let command = `tail -n ${filter?.limit || 100} ${filePath}`;

			// Apply filters using grep piping
			if (filter?.level) {
				command += ` | grep -i "${filter.level}"`;
			}
			if (filter?.source) {
				command += ` | grep "${filter.source}"`;
			}
			if (filter?.search) {
				command += ` | grep -i "${filter.search}"`;
			}

			const result = await $`${command}`.text();
			const lines = result.trim().split("\n").filter(Boolean);

			return lines.map((line) => {
				// Parse log line (adjust based on your log format)
				const match = line.match(
					/^(\d{4}-\d{2}-\d{2}T[\d:.-]+Z)\s+\[(\w+)\]\s+(.+)$/,
				);
				if (match) {
					return {
						timestamp: match[1],
						level: match[2],
						message: match[3],
					};
				}

				// Fallback parsing
				return {
					timestamp: new Date().toISOString(),
					level: "info",
					message: line,
				};
			});
		} catch {
			return [];
		}
	}

	/**
	 * Stream logs using Bun Shell with tail -f
	 */
	async *streamLogs(filePath: string): AsyncGenerator<LogEntry> {
		try {
			// Use tail -f to follow log file
			const proc = Bun.spawn(["tail", "-f", filePath], {
				stdout: "pipe",
				stderr: "pipe",
			});

			const reader = proc.stdout.getReader();

			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					const text = new TextDecoder().decode(value);
					const lines = text.split("\n").filter(Boolean);

					for (const line of lines) {
						const match = line.match(
							/^(\d{4}-\d{2}-\d{2}T[\d:.-]+Z)\s+\[(\w+)\]\s+(.+)$/,
						);
						if (match) {
							yield {
								timestamp: match[1],
								level: match[2],
								message: match[3],
							};
						} else {
							yield {
								timestamp: new Date().toISOString(),
								level: "info",
								message: line,
							};
						}
					}
				}
			} finally {
				reader.releaseLock();
				proc.kill();
			}
		} catch (error) {
			console.error("Error streaming logs:", error);
		}
	}

	/**
	 * Count log entries by level using Bun Shell
	 */
	async countLogsByLevel(filePath: string): Promise<Record<string, number>> {
		try {
			const counts: Record<string, number> = {};

			// Count each level using grep and wc
			for (const level of ["error", "warn", "info", "debug"]) {
				const result =
					await $`grep -i "\\[${level}\\]" ${filePath} | wc -l`.text();
				counts[level] = parseInt(result.trim(), 10) || 0;
			}

			return counts;
		} catch {
			return {};
		}
	}

	/**
	 * Get recent errors using Bun Shell piping
	 */
	async getRecentErrors(filePath: string, limit = 10): Promise<LogEntry[]> {
		try {
			const result =
				await $`grep -i "\\[error\\]" ${filePath} | tail -n ${limit}`.text();
			const lines = result.trim().split("\n").filter(Boolean);

			return lines.map((line) => {
				const match = line.match(
					/^(\d{4}-\d{2}-\d{2}T[\d:.-]+Z)\s+\[error\]\s+(.+)$/i,
				);
				return {
					timestamp: match?.[1] || new Date().toISOString(),
					level: "error",
					message: match?.[2] || line,
				};
			});
		} catch {
			return [];
		}
	}

	/**
	 * Search logs using Bun Shell with grep
	 */
	async searchLogs(
		filePath: string,
		query: string,
		limit = 50,
	): Promise<LogEntry[]> {
		try {
			const result =
				await $`grep -i "${query}" ${filePath} | tail -n ${limit}`.text();
			const lines = result.trim().split("\n").filter(Boolean);

			return lines.map((line) => {
				const match = line.match(
					/^(\d{4}-\d{2}-\d{2}T[\d:.-]+Z)\s+\[(\w+)\]\s+(.+)$/,
				);
				return {
					timestamp: match?.[1] || new Date().toISOString(),
					level: match?.[2] || "info",
					message: match?.[3] || line,
				};
			});
		} catch {
			return [];
		}
	}
}

/**
 * Singleton instance
 */
export const nativeLogs = new NativeLogViewer();
