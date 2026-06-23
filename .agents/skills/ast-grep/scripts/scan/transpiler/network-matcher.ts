import type { ScanResult } from "./types.ts";

/** Networking surfaces — aligned with bun-patterns.json networking group */
export const NETWORK_DOCS = "https://bun.com/docs/runtime/networking/fetch";

export type NetworkSurface =
  | "fetch"
  | "http_client"
  | "websocket"
  | "dns"
  | "tcp"
  | "udp"
  | "spawn"
  | "external_import";

export type NetworkRuleSpec = {
  id: string;
  surface: NetworkSurface;
  severity: string;
  pattern?: string;
};

/** Rule-id → surface mapping (policy + legacy ids) */
const RULE_SURFACE: Record<string, NetworkSurface> = {
  "external-url-import": "external_import",
  "fetch-call": "fetch",
  "bun-fetch": "fetch",
  "global-fetch": "fetch",
  "http-client": "http_client",
  "axios-import": "http_client",
  "websocket-constructor": "websocket",
  "ws-import": "websocket",
  "dns-lookup": "dns",
  "bun-dns": "dns",
  "tcp-listen": "tcp",
  "tcp-connect": "tcp",
  "bun-tcp": "tcp",
  "udp-socket": "udp",
  "child-process-spawn": "spawn",
};

