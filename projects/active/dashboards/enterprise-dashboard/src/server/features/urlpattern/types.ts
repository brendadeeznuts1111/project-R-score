/**
 * URLPattern observability types.
 */

export interface PerformanceMetrics {
  execNs: number;
  opsPerSec: number;
  cacheHitRate: number;
  deoptimizationCount: number;
  memoryDeltaKB: number;
  stringInitTime: number;
  objectInitTime: number;
  mixedInitTime: number;
}

export interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  rss: number;
  external: number;
  arrayBuffers: number;
  deltaKB: number;
}

export interface UnicodeMetrics {
  hasUnicode: boolean;
  unicodeChars: number;
  normalized: boolean;
  encoding: string;
}

export interface BundleMetrics {
  estimatedSize: number;
  complexity: number;
  dependencies: string[];
}

export interface PatternInitAnalysis {
  method: "string" | "object" | "mixed";
  canInitFromString: boolean;
  canInitFromObject: boolean;
  initTime: number;
}

export interface HealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  message: string;
  timestamp: number;
}

export interface PatternProperties {
  protocol?: string;
  username?: string;
  password?: string;
  hostname?: string;
  port?: string;
  pathname?: string;
  search?: string;
  hash?: string;
  hasAllProperties: boolean;
  propertyCount: number;
}

export interface BunURLPatternMetrics {
  canInitFromString: boolean;
  canInitFromPatternInit: boolean;
  initMethod: "string" | "object" | "mixed";
  hasProtocolWildcard: boolean;
  hasUsernamePassword: boolean;
  hasPortWildcard: boolean;
  performanceBoost: number;
  supportsExecMethod: boolean;
  supportsTestMethod: boolean;
}

export interface ExecAnalysis {
  returnsURLPatternResult: boolean;
  execResult: URLPatternResult | null;
  execTime: number;
  matchDetails: {
    groups: Record<string, string>;
    protocol: string;
    hostname: string;
    port: string;
    pathname: string;
    search: string;
    hash: string;
  };
}

export interface ProxyPattern {
  pattern: string;
  method: "CONNECT" | "GET" | "POST" | "ALL";
  headers: Record<string, string>;
  authorizationType: "Basic" | "Bearer" | "Digest" | "None";
}

export interface ProxyAnalysis {
  fetchProxyOptionSupported: boolean;
  connectHeadersForwarded: boolean;
  proxyAuthorizationHandled: boolean;
  proxyPatterns: ProxyPattern[];
}

export interface AgentAnalysis {
  httpAgentKeepAliveWorking: boolean;
  agentPerformance: number;
  keepAliveIssues: string[];
}

export interface PatternAnalysis {
  pattern: string | URLPatternInit;
  patternObject?: URLPattern;
  complexity: number;
  groups: Array<{ name: string; type: "static" | "dynamic" | "wildcard" }>;
  wptCompliance: boolean;
  wptTestsPassed: number;
  performance: PerformanceMetrics;
  memory: MemoryMetrics;
  unicode: UnicodeMetrics;
  bundle: BundleMetrics;
  bunSpecific: BunURLPatternMetrics;
  patternInitAnalysis: PatternInitAnalysis;
  execAnalysis: ExecAnalysis;
  proxyAnalysis: ProxyAnalysis;
  agentAnalysis: AgentAnalysis;
  patternProperties: PatternProperties;
  hasRegExpGroups: boolean;
}
