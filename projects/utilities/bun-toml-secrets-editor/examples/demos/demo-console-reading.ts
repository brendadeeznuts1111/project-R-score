#!/usr/bin/env bun

/**
 * Interactive Console Reading Demo
 * Showcases advanced console input handling
 */

import { ConsoleReader } from "../../src/utils/process-manager";

async function main() {
	console.log("🎮 Interactive Console Reading Demo");
	console.log("====================================\n");

	const _reader = new ConsoleReader();

	// Demo 1: Simple line reading
	console.log("1️⃣ Simple Line Reading");
	console.log("-----------------------");
	console.log("Run: reader.readLine(prompt)");
	console.log('Example: await reader.readLine("Enter your name: ")');
	console.log("Returns: string\n");

	// Demo 2: Read until delimiter
	console.log("2️⃣ Multi-line Input");
	console.log("-------------------");
	console.log('Run: reader.readUntil("END")');
	console.log('Example: await reader.readUntil("END")');
	console.log("Returns: string[] (lines until delimiter)\n");

	// Demo 3: Validated input
	console.log("3️⃣ Validated Input");
	console.log("------------------");
	console.log("Run: reader.readValidated(options)");
	console.log("Example:");
	console.log("  await reader.readValidated({");
	console.log('    prompt: "Enter email",');
	console.log(
		'    validator: (input) => input.includes("@") || "Invalid email"',
	);
	console.log("  })");
	console.log("Returns: string (validated)\n");

	// Demo 4: Password input
	console.log("4️⃣ Password Input");
	console.log("-----------------");
	console.log("Run: reader.readPassword(prompt)");
	console.log('Example: await reader.readPassword("Password: ")');
	console.log("Returns: string (hidden input)\n");

	// Demo 5: Number input with range
	console.log("5️⃣ Number Input");
	console.log("---------------");
	console.log("Run: reader.readNumber(options)");
	console.log("Example:");
	console.log("  await reader.readNumber({");
	console.log('    prompt: "Enter your age",');
	console.log("    min: 0,");
	console.log("    max: 120");
	console.log("  })");
	console.log("Returns: number\n");

	// Demo 6: Confirmation
	console.log("6️⃣ Yes/No Confirmation");
	console.log("----------------------");
	console.log("Run: reader.readConfirmation(prompt)");
	console.log('Example: await reader.readConfirmation("Proceed?")');
	console.log("Returns: boolean (true/false)\n");

	// Demo 7: Selection from list
	console.log("7️⃣ Selection from List");
	console.log("-----------------------");
	console.log("Run: reader.readSelection(options)");
	console.log("Example:");
	console.log("  await reader.readSelection({");
	console.log('    prompt: "Choose a fruit",');
	console.log("    items: [");
	console.log('      { key: "A", value: "Apple", description: "Red fruit" },');
	console.log(
		'      { key: "B", value: "Banana", description: "Yellow fruit" }',
	);
	console.log("    ]");
	console.log("  })");
	console.log("Returns: T (selected value)\n");

	// Demo 8: Auto-completion
	console.log("8️⃣ Auto-completion");
	console.log("------------------");
	console.log("Run: reader.readWithCompletion(options)");
	console.log("Example:");
	console.log("  await reader.readWithCompletion({");
	console.log('    prompt: "Choose command",');
	console.log('    completions: ["list", "status", "start", "stop"]');
	console.log("  })");
	console.log("Returns: string (with auto-completion)\n");

	// Demo 9: History
	console.log("9️⃣ Command History");
	console.log("------------------");
	console.log("Features:");
	console.log("  - reader.setPrompt(prompt) - Set custom prompt");
	console.log("  - reader.getHistory() - Get command history");
	console.log("  - reader.clearHistory() - Clear history");
	console.log("  - Arrow keys navigate history\n");

	// Demo 10: Complete interactive example
	console.log("🔟 Complete Interactive Example");
	console.log("---------------------------------");
	console.log("Run: bun run demo-interactive.ts");
	console.log("Features:");
	console.log("  - Name input with validation");
	console.log("  - Age input with range");
	console.log("  - Email validation");
	console.log("  - Confirmation dialog");
	console.log("  - Selection from options");
	console.log("  - Multi-line input\n");

	console.log("✅ Console Reading Demo Complete!");
	console.log("==================================");
	console.log("\n📖 Usage Examples:");
	console.log("  const reader = new ConsoleReader();");
	console.log('  const name = await reader.readLine("Name: ");');
	console.log(
		'  const age = await reader.readNumber({ prompt: "Age:", min: 0, max: 120 });',
	);
	console.log(
		'  const confirmed = await reader.readConfirmation("Continue?");',
	);
}

main().catch(console.error);
