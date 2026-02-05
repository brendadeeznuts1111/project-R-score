#!/usr/bin/env bun
/**
 * Bun.wrapAnsi() Table Example
 *
 * Demonstrates using Bun.wrapAnsi() for responsive table formatting
 * with ANSI color preservation. 88x faster than wrap-ansi npm package.
 */

import {
	type TableColumn,
	TableFormatter,
} from "../../src/utils/table-formatter";

interface LogEntry {
	timestamp: string;
	level: string;
	message: string;
	source: string;
}

/**
 * Create a responsive table with wrapped content
 */
function createWrappedTable(): void {
	console.log("\n" + "=".repeat(70));
	console.log("Bun.wrapAnsi() Table Example - Responsive Content Wrapping");
	console.log("=".repeat(70));

	// Sample log data with long messages
	const logs: LogEntry[] = [
		{
			timestamp: "2024-01-15 10:30:45",
			level: "INFO",
			message:
				"\x1b[36mApplication startup completed successfully. All services are now online and ready to accept requests.\x1b[0m",
			source: "app.js:42",
		},
		{
			timestamp: "2024-01-15 10:31:12",
			level: "WARN",
			message:
				"\x1b[33mConnection pool reaching 80% capacity. Consider increasing max connections or optimizing queries.\x1b[0m",
			source: "db/pool.ts:156",
		},
		{
			timestamp: "2024-01-15 10:32:08",
			level: "ERROR",
			message:
				"\x1b[31mFailed to process payment transaction. Error: Timeout while waiting for payment gateway response after 30 seconds.\x1b[0m",
			source: "payments/gateway.ts:89",
		},
		{
			timestamp: "2024-01-15 10:33:22",
			level: "DEBUG",
			message:
				"\x1b[35mCache miss for key 'user:12345:profile'. Fetching from database...\x1b[0m",
			source: "cache/redis.ts:203",
		},
	];

	// Define columns with wrapping enabled for the message column
	const columns: TableColumn[] = [
		{ header: "Timestamp", key: "timestamp", width: 20, align: "left" },
		{
			header: "Level",
			key: "level",
			width: 10,
			align: "center",
			format: (value: string) => {
				const colors: Record<string, string> = {
					INFO: "\x1b[32m", // Green
					WARN: "\x1b[33m", // Yellow
					ERROR: "\x1b[31m", // Red
					DEBUG: "\x1b[35m", // Magenta
				};
				return `${colors[value] || ""}${value}\x1b[0m`;
			},
		},
		{
			header: "Message",
			key: "message",
			width: 40,
			align: "left",
			wrap: true, // Enable wrapping for long messages
		},
		{ header: "Source", key: "source", width: 15, align: "left" },
	];

	// Create formatter with text wrapping enabled
	const table = new TableFormatter(columns, {
		showBorders: true,
		headerStyle: "bold",
		wrapText: true, // Enable ANSI-aware text wrapping
	});

	console.log("\nLog Table with Wrapped Content:\n");
	table.print(logs);

	// Show performance note
	console.log("\n" + "─".repeat(70));
	console.log(
		"📊 Performance: Bun.wrapAnsi() is 88x faster than wrap-ansi npm package",
	);
	console.log("🎨 Colors are preserved across line breaks automatically");
	console.log("─".repeat(70));
}

/**
 * Demonstrate wrapping with different options
 */
function demonstrateWrappingOptions(): void {
	console.log("\n" + "=".repeat(70));
	console.log("Bun.wrapAnsi() Wrapping Options Demo");
	console.log("=".repeat(70));

	if (typeof Bun === "undefined" || !("wrapAnsi" in Bun)) {
		console.log("\n❌ Bun.wrapAnsi() not available (requires Bun v1.3.7+)");
		return;
	}

	const wrapAnsi = (Bun as any).wrapAnsi;

	// Long text with ANSI colors
	const coloredText =
		"\x1b[1m\x1b[36m[IMPORTANT]\x1b[0m \x1b[33mThis is a very long warning message that needs to be wrapped. " +
		"It contains \x1b[31mred\x1b[0m, \x1b[32mgreen\x1b[0m, and \x1b[34mblue\x1b[0m colors that should be preserved.";

	console.log("\nOriginal text (single line):");
	console.log(coloredText);

	console.log("\n\n1. Default wrapping (wordWrap: true, trim: true):");
	console.log(wrapAnsi(coloredText, 50));

	console.log("\n2. Hard wrapping (hard: true, breaks long words):");
	console.log(wrapAnsi(coloredText, 30, { hard: true }));

	console.log("\n3. No trim (preserves leading/trailing whitespace):");
	const spacedText = "   \x1b[32mIndented green text\x1b[0m   ";
	console.log("Without trim:");
	console.log(JSON.stringify(wrapAnsi(spacedText, 30, { trim: false })));
	console.log("With trim:");
	console.log(JSON.stringify(wrapAnsi(spacedText, 30, { trim: true })));

	console.log("\n4. OSC 8 hyperlinks:");
	const linkText =
		"Visit \x1b]8;;https://bun.sh\x1b\\Bun.sh\x1b]8;;\x1b\\ for fast JavaScript execution";
	console.log(wrapAnsi(linkText, 30));
}

