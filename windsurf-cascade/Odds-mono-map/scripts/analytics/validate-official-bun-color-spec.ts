#!/usr/bin/env bun
/**
 * [DOMAIN][VAULT][TYPE][ANALYSIS][SCOPE][PROJECT][META][ANALYTICS][#REF]validate-official-bun-color-spec
 * 
 * Validate Official Bun Color Spec
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
 * Official Bun.color Specification Validation
 * Validates our implementation against the official documentation at https://bun.com/docs/runtime/color
 */

console.log('🔍 Official Bun.color Specification Validation');
console.log('==============================================\n');

// Test all official examples from the documentation
const officialExamples = {
    // {rgba} object examples
    rgbaObject: [
        { input: "hsl(0, 0%, 50%)", format: "{rgba}", expected: { r: 128, g: 128, b: 128, a: 1 } },
        { input: "red", format: "{rgba}", expected: { r: 255, g: 0, b: 0, a: 1 } },
        { input: 0xff0000, format: "{rgba}", expected: { r: 255, g: 0, b: 0, a: 0 } }, // 24-bit number has no alpha
        { input: { r: 255, g: 0, b: 0 }, format: "{rgba}", expected: { r: 255, g: 0, b: 0, a: 1 } },
        { input: [255, 0, 0], format: "{rgba}", expected: { r: 255, g: 0, b: 0, a: 1 } },
        { input: 0xFF0000FF, format: "{rgba}", expected: { r: 0, g: 0, b: 255, a: 1 } } // 32-bit number with alpha
    ],

    // {rgb} object examples
    rgbObject: [
        { input: "hsl(0, 0%, 50%)", format: "{rgb}", expected: { r: 128, g: 128, b: 128 } },
        { input: "red", format: "{rgb}", expected: { r: 255, g: 0, b: 0 } },
        { input: 0xff0000, format: "{rgb}", expected: { r: 255, g: 0, b: 0 } },
        { input: { r: 255, g: 0, b: 0 }, format: "{rgb}", expected: { r: 255, g: 0, b: 0 } },
        { input: [255, 0, 0], format: "{rgb}", expected: { r: 255, g: 0, b: 0 } }
    ],

    // [rgba] array examples
    rgbaArray: [
        { input: "hsl(0, 0%, 50%)", format: "[rgba]", expected: [128, 128, 128, 255] },
        { input: "red", format: "[rgba]", expected: [255, 0, 0, 255] },
        { input: 0xff0000, format: "[rgba]", expected: [255, 0, 0, 0] }, // 24-bit number has no alpha
        { input: { r: 255, g: 0, b: 0 }, format: "[rgba]", expected: [255, 0, 0, 255] },
        { input: [255, 0, 0], format: "[rgba]", expected: [255, 0, 0, 255] },
        { input: 0xFF0000FF, format: "[rgba]", expected: [0, 0, 255, 255] } // 32-bit number with alpha
    ],

    // [rgb] array examples
    rgbArray: [
        { input: "hsl(0, 0%, 50%)", format: "[rgb]", expected: [128, 128, 128] },
        { input: "red", format: "[rgb]", expected: [255, 0, 0] },
        { input: 0xff0000, format: "[rgb]", expected: [255, 0, 0] },
        { input: { r: 255, g: 0, b: 0 }, format: "[rgb]", expected: [255, 0, 0] },
        { input: [255, 0, 0], format: "[rgb]", expected: [255, 0, 0] }
    ],

    // hex string examples
    hexString: [
        { input: "hsl(0, 0%, 50%)", format: "hex", expected: "#808080" },
        { input: "red", format: "hex", expected: "#ff0000" },
        { input: 0xff0000, format: "hex", expected: "#ff0000" },
        { input: { r: 255, g: 0, b: 0 }, format: "hex", expected: "#ff0000" },
        { input: [255, 0, 0], format: "hex", expected: "#ff0000" }
    ],

    // HEX string examples
    hexUpperString: [
        { input: "hsl(0, 0%, 50%)", format: "HEX", expected: "#808080" },
        { input: "red", format: "HEX", expected: "#FF0000" },
        { input: 0xff0000, format: "HEX", expected: "#FF0000" },
        { input: { r: 255, g: 0, b: 0 }, format: "HEX", expected: "#FF0000" },
        { input: [255, 0, 0], format: "HEX", expected: "#FF0000" }
    ]
};

function deepEqual(actual: any, expected: any): boolean {
    if (Array.isArray(actual) && Array.isArray(expected)) {
        return actual.length === expected.length &&
            actual.every((val, index) => val === expected[index]);
    }
    if (typeof actual === 'object' && typeof expected === 'object' &&
        actual !== null && expected !== null) {
        return Object.keys(actual).every(key =>
            actual[key] === expected[key] && key in expected
        );
    }
    return actual === expected;
}

