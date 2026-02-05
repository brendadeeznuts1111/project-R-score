// Analytics functions for Bun Matrix — extracted from BunMatrixStore

import type {
  BunDocEntry,
  MatrixMetrics,
  MatrixTotals,
  PatternAnalysis,
  PerformanceMetrics,
  SecurityPatterns,
  EvolutionMetrics,
  CorrelationMetrics,
  HomeAutomationMetrics,
  SecurityTrends,
  StabilityProgression,
  NamingPatterns,
  DependencyPatterns,
  BaselineImprovements,
  ThuisIntegrationPatterns,
  ThuisConfigComplexity,
} from "./types";
import {
  TOP_N_SLICE,
  EVOLUTION_PERIODS,
} from "../tension-field/constants";

// ── Top-level metrics aggregation ────────────────────────────────────

export function calculateMetrics(entries: BunDocEntry[]): MatrixMetrics {
  return {
    timestamp: Date.now(),
    totals: calculateTotals(entries),
    patterns: analyzePatterns(entries),
    performance: analyzePerformance(entries),
    security: analyzeSecurityPatterns(entries),
    evolution: analyzeEvolution(entries),
    correlations: analyzeCorrelations(entries),
    homeAutomation: analyzeHomeAutomation(entries),
  };
}

// ── Totals ───────────────────────────────────────────────────────────

export function calculateTotals(entries: BunDocEntry[]): MatrixTotals {
  return {
    apis: entries.length,
    platforms: [...new Set(entries.flatMap(e => e.platforms))].length,
    categories: [...new Set(entries.map(e => e.category || "core"))].length,
    securityFlags: entries.filter(e => e.security.requiresRoot).length,
    zeroTrustApis: entries.filter(e => e.security.zeroTrust).length,
    cliFlags: [...new Set(entries.flatMap(e => e.cliFlags || []))].length,
    relatedTerms: [...new Set(entries.flatMap(e => e.relatedTerms || []))].length,
    avgVersion: calculateAverageVersion(entries),
    totalOpsPerSec: entries.reduce((sum, e) => sum + (e.perfProfile?.opsSec || 0), 0),
    homeAutomationApis: entries.filter(e => e.thuisConfig || e.homeFeatures).length,
  };
}

// ── Pattern analysis ─────────────────────────────────────────────────

export function analyzePatterns(entries: BunDocEntry[]): PatternAnalysis {
  return {
    versionDistribution: getVersionDistribution(entries),
    platformPopularity: getPlatformPopularity(entries),
    categoryDistribution: getCategoryDistribution(entries),
    securityTrends: getSecurityTrends(entries),
    stabilityProgression: getStabilityProgression(entries),
    namingPatterns: getNamingPatterns(entries),
    dependencyPatterns: getDependencyPatterns(entries),
  };
}

// ── Performance ──────────────────────────────────────────────────────

export function analyzePerformance(entries: BunDocEntry[]): PerformanceMetrics {
  const withPerf = entries.filter(e => e.perfProfile?.opsSec);

  return {
    avgOpsPerSec: withPerf.length > 0
      ? withPerf.reduce((sum, e) => sum + e.perfProfile!.opsSec, 0) / withPerf.length
      : 0,
    maxOpsPerSec: Math.max(...withPerf.map(e => e.perfProfile!.opsSec || 0)),
    minOpsPerSec: Math.min(...withPerf.map(e => e.perfProfile!.opsSec || Infinity)),
    performanceByCategory: getPerformanceByCategory(entries),
    topPerformers: withPerf
      .sort((a, b) => (b.perfProfile?.opsSec || 0) - (a.perfProfile?.opsSec || 0))
      .slice(0, TOP_N_SLICE)
      .map(e => ({ api: e.term, ops: e.perfProfile?.opsSec })),
    baselineImprovements: getBaselineImprovements(entries),
  };
}

// ── Security patterns ────────────────────────────────────────────────

export function analyzeSecurityPatterns(entries: BunDocEntry[]): SecurityPatterns {
  return {
    classificationDistribution: {
      high: entries.filter(e => e.security.classification === "high").length,
      medium: entries.filter(e => e.security.classification === "medium").length,
      low: entries.filter(e => e.security.classification === "low").length,
    },
    rootRequired: entries.filter(e => e.security.requiresRoot).length,
    zeroTrustAdoption: entries.filter(e => e.security.zeroTrust).length,
    securityByCategory: getSecurityByCategory(entries),
    securityEvolution: getSecurityEvolution(entries),
    highRiskApis: entries
      .filter(e =>
        e.security.classification === "high" &&
        (e.stability === "experimental" || e.security.requiresRoot)
      )
      .map(e => e.term),
  };
}

// ── Evolution ────────────────────────────────────────────────────────

