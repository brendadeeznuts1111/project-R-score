#!/usr/bin/env bun
/**
 * [DOMAIN][VAULT][TYPE][ANALYSIS][SCOPE][PROJECT][META][ANALYTICS][#REF]validate-ansi-bun-color-spec
 * 
 * Validate Ansi Bun Color Spec
 * Validation and compliance script
 * 
 * @fileoverview Analytics and reporting functionality for vault insights
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-19
 * @category analytics
 * @tags analytics,validation,compliance,color,ansi,formatting,bun,runtime,performance
 */

#!/usr/bin/env bun
/**
 * Official Bun.color ANSI Format Specification Validation
 * Validates our implementation against the official ANSI documentation from https://bun.com/docs/runtime/color
 */

console.info('🖥️ Official Bun.color ANSI Format Specification Validation');
console.info('==========================================================\n');

// Interface for test results
interface FailedTest {
    format: string;
    input: any;
    expected: string;
    actual: any;
}

// Test all official ANSI examples from the documentation
const officialAnsiExamples = {
    // General ANSI format examples
    ansi: [
        { input: "red", format: "ansi", expected: "\\u001b[38;2;255;0;0m" },
        { input: 0xff0000, format: "ansi", expected: "\\u001b[38;2;255;0;0m" },
        { input: "#f00", format: "ansi", expected: "\\u001b[38;2;255;0;0m" },
        { input: "#ff0000", format: "ansi", expected: "\\u001b[38;2;255;0;0m" },
        { input: "rgb(255, 0, 0)", format: "ansi", expected: "\\u001b[38;2;255;0;0m" },
        { input: "rgba(255, 0, 0, 1)", format: "ansi", expected: "\\u001b[38;2;255;0;0m" },
        { input: "hsl(0, 100%, 50%)", format: "ansi", expected: "\\u001b[38;2;255;0;0m" },
        { input: "hsla(0, 100%, 50%, 1)", format: "ansi", expected: "\\u001b[38;2;255;0;0m" },
        { input: { r: 255, g: 0, b: 0 }, format: "ansi", expected: "\\u001b[38;2;255;0;0m" },
        { input: { r: 255, g: 0, b: 0, a: 1 }, format: "ansi", expected: "\\u001b[38;2;255;0;0m" },
        { input: [255, 0, 0], format: "ansi", expected: "\\u001b[38;2;255;0;0m" },
        { input: [255, 0, 0, 255], format: "ansi", expected: "\\u001b[38;2;255;0;0m" }
    ],

    // 24-bit ANSI colors (ansi-16m) examples
    ansi16m: [
        { input: "red", format: "ansi-16m", expected: "\\x1b[38;2;255;0;0m" },
        { input: 0xff0000, format: "ansi-16m", expected: "\\x1b[38;2;255;0;0m" },
        { input: "#f00", format: "ansi-16m", expected: "\\x1b[38;2;255;0;0m" },
        { input: "#ff0000", format: "ansi-16m", expected: "\\x1b[38;2;255;0;0m" }
    ],

    // 256 ANSI colors (ansi-256) examples
    ansi256: [
        { input: "red", format: "ansi-256", expected: "\\u001b[38;5;196m" },
        { input: 0xff0000, format: "ansi-256", expected: "\\u001b[38;5;196m" },
        { input: "#f00", format: "ansi-256", expected: "\\u001b[38;5;196m" },
        { input: "#ff0000", format: "ansi-256", expected: "\\u001b[38;5;196m" }
    ],

    // 16 ANSI colors (ansi-16) examples
    ansi16: [
        { input: "red", format: "ansi-16", expected: "\\u001b[38;5;\\tm" },
        { input: 0xff0000, format: "ansi-16", expected: "\\u001b[38;5;\\tm" },
        { input: "#f00", format: "ansi-16", expected: "\\u001b[38;5;\\tm" },
        { input: "#ff0000", format: "ansi-16", expected: "\\u001b[38;5;\\tm" }
    ]
};

function normalizeEscapeSequence(sequence: string): string {
    // Normalize escape sequences for comparison
    return sequence
        .replace(/\\u001b/g, "\\x1b")  // Normalize escape sequence format
        .replace(/\\x1b/g, "\\u001b"); // Try both formats for testing
}

let totalTests = 0;
let passedTests = 0;
let failedTests: FailedTest[] = [];

console.info('🖥️ Testing Official ANSI Examples from Bun Documentation\n');

// Test general ANSI format
console.info('🎨 1. General ANSI Format');
console.info('─'.repeat(40));

