/**
 * Comparison: Bun's built-in table APIs vs our Unicode-aware implementation
 * Run: bun run examples/bun-builtin-table-comparison.ts
 */

import { inspect } from "bun";
import { printTable, printTableBox } from "../../src/utils/string-formatting";

async function compareTableAPIs() {
	console.log(
		"📊 Comparison: Bun Built-in APIs vs Our Unicode-Aware Implementation\n",
	);
	console.log(`${"=".repeat(70)}\n`);

	const testData = [
		["File", "✅", "100"],
		["Config", "🇺🇸", "200"],
		["Data", "⚠️", "300"],
		["Cache", "\x1b[32mOK\x1b[0m", "400"],
	];

	// Test 1: Bun's console.table()
	console.log("1. Bun's console.table() (Built-in):");
	console.log("   Note: May not handle Unicode/emoji widths correctly\n");
	console.table(testData);
	console.log();

	// Test 2: Bun's inspect.table()
	console.log("2. Bun's inspect.table() (Built-in):");
	console.log(
		"   Note: Returns string, may not handle Unicode/emoji widths correctly\n",
	);
	console.log(inspect.table(testData));
	console.log();

	// Test 3: Our Unicode-aware printTable()
	console.log("3. Our printTable() (Unicode-aware):");
	console.log("   ✅ Uses Bun.stringWidth() for accurate column widths\n");
	printTable(["Name", "Status", "Value"], testData);
	console.log();

	// Test 4: Our Unicode-aware printTableBox()
	console.log("4. Our printTableBox() (Unicode-aware with borders):");
	console.log("   ✅ Uses Bun.stringWidth() for accurate column widths\n");
	printTableBox(["Name", "Status", "Value"], testData);
	console.log();

	// Test 5: Alignment comparison with emojis
	console.log("5. Alignment Comparison (Emojis):");
	console.log("\n   Bun console.table():");
	console.table([
		["Short", "✅", "100"],
		["Very Long Name", "🇺🇸", "200"],
	]);

	console.log("\n   Our printTable():");
	printTable(
		["Name", "Status", "Value"],
		[
			["Short", "✅", "100"],
			["Very Long Name", "🇺🇸", "200"],
		],
	);
	console.log();

	// Test 6: ANSI color handling
	console.log("6. ANSI Color Handling:");
	const coloredData = [
		["API", "\x1b[32m✓ Success\x1b[0m", "2ms"],
		["DB", "\x1b[33m⚠ Warning\x1b[0m", "15ms"],
		["Cache", "\x1b[31m✗ Error\x1b[0m", "N/A"],
	];

	console.log("\n   Bun console.table():");
	console.table(coloredData);

	console.log("\n   Our printTable():");
	printTable(["Service", "Status", "Time"], coloredData);
	console.log();

	console.log("✅ Comparison completed!\n");
	console.log("💡 Key Differences:");
	console.log("   • Bun's console.table() / inspect.table():");
	console.log("     - Built-in, no extra code needed");
	console.log("     - May not handle emoji/Unicode widths correctly");
	console.log("     - May not handle ANSI escape codes correctly");
	console.log("     - Less customizable");
	console.log("");
	console.log("   • Our printTable() / printTableBox():");
	console.log("     - Uses Bun.stringWidth() directly (Unicode-aware)");
	console.log("     - Handles emojis, flags, ANSI colors correctly");
	console.log("     - More customizable (separators, borders, etc.)");
	console.log("     - Can return lines as array for custom formatting");
	console.log("");
	console.log("   • Recommendation:");
	console.log("     - Use Bun's console.table() for simple data / debugging");
	console.log(
		"     - Use our printTable() for emojis, colors, international text",
	);
	console.log(
		"     - Both use Bun.stringWidth() - ours just adds customization",
	);
	console.log("");
	console.log("   • Key Point:");
	console.log("     Our functions USE Bun.stringWidth() directly!");
	console.log("     We just wrap it for consistency and customization.");
}

// Run if executed directly
if (import.meta.main) {
	compareTableAPIs().catch(console.error);
}

export { compareTableAPIs };
