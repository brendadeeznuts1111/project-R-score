/**
 * HTML report generator for matrix / URLPattern analysis.
 * Uses Bun.escapeHTML (via escape-html util) for XSS-safe output.
 */

import { escapeHTML } from "../../client/utils/escape-html";

export interface MatrixReportRow {
  pattern: string;
  /** ops/sec or similar */
  opsPerSec?: number;
  /** e.g. elite | strong | medium | caution */
  colorTier?: string;
  /** 0–100 */
  riskScore?: number;
  /** JSON-serializable */
  secretsTypes?: unknown;
  [k: string]: unknown;
}

export function generateHTMLReport(rows: MatrixReportRow[]): string {
  const trs = rows.map((r) => {
    const tier = (r.colorTier ?? "medium") as string;
    const riskClass = (r.riskScore ?? 0) > 50 ? "risk-high" : "risk-low";
    return `
    <tr class="${escapeHTML(tier)} ${riskClass}">
      <td>${escapeHTML(String(r.pattern))}</td>
      <td>${typeof r.opsPerSec === "number" ? r.opsPerSec.toLocaleString() : "—"}</td>
      <td class="${riskClass}">${escapeHTML(String(r.riskScore ?? ""))}</td>
      <td>${escapeHTML(typeof r.secretsTypes === "object" ? JSON.stringify(r.secretsTypes) : String(r.secretsTypes ?? ""))}</td>
    </tr>`;
  });

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Matrix Analysis Report</title>
    <style>
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #334155; padding: 0.5rem 0.75rem; text-align: left; }
      th { background: #1e293b; color: #e2e8f0; }
      .risk-high { color: #f87171; }
      .risk-low { color: #4ade80; }
    </style>
  </head>
  <body>
    <table>
      <thead>
        <tr>
          <th>Pattern</th>
          <th>Ops/sec</th>
          <th>Risk</th>
          <th>Secrets</th>
        </tr>
      </thead>
      <tbody>${trs.join("")}
      </tbody>
    </table>
  </body>
</html>`;
}
