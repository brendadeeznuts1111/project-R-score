#!/usr/bin/env bun
/**
 * Demo: Symbol.dispose support for mock() and spyOn()
 * 
 * Demonstrates automatic mock cleanup with the 'using' keyword
 */

import { spyOn, mock, expect, test, describe } from "bun:test";

console.log("🧪 Bun v1.3.9: Mock Auto-Cleanup with Symbol.dispose\n");
console.log("=".repeat(70));

// Example class to mock
class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }
  
  multiply(a: number, b: number): number {
    return a * b;
  }
}

class API {
  async fetchData(url: string): Promise<any> {
    return { data: `from ${url}` };
  }
}

console.log("\n📝 Example 1: spyOn with 'using' keyword");
console.log("-".repeat(70));

const calc = new Calculator();

{
  using spy = spyOn(calc, "add").mockReturnValue(999);
  
  console.log(`Original add(2, 3) = ${calc.add(2, 3)}`);
  console.log(`Spy called: ${spy.mock.calls.length} times`);
  
  // spy automatically restored when leaving scope
}

console.log(`After scope: add(2, 3) = ${calc.add(2, 3)}`);
console.log("✅ Mock automatically restored!");

console.log("\n📝 Example 2: Multiple mocks with auto-cleanup");
console.log("-".repeat(70));

{
  using spyAdd = spyOn(calc, "add").mockReturnValue(100);
  using spyMul = spyOn(calc, "multiply").mockReturnValue(200);
  
  console.log(`add(1, 1) = ${calc.add(1, 1)}`);
  console.log(`multiply(2, 3) = ${calc.multiply(2, 3)}`);
  
  // Both mocks automatically restored
}

console.log(`add(2, 3) = ${calc.add(2, 3)}`);
console.log(`multiply(2, 3) = ${calc.multiply(2, 3)}`);
console.log("✅ All mocks automatically restored!");

console.log("\n📝 Example 3: mock() with Symbol.dispose");
console.log("-".repeat(70));

const fn = mock(() => "original");

console.log(`fn() = ${fn()}`);
console.log(`Call count: ${fn.mock.calls.length}`);

fn[Symbol.dispose](); // Same as fn.mockRestore()

console.log(`Call count after dispose: ${fn.mock.calls.length}`);
console.log("✅ Mock restored via Symbol.dispose!");

console.log("\n📝 Example 4: Async mocks");
console.log("-".repeat(70));

const api = new API();

{
  using spy = spyOn(api, "fetchData").mockResolvedValue({ data: "mocked" });
  
  const result = await api.fetchData("http://example.com");
  console.log(`Fetched: ${JSON.stringify(result)}`);
  
  // Mock automatically restored
}

console.log("✅ Async mock automatically restored!");

console.log("\n📝 Example 5: Cleanup even on exceptions");
console.log("-".repeat(70));

const originalAdd = calc.add;

try {
  {
    using spy = spyOn(calc, "add").mockReturnValue(999);
    throw new Error("Test error");
  }
} catch (e) {
  console.log(`Caught error: ${e.message}`);
}

// Mock should still be restored despite exception
console.log(`add(2, 3) = ${calc.add(2, 3)}`);
console.log(`Original restored: ${calc.add === originalAdd}`);

console.log("\n✅ Demo complete!");
console.log("\nKey Features:");
console.log("  • Automatic cleanup with 'using' keyword");
console.log("  • Works with spyOn() and mock()");
console.log("  • Cleanup happens even on exceptions");
console.log("  • No need for manual mockRestore() or afterEach");
