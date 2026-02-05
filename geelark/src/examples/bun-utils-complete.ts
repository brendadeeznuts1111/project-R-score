#!/usr/bin/env bun

/**
 * Complete Bun Utilities Examples
 *
 * Demonstrates all Bun utility functions:
 * - Bun.inspect.table()
 * - Bun.inspect.custom
 * - Bun.deepEquals()
 * - Bun.escapeHTML()
 * - Bun.stringWidth()
 *
 * References:
 * - https://bun.com/docs/runtime/utils#bun-inspect-table
 * - https://bun.com/docs/runtime/utils#bun-inspect-custom
 * - https://bun.com/docs/runtime/utils#bun-deepequals
 * - https://bun.com/docs/runtime/utils#bun-escapehtml
 * - https://bun.com/docs/runtime/utils#bun-stringwidth
 */

import { inspect } from "bun";

console.log('🔧 Bun Utilities Complete Examples\n');

// ============================================================================
// 1. Bun.inspect.table() - Format tabular data
// ============================================================================
console.log('=== 1. Bun.inspect.table() ===\n');

const tableData = [
  { name: 'Alice', age: 30, role: 'Developer' },
  { name: 'Bob', age: 25, role: 'Designer' },
  { name: 'Charlie', age: 35, role: 'Manager' },
];

console.log('Full table:');
console.log(inspect.table(tableData));

console.log('\nSelected columns (name, role):');
console.log(inspect.table(tableData, ['name', 'role']));

console.log('\nTable with colors:');
console.log(inspect.table(tableData, { colors: true }));

// ============================================================================
// 2. Bun.inspect.custom - Custom object representation
// ============================================================================
console.log('\n=== 2. Bun.inspect.custom ===\n');

class User {
  constructor(
    private name: string,
    private email: string,
    private active: boolean
  ) {}

  [Bun.inspect.custom]() {
    const status = this.active ? '✅ active' : '❌ inactive';
    return `User(name="${this.name}", email="${this.email}", status=${status})`;
  }
}

const user = new User('Alice', 'alice@example.com', true);
console.log('Custom inspect:');
console.log(user);

// ============================================================================
// 3. Bun.deepEquals() - Deep equality comparison
// ============================================================================
console.log('\n=== 3. Bun.deepEquals() ===\n');

// Basic comparisons
console.log('Basic comparisons:');
console.log(`  [1, 2, 3] === [1, 2, 3]: ${Bun.deepEquals([1, 2, 3], [1, 2, 3])}`);
console.log(`  [1, 2, 3] === [1, 2, 4]: ${Bun.deepEquals([1, 2, 3], [1, 2, 4])}`);
console.log(`  {a: 1} === {a: 1}: ${Bun.deepEquals({ a: 1 }, { a: 1 })}`);
console.log(`  {a: 1} === {b: 1}: ${Bun.deepEquals({ a: 1 }, { b: 1 })}`);

// Nested objects
const obj1 = {
  user: { name: 'Alice', meta: { age: 30 } },
  tags: ['developer', 'typescript'],
};

const obj2 = {
  user: { name: 'Alice', meta: { age: 30 } },
  tags: ['developer', 'typescript'],
};

const obj3 = {
  user: { name: 'Alice', meta: { age: 31 } },
  tags: ['developer', 'typescript'],
};

console.log('\nNested objects:');
console.log(`  obj1 === obj2: ${Bun.deepEquals(obj1, obj2)}`);
console.log(`  obj1 === obj3: ${Bun.deepEquals(obj1, obj3)}`);

// Arrays
console.log('\nArrays:');
console.log(`  [1, [2, [3]]] === [1, [2, [3]]]: ${Bun.deepEquals([1, [2, [3]]], [1, [2, [3]]])}`);
console.log(`  [1, [2, [3]]] === [1, [2, [4]]]: ${Bun.deepEquals([1, [2, [3]]], [1, [2, [4]]])}`);

// Strict mode
console.log('\nStrict mode:');
console.log(`  '42' === 42 (loose): ${Bun.deepEquals('42', 42, false)}`);
console.log(`  '42' === 42 (strict): ${Bun.deepEquals('42', 42, true)}`);

// ============================================================================
// 4. Bun.escapeHTML() - Escape HTML entities
// ============================================================================
console.log('\n=== 4. Bun.escapeHTML() ===\n');

const unsafeHTML = '<script>alert("XSS")</script>';
const userInput = 'Hello & <world> & "quotes"';
const htmlContent = `<div onclick="alert('xss')">Click me</div>`;

console.log('HTML escaping:');
console.log(`  Input: ${unsafeHTML}`);
console.log(`  Escaped: ${Bun.escapeHTML(unsafeHTML)}`);

