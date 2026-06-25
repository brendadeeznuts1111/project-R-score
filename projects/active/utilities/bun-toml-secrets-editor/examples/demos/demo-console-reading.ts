#!/usr/bin/env bun

/**
 * Interactive Console Reading Demo
 * Showcases advanced console input handling
 */

import { ConsoleReader } from "../../src/utils/process-manager";

async function main() {
	console.info("🎮 Interactive Console Reading Demo");
	console.info("====================================\n");

	const _reader = new ConsoleReader();

	// Demo 1: Simple line reading
	console.info("1️⃣ Simple Line Reading");
	console.info("-----------------------");
	console.info("Run: reader.readLine(prompt)");
	console.info('Example: await reader.readLine("Enter your name: ")');
	console.info("Returns: string\n");

	// Demo 2: Read until delimiter
	console.info("2️⃣ Multi-line Input");
	console.info("-------------------");
	console.info('Run: reader.readUntil("END")');
	console.info('Example: await reader.readUntil("END")');
	console.info("Returns: string[] (lines until delimiter)\n");

	// Demo 3: Validated input
	console.info("3️⃣ Validated Input");
	console.info("------------------");
	console.info("Run: reader.readValidated(options)");
	console.info("Example:");
	console.info("  await reader.readValidated({");
	console.info('    prompt: "Enter email",');
	console.info(
		'    validator: (input) => input.includes("@") || "Invalid email"',
	);
	console.info("  })");
	console.info("Returns: string (validated)\n");

	// Demo 4: Password input
	console.info("4️⃣ Password Input");
	console.info("-----------------");
	console.info("Run: reader.readPassword(prompt)");
	console.info('Example: await reader.readPassword("Password: ")');
	console.info("Returns: string (hidden input)\n");

	// Demo 5: Number input with range
	console.info("5️⃣ Number Input");
	console.info("---------------");
	console.info("Run: reader.readNumber(options)");
	console.info("Example:");
	console.info("  await reader.readNumber({");
	console.info('    prompt: "Enter your age",');
	console.info("    min: 0,");
	console.info("    max: 120");
	console.info("  })");
	console.info("Returns: number\n");

	// Demo 6: Confirmation
	console.info("6️⃣ Yes/No Confirmation");
	console.info("----------------------");
	console.info("Run: reader.readConfirmation(prompt)");
	console.info('Example: await reader.readConfirmation("Proceed?")');
	console.info("Returns: boolean (true/false)\n");

	// Demo 7: Selection from list
	console.info("7️⃣ Selection from List");
	console.info("-----------------------");
	console.info("Run: reader.readSelection(options)");
	console.info("Example:");
	console.info("  await reader.readSelection({");
	console.info('    prompt: "Choose a fruit",');
	console.info("    items: [");
	console.info('      { key: "A", value: "Apple", description: "Red fruit" },');
	console.info(
		'      { key: "B", value: "Banana", description: "Yellow fruit" }',
	);
	console.info("    ]");
	console.info("  })");
	console.info("Returns: T (selected value)\n");

	// Demo 8: Auto-completion
	console.info("8️⃣ Auto-completion");
	console.info("------------------");
	console.info("Run: reader.readWithCompletion(options)");
	console.info("Example:");
	console.info("  await reader.readWithCompletion({");
	console.info('    prompt: "Choose command",');
	console.info('    completions: ["list", "status", "start", "stop"]');
	console.info("  })");
	console.info("Returns: string (with auto-completion)\n");

	// Demo 9: History
	console.info("9️⃣ Command History");
	console.info("------------------");
	console.info("Features:");
	console.info("  - reader.setPrompt(prompt) - Set custom prompt");
	console.info("  - reader.getHistory() - Get command history");
	console.info("  - reader.clearHistory() - Clear history");
	console.info("  - Arrow keys navigate history\n");

	// Demo 10: Complete interactive example
	console.info("🔟 Complete Interactive Example");
	console.info("---------------------------------");
	console.info("Run: bun run demo-interactive.ts");
	console.info("Features:");
	console.info("  - Name input with validation");
	console.info("  - Age input with range");
	console.info("  - Email validation");
	console.info("  - Confirmation dialog");
	console.info("  - Selection from options");
	console.info("  - Multi-line input\n");

	console.info("✅ Console Reading Demo Complete!");
	console.info("==================================");
	console.info("\n📖 Usage Examples:");
	console.info("  const reader = new ConsoleReader();");
	console.info('  const name = await reader.readLine("Name: ");');
	console.info(
		'  const age = await reader.readNumber({ prompt: "Age:", min: 0, max: 120 });',
	);
	console.info(
		'  const confirmed = await reader.readConfirmation("Continue?");',
	);
}

main().catch(console.error);
