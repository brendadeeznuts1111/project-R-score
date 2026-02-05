/**
 * T3-Lattice Registry TypeScript Type Definitions
 * Full compliance with registry-spec.md v1.2.1 & v3.3
 */

export type RegimePattern = 
  | "▵⟂⥂"
  | "⥂⟂(▵⟜⟳)"
  | "⟳⟲⟜(▵⊗⥂)"
  | "(▵⊗⥂)⟂⟳"
  | "⊟";

export interface Component {
  id: number;
  name: string;
  hex: string;
  hsl: string;
  slot: string;
  pattern: string;
}

export const COMPONENTS: Component[] = [
  { id: 1,  name: "TOML Config",     hex: "#4ECDC4",  hsl: "hsl(174, 54%, 61%)",  slot: "/slots/config",      pattern: "grid" },
  { id: 2,  name: "DNS Prefetch",    hex: "#5BA4B8",  hsl: "hsl(193, 41%, 52%)",  slot: "/slots/dns",        pattern: "wave" },
  { id: 3,  name: "Secrets",         hex: "#7FA886",  hsl: "hsl(138, 25%, 53%)",  slot: "/slots/secrets",    pattern: "lock" },
  { id: 4,  name: "Fetch/ETag",      hex: "#E8D591",  hsl: "hsl(45, 67%, 71%)",   slot: "/slots/fetch",      pattern: "stream" },
  { id: 5,  name: "Channels",        hex: "#5D4E8C",  hsl: "hsl(255, 33%, 40%)",  slot: "/slots/color",      pattern: "amp" },
  { id: 6,  name: "SQLite",          hex: "#98D8C8",  hsl: "hsl(159, 36%, 64%)",  slot: "/slots/sqlite",     pattern: "db" },
  { id: 7,  name: "%j Logging",      hex: "#F0D88A",  hsl: "hsl(47, 79%, 68%)",   slot: "/slots/log",        pattern: "stream" },
  { id: 8,  name: "Table",           hex: "#8B7CB3",  hsl: "hsl(255, 30%, 55%)",  slot: "/slots/table",      pattern: "matrix" },
  { id: 9,  name: "S3 Stream",       hex: "#5BA4B8",  hsl: "hsl(193, 41%, 52%)",  slot: "/slots/s3",         pattern: "cloud" },
  { id: 10, name: "Proxy",           hex: "#7F8C8D",  hsl: "hsl(190, 12%, 42%)",  slot: "/slots/proxy",      pattern: "mirror" },
  { id: 11, name: "Dashboard",       hex: "#4ECDC4",  hsl: "hsl(175, 49%, 73%)",  slot: "/slots/dashboard",  pattern: "grid" },
  { id: 12, name: "URLPattern",      hex: "#6A5F9E",  hsl: "hsl(250, 27%, 45%)",  slot: "/slots/routing",    pattern: "route" },
  { id: 13, name: "PTY Terminal",    hex: "#4ECDC4",  hsl: "hsl(174, 54%, 61%)",  slot: "/slots/terminal",   pattern: "grid" },
  { id: 14, name: "Flags",           hex: "#A5C9A8",  hsl: "hsl(130, 32%, 64%)",  slot: "/slots/features",   pattern: "toggle" },
  { id: 15, name: "HTTP Pool",       hex: "#5BA4B8",  hsl: "hsl(193, 41%, 52%)",  slot: "/slots/http-pool",  pattern: "pool" },
  { id: 16, name: "Compile",         hex: "#7F8C8D",  hsl: "hsl(191, 8%, 52%)",   slot: "/slots/compile",    pattern: "cargo" },
  { id: 17, name: "Timers",          hex: "#F0D88A",  hsl: "hsl(47, 79%, 68%)",   slot: "/slots/test",       pattern: "timer" },
  { id: 18, name: "UUIDv7",          hex: "#5D4E8C",  hsl: "hsl(255, 33%, 40%)",  slot: "/slots/uuid",       pattern: "id" },
  { id: 19, name: "stringWidth",     hex: "#4ECDC4",  hsl: "hsl(174, 54%, 61%)",  slot: "/slots/stringwidth",pattern: "grid" },
  { id: 20, name: "V8 APIs",         hex: "#7F8C8D",  hsl: "hsl(193, 10%, 46%)",  slot: "/slots/native",     pattern: "native" },
  { id: 21, name: "Disposition",     hex: "#9CA8AB",  hsl: "hsl(190, 9%, 57%)",   slot: "/slots/disposition",pattern: "download" },
  { id: 22, name: "Env Exp",         hex: "#FFEAA7",  hsl: "hsl(47, 79%, 68%)",   slot: "/slots/env",        pattern: "stream" },
  { id: 23, name: "Bug Fixes",       hex: "#6D7679",  hsl: "hsl(190, 12%, 42%)",  slot: "/slots/fixes",      pattern: "fix" },
  { id: 24, name: "Versioning",      hex: "#E91E63",  hsl: "hsl(346, 51%, 53%)",  slot: "/slots/version",    pattern: "tag" }
];

