// packages/odds-core/src/__tests__/ci-enforcement-test.test.ts
// Test CI enforcement features

import { test, expect } from "bun:test";

// This would normally be blocked in CI
// test.only("this should be blocked in CI", () => {
//   expect(true).toBe(true);
// });

test("normal test should work", () => {
  expect(true).toBe(true);
});

test.failing("expected to fail", () => {
  expect(false).toBe(true);
});
