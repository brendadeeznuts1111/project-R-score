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
  const complianceBoard = await loadComplianceBoard();
  const embed = parseEmbed();
  if (embed?.partners) {
    const loop = embed.opsLoop ?? (await loadOpsLoopSlice());
    return { mode: 'embed', data: embed, loop, complianceBoard };
  }
  try {
    const data = await fetchJson('/api/toc');
    const loop = data.opsLoop ?? (await loadOpsLoopSlice());
    return { mode: data.mode || 'api', data, loop, complianceBoard };
  } catch {
    const data = await fetchJson('/registry/toc-ops.json');
    const loop = data.opsLoop ?? (await loadOpsLoopSlice());
    return { mode: 'registry', data, loop, complianceBoard };
  }
}

async function loadOpsLoopSlice() {
  try {
    const summary = await fetchJson('/registry/ops-summary.json');
    return summary?.loop ?? null;
  } catch {
    return null;
  }
}

async function loadComplianceBoard() {
  try {
    return await fetchJson('/registry/compliance-board.json');
  } catch {
    try {
      return await fetchJson('/api/compliance');
    } catch {
      return { _error: true };
    }
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
              ${
                e.outcome
                  ? `<li class="toc-sub">outcome n=${e.outcome.sampleN} · lift ${(e.outcome.liftPct * 100).toFixed(1)}% · ${pill(e.outcome.decision, e.outcome.decision === 'keep' ? 'ok' : e.outcome.decision === 'kill' ? 'hot' : 'dim')}
                      · ctrl ${esc(e.outcome.controlMetric)} → tx ${esc(e.outcome.treatmentMetric)}</li>`
                  : ''
              }
              ${(e.switchbackWindows || [])
                .slice(0, 4)
                .map(
                  w =>
                    `<li class="toc-sub">win <code>${esc(w.partnerCode)}</code> ${esc(w.variantKey)} ${esc(w.startAt.slice(0, 10))}→${esc(w.endAt.slice(0, 10))}</li>`
                )
                .join('')}
            </ul>
          </article>`
          )
          .join('')}
      </div>
    </section>`;
}

function formatPresenceLine(pr) {
  if (!pr?.postal && !pr?.network) return '';
  const city = [pr.postal?.city, pr.postal?.region, pr.postal?.zip].filter(Boolean).join(', ');
  const coords =
    pr.geo?.lat != null && pr.geo?.lon != null
      ? `${Number(pr.geo.lat).toFixed(4)}, ${Number(pr.geo.lon).toFixed(4)}`
      : '';
  const net = [
    pr.network?.ipv4 ? `v4 ${pr.network.ipv4}` : '',
    pr.network?.ipv6 ? `v6 ${pr.network.ipv6}` : '',
    pr.network?.asn != null ? `AS${pr.network.asn}` : '',
    pr.network?.dns?.hostname ? `dns ${pr.network.dns.hostname}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
  const dist =
    pr.metrics?.distanceKmFromHouse != null
      ? `${pr.metrics.distanceKmFromHouse} km from house`
      : '';
  const vpn = pr.network?.vpnSuspected ? pill('vpn?', 'hot') : '';
  return `<div class="toc-sub">${esc(city)}${coords ? ` · ${esc(coords)}` : ''}${
    dist ? ` · ${esc(dist)}` : ''
  }${vpn ? ` ${vpn}` : ''}${net ? `<br>${esc(net)}` : ''}</div>`;
}

function formatVenueLine(v) {
  if (!v) return '';
  const sports = (v.sports || []).slice(0, 5).join('/');
  const legal = (v.legalByState || [])
    .slice(0, 4)
    .map(L => `${L.state}:${L.status}`)
    .join(' ');
  const extras = [
    v.credit?.mode && v.credit.mode !== 'cash' ? `credit ${v.credit.mode}` : '',
    v.crypto ? `crypto ${(v.crypto.assets || []).join(',')}` : '',
    v.exchange ? `clearing ${v.exchange.clearing}` : '',
    v.pph ? `pph ${v.pph.shopName}` : '',
    v.kiosk ? `kiosk ${v.kiosk.locationLabel}` : '',
    v.casino ? `casino ${v.casino.property}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
  return `<div class="toc-sub">${pill(v.kind, v.kind === 'sportsbook' ? 'ok' : 'dim')} ${pill(v.access, 'dim')}
    <code>${esc(v.venueId)}</code> ${esc(v.displayName)} · ${esc(v.primaryState)}
    ${sports ? `<br>sports ${esc(sports)}` : ''}
    ${legal ? `<br>legal ${esc(legal)}` : ''}
    ${extras ? `<br>${esc(extras)}` : ''}
  </div>`;
}

function renderProfilesRollup(profiles) {
  if (!profiles) return '';
  return `<section class="toc-section" id="profiles">
    ${sectionHead('Profiles', 'Partners · agents · phones · telegram · deals · liquidity · CLV')}
    <div class="toc-stats">
      <div class="toc-stat ok"><span class="k">Partner profiles</span><span class="v">${profiles.partnersWithProfile ?? 0}</span></div>
      <div class="toc-stat ok"><span class="k">Agent profiles</span><span class="v">${profiles.agentsWithProfile ?? 0}</span></div>
      <div class="toc-stat"><span class="k">Phones active</span><span class="v">${profiles.phonesActive ?? 0}</span></div>
      <div class="toc-stat"><span class="k">TG lanes</span><span class="v">${profiles.telegramLanes ?? 0}</span></div>
      <div class="toc-stat"><span class="k">Play channels</span><span class="v">${profiles.playChannelsLive ?? 0}</span></div>
      <div class="toc-stat"><span class="k">Open deals</span><span class="v">${profiles.openDeals ?? 0}</span></div>
      <div class="toc-stat"><span class="k">Expert liq avail</span><span class="v">${money(profiles.expertLiquidityAvailable)}</span></div>
      <div class="toc-stat"><span class="k">Avg CLV</span><span class="v">${profiles.avgAgentClvBps != null ? `${Number(profiles.avgAgentClvBps).toFixed(1)} bps` : '—'}</span></div>
    </div>
    <div class="toc-buffer">
      <span class="toc-buffer-label">Pools</span>
      <span>allocated ${money(profiles.expertLiquidityAllocated)}</span>
      <span>pending payouts / cuts ${profiles.pendingPayouts ?? 0}</span>
    </div>
  </section>`;
}

function renderAgents(experts) {
  if (!experts?.length) return '';
  return `<section class="toc-section" id="agents">
    ${sectionHead('Agents', 'Style · CLV · liquidity pool · telegram · markets')}
    <div class="toc-partners">
      ${experts
        .map(e => {
          const pr = e.profile;
          if (!pr) {
            return `<article class="toc-partner"><h3>${esc(e.displayName)}</h3><p class="toc-sub">No profile</p></article>`;
          }
          const liq = pr.liquidity || {};
          const markets = (liq.byMarket || [])
            .map(m => `${m.market} ${money(m.available)}`)
            .join(' · ');
          return `<article class="toc-partner" id="agent-${esc(e.expertId)}">
            <header class="toc-partner-head">
              <div>
                <h3 class="toc-partner-code">${esc(e.displayName)} <span class="toc-sub">${esc(pr.handle || '')}</span></h3>
                <p class="toc-sub">${pill(pr.style?.aggression || '—', 'dim')}
                  stake ${money(pr.style?.stakeBand?.typical)} typical
                  · CLV ${Number(pr.clv?.avgClvBps ?? 0).toFixed(1)} bps (n=${pr.clv?.sampleN ?? 0})
                  · weight ${e.weight ?? '—'}
                  ${pr.releaseStats ? ` · place ${(pr.releaseStats.placementRate * 100).toFixed(0)}%` : ''}
                </p>
                ${
                  pr.clv?.weeklySeriesBps?.length
                    ? `<p class="toc-sub">CLV weeks ${pr.clv.weeklySeriesBps.map(n => Number(n).toFixed(0)).join('→')}</p>`
                    : ''
                }
              </div>
            </header>
            <div class="toc-cols">
              <section>
                <h4>Liquidity</h4>
                <ul>
                  <li>avail ${money(liq.available)} / ${money(liq.allocated)}</li>
                  <li class="toc-sub">reserved ${money(liq.reserved)}</li>
                  <li class="toc-sub">${esc(markets || '—')}</li>
                  ${(liq.openReservations || [])
                    .map(
                      r =>
                        `<li class="toc-sub">res <code>${esc(r.callSign)}</code> ${esc(r.market)} ${money(r.stake)}</li>`
                    )
                    .join('')}
                  ${
                    pr.liquidityUtilSeries?.length
                      ? `<li class="toc-sub">util ${pr.liquidityUtilSeries
                          .slice(-3)
                          .map(u => `${esc(u.day.slice(5))} ${u.utilPct}%`)
                          .join(' · ')}</li>`
                      : ''
                  }
                </ul>
              </section>
              <section>
                <h4>Telegram / bot</h4>
                <ul>
                  <li>${esc(pr.telegram?.channelId || pr.telegram?.groupId || '—')}</li>
                  <li class="toc-sub">${esc(pr.bot?.username || '—')} ${pill(pr.bot?.status || '—', pr.bot?.status === 'live' ? 'ok' : 'dim')}</li>
                  ${(pr.playChannels || [])
                    .map(
                      c =>
                        `<li class="toc-sub">${pill(c.kind, c.primary ? 'ok' : 'dim')} ${esc(c.ref)}</li>`
                    )
                    .join('')}
                </ul>
              </section>
              <section>
                <h4>Markets / places</h4>
                <ul>
                  <li>${esc((pr.markets || e.markets || []).join(' · '))}</li>
                  ${(pr.wagerPlaces || [])
                    .map(w => `<li class="toc-sub"><code>${esc(w.venueId)}</code> ${esc(w.label)}</li>`)
                    .join('')}
                  ${(pr.bookPermissions || [])
                    .map(
                      b =>
                        `<li class="toc-sub">${b.allowed ? pill('ok', 'ok') : pill('deny', 'hot')} <code>${esc(b.venueId)}</code> max ${money(b.maxStake)}</li>`
                    )
                    .join('')}
                  ${
                    pr.roi
                      ? `<li class="toc-sub">ROI 30d T ${money(pr.roi.t30d)} · ${pr.roi.plays30d} plays · WR ${(pr.roi.winRate * 100).toFixed(0)}% · avg ${money(pr.roi.avgStake)}</li>`
                      : ''
                  }
                  ${(pr.roi?.eligibility || [])
                    .slice(0, 4)
                    .map(
                      x =>
                        `<li class="toc-sub">${x.eligible ? pill('elig', 'ok') : pill('block', 'hot')} <code>${esc(x.callSign)}</code> ${esc(x.reason)}</li>`
                    )
                    .join('')}
                  ${(pr.releaseCards || [])
                    .slice(0, 4)
                    .map(
                      c =>
                        `<li class="toc-sub">${pill(c.status, c.status === 'deferred' ? 'hot' : c.status === 'settled' ? 'ok' : 'dim')} <code>${esc(c.callSign)}</code> ${money(c.stake)} ${esc(c.market)}${
                          c.deferredReason ? ` · ${esc(c.deferredReason)}` : ''
                        }</li>`
                    )
                    .join('')}
                </ul>
              </section>
              <section>
                <h4>Accounting / deals</h4>
                <ul>
                  <li>pending cut ${money(pr.accounting?.pendingCut)} · YTD ${money(pr.accounting?.paidYtd)}</li>
                  ${(pr.deals || [])
                    .map(
                      d =>
                        `<li class="toc-sub">${esc(d.name)} ${d.partnerPct}/${d.expertPct}/${d.housePct}</li>`
                    )
                    .join('')}
                  <li class="toc-sub">limits d ${money(pr.limits?.dailyMax)} / w ${money(pr.limits?.weeklyMax)}</li>
                  ${(pr.exposureLadder || [])
                    .map(
                      x =>
                        `<li class="toc-sub">band ${esc(x.band)} open ${money(x.openStake)} / cap ${money(x.cap)}</li>`
                    )
                    .join('')}
                  ${
                    pr.clvDailyBps?.length
                      ? `<li class="toc-sub">CLV daily ${pr.clvDailyBps
                          .slice(-7)
                          .map(b => `${b}bps`)
                          .join(' · ')}</li>`
                      : ''
                  }
                </ul>
              </section>
            </div>
          </article>`;
        })
        .join('')}
    </div>
  </section>`;
}

function formatPartnerProfile(pr) {
  if (!pr) return '';
  const phones = (pr.phones || [])
    .map(
      ph =>
        `<li class="toc-sub">${esc(ph.label)} ${esc(ph.e164 || '')} · ${esc(ph.carrier || '')}${
          ph.dataPlan
            ? ` · ${ph.dataPlan.usedGb}/${ph.dataPlan.gbMonth}GB`
            : ''
        } ${pill(ph.status, ph.status === 'active' ? 'ok' : 'dim')}</li>`
    )
    .join('');
  const assets = (pr.assets || [])
    .slice(0, 6)
    .map(a => `<li class="toc-sub">${pill(a.kind, 'dim')} ${esc(a.label)}</li>`)
    .join('');
  const deals = (pr.deals || [])
    .map(
      d =>
        `<li class="toc-sub">${esc(d.name)} ${d.partnerPct}/${d.expertPct}/${d.housePct} · ${esc(d.payoutCadence)}</li>`
    )
    .join('');
  const hist = (pr.history || [])
    .slice(0, 4)
    .map(h => `<li class="toc-sub">${esc(h.at?.slice(0, 10) || '')} ${esc(h.summary)}</li>`)
    .join('');
  return `<section>
    <h4>Profile</h4>
    <ul>
      <li>${pill(pr.tier, 'ok')} ${pill(pr.risk, pr.risk === 'green' ? 'ok' : 'hot')} ${esc(pr.displayName)}</li>
      <li class="toc-sub">TG ${esc(pr.telegram?.groupId || pr.telegram?.dmRef || '—')}
        · ch ${esc(pr.telegram?.channelId || '—')}
        · ${esc(pr.bot?.username || '—')}</li>
      <li>Soft P/E/H ${money(pr.accounting?.softPartner)} / ${money(pr.accounting?.softExpert)} / ${money(pr.accounting?.softHouse)}
        · hard book ${money(pr.accounting?.hardInBook)}
        ${pr.accounting?.pendingPayout ? ` · pending payout ${money(pr.accounting.pendingPayout)}` : ''}</li>
      <li class="toc-sub">limits d ${money(pr.limits?.dailyMax)} / w ${money(pr.limits?.weeklyMax)}
        · markets ${esc((pr.preferredMarkets || []).slice(0, 6).join('/'))}</li>
      ${
        pr.velocity
          ? `<li class="toc-sub">7d T ${money(pr.velocity.t7d)} · ${pr.velocity.plays7d} plays · ${pr.velocity.settles7d} settled · avg stake ${money(pr.velocity.avgStake7d)}</li>`
          : ''
      }
      ${
        pr.deskScorecard
          ? `<li class="toc-sub">trust ${Number(pr.deskScorecard.trustScore).toFixed(2)} · SLA ${(pr.deskScorecard.slaOnTimePct * 100).toFixed(0)}% · proof ${(pr.deskScorecard.proofCompletenessPct * 100).toFixed(0)}% · resp ${pr.deskScorecard.avgPartnerResponseMin}m</li>`
          : ''
      }
    </ul>
    ${
      pr.softDailyT?.length
        ? `<h4 class="toc-subhead">Soft T / day</h4><ul>${pr.softDailyT
            .slice(-7)
            .map(d => `<li class="toc-sub">${esc(d.day)} T ${money(d.t)}${d.oe ? ` · OE ${money(d.oe)}` : ''}</li>`)
            .join('')}</ul>`
        : ''
    }
    ${
      pr.railHealth?.length
        ? `<h4 class="toc-subhead">Rail health</h4><ul>${pr.railHealth
            .map(
              r =>
                `<li class="toc-sub"><code>${esc(r.railId)}</code> ${(r.successRate * 100).toFixed(0)}% · ${r.avgSettleMin}m · vol ${money(r.volume30d)}</li>`
            )
            .join('')}</ul>`
        : ''
    }
    ${
      pr.proofVault?.length
        ? `<h4 class="toc-subhead">Proof vault</h4><ul>${pr.proofVault
            .slice(0, 8)
            .map(
              p =>
                `<li class="toc-sub">${pill(p.kind, 'dim')} <code>${esc(p.ref)}</code>${
                  p.callSign ? ` · ${esc(p.callSign)}` : ''
                }</li>`
            )
            .join('')}</ul>`
        : ''
    }
    <h4 class="toc-subhead">Phones / data</h4>
    <ul>${phones || '<li class="toc-sub">None</li>'}</ul>
    ${
      pr.phoneLog?.length
        ? `<h4 class="toc-subhead">Phone log</h4><ul>${pr.phoneLog
            .slice(0, 5)
            .map(
              e =>
                `<li class="toc-sub">${esc(e.at.slice(5, 16))} ${pill(e.event, 'dim')} <code>${esc(e.phoneId)}</code> · ${esc(e.summary.slice(0, 56))}</li>`
            )
            .join('')}</ul>`
        : ''
    }
    <h4 class="toc-subhead">Assets / rails</h4>
    <ul>${assets || '<li class="toc-sub">None</li>'}</ul>
    <h4 class="toc-subhead">Deals</h4>
    <ul>${deals || '<li class="toc-sub">None</li>'}</ul>
    <h4 class="toc-subhead">History</h4>
    <ul>${hist || '<li class="toc-sub">None</li>'}</ul>
  </section>`;
}

function renderVenuesRollup(venues, catalog) {
  if (!venues) return '';
  const kinds = Object.entries(venues.byVenueKind || {})
    .map(([k, n]) => `${k} ${n}`)
    .join(' · ');
  const ids = Object.entries(venues.byVenueId || {})
    .map(([k, n]) => `${k}:${n}`)
    .join(' ');
  const sports = Object.entries(venues.bySport || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([k, n]) => `${k} ${n}`)
    .join(' · ');
  const legal = Object.entries(venues.byLegalStatus || {})
    .map(([k, n]) => `${k}:${n}`)
    .join(' ');
  const catalogHint = catalog?.venueIds?.length
    ? `catalog ${catalog.venueIds.length} venues`
    : '';
  return `<section class="toc-section" id="venues">
    ${sectionHead('Venues', 'Sportsbooks · exchanges · crypto · PPH · post-up · casino · kiosk')}
    <div class="toc-stats">
      <div class="toc-stat ok"><span class="k">With venue</span><span class="v">${venues.accountsWithVenue ?? 0}</span></div>
      <div class="toc-stat"><span class="k">Kinds</span><span class="v">${Object.keys(venues.byVenueKind || {}).length}</span></div>
      <div class="toc-stat"><span class="k">Exchanges</span><span class="v">${venues.exchangeAccounts ?? 0}</span></div>
      <div class="toc-stat"><span class="k">Crypto</span><span class="v">${venues.cryptoAccounts ?? 0}</span></div>
      <div class="toc-stat"><span class="k">Credit / PPH</span><span class="v">${venues.creditLines ?? 0}</span></div>
      <div class="toc-stat"><span class="k">Kiosk</span><span class="v">${venues.kioskAccounts ?? 0}</span></div>
      <div class="toc-stat"><span class="k">In-person</span><span class="v">${venues.inPersonAccounts ?? 0}</span></div>
      <div class="toc-stat"><span class="k">Legal states</span><span class="v">${venues.legalStatesCovered ?? 0}</span></div>
    </div>
    <div class="toc-buffer">
      <span class="toc-buffer-label">Mix</span>
      <span>${esc(kinds || '—')}</span>
      <span>${esc(ids || '—')}</span>
      ${catalogHint ? `<span>${esc(catalogHint)}</span>` : ''}
    </div>
    <div class="toc-buffer">
      <span class="toc-buffer-label">Sports / legal</span>
      <span>${esc(sports || '—')}</span>
      <span>${esc(legal || '—')}</span>
    </div>
  </section>`;
}

function renderPresenceRollup(presence, house) {
  if (!presence) return '';
  const houseLine = house
    ? `${esc(house.postal?.city || 'House')} ${esc(house.postal?.zip || '')} · ${esc(house.network?.ipv4 || '—')}`
    : '—';
  const countries = Object.entries(presence.byCountry || {})
    .map(([k, v]) => `${k}:${v}`)
    .join(' ');
  const conns = Object.entries(presence.byConnectionType || {})
    .map(([k, v]) => `${k} ${v}`)
    .join(' · ');
  return `<section class="toc-section" id="presence">
    ${sectionHead('Presence', 'Geo · ZIP · IPv4/IPv6 · DNS · ASN (demo)')}
    <div class="toc-stats">
      <div class="toc-stat ok"><span class="k">Partners geo</span><span class="v">${presence.partnersWithGeo ?? 0}</span></div>
      <div class="toc-stat"><span class="k">Accounts geo</span><span class="v">${presence.accountsWithGeo ?? 0}</span></div>
      <div class="toc-stat"><span class="k">Unique ZIPs</span><span class="v">${presence.uniqueZips ?? 0}</span></div>
      <div class="toc-stat"><span class="k">IPv6</span><span class="v">${presence.ipv6Count ?? 0}</span></div>
      <div class="toc-stat"><span class="k">DNS resolved</span><span class="v">${presence.dnsResolved ?? 0}</span></div>
      <div class="toc-stat"><span class="k">ASNs</span><span class="v">${presence.uniqueAsns ?? 0}</span></div>
      <div class="toc-stat"><span class="k">Plays w/ place</span><span class="v">${presence.playsWithPlacement ?? 0}</span></div>
      <div class="toc-stat ${presence.vpnSuspected ? 'hot' : ''}"><span class="k">VPN suspected</span><span class="v">${presence.vpnSuspected ?? 0}</span></div>
    </div>
    <div class="toc-buffer">
      <span class="toc-buffer-label">House</span>
      <span>${houseLine}</span>
      <span>avg distance ${presence.avgDistanceKmFromHouse ?? '—'} km</span>
      <span>${esc(countries || 'US')}</span>
      <span>${esc(conns || '—')}</span>
    </div>
  </section>`;
}

/**
 * MA/NJ regulatory board glance — loads /registry/compliance-board.json
 * (shared with /portal/compliance/ and ops-summary.compliance).
 */
function renderComplianceBoard(board) {
  const available = board && !board._error;
  const enh = board?.enhancements;
  const shadow = board?.shadow?.summary;
  const geoN = board?.geo?.partners?.length ?? 0;
  const passed = enh?.passed ?? 0;
  const total = enh?.total ?? 0;
  const mm = shadow?.mismatches ?? 0;
  // Align with projectBoard / projectComplianceHealthArtifact (integrity checks).
  const integrityOk =
    !Array.isArray(board?.integrity?.checks) ||
    board.integrity.checks.every(c => c?.ok !== false);
  const ok = available && total > 0 && passed === total && mm === 0 && integrityOk;
  const states = 'MA / NJ';
  return `<section class="toc-section" id="compliance-board">
    ${sectionHead(
      'State compliance',
      'MA/NJ licenses · shadow matrix · discrete geo (portal bake)'
    )}
    <div class="toc-stats">
      <div class="toc-stat ${ok ? 'ok' : available ? 'hot' : ''}"><span class="k">Enhancements</span><span class="v">${available && total ? `${passed}/${total}` : '—'}</span></div>
      <div class="toc-stat"><span class="k">Shadow allow</span><span class="v">${shadow?.allow ?? '—'}</span></div>
      <div class="toc-stat"><span class="k">Shadow block</span><span class="v">${shadow?.block ?? '—'}</span></div>
      <div class="toc-stat ${mm > 0 ? 'hot' : ''}"><span class="k">Mismatches</span><span class="v">${available ? mm : '—'}</span></div>
      <div class="toc-stat ok"><span class="k">Geo profiles</span><span class="v">${available ? geoN : '—'}</span></div>
      <div class="toc-stat"><span class="k">States</span><span class="v">${states}</span></div>
      <div class="toc-stat"><span class="k">Open flags</span><span class="v" id="toc-compliance-open">—</span></div>
      <div class="toc-stat"><span class="k">Proof</span><span class="v">${board?.integrity?.scoreHint ? esc(String(board.integrity.scoreHint).slice(0, 18)) : available ? 'sha3' : '—'}</span></div>
    </div>
    <div class="toc-buffer">
      <span class="toc-buffer-label">Board</span>
      <span>${available ? 'Baked snapshot' : 'Missing — bun run compliance:bake'}</span>
      <a href="/portal/compliance/">Open compliance board</a>
      <a href="/registry/compliance-board.json">compliance-board.json</a>
      <a href="/portal/ops/">Ops panel</a>
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
      const place = p.placement
        ? `<div class="toc-sub">${esc(
            [p.placement.postal?.city, p.placement.postal?.zip].filter(Boolean).join(' ')
          )}${p.placement.ipv4 ? ` · ${esc(p.placement.ipv4)}` : ''}${
            p.placement.ipv6 ? ` · v6` : ''
          }${p.placement.asn != null ? ` · AS${p.placement.asn}` : ''}</div>`
        : '';
      return `<li>
        <code>${esc(p.callSign)}</code> ${esc(p.market)} ${esc(p.selection)} @ ${esc(p.odds)}
        · stake ${money(p.stake)} ${res}
        ${p.variantKey ? pill(`exp:${p.variantKey}`, 'dim') : ''}
        ${p.blockedReason ? `<div class="toc-sub">${esc(p.blockedReason)}</div>` : ''}
        ${
          p.instructionAgeMin != null
            ? `<div class="toc-sub">instruction ${p.instructionAgeMin}m${
                p.ackDueAt ? ` · due ${esc(p.ackDueAt.slice(0, 16))}` : ''
              }</div>`
            : ''
        }
        ${p.pnl != null ? `<div class="toc-sub">pnl ${money(p.pnl)}</div>` : ''}
        ${place}
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
      ${buf?.history?.length ? pill(`buffer ${buf.history.length}d`, 'dim') : ''}
    </div>
    ${
      (buf?.history || []).length
        ? `<h4 class="toc-subhead">Buffer history</h4><ul>${[...(buf.history || [])]
            .slice(-5)
            .map(
              h =>
                `<li class="toc-sub">${esc(h.day)} float ${money(h.houseFloatHard)} · ratio ${h.floatRatio} · settle ${(h.settlementFloatRatio * 100).toFixed(0)}% · principal ${money(h.principalOutstanding)}${
                  h.throttleOnboarding ? ` ${pill('throttle', 'hot')}` : ''
                }</li>`
            )
            .join('')}</ul>`
        : ''
    }
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
              ${formatPresenceLine(p.presence)}
              ${
                (p.readinessTrend || []).length
                  ? `<p class="toc-sub">readiness trend ${[...(p.readinessTrend || [])]
                      .slice(-3)
                      .map(r => `${r.day.slice(5)} ${(r.score * 100).toFixed(0)}%`)
                      .join(' · ')}</p>`
                  : ''
              }
              ${
                (p.healthPulse || []).length
                  ? `<p class="toc-sub">health ${[...(p.healthPulse || [])]
                      .slice(-3)
                      .map(
                        h =>
                          `${h.day.slice(5)} r=${h.readiness} bic=${h.openBic} T=${money(h.softT)}`
                      )
                      .join(' · ')}</p>`
                  : ''
              }
              ${
                p.slaBoard
                  ? `<p class="toc-sub">SLA partner ${p.slaBoard.openPartnerTasks} · ops ${p.slaBoard.openOpsTasks} · oldest ${p.slaBoard.oldestOpenAgeMin}m · on-time ${(p.slaBoard.onTimePct7d * 100).toFixed(0)}% · breaches ${p.slaBoard.breachCount7d}</p>`
                  : ''
              }
              ${
                p.netCapital
                  ? `<p class="toc-sub">net capital ${money(p.netCapital.net)} (dep ${money(p.netCapital.deposits)} − wd ${money(p.netCapital.withdrawals)} − loss ${money(p.netCapital.losses)} − prime ${money(p.netCapital.priming)})</p>`
                  : ''
              }
              ${
                p.exposureAging &&
                (p.exposureAging.bucket0_24h +
                  p.exposureAging.bucket24_72h +
                  p.exposureAging.bucket72hPlus >
                  0)
                  ? `<p class="toc-sub">exposure aging 0-24h ${money(p.exposureAging.bucket0_24h)} · 24-72h ${money(p.exposureAging.bucket24_72h)} · 72h+ ${money(p.exposureAging.bucket72hPlus)}</p>`
                  : ''
              }
              ${
                p.fundCorridor
                  ? `<p class="toc-sub">FUND corridor ${money(p.fundCorridor.fundedAmount)}/${money(p.fundCorridor.targetAmount)} ${pill(p.fundCorridor.status, p.fundCorridor.status === 'blocked' ? 'hot' : p.fundCorridor.status === 'funded' ? 'ok' : 'dim')}${
                      p.fundCorridor.blockReason ? ` — ${esc(p.fundCorridor.blockReason)}` : ''
                    }</p>`
                  : ''
              }
              ${
                (p.wdPipeline || []).length
                  ? `<p class="toc-sub">WD queue ${(p.wdPipeline || [])
                      .map(w => `${w.callSign}:${w.status} ${money(w.amount)}`)
                      .join(' · ')}</p>`
                  : ''
              }
            </div>
          </header>
          <div class="toc-cols">
            ${formatPartnerProfile(p.profile)}
            <section>
              <h4>Rails</h4>
              <ul>${(p.rails || [])
                .map(
                  r =>
                    `<li><code>${esc(r.label)}</code> ${r.confirmed ? pill('confirmed', 'ok') : pill('unconfirmed', 'hot')}${
                      r.dailyLimit != null
                        ? `<div class="toc-sub">daily ${money(r.dailyLimit)} · monthly ${money(r.monthlyLimit)}</div>`
                        : ''
                    }${
                      (r.confirmHistory || []).length
                        ? `<div class="toc-sub">${[...(r.confirmHistory || [])]
                            .map(h => `${h.action}@${h.at.slice(5, 10)}`)
                            .join(' · ')}</div>`
                        : ''
                    }${
                      r.utilization
                        ? `<div class="toc-sub">util daily ${r.utilization.pctDaily}% · monthly ${r.utilization.pctMonthly}%</div>`
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
                  const warm =
                    (a.warmCycles || []).length
                      ? `<div class="toc-sub">warm ${(a.warmCycles || [])
                          .map(
                            w =>
                              `c${w.cycle}:${w.status}${
                                w.returnedAmount != null ? ` ${money(w.returnedAmount)}` : ''
                              }`
                          )
                          .join(' · ')}</div>`
                      : '';
                  const cap =
                    (a.capitalLedger || []).length
                      ? `<div class="toc-sub">cap ${[...(a.capitalLedger || [])]
                          .slice(-2)
                          .map(m => `${m.from}→${m.to} ${money(m.amount)}`)
                          .join(' · ')}</div>`
                      : '';
                  const g12led =
                    (a.gate12Ledger || []).length
                      ? `<div class="toc-sub">g12 ${[...(a.gate12Ledger || [])]
                          .slice(-2)
                          .map(g => `${g.kind} rem ${money(g.remainingAfter)}`)
                          .join(' · ')}</div>`
                      : '';
                  const limHist =
                    (a.limitHistory || []).length
                      ? `<div class="toc-sub">limits ${[...(a.limitHistory || [])]
                          .map(
                            h =>
                              `${h.at.slice(5, 10)} ${h.freshness}${
                                h.dailyMax != null ? ` d${money(h.dailyMax)}` : ''
                              }`
                          )
                          .join(' · ')}</div>`
                      : '';
                  const expos =
                    a.pendingExposure != null && a.pendingExposure > 0
                      ? `<div class="toc-sub">pending exposure ${money(a.pendingExposure)}${
                          a.exposureAging
                            ? ` · aging 0-24h ${money(a.exposureAging.bucket0_24h)} / 72h+ ${money(a.exposureAging.bucket72hPlus)}`
                            : ''
                        }</div>`
                      : '';
                  const recycle =
                    (a.recycleCycles || []).length
                      ? `<div class="toc-sub">recycle ${(a.recycleCycles || [])
                          .map(
                            c =>
                              `${c.status}${c.blockReason ? ` (${esc(c.blockReason)})` : ''} ${money(c.redeployAmount)}`
                          )
                          .join(' · ')}</div>`
                      : '';
                  return `<li><code>${esc(a.callSign)}</code> ${pill(a.status, a.status === 'WARMED' ? 'ok' : 'dim')} ${pill(a.flowStage, 'dim')}
                    warm ${a.warmupCount}/2 · ${esc(a.capitalLocation)} ${money(a.hardBalance)} ${g12}
                    <div class="toc-sub">${freshnessPill(a.limits?.freshness)}${
                      a.limits?.dailyMax != null
                        ? ` daily ${money(a.limits.dailyMax)} / weekly ${money(a.limits.weeklyMax)}`
                        : ''
                    }${
                      a.constraint
                        ? ` · focus ${pill(a.constraint.focus, a.constraint.ropeBroken ? 'hot' : 'dim')}`
                        : ''
                    }</div>${metrics}${warm}${cap}${g12led}${limHist}${expos}${recycle}${
                      (a.warmPlaybook || []).length
                        ? `<div class="toc-sub">warm SOP ${(a.warmPlaybook || [])
                            .filter(s => s.status === 'done')
                            .length}/${(a.warmPlaybook || []).length} done${
                            (a.warmPlaybook || []).some(s => s.status === 'blocked')
                              ? ' · blocked'
                              : ''
                          }</div>`
                        : ''
                    }${
                      a.gateSnapshot
                        ? `<div class="toc-sub">gates ${a.gateSnapshot.passed}/${a.gateSnapshot.passed + a.gateSnapshot.failed} pass${
                            a.gateSnapshot.failed ? ` · fail ${a.gateSnapshot.failed}` : ''
                          }</div>`
                        : ''
                    }${
                      (a.capitalLocationSeries || []).length > 1
                        ? `<div class="toc-sub">capital drift ${(a.capitalLocationSeries || [])
                            .slice(-2)
                            .map(c => `${esc(c.location)}@${c.at.slice(5, 10)}`)
                            .join(' → ')}</div>`
                        : ''
                    }
                    ${formatVenueLine(a.venue)}
                    ${formatPresenceLine(a.presence)}
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
                          `<li>${pill(t.taskType, 'dim')} <code>${esc(t.callSign)}</code> → <strong>${esc(t.ballInCourt)}</strong> · ${esc(t.status)}${
                            t.ageMin != null ? ` · ${t.ageMin}m` : ''
                          }<div class="toc-sub">${esc(t.nextAction)}${
                            t.slaDueAt ? ` · due ${esc(t.slaDueAt.slice(0, 16))}` : ''
                          }</div></li>`
                      )
                      .join('')
                  : '<li class="toc-sub">None</li>'
              }</ul>
              ${
                (p.taskTimeline || []).length
                  ? `<h4 class="toc-subhead">Task timeline</h4><ul>${(p.taskTimeline || [])
                      .slice(-6)
                      .map(
                        e =>
                          `<li class="toc-sub">${esc(e.at.slice(5, 16))} ${pill(e.event, e.event === 'blocked' || e.event === 'sla_breach' ? 'hot' : 'dim')} ${pill(e.taskType, 'dim')} ${esc(e.ballInCourt)} · ${esc(e.summary.slice(0, 52))}</li>`
                      )
                      .join('')}</ul>`
                  : ''
              }
              ${
                (p.bicHandoffs || []).length
                  ? `<h4 class="toc-subhead">BIC handoffs</h4><ul>${(p.bicHandoffs || [])
                      .slice(0, 5)
                      .map(
                        h =>
                          `<li class="toc-sub">${esc(h.at.slice(5, 16))} ${pill(h.taskType, 'dim')} ${esc(h.from)}→${esc(h.to)} · ${esc(h.reason.slice(0, 48))}</li>`
                      )
                      .join('')}</ul>`
                  : ''
              }
              ${
                (p.complianceFlags || []).length
                  ? `<h4 class="toc-subhead">Compliance</h4><ul>${(p.complianceFlags || [])
                      .filter(f => !f.clearedAt)
                      .slice(0, 5)
                      .map(
                        f =>
                          `<li class="toc-sub">${pill(f.severity, f.severity === 'critical' ? 'hot' : 'dim')} <code>${esc(f.code)}</code> ${esc(f.summary)}</li>`
                      )
                      .join('')}</ul>`
                  : ''
              }
              ${
                (p.auditTrail || []).length
                  ? `<h4 class="toc-subhead">Audit</h4><ul>${[...(p.auditTrail || [])]
                      .slice(0, 5)
                      .map(
                        r =>
                          `<li class="toc-sub">${esc(r.at.slice(5, 16))} ${pill(r.kind, 'dim')}${
                            r.amount != null ? ` ${money(r.amount)}` : ''
                          } · ${esc(r.summary)}</li>`
                      )
                      .join('')}</ul>`
                  : ''
              }
              ${
                (p.onbChecklist || []).length
                  ? `<h4 class="toc-subhead">ONB checklist</h4><ul>${(p.onbChecklist || [])
                      .map(
                        s =>
                          `<li class="toc-sub">${pill(s.status, s.status === 'done' ? 'ok' : s.status === 'blocked' ? 'hot' : 'dim')} ${esc(s.label)}${
                            s.blockReason ? ` — ${esc(s.blockReason)}` : ''
                          }</li>`
                      )
                      .join('')}</ul>`
                  : ''
              }
              ${
                (p.settlementCalendar || []).length
                  ? `<h4 class="toc-subhead">Settlement calendar</h4><ul>${(p.settlementCalendar || [])
                      .slice(0, 4)
                      .map(
                        s =>
                          `<li class="toc-sub">${esc(s.at.slice(5, 16))} ${pill(s.kind, 'dim')} ${
                            s.callSign ? `<code>${esc(s.callSign)}</code> ` : ''
                          }${money(s.amount)} · ${esc(s.note)}</li>`
                      )
                      .join('')}</ul>`
                  : ''
              }
              ${
                (p.exceptionResolution || []).length
                  ? `<h4 class="toc-subhead">Exception resolution</h4><ul>${(p.exceptionResolution || [])
                      .slice(0, 4)
                      .map(
                        r =>
                          `<li class="toc-sub">${pill(r.status, r.status === 'resolved' ? 'ok' : 'hot')} <code>${esc(r.exceptionId)}</code> → ${esc(r.owner)} · ${esc(r.summary.slice(0, 48))}</li>`
                      )
                      .join('')}</ul>`
                  : ''
              }
              ${
                (p.playSettlementQueue || []).length
                  ? `<h4 class="toc-subhead">Play settlement</h4><ul>${(p.playSettlementQueue || [])
                      .slice(0, 3)
                      .map(
                        s =>
                          `<li class="toc-sub"><code>${esc(s.callSign)}</code> ${esc(s.market)} ${money(s.stake)} · due ${esc(s.expectedSettleAt.slice(5, 16))}</li>`
                      )
                      .join('')}</ul>`
                  : ''
              }
              ${
                (p.profile?.botCommandLog || []).length
                  ? `<h4 class="toc-subhead">Bot commands</h4><ul>${(p.profile?.botCommandLog || [])
                      .slice(0, 3)
                      .map(
                        c =>
                          `<li class="toc-sub">${esc(c.at.slice(5, 16))} ${pill(c.outcome, c.outcome === 'ok' ? 'ok' : 'hot')} <code>${esc(c.command)}</code> · ${esc(c.note || c.actor)}</li>`
                      )
                      .join('')}</ul>`
                  : ''
              }
            </section>
            <section>
              <h4>MessageLog</h4>
              <ul>${
                (p.messageLog || []).length
                  ? [...(p.messageLog || [])]
                      .sort((a, b) => String(b.at).localeCompare(String(a.at)))
                      .slice(0, 6)
                      .map(
                        m =>
                          `<li class="toc-sub">${pill(m.channel, m.slaBreached ? 'hot' : 'dim')} ${esc(m.from)}→${esc(m.to)} · ${esc(m.summary)}${
                            m.slaBreached ? ` ${pill('SLA', 'hot')}` : ''
                          }</li>`
                      )
                      .join('')
                  : '<li class="toc-sub">None</li>'
              }</ul>
              ${
                (p.rotorSeries || []).length
                  ? `<h4 class="toc-subhead">Rotor</h4><ul>${[...(p.rotorSeries || [])]
                      .slice(-4)
                      .map(
                        r =>
                          `<li class="toc-sub"><code>${esc(r.callSign)}</code> ${r.driftBps}bps · fresh ${r.limitFreshHours}h${
                            r.action ? ` · ${esc(r.action)}` : ''
                          }</li>`
                      )
                      .join('')}</ul>`
                  : ''
              }
              ${
                (p.exceptionTimeline || []).length
                  ? `<h4 class="toc-subhead">Exceptions</h4><ul>${[...(p.exceptionTimeline || [])]
                      .slice(-4)
                      .map(
                        x =>
                          `<li class="toc-sub">${pill(x.status, x.status === 'open' ? 'hot' : 'ok')} <code>${esc(x.id)}</code> ${esc(x.summary)}</li>`
                      )
                      .join('')}</ul>`
                  : ''
              }
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
                ${(p.softBalance?.pendingDeploymentItems || [])
                  .map(
                    i =>
                      `<li class="toc-sub">${pill(i.status, i.status === 'blocked' ? 'hot' : 'dim')} <code>${esc(i.callSign)}</code> ${money(i.amount)} · ${esc(i.queuedAt.slice(5, 16))}</li>`
                  )
                  .join('')}
              </ul>
              ${(() => {
                const entries = [...(p.softBalance?.recentEntries || [])]
                  .sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')))
                  .slice(0, 5);
                if (!entries.length) return '';
                return `<ul class="toc-soft-journal">${entries
                  .map(
                    e =>
                      `<li class="toc-sub">${pill(e.entryType, e.entryType === 'ProfitSplit' ? 'ok' : e.entryType === 'Loss' ? 'hot' : 'dim')} ${esc(e.stakeholder)} ${money(e.amount)} · <code>${esc(e.callSign || '—')}</code></li>`
                  )
                  .join('')}</ul>`;
              })()}
              ${
                p.softBalance?.balanceSheet
                  ? `<div class="toc-sub">sheet A ${money(p.softBalance.balanceSheet.assets)} = L ${money(p.softBalance.balanceSheet.liabilities)} + E ${money(p.softBalance.balanceSheet.equity)} ${
                      p.softBalance.balanceSheet.identityOk
                        ? pill('A=L+E', 'ok')
                        : pill(`Δ ${p.softBalance.balanceSheet.delta}`, 'hot')
                    }</div>`
                  : ''
              }
              ${
                p.dealSplitAudit?.rows?.length
                  ? `<h4 class="toc-subhead">Deal split audit</h4><ul>${p.dealSplitAudit.rows
                      .slice(0, 4)
                      .map(
                        r =>
                          `<li class="toc-sub">${r.ok ? pill('ok', 'ok') : pill('drift', 'hot')} ${esc(r.at.slice(5, 16))} P/E/H ${r.actual.partner}/${r.actual.expert}/${r.actual.house}</li>`
                      )
                      .join('')}</ul>`
                  : ''
              }
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

function render(root, { mode, data, loop, complianceBoard }) {
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
    ${renderComplianceBoard(complianceBoard)}

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
        ${
          loop?.gatedDefer > 0
            ? `<div class="toc-stat hot"><span class="k">Rope defer</span><span class="v">${loop.gatedDefer}</span></div>`
            : loop?.gatedDefer === 0
              ? `<div class="toc-stat dim"><span class="k">Rope defer</span><span class="v">0</span></div>`
              : ''
        }
      </div>
        ${
          loop?.gatedDefer > 0
            ? `<p class="toc-sub">Ops loop deferred ${loop.gatedDefer} play(s) — <a href="/portal/ops/">loop panel</a>${
                loop.capitalEfficiencyProxy != null
                  ? ` · CE ${(loop.capitalEfficiencyProxy * 100).toFixed(1)}%`
                  : ''
              }</p>`
            : loop
              ? `<p class="toc-sub">Ops loop LCR ${Math.round(Number(loop.loopCompletionRate ?? 0) * 100)}% · play ${Math.round(Number(loop.loopCompletionRateByPlay ?? 0) * 100)}% · <a href="/portal/ops/">loop panel</a></p>`
              : ''
        }
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
    ${renderProfilesRollup(data.profiles)}
    ${renderAgents(data.experts)}
    ${renderVenuesRollup(data.venues, catalog.venues)}
    ${renderPresenceRollup(data.presence, data.housePresence)}
    ${renderIdentity(identity)}
    ${renderExperiments(data.experiments)}
    ${renderPartners(partners, assetBySign, limitBySign)}

    <footer class="toc-foot">
      <a href="/registry/toc-ops.json"><code>/registry/toc-ops.json</code></a>
      · <a href="/api/toc"><code>/api/toc</code></a>
      · <a href="/portal/ops">Ops rollup</a>
      · <a href="/portal/compliance/">Compliance board</a>
      · seed <code>bun run ops:seed:toc -- --force</code>
      · <code>bun run compliance:bake</code>
    </footer>
  `;

  const openEl = root.querySelector('#toc-compliance-open');
  if (openEl) {
    openEl.textContent = String(s.complianceOpen ?? 0);
  }
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
