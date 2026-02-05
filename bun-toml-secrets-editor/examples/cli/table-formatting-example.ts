/**
 * Table formatting example using Unicode-aware column alignment
 * Run: bun run examples/table-formatting-example.ts
 */

import { printTable, printTableBox } from "../../src/utils/string-formatting";

async function tableFormattingExample() {
	console.log("📊 Table Formatting Examples with Unicode-Aware Alignment\n");
	console.log(`${"=".repeat(60)}\n`);

	// Example 1: Basic table with emojis
	console.log("1. Basic Table with Emojis:");
	printTable(
		["Name", "Status", "Value"],
		[
			["File", "✅", "100"],
			["Config", "🇺🇸", "200"],
			["Data", "⚠️", "300"],
			["Cache", "🔴", "400"],
		],
	);
	console.log();

	// Example 2: Table with ANSI colors
	console.log("2. Table with ANSI Colors:");
	printTable(
		["Service", "Status", "Response Time"],
		[
			["API", "\x1b[32m✓ Success\x1b[0m", "2ms"],
			["Database", "\x1b[33m⚠ Warning\x1b[0m", "15ms"],
			["Cache", "\x1b[31m✗ Error\x1b[0m", "N/A"],
			["CDN", "\x1b[36m→ Active\x1b[0m", "1ms"],
		],
	);
	console.log();

	// Example 3: Table with mixed content
	console.log("3. Table with Mixed Content (Emojis + Colors):");
	printTable(
		["Icon", "Name", "Status", "Value"],
		[
			["✅", "Success", "\x1b[32mActive\x1b[0m", "100%"],
			["🇺🇸", "US Data", "\x1b[36mProcessing\x1b[0m", "75%"],
			["👨‍💻", "Developer", "\x1b[33mPending\x1b[0m", "50%"],
			["⚠️", "Warning", "\x1b[31mFailed\x1b[0m", "0%"],
		],
	);
	console.log();

	// Example 4: Box-drawing table
	console.log("4. Box-Drawing Table:");
	printTableBox(
		["Name", "Status", "Value"],
		[
			["File", "✅", "100"],
			["Config", "🇺🇸", "200"],
			["Data", "⚠️", "300"],
		],
	);
	console.log();

	// Example 5: Box-drawing table with colors
	console.log("5. Box-Drawing Table with Colors:");
	printTableBox(
		["Service", "Status", "Time"],
		[
			["API", "\x1b[32m✓ OK\x1b[0m", "2ms"],
			["DB", "\x1b[33m⚠ Slow\x1b[0m", "15ms"],
			["Cache", "\x1b[31m✗ Down\x1b[0m", "N/A"],
		],
	);
	console.log();

	// Example 6: International text table
	console.log("6. International Text Table:");
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
	console.log();

	// Example 7: Currency table
	console.log("7. Currency Table:");
	printTableBox(
		["Symbol", "Amount", "Currency"],
		[
			["💲", "1,234,567", "USD"],
			["€", "987,654", "EUR"],
			["¥", "123,456,789", "JPY"],
			["₹", "98,765,432", "INR"],
		],
	);
	console.log();

	// Example 8: Get table as string array (without printing)
	console.log("8. Table as String Array (for custom formatting):");
	const tableLines = printTable(
		["Name", "Value"],
		[
			["Item 1", "100"],
			["Item 2", "200"],
		],
		{ print: false },
	);

	console.log("Table lines:", tableLines.length);
	tableLines.forEach((line, i) => {
		console.log(`  ${i + 1}. ${line}`);
	});
	console.log();

	console.log("✅ All table formatting examples completed!");
	console.log("\n💡 Key Features:");
	console.log("   • Unicode-aware column width calculation");
	console.log("   • Works with emojis, flags, and colors");
	console.log("   • Supports international text");
	console.log("   • Box-drawing borders option");
	console.log("   • Can return lines as array for custom formatting");
}

// Run if executed directly
if (import.meta.main) {
	tableFormattingExample().catch(console.error);
}

export { tableFormattingExample };
