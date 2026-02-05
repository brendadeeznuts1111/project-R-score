/**
 * URLPattern Runtime Security Guards
 * Generated: 2026-01-22T14:25:21.563Z
 * Patterns: 19 (high: 0, medium: 10)
 *
 * Usage:
 *   import { _pkg_Guard } from './security-guards';
 *   _pkg_Guard.beforeExec(url, groups);
 *   const result = pattern.exec(url);
 *   _pkg_Guard.afterExec(result, execTimeNs);
 */

export interface GuardContext {
  url: string;
  groups: Record<string, string | undefined>;
}

export interface GuardResult {
  allowed: boolean;
  blocked?: string;
  warnings: string[];
}

export interface ErrorResult {
  error: string;
  url: string;
  timestamp: number;
  recoverable: boolean;
}

export interface PatternGuard {
  pattern: string;
  hash: string;
  riskLevel: "low" | "medium" | "high";
  timeoutMs: number;
  beforeExec: (url: string, groups: Record<string, string | undefined>) => GuardResult;
  afterExec: (result: URLPatternResult | null, execTimeNs: number) => void;
  onError: (error: Error, url: string) => ErrorResult;
}

// Security utilities
const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "169.254.169.254", "metadata.google.internal", "[::1]"]);
const PRIVATE_RANGES = [/^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./];
function isBlockedHost(h: string): boolean {
  return BLOCKED_HOSTS.has(h.toLowerCase()) || PRIVATE_RANGES.some((r) => r.test(h));
}
function hasPathTraversal(p: string): boolean {
  try { return /\.\.\/|%2e%2e|%252e/i.test(decodeURIComponent(p)); } catch { return false; }
}
function extractHost(url: string): string | null {
  try { return new URL(url).hostname; } catch { return null; }
}

// Audit log (circular buffer, max 10k entries)
interface AuditEntry { ts: number; hash: string; url: string; action: "allowed" | "blocked" | "error"; execTimeNs?: number; details?: string; }
const auditLog: AuditEntry[] = [];
function log(hash: string, url: string, action: AuditEntry["action"], execTimeNs?: number, details?: string) {
  auditLog.push({ ts: Date.now(), hash, url, action, execTimeNs, details });
  if (auditLog.length > 10000) auditLog.shift();
}
export function getAuditLog() { return auditLog; }
export function clearAuditLog() { auditLog.length = 0; }

// Per-pattern guards

export const _api_v1_users_id_Guard: PatternGuard = {
  pattern: `/api/v1/users/:id`,
  hash: "0c4bdfeb",
  riskLevel: "low",
  timeoutMs: 5,

  beforeExec(url: string, groups: Record<string, string | undefined>): GuardResult {
    const warnings: string[] = [];
    let blocked: string | undefined;
    log("0c4bdfeb", url, blocked ? "blocked" : "allowed", undefined, blocked || warnings.join("; "));
    return { allowed: !blocked, blocked, warnings };
  },

  afterExec(result: URLPatternResult | null, execTimeNs: number): void {
    const execMs = execTimeNs / 1e6;
    if (execMs > 5) {
      console.warn(`[0c4bdfeb] Slow exec: ${execMs.toFixed(2)}ms (limit: 5ms)`);
    }
    if (result) log("0c4bdfeb", "", "allowed", execTimeNs);
  },

  onError(error: Error, url: string): ErrorResult {
    log("0c4bdfeb", url, "error", undefined, error.message);
    return {
      error: error.message,
      url,
      timestamp: Date.now(),
      recoverable: !error.message.includes("timeout") && !error.message.includes("abort"),
    };
  },
};

