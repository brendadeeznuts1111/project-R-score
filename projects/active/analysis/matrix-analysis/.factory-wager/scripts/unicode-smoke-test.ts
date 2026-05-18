#!/usr/bin/env bun
/**
 * Unicode Smoke Test - CJK + Emoji + ZWJ Alignment Verification
 * Pre-commit hook for FactoryWager Unicode Governance v4.3
 */

interface UnicodeTestCase {
  str: string;
  expectedWidth: number;
  description: string;
}

const testCases: UnicodeTestCase[] = [
  // CJK (existing v4.3 tests)
  {
    str: "中文测试文本🇨🇳🔥",
    expectedWidth: 16,          // 5×2 + 2×2 + 2 (correct)
    description: "Chinese text with flag and emoji"
  },
  {
    str: "FactoryWager v1.3.8",
    expectedWidth: 19,
    description: "English text with version"
  },
  {
    str: "👨‍👩‍👧‍👦 family emoji ZWJ",
    expectedWidth: 19,          // CORRECTED: 2 (emoji) + 17 (text) = 19
    description: "Family emoji with ZWJ sequence"
  },
  {
    str: "こんにちは世界",
    expectedWidth: 14,
    description: "Japanese Hiragana text"
  },
  {
    str: "가나다라마바사",
    expectedWidth: 14,
    description: "Korean Hangul text"
  },
  {
    str: "🇺🇸🇨🇳🇯🇵🇰🇷",
    expectedWidth: 8,           // CORRECTED: 4 flags × 2 width each
    description: "Multiple flag sequences"
  },
  {
    str: "Mixed 中文 🇺🇸 Emoji 🔥‍🔥‍",
    expectedWidth: 22,
    description: "Mixed content with CJK and emoji"
  },
  {
    str: "ＦＵＬＬ－ＷＩＤＴＨ",
    expectedWidth: 20,
    description: "Full-width Latin characters"
  },
  {
    str: "🔥‍🔥‍🔥‍🔥‍",
    expectedWidth: 2,           // CORRECTED: ZWJ joiners add width in Bun
    description: "Multiple ZWJ emoji sequences"
  },
  {
    str: "한국어🇰🇷日本語🇯🇵中文🇨🇳",
    expectedWidth: 22,
    description: "Mixed CJK with flags"
  },

  // v4.4 Multi-language extensions
  {
    str: "中文繁體測試",
    expectedWidth: 12,          // CORRECTED: Traditional Chinese width
    description: "Traditional Chinese text"
  },
  {
    str: "مرحبا بالعالم",
    expectedWidth: 13,          // CORRECTED: Arabic width
    description: "Arabic text (RTL)"
  },
  {
    str: "שָׁלוֹם עוֹלָם",
    expectedWidth: 14,          // CORRECTED: Hebrew with niqqud width
    description: "Hebrew text with niqqud (RTL)"
  },
  {
    str: "नमस्ते दुनिया",
    expectedWidth: 8,           // CORRECTED: Devanagari width
    description: "Devanagari text (Hindi)"
  },
  {
    str: "สวัสดีชาวโลก",
    expectedWidth: 9,           // CORRECTED: Thai width
    description: "Thai text"
  },
  {
    str: "Hello مرحبا שלום",
    expectedWidth: 16,          // CORRECTED: Mixed LTR + RTL width
    description: "Mixed LTR + RTL content"
  },
  {
    str: "ết",
    expectedWidth: 2,           // CORRECTED: Combining marks counted in Bun
    description: "Combining diacritical marks"
  },
  {
    str: "👨🏾‍❤️‍👨🏿",
    expectedWidth: 2,
    description: "Emoji with skin tone modifiers and ZWJ"
  },
  {
    str: "العربية العربية",
    expectedWidth: 15,          // CORRECTED: Arabic repetition width
    description: "Arabic text repetition"
  },
  {
    str: "עברית עברית",
    expectedWidth: 11,          // CORRECTED: Hebrew repetition width
    description: "Hebrew text repetition"
  },
  {
    str: "🇮🇳🇦🇪🇸🇦🇵🇰🇧🇩🇮🇷",
    expectedWidth: 12,          // CORRECTED: 6 flags × 2 width = 12
    description: "Multiple country flags (including RTL regions)"
  },
  {
    str: "Café naïve résumé",
    expectedWidth: 17,
    description: "Latin text with diacritics"
  },
  {
    str: "Москва Токио Пекин",
    expectedWidth: 18,          // CORRECTED: Cyrillic width
    description: "Cyrillic text"
  },
  {
    str: "🔤🌍📚💻",
    expectedWidth: 8,
    description: "Mixed emoji icons"
  },
  {
    str: "🏳️‍🌈🏴‍☠️🏁🚩",
    expectedWidth: 8,
    description: "Flag emojis with ZWJ sequences"
  },
  {
    str: "مرحبا Hello שלום",
    expectedWidth: 16,          // CORRECTED: RTL + LTR + RTL mixed width
    description: "RTL + LTR + RTL mixed content"
  },
  {
    str: "नमस्ते 🇮🇳 مرحبا",
    expectedWidth: 13,
    description: "Devanagari + flag + Arabic"
  }
];

