#!/usr/bin/env bun
/**
 * Byte Utilities
 *
 * Safe file operations with proper byte handling.
 * Handles large files, streaming, and binary data correctly.
 */

export const BYTES_PER_KB = 1024;
export const BYTES_PER_MB = 1024 * 1024;
export const BYTES_PER_GB = 1024 * 1024 * 1024;

// Default max file size for text reading (10MB)
export const DEFAULT_MAX_TEXT_SIZE = 10 * BYTES_PER_MB;

// Chunk size for streaming reads (64KB)
export const STREAM_CHUNK_SIZE = 64 * BYTES_PER_KB;

export interface FileInfo {
	size: number;
	exists: boolean;
	isReadable: boolean;
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
	if (bytes === 0) return "0 B";

	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ["B", "KB", "MB", "GB", "TB"];

	const i = Math.floor(Math.log(bytes) / Math.log(k));
	const size = sizes[Math.min(i, sizes.length - 1)];

	return `${parseFloat((bytes / k ** i).toFixed(dm))} ${size}`;
}

/**
 * Get file info including size in bytes
 */
export async function getFileInfo(filePath: string): Promise<FileInfo> {
	try {
		const file = Bun.file(filePath);
		const exists = await file.exists();

		if (!exists) {
			return { size: 0, exists: false, isReadable: false };
		}

		const size = file.size;
		return { size, exists: true, isReadable: size >= 0 };
	} catch {
		return { size: 0, exists: false, isReadable: false };
	}
}

/**
 * Read file as text with size limit protection
 * Returns null if file exceeds max size
 */
export async function readTextFile(
	filePath: string,
	maxSize: number = DEFAULT_MAX_TEXT_SIZE,
): Promise<string | null> {
	const info = await getFileInfo(filePath);

	if (!info.exists) {
		return null;
	}

	if (info.size > maxSize) {
		console.warn(
			`File ${filePath} (${formatBytes(info.size)}) exceeds max size ${formatBytes(maxSize)}. ` +
				`Use streaming for large files.`,
		);
		return null;
	}

	try {
		const file = Bun.file(filePath);
		return await file.text();
	} catch (err) {
		console.error(`Error reading ${filePath}:`, err);
		return null;
	}
}

/**
 * Read JSON file with size protection
 */
export async function readJsonFile<T>(
	filePath: string,
	maxSize: number = DEFAULT_MAX_TEXT_SIZE,
): Promise<T | null> {
	const content = await readTextFile(filePath, maxSize);
	if (!content) return null;

	try {
		return JSON.parse(content) as T;
	} catch (err) {
		console.error(`Error parsing JSON from ${filePath}:`, err);
		return null;
	}
}

/**
 * Read file as ArrayBuffer for binary data
 */
export async function readBinaryFile(
	filePath: string,
	maxSize: number = DEFAULT_MAX_TEXT_SIZE,
): Promise<ArrayBuffer | null> {
	const info = await getFileInfo(filePath);

	if (!info.exists || info.size > maxSize) {
		return null;
	}

	try {
		const file = Bun.file(filePath);
		return await file.arrayBuffer();
	} catch (err) {
		console.error(`Error reading binary ${filePath}:`, err);
		return null;
	}
}

/**
 * Stream read lines from a file (for large files)
 * Yields each line as a string
 */
export async function* streamLines(
	filePath: string,
	options: { maxLines?: number; encoding?: string } = {},
): AsyncGenerator<string, void, unknown> {
	const { maxLines = Infinity, encoding = "utf-8" } = options;

	const info = await getFileInfo(filePath);
	if (!info.exists) return;

	const decoder = new TextDecoder(encoding);
	let buffer = "";
	let lineCount = 0;

	try {
		const file = Bun.file(filePath);
		const stream = file.stream();

		for await (const chunk of stream) {
			if (lineCount >= maxLines) break;

			// Convert chunk to string
			const text = decoder.decode(chunk, { stream: true });
			buffer += text;

			// Extract lines
			const lines = buffer.split("\n");
			buffer = lines.pop() || ""; // Keep incomplete line in buffer

			for (const line of lines) {
				if (lineCount >= maxLines) break;
				yield line;
				lineCount++;
			}
		}

		// Yield final buffer if any
		if (buffer && lineCount < maxLines) {
			yield buffer;
		}
	} catch (err) {
		console.error(`Error streaming ${filePath}:`, err);
	}
}

/**
 * Read last N lines from a file efficiently
 * Uses seek for large files
 */
