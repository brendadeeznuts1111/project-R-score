#!/usr/bin/env bun
/**
 * Demo: Bun Test Lifecycle Hooks
 * 
 * beforeAll, afterAll, beforeEach, afterEach
 * https://bun.com/docs/test#lifecycle-hooks
 */

console.log("🔄 Bun Test Lifecycle Hooks Demo\n");
console.log("=".repeat(70));

const exampleCode = `import { test, expect, beforeAll, afterAll, beforeEach, afterEach } from "bun:test";

let database: Database;
let connectionCount = 0;

// Runs once before all tests
beforeAll(() => {
  database = new Database();
  console.log("📦 Setup: Database connected");
});

// Runs once after all tests
afterAll(() => {
  database.close();
  console.log("📦 Cleanup: Database closed");
});

// Runs before each test
beforeEach(() => {
  connectionCount++;
  console.log(\`🔌 Test #\${connectionCount} starting\`);
});

// Runs after each test
afterEach(() => {
  console.log(\`✅ Test #\${connectionCount} completed\`);
});

test("create user", () => {
  const user = database.createUser("Alice");
  expect(user.name).toBe("Alice");
});

test("get user", () => {
  const user = database.getUser("Alice");
  expect(user).toBeDefined();
});`;

console.log(exampleCode);

console.log("\n📋 Lifecycle Order:\n");
console.log("-".repeat(70));
console.log("1. beforeAll   → Runs once before all tests");
console.log("2. beforeEach  → Runs before each test");
console.log("3. test()      → The actual test");
console.log("4. afterEach   → Runs after each test");
console.log("5. afterAll    → Runs once after all tests");

console.log("\n✅ Key Points:");
console.log("  • Use beforeAll/afterAll for expensive setup (DB, files)");
console.log("  • Use beforeEach/afterEach for clean state between tests");
console.log("  • Hooks can be async (return Promise or use async/await)");
console.log("  • Nested describe blocks have their own hooks");

console.log("\n🚀 Run tests:");
console.log("  bun test lifecycle.test.ts");
