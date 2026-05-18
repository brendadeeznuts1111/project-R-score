#!/usr/bin/env bun

/**
 * Bun.stringWidth() Enhanced Custom Inspection Integration
 * Properly using countAnsiEscapeCodes: true for accurate width management
 */

import chalk from 'chalk';

console.info(chalk.bold.magenta('🎯 Enhanced Custom Inspection with Bun.stringWidth()'));
console.info(chalk.gray('Using countAnsiEscapeCodes: true for accurate width management'));
console.info(chalk.gray('='.repeat(80)));

// =============================================================================
// DEMONSTRATING Bun.stringWidth() WITH ANSI CODES
// =============================================================================

console.info(chalk.bold.cyan('\n📋 Bun.stringWidth() with ANSI Escape Codes'));

console.info(chalk.yellow('\n🔸 Width Measurement Examples:'));
console.info(chalk.white(`
// Plain text
Bun.stringWidth("hello") // => 5

// ANSI-colored text (without counting codes)
Bun.stringWidth("\\u001b[31mhello\\u001b[0m") // => 5

// ANSI-colored text (counting codes) - THE RIGHT WAY!
Bun.stringWidth("\\u001b[31mhello\\u001b[0m", { countAnsiEscapeCodes: true }) // => 12
`));

// Demonstrate the width measurements
const plainText = "hello";
const coloredText = "\u001b[31mhello\u001b[0m";

console.info(chalk.green('\n📊 Width Measurements:'));
console.info(chalk.gray(`Plain text: "${plainText}"`));
console.info(chalk.cyan(`  Width: ${Bun.stringWidth(plainText)} characters`));

console.info(chalk.gray(`Colored text: "${coloredText}"`));
console.info(chalk.cyan(`  Visual width: ${Bun.stringWidth(coloredText)} characters`));
console.info(chalk.cyan(`  Total width (with ANSI): ${Bun.stringWidth(coloredText, { countAnsiEscapeCodes: true })} characters`));
console.info(chalk.yellow(`  ANSI overhead: ${Bun.stringWidth(coloredText, { countAnsiEscapeCodes: true }) - Bun.stringWidth(coloredText)} characters`));

// =============================================================================
// ENHANCED VAULT FILE WITH PROPER WIDTH MANAGEMENT
// =============================================================================

console.info(chalk.bold.cyan('\n🏗️  Enhanced Vault File with Proper Width Management'));

console.info(chalk.yellow('\n🔸 Width-Aware Custom Inspection:'));
console.info(chalk.white(`
class EnhancedVaultFile {
  [Bun.inspect.custom]() {
    const nameDisplay = chalk.cyan(this.name);
    const pathDisplay = chalk.gray(\` (\${this.path})\`);
    const sizeDisplay = chalk.yellow(\` \${this.size}\`);
    const statusDisplay = this.hasFrontmatter ? chalk.green(' ✅') : chalk.red(' ❌');
    
    const fullDisplay = nameDisplay + pathDisplay + sizeDisplay + statusDisplay;
    const visualWidth = Bun.stringWidth(fullDisplay);
    const totalWidth = Bun.stringWidth(fullDisplay, { countAnsiEscapeCodes: true });
    
    return fullDisplay + 
           chalk.gray(\` [vw:\${visualWidth}, tw:\${totalWidth}]\`);
  }
}
`));

// Enhanced VaultFile implementation with width tracking
class EnhancedVaultFile {
    constructor(data) {
        this.path = data.path;
        this.name = data.name;
        this.size = data.size;
        this.modified = data.modified;
        this.tags = data.tags;
        this.hasFrontmatter = data.hasFrontmatter;
    }

