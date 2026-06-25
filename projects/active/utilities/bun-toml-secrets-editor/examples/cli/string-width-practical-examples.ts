/**
 * Practical examples of using Bun.stringWidth() in real-world scenarios
 * Run: bun run examples/string-width-practical-examples.ts
 */

/**
 * Example 1: Fix CLI tool padding
 */
function fixedCLIPadding() {
	console.info("1. Fixed CLI Tool Padding:\n");

	// ❌ BAD: Breaks with emojis
	function badPadding(text: string, width: number) {
		return text.padEnd(width);
	}

	// ✅ GOOD: Uses Bun.stringWidth
	function goodPadding(text: string, width: number) {
		const textWidth = Bun.stringWidth(text);
		const padding = " ".repeat(Math.max(0, width - textWidth));
		return text + padding;
	}

	const items = [
		{ name: "File", status: "✅" },
		{ name: "Config", status: "🇺🇸" },
		{ name: "Data", status: "👨‍💻" },
	];

	console.info("❌ Bad (breaks with emojis):");
	items.forEach((item) => {
		console.info(`  ${badPadding(item.name, 10)}${item.status}`);
	});

	console.info("\n✅ Good (works with emojis):");
	items.forEach((item) => {
		console.info(`  ${goodPadding(item.name, 10)}${item.status}`);
	});
	console.info();
}

/**
 * Example 2: Better progress bars
 */
function createProgressBar(current: number, total: number, label = "") {
	const width = 30;
	const filled = Math.floor(width * (current / total));
	const bar = "█".repeat(filled) + "░".repeat(width - filled);
	const percent = ((current / total) * 100).toFixed(1);

	// Calculate available space for label
	const progressText = `[${bar}] ${percent}%`;
	const terminalWidth = process.stdout.columns || 80;
	const available = terminalWidth - Bun.stringWidth(progressText) - 1;

	// Truncate label by visible width, not character count
	let displayLabel = label;
	while (Bun.stringWidth(displayLabel) > available && displayLabel.length > 0) {
		displayLabel = displayLabel.slice(0, -1);
	}

	return `${progressText} ${displayLabel}`;
}

function progressBarExample() {
	console.info("2. Better Progress Bars:\n");

	const tasks = [
		{ current: 25, total: 100, label: "Processing files 🇺🇸" },
		{ current: 50, total: 100, label: "Uploading data 👨‍💻" },
		{ current: 75, total: 100, label: "✅ Almost done!" },
		{ current: 100, total: 100, label: "Complete 🎉" },
	];

	tasks.forEach((task) => {
		console.info(createProgressBar(task.current, task.total, task.label));
	});
	console.info();
}

/**
 * Example 3: International-friendly currency display
 */
function currencyDisplay() {
	console.info("3. International-Friendly Currency Display:\n");

	const prices = [
		{ symbol: "💲", amount: "100", currency: "USD" },
		{ symbol: "€", amount: "85", currency: "EUR" },
		{ symbol: "¥", amount: "11000", currency: "JPY" },
		{ symbol: "₹", amount: "7500", currency: "INR" },
		{ symbol: "£", amount: "75", currency: "GBP" },
	];

	prices.forEach(({ symbol, amount, currency }) => {
		const symbolWidth = Bun.stringWidth(symbol);
		const padding = " ".repeat(3 - symbolWidth);
		console.info(`${symbol}${padding} ${amount.padStart(8)} ${currency}`);
	});
	console.info();
}

/**
 * Example 4: Status table with emojis and colors
 */
function statusTable() {
	console.info("4. Status Table with Emojis and Colors:\n");

	const statuses = [
		{
			icon: "✅",
			status: "\x1b[32mSuccess\x1b[0m",
			service: "API",
			time: "2ms",
		},
		{
			icon: "⚠️",
			status: "\x1b[33mWarning\x1b[0m",
			service: "Database",
			time: "15ms",
		},
		{
			icon: "❌",
			status: "\x1b[31mError\x1b[0m",
			service: "Cache",
			time: "N/A",
		},
		{
			icon: "🇺🇸",
			status: "\x1b[36mActive\x1b[0m",
			service: "CDN",
			time: "1ms",
		},
	];

	// Calculate column widths
	const iconWidth = Math.max(...statuses.map((s) => Bun.stringWidth(s.icon)));
	const statusWidth = Math.max(
		...statuses.map((s) => Bun.stringWidth(s.status)),
	);
	const serviceWidth = Math.max(
		...statuses.map((s) => Bun.stringWidth(s.service)),
	);
	const timeWidth = Math.max(...statuses.map((s) => Bun.stringWidth(s.time)));

	// Display table
	statuses.forEach(({ icon, status, service, time }) => {
		const iconPad = " ".repeat(iconWidth - Bun.stringWidth(icon));
		const statusPad = " ".repeat(statusWidth - Bun.stringWidth(status));
		const servicePad = " ".repeat(serviceWidth - Bun.stringWidth(service));
		const timePad = " ".repeat(timeWidth - Bun.stringWidth(time));

		console.info(
			`${icon}${iconPad}  ${status}${statusPad}  ${service}${servicePad}  ${time}${timePad}`,
		);
	});
	console.info();
}

/**
 * Example 5: Truncate text by visible width
 */
function truncateByWidth(text: string, maxWidth: number): string {
	if (Bun.stringWidth(text) <= maxWidth) {
		return text;
	}

	let result = "";
	for (const char of text) {
		const newResult = result + char;
		if (Bun.stringWidth(newResult) > maxWidth) {
			return `${result}…`;
		}
		result = newResult;
	}
	return result;
}

function truncationExample() {
	console.info("5. Truncate by Visible Width:\n");

	const longTexts = [
		"This is a very long text that needs truncation 🇺🇸",
		"Another example with 👨‍💻 emoji and \x1b[32mcolors\x1b[0m",
		"Short text",
		"プログラマー (Japanese text)",
	];

	const maxWidth = 30;

	longTexts.forEach((text) => {
		const truncated = truncateByWidth(text, maxWidth);
		console.info(`Original: ${text}`);
		console.info(`Truncated: ${truncated}`);
		console.info(`Width: ${Bun.stringWidth(truncated)}/${maxWidth}`);
		console.info();
	});
}

/**
 * Main function
 */
async function main() {
	console.info("🚀 Practical Examples of Bun.stringWidth()\n");
	console.info(`${"=".repeat(60)}\n`);

	fixedCLIPadding();
	progressBarExample();
	currencyDisplay();
	statusTable();
	truncationExample();

	console.info("✅ All practical examples completed!");
	console.info("\n💡 Key Takeaways:");
	console.info("   • Always use Bun.stringWidth() for padding/alignment");
	console.info("   • Truncate by visible width, not character count");
	console.info("   • Works correctly with emojis, ANSI codes, and Unicode");
	console.info("   • Essential for international-friendly CLI tools");
}

// Run if executed directly
if (import.meta.main) {
	main().catch(console.error);
}

export {
	fixedCLIPadding,
	createProgressBar,
	currencyDisplay,
	statusTable,
	truncateByWidth,
};
