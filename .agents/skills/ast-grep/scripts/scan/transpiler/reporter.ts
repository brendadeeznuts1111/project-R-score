import type { BundleScanReport, ScanResult, Severity } from "./types.ts";
import { SEVERITY_RANK, normalizeSeverity } from "./rule-engine.ts";

function countBySeverity(findings: ScanResult[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of findings) {
    const s = normalizeSeverity(f.severity);
    out[s] = (out[s] ?? 0) + 1;
  }
  return out;
}

export function buildSummary(report: Omit<BundleScanReport, "summary">): BundleScanReport["summary"] {
  const all: ScanResult[] = [];
  let files = 0;
  for (const t of report.targets) {
    files += t.files_scanned;
    all.push(...t.findings);
  }
  return { files, findings: all.length, by_severity: countBySeverity(all) };
}

export function formatJson(report: BundleScanReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export function formatMarkdown(report: BundleScanReport): string {
  const lines: string[] = [
    `# Supply-Chain Scan (Layer ${report.layer})`,
    "",
    `- **repo:** ${report.repo}`,
    `- **profile:** ${report.profile}`,
    `- **elapsed:** ${report.elapsed_ms}ms`,
    `- **workers:** ${report.workers}`,
    `- **findings:** ${report.summary.findings} across ${report.summary.files} files`,
    "",
  ];
  for (const t of report.targets) {
    if (t.skipped) {
      lines.push(`## ${t.id} — SKIP (${t.path})`, "");
      continue;
    }
    lines.push(`## ${t.id} (${t.path})`, "");
    if (!t.findings.length) {
      lines.push("_clean_", "");
      continue;
    }
    for (const f of t.findings.slice(0, 100)) {
      lines.push(
        `- **[${f.severity}]** \`${f.ruleId}\` ${f.file}:${f.line}:${f.column} — ${f.message}`,
      );
      if (f.snippet) lines.push(`  > ${f.snippet}`);
      if (f.detail) lines.push(`  > ${f.detail}`);
    }
    if (t.findings.length > 100) lines.push(`- _... ${t.findings.length - 100} more_`, "");
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

export function formatHtml(report: BundleScanReport): string {
  const rows = report.targets.flatMap((t) =>
    t.findings.map((f) => ({ target: t.id, ...f })),
  );
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const tr = rows
    .map(
      (r) =>
        `<tr><td>${esc(r.target)}</td><td>${esc(r.severity)}</td><td>${esc(r.ruleId)}</td>`
        + `<td>${esc(r.file)}:${r.line}</td><td>${esc(r.message)}</td></tr>`,
    )
    .join("\n");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Supply-Chain Scan</title>`
    + `<style>body{font-family:system-ui;margin:2rem}table{border-collapse:collapse;width:100%}`
    + `th,td{border:1px solid #ccc;padding:.4rem .6rem;text-align:left}th{background:#f4f4f4}</style>`
    + `</head><body><h1>Supply-Chain Scan (Layer ${report.layer})</h1>`
    + `<p>${esc(report.repo)} · ${report.summary.findings} findings · ${report.elapsed_ms}ms</p>`
    + `<table><thead><tr><th>Target</th><th>Severity</th><th>Rule</th><th>Location</th><th>Message</th></tr></thead>`
    + `<tbody>${tr || "<tr><td colspan=5>clean</td></tr>"}</tbody></table></body></html>\n`;
}

export function formatReport(report: BundleScanReport): string {
  switch (report.format) {
    case "html": return formatHtml(report);
    case "markdown": return formatMarkdown(report);
    default: return formatJson(report);
  }
}

export function maxSeverity(findings: ScanResult[]): Severity {
  let max = 0;
  for (const f of findings) {
    max = Math.max(max, SEVERITY_RANK[normalizeSeverity(f.severity)] ?? 0);
  }
  if (max >= 3) return "critical";
  if (max >= 2) return "error";
  if (max >= 1) return "warn";
  return "info";
}