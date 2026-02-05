
import { RegistryDashboardState, Timestamp } from './types';

// Polyfill for URLPattern in environments that don't support it yet (e.g. Firefox)
if (typeof (globalThis as any).URLPattern === 'undefined') {
  (globalThis as any).URLPattern = class URLPattern {
    pathname: string;
    constructor(input: { pathname: string }) { this.pathname = input.pathname; }
    exec(url: string) { 
        // Simple mock implementation for demo purposes
        if (url.includes(this.pathname.replace('*', '').replace(/:[a-zA-Z0-9\(\)\|]+(\?)?/g, '').split('/')[1])) {
             // Mock groups based on pattern type
             if (this.pathname.includes(':program')) {
                 const match = url.match(/\/pty\/(vim|bash|htop)\/([^\/]+)/);
                 if (match) return { pathname: { groups: { program: match[1], id: match[2] } } };
                 return { pathname: { groups: { program: 'vim', id: 'session_1' } } };
             }
             // Mock RSS groups
             if (this.pathname.includes(':category')) {
                 const match = url.match(/\/rss\/(security|updates|all)/);
                 if (match) return { pathname: { groups: { category: match[1] } } };
                 return { pathname: { groups: { category: 'all' } } };
             }
             return { pathname: { groups: { scope: '@mcp', name: 'core' } } };
        }
        return null; 
    }
    test(url: string) { return true; }
  };
}

/**
 * MCP Registry Topology Constants
 * Level: v2.4.1 Hardened Production
 */
export const REGISTRY_MATRIX = {
  RUNTIME: {
    VERSION: "1.3.6_STABLE",
    BUN_CORE: "1.2.4",
    NODE_PARITY: "25",
    ENGINE: "JavaScriptCore + BoringSSL",
  },
  
  STATUS_CODES: {
    OPERATIONAL: { code: 200, label: "STABLE", color: "#10b981" },
    DEGRADED: { code: 299, label: "LATENCY_WARNING", color: "#f59e0b" },
    PTY_READY: { code: 101, label: "SWITCHING_PROTOCOLS", color: "#6366f1" },
    MAINTENANCE: { code: 503, label: "SYNC_LOCK", color: "#ef4444" },
  },

  PROTOCOL_SIGNATURES: {
    SAFE_PRIME_GEN: "O(log⁴ n)",
    WS_BRIDGE: "RFC 6455 §5.4",
    KEEP_ALIVE: "RFC 7230 (Case-Insensitive)",
    SEARCH_ACCELERATION: "SIMD-ES2023",
  },

  FEATURES: {
    FRAGMENT_GUARD: { status: "ACTIVE", version: "1.3.6" },
    WS_COOKIE_SYNC: { status: "STABLE", rfc: 6265 },
    STANDALONE_AUTOLOAD: { status: "DISABLED_BY_DEFAULT", flag: "--compile-autoload" },
    CONNECTION_POOLING: { status: "REUSE_FIXED", agent: "http.Agent" },
  },

  COOKIES: {
    SESSION_NAME: "mcp_session",
    SECURITY_PROFILE: "Strict-Hardened",
    ENGINE: "Bun.CookieMap (C++)",
    ATTRIBUTES: {
      HTTP_ONLY: true,
      SECURE: true,
      SAME_SITE: "strict",
      PARTITIONED: true, // CHIPS Enabled
    },
    RFC_COMPLIANCE: 6265,
  },

  TOPOLOGY: {
    GLOBAL_POPS: 300,
    FAILOVER_THRESHOLD_MS: 200,
    AVG_LATENCY_TARGET: "11.2ms",
  },
} as const;

/**
 * MCP Edge Routing Matrix
 * Powered by Bun 1.2.4 Native URLPattern
 */
