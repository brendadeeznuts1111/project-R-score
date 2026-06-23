import { join } from "node:path";
import type { WorkflowEffects } from "../workflow-loop.ts";
import type { EffectConfig } from "./plugin.ts";

export function defaultWorkflowReportPath(skillRoot: string, domainId: string): string {
  return join(skillRoot, "reports", `${domainId}-workflow.md`);
}

/** Map legacy CLI flags (--fix, --alert-url, etc.) to registry configs. */
export function legacyEffectsToConfigs(
  effects: WorkflowEffects | undefined,
  skillRoot: string,
  domainId: string,
): Record<string, EffectConfig> {
  const e = effects ?? {};
  const out: Record<string, EffectConfig> = {
    log: { enabled: e.log !== false },
    alert: { enabled: false, params: {} },
    fix: { enabled: e.fix === true },
    report: { enabled: false, params: {} },
  };
  if (e.alert) {
    out.alert = { enabled: true, params: { url: e.alert } };
  }
  if (e.report) {
    const path = typeof e.report === "string"
      ? e.report
      : defaultWorkflowReportPath(skillRoot, domainId);
    out.report = { enabled: true, params: { path } };
  }
  return out;
}

/**
 * Parse repeated --effect flags:
 *   --effect alert.url=https://hooks.slack.com/...
 *   --effect log.enabled=false
 *   --effect fix
 */
export function parseEffectFlags(flags: string[]): Record<string, EffectConfig> {
  const partial = new Map<string, { enabled?: boolean; params: Record<string, unknown> }>();

  for (const raw of flags) {
    const eq = raw.indexOf("=");
    if (eq === -1) {
      const id = raw.split(".")[0] ?? raw;
      const entry = partial.get(id) ?? { params: {} };
      if (raw === id) entry.enabled = true;
      partial.set(id, entry);
      continue;
    }

    const key = raw.slice(0, eq);
    const value = raw.slice(eq + 1);
    const dot = key.indexOf(".");
    const id = dot === -1 ? key : key.slice(0, dot);
    const paramKey = dot === -1 ? "" : key.slice(dot + 1);
    const entry = partial.get(id) ?? { params: {} };

    if (paramKey === "enabled") {
      entry.enabled = value === "true";
    } else if (paramKey) {
      entry.params[paramKey] = value;
    } else {
      entry.enabled = value === "true";
    }
    partial.set(id, entry);
  }

  const out: Record<string, EffectConfig> = {};
  for (const [id, entry] of partial) {
    out[id] = {
      enabled: entry.enabled ?? true,
      params: Object.keys(entry.params).length ? entry.params : undefined,
    };
  }
  return out;
}

export function mergeEffectConfigs(
  ...layers: Array<Record<string, EffectConfig> | undefined>
): Record<string, EffectConfig> {
  const merged: Record<string, EffectConfig> = {};
  for (const layer of layers) {
    if (!layer) continue;
    for (const [id, cfg] of Object.entries(layer)) {
      const prev = merged[id];
      merged[id] = {
        enabled: cfg.enabled,
        params: { ...prev?.params, ...cfg.params },
      };
    }
  }
  return merged;
}