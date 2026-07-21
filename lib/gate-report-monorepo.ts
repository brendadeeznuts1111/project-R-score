// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/environment-variables — Bun.env
// @see https://bun.com/docs/runtime/utils#bun-nanoseconds — Bun.nanoseconds
/**
 * Monorepo gate report — runs gate-map projects and builds aggregated HTML/JSON.
 */

import {
  escapeHtml,
  formatDuration,
  parseMetrics,
  toolVersion,
  type GateResult,
  type GateStatus,
} from '../plannator/lib/gate-report.ts';
import { joinPath } from './path-bun';
import {
  type GateMapGate,
  type GateMapProject,
  resolveProjectPath,
  REPO_ROOT,
} from './gate-map.ts';

export type KimiCheckSummary = {
  passed: boolean;
  steps: Record<
    string,
    { passed: boolean; durationMs: number; skipped?: boolean; errors?: number }
  >;
  totalDurationMs: number;
};

export function parseKimiCheckJson(stdout: string): KimiCheckSummary | null {
  const line = stdout
    .split('\n')
    .map(l => l.trim())
    .find(l => l.startsWith('{') && l.includes('"steps"'));
  if (!line) return null;
  try {
    const parsed = JSON.parse(line) as KimiCheckSummary;
    if (typeof parsed.passed !== 'boolean' || !parsed.steps) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function kimiCheckMetrics(summary: KimiCheckSummary): Record<string, string | number> {
  const steps = Object.entries(summary.steps);
  const passed = steps.filter(([, s]) => s.passed && !s.skipped).length;
  const failed = steps.filter(([, s]) => !s.passed && !s.skipped).length;
  const skipped = steps.filter(([, s]) => s.skipped).length;
  return {
    steps: steps.length,
    passed,
    failed,
    skipped,
    durationMs: summary.totalDurationMs,
  };
}

export const DEFAULT_HTML_OUTPUT = joinPath(REPO_ROOT, 'reports', 'monorepo-gate-report.html');
export const DEFAULT_JSON_OUTPUT = joinPath(REPO_ROOT, 'reports', 'monorepo-gate-report.json');
export const DEFAULT_HISTORY_PATH = joinPath(REPO_ROOT, 'reports', 'monorepo-history.jsonl');

export type ProjectGateResult = GateResult & { optional?: boolean };

export type ProjectReport = {
  id: string; // brand-ok — opaque entity primary key
  zone: string;
  name: string;
  path: string;
  external?: boolean;
  status: GateStatus;
  durationMs: number;
  gates: ProjectGateResult[];
};

export type MonorepoReport = {
  generatedAt: string;
  bunVersion: string;
  astGrepVersion: string;
  mode: 'live';
  overall: GateStatus;
  totalDurationMs: number;
  projects: ProjectReport[];
  zones: Record<string, { passed: number; total: number; failed: number }>;
};

export async function runProjectGate(
  project: GateMapProject,
  gate: GateMapGate,
  root = REPO_ROOT
): Promise<ProjectGateResult> {
  const base = resolveProjectPath(project, root);
  const cwd = gate.cwd ? joinPath(base, gate.cwd) : base;
  const start = Bun.nanoseconds();

  const proc = Bun.spawn({
    cmd: gate.cmd,
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...Bun.env, FORCE_COLOR: '0' },
  });

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  const durationMs = Math.round((Bun.nanoseconds() - start) / 1_000_000);

  let status: GateStatus = exitCode === 0 ? 'pass' : 'fail';
  let metrics = parseMetrics(gate.id, stdout, stderr);

  if (gate.kimiCheckJson) {
    const summary = parseKimiCheckJson(stdout);
    if (summary) {
      metrics = { ...metrics, ...kimiCheckMetrics(summary) };
      status = summary.passed ? 'pass' : 'fail';
    }
  }

  return {
    id: gate.id,
    label: gate.label,
    description: gate.description,
    command: gate.cmd.join(' '),
    status,
    exitCode,
    durationMs,
    stdout,
    stderr,
    metrics,
    optional: gate.optional,
  };
}

export async function runProject(
  project: GateMapProject,
  root = REPO_ROOT
): Promise<ProjectReport> {
  const start = Bun.nanoseconds();
  const gates: ProjectGateResult[] = [];

  for (const gate of project.gates) {
    const result = await runProjectGate(project, gate, root);
    gates.push(result);
  }

  const requiredFailed = gates.some(g => g.status === 'fail' && !g.optional);
  const status: GateStatus = requiredFailed ? 'fail' : 'pass';

  return {
    id: project.id,
    zone: project.zone,
    name: project.name,
    path: resolveProjectPath(project, root),
    external: project.external,
    status,
    durationMs: Math.round((Bun.nanoseconds() - start) / 1_000_000),
    gates,
  };
}

export function summarizeZones(projects: ProjectReport[]): MonorepoReport['zones'] {
  const zones: MonorepoReport['zones'] = {};
  for (const p of projects) {
    const z = zones[p.zone] ?? { passed: 0, total: 0, failed: 0 };
    z.total++;
    if (p.status === 'pass') z.passed++;
    else z.failed++;
    zones[p.zone] = z;
  }
  return zones;
}

export function buildMonorepoHtml(report: MonorepoReport): string {
  const passed = report.projects.filter(p => p.status === 'pass').length;
  const failed = report.projects.filter(p => p.status === 'fail').length;
  const overallClass = report.overall === 'pass' ? 'pass' : 'fail';
  const overallLabel =
    report.overall === 'pass'
      ? `All projects passed (${passed}/${report.projects.length})`
      : `${failed} project(s) failed (${passed}/${report.projects.length} passed)`;

  const zoneStrip = Object.entries(report.zones)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([zone, stats]) => `<div class="stat-card">
        <span class="stat-value">${stats.passed}/${stats.total}</span>
        <span class="stat-label">${escapeHtml(zone)}</span>
      </div>`
    )
    .join('');

  const byZone = new Map<string, ProjectReport[]>();
  for (const p of report.projects) {
    const arr = byZone.get(p.zone) ?? [];
    arr.push(p);
    byZone.set(p.zone, arr);
  }

  const projectSections = [...byZone.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([zone, projects]) => {
      const cards = projects
        .map(project => {
          const gateRows = project.gates
            .map(gate => {
              const log =
                [gate.stdout, gate.stderr].filter(Boolean).join('\n').trim() || '(no output)';
              const optionalFail = gate.optional && gate.status === 'fail';
              const badgeClass = optionalFail ? 'optional-fail' : gate.status;
              const badgeLabel = optionalFail ? 'OPTIONAL FAIL' : gate.status.toUpperCase();
              return `<article class="gate-card ${badgeClass}">
                <div class="gate-head">
                  <div class="gate-title">
                    <span class="status-dot ${badgeClass}"></span>
                    <h4>${escapeHtml(gate.label)}</h4>
                  </div>
                  <div class="gate-meta">
                    <span class="badge ${badgeClass}">${badgeLabel}</span>
                    <span class="duration">${formatDuration(gate.durationMs)}</span>
                  </div>
                </div>
                <code class="gate-cmd">${escapeHtml(gate.command)}</code>
                <details class="log-details"><summary>Output</summary><pre class="log">${escapeHtml(log)}</pre></details>
              </article>`;
            })
            .join('');

          const extBadge = project.external ? `<span class="chip">external</span>` : '';

          return `<section class="project-card ${project.status}">
            <div class="project-head">
              <div>
                <h3>${escapeHtml(project.name)} ${extBadge}</h3>
                <p class="project-path"><code>${escapeHtml(project.path)}</code></p>
              </div>
              <div class="gate-meta">
                <span class="badge ${project.status}">${project.status.toUpperCase()}</span>
                <span class="duration">${formatDuration(project.durationMs)}</span>
              </div>
            </div>
            <div class="gate-list">${gateRows}</div>
          </section>`;
        })
        .join('');

      return `<div class="zone-section">
        <div class="section-label">Zone · ${escapeHtml(zone)}</div>
        ${cards}
      </div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Monorepo Gate Report — ${report.overall === 'pass' ? 'PASS' : 'FAIL'}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --background: oklch(0.97 0.005 260);
      --foreground: oklch(0.18 0.02 260);
      --card: oklch(1 0 0);
      --muted-foreground: oklch(0.40 0.02 260);
      --primary: oklch(0.50 0.25 280);
      --border: oklch(0.88 0.01 260);
      --success: oklch(0.45 0.20 150);
      --destructive: oklch(0.50 0.25 25);
      --warning: oklch(0.55 0.18 85);
      --code-bg: oklch(0.92 0.01 260);
      --font-sans: 'Inter', system-ui, sans-serif;
      --font-mono: 'JetBrains Mono', ui-monospace, monospace;
      --font-display: ui-serif, Georgia, serif;
      --radius: 0.625rem;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: var(--font-sans); background: var(--background); color: var(--foreground); line-height: 1.6; }
    .container { max-width: 1040px; margin: 0 auto; padding: 48px 24px 80px; }
    .eyebrow { font-family: var(--font-mono); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted-foreground); }
    h1 { font-family: var(--font-display); font-size: 2rem; font-weight: 500; margin: 8px 0 24px; }
    .hero { border: 1.5px solid var(--border); border-radius: calc(var(--radius) * 1.5); background: var(--card); padding: 24px; margin-bottom: 28px; }
    .hero.pass { border-color: color-mix(in oklch, var(--success) 40%, var(--border)); }
    .hero.fail { border-color: color-mix(in oklch, var(--destructive) 40%, var(--border)); }
    .hero-status { font-size: 1.1rem; font-weight: 600; }
    .hero-status.pass { color: var(--success); }
    .hero-status.fail { color: var(--destructive); }
    .hero-meta { margin-top: 12px; font-family: var(--font-mono); font-size: 0.78rem; color: var(--muted-foreground); display: flex; flex-wrap: wrap; gap: 16px; }
    .summary-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-bottom: 36px; }
    .stat-card { border: 1.5px solid var(--border); border-radius: var(--radius); background: var(--card); padding: 14px; text-align: center; }
    .stat-value { font-family: var(--font-display); font-size: 1.5rem; display: block; }
    .stat-label { font-family: var(--font-mono); font-size: 0.65rem; text-transform: uppercase; color: var(--muted-foreground); }
    .section-label { font-family: var(--font-mono); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted-foreground); margin-bottom: 12px; }
    .zone-section { margin-bottom: 36px; }
    .project-card { border: 1.5px solid var(--border); border-radius: var(--radius); background: var(--card); padding: 18px; margin-bottom: 14px; }
    .project-card.fail { border-color: color-mix(in oklch, var(--destructive) 35%, var(--border)); }
    .project-head { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
    .project-head h3 { font-size: 1.05rem; }
    .project-path { font-size: 0.82rem; color: var(--muted-foreground); margin-top: 4px; }
    .gate-list { display: flex; flex-direction: column; gap: 10px; }
    .gate-card { border: 1px solid var(--border); border-radius: calc(var(--radius) * 0.75); padding: 12px; background: color-mix(in oklch, var(--card) 90%, var(--background)); }
    .gate-head { display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
    .gate-title { display: flex; align-items: center; gap: 8px; }
    .gate-title h4 { font-size: 0.92rem; }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; }
    .status-dot.pass { background: var(--success); }
    .status-dot.fail { background: var(--destructive); }
    .status-dot.skip { background: var(--warning); }
    .status-dot.optional-fail { background: color-mix(in oklch, var(--destructive) 55%, var(--warning)); }
    .gate-meta { display: flex; align-items: center; gap: 8px; }
    .badge { font-family: var(--font-mono); font-size: 0.62rem; font-weight: 600; padding: 3px 7px; border-radius: 999px; }
    .badge.pass { background: color-mix(in oklch, var(--success) 15%, var(--card)); color: var(--success); }
    .badge.fail { background: color-mix(in oklch, var(--destructive) 15%, var(--card)); color: var(--destructive); }
    .badge.skip { background: color-mix(in oklch, var(--warning) 15%, var(--card)); color: var(--warning); }
    .badge.optional-fail { background: color-mix(in oklch, var(--destructive) 12%, var(--warning) 8%, var(--card)); color: color-mix(in oklch, var(--destructive) 70%, var(--warning)); }
    .gate-card.optional-fail { border-color: color-mix(in oklch, var(--warning) 35%, var(--border)); }
    .duration { font-family: var(--font-mono); font-size: 0.72rem; color: var(--muted-foreground); }
    .chip { font-family: var(--font-mono); font-size: 0.62rem; padding: 2px 6px; border-radius: 999px; background: var(--code-bg); color: var(--muted-foreground); margin-left: 6px; vertical-align: middle; }
    .gate-cmd { display: block; margin-top: 8px; font-family: var(--font-mono); font-size: 0.72rem; background: var(--code-bg); padding: 6px 8px; border-radius: 6px; }
    .log-details summary { cursor: pointer; font-family: var(--font-mono); font-size: 0.72rem; color: var(--primary); margin-top: 8px; }
    .log { margin-top: 8px; font-family: var(--font-mono); font-size: 0.7rem; background: var(--code-bg); padding: 10px; border-radius: 6px; max-height: 200px; overflow: auto; white-space: pre-wrap; }
    footer { margin-top: 40px; text-align: center; font-family: var(--font-mono); font-size: 0.72rem; color: var(--muted-foreground); }
  </style>
</head>
<body>
  <div class="container">
    <span class="eyebrow">Monorepo quality gates</span>
    <h1>Gate Map Report</h1>
    <div class="hero ${overallClass}">
      <div class="hero-status ${overallClass}">${escapeHtml(overallLabel)}</div>
      <div class="hero-meta">
        <span>Generated ${escapeHtml(report.generatedAt)}</span>
        <span>Bun ${escapeHtml(report.bunVersion)}</span>
        <span>ast-grep ${escapeHtml(report.astGrepVersion)}</span>
        <span>Total ${formatDuration(report.totalDurationMs)}</span>
      </div>
    </div>
    <div class="summary-strip">${zoneStrip}</div>
    ${projectSections}
    <footer>gate-map.json · bun run gate-report:monorepo</footer>
  </div>
</body>
</html>`;
}

export function buildMonorepoJson(report: MonorepoReport): string {
  return JSON.stringify(report, null, 2);
}

export function buildGithubSummary(report: MonorepoReport): string {
  const icon = (s: GateStatus) => (s === 'pass' ? '✅' : '❌');
  return [
    '## Monorepo gate report',
    '',
    `**Overall:** ${report.overall === 'pass' ? 'PASS' : 'FAIL'} · ${formatDuration(report.totalDurationMs)}`,
    '',
    '| Project | Zone | Status | Duration |',
    '|---------|------|--------|----------|',
    ...report.projects.map(
      p =>
        `| ${p.name} | ${p.zone} | ${icon(p.status)} ${p.status} | ${formatDuration(p.durationMs)} |`
    ),
    '',
    'Download the `monorepo-gate-report` artifact for the HTML dashboard.',
  ].join('\n');
}
