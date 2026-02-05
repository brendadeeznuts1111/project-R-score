/**
 * Test Bun.stringWidth() Unicode-aware width calculation
 * Demonstrates proper handling of emojis, ANSI codes, and complex Unicode
 * Run: bun run examples/string-width-unicode-test.ts
 */

/**
 * Test various Unicode and ANSI scenarios
 */
async function testStringWidth() {
	console.log("🧪 Testing Bun.stringWidth() Unicode-Aware Width Calculation\n");

	// Test 1: Basic emoji
	console.log("1. Basic Emoji:");
	const flag = "🇺🇸";
	const flagWidth = Bun.stringWidth(flag);
	console.log(`   "${flag}" → Width: ${flagWidth}`);
	console.log(
		`   ✅ Expected: 2, Got: ${flagWidth} ${flagWidth === 2 ? "✓" : "✗"}\n`,
	);

	// Test 2: Multi-person emoji with zero-width joiners
	console.log("2. Multi-Person Emoji (Zero-Width Joiners):");
	const family = "👨‍👩‍👧";
	const familyWidth = Bun.stringWidth(family);
	console.log(`   "${family}" → Width: ${familyWidth}`);
	console.log(
		`   ✅ Expected: 2, Got: ${familyWidth} ${familyWidth === 2 ? "✓" : "✗"}\n`,
	);

	// Test 3: ANSI escape codes (should be ignored)
	console.log("3. ANSI Escape Codes (Should be Ignored):");
	const ansiText = "\x1b[32mTest\x1b[0m";
	const ansiWidth = Bun.stringWidth(ansiText);
	console.log(`   "\\x1b[32mTest\\x1b[0m" → Width: ${ansiWidth}`);
	console.log(
		`   ✅ Expected: 4 (only "Test"), Got: ${ansiWidth} ${ansiWidth === 4 ? "✓" : "✗"}\n`,
	);

	// Test 4: Combined emojis + ANSI + text
	console.log("4. Combined: Emojis + ANSI + Text:");
	const combined = "🇺🇸👨‍👩‍👧\x1b[32mTest\x1b[0m";
	const combinedWidth = Bun.stringWidth(combined);
	console.log(`   "🇺🇸👨‍👩‍👧\\x1b[32mTest\\x1b[0m" → Width: ${combinedWidth}`);
	console.log(
		`   ✅ Expected: 8 (2+2+4), Got: ${combinedWidth} ${combinedWidth === 8 ? "✓" : "✗"}\n`,
	);

	// Test 5: Complex Unicode sequences
	console.log("5. Complex Unicode Sequences:");
	const complex = "👨‍💻👩‍💼👨‍👩‍👧‍👦";
	const complexWidth = Bun.stringWidth(complex);
	console.log(`   "${complex}" → Width: ${complexWidth}`);
	console.log(
		`   ✅ Expected: 6 (3 emojis × 2), Got: ${complexWidth} ${complexWidth === 6 ? "✓" : "✗"}\n`,
	);

	// Test 6: Mixed content with padding
	console.log("6. Terminal Table Formatting:");
	const items = [
		{ name: "🇺🇸 US", value: "100" },
		{ name: "👨‍👩‍👧 Family", value: "200" },
		{ name: "\x1b[32m✅ Success\x1b[0m", value: "300" },
	];

	const _maxNameWidth = Math.max(
		...items.map((item) => Bun.stringWidth(item.name)),
	);
	const padding = 20;

	console.log("   Formatted table:");
	items.forEach((item) => {
		const nameWidth = Bun.stringWidth(item.name);
		const spaces = " ".repeat(padding - nameWidth);
		console.log(`   ${item.name}${spaces}${item.value}`);
	});
	console.log(`   ✅ Proper alignment using Bun.stringWidth()\n`);

	// Test 7: Zero-width characters
	console.log("7. Zero-Width Characters:");
	const zeroWidth = "Test\u200B\u200C\u200D";
	const zeroWidthResult = Bun.stringWidth(zeroWidth);
	console.log(`   "Test\\u200B\\u200C\\u200D" → Width: ${zeroWidthResult}`);
	console.log(
		`   ✅ Expected: 4 (zero-width ignored), Got: ${zeroWidthResult} ${zeroWidthResult === 4 ? "✓" : "✗"}\n`,
	);

	// Test 8: Full-width characters
	console.log("8. Full-Width Characters:");
	const fullWidth = "测试";
	const fullWidthResult = Bun.stringWidth(fullWidth);
	console.log(`   "${fullWidth}" → Width: ${fullWidthResult}`);
	console.log(
		`   ✅ Expected: 4 (2 chars × 2 width), Got: ${fullWidthResult} ${fullWidthResult === 4 ? "✓" : "✗"}\n`,
	);

	// Test 9: Practical terminal formatting example
	console.log("9. Practical Terminal Formatting:");
	const statuses = [
		{ icon: "✅", text: "Success", color: "\x1b[32m" },
		{ icon: "⚠️", text: "Warning", color: "\x1b[33m" },
		{ icon: "❌", text: "Error", color: "\x1b[31m" },
	];

	statuses.forEach((status) => {
		const fullText = `${status.color}${status.icon} ${status.text}\x1b[0m`;
		const width = Bun.stringWidth(fullText);
		console.log(`   ${fullText} → Width: ${width} (ANSI codes ignored)`);
	});
	console.log();

	console.log("✅ All Bun.stringWidth() tests completed!");
	console.log("\n💡 Benefits:");
	console.log("   • Accurate terminal column alignment");
	console.log("   • Proper emoji width calculation");
	console.log("   • ANSI escape code handling");
	console.log("   • Unicode-aware formatting");
	console.log("   • Essential for PTY-based editors");
}

// Run if executed directly
if (import.meta.main) {
	testStringWidth().catch(console.error);
}

export { testStringWidth };
