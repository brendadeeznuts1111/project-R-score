import { test, expect, beforeAll, afterAll } from "bun:test";
import { TimezoneTestUtils, TIMEZONE_MATRIX } from "./timezone-matrix";
import { enhanceSecurityMetric } from "../../types/enhance-metric";

const MOCK_DATE = "2026-01-14T20:00:00.000Z";

beforeAll(() => {
  TimezoneTestUtils.setup("America/New_York", MOCK_DATE);
});

afterAll(() => {
  TimezoneTestUtils.cleanup();
});

test("EST Matrix Compliance: Regional Payload Context", () => {
  const components = TIMEZONE_MATRIX.EST;
  expect(components).toContain("ny-dashboard");
  
  const metric = {
    category: "Security",
    type: "configuration",
    topic: "EST Context",
    subCat: "Audit",
    id: "est-1",
    value: "ENABLED",
    locations: 1,
    impact: "high"
  };

  const enhanced = enhanceSecurityMetric(metric as any);
  
  // ISO verified matches mock (UTC baseline)
  expect(enhanced.lastVerified).toBe(MOCK_DATE);
  
  // systemTZ captured regional context
  expect(enhanced.systemTZ).toBe("America/New_York");
  
  // localTime captured the regional offset (15:00 for 20:00 UTC)
  expect(enhanced.localTime).toContain("3:00:00 PM");
});