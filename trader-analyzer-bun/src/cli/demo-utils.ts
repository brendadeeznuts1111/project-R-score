#!/usr/bin/env bun
/**
 * @fileoverview Demo of Bun-Native Utilities
 * @description Run with: bun run src/cli/demo-utils.ts
 */

import {
	box,
	buffer,
	colors,
	createSpinner,
	crypto,
	debug,
	file,
	formatBytes,
	formatCurrency,
	formatDuration,
	formatNumber,
	formatPercent,
	inspect,
	log,
	printTable,
	progressBar,
	runtime,
	table,
	timing,
} from "../utils";

async function main() {
	console.log("\n" + colors.cyan("═══════════════════════════════════════"));
	console.log(colors.cyan("  Bun-Native Utilities Demo"));
	console.log(colors.cyan("═══════════════════════════════════════") + "\n");

	// 1. Runtime Info
	console.log(colors.yellow("1. Runtime Information"));
	console.log(colors.gray("─".repeat(40)));
	log("Runtime", {
		version: runtime.version,
		revision: runtime.revision,
		main: runtime.main,
		isDev: runtime.isDev,
		memory: runtime.memoryFormatted(),
	});
	console.log();

	// 2. Bun.inspect demo
	console.log(colors.yellow("2. Bun.inspect Demo"));
	console.log(colors.gray("─".repeat(40)));
	const complexObject = {
		name: "NEXUS",
		features: ["ORCA", "Deribit", "Polymarket"],
		stats: { teams: 985, sports: 150, markets: 1000 },
		nested: { deep: { value: 42 } },
	};
	console.log(inspect(complexObject, { colors: true, depth: 4 }));
	console.log();

	// 3. Table formatting
	console.log(colors.yellow("3. Table Formatting"));
	console.log(colors.gray("─".repeat(40)));
	const trades = [
		{ symbol: "BTC-PERP", side: "buy", price: 92500, size: 0.5, pnl: 125.5 },
		{ symbol: "ETH-PERP", side: "sell", price: 3450, size: 2.0, pnl: -45.2 },
		{ symbol: "SOL-PERP", side: "buy", price: 185, size: 10, pnl: 89.0 },
	];
	printTable(trades, [
		{ key: "symbol", header: "Symbol", width: 12 },
		{
			key: "side",
			header: "Side",
			width: 6,
			format: (v) =>
				v === "buy" ? colors.green(String(v)) : colors.red(String(v)),
		},
		{
			key: "price",
			header: "Price",
			width: 10,
			align: "right",
			format: (v) => formatCurrency(Number(v)),
		},
		{ key: "size", header: "Size", width: 8, align: "right" },
		{
			key: "pnl",
			header: "P&L",
			width: 10,
			align: "right",
			format: (v) =>
				Number(v) >= 0
					? colors.green(formatCurrency(Number(v)))
					: colors.red(formatCurrency(Number(v))),
		},
	]);
	console.log();

	// 4. Formatters
	console.log(colors.yellow("4. Formatters"));
	console.log(colors.gray("─".repeat(40)));
	console.log(`  Bytes:    ${formatBytes(1234567890)}`);
	console.log(`  Duration: ${formatDuration(123.456)}`);
	console.log(`  Number:   ${formatNumber(1234567)}`);
	console.log(`  Percent:  ${formatPercent(0.8567)}`);
	console.log(`  Currency: ${formatCurrency(12345.67)}`);
	console.log();

	// 5. Crypto utilities
	console.log(colors.yellow("5. Crypto Utilities (Bun.CryptoHasher)"));
	console.log(colors.gray("─".repeat(40)));
	const testString = "NEXUS Trading Platform";
	console.log(`  Input:    "${testString}"`);
	console.log(`  SHA-256:  ${crypto.sha256(testString)}`);
	console.log(`  SHA-1:    ${crypto.sha1(testString)}`);
	console.log(`  MD5:      ${crypto.md5(testString)}`);
	console.log(`  Random:   ${crypto.randomHex(8)}`);
	console.log(`  UUID:     ${crypto.uuid()}`);
	console.log();

	// 6. Timing utilities (Bun.nanoseconds)
	console.log(colors.yellow("6. Timing Utilities (Bun.nanoseconds)"));
	console.log(colors.gray("─".repeat(40)));
	const sw = timing.stopwatch();
	await Bun.sleep(50);
	console.log(`  Stopwatch: ${sw.elapsedFormatted()}`);

	const { result, duration } = await timing.measure(async () => {
		await Bun.sleep(25);
		return "measured!";
	});
	console.log(`  Measured:  ${result} in ${formatDuration(duration)}`);
	console.log();

	// 7. Progress bar
	console.log(colors.yellow("7. Progress Bar"));
	console.log(colors.gray("─".repeat(40)));
	for (let i = 0; i <= 10; i++) {
		process.stdout.write(`\r  ${progressBar(i, 10, 25)} ${i * 10}%`);
		await Bun.sleep(100);
	}
	console.log("\n");

	// 8. Box drawing
	console.log(colors.yellow("8. Box Drawing"));
	console.log(colors.gray("─".repeat(40)));
	console.log(
		box(
			[
				`${colors.green("Status")}  Online`,
				`${colors.green("Uptime")}  ${formatDuration(process.uptime() * 1000)}`,
				`${colors.green("Memory")}  ${runtime.memoryFormatted().heapUsed}`,
			].join("\n"),
			"Server Status",
		),
	);
	console.log();

	// 9. Spinner demo
	console.log(colors.yellow("9. Spinner (async operation)"));
	console.log(colors.gray("─".repeat(40)));
	const spinner = createSpinner("Loading data");
	spinner.start();
	await Bun.sleep(1500);
	spinner.stop("Data loaded successfully");
	console.log();

	// Summary
	console.log(colors.cyan("═══════════════════════════════════════"));
	console.log(colors.cyan("  Bun Native APIs Used:"));
	console.log(colors.cyan("═══════════════════════════════════════"));
	console.log(`
  ${colors.green("•")} Bun.inspect()        - Pretty printing objects
  ${colors.green("•")} Bun.nanoseconds()    - High-precision timing
  ${colors.green("•")} Bun.CryptoHasher     - Fast hashing (SHA, MD5)
  ${colors.green("•")} Bun.file()           - File I/O
  ${colors.green("•")} Bun.write()          - File writing
  ${colors.green("•")} Bun.sleep()          - Async sleep
  ${colors.green("•")} Bun.serve()          - HTTP/WebSocket server
  ${colors.green("•")} Bun.version          - Runtime info
`);
}

main().catch(console.error);
