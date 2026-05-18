#!/usr/bin/env bun
/**
 * Demo: Symbol.dispose for mock() and spyOn (v1.3.9)
 * 
 * Automatic mock cleanup with `using` keyword
 */

import { mock, spyOn, expect, test } from "bun:test";

console.info("🧪 Bun v1.3.9: Symbol.dispose for Mocks\n");
console.info("=".repeat(70));

// 1. Basic Symbol.dispose with spyOn
console.info("\n1️⃣ spyOn() with Symbol.dispose");
console.info("-".repeat(70));

const obj = { 
  method: () => "original",
  calculate: (a: number, b: number) => a + b
};

console.info("Before mock:", obj.method());

{
  using spy = spyOn(obj, "method").mockReturnValue("mocked");
  console.info("Inside scope:", obj.method());
  console.info("Call count:", spy.mock.calls.length);
}

console.info("After scope (auto-restored):", obj.method());

// 2. mock() function with Symbol.dispose
console.info("\n2️⃣ mock() with Symbol.dispose");
console.info("-".repeat(70));

const fn = mock(() => "original");
console.info("Before dispose:", fn());
console.info("Call count:", fn.mock.calls.length);

fn[Symbol.dispose]();

console.info("After Symbol.dispose:");
console.info("Call count reset:", fn.mock.calls.length);
console.info("Function still works:", fn());

// 3. Multiple mocks in same scope
console.info("\n3️⃣ Multiple mocks in same scope");
console.info("-".repeat(70));

const api = {
  getUser: () => ({ id: 1, name: "Real" }),
  getPosts: () => [{ id: 1, title: "Real Post" }],
};

{
  using userSpy = spyOn(api, "getUser").mockReturnValue({ id: 2, name: "Mocked" });
  using postsSpy = spyOn(api, "getPosts").mockReturnValue([{ id: 2, title: "Mocked Post" }]);
  
  console.info("User:", api.getUser());
  console.info("Posts:", api.getPosts());
}

console.info("After scope:");
console.info("User:", api.getUser());
console.info("Posts:", api.getPosts());

// 4. Manual dispose vs automatic
console.info("\n4️⃣ Manual dispose example");
console.info("-".repeat(70));

const manualMock = mock(() => "value");
manualMock();
manualMock();
console.info("Calls before manual dispose:", manualMock.mock.calls.length);

manualMock[Symbol.dispose]();
console.info("Calls after manual dispose:", manualMock.mock.calls.length);

console.info("\n✅ Symbol.dispose demo complete!");
console.info("\n💡 Key benefits:");
console.info("   - Automatic cleanup when leaving scope");
console.info("   - No need for manual mockRestore()");
console.info("   - Works with afterEach automatically");
