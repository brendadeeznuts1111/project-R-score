
/**
 * @file types.ts
 * @description Domain definitions for the Bun MCP Registry Hub.
 */

export type ServiceStatus = 'operational' | 'degraded' | 'maintenance' | 'audit_mode';
export type DeploymentEnvironment = 'cloudflare-workers-production' | 'bun-edge-global' | 'local-dev';
export type AIModelId = '@cf/meta/llama-3.1-8b-instruct' | 'gemini-3-flash-preview' | 'gemini-3-pro-preview';

export type Timestamp = string & { __brand: 'ISO8601' };

export type SystemFeature = 
  | 'TERMINAL_PTY' 
  | 'REUSABLE_TERMINALS'
  | 'S3_CONTENT_DISPOSITION' 
  | 'WEBSOCKET_REALTIME' 
  | 'AI_CONVERSATIONAL' 
  | 'METRICS_MONITORING'
  | 'LATTICE_EVENT_STREAM';

export interface InfrastructureMetrics {
  uptime_seconds: number;
  response_time_ms: number;
  bundle_size_kb: number;
  gzip_size_kb: number;
  compression_ratio: string;
  global_locations: number;
  ai_model: AIModelId;
  p99_response_time?: string;
}

export interface TelemetryBuffers {
  latency: number[];
  requests: number[];
  heap: number[];
  pty: number[];
}

export interface ServiceTopology {
  dashboard: string;
  mcp: string;
  "mcp/health": string;
  "mcp/registry": string;
  "mcp/codesearch": string;
  "mcp/pty": string;
  "pty/vim": string;
  "pty/htop": string;
  "pty/bash": string;
  "mcp/chat": string;
  "mcp/metrics": string;
  "mcp/bench": string;
  "mcp/ping": string;
  "mcp/proxy": string;
  "mcp/teams": string;
  "mcp/flags": string;
  graphql: string;
  health: string;
  ai: string;
  r2: string;
  websocket: string;
  [key: string]: string;
}

export interface PerformanceBenchmarks {
  search_speed: string;
  routing_accuracy: string;
  ai_response_time: string;
  cold_start_time: string;
}

export interface RegistryPackage {
  name: string;
  version: string;
  protocol: 'npm' | 'jsr' | 'workspace' | 'git';
  dependencies: Record<string, string>;
  description?: string;
  author?: string;
  maintainers?: string[];
  homepage?: string;
  repository?: string;
  license?: string;
  history?: { version: string; date: string }[];
  recentChanges?: string;
  keywords?: string[];
  dist?: {
    tarball: string;
    shasum: string;
    integrity: string;
    unpackedSize: string;
  };
  distTags?: Record<string, string>;
  types: {
    definitions: string;
    compatibility: {
      node: '25' | '24' | '18';
      bun?: '1.0' | '1.1';
    };
  };
}

export interface RegistryDashboardState {
  message: string;
  service: string;
  version: string;
  status: ServiceStatus;
  uptime_seconds: number;
  active_pty_sessions: number;
  metrics: InfrastructureMetrics;
  telemetry_buffers: TelemetryBuffers;
  registry_status: string;
  topology_verified: boolean;
  region: string;
  ui_p99_latency?: string;
  endpoints: ServiceTopology;
  features: SystemFeature[];
  performance: PerformanceBenchmarks;
  registry_powered: boolean;
  deployment: DeploymentEnvironment | string;
  enhancement_level: string;
  timestamp: Timestamp;
  packages?: RegistryPackage[];
}

export const View = {
  DASHBOARD: 'DASHBOARD',
  TOPOLOGY: 'TOPOLOGY',
  REGISTRY: 'REGISTRY',
  ARCHITECTURE: 'ARCHITECTURE',
  SECURITY: 'SECURITY',
  GRAPHQL: 'GRAPHQL',
  BENCHMARK: 'BENCHMARK',
  ENDPOINTS: 'ENDPOINTS',
  TERMINAL: 'TERMINAL',
  REUSABLE_TERMINAL: 'REUSABLE_TERMINAL',
  BUNFIG: 'BUNFIG',
  PM_CLI: 'PM_CLI',
  CODESEARCH: 'CODESEARCH',
  AI_ASSISTANT: 'AI_ASSISTANT',
  RUNTIME: 'RUNTIME',
  PERFORMANCE_MATRIX: 'PERFORMANCE_MATRIX',
  SELECTION_CRITERIA: 'SELECTION_CRITERIA',
  FEDERATION_MATRIX: 'FEDERATION_MATRIX',
  NATIVE_APIS: 'NATIVE_APIS',
  LSP_MONITOR: 'LSP_MONITOR',
  PLUGINS: 'PLUGINS',
  KQUEUE_TUNING: 'KQUEUE_TUNING',
  GC_ANALYSIS: 'GC_ANALYSIS',
  GOVERNANCE: 'GOVERNANCE',
  BLOG_INFRA: 'BLOG_INFRA',
  CLUSTER: 'CLUSTER',
  WORKERS: 'WORKERS',
  DURABLE_OBJECTS: 'DURABLE_OBJECTS',
  TELEGRAM: 'TELEGRAM',
  QUANTITATIVE_TELEMETRY: 'QUANTITATIVE_TELEMETRY',
  SELF_HEALING_MESH: 'SELF_HEALING_MESH',
  PLUGIN_ARCHITECTURE: 'PLUGIN_ARCHITECTURE'
} as const;

export type View = typeof View[keyof typeof View];
