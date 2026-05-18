/**
 * Table formatting example using Unicode-aware column alignment
 * Run: bun run examples/table-formatting-example.ts
 */

import { printTable, printTableBox } from "../../src/utils/string-formatting";

async function tableFormattingExample() {
	console.info("📊 Table Formatting Examples with Unicode-Aware Alignment\n");
	console.info(`${"=".repeat(60)}\n`);

	// Example 1: Basic table with emojis
	console.info("1. Basic Table with Emojis:");
	printTable(
		["Name", "Status", "Value"],
		[
			["File", "✅", "100"],
			["Config", "🇺🇸", "200"],
			["Data", "⚠️", "300"],
			["Cache", "🔴", "400"],
		],
	);
	console.info();

	// Example 2: Table with ANSI colors
	console.info("2. Table with ANSI Colors:");
	printTable(
		["Service", "Status", "Response Time"],
		[
			["API", "\x1b[32m✓ Success\x1b[0m", "2ms"],
			["Database", "\x1b[33m⚠ Warning\x1b[0m", "15ms"],
			["Cache", "\x1b[31m✗ Error\x1b[0m", "N/A"],
			["CDN", "\x1b[36m→ Active\x1b[0m", "1ms"],
		],
	);
	console.info();

	// Example 3: Table with mixed content
	console.info("3. Table with Mixed Content (Emojis + Colors):");
	printTable(
		["Icon", "Name", "Status", "Value"],
		[
			["✅", "Success", "\x1b[32mActive\x1b[0m", "100%"],
			["🇺🇸", "US Data", "\x1b[36mProcessing\x1b[0m", "75%"],
			["👨‍💻", "Developer", "\x1b[33mPending\x1b[0m", "50%"],
			["⚠️", "Warning", "\x1b[31mFailed\x1b[0m", "0%"],
		],
	);
	console.info();

	// Example 4: Box-drawing table
	console.info("4. Box-Drawing Table:");
	printTableBox(
		["Name", "Status", "Value"],
		[
			["File", "✅", "100"],
			["Config", "🇺🇸", "200"],
			["Data", "⚠️", "300"],
		],
	);
	console.info();

	// Example 5: Box-drawing table with colors
	console.info("5. Box-Drawing Table with Colors:");
	printTableBox(
		["Service", "Status", "Time"],
		[
			["API", "\x1b[32m✓ OK\x1b[0m", "2ms"],
			["DB", "\x1b[33m⚠ Slow\x1b[0m", "15ms"],
			["Cache", "\x1b[31m✗ Down\x1b[0m", "N/A"],
		],
	);
	console.info();

	// Example 6: International text table
	console.info("6. International Text Table:");
	printTable(
		["Language", "Text", "Width"],
		[
			["English", "Hello", "5"],
			["Japanese", "プログラマー", "12"],
			["Arabic", "مُبَرْمَج", "9"],
			["Thai", "โปรแกรมเมอร์", "11"],
			["Hindi", "प्रोग्रामर", "6"],
		],
	);
	console.info();

	// Example 7: Currency table
	console.info("7. Currency Table:");
	printTableBox(
		["Symbol", "Amount", "Currency"],
		[
			["💲", "1,234,567", "USD"],
			["€", "987,654", "EUR"],
			["¥", "123,456,789", "JPY"],
			["₹", "98,765,432", "INR"],
		],
	);
	console.info();

	// Example 8: Get table as string array (without printing)
	console.info("8. Table as String Array (for custom formatting):");
	const tableLines = printTable(
		["Name", "Value"],
		[
			["Item 1", "100"],
			["Item 2", "200"],
		],
		{ print: false },
	);

	console.info("Table lines:", tableLines.length);
	tableLines.forEach((line, i) => {
		console.info(`  ${i + 1}. ${line}`);
	});
	console.info();

	console.info("✅ All table formatting examples completed!");
	console.info("\n💡 Key Features:");
	console.info("   • Unicode-aware column width calculation");
	console.info("   • Works with emojis, flags, and colors");
	console.info("   • Supports international text");
	console.info("   • Box-drawing borders option");
	console.info("   • Can return lines as array for custom formatting");
}

// Run if executed directly
if (import.meta.main) {
	tableFormattingExample().catch(console.error);
}

export { tableFormattingExample };
