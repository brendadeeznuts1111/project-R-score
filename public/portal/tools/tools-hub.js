/**
 * Tools hub — baked-data freshness, last snapshot widget, copy-to-clipboard for CLI.
 * Static Pages only: no Bun.spawn from the browser.
 */

const BAKES = [
  {
    id: 'packages',
    label: 'packages-graph-map',
    href: '/registry/packages-graph-map.json',
    board: '/portal/packages/',
    cli: 'bun run portal-cli pm graph',
  },
  {
    id: 'failures',
    label: 'failures',
    href: '/registry/failures.json',
    board: '/portal/failures/',
    cli: 'bun run failures:bake',
  },
  {
    id: 'vault-health',
    label: 'vault-health',
    href: '/registry/vault-health.json',
    board: '/portal/vault/',
    cli: 'bun run vault:health:bake',
  },
  {
    id: 'vault-map',
    label: 'vault-map',
    href: '/registry/vault-map.json',
    board: '/portal/env/',
    cli: 'bun run portal-cli secret map',
  },
  {
    id: 'monorepo-health',
    label: 'monorepo-health',
    href: '/registry/monorepo-health.json',
    board: '/portal/health/',
    cli: 'bun run monorepo:health:bake',
  },
  {
    id: 'ops-summary',
    label: 'ops-summary',
    href: '/registry/ops-summary.json',
    board: '/portal/ops/',
    cli: 'bun run ops:snapshot --no-routing',
  },
];

