#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://developers.cloudflare.com/api/resources/user/subresources/tokens/methods/verify/ — token lifecycle response
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Vault health bake — cross-references config/vault-map.toml env refs against
 * LIVE Proton Pass item states, writes:
 *   public/registry/vault-health.json   (machine report)
 *   public/portal/vault/index.html      (baked board / visual summary)
 *
 * Exits 1 when any env-referenced item is missing or trashed (purge time-bomb
 * detector), or when `pass-cli item list` fails for a referenced vault
 * (fail-closed — never treat list failure as an empty vault) unless --no-fail.
 * Requires an agent session:
 *   source scripts/agent-env.sh factorywager && bun run vault:health:bake
 *
 * CI gate (no live vault): portal-cli vault health → tests/vault-health.test.ts
 * snapshots (inventory + report shape). Dashboard reflects bake; gate is snap.
 */
import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import { joinPath } from '../lib/path-bun.ts';
import { escapeHtml } from '../lib/escape-html.ts';
import {
  escHtml,
  renderPortalPanel,
  renderPortalStatGrid,
  renderPortalTable,
} from '../lib/portal/ui-html.ts';
import { buildVaultMapBundle } from '../lib/security/vault-map.ts';
import {
  computeVaultHealth,
  liveItemsFromListJson,
  type TokenProbe,
  type VaultLiveItem,
  type VaultRefInput,
} from '../lib/security/vault-health.ts';
import { checkPatVaultMatrix, probePassSession } from '../lib/security/pass-session.ts';
import { capturePassCli } from './portal-secret.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('vault:health:bake', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const ROOT = joinPath(import.meta.dir, '..');
const OUT_JSON = joinPath(ROOT, 'public', 'registry', 'vault-health.json');
const OUT_HTML = joinPath(ROOT, 'public', 'portal', 'vault', 'index.html');
const NO_FAIL = argv.includes('--no-fail');

export type VaultListResult = { ok: true; items: VaultLiveItem[] } | { ok: false; code: number };

/** Cloudflare token-bearing env keys probed via /user/tokens/verify (401 = expired). */
const CLOUDFLARE_TOKEN_KEYS = [
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_DNS_API_TOKEN',
  'CLOUDFLARE_ACCESS_API_TOKEN',
] as const;
type CloudflareTokenEnvKey = (typeof CLOUDFLARE_TOKEN_KEYS)[number];

export type CloudflareTokenVerifyPayload = {
  success?: boolean;
  result?: { status?: string };
};

/** Interpret both HTTP transport and Cloudflare's token lifecycle response. */
export function classifyCloudflareTokenVerify(
  statusCode: number,
  payload: CloudflareTokenVerifyPayload | null
): TokenProbe['status'] {
  if (statusCode === 408 || statusCode === 425 || statusCode === 429 || statusCode >= 500) {
    return 'unreachable';
  }
  if (statusCode >= 400) return 'invalid';
  if (payload?.result?.status === 'disabled' || payload?.result?.status === 'expired') {
    return 'invalid';
  }
  if (payload?.success === true && payload.result?.status === 'active') return 'ok';
  return 'unreachable';
}

/** Probe a Cloudflare token value against the tokens/verify endpoint. */
async function probeCloudflareToken(envKey: CloudflareTokenEnvKey): Promise<TokenProbe> {
  const token = Bun.env[envKey];
  const checkedAt = new Date().toISOString();
  if (!token) {
    return { envKey, kind: 'cloudflare', status: 'unreachable', statusCode: null, checkedAt };
  }
  try {
    const res = await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = (await res.json().catch(() => null)) as CloudflareTokenVerifyPayload | null;
    return {
      envKey,
      kind: 'cloudflare',
      status: classifyCloudflareTokenVerify(res.status, payload),
      statusCode: res.status,
      checkedAt,
    };
  } catch {
    return { envKey, kind: 'cloudflare', status: 'unreachable', statusCode: null, checkedAt };
  }
}

/** Probe all configured Cloudflare tokens (catches expired 401 before deploys fail). */
async function probeCloudflareTokens(): Promise<TokenProbe[]> {
  const probes: TokenProbe[] = [];
  for (const key of CLOUDFLARE_TOKEN_KEYS) {
    if (Bun.env[key]) probes.push(await probeCloudflareToken(key));
  }
  return probes;
}

/** Live `item list` for one vault — fail closed on non-zero exit (do not invent empty). */
export async function fetchVaultItems(vault: string): Promise<VaultListResult> {
  const { code, stdout } = await capturePassCli(['item', 'list', vault, '--output', 'json']);
  if (code !== 0) {
    return { ok: false, code };
  }
  return { ok: true, items: liveItemsFromListJson(stdout) };
}

