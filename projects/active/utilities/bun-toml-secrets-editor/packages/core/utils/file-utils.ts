/**
 * File utilities for log management
 */

export async function tailFile(
	filePath: string,
	lines: number = 10,
): Promise<string[]> {
	if (typeof Bun === "undefined") {
		throw new Error("Bun runtime is required");
	}

	try {
		const content = await (Bun as any).file(filePath).text();
		const allLines = content.split("\n").filter((line: string) => line.trim());
		return allLines.slice(-lines);
	} catch (error) {
		throw new Error(
			`Failed to read file ${filePath}: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

export async function readFileContent(filePath: string): Promise<string> {
	if (typeof Bun === "undefined") {
		throw new Error("Bun runtime is required");
	}

	try {
		return await (Bun as any).file(filePath).text();
	} catch (error) {
		throw new Error(
			`Failed to read file ${filePath}: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

export async function fileExists(filePath: string): Promise<boolean> {
	if (typeof Bun === "undefined") {
		throw new Error("Bun runtime is required");
	}

	try {
		await (Bun as any).file(filePath).text();
		return true;
	} catch {
		return false;
	}
}

export function watchFile(
	filePath: string,
	callback: (content: string) => void,
): () => void {
	if (typeof Bun === "undefined") {
		throw new Error("Bun runtime is required");
	}

	// Simple file watcher implementation
	let lastModified = 0;

	const interval = setInterval(async () => {
		try {
			const stats = await (Bun as any).file(filePath).stat();
			if (stats.mtime.getTime() > lastModified) {
				lastModified = stats.mtime.getTime();
				const content = await (Bun as any).file(filePath).text();
				callback(content);
			}
		} catch {
			// File might not exist yet
		}
	}, 1000);

	return () => clearInterval(interval);
}
