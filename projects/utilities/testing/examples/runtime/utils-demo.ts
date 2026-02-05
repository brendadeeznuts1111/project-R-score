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

console.log("=== Bun Utilities Demonstration ===\n");

// 1. Bun.inspect.table
console.log("1. Bun.inspect.table (Tabular Data)");
const users = [
  { name: "Alice", role: "Admin", id: 1 },
  { name: "Bob", role: "User", id: 2 },
  { name: "Charlie", role: "User", id: 3 },
];
console.log(Bun.inspect.table(users));
console.log("");

// 2. Bun.inspect.custom
console.log("2. Bun.inspect.custom (Custom Inspection)");
class CustomClass {
  constructor(public value: string) {}
  [Symbol.for("nodejs.util.inspect.custom")]() {
    return `CustomClass(${this.value})`;
  }
}
const customObj = new CustomClass("Hello World");
console.log(Bun.inspect(customObj)); // Standard inspect
console.log("");

// 3. Bun.deepEquals
console.log("3. Bun.deepEquals (Deep Comparison)");
const objA = { a: 1, b: { c: 2 } };
const objB = { a: 1, b: { c: 2 } };
const objC = { a: 1, b: { c: 3 } };

console.log(`objA deepEquals objB: ${Bun.deepEquals(objA, objB)}`); // true
console.log(`objA deepEquals objC: ${Bun.deepEquals(objA, objC)}`); // false
console.log("");

// 4. Bun.escapeHTML
console.log("4. Bun.escapeHTML");
const maliciousInput = "<script>alert('xss')</script>";
const safeOutput = Bun.escapeHTML(maliciousInput);
console.log(`Original:  ${maliciousInput}`);
console.log(`Escaped:   ${safeOutput}`);
console.log("");

// 5. Bun.stringWidth
console.log("5. Bun.stringWidth (Visual Width)");
const text = "日本語"; // Japanese characters
console.log(`Text: "${text}"`);
console.log(`Byte Length: ${text.length}`);
console.log(`Visual Width: ${Bun.stringWidth(text)}`); // Usually 2 chars per CJK char in terminals
console.log("");

// 6. Random Port & Server (If you want to test networking)
console.log("6. Random Port Server (Optional)");
console.log("Starting a server on a random available port...");

const server = Bun.serve({
  port: 0, // 0 tells Bun to pick a random available port
  fetch(req) {
    return new Response("Hello from Bun!");
  },
});

console.log(`Server started on port: ${server.port}`);
console.log(`URL: http://localhost:${server.port}`);
console.log("You can visit the URL above to confirm it works.");
console.log("(Note: Server will keep running. Stop the script to shut it down.)");

// Keep alive for demo purposes
await new Promise(() => {});