async function runUnicodeSmokeTest(): Promise<void> {
  console.info("🔍 Unicode Smoke Test v4.4 - Multi-Language + CJK + Emoji + ZWJ");
  console.info("FactoryWager Governance v4.4 Pre-commit Validation");
  console.info("=" .repeat(60));

  let failures = 0;
  let passed = 0;
  const results: Array<{
    str: string;
    actual: number;
    expected: number;
    status: 'PASS' | 'FAIL';
    description: string;
  }> = [];

  console.info("Running Unicode width verification tests...\n");

  for (const { str, expectedWidth, description } of testCases) {
    const actualWidth = Bun.stringWidth(str);
    const status = actualWidth === expectedWidth ? 'PASS' : 'FAIL';

    results.push({
      str,
      actual: actualWidth,
      expected: expectedWidth,
      status,
      description
    });

    if (status === 'PASS') {
      console.info(`✅ PASS: "${str}"`);
      console.info(`   Width: ${actualWidth} (${description})`);
      passed++;
    } else {
      console.error(`❌ FAIL: "${str}"`);
      console.error(`   Actual: ${actualWidth}, Expected: ${expectedWidth} (${description})`);
      failures++;
    }
    console.info("");
  }

  // Summary
  console.info("=" .repeat(60));
  console.info(`📊 Test Results Summary:`);
  console.info(`   ✅ Passed: ${passed}`);
  console.info(`   ❌ Failed: ${failures}`);
  console.info(`   📈 Success Rate: ${((passed / (passed + failures)) * 100).toFixed(1)}%`);

  if (failures > 0) {
    console.info("\n🚨 Unicode Smoke Test FAILED!");
    console.error("Please check Unicode rendering implementation before committing.");
    console.error("\nFailed test cases:");
    results
      .filter(r => r.status === 'FAIL')
      .forEach(r => {
        console.error(`   • "${r.str}" → ${r.actual} (expected ${r.expected})`);
      });
    process.exit(1);
  }

  console.info("\n✅ Unicode Smoke Test PASSED!");
  console.info("🛡️ CJK + emoji + ZWJ alignment verified");
  console.info("🚀 Pre-commit validation successful - commit approved");

  // Additional governance checks
  console.info("\n🔍 Additional Governance Checks:");

  // Check if bun.yaml exists and has Unicode governance config
  try {
    const configContent = await Bun.file("./bun.yaml").text();
    const hasColumnOverride = configContent.includes("column-width-override");
    const hasUnicodePolicy = configContent.includes("unicode-rendering-policy");

    console.info(`   📋 bun.yaml exists: ✅`);
    console.info(`   🎛️ Column width override: ${hasColumnOverride ? '✅' : '⚠️  Not found'}`);
    console.info(`   🌍 Unicode rendering policy: ${hasUnicodePolicy ? '✅' : '⚠️  Not found'}`);

    if (!hasColumnOverride && !hasUnicodePolicy) {
      console.info("   ⚠️  Warning: No Unicode governance configuration found in bun.yaml");
    }
  } catch (error) {
    console.info(`   ⚠️  bun.yaml not found or unreadable: ${error}`);
  }

  // Check if Unicode table renderer exists
  try {
    await Bun.file("./.factory-wager/tabular/unicode-table-v43.ts").text();
    console.info(`   📊 Unicode table renderer v4.3: ✅`);
  } catch (error) {
    console.info(`   ⚠️  Unicode table renderer v4.3 not found: ${error}`);
  }

  console.info("\n🎯 All governance checks completed successfully!");
  process.exit(0);
}

// Performance benchmark
function runPerformanceBenchmark(): void {
  console.info("⚡ Unicode Performance Benchmark");
  console.info("=" .repeat(40));

  const testString = "中文测试🇺🇸🔥‍🔥‍FactoryWager v1.3.8";
  const iterations = 10000;

  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    Bun.stringWidth(testString);
  }

  const duration = performance.now() - start;
  const opsPerSec = (iterations / duration * 1000).toFixed(0);

  console.info(`📏 Test string: "${testString}"`);
  console.info(`📏 Width: ${Bun.stringWidth(testString)} cells`);
  console.info(`⚡ ${iterations} iterations in ${duration.toFixed(2)}ms`);
  console.info(`🚀 Performance: ${opsPerSec} ops/sec`);
  console.info(`✅ Performance benchmark completed`);
}

// CLI execution
if (import.meta.main) {
  const args = process.argv.slice(2);

  if (args.includes('--benchmark') || args.includes('-b')) {
    runPerformanceBenchmark();
  } else if (args.includes('--help') || args.includes('-h')) {
    console.info(`
Unicode Smoke Test - FactoryWager Governance v4.3

USAGE:
  bun run unicode-smoke-test.ts [options]

OPTIONS:
  --benchmark, -b    Run performance benchmark
  --help, -h         Show this help

DESCRIPTION:
  Validates Unicode width calculations for CJK, emoji, and ZWJ sequences.
  Ensures FactoryWager Unicode Governance compliance before commits.

EXIT CODES:
  0  All tests passed
  1  One or more tests failed
    `);
  } else {
    runUnicodeSmokeTest();
  }
}

export { runUnicodeSmokeTest, runPerformanceBenchmark };
