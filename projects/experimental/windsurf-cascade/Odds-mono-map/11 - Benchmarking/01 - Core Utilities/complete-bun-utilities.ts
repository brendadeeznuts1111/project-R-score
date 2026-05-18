#!/usr/bin/env bun

/**
 * 🎯 Complete Bun Utilities Ecosystem - All Functions from Official Docs
 * https://bun.com/docs/runtime/utils - Comprehensive Implementation Guide
 */

import chalk from 'chalk';

console.info(chalk.bold.magenta('🎯 Complete Bun Utilities Ecosystem'));
console.info(chalk.gray('All Functions from https://bun.com/docs/runtime/utils'));
console.info(chalk.gray('='.repeat(80)));

// =============================================================================
// SYSTEM & ENVIRONMENT UTILITIES
// =============================================================================

console.info(chalk.bold.cyan('\n🖥️  System & Environment Utilities'));

console.info(chalk.green('\n📋 System Information:'));
console.info(chalk.cyan(`Bun Version: ${Bun.version}`));
console.info(chalk.cyan(`Bun Revision: ${Bun.revision}`));
console.info(chalk.cyan(`Environment: ${Bun.env.NODE_ENV || 'development'}`));
console.info(chalk.cyan(`Main Script: ${Bun.main}`));

// =============================================================================
// TIME & PERFORMANCE UTILITIES
// =============================================================================

console.info(chalk.bold.cyan('\n⏱️  Time & Performance Utilities'));

console.info(chalk.green('\n📊 Performance Timing Demo:'));
const start = Bun.nanoseconds();
await Bun.sleep(10); // Small delay for demo
const duration = Bun.nanoseconds() - start;
console.info(chalk.cyan(`Operation took: ${(duration / 1_000_000).toFixed(2)}ms`));

// =============================================================================
// FILE SYSTEM & PATH UTILITIES
// =============================================================================

console.info(chalk.bold.cyan('\n📁 File System & Path Utilities'));

console.info(chalk.green('\n📋 Path Utilities Demo:'));
const testPath = '/Users/nolarose/CascadeProjects/windsurf-project/package.json';
const fileUrl = Bun.pathToFileURL(testPath);
const backToPath = Bun.fileURLToPath(fileUrl);

console.info(chalk.cyan(`Original Path: ${testPath}`));
console.info(chalk.cyan(`File URL: ${fileUrl}`));
console.info(chalk.cyan(`Back to Path: ${backToPath}`));

const nodePath = Bun.which('node');
const bunPath = Bun.which('bun');
console.info(chalk.cyan(`Node Path: ${nodePath || 'not found'}`));
console.info(chalk.cyan(`Bun Path: ${bunPath || 'not found'}`));

// =============================================================================
// ID GENERATION & CRYPTOGRAPHY
// =============================================================================

console.info(chalk.bold.cyan('\n🔐 ID Generation & Cryptography'));

console.info(chalk.green('\n📋 UUID Generation Demo:'));
const uuid1 = Bun.randomUUIDv7();
const uuid2 = Bun.randomUUIDv7();
console.info(chalk.cyan(`UUID 1: ${uuid1}`));
console.info(chalk.cyan(`UUID 2: ${uuid2}`));
console.info(chalk.gray(`Note: UUIDs are time-ordered and unique`));

// =============================================================================
// STREAM & BUFFER UTILITIES
// =============================================================================

console.info(chalk.bold.cyan('\n🌊 Stream & Buffer Utilities'));

console.info(chalk.green('\n📋 Stream Utilities Demo:'));
const testData = 'Hello, Bun utilities!';
const stream = new ReadableStream({
    start(controller) {
        controller.enqueue(new TextEncoder().encode(testData));
        controller.close();
    }
});

const text = await Bun.readableStreamToText(stream);
console.info(chalk.cyan(`Stream to Text: ${text}`));

// =============================================================================
// COMPARISON & VALIDATION UTILITIES
// =============================================================================

console.info(chalk.bold.cyan('\n🔍 Comparison & Validation Utilities'));

console.info(chalk.green('\n📋 Comparison & Validation Demo:'));
const obj1 = { a: 1, b: { c: 2, d: [3, 4] } };
const obj2 = { a: 1, b: { c: 2, d: [3, 4] } };
const obj3 = { a: 1, b: { c: 2, d: [3, 5] } };

