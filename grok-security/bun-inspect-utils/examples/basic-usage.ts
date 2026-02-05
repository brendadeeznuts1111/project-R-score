/**
 * [EXAMPLE][BASIC][USAGE]{BUN-API}
 * Basic usage examples for @bun/inspect-utils
 */

import {
  inspect,
  inspectForLog,
  inspectForRepl,
  inspectCompact,
  table,
  tableMarkdown,
  tableCsv,
  deepEquals,
  findDifferences,
  stringWidth,
  padToWidth,
  truncateToWidth,
  peek,
  peekWithState,
  createCustomInspect,
  formatDarkMode,
  maskSensitive,
} from "../src/index";

// ============================================================================
// 1. BASIC INSPECTION
// ============================================================================

console.log("=== BASIC INSPECTION ===\n");

const user = {
  id: 1,
  name: "Alice Johnson",
  email: "alice@example.com",
  roles: ["admin", "user"],
  metadata: {
    created: "2024-01-01",
    lastLogin: "2024-01-17",
  },
};

console.log("inspect():");
console.log(inspect(user));

console.log("\ninspectForLog():");
console.log(inspectForLog(user));

console.log("\ninspectCompact():");
console.log(inspectCompact(user));

// ============================================================================
// 2. TABLE FORMATTING
// ============================================================================

console.log("\n=== TABLE FORMATTING ===\n");

const users = [
  { id: 1, name: "Alice", role: "admin", active: true },
  { id: 2, name: "Bob", role: "user", active: true },
  { id: 3, name: "Charlie", role: "user", active: false },
];

console.log("ASCII Table:");
console.log(table(users));

console.log("\nMarkdown Table:");
console.log(tableMarkdown(users));

console.log("\nCSV Export:");
console.log(tableCsv(users));

// ============================================================================
// 3. DEEP COMPARISON
// ============================================================================

console.log("\n=== DEEP COMPARISON ===\n");

const obj1 = { a: 1, b: { c: 2 } };
const obj2 = { a: 1, b: { c: 2 } };
const obj3 = { a: 1, b: { c: 3 } };

console.log("deepEquals(obj1, obj2):", deepEquals(obj1, obj2)); // true
console.log("deepEquals(obj1, obj3):", deepEquals(obj1, obj3)); // false

const diff = findDifferences(obj1, obj3);
console.log("\nDifferences:");
console.log(diff);

// ============================================================================
// 4. STRING WIDTH & LAYOUT
// ============================================================================

console.log("\n=== STRING WIDTH & LAYOUT ===\n");

const text1 = "Hello World";
const text2 = "Hello 👋 World";
const text3 = "\x1b[36mColored Text\x1b[0m";

console.log(`Width of "${text1}":`, stringWidth(text1));
console.log(`Width of "${text2}":`, stringWidth(text2));
console.log(`Width of colored text:`, stringWidth(text3));

console.log("\nPadding:");
console.log(`"${padToWidth("hi", 10)}"`);
console.log(`"${padToWidth("hello", 10, "-")}"`);

console.log("\nTruncation:");
console.log(`"${truncateToWidth("Hello World", 8)}"`);
console.log(`"${truncateToWidth("Hello World", 8, "...")}"`);

// ============================================================================
// 5. PROMISE PEEKING
// ============================================================================

console.log("\n=== PROMISE PEEKING ===\n");

const promise1 = Promise.resolve({ data: "resolved" });
const promise2 = new Promise((resolve) => setTimeout(() => resolve({ data: "delayed" }), 100));

console.log("Peeking resolved promise:");
console.log(peek(promise1));

console.log("\nPeeking pending promise:");
console.log(peek(promise2)); // undefined (still pending)

console.log("\nPeek with state:");
const state = peekWithState(promise1);
console.log(state);

// ============================================================================
// 6. CUSTOM INSPECTION
// ============================================================================

console.log("\n=== CUSTOM INSPECTION ===\n");

class User {
  constructor(public name: string, public email: string) {}

  [Symbol.for("Bun.inspect.custom")](): string {
    const label = `👤 ${this.name}`;
    return formatDarkMode(label, "magenta");
  }
}

const alice = new User("Alice", "alice@example.com");
console.log("Custom inspect:");
console.log(inspect(alice));

// ============================================================================
// 7. SENSITIVE DATA MASKING
// ============================================================================

console.log("\n=== SENSITIVE DATA MASKING ===\n");

const credentials = {
  username: "alice",
  password: "secret123",
  apiKey: "sk-1234567890",
  email: "alice@example.com",
};

console.log("Original:");
console.log(inspect(credentials));

console.log("\nMasked:");
const masked = maskSensitive(credentials);
console.log(inspect(masked));

// ============================================================================
// 8. DARK-MODE FORMATTING
// ============================================================================

console.log("\n=== DARK-MODE FORMATTING ===\n");

console.log(formatDarkMode("Cyan text", "cyan"));
console.log(formatDarkMode("Magenta text", "magenta"));
console.log(formatDarkMode("Green text", "green"));
console.log(formatDarkMode("Red text", "red"));

console.log("\n✅ All examples completed!");

