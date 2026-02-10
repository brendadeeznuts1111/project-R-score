export const ProjectRecommendations = {
  immediate: {
    window: "Next 7 days",
    items: [
      "Increase WebSocket Gateway test coverage from 78% to 85%",
      "Complete security review for Predictive Cache",
      "Run 72-hour load test on beta components",
    ],
  },
  shortTerm: {
    window: "Next 30 days",
    items: [
      "Promote WebSocket Gateway to stable after reaching 90% coverage",
      "Deploy Predictive Cache to 2 production regions",
      "Implement auto-scaling for HTTP/2 upgrade servers",
    ],
  },
  longTerm: {
    window: "Q2 2026",
    items: [
      "Expand production regions from 5 to 8 globally",
      "Achieve 95% average test coverage across all components",
      "Implement zero-downtime deployment for all components",
    ],
  },
} as const;

export type SuccessMetricsModel = {
  current: {
    deploymentVelocity: {
      productionComponents: number;
      totalComponents: number;
    };
    reliability: {
      uptimePct: number;
      regions: number;
    };
    performance: {
      improvementMinPct: number;
      improvementMaxPct: number;
      baselineVersion: string;
    };
    security: {
      stableReviewedPct: number;
    };
    coverage: {
      overallAvgPct: number;
      stableAvgPct: number;
      betaAvgPct: number;
      minimumGateStablePct: number;
      minimumGateBetaPct: number;
    };
  };
  targets: {
    q1_2026: {
      deploymentVelocity: {
        productionComponents: number;
      };
      reliability: {
        uptimePct: number;
      };
      performance: {
        improvementTargetPct: number;
      };
      security: {
        allReviewed: boolean;
      };
      coverage: {
        overallMinPct: number;
        stableMinPct: number;
        betaMinPct: number;
        minimumGateStablePct: number;
        minimumGateBetaPct: number;
      };
    };
    q2_2026: {
      deploymentVelocity: {
        autoDeploymentPipeline: boolean;
      };
      reliability: {
        uptimePct: number;
      };
      performance: {
        improvementTargetPct: number;
      };
      security: {
        automatedScanning: boolean;
      };
      coverage: {
        overallMinPct: number;
        stableMinPct: number;
        betaMinPct: number;
        minimumGateAllPct: number;
      };
    };
  };
};

const defaultSuccessMetrics: SuccessMetricsModel = {
  current: {
    deploymentVelocity: {
      productionComponents: 12,
      totalComponents: 14,
    },
    reliability: {
      uptimePct: 99.95,
      regions: 5,
    },
    performance: {
      improvementMinPct: 35,
      improvementMaxPct: 50,
      baselineVersion: "v1.3.8",
    },
    security: {
      stableReviewedPct: 100,
    },
    coverage: {
      overallAvgPct: 90.6,
      stableAvgPct: 92.8,
      betaAvgPct: 75.0,
      minimumGateStablePct: 80,
      minimumGateBetaPct: 70,
    },
  },
  targets: {
    q1_2026: {
      deploymentVelocity: {
        productionComponents: 14,
      },
      reliability: {
        uptimePct: 99.99,
      },
      performance: {
        improvementTargetPct: 50,
      },
      security: {
        allReviewed: true,
      },
      coverage: {
        overallMinPct: 93,
        stableMinPct: 95,
        betaMinPct: 85,
        minimumGateStablePct: 85,
        minimumGateBetaPct: 80,
      },
    },
    q2_2026: {
      deploymentVelocity: {
        autoDeploymentPipeline: true,
      },
      reliability: {
        uptimePct: 99.999,
      },
      performance: {
        improvementTargetPct: 60,
      },
      security: {
        automatedScanning: true,
      },
      coverage: {
        overallMinPct: 95,
        stableMinPct: 96,
        betaMinPct: 90,
        minimumGateAllPct: 90,
      },
    },
  },
};

