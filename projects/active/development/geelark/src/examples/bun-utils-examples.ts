#!/usr/bin/env bun
/**
 * Bun Utilities Examples
 *
 * Demonstrates all Bun utility functions:
 * - Bun.inspect.table()
 * - Bun.inspect.custom
 * - Bun.deepEquals()
 * - Bun.escapeHTML()
 * - Bun.stringWidth()
 *
 * Run: bun examples/bun-utils-examples.ts
 */

console.info("╔════════════════════════════════════════════════════════════════╗");
console.info("║  Bun Utilities Examples                                      ║");
console.info("╚════════════════════════════════════════════════════════════════╝\n");

// ============================================================================
// 1. Bun.inspect.table()
// ============================================================================

console.info("=== 1. Bun.inspect.table() ===\n");

const users = [
  { id: 1, name: "Alice", age: 30, role: "admin" },
  { id: 2, name: "Bob", age: 25, role: "user" },
  { id: 3, name: "Charlie", age: 35, role: "user" },
  { id: 4, name: "Diana", age: 28, role: "moderator" }
];

console.info("Basic table:");
console.info(Bun.inspect.table(users) + "\n");

console.info("Select specific properties:");
console.info(Bun.inspect.table(users, ["name", "role"]) + "\n");

// ============================================================================
// 2. Bun.inspect.custom
// ============================================================================

console.info("=== 2. Bun.inspect.custom ===\n");

class User {
  constructor(
    public id: number,
    public name: string,
    public email: string
  ) {}

  // Custom inspect output
  get [Symbol.for("Bun.inspect.custom")]() {
    return () => `User#${this.id} { name: "${this.name}", email: "${this.email}" }`;
  }
}

const user = new User(1, "Alice", "alice@example.com");
console.info("Custom inspect:");
console.info("  ", user); // Uses custom inspect
console.info();

class ServerMetrics {
  constructor(
    public uptime: number,
    public requests: number,
    public connections: number
  ) {}

  get [Symbol.for("Bun.inspect.custom")]() {
    return () => {
      const data = {
        Uptime: `${Math.floor(this.uptime / 1000)}s`,
        Requests: this.requests.toLocaleString(),
        Connections: this.connections.toString()
      };

      return "\n" + Bun.inspect.table(data);
    };
  }
}

const metrics = new ServerMetrics(123456, 1234567, 42);
console.info("Custom inspect with table:");
console.info(metrics);
console.info();

// ============================================================================
// 3. Bun.deepEquals()
// ============================================================================

console.info("=== 3. Bun.deepEquals() ===\n");

const obj1 = { a: 1, b: { c: 2, d: [3, 4] } };
const obj2 = { a: 1, b: { c: 2, d: [3, 4] } };
const obj3 = { a: 1, b: { c: 2, d: [3, 5] } };

console.info("obj1:", JSON.stringify(obj1));
console.info("obj2:", JSON.stringify(obj2));
console.info("obj3:", JSON.stringify(obj3));
console.info();

console.info("Bun.deepEquals(obj1, obj2):", Bun.deepEquals(obj1, obj2)); // true
console.info("Bun.deepEquals(obj1, obj3):", Bun.deepEquals(obj1, obj3)); // false
console.info();

// Edge cases
console.info("Edge cases:");
console.info("  [] == []:", Bun.deepEquals([], [])); // true
console.info("  [1,2] == [1,2]:", Bun.deepEquals([1, 2], [1, 2])); // true
console.info("  [1,2] == [2,1]:", Bun.deepEquals([1, 2], [2, 1])); // false
console.info("  NaN == NaN:", Bun.deepEquals(NaN, NaN)); // true
console.info();

// ============================================================================
// 4. Bun.escapeHTML()
// ============================================================================

console.info("=== 4. Bun.escapeHTML() ===\n");

const unsafeHTML = '<script>alert("XSS")</script>';
const safeHTML = Bun.escapeHTML(unsafeHTML);

console.info("Unsafe HTML:", unsafeHTML);
console.info("Safe HTML:  ", safeHTML);
console.info();

// Real-world example
const userInput = '<img src=x onerror="alert(1)">';
const comment = `User said: ${userInput}`;

console.info("Unsafe comment:", comment);
console.info("Safe comment:  ", Bun.escapeHTML(comment));
console.info();

// ============================================================================
// 5. Bun.stringWidth()
// ============================================================================

console.info("=== 5. Bun.stringWidth() ===\n");

const strings = [
  "Hello",
  "Hello, World! 🔥",
  "日本語", // Japanese
  "👨‍👩‍👧‍👦", // Family emoji (4 people, 1 emoji)
  "ＨＥＬＬＯ", // Full-width letters
  "Mix of 🔥 and regular text"
];

