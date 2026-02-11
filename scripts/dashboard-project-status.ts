#!/usr/bin/env bun

import { buildProjectStatusReport } from "../dashboard/status-monitor";
import { summarizeDeploymentReadiness } from "../deployment/readiness-matrix";
import { summarizePerformanceImpact } from "../analysis/performance-impact";
import { summarizeSecurityPosture } from "../security/posture-report";
import { ExecutiveVerdict, ProjectRecommendations, SuccessMetrics } from "../dashboard/project-health";

const args = process.argv.slice(2);

if (import.meta.main) {
  const format = getArg("--format", "text");
  const output = getArg("--output", "");
  const autoRefresh = getArg("--auto-refresh", "30s");

  const payload = {
    generatedAt: new Date().toISOString(),
    verdict: ExecutiveVerdict,
    recommendations: ProjectRecommendations,
    successMetrics: SuccessMetrics,
    reports: {
      status: buildProjectStatusReport(),
      deployment: summarizeDeploymentReadiness(),
      performance: summarizePerformanceImpact(),
      security: summarizeSecurityPosture(),
    },
  };

  if (format === "html") {
    const html = renderHtml(payload, autoRefresh);
    if (output) {
      await Bun.write(output, html);
      console.log(`Wrote ${output}`);
    } else {
      console.log(html);
    }
  } else if (format === "json") {
    const json = JSON.stringify(payload, null, 2);
    if (output) {
      await Bun.write(output, json);
      console.log(`Wrote ${output}`);
    } else {
      console.log(json);
    }
  } else {
    const text = [
      `PROJECT HEALTH: ${payload.verdict.score}/${payload.verdict.max} - ${payload.verdict.label}`,
      payload.verdict.summary,
      "",
      buildProjectStatusReport(),
    ].join("\n");
    if (output) {
      await Bun.write(output, text);
      console.log(`Wrote ${output}`);
    } else {
      console.log(text);
    }
  }
}

function getArg(flag: string, fallback: string): string {
  const eq = args.find((a) => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1) || fallback;
  const i = args.indexOf(flag);
  if (i < 0 || i + 1 >= args.length) return fallback;
  return args[i + 1] || fallback;
}

function renderHtml(data: any, autoRefreshRaw: string): string {
  const refreshSec = parseRefresh(autoRefreshRaw);
  const rec = data.recommendations;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Project Status Dashboard</title>
  ${refreshSec > 0 ? `<meta http-equiv="refresh" content="${refreshSec}" />` : ""}
  <style>
    body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 24px; color: #111827; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
    .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; }
    .score { font-size: 30px; font-weight: 700; }
    h1, h2, h3 { margin: 0 0 8px; }
    ul { margin: 8px 0 0 18px; }
    pre { white-space: pre-wrap; margin: 0; }
  </style>
</head>
<body>
  <h1>Project Status Dashboard</h1>
  <p>Generated: ${escape(data.generatedAt)}</p>
  <div class="grid">
    <section class="card">
      <h2>Health Verdict</h2>
      <div class="score">${escape(String(data.verdict.score))}/${escape(String(data.verdict.max))}</div>
      <p>${escape(data.verdict.label)}</p>
      <p>${escape(data.verdict.summary)}</p>
    </section>
    <section class="card">
      <h2>Current Success Metrics</h2>
      <ul>
        <li>Velocity: ${escape(data.successMetrics.current.deploymentVelocity)}</li>
        <li>Reliability: ${escape(data.successMetrics.current.reliability)}</li>
        <li>Performance: ${escape(data.successMetrics.current.performance)}</li>
        <li>Security: ${escape(data.successMetrics.current.security)}</li>
      </ul>
    </section>
    <section class="card">
      <h2>Immediate Actions (${escape(rec.immediate.window)})</h2>
      <ul>${rec.immediate.items.map((s: string) => `<li>${escape(s)}</li>`).join("")}</ul>
    </section>
    <section class="card">
      <h2>Short-Term Actions (${escape(rec.shortTerm.window)})</h2>
      <ul>${rec.shortTerm.items.map((s: string) => `<li>${escape(s)}</li>`).join("")}</ul>
    </section>
    <section class="card">
      <h2>Long-Term Actions (${escape(rec.longTerm.window)})</h2>
      <ul>${rec.longTerm.items.map((s: string) => `<li>${escape(s)}</li>`).join("")}</ul>
    </section>
    <section class="card">
      <h2>Deployment Summary</h2>
      <pre>${escape(JSON.stringify(data.reports.deployment.summary, null, 2))}</pre>
    </section>
    <section class="card">
      <h2>Performance Summary</h2>
      <pre>${escape(JSON.stringify(data.reports.performance.overall, null, 2))}</pre>
    </section>
    <section class="card">
      <h2>Security Summary</h2>
      <pre>${escape(JSON.stringify(data.reports.security.summary, null, 2))}</pre>
    </section>
  </div>
</body>
</html>`;
}

function parseRefresh(raw: string): number {
  const trimmed = raw.trim();
  const s = trimmed.match(/^(\d+)\s*s$/i);
  if (s) return Number.parseInt(s[1], 10);
  const n = Number.parseInt(trimmed, 10);
  return Number.isFinite(n) ? n : 0;
}

function escape(s: string): string {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