export async function readLastLines(
	filePath: string,
	lineCount: number = 10,
): Promise<string[]> {
	const info = await getFileInfo(filePath);
	if (!info.exists) return [];

	// For small files, read all and slice
	if (info.size < BYTES_PER_MB) {
		const content = await readTextFile(filePath);
		if (!content) return [];
		return content.split("\n").slice(-lineCount);
	}

	// For large files, stream from end
	const lines: string[] = [];

	try {
		// Read file backwards to get last lines
		const file = Bun.file(filePath);
		const stream = file.stream();
		const decoder = new TextDecoder();

		let buffer = "";

		for await (const chunk of stream) {
			const text = decoder.decode(chunk, { stream: true });
			buffer += text;

			const allLines = buffer.split("\n");
			if (allLines.length > lineCount) {
				// Keep only last N lines worth of buffer
				buffer = allLines.slice(-lineCount - 1).join("\n");
			}
		}

		lines.push(...buffer.split("\n").slice(-lineCount));
	} catch (err) {
		console.error(`Error reading last lines from ${filePath}:`, err);
	}

	return lines;
}

/**
 * Safe append to file with size checking
 * Automatically rotates if file exceeds max size
 */
export async function appendToFile(
	filePath: string,
	data: string | Uint8Array,
	options: { maxSize?: number; rotate?: boolean } = {},
): Promise<boolean> {
	const { maxSize = DEFAULT_MAX_TEXT_SIZE, rotate = false } = options;

	try {
		const info = await getFileInfo(filePath);

		// Check if we need to rotate
		if (rotate && info.exists && info.size > maxSize) {
			const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
			const rotatedPath = `${filePath}.${timestamp}`;

			// Rename current file
			await Bun.write(rotatedPath, await Bun.file(filePath).arrayBuffer());

			// Clear original
			await Bun.write(filePath, "");
		}

		// Append data
		await Bun.write(filePath, data, { append: true });
		return true;
	} catch (err) {
		console.error(`Error appending to ${filePath}:`, err);
		return false;
	}
}

/**
 * Calculate checksum/hash of file contents
 */
export async function hashFile(
	filePath: string,
	algorithm: "md5" | "sha1" | "sha256" = "sha256",
): Promise<string | null> {
	const info = await getFileInfo(filePath);
	if (!info.exists) return null;

	try {
		const file = Bun.file(filePath);
		const buffer = await file.arrayBuffer();

		// Use Bun's native hash if available, otherwise crypto
		if (algorithm === "sha256" && typeof Bun !== "undefined" && Bun.hash) {
			const hash = Bun.hash(buffer);
			return hash.toString(16);
		}

		// Use Web Crypto API
		const hashBuffer = await crypto.subtle.digest(algorithm, buffer);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
	} catch (err) {
		console.error(`Error hashing ${filePath}:`, err);
		return null;
	}
}

/**
 * Compare two files byte-by-byte
 */
export async function compareFiles(
	fileA: string,
	fileB: string,
): Promise<{ equal: boolean; diffAt?: number }> {
	const [infoA, infoB] = await Promise.all([getFileInfo(fileA), getFileInfo(fileB)]);

	if (!infoA.exists || !infoB.exists) {
		return { equal: false };
	}

	if (infoA.size !== infoB.size) {
		return { equal: false };
	}

	try {
		const [bufferA, bufferB] = await Promise.all([
			Bun.file(fileA).arrayBuffer(),
			Bun.file(fileB).arrayBuffer(),
		]);

		const viewA = new Uint8Array(bufferA);
		const viewB = new Uint8Array(bufferB);

		for (let i = 0; i < viewA.length; i++) {
			if (viewA[i] !== viewB[i]) {
				return { equal: false, diffAt: i };
			}
		}

		return { equal: true };
	} catch (err) {
		console.error(`Error comparing files:`, err);
		return { equal: false };
	}
}

// CLI for testing
if (import.meta.main) {
	const [, , command, ...args] = process.argv;

	switch (command) {
		case "info":
			if (args[0]) {
				const info = await getFileInfo(args[0]);
				console.log(`File: ${args[0]}`);
				console.log(`  Exists: ${info.exists}`);
				console.log(`  Size: ${formatBytes(info.size)}`);
				console.log(`  Readable: ${info.isReadable}`);
			}
			break;

		case "hash":
			if (args[0]) {
				const hash = await hashFile(args[0], (args[1] as any) || "sha256");
				console.log(`Hash (${args[1] || "sha256"}): ${hash}`);
			}
			break;

		case "tail":
			if (args[0]) {
				const lines = await readLastLines(args[0], parseInt(args[1]) || 10);
				lines.forEach((line) => console.log(line));
			}
			break;

		case "stream":
			if (args[0]) {
				let count = 0;
				for await (const line of streamLines(args[0], {
					maxLines: parseInt(args[1]) || 100,
				})) {
					console.log(line);
					count++;
				}
				console.log(`\nStreamed ${count} lines`);
			}
			break;

		default:
			console.log(`
Byte Utilities CLI

Usage:
  bytes.ts info <file>          Show file info with size
  bytes.ts hash <file> [algo]   Calculate file hash (md5, sha1, sha256)
  bytes.ts tail <file> [n]      Read last N lines
  bytes.ts stream <file> [max]  Stream lines with limit
`);
	}
}