console.info(chalk.cyan(`Deep Equals (same): ${Bun.deepEquals(obj1, obj2)}`));
console.info(chalk.cyan(`Deep Equals (different): ${Bun.deepEquals(obj1, obj3)}`));

const htmlInput = '<script>alert("xss")</script>';
const escaped = Bun.escapeHTML(htmlInput);
console.info(chalk.cyan(`Original: ${htmlInput}`));
console.info(chalk.cyan(`Escaped: ${escaped}`));

// =============================================================================
// STRING UTILITIES
// =============================================================================

console.info(chalk.bold.cyan('\n📝 String Utilities'));

console.info(chalk.green('\n📋 String Utilities Demo:'));
const testString = 'Hello 🚀 世界';
const ansiString = '\u001b[31mRed Text\u001b[0m';
const complexString = '\u001b[1;31m\u001b[47mBold Red on White\u001b[0m';

console.info(chalk.cyan(`String: "${testString}"`));
console.info(chalk.cyan(`Width: ${Bun.stringWidth(testString)} characters`));

console.info(chalk.cyan(`ANSI String: "${ansiString}"`));
console.info(chalk.cyan(`Visual Width: ${Bun.stringWidth(ansiString)} characters`));
console.info(chalk.cyan(`Total Width: ${Bun.stringWidth(ansiString, { countAnsiEscapeCodes: true })} characters`));

console.info(chalk.cyan(`Complex ANSI: "${complexString}"`));
console.info(chalk.cyan(`Stripped: "${Bun.stripANSI(complexString)}"`));

// =============================================================================
// COMPRESSION UTILITIES
// =============================================================================

console.info(chalk.bold.cyan('\n🗜️  Compression Utilities'));

console.info(chalk.green('\n📋 Compression Demo:'));
const testDataCompress = 'Hello, compression world! This is a longer string to demonstrate compression effectiveness.';

const gzipped = Bun.gzipSync(testDataCompress);
const gunzipped = Bun.gunzipSync(gzipped);

const deflated = Bun.deflateSync(testDataCompress);
const inflated = Bun.inflateSync(deflated);

console.info(chalk.cyan(`Original: ${testDataCompress.length} bytes`));
console.info(chalk.cyan(`Gzipped: ${gzipped.length} bytes (${((gzipped.length / testDataCompress.length) * 100).toFixed(1)}%)`));
console.info(chalk.cyan(`Deflated: ${deflated.length} bytes (${((deflated.length / testDataCompress.length) * 100).toFixed(1)}%)`));
console.info(chalk.cyan(`Decompressed matches: ${gunzipped.toString() === testDataCompress}`));

// =============================================================================
// INSPECTION UTILITIES
// =============================================================================

console.info(chalk.bold.cyan('\n🔍 Inspection Utilities'));

console.info(chalk.green('\n📋 Inspection Demo:'));

// Custom inspection class
class VaultFile {
    constructor(public name: string, public size: number, public modified: Date) { }

    [Bun.inspect.custom]() {
        return chalk.cyan(this.name) + chalk.gray(` (${this.size} bytes, ${this.modified.toLocaleDateString()})`);
    }
}

const vaultFile = new VaultFile('document.md', 1024, new Date());
console.info(chalk.cyan('Custom Inspection:'));
console.info(vaultFile);

// Table inspection with our enhanced data
const tableData = [
    { name: 'Alice', age: 30, role: 'Developer' },
    { name: 'Bob', age: 25, role: 'Designer' },
    { name: 'Charlie', age: 35, role: 'Manager' }
];

console.info(chalk.cyan('\nTable Inspection:'));
console.info(Bun.inspect.table(tableData, ['name', 'age', 'role'], { colors: true }));

// =============================================================================
// MODULE RESOLUTION
// =============================================================================

console.info(chalk.bold.cyan('\n📦 Module Resolution'));

console.info(chalk.green('\n📋 Module Resolution Demo:'));
try {
    const chalkPath = Bun.resolveSync('chalk', import.meta.url);
    console.info(chalk.cyan(`Chalk resolved to: ${chalkPath}`));
} catch (error) {
    console.info(chalk.red(`Could not resolve chalk: ${error}`));
}

// =============================================================================
// COMPREHENSIVE INTEGRATION DEMO
// =============================================================================

console.info(chalk.bold.cyan('\n🎯 Comprehensive Integration Demo'));