export const EDGE_ROUTES = {
  PTY_SESSION: new (globalThis as any).URLPattern({ pathname: "/pty/:program(vim|bash|htop)/:id" }),
  REGISTRY_PKG: new (globalThis as any).URLPattern({ pathname: "/registry/:scope?/:name" }),
  STORAGE_R2: new (globalThis as any).URLPattern({ pathname: "/api/r2/*" }),
  TEAM_FLAGS: new (globalThis as any).URLPattern({ pathname: "/mcp/teams/:teamId/flags" }),
  RSS_STREAM: new (globalThis as any).URLPattern({ pathname: "/rss/:category(security|updates|all)?" }),
} as const;

export const MOCK_DATA: RegistryDashboardState = {
  "message": "Bun MCP Registry Hub - Enhanced Production Dashboard",
  "service": "registry-powered-mcp",
  "version": REGISTRY_MATRIX.RUNTIME.VERSION,
  "status": "operational",
  "metrics": {
    "uptime_seconds": 0,
    "response_time_ms": 8,
    "bundle_size_kb": 9.64,
    "gzip_size_kb": 2.46,
    "compression_ratio": "73%",
    "global_locations": REGISTRY_MATRIX.TOPOLOGY.GLOBAL_POPS,
    "ai_model": "@cf/meta/llama-3.1-8b-instruct",
    "p99_response_time": "10.8ms"
  },
  "endpoints": {
    "dashboard": "/",
    "mcp": "/mcp",
    "mcp/health": "/mcp/health",
    "mcp/registry": "/mcp/registry",
    "mcp/codesearch": "/mcp/codesearch",
    "mcp/pty": "/mcp/pty/info",
    "pty/vim": "wss://cloudflare-workers-app-production.utahj4754.workers.dev/pty/vim",
    "pty/htop": "wss://cloudflare-workers-app-production.utahj4754.workers.dev/pty/htop",
    "pty/bash": "wss://cloudflare-workers-app-production.utahj4754.workers.dev/pty/bash",
    "mcp/chat": "/mcp/chat",
    "mcp/metrics": "/mcp/metrics",
    "mcp/bench": "/mcp/bench",
    "mcp/ping": "/mcp/ping",
    "mcp/proxy": "/mcp/proxy",
    "mcp/teams": "/mcp/teams",
    "mcp/flags": "/mcp/flags",
    "graphql": "/graphql",
    "health": "/health",
    "ai": "/api/ai",
    "r2": "/api/r2",
    "websocket": "/ws",
    "rss": "/rss/all"
  },
  "features": [
    "TERMINAL_PTY",
    "S3_CONTENT_DISPOSITION",
    "WEBSOCKET_REALTIME",
    "AI_CONVERSATIONAL",
    "METRICS_MONITORING",
    "LATTICE_EVENT_STREAM"
  ],
  "performance": {
    "search_speed": "175x faster than grep",
    "routing_accuracy": "100%",
    "ai_response_time": "<100ms",
    "cold_start_time": "~0ms"
  },
  "packages": [
    {
      "name": "bun-types",
      "version": "1.2.0",
      "protocol": "npm",
      "dependencies": { "@types/node": "^25.0.0" },
      "description": "Type definitions for the Bun runtime.",
      "author": "Jarred Sumner",
      "maintainers": ["oven-sh", "ashley"],
      "homepage": "https://bun.sh",
      "repository": "https://github.com/oven-sh/bun",
      "license": "MIT",
      "keywords": ["bun", "types", "runtime", "javascript", "zig"],
      "dist": {
        "tarball": "https://registry.npmjs.org/bun-types/-/bun-types-1.2.0.tgz",
        "shasum": "d33dd1721698f4376ae57a54098cb47fc75d93a5",
        "integrity": "sha512-tmbWg6W31tQLeB5cdIBOicJDJRR2KzXsV7uSK9iNfLWQ5bIZfxuPEHp7M8wiHyHnn0DD1i7w3Zmin0FtkrwoCQ==",
        "unpackedSize": "171.60 KB"
      },
      "distTags": {
        "latest": "1.2.0",
        "canary": "1.2.1-canary.0",
        "beta": "1.2.0-beta.1"
      },
      "history": [
        { "version": "1.1.42", "date": "2025-12-01" },
        { "version": "1.1.40", "date": "2025-11-20" }
      ],
      "recentChanges": "Added support for Bun.file().text() optimization and Node 25 headers.",
      "types": { "definitions": "index.d.ts", "compatibility": { "node": "25", "bun": "1.1" } }
    },
    {
      "name": "@mcp/core-runtime",
      "version": "1.3.6",
      "protocol": "workspace",
      "dependencies": { "bun-types": "^1.2.0", "zod": "^3.22.0" },
      "description": "Core runtime primitives for the MCP federation.",
      "author": "Internal Tools",
      "maintainers": ["platform-team"],
      "homepage": "https://internal.mcp.dev",
      "repository": "git.corp/mcp/core",
      "license": "UNLICENSED",
      "keywords": ["mcp", "federation", "core", "internal"],
      "dist": {
        "tarball": "https://registry.internal/mcp/core-runtime/-/core-runtime-1.3.6.tgz",
        "shasum": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
        "integrity": "sha512-INTERNAL+INTEGRITY+CHECK+PASSED",
        "unpackedSize": "45.2 KB"
      },
      "distTags": {
        "latest": "1.3.6",
        "stable": "1.3.0"
      },
      "history": [
        { "version": "1.3.5", "date": "2025-12-15" },
        { "version": "1.3.0", "date": "2025-11-05" }
      ],
      "recentChanges": "Refactored durable object signaling for WebSocket bridges.",
      "types": { "definitions": "index.d.ts", "compatibility": { "node": "25", "bun": "1.1" } }
    },
    {
      "name": "jsr-alias-demo",
      "version": "1.0.6",
      "protocol": "jsr",
      "dependencies": { 
          "semver": "npm:@jsr/std__semver@1.0.6",
          "no-deps": "npm:@types/no-deps@^2.0.0"
      },
      "description": "Demonstration of JSR aliasing capabilities.",
      "author": "Deno Land Inc.",
      "maintainers": ["ry", "lucacasonato"],
      "homepage": "https://jsr.io/@std/semver",
      "repository": "https://github.com/denoland/deno_std",
      "license": "MIT",
      "keywords": ["jsr", "alias", "demo", "deno"],
      "dist": {
        "tarball": "https://jsr.io/packages/@std/semver/1.0.6.tgz",
        "shasum": "f9e8d7c6b5a4z3y2x1w0v9u8t7s6r5q4p3o2n1m",
        "integrity": "sha512-jsr-integrity-hash-mock",
        "unpackedSize": "22.1 KB"
      },
      "distTags": {
        "latest": "1.0.6"
      },
      "history": [
        { "version": "1.0.5", "date": "2025-10-30" }
      ],
      "recentChanges": "Updated semver parsing logic to match node-semver 7.x behavior.",
      "types": { "definitions": "mod.ts", "compatibility": { "node": "25", "bun": "1.1" } }
    }
  ],
  "registry_powered": true,
  "deployment": "cloudflare-workers-production",
  "enhancement_level": "v2.0 Hyper-Scale",
  "timestamp": "2025-12-19T05:14:14.770Z" as Timestamp
};

export const TTY_ECOSYSTEM = [
  { "program": "vim", "features": "Colors, mouse, cursor, :w", "integration": "Auto-ripgrep on save, HistoryCLI", "performance": "Native speed", "cloudflare": "WebSocket bridge", "docker": true },
  { "program": "htop", "features": "Mouse, colors, bars, resize", "integration": "Metrics → Telegram, R2 archive", "performance": "Real-time 60fps", "cloudflare": "Worker streaming", "docker": true },
  { "program": "bash", "features": "Colors, tab-complete, arrows", "integration": "Ripgrep pipeline, MCP commands", "performance": "Interactive", "cloudflare": "Durable Objects", "docker": true }
];

export const ENTERPRISE_SCOPES_DATA = [
  { "scope": "@registry-mcp", "tag": "CORE", "desc": "Official registry components", "features": ["zstd", "edge-cache"] },
  { "scope": "@internal", "tag": "PRIVATE", "desc": "Internal toolchain", "features": ["R2 storage", "auth-sync"] }
];
