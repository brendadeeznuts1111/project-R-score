/**
 * Quality gate report builders and runners for plannator.
 */

import { join } from "node:path";

export const REPO_ROOT = join(import.meta.dir, "..");
export const DEFAULT_HTML_OUTPUT = join(REPO_ROOT, "reports", "gate-report.html");
export const DEFAULT_JSON_OUTPUT = join(REPO_ROOT, "reports", "gate-report.json");
export const DEFAULT_HISTORY_PATH = join(REPO_ROOT, "reports", "history.jsonl");
export const HISTORY_LIMIT = 20;

export type GateStatus = "pass" | "fail" | "skip";

export type GateDefinition = {
  id: string;
  label: string;
  description: string;
  cmd: string[];
  cwd?: string;
};

export type GateResult = {
  id: string;
  label: string;
  description: string;
  command: string;
  status: GateStatus;
  exitCode: number;
  durationMs: number;
  stdout: string;
  stderr: string;
  metrics: Record<string, string | number>;
};

export type AstGrepRule = {
  id: string;
  severity: string;
  message: string;
};

export type ReportMode = "live" | "fixture-pass" | "fixture-fail";

export type Report = {
  generatedAt: string;
  bunVersion: string;
  astGrepVersion: string;
  mode: ReportMode;
  overall: GateStatus;
  totalDurationMs: number;
  gates: GateResult[];
  astGrepRules: AstGrepRule[];
};

export type HistoryEntry = {
  generatedAt: string;
  overall: GateStatus;
  totalDurationMs: number;
  gatesPassed: number;
  gatesTotal: number;
};

export const GATES: GateDefinition[] = [
  {
    id: "typecheck",
    label: "Typecheck",
    description: "TypeScript --noEmit across project sources",
    cmd: ["bun", "run", "typecheck"],
  },
  {
    id: "ast-grep-test",
    label: "ast-grep rules",
    description: "Snapshot tests for Bun-native lint rules",
    cmd: ["bun", "run", "ast-grep:test"],
  },
  {
    id: "ast-grep-scan",
    label: "ast-grep scan",
    description: "Structural scan of project-owned TypeScript",
    cmd: ["bun", "run", "ast-grep:scan"],
  },
  {
    id: "test",
    label: "Bun tests",
    description: "Skill content, references, bun-native, and Effect boundary tests",
    cmd: ["bun", "run", "test"],
  },
  {
    id: "verify-hashes",
    label: "Skill hashes",
    description: "SHA256 verification against skills-lock.json",
    cmd: ["./scripts/verify-hashes.sh"],
  },
];

const GROUNDING_GATE: GateDefinition = {
  id: "ground-references",
  label: "Grounding refs",
  description: "Verify local Bun and Effect reference cards",
  cmd: ["bun", "run", "ground-references"],
};

export function gatesForRun(includeGrounding: boolean): GateDefinition[] {
  return includeGrounding ? [...GATES, GROUNDING_GATE] : GATES;
}

