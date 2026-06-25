import { test, expect, beforeAll, afterAll, setSystemTime } from "bun:test";
import { enhanceSecurityMetric } from "../types/enhance-metric";
import type { PerfMetric } from "../types/perf-metric";

//  DETERMINISTIC BASELINE: v3.7 Security Audit Reference Time
const AUDIT_BASELINE = "2026-01-14T20:00:00.000Z";

beforeAll(() => {
  // Setup deterministic "fake clock" for the entire test suite
  const date = new Date(AUDIT_BASELINE);
  setSystemTime(date);
});

afterAll(() => {
  //  CLEANUP: Reset to actual time and default TZ
  setSystemTime();
  delete process.env.TZ;
});

test("v3.7 Cross-Timezone Determinism", () => {
  const metric: PerfMetric = {
    category: "Security",
    type: "configuration",
    topic: "TZ Hardening",
    subCat: "Global",
    id: "tz-test",
    value: "ENABLED",
    locations: 1,
    impact: "high"
  };

  const zones = ["UTC", "America/New_York", "Asia/Tokyo"];
  
  for (const zone of zones) {
    process.env.TZ = zone;
    const enhanced = enhanceSecurityMetric(metric);
    
    // ISO string must remain identical (UTC) regardless of local process TZ
    expect(enhanced.lastVerified).toBe(AUDIT_BASELINE);
    
    // Local hour will change based on TZ
    const localHour = new Date().getHours();
    if (zone === "America/New_York") expect(localHour).toBe(15); // UTC 20:00 - 5h
    if (zone === "Asia/Tokyo") expect(localHour).toBe(5); // UTC 20:00 + 9h (next day)
    if (zone === "UTC") expect(localHour).toBe(20);
  }
});

test("enhanceSecurityMetric - v3.7 audit trail alignment", () => {
  const metric: PerfMetric = {
    category: "Security",
    type: "configuration",
    topic: "Test Hardening",
    subCat: "Validation",
    id: "test-id",
    value: "ENABLED",
    locations: 1,
    impact: "high",
    properties: { domain: "localhost" }
  };

  const enhanced = enhanceSecurityMetric(metric);
  expect(enhanced.lastVerified).toBe(AUDIT_BASELINE);
});

test("Risk & Compliance Logic (Production Guard)", () => {
  const critMetric: PerfMetric = {
    category: "Security",
    type: "configuration",
    topic: "Critical Path",
    subCat: "Init",
    id: "crit-1",
    value: "ENABLED",
    locations: 1,
    impact: "high"
  };

  const enhancedCrit = enhanceSecurityMetric(critMetric);

  expect(enhancedCrit.securityScore).toBe(150);
  expect(enhancedCrit.riskLevel).toBe("CRITICAL");
  expect(enhancedCrit.complianceStatus).toBe("COMPLIANT");
});