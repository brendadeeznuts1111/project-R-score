/**
 * @fileoverview Process Registry
 * @description Track and manage server processes (PIDs, ports, start times)
 * @module mcp/utils/process-registry
 */

export interface ProcessInfo {
	pid: number;
	port?: number;
	name: string;
	command: string;
	startedAt: number;
	url?: string;
}

/**
 * Process Registry
 * Tracks running server processes for management via MCP
 */
export class ProcessRegistry {
	private processes = new Map<string, ProcessInfo>();

	/**
	 * Register a process
	 */
	register(
		name: string,
		pid: number,
		options?: {
			port?: number;
			command?: string;
			url?: string;
		},
	): void {
		this.processes.set(name, {
			pid,
			port: options?.port,
			name,
			command: options?.command || "",
			startedAt: Date.now(),
			url: options?.url,
		});
	}

	/**
	 * Get process info by name
	 */
	get(name: string): ProcessInfo | undefined {
		return this.processes.get(name);
	}

	/**
	 * Get process by PID
	 */
	getByPid(pid: number): ProcessInfo | undefined {
		for (const process of this.processes.values()) {
			if (process.pid === pid) {
				return process;
			}
		}
		return undefined;
	}

	/**
	 * Get process by port
	 */
	getByPort(port: number): ProcessInfo | undefined {
		for (const process of this.processes.values()) {
			if (process.port === port) {
				return process;
			}
		}
		return undefined;
	}

	/**
	 * Check if process is registered
	 */
	has(name: string): boolean {
		return this.processes.has(name);
	}

	/**
	 * Remove process from registry
	 */
	unregister(name: string): boolean {
		return this.processes.delete(name);
	}

	/**
	 * List all processes
	 */
	list(): ProcessInfo[] {
		return Array.from(this.processes.values());
	}

	/**
	 * Clear all processes
	 */
	clear(): void {
		this.processes.clear();
	}

	/**
	 * Get uptime for a process
	 */
	getUptime(name: string): number | null {
		const process = this.processes.get(name);
		if (!process) return null;
		return Date.now() - process.startedAt;
	}

	/**
	 * Check if port is in use
	 */
	isPortInUse(port: number): boolean {
		return this.getByPort(port) !== undefined;
	}
}

// Singleton instance
export const processRegistry = new ProcessRegistry();
