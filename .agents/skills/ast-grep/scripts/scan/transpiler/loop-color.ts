import { ColorMatcher } from "./color-matcher.ts";
import { colorize, supportsColor } from "./terminal-color.ts";
import type { HealthReport } from "./endpoint-catalog.ts";
import type { NetworkBaselineDelta } from "./network-baseline.ts";

const RESET = "\x1b[0m";

/** Domain-scoped palette for live loop dashboard lines */
export const LOOP_DOMAIN_COLORS = {
  loop: "#94a3b8",
  network: "#38bdf8",
  endpoints: "#a78bfa",
  health: "#22c55e",
  health_degraded: "#eab308",
  health_unreachable: "#ef4444",
  perf: "#06b6d4",
  delta: "#f97316",
  stable: "#22c55e",
  secret: "#c084fc",
  muted: "#64748b",
  skill: "#e879f9",
  test: "#34d399",
  bench: "#fbbf24",
  rate: "#fb7185",
  grade_a: "#22c55e",
  grade_f: "#ef4444",
} as const;

export type LoopColorOptions = {
  enabled?: boolean;
  depth?: "ansi" | "ansi-16m";
};

function paint(text: string, css: string, opts: LoopColorOptions): string {
  if (opts.enabled === false || !supportsColor()) return text;
  return colorize(text, css, opts.depth ?? "ansi");
}

function healthColor(overall?: HealthReport["overall"]): string {
  if (overall === "healthy") return LOOP_DOMAIN_COLORS.health;
  if (overall === "degraded") return LOOP_DOMAIN_COLORS.health_degraded;
  if (overall === "unreachable") return LOOP_DOMAIN_COLORS.health_unreachable;
  return LOOP_DOMAIN_COLORS.muted;
}

function deltaHealthColor(status?: NetworkBaselineDelta["health_status"]): string {
  if (status === "stable") return LOOP_DOMAIN_COLORS.stable;
  if (status === "changed" || status === "degraded") return LOOP_DOMAIN_COLORS.health_degraded;
  return LOOP_DOMAIN_COLORS.muted;
}

export function formatColoredKv(
  key: string,
  value: string,
  css: string,
  opts: LoopColorOptions,
): string {
  return `${paint(`${key}=`, css, opts)}${paint(value, css, opts)}`;
}

export function formatColoredLoopStatus(input: {
  reason: string;
  detail?: string;
  networkUnique?: number;
  networkRaw?: number;
  endpoints?: number;
  healthRoutes?: number;
  health?: HealthReport;
  delta?: NetworkBaselineDelta;
  secretChannel?: string;
  opts?: LoopColorOptions;
}): string {
  const o = input.opts ?? { enabled: true };
  const head = input.detail && input.reason === "watch"
    ? `[loop] watch (${input.detail})`
    : `[loop] ${input.reason}`;
  const parts = [paint(head, LOOP_DOMAIN_COLORS.loop, o)];

  if (input.delta) {
    const d = input.delta;
    const deltaText = `Δ endpoints +${d.endpoints_added}/-${d.endpoints_removed} Δ routes +${d.routes_added}/-${d.routes_removed}`;
    parts.push(paint(deltaText, LOOP_DOMAIN_COLORS.delta, o));
    parts.push(formatColoredKv("health", d.health_status, deltaHealthColor(d.health_status), o));
  }

  if (input.networkUnique !== undefined && input.networkRaw !== undefined) {
    parts.push(
      formatColoredKv(
        "network",
        `${input.networkUnique}unique/${input.networkRaw}raw`,
        LOOP_DOMAIN_COLORS.network,
        o,
      ),
    );
  }
  if (input.endpoints !== undefined) {
    parts.push(formatColoredKv("endpoints", String(input.endpoints), LOOP_DOMAIN_COLORS.endpoints, o));
  }
  if (input.healthRoutes !== undefined) {
    parts.push(formatColoredKv("health_routes", String(input.healthRoutes), LOOP_DOMAIN_COLORS.health, o));
  }
  if (input.health) {
    parts.push(formatColoredKv("health", input.health.overall, healthColor(input.health.overall), o));
    const ok = input.health.probes.filter((p) => p.ok).length;
    parts.push(formatColoredKv("probes", `${ok}/${input.health.probes.length}`, healthColor(input.health.overall), o));
    const latency = input.health.probes.find((p) => p.ok)?.latency_ms;
    if (latency !== undefined) {
      parts.push(formatColoredKv("latency", `${latency}ms`, LOOP_DOMAIN_COLORS.perf, o));
    }
  }
  if (input.secretChannel) {
    parts.push(paint(`[secret:${input.secretChannel}]`, LOOP_DOMAIN_COLORS.secret, o));
  }
  return parts.join(" ");
}

export function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]*m/g, "");
}

export function loopColorHex(domain: keyof typeof LOOP_DOMAIN_COLORS): string {
  return ColorMatcher.toHex(LOOP_DOMAIN_COLORS[domain]) ?? LOOP_DOMAIN_COLORS[domain];
}

export function formatColoredSkillLoopStatus(input: {
  skillId: string;
  rating: number;
  grade: string;
  phases: Array<{ phase: string; ok: boolean; rating?: number }>;
  reason?: string;
  opts?: LoopColorOptions;
}): string {
  const o = input.opts ?? { enabled: true };
  const gradeColor = input.grade === "A" || input.grade === "B"
    ? LOOP_DOMAIN_COLORS.grade_a
    : input.grade === "F"
      ? LOOP_DOMAIN_COLORS.grade_f
      : LOOP_DOMAIN_COLORS.health_degraded;
  const parts = [
    paint(`[loop] skill=${input.skillId}`, LOOP_DOMAIN_COLORS.skill, o),
    formatColoredKv("rating", `${input.rating}`, LOOP_DOMAIN_COLORS.rate, o),
    paint(`(${input.grade})`, gradeColor, o),
  ];
  for (const p of input.phases) {
    const css = p.phase === "bench"
      ? LOOP_DOMAIN_COLORS.bench
      : p.phase === "test"
        ? LOOP_DOMAIN_COLORS.test
        : p.phase === "network"
          ? LOOP_DOMAIN_COLORS.network
          : p.phase === "rate"
            ? LOOP_DOMAIN_COLORS.rate
            : LOOP_DOMAIN_COLORS.muted;
    const status = p.ok ? "ok" : "fail";
    parts.push(paint(`${p.phase}=${status}`, css, o));
  }
  if (input.reason) {
    parts.push(paint(input.reason, LOOP_DOMAIN_COLORS.muted, o));
  }
  return parts.join(" ");
}