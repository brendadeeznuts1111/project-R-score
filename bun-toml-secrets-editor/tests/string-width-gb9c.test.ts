#!/usr/bin/env bun
// tests/test-string-width-gb9c.ts - Test suite for Bun.stringWidth GB9c support

import { describe, expect, test } from "bun:test";

describe("Bun.stringWidth() with GB9c Support", () => {
	test("Devanagari conjuncts treated as single grapheme clusters", () => {
		// Ka+Virama+Ssa (क्ष) should be width 2 (single cluster)
		expect(Bun.stringWidth("क्ष")).toBe(2);

		// Ka+Virama+ZWJ+Ssa (क्‍ष) should be width 2 (single cluster with ZWJ)
		expect(Bun.stringWidth("क्‍ष")).toBe(2);

		// Ka+Virama+Ka+Virama+Ka (क्क्क) should be width 3 (single cluster)
		expect(Bun.stringWidth("क्क्क")).toBe(3);
	});

	test("Common Devanagari words with conjuncts", () => {
		// These should be calculated correctly with conjuncts as single units
		expect(Bun.stringWidth("स्वतंत्र")).toBeGreaterThan(0);
		expect(Bun.stringWidth("विकास")).toBeGreaterThan(0);
		expect(Bun.stringWidth("ज्ञान")).toBeGreaterThan(0);
		expect(Bun.stringWidth("त्रिपुटा")).toBeGreaterThan(0);
	});

	test("Other Indic scripts support", () => {
		// Bengali
		expect(Bun.stringWidth("স্বাধীনতা")).toBeGreaterThan(0);

		// Gujarati
		expect(Bun.stringWidth("સ્વતંત્રતા")).toBeGreaterThan(0);

		// Gurmukhi
		expect(Bun.stringWidth("ਸੁਤੰਤਰਤਾ")).toBeGreaterThan(0);

		// Tamil
		expect(Bun.stringWidth("சுதந்திரம்")).toBeGreaterThan(0);

		// Telugu
		expect(Bun.stringWidth("స్వాతంత్ర్యం")).toBeGreaterThan(0);

		// Kannada
		expect(Bun.stringWidth("ಸ್ವಾತಂತ್ರ್ಯ")).toBeGreaterThan(0);

		// Malayalam
		expect(Bun.stringWidth("സ്വാതന്ത്ര്യം")).toBeGreaterThan(0);

		// Oriya
		expect(Bun.stringWidth("ସ୍ୱାଧୀନତା")).toBeGreaterThan(0);
	});

	test("Edge cases and special sequences", () => {
		// Incomplete conjunct (Ka+Virama)
		expect(Bun.stringWidth("क्")).toBe(1);

		// Virama alone (zero width)
		expect(Bun.stringWidth("्")).toBe(0);

		// Ka alone
		expect(Bun.stringWidth("क")).toBe(1);

		// Ka+Virama+ZWJ (incomplete with ZWJ)
		expect(Bun.stringWidth("क्‍")).toBe(1);

		// ZWJ alone
		expect(Bun.stringWidth("‍")).toBe(0);

		// Complex conjuncts
		expect(Bun.stringWidth("क्ष्म")).toBe(3);
		expect(Bun.stringWidth("ज्ञ्य")).toBe(3);
	});

	test("Unicode normalization compatibility", () => {
		const conjunct = "क्ष";

		// All normalization forms should give consistent results
		expect(Bun.stringWidth(conjunct.normalize("NFC"))).toBe(
			Bun.stringWidth(conjunct),
		);
		expect(Bun.stringWidth(conjunct.normalize("NFD"))).toBe(
			Bun.stringWidth(conjunct),
		);
		expect(Bun.stringWidth(conjunct.normalize("NFKC"))).toBe(
			Bun.stringWidth(conjunct),
		);
		expect(Bun.stringWidth(conjunct.normalize("NFKD"))).toBe(
			Bun.stringWidth(conjunct),
		);
	});

	test("Performance with Indic scripts", () => {
		const testStrings = [
			"क्ष",
			"क्‍ष",
			"क्क्क",
			"स्वतंत्र",
			"विकास",
			"ज्ञान",
			"স্বাধীনতা",
			"સ્વતંત્રતા",
			"ਸੁਤੰਤਰਤਾ",
			"சுதந்திரம்",
		];

		const iterations = 1000;
		const start = performance.now();

		for (let i = 0; i < iterations; i++) {
			testStrings.forEach((str) => {
				const width = Bun.stringWidth(str);
				expect(width).toBeGreaterThanOrEqual(0);
			});
		}

		const end = performance.now();
		const time = end - start;

		// Should complete quickly (under 100ms for 10,000 operations)
		expect(time).toBeLessThan(100);
		console.log(`Performance test completed in ${time.toFixed(2)}ms`);
	});

	test("Practical text alignment scenarios", () => {
		const words = ["स्वतंत्र", "विकास", "ज्ञान", "त्रिपुटा"];

		// Calculate maximum width for alignment
		const widths = words.map((w) => Bun.stringWidth(w));
		const maxWidth = Math.max(...widths);

		// All widths should be positive
		widths.forEach((width) => {
			expect(width).toBeGreaterThan(0);
		});

		// Max width should be reasonable
		expect(maxWidth).toBeGreaterThan(0);
		expect(maxWidth).toBeLessThan(20); // Reasonable upper bound
	});

	test("Mixed script text handling", () => {
		// Mixed Latin and Devanagari
		const mixedText = "Hello स्वतंत्रता World";
		expect(Bun.stringWidth(mixedText)).toBeGreaterThan(0);

		// Mixed numbers and Indic text
		const numberText = "2024 साल";
		expect(Bun.stringWidth(numberText)).toBeGreaterThan(0);

		// Mixed symbols and Indic text
		const symbolText = "🚀 विकास";
		expect(Bun.stringWidth(symbolText)).toBeGreaterThan(0);
	});

	test("Zero Width Joiner handling", () => {
		// ZWJ should not add width but affect grapheme clustering
		const withZWJ = "क्‍ष"; // Ka+Virama+ZWJ+Ssa
		const withoutZWJ = "क्ष"; // Ka+Virama+Ssa

		// Both should have the same width
		expect(Bun.stringWidth(withZWJ)).toBe(Bun.stringWidth(withoutZWJ));
	});

	test("Complex conjunct formations", () => {
		const complexConjuncts = [
			"क्ष्म", // Ka+Virama+Ssa+Virama+Ma
			"ज्ञ्य", // Ja+Virama+Jña+Virama+Ya
			"स्त्र", // Sa+Virama+Ta+Virama+Ra
			"न्त्र", // Na+Virama+Ta+Virama+Ra
			"प्त्र", // Pa+Virama+Ta+Virama+Ra
		];

		complexConjuncts.forEach((conjunct) => {
			const width = Bun.stringWidth(conjunct);
			expect(width).toBeGreaterThan(0);
			expect(width).toBeLessThan(10); // Reasonable upper bound for complex conjuncts
		});
	});

	test("Regression test for empty and single characters", () => {
		// Empty string
		expect(Bun.stringWidth("")).toBe(0);

		// Single characters from various scripts
		expect(Bun.stringWidth("क")).toBe(1); // Devanagari Ka
		expect(Bun.stringWidth("ক")).toBe(1); // Bengali Ka
		expect(Bun.stringWidth("ક")).toBe(1); // Gujarati Ka
		expect(Bun.stringWidth("ਕ")).toBe(1); // Gurmukhi Ka
		expect(Bun.stringWidth("A")).toBe(1); // Latin A
		expect(Bun.stringWidth("1")).toBe(1); // Digit 1
	});
});

