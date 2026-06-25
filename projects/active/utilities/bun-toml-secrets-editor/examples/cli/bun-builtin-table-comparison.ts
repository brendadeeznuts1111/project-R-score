/**
 * Comparison: Bun's built-in table APIs vs our Unicode-aware implementation
 * Run: bun run examples/bun-builtin-table-comparison.ts
 */

import { inspect } from "bun";
import { printTable, printTableBox } from "../../src/utils/string-formatting";

async function compareTableAPIs() {
	console.info(
		"📊 Comparison: Bun Built-in APIs vs Our Unicode-Aware Implementation\n",
	);
	console.info(`${"=".repeat(70)}\n`);

	const testData = [
		["File", "✅", "100"],
		["Config", "🇺🇸", "200"],
		["Data", "⚠️", "300"],
		["Cache", "\x1b[32mOK\x1b[0m", "400"],
	];

	// Test 1: Bun's console.table()
	console.info("1. Bun's console.table() (Built-in):");
	console.info("   Note: May not handle Unicode/emoji widths correctly\n");
	console.table(testData);
	console.info();

	// Test 2: Bun's inspect.table()
	console.info("2. Bun's inspect.table() (Built-in):");
	console.info(
		"   Note: Returns string, may not handle Unicode/emoji widths correctly\n",
	);
	console.info(inspect.table(testData));
	console.info();

	// Test 3: Our Unicode-aware printTable()
	console.info("3. Our printTable() (Unicode-aware):");
	console.info("   ✅ Uses Bun.stringWidth() for accurate column widths\n");
	printTable(["Name", "Status", "Value"], testData);
	console.info();

	// Test 4: Our Unicode-aware printTableBox()
	console.info("4. Our printTableBox() (Unicode-aware with borders):");
	console.info("   ✅ Uses Bun.stringWidth() for accurate column widths\n");
	printTableBox(["Name", "Status", "Value"], testData);
	console.info();

	// Test 5: Alignment comparison with emojis
	console.info("5. Alignment Comparison (Emojis):");
	console.info("\n   Bun console.table():");
	console.table([
		["Short", "✅", "100"],
		["Very Long Name", "🇺🇸", "200"],
	]);

	console.info("\n   Our printTable():");
	printTable(
		["Name", "Status", "Value"],
		[
			["Short", "✅", "100"],
			["Very Long Name", "🇺🇸", "200"],
		],
	);
	console.info();

	// Test 6: ANSI color handling
	console.info("6. ANSI Color Handling:");
	const coloredData = [
		["API", "\x1b[32m✓ Success\x1b[0m", "2ms"],
		["DB", "\x1b[33m⚠ Warning\x1b[0m", "15ms"],
		["Cache", "\x1b[31m✗ Error\x1b[0m", "N/A"],
	];

	console.info("\n   Bun console.table():");
	console.table(coloredData);

	console.info("\n   Our printTable():");
	printTable(["Service", "Status", "Time"], coloredData);
	console.info();

	console.info("✅ Comparison completed!\n");
	console.info("💡 Key Differences:");
	console.info("   • Bun's console.table() / inspect.table():");
	console.info("     - Built-in, no extra code needed");
	console.info("     - May not handle emoji/Unicode widths correctly");
	console.info("     - May not handle ANSI escape codes correctly");
	console.info("     - Less customizable");
	console.info("");
	console.info("   • Our printTable() / printTableBox():");
	console.info("     - Uses Bun.stringWidth() directly (Unicode-aware)");
	console.info("     - Handles emojis, flags, ANSI colors correctly");
	console.info("     - More customizable (separators, borders, etc.)");
	console.info("     - Can return lines as array for custom formatting");
	console.info("");
	console.info("   • Recommendation:");
	console.info("     - Use Bun's console.table() for simple data / debugging");
	console.info(
		"     - Use our printTable() for emojis, colors, international text",
	);
	console.info(
		"     - Both use Bun.stringWidth() - ours just adds customization",
	);
	console.info("");
	console.info("   • Key Point:");
	console.info("     Our functions USE Bun.stringWidth() directly!");
	console.info("     We just wrap it for consistency and customization.");
}

// Run if executed directly
if (import.meta.main) {
	compareTableAPIs().catch(console.error);
}

export { compareTableAPIs };