/** Export for unit/manual re-render of the vault board template. */
export function renderHtml(
  report: ReturnType<typeof computeVaultHealth>,
  listFailures: string[] = []
): string {
  const s = report.summary;
  const issues = report.referenced.filter(r => r.status !== 'ok');
  const tokenRows = report.tokenProbes.map(p => [
    p.envKey,
    p.status.toUpperCase(),
    p.statusCode ?? '—',
  ]);
  const tokenBlock =
    report.tokenProbes.length === 0
      ? ''
      : renderPortalPanel(
          'Token probes (live verify against issuer)',
          renderPortalTable(['Env key', 'Status', 'HTTP'], tokenRows, { zebra: true }),
          s.tokensInvalid > 0
            ? { title: 'expired/disabled tokens fail the health gate' }
            : s.tokensUnreachable > 0
              ? { title: 'issuer unreachable; token validity was not scored' }
              : undefined
        );
  const gateCls = s.healthy && listFailures.length === 0 ? 'pass' : 'fail';
  const gateLabel =
    listFailures.length > 0
      ? 'list failed'
      : s.tokensInvalid > 0
        ? 'token invalid'
        : s.healthy
          ? 'healthy'
          : 'purge risk';

  const issuesTable = renderPortalTable(
    [
      { key: 'env', label: 'Env key' },
      { key: 'vault', label: 'Vault' },
      { key: 'item', label: 'Item' },
      { key: 'status', label: 'Status' },
    ],
    issues.map(r => [r.envKey, r.vault, r.item, r.status.toUpperCase()]),
    {
      className: 'vh-table',
      density: 'compact',
      emptyMessage: 'All env-referenced items resolve Active ✓',
      rowClass: i => (issues[i]!.status === 'trashed' ? 'bad' : 'warn'),
    }
  );

  const vaultsTable = renderPortalTable(
    [
      { key: 'name', label: 'Vault' },
      { key: 'active', label: 'Active' },
      { key: 'trashed', label: 'Trashed' },
      { key: 'titles', label: 'Trashed titles' },
    ],
    report.vaults.map(v => [
      v.name,
      v.active,
      { html: String(v.trashed), className: v.trashed ? 'bad' : '' },
      { html: escHtml(v.trashedTitles.join(', ') || '—'), className: 'dim' },
    ]),
    { className: 'vh-table', density: 'compact', emptyMessage: 'No vaults' }
  );

  const listFailBlock = listFailures.length
    ? renderPortalPanel(
        'Vault list failures (fail-closed)',
        `<p class="bad">Could not list: ${escHtml(listFailures.join(', '))}.</p>`,
        { desc: 'Refs for these vaults are not trusted until list succeeds.' }
      )
    : '';

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
    /* Specialty tones only — base table from .portal-table */
    .portal-table.vh-table td.bad, .portal-table.vh-table tr.bad td { color: var(--red, #f85149); }
    .portal-table.vh-table tr.warn td { color: var(--yellow, #d29922); }
    .portal-table.vh-table td.ok { color: var(--green, #3fb950); }
    .dim { color: var(--text-dim); font-size: 11px; }
    .bad { color: var(--red, #f85149); }
    .portal-stat { cursor: default; }
    .portal-stat:hover { transform: none; box-shadow: none; }
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
  <main class="portal-page">
    <section class="portal-hero portal-hero--card" aria-labelledby="vh-hero-title">
      <p class="portal-eyebrow">Proton Pass · env refs</p>
      <h2 id="vh-hero-title">Vault health — titles and states only</h2>
      <p class="hero-sub">
        Live Pass inventory crossed with vault-map env references. No secret values
        are read or stored. Offline gate: <code>portal-cli vault health</code>.
      </p>
      <div class="portal-hero-meta">
        <span class="portal-gate ${gateCls}" aria-live="polite"><span class="dot" aria-hidden="true"></span>${gateLabel}</span>
        <span class="portal-baked">generated ${escapeHtml(report.generatedAt)}</span>
        <div class="portal-source-links" aria-label="Related artifacts">
          <a href="/registry/vault-health.json">vault-health.json</a>
          <a href="/portal/env/">env</a>
          <a href="/portal/env/#partner-env-panel">partners env</a>
          <a href="/portal/doctor/">doctor</a>
        </div>
      </div>
    </section>
    <p class="dim">Inventory SSOT <code>tests/__snapshots__/vault-health.test.ts.snap</code> · intentional drift <code>--update</code> · bake <code>bun run vault:health:bake</code></p>
    <div class="portal-stat-grid" aria-label="Vault summary">
      ${renderPortalStatGrid([
        { label: 'Vaults', value: s.vaultCount },
        { label: 'Active items', value: s.activeItems },
        { label: 'Trashed items', value: s.trashedItems, tone: s.trashedItems ? 'bad' : 'ok' },
        {
          label: 'Refs trashed',
          value: s.referencedTrashed,
          tone: s.referencedTrashed ? 'bad' : 'ok',
        },
        {
          label: 'Refs missing',
          value: s.referencedMissing,
          tone: s.referencedMissing ? 'bad' : 'ok',
        },
        {
          label: 'Tokens invalid',
          value: s.tokensInvalid,
          tone: s.tokensInvalid ? 'bad' : 'ok',
        },
        {
          label: 'Token probes unavailable',
          value: s.tokensUnreachable,
          tone: s.tokensUnreachable ? 'warn' : 'ok',
        },
      ])}
    </div>
    ${tokenBlock}
    ${listFailBlock}
    ${renderPortalPanel('Referenced-item issues (purge risk)', issuesTable, {
      desc: 'Env keys whose Pass items are missing or trashed.',
    })}
    ${renderPortalPanel('Vaults', vaultsTable, {
      desc: 'Active vs trashed item counts per vault.',
    })}
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
  const session = await probePassSession({ listVaults: true });
  if (!session.ready) {
    console.error(
      'UNHEALTHY: Pass session not ready — source scripts/agent-env.sh factorywager' +
        (session.infoError ? ` (${session.infoError})` : '')
    );
    console.error('Proof: pass-cli info --output json (not `test` alone)');
    if (!NO_FAIL) process.exit(1);
  } else {
    const matrix = checkPatVaultMatrix(session.patName, session.vaults);
    console.log(
      `session: PAT=${session.patName} vaults=${session.vaults.join(',') || '(none)'}` +
        (matrix.expected.length
          ? ` expected=${matrix.expected.join(',')} matrix=${matrix.ok ? 'ok' : 'MISSING'}`
          : '')
    );
    if (!matrix.ok) {
      console.error(
        `UNHEALTHY: PAT "${session.patName}" cannot see expected vault(s): ${matrix.missing.join(', ')}`
      );
      if (!NO_FAIL) process.exit(1);
    }
  }

  const bundle = await buildVaultMapBundle();
  const refs: VaultRefInput[] = bundle.entries
    .filter(e => e.vault && e.item)
    .map(e => ({ envKey: e.envKey, vault: e.vault, item: e.item }));

  const vaultNames = [...new Set(refs.map(r => r.vault!))].sort();
  const liveByVault = new Map<string, VaultLiveItem[]>();
  const listFailures: string[] = [];
  for (const vault of vaultNames) {
    const result = await fetchVaultItems(vault);
    if (!result.ok) {
      listFailures.push(vault);
      console.error(`error: item list failed for vault "${vault}" (exit ${result.code})`);
      // Fail-closed: do NOT insert an empty list — that would invent referencedMissing.
      continue;
    }
    liveByVault.set(vault, result.items);
  }

  const failedVaults = new Set(listFailures);
  // Score refs only for vaults we successfully listed; list failures fail the bake below.
  const scoredRefs = refs.filter(r => r.vault && !failedVaults.has(r.vault));
  const tokenProbes = await probeCloudflareTokens();
  const report = computeVaultHealth(scoredRefs, liveByVault, undefined, { tokenProbes });
  if (listFailures.length > 0) {
    report.summary.healthy = false;
  }

  await Bun.write(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await Bun.write(OUT_HTML, renderHtml(report, listFailures));

  const s = report.summary;
  console.log(
    `vault-health: ${s.vaultCount} vaults · ${s.activeItems} active · ${s.trashedItems} trashed · ` +
      `refs ok=${s.referencedOk} trashed=${s.referencedTrashed} missing=${s.referencedMissing}` +
      ` · tokens ok=${s.tokensOk} invalid=${s.tokensInvalid} unreachable=${s.tokensUnreachable}` +
      (listFailures.length ? ` · listFailed=${listFailures.join(',')}` : '')
  );
  for (const r of report.referenced.filter(r => r.status !== 'ok')) {
    console.error(`  ⚠️  ${r.envKey} → ${r.vault}/${r.item} — ${r.status.toUpperCase()}`);
  }
  for (const p of report.tokenProbes.filter(p => p.status !== 'ok')) {
    console.error(
      `  ⚠️  ${p.envKey} — token ${p.status.toUpperCase()}${p.statusCode ? ` (HTTP ${p.statusCode})` : ''}`
    );
  }
  console.log(`baked: ${OUT_JSON}`);
  console.log(`baked: ${OUT_HTML}`);

  if ((!s.healthy || listFailures.length > 0) && !NO_FAIL) {
    if (listFailures.length > 0) {
      console.error(
        `UNHEALTHY: pass-cli item list failed for vault(s): ${listFailures.join(', ')} (fail-closed).`
      );
    } else if (s.tokensInvalid > 0) {
      console.error(`UNHEALTHY: ${s.tokensInvalid} Cloudflare token probe(s) invalid or expired.`);
    } else {
      console.error('UNHEALTHY: env-referenced items are missing or trashed (purge risk).');
    }
    process.exit(1);
  }
}

if (isModuleEntrypoint(import.meta)) {
  await main();
}
