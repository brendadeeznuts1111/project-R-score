/**
 * @fileoverview Native Bun Metrics Collection
 * @description Metrics collection using Bun native APIs and Shell
 * @module utils/metrics-native
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-METRICS-NATIVE@0.1.0;instance-id=METRICS-NATIVE-001;version=0.1.0}]
 * [PROPERTIES:{metrics={value:"native-metrics";@root:"ROOT-OBSERVABILITY";@chain:["BP-METRICS","BP-BUN"];@version:"0.1.0"}}]
 * [CLASS:NativeMetricsCollector][#REF:v-0.1.0.BP.METRICS.NATIVE.1.0.A.1.1.OBSERVABILITY.1.1]]
 */

import { $ } from "bun";

/**
 * System metrics using Bun native APIs
 */
export interface SystemMetrics {
	timestamp: number;
	cpu: {
		user: number;
		system: number;
		percent: number;
	};
	memory: {
		heapUsed: number;
		heapTotal: number;
		rss: number;
		external: number;
	};
	uptime: number;
	processId: number;
}

/**
 * Process metrics using Bun Shell
 */
export interface ProcessMetrics {
	pid: number;
	cpuPercent: number;
	memoryMB: number;
	command: string;
}

/**
 * Native metrics collector using Bun APIs
 */
export class NativeMetricsCollector {
	private startTime = Bun.nanoseconds();
	private lastCpuUsage = process.cpuUsage();

	/**
	 * Collect system metrics using native Bun APIs
	 */
	collectSystemMetrics(): SystemMetrics {
		const now = Bun.nanoseconds();
		const uptime = (now - this.startTime) / 1_000_000_000; // Convert to seconds
		const cpuUsage = process.cpuUsage(this.lastCpuUsage);
		this.lastCpuUsage = process.cpuUsage();

		const memUsage = process.memoryUsage();

		// Calculate CPU percentage (approximate)
		const cpuTotal = cpuUsage.user + cpuUsage.system;
		const cpuPercent = cpuTotal / 1_000_000 / uptime; // Rough percentage

		return {
			timestamp: Date.now(),
			cpu: {
				user: cpuUsage.user / 1_000_000, // Convert to ms
				system: cpuUsage.system / 1_000_000,
				percent: Math.min(cpuPercent * 100, 100),
			},
			memory: {
				heapUsed: memUsage.heapUsed,
				heapTotal: memUsage.heapTotal,
				rss: memUsage.rss,
				external: memUsage.external,
			},
			uptime,
			processId: process.pid,
		};
	}

	/**
	 * Get top processes by CPU using Bun Shell
	 */
	async getTopProcesses(limit = 10): Promise<ProcessMetrics[]> {
		try {
			// Use ps command with piping to get top processes
			const result =
				await $`ps aux | sort -rk 3,3 | head -n ${limit + 1}`.text();
			const lines = result.trim().split("\n").slice(1); // Skip header

			return lines.map((line) => {
				const parts = line.trim().split(/\s+/);
				return {
					pid: parseInt(parts[1], 10),
					cpuPercent: parseFloat(parts[2]),
					memoryMB: parseFloat(parts[5]),
					command: parts.slice(10).join(" "),
				};
			});
		} catch {
			return [];
		}
	}

	/**
	 * Get disk usage using Bun Shell with command substitution
	 */
	async getDiskUsage(path = "."): Promise<{
		total: number;
		used: number;
		available: number;
		percent: number;
	}> {
		try {
			// Use df command with command substitution
			const result = await $`df -h ${path} | tail -n 1`.text();
			const parts = result.trim().split(/\s+/);

			// Parse sizes (e.g., "100G" -> bytes)
			const parseSize = (size: string): number => {
				const match = size.match(/^(\d+\.?\d*)([KMGT])?$/i);
				if (!match) return 0;
				const value = parseFloat(match[1]);
				const unit = match[2]?.toUpperCase() || "";
				const multipliers: Record<string, number> = {
					K: 1024,
					M: 1024 ** 2,
					G: 1024 ** 3,
					T: 1024 ** 4,
				};
				return value * (multipliers[unit] || 1);
			};

			return {
				total: parseSize(parts[1]),
				used: parseSize(parts[2]),
				available: parseSize(parts[3]),
				percent: parseFloat(parts[4].replace("%", "")),
			};
		} catch {
			return { total: 0, used: 0, available: 0, percent: 0 };
		}
	}

	/**
	 * Get network stats using Bun Shell
	 */
	async getNetworkStats(): Promise<{
		interfaces: Array<{
			name: string;
			rxBytes: number;
			txBytes: number;
		}>;
	}> {
		try {
			// Use ifconfig or ip command (fallback to cat /proc/net/dev on Linux)
			const platform = process.platform;
			let result: string;

			if (platform === "darwin") {
				result = await $`ifconfig | grep -E "^[a-z]" | awk '{print $1}'`.text();
			} else {
				result =
					await $`cat /proc/net/dev | tail -n +3 | awk '{print $1}'`.text();
			}

			const interfaces = result
				.trim()
				.split("\n")
				.map((line) => line.split(":")[0].trim())
				.filter(Boolean)
				.map((name) => ({
					name,
					rxBytes: 0, // Would need more parsing for actual stats
					txBytes: 0,
				}));

			return { interfaces };
		} catch {
			return { interfaces: [] };
		}
	}

	/**
	 * Get Git commit hash using command substitution
	 */
	async getGitCommitHash(): Promise<string | null> {
		try {
			const hash = await $`git rev-parse HEAD`.text();
			return hash.trim();
		} catch {
			return null;
		}
	}

	/**
	 * Get Git branch using command substitution
	 */
	async getGitBranch(): Promise<string | null> {
		try {
			const branch = await $`git rev-parse --abbrev-ref HEAD`.text();
			return branch.trim();
		} catch {
			return null;
		}
	}
}

/**
 * Singleton instance
 */
export const nativeMetrics = new NativeMetricsCollector();
