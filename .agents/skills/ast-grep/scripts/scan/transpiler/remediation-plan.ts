import { dirname } from "node:path";
import type { ScanResult, ViolationKind } from "./types.ts";
import { SEVERITY_RANK, normalizeSeverity } from "./rule-engine.ts";
import {
  suggestRemediation,
  applyPackageFix,
  applyPackageRemove,
  type RemediationHint,
} from "./remediation.ts";

export type RemediationAction = "upgrade" | "remove";

export type RemediationPlanItem = {
  package: string;
  currentVersion: string;
  action: RemediationAction;
  priority: number;
  kinds: ViolationKind[];
  severity: string;
  safeRange?: string;
  suggestedVersion: string | null;
  command: string;
  reason: string;
  ruleIds: string[];
  cves: string[];
};

export type RemediationReport = {
  totalFindings: number;
  actionable: number;
  upgrades: number;
  removals: number;
  commands: string[];
  items: RemediationPlanItem[];
};

const KIND_PRIORITY: Record<ViolationKind, number> = {
  blocked: 4,
  threat: 3,
  semver_rule: 2,
  allowed: 1,
};

function itemPriority(kinds: ViolationKind[], severity: string): number {
  const kindScore = Math.max(...kinds.map((k) => KIND_PRIORITY[k] ?? 0));
  const sevScore = SEVERITY_RANK[normalizeSeverity(severity as never)] ?? 0;
  return kindScore * 10 + sevScore;
}

export async function buildRemediationPlan(options: {
  repo: string;
  findings: ScanResult[];
}): Promise<RemediationReport> {
  const depFindings = options.findings.filter((f) => f.layer === "deps");
  const byPkg = new Map<string, ScanResult[]>();
  for (const f of depFindings) {
    const list = byPkg.get(f.file) ?? [];
    list.push(f);
    byPkg.set(f.file, list);
  }

  const items: RemediationPlanItem[] = [];

  for (const [pkg, rows] of byPkg) {
    const kinds = [...new Set(rows.flatMap((r) => r.kinds ?? (r.violationKind ? [r.violationKind] : [])))];
    const primary = rows.reduce((best, cur) => {
      const bp = itemPriority(
        best.kinds ?? (best.violationKind ? [best.violationKind] : []),
        best.severity,
      );
      const cp = itemPriority(
        cur.kinds ?? (cur.violationKind ? [cur.violationKind] : []),
        cur.severity,
      );
      return cp > bp ? cur : best;
    });
    const version = primary.packageVersion ?? "0.0.0";

    const hint = await suggestRemediation({
      repo: options.repo,
      package: pkg,
      currentVersion: version,
      kinds,
      safeRange: primary.remediation?.safeRange,
      vulnRange: primary.detail?.match(/range\s+(\S+)/)?.[1],
      safeRanges: rows
        .map((r) => r.remediation?.safeRange)
        .filter((r): r is string => Boolean(r)),
    });

    if (!hint) continue;

    items.push({
      package: pkg,
      currentVersion: hint.currentVersion,
      action: hint.action,
      priority: itemPriority(kinds, primary.severity),
      kinds,
      severity: primary.severity,
      safeRange: hint.safeRange,
      suggestedVersion: hint.suggestedVersion,
      command: hint.command,
      reason: hint.reason,
      ruleIds: [...new Set(rows.map((r) => r.ruleId))],
      cves: [...new Set(rows.map((r) => r.cve).filter((c): c is string => Boolean(c)))],
    });
  }

  items.sort((a, b) => b.priority - a.priority);
  const commands = [...new Set(items.map((i) => i.command))];

  return {
    totalFindings: depFindings.length,
    actionable: items.length,
    upgrades: items.filter((i) => i.action === "upgrade").length,
    removals: items.filter((i) => i.action === "remove").length,
    commands,
    items,
  };
}

export async function applyRemediationPlan(options: {
  plan: RemediationReport;
  packageJsonPath: string;
  dryRun?: boolean;
}): Promise<{ ok: boolean; applied: string[]; failed: string[] }> {
  const applied: string[] = [];
  const failed: string[] = [];

  for (const item of options.plan.items) {
    if (item.action === "remove") {
      const result = await applyPackageRemove({
        packageJsonPath: options.packageJsonPath,
        package: item.package,
        dryRun: options.dryRun,
      });
      if (result.ok) applied.push(result.command);
      else failed.push(result.command);
      continue;
    }
    if (!item.suggestedVersion) {
      failed.push(item.command);
      continue;
    }
    const result = await applyPackageFix({
      packageJsonPath: options.packageJsonPath,
      package: item.package,
      version: item.suggestedVersion,
      dryRun: options.dryRun,
    });
    if (result.ok) applied.push(result.command);
    else failed.push(result.command);
  }

  return { ok: failed.length === 0, applied, failed };
}

export function remediationFromHint(hint: RemediationHint | null | undefined) {
  if (!hint) return undefined;
  return {
    action: hint.action,
    safeRange: hint.safeRange,
    suggestedVersion: hint.suggestedVersion,
    latestInLockfile: hint.latestInLockfile,
    command: hint.command,
    reason: hint.reason,
  };
}