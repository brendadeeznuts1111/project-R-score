/**
 * TOC Ops portal — Drum / rails / warmup / Soft / Gate 12 from baked snapshot.
 * Embed-first (Pages), then /api/toc, then /registry/toc-ops.json.
 */
function parseEmbed() {
  const el = document.getElementById('toc-embed');
  if (!el?.textContent?.trim()) return null;
  try {
    return JSON.parse(el.textContent);
  } catch {
    return null;
  }
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const ct = res.headers.get('content-type') || '';
  if (!res.ok || !ct.includes('json')) {
    throw new Error(`${url} → ${res.status} ${ct || 'no-content-type'}`);
  }
  return res.json();
}

async function loadToc() {
  const embed = parseEmbed();
  if (embed?.partners) {
    return { mode: 'embed', data: embed };
  }
  try {
    const data = await fetchJson('/api/toc');
    return { mode: data.mode || 'api', data };
  } catch {
    const data = await fetchJson('/registry/toc-ops.json');
    return { mode: 'registry', data };
  }
}

function money(n) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);
}

function pill(text, kind) {
  return `<span class="toc-pill toc-pill-${kind || 'dim'}">${text}</span>`;
}

function render(root, { mode, data }) {
  const s = data.summary || {};
  const buf = data.buffer || {};
  const partners = data.partners || [];

  root.innerHTML = `
    <div class="toc-head">
      <div>
        <h2 class="toc-title">TOC Ops · Drum / Buffer / Rope</h2>
        <p class="toc-sub">Primed accounts, rails, Soft Balance, Gate 12 — fixture for build-out. Theory SSOT in toc-ops-repo.</p>
      </div>
      <div class="toc-mode ${mode === 'embed' ? 'snapshot' : mode}">
        <span class="toc-mode-pill">${mode === 'embed' ? 'Snapshot' : mode === 'api' ? 'API' : 'Registry'}</span>
        <span class="toc-mode-time">${data.generatedAt || '—'}</span>
      </div>
    </div>

    <div class="toc-stats">
      <div class="toc-stat ok"><span class="k">WARMED</span><span class="v">${s.warmed ?? 0}</span></div>
      <div class="toc-stat"><span class="k">Warming</span><span class="v">${s.warming ?? 0}</span></div>
      <div class="toc-stat"><span class="k">Playable drums</span><span class="v">${buf.playableDrums ?? 0}</span></div>
      <div class="toc-stat"><span class="k">Confirmed rails</span><span class="v">${s.confirmedRails ?? 0}</span></div>
      <div class="toc-stat ${s.openBottlenecks ? 'hot' : ''}"><span class="k">Open bottlenecks</span><span class="v">${s.openBottlenecks ?? 0}</span></div>
      <div class="toc-stat"><span class="k">Principal out</span><span class="v">${money(s.principalOutstandingTotal)}</span></div>
    </div>

    <div class="toc-buffer">
      <strong>Buffer</strong>
      float ${money(buf.houseFloatHard)} / ${money(buf.floatTarget)}
      (${Math.round((buf.floatRatio || 0) * 100)}% · ${buf.floatTargetSource || 'static'})
      · settlement float ${Math.round((buf.settlementFloatRatio || 0) * 100)}%
      ${buf.throttleOnboarding ? pill('ONBOARD_THROTTLED', 'hot') : pill('onboard ok', 'ok')}
    </div>

    <div class="toc-partners">
      ${partners
        .map(p => {
          const open = (p.openTasks || []).filter(t => t.status !== 'Completed');
          const bn = (p.bottlenecks || []).filter(b => !b.resolvedAt);
          return `
        <article class="toc-partner">
          <header>
            <h3>${p.partnerCode} ${pill(p.status, p.status === 'Ready' ? 'ok' : 'dim')}</h3>
            <div class="toc-sub">readiness ${(p.readiness?.score ?? 0).toFixed(2)} · playable ${p.readiness?.playableAccountCount ?? 0} · split ${p.package?.partnerPct}/${p.package?.expertPct}/${p.package?.housePct}</div>
          </header>
          <div class="toc-cols">
            <section>
              <h4>Rails</h4>
              <ul>${(p.rails || [])
                .map(
                  r =>
                    `<li><code>${r.label}</code> ${r.confirmed ? pill('confirmed', 'ok') : pill('unconfirmed', 'hot')}</li>`
                )
                .join('')}</ul>
            </section>
            <section>
              <h4>Accounts</h4>
              <ul>${(p.accounts || [])
                .map(a => {
                  const g12 =
                    a.gate12?.housePrincipalOutstanding > 0
                      ? pill(`Gate12 ${money(a.gate12.housePrincipalOutstanding)}`, 'hot')
                      : pill(a.gate12?.withdrawalMode || '—', 'dim');
                  return `<li><code>${a.callSign}</code> ${pill(a.status, a.status === 'WARMED' ? 'ok' : 'dim')} warm ${a.warmupCount}/2 · ${a.capitalLocation} ${money(a.hardBalance)} ${g12}</li>`;
                })
                .join('')}</ul>
            </section>
            <section>
              <h4>Open tasks (Ball-in-Court)</h4>
              <ul>${
                open.length
                  ? open
                      .map(
                        t =>
                          `<li>${pill(t.taskType, 'dim')} <code>${t.callSign}</code> → <strong>${t.ballInCourt}</strong> · ${t.status}<div class="toc-sub">${t.nextAction}</div></li>`
                      )
                      .join('')
                  : '<li class="toc-sub">None</li>'
              }</ul>
            </section>
            <section>
              <h4>Soft Balance</h4>
              <ul>
                <li>House ${money(p.softBalance?.byStakeholder?.House)}</li>
                <li>Partner ${money(p.softBalance?.byStakeholder?.Partner)}</li>
                <li>Expert ${money(p.softBalance?.byStakeholder?.Expert)}</li>
              </ul>
            </section>
            <section>
              <h4>Bottlenecks</h4>
              <ul>${
                bn.length
                  ? bn
                      .map(
                        b =>
                          `<li>${pill(b.severity, b.severity === 'critical' ? 'hot' : 'dim')} <code>${b.ruleKey}</code><div class="toc-sub">${b.nextAction}</div></li>`
                      )
                      .join('')
                  : '<li class="toc-sub">None open</li>'
              }</ul>
            </section>
          </div>
        </article>`;
        })
        .join('')}
    </div>

    <p class="toc-foot">
      Fixture path <a href="/registry/toc-ops.json"><code>/registry/toc-ops.json</code></a>
      · API <a href="/api/toc"><code>/api/toc</code></a>
      · Seed <code>bun run ops:seed:toc</code>
    </p>
  `;
}

export async function mountTocDashboard(selector = '#toc-app') {
  const root = document.querySelector(selector);
  if (!root) return;
  root.innerHTML = `<div class="skeleton skeleton-card" aria-busy="true"><div class="skeleton-line" style="width:40%"></div><div class="skeleton-line" style="width:70%"></div></div>`;
  try {
    const loaded = await loadToc();
    render(root, loaded);
  } catch (e) {
    root.innerHTML = `<div class="ops-error"><p>Could not load TOC Ops fixture.</p><p class="toc-sub">${e instanceof Error ? e.message : String(e)}</p><p class="toc-sub">Run <code>bun run ops:seed:toc && bun run ops:snapshot --no-routing</code></p></div>`;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => mountTocDashboard());
} else {
  mountTocDashboard();
}
