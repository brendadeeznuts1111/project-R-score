import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { ScanResult } from "./types.ts";
import { resolveTargetDependencies } from "./dependency-resolver.ts";
import { buildRemediationPlan, applyRemediationPlan } from "./remediation-plan.ts";

export type AutofixRule = {
  id: string;
  description: string;
  pattern: string;
  replacement: string;
  replacementError?: string;
};

export type SourceFixResult = {
  file: string;
  ruleId: string;
  applied: boolean;
  dryRun: boolean;
  before?: string;
  after?: string;
};

export type BundleFixReport = {
  source: SourceFixResult[];
  packages: string[];
  dryRun: boolean;
};

export async function loadAutofixRules(skillRoot: string): Promise<AutofixRule[]> {
  const path = join(skillRoot, "autofix-rules.json");
  const raw = JSON.parse(await readFile(path, "utf8")) as { rules?: AutofixRule[] };
  return raw.rules ?? [];
}

function envNameFromMatch(match: string): string {
  const key = match.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase().replace(/_+/g, "_");
  return key || "SECRET";
}

export function applyRuleToSource(
  source: string,
  rule: AutofixRule,
  ruleIds: Set<string>,
): { next: string; changed: boolean } {
  if (!ruleIds.has(rule.id)) return { next: source, changed: false };
  const re = new RegExp(rule.pattern, "gmu");
  let changed = false;

  if (rule.id === "hardcoded-secret") {
    const next = source.replace(
      new RegExp(rule.pattern, "gmu"),
      (_full, prefix: string, name: string) => {
        changed = true;
        const env = envNameFromMatch(name);
        return `${prefix}process.env.${env} ?? ''`;
      },
    );
    return { next, changed };
  }

  const next = source.replace(re, () => {
    changed = true;
    return rule.replacement;
  });
  return { next, changed };
}

export async function applySourceFixes(options: {
  repo: string;
  findings: ScanResult[];
  skillRoot: string;
  dryRun?: boolean;
}): Promise<SourceFixResult[]> {
  const { repo, findings, skillRoot, dryRun = false } = options;
  const rules = await loadAutofixRules(skillRoot);
  const byFile = new Map<string, Set<string>>();

  for (const f of findings) {
    if (f.layer === "deps" || f.layer === "integrity") continue;
    const fixable = rules.some((r) => r.id === f.ruleId);
    if (!fixable) continue;
    const full = resolve(repo, f.file);
    const ids = byFile.get(full) ?? new Set<string>();
    ids.add(f.ruleId);
    byFile.set(full, ids);
  }

  const results: SourceFixResult[] = [];
  for (const [fullPath, ruleIds] of byFile) {
    let source: string;
    try {
      source = await readFile(fullPath, "utf8");
    } catch {
      continue;
    }
    let next = source;
    let any = false;
    for (const rule of rules) {
      const applied = applyRuleToSource(next, rule, ruleIds);
      if (applied.changed) {
        any = true;
        next = applied.next;
      }
    }
    if (!any) continue;

    if (!dryRun) await writeFile(fullPath, next, "utf8");
    for (const rid of ruleIds) {
      results.push({
        file: fullPath.startsWith(repo) ? fullPath.slice(repo.length + 1) : fullPath,
        ruleId: rid,
        applied: !dryRun,
        dryRun,
      });
    }
  }
  return results;
}

export async function applyBundleFixes(options: {
  skillRoot: string;
  repo: string;
  findings: ScanResult[];
  targetPath?: string;
  dryRun?: boolean;
}): Promise<BundleFixReport> {
  const source = await applySourceFixes({
    repo: options.repo,
    findings: options.findings,
    skillRoot: options.skillRoot,
    dryRun: options.dryRun,
  });

  const hasDepViolation = options.findings.some((f) => f.layer === "deps");
  const packages: string[] = [];
  if (hasDepViolation) {
    const plan = await buildRemediationPlan({
      repo: options.repo,
      findings: options.findings,
    });
    if (plan.items.length) {
      const { packageJson } = await resolveTargetDependencies({
        repo: options.repo,
        targetPath: options.targetPath ?? ".",
        includeDev: false,
      });
      if (packageJson) {
        const applied = await applyRemediationPlan({
          plan,
          packageJsonPath: packageJson,
          dryRun: options.dryRun,
        });
        packages.push(...applied.applied);
      }
    }
  }

  return { source, packages, dryRun: Boolean(options.dryRun) };
}