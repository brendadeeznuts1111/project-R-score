/**
 * TOC Ops portal — Drum / rails / warmup / Soft / Gate 12 / ONB / plays / experiments.
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

function freshnessPill(f) {
  if (f === 'fresh') return pill('limits fresh', 'ok');
  if (f === 'stale') return pill('limits stale', 'hot');
  return pill('limits unknown', 'dim');
}

function renderExperiments(experiments) {
  if (!experiments?.length) return '';
  return `
    <section class="toc-experiments">
      <h3>Experiments</h3>
      <div class="toc-exp-grid">
        ${experiments
          .map(
            e => `
          <article class="toc-exp">
            <header>
              <strong>${e.name}</strong>
              ${pill(e.status, e.status === 'active' ? 'ok' : 'dim')}
              ${pill(`phase ${e.phase}`, 'dim')}
              ${pill(e.designMethod, 'dim')}
            </header>
            <p class="toc-sub">${e.hypothesis}</p>
            <ul>
              ${(e.assignments || [])
                .map(
                  a =>
                    `<li><code>${a.partnerCode}</code> → <strong>${a.variantKey}</strong>${
                      a.metricValue != null ? ` · metric ${a.metricValue}` : ''
                    }</li>`
                )
                .join('')}
            </ul>
          </article>`
          )
          .join('')}
      </div>
    </section>`;
}

function renderPlays(plays) {
  if (!plays?.length) return '<li class="toc-sub">No recent plays</li>';
  return plays
    .map(p => {
      const res =
        p.status === 'blocked'
          ? pill('blocked', 'hot')
          : p.result === 'win'
            ? pill('win', 'ok')
            : p.result === 'pending'
              ? pill('pending', 'dim')
              : pill(p.result || p.status, 'dim');
      return `<li>
        <code>${p.callSign}</code> ${p.market} ${p.selection} @ ${p.odds}
        · stake ${money(p.stake)} ${res}
        ${p.variantKey ? pill(`exp:${p.variantKey}`, 'dim') : ''}
        ${p.blockedReason ? `<div class="toc-sub">${p.blockedReason}</div>` : ''}
        ${p.pnl != null ? `<div class="toc-sub">pnl ${money(p.pnl)}</div>` : ''}
      </li>`;
    })
    .join('');
}

function render(root, { mode, data }) {
  const s = data.summary || {};
  const buf = data.buffer || {};
  const partners = data.partners || [];
  const catalog = data.catalog || {};
  const flow = (catalog.flowOrder || ['ONB', 'FUND', 'LIMIT', 'WARM', 'PLAY', 'WD']).join(' → ');

  const identity = data.identity;
  const plane = data.plane || 'demo-readonly';

  root.innerHTML = `
    <div class="toc-banner" role="status">
      <strong>DEMO · read-only</strong>
      Soft Balance, Hard Gates, and DoD are <em>not</em> enforced on Pages.
      ${identity?.linked ? `Identity linked: ${identity.linkedPartners} partners · ${identity.linkedAccounts} accounts · ${identity.linkedRails} rails.` : 'Identity not linked — run <code>bun run ops:seed:toc -- --force</code> with ops DB.'}
      Operate via toc-ops-repo <code>ct</code> or local bun-only APIs.
    </div>

    <div class="toc-head">
      <div>
        <h2 class="toc-title">TOC Ops · Drum / Buffer / Rope</h2>
        <p class="toc-sub">ONB→PLAY storyboard + ops identity bridge. Theory SSOT in toc-ops-repo — this plane does not redefine Soft/T/I/OE.</p>
        <p class="toc-flow">${flow}</p>
      </div>
      <div class="toc-mode ${mode === 'embed' ? 'snapshot' : mode}">
        <span class="toc-mode-pill">${plane}</span>
        <span class="toc-mode-pill">${mode === 'embed' ? 'Snapshot' : mode === 'api' ? 'API' : 'Registry'}</span>
        <span class="toc-mode-time">${data.generatedAt || '—'}</span>
      </div>
    </div>

    ${
      identity
        ? `<section class="toc-identity">
      <h3>Identity bridge (TOC ↔ ops)</h3>
      <ul class="toc-identity-list">
        ${(identity.partners || [])
          .map(
            p => `<li>
              <code>${p.partnerCode}</code>
              ${p.linked ? pill('linked', 'ok') : pill('unlinked', 'hot')}
              ${p.opsName ? `→ <strong>${p.opsName}</strong>` : ''}
              ${p.treeNodeId ? `<span class="toc-sub mono">${p.treeNodeId.slice(0, 8)}…</span>` : ''}
              ${p.lifecycleStatus ? pill(p.lifecycleStatus, 'dim') : ''}
              <div class="toc-sub">${(p.accounts || [])
                .map(
                  a =>
                    `${a.callSign}${a.sbAccountId ? `↔${a.book || 'acct'}` : ' (no sb)'}${
                      a.balance != null ? ` $${Math.round(a.balance)}` : ''
                    }`
                )
                .join(' · ')}</div>
            </li>`
          )
          .join('')}
      </ul>
    </section>`
        : ''
    }

    <div class="toc-stats">
      <div class="toc-stat ok"><span class="k">WARMED</span><span class="v">${s.warmed ?? 0}</span></div>
      <div class="toc-stat"><span class="k">Warming</span><span class="v">${s.warming ?? 0}</span></div>
      <div class="toc-stat"><span class="k">Onboarding</span><span class="v">${s.onboarding ?? 0}</span></div>
      <div class="toc-stat"><span class="k">Playable</span><span class="v">${buf.playableDrums ?? 0}</span></div>
      <div class="toc-stat"><span class="k">Rails ok / pending</span><span class="v">${s.confirmedRails ?? 0}/${s.unconfirmedRails ?? 0}</span></div>
      <div class="toc-stat"><span class="k">ONB / LIMIT</span><span class="v">${s.openOnb ?? 0}/${s.openLimit ?? 0}</span></div>
      <div class="toc-stat"><span class="k">Plays pend/set</span><span class="v">${s.playsPending ?? 0}/${s.playsSettled ?? 0}</span></div>
      <div class="toc-stat ${s.openBottlenecks ? 'hot' : ''}"><span class="k">Bottlenecks</span><span class="v">${s.openBottlenecks ?? 0}</span></div>
    </div>

    <div class="toc-buffer">
      <strong>Buffer</strong>
      float ${money(buf.houseFloatHard)} / ${money(buf.floatTarget)}
      (${Math.round((buf.floatRatio || 0) * 100)}% · ${buf.floatTargetSource || 'static'})
      · deposit corridor ${money(catalog.depositCorridor?.min)}–${money(catalog.depositCorridor?.max)}
      · limit freshness ${catalog.limitFreshnessDays ?? 7}d
      ${buf.throttleOnboarding ? pill('ONBOARD_THROTTLED', 'hot') : pill('onboard ok', 'ok')}
      ${pill(`${s.activeExperiments ?? 0} active exp`, s.activeExperiments ? 'ok' : 'dim')}
    </div>

    ${renderExperiments(data.experiments)}

    <div class="toc-partners">
      ${partners
        .map(p => {
          const open = (p.openTasks || []).filter(t => t.status !== 'Completed');
          const bn = (p.bottlenecks || []).filter(b => !b.resolvedAt);
          const exp = p.experimentAssignment;
          return `
        <article class="toc-partner">
          <header>
            <h3>${p.partnerCode} ${pill(p.status, p.status === 'Ready' ? 'ok' : p.status === 'Onboarding' ? 'hot' : 'dim')} ${pill(p.flowStage, 'dim')}</h3>
            <div class="toc-sub">readiness ${(p.readiness?.score ?? 0).toFixed(2)} · playable ${p.readiness?.playableAccountCount ?? 0} · split ${p.package?.partnerPct}/${p.package?.expertPct}/${p.package?.housePct}${
              exp ? ` · exp ${exp.variantKey} (${exp.metricValue})` : ''
            }</div>
          </header>
          <div class="toc-cols">
            <section>
              <h4>Rails</h4>
              <ul>${(p.rails || [])
                .map(
                  r =>
                    `<li><code>${r.label}</code> ${r.confirmed ? pill('confirmed', 'ok') : pill('unconfirmed', 'hot')}${
                      r.dailyLimit != null ? `<div class="toc-sub">daily ${money(r.dailyLimit)} · monthly ${money(r.monthlyLimit)}</div>` : ''
                    }</li>`
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
                  return `<li><code>${a.callSign}</code> ${pill(a.status, a.status === 'WARMED' ? 'ok' : 'dim')} ${pill(a.flowStage, 'dim')}
                    warm ${a.warmupCount}/2 · ${a.capitalLocation} ${money(a.hardBalance)} ${g12}
                    <div class="toc-sub">${freshnessPill(a.limits?.freshness)}${
                      a.limits?.dailyMax != null
                        ? ` daily ${money(a.limits.dailyMax)} / weekly ${money(a.limits.weeklyMax)}`
                        : ''
                    }</div>
                  </li>`;
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
              <h4>Plays / bets</h4>
              <ul>${renderPlays(p.recentPlays)}</ul>
            </section>
            <section>
              <h4>Soft Balance</h4>
              <ul>
                <li>House ${money(p.softBalance?.byStakeholder?.House)}</li>
                <li>Partner ${money(p.softBalance?.byStakeholder?.Partner)}</li>
                <li>Expert ${money(p.softBalance?.byStakeholder?.Expert)}</li>
                ${
                  p.softBalance?.pendingDeployments?.count
                    ? `<li class="toc-sub">pending deploy ${p.softBalance.pendingDeployments.count} · ${money(p.softBalance.pendingDeployments.totalAmount)}</li>`
                    : ''
                }
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
      Fixture <a href="/registry/toc-ops.json"><code>/registry/toc-ops.json</code></a>
      · API <a href="/api/toc"><code>/api/toc</code></a>
      · Seed <code>bun run ops:seed:toc -- --force</code>
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
    root.innerHTML = `<div class="ops-error"><p>Could not load TOC Ops fixture.</p><p class="toc-sub">${e instanceof Error ? e.message : String(e)}</p><p class="toc-sub">Run <code>bun run ops:seed:toc -- --force && bun run ops:snapshot --no-routing</code></p></div>`;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => mountTocDashboard());
} else {
  mountTocDashboard();
}
