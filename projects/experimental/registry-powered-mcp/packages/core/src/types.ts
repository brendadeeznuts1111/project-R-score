/**
 * Core type definitions for Registry-Powered-MCP
 */

/**
 * ISO 8601 timestamp string
 */
export type Timestamp = string;

/**
 * Package distribution information
 */
export interface PackageDistribution {
  tarball: string;
  shasum: string;
  integrity: string;
  unpackedSize: string;
}

/**
 * Package distribution tags (latest, canary, beta, etc.)
 */
export interface PackageDistTags {
  latest: string;
  canary?: string;
  beta?: string;
  stable?: string;
}

/**
 * Package version history entry
 */
export interface PackageHistoryEntry {
  version: string;
  date: string;
}

/**
 * Package type definitions metadata
 */
export interface PackageTypes {
  definitions: string;
  compatibility: {
    node: string;
    bun: string;
  };
}

/**
 * Registry package information
 */
export interface RegistryPackage {
  name: string;
  version: string;
  protocol: 'npm' | 'jsr' | 'workspace';
  dependencies: Record<string, string>;
  description: string;
  author: string;
  maintainers: string[];
  homepage: string;
  repository: string;
  license: string;
  keywords: string[];
  dist: PackageDistribution;
  distTags: PackageDistTags;
  history: PackageHistoryEntry[];
  recentChanges: string;
  types: PackageTypes;
}

/**
 * Registry dashboard metrics
 */
export interface RegistryMetrics {
  uptime_seconds: number;
  response_time_ms: number;
  bundle_size_kb: number;
  gzip_size_kb: number;
  compression_ratio: string;
  global_locations: number;
  ai_model: string;
  p99_response_time: string;
}

/**
 * Registry endpoints configuration
 */
export interface RegistryEndpoints {
  dashboard: string;
  mcp: string;
  'mcp/health': string;
  'mcp/registry': string;
  'mcp/codesearch': string;
  'mcp/pty': string;
  'pty/vim': string;
  'pty/htop': string;
  'pty/bash': string;
  'mcp/chat': string;
  'mcp/metrics': string;
  'mcp/bench': string;
  'mcp/ping': string;
  'mcp/proxy': string;
  'mcp/teams': string;
  'mcp/flags': string;
  graphql: string;
  health: string;
  ai: string;
  r2: string;
  websocket: string;
  rss: string;
}

/**
 * Registry performance metrics
 */
export interface RegistryPerformance {
  search_speed: string;
  routing_accuracy: string;
  ai_response_time: string;
  cold_start_time: string;
}

/**
 * Complete registry dashboard state
 */
export interface RegistryDashboardState {
  message: string;
  service: string;
  version: string;
  status: string;
  metrics: RegistryMetrics;
  endpoints: RegistryEndpoints;
  features: string[];
  performance: RegistryPerformance;
  packages: RegistryPackage[];
  registry_powered: boolean;
  deployment: string;
  enhancement_level: string;
  timestamp: Timestamp;
}
