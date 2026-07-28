#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
/**
 * Vault health bake — cross-references config/vault-map.toml env refs against
 * LIVE Proton Pass item states, writes:
 *   public/registry/vault-health.json   (machine report)
 *   public/portal/vault/index.html      (baked board / visual summary)
 *
 * Exits 1 when any env-referenced item is missing or trashed (purge time-bomb
 * detector) unless --no-fail. Requires an agent session:
 *   source scripts/agent-env.sh factorywager && bun run vault:health:bake
 *
 * CI gate (no live vault): portal-cli vault health → tests/vault-health.test.ts
 * snapshots (inventory + report shape). Dashboard reflects bake; gate is snap.
 */
import { joinPath } from '../lib/path-bun.ts';
import { escapeHtml } from '../lib/escape-html.ts';
import { buildVaultMapBundle } from '../lib/security/vault-map.ts';
import {
  computeVaultHealth,
  liveItemsFromListJson,
  type VaultLiveItem,
  type VaultRefInput,
} from '../lib/security/vault-health.ts';
import { capturePassCli } from './portal-secret.ts';

const ROOT = joinPath(import.meta.dir, '..');
const OUT_JSON = joinPath(ROOT, 'public', 'registry', 'vault-health.json');
const OUT_HTML = joinPath(ROOT, 'public', 'portal', 'vault', 'index.html');
const NO_FAIL = Bun.argv.includes('--no-fail');

async function fetchVaultItems(vault: string): Promise<VaultLiveItem[]> {
  const { code, stdout } = await capturePassCli(['item', 'list', vault, '--output', 'json']);
  if (code !== 0) {
    console.error(`warn: item list failed for vault "${vault}" (exit ${code}) — treating as empty`);
    return [];
  }
  return liveItemsFromListJson(stdout);
}

function renderHtml(report: ReturnType<typeof computeVaultHealth>): string {
  const s = report.summary;
  const issues = report.referenced.filter(r => r.status !== 'ok');
  const stat = (k: string, v: number, cls = '') =>
    `<div class="vh-stat ${cls}"><div class="k">${k}</div><div class="v">${v}</div></div>`;
  const vaultRows = report.vaults
    .map(
      v => `<tr>
        <td>${escapeHtml(v.name)}</td><td>${v.active}</td>
        <td class="${v.trashed ? 'bad' : ''}">${v.trashed}</td>
        <td class="dim">${escapeHtml(v.trashedTitles.join(', ') || '—')}</td>
      </tr>`
    )
    .join('\n');
  const issueRows = issues.length
    ? issues
        .map(
          r => `<tr class="${r.status === 'trashed' ? 'bad' : 'warn'}">
            <td>${escapeHtml(r.envKey)}</td><td>${escapeHtml(r.vault)}</td>
            <td>${escapeHtml(r.item)}</td><td>${r.status.toUpperCase()}</td>
          </tr>`
        )
        .join('\n')
    : '<tr><td colspan="4" class="ok">All env-referenced items resolve Active ✓</td></tr>';

  return `<!DOCTYPE html>
<!-- @see docs/portal-foundation.md — baked by tools/vault-health-bake.ts; do not edit -->
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="portal-poll-ms" content="60000" />
  <title>Vault · FactoryWager</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/portal/style.css" />
  <script type="application/json" id="vault-health-embed">${JSON.stringify(report)}</script>
  <style>
    .vh-wrap { max-width: 1000px; margin: 0 auto; padding: 0 24px 48px; }
    .vh-stats { display: grid; grid-template-columns: repeat(5, minmax(0,1fr)); gap: 10px; margin: 16px 0 20px; }
    .vh-stat { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px 14px; }
    .vh-stat .k { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: var(--text-dim); }
    .vh-stat .v { font-size: 22px; font-weight: 650; font-variant-numeric: tabular-nums; }
    .vh-stat.bad .v { color: var(--red, #f85149); }
    .vh-stat.ok .v { color: var(--green, #3fb950); }
    .vh-panel { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px 18px; margin-bottom: 16px; }
    .vh-panel h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .5px; color: var(--text-dim); margin: 0 0 12px; }
    .vh-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .vh-table th { text-align: left; padding: 6px 8px; color: var(--text-dim); font-weight: 500; border-bottom: 1px solid var(--border); }
    .vh-table td { padding: 6px 8px; border-bottom: 1px solid rgba(48,54,61,.4); }
    .vh-table td.bad, .vh-table tr.bad td { color: var(--red, #f85149); }
    .vh-table tr.warn td { color: var(--yellow, #d29922); }
    .vh-table td.ok { color: var(--green, #3fb950); }
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
        <span class="logo-page">Vault</span>
      </h1>
      <nav class="topbar-nav" aria-label="Primary"></nav>
    </div>
  </header>
  <main class="vh-wrap">
    <p class="dim">Proton Pass live state × env references · generated ${escapeHtml(report.generatedAt)} · <code>bun run vault:health:bake</code></p>
    <div class="vh-stats">
      ${stat('Vaults', s.vaultCount)}
      ${stat('Active items', s.activeItems)}
      ${stat('Trashed items', s.trashedItems, s.trashedItems ? 'bad' : 'ok')}
      ${stat('Refs trashed', s.referencedTrashed, s.referencedTrashed ? 'bad' : 'ok')}
      ${stat('Refs missing', s.referencedMissing, s.referencedMissing ? 'bad' : 'ok')}
    </div>
    <div class="vh-panel">
      <h2>Referenced-item issues (purge risk)</h2>
      <table class="vh-table">
        <thead><tr><th>Env key</th><th>Vault</th><th>Item</th><th>Status</th></tr></thead>
        <tbody>${issueRows}</tbody>
      </table>
    </div>
    <div class="vh-panel">
      <h2>Vaults</h2>
      <table class="vh-table">
        <thead><tr><th>Vault</th><th>Active</th><th>Trashed</th><th>Trashed titles</th></tr></thead>
        <tbody>${vaultRows}</tbody>
      </table>
    </div>
    <p class="dim">No secret values are read or stored by this bake — titles and states only.</p>
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
  const bundle = await buildVaultMapBundle();
  const refs: VaultRefInput[] = bundle.entries
    .filter(e => e.vault && e.item)
    .map(e => ({ envKey: e.envKey, vault: e.vault, item: e.item }));

  const vaultNames = [...new Set(refs.map(r => r.vault!))].sort();
  const liveByVault = new Map<string, VaultLiveItem[]>();
  for (const vault of vaultNames) {
    liveByVault.set(vault, await fetchVaultItems(vault));
  }

  const report = computeVaultHealth(refs, liveByVault);
  await Bun.write(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await Bun.write(OUT_HTML, renderHtml(report));

  const s = report.summary;
  console.log(
    `vault-health: ${s.vaultCount} vaults · ${s.activeItems} active · ${s.trashedItems} trashed · ` +
      `refs ok=${s.referencedOk} trashed=${s.referencedTrashed} missing=${s.referencedMissing}`
  );
  for (const r of report.referenced.filter(r => r.status !== 'ok')) {
    console.error(`  ⚠️  ${r.envKey} → ${r.vault}/${r.item} — ${r.status.toUpperCase()}`);
  }
  console.log(`baked: ${OUT_JSON}`);
  console.log(`baked: ${OUT_HTML}`);

  if (!s.healthy && !NO_FAIL) {
    console.error('UNHEALTHY: env-referenced items are missing or trashed (purge risk).');
    process.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
