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

console.log("╔════════════════════════════════════════════════════════════════╗");
console.log("║  Bun Utilities Examples                                      ║");
console.log("╚════════════════════════════════════════════════════════════════╝\n");

// ============================================================================
// 1. Bun.inspect.table()
// ============================================================================

console.log("=== 1. Bun.inspect.table() ===\n");

const users = [
  { id: 1, name: "Alice", age: 30, role: "admin" },
  { id: 2, name: "Bob", age: 25, role: "user" },
  { id: 3, name: "Charlie", age: 35, role: "user" },
  { id: 4, name: "Diana", age: 28, role: "moderator" }
];

console.log("Basic table:");
console.log(Bun.inspect.table(users) + "\n");

console.log("Select specific properties:");
console.log(Bun.inspect.table(users, ["name", "role"]) + "\n");

// ============================================================================
// 2. Bun.inspect.custom
// ============================================================================

console.log("=== 2. Bun.inspect.custom ===\n");

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
console.log("Custom inspect:");
console.log("  ", user); // Uses custom inspect
console.log();

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
console.log("Custom inspect with table:");
console.log(metrics);
console.log();

// ============================================================================
// 3. Bun.deepEquals()
// ============================================================================

console.log("=== 3. Bun.deepEquals() ===\n");

const obj1 = { a: 1, b: { c: 2, d: [3, 4] } };
const obj2 = { a: 1, b: { c: 2, d: [3, 4] } };
const obj3 = { a: 1, b: { c: 2, d: [3, 5] } };

console.log("obj1:", JSON.stringify(obj1));
console.log("obj2:", JSON.stringify(obj2));
console.log("obj3:", JSON.stringify(obj3));
console.log();

console.log("Bun.deepEquals(obj1, obj2):", Bun.deepEquals(obj1, obj2)); // true
console.log("Bun.deepEquals(obj1, obj3):", Bun.deepEquals(obj1, obj3)); // false
console.log();

// Edge cases
console.log("Edge cases:");
console.log("  [] == []:", Bun.deepEquals([], [])); // true
console.log("  [1,2] == [1,2]:", Bun.deepEquals([1, 2], [1, 2])); // true
console.log("  [1,2] == [2,1]:", Bun.deepEquals([1, 2], [2, 1])); // false
console.log("  NaN == NaN:", Bun.deepEquals(NaN, NaN)); // true
console.log();

// ============================================================================
// 4. Bun.escapeHTML()
// ============================================================================

console.log("=== 4. Bun.escapeHTML() ===\n");

const unsafeHTML = '<script>alert("XSS")</script>';
const safeHTML = Bun.escapeHTML(unsafeHTML);

console.log("Unsafe HTML:", unsafeHTML);
console.log("Safe HTML:  ", safeHTML);
console.log();

// Real-world example
const userInput = '<img src=x onerror="alert(1)">';
const comment = `User said: ${userInput}`;

console.log("Unsafe comment:", comment);
console.log("Safe comment:  ", Bun.escapeHTML(comment));
console.log();

// ============================================================================
// 5. Bun.stringWidth()
// ============================================================================

console.log("=== 5. Bun.stringWidth() ===\n");

const strings = [
  "Hello",
  "Hello, World! 🔥",
  "日本語", // Japanese
  "👨‍👩‍👧‍👦", // Family emoji (4 people, 1 emoji)
  "ＨＥＬＬＯ", // Full-width letters
  "Mix of 🔥 and regular text"
];

console.log("String width calculations:");
strings.forEach(str => {
  const width = Bun.stringWidth(str);
  const length = str.length;
  console.log(`  "${str}"`);
  console.log(`    Length: ${length}, Width: ${width}`);
});
console.log();

// Practical use case: Terminal table alignment
console.log("Terminal table alignment:");
const data = [
  { name: "Alice", status: "🟢 Online" },
  { name: "Bob", status: "🔴 Offline" },
  { name: "日本語 User", status: "🟡 Away" }
];

data.forEach(row => {
  const nameWidth = Bun.stringWidth(row.name);
  const padding = " ".repeat(20 - nameWidth);
  console.log(`  ${row.name}${padding}${row.status}`);
});
console.log();

// ============================================================================
// Combined Examples
// ============================================================================

console.log("=== Combined Examples ===\n");

// Example 1: Safe HTML table output
console.log("1. Safe HTML table output:");

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
console.log("HTML-safe table output:");
console.log(safeTable[Symbol.for("Bun.inspect.custom")]());
console.log();

// Example 2: Deep equality comparison with custom inspect
console.log("2. State comparison:");

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

console.log("State 1:");
console.log(state1);
console.log("\nState 2:");
console.log(state2);
console.log("\nState 3:");
console.log(state3);

console.log("\nstate1.equals(state2):", state1.equals(state2)); // true
console.log("state1.equals(state3):", state1.equals(state3)); // false
console.log();

// Example 3: String width in table formatting
console.log("3. Perfect table alignment using Bun.stringWidth():");

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

console.log(createTable(emojiData));
console.log();

// ============================================================================
// Summary
// ============================================================================

console.log("╔════════════════════════════════════════════════════════════════╗");
console.log("║  ✅ All Bun utilities demonstrated!                         ║");
console.log("╚════════════════════════════════════════════════════════════════╝\n");

console.log("Summary:");
console.log("  1. Bun.inspect.table()  - Format tabular data as string");
console.log("  2. Bun.inspect.custom   - Custom inspect output");
console.log("  3. Bun.deepEquals()     - Deep equality comparison");
console.log("  4. Bun.escapeHTML()     - Escape HTML entities");
console.log("  5. Bun.stringWidth()    - Calculate display width\n");
