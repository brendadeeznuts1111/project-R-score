// Bun utilities for Matrix Insights

export function randomUUIDv7(): string {
	// Generate a UUID v7 (time-based) using Bun's crypto
	const _timestamp = Date.now();
	const random = Bun.randomUUIDv7();
	return random;
}

export function inspect() {
	return {
		table: (data: any[], columns: string[]) => {
			if (!data || data.length === 0) return;

			// Calculate column widths
			const widths = columns.map((col) =>
				Math.max(
					...data.map((row) => String(row[col] || "").length),
					col.length,
				),
			);

			// Build table
			const separator = `┌${widths.map((w) => "─".repeat(w + 2)).join("┬")}┐`;
			const headerSeparator = `├${widths.map((w) => "─".repeat(w + 2)).join("┼")}┤`;
			const footer = `└${widths.map((w) => "─".repeat(w + 2)).join("┴")}┘`;

			console.log(separator);

			// Header
			const header =
				"│ " +
				columns.map((col, i) => col.padEnd(widths[i])).join(" │ ") +
				" │";
			console.log(header);
			console.log(headerSeparator);

			// Rows
			data.forEach((row) => {
				const rowStr =
					"│ " +
					columns
						.map((col, i) => String(row[col] || "").padEnd(widths[i]))
						.join(" │ ") +
					" │";
				console.log(rowStr);
			});

			console.log(footer);
		},
	};
}

export function stringWidth(str: string): number {
	// Calculate string width for TUI layouts
	return [...str].length;
}

export async function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// Compression utilities (placeholder for zstd)
export const zstd = {
	compressSync: (data: string | Uint8Array): Uint8Array => {
		// Placeholder for zstd compression
		if (typeof data === "string") {
			return new TextEncoder().encode(data);
		}
		return data;
	},

	decompressSync: (data: Uint8Array): Uint8Array => {
		// Placeholder for zstd decompression
		return data;
	},
};

// File utilities
export const file = {
	async exists(path: string): Promise<boolean> {
		try {
			await Bun.file(path).exists();
			return true;
		} catch {
			return false;
		}
	},

	async read(path: string): Promise<string> {
		return await Bun.file(path).text();
	},

	async write(path: string, content: string): Promise<void> {
		await Bun.write(path, content);
	},
};

// Process utilities
export const processUtils = {
	pid: process.pid,
	uptime: () => process.uptime(),

	memoryUsage: () => process.memoryUsage(),

	cwd: () => process.cwd(),

	env: process.env,

	nextTick: (fn: Function) => process.nextTick(fn),
};

// Console utilities with colors
export const consoleUtils = {
	log: (...args: any[]) => console.log(...args),
	error: (...args: any[]) => console.error("❌", ...args),
	warn: (...args: any[]) => console.warn("⚠️", ...args),
	info: (...args: any[]) => console.info("ℹ️", ...args),
	success: (...args: any[]) => console.log("✅", ...args),
};

// Network utilities
export const network = {
	async fetch(url: string, options?: RequestInit): Promise<Response> {
		return await fetch(url, options);
	},

	async isPortAvailable(port: number): Promise<boolean> {
		try {
			const server = Bun.serve({
				port,
				fetch() {
					return new Response("OK");
				},
			});
			server.stop();
			return true;
		} catch {
			return false;
		}
	},
};

// Time utilities
export const time = {
	now: () => Date.now(),

	iso: () => new Date().toISOString(),

	format: (date: Date, _format: string) => {
		// Simple date formatting
		return date.toLocaleString();
	},

	human: (ms: number) => {
		if (ms < 1000) return `${ms}ms`;
		if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
		if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
		return `${(ms / 3600000).toFixed(1)}h`;
	},
};

// Math utilities
export const math = {
	round: (num: number, decimals: number = 0) => {
		return Math.round(num * 10 ** decimals) / 10 ** decimals;
	},

	clamp: (num: number, min: number, max: number) => {
		return Math.min(Math.max(num, min), max);
	},

	random: (min: number, max: number) => {
		return Math.random() * (max - min) + min;
	},
};

// Array utilities
export const array = {
	sum: (arr: number[]) => arr.reduce((a, b) => a + b, 0),
	avg: (arr: number[]) => (arr.length > 0 ? array.sum(arr) / arr.length : 0),
	max: (arr: number[]) => Math.max(...arr),
	min: (arr: number[]) => Math.min(...arr),

	chunk: <T>(arr: T[], size: number): T[][] => {
		const chunks: T[][] = [];
		for (let i = 0; i < arr.length; i += size) {
			chunks.push(arr.slice(i, i + size));
		}
		return chunks;
	},
};

// Object utilities
export const obj = {
	pick: <T extends Record<string, any>, K extends keyof T>(
		obj: T,
		keys: K[],
	): Pick<T, K> => {
		const result = {} as Pick<T, K>;
		keys.forEach((key) => {
			if (key in obj) {
				result[key] = obj[key];
			}
		});
		return result;
	},

	omit: <T extends Record<string, any>, K extends keyof T>(
		obj: T,
		keys: K[],
	): Omit<T, K> => {
		const result = { ...obj };
		keys.forEach((key) => delete result[key]);
		return result;
	},
};

// Export everything
export default {
	randomUUIDv7,
	inspect,
	stringWidth,
	sleep,
	zstd,
	file,
	process: processUtils,
	console: consoleUtils,
	network,
	time,
	math,
	array,
	obj,
};
