import type { BundleScanReport, ScanResult, Severity } from "./types.ts";
import { SEVERITY_RANK, normalizeSeverity } from "./rule-engine.ts";
import { enrichFindingColors, severityBadgeStyle } from "./terminal-color.ts";
import { COLOR_DOCS } from "./color-matcher.ts";
import {
  MARKDOWN_DOCS,
  buildSupplyChainMarkdown,
  enrichBundleReportMarkdown,
  renderSupplyChainAnsi,
  renderSupplyChainHtml,
  renderSupplyChainPlaintext,
} from "./markdown-reporter.ts";
import { PLATFORM_DOCS } from "./platform-matcher.ts";
import { NETWORK_DOCS } from "./network-matcher.ts";

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

function withColorMetadata(report: BundleScanReport): BundleScanReport {
  return {
    ...report,
    targets: report.targets.map((t) => ({
      ...t,
      findings: t.findings.map((f) => enrichFindingColors(f)),
    })),
  };
}

export function formatJson(
  report: BundleScanReport,
  options: { colors?: boolean; markdown?: boolean } = {},
): string {
  let payload: BundleScanReport & Record<string, unknown> = report;
  if (options.colors !== false) {
    payload = {
      ...enrichBundleReportMarkdown(withColorMetadata(report)),
      color_docs: COLOR_DOCS,
      markdown_docs: MARKDOWN_DOCS,
      platform_docs: PLATFORM_DOCS,
      network_docs: NETWORK_DOCS,
    };
  } else if (options.markdown) {
    payload = enrichBundleReportMarkdown(report);
  }
  return `${JSON.stringify(payload, null, 2)}\n`;
}

export function formatTerminal(report: BundleScanReport, options: { colored?: boolean } = {}): string {
  return renderSupplyChainAnsi(report, options.colored !== false);
}

export function formatMarkdown(report: BundleScanReport): string {
  return buildSupplyChainMarkdown(report);
}

export function formatAnsi(report: BundleScanReport, options: { colored?: boolean } = {}): string {
  return renderSupplyChainAnsi(report, options.colored !== false);
}

export function formatHtml(report: BundleScanReport): string {
  return renderSupplyChainHtml(report);
}

export function formatPlaintext(report: BundleScanReport): string {
  return renderSupplyChainPlaintext(report);
}

/** Legacy hand-built HTML table (severity badges) — used when markdown HTML is disabled. */
export function formatHtmlLegacy(report: BundleScanReport): string {
  const rows = report.targets.flatMap((t) =>
    t.findings.map((f) => ({ target: t.id, ...f })),
  );
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const tr = rows
    .map((r) => {
      const kind = r.kinds?.length
        ? r.kinds.join("+")
        : r.violationKind ?? "";
      const fix = r.remediation?.command
        ? `<br><code>${esc(r.remediation.command)}</code>`
        : "";
      const badge = `<span style="${severityBadgeStyle(r.severity)}">${esc(r.severity)}</span>`;
      return `<tr><td>${esc(r.target)}</td><td>${badge}</td><td>${esc(kind)}</td>`
        + `<td>${esc(r.ruleId)}</td><td>${esc(r.file)}:${r.line}</td>`
        + `<td>${esc(r.message)}${fix}</td></tr>`;
    })
    .join("\n");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Supply-Chain Scan</title>`
    + `<style>body{font-family:system-ui;margin:2rem}table{border-collapse:collapse;width:100%}`
    + `th,td{border:1px solid #ccc;padding:.4rem .6rem;text-align:left}th{background:#f4f4f4}code{font-size:.85em}</style>`
    + `</head><body><h1>Supply-Chain Scan (Layer ${report.layer})</h1>`
    + `<p>${esc(report.repo)} · ${report.summary.findings} findings · ${report.elapsed_ms}ms</p>`
    + `<table><thead><tr><th>Target</th><th>Severity</th><th>Kind</th><th>Rule</th><th>Location</th><th>Message</th></tr></thead>`
    + `<tbody>${tr || "<tr><td colspan=6>clean</td></tr>"}</tbody></table></body></html>\n`;
}

export function formatReport(
  report: BundleScanReport,
  options: { terminal?: boolean; colored?: boolean } = {},
): string {
  if (options.terminal) return formatTerminal(report, { colored: options.colored });
  switch (report.format) {
    case "html": return formatHtml(report);
    case "markdown": return formatMarkdown(report);
    case "ansi": return formatAnsi(report, { colored: options.colored });
    case "plaintext": return formatPlaintext(report);
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