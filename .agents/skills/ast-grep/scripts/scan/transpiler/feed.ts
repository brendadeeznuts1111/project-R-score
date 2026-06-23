import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SemverMatcher } from "./semver-matcher.ts";
import type { Severity } from "./types.ts";

export type ThreatEntry = {
  id: string;
  package: string;
  versionRange: string;
  severity: Severity;
  message: string;
  cve?: string;
  safeRange?: string;
  symbols?: string[];
};

export type ThreatMatch = ThreatEntry & {
  matchedVersion: string;
};

type RawAdvisory = {
  id?: string;
  package: string;
  versionRange?: string;
  range?: string;
  severity: Severity;
  message: string;
  cve?: string;
  safeRange?: string;
  symbols?: string[];
};

export class FeedParser {
  private cache: ThreatEntry[] | null = null;

  constructor(private readonly skillRoot: string) {}

  async loadThreats(): Promise<ThreatEntry[]> {
    if (this.cache) return this.cache;
    const path = join(this.skillRoot, "threat-feed.json");
    const raw = JSON.parse(await readFile(path, "utf8")) as {
      advisories?: RawAdvisory[];
    };
    this.cache = (raw.advisories ?? []).map((row) => ({
      id: row.id ?? `${row.package}-${row.cve ?? "advisory"}`,
      package: row.package,
      versionRange: row.versionRange ?? row.range ?? "",
      severity: row.severity,
      message: row.message,
      cve: row.cve,
      safeRange: row.safeRange,
      symbols: row.symbols,
    })).filter((t) => t.versionRange.length > 0);
    return this.cache;
  }

  async matchThreats(packageName: string, version: string): Promise<ThreatMatch[]> {
    const threats = await this.loadThreats();
    return threats
      .filter(
        (t) =>
          t.package === packageName
          && SemverMatcher.satisfies(version, t.versionRange),
      )
      .map((t) => ({ ...t, matchedVersion: version }));
  }

  async matchAllPackages(
    packages: Record<string, string>,
  ): Promise<ThreatMatch[]> {
    const out: ThreatMatch[] = [];
    for (const [name, version] of Object.entries(packages)) {
      out.push(...(await this.matchThreats(name, version)));
    }
    return out;
  }
}