const SNIPPET_SURFACE: Array<{ surface: NetworkSurface; re: RegExp }> = [
  { surface: "fetch", re: /\bfetch\s*\(/ },
  { surface: "http_client", re: /\b(?:axios|http|https)\.(?:get|post|request|create)\s*\(/ },
  { surface: "websocket", re: /\bnew\s+WebSocket\s*\(|\bWebSocket\s*\(/ },
  { surface: "dns", re: /\bBun\.dns\.|node:dns|dns\.(?:lookup|resolve)/ },
  { surface: "tcp", re: /\bBun\.(?:connect|listen)\s*\(|node:net|\.createServer\s*\(/ },
  { surface: "udp", re: /\bBun\.udpSocket\s*\(|node:dgram/ },
  { surface: "spawn", re: /child_process|Bun\.spawn\s*\(/ },
  { surface: "external_import", re: /^https?:\/\// },
];

export type NetworkHit = {
  ruleId: string;
  surface: NetworkSurface;
  file: string;
  line: number;
  severity: string;
};

export type NetworkFileHeatmap = {
  file: string;
  basename: string;
  hits: number;
  uniqueRules: string[];
  surfaces: Partial<Record<NetworkSurface, number>>;
};

export type NetworkSummary = {
  enabled: boolean;
  total: number;
  unique_total: number;
  by_surface: Partial<Record<NetworkSurface, number>>;
  by_rule: Record<string, number>;
  findings: NetworkHit[];
  by_file: NetworkFileHeatmap[];
  hotspots: NetworkFileHeatmap[];
};

export function networkDedupeKey(f: Pick<ScanResult, "file" | "ruleId" | "line" | "networkSurface">): string {
  return `${f.file}|${f.ruleId}|${f.line}|${f.networkSurface ?? ""}`;
}

export function dedupeNetworkFindings(findings: ScanResult[]): ScanResult[] {
  const seen = new Set<string>();
  const out: ScanResult[] = [];
  for (const f of findings) {
    const key = networkDedupeKey(f);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  return out;
}

function basenameOf(file: string): string {
  const parts = file.split("/");
  return parts.at(-1) ?? file;
}

export class NetworkMatcher {
  static surfaceForRule(ruleId: string): NetworkSurface | null {
    return RULE_SURFACE[ruleId] ?? null;
  }

  static classifySnippet(text: string): NetworkSurface | null {
    for (const row of SNIPPET_SURFACE) {
      if (row.re.test(text)) return row.surface;
    }
    return null;
  }

  static classifyFinding(finding: ScanResult): NetworkSurface | null {
    const fromRule = NetworkMatcher.surfaceForRule(finding.ruleId);
    if (fromRule) return fromRule;
    const hay = [
      finding.snippet ?? "",
      finding.detail ?? "",
      finding.message ?? "",
      finding.file ?? "",
    ].join(" ");
    return NetworkMatcher.classifySnippet(hay);
  }

  static tagFinding(finding: ScanResult): ScanResult {
    const surface = NetworkMatcher.classifyFinding(finding);
    if (!surface) return finding;
    return { ...finding, networkSurface: surface };
  }

  static summarize(findings: ScanResult[], enabled = true): NetworkSummary {
    const tagged = findings
      .map((f) => NetworkMatcher.tagFinding(f))
      .filter((f) => NetworkMatcher.classifyFinding(f) != null);

    const by_surface: Partial<Record<NetworkSurface, number>> = {};
    const by_rule: Record<string, number> = {};
    const hits: NetworkHit[] = [];

    for (const raw of tagged) {
      const surface = NetworkMatcher.classifyFinding(raw)!;
      by_surface[surface] = (by_surface[surface] ?? 0) + 1;
      by_rule[raw.ruleId] = (by_rule[raw.ruleId] ?? 0) + 1;
      hits.push({
        ruleId: raw.ruleId,
        surface,
        file: raw.file,
        line: raw.line,
        severity: raw.severity,
      });
    }

    const unique = dedupeNetworkFindings(tagged);
    const fileMap = new Map<string, NetworkFileHeatmap>();
    for (const hit of hits) {
      let row = fileMap.get(hit.file);
      if (!row) {
        row = {
          file: hit.file,
          basename: basenameOf(hit.file),
          hits: 0,
          uniqueRules: [],
          surfaces: {},
        };
        fileMap.set(hit.file, row);
      }
      row.hits += 1;
      row.surfaces[hit.surface] = (row.surfaces[hit.surface] ?? 0) + 1;
      if (!row.uniqueRules.includes(hit.ruleId)) row.uniqueRules.push(hit.ruleId);
    }

    const by_file = [...fileMap.values()].sort((a, b) => b.hits - a.hits);
    const uniqueHits: NetworkHit[] = unique
      .map((f) => {
        const surface = NetworkMatcher.classifyFinding(f);
        if (!surface) return null;
        return {
          ruleId: f.ruleId,
          surface,
          file: f.file,
          line: f.line,
          severity: f.severity,
        };
      })
      .filter((h): h is NetworkHit => h != null);

    return {
      enabled,
      total: hits.length,
      unique_total: uniqueHits.length,
      by_surface,
      by_rule,
      findings: uniqueHits.slice(0, 100),
      by_file,
      hotspots: by_file.slice(0, 15),
    };
  }

  static buildNetworkMarkdown(summary: NetworkSummary): string {
    const lines: string[] = [
      "# Network Surface Audit",
      "",
      `- **raw hits:** ${summary.total}`,
      `- **unique hits:** ${summary.unique_total}`,
    ];
    const surfaces = Object.entries(summary.by_surface).sort(([, a], [, b]) => b - a);
    if (surfaces.length) {
      lines.push("", "## By surface", "", "| Surface | Count |", "| --- | ---: |");
      for (const [surface, count] of surfaces) {
        lines.push(`| \`${surface}\` | ${count} |`);
      }
    }
    if (summary.hotspots.length) {
      lines.push("", "## Hotspots (by file)", "", "| Chunk | Hits | Surfaces | Rules |", "| --- | ---: | --- | --- |");
      for (const row of summary.hotspots) {
        const surf = Object.entries(row.surfaces)
          .map(([k, v]) => `${k}:${v}`)
          .join(", ");
        const rules = row.uniqueRules.slice(0, 4).join(", ")
          + (row.uniqueRules.length > 4 ? ` +${row.uniqueRules.length - 4}` : "");
        lines.push(`| \`${row.basename}\` | ${row.hits} | ${surf} | ${rules} |`);
      }
    }
    if (summary.findings.length) {
      lines.push("", "## Unique findings", "", "| Surface | Rule | Location |", "| --- | --- | --- |");
      for (const hit of summary.findings.slice(0, 50)) {
        const loc = `${basenameOf(hit.file)}:${hit.line}`;
        lines.push(`| \`${hit.surface}\` | \`${hit.ruleId}\` | ${loc} |`);
      }
      if (summary.unique_total > 50) {
        lines.push(`| _more_ | | ${summary.unique_total - 50} additional |`);
      }
    }
    return `${lines.join("\n")}\n`;
  }

  static networkRuleIds(): string[] {
    return Object.keys(RULE_SURFACE);
  }
}