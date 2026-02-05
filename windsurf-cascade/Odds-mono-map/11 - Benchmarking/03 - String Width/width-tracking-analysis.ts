#!/usr/bin/env bun

/**
 * Width Tracking Analysis - Real-World Table Layout Solutions
 * Analyzing the enhanced custom inspection output and its practical applications
 */

import chalk from 'chalk';

console.log(chalk.bold.magenta('🎯 Width Tracking Analysis - Real-World Solutions'));
console.log(chalk.gray('Understanding how [vw:visual, tw:total] solves table layout problems'));
console.log(chalk.gray('='.repeat(80)));

// =============================================================================
// ANALYZING THE WIDTH TRACKING OUTPUT
// =============================================================================

console.log(chalk.bold.cyan('\n📊 Analyzing the Width Tracking Output'));

console.log(chalk.yellow('\n🔸 Sample Output Analysis:'));
console.log(chalk.white(`
2025-11-18 (01 - Daily Notes/2025-11-18.md) 2.4 KB ✅ [vw:53, tw:85]
OddsTick (02 - Architecture/OddsTick.md) 5.0 KB ✅ [vw:50, tw:82]  
very-long-filename-that-causes-width-issues (03 - Development/very-long-filename-that-causes-width-issues.md) 1.2 KB ❌ [vw:119, tw:151]
`));

console.log(chalk.green('\n📋 Width Breakdown:'));

const sampleFiles = [
    {
        name: '2025-11-18',
        path: '01 - Daily Notes/2025-11-18.md',
        size: '2.4 KB',
        status: '✅',
        visualWidth: 53,
        totalWidth: 85,
        ansiOverhead: 32
    },
    {
        name: 'OddsTick',
        path: '02 - Architecture/OddsTick.md',
        size: '5.0 KB',
        status: '✅',
        visualWidth: 50,
        totalWidth: 82,
        ansiOverhead: 32
    },
    {
        name: 'very-long-filename-that-causes-width-issues',
        path: '03 - Development/very-long-filename-that-causes-width-issues.md',
        size: '1.2 KB',
        status: '❌',
        visualWidth: 119,
        totalWidth: 151,
        ansiOverhead: 32
    }
];

sampleFiles.forEach((file, index) => {
    console.log(chalk.bold(`\n${index + 1}. ${file.name}`));
    console.log(chalk.gray(`   Visual Width (vw): ${file.visualWidth} chars - What users see`));
    console.log(chalk.cyan(`   Total Width (tw): ${file.totalWidth} chars - Including ANSI codes`));
    console.log(chalk.yellow(`   ANSI Overhead: ${file.ansiOverhead} chars - Color formatting cost`));
    console.log(chalk.magenta(`   Efficiency: ${((file.visualWidth / file.totalWidth) * 100).toFixed(1)}% visual vs total`));
});

// =============================================================================
// TABLE LAYOUT PROBLEMS AND SOLUTIONS
// =============================================================================

console.log(chalk.bold.cyan('\n🔧 Table Layout Problems and Solutions'));

console.log(chalk.yellow('\n🔸 Problem 1: Without Width Awareness'));
console.log(chalk.red(`
❌ Table layout breaks with long filenames:
┌───┬─────────────────────────────────────────┬─────────────────────────────────┬────────┐
│   │ name                                    │ path                           │ size   │
├───┼─────────────────────────────────────────┼─────────────────────────────────┼────────┤
│ 0 │ 2025-11-18                              │ 01 - Daily Notes/2025-11-18.md │ 2.4 KB │
│ 1 │ OddsTick                                │ 02 - Architecture/OddsTick.md  │ 5.0 KB │
│ 2 │ very-long-filename-that-causes-width-i │ 03 - Development/very-long-fi   │ 1.2 KB │
│   │ ssues                                   │ lename-that-causes-width-issu  │        │
│   │                                         │ es.md                          │        │
└───┴─────────────────────────────────────────┴─────────────────────────────────┴────────┘
`));

console.log(chalk.yellow('\n✅ Solution 1: With Width Awareness & Smart Truncation'));
console.log(chalk.green(`
✅ Perfect table layout with width-aware truncation:
┌───┬─────────────────────┬─────────────────────────────────┬────────┐
│   │ name                │ path                           │ size   │
├───┼─────────────────────┼─────────────────────────────────┼────────┤
│ 0 │ 2025-11-18          │ 01 - Daily Notes/2025-11-18.md │ 2.4 KB │
│ 1 │ OddsTick            │ 02 - Architecture/OddsTick.md  │ 5.0 KB │
│ 2 │ very-long-filename- │ 03 - Development/very-long-fi   │ 1.2 KB │
│   │ that-causes-width...│ lename-that-causes-width-issu  │        │
│   │                     │ es.md                          │        │
└───┴─────────────────────┴─────────────────────────────────┴────────┘
`));

