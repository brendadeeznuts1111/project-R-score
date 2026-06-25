/**
 * Bun Utilities & Advanced Features Demo
 * 
 * Demonstrates:
 * - Bun.inspect.table, Bun.inspect.custom
 * - Bun.deepEquals
 * - Bun.escapeHTML
 * - Bun.stringWidth
 * - Random Port (Server)
 * 
 * Run with: bun --hot examples/runtime/utils-demo.ts
 */

console.info("=== Bun Utilities Demonstration ===\n");

// 1. Bun.inspect.table
console.info("1. Bun.inspect.table (Tabular Data)");
const users = [
  { name: "Alice", role: "Admin", id: 1 },
  { name: "Bob", role: "User", id: 2 },
  { name: "Charlie", role: "User", id: 3 },
];
console.info(Bun.inspect.table(users));
console.info("");

// 2. Bun.inspect.custom
console.info("2. Bun.inspect.custom (Custom Inspection)");
class CustomClass {
  constructor(public value: string) {}
  [Symbol.for("nodejs.util.inspect.custom")]() {
    return `CustomClass(${this.value})`;
  }
}
const customObj = new CustomClass("Hello World");
console.info(Bun.inspect(customObj)); // Standard inspect
console.info("");

// 3. Bun.deepEquals
console.info("3. Bun.deepEquals (Deep Comparison)");
const objA = { a: 1, b: { c: 2 } };
const objB = { a: 1, b: { c: 2 } };
const objC = { a: 1, b: { c: 3 } };

console.info(`objA deepEquals objB: ${Bun.deepEquals(objA, objB)}`); // true
console.info(`objA deepEquals objC: ${Bun.deepEquals(objA, objC)}`); // false
console.info("");

// 4. Bun.escapeHTML
console.info("4. Bun.escapeHTML");
const maliciousInput = "<script>alert('xss')</script>";
const safeOutput = Bun.escapeHTML(maliciousInput);
console.info(`Original:  ${maliciousInput}`);
console.info(`Escaped:   ${safeOutput}`);
console.info("");

// 5. Bun.stringWidth
console.info("5. Bun.stringWidth (Visual Width)");
const text = "日本語"; // Japanese characters
console.info(`Text: "${text}"`);
console.info(`Byte Length: ${text.length}`);
console.info(`Visual Width: ${Bun.stringWidth(text)}`); // Usually 2 chars per CJK char in terminals
console.info("");

// 6. Random Port & Server (If you want to test networking)
console.info("6. Random Port Server (Optional)");
console.info("Starting a server on a random available port...");

const server = Bun.serve({
  port: 0, // 0 tells Bun to pick a random available port
  fetch(req) {
    return new Response("Hello from Bun!");
  },
});

console.info(`Server started on port: ${server.port}`);
console.info(`URL: http://localhost:${server.port}`);
console.info("You can visit the URL above to confirm it works.");
console.info("(Note: Server will keep running. Stop the script to shut it down.)");

// Keep alive for demo purposes
await new Promise(() => {});