/**
 * Compare performance with traditional methods
 */
async function benchmarkWrapAnsi(): Promise<void> {
	console.log("\n" + "=".repeat(70));
	console.log("Bun.wrapAnsi() Performance Benchmark");
	console.log("=".repeat(70));

	if (typeof Bun === "undefined" || !("wrapAnsi" in Bun)) {
		console.log("\n❌ Bun.wrapAnsi() not available (requires Bun v1.3.7+)");
		return;
	}

	const wrapAnsi = (Bun as any).wrapAnsi;

	// Test data
	const shortText = "\x1b[31mShort\x1b[0m text";
	const mediumText =
		"\x1b[32mThis is a medium length text\x1b[0m with some colors and needs wrapping at column width";
	const longText = "\x1b[33m" + "Long text with colors ".repeat(50) + "\x1b[0m";

	console.log("\nRunning benchmarks...\n");

	// Benchmark function
	const benchmark = (name: string, fn: () => void, iterations: number) => {
		const start = performance.now();
		for (let i = 0; i < iterations; i++) {
			fn();
		}
		const duration = performance.now() - start;
		console.log(
			`${name.padEnd(30)} ${iterations.toLocaleString().padStart(10)} iterations  ${duration.toFixed(2).padStart(8)} ms`,
		);
		return duration;
	};

	// Run benchmarks
	const iterations = 10000;

	console.log("Text Length | Iterations | Duration");
	console.log("─".repeat(50));

	benchmark("Short text (45 chars)", () => wrapAnsi(shortText, 20), iterations);
	benchmark(
		"Medium text (100 chars)",
		() => wrapAnsi(mediumText, 40),
		iterations,
	);
	benchmark(
		"Long text (1000+ chars)",
		() => wrapAnsi(longText, 50),
		iterations,
	);

	console.log(
		"\n✅ Bun.wrapAnsi() is 33-88x faster than wrap-ansi npm package",
	);
}

/**
 * Practical example: Status dashboard
 */
function statusDashboardExample(): void {
	console.log("\n" + "=".repeat(70));
	console.log("Practical Example: Status Dashboard with Wrapping");
	console.log("=".repeat(70));

	interface ServiceStatus {
		service: string;
		status: string;
		uptime: string;
		message: string;
	}

	const services: ServiceStatus[] = [
		{
			service: "API Gateway",
			status: "online",
			uptime: "99.99%",
			message:
				"\x1b[32mAll endpoints responding normally. Rate limiting active.\x1b[0m",
		},
		{
			service: "Database",
			status: "warning",
			uptime: "99.95%",
			message:
				"\x1b[33mConnection pool at 85% capacity. Monitor closely.\x1b[0m",
		},
		{
			service: "Cache Layer",
			status: "online",
			uptime: "99.99%",
			message:
				"\x1b[32mCache hit rate: 94%. Memory usage within normal parameters.\x1b[0m",
		},
		{
			service: "Message Queue",
			status: "error",
			uptime: "98.50%",
			message:
				"\x1b[31mHigh latency detected. Average queue time exceeded 5 seconds.\x1b[0m",
		},
	];

	const columns: TableColumn[] = [
		{ header: "Service", key: "service", width: 15, align: "left" },
		{
			header: "Status",
			key: "status",
			width: 10,
			align: "center",
			format: (value: string) => {
				const icons: Record<string, string> = {
					online: "\x1b[32m● Online\x1b[0m",
					warning: "\x1b[33m● Warning\x1b[0m",
					error: "\x1b[31m● Error\x1b[0m",
				};
				return icons[value] || value;
			},
		},
		{ header: "Uptime", key: "uptime", width: 10, align: "center" },
		{
			header: "Status Message",
			key: "message",
			width: 35,
			align: "left",
			wrap: true,
		},
	];

	const table = new TableFormatter(columns, {
		showBorders: true,
		headerStyle: "bold",
		wrapText: true,
	});

	console.log("\n🖥️  System Status Dashboard\n");
	table.print(services);

	// Legend
	console.log("\nLegend:");
	console.log(
		"  \x1b[32m●\x1b[0m Online  \x1b[33m●\x1b[0m Warning  \x1b[31m●\x1b[0m Error",
	);
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
	console.log("\n" + "🎨".repeat(35));
	console.log("     Bun.wrapAnsi() Table Formatting Examples");
	console.log("🎨".repeat(35));

	createWrappedTable();
	demonstrateWrappingOptions();
	await benchmarkWrapAnsi();
	statusDashboardExample();

	console.log("\n" + "=".repeat(70));
	console.log("✨ All examples complete!");
	console.log("=".repeat(70));
	console.log("\nKey Takeaways:");
	console.log("  • Bun.wrapAnsi() preserves ANSI codes across line breaks");
	console.log("  • 88x faster than the wrap-ansi npm package");
	console.log(
		"  • Supports word wrapping, hard wrapping, and OSC 8 hyperlinks",
	);
	console.log("  • Perfect for responsive CLI tables and dashboards");
}

if (import.meta.main) {
	main().catch(console.error);
}

export {
	createWrappedTable,
	demonstrateWrappingOptions,
	benchmarkWrapAnsi,
	statusDashboardExample,
};
