#!/usr/bin/env bun
/**
 * Tier-1380 OMEGA Width Data API
 * Production-ready width data loading with error handling
 */

export interface WidthViolation {
	file: string;
	line: number;
	content: string;
	width: number;
	severity: "warning" | "critical";
}

export interface WidthData {
	files: Array<{
		path: string;
		violations: WidthViolation[];
	}>;
	stats: {
		totalFiles: number;
		totalLines: number;
		violationCount: number;
		complianceRate: number;
	};
	meta: {
		generatedAt: string;
		tier: number;
	};
}

export interface LoadOptions {
	headers?: Record<string, string>;
	retryCount?: number;
	retryDelay?: number;
	timeout?: number;
}

const DEFAULT_OPTIONS: Required<LoadOptions> = {
	headers: {},
	retryCount: 3,
	retryDelay: 1000,
	timeout: 5000,
};

/**
 * Load width data from API with retry logic
 */
export async function loadWidthData(options: LoadOptions = {}): Promise<WidthData> {
	const opts = { ...DEFAULT_OPTIONS, ...options };
	let lastError: Error | undefined;

	for (let attempt = 0; attempt < opts.retryCount; attempt++) {
		try {
			return await fetchWidthData(opts);
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));

			if (attempt < opts.retryCount - 1) {
				await Bun.sleep(opts.retryDelay * (attempt + 1));
			}
		}
	}

	throw new Error(
		`Failed to load width data after ${opts.retryCount} attempts: ${lastError?.message}`,
	);
}

async function fetchWidthData(opts: Required<LoadOptions>): Promise<WidthData> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), opts.timeout);

	try {
		const res = await fetch("/api/width-data", {
			headers: {
				Accept: "application/json",
				"X-Requested-With": "Tier1380-Client",
				...opts.headers,
			},
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		if (!res.ok) {
			throw new Error(`HTTP ${res.status}: ${res.statusText}`);
		}

		const data = await res.json();
		return validateWidthData(data);
	} catch (error) {
		clearTimeout(timeoutId);

		if (error instanceof Error && error.name === "AbortError") {
			throw new Error("Request timeout");
		}

		throw error;
	}
}

function validateWidthData(data: unknown): WidthData {
	if (!data || typeof data !== "object") {
		throw new Error("Invalid response: not an object");
	}

	const d = data as Partial<WidthData>;

	if (!Array.isArray(d.files)) {
		throw new Error("Invalid response: files is not an array");
	}

	if (!d.stats || typeof d.stats !== "object") {
		throw new Error("Invalid response: stats missing");
	}

	return data as WidthData;
}

/**
 * Check if a line exceeds Col-89
 */
export function checkCol89(content: string): { valid: boolean; width: number } {
	const width = Bun.stringWidth(content, { countAnsiEscapeCodes: false });
	return { valid: width <= 89, width };
}

/**
 * Batch check multiple files
 */
export async function batchCheck(
	files: string[],
	checker: (file: string) => Promise<WidthViolation[]>,
): Promise<Map<string, WidthViolation[]>> {
	const results = new Map<string, WidthViolation[]>();

	// Process in batches of 5
	const batchSize = 5;
	for (let i = 0; i < files.length; i += batchSize) {
		const batch = files.slice(i, i + batchSize);
		const batchResults = await Promise.all(
			batch.map(async (file) => ({
				file,
				violations: await checker(file),
			})),
		);

		for (const { file, violations } of batchResults) {
			results.set(file, violations);
		}
	}

	return results;
}

// Main for CLI usage
if (import.meta.main) {
	loadWidthData()
		.then((data) => {
			console.log("Width Data Loaded:");
			console.log(`  Files: ${data.stats.totalFiles}`);
			console.log(`  Violations: ${data.stats.violationCount}`);
			console.log(`  Compliance: ${data.stats.complianceRate.toFixed(1)}%`);
		})
		.catch((error) => {
			console.error("Error:", error.message);
			process.exit(1);
		});
}
