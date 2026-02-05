import { test, expect, beforeAll, afterAll } from "bun:test";
import { TimezoneTestUtils, TIMEZONE_MATRIX } from "./timezone-matrix";
import { enhanceSecurityMetric } from "../../types/enhance-metric";

const MOCK_DATE = "2026-01-14T20:00:00.000Z";

beforeAll(() => {
  TimezoneTestUtils.setup("UTC", MOCK_DATE);
});

afterAll(() => {
  TimezoneTestUtils.cleanup();
});

test("UTC Matrix Compliance: Audit Trails", () => {
  const components = TIMEZONE_MATRIX.UTC;
  expect(components).toContain("audit-trails");
  
  const metric = {
    category: "Security",
    type: "configuration",
    topic: "UTC Compliance",
    subCat: "Audit",
    id: "utc-1",
    value: "ENABLED",
    locations: 1,
    impact: "high"
  };

  const enhanced = enhanceSecurityMetric(metric as any);
  expect(enhanced.lastVerified).toBe(MOCK_DATE);
  expect(new Date().getHours()).toBe(20);
});