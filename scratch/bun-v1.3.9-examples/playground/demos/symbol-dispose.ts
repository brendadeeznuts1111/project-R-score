#!/usr/bin/env bun
/**
 * Demo: Symbol.dispose for mock() and spyOn (v1.3.9)
 * 
 * Automatic mock cleanup with `using` keyword
 */

import { mock, spyOn, expect, test } from "bun:test";

console.log("🧪 Bun v1.3.9: Symbol.dispose for Mocks\n");
console.log("=".repeat(70));

// 1. Basic Symbol.dispose with spyOn
console.log("\n1️⃣ spyOn() with Symbol.dispose");
console.log("-".repeat(70));

const obj = { 
  method: () => "original",
  calculate: (a: number, b: number) => a + b
};

console.log("Before mock:", obj.method());

{
  using spy = spyOn(obj, "method").mockReturnValue("mocked");
  console.log("Inside scope:", obj.method());
  console.log("Call count:", spy.mock.calls.length);
}

console.log("After scope (auto-restored):", obj.method());

// 2. mock() function with Symbol.dispose
console.log("\n2️⃣ mock() with Symbol.dispose");
console.log("-".repeat(70));

const fn = mock(() => "original");
console.log("Before dispose:", fn());
console.log("Call count:", fn.mock.calls.length);

fn[Symbol.dispose]();

console.log("After Symbol.dispose:");
console.log("Call count reset:", fn.mock.calls.length);
console.log("Function still works:", fn());

// 3. Multiple mocks in same scope
console.log("\n3️⃣ Multiple mocks in same scope");
console.log("-".repeat(70));

const api = {
  getUser: () => ({ id: 1, name: "Real" }),
  getPosts: () => [{ id: 1, title: "Real Post" }],
};

{
  using userSpy = spyOn(api, "getUser").mockReturnValue({ id: 2, name: "Mocked" });
  using postsSpy = spyOn(api, "getPosts").mockReturnValue([{ id: 2, title: "Mocked Post" }]);
  
  console.log("User:", api.getUser());
  console.log("Posts:", api.getPosts());
}

console.log("After scope:");
console.log("User:", api.getUser());
console.log("Posts:", api.getPosts());

// 4. Manual dispose vs automatic
console.log("\n4️⃣ Manual dispose example");
console.log("-".repeat(70));

const manualMock = mock(() => "value");
manualMock();
manualMock();
console.log("Calls before manual dispose:", manualMock.mock.calls.length);

manualMock[Symbol.dispose]();
console.log("Calls after manual dispose:", manualMock.mock.calls.length);

console.log("\n✅ Symbol.dispose demo complete!");
console.log("\n💡 Key benefits:");
console.log("   - Automatic cleanup when leaving scope");
console.log("   - No need for manual mockRestore()");
console.log("   - Works with afterEach automatically");
