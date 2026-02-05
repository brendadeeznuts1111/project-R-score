#!/usr/bin/env bun

/**
 * Markdansi Demo Script
 * Demonstrates usage of markdansi for markdown to ANSI conversion
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

console.log('🎨 Markdansi Demo - Markdown to ANSI Converter');
console.log('===============================================\n');

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

console.log('📝 Original Markdown:');
console.log('====================');
console.log(testMarkdown);

console.log('\n🎨 Markdansi Options:');
console.log('====================');
console.log('--in FILE        Input markdown file');
console.log('--out FILE       Output file (optional, defaults to stdout)');
console.log('--width N        Terminal width (default: 80)');
console.log('--no-wrap        Disable line wrapping');
console.log('--no-color       Disable colors');
console.log('--no-links       Disable link rendering');
console.log('--theme THEME    Theme: default|dim|bright');
console.log('--list-indent N  List indentation (default: 2)');
console.log('--quote-prefix STR Quote prefix (default: "> ")');

console.log('\n🚀 Example Usage:');
console.log('================');

try {
    // Example 1: Basic conversion
    console.log('\n1️⃣ Basic conversion:');
    execSync('bunx markdansi --in demo.md --width 80', { stdio: 'inherit' });

    // Example 2: With bright theme
    console.log('\n2️⃣ With bright theme:');
    execSync('bunx markdansi --in demo.md --width 80 --theme bright', { stdio: 'inherit' });

    // Example 3: No color
    console.log('\n3️⃣ No color output:');
    execSync('bunx markdansi --in demo.md --width 80 --no-color', { stdio: 'inherit' });

    // Example 4: Save to file
    console.log('\n4️⃣ Save to file:');
    execSync('bunx markdansi --in demo.md --out demo_output.txt --width 100', { stdio: 'inherit' });

    console.log('\n✅ Demo completed successfully!');

    // Show file output if created
    try {
        const output = readFileSync('demo_output.txt', 'utf8');
        console.log('\n📄 Saved output (demo_output.txt):');
        console.log('===================================');
        console.log(output);
    } catch (error) {
        console.log('\n⚠️ Output file not created - tool may output to stdout only');
    }

} catch (error) {
    console.error('❌ Error running markdansi:', error.message);
    console.log('\n💡 Alternative: Install markdansi globally');
    console.log('bun install -g markdansi');
    console.log('Then use: markdansi --in demo.md');
}

// Cleanup
try {
    execSync('rm demo.md', { stdio: 'inherit' });
    execSync('rm -f demo_output.txt', { stdio: 'inherit' });
} catch (error) {
    // Ignore cleanup errors
}

console.log('\n📚 For formatting our documentation:');
console.log('====================================');
console.log('bunx markdansi --in README.md --width 100 --theme bright');
console.log('bunx markdansi --in docs/MEMORY_LEAK_DETECTION.md --no-color');
console.log('bunx markdansi --in WORKING_BUN_COMMANDS.md --width 120');
