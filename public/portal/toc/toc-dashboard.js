/**
 * TOC Ops portal — Drum / Buffer / Rope board.
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

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pill(text, kind) {
  return `<span class="toc-pill toc-pill-${kind || 'dim'}">${esc(text)}</span>`;
}

function freshnessPill(f) {
  if (f === 'fresh') return pill('limits fresh', 'ok');
  if (f === 'stale') return pill('limits stale', 'hot');
  return pill('limits unknown', 'dim');
}

function sectionHead(title, blurb) {
  return `<header class="toc-section-head">
    <h3>${esc(title)}</h3>
    ${blurb ? `<p class="toc-section-blurb">${esc(blurb)}</p>` : ''}
  </header>`;
}

function fact(dt, dd) {
  return `<div class="toc-fact"><dt>${esc(dt)}</dt><dd>${dd}</dd></div>`;
}

function renderAgentBrief({ mode, data, plane, enf, flow, identity }) {
  const focus = enf?.diagnosis?.focus ?? '—';
  const linked = identity?.linked
    ? `${identity.linkedPartners} partners / ${identity.linkedAccounts} accounts`
    : 'unlinked';
  const lines = [
    `plane: ${plane}`,
    `eval: ${enf?.plane ?? 'none'}`,
    `focus: ${focus}`,
    `gates_failed: ${enf?.failed ?? 0}`,
    `gates_critical: ${enf?.criticalFailed ?? 0}`,
    `T: ${enf?.throughput?.T ?? 0}`,
    `I: ${enf?.throughput?.I ?? 0}`,
    `OE: ${enf?.throughput?.OE ?? 0}`,
    `identity: ${linked}`,
    `source: ${mode}`,
    `artifact: /registry/toc-ops.json`,
    `api: GET /api/toc · POST 503`,
    `mutations: off-Pages (toc-ops-repo ct / local bun)`,
    `flow: ${flow}`,
    `generated_at: ${data.generatedAt || '—'}`,
  ];
  return `<aside class="toc-agent" aria-label="Agent brief">
    <header class="toc-section-head">
      <h3>Agent brief</h3>
      <p class="toc-section-blurb">Machine-readable plane facts. Theory SSOT stays in toc-ops-repo.</p>
    </header>
    <pre class="toc-agent-pre" id="toc-agent-brief">${esc(lines.join('\n'))}</pre>
  </aside>`;
}

function renderHero({ mode, data, plane, enf, flow }) {
  const focus = enf?.diagnosis?.focus;
  const focusKind = focus === 'rope' ? 'hot' : focus === 'elevate' ? 'ok' : 'dim';
  return `<header class="toc-hero">
    <p class="toc-eyebrow">TOC Ops</p>
    <h2 class="toc-title">Drum · Buffer · Rope</h2>
    <p class="toc-lede">Baked partner-desk mirror for Pages. Soft posts and DoD closes stay local or in <code>ct</code>.</p>
    <dl class="toc-facts">
      ${fact('Plane', `<code>${esc(plane)}</code>${enf ? ` · <code>${esc(enf.plane)}</code>` : ''}`)}
      ${fact('Constraint', focus ? pill(focus, focusKind) : '—')}
      ${fact('Flow', `<span class="toc-flow">${esc(flow)}</span>`)}
      ${fact('Source', esc(mode === 'embed' ? 'snapshot embed' : mode))}
      ${fact('Generated', `<time datetime="${esc(data.generatedAt || '')}">${esc(data.generatedAt || '—')}</time>`)}
      ${fact('Artifact', `<a href="/registry/toc-ops.json"><code>/registry/toc-ops.json</code></a>`)}
    </dl>
  </header>`;
}

function renderEnforcement(enf) {
  if (!enf) {
    return `<section class="toc-section" id="constraint">
      ${sectionHead('Constraint', 'No operate-lite bake yet — run ops:seed:toc --force')}
    </section>`;
  }
  const d = enf.diagnosis || {};
  const t = enf.throughput || {};
  const fails = (enf.gates || []).filter(g => !g.ok);
  const focusKind = d.focus === 'rope' || d.ropeBroken ? 'hot' : d.focus === 'elevate' ? 'ok' : 'dim';
  return `
    <section class="toc-section" id="constraint">
      ${sectionHead('Constraint', d.summary || 'Rope → Drum → Buffer → Elevate')}
      <div class="toc-enf-head">
        ${pill(`focus ${d.focus || '—'}`, focusKind)}
        ${pill(`${enf.passed ?? 0} pass`, 'ok')}
        ${pill(`${enf.failed ?? 0} fail`, enf.failed ? 'hot' : 'dim')}
        ${pill(`${enf.criticalFailed ?? 0} critical`, enf.criticalFailed ? 'hot' : 'dim')}
      </div>
      <div class="toc-tioe" aria-label="Throughput T I OE">
        <div class="toc-stat"><span class="k">T · realized split</span><span class="v">${money(t.T)}</span></div>
        <div class="toc-stat"><span class="k">I · inventory</span><span class="v">${money(t.I)}</span></div>
        <div class="toc-stat"><span class="k">OE · priming + loss</span><span class="v">${money(t.OE)}</span></div>
      </div>
      <h4 class="toc-subhead">Open Hard Gates</h4>
      <ul class="toc-gate-list">
        ${
          fails.length
            ? fails
                .slice(0, 12)
                .map(
                  g =>
                    `<li>
                      ${pill(g.severity, g.severity === 'critical' ? 'hot' : 'dim')}
                      <code>${esc(g.gateId)}</code>
                      <code>${esc(g.callSign || g.partnerCode)}</code>
                      ${g.tag ? pill(g.tag, 'hot') : ''}
                      <div class="toc-sub">${esc(g.reason)}</div>
                    </li>`
                )
                .join('')
            : '<li class="toc-sub">All evaluated gates pass</li>'
        }
      </ul>
    </section>`;
}

function fmtRP(n) {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  const v = Number(n);
  if (v >= 1e5) return '∞';
  if (v >= 10) return v.toFixed(1);
  if (v >= 1) return v.toFixed(2);
  return v.toFixed(4);
}

function renderIdentity(identity) {
  if (!identity) return '';
  return `<section class="toc-section" id="identity">
    ${sectionHead('Identity', 'TOC partner codes bound to FactoryWager ops nodes')}
    <ul class="toc-identity-list">
      ${(identity.partners || [])
        .map(
          p => `<li>
            <div class="toc-identity-row">
              <code>${esc(p.partnerCode)}</code>
              ${p.linked ? pill('linked', 'ok') : pill('unlinked', 'hot')}
              ${p.opsName ? `<strong>${esc(p.opsName)}</strong>` : ''}
              ${p.lifecycleStatus ? pill(p.lifecycleStatus, 'dim') : ''}
            </div>
            <div class="toc-sub">${(p.accounts || [])
              .map(
                a =>
                  `${esc(a.callSign)}${a.sbAccountId ? ` ↔ ${esc(a.book || 'acct')}` : ' (no sb)'}${
                    a.balance != null ? ` · $${Math.round(a.balance)}` : ''
                  }`
              )
              .join(' · ')}</div>
          </li>`
        )
        .join('')}
    </ul>
  </section>`;
}

function renderExperiments(experiments) {
  if (!experiments?.length) return '';
  return `
    <section class="toc-section" id="experiments">
      ${sectionHead('Experiments', 'Switchback / factorial assignments on partners')}
      <div class="toc-exp-grid">
        ${experiments
          .map(
            e => `
          <article class="toc-exp">
            <header>
              <strong>${esc(e.name)}</strong>
              ${pill(e.status, e.status === 'active' ? 'ok' : 'dim')}
              ${pill(`phase ${e.phase}`, 'dim')}
              ${pill(e.designMethod, 'dim')}
            </header>
            <p class="toc-sub">${esc(e.hypothesis)}</p>
            <ul>
              ${(e.assignments || [])
                .map(
                  a =>
                    `<li><code>${esc(a.partnerCode)}</code> → <strong>${esc(a.variantKey)}</strong>${
                      a.metricValue != null ? ` · ${esc(a.metricValue)}` : ''
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
        <code>${esc(p.callSign)}</code> ${esc(p.market)} ${esc(p.selection)} @ ${esc(p.odds)}
        · stake ${money(p.stake)} ${res}
        ${p.variantKey ? pill(`exp:${p.variantKey}`, 'dim') : ''}
        ${p.blockedReason ? `<div class="toc-sub">${esc(p.blockedReason)}</div>` : ''}
        ${p.pnl != null ? `<div class="toc-sub">pnl ${money(p.pnl)}</div>` : ''}
      </li>`;
    })
    .join('');
}

function renderReturnEfficiency(re, ranked, buf) {
  if (!re && !ranked?.length) {
    return `<section class="toc-section" id="return-efficiency">
      ${sectionHead('Return efficiency', 'No R_P / CE bake — reseed with ops:seed:toc --force')}
    </section>`;
  }
  const procRank = re?.processTypeAvgRP
    ? Object.entries(re.processTypeAvgRP).filter(([, rp]) => Number.isFinite(Number(rp)))
    : [];
  const top = (ranked || []).slice(0, 8);
  const assets = (re?.byAsset || []).slice(0, 6);
  return `<section class="toc-section" id="return-efficiency">
    ${sectionHead('Return efficiency', 'R_P · CE · LE from Soft ProfitSplit — not ops-loop LCR')}
    <div class="toc-enf-head">
      ${pill(`avg R_P ${fmtRP(re?.avgRP)}`, 'ok')}
      ${top[0] ? pill(`next ${top[0].process} ${top[0].callSign}`, 'hot') : ''}
      ${pill(`settlement ${Math.round((buf?.settlementFloatRatio ?? 0) * 100)}%`, 'dim')}
      ${pill(buf?.floatTargetSource || 'static', 'dim')}
    </div>
    ${
      procRank.length
        ? `<table class="toc-rp-table"><thead><tr><th>Process</th><th>avg R_P</th></tr></thead><tbody>${procRank
            .map(
              ([proc, rp]) =>
                `<tr><td><code>${esc(proc)}</code></td><td>${fmtRP(rp)}</td></tr>`
            )
            .join('')}</tbody></table>`
        : ''
    }
    <div class="toc-cols" style="margin-top:12px">
      <section>
        <h4 class="toc-subhead">Ranked next actions</h4>
        <ul class="toc-rank-list">
          ${
            top.length
              ? top
                  .map(
                    a =>
                      `<li>#${a.rank} ${pill(a.process, a.ropeSafe ? 'ok' : 'hot')} <code>${esc(a.callSign)}</code>
                      R_P ${fmtRP(a.rP)}${a.weightedScore != null ? ` · w ${Number(a.weightedScore).toFixed(2)}` : ''}
                      ${a.ropeSafe ? '' : pill('rope blocked', 'hot')}
                      <div class="toc-sub">${esc(a.reason)}</div></li>`
                  )
                  .join('')
              : '<li class="toc-sub">No ranked actions</li>'
          }
        </ul>
      </section>
      <section>
        <h4 class="toc-subhead">Asset CE</h4>
        <ul class="toc-rank-list">
          ${
            assets.length
              ? assets
                  .map(
                    a =>
                      `<li><code>${esc(a.callSign)}</code> CE ${fmtRP(a.ce)}
                        <div class="toc-sub">PS ${money(a.profitSplitTotal)} / peak ${money(a.peakCapital)} · ${Number(a.capitalDaysInI).toFixed(1)}d in I</div></li>`
                  )
                  .join('')
              : '<li class="toc-sub">No assets</li>'
          }
        </ul>
      </section>
    </div>
  </section>`;
}

function renderPartners(partners, assetBySign, limitBySign) {
  return `<section class="toc-section" id="partners">
    ${sectionHead('Partners', 'ASH Drum · PAT PLAY · NOV ONB')}
    <div class="toc-partners">
      ${partners
        .map(p => {
          const open = (p.openTasks || []).filter(t => t.status !== 'Completed');
          const bn = (p.bottlenecks || []).filter(b => !b.resolvedAt);
          const exp = p.experimentAssignment;
          const statusKind =
            p.status === 'Ready' ? 'ok' : p.status === 'Onboarding' ? 'hot' : 'dim';
          return `
        <article class="toc-partner" id="partner-${esc(p.partnerCode)}">
          <header class="toc-partner-head">
            <div>
              <h3 class="toc-partner-code">${esc(p.partnerCode)}</h3>
              <p class="toc-sub">${pill(p.status, statusKind)} ${pill(p.flowStage, 'dim')}
                · readiness ${(p.readiness?.score ?? 0).toFixed(2)}
                · playable ${p.readiness?.playableAccountCount ?? 0}
                · split ${p.package?.partnerPct}/${p.package?.expertPct}/${p.package?.housePct}
                ${exp ? ` · exp ${esc(exp.variantKey)}` : ''}
              </p>
            </div>
          </header>
          <div class="toc-cols">
            <section>
              <h4>Rails</h4>
              <ul>${(p.rails || [])
                .map(
                  r =>
                    `<li><code>${esc(r.label)}</code> ${r.confirmed ? pill('confirmed', 'ok') : pill('unconfirmed', 'hot')}${
                      r.dailyLimit != null
                        ? `<div class="toc-sub">daily ${money(r.dailyLimit)} · monthly ${money(r.monthlyLimit)}</div>`
                        : ''
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
                  const acctScore = (p.readiness?.accountScores || []).find(
                    x => x.callSign === a.callSign
                  );
                  const ce = assetBySign?.get(a.callSign);
                  const le = limitBySign?.get(a.callSign);
                  const metrics =
                    ce || le || acctScore?.weightedScore != null
                      ? `<div class="toc-sub">${
                          acctScore?.weightedScore != null
                            ? `w ${Number(acctScore.weightedScore).toFixed(2)}`
                            : ''
                        }${ce ? ` · CE ${Number(ce.ce).toFixed(5)}` : ''}${le ? ` · LE ${Number(le.le).toFixed(5)}` : ''}</div>`
                      : '';
                  return `<li><code>${esc(a.callSign)}</code> ${pill(a.status, a.status === 'WARMED' ? 'ok' : 'dim')} ${pill(a.flowStage, 'dim')}
                    warm ${a.warmupCount}/2 · ${esc(a.capitalLocation)} ${money(a.hardBalance)} ${g12}
                    <div class="toc-sub">${freshnessPill(a.limits?.freshness)}${
                      a.limits?.dailyMax != null
                        ? ` daily ${money(a.limits.dailyMax)} / weekly ${money(a.limits.weeklyMax)}`
                        : ''
                    }</div>${metrics}
                  </li>`;
                })
                .join('')}</ul>
            </section>
            <section>
              <h4>Open tasks</h4>
              <ul>${
                open.length
                  ? open
                      .map(
                        t =>
                          `<li>${pill(t.taskType, 'dim')} <code>${esc(t.callSign)}</code> → <strong>${esc(t.ballInCourt)}</strong> · ${esc(t.status)}<div class="toc-sub">${esc(t.nextAction)}</div></li>`
                      )
                      .join('')
                  : '<li class="toc-sub">None</li>'
              }</ul>
            </section>
            <section>
              <h4>Plays</h4>
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
                          `<li>${pill(b.severity, b.severity === 'critical' ? 'hot' : 'dim')} <code>${esc(b.ruleKey)}</code><div class="toc-sub">${esc(b.nextAction)}</div></li>`
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
  </section>`;
}

function render(root, { mode, data }) {
  const s = data.summary || {};
  const buf = data.buffer || {};
  const partners = data.partners || [];
  const catalog = data.catalog || {};
  const flow = (catalog.flowOrder || ['ONB', 'FUND', 'LIMIT', 'WARM', 'PLAY', 'WD']).join(' → ');
  const identity = data.identity;
  const plane = data.plane || 'demo-readonly';
  const enf = data.enforcement;
  const re = data.returnEfficiency;
  const ranked = data.rankedActions || [];
  const assetBySign = new Map((re?.byAsset || []).map(a => [a.callSign, a]));
  const limitBySign = new Map((re?.byLimit || []).map(l => [l.callSign, l]));

  root.innerHTML = `
    ${renderHero({ mode, data, plane, enf, flow })}
    ${renderAgentBrief({ mode, data, plane, enf, flow, identity })}

    <section class="toc-section" id="rollup">
      ${sectionHead('Rollup', 'Drum readiness and open work')}
      <div class="toc-stats">
        <div class="toc-stat ok"><span class="k">WARMED</span><span class="v">${s.warmed ?? 0}</span></div>
        <div class="toc-stat"><span class="k">Warming</span><span class="v">${s.warming ?? 0}</span></div>
        <div class="toc-stat"><span class="k">Onboarding</span><span class="v">${s.onboarding ?? 0}</span></div>
        <div class="toc-stat"><span class="k">Playable</span><span class="v">${buf.playableDrums ?? 0}</span></div>
        <div class="toc-stat"><span class="k">Rails ok / pending</span><span class="v">${s.confirmedRails ?? 0}/${s.unconfirmedRails ?? 0}</span></div>
        <div class="toc-stat"><span class="k">ONB / LIMIT</span><span class="v">${s.openOnb ?? 0}/${s.openLimit ?? 0}</span></div>
        <div class="toc-stat"><span class="k">Plays pend / set</span><span class="v">${s.playsPending ?? 0}/${s.playsSettled ?? 0}</span></div>
        <div class="toc-stat ${enf?.failed ? 'hot' : ''}"><span class="k">Gate fails</span><span class="v">${enf?.failed ?? '—'}</span></div>
      </div>
      <div class="toc-buffer">
        <span class="toc-buffer-label">Buffer</span>
        <span>float ${money(buf.houseFloatHard)} / ${money(buf.floatTarget)}
          (${Math.round((buf.floatRatio || 0) * 100)}% · ${esc(buf.floatTargetSource || 'static')})</span>
        <span>settlement ${Math.round((buf.settlementFloatRatio ?? 0) * 100)}%</span>
        <span>corridor ${money(catalog.depositCorridor?.min)}–${money(catalog.depositCorridor?.max)}</span>
        <span>limits ${catalog.limitFreshnessDays ?? 7}d</span>
        ${buf.throttleOnboarding ? pill('onboard paused', 'hot') : pill('onboard ok', 'ok')}
        ${pill(`${s.activeExperiments ?? 0} experiments`, s.activeExperiments ? 'ok' : 'dim')}
      </div>
    </section>

    ${renderEnforcement(enf)}
    ${renderReturnEfficiency(re, ranked, buf)}
    ${renderIdentity(identity)}
    ${renderExperiments(data.experiments)}
    ${renderPartners(partners, assetBySign, limitBySign)}

    <footer class="toc-foot">
      <a href="/registry/toc-ops.json"><code>/registry/toc-ops.json</code></a>
      · <a href="/api/toc"><code>/api/toc</code></a>
      · <a href="/portal/ops">Ops rollup</a>
      · seed <code>bun run ops:seed:toc -- --force</code>
    </footer>
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
    root.innerHTML = `<div class="ops-error"><p>Could not load TOC Ops fixture.</p><p class="toc-sub">${esc(e instanceof Error ? e.message : String(e))}</p><p class="toc-sub">Run <code>bun run ops:seed:toc -- --force && bun run ops:snapshot --no-routing</code></p></div>`;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => mountTocDashboard());
} else {
  mountTocDashboard();
}