// =============================================================================
// WIDTH-AWARE TRUNCATION IMPLEMENTATION
// =============================================================================

console.log(chalk.bold.cyan('\n✂️  Width-Aware Truncation Implementation'));

console.log(chalk.yellow('\n🔸 Smart Truncation Based on Visual Width:'));
console.log(chalk.white(`
function smartTruncateByVisualWidth(text, maxVisualWidth) {
  // Calculate current visual width
  const currentVisualWidth = Bun.stringWidth(text);
  
  if (currentVisualWidth <= maxVisualWidth) {
    return text;
  }
  
  // Truncate based on visual width, not character count
  let truncated = '';
  let currentWidth = 0;
  
  for (const char of text) {
    const charWidth = Bun.stringWidth(char);
    if (currentWidth + charWidth + 3 > maxVisualWidth) { // +3 for "..."
      break;
    }
    truncated += char;
    currentWidth += charWidth;
  }
  
  return truncated + '...';
}
`));

// Smart truncation implementation
function smartTruncateByVisualWidth(text, maxVisualWidth) {
    const currentVisualWidth = Bun.stringWidth(text);

    if (currentVisualWidth <= maxVisualWidth) {
        return text;
    }

    let truncated = '';
    let currentWidth = 0;

    for (const char of text) {
        const charWidth = Bun.stringWidth(char);
        if (currentWidth + charWidth + 3 > maxVisualWidth) {
            break;
        }
        truncated += char;
        currentWidth += charWidth;
    }

    return truncated + '...';
}