export function analyzeEvolution(entries: BunDocEntry[]): EvolutionMetrics {
  const sorted = entries.sort((a, b) =>
    compareVersions(a.bunMinVersion, b.bunMinVersion)
  );

  return {
    apisByVersion: groupByVersion(sorted),
    adoptionRate: getAdoptionRate(sorted),
    maturityIndex: getMaturityIndex(entries),
    deprecationRate: entries.filter(e => e.stability === "deprecated").length / entries.length,
    experimentalToStableRatio:
      entries.filter(e => e.stability === "experimental").length /
      entries.filter(e => e.stability === "stable").length,
  };
}

// ── Correlations ─────────────────────────────────────────────────────

export function analyzeCorrelations(entries: BunDocEntry[]): CorrelationMetrics {
  return {
    securityVsPerformance: getSecurityPerformanceCorrelation(entries),
    stabilityVsSecurity: getStabilitySecurityCorrelation(entries),
    platformVsFeatures: getPlatformFeatureCorrelation(entries),
    versionVsFeatures: getVersionFeatureCorrelation(entries),
    categoryVsSecurity: getSecurityByCategory(entries),
  };
}

// ── Home automation ──────────────────────────────────────────────────

export function analyzeHomeAutomation(entries: BunDocEntry[]): HomeAutomationMetrics {
  const thuisApis = entries.filter(e => e.thuisConfig || e.homeFeatures);

  return {
    totalApis: thuisApis.length,
    serviceModes: getServiceModes(thuisApis),
    featureAdoption: {
      localServer: thuisApis.filter(e => e.homeFeatures?.localServer).length,
      autoStart: thuisApis.filter(e => e.homeFeatures?.autoStart).length,
      trayIcon: thuisApis.filter(e => e.homeFeatures?.trayIcon).length,
      notifications: thuisApis.filter(e => e.homeFeatures?.notifications).length,
    },
    securityLevel: thuisApis.map(e => e.security.classification),
    integrationPatterns: getThuisIntegrationPatterns(thuisApis),
    configurationComplexity: getThuisConfigComplexity(thuisApis),
  };
}

// ── Helper functions ─────────────────────────────────────────────────

export function calculateAverageVersion(entries: BunDocEntry[]): string {
  const versions = entries.map(e => e.bunMinVersion.split(".").map(Number));
  const avg = versions.reduce(
    (acc, [major, minor, patch]) => ({
      major: acc.major + major / versions.length,
      minor: acc.minor + minor / versions.length,
      patch: acc.patch + patch / versions.length,
    }),
    { major: 0, minor: 0, patch: 0 }
  );

  return `${Math.round(avg.major)}.${Math.round(avg.minor)}.${Math.round(avg.patch)}`;
}

export function compareVersions(a: string, b: string): number {
  const [am, amn, ap] = a.split(".").map(Number);
  const [bm, bmn, bp] = b.split(".").map(Number);

  if (am !== bm) return am - bm;
  if (amn !== bmn) return amn - bmn;
  return ap - bp;
}

export function getVersionDistribution(entries: BunDocEntry[]): Record<string, number> {
  const dist: Record<string, number> = {};
  for (const entry of entries) {
    const major = entry.bunMinVersion.split(".")[0];
    dist[`v${major}`] = (dist[`v${major}`] || 0) + 1;
  }
  return dist;
}

export function getPlatformPopularity(entries: BunDocEntry[]): Record<string, number> {
  const pop: Record<string, number> = {};
  for (const entry of entries) {
    for (const platform of entry.platforms) {
      pop[platform] = (pop[platform] || 0) + 1;
    }
  }
  return pop;
}

export function getCategoryDistribution(entries: BunDocEntry[]): Record<string, number> {
  const dist: Record<string, number> = {};
  for (const entry of entries) {
    const cat = entry.category?.toUpperCase() || "CORE";
    dist[cat] = (dist[cat] || 0) + 1;
  }
  return dist;
}

export function getSecurityTrends(entries: BunDocEntry[]): SecurityTrends {
  return {
    increasingSecurity: entries.filter(e => e.security.zeroTrust).length,
    rootPrivilegeUsage: entries.filter(e => e.security.requiresRoot).length,
    classificationBalance: {
      high: entries.filter(e => e.security.classification === "high").length,
      medium: entries.filter(e => e.security.classification === "medium").length,
      low: entries.filter(e => e.security.classification === "low").length,
    },
  };
}

export function getStabilityProgression(entries: BunDocEntry[]): StabilityProgression {
  const progression = {
    experimental: entries.filter(e => e.stability === "experimental").length,
    stable: entries.filter(e => e.stability === "stable").length,
    deprecated: entries.filter(e => e.stability === "deprecated").length,
  };

  return {
    ...progression,
    maturityRatio: progression.stable / (progression.experimental + progression.stable),
    deprecationRate: progression.deprecated / entries.length,
  };
}