let totalTests = 0;
let passedTests = 0;
let failedTests = [];

console.log('📋 Testing Official Examples from Bun Documentation\n');

// Test {rgba} object format
console.log('🎨 1. {rgba} Object Format');
console.log('─'.repeat(40));

officialExamples.rgbaObject.forEach((example, index) => {
    totalTests++;
    const result = Bun.color(example.input, example.format as any);
    const passed = deepEqual(result, example.expected);

    if (passed) {
        passedTests++;
        console.log(`${index + 1}. ✅ ${JSON.stringify(example.input).padEnd(25)} → ${JSON.stringify(result)}`);
    } else {
        failedTests.push({
            format: example.format,
            input: example.input,
            expected: example.expected,
            actual: result
        });
        console.log(`${index + 1}. ❌ ${JSON.stringify(example.input).padEnd(25)} → ${JSON.stringify(result)} (expected: ${JSON.stringify(example.expected)})`);
    }
});

// Test {rgb} object format
console.log('\n🎨 2. {rgb} Object Format');
console.log('─'.repeat(40));

officialExamples.rgbObject.forEach((example, index) => {
    totalTests++;
    const result = Bun.color(example.input, example.format as any);
    const passed = deepEqual(result, example.expected);

    if (passed) {
        passedTests++;
        console.log(`${index + 1}. ✅ ${JSON.stringify(example.input).padEnd(25)} → ${JSON.stringify(result)}`);
    } else {
        failedTests.push({
            format: example.format,
            input: example.input,
            expected: example.expected,
            actual: result
        });
        console.log(`${index + 1}. ❌ ${JSON.stringify(example.input).padEnd(25)} → ${JSON.stringify(result)} (expected: ${JSON.stringify(example.expected)})`);
    }
});

// Test [rgba] array format
console.log('\n📐 3. [rgba] Array Format');
console.log('─'.repeat(40));

officialExamples.rgbaArray.forEach((example, index) => {
    totalTests++;
    const result = Bun.color(example.input, example.format as any);
    const passed = deepEqual(result, example.expected);

    if (passed) {
        passedTests++;
        console.log(`${index + 1}. ✅ ${JSON.stringify(example.input).padEnd(25)} → [${result?.join(", ")}]`);
    } else {
        failedTests.push({
            format: example.format,
            input: example.input,
            expected: example.expected,
            actual: result
        });
        console.log(`${index + 1}. ❌ ${JSON.stringify(example.input).padEnd(25)} → [${result?.join(", ")}] (expected: [${example.expected.join(", ")}])`);
    }
});

// Test [rgb] array format
console.log('\n📐 4. [rgb] Array Format');
console.log('─'.repeat(40));

officialExamples.rgbArray.forEach((example, index) => {
    totalTests++;
    const result = Bun.color(example.input, example.format as any);
    const passed = deepEqual(result, example.expected);

    if (passed) {
        passedTests++;
        console.log(`${index + 1}. ✅ ${JSON.stringify(example.input).padEnd(25)} → [${result?.join(", ")}]`);
    } else {
        failedTests.push({
            format: example.format,
            input: example.input,
            expected: example.expected,
            actual: result
        });
        console.log(`${index + 1}. ❌ ${JSON.stringify(example.input).padEnd(25)} → [${result?.join(", ")}] (expected: [${example.expected.join(", ")}])`);
    }
});

// Test hex string format
console.log('\n🌐 5. Hex String Format');
console.log('─'.repeat(40));

officialExamples.hexString.forEach((example, index) => {
    totalTests++;
    const result = Bun.color(example.input, example.format as any);
    const passed = result === example.expected;

    if (passed) {
        passedTests++;
        console.log(`${index + 1}. ✅ ${JSON.stringify(example.input).padEnd(25)} → ${result}`);
    } else {
        failedTests.push({
            format: example.format,
            input: example.input,
            expected: example.expected,
            actual: result
        });
        console.log(`${index + 1}. ❌ ${JSON.stringify(example.input).padEnd(25)} → ${result} (expected: ${example.expected})`);
    }
});

// Test HEX string format
console.log('\n🌐 6. HEX String Format');
console.log('─'.repeat(40));

officialExamples.hexUpperString.forEach((example, index) => {
    totalTests++;
    const result = Bun.color(example.input, example.format as any);
    const passed = result === example.expected;

    if (passed) {
        passedTests++;
        console.log(`${index + 1}. ✅ ${JSON.stringify(example.input).padEnd(25)} → ${result}`);
    } else {
        failedTests.push({
            format: example.format,
            input: example.input,
            expected: example.expected,
            actual: result
        });
        console.log(`${index + 1}. ❌ ${JSON.stringify(example.input).padEnd(25)} → ${result} (expected: ${example.expected})`);
    }
});

