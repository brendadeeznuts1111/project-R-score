/**
 * Compliance portal board — loads baked registry snapshot (Pages-safe).
 * Prefer embed → /api/compliance → /registry/compliance-board.json
 * Auto-refresh every portal-poll-ms (default 60s). Click a row for expected/actual.
 */
function esc(s) {
  // Client-side escape (mirror Bun.escapeHTML entity set for portal XSS safety).
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function pollMs() {
  const meta = document.querySelector('meta[name="portal-poll-ms"]');
  const n = Number(meta?.content);
  return Number.isFinite(n) && n >= 5000 ? n : 60_000;
}

function readEmbed() {
  const el = document.getElementById('compliance-board-embed');
  if (!el?.textContent?.trim() || el.textContent.trim() === '{}') return null;
  try {
    return JSON.parse(el.textContent);
  } catch {
    return null;
  }
}

async function loadBoard() {
  const embed = readEmbed();
  if (embed?.schemaVersion === 1 && embed.enhancements) return { board: embed, source: 'embed' };

  for (const url of ['/api/compliance', '/registry/compliance-board.json']) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const board = await res.json();
      if (board?.schemaVersion === 1) return { board, source: url };
    } catch {
      /* try next */
    }
  }
  return { board: null, source: null };
}

function render(board, source) {
  const banner = document.getElementById('cmp-banner');
  const stats = document.getElementById('cmp-stats');
  if (!board) {
    banner.className = 'cmp-banner error';
    banner.textContent =
      'No compliance board artifact. Run: bun run compliance:bake · then deploy Pages.';
    return;
  }

  const enh = board.enhancements ?? {};
  const shadow = board.shadow ?? {};
  // Mirror isComplianceBoardOk (lib/monitoring/compliance-slice.ts)
  const passed = enh.passed ?? 0;
  const total = enh.total ?? 0;
  const mm = shadow.summary?.mismatches ?? 0;
  const integrityOk =
    !Array.isArray(board.integrity?.checks) ||
    board.integrity.checks.every(c => c?.ok !== false);
  const ok = total > 0 ? passed === total && mm === 0 && integrityOk : mm === 0 && integrityOk;

  banner.className = ok ? 'cmp-banner' : 'cmp-banner warn';
  banner.textContent = ok
    ? `Board healthy · source ${source} · generated ${board.generatedAt ?? '—'}`
    : `Board has failures · source ${source} · generated ${board.generatedAt ?? '—'}`;

  stats.hidden = false;
  document.getElementById('st-enh').textContent = `${enh.passed ?? 0}/${enh.total ?? 0}`;
  document.getElementById('st-allow').textContent = String(shadow.summary?.allow ?? '—');
  document.getElementById('st-block').textContent = String(shadow.summary?.block ?? '—');
  document.getElementById('st-mm').textContent = String(mm);
  document.getElementById('st-mm-wrap').className = mm > 0 ? 'cmp-stat bad' : 'cmp-stat ok';

  const enhBody = document.querySelector('#enh-table tbody');
  enhBody.innerHTML = (enh.rows ?? [])
    .map((r, i) => {
      const detailId = `enh-detail-${i}`;
      return `<tr class="${r.match ? 'pass' : 'fail'} enh-row" data-detail="${detailId}" style="cursor:pointer" title="Toggle expected/actual">
  <td>${esc(r.feature)}</td><td class="match">${r.match ? '✓' : '✗'}</td><td>${esc(r.notes)}</td>
</tr>
<tr id="${detailId}" class="enh-detail" hidden>
  <td colspan="3"><pre class="cmp-meta" style="white-space:pre-wrap;margin:0">${esc(JSON.stringify({ expected: r.expectedState, actual: r.actualState }, null, 2))}</pre></td>
</tr>`;
    })
    .join('');
  enhBody.querySelectorAll('.enh-row').forEach(tr => {
    tr.addEventListener('click', () => {
      const el = document.getElementById(tr.dataset.detail);
      if (el) el.hidden = !el.hidden;
    });
  });
  document.getElementById('enh-sig').textContent = `sha256 ${enh.signature ?? '—'} · depth ${enh.consoleDepth ?? '—'}`;

  const shBody = document.querySelector('#shadow-table tbody');
  shBody.innerHTML = (shadow.rows ?? [])
    .map(
      r =>
        `<tr class="${r.match ? 'pass' : 'fail'}"><td>${esc(r.state)}</td><td>${esc(r.partner)}</td><td>${esc(r.licenseStatus ?? 'unlicensed')}</td><td>${r.realAllowed ? 'ALLOW' : 'BLOCK'}</td><td>${r.shadowAllowed ? 'ALLOW' : 'BLOCK'}</td><td class="match">${r.match ? '✓' : '✗'}</td></tr>`
    )
    .join('');
  const shProof = shadow.proof;
  document.getElementById('shadow-sig').textContent = shProof
    ? `${shProof.algorithm} ${shProof.digest ?? shadow.signature ?? '—'} · base ${shadow.base ?? '—'}${shProof.hmac ? ' · HMAC set' : ''}`
    : `digest ${shadow.signature ?? '—'} · base ${shadow.base ?? '—'}`;

  // Integrity checklist
  const integrity = board.integrity ?? {};
  const intStats = document.getElementById('int-stats');
  if (intStats) {
    intStats.hidden = false;
    document.getElementById('st-int').textContent = integrity.scoreHint ?? '—';
  }
  const intBody = document.querySelector('#int-table tbody');
  if (intBody) {
    intBody.innerHTML = (integrity.checks ?? [])
      .map(
        c =>
          `<tr class="${c.ok ? 'pass' : 'fail'}"><td class="match">${c.ok ? '✓' : '○'}</td><td>${esc(c.label)}</td></tr>`
      )
      .join('');
  }
  const intSig = document.getElementById('int-sig');
  if (intSig && integrity.proof) {
    const p = integrity.proof;
    intSig.textContent = `${p.algorithm} ${p.digest ?? '—'} · bun ${p.bunVersion ?? '—'}${p.hmac ? ' · HMAC present' : ' · no HMAC (mint REPORT_SIGNING_SECRET)'}`;
  }

  // Geo discrete columns
  const geoBody = document.querySelector('#geo-table tbody');
  if (geoBody) {
    const partners = board.geo?.partners ?? [];
    geoBody.innerHTML = partners.length
      ? partners
          .map(
            p =>
              `<tr><td>${esc(p.nodeId)}</td><td>${esc(p.stateCode)}</td><td>${esc(p.age ?? '—')}</td><td>${esc(p.location ?? '—')}</td><td>${esc(p.zipCode ?? '—')}</td></tr>`
          )
          .join('')
      : '<tr><td colspan="5">Run bun run compliance:bake to populate geo profiles</td></tr>';
  }

  // ZIP day-window (deep audit proof)
  const zip = board.deepAudit?.zipWindow;
  const zipStats = document.getElementById('zip-stats');
  if (zipStats && zip) {
    zipStats.hidden = false;
    const okEl = document.getElementById('st-zip-ok');
    const wrap = document.getElementById('st-zip-ok-wrap');
    if (okEl) okEl.textContent = zip.ok ? `${zip.days}d ✓` : `${zip.days}d ✗`;
    if (wrap) wrap.className = zip.ok ? 'cmp-stat ok' : 'cmp-stat bad';
    const modeEl = document.getElementById('st-zip-mode');
    if (modeEl) modeEl.textContent = zip.mode ?? '—';
    const inEl = document.getElementById('st-zip-in');
    if (inEl) inEl.textContent = String(zip.inWindowPlays ?? '—');
    const totEl = document.getElementById('st-zip-total');
    if (totEl) totEl.textContent = String(zip.totalPlays ?? '—');
    const zipSig = document.getElementById('zip-sig');
    if (zipSig) {
      zipSig.textContent = `${zip.label ?? ''} · ${board.deepAudit?.command ?? 'bun run ops:audit:deep'}`;
    }
  }

  const proton = board.proton ?? {};
  document.getElementById('cmp-cmds').textContent = [
    '# Bake (offline-safe)',
    'bun run compliance:bake',
    'bun run compliance:verify',
    '',
    '# Vault inject + bake (Proton Pass → CLOUDFLARE_API_TOKEN for deploy)',
    proton.bakeVault ?? 'bun run compliance:bake:vault',
    proton.inject ?? 'bun run proton:inject:factorywager:reasonix',
    '',
    '# Report HMAC (mintable or vault item)',
    proton.reportSigning ?? 'bun run vault:gap:mint-local  # REPORT_SIGNING_SECRET',
    '# Optional: pass://factorywager/Report Signing Secret/password',
    '',
    '# Deploy Pages with vault',
    'bun run proton:deploy:pages',
    '',
    '# Local mock + deep audit + shadow report',
    'bun run ops:compliance:mock',
    'bun run ops:audit:deep',
    'bun run ops:compliance:report',
    '',
    '# Telegram /register with MA/NJ geo',
    '# /register <ref> <name> state=NJ age=28 zip=07102 loc=Newark idv=yes',
    '',
    '# Onboard with MA/NJ geo (code)',
    '# applyPartnerOnboardPackage(db, plan, { compliance: { stateCode: "NJ", age: 28, location: "Newark", zipCode: "07102" } })',
    proton.vaultMap ? `# Vault map: ${proton.vaultMap}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

async function tick() {
  const { board, source } = await loadBoard();
  render(board, source);
}

await tick();
setInterval(tick, pollMs());

// Prefer fresh registry over stale embed after first tick interval.
document.getElementById('cmp-banner')?.addEventListener('dblclick', () => {
  tick();
});
