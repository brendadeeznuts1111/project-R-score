#!/usr/bin/env bun

/**
 * Complete Bun.stringWidth() API Demonstration
 * Full TypeScript definition coverage with practical vault applications
 */

import chalk from 'chalk';

console.info(chalk.bold.magenta('🎯 Complete Bun.stringWidth() API Demonstration'));
console.info(chalk.gray('Odds Protocol Vault - Full Parameter Coverage'));
console.info(chalk.gray('='.repeat(80)));

// =============================================================================
// TYPESCRIPT DEFINITION REFERENCE
// =============================================================================

console.info(chalk.bold.cyan('\n📋 TypeScript Definition:'));
console.info(chalk.white(`
namespace Bun {
  export function stringWidth(
    input: string,
    options?: {
      countAnsiEscapeCodes?: boolean;  // default: false
      ambiguousIsNarrow?: boolean;     // default: true
    }
  ): number;
}`));

// =============================================================================
// PARAMETER 1: input (string)
// =============================================================================

console.info(chalk.bold.cyan('\n🔸 Parameter 1: input (string)'));
console.info(chalk.gray('The string to measure visual width for'));

const basicInputs = [
    'hello',
    '🚀 rocket',
    'こんにちは',
    'café',
    '👨‍💻 developer',
    'line1\nline2',
    '\t tabbed'
];

console.info(chalk.yellow('\nBasic string measurements:'));
basicInputs.forEach(text => {
    const width = Bun.stringWidth(text);
    console.info(`${chalk.cyan(text.padEnd(20))} → ${chalk.yellow(width.toString().padStart(3))} chars`);
});

// =============================================================================
// PARAMETER 2: options.countAnsiEscapeCodes (boolean)
// =============================================================================

console.info(chalk.bold.cyan('\n🔸 Parameter 2: countAnsiEscapeCodes (boolean)'));
console.info(chalk.gray('Controls whether ANSI escape codes are included in width calculation'));

const ansiExamples = [
    { text: 'hello', colored: chalk.red('hello') },
    { text: 'warning', colored: chalk.yellow('⚠️ warning') },
    { text: 'success', colored: chalk.green('✅ success') },
    { text: 'error', colored: chalk.bgRed(' ERROR ') },
    { text: 'info', colored: chalk.blue('ℹ️ info') }
];

console.info(chalk.yellow('\nANSI escape code comparison:'));
ansiExamples.forEach(example => {
    const withoutAnsi = Bun.stringWidth(example.colored); // default: false
    const withAnsi = Bun.stringWidth(example.colored, { countAnsiEscapeCodes: true });
    const ansiOnly = withAnsi - withoutAnsi;

    console.info(`${chalk.cyan(example.text.padEnd(10))}`);
    console.info(`  Without ANSI: ${chalk.yellow(withoutAnsi.toString().padStart(3))} chars`);
    console.info(`  With ANSI:    ${chalk.yellow(withAnsi.toString().padStart(3))} chars`);
    console.info(`  ANSI codes:   ${chalk.magenta(ansiOnly.toString().padStart(3))} chars`);
    console.info('');
});

// =============================================================================
// PARAMETER 3: options.ambiguousIsNarrow (boolean)
// =============================================================================

console.info(chalk.bold.cyan('\n🔸 Parameter 3: ambiguousIsNarrow (boolean)'));
console.info(chalk.gray('Controls how ambiguous width characters (like some emoji) are counted'));

const ambiguousExamples = [
    '🚀',           // Rocket emoji
    '⚡',           // Lightning
    '🔥',           // Fire
    '💡',           // Light bulb
    '🎯',           // Target
    '⭐',           // Star
    '✨',           // Sparkles
    '🔗',           // Link
    '📊',           // Chart
    '🎪',           // Circus tent
];

console.info(chalk.yellow('\nAmbiguous character width comparison:'));
ambiguousExamples.forEach(char => {
    const narrow = Bun.stringWidth(char, { ambiguousIsNarrow: true });   // default: true
    const wide = Bun.stringWidth(char, { ambiguousIsNarrow: false });
    const difference = wide - narrow;

    console.info(`${chalk.cyan(char.padEnd(4))} → Narrow: ${chalk.yellow(narrow.toString())}, Wide: ${chalk.yellow(wide.toString())}, Diff: ${chalk.magenta(difference.toString())}`);
});

// =============================================================================
// COMBINED OPTIONS DEMONSTRATION
// =============================================================================

console.info(chalk.bold.cyan('\n🎯 Combined Options Demonstration'));

const complexExamples = [
    {
        name: 'Colored Emoji',
        text: chalk.red('🚀 Rocket Launch'),
        description: 'Red text with emoji'
    },
    {
        name: 'Background + Emoji',
        text: chalk.bgBlue(' ⚡ Power '),
        description: 'Blue background with lightning'
    },
    {
        name: 'Mixed Formatting',
        text: `${chalk.green('✅')} ${chalk.yellow('Status:')} ${chalk.cyan('Active')}`,
        description: 'Multiple colored elements'
    },
    {
        name: 'Complex Vault Entry',
        text: `${chalk.bgMagenta(' FILE ')} ${chalk.cyan('document.md')} ${chalk.gray('(2.4 KB)')}`,
        description: 'File status with formatting'
    }
];

