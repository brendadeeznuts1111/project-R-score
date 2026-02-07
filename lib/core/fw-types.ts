// lib/core/fw-types.ts — FactoryWager project-specific type definitions

// FactoryWager specific types
export type Severity = 'success' | 'warning' | 'error' | 'muted';
export type ProfileType = 'cpu' | 'heap' | 'sampling' | 'diagnostic' | 'custom';
export type ColorFormat = 'hex' | 'rgb' | 'hsl' | 'ansi256' | 'number';

// Project categories
export type ProjectCategory =
  | 'games'
  | 'automation'
  | 'analysis'
  | 'utilities'
  | 'enterprise'
  | 'apps'
  | 'dashboards'
  | 'development'
  | 'experimental'
  | 'experiments'
  | 'tools';

// R2 metadata types
export interface R2Metadata {
  'factorywager:version': string;
  'profile:type': ProfileType;
  'profile:timestamp': string;
  'profile:severity': Severity;
  'visual:theme': string;
  'visual:color-hex': string;
  'visual:color-rgb': string;
  'visual:color-hsl': string;
  'visual:ansi-sample': string;
  'system:compression': string;
  'system:compression-ratio': string;
  'system:runtime': string;
  'audit:git-commit'?: string;
  'audit:ci-run'?: string;
}

// Performance metrics (project-specific shape with severity levels)
export interface PerformanceMetrics {
  cpu: {
    usage: number;
    threshold: number;
    severity: Severity;
  };
  memory: {
    usage: number;
    threshold: number;
    severity: Severity;
  };
  network: {
    latency: number;
    threshold: number;
    severity: Severity;
  };
}

// Project configuration
export interface ProjectConfig {
  name: string;
  category: ProjectCategory;
  description: string;
  version: string;
  dependencies?: string[];
  scripts?: Record<string, string>;
}

// FactoryWager theme configuration
export interface ThemeConfig {
  colors: Record<string, string>;
  severity: Record<Severity, string>;
  animations: {
    enabled: boolean;
    speed: number;
  };
}

// ==================== Profile Naming Helpers ====================
// @see https://github.com/oven-sh/bun/pull/24112 — --cpu-prof + filename format (CPU.{ts}.{pid}.md)
// @see https://github.com/oven-sh/bun/pull/26327 — --cpu-prof-md (markdown output)
// @see https://github.com/oven-sh/bun/pull/26326 — --heap-prof-md (markdown output)

/** Filesystem-safe ISO timestamp: 2026-02-06T12-34-56-789Z */
export function profileTimestamp(date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, '-');
}

/** Canonical R2 key for a profile file */
export function profileR2Key(sessionId: string, type: ProfileType, filename: string, prefix = 'profiles'): string {
  return `${prefix}/sessions/${sessionId}/${type}/${filename}`;
}

/** Canonical R2 key for a session manifest */
export function manifestR2Key(sessionId: string, prefix = 'profiles'): string {
  return `${prefix}/sessions/${sessionId}/manifest.json`;
}

/** Generate a canonical session ID */
export function generateSessionId(): string {
  return Bun.env.TERMINAL_SESSION_ID
    || Bun.env.TERM_SESSION_ID
    || `pty-${process.pid}-${profileTimestamp()}`;
}
