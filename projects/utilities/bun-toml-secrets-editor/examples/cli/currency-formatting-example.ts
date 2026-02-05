/**
 * Currency formatting example using Unicode-aware spacing
 * Run: bun run examples/currency-formatting-example.ts
 */

import {
	formatCurrency,
	formatCurrencyList,
} from "../../src/utils/string-formatting";

async function currencyFormattingExample() {
	console.log("💰 Currency Formatting Examples with Unicode-Aware Spacing\n");
	console.log(`${"=".repeat(60)}\n`);

	// Example 1: Basic currency formatting
	console.log("1. Basic Currency Formatting:");
	const prices = [
		{ symbol: "💲", amount: "100", currency: "USD" },
		{ symbol: "€", amount: "85", currency: "EUR" },
		{ symbol: "¥", amount: "11000", currency: "JPY" },
		{ symbol: "₹", amount: "7500", currency: "INR" },
		{ symbol: "£", amount: "75", currency: "GBP" },
	];

	prices.forEach(({ symbol, amount, currency }) => {
		console.log(formatCurrency(symbol, amount, currency));
	});
	console.log();

	// Example 2: Formatted currency list with alignment
	console.log("2. Formatted Currency List (Aligned):");
	const formatted = formatCurrencyList(prices);
	formatted.forEach((line) => console.log(line));
	console.log();

	// Example 3: Mixed emoji and Unicode symbols
	console.log("3. Mixed Emoji and Unicode Symbols:");
	const mixedPrices = [
		{ symbol: "💲", amount: 100, currency: "USD" },
		{ symbol: "€", amount: 85, currency: "EUR" },
		{ symbol: "¥", amount: 11000, currency: "JPY" },
		{ symbol: "₽", amount: 7500, currency: "RUB" },
		{ symbol: "₩", amount: 130000, currency: "KRW" },
		{ symbol: "₪", amount: 350, currency: "ILS" },
	];

	formatCurrencyList(mixedPrices).forEach((line) => console.log(line));
	console.log();

	// Example 4: Large amounts with proper alignment
	console.log("4. Large Amounts with Proper Alignment:");
	const largeAmounts = [
		{ symbol: "💲", amount: "1,234,567", currency: "USD" },
		{ symbol: "€", amount: "987,654", currency: "EUR" },
		{ symbol: "¥", amount: "123,456,789", currency: "JPY" },
		{ symbol: "₹", amount: "98,765,432", currency: "INR" },
	];

	formatCurrencyList(largeAmounts, { amountWidth: 12 }).forEach((line) =>
		console.log(line),
	);
	console.log();

	// Example 5: Price comparison table
	console.log("5. Price Comparison Table:");
	console.log("┌──────────┬─────────────┬──────┐");
	console.log("│ Symbol   │ Amount      │ Code │");
	console.log("├──────────┼─────────────┼──────┤");

	const tablePrices = [
		{ symbol: "💲", amount: "100", currency: "USD" },
		{ symbol: "€", amount: "85", currency: "EUR" },
		{ symbol: "¥", amount: "11000", currency: "JPY" },
	];

	tablePrices.forEach(({ symbol, amount, currency }) => {
		const symbolFormatted = formatCurrency(symbol, "", "", 3).trim();
		console.log(
			`│ ${symbolFormatted.padEnd(8)} │ ${amount.padStart(11)} │ ${currency.padEnd(4)} │`,
		);
	});

	console.log("└──────────┴─────────────┴──────┘");
	console.log();

	console.log("✅ All currency formatting examples completed!");
	console.log("\n💡 Key Features:");
	console.log("   • Unicode-aware symbol width calculation");
	console.log("   • Proper alignment with emoji symbols");
	console.log("   • Supports both string and number amounts");
	console.log("   • Automatic column alignment");
}

// Run if executed directly
if (import.meta.main) {
	currencyFormattingExample().catch(console.error);
}

export { currencyFormattingExample };