console.info(chalk.yellow('\nComplex string measurements with all options:'));
complexExamples.forEach(example => {
    const measurements = [
        { label: 'Default', options: {} },
        { label: 'Count ANSI', options: { countAnsiEscapeCodes: true } },
        { label: 'Wide Emoji', options: { ambiguousIsNarrow: false } },
        { label: 'Both Options', options: { countAnsiEscapeCodes: true, ambiguousIsNarrow: false } }
    ];

    console.info(chalk.bold(`\n${example.name}: ${chalk.gray(example.description)}`));
    measurements.forEach(measurement => {
        const width = Bun.stringWidth(example.text, measurement.options);
        const optionStr = Object.keys(measurement.options).length > 0 ?
            Object.entries(measurement.options).map(([k, v]) => `${k}=${v}`).join(', ') :
            'none';
        console.info(`  ${chalk.cyan(optionStr.padEnd(20))} → ${chalk.yellow(width.toString().padStart(3))} chars`);
    });
});

// =============================================================================
// VAULT-SPECIFIC APPLICATIONS
// =============================================================================

console.info(chalk.bold.cyan('\n📁 Vault-Specific Applications'));

// Sample vault entries with complex formatting
const vaultEntries = [
    {
        name: chalk.cyan('2025-11-18-Daily-Note.md'),
        status: chalk.green('✅ Validated'),
        size: chalk.yellow('2.4 KB'),
        tags: chalk.magenta('#daily #journal'),
        description: chalk.blue('Productivity analysis with detailed metrics')
    },
    {
        name: chalk.red('⚠️ Broken-Link.md'),
        status: chalk.bgRed(' ERROR '),
        size: chalk.yellow('1.2 KB'),
        tags: chalk.magenta('#error #link'),
        description: chalk.hex('#FFA500')('Contains broken internal links')
    },
    {
        name: chalk.green('🚀 Project-Plan.md'),
        status: chalk.yellow('⚠️ Draft'),
        size: chalk.yellow('5.7 KB'),
        tags: chalk.magenta('#project #plan'),
        description: chalk.hex('#9B59B6')('Comprehensive project roadmap')
    }
];

/**
 * Calculate precise table column widths considering all formatting
 */
export function calculatePreciseColumnWidths(data: any[], options: {
    countAnsi?: boolean,
    wideEmoji?: boolean
} = {}): { [key: string]: number } {
    const opts = {
        countAnsi: false,
        wideEmoji: false,
        ...options
    };

    const widths: { [key: string]: number } = {};

    // Find maximum width for each column
    Object.keys(data[0] || {}).forEach(key => {
        widths[key] = data.reduce((max, item) => {
            const itemWidth = Bun.stringWidth(
                item[key] || '',
                {
                    countAnsiEscapeCodes: opts.countAnsi,
                    ambiguousIsNarrow: !opts.wideEmoji
                }
            );
            return Math.max(max, itemWidth);
        }, key.length);
    });

    return widths;
}

/**
 * Create perfectly aligned tables with precise width calculations
 */
export function createPerfectTable(data: any[], columns: string[], options: {
    countAnsi?: boolean,
    wideEmoji?: boolean,
    padding?: number
} = {}): void {
    const opts = { padding: 2, ...options };
    const widths = calculatePreciseColumnWidths(data, options);

    // Apply padding
    Object.keys(widths).forEach(key => {
        widths[key] += opts.padding;
    });

    console.info(chalk.gray(`Table with countAnsi=${opts.countAnsi}, wideEmoji=${opts.wideEmoji}:`));
    Bun.inspect.table(data, columns);

    console.info(chalk.cyan('\nCalculated column widths:'));
    Object.entries(widths).forEach(([col, width]) => {
        console.info(`  ${col}: ${width} chars`);
    });
}

// Demonstrate vault applications
console.info(chalk.yellow('\n📊 Vault table with different width calculation options:'));

// Default options (visual width only)
createPerfectTable(vaultEntries, ['name', 'status', 'size', 'tags'], {
    countAnsi: false,
    wideEmoji: false
});

// Count ANSI codes (for debugging)
createPerfectTable(vaultEntries, ['name', 'status', 'size'], {
    countAnsi: true,
    wideEmoji: false
});

// Wide emoji (for different terminal configurations)
createPerfectTable(vaultEntries, ['name', 'status'], {
    countAnsi: false,
    wideEmoji: true
});

// =============================================================================
// ADVANCED TECHNICAL EXAMPLES
// =============================================================================

console.info(chalk.bold.cyan('\n🔧 Advanced Technical Examples'));

/**
 * Analyze string complexity for optimization
 */
