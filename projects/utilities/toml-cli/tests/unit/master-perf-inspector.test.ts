import { test, expect, describe } from "bun:test";
import {
  FormattedPerfMetric,
  generateMasterPerfTable,
  generateMasterPerfPlainText,
  generateMasterPerfJson,
  generateMasterPerfWebSocketPayload,
} from "../../src/inspection/master-perf-inspector";
import { PerfMetric } from "../../types/perf.types";

describe("FormattedPerfMetric", () => {
  const mockMetric: PerfMetric = {
    id: "test-metric-1",
    category: "Security",
    type: "latency",
    topic: "auth",
    value: "75ms",
    locations: "us-east-1,us-west-2",
    impact: "high",
    properties: { scope: "ENTERPRISE", user: "testuser" },
  };

  const mockMetric2: PerfMetric = {
    id: "test-metric-2",
    category: "R2",
    type: "throughput",
    topic: "storage",
    value: "120ms",
    locations: "eu-central-1",
    impact: "medium",
    properties: { scope: "DEVELOPMENT" },
  };

  const mockMetric3: PerfMetric = {
    id: "test-metric-3",
    category: "Demo",
    type: "status",
    topic: "feature-flag",
    value: "success",
    locations: "local",
    impact: "low",
    properties: { version: "1.0.0" },
  };

  test("FormattedPerfMetric should correctly format category with color and emoji", () => {
    const formatted = new FormattedPerfMetric(mockMetric);
    expect(formatted.category).toMatch(/🔒 \x1b\[38;5;\d+mSecurity\x1b\[0m/);
  });

  test("FormattedPerfMetric should correctly format value with latency-based color", () => {
    const formatted = new FormattedPerfMetric(mockMetric);
    expect(formatted.value).toMatch(/\x1b\[38;5;\d+m75ms\x1b\[0m/);

    const formattedError = new FormattedPerfMetric(mockMetric2);
    expect(formattedError.value).toMatch(/\x1b\[38;5;\d+m120ms\x1b\[0m/);

    const formattedSuccess = new FormattedPerfMetric(mockMetric3);
    expect(formattedSuccess.value).toMatch(/\x1b\[38;5;\d+msuccess\x1b\[0m/);
  });

  test("FormattedPerfMetric should correctly format id with scope-aware flag emoji", () => {
    const formatted = new FormattedPerfMetric(mockMetric);
    expect(formatted.id).toMatch(/🇺🇸 test-metric-1/);

    const formattedDev = new FormattedPerfMetric(mockMetric2);
    expect(formattedDev.id).toMatch(/🇬🇧 test-metric-2/);

    const formattedLocal = new FormattedPerfMetric(mockMetric3);
    expect(formattedLocal.id).toMatch(/🌐 test-metric-3/);
  });

  test("FormattedPerfMetric should truncate locations correctly", () => {
    const formatted = new FormattedPerfMetric(mockMetric);
    expect(formatted.locations).toBe("us-east-1,us-west-2");

    const longLocationMetric: PerfMetric = {
      ...mockMetric,
      locations: "this-is-a-very-long-location-string-that-needs-truncation",
    };
    const formattedLong = new FormattedPerfMetric(longLocationMetric);
    expect(formattedLong.locations).toBe("this-is-a-very-long-lo...");
  });

  test("FormattedPerfMetric should format impact with status emoji", () => {
    const formatted = new FormattedPerfMetric(mockMetric);
    expect(formatted.impact).toMatch(/🟡 high/);

    const formattedError = new FormattedPerfMetric(mockMetric2);
    expect(formattedError.impact).toMatch(/🔴 medium/);

    const formattedSuccess = new FormattedPerfMetric(mockMetric3);
    expect(formattedSuccess.impact).toMatch(/🟢 low/);
  });

  test("FormattedPerfMetric should strip ANSI from properties", () => {
    const metricWithAnsiProperties: PerfMetric = {
      ...mockMetric,
      properties: { key: "value with \x1b[31mANSI\x1b[0m codes" },
    };
    const formatted = new FormattedPerfMetric(metricWithAnsiProperties);
    expect(formatted.properties).toBe("key: value with ANSI codes");
  });
});

describe("Output Functions", () => {
  const mockMetrics: PerfMetric[] = [
    {
      id: "test-metric-1",
      category: "Security",
      type: "latency",
      topic: "auth",
      value: "75ms",
      locations: "us-east-1,us-west-2",
      impact: "high",
      properties: { scope: "ENTERPRISE", user: "testuser" },
    },
    {
      id: "test-metric-2",
      category: "R2",
      type: "throughput",
      topic: "storage",
      value: "120ms",
      locations: "eu-central-1",
      impact: "medium",
      properties: { scope: "DEVELOPMENT" },
    },
    {
      id: "test-metric-3",
      category: "Demo",
      type: "status",
      topic: "feature-flag",
      value: "success",
      locations: "local",
      impact: "low",
      properties: { version: "1.0.0" },
    },
  ];

  test("generateMasterPerfTable should produce colored output", () => {
    const table = generateMasterPerfTable(mockMetrics);
    expect(table).toContain("\x1b[38;5"); // Expect ANSI color codes
    expect(table).toContain("🔒"); // Expect emojis
    expect(table).toContain("🇺🇸"); // Expect flag emojis
  });

  test("generateMasterPerfPlainText should produce plain text output without ANSI codes", () => {
    const plainText = generateMasterPerfPlainText(mockMetrics);
    expect(plainText).not.toContain("\x1b[38;5"); // Should not contain ANSI color codes
    expect(plainText).toContain("🔒"); // Emojis should remain
    expect(plainText).toContain("🇺🇸"); // Flag emojis should remain
  });

  test("generateMasterPerfJson should produce JSON with normalized colors and status", () => {
    const json = generateMasterPerfJson(mockMetrics);
    const parsed = JSON.parse(json);

    expect(parsed[0].categoryColor).toBeNumber(); // Expect numeric color
    expect(parsed[0].categoryColor).not.toBeNull();
    expect(parsed[0].valueStatus).toBe("warning");
    expect(parsed[1].valueStatus).toBe("error");
    expect(parsed[2].valueStatus).toBe("success");
  });

  test("generateMasterPerfWebSocketPayload should produce JSON with pre-colored values", () => {
    const payload = generateMasterPerfWebSocketPayload(mockMetrics);
    const parsed = JSON.parse(payload);

    expect(parsed.masterPerf[0].val).toMatch(/\x1b\[38;5;\d+m75ms\x1b\[0m/);
    expect(parsed.masterPerf[0].cat).toBe("Security");
    expect(parsed.masterPerf[0].scope).toBe("ENTERPRISE");
  });
});