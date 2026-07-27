/**
 * Compliance portal board — loads baked registry snapshot (Pages-safe).
 * Prefer embed → /api/compliance → /registry/compliance-board.json
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
  const ok =
    (enh.passed ?? 0) === (enh.total ?? 0) && (shadow.summary?.mismatches ?? 0) === 0;

  banner.className = ok ? 'cmp-banner' : 'cmp-banner warn';
  banner.textContent = ok
    ? `Board healthy · source ${source} · generated ${board.generatedAt ?? '—'}`
    : `Board has failures · source ${source} · generated ${board.generatedAt ?? '—'}`;

  stats.hidden = false;
  document.getElementById('st-enh').textContent = `${enh.passed ?? 0}/${enh.total ?? 0}`;
  document.getElementById('st-allow').textContent = String(shadow.summary?.allow ?? '—');
  document.getElementById('st-block').textContent = String(shadow.summary?.block ?? '—');
  const mm = shadow.summary?.mismatches ?? 0;
  document.getElementById('st-mm').textContent = String(mm);
  document.getElementById('st-mm-wrap').className = mm > 0 ? 'cmp-stat bad' : 'cmp-stat ok';

  const enhBody = document.querySelector('#enh-table tbody');
  enhBody.innerHTML = (enh.rows ?? [])
    .map(
      r =>
        `<tr class="${r.match ? 'pass' : 'fail'}"><td>${esc(r.feature)}</td><td class="match">${r.match ? '✓' : '✗'}</td><td>${esc(r.notes)}</td></tr>`
    )
    .join('');
  document.getElementById('enh-sig').textContent = `sha256 ${enh.signature ?? '—'} · depth ${enh.consoleDepth ?? '—'}`;

  const shBody = document.querySelector('#shadow-table tbody');
  shBody.innerHTML = (shadow.rows ?? [])
    .map(
      r =>
        `<tr class="${r.match ? 'pass' : 'fail'}"><td>${esc(r.state)}</td><td>${esc(r.partner)}</td><td>${esc(r.licenseStatus ?? 'unlicensed')}</td><td>${r.realAllowed ? 'ALLOW' : 'BLOCK'}</td><td>${r.shadowAllowed ? 'ALLOW' : 'BLOCK'}</td><td class="match">${r.match ? '✓' : '✗'}</td></tr>`
    )
    .join('');
  document.getElementById('shadow-sig').textContent = `sha256 ${shadow.signature ?? '—'} · base ${shadow.base ?? '—'}`;

  const proton = board.proton ?? {};
  document.getElementById('cmp-cmds').textContent = [
    '# Bake (offline-safe)',
    'bun run compliance:bake',
    '',
    '# Vault inject + bake (Proton Pass → CLOUDFLARE_API_TOKEN for deploy)',
    proton.bakeVault ?? 'bun run proton:run -- factorywager -- bun run compliance:bake',
    proton.inject ?? 'bun run proton:inject:factorywager:reasonix',
    '',
    '# Deploy Pages with vault',
    'bun run proton:deploy:pages',
    '',
    '# Local mock + status',
    'bun run ops:compliance:mock',
    'bun run ops:compliance:status',
  ].join('\n');
}

const { board, source } = await loadBoard();
render(board, source);