export function getNamingPatterns(entries: BunDocEntry[]): NamingPatterns {
  const patterns = {
    withBunPrefix: entries.filter(e => e.term.startsWith("Bun.")).length,
    withDotNotation: entries.filter(e => e.term.includes(".")).length,
    camelCase: entries.filter(e => /^[a-z][A-Za-z]*$/.test(e.term)).length,
    withModuleSuffix: entries.filter(e => /\.(hash|crypt|serve|file)$/.test(e.term)).length,
  };

  return {
    ...patterns,
    avgLength: entries.reduce((sum, e) => sum + e.term.length, 0) / entries.length,
    mostCommonPrefix: getMostCommonPrefix(entries.map(e => e.term)),
  };
}

export function getDependencyPatterns(entries: BunDocEntry[]): DependencyPatterns {
  const relatedTerms = entries.flatMap(e => e.relatedTerms || []);
  const termFrequency: Record<string, number> = {};

  for (const term of relatedTerms) {
    termFrequency[term] = (termFrequency[term] || 0) + 1;
  }

  return {
    totalRelatedTerms: relatedTerms.length,
    uniqueRelatedTerms: Object.keys(termFrequency).length,
    mostReferenced: Object.entries(termFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, TOP_N_SLICE)
      .map(([term, count]) => ({ term, count })),
    avgRelatedTerms: relatedTerms.length / entries.length,
  };
}

export function getPerformanceByCategory(entries: BunDocEntry[]): Record<string, number> {
  const perf: Record<string, { sum: number; count: number }> = {};

  for (const entry of entries) {
    if (entry.perfProfile?.opsSec) {
      const cat = entry.category?.toUpperCase() || "CORE";
      if (!perf[cat]) perf[cat] = { sum: 0, count: 0 };
      perf[cat].sum += entry.perfProfile.opsSec;
      perf[cat].count++;
    }
  }

  const result: Record<string, number> = {};
  for (const [cat, data] of Object.entries(perf)) {
    result[cat] = data.sum / data.count;
  }

  return result;
}

export function getBaselineImprovements(entries: BunDocEntry[]): BaselineImprovements {
  const improvements = entries
    .filter(e => e.perfProfile?.baseline && e.perfProfile.baseline !== "N/A")
    .map(e => {
      const match = e.perfProfile!.baseline.match(/(\d+\.?\d*)x/);
      return {
        api: e.term,
        improvement: match ? parseFloat(match[1]) : 0,
        baseline: e.perfProfile!.baseline,
      };
    })
    .filter(e => e.improvement > 0);

  return {
    count: improvements.length,
    avgImprovement: improvements.reduce((sum, e) => sum + e.improvement, 0) / improvements.length,
    topImprovements: improvements.sort((a, b) => b.improvement - a.improvement).slice(0, TOP_N_SLICE),
  };
}

export function getSecurityByCategory(entries: BunDocEntry[]): Record<string, { high: number; medium: number; low: number }> {
  const result: Record<string, { high: number; medium: number; low: number }> = {};

  for (const entry of entries) {
    const cat = entry.category?.toUpperCase() || "CORE";
    if (!result[cat]) result[cat] = { high: 0, medium: 0, low: 0 };
    result[cat][entry.security.classification]++;
  }

  return result;
}

export function getSecurityEvolution(entries: BunDocEntry[]): Array<{ version: string; high: number; medium: number; low: number }> {
  const sorted = entries.sort((a, b) => compareVersions(a.bunMinVersion, b.bunMinVersion));
  const evolution = [];

  for (let i = 0; i < sorted.length; i += Math.ceil(sorted.length / EVOLUTION_PERIODS)) {
    const chunk = sorted.slice(i, i + Math.ceil(sorted.length / EVOLUTION_PERIODS));
    const version = chunk[0].bunMinVersion;
    const security = {
      high: chunk.filter(e => e.security.classification === "high").length,
      medium: chunk.filter(e => e.security.classification === "medium").length,
      low: chunk.filter(e => e.security.classification === "low").length,
    };
    evolution.push({ version, ...security });
  }

  return evolution;
}

export function groupByVersion(entries: BunDocEntry[]): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};

  for (const entry of entries) {
    const version = entry.bunMinVersion.split(".").slice(0, 2).join(".");
    if (!grouped[version]) grouped[version] = [];
    grouped[version].push(entry.term);
  }

  return grouped;
}

export function getAdoptionRate(entries: BunDocEntry[]): number {
  const stable = entries.filter(e => e.stability === "stable").length;
  return stable / entries.length;
}

export function getMaturityIndex(entries: BunDocEntry[]): number {
  const stable = entries.filter(e => e.stability === "stable").length;
  const deprecated = entries.filter(e => e.stability === "deprecated").length;
  const experimental = entries.filter(e => e.stability === "experimental").length;

  return (stable * 2 + experimental - deprecated * 3) / entries.length;
}