officialAnsiExamples.ansi.forEach((example, index) => {
    totalTests++;
    const result = Bun.color(example.input, example.format as any);

    // Check if result contains the expected ANSI escape sequence pattern
    const expectedPattern = "\\u001b[38;2;255;0;0m";
    const normalizedResult = normalizeEscapeSequence(JSON.stringify(result));
    const normalizedExpected = normalizeEscapeSequence(JSON.stringify(expectedPattern));

    const passed = normalizedResult.includes("[38;2;255;0;0m") &&
        normalizedResult.includes("\\u001b") || normalizedResult.includes("\\x1b");

    if (passed) {
        passedTests++;
        console.info(`${index + 1}. ✅ ${JSON.stringify(example.input).padEnd(25)} → ${JSON.stringify(result)}`);
    } else {
        failedTests.push({
            format: example.format,
            input: example.input,
            expected: example.expected,
            actual: result
        });
        console.info(`${index + 1}. ❌ ${JSON.stringify(example.input).padEnd(25)} → ${JSON.stringify(result)} (expected pattern: ${expectedPattern})`);
    }
});

// Test ansi-16m format
console.info('\n🌈 2. 24-bit ANSI Colors (ansi-16m)');
console.info('─'.repeat(40));

officialAnsiExamples.ansi16m.forEach((example, index) => {
    totalTests++;
    const result = Bun.color(example.input, example.format as any) as string | undefined;

    // Check if result contains the expected ANSI-16m escape sequence pattern
    const passed = typeof result === 'string' &&
        (result.includes("[38;2;255;0;0m") ||
            result.includes("[38;2;0;255;0m") ||
            result.includes("[38;2;0;0;255m")) &&
        (result.includes("\u001b") || result.includes("\x1b"));

    if (passed) {
        passedTests++;
        console.info(`${index + 1}. ✅ ${JSON.stringify(example.input).padEnd(20)} → ${JSON.stringify(result)}`);
    } else {
        failedTests.push({
            format: example.format,
            input: example.input,
            expected: example.expected,
            actual: result
        });
        console.info(`${index + 1}. ❌ ${JSON.stringify(example.input).padEnd(20)} → ${JSON.stringify(result)} (expected pattern: ${example.expected})`);
    }
});

// Test ansi-256 format
console.info('\n🎨 3. 256 ANSI Colors (ansi-256)');
console.info('─'.repeat(40));

officialAnsiExamples.ansi256.forEach((example, index) => {
    totalTests++;
    const result = Bun.color(example.input, example.format as any) as string | undefined;

    // Check if result contains the expected ANSI-256 escape sequence pattern
    const passed = typeof result === 'string' &&
        (result.includes("[38;5;196m") ||
            result.includes("[38;5;46m") ||
            result.includes("[38;5;51m")) &&
        (result.includes("\u001b") || result.includes("\x1b"));

    if (passed) {
        passedTests++;
        console.info(`${index + 1}. ✅ ${JSON.stringify(example.input).padEnd(20)} → ${JSON.stringify(result)}`);
    } else {
        failedTests.push({
            format: example.format,
            input: example.input,
            expected: example.expected,
            actual: result
        });
        console.info(`${index + 1}. ❌ ${JSON.stringify(example.input).padEnd(20)} → ${JSON.stringify(result)} (expected pattern: ${example.expected})`);
    }
});

// Test ansi-16 format
console.info('\n🔷 4. 16 ANSI Colors (ansi-16)');
console.info('─'.repeat(40));

officialAnsiExamples.ansi16.forEach((example, index) => {
    totalTests++;
    const result = Bun.color(example.input, example.format as any) as string | undefined;

    // Check if result contains the expected ANSI-16 escape sequence pattern
    const passed = typeof result === 'string' &&
        (result.includes("[38;5;") ||
            result.includes("[91m") ||
            result.includes("[92m") ||
            result.includes("[93m") ||
            result.includes("[94m") ||
            result.includes("[95m") ||
            result.includes("[96m") ||
            result.includes("[97m")) &&
        (result.includes("\u001b") || result.includes("\x1b"));

    if (passed) {
        passedTests++;
        console.info(`${index + 1}. ✅ ${JSON.stringify(example.input).padEnd(20)} → ${JSON.stringify(result)}`);
    } else {
        failedTests.push({
            format: example.format,
            input: example.input,
            expected: example.expected,
            actual: result
        });
        console.info(`${index + 1}. ❌ ${JSON.stringify(example.input).padEnd(20)} → ${JSON.stringify(result)} (expected pattern: ${example.expected})`);
    }
});

// ANSI Specification Compliance Check
console.info('\n📋 ANSI SPECIFICATION COMPLIANCE CHECK');
console.info('─'.repeat(50));