// ANSI-aware truncation for colored text
function ansiAwareTruncate(text, maxVisualWidth) {
    // Remove ANSI codes for width calculation, keep for display
    const plainText = text.replace(/\u001b\[[0-9;]*m/g, '');
    const visualWidth = Bun.stringWidth(plainText);

    if (visualWidth <= maxVisualWidth) {
        return text;
    }

    const truncated = smartTruncateByVisualWidth(plainText, maxVisualWidth);

    // Reapply basic coloring (simplified - in production you'd preserve original ANSI)
    return chalk.cyan(truncated);
}

// Test width-aware truncation
console.log(chalk.green('\n📋 Width-Aware Truncation Examples:'));

const truncationTests = [
    {
        original: '2025-11-18',
        maxWidth: 20,
        description: 'Short filename - no truncation needed'
    },
    {
        original: 'very-long-filename-that-causes-width-issues',
        maxWidth: 30,
        description: 'Long filename - needs truncation'
    },
    {
        original: '03 - Development/very-long-filename-that-causes-width-issues.md',
        maxWidth: 40,
        description: 'Very long path - aggressive truncation'
    },
    {
        original: '🚀 filename-with-emoji-and-unicode-こんにちは',
        maxWidth: 25,
        description: 'Unicode and emoji - proper width calculation'
    }
];

truncationTests.forEach((test, index) => {
    const originalWidth = Bun.stringWidth(test.original);
    const truncated = smartTruncateByVisualWidth(test.original, test.maxWidth);
    const truncatedWidth = Bun.stringWidth(truncated);

    console.log(chalk.bold(`\n${index + 1}. ${test.description}`));
    console.log(chalk.gray(`   Original: "${test.original}"`));
    console.log(chalk.gray(`   Width: ${originalWidth} → ${test.maxWidth} (max)`));
    console.log(chalk.cyan(`   Result: "${truncated}"`));
    console.log(chalk.gray(`   Final width: ${truncatedWidth} chars`));
});

// =============================================================================
// DYNAMIC COLUMN WIDTH OPTIMIZATION
// =============================================================================

console.log(chalk.bold.cyan('\n📊 Dynamic Column Width Optimization'));

console.log(chalk.yellow('\n🔸 Calculate Optimal Column Widths:'));
console.log(chalk.white(`
function calculateOptimalColumnWidths(data, availableWidth = 80) {
  const columns = ['name', 'path', 'size', 'status'];
  const minWidths = { name: 15, path: 25, size: 8, status: 8 };
  const widths = { ...minWidths };
  
  // Calculate maximum needed width for each column
  data.forEach(row => {
    columns.forEach(col => {
      if (row[col]) {
        const visualWidth = Bun.stringWidth(row[col]);
        widths[col] = Math.max(widths[col], visualWidth + 2); // +2 padding
      }
    });
  });
  
  // If total exceeds available width, distribute proportionally
  const totalNeeded = Object.values(widths).reduce((sum, w) => sum + w, 0);
  
  if (totalNeeded > availableWidth) {
    const scale = availableWidth / totalNeeded;
    columns.forEach(col => {
      widths[col] = Math.max(minWidths[col], Math.floor(widths[col] * scale));
    });
  }
  
  return widths;
}
`));

// Dynamic column width calculation
function calculateOptimalColumnWidths(data, availableWidth = 80) {
    const columns = ['name', 'path', 'size', 'status'];
    const minWidths = { name: 15, path: 25, size: 8, status: 8 };
    const widths = { ...minWidths };

    data.forEach(row => {
        columns.forEach(col => {
            if (row[col]) {
                const visualWidth = Bun.stringWidth(row[col]);
                widths[col] = Math.max(widths[col], visualWidth + 2);
            }
        });
    });

    const totalNeeded = Object.values(widths).reduce((sum, w) => sum + w, 0);

    if (totalNeeded > availableWidth) {
        const scale = availableWidth / totalNeeded;
        columns.forEach(col => {
            widths[col] = Math.max(minWidths[col], Math.floor(widths[col] * scale));
        });
    }

    return widths;
}

// Create sample data for optimization
const sampleData = [
    { name: '2025-11-18', path: '01 - Daily Notes/2025-11-18.md', size: '2.4 KB', status: '✅' },
    { name: 'OddsTick', path: '02 - Architecture/OddsTick.md', size: '5.0 KB', status: '✅' },
    { name: 'very-long-filename-that-causes-width-issues', path: '03 - Development/very-long-filename-that-causes-width-issues.md', size: '1.2 KB', status: '❌' }
];

console.log(chalk.green('\n📊 Column Width Optimization Analysis:'));

const scenarios = [
    { width: 120, description: 'Wide terminal (120 chars)' },
    { width: 80, description: 'Standard terminal (80 chars)' },
    { width: 60, description: 'Narrow terminal (60 chars)' }
];

scenarios.forEach(scenario => {
    const optimalWidths = calculateOptimalColumnWidths(sampleData, scenario.width);
    const totalAllocated = Object.values(optimalWidths).reduce((sum, w) => sum + w, 0);

    console.log(chalk.bold(`\n🖥️  ${scenario.description}`));
    console.log(chalk.cyan(`   Available: ${scenario.width} chars, Allocated: ${totalAllocated} chars`));

    Object.entries(optimalWidths).forEach(([col, width]) => {
        console.log(chalk.gray(`   ${col}: ${width} chars`));
    });
});

// =============================================================================
// REAL-WORLD APPLICATION EXAMPLES
// =============================================================================

console.log(chalk.bold.cyan('\n🌍 Real-World Application Examples'));

console.log(chalk.yellow('\n🔸 Use Case 1: Vault File Management'));
console.log(chalk.green(`
✅ Before width awareness:
   - Tables break with long filenames
   - Inconsistent column widths
   - Poor user experience

✅ After width awareness:
   - Perfect table layout every time
   - Responsive to terminal size
   - Professional appearance
`));

console.log(chalk.yellow('\n🔸 Use Case 2: CI/CD Validation Reports'));
console.log(chalk.green(`
✅ Before width awareness:
   - Reports get truncated awkwardly
   - Important information lost
   - Hard to read in logs

✅ After width awareness:
   - Smart truncation preserves meaning
   - Consistent formatting across environments
   - Professional error reporting
`));

console.log(chalk.yellow('\n🔸 Use Case 3: Performance Metrics Dashboards'));
console.log(chalk.green(`
✅ Before width awareness:
   - Metrics overflow table boundaries
   - Charts become misaligned
   - Data becomes unreadable

✅ After width awareness:
   - Perfect alignment every time
   - Responsive to different screen sizes
   - Clear data visualization
`));

// =============================================================================
// WIDTH TRACKING BEST PRACTICES
// =============================================================================

console.log(chalk.bold.cyan('\n✅ Width Tracking Best Practices'));

console.log(chalk.yellow('\n🎯 When to Use Visual Width (vw):'));
console.log(chalk.gray('• Table column sizing'));
console.log(chalk.gray('• Terminal layout planning'));
console.log(chalk.gray('• User interface design'));
console.log(chalk.gray('• Text truncation decisions'));

console.log(chalk.yellow('\n🎯 When to Use Total Width (tw):'));
console.log(chalk.gray('• Memory allocation planning'));
console.log(chalk.gray('• Performance optimization'));
console.log(chalk.gray('• Buffer size calculation'));
console.log(chalk.gray('• Storage requirements'));

console.log(chalk.yellow('\n🎯 ANSI Overhead Analysis:'));
console.log(chalk.gray('• Monitor formatting efficiency'));
console.log(chalk.gray('• Optimize color usage'));
console.log(chalk.gray('• Balance visual appeal vs performance'));
console.log(chalk.gray('• Debug formatting issues'));

console.log(chalk.bold.magenta('\n🎉 Width Tracking Analysis Complete!'));
console.log(chalk.gray('The [vw:visual, tw:total] system provides complete control over table layout!'));