console.log(`\n  Input: ${userInput}`);
console.log(`  Escaped: ${Bun.escapeHTML(userInput)}`);

console.log(`\n  Input: ${htmlContent}`);
console.log(`  Escaped: ${Bun.escapeHTML(htmlContent)}`);

// Safe HTML generation example
function safeHTML(template: string, ...values: any[]): string {
  return template.replace(/\{\{(\d+)\}\}/g, (_, index) => {
    return Bun.escapeHTML(String(values[parseInt(index)] || ''));
  });
}

console.log('\nSafe HTML template:');
const name = '<script>alert("xss")</script>';
const message = 'Hello & welcome!';
const safeOutput = safeHTML('<div>Hello, {{0}}! {{1}}</div>', name, message);
console.log(`  Safe output: ${safeOutput}`);

// ============================================================================
// 5. Bun.stringWidth() - Accurate Unicode width calculation
// ============================================================================
console.log('\n=== 5. Bun.stringWidth() ===\n');

const testStrings = [
  { label: 'ASCII', text: 'Hello', width: 5 },
  { label: 'Emoji', text: '🎉', width: 2 },
  { label: 'Flag', text: '🇺🇸', width: 2 },
  { label: 'Korean', text: '안녕하세요', width: 10 },
  { label: 'Japanese', text: 'こんにちは', width: 10 },
  { label: 'Chinese', text: '你好世界', width: 8 },
  { label: 'Mixed', text: 'Hello 🎉 World 你好', width: 17 },
  { label: 'ANSI colors', text: '\x1b[32mGreen\x1b[0m', width: 5 },
];

console.log('String width calculation:');
for (const { label, text, width } of testStrings) {
  const calculated = Bun.stringWidth(text);
  const match = calculated === width ? '✅' : '❌';
  console.log(`  ${match} ${label.padEnd(12)}: "${text}" → ${calculated} (expected: ${width})`);
}

// Table alignment example
console.log('\nTable alignment with Unicode:');
const rows = [
  { country: '🇺🇸 USA', status: '✅ Active', score: 95 },
  { country: '🇬🇧 UK', status: '✅ Active', score: 88 },
  { country: '🇯🇵 Japan', status: '⚠️ Pending', score: 92 },
];

// Calculate column widths
const countryWidth = Math.max(...rows.map(r => Bun.stringWidth(r.country)));
const statusWidth = Math.max(...rows.map(r => Bun.stringWidth(r.status)));

console.log('┌' + '─'.repeat(countryWidth + 2) + '┬' + '─'.repeat(statusWidth + 2) + '┬───┐');
console.log('│ ' + 'Country'.padEnd(countryWidth) + ' │ ' + 'Status'.padEnd(statusWidth) + ' │ Score │');
console.log('├' + '─'.repeat(countryWidth + 2) + '┼' + '─'.repeat(statusWidth + 2) + '┼───┤');

for (const row of rows) {
  const countryPadded = row.country + ' '.repeat(countryWidth - Bun.stringWidth(row.country));
  const statusPadded = row.status + ' '.repeat(statusWidth - Bun.stringWidth(row.status));
  console.log(`│ ${countryPadded} │ ${statusPadded} │ ${row.score.toString().padStart(5)} │`);
}

console.log('└' + '─'.repeat(countryWidth + 2) + '┴' + '─'.repeat(statusWidth + 2) + '┴───┘');

// ============================================================================
// Combined Example: All utilities working together
// ============================================================================
console.log('\n=== Combined Example ===\n');

class SafeUser {
  constructor(
    private name: string,
    private email: string,
    private bio: string
  ) {}

  // Custom inspect
  [Bun.inspect.custom]() {
    return `SafeUser(name="${Bun.escapeHTML(this.name)}", email="${this.email}")`;
  }

  // Safe HTML generation
  toSafeHTML(): string {
    return `
      <div class="user">
        <h2>${Bun.escapeHTML(this.name)}</h2>
        <p>${Bun.escapeHTML(this.bio)}</p>
      </div>
    `.trim();
  }

  // Comparison
  equals(other: SafeUser): boolean {
    return Bun.deepEquals(
      { name: this.name, email: this.email },
      { name: other.name, email: other.email }
    );
  }
}

const user1 = new SafeUser('Alice <script>', 'alice@example.com', 'Hello & welcome!');
const user2 = new SafeUser('Alice <script>', 'alice@example.com', 'Different bio');

console.log('SafeUser with all utilities:');
console.log(user1);
console.log('\nSafe HTML:');
console.log(user1.toSafeHTML());
console.log(`\nuser1.equals(user2): ${user1.equals(user2)}`);

console.log('\n✅ All Bun utilities examples completed!');

