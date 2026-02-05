#!/usr/bin/env bun

/**
 * @fileoverview Bun Utilities Demo
 * @description Demonstrates enhanced Bun utilities for CLI development
 */

import { inspectTable, ProgressBar, HTMLSanitizer } from "../src/utils";

// Demo data
const trades = [
  { symbol: 'BTC/USDT', price: 45000, amount: 0.5, side: 'buy', timestamp: Date.now() },
  { symbol: 'ETH/USDT', price: 3000, amount: 2.0, side: 'sell', timestamp: Date.now() - 1000 },
  { symbol: 'SOL/USDT', price: 100, amount: 10.0, side: 'buy', timestamp: Date.now() - 2000 },
];

const users = [
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'admin', active: true },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'user', active: false },
  { id: 3, name: 'Charlie Brown', email: 'charlie@example.com', role: 'moderator', active: true },
];

console.log('🚀 Bun Utilities Demo\n');

// 1. Enhanced Table with Bun.inspect.table()
console.log('📊 Simple Table (Bun.inspect.table):');
console.log(Bun.inspect.table(trades));
console.log();

// 2. Custom Table with formatting
console.log('📋 Custom Table with Formatting:');
console.log(inspectTable(users, {
  columns: ['name', 'email', 'role'],
  colors: true
}));
console.log();

// 3. HTML Sanitization
console.log('🛡️ HTML Sanitization:');
const unsafeHTML = '<script>alert("xss")</script><b>Safe text</b><a href="javascript:evil()">Link</a>';
const safeHTML = HTMLSanitizer.sanitize(unsafeHTML);
console.log('Unsafe:', unsafeHTML);
console.log('Safe:  ', safeHTML);
console.log();

// 4. Progress Bar Demo
console.log('📈 Progress Bar Demo:');
const progress = new ProgressBar(10, 30);

for (let i = 0; i <= 10; i++) {
  progress.update(i, `Processing item ${i}/10`);
  await Bun.sleep(200);
}

progress.complete('All items processed!');
console.log();

// 5. String Width Demo
console.log('📏 String Width Calculations:');
const strings = [
  'Hello World',
  '🎉 Party Time! 🎊',
  'Normal text',
  '\x1b[31mRed text\x1b[0m',
  '📊 Charts & 📈 Graphs'
];

strings.forEach(str => {
  const width = Bun.stringWidth(str);
  const ansiWidth = Bun.stringWidth(str, { countAnsiEscapeCodes: false });
  console.log(`"${str}" -> Width: ${width}, ANSI-aware: ${ansiWidth}`);
});

console.log('\n✨ Demo complete! These utilities provide production-ready solutions for CLI development.');