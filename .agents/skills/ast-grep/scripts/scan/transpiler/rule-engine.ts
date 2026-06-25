import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ImportKind, PolicyRule, RuleSet, Severity } from "./types.ts";

/** Map CSS-like astPattern strings to source regex (Bun.Transpiler has no public AST walker). */
const AST_PATTERN_MAP: Record<string, string> = {
  "CallExpression[callee.name='eval']": String.raw`\beval\s*\(`,
  "NewExpression[callee.name='Function']": String.raw`new\s+Function\s*\(`,
  "CallExpression[callee.name='setTimeout']": String.raw`setTimeout\s*\(`,
};

export const SEVERITY_RANK: Record<string, number> = {
  info: 0,
  low: 0,
  warn: 1,
  medium: 1,
  error: 2,
  high: 2,
  critical: 3,
};

export function normalizeSeverity(sev: Severity): Severity {
  if (sev === "critical" || sev === "high") return "error";
  if (sev === "medium") return "warn";
  if (sev === "low") return "info";
  return sev;
}

export function meetsSeverity(sev: Severity, min: Severity): boolean {
  const a = SEVERITY_RANK[normalizeSeverity(sev)] ?? 0;
  const b = SEVERITY_RANK[normalizeSeverity(min)] ?? 0;
  return a >= b;
}

function policyToBuckets(rules: PolicyRule[]): RuleSet {
  const import_rules: PolicyRule[] = [];
  const source_rules: PolicyRule[] = [];
  const output_rules: PolicyRule[] = [];
  const network_rules: PolicyRule[] = [];
  for (const r of rules) {
    const layer = r.layer ?? "source";
    if (layer === "import" || r.type === "import") import_rules.push(r);
    else if (layer === "network") network_rules.push(r);
    else if (layer === "output") output_rules.push(r);
    else source_rules.push(r);
  }
  return { version: 1, import_rules, source_rules, output_rules, network_rules };
}

function mergeRules(base: PolicyRule[], extra: PolicyRule[]): PolicyRule[] {
  const byId = new Map<string, PolicyRule>();
  for (const r of base) byId.set(r.id, r);
  for (const r of extra) byId.set(r.id, r);
  return [...byId.values()];
}

function jsonRuleToPolicy(row: Record<string, unknown>, layer: "import" | "source" | "output"): PolicyRule {
  return {
    id: String(row.id),
    description: String(row.message ?? row.id),
    severity: (row.severity as Severity) ?? "warn",
    type: layer === "import" ? "import" : "regex",
    layer,
    pattern: row.pattern ? String(row.pattern) : undefined,
    path_pattern: row.path_pattern ? String(row.path_pattern) : undefined,
    kind: row.kind as ImportKind | undefined,
    message: row.message ? String(row.message) : undefined,
  };
}

export async function loadJsonRules(path: string): Promise<RuleSet> {
  const raw = JSON.parse(await readFile(path, "utf8")) as {
    import_rules?: Record<string, unknown>[];
    source_rules?: Record<string, unknown>[];
    output_rules?: Record<string, unknown>[];
  };
  const rules: PolicyRule[] = [
    ...(raw.import_rules ?? []).map((r) => jsonRuleToPolicy(r, "import")),
    ...(raw.source_rules ?? []).map((r) => jsonRuleToPolicy(r, "source")),
    ...(raw.output_rules ?? []).map((r) => jsonRuleToPolicy(r, "output")),
  ];
  return policyToBuckets(rules);
}

export async function loadTomlPolicy(path: string): Promise<PolicyRule[]> {
  const text = await readFile(path, "utf8");
  const doc = Bun.TOML.parse(text) as { rule?: PolicyRule[] | PolicyRule };
  const rows = Array.isArray(doc.rule) ? doc.rule : doc.rule ? [doc.rule] : [];
  return rows.map((r) => {
    const type = (r.type ?? "regex") as PolicyRule["type"];
    let pattern = r.pattern;
    if (type === "ast" && r.astPattern) {
      pattern = AST_PATTERN_MAP[r.astPattern] ?? AST_PATTERN_MAP[String(r.astPattern)];
    }
    return {
      ...r,
      type,
      pattern,
      message: r.message ?? r.description,
      layer: (r.layer ?? "source") as PolicyRule["layer"],
    };
  });
}

export async function loadRuleSet(skillRoot: string): Promise<RuleSet> {
  const jsonPath = join(skillRoot, "bundle-threat-rules.json");
  const tomlPath = join(skillRoot, "policies/security.policy.toml");
  const jsonSet = await loadJsonRules(jsonPath);
  let tomlRules: PolicyRule[] = [];
  try {
    tomlRules = await loadTomlPolicy(tomlPath);
  } catch {
    // optional policy file
  }
  const merged = mergeRules(
    [
      ...jsonSet.import_rules,
      ...jsonSet.source_rules,
      ...jsonSet.output_rules,
      ...jsonSet.network_rules,
    ],
    tomlRules,
  );
  return policyToBuckets(merged);
}

export function filterRulesById(rules: RuleSet, ids: string[]): RuleSet {
  if (!ids.length) return rules;
  const allow = new Set(ids);
  const keep = (r: PolicyRule) => allow.has(r.id);
  return {
    version: rules.version,
    import_rules: rules.import_rules.filter(keep),
    source_rules: rules.source_rules.filter(keep),
    output_rules: rules.output_rules.filter(keep),
    network_rules: rules.network_rules.filter(keep),
  };
}

export function resolvePattern(rule: PolicyRule): string | undefined {
  if (rule.pattern) return rule.pattern;
  if (rule.astPattern) return AST_PATTERN_MAP[rule.astPattern];
  return undefined;
}