export function analyzeStringComplexity(text: string): {
    visualWidth: number;
    ansiWidth: number;
    ansiOverhead: number;
    hasEmoji: boolean;
    hasUnicode: boolean;
    complexity: 'simple' | 'moderate' | 'complex';
} {
    const visualWidth = Bun.stringWidth(text);
    const ansiWidth = Bun.stringWidth(text, { countAnsiEscapeCodes: true });
    const ansiOverhead = ansiWidth - visualWidth;

    const hasEmoji = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(text);
    const hasUnicode = /[^\x00-\x7F]/.test(text);

    let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
    if (ansiOverhead > 10 || (hasEmoji && hasUnicode)) {
        complexity = 'complex';
    } else if (ansiOverhead > 0 || hasEmoji || hasUnicode) {
        complexity = 'moderate';
    }

    return {
        visualWidth,
        ansiWidth,
        ansiOverhead,
        hasEmoji,
        hasUnicode,
        complexity
    };
}

// Test complexity analysis
const testStrings = [
    'Simple text',
    chalk.red('Colored text'),
    '🚀 With emoji',
    chalk.blue('🔥 Complex 🔥 formatting'),
    'こんにちは Unicode',
    chalk.bgGreen(`${chalk.yellow('⚡')} Mixed ${chalk.cyan('content')}`)
];

console.info(chalk.yellow('\nString complexity analysis:'));
testStrings.forEach(text => {
    const analysis = analyzeStringComplexity(text);
    const complexityColor = analysis.complexity === 'simple' ?
        chalk.green : analysis.complexity === 'moderate' ?
            chalk.yellow : chalk.red;

    console.info(`${chalk.cyan('Text:'.padEnd(8))} ${text}`);
    console.info(`  Visual: ${analysis.visualWidth}, ANSI: ${analysis.ansiWidth}, Overhead: ${analysis.ansiOverhead}`);
    console.info(`  Emoji: ${analysis.hasEmoji}, Unicode: ${analysis.hasUnicode}, Complexity: ${complexityColor(analysis.complexity)}`);
    console.info('');
});

// =============================================================================
// PERFORMANCE COMPARISON
// =============================================================================

console.info(chalk.bold.cyan('\n⚡ Performance Comparison'));

/**
 * Benchmark different stringWidth configurations
 */
export function benchmarkStringWidth(iterations: number = 10000): void {
    const testString = chalk.red('🚀 Performance test with emoji and colors');

    const configs = [
        { name: 'Default', options: {} },
        { name: 'Count ANSI', options: { countAnsiEscapeCodes: true } },
        { name: 'Wide Emoji', options: { ambiguousIsNarrow: false } },
        { name: 'Both Options', options: { countAnsiEscapeCodes: true, ambiguousIsNarrow: false } }
    ];

    console.info(chalk.yellow(`\nBenchmarking ${iterations.toLocaleString()} iterations:`));

    configs.forEach(config => {
        const start = Bun.nanoseconds();

        for (let i = 0; i < iterations; i++) {
            Bun.stringWidth(testString, config.options);
        }

        const end = Bun.nanoseconds();
        const duration = (end - start) / 1_000_000; // Convert to milliseconds

        console.info(`  ${chalk.cyan(config.name.padEnd(15))}: ${chalk.yellow(duration.toFixed(2) + 'ms')}`);
    });
}

// Run performance benchmark
benchmarkStringWidth(50000);

// =============================================================================
// QUICK REFERENCE
// =============================================================================

console.info(chalk.bold.magenta('\n🎯 Complete API Reference'));
console.info(chalk.gray('='.repeat(50)));

console.info(chalk.bold.cyan('\n📋 Function Signature:'));
console.info(chalk.white('Bun.stringWidth(input: string, options?: Options): number'));

console.info(chalk.bold.cyan('\n⚙️ Options Interface:'));
console.info(chalk.gray('interface Options {'));
console.info(chalk.gray('  countAnsiEscapeCodes?: boolean;  // default: false'));
console.info(chalk.gray('  ambiguousIsNarrow?: boolean;     // default: true'));
console.info(chalk.gray('}'));

console.info(chalk.bold.cyan('\n🎯 Use Cases:'));
console.info(chalk.gray('• Visual width measurement (default)'));
console.info(chalk.gray('• ANSI code debugging (countAnsiEscapeCodes: true)'));
console.info(chalk.gray('• Terminal compatibility (ambiguousIsNarrow: false)'));
console.info(chalk.gray('• Complex string analysis (both options)'));
console.info(chalk.gray('• Performance optimization (default fastest)'));

console.info(chalk.bold.cyan('\n✅ Best Practices:'));
console.info(chalk.gray('• Use default for table layout (visual width only)'));
console.info(chalk.gray('• Use countAnsiEscapeCodes for debugging'));
console.info(chalk.gray('• Use ambiguousIsNarrow: false for wide terminals'));
console.info(chalk.gray('• Cache results for repeated measurements'));
console.info(chalk.gray('• Consider performance for large datasets'));

console.info(chalk.bold.green('\n🎉 Complete API Demonstration Finished!'));