console.info("String width calculations:");
strings.forEach(str => {
  const width = Bun.stringWidth(str);
  const length = str.length;
  console.info(`  "${str}"`);
  console.info(`    Length: ${length}, Width: ${width}`);
});
console.info();

// Practical use case: Terminal table alignment
console.info("Terminal table alignment:");
const data = [
  { name: "Alice", status: "🟢 Online" },
  { name: "Bob", status: "🔴 Offline" },
  { name: "日本語 User", status: "🟡 Away" }
];

data.forEach(row => {
  const nameWidth = Bun.stringWidth(row.name);
  const padding = " ".repeat(20 - nameWidth);
  console.info(`  ${row.name}${padding}${row.status}`);
});
console.info();

// ============================================================================
// Combined Examples
// ============================================================================

console.info("=== Combined Examples ===\n");

// Example 1: Safe HTML table output
console.info("1. Safe HTML table output:");

class SafeTable {
  constructor(private data: unknown[]) {}

  get [Symbol.for("Bun.inspect.custom")]() {
    return () => {
      const table = Bun.inspect.table(this.data);
      return Bun.escapeHTML(table);
    };
  }
}

const safeTable = new SafeTable(users);
console.info("HTML-safe table output:");
console.info(safeTable[Symbol.for("Bun.inspect.custom")]());
console.info();

// Example 2: Deep equality comparison with custom inspect
console.info("2. State comparison:");

class ServerState {
  constructor(
    public port: number,
    public connections: number,
    public requests: number
  ) {}

  get [Symbol.for("Bun.inspect.custom")]() {
    return () => {
      const data = {
        Port: this.port,
        Connections: this.connections,
        Requests: this.requests.toLocaleString()
      };
      return "\n" + Bun.inspect.table(data);
    };
  }

  equals(other: ServerState): boolean {
    return Bun.deepEquals(this, other);
  }
}

const state1 = new ServerState(3000, 42, 1000);
const state2 = new ServerState(3000, 42, 1000);
const state3 = new ServerState(3001, 42, 1000);

console.info("State 1:");
console.info(state1);
console.info("\nState 2:");
console.info(state2);
console.info("\nState 3:");
console.info(state3);

console.info("\nstate1.equals(state2):", state1.equals(state2)); // true
console.info("state1.equals(state3):", state1.equals(state3)); // false
console.info();

// Example 3: String width in table formatting
console.info("3. Perfect table alignment using Bun.stringWidth():");

function createTable(data: Record<string, string>[]): string {
  if (data.length === 0) return "No data";

  // Calculate column widths
  const columns = Object.keys(data[0]);
  const widths: Record<string, number> = {};

  columns.forEach(col => {
    widths[col] = Math.max(
      Bun.stringWidth(col),
      ...data.map(row => Bun.stringWidth(String(row[col])))
    );
  });

  // Build table
  const separator = "─".repeat(
    Object.values(widths).reduce((a, b) => a + b + 3, 0)
  );

  let output = "";

  // Header
  output += "┌";
  columns.forEach((col, i) => {
    output += " " + col.padEnd(widths[col]) + " ";
    if (i < columns.length - 1) output += "│";
  });
  output += "┐\n";

  output += "├" + separator.replace(/./g, (c, i) =>
    i % (widths[columns[0]] + 3) === 0 && i !== 0 ? "┼" : c
  ) + "┤\n";

  // Rows
  data.forEach((row, rowIndex) => {
    output += "│";
    columns.forEach((col, colIndex) => {
      const value = String(row[col]);
      const padding = widths[col] - Bun.stringWidth(value);
      output += " " + value + " ".repeat(padding) + " ";
      if (colIndex < columns.length - 1) output += "│";
    });
    output += "│\n";
  });

  output += "└";
  columns.forEach((col, i) => {
    output += "─".repeat(widths[col] + 2);
    if (i < columns.length - 1) output += "┴";
  });
  output += "┘";

  return output;
}

const emojiData = [
  { name: "Alice", status: "🟢 Online", role: "Admin" },
  { name: "Bob", status: "🔴 Offline", role: "User" },
  { name: "日本語", status: "🟡 Away", role: "Guest" }
];

console.info(createTable(emojiData));
console.info();

// ============================================================================
// Summary
// ============================================================================

console.info("╔════════════════════════════════════════════════════════════════╗");
console.info("║  ✅ All Bun utilities demonstrated!                         ║");
console.info("╚════════════════════════════════════════════════════════════════╝\n");

console.info("Summary:");
console.info("  1. Bun.inspect.table()  - Format tabular data as string");
console.info("  2. Bun.inspect.custom   - Custom inspect output");
console.info("  3. Bun.deepEquals()     - Deep equality comparison");
console.info("  4. Bun.escapeHTML()     - Escape HTML entities");
console.info("  5. Bun.stringWidth()    - Calculate display width\n");
