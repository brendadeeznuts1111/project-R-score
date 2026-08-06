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
 * UI: lib/portal/ui-html.ts builders (portal-table / portal-stat / tone-chip).
 *
 *   bun run identity:board
 */
import { escapeHtml } from '../lib/escape-html.ts';
import { collectBoardData, type IdentityBoardData } from '../lib/identity/board.ts';
import { joinPath } from '../lib/path-bun.ts';
import {
  escHtml,
  renderPortalPanel,
  renderPortalStatGrid,
  renderPortalTable,
  renderToneChip,
  type PortalTableCell,
} from '../lib/portal/ui-html.ts';

const ROOT = joinPath(import.meta.dir, '..');
const DB_PATH = joinPath(ROOT, 'data', 'accounts-operations.db');
const OUT_JSON = joinPath(ROOT, 'public', 'registry', 'identity-board.json');
const OUT_HTML = joinPath(ROOT, 'public', 'portal', 'identity', 'index.html');

function lockCell(lockedUntil: number | null, reason: string | null, now: number): PortalTableCell {
  if (lockedUntil === null) return { html: '<span class="ok">—</span>' };
  if (lockedUntil > now) {
    const mins = Math.ceil((lockedUntil - now) / 60);
    const suffix = reason ? `, ${escHtml(reason)}` : '';
    return { html: `<span class="bad">locked (${mins}m${suffix})</span>` };
  }
  return { html: '<span class="dim">expired</span>', className: 'dim' };
}

function renderHtml(report: IdentityBoardData): string {
  const c = report.counts;
  const now = Math.floor(Date.now() / 1000);

  const anomalyLine = Object.entries(report.anomalyByAction)
    .map(([action, n]) => `${escHtml(action)} ×${n}`)
    .join(' · ');

  const body = report.empty
    ? renderPortalPanel(
        'No identity data yet',
        `<p>The accounts DB has no identity rows (or does not exist yet). Seed demo identities, then re-bake:</p>
      <p><code>bun tools/identity-admin.ts seed-demo</code><br/><code>bun tools/identity-board-bake.ts</code></p>`
      )
    : `${renderPortalStatGrid([
        { label: 'Aliases', value: c.aliases },
        { label: 'Active sessions', value: c.activeSessions },
        {
          label: 'Locked accounts',
          value: c.lockedAccounts,
          tone: c.lockedAccounts ? 'bad' : 'ok',
        },
        {
          label: 'Anomalies 24h',
          value: c.anomalies24h,
          tone: c.anomalies24h ? 'warn' : 'ok',
        },
      ])}
    ${anomalyLine ? `<p class="dim">24h signals: ${anomalyLine}</p>` : ''}
    ${renderPortalPanel(
      'Aliases',
      renderPortalTable(
        [
          { key: 'slug', label: 'Slug' },
          { key: 'role', label: 'Role' },
          { key: 'lock', label: 'Lock' },
          { key: 'failed', label: 'Failed' },
          { key: 'created', label: 'Created' },
        ],
        report.aliases.map(a => [
          { html: `<code>${escHtml(a.slug)}</code>` },
          a.role,
          lockCell(a.lockedUntil, a.lockReason, now),
          { html: String(a.failedAttempts), className: 'dim' },
          { html: escHtml(a.createdAt), className: 'dim' },
        ]),
        { density: 'compact', emptyMessage: 'No aliases' }
      )
    )}
    ${renderPortalPanel(
      'Active sessions',
      renderPortalTable(
        [
          { key: 'node', label: 'Node' },
          { key: 'created', label: 'Created' },
          { key: 'expires', label: 'Expires' },
          { key: 'ip', label: 'IP' },
          { key: 'ua', label: 'User agent' },
          { key: 'imp', label: 'Impersonation' },
        ],
        report.sessions.map(s => [
          { html: `<code>${escHtml(s.nodeId as string)}</code>`, className: 'dim' },
          { html: escHtml(s.createdAt), className: 'dim' },
          {
            html: escHtml(new Date(s.expiresAt * 1000).toISOString()),
            className: 'dim',
          },
          { html: escHtml(s.ip ?? '—'), className: 'dim' },
          { html: escHtml((s.userAgent ?? '—').slice(0, 48)), className: 'dim' },
          s.impersonatorId
            ? {
                html: renderToneChip(`by ${s.impersonatorId as string}`, 'warn'),
              }
            : null,
        ]),
        { density: 'compact', emptyMessage: 'No active sessions' }
      )
    )}
    ${renderPortalPanel(
      'Recent audit',
      renderPortalTable(
        [
          { key: 'time', label: 'Time' },
          { key: 'action', label: 'Action' },
          { key: 'node', label: 'Node' },
          { key: 'ip', label: 'IP' },
          { key: 'note', label: '' },
        ],
        report.audit.map(e => [
          { html: escHtml(e.createdAt), className: 'dim' },
          {
            html: renderToneChip(e.action, e.success ? 'ok' : 'bad'),
          },
          {
            html: e.nodeId ? escHtml(e.nodeId as string) : '—',
            className: 'dim',
          },
          { html: escHtml(e.ip ?? '—'), className: 'dim' },
          e.impersonatorId ? { html: renderToneChip('impersonated', 'warn') } : null,
        ]),
        { density: 'compact', emptyMessage: 'No audit rows' }
      )
    )}`;

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
</head>
<body>
  <nav id="tenant-sidebar" class="tenant-sidebar" aria-label="Tenants"></nav>
  <header class="topbar">
    <div class="topbar-inner">
      <h1 class="logo">
        <span class="logo-icon" aria-hidden="true"></span>
        <span class="brand-wordmark">FactoryWager</span>
        <span class="brand-badge">ops</span>
        <span class="logo-page">Identity</span>
      </h1>
      <nav class="topbar-nav" aria-label="Primary"></nav>
    </div>
  </header>
  <main class="portal-page">
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
