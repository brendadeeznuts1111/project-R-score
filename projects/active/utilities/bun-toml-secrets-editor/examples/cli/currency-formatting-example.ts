/**
 * Currency formatting example using Unicode-aware spacing
 * Run: bun run examples/currency-formatting-example.ts
 */

import {
	formatCurrency,
	formatCurrencyList,
} from "../../src/utils/string-formatting";

async function currencyFormattingExample() {
	console.info("💰 Currency Formatting Examples with Unicode-Aware Spacing\n");
	console.info(`${"=".repeat(60)}\n`);

	// Example 1: Basic currency formatting
	console.info("1. Basic Currency Formatting:");
	const prices = [
		{ symbol: "💲", amount: "100", currency: "USD" },
		{ symbol: "€", amount: "85", currency: "EUR" },
		{ symbol: "¥", amount: "11000", currency: "JPY" },
		{ symbol: "₹", amount: "7500", currency: "INR" },
		{ symbol: "£", amount: "75", currency: "GBP" },
	];

	prices.forEach(({ symbol, amount, currency }) => {
		console.info(formatCurrency(symbol, amount, currency));
	});
	console.info();

	// Example 2: Formatted currency list with alignment
	console.info("2. Formatted Currency List (Aligned):");
	const formatted = formatCurrencyList(prices);
	formatted.forEach((line) => console.info(line));
	console.info();

	// Example 3: Mixed emoji and Unicode symbols
	console.info("3. Mixed Emoji and Unicode Symbols:");
	const mixedPrices = [
		{ symbol: "💲", amount: 100, currency: "USD" },
		{ symbol: "€", amount: 85, currency: "EUR" },
		{ symbol: "¥", amount: 11000, currency: "JPY" },
		{ symbol: "₽", amount: 7500, currency: "RUB" },
		{ symbol: "₩", amount: 130000, currency: "KRW" },
		{ symbol: "₪", amount: 350, currency: "ILS" },
	];

	formatCurrencyList(mixedPrices).forEach((line) => console.info(line));
	console.info();

	// Example 4: Large amounts with proper alignment
	console.info("4. Large Amounts with Proper Alignment:");
	const largeAmounts = [
		{ symbol: "💲", amount: "1,234,567", currency: "USD" },
		{ symbol: "€", amount: "987,654", currency: "EUR" },
		{ symbol: "¥", amount: "123,456,789", currency: "JPY" },
		{ symbol: "₹", amount: "98,765,432", currency: "INR" },
	];

	formatCurrencyList(largeAmounts, { amountWidth: 12 }).forEach((line) =>
		console.info(line),
	);
	console.info();

	// Example 5: Price comparison table
	console.info("5. Price Comparison Table:");
	console.info("┌──────────┬─────────────┬──────┐");
	console.info("│ Symbol   │ Amount      │ Code │");
	console.info("├──────────┼─────────────┼──────┤");

	const tablePrices = [
		{ symbol: "💲", amount: "100", currency: "USD" },
		{ symbol: "€", amount: "85", currency: "EUR" },
		{ symbol: "¥", amount: "11000", currency: "JPY" },
	];

	tablePrices.forEach(({ symbol, amount, currency }) => {
		const symbolFormatted = formatCurrency(symbol, "", "", 3).trim();
		console.info(
			`│ ${symbolFormatted.padEnd(8)} │ ${amount.padStart(11)} │ ${currency.padEnd(4)} │`,
		);
	});

	console.info("└──────────┴─────────────┴──────┘");
	console.info();

	console.info("✅ All currency formatting examples completed!");
	console.info("\n💡 Key Features:");
	console.info("   • Unicode-aware symbol width calculation");
	console.info("   • Proper alignment with emoji symbols");
	console.info("   • Supports both string and number amounts");
	console.info("   • Automatic column alignment");
}

// Run if executed directly
if (import.meta.main) {
	currencyFormattingExample().catch(console.error);
}

export { currencyFormattingExample };
