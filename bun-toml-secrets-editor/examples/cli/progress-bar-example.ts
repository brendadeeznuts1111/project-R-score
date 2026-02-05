/**
 * Progress bar example using Unicode-aware formatting
 * Run: bun run examples/progress-bar-example.ts
 */

import { createProgress } from "../../src/utils/string-formatting";

async function progressBarExample() {
	console.log("🚀 Progress Bar Examples with Unicode-Aware Formatting\n");
	console.log(`${"=".repeat(60)}\n`);

	// Example 1: Basic progress bar
	console.log("1. Basic Progress Bar:");
	for (let i = 0; i <= 100; i += 25) {
		console.log(createProgress(i, 100));
	}
	console.log();

	// Example 2: Progress bar with emoji labels
	console.log("2. Progress Bar with Emoji Labels:");
	const tasks = [
		{ current: 25, total: 100, label: "Processing files 🇺🇸" },
		{ current: 50, total: 100, label: "Uploading data 👨‍💻" },
		{ current: 75, total: 100, label: "✅ Almost done!" },
		{ current: 100, total: 100, label: "Complete 🎉" },
	];

	tasks.forEach((task) => {
		console.log(createProgress(task.current, task.total, task.label));
	});
	console.log();

	// Example 3: Progress bar with colored labels
	console.log("3. Progress Bar with Colored Labels:");
	const coloredTasks = [
		{ current: 33, total: 100, label: "\x1b[32m✓ Success\x1b[0m" },
		{ current: 66, total: 100, label: "\x1b[33m⚠ Warning\x1b[0m" },
		{ current: 100, total: 100, label: "\x1b[36m✓ Complete\x1b[0m" },
	];

	coloredTasks.forEach((task) => {
		console.log(createProgress(task.current, task.total, task.label));
	});
	console.log();

	// Example 4: Custom progress bar characters
	console.log("4. Custom Progress Bar Characters:");
	console.log(createProgress(60, 100, "Loading...", 20, "▓", "░"));
	console.log(createProgress(80, 100, "Processing...", 20, "▰", "▱"));
	console.log();

	// Example 5: Simulated real-time progress
	console.log("5. Simulated Real-Time Progress:");
	const simulateProgress = async (label: string, duration: number = 2000) => {
		const steps = 20;
		const interval = duration / steps;

		for (let i = 0; i <= steps; i++) {
			const current = (i / steps) * 100;
			process.stdout.write(`\r${createProgress(current, 100, label)}`);
			await new Promise((resolve) => setTimeout(resolve, interval));
		}
		console.log(); // New line after completion
	};

	await simulateProgress("Downloading files 📥", 1000);
	await simulateProgress("Installing packages 📦", 1000);
	await simulateProgress("Finalizing setup ✨", 1000);

	console.log("\n✅ All progress bar examples completed!");
	console.log("\n💡 Key Features:");
	console.log("   • Unicode-aware label truncation");
	console.log("   • Works with emojis and ANSI colors");
	console.log("   • Automatically adjusts to terminal width");
	console.log("   • Customizable bar characters");
}

// Run if executed directly
if (import.meta.main) {
	progressBarExample().catch(console.error);
}

export { progressBarExample };