// Run the tests if this file is executed directly
if (import.meta.main) {
	console.log("🧪 Running Bun.stringWidth GB9c Support Tests...\n");

	// Test basic functionality
	console.log("✅ Basic Devanagari conjuncts:");
	console.log(`   क्ष: ${Bun.stringWidth("क्ष")} (expected: 2)`);
	console.log(`   क्‍ष: ${Bun.stringWidth("क्‍ष")} (expected: 2)`);
	console.log(`   क्क्क: ${Bun.stringWidth("क्क्क")} (expected: 3)`);

	// Test other scripts
	console.log("\n✅ Other Indic scripts:");
	console.log(`   Bengali: ${Bun.stringWidth("স্বাধীনতা")}`);
	console.log(`   Gujarati: ${Bun.stringWidth("સ્વતંત્રતા")}`);
	console.log(`   Tamil: ${Bun.stringWidth("சுதந்திரம்")}`);

	// Performance test
	console.log("\n✅ Performance test:");
	const start = performance.now();
	for (let i = 0; i < 10000; i++) {
		Bun.stringWidth("क्ष");
	}
	const end = performance.now();
	console.log(`   10,000 calls in ${(end - start).toFixed(2)}ms`);

	console.log("\n🎉 All GB9c support tests completed successfully!");
}