// Implement the integrated demo
class UltimateVaultManager {
    static async createFileReport(filePath: string) {
        try {
            const file = Bun.file(filePath);
            const stats = await file.stat();

            return {
                path: filePath,
                size: stats.size,
                modified: stats.mtime.toLocaleDateString(),
                uuid: Bun.randomUUIDv7(),
                compressed: Bun.gzipSync(await file.text()).length,
                display: this.formatFileDisplay(filePath, stats),
                width: Bun.stringWidth(filePath),
                escaped: Bun.escapeHTML(filePath)
            };
        } catch (error) {
            return {
                path: filePath,
                error: error.message,
                uuid: Bun.randomUUIDv7()
            };
        }
    }

    static formatFileDisplay(path: string, stats: any) {
        const sizeStr = stats.size < 1024 ? `${stats.size}B` : `${(stats.size / 1024).toFixed(1)}KB`;
        return `${path} (${sizeStr}, ${stats.mtime.toLocaleDateString()})`;
    }

    static generateReportTable(files: any[]) {
        const validFiles = files.filter(f => !f.error);
        return Bun.inspect.table(validFiles, ['path', 'size', 'modified', 'compressed'], { colors: true });
    }
}

// Demo with actual files
console.info(chalk.green('\n📋 Integrated Vault Manager Demo:'));
const demoFiles = [
    'package.json',
    'README.md',
    'bun.lock'
];

const fileReports = await Promise.all(
    demoFiles.map(file => UltimateVaultManager.createFileReport(file))
);

console.info(chalk.cyan('\nFile Reports:'));
fileReports.forEach((report, index) => {
    if (report.error) {
        console.info(chalk.red(`${index + 1}. Error: ${report.error}`));
    } else {
        console.info(chalk.green(`${index + 1}. ${report.display}`));
        console.info(chalk.gray(`   UUID: ${report.uuid}`));
        console.info(chalk.gray(`   Width: ${report.width} chars`));
        console.info(chalk.gray(`   Compressed: ${report.compressed} bytes`));
    }
});

console.info(chalk.cyan('\nSummary Table:'));
console.info(UltimateVaultManager.generateReportTable(fileReports));

// =============================================================================
// QUICK REFERENCE CHEAT SHEET
// =============================================================================

console.info(chalk.bold.cyan('\n📋 Quick Reference Cheat Sheet'));

const utilities = [
    { category: 'System', functions: ['Bun.version', 'Bun.revision', 'Bun.env', 'Bun.main'] },
    { category: 'Time', functions: ['Bun.sleep()', 'Bun.sleepSync()', 'Bun.nanoseconds()'] },
    { category: 'File System', functions: ['Bun.fileURLToPath()', 'Bun.pathToFileURL()', 'Bun.which()'] },
    { category: 'ID Generation', functions: ['Bun.randomUUIDv7()'] },
    { category: 'Streams', functions: ['Bun.peek()', 'Bun.readableStreamToText()', 'Bun.readableStreamToArrayBuffer()'] },
    { category: 'Editor', functions: ['Bun.openInEditor()'] },
    { category: 'Comparison', functions: ['Bun.deepEquals()', 'Bun.escapeHTML()'] },
    { category: 'Strings', functions: ['Bun.stringWidth()', 'Bun.stripANSI()'] },
    { category: 'Compression', functions: ['Bun.gzipSync()', 'Bun.gunzipSync()', 'Bun.deflateSync()', 'Bun.inflateSync()'] },
    { category: 'Inspection', functions: ['Bun.inspect()', 'Bun.inspect.custom', 'Bun.inspect.table()'] },
    { category: 'Modules', functions: ['Bun.resolveSync()'] },
    { category: 'Advanced (bun:jsc)', functions: ['serialize()', 'deserialize()', 'estimateShallowMemoryUsageOf()'] }
];

utilities.forEach(category => {
    console.info(chalk.yellow(`\n🔸 ${category.category}:`));
    category.functions.forEach(func => {
        console.info(chalk.gray(`   • ${func}`));
    });
});

console.info(chalk.bold.magenta('\n🎉 Complete Bun Utilities Ecosystem Demonstrated!'));
console.info(chalk.gray('All 25+ utilities from https://bun.com/docs/runtime/utils covered!'));
console.info(chalk.gray('🌐 Reference: https://bun.com/docs/runtime/utils'));