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

console.info("=== BASIC INSPECTION ===\n");

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

console.info("inspect():");
console.info(inspect(user));

console.info("\ninspectForLog():");
console.info(inspectForLog(user));

console.info("\ninspectCompact():");
console.info(inspectCompact(user));

// ============================================================================
// 2. TABLE FORMATTING
// ============================================================================

console.info("\n=== TABLE FORMATTING ===\n");

const users = [
  { id: 1, name: "Alice", role: "admin", active: true },
  { id: 2, name: "Bob", role: "user", active: true },
  { id: 3, name: "Charlie", role: "user", active: false },
];

console.info("ASCII Table:");
console.info(table(users));

console.info("\nMarkdown Table:");
console.info(tableMarkdown(users));

console.info("\nCSV Export:");
console.info(tableCsv(users));

// ============================================================================
// 3. DEEP COMPARISON
// ============================================================================

console.info("\n=== DEEP COMPARISON ===\n");

const obj1 = { a: 1, b: { c: 2 } };
const obj2 = { a: 1, b: { c: 2 } };
const obj3 = { a: 1, b: { c: 3 } };

console.info("deepEquals(obj1, obj2):", deepEquals(obj1, obj2)); // true
console.info("deepEquals(obj1, obj3):", deepEquals(obj1, obj3)); // false

const diff = findDifferences(obj1, obj3);
console.info("\nDifferences:");
console.info(diff);

// ============================================================================
// 4. STRING WIDTH & LAYOUT
// ============================================================================

console.info("\n=== STRING WIDTH & LAYOUT ===\n");

const text1 = "Hello World";
const text2 = "Hello 👋 World";
const text3 = "\x1b[36mColored Text\x1b[0m";

console.info(`Width of "${text1}":`, stringWidth(text1));
console.info(`Width of "${text2}":`, stringWidth(text2));
console.info(`Width of colored text:`, stringWidth(text3));

console.info("\nPadding:");
console.info(`"${padToWidth("hi", 10)}"`);
console.info(`"${padToWidth("hello", 10, "-")}"`);

console.info("\nTruncation:");
console.info(`"${truncateToWidth("Hello World", 8)}"`);
console.info(`"${truncateToWidth("Hello World", 8, "...")}"`);

// ============================================================================
// 5. PROMISE PEEKING
// ============================================================================

console.info("\n=== PROMISE PEEKING ===\n");

const promise1 = Promise.resolve({ data: "resolved" });
const promise2 = new Promise((resolve) => setTimeout(() => resolve({ data: "delayed" }), 100));

console.info("Peeking resolved promise:");
console.info(peek(promise1));

console.info("\nPeeking pending promise:");
console.info(peek(promise2)); // undefined (still pending)

console.info("\nPeek with state:");
const state = peekWithState(promise1);
console.info(state);

// ============================================================================
// 6. CUSTOM INSPECTION
// ============================================================================

console.info("\n=== CUSTOM INSPECTION ===\n");

class User {
  constructor(public name: string, public email: string) {}

  [Symbol.for("Bun.inspect.custom")](): string {
    const label = `👤 ${this.name}`;
    return formatDarkMode(label, "magenta");
  }
}

const alice = new User("Alice", "alice@example.com");
console.info("Custom inspect:");
console.info(inspect(alice));

// ============================================================================
// 7. SENSITIVE DATA MASKING
// ============================================================================

console.info("\n=== SENSITIVE DATA MASKING ===\n");

const credentials = {
  username: "alice",
  password: "secret123",
  apiKey: "sk-1234567890",
  email: "alice@example.com",
};

console.info("Original:");
console.info(inspect(credentials));

console.info("\nMasked:");
const masked = maskSensitive(credentials);
console.info(inspect(masked));

// ============================================================================
// 8. DARK-MODE FORMATTING
// ============================================================================

console.info("\n=== DARK-MODE FORMATTING ===\n");

console.info(formatDarkMode("Cyan text", "cyan"));
console.info(formatDarkMode("Magenta text", "magenta"));
console.info(formatDarkMode("Green text", "green"));
console.info(formatDarkMode("Red text", "red"));

console.info("\n✅ All examples completed!");

