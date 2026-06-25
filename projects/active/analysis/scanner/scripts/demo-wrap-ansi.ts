#!/usr/bin/env bun
/**
 * Demo: Bun.wrapAnsi() for ANSI-aware text wrapping
 *
 * Demonstrates the new Bun.wrapAnsi() API for wrapping colored/styled text
 * while preserving ANSI escape codes across line breaks.
 *
 * Usage: bun scripts/demo-wrap-ansi.ts [columns]
 */

const columns = process.argv[2] ? parseInt(process.argv[2]) : 40;

// Example 1: Colored text wrapping
console.info('\n📝 Example 1: Colored text wrapping\n');
const redText =
	'\x1b[31mThis is a long red text that needs wrapping to demonstrate how Bun.wrapAnsi preserves ANSI escape codes across line breaks\x1b[0m';
const wrapped1 = Bun.wrapAnsi(redText, columns);
console.info('Original (no wrap):');
console.info(redText);
console.info(`\nWrapped at ${columns} columns:`);
console.info(wrapped1);

// Example 2: Multiple colors
console.info('\n\n📝 Example 2: Multiple colors\n');
const multiColor =
	'\x1b[32mGreen text\x1b[0m and \x1b[34mblue text\x1b[0m that needs to wrap because it is very long and contains multiple ANSI codes';
const wrapped2 = Bun.wrapAnsi(multiColor, columns);
console.info('Original:');
console.info(multiColor);
console.info(`\nWrapped at ${columns} columns:`);
console.info(wrapped2);

// Example 3: Bold and colored
console.info('\n\n📝 Example 3: Bold and colored\n');
const boldColored =
	'\x1b[1m\x1b[33mThis is bold yellow text that demonstrates how styles are preserved when wrapping long text that exceeds the column width\x1b[0m';
const wrapped3 = Bun.wrapAnsi(boldColored, columns);
console.info('Original:');
console.info(boldColored);
console.info(`\nWrapped at ${columns} columns:`);
console.info(wrapped3);

// Example 4: With options
console.info('\n\n📝 Example 4: Hard wrap (break long words)\n');
const longWord = '\x1b[36mThisIsAVeryLongWordThatCannotBeBroken\x1b[0m';
const wrapped4a = Bun.wrapAnsi(longWord, columns, {hard: false}); // Default: won't break
const wrapped4b = Bun.wrapAnsi(longWord, columns, {hard: true}); // Will break long words
console.info('Original:');
console.info(longWord);
console.info(`\nWrapped (hard: false, default):`);
console.info(wrapped4a);
console.info(`\nWrapped (hard: true):`);
console.info(wrapped4b);

// Example 5: OSC 8 hyperlinks (if supported)
console.info('\n\n📝 Example 5: Hyperlinks\n');
const hyperlink = '\x1b]8;;https://bun.sh\x1b\\Bun website\x1b]8;;\x1b\\ is a great resource';
const wrapped5 = Bun.wrapAnsi(hyperlink, columns);
console.info('Original:');
console.info(hyperlink);
console.info(`\nWrapped at ${columns} columns:`);
console.info(wrapped5);

// Example 6: Unicode and emoji
console.info('\n\n📝 Example 6: Unicode and emoji\n');
const unicode = '\x1b[35m🚀 Bun is fast! 日本語も対応しています。\x1b[0m';
const wrapped6 = Bun.wrapAnsi(unicode, columns);
console.info('Original:');
console.info(unicode);
console.info(`\nWrapped at ${columns} columns:`);
console.info(wrapped6);

// Example 7: Performance comparison info
console.info('\n\n📊 Performance\n');
console.info('Bun.wrapAnsi() is 33-88x faster than wrap-ansi npm package:');
console.info('  • Short text (45 chars): 37x faster');
console.info('  • Medium text (810 chars): 50x faster');
console.info('  • Long text (8100 chars): 68x faster');
console.info('  • Hard wrap colored: 50x faster');
console.info('  • No trim long: 88x faster');

console.info('\n✅ Demo complete!\n');