function deepMerge<T>(base: T, override: Partial<T>): T {
  const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  const entries = Object.entries(override as Record<string, unknown>);
  for (const [key, value] of entries) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = deepMerge(
        (result[key] as Record<string, unknown>) ?? {},
        value as Record<string, unknown>,
      );
      continue;
    }
    if (value !== undefined) result[key] = value;
  }
  return result as T;
}

export function parseSuccessMetricsToml(tomlText: string): Partial<SuccessMetricsModel> {
  if (!tomlText.trim()) return {};
  const parsed = Bun.TOML.parse(tomlText);
  if (!parsed || typeof parsed !== "object") return {};
  return parsed as Partial<SuccessMetricsModel>;
}

export function buildSuccessMetrics(override?: Partial<SuccessMetricsModel>): SuccessMetricsModel {
  if (!override) return defaultSuccessMetrics;
  return deepMerge(defaultSuccessMetrics, override);
}

export function getDeploymentRatio(metrics: SuccessMetricsModel): number {
  const { productionComponents, totalComponents } = metrics.current.deploymentVelocity;
  if (totalComponents <= 0) return 0;
  return productionComponents / totalComponents;
}

export type HealthRisk = {
  id: string;
  value: number | boolean;
  target: number | boolean;
  severity: "warn" | "fail";
  reason: string;
};

export function calculateSuccessHealth(metrics: SuccessMetricsModel) {
  const risks: HealthRisk[] = [];

  const reliabilityGap = metrics.targets.q1_2026.reliability.uptimePct - metrics.current.reliability.uptimePct;
  if (reliabilityGap > 0.02) {
    risks.push({
      id: "reliability.uptimePct",
      value: metrics.current.reliability.uptimePct,
      target: metrics.targets.q1_2026.reliability.uptimePct,
      severity: reliabilityGap > 0.03 ? "fail" : "warn",
      reason: "Current uptime trails Q1 target.",
    });
  }

  const stableCoverageGap = metrics.targets.q1_2026.coverage.stableMinPct - metrics.current.coverage.stableAvgPct;
  if (stableCoverageGap > 0) {
    risks.push({
      id: "coverage.stableAvgPct",
      value: metrics.current.coverage.stableAvgPct,
      target: metrics.targets.q1_2026.coverage.stableMinPct,
      severity: stableCoverageGap >= 5 ? "fail" : "warn",
      reason: "Stable coverage is below Q1 threshold.",
    });
  }

  const betaCoverageGap = metrics.targets.q1_2026.coverage.betaMinPct - metrics.current.coverage.betaAvgPct;
  if (betaCoverageGap > 0) {
    risks.push({
      id: "coverage.betaAvgPct",
      value: metrics.current.coverage.betaAvgPct,
      target: metrics.targets.q1_2026.coverage.betaMinPct,
      severity: betaCoverageGap >= 10 ? "fail" : "warn",
      reason: "Beta coverage is below Q1 threshold.",
    });
  }

  const deploymentRatio = getDeploymentRatio(metrics);
  const deploymentTargetRatio =
    metrics.current.deploymentVelocity.totalComponents > 0
      ? metrics.targets.q1_2026.deploymentVelocity.productionComponents /
        metrics.current.deploymentVelocity.totalComponents
      : 0;

  const weightedScore = Math.round(
    deploymentRatio * 25 +
      (metrics.current.reliability.uptimePct / 100) * 25 +
      (metrics.current.coverage.overallAvgPct / 100) * 25 +
      (((metrics.current.performance.improvementMinPct + metrics.current.performance.improvementMaxPct) / 2) /
        Math.max(1, metrics.targets.q1_2026.performance.improvementTargetPct)) *
        25,
  );

  return {
    weightedScore: Math.max(0, Math.min(100, weightedScore)),
    deploymentRatio,
    deploymentTargetRatio,
    risks,
    atRisk: risks.length > 0,
  };
}

export const SuccessMetrics = buildSuccessMetrics();

export const ExecutiveVerdict = {
  score: 94,
  max: 100,
  label: "EXCELLENT",
  summary:
    "12/14 components stable in production across 5 regions. Two beta components remain on staged hardening path.",
} as const;
