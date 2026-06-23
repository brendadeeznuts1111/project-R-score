import { semver } from "bun";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ImportKind, ScanResult, Severity } from "./types.ts";
import type { ResolvedDependency } from "./dependency-resolver.ts";
import type { SemverRule } from "./policy-loader.ts";
import { meetsSeverity, normalizeSeverity } from "./rule-engine.ts";

/** Re-export for callers that want the native Bun semver namespace. */
export { semver };

export class SemverMatcher {
  static satisfies(version: string, range: string): boolean {
    return semver.satisfies(version, range);
  }

  static order(a: string, b: string): -1 | 0 | 1 {
    return semver.order(a, b);
  }

  static checkRule(packageName: string, version: string, rules: SemverRule[]): SemverRule | null {
    for (const rule of rules) {
      if (rule.package === packageName && this.satisfies(version, rule.range)) {
        return rule;
      }
    }
    return null;
  }

  static snapshotCompatible(snapshotVersion: string, requiredRange: string): boolean {
    return this.satisfies(snapshotVersion, requiredRange);
  }

  static filterSatisfying(versions: string[], range: string): string[] {
    return versions.filter((v) => this.satisfies(v, range));
  }

  static latestSatisfying(versions: string[], range: string): string | null {
    const satisfying = this.filterSatisfying(versions, range);
    if (satisfying.length === 0) return null;
    return satisfying.sort(this.order).pop() ?? null;
  }
}

export type ThreatAdvisory = {
  id: string;
  package: string;
  range: string;
  versionRange?: string;
  safeRange?: string;
  severity: Severity;
  message: string;
  cve?: string;
  symbols?: string[];
};

export type ThreatFeed = {
  version: number;
  description?: string;
  advisories: ThreatAdvisory[];
};

export const SEMVER_DOCS =
  "https://bun.com/docs/runtime/semver#bun-semver-satisfies-version-string-range-string--boolean";

export async function loadThreatFeed(skillRoot: string): Promise<ThreatFeed> {
  const path = join(skillRoot, "threat-feed.json");
  const raw = JSON.parse(await readFile(path, "utf8")) as ThreatFeed;
  raw.advisories = (raw.advisories ?? []).map((a) => ({
    ...a,
    range: a.versionRange ?? a.range,
  }));
  return raw;
}

/**
 * True when `version` falls in vulnerable `range`.
 * `semver.satisfies(version, range)` — node-semver compatible.
 * Invalid version or range → false per Bun docs.
 * @see {@link SEMVER_DOCS}
 */
export function isVulnerable(version: string, range: string): boolean {
  return SemverMatcher.satisfies(version, range);
}

export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  return SemverMatcher.order(a, b);
}

export function sortVersions(versions: string[]): string[] {
  return [...versions].sort(SemverMatcher.order);
}

export function matchPolicySemverRules(
  deps: ResolvedDependency[],
  rules: SemverRule[],
  minSeverity: Severity,
): ScanResult[] {
  const out: ScanResult[] = [];
  for (const dep of deps) {
    const rule = SemverMatcher.checkRule(dep.name, dep.version, rules);
    if (!rule || !meetsSeverity(rule.severity, minSeverity)) continue;
    out.push({
      type: "semver",
      file: dep.name,
      line: 0,
      column: 0,
      ruleId: rule.id,
      severity: normalizeSeverity(rule.severity),
      message: `${dep.name}@${dep.version} violates policy: ${rule.description}`,
      layer: "deps",
      detail: `satisfies ${rule.range} [${dep.source}]`,
    });
  }
  return out;
}

export function matchDependencies(
  deps: ResolvedDependency[],
  feed: ThreatFeed,
  minSeverity: Severity,
): ScanResult[] {
  const out: ScanResult[] = [];
  for (const dep of deps) {
    for (const adv of feed.advisories) {
      if (adv.package !== dep.name) continue;
      if (!isVulnerable(dep.version, adv.range)) continue;
      if (!meetsSeverity(adv.severity, minSeverity)) continue;
      const cve = adv.cve ? ` (${adv.cve})` : "";
      out.push({
        type: "transpiler",
        file: dep.name,
        line: 0,
        column: 0,
        ruleId: adv.id,
        severity: normalizeSeverity(adv.severity),
        message: `${adv.message}${cve}`,
        layer: "deps",
        detail: `${dep.name}@${dep.version} satisfies ${adv.range} [${dep.source}]`,
      });
    }
  }
  return out;
}

function importPackageName(importPath: string): string | null {
  if (importPath.startsWith(".") || importPath.startsWith("/")) return null;
  if (importPath.startsWith("node:")) return null;
  if (/^https?:\/\//.test(importPath)) return null;
  if (importPath.startsWith("@")) {
    const slash = importPath.indexOf("/");
    return slash > 0 ? importPath.slice(0, slash) : importPath;
  }
  const slash = importPath.indexOf("/");
  return slash > 0 ? importPath.slice(0, slash) : importPath;
}

export function correlateImportSymbols(options: {
  relFile: string;
  source: string;
  imports: Array<{ path: string; kind: ImportKind }>;
  deps: ResolvedDependency[];
  feed: ThreatFeed;
  minSeverity: Severity;
}): ScanResult[] {
  const { relFile, source, imports, deps, feed, minSeverity } = options;
  const vulnByPackage = new Map<string, ThreatAdvisory[]>();

  for (const dep of deps) {
    for (const adv of feed.advisories) {
      if (adv.package !== dep.name || !adv.symbols?.length) continue;
      if (!isVulnerable(dep.version, adv.range)) continue;
      const rows = vulnByPackage.get(dep.name) ?? [];
      rows.push(adv);
      vulnByPackage.set(dep.name, rows);
    }
  }
  if (vulnByPackage.size === 0) return [];

  const imported = new Set<string>();
  for (const imp of imports) {
    const pkg = importPackageName(imp.path);
    if (pkg) imported.add(pkg);
  }

  const out: ScanResult[] = [];
  for (const pkg of imported) {
    const advisories = vulnByPackage.get(pkg);
    if (!advisories) continue;
    for (const adv of advisories) {
      if (!meetsSeverity(adv.severity, minSeverity)) continue;
      for (const symbol of adv.symbols ?? []) {
        const patterns = [
          new RegExp(String.raw`\.${symbol}\s*\(`, "m"),
          new RegExp(String.raw`\b${symbol}\s*\(`, "m"),
          new RegExp(String.raw`['"]${symbol}['"]`, "m"),
        ];
        if (!patterns.some((re) => re.test(source))) continue;
        const cve = adv.cve ? ` (${adv.cve})` : "";
        out.push({
          type: "transpiler",
          file: relFile,
          line: 1,
          column: 1,
          ruleId: `${adv.id}-symbol`,
          severity: normalizeSeverity(adv.severity),
          message: `Vulnerable ${pkg}.${symbol} usage${cve}`,
          layer: "source",
          detail: `${adv.message} — import: ${pkg}`,
        });
        break;
      }
    }
  }
  return out;
}