export function getSecurityPerformanceCorrelation(entries: BunDocEntry[]): Record<string, { avg: number; count: number }> {
  const correlation: Record<string, { avg: number; count: number }> = {};

  for (const entry of entries) {
    if (entry.perfProfile?.opsSec) {
      const level = entry.security.classification;
      if (!correlation[level]) correlation[level] = { avg: 0, count: 0 };
      correlation[level].avg += entry.perfProfile.opsSec;
      correlation[level].count++;
    }
  }

  for (const level of Object.keys(correlation)) {
    correlation[level].avg /= correlation[level].count;
  }

  return correlation;
}

export function getStabilitySecurityCorrelation(entries: BunDocEntry[]): Record<string, Record<string, number>> {
  const correlation: Record<string, Record<string, number>> = {};

  for (const entry of entries) {
    const stability = entry.stability;
    const security = entry.security.classification;

    if (!correlation[stability]) correlation[stability] = { high: 0, medium: 0, low: 0 };
    correlation[stability][security]++;
  }

  return correlation;
}

export function getPlatformFeatureCorrelation(entries: BunDocEntry[]): Record<string, { thuis: number; total: number; thuisPct?: string }> {
  const correlation: Record<string, { thuis: number; total: number; thuisPct?: string }> = {};

  for (const entry of entries) {
    for (const platform of entry.platforms) {
      if (!correlation[platform]) correlation[platform] = { thuis: 0, total: 0 };
      correlation[platform].total++;
      if (entry.thuisConfig || entry.homeFeatures) {
        correlation[platform].thuis++;
      }
    }
  }

  for (const platform of Object.keys(correlation)) {
    correlation[platform].thuisPct =
      ((correlation[platform].thuis / correlation[platform].total) * 100).toFixed(1);
  }

  return correlation;
}

export function getVersionFeatureCorrelation(entries: BunDocEntry[]): Record<string, { features: number; total: number; avgFeatures?: number }> {
  const correlation: Record<string, { features: number; total: number; avgFeatures?: number }> = {};

  for (const entry of entries) {
    const version = entry.bunMinVersion.split(".")[0];
    if (!correlation[version]) correlation[version] = { features: 0, total: 0 };
    correlation[version].total++;

    const features = [
      entry.perfProfile?.opsSec ? 1 : 0,
      entry.cliFlags?.length ? 1 : 0,
      entry.relatedTerms?.length ? 1 : 0,
      entry.thuisConfig ? 1 : 0,
    ].reduce((sum, f) => sum + f, 0);

    correlation[version].features += features;
  }

  for (const version of Object.keys(correlation)) {
    correlation[version].avgFeatures =
      correlation[version].features / correlation[version].total;
  }

  return correlation;
}

export function getServiceModes(thuisApis: BunDocEntry[]): Record<string, number> {
  const modes: Record<string, number> = {};

  for (const api of thuisApis) {
    const mode = api.thuisConfig?.serviceMode || "unknown";
    modes[mode] = (modes[mode] || 0) + 1;
  }

  return modes;
}

export function getThuisIntegrationPatterns(thuisApis: BunDocEntry[]): ThuisIntegrationPatterns {
  return {
    withLocalServer: thuisApis.filter(e => e.homeFeatures?.localServer).length,
    withAutomation: thuisApis.filter(e => e.term.includes("automate")).length,
    withSsl: thuisApis.filter(e => e.term.includes("serve")).length,
    daemonServices: thuisApis.filter(e => e.thuisConfig?.serviceMode === "daemon").length,
  };
}

export function getThuisConfigComplexity(thuisApis: BunDocEntry[]): ThuisConfigComplexity {
  const complexities = thuisApis.map(api => ({
    api: api.term,
    envVars: api.thuisConfig?.envVars ? Object.keys(api.thuisConfig.envVars).length : 0,
    features: api.homeFeatures ? Object.values(api.homeFeatures).filter(Boolean).length : 0,
    cliFlags: api.cliFlags?.length || 0,
  }));

  return {
    avgEnvVars: complexities.reduce((sum, c) => sum + c.envVars, 0) / complexities.length,
    avgFeatures: complexities.reduce((sum, c) => sum + c.features, 0) / complexities.length,
    mostComplex: complexities.sort((a, b) =>
      (b.envVars + b.features) - (a.envVars + a.features)
    )[0],
  };
}

export function getMostCommonPrefix(terms: string[]): string {
  const prefixes: Record<string, number> = {};

  for (const term of terms) {
    const parts = term.split(".");
    if (parts.length > 1) {
      const prefix = parts[0];
      prefixes[prefix] = (prefixes[prefix] || 0) + 1;
    }
  }

  return Object.entries(prefixes).sort(([, a], [, b]) => b - a)[0]?.[0] || "none";
}