export interface LatticeRegistryResponse<T = unknown> {
  data: T;
  metadata: {
    requestId: string;
    timestamp: string;
    version: string;
    region: string;
  };
}

export interface LatticeOddsData {
  marketId: string;
  timestamp: number;
  odds: Record<string, number>;
  regime: RegimePattern;
  checksum: string;
}

export interface LatticeCalcResult {
  fdValue: number;
  confidence: number;
  computationTime: number;
  patternMatch: boolean;
}

export interface RegistryManifest {
  version: string;
  endpoints: string[];
  scopes: string[];
  compression: string[];
  lastUpdated: string;
}

export interface LatticeMetric {
  Endpoint: string;
  "DNS Prefetch": string;
  "TLS Handshake": string;
  "First Byte": string;
  "Stream JSON": string;
  "P99 Latency": string;
  Status: "⟳ ACTIVE" | "⚠ LATENCY" | "⚡ PEAK" | "✖ ERROR" | "⟲ PHASE_LOCKED";
  RequestId: string;
  Region: string;
}

export interface LatticeWebSocketPayload {
  uuid: string;
  fdByte: number;
  colorNumber: number;
  glyph: Uint8Array;
  glyphBuffer?: ArrayBuffer; // v3.3: Support for zero-copy Transferable transfers
  timestamp: number;
}

export interface LatticeCSRConfig {
  rejectUnauthorized: boolean;
  ca?: string;
  cert?: string;
  key?: string;
}

export interface LatticeProxyConfig {
  enabled: boolean;
  url: string;
  headers?: Record<string, string>;
}

export interface LatticePoolConfig {
  keepAlive: boolean;
  maxSockets: number;
  maxFreeSockets: number;
  timeout: number;
}

export interface LatticeCompileConfig {
  autoloadTsconfig: boolean;
  autoloadPackageJson: boolean;
  autoloadDotenv: boolean;
  autoloadBunfig: boolean;
}

export interface LatticeConfig {
  maxHttpRequests: number;
  registryUrl: string;
  registryToken: string;
  csrfEnabled: boolean;
  threatIntelEnabled: boolean;
  quantumAuditEnabled: boolean;
  enableCompression: boolean;
  keepaliveTimeout: number;
  dnsPrefetchInterval: number;
  wsPort: number;
  wsBackpressureLimit: number;
  auditLogPath: string;
  auditRetentionDays: number;
  // v1.3.4 & v3.3
  proxy: LatticeProxyConfig;
  pool: LatticePoolConfig;
  compile: LatticeCompileConfig;
  components: Component[];
  health: {
    p99_limit: number;
    p50_target: number;
    dns_ttl: number;
  };
  glyphs: {
    stable: string;
    drift: string;
    chaotic: string;
  };
}

export interface LatticeRegistryConstants {
  // Base URLs
  BASE_URL: string;
  HEALTH_ENDPOINT: string;
  
  // Core API Endpoints
  ODDS_V1: string;
  CALC_FD: string;
  REG_SUB: string;
  REGISTRY_MANIFEST: string;
  
  // Scope Definitions
  SCOPE: {
    PRIVATE_ALPHA: string;
    PRIVATE_BETA: string;
    PRODUCTION: string;
  };
  
  // Agent Identification
  AGENT_ID: string;
  
  // Headers
  HEADERS: {
    SESSION: string;
    SCOPE: string;
    AGENT: string;
    REQUEST_ID: string;
    CSRF_TOKEN: string;
    VERSION: string;
    TIMESTAMP: string;
    SIGNATURE: string;
  };
  
  // Authentication
  AUTH_SCHEME: string;
  
  // Compression
  SUPPORTED_ENCODINGS: string[];
  
  // WebSocket
  WS_ENDPOINT: string;
  WS_BINARY_OPCODE: number;
  
  // SLA Thresholds
  SLA: {
    P99_MAX: number;
    P50_TARGET: number;
    DNS_PREFETCH_MAX: number;
    TLS_HANDSHAKE_MAX: number;
  };
}
