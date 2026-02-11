import { describe, expect, it } from "bun:test";
import {
  SuccessMetrics,
  buildSuccessMetrics,
  calculateSuccessHealth,
  getDeploymentRatio,
  parseSuccessMetricsToml,
} from "./project-health";

describe("project health metrics", () => {
  it("calculates deployment ratio", () => {
    expect(getDeploymentRatio(SuccessMetrics)).toBeCloseTo(12 / 14, 5);
  });

  it("supports TOML overrides for metrics", () => {
    const override = parseSuccessMetricsToml(`
[current.reliability]
uptimePct = 99.97
regions = 5
    `);

    const merged = buildSuccessMetrics(override);
    expect(merged.current.reliability.uptimePct).toBe(99.97);
    expect(merged.current.deploymentVelocity.productionComponents).toBe(12);
  });

  it("produces stable health snapshot", () => {
    const health = calculateSuccessHealth(SuccessMetrics);
    expect(health).toMatchInlineSnapshot(`
      {
        "atRisk": true,
        "deploymentRatio": 0.8571428571428571,
        "deploymentTargetRatio": 1,
        "risks": [
          {
            "id": "reliability.uptimePct",
            "reason": "Current uptime trails Q1 target.",
            "severity": "fail",
            "target": 99.99,
            "value": 99.95,
          },
          {
            "id": "coverage.stableAvgPct",
            "reason": "Stable coverage is below Q1 threshold.",
            "severity": "warn",
            "target": 95,
            "value": 92.8,
          },
          {
            "id": "coverage.betaAvgPct",
            "reason": "Beta coverage is below Q1 threshold.",
            "severity": "fail",
            "target": 85,
            "value": 75,
          },
        ],
        "weightedScore": 90,
      }
    `);
  });
});
