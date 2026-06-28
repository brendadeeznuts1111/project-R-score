import type { UrlCheckResult } from "./url-checker";
import type { CitationScanResult } from "./citation-scanner";
import type { NavContractResult } from "./nav-contract";
import type { RefEntry } from "../refs-schema";

export interface AuditReport {
  timestamp: string;
  flags: {
    strict: boolean;
    fix: boolean;
    noNetwork: boolean;
    linksOnly: boolean;
    report: "json" | "md" | "both";
  };
  meta: { schemaValid: boolean; totalRefs: number };
  summary: {
    passed: number;
    failed: number;
    warnings: number;
    errors: number;
  };
  schemaErrors: string[];
  urlChecks: UrlCheckResult[];
  citations: {
    cited: number;
    unusedRefs: Array<{ id: string; topic: string; tags: string[] }>;
  };
  deprecatedCited: CitationScanResult["deprecatedCited"];
  drift: CitationScanResult["refsMdDrift"];
  forbiddenUrls: CitationScanResult["forbiddenUrls"];
  missingAnchors: string[];
  navContract: NavContractResult;
  exitCode: number;
}

export async function writeJsonReport(path: string, report: AuditReport): Promise<void> {
  await Bun.write(path, JSON.stringify(report, null, 2) + "\n");
}

export async function writeMarkdownReport(path: string, report: AuditReport): Promise<void> {
  const lines: string[] = [
    "# Reference Audit Report",
    "",
    `**Generated:** ${report.timestamp}`,
    "",
    "## Summary",
    "",
    "| Metric | Count |",
    "|--------|-------|",
    `| Passed checks | ${report.summary.passed} |`,
    `| Errors | ${report.summary.errors} |`,
    `| Warnings | ${report.summary.warnings} |`,
    `| Exit code | ${report.exitCode} |`,
    "",
    "## URL checks",
    "",
  ];

  const byClass = new Map<string, UrlCheckResult[]>();
  for (const u of report.urlChecks) {
    const list = byClass.get(u.classification) ?? [];
    list.push(u);
    byClass.set(u.classification, list);
  }
  for (const [cls, checks] of [...byClass.entries()].sort()) {
    lines.push(`### ${cls}`, "");
    for (const c of checks) {
      lines.push(
        `- **${c.id}** ${c.url}${c.cached ? " _(cached)_" : ""}${c.error ? ` — ${c.error}` : ""}`
      );
    }
    lines.push("");
  }

  if (report.citations.unusedRefs.length > 0) {
    lines.push("## Unused references", "");
    for (const u of report.citations.unusedRefs) {
      lines.push(`- **${u.id}** — ${u.topic} \`${u.tags.join(", ")}\``);
    }
    lines.push("");
  }

  if (report.drift.length > 0) {
    lines.push("## REFS.md drift", "");
    for (const d of report.drift) {
      lines.push(`- **${d.id}**: expected \`${d.expected}\`, got \`${d.actual}\``);
    }
    lines.push("");
  }

  if (report.forbiddenUrls.length > 0) {
    lines.push("## Forbidden external URLs", "");
    for (const f of report.forbiddenUrls) {
      lines.push(`- ${f.file}:${f.line} — ${f.url}`);
    }
    lines.push("");
  }

  if (!report.navContract.passed) {
    lines.push("## Nav contract violations", "");
    for (const v of report.navContract.violations) {
      lines.push(`- ${v.line ? `L${v.line}: ` : ""}${v.message}`);
    }
    lines.push("");
  }

  lines.push("---", "", "See [refs.json](refs.json) and [REFS.md](REFS.md).", "");
  await Bun.write(path, lines.join("\n"));
}

export function buildUnusedList(unused: RefEntry[]) {
  return unused.map((r) => ({ id: r.id, topic: r.topic, tags: r.tags }));
}
