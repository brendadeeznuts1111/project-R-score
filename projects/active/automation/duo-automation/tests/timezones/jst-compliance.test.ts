import { test, expect, beforeAll, afterAll } from "bun:test";
import { TimezoneTestUtils, TIMEZONE_MATRIX } from "./timezone-matrix";

const MOCK_DATE = "2026-01-14T20:00:00.000Z";

beforeAll(() => {
  TimezoneTestUtils.setup("Asia/Tokyo", MOCK_DATE);
});

afterAll(() => {
  TimezoneTestUtils.cleanup();
});

test("JST Matrix Compliance: Tokyo Monitoring", () => {
  const components = TIMEZONE_MATRIX.JST;
  expect(components).toContain("tokyo-monitoring");
  
  // 20:00 UTC is 05:00 JST (Next Day)
  expect(new Date().getHours()).toBe(5);
  expect(new Date().getDate()).toBe(15);
});