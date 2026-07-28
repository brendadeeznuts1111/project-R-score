#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * Identity board bake — readonly aggregation of data/accounts-operations.db into:
 *   public/registry/identity-board.json   (machine report)
 *   public/portal/identity/index.html     (baked ops board)
 *
 * NEVER selects password_hash / token_hash (see lib/identity/board.ts) — the
 * baked artifacts are safe for the public plane.
 *
 *   bun run identity:board
 */
import { escapeHtml } from '../lib/escape-html.ts';
import { collectBoardData, type IdentityBoardData } from '../lib/identity/board.ts';
import { joinPath } from '../lib/path-bun.ts';

const ROOT = joinPath(import.meta.dir, '..');
const DB_PATH = joinPath(ROOT, 'data', 'accounts-operations.db');
const OUT_JSON = joinPath(ROOT, 'public', 'registry', 'identity-board.json');
const OUT_HTML = joinPath(ROOT, 'public', 'portal', 'identity', 'index.html');

function renderHtml(report: IdentityBoardData): string {
  const c = report.counts;
  const now = Math.floor(Date.now() / 1000);
  const stat = (k: string, v: string | number, cls = '') =>
    `<div class="ib-stat ${cls}"><div class="k">${k}</div><div class="v">${v}</div></div>`;

  const lockCell = (lockedUntil: number | null, reason: string | null): string => {
    if (lockedUntil === null) return '<td class="ok">—</td>';
    if (lockedUntil > now) {
      const mins = Math.ceil((lockedUntil - now) / 60);
      return `<td class="bad">locked (${mins}m${reason ? `, ${escapeHtml(reason)}` : ''})</td>`;
    }
    return '<td class="dim">expired</td>';
  };

  const aliasRows = report.aliases
    .map(
      a => `<tr>
        <td><code>${escapeHtml(a.slug)}</code></td>
        <td>${escapeHtml(a.role)}</td>
        ${lockCell(a.lockedUntil, a.lockReason)}
        <td class="dim">${a.failedAttempts}</td>
        <td class="dim">${escapeHtml(a.createdAt)}</td>
      </tr>`
    )
    .join('\n');

  const auditRows = report.audit
    .map(
      e => `<tr>
        <td class="dim">${escapeHtml(e.createdAt)}</td>
        <td><span class="ib-badge ${e.success ? 'ok' : 'bad'}">${escapeHtml(e.action)}</span></td>
        <td class="dim">${e.nodeId ? escapeHtml(e.nodeId as string) : '—'}</td>
        <td class="dim">${escapeHtml(e.ip ?? '—')}</td>
        <td>${e.impersonatorId ? '<span class="ib-badge warn">impersonated</span>' : ''}</td>
      </tr>`
    )
    .join('\n');

  const sessionRows = report.sessions
    .map(
      s => `<tr>
        <td class="dim"><code>${escapeHtml(s.nodeId as string)}</code></td>
        <td class="dim">${escapeHtml(s.createdAt)}</td>
        <td class="dim">${escapeHtml(new Date(s.expiresAt * 1000).toISOString())}</td>
        <td class="dim">${escapeHtml(s.ip ?? '—')}</td>
        <td class="dim">${escapeHtml((s.userAgent ?? '—').slice(0, 48))}</td>
        <td>${s.impersonatorId ? `<span class="ib-badge warn">by ${escapeHtml(s.impersonatorId as string)}</span>` : ''}</td>
      </tr>`
    )
    .join('\n');

  const anomalyLine = Object.entries(report.anomalyByAction)
    .map(([action, n]) => `${escapeHtml(action)} ×${n}`)
    .join(' · ');

  const body = report.empty
    ? `<div class="ib-panel ib-empty">
      <h2>No identity data yet</h2>
      <p>The accounts DB has no identity rows (or does not exist yet). Seed demo identities, then re-bake:</p>
      <p><code>bun tools/identity-admin.ts seed-demo</code><br/><code>bun tools/identity-board-bake.ts</code></p>
    </div>`
    : `<div class="ib-stats">
      ${stat('Aliases', c.aliases)}
      ${stat('Active sessions', c.activeSessions)}
      ${stat('Locked accounts', c.lockedAccounts, c.lockedAccounts ? 'bad' : 'ok')}
      ${stat('Anomalies 24h', c.anomalies24h, c.anomalies24h ? 'warn' : 'ok')}
    </div>
    ${anomalyLine ? `<p class="dim">24h signals: ${anomalyLine}</p>` : ''}
    <div class="ib-panel">
      <h2>Aliases</h2>
      <table class="ib-table">
        <thead><tr><th>Slug</th><th>Role</th><th>Lock</th><th>Failed</th><th>Created</th></tr></thead>
        <tbody>${aliasRows}</tbody>
      </table>
    </div>
    <div class="ib-panel">
      <h2>Active sessions</h2>
      <table class="ib-table">
        <thead><tr><th>Node</th><th>Created</th><th>Expires</th><th>IP</th><th>User agent</th><th>Impersonation</th></tr></thead>
        <tbody>${sessionRows || '<tr><td colspan="6" class="dim">No active sessions</td></tr>'}</tbody>
      </table>
    </div>
    <div class="ib-panel">
      <h2>Recent audit</h2>
      <table class="ib-table">
        <thead><tr><th>Time</th><th>Action</th><th>Node</th><th>IP</th><th></th></tr></thead>
        <tbody>${auditRows}</tbody>
      </table>
    </div>`;

  return `<!DOCTYPE html>
<!-- @see docs/portal-foundation.md — baked by tools/identity-board-bake.ts; do not edit -->
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="portal-poll-ms" content="60000" />
  <title>Identity · FactoryWager</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/portal/style.css" />
  <script type="application/json" id="identity-board-embed">${JSON.stringify(report)}</script>
  <style>
    .ib-wrap { max-width: 1200px; margin: 0 auto; padding: 0 24px 48px; }
    .ib-stats { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 10px; margin: 16px 0 20px; }
    .ib-stat { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px 14px; }
    .ib-stat .k { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: var(--text-dim); }
    .ib-stat .v { font-size: 22px; font-weight: 650; font-variant-numeric: tabular-nums; }
    .ib-stat.bad .v { color: var(--red, #f85149); }
    .ib-stat.warn .v { color: var(--yellow, #d29922); }
    .ib-stat.ok .v { color: var(--green, #3fb950); }
    .ib-panel { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px 18px; margin-bottom: 16px; }
    .ib-panel h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .5px; color: var(--text-dim); margin: 0 0 12px; }
    .ib-empty p { font-size: 13px; }
    .ib-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .ib-table th { text-align: left; padding: 6px 8px; color: var(--text-dim); font-weight: 500; border-bottom: 1px solid var(--border); }
    .ib-table td { padding: 6px 8px; border-bottom: 1px solid rgba(48,54,61,.4); vertical-align: top; }
    .ib-table td.ok { color: var(--green, #3fb950); }
    .ib-table td.bad { color: var(--red, #f85149); }
    .ib-badge { display: inline-block; padding: 1px 7px; border-radius: 999px; font-size: 11px; border: 1px solid var(--border); }
    .ib-badge.ok { color: var(--green, #3fb950); }
    .ib-badge.bad { color: var(--red, #f85149); }
    .ib-badge.warn { color: var(--yellow, #d29922); }
    .dim { color: var(--text-dim); font-size: 11px; }
  </style>
</head>
<body>
  <nav id="tenant-sidebar" class="tenant-sidebar" aria-label="Tenants"></nav>
  <header class="topbar">
    <div class="topbar-inner">
      <h1 class="logo">
        <span class="logo-icon">■</span>
        <span class="brand-wordmark">FactoryWager</span>
        <span class="brand-badge">ops</span>
        <span class="logo-page">Identity</span>
      </h1>
      <nav class="topbar-nav" aria-label="Primary"></nav>
    </div>
  </header>
  <main class="ib-wrap">
    <p class="dim">Accounts DB (<code>data/accounts-operations.db</code>) · generated ${escapeHtml(report.generatedAt)} · <code>bun run identity:board</code></p>
    ${body}
    <p class="dim">Credentials and session tokens are never baked — this board selects export-safe columns only (<code>lib/identity/board.ts</code>). Operator actions: <code>bun tools/identity-admin.ts</code>. Machine report: <a href="/registry/identity-board.json">/registry/identity-board.json</a>.</p>
  </main>
  <script type="module" src="/portal/data.js"></script>
  <script type="module" src="/portal/topbar.js"></script>
  <script type="module" src="/portal/components/sidebar.js"></script>
  <script type="module" src="/portal/components/notification.js"></script>
  <script type="module" src="/portal/components/footer.js"></script>
</body>
</html>
`;
}

async function main(): Promise<void> {
  const report = collectBoardData(DB_PATH);
  await Bun.write(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await Bun.write(OUT_HTML, renderHtml(report));

  const c = report.counts;
  console.log(
    report.empty
      ? 'identity-board: empty (no identity data — run: bun tools/identity-admin.ts seed-demo)'
      : `identity-board: ${c.aliases} aliases · ${c.activeSessions} sessions · ${c.lockedAccounts} locked · ${c.anomalies24h} anomalies/24h`
  );
  console.log(`baked: ${OUT_JSON}`);
  console.log(`baked: ${OUT_HTML}`);
}

if (import.meta.main) {
  await main();
}