    [Bun.inspect.custom]() {
        const nameDisplay = chalk.cyan(this.name);
        const pathDisplay = chalk.gray(` (${this.path})`);
        const sizeDisplay = chalk.yellow(` ${this.size}`);
        const statusDisplay = this.hasFrontmatter ? chalk.green(' ✅') : chalk.red(' ❌');

        const fullDisplay = nameDisplay + pathDisplay + sizeDisplay + statusDisplay;
        const visualWidth = Bun.stringWidth(fullDisplay);
        const totalWidth = Bun.stringWidth(fullDisplay, { countAnsiEscapeCodes: true });

        return fullDisplay +
            chalk.gray(` [vw:${visualWidth}, tw:${totalWidth}]`);
    }

    // Width-aware table formatting
    toTableFormat() {
        return {
            name: chalk.cyan(this.name),
            path: chalk.gray(this.path),
            size: chalk.yellow(this.size),
            visualWidth: Bun.stringWidth(this.name),
            totalWidth: Bun.stringWidth(chalk.cyan(this.name), { countAnsiEscapeCodes: true }),
            status: this.hasFrontmatter ? chalk.green('✅') : chalk.red('❌')
        };
    }
}

// Create enhanced vault files
const enhancedVaultFiles = [
    new EnhancedVaultFile({
        path: '01 - Daily Notes/2025-11-18.md',
        name: '2025-11-18',
        size: '2.4 KB',
        modified: '2025-11-18',
        tags: ['daily', 'journal'],
        hasFrontmatter: true
    }),
    new EnhancedVaultFile({
        path: '02 - Architecture/OddsTick.md',
        name: 'OddsTick',
        size: '5.0 KB',
        modified: '2025-11-17',
        tags: ['architecture', 'core'],
        hasFrontmatter: true
    }),
    new EnhancedVaultFile({
        path: '03 - Development/very-long-filename-that-causes-width-issues.md',
        name: 'very-long-filename-that-causes-width-issues',
        size: '1.2 KB',
        modified: '2025-11-16',
        tags: ['development'],
        hasFrontmatter: false
    })
];

console.info(chalk.green('\n📋 Enhanced Custom Inspection with Width Tracking:'));
enhancedVaultFiles.forEach(file => console.info(file));

console.info(chalk.yellow('\n📊 Width-Aware Table Format:'));
Bun.inspect.table(
    enhancedVaultFiles.map(file => file.toTableFormat()),
    ['name', 'path', 'size', 'visualWidth', 'totalWidth', 'status'],
    { maxEntryWidth: 40, compact: true }
);

// =============================================================================
// WIDTH-AWARE VALIDATION ISSUE CLASS
// =============================================================================

console.info(chalk.bold.cyan('\n🔗 Width-Aware Validation Issue Class'));

console.info(chalk.yellow('\n🔸 Validation Issue with Width Management:'));
console.info(chalk.white(`
class WidthAwareValidationIssue {
  [Bun.inspect.custom]() {
    const typeDisplay = this.type === 'error' ? 
      chalk.bgRed(' ERROR ') : 
      this.type === 'warning' ? 
        chalk.bgYellow(' WARNING ') : 
        chalk.bgBlue(' INFO ');
    
    const fileDisplay = chalk.cyan(this.file);
    const lineDisplay = chalk.gray(\`:\${this.line}\`);
    const messageDisplay = chalk.white(\` - \${this.message}\`);
    
    const fullDisplay = typeDisplay + fileDisplay + lineDisplay + messageDisplay;
    const visualWidth = Bun.stringWidth(fullDisplay);
    const totalWidth = Bun.stringWidth(fullDisplay, { countAnsiEscapeCodes: true });
    
    return fullDisplay + 
           chalk.magenta(\` [vw:\${visualWidth}, tw:\${totalWidth}]\`);
  }
}
`));

// Width-aware ValidationIssue implementation
class WidthAwareValidationIssue {
    constructor(data) {
        this.type = data.type;
        this.ruleCategory = data.ruleCategory;
        this.file = data.file;
        this.line = data.line;
        this.message = data.message;
        this.suggestion = data.suggestion;
    }

    [Bun.inspect.custom]() {
        const typeDisplay = this.type === 'error' ?
            chalk.bgRed(' ERROR ') :
            this.type === 'warning' ?
                chalk.bgYellow(' WARNING ') :
                chalk.bgBlue(' INFO ');

        const fileDisplay = chalk.cyan(this.file);
        const lineDisplay = chalk.gray(`:${this.line}`);
        const messageDisplay = chalk.white(` - ${this.message}`);

        const fullDisplay = typeDisplay + fileDisplay + lineDisplay + messageDisplay;
        const visualWidth = Bun.stringWidth(fullDisplay);
        const totalWidth = Bun.stringWidth(fullDisplay, { countAnsiEscapeCodes: true });

        return fullDisplay +
            chalk.magenta(` [vw:${visualWidth}, tw:${totalWidth}]`);
    }

    // Width-aware table formatting
    toTableFormat() {
        const typeDisplay = this.type === 'error' ? chalk.bgRed(' ERROR ') :
            this.type === 'warning' ? chalk.bgYellow(' WARNING ') :
                chalk.bgBlue(' INFO ');

        const fileDisplay = chalk.cyan(this.file);
        const fullDisplay = typeDisplay + fileDisplay;

        return {
            type: typeDisplay,
            file: fileDisplay,
            line: chalk.gray(this.line.toString()),
            message: this.message,
            visualWidth: Bun.stringWidth(fullDisplay),
            totalWidth: Bun.stringWidth(fullDisplay, { countAnsiEscapeCodes: true }),
            ansiOverhead: Bun.stringWidth(fullDisplay, { countAnsiEscapeCodes: true }) - Bun.stringWidth(fullDisplay)
        };
    }
}

// Create width-aware validation issues
const widthAwareIssues = [
    new WidthAwareValidationIssue({
        type: 'error',
        ruleCategory: 'formatting',
        file: 'document.md',
        line: 1,
        message: 'Missing H1 heading',
        suggestion: 'Add # heading at top'
    }),
    new WidthAwareValidationIssue({
        type: 'warning',
        ruleCategory: 'structure',
        file: 'very-long-filename-that-causes-display-issues.md',
        line: 42,
        message: 'Line too long',
        suggestion: 'Break line at 80 chars'
    }),
    new WidthAwareValidationIssue({
        type: 'info',
        ruleCategory: 'metadata',
        file: 'draft.md',
        line: 5,
        message: 'No tags found',
        suggestion: 'Add relevant tags'
    })
];

console.info(chalk.green('\n📋 Width-Aware Custom Inspection:'));
widthAwareIssues.forEach(issue => console.info(issue));

console.info(chalk.yellow('\n📊 Width-Aware Table with ANSI Analysis:'));
Bun.inspect.table(
    widthAwareIssues.map(issue => issue.toTableFormat()),
    ['type', 'file', 'line', 'message', 'visualWidth', 'totalWidth', 'ansiOverhead'],
    { maxEntryWidth: 35, compact: true }
);

// =============================================================================
// SMART TRUNCATION WITH Bun.stringWidth()
// =============================================================================

console.info(chalk.bold.cyan('\n✂️  Smart Truncation with Bun.stringWidth()'));

console.info(chalk.yellow('\n🔸 Width-Aware Text Truncation:'));
console.info(chalk.white(`
// Smart truncation that respects visual width
function smartTruncate(text, maxWidth) {
  if (Bun.stringWidth(text) <= maxWidth) {
    return text;
  }
  
  // Truncate based on visual width, not character count
  let truncated = '';
  let currentWidth = 0;
  
  for (const char of text) {
    const charWidth = Bun.stringWidth(char);
    if (currentWidth + charWidth + 3 > maxWidth) { // +3 for "..."
      break;
    }
    truncated += char;
    currentWidth += charWidth;
  }
  
  return truncated + '...';
}
`));

// Smart truncation implementation
function smartTruncate(text, maxWidth) {
    if (Bun.stringWidth(text) <= maxWidth) {
        return text;
    }

    // Truncate based on visual width, not character count
    let truncated = '';
    let currentWidth = 0;

    for (const char of text) {
        const charWidth = Bun.stringWidth(char);
        if (currentWidth + charWidth + 3 > maxWidth) { // +3 for "..."
            break;
        }
        truncated += char;
        currentWidth += charWidth;
    }

    return truncated + '...';
}

