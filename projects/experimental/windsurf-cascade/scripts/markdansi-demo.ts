#!/usr/bin/env bun

/**
 * Markdansi Demo Script
 * Demonstrates usage of markdansi for markdown to ANSI conversion
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

console.info('🎨 Markdansi Demo - Markdown to ANSI Converter');
console.info('===============================================\n');

// Test content
const testMarkdown = `# 🧠 Memory Leak Detection Report

## ✅ Test Results

### Passing Tests
- **WebSocket Connection Test** - ✅ PASSED
- **Large Array Processing** - ✅ PASSED  
- **Database Connection Pool** - ✅ PASSED

### ⚠️ Expected Failures
- **Intentional Leak Test** - ⚠️ EXPECTED FAILURE
- **RapidHash Processing** - ⚠️ MISSING MODULE

## 📊 Performance Metrics

\`\`\`typescript
const results = {
  totalTests: 7,
  passed: 5,
  failed: 2,
  successRate: '71%'
};
\`\`\`

> **Note**: The memory leak detection system is operational and ready for production.
`;

// Write test content to file
writeFileSync('demo.md', testMarkdown);

console.info('📝 Original Markdown:');
console.info('====================');
console.info(testMarkdown);

console.info('\n🎨 Markdansi Options:');
console.info('====================');
console.info('--in FILE        Input markdown file');
console.info('--out FILE       Output file (optional, defaults to stdout)');
console.info('--width N        Terminal width (default: 80)');
console.info('--no-wrap        Disable line wrapping');
console.info('--no-color       Disable colors');
console.info('--no-links       Disable link rendering');
console.info('--theme THEME    Theme: default|dim|bright');
console.info('--list-indent N  List indentation (default: 2)');
console.info('--quote-prefix STR Quote prefix (default: "> ")');

console.info('\n🚀 Example Usage:');
console.info('================');

try {
    // Example 1: Basic conversion
    console.info('\n1️⃣ Basic conversion:');
    execSync('bunx markdansi --in demo.md --width 80', { stdio: 'inherit' });

    // Example 2: With bright theme
    console.info('\n2️⃣ With bright theme:');
    execSync('bunx markdansi --in demo.md --width 80 --theme bright', { stdio: 'inherit' });

    // Example 3: No color
    console.info('\n3️⃣ No color output:');
    execSync('bunx markdansi --in demo.md --width 80 --no-color', { stdio: 'inherit' });

    // Example 4: Save to file
    console.info('\n4️⃣ Save to file:');
    execSync('bunx markdansi --in demo.md --out demo_output.txt --width 100', { stdio: 'inherit' });

    console.info('\n✅ Demo completed successfully!');

    // Show file output if created
    try {
        const output = readFileSync('demo_output.txt', 'utf8');
        console.info('\n📄 Saved output (demo_output.txt):');
        console.info('===================================');
        console.info(output);
    } catch (error) {
        console.info('\n⚠️ Output file not created - tool may output to stdout only');
    }

} catch (error) {
    console.error('❌ Error running markdansi:', error.message);
    console.info('\n💡 Alternative: Install markdansi globally');
    console.info('bun install -g markdansi');
    console.info('Then use: markdansi --in demo.md');
}

// Cleanup
try {
    execSync('rm demo.md', { stdio: 'inherit' });
    execSync('rm -f demo_output.txt', { stdio: 'inherit' });
} catch (error) {
    // Ignore cleanup errors
}

console.info('\n📚 For formatting our documentation:');
console.info('====================================');
console.info('bunx markdansi --in README.md --width 100 --theme bright');
console.info('bunx markdansi --in docs/MEMORY_LEAK_DETECTION.md --no-color');
console.info('bunx markdansi --in WORKING_BUN_COMMANDS.md --width 120');