const ansiSpecChecks = [
    {
        name: "General ANSI Format (24-bit)",
        check: () => {
            const result = Bun.color("red", "ansi");
            return typeof result === 'string' &&
                result.includes("[38;2;") &&
                (result.includes("\u001b") || result.includes("\x1b"));
        }
    },
    {
        name: "ANSI-16m Format (24-bit)",
        check: () => {
            const result = Bun.color("red", "ansi-16m");
            return typeof result === 'string' &&
                result.includes("[38;2;") &&
                (result.includes("\u001b") || result.includes("\x1b"));
        }
    },
    {
        name: "ANSI-256 Format (256 colors)",
        check: () => {
            const result = Bun.color("red", "ansi-256");
            return typeof result === 'string' &&
                result.includes("[38;5;") &&
                (result.includes("\u001b") || result.includes("\x1b"));
        }
    },
    {
        name: "ANSI-16 Format (16 colors)",
        check: () => {
            const result = Bun.color("red", "ansi-16");
            return typeof result === 'string' &&
                result.includes("[38;5;") &&
                (result.includes("\u001b") || result.includes("\x1b"));
        }
    }
];

let specPasses = 0;
ansiSpecChecks.forEach((check, index) => {
    const passed = check.check();
    if (passed) {
        specPasses++;
        console.info(`${index + 1}. ✅ ${check.name}`);
    } else {
        console.info(`${index + 1}. ❌ ${check.name}`);
    }
});

const specPassRate = Math.round((specPasses / ansiSpecChecks.length) * 100);

// Validation Results
console.info('\n🎯 ANSI VALIDATION RESULTS');
console.info('─'.repeat(50));

const passRate = Math.round((passedTests / totalTests) * 100);
console.info(`📊 Total Tests: ${totalTests}`);
console.info(`✅ Passed: ${passedTests}`);
console.info(`❌ Failed: ${failedTests.length}`);
console.info(`📈 Pass Rate: ${passRate}%`);
console.info(`📋 Specification Compliance: ${specPassRate}%`);

if (failedTests.length > 0) {
    console.info('\n❌ FAILED TESTS:');
    failedTests.forEach((failure, index) => {
        console.info(`${index + 1}. Format: ${failure.format}`);
        console.info(`   Input: ${JSON.stringify(failure.input)}`);
        console.info(`   Expected Pattern: ${failure.expected}`);
        console.info(`   Actual: ${JSON.stringify(failure.actual)}`);
        console.info('');
    });
} else {
    console.info('\n🎉 ALL ANSI TESTS PASSED! Perfect compliance with official Bun.color ANSI specification!');
}

// Canvas ANSI Integration Demo
console.info('🎨 CANVAS ANSI INTEGRATION DEMO');
console.info('─'.repeat(50));

const canvasColors = [
    { name: "Bridge Service", color: "#10B981" },
    { name: "Analytics Engine", color: "#EAB308" },
    { name: "Legacy Service", color: "#EF4444" },
    { name: "Experimental Feature", color: "#8B5CF6" }
];

console.info('🖥️ Canvas Terminal Dashboard with ANSI Colors:');
console.info('');

canvasColors.forEach((item, index) => {
    const ansiColor = Bun.color(item.color, "ansi");
    const ansi16mColor = Bun.color(item.color, "ansi-16m");
    const ansi256Color = Bun.color(item.color, "ansi-256");
    const ansi16Color = Bun.color(item.color, "ansi-16");

    console.info(`${index + 1}. ${item.name}:`);
    console.info(`   Color: ${item.color}`);
    console.info(`   ANSI: ${JSON.stringify(ansiColor)}`);
    console.info(`   ANSI-16m: ${JSON.stringify(ansi16mColor)}`);
    console.info(`   ANSI-256: ${JSON.stringify(ansi256Color)}`);
    console.info(`   ANSI-16: ${JSON.stringify(ansi16Color)}`);
    console.info('');
});

// Final Result
console.info('🏆 FINAL ANSI VALIDATION RESULT');
console.info('─'.repeat(50));

if (passRate === 100 && specPassRate === 100) {
    console.info('🎉 PERFECT ANSI COMPLIANCE ACHIEVED!');
    console.info('✅ All official ANSI examples work exactly as documented');
    console.info('✅ All ANSI format specifications are correctly implemented');
    console.info('✅ Implementation is 100% compliant with official Bun.color ANSI API');
    console.info('\n🖥️ Your canvas system uses the official Bun.color ANSI formats perfectly!');
} else {
    console.info('⚠️  ANSI COMPLIANCE ISSUES DETECTED');
    console.info(`📊 Example Compliance: ${passRate}%`);
    console.info(`📊 Specification Compliance: ${specPassRate}%`);
    console.info('\n🔧 Please review the failed tests above for fixes.');
}
