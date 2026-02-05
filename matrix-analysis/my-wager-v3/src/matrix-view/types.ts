// Bun Matrix type definitions

export interface Version {
  major: number;
  minor: number;
  patch: number;
}

export interface PerfProfile {
  opsSec: number;
  baseline: string;
  platform?: string;
}

export interface SecurityScope {
  classification: "high" | "medium" | "low";
  requiresRoot?: boolean;
  zeroTrust?: boolean;
}

export interface BunDocEntry {
  term: string;
  path: string;
  bunMinVersion: `${number}.${number}.${number}`;
  stability: "experimental" | "stable" | "deprecated";
  platforms: ("darwin" | "linux" | "win32")[];
  changelogFeed?: URL;
  perfProfile?: PerfProfile;
  security: SecurityScope;
  cliFlags?: string[];
  breakingChanges?: Version[];
  relatedTerms?: string[];
  lastUpdated?: Date;
  category?: "core" | "crypto" | "io" | "network" | "ffi" | "web" | "cli";
  deprecatedIn?: `${number}.${number}.${number}`;
  removedIn?: `${number}.${number}.${number}`;
  thuisConfig?: {
    homeDirectory?: string;
    configFile?: string;
    envVars?: Record<string, string>;
    serviceMode?: "daemon" | "cli" | "gui";
  };
  homeFeatures?: {
    localServer?: boolean;
    autoStart?: boolean;
    trayIcon?: boolean;
    notifications?: boolean;
  };
}

// ── Analytics return types ───────────────────────────────────────────

export interface MatrixMetrics {
  timestamp: number;
  totals: MatrixTotals;
  patterns: PatternAnalysis;
  performance: PerformanceMetrics;
  security: SecurityPatterns;
  evolution: EvolutionMetrics;
  correlations: CorrelationMetrics;
  homeAutomation: HomeAutomationMetrics;
}

export interface MatrixTotals {
  apis: number;
  platforms: number;
  categories: number;
  securityFlags: number;
  zeroTrustApis: number;
  cliFlags: number;
  relatedTerms: number;
  avgVersion: string;
  totalOpsPerSec: number;
  homeAutomationApis: number;
}

export interface PatternAnalysis {
  versionDistribution: Record<string, number>;
  platformPopularity: Record<string, number>;
  categoryDistribution: Record<string, number>;
  securityTrends: SecurityTrends;
  stabilityProgression: StabilityProgression;
  namingPatterns: NamingPatterns;
  dependencyPatterns: DependencyPatterns;
}

export interface PerformanceMetrics {
  avgOpsPerSec: number;
  maxOpsPerSec: number;
  minOpsPerSec: number;
  performanceByCategory: Record<string, number>;
  topPerformers: Array<{ api: string; ops: number | undefined }>;
  baselineImprovements: BaselineImprovements;
}

export interface SecurityPatterns {
  classificationDistribution: { high: number; medium: number; low: number };
  rootRequired: number;
  zeroTrustAdoption: number;
  securityByCategory: Record<string, { high: number; medium: number; low: number }>;
  securityEvolution: Array<{ version: string; high: number; medium: number; low: number }>;
  highRiskApis: string[];
}

export interface EvolutionMetrics {
  apisByVersion: Record<string, string[]>;
  adoptionRate: number;
  maturityIndex: number;
  deprecationRate: number;
  experimentalToStableRatio: number;
}

export interface CorrelationMetrics {
  securityVsPerformance: Record<string, { avg: number; count: number }>;
  stabilityVsSecurity: Record<string, Record<string, number>>;
  platformVsFeatures: Record<string, { thuis: number; total: number; thuisPct?: string }>;
  versionVsFeatures: Record<string, { features: number; total: number; avgFeatures?: number }>;
  categoryVsSecurity: Record<string, { high: number; medium: number; low: number }>;
}

export interface HomeAutomationMetrics {
  totalApis: number;
  serviceModes: Record<string, number>;
  featureAdoption: {
    localServer: number;
    autoStart: number;
    trayIcon: number;
    notifications: number;
  };
  securityLevel: ("high" | "medium" | "low")[];
  integrationPatterns: ThuisIntegrationPatterns;
  configurationComplexity: ThuisConfigComplexity;
}

export interface SecurityTrends {
  increasingSecurity: number;
  rootPrivilegeUsage: number;
  classificationBalance: { high: number; medium: number; low: number };
}

export interface StabilityProgression {
  experimental: number;
  stable: number;
  deprecated: number;
  maturityRatio: number;
  deprecationRate: number;
}

export interface NamingPatterns {
  withBunPrefix: number;
  withDotNotation: number;
  camelCase: number;
  withModuleSuffix: number;
  avgLength: number;
  mostCommonPrefix: string;
}

export interface DependencyPatterns {
  totalRelatedTerms: number;
  uniqueRelatedTerms: number;
  mostReferenced: Array<{ term: string; count: number }>;
  avgRelatedTerms: number;
}

export interface BaselineImprovements {
  count: number;
  avgImprovement: number;
  topImprovements: Array<{ api: string; improvement: number; baseline: string }>;
}

export interface ThuisIntegrationPatterns {
  withLocalServer: number;
  withAutomation: number;
  withSsl: number;
  daemonServices: number;
}

export interface ThuisConfigComplexity {
  avgEnvVars: number;
  avgFeatures: number;
  mostComplex: { api: string; envVars: number; features: number; cliFlags: number } | undefined;
}

// ── CLI / display types ──────────────────────────────────────────────

export interface MatrixCLIOptions {
  platform?: "darwin" | "linux" | "win32";
  stability?: "experimental" | "stable" | "deprecated";
  category?: string;
  searchTerm?: string;
  thuisFeatures?: boolean;
}

export interface DisplayStats {
  total: number;
  stable: number;
  experimental: number;
  deprecated: number;
  highSecurity: number;
  thuisEnabled: number;
  localServers: number;
  autoStart: number;
  withErrors: number;
  defaultConfigs: number;
  customConfigs: number;
}