export const _api_files_path_Guard: PatternGuard = {
  pattern: `/api/files/:path*`,
  hash: "d603fa50",
  riskLevel: "low",
  timeoutMs: 5,

  beforeExec(url: string, groups: Record<string, string | undefined>): GuardResult {
    const warnings: string[] = [];
    let blocked: string | undefined;
    log("d603fa50", url, blocked ? "blocked" : "allowed", undefined, blocked || warnings.join("; "));
    return { allowed: !blocked, blocked, warnings };
  },

  afterExec(result: URLPatternResult | null, execTimeNs: number): void {
    const execMs = execTimeNs / 1e6;
    if (execMs > 5) {
      console.warn(`[d603fa50] Slow exec: ${execMs.toFixed(2)}ms (limit: 5ms)`);
    }
    if (result) log("d603fa50", "", "allowed", execTimeNs);
  },

  onError(error: Error, url: string): ErrorResult {
    log("d603fa50", url, "error", undefined, error.message);
    return {
      error: error.message,
      url,
      timestamp: Date.now(),
      recoverable: !error.message.includes("timeout") && !error.message.includes("abort"),
    };
  },
};

export const _redirect_url_TARGET_Guard: PatternGuard = {
  pattern: `/redirect?url=${TARGET}`,
  hash: "84f1b1d3",
  riskLevel: "medium",
  timeoutMs: 5,

  beforeExec(url: string, groups: Record<string, string | undefined>): GuardResult {
    const warnings: string[] = [];
    let blocked: string | undefined;
    if (groups.redirect || groups.next || groups.url || groups.goto) warnings.push("Potential open redirect");
    // Env vars: TARGET
    for (const v of ["TARGET"]) {
      const val = process.env[v];
      if (val && /[\x00-\x1f$`|;&]/.test(val)) blocked = `Unsafe env var: ${v}`;
    }
    log("84f1b1d3", url, blocked ? "blocked" : "allowed", undefined, blocked || warnings.join("; "));
    return { allowed: !blocked, blocked, warnings };
  },

  afterExec(result: URLPatternResult | null, execTimeNs: number): void {
    const execMs = execTimeNs / 1e6;
    if (execMs > 5) {
      console.warn(`[84f1b1d3] Slow exec: ${execMs.toFixed(2)}ms (limit: 5ms)`);
    }
    if (result) log("84f1b1d3", "", "allowed", execTimeNs);
  },

  onError(error: Error, url: string): ErrorResult {
    log("84f1b1d3", url, "error", undefined, error.message);
    return {
      error: error.message,
      url,
      timestamp: Date.now(),
      recoverable: !error.message.includes("timeout") && !error.message.includes("abort"),
    };
  },
};

export const _api_etc_passwd_Guard: PatternGuard = {
  pattern: `/api/../../../etc/passwd`,
  hash: "5b521203",
  riskLevel: "medium",
  timeoutMs: 5,

  beforeExec(url: string, groups: Record<string, string | undefined>): GuardResult {
    const warnings: string[] = [];
    let blocked: string | undefined;
    if (hasPathTraversal(url)) blocked = "Path traversal detected";
    log("5b521203", url, blocked ? "blocked" : "allowed", undefined, blocked || warnings.join("; "));
    return { allowed: !blocked, blocked, warnings };
  },

  afterExec(result: URLPatternResult | null, execTimeNs: number): void {
    const execMs = execTimeNs / 1e6;
    if (execMs > 5) {
      console.warn(`[5b521203] Slow exec: ${execMs.toFixed(2)}ms (limit: 5ms)`);
    }
    if (result) log("5b521203", "", "allowed", execTimeNs);
  },

  onError(error: Error, url: string): ErrorResult {
    log("5b521203", url, "error", undefined, error.message);
    return {
      error: error.message,
      url,
      timestamp: Date.now(),
      recoverable: !error.message.includes("timeout") && !error.message.includes("abort"),
    };
  },
};

export const _proxy_url_Guard: PatternGuard = {
  pattern: `/proxy/:url*`,
  hash: "9c7dc231",
  riskLevel: "low",
  timeoutMs: 5,

  beforeExec(url: string, groups: Record<string, string | undefined>): GuardResult {
    const warnings: string[] = [];
    let blocked: string | undefined;
    log("9c7dc231", url, blocked ? "blocked" : "allowed", undefined, blocked || warnings.join("; "));
    return { allowed: !blocked, blocked, warnings };
  },

  afterExec(result: URLPatternResult | null, execTimeNs: number): void {
    const execMs = execTimeNs / 1e6;
    if (execMs > 5) {
      console.warn(`[9c7dc231] Slow exec: ${execMs.toFixed(2)}ms (limit: 5ms)`);
    }
    if (result) log("9c7dc231", "", "allowed", execTimeNs);
  },

  onError(error: Error, url: string): ErrorResult {
    log("9c7dc231", url, "error", undefined, error.message);
    return {
      error: error.message,
      url,
      timestamp: Date.now(),
      recoverable: !error.message.includes("timeout") && !error.message.includes("abort"),
    };
  },
};

export const _internal_metadata_google_inter_Guard: PatternGuard = {
  pattern: `/internal/metadata.google.internal/*`,
  hash: "a730bd8b",
  riskLevel: "medium",
  timeoutMs: 5,

  beforeExec(url: string, groups: Record<string, string | undefined>): GuardResult {
    const warnings: string[] = [];
    let blocked: string | undefined;
    const host = extractHost(url);
    if (host && isBlockedHost(host)) blocked = "SSRF: blocked host";
    log("a730bd8b", url, blocked ? "blocked" : "allowed", undefined, blocked || warnings.join("; "));
    return { allowed: !blocked, blocked, warnings };
  },

  afterExec(result: URLPatternResult | null, execTimeNs: number): void {
    const execMs = execTimeNs / 1e6;
    if (execMs > 5) {
      console.warn(`[a730bd8b] Slow exec: ${execMs.toFixed(2)}ms (limit: 5ms)`);
    }
    if (result) log("a730bd8b", "", "allowed", execTimeNs);
  },

  onError(error: Error, url: string): ErrorResult {
    log("a730bd8b", url, "error", undefined, error.message);
    return {
      error: error.message,
      url,
      timestamp: Date.now(),
      recoverable: !error.message.includes("timeout") && !error.message.includes("abort"),
    };
  },
};

export const _https_example_com_callback_Guard: PatternGuard = {
  pattern: `https://*.example.com/callback`,
  hash: "bf1b6525",
  riskLevel: "medium",
  timeoutMs: 5,

  beforeExec(url: string, groups: Record<string, string | undefined>): GuardResult {
    const warnings: string[] = [];
    let blocked: string | undefined;
    if (groups.redirect || groups.next || groups.url || groups.goto) warnings.push("Potential open redirect");
    log("bf1b6525", url, blocked ? "blocked" : "allowed", undefined, blocked || warnings.join("; "));
    return { allowed: !blocked, blocked, warnings };
  },

  afterExec(result: URLPatternResult | null, execTimeNs: number): void {
    const execMs = execTimeNs / 1e6;
    if (execMs > 5) {
      console.warn(`[bf1b6525] Slow exec: ${execMs.toFixed(2)}ms (limit: 5ms)`);
    }
    if (result) log("bf1b6525", "", "allowed", execTimeNs);
  },

  onError(error: Error, url: string): ErrorResult {
    log("bf1b6525", url, "error", undefined, error.message);
    return {
      error: error.message,
      url,
      timestamp: Date.now(),
      recoverable: !error.message.includes("timeout") && !error.message.includes("abort"),
    };
  },
};

export const _search_q_query_Guard: PatternGuard = {
  pattern: `/search?q=:query(.*)+`,
  hash: "50eacd91",
  riskLevel: "medium",
  timeoutMs: 2,

  beforeExec(url: string, groups: Record<string, string | undefined>): GuardResult {
    const warnings: string[] = [];
    let blocked: string | undefined;
    log("50eacd91", url, blocked ? "blocked" : "allowed", undefined, blocked || warnings.join("; "));
    return { allowed: !blocked, blocked, warnings };
  },

  afterExec(result: URLPatternResult | null, execTimeNs: number): void {
    const execMs = execTimeNs / 1e6;
    if (execMs > 2) {
      console.warn(`[50eacd91] Slow exec: ${execMs.toFixed(2)}ms (limit: 2ms)`);
    }
    if (result) log("50eacd91", "", "allowed", execTimeNs);
  },

  onError(error: Error, url: string): ErrorResult {
    log("50eacd91", url, "error", undefined, error.message);
    return {
      error: error.message,
      url,
      timestamp: Date.now(),
      recoverable: !error.message.includes("timeout") && !error.message.includes("abort"),
    };
  },
};

export const _auth_callback_next_REDIRECT_UR_Guard: PatternGuard = {
  pattern: `/auth/callback?next=${REDIRECT_URL}`,
  hash: "989544e2",
  riskLevel: "medium",
  timeoutMs: 5,

  beforeExec(url: string, groups: Record<string, string | undefined>): GuardResult {
    const warnings: string[] = [];
    let blocked: string | undefined;
    if (groups.redirect || groups.next || groups.url || groups.goto) warnings.push("Potential open redirect");
    // Env vars: REDIRECT_URL
    for (const v of ["REDIRECT_URL"]) {
      const val = process.env[v];
      if (val && /[\x00-\x1f$`|;&]/.test(val)) blocked = `Unsafe env var: ${v}`;
    }
    log("989544e2", url, blocked ? "blocked" : "allowed", undefined, blocked || warnings.join("; "));
    return { allowed: !blocked, blocked, warnings };
  },

  afterExec(result: URLPatternResult | null, execTimeNs: number): void {
    const execMs = execTimeNs / 1e6;
    if (execMs > 5) {
      console.warn(`[989544e2] Slow exec: ${execMs.toFixed(2)}ms (limit: 5ms)`);
    }
    if (result) log("989544e2", "", "allowed", execTimeNs);
  },

  onError(error: Error, url: string): ErrorResult {
    log("989544e2", url, "error", undefined, error.message);
    return {
      error: error.message,
      url,
      timestamp: Date.now(),
      recoverable: !error.message.includes("timeout") && !error.message.includes("abort"),
    };
  },
};

export const _api_v2_items_id_d_Guard: PatternGuard = {
  pattern: `/api/v2/items/:id(\\d+)`,
  hash: "19ef78f1",
  riskLevel: "low",
  timeoutMs: 5,

  beforeExec(url: string, groups: Record<string, string | undefined>): GuardResult {
    const warnings: string[] = [];
    let blocked: string | undefined;
    log("19ef78f1", url, blocked ? "blocked" : "allowed", undefined, blocked || warnings.join("; "));
    return { allowed: !blocked, blocked, warnings };
  },

  afterExec(result: URLPatternResult | null, execTimeNs: number): void {
    const execMs = execTimeNs / 1e6;
    if (execMs > 5) {
      console.warn(`[19ef78f1] Slow exec: ${execMs.toFixed(2)}ms (limit: 5ms)`);
    }
    if (result) log("19ef78f1", "", "allowed", execTimeNs);
  },

  onError(error: Error, url: string): ErrorResult {
    log("19ef78f1", url, "error", undefined, error.message);
    return {
      error: error.message,
      url,
      timestamp: Date.now(),
      recoverable: !error.message.includes("timeout") && !error.message.includes("abort"),
    };
  },
};

export const _static_file_ext_Guard: PatternGuard = {
  pattern: `/static/:file.:ext`,
  hash: "af4521f1",
  riskLevel: "low",
  timeoutMs: 5,

  beforeExec(url: string, groups: Record<string, string | undefined>): GuardResult {
    const warnings: string[] = [];
    let blocked: string | undefined;
    log("af4521f1", url, blocked ? "blocked" : "allowed", undefined, blocked || warnings.join("; "));
    return { allowed: !blocked, blocked, warnings };
  },

  afterExec(result: URLPatternResult | null, execTimeNs: number): void {
    const execMs = execTimeNs / 1e6;
    if (execMs > 5) {
      console.warn(`[af4521f1] Slow exec: ${execMs.toFixed(2)}ms (limit: 5ms)`);
    }
    if (result) log("af4521f1", "", "allowed", execTimeNs);
  },

  onError(error: Error, url: string): ErrorResult {
    log("af4521f1", url, "error", undefined, error.message);
    return {
      error: error.message,
      url,
      timestamp: Date.now(),
      recoverable: !error.message.includes("timeout") && !error.message.includes("abort"),
    };
  },
};

export const _webhook_WEBHOOK_SECRET_Guard: PatternGuard = {
  pattern: `/webhook/${WEBHOOK_SECRET}/*`,
  hash: "61415e4c",
  riskLevel: "medium",
  timeoutMs: 5,

  beforeExec(url: string, groups: Record<string, string | undefined>): GuardResult {
    const warnings: string[] = [];
    let blocked: string | undefined;
    // Env vars: WEBHOOK_SECRET
    for (const v of ["WEBHOOK_SECRET"]) {
      const val = process.env[v];
      if (val && /[\x00-\x1f$`|;&]/.test(val)) blocked = `Unsafe env var: ${v}`;
    }
    log("61415e4c", url, blocked ? "blocked" : "allowed", undefined, blocked || warnings.join("; "));
    return { allowed: !blocked, blocked, warnings };
  },

  afterExec(result: URLPatternResult | null, execTimeNs: number): void {
    const execMs = execTimeNs / 1e6;
    if (execMs > 5) {
      console.warn(`[61415e4c] Slow exec: ${execMs.toFixed(2)}ms (limit: 5ms)`);
    }
    if (result) log("61415e4c", "", "allowed", execTimeNs);
  },

  onError(error: Error, url: string): ErrorResult {
    log("61415e4c", url, "error", undefined, error.message);
    return {
      error: error.message,
      url,
      timestamp: Date.now(),
      recoverable: !error.message.includes("timeout") && !error.message.includes("abort"),
    };
  },
};

export const _localhost_debug_Guard: PatternGuard = {
  pattern: `/localhost/debug`,
  hash: "d5837d21",
  riskLevel: "medium",
  timeoutMs: 5,

  beforeExec(url: string, groups: Record<string, string | undefined>): GuardResult {
    const warnings: string[] = [];
    let blocked: string | undefined;
    const host = extractHost(url);
    if (host && isBlockedHost(host)) blocked = "SSRF: blocked host";
    log("d5837d21", url, blocked ? "blocked" : "allowed", undefined, blocked || warnings.join("; "));
    return { allowed: !blocked, blocked, warnings };
  },

  afterExec(result: URLPatternResult | null, execTimeNs: number): void {
    const execMs = execTimeNs / 1e6;
    if (execMs > 5) {
      console.warn(`[d5837d21] Slow exec: ${execMs.toFixed(2)}ms (limit: 5ms)`);
    }
    if (result) log("d5837d21", "", "allowed", execTimeNs);
  },

  onError(error: Error, url: string): ErrorResult {
    log("d5837d21", url, "error", undefined, error.message);
    return {
      error: error.message,
      url,
      timestamp: Date.now(),
      recoverable: !error.message.includes("timeout") && !error.message.includes("abort"),
    };
  },
};

export const _api_127_0_0_1_admin_Guard: PatternGuard = {
  pattern: `/api/127.0.0.1/admin`,
  hash: "2e29c809",
  riskLevel: "medium",
  timeoutMs: 5,

  beforeExec(url: string, groups: Record<string, string | undefined>): GuardResult {
    const warnings: string[] = [];
    let blocked: string | undefined;
    const host = extractHost(url);
    if (host && isBlockedHost(host)) blocked = "SSRF: blocked host";
    log("2e29c809", url, blocked ? "blocked" : "allowed", undefined, blocked || warnings.join("; "));
    return { allowed: !blocked, blocked, warnings };
  },

  afterExec(result: URLPatternResult | null, execTimeNs: number): void {
    const execMs = execTimeNs / 1e6;
    if (execMs > 5) {
      console.warn(`[2e29c809] Slow exec: ${execMs.toFixed(2)}ms (limit: 5ms)`);
    }
    if (result) log("2e29c809", "", "allowed", execTimeNs);
  },

  onError(error: Error, url: string): ErrorResult {
    log("2e29c809", url, "error", undefined, error.message);
    return {
      error: error.message,
      url,
      timestamp: Date.now(),
      recoverable: !error.message.includes("timeout") && !error.message.includes("abort"),
    };
  },
};

export const _files_FILE_PATH_Guard: PatternGuard = {
  pattern: `/files/${FILE_PATH}`,
  hash: "7d4f5d6c",
  riskLevel: "medium",
  timeoutMs: 5,

  beforeExec(url: string, groups: Record<string, string | undefined>): GuardResult {
    const warnings: string[] = [];
    let blocked: string | undefined;
    // Env vars: FILE_PATH
    for (const v of ["FILE_PATH"]) {
      const val = process.env[v];
      if (val && /[\x00-\x1f$`|;&]/.test(val)) blocked = `Unsafe env var: ${v}`;
    }
    log("7d4f5d6c", url, blocked ? "blocked" : "allowed", undefined, blocked || warnings.join("; "));
    return { allowed: !blocked, blocked, warnings };
  },

  afterExec(result: URLPatternResult | null, execTimeNs: number): void {
    const execMs = execTimeNs / 1e6;
    if (execMs > 5) {
      console.warn(`[7d4f5d6c] Slow exec: ${execMs.toFixed(2)}ms (limit: 5ms)`);
    }
    if (result) log("7d4f5d6c", "", "allowed", execTimeNs);
  },

  onError(error: Error, url: string): ErrorResult {
    log("7d4f5d6c", url, "error", undefined, error.message);
    return {
      error: error.message,
      url,
      timestamp: Date.now(),
      recoverable: !error.message.includes("timeout") && !error.message.includes("abort"),
    };
  },
};

export const _blog_year_d_4_month_d_2_slug_Guard: PatternGuard = {
  pattern: `/blog/:year(\\d{4})/:month(\\d{2})/:slug`,
  hash: "b2a56352",
  riskLevel: "low",
  timeoutMs: 5,

  beforeExec(url: string, groups: Record<string, string | undefined>): GuardResult {
    const warnings: string[] = [];
    let blocked: string | undefined;
    log("b2a56352", url, blocked ? "blocked" : "allowed", undefined, blocked || warnings.join("; "));
    return { allowed: !blocked, blocked, warnings };
  },

  afterExec(result: URLPatternResult | null, execTimeNs: number): void {
    const execMs = execTimeNs / 1e6;
    if (execMs > 5) {
      console.warn(`[b2a56352] Slow exec: ${execMs.toFixed(2)}ms (limit: 5ms)`);
    }
    if (result) log("b2a56352", "", "allowed", execTimeNs);
  },

  onError(error: Error, url: string): ErrorResult {
    log("b2a56352", url, "error", undefined, error.message);
    return {
      error: error.message,
      url,
      timestamp: Date.now(),
      recoverable: !error.message.includes("timeout") && !error.message.includes("abort"),
    };
  },
};

export const _assets_Guard: PatternGuard = {
  pattern: `/assets/*`,
  hash: "dda9a464",
  riskLevel: "low",
  timeoutMs: 5,

  beforeExec(url: string, groups: Record<string, string | undefined>): GuardResult {
    const warnings: string[] = [];
    let blocked: string | undefined;
    log("dda9a464", url, blocked ? "blocked" : "allowed", undefined, blocked || warnings.join("; "));
    return { allowed: !blocked, blocked, warnings };
  },

  afterExec(result: URLPatternResult | null, execTimeNs: number): void {
    const execMs = execTimeNs / 1e6;
    if (execMs > 5) {
      console.warn(`[dda9a464] Slow exec: ${execMs.toFixed(2)}ms (limit: 5ms)`);
    }
    if (result) log("dda9a464", "", "allowed", execTimeNs);
  },

  onError(error: Error, url: string): ErrorResult {
    log("dda9a464", url, "error", undefined, error.message);
    return {
      error: error.message,
      url,
      timestamp: Date.now(),
      recoverable: !error.message.includes("timeout") && !error.message.includes("abort"),
    };
  },
};

export const _api_v1_health_Guard: PatternGuard = {
  pattern: `/api/v1/health`,
  hash: "a498e55f",
  riskLevel: "low",
  timeoutMs: 5,

  beforeExec(url: string, groups: Record<string, string | undefined>): GuardResult {
    const warnings: string[] = [];
    let blocked: string | undefined;
    log("a498e55f", url, blocked ? "blocked" : "allowed", undefined, blocked || warnings.join("; "));
    return { allowed: !blocked, blocked, warnings };
  },

  afterExec(result: URLPatternResult | null, execTimeNs: number): void {
    const execMs = execTimeNs / 1e6;
    if (execMs > 5) {
      console.warn(`[a498e55f] Slow exec: ${execMs.toFixed(2)}ms (limit: 5ms)`);
    }
    if (result) log("a498e55f", "", "allowed", execTimeNs);
  },

  onError(error: Error, url: string): ErrorResult {
    log("a498e55f", url, "error", undefined, error.message);
    return {
      error: error.message,
      url,
      timestamp: Date.now(),
      recoverable: !error.message.includes("timeout") && !error.message.includes("abort"),
    };
  },
};

export const _docs_section_page_Guard: PatternGuard = {
  pattern: `/docs/:section/:page?`,
  hash: "21b9f9ff",
  riskLevel: "low",
  timeoutMs: 5,

  beforeExec(url: string, groups: Record<string, string | undefined>): GuardResult {
    const warnings: string[] = [];
    let blocked: string | undefined;
    log("21b9f9ff", url, blocked ? "blocked" : "allowed", undefined, blocked || warnings.join("; "));
    return { allowed: !blocked, blocked, warnings };
  },

  afterExec(result: URLPatternResult | null, execTimeNs: number): void {
    const execMs = execTimeNs / 1e6;
    if (execMs > 5) {
      console.warn(`[21b9f9ff] Slow exec: ${execMs.toFixed(2)}ms (limit: 5ms)`);
    }
    if (result) log("21b9f9ff", "", "allowed", execTimeNs);
  },

  onError(error: Error, url: string): ErrorResult {
    log("21b9f9ff", url, "error", undefined, error.message);
    return {
      error: error.message,
      url,
      timestamp: Date.now(),
      recoverable: !error.message.includes("timeout") && !error.message.includes("abort"),
    };
  },
};

// All guards indexed by hash
export const guards: Record<string, PatternGuard> = {
  "0c4bdfeb": _api_v1_users_id_Guard,
  "d603fa50": _api_files_path_Guard,
  "84f1b1d3": _redirect_url_TARGET_Guard,
  "5b521203": _api_etc_passwd_Guard,
  "9c7dc231": _proxy_url_Guard,
  "a730bd8b": _internal_metadata_google_inter_Guard,
  "bf1b6525": _https_example_com_callback_Guard,
  "50eacd91": _search_q_query_Guard,
  "989544e2": _auth_callback_next_REDIRECT_UR_Guard,
  "19ef78f1": _api_v2_items_id_d_Guard,
  "af4521f1": _static_file_ext_Guard,
  "61415e4c": _webhook_WEBHOOK_SECRET_Guard,
  "d5837d21": _localhost_debug_Guard,
  "2e29c809": _api_127_0_0_1_admin_Guard,
  "7d4f5d6c": _files_FILE_PATH_Guard,
  "b2a56352": _blog_year_d_4_month_d_2_slug_Guard,
  "dda9a464": _assets_Guard,
  "a498e55f": _api_v1_health_Guard,
  "21b9f9ff": _docs_section_page_Guard,
};

// Helper: wrap pattern.exec with full guard lifecycle
export function safeExec(
  pattern: URLPattern,
  url: string,
  guard: PatternGuard
): URLPatternResult | null {
  const start = typeof Bun !== "undefined" ? Bun.nanoseconds() : performance.now() * 1e6;

  // Pre-check
  const preCheck = guard.beforeExec(url, {});
  if (!preCheck.allowed) {
    throw new Error(preCheck.blocked || "Blocked by guard");
  }

  // Execute
  const result = pattern.exec(url);

  // Post-check
  const elapsed = (typeof Bun !== "undefined" ? Bun.nanoseconds() : performance.now() * 1e6) - start;
  guard.afterExec(result, elapsed);

  return result;
}

// Stats
export const stats = {
  total: 19,
  high: 0,
  medium: 10,
  low: 9,
  generated: "2026-01-22T14:25:21.563Z",
};
