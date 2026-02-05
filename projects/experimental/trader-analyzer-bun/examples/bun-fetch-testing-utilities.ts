#!/usr/bin/env bun
/**
 * @fileoverview Bun Fetch API Testing Utilities
 * @description Testing utilities for verifying fetch API functionality including proxy testing, header validation, and performance benchmarking.
 * @module examples/bun-fetch-testing-utilities
 *
 * Version: 6.4.1.0.0.0.0
 * Ripgrep Pattern: 6\.4\.1\.0\.0\.0\.0|EXAMPLE-BUN-FETCH-TEST-001
 *
 * Usage:
 *   bun run examples/bun-fetch-testing-utilities.ts test:proxy --url="https://api.example.com" --proxy="http://proxy.local:8080"
 *   bun run examples/bun-fetch-testing-utilities.ts test:headers --url="https://api.example.com" --header="X-Custom: value"
 *   bun run examples/bun-fetch-testing-utilities.ts bench:headers --iterations=1000
 */

import { performance } from "perf_hooks";

// ==================== Test Proxy Configuration ====================

/**
 * Test simple proxy configuration
 */
export async function testProxy(
	url: string,
	proxyUrl: string,
): Promise<{ success: boolean; status?: number; error?: string }> {
	console.log(`\n🔍 Testing proxy: ${proxyUrl}`);
	console.log(`   Target URL: ${url}\n`);

	try {
		const startTime = performance.now();
		const response = await fetch(url, {
			proxy: proxyUrl,
		});
		const duration = performance.now() - startTime;

		const data = await response.text();

		console.log(`✅ Proxy test successful`);
		console.log(`   Status: ${response.status}`);
		console.log(`   Duration: ${duration.toFixed(2)}ms`);
		console.log(`   Response size: ${data.length} bytes`);

		return { success: true, status: response.status };
	} catch (error) {
		console.error(`❌ Proxy test failed:`, error);
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

/**
 * Test authenticated proxy
 */
export async function testProxyAuth(
	url: string,
	proxyUrl: string,
	user: string,
	pass: string,
): Promise<{ success: boolean; status?: number; error?: string }> {
	console.log(`\n🔍 Testing authenticated proxy: ${proxyUrl}`);
	console.log(`   Target URL: ${url}`);
	console.log(`   User: ${user}\n`);

	try {
		const startTime = performance.now();
		const response = await fetch(url, {
			proxy: {
				url: proxyUrl,
				headers: {
					"Proxy-Authorization": `Basic ${btoa(`${user}:${pass}`)}`,
				},
			},
		});
		const duration = performance.now() - startTime;

		const data = await response.text();

		console.log(`✅ Authenticated proxy test successful`);
		console.log(`   Status: ${response.status}`);
		console.log(`   Duration: ${duration.toFixed(2)}ms`);
		console.log(`   Response size: ${data.length} bytes`);

		return { success: true, status: response.status };
	} catch (error) {
		console.error(`❌ Authenticated proxy test failed:`, error);
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

// ==================== Test Custom Headers ====================

/**
 * Test custom headers
 */
export async function testHeaders(
	url: string,
	headers: Record<string, string>,
): Promise<{ success: boolean; receivedHeaders?: Record<string, string>; error?: string }> {
	console.log(`\n🔍 Testing custom headers`);
	console.log(`   URL: ${url}`);
	console.log(`   Headers:`, headers);
	console.log();

	try {
		const startTime = performance.now();
		const response = await fetch(url, {
			headers,
		});
		const duration = performance.now() - startTime;

		const data = await response.json();

		console.log(`✅ Header test successful`);
		console.log(`   Status: ${response.status}`);
		console.log(`   Duration: ${duration.toFixed(2)}ms`);
		console.log(`   Received headers:`, JSON.stringify(data.headers || {}, null, 2));

		return {
			success: true,
			receivedHeaders: data.headers || {},
		};
	} catch (error) {
		console.error(`❌ Header test failed:`, error);
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

// ==================== Benchmark Headers ====================

/**
 * Benchmark header performance
 */
export async function benchmarkHeaders(
	url: string,
	iterations: number = 100,
): Promise<{ avgDuration: number; minDuration: number; maxDuration: number }> {
	console.log(`\n⚡ Benchmarking headers (${iterations} iterations)`);
	console.log(`   URL: ${url}\n`);

	const durations: number[] = [];

	for (let i = 0; i < iterations; i++) {
		const startTime = performance.now();
		try {
			await fetch(url, {
				headers: {
					"X-Test-Header": `test-${i}`,
					"X-Request-ID": crypto.randomUUID(),
				},
			});
			durations.push(performance.now() - startTime);
		} catch (error) {
			console.error(`Iteration ${i} failed:`, error);
		}

		if ((i + 1) % 10 === 0) {
			process.stdout.write(`   Progress: ${i + 1}/${iterations}\r`);
		}
	}

	const avgDuration =
		durations.reduce((a, b) => a + b, 0) / durations.length;
	const minDuration = Math.min(...durations);
	const maxDuration = Math.max(...durations);

	console.log(`\n✅ Benchmark completed`);
	console.log(`   Average duration: ${avgDuration.toFixed(2)}ms`);
	console.log(`   Min duration: ${minDuration.toFixed(2)}ms`);
	console.log(`   Max duration: ${maxDuration.toFixed(2)}ms`);

	return { avgDuration, minDuration, maxDuration };
}

// ==================== Main Execution ====================

async function main() {
	const args = process.argv.slice(2);
	const command = args[0];

	if (!command) {
		console.log(`
Usage: bun run examples/bun-fetch-testing-utilities.ts <command> [options]

Commands:
  test:proxy <url> <proxy>           Test simple proxy
  test:proxy-auth <url> <proxy> <user> <pass>  Test authenticated proxy
  test:headers <url> [--header="key:value"]   Test custom headers
  bench:headers <url> [--iterations=N]          Benchmark header performance

Examples:
  # Test simple proxy
  bun run examples/bun-fetch-testing-utilities.ts test:proxy \\
    https://api.example.com http://proxy.local:8080

  # Test authenticated proxy
  bun run examples/bun-fetch-testing-utilities.ts test:proxy-auth \\
    https://api.example.com http://proxy.local:8080 user pass

  # Test custom headers
  bun run examples/bun-fetch-testing-utilities.ts test:headers \\
    https://httpbin.org/headers --header="X-Custom: value"

  # Test multiple headers
  bun run examples/bun-fetch-testing-utilities.ts test:headers \\
    https://httpbin.org/headers \\
    --header="X-Custom: value" \\
    --header="Authorization: Bearer token123"

  # Benchmark header performance
  bun run examples/bun-fetch-testing-utilities.ts bench:headers \\
    https://httpbin.org/headers --iterations=1000
`);
		process.exit(1);
	}

	switch (command) {
		case "test:proxy": {
			const url = args[1];
			const proxy = args[2];

			if (!url || !proxy) {
				console.error("Error: URL and proxy URL required");
				process.exit(1);
			}

			await testProxy(url, proxy);
			break;
		}

		case "test:proxy-auth": {
			const url = args[1];
			const proxy = args[2];
			const user = args[3];
			const pass = args[4];

			if (!url || !proxy || !user || !pass) {
				console.error("Error: URL, proxy URL, user, and password required");
				process.exit(1);
			}

			await testProxyAuth(url, proxy, user, pass);
			break;
		}

		case "test:headers": {
			const url = args[1];
			const headers: Record<string, string> = {};

			// Parse --header arguments
			for (let i = 2; i < args.length; i++) {
				if (args[i].startsWith("--header=")) {
					const header = args[i].slice(9);
					const [key, ...valueParts] = header.split(":");
					headers[key.trim()] = valueParts.join(":").trim();
				}
			}

			if (!url) {
				console.error("Error: URL required");
				process.exit(1);
			}

			await testHeaders(url, headers);
			break;
		}

		case "bench:headers": {
			const url = args[1];
			let iterations = 100;

			// Parse --iterations argument
			for (let i = 2; i < args.length; i++) {
				if (args[i].startsWith("--iterations=")) {
					iterations = parseInt(args[i].slice(13), 10);
				}
			}

			if (!url) {
				console.error("Error: URL required");
				process.exit(1);
			}

			await benchmarkHeaders(url, iterations);
			break;
		}

		default:
			console.error(`Unknown command: ${command}`);
			process.exit(1);
	}
}

if (import.meta.main) {
	main().catch(console.error);
}
