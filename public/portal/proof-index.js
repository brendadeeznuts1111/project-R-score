/**
 * Document-plane proof + verification pins (surfaces orphan "document" family).
 * Not product boards — operator proof index linked from health / wiki.
 * @see docs/harness/PROOF.md
 * @see public/registry/packages-graph-map.json surfaces.registry.orphanTriage
 */

/** @typedef {{ path: string, file: string, label: string, family: 'proof'|'verification', note: string }} ProofIndexEntry */

/** @type {ProofIndexEntry[]} */
export const DOCUMENT_PROOF_ENTRIES = [
  {
    path: '/registry/formdata-proof.json',
    file: 'formdata-proof.json',
    label: 'FormData',
    family: 'proof',
    note: 'multipart wire matrix',
  },
  {
    path: '/registry/networking-channel-proof.json',
    file: 'networking-channel-proof.json',
    label: 'Networking channel',
    family: 'proof',
    note: 'channel-aware verification',
  },
  {
    path: '/registry/verification-pinned-1.3.14.json',
    file: 'verification-pinned-1.3.14.json',
    label: 'Pinned 1.3.14',
    family: 'verification',
    note: 'historical pin',
  },
  {
    path: '/registry/verification-stable-1.4.0.json',
    file: 'verification-stable-1.4.0.json',
    label: 'Stable 1.4.0',
    family: 'verification',
    note: 'stable channel rollup',
  },
  {
    path: '/registry/verification-stable-1.4.0-bundler.json',
    file: 'verification-stable-1.4.0-bundler.json',
    label: 'Stable 1.4.0 bundler',
    family: 'verification',
    note: 'bundler slice',
  },
  {
    path: '/registry/verification-stable-1.4.0-networking.json',
    file: 'verification-stable-1.4.0-networking.json',
    label: 'Stable 1.4.0 networking',
    family: 'verification',
    note: 'networking slice',
  },
];

/**
 * @param {string} s
 */
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Static HTML list (no fetch) — good for SSR-free shells and wiki parity.
 * @param {ProofIndexEntry[]} [entries]
 */
export function renderProofIndexLinksHtml(entries = DOCUMENT_PROOF_ENTRIES) {
  return (
    '<ul class="proof-index-list">' +
    entries
      .map(
        e =>
          `<li><a href="${esc(e.path)}"><code>${esc(e.file)}</code></a>` +
          ` · <span class="proof-fam">${esc(e.family)}</span>` +
          ` — ${esc(e.note)}</li>`
      )
      .join('') +
    '</ul>'
  );
}

/**
 * Probe each bake with a lightweight GET; show ok/missing next to links.
 * @param {HTMLElement | null} host
 * @param {{ signal?: AbortSignal }} [opts]
 */
export async function mountProofIndex(host, opts = {}) {
  if (!host) return { ok: 0, total: DOCUMENT_PROOF_ENTRIES.length };
  host.innerHTML =
    '<p class="section-sub">Loading verification pins…</p>' + renderProofIndexLinksHtml();

  let ok = 0;
  const rows = await Promise.all(
    DOCUMENT_PROOF_ENTRIES.map(async e => {
      try {
        const res = await fetch(e.path, {
          cache: 'no-store',
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
          signal: opts.signal ?? AbortSignal.timeout(6000),
        });
        if (!res.ok) {
          return { ...e, status: `HTTP ${res.status}`, ok: false };
        }
        const j = await res.json();
        ok++;
        // Best-effort summary line from known shapes
        let detail = e.note;
        if (j.allOk === true) detail = 'allOk';
        else if (j.allOk === false) detail = 'allOk=false';
        else if (j.bunVersion) detail = `Bun ${j.bunVersion}`;
        else if (j.summary?.pass != null && j.summary?.total != null) {
          detail = `${j.summary.pass}/${j.summary.total} pass`;
        } else if (j.type) detail = String(j.type);
        return { ...e, status: detail, ok: true };
      } catch (err) {
        return {
          ...e,
          status: err instanceof Error ? err.message : String(err),
          ok: false,
        };
      }
    })
  );

  host.innerHTML =
    `<p class="section-sub">${ok}/${rows.length} pins reachable · document-plane bakes (not product boards) · ` +
    `<a href="/registry/verification-index.json"><code>verification-index.json</code></a> · ` +
    `<a href="https://wiki.factory-wager.com/wiki-index.html#registry-artifacts-key-bakes">wiki registry</a></p>` +
    '<ul class="proof-index-list">' +
    rows
      .map(e => {
        const cls = e.ok ? 'st-ok' : 'st-bad';
        return (
          `<li><a href="${esc(e.path)}"><code>${esc(e.file)}</code></a>` +
          ` · <span class="proof-fam">${esc(e.family)}</span>` +
          ` · <span class="${cls}">${esc(e.status)}</span></li>`
        );
      })
      .join('') +
    '</ul>';

  return { ok, total: rows.length };
}
