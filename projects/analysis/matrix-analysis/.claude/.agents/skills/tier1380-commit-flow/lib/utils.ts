#!/usr/bin/env bun
/**
 * Tier-1380 OMEGA Commit Flow Utilities
 * Bun-native optimized helper functions
 */

// Col-89 enforcement using Bun.stringWidth
export function assertCol89(text: string, context = "unknown"): boolean {
	const width = Bun.stringWidth(text, { countAnsiEscapeCodes: false });
	if (width > 89) {
		console.warn(`[COL-89 VIOLATION] ${context}: width=${width}`);
		return false;
	}
	return true;
}

// Wrap text to Col-89
export function wrapCol89(text: string): string {
	return Bun.wrapAnsi(text, 89, { wordWrap: true, trim: true });
}

// Calculate hash for content verification
export function calculateHash(data: string | Uint8Array): string {
	const buffer = typeof data === "string" ? Buffer.from(data) : data;
	return Bun.hash.wyhash(buffer).toString(16);
}

// Timing helper using Bun.nanoseconds
export class Timer {
	private start: bigint;

	constructor() {
		this.start = Bun.nanoseconds();
	}

	elapsed(): number {
		return Number(Bun.nanoseconds() - this.start) / 1e6; // milliseconds
	}

	reset(): void {
		this.start = Bun.nanoseconds();
	}
}

// Table output using Bun.inspect.table
export function printTable(data: Record<string, unknown>[], columns?: string[]): void {
	console.log(Bun.inspect.table(data, columns, { colors: true }));
}

// Color output using Bun.color
export function colorize(
	text: string,
	color: "green" | "red" | "yellow" | "blue",
): string {
	const colors = {
		green: Bun.color("green", "ansi"),
		red: Bun.color("red", "ansi"),
		yellow: Bun.color("yellow", "ansi"),
		blue: Bun.color("blue", "ansi"),
	};
	const reset = "\x1b[0m";
	return `${colors[color]}${text}${reset}`;
}

// Semver check using Bun.semver
export function checkBunVersion(minVersion: string): boolean {
	return Bun.semver.satisfies(Bun.version, minVersion);
}

// Progress bar for terminal
export function renderProgress(current: number, total: number, width = 40): string {
	const filled = Math.round((current / total) * width);
	const bar = "█".repeat(filled) + "░".repeat(width - filled);
	const pct = Math.round((current / total) * 100);
	return `[${bar}] ${pct}%`;
}

// Box drawing for terminal UI
export function renderBox(title: string, content: string[], width = 60): string {
	const lines: string[] = [];
	const top = `╔${"═".repeat(width - 2)}╗`;
	const bottom = `╚${"═".repeat(width - 2)}╝`;

	lines.push(top);
	lines.push(`║${title.padStart((width + title.length) / 2).padEnd(width - 2)}║`);
	lines.push(`╠${"═".repeat(width - 2)}╣`);

	for (const line of content) {
		lines.push(`║${line.slice(0, width - 2).padEnd(width - 2)}║`);
	}

	lines.push(bottom);
	return lines.join("\n");
}

// Git helper functions
export async function getGitInfo(): Promise<{
	branch: string;
	remote: string;
	lastCommit: string;
}> {
	const { $ } = await import("bun");

	const branch = await $`git branch --show-current`.text().catch(() => "unknown");
	const remote = await $`git remote get-url origin`.text().catch(() => "unknown");
	const lastCommit = await $`git log -1 --pretty=%h`.text().catch(() => "unknown");

	return {
		branch: branch.trim(),
		remote: remote.trim(),
		lastCommit: lastCommit.trim(),
	};
}

// Parallel file processing
export async function processFiles<T>(
	files: string[],
	processor: (file: string) => Promise<T>,
	concurrency = 4,
): Promise<T[]> {
	const results: T[] = [];
	const queue = [...files];

	async function worker(): Promise<void> {
		while (queue.length > 0) {
			const file = queue.shift();
			if (file) {
				const result = await processor(file);
				results.push(result);
			}
		}
	}

	await Promise.all(Array.from({ length: Math.min(concurrency, files.length) }, worker));
	return results;
}

// All utilities already exported above