// ANSI-aware smart truncation
function ansiAwareTruncate(text, maxWidth) {
    const visualWidth = Bun.stringWidth(text);
    const totalWidth = Bun.stringWidth(text, { countAnsiEscapeCodes: true });

    if (visualWidth <= maxWidth) {
        return text;
    }

    // For ANSI text, we need to be more careful
    // This is a simplified version - in production you'd want full ANSI parsing
    return smartTruncate(text.replace(/\u001b\[[0-9;]*m/g, ''), maxWidth);
}

// Test truncation examples
const testTexts = [
    'Short text',
    'This is a medium length text that needs truncation',
    'very-long-filename-that-definitely-exceeds-normal-limits-and-should-be-truncated',
    '🚀 Text with emoji that should be measured correctly',
    '\u001b[31mColored text that needs proper width calculation\u001b[0m'
];

console.info(chalk.green('\n📋 Smart Truncation Examples (max width: 30):'));
testTexts.forEach((text, index) => {
    const original = text;
    const truncated = smartTruncate(text, 30);
    const originalWidth = Bun.stringWidth(text);
    const truncatedWidth = Bun.stringWidth(truncated);

    console.info(chalk.bold(`\n${index + 1}. Original: "${original}"`));
    console.info(chalk.gray(`   Width: ${originalWidth} characters`));
    console.info(chalk.cyan(`   Truncated: "${truncated}"`));
    console.info(chalk.gray(`   Width: ${truncatedWidth} characters`));
});

// =============================================================================
// WIDTH-OPTIMIZED TABLE GENERATION
// =============================================================================

console.info(chalk.bold.cyan('\n📊 Width-Optimized Table Generation'));

console.info(chalk.yellow('\n🔸 Dynamic Column Width Calculation:'));
console.info(chalk.white(`
// Calculate optimal column widths based on content
function calculateOptimalWidths(data, columns, padding = 2) {
  const widths = {};
  
  // Initialize with column names
  columns.forEach(col => {
    widths[col] = Bun.stringWidth(col) + padding;
  });
  
  // Find maximum width for each column
  data.forEach(row => {
    columns.forEach(col => {
      if (row[col]) {
        const cellWidth = Bun.stringWidth(row[col]);
        widths[col] = Math.max(widths[col], cellWidth + padding);
      }
    });
  });
  
  return widths;
}
`));

// Width-optimized table generation
function calculateOptimalWidths(data, columns, padding = 2) {
    const widths = {};

    // Initialize with column names
    columns.forEach(col => {
        widths[col] = Bun.stringWidth(col) + padding;
    });

    // Find maximum width for each column
    data.forEach(row => {
        columns.forEach(col => {
            if (row[col]) {
                const cellWidth = Bun.stringWidth(row[col]);
                widths[col] = Math.max(widths[col], cellWidth + padding);
            }
        });
    });

    return widths;
}

// Create sample data for width optimization
const sampleData = enhancedVaultFiles.map(file => file.toTableFormat());
const columns = ['name', 'path', 'size', 'visualWidth', 'totalWidth', 'status'];

console.info(chalk.green('\n📊 Calculated Optimal Column Widths:'));
const optimalWidths = calculateOptimalWidths(sampleData, columns);
Object.entries(optimalWidths).forEach(([column, width]) => {
    console.info(chalk.cyan(`${column}: ${width} characters`));
});

console.info(chalk.yellow('\n📋 Width-Optimized Table:'));
Bun.inspect.table(sampleData, columns, { compact: true });

console.info(chalk.bold.magenta('\n🎉 Enhanced Custom Inspection Complete!'));
console.info(chalk.gray('Now using Bun.stringWidth() with countAnsiEscapeCodes: true for perfect width management!'));