export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function parseMetrics(
  id: string,
  stdout: string,
  stderr: string
): Record<string, string | number> {
  const combined = `${stdout}\n${stderr}`;

  if (id === "ast-grep-test") {
    const m = combined.match(/(\d+) passed;\s*(\d+) failed/);
    if (m) return { rules: Number(m[1]), failed: Number(m[2]) };
  }

  if (id === "test") {
    const pass = combined.match(/(\d+) pass/);
    const fail = combined.match(/(\d+) fail/);
    const expects = combined.match(/(\d+) expect\(\) calls/);
    return {
      tests: pass ? Number(pass[1]) : 0,
      failed: fail ? Number(fail[1]) : 0,
      expects: expects ? Number(expects[1]) : 0,
    };
  }

  if (id === "verify-hashes") {
    const ok = (combined.match(/^OK:/gm) ?? []).length;
    return { skills: ok, matched: combined.includes("All hashes match") ? "yes" : "no" };
  }

  if (id === "ast-grep-scan") {
    const errors = (combined.match(/^error\[/gm) ?? []).length;
    const warnings = (combined.match(/^warning\[/gm) ?? []).length;
    return { errors, warnings };
  }

  if (id === "ground-references") {
    const localOk = combined.includes("local docs: OK");
    return { localDocs: localOk ? "ok" : "fail" };
  }

  return {};
}

export function parseRuleYaml(text: string): AstGrepRule | null {
  const id = text.match(/^id:\s*(.+)$/m)?.[1]?.trim();
  if (!id) return null;
  const severity = text.match(/^severity:\s*(\w+)/m)?.[1]?.trim() ?? "warning";
  const messageMatch = text.match(/^message:\s*(.+)$/m)?.[1]?.trim();
  const message = messageMatch?.replace(/^"(.*)"$/, "$1") ?? id;
  return { id, severity, message };
}

export async function loadAstGrepRules(root = REPO_ROOT): Promise<AstGrepRule[]> {
  const rulesDir = join(root, "ast-grep", "rules");
  const glob = new Bun.Glob("*.yml");
  const rules: AstGrepRule[] = [];

  for await (const file of glob.scan(rulesDir)) {
    const text = await Bun.file(join(rulesDir, file)).text();
    const rule = parseRuleYaml(text);
    if (rule) rules.push(rule);
  }

  return rules.sort((a, b) => a.id.localeCompare(b.id));
}

export async function toolVersion(cmd: string[], fallback = "unknown"): Promise<string> {
  const proc = Bun.spawn({ cmd, stdout: "pipe", stderr: "pipe" });
  const text = await new Response(proc.stdout).text();
  await proc.exited;
  return text.trim().split("\n")[0]?.trim() || fallback;
}

export async function runGate(gate: GateDefinition, root = REPO_ROOT): Promise<GateResult> {
  const start = Bun.nanoseconds();
  const proc = Bun.spawn({
    cmd: gate.cmd,
    cwd: gate.cwd ?? root,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...Bun.env, FORCE_COLOR: "0" },
  });

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  const durationMs = Math.round((Bun.nanoseconds() - start) / 1_000_000);
  const status: GateStatus = exitCode === 0 ? "pass" : "fail";

  return {
    id: gate.id,
    label: gate.label,
    description: gate.description,
    command: gate.cmd.join(" "),
    status,
    exitCode,
    durationMs,
    stdout,
    stderr,
    metrics: parseMetrics(gate.id, stdout, stderr),
  };
}

export async function runAllGates(options: {
  root?: string;
  includeGrounding?: boolean;
} = {}): Promise<{ gates: GateResult[]; astGrepRules: AstGrepRule[] }> {
  const root = options.root ?? REPO_ROOT;
  const definitions = gatesForRun(options.includeGrounding ?? false);
  const [astGrepRules, gates] = await Promise.all([
    loadAstGrepRules(root),
    (async () => {
      const results: GateResult[] = [];
      for (const gate of definitions) {
        results.push(await runGate(gate, root));
      }
      return results;
    })(),
  ]);
  return { gates, astGrepRules };
}

export function buildPipelineSvg(gates: GateResult[]): string {
  const boxW = 118;
  const boxH = 52;
  const gap = 18;
  const pad = 12;
  const width = pad * 2 + gates.length * boxW + (gates.length - 1) * gap;
  const height = 96;

  const nodes = gates
    .map((gate, i) => {
      const x = pad + i * (boxW + gap);
      const y = 20;
      const fill =
        gate.status === "pass"
          ? "color-mix(in oklch, var(--success) 12%, var(--card))"
          : "color-mix(in oklch, var(--destructive) 12%, var(--card))";
      const stroke = gate.status === "pass" ? "var(--success)" : "var(--destructive)";
      const arrow =
        i < gates.length - 1
          ? `<line x1="${x + boxW + 4}" y1="${y + boxH / 2}" x2="${x + boxW + gap - 4}" y2="${y + boxH / 2}" stroke="var(--muted-foreground)" stroke-width="1.5" marker-end="url(#arrow)"/>`
          : "";
      const label =
        gate.label.length > 14 ? `${gate.label.slice(0, 12)}…` : gate.label;
      return `${arrow}
        <rect x="${x}" y="${y}" width="${boxW}" height="${boxH}" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>
        <text x="${x + boxW / 2}" y="${y + 22}" text-anchor="middle" font-family="var(--font-mono)" font-size="10" fill="var(--foreground)">${escapeHtml(label)}</text>
        <text x="${x + boxW / 2}" y="${y + 38}" text-anchor="middle" font-family="var(--font-mono)" font-size="9" fill="${stroke}">${gate.status.toUpperCase()}</text>`;
    })
    .join("\n");

  return `<svg class="pipeline" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Gate pipeline">
    <defs>
      <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6 Z" fill="var(--muted-foreground)"/>
      </marker>
    </defs>
    ${nodes}
  </svg>`;
}

export function historyFromReport(report: Report): HistoryEntry {
  const gatesPassed = report.gates.filter((g) => g.status === "pass").length;
  return {
    generatedAt: report.generatedAt,
    overall: report.overall,
    totalDurationMs: report.totalDurationMs,
    gatesPassed,
    gatesTotal: report.gates.length,
  };
}

export async function loadHistory(
  path = DEFAULT_HISTORY_PATH,
  limit = HISTORY_LIMIT
): Promise<HistoryEntry[]> {
  const file = Bun.file(path);
  if (!(await file.exists())) return [];

  const lines = (await file.text())
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const entries: HistoryEntry[] = [];
  for (const line of lines.slice(-limit)) {
    try {
      entries.push(JSON.parse(line) as HistoryEntry);
    } catch {
      // skip corrupt lines
    }
  }
  return entries;
}

export async function appendHistory(
  report: Report,
  path = DEFAULT_HISTORY_PATH
): Promise<void> {
  const entry = historyFromReport(report);
  const line = `${JSON.stringify(entry)}\n`;
  const file = Bun.file(path);
  const prior = (await file.exists()) ? await file.text() : "";
  await Bun.write(path, prior + line);
}

export function buildHistoryChart(history: HistoryEntry[]): string {
  if (history.length === 0) return "";
  const maxMs = Math.max(...history.map((h) => h.totalDurationMs), 1);

  const bars = history
    .map((entry) => {
      const h = Math.max(12, Math.round((entry.totalDurationMs / maxMs) * 72));
      const cls = entry.overall === "pass" ? "pass" : "fail";
      const title = `${entry.generatedAt} · ${entry.overall} · ${formatDuration(entry.totalDurationMs)}`;
      return `<div class="hist-bar ${cls}" style="height:${h}px" title="${escapeHtml(title)}"></div>`;
    })
    .join("");

  const passRate = Math.round(
    (history.filter((h) => h.overall === "pass").length / history.length) * 100
  );
  const avgMs = Math.round(
    history.reduce((sum, h) => sum + h.totalDurationMs, 0) / history.length
  );

  const rows = [...history]
    .reverse()
    .slice(0, 8)
    .map(
      (entry) => `<tr>
        <td>${escapeHtml(entry.generatedAt)}</td>
        <td><span class="badge ${entry.overall}">${entry.overall.toUpperCase()}</span></td>
        <td>${entry.gatesPassed}/${entry.gatesTotal}</td>
        <td>${formatDuration(entry.totalDurationMs)}</td>
      </tr>`
    )
    .join("");

  return `
    <section class="section">
      <h2>Run history</h2>
      <div class="history-stats">
        <span class="chip">runs: ${history.length}</span>
        <span class="chip">pass rate: ${passRate}%</span>
        <span class="chip">avg duration: ${formatDuration(avgMs)}</span>
      </div>
      <div class="history-chart" aria-label="Recent run durations">${bars}</div>
      <table class="history-table">
        <thead><tr><th>Time</th><th>Status</th><th>Gates</th><th>Duration</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`;
}

export async function buildFixtureReport(
  mode: "pass" | "fail",
  root = REPO_ROOT
): Promise<Report> {
  const astGrepRules = await loadAstGrepRules(root);
  const gates: GateResult[] = GATES.map((gate, index) => {
    const failThis = mode === "fail" && gate.id === "ast-grep-scan";
    return {
      id: gate.id,
      label: gate.label,
      description: gate.description,
      command: gate.cmd.join(" "),
      status: failThis ? "fail" : "pass",
      exitCode: failThis ? 1 : 0,
      durationMs: 80 + index * 40,
      stdout: failThis
        ? "error[bun-serve-exact-signature]: Bun.serve expects an options object\nwarning[no-node-fs]: Prefer Bun.file"
        : gate.id === "ast-grep-test"
          ? "test result: ok. 15 passed; 0 failed"
          : gate.id === "test"
            ? "43 pass\n0 fail"
            : "",
      stderr: "",
      metrics: {},
    };
  });

  for (const gate of gates) {
    gate.metrics = parseMetrics(gate.id, gate.stdout, gate.stderr);
  }

  return {
    generatedAt: new Date().toISOString(),
    bunVersion: await toolVersion(["bun", "--version"]),
    astGrepVersion: await toolVersion(["ast-grep", "--version"], "fixture"),
    mode: mode === "pass" ? "fixture-pass" : "fixture-fail",
    overall: mode === "pass" ? "pass" : "fail",
    totalDurationMs: gates.reduce((sum, g) => sum + g.durationMs, 0),
    gates,
    astGrepRules,
  };
}

export function buildRuleGrid(rules: AstGrepRule[], rulesGatePassed: boolean): string {
  return rules
    .map((rule) => {
      const sevClass = rule.severity === "error" ? "error" : "warning";
      const status = rulesGatePassed ? "tested" : "unknown";
      return `<div class="rule-card">
        <div class="rule-head">
          <code class="rule-id">${escapeHtml(rule.id)}</code>
          <span class="sev ${sevClass}">${escapeHtml(rule.severity)}</span>
        </div>
        <p class="rule-msg">${escapeHtml(rule.message)}</p>
        <span class="rule-status ${status}">${status}</span>
      </div>`;
    })
    .join("\n");
}

export function buildHtml(report: Report, history: HistoryEntry[] = []): string {
  const passed = report.gates.filter((g) => g.status === "pass").length;
  const failed = report.gates.filter((g) => g.status === "fail").length;
  const rulesTested =
    report.gates.find((g) => g.id === "ast-grep-test")?.metrics.rules ??
    report.astGrepRules.length;
  const tests = report.gates.find((g) => g.id === "test")?.metrics.tests ?? "—";
  const rulesGatePassed =
    report.gates.find((g) => g.id === "ast-grep-test")?.status === "pass";
  const isFixture = report.mode !== "live";
  const overallLabel = isFixture
    ? report.overall === "pass"
      ? "Fixture demo — all gates passed (not a real run)"
      : `Fixture demo — ${failed} gate(s) failed (not a real run)`
    : report.overall === "pass"
      ? "All gates passed"
      : `${failed} gate(s) failed`;
  const overallClass = report.overall === "pass" ? "pass" : "fail";
  const demoBanner = isFixture
    ? `<div class="demo-banner" role="note">
        <strong>Demo report</strong> — generated with <code>--fixture</code>; gates were not executed.
        Open <code>reports/gate-report.html</code> for the live run.
      </div>`
    : "";

  const gateCards = report.gates
    .map((gate) => {
      const log = [gate.stdout, gate.stderr].filter(Boolean).join("\n").trim() || "(no output)";
      const metricChips = Object.entries(gate.metrics)
        .map(([k, v]) => `<span class="chip">${escapeHtml(k)}: ${escapeHtml(String(v))}</span>`)
        .join("");

      return `
        <article class="gate-card ${gate.status}">
          <div class="gate-head">
            <div class="gate-title">
              <span class="status-dot ${gate.status}" aria-hidden="true"></span>
              <h3>${escapeHtml(gate.label)}</h3>
            </div>
            <div class="gate-meta">
              <span class="badge ${gate.status}">${gate.status.toUpperCase()}</span>
              <span class="duration">${formatDuration(gate.durationMs)}</span>
            </div>
          </div>
          <p class="gate-desc">${escapeHtml(gate.description)}</p>
          <code class="gate-cmd">${escapeHtml(gate.command)}</code>
          ${metricChips ? `<div class="chips">${metricChips}</div>` : ""}
          <details class="log-details">
            <summary>Output log</summary>
            <pre class="log">${escapeHtml(log)}</pre>
          </details>
        </article>`;
    })
    .join("\n");

  const pipeline = buildPipelineSvg(report.gates);
  const ruleGrid = buildRuleGrid(report.astGrepRules, rulesGatePassed);
  const historySection = buildHistoryChart(history);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Plannator Gate Report — ${isFixture ? "DEMO" : report.overall === "pass" ? "PASS" : "FAIL"}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --background: oklch(0.97 0.005 260);
      --foreground: oklch(0.18 0.02 260);
      --card: oklch(1 0 0);
      --muted: oklch(0.92 0.01 260);
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
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: var(--font-sans);
      background: var(--background);
      color: var(--foreground);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    .container { max-width: 960px; margin: 0 auto; padding: 48px 24px 80px; }
    .eyebrow {
      font-family: var(--font-mono);
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted-foreground);
    }
    h1 {
      font-family: var(--font-display);
      font-size: 2rem;
      font-weight: 500;
      margin: 8px 0 16px;
    }
    h2 {
      font-family: var(--font-display);
      font-size: 1.2rem;
      font-weight: 500;
      margin-bottom: 16px;
    }
    .hero {
      border: 1.5px solid var(--border);
      border-radius: calc(var(--radius) * 1.5);
      background: var(--card);
      padding: 24px;
      margin-bottom: 32px;
    }
    .hero.pass { border-color: color-mix(in oklch, var(--success) 40%, var(--border)); }
    .hero.fail { border-color: color-mix(in oklch, var(--destructive) 40%, var(--border)); }
    .demo-banner {
      margin-bottom: 24px;
      padding: 14px 16px;
      border: 1.5px solid color-mix(in oklch, var(--warning) 50%, var(--border));
      border-radius: var(--radius);
      background: color-mix(in oklch, var(--warning) 10%, var(--card));
      font-size: 0.88rem;
      color: var(--foreground);
    }
    .demo-banner code {
      font-family: var(--font-mono);
      font-size: 0.78rem;
      background: var(--code-bg);
      padding: 2px 5px;
      border-radius: 4px;
    }
    .hero-status { font-size: 1.1rem; font-weight: 600; }
    .hero-status.pass { color: var(--success); }
    .hero-status.fail { color: var(--destructive); }
    .hero-meta {
      margin-top: 12px;
      font-family: var(--font-mono);
      font-size: 0.78rem;
      color: var(--muted-foreground);
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }
    .summary-strip {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 12px;
      margin-bottom: 40px;
    }
    .stat-card {
      border: 1.5px solid var(--border);
      border-radius: var(--radius);
      background: var(--card);
      padding: 16px;
      text-align: center;
    }
    .stat-value {
      font-family: var(--font-display);
      font-size: 1.6rem;
      font-weight: 500;
      display: block;
    }
    .stat-label {
      font-family: var(--font-mono);
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--muted-foreground);
    }
    .section { margin-bottom: 40px; }
    .section-label {
      font-family: var(--font-mono);
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted-foreground);
      margin-bottom: 16px;
    }
    .pipeline-wrap {
      border: 1.5px solid var(--border);
      border-radius: var(--radius);
      background: var(--card);
      padding: 16px;
      overflow-x: auto;
    }
    .pipeline { display: block; min-width: 640px; height: auto; }
    .rule-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 12px;
    }
    .rule-card {
      border: 1.5px solid var(--border);
      border-radius: var(--radius);
      background: var(--card);
      padding: 14px;
    }
    .rule-head { display: flex; justify-content: space-between; gap: 8px; align-items: center; }
    .rule-id { font-family: var(--font-mono); font-size: 0.75rem; }
    .sev {
      font-family: var(--font-mono);
      font-size: 0.62rem;
      text-transform: uppercase;
      padding: 2px 6px;
      border-radius: 999px;
    }
    .sev.error { background: color-mix(in oklch, var(--destructive) 12%, var(--card)); color: var(--destructive); }
    .sev.warning { background: color-mix(in oklch, var(--warning) 15%, var(--card)); color: var(--warning); }
    .rule-msg { margin: 8px 0; font-size: 0.82rem; color: var(--muted-foreground); }
    .rule-status {
      font-family: var(--font-mono);
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--success);
    }
    .rule-status.unknown { color: var(--muted-foreground); }
    .gate-list { display: flex; flex-direction: column; gap: 16px; }
    .gate-card {
      border: 1.5px solid var(--border);
      border-radius: var(--radius);
      background: var(--card);
      padding: 20px;
    }
    .gate-card.fail { border-color: color-mix(in oklch, var(--destructive) 35%, var(--border)); }
    .gate-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      flex-wrap: wrap;
    }
    .gate-title { display: flex; align-items: center; gap: 10px; }
    .gate-title h3 { font-size: 1.05rem; font-weight: 600; }
    .status-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .status-dot.pass { background: var(--success); }
    .status-dot.fail { background: var(--destructive); }
    .gate-meta { display: flex; align-items: center; gap: 10px; }
    .badge {
      font-family: var(--font-mono);
      font-size: 0.65rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      padding: 4px 8px;
      border-radius: 999px;
    }
    .badge.pass { background: color-mix(in oklch, var(--success) 15%, var(--card)); color: var(--success); }
    .badge.fail { background: color-mix(in oklch, var(--destructive) 15%, var(--card)); color: var(--destructive); }
    .duration { font-family: var(--font-mono); font-size: 0.75rem; color: var(--muted-foreground); }
    .gate-desc { margin: 10px 0; color: var(--muted-foreground); font-size: 0.9rem; }
    .gate-cmd {
      display: block;
      font-family: var(--font-mono);
      font-size: 0.78rem;
      background: var(--code-bg);
      border-radius: calc(var(--radius) * 0.75);
      padding: 8px 10px;
      overflow-x: auto;
    }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .chip {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      padding: 4px 8px;
      border-radius: 999px;
      background: var(--muted);
      color: var(--muted-foreground);
    }
    .log-details { margin-top: 14px; }
    .log-details summary {
      cursor: pointer;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--primary);
      user-select: none;
    }
    .log {
      margin-top: 10px;
      font-family: var(--font-mono);
      font-size: 0.72rem;
      line-height: 1.5;
      background: var(--code-bg);
      border-radius: calc(var(--radius) * 0.75);
      padding: 12px;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 320px;
      overflow-y: auto;
    }
    .history-stats { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
    .history-chart {
      display: flex;
      align-items: flex-end;
      gap: 6px;
      height: 88px;
      padding: 12px;
      border: 1.5px solid var(--border);
      border-radius: var(--radius);
      background: var(--card);
      margin-bottom: 16px;
      overflow-x: auto;
    }
    .hist-bar {
      width: 14px;
      border-radius: 4px 4px 2px 2px;
      flex-shrink: 0;
    }
    .hist-bar.pass { background: color-mix(in oklch, var(--success) 70%, var(--card)); }
    .hist-bar.fail { background: color-mix(in oklch, var(--destructive) 70%, var(--card)); }
    .history-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.82rem;
    }
    .history-table th,
    .history-table td {
      text-align: left;
      padding: 8px 10px;
      border-bottom: 1px solid var(--border);
    }
    .history-table th {
      font-family: var(--font-mono);
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--muted-foreground);
    }
    footer {
      margin-top: 48px;
      font-family: var(--font-mono);
      font-size: 0.72rem;
      color: var(--muted-foreground);
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <span class="eyebrow">Quality gates · Plannator</span>
    <h1>Gate Report${isFixture ? " <span class=\"eyebrow\">(demo)</span>" : ""}</h1>

    ${demoBanner}

    <div class="hero ${overallClass}">
      <div class="hero-status ${overallClass}">${escapeHtml(overallLabel)}</div>
      <div class="hero-meta">
        <span>Generated ${escapeHtml(report.generatedAt)}</span>
        <span>Bun ${escapeHtml(report.bunVersion)}</span>
        <span>ast-grep ${escapeHtml(report.astGrepVersion)}</span>
        <span>Total ${formatDuration(report.totalDurationMs)}</span>
      </div>
    </div>

    <div class="summary-strip">
      <div class="stat-card">
        <span class="stat-value">${passed}/${report.gates.length}</span>
        <span class="stat-label">Gates passed</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${rulesTested}</span>
        <span class="stat-label">ast-grep rules</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${tests}</span>
        <span class="stat-label">Bun tests</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${report.astGrepRules.length}</span>
        <span class="stat-label">Rule definitions</span>
      </div>
    </div>

    ${historySection}

    <section class="section">
      <div class="section-label">Pipeline</div>
      <div class="pipeline-wrap">${pipeline}</div>
    </section>

    <section class="section">
      <h2>ast-grep rule inventory</h2>
      <div class="rule-grid">${ruleGrid}</div>
    </section>

    <div class="section-label">Gate details</div>
    <div class="gate-list">${gateCards}</div>

    <footer>plannator · bun run gate-report · JSON at reports/gate-report.json</footer>
  </div>
</body>
</html>`;
}

export function buildGithubSummary(report: Report): string {
  const icon = (s: GateStatus) => (s === "pass" ? "✅" : "❌");
  return [
    "## Plannator gate report",
    "",
    `**Overall:** ${report.overall === "pass" ? "PASS" : "FAIL"} · ${formatDuration(report.totalDurationMs)}`,
    "",
    "| Gate | Status | Duration |",
    "|------|--------|----------|",
    ...report.gates.map(
      (g) => `| ${g.label} | ${icon(g.status)} ${g.status} | ${formatDuration(g.durationMs)} |`
    ),
    "",
    `**ast-grep rules:** ${report.astGrepRules.length} defined`,
    "",
    "Download the `gate-report` artifact for the HTML dashboard.",
  ].join("\n");
}

export function buildJson(report: Report): string {
  return JSON.stringify(report, null, 2);
}