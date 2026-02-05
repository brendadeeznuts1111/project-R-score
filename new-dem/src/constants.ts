// T3-Lattice Enterprise Constants
// Advanced configuration and type definitions

export const LATTICE_REGISTRY = {
  VERSION: "3.3.0",
  SCOPE: {
    PUBLIC: "public",
    PRIVATE_BETA: "private-beta",
    ENTERPRISE: "enterprise"
  },
  AGENT_ID: "T3-Lattice-Registry/3.3.0",

  HEADERS: {
    SESSION: "X-Session",
    SCOPE: "X-Scope",
    AGENT: "X-Agent",
    REQUEST_ID: "X-Request-ID",
    CSRF_TOKEN: "X-CSRF-Token"
  },

  AUTH_SCHEME: "Bearer",

  ENDPOINTS: {
    HEALTH: "/health",
    METRICS: "/api/metrics",
    WS: "/ws",
    COMPONENTS: "/api/components",
    AUDIT: "/api/security/audit"
  },

  SUPPORTED_ENCODINGS: ["gzip", "deflate", "br"],

  SLA: {
    P50_TARGET: 200,  // 200ms
    P99_MAX: 2000,    // 2 seconds
    ERROR_RATE_MAX: 0.01  // 1%
  }
} as const;

export const CONFIG = {
  registryUrl: process.env.LATTICE_REGISTRY_URL || "http://localhost:8080",
  registryToken: process.env.LATTICE_TOKEN || "",
  maxHttpRequests: parseInt(process.env.BUN_CONFIG_MAX_HTTP_REQUESTS || "256"),
  enableCompression: true,
  dnsPrefetchInterval: 30000, // 30 seconds
  wsBackpressureLimit: 1024 * 1024, // 1MB
  keepaliveTimeout: 30000, // 30 seconds
  csrfEnabled: process.env.LATTICE_CSRF_ENABLED === "true",
  threatIntelEnabled: process.env.LATTICE_THREAT_INTEL_ENABLED === "true",
  quantumAuditEnabled: process.env.LATTICE_QUANTUM_AUDIT_ENABLED === "false",
  auditLogPath: process.env.LATTICE_AUDIT_PATH || "./logs/lattice_audit.log"
} as const;