function ageLabel(iso) {
  if (!iso) return '—';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  const mins = Math.round((Date.now() - t) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago · ${iso.slice(0, 10)}`;
}

async function fetchJson(url) {
  try {
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, data: await res.json() };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}

function pickGeneratedAt(data) {
  return data?.generatedAt || data?.generated || data?.capturedAt || null;
}

async function fillBakeStatus() {
  const tbody = document.getElementById('bake-status-body');
  if (!tbody) return;
  const rows = await Promise.all(
    BAKES.map(async b => {
      const r = await fetchJson(b.href);
      if (!r.ok) {
        return `<tr class="warn"><td>${b.label}</td><td class="dim">missing (${r.status ?? 'err'})</td><td><a href="${b.board}">board</a></td><td><button type="button" class="copy-cli" data-cli="${b.cli}">copy bake</button></td></tr>`;
      }
      const at = pickGeneratedAt(r.data);
      let extra = '';
      if (b.id === 'failures' && r.data?.totals) {
        extra = ` · failures=${r.data.totals.failures ?? 0}`;
      }
      if (b.id === 'packages' && Array.isArray(r.data?.packages)) {
        extra = ` · pkgs=${r.data.packages.length} · grade=${r.data.grade ?? '—'}`;
      }
      if (b.id === 'vault-health' && r.data?.summary) {
        const s = r.data.summary;
        extra = ` · active=${s.activeItems ?? '—'} · healthy=${s.healthy ?? '—'}`;
      }
      return `<tr><td><a href="${b.href}">${b.label}</a></td><td>${ageLabel(at)}${extra}</td><td><a href="${b.board}">board</a></td><td><button type="button" class="copy-cli" data-cli="${b.cli}">copy</button></td></tr>`;
    })
  );
  tbody.innerHTML = rows.join('');
}

/**
 * Last snapshots — best-effort. Prefer public registry if present; else local path is not on Pages.
 */
async function fillSnapshotWidget() {
  const el = document.getElementById('snapshot-widget');
  if (!el) return;
  // Optional bake path (not required) — fail soft to CLI hint
  // Real public artifact only (no phantom portal-snapshot-last.json)
  const url = '/registry/catalog-snapshot.json';
  const r = await fetchJson(url);
  if (r.ok && r.data) {
    const n = Array.isArray(r.data?.accounts)
      ? r.data.accounts.length
      : r.data?.summary?.accounts ?? '—';
    el.innerHTML = `<p class="dim">Catalog snapshot · accounts=${n} · <a href="${url}">JSON</a> · generated ${ageLabel(pickGeneratedAt(r.data))}</p>
      <p class="dim">Scope snapshots (local tree, not Pages):
      <button type="button" class="copy-cli" data-cli="bun run portal-cli snapshot list">copy</button>
      <code>portal-cli snapshot list</code> ·
      <button type="button" class="copy-cli" data-cli="bun run portal-cli snapshot last --scope prediction">copy</button>
      <code>portal-cli snapshot last --scope prediction</code></p>`;
    return;
  }
  el.innerHTML = `<p class="dim">Catalog snapshot missing · scope snapshots live in local <code>snapshots/</code> (not Pages).</p>
    <p class="dim">List: <button type="button" class="copy-cli" data-cli="bun run portal-cli snapshot list">copy</button>
    <code>portal-cli snapshot list</code></p>`;
}

function bindCopyButtons(root = document) {
  root.querySelectorAll('.copy-cli').forEach(btn => {
    if (btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', async () => {
      const cmd = btn.getAttribute('data-cli') || btn.textContent?.trim() || '';
      try {
        await navigator.clipboard.writeText(cmd);
        const prev = btn.textContent;
        btn.textContent = 'copied';
        setTimeout(() => {
          btn.textContent = prev;
        }, 1200);
      } catch {
        btn.textContent = 'copy failed';
      }
    });
  });
}

/** Capability rows — grounded subset (AGENTS.md map). Not a full markdown parse. */
const CAPABILITY_ROWS = [
  ['Vault config (TOML)', 'import with { type: "toml" }', 'Available', 'config/vault-map.toml'],
  ['Secret inject', 'pass-cli inject -i/-o', 'Implemented', 'portal-cli secret inject'],
  ['Vault & item list', 'pass-cli vault list · item list', 'Implemented', 'portal-cli secret vaults'],
  ['Secret view', 'pass-cli item view', 'Implemented', 'portal-cli secret get'],
  ['Snapshot testing', 'expect().toMatchSnapshot()', 'Implemented', 'portal-cli vault health'],
  ['Update snapshots', 'bun test --update-snapshots', 'Implemented', 'portal-cli vault health --update'],
  ['Pack workspace', 'bun pm pack', 'Implemented', 'portal-cli pm pack'],
  ['List deps', 'bun pm ls', 'Implemented', 'portal-cli pm ls'],
  ['Packages graph', 'packages-graph-map bake', 'Implemented', 'portal-cli pm graph'],
  ['Spawn process', 'Bun.spawn', 'Implemented', 'portal-cli (all)'],
  ['ANSI color', 'Bun.color(hex, "ansi-16m")', 'Implemented', 'vault-map status lines'],
  ['File I/O', 'Bun.file · Bun.write', 'Implemented', 'bakes · snapshots'],
];

function fillCapabilityTable() {
  const tbody = document.getElementById('capability-body');
  if (!tbody) return;
  const q = (document.getElementById('capability-filter')?.value || '').toLowerCase();
  const rows = CAPABILITY_ROWS.filter(r => !q || r.join(' ').toLowerCase().includes(q));
  tbody.innerHTML = rows
    .map(
      ([cap, api, status, used]) =>
        `<tr><td>${cap}</td><td><code>${api}</code></td><td>${status}</td><td><code>${used}</code></td></tr>`
    )
    .join('');
}

export async function initToolsHub() {
  await fillBakeStatus();
  await fillSnapshotWidget();
  fillCapabilityTable();
  document.getElementById('capability-filter')?.addEventListener('input', fillCapabilityTable);
  bindCopyButtons();
  // Re-bind after dynamic rows
  const observer = new MutationObserver(() => bindCopyButtons());
  const bake = document.getElementById('bake-status-body');
  if (bake) observer.observe(bake, { childList: true });
  const snap = document.getElementById('snapshot-widget');
  if (snap) observer.observe(snap, { childList: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    void initToolsHub();
  });
} else {
  void initToolsHub();
}