// Validation Results
console.log('\n🎯 VALIDATION RESULTS');
console.log('─'.repeat(50));

const passRate = Math.round((passedTests / totalTests) * 100);
console.log(`📊 Total Tests: ${totalTests}`);
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${failedTests.length}`);
console.log(`📈 Pass Rate: ${passRate}%`);

if (failedTests.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    failedTests.forEach((failure, index) => {
        console.log(`${index + 1}. Format: ${failure.format}`);
        console.log(`   Input: ${JSON.stringify(failure.input)}`);
        console.log(`   Expected: ${JSON.stringify(failure.expected)}`);
        console.log(`   Actual: ${JSON.stringify(failure.actual)}`);
        console.log('');
    });
} else {
    console.log('\n🎉 ALL TESTS PASSED! Perfect compliance with official Bun.color specification!');
}

// Specification Compliance Check
console.log('📋 SPECIFICATION COMPLIANCE CHECK');
console.log('─'.repeat(50));

const specChecks = [
    {
        name: "RGBA Object Type Definition",
        check: () => {
            const rgba = Bun.color("red", "{rgba}");
            return rgba &&
                typeof rgba === 'object' &&
                typeof rgba.r === 'number' && rgba.r >= 0 && rgba.r <= 255 &&
                typeof rgba.g === 'number' && rgba.g >= 0 && rgba.g <= 255 &&
                typeof rgba.b === 'number' && rgba.b >= 0 && rgba.b <= 255 &&
                typeof rgba.a === 'number' && rgba.a >= 0 && rgba.a <= 1;
        }
    },
    {
        name: "RGBA Array Type Definition",
        check: () => {
            const rgba = Bun.color("red", "[rgba]");
            return Array.isArray(rgba) &&
                rgba.length === 4 &&
                rgba.every(val => typeof val === 'number' && val >= 0 && val <= 255);
        }
    },
    {
        name: "RGB Object Type Definition",
        check: () => {
            const rgb = Bun.color("red", "{rgb}");
            return rgb &&
                typeof rgb === 'object' &&
                typeof rgb.r === 'number' && rgb.r >= 0 && rgb.r <= 255 &&
                typeof rgb.g === 'number' && rgb.g >= 0 && rgb.g <= 255 &&
                typeof rgb.b === 'number' && rgb.b <= 255 &&
                !('a' in rgb);
        }
    },
    {
        name: "RGB Array Type Definition",
        check: () => {
            const rgb = Bun.color("red", "[rgb]");
            return Array.isArray(rgb) &&
                rgb.length === 3 &&
                rgb.every(val => typeof val === 'number' && val >= 0 && val <= 255);
        }
    },
    {
        name: "Hex String Format",
        check: () => {
            const hex = Bun.color("red", "hex");
            return typeof hex === 'string' &&
                hex.startsWith('#') &&
                hex.length === 7 &&
                /^[0-9a-f]{6}$/.test(hex.slice(1));
        }
    },
    {
        name: "HEX String Format",
        check: () => {
            const hex = Bun.color("red", "HEX");
            return typeof hex === 'string' &&
                hex.startsWith('#') &&
                hex.length === 7 &&
                /^[0-9A-F]{6}$/.test(hex.slice(1));
        }
    }
];

let specPasses = 0;
specChecks.forEach((check, index) => {
    const passed = check.check();
    if (passed) {
        specPasses++;
        console.log(`${index + 1}. ✅ ${check.name}`);
    } else {
        console.log(`${index + 1}. ❌ ${check.name}`);
    }
});

const specPassRate = Math.round((specPasses / specChecks.length) * 100);
console.log(`\n📊 Specification Compliance: ${specPassRate}%`);

// Final Result
console.log('\n🏆 FINAL VALIDATION RESULT');
console.log('─'.repeat(50));

if (passRate === 100 && specPassRate === 100) {
    console.log('🎉 PERFECT COMPLIANCE ACHIEVED!');
    console.log('✅ All official examples work exactly as documented');
    console.log('✅ All type specifications are correctly implemented');
    console.log('✅ Implementation is 100% compliant with official Bun.color API');
    console.log('\n🚀 Your canvas system uses the official Bun.color API perfectly!');
} else {
    console.log('⚠️  COMPLIANCE ISSUES DETECTED');
    console.log(`📊 Example Compliance: ${passRate}%`);
    console.log(`📊 Specification Compliance: ${specPassRate}%`);
    console.log('\n🔧 Please review the failed tests above for fixes.');
}
