#!/usr/bin/env bun
/**
 * Tier-1380 OMEGA API Client
 * Width data and governance API integration
 */

interface WidthData {
	files: Array<{
		path: string;
		lines: Array<{
			number: number;
			content: string;
			width: number;
			violations: string[];
		}>;
	}>;
	stats: {
		totalFiles: number;
		totalLines: number;
		violations: number;
		complianceRate: number;
	};
}

interface ApiConfig {
	baseUrl: string;
	headers?: Record<string, string>;
	timeout?: number;
}

const DEFAULT_CONFIG: ApiConfig = {
	baseUrl: "http://localhost:3335",
	timeout: 5000,
};

async function loadWidthData(config: Partial<ApiConfig> = {}): Promise<WidthData> {
	const mergedConfig = { ...DEFAULT_CONFIG, ...config };

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), mergedConfig.timeout);

	try {
		const res = await fetch(`${mergedConfig.baseUrl}/api/width-data`, {
			headers: mergedConfig.headers || {},
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		if (!res.ok) {
			throw new Error(`HTTP ${res.status}: ${res.statusText}`);
		}

		const data = await res.json();
		return data as WidthData;
	} catch (error) {
		clearTimeout(timeoutId);

		if (error instanceof Error && error.name === "AbortError") {
			throw new Error("Request timeout - API not responding");
		}

		throw error;
	}
}

async function submitWidthViolation(violation: {
	file: string;
	line: number;
	content: string;
	width: number;
}): Promise<{ success: boolean }> {
	const res = await fetch(`${DEFAULT_CONFIG.baseUrl}/api/violations`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(violation),
	});

	if (!res.ok) {
		throw new Error(`Failed to submit: ${res.statusText}`);
	}

	return { success: true };
}

async function streamViolations(callback: (violation: unknown) => void): Promise<void> {
	const res = await fetch(`${DEFAULT_CONFIG.baseUrl}/mcp/alerts/stream`);

	if (!res.body) {
		throw new Error("No response body");
	}

	const reader = res.body.getReader();
	const decoder = new TextDecoder();

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;

		const chunk = decoder.decode(value);
		const lines = chunk.split("\n");

		for (const line of lines) {
			if (line.startsWith("data: ")) {
				try {
					const data = JSON.parse(line.slice(6));
					callback(data);
				} catch {
					// Ignore parse errors
				}
			}
		}
	}
}

export {
	loadWidthData,
	submitWidthViolation,
	streamViolations,
	DEFAULT_CONFIG,
	type WidthData,
	type ApiConfig,
};
