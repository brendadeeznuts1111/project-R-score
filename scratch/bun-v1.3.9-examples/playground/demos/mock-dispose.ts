#!/usr/bin/env bun
/**
 * Demo: Symbol.dispose support for mock() and spyOn()
 * 
 * Demonstrates automatic mock cleanup with the 'using' keyword
 */

import { spyOn, mock, expect, test, describe } from "bun:test";

console.info("🧪 Bun v1.3.9: Mock Auto-Cleanup with Symbol.dispose\n");
console.info("=".repeat(70));

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

console.info("\n📝 Example 1: spyOn with 'using' keyword");
console.info("-".repeat(70));

const calc = new Calculator();

{
  using spy = spyOn(calc, "add").mockReturnValue(999);
  
  console.info(`Original add(2, 3) = ${calc.add(2, 3)}`);
  console.info(`Spy called: ${spy.mock.calls.length} times`);
  
  // spy automatically restored when leaving scope
}

console.info(`After scope: add(2, 3) = ${calc.add(2, 3)}`);
console.info("✅ Mock automatically restored!");

console.info("\n📝 Example 2: Multiple mocks with auto-cleanup");
console.info("-".repeat(70));

{
  using spyAdd = spyOn(calc, "add").mockReturnValue(100);
  using spyMul = spyOn(calc, "multiply").mockReturnValue(200);
  
  console.info(`add(1, 1) = ${calc.add(1, 1)}`);
  console.info(`multiply(2, 3) = ${calc.multiply(2, 3)}`);
  
  // Both mocks automatically restored
}

console.info(`add(2, 3) = ${calc.add(2, 3)}`);
console.info(`multiply(2, 3) = ${calc.multiply(2, 3)}`);
console.info("✅ All mocks automatically restored!");

console.info("\n📝 Example 3: mock() with Symbol.dispose");
console.info("-".repeat(70));

const fn = mock(() => "original");

console.info(`fn() = ${fn()}`);
console.info(`Call count: ${fn.mock.calls.length}`);

fn[Symbol.dispose](); // Same as fn.mockRestore()

console.info(`Call count after dispose: ${fn.mock.calls.length}`);
console.info("✅ Mock restored via Symbol.dispose!");

console.info("\n📝 Example 4: Async mocks");
console.info("-".repeat(70));

const api = new API();

{
  using spy = spyOn(api, "fetchData").mockResolvedValue({ data: "mocked" });
  
  const result = await api.fetchData("http://example.com");
  console.info(`Fetched: ${JSON.stringify(result)}`);
  
  // Mock automatically restored
}

console.info("✅ Async mock automatically restored!");

console.info("\n📝 Example 5: Cleanup even on exceptions");
console.info("-".repeat(70));

const originalAdd = calc.add;

try {
  {
    using spy = spyOn(calc, "add").mockReturnValue(999);
    throw new Error("Test error");
  }
} catch (e) {
  console.info(`Caught error: ${e.message}`);
}

// Mock should still be restored despite exception
console.info(`add(2, 3) = ${calc.add(2, 3)}`);
console.info(`Original restored: ${calc.add === originalAdd}`);

console.info("\n✅ Demo complete!");
console.info("\nKey Features:");
console.info("  • Automatic cleanup with 'using' keyword");
console.info("  • Works with spyOn() and mock()");
console.info("  • Cleanup happens even on exceptions");
console.info("  • No need for manual mockRestore() or afterEach");
