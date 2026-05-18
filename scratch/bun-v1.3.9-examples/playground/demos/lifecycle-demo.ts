#!/usr/bin/env bun
/**
 * Demo: Bun Test Lifecycle Hooks
 * 
 * beforeAll, afterAll, beforeEach, afterEach
 * https://bun.com/docs/test#lifecycle-hooks
 */

console.info("🔄 Bun Test Lifecycle Hooks Demo\n");
console.info("=".repeat(70));

const exampleCode = `import { test, expect, beforeAll, afterAll, beforeEach, afterEach } from "bun:test";

let database: Database;
let connectionCount = 0;

// Runs once before all tests
beforeAll(() => {
  database = new Database();
  console.info("📦 Setup: Database connected");
});

// Runs once after all tests
afterAll(() => {
  database.close();
  console.info("📦 Cleanup: Database closed");
});

// Runs before each test
beforeEach(() => {
  connectionCount++;
  console.info(\`🔌 Test #\${connectionCount} starting\`);
});

// Runs after each test
afterEach(() => {
  console.info(\`✅ Test #\${connectionCount} completed\`);
});

test("create user", () => {
  const user = database.createUser("Alice");
  expect(user.name).toBe("Alice");
});

test("get user", () => {
  const user = database.getUser("Alice");
  expect(user).toBeDefined();
});`;

console.info(exampleCode);

console.info("\n📋 Lifecycle Order:\n");
console.info("-".repeat(70));
console.info("1. beforeAll   → Runs once before all tests");
console.info("2. beforeEach  → Runs before each test");
console.info("3. test()      → The actual test");
console.info("4. afterEach   → Runs after each test");
console.info("5. afterAll    → Runs once after all tests");

console.info("\n✅ Key Points:");
console.info("  • Use beforeAll/afterAll for expensive setup (DB, files)");
console.info("  • Use beforeEach/afterEach for clean state between tests");
console.info("  • Hooks can be async (return Promise or use async/await)");
console.info("  • Nested describe blocks have their own hooks");

console.info("\n🚀 Run tests:");
console.info("  bun test lifecycle.test.ts");
