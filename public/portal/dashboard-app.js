/**
 * Executive Dashboard app — /portal/dashboard/
 * Proof command center + operate-plane glance (TOC / loop from ops-summary).
 * Prefers static /registry/* proofs (Cloudflare Pages) with /api/* fallbacks.
 *
 * @see docs/portal-foundation.md
 * @see public/portal/verification-card.js
 * @see public/portal/channel-filter.js
 */
import { renderVerificationResults, renderVerificationTableRow } from './verification-card.js';
import { mountProofIndex } from './proof-index.js';
import './channel-filter.js';

const $ = id => document.getElementById(id);

function esc(s) {
  if (typeof s !== 'string') return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function fetchJson(url) {
  try {
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) return { _error: true, _status: res.status, _url: url };
    return await res.json();
  } catch (e) {
    return { _error: true, _message: e instanceof Error ? e.message : String(e), _url: url };
  }
}

function isOk(obj) {
  return obj && !obj._error;
}

function summaryPass(obj) {
  const s = obj?.summary;
  if (!s) return null;
  if (typeof s.passed === 'number' && typeof s.total === 'number') {
    return { passed: s.passed, total: s.total, status: s.status };
  }
  return null;
}

function formatBySubsystem(bySubsystem) {
  if (!bySubsystem || typeof bySubsystem !== 'object') return '';
  return Object.entries(bySubsystem)
    .filter(([, v]) => v && typeof v.total === 'number' && v.total > 0)
    .map(([k, v]) => `${k} ${v.passed}/${v.total}`)
    .join(' · ');
}

function hasMetaEmbeds(results) {
  return (results || []).some(r =>
    /^(runtime-nits:|bundler:|networking:)/.test(String(r.name || ''))
  );
}

/** Up to limitPer per subsystem for diverse cards. */
function diversifyBySubsystem(results, limitPer = 2, maxTotal = 12) {
  const order = ['runtime', 'package-manager', 'networking', 'bundler', 'test', 'other'];
  const filtered = (results || []).filter(
    r => !String(r.name || '').startsWith('install platform:')
  );
  const bySub = new Map();
  for (const r of filtered) {
    const k = r.subsystem || 'other';
    if (!bySub.has(k)) bySub.set(k, []);
    bySub.get(k).push(r);
  }
  const out = [];
  const used = new Set();
  for (const sub of [...order, ...[...bySub.keys()].filter(k => !order.includes(k))]) {
    for (const r of (bySub.get(sub) || []).slice(0, limitPer)) {
      if (out.length >= maxTotal) return out;
      out.push(r);
      used.add(r.name);
    }
  }
  for (const r of filtered) {
    if (out.length >= maxTotal) break;
    if (used.has(r.name)) continue;
    out.push(r);
  }
  return out;
}

function metricCard({ label, value, detail, details, cls = '', href }) {
  const val = href
    ? `<a class="val ${cls}" href="${esc(href)}">${esc(String(value))}</a>`
    : `<div class="val ${cls}">${esc(String(value))}</div>`;
  // Structured secondary metrics — each gets its own label + value, never
  // jammed into one subtitle line. `detail` stays for static descriptors.
  const secondary = details?.length
    ? `<dl class="metrics">${details
        .map(
          ([mLabel, mValue]) =>
            `<div class="metric"><dt>${esc(mLabel)}</dt><dd>${esc(String(mValue))}</dd></div>`
        )
        .join('')}</dl>`
    : `<div class="d">${esc(detail || '')}</div>`;
  return `<article class="card metric-card" data-label="${esc(label)}">
    <div class="lbl">${esc(label)}</div>
    ${val}
    ${secondary}
  </article>`;
}

function renderSkeleton() {
  const sk = n =>
    Array.from(
      { length: n },
      () => '<div class="card skeleton skeleton-card" aria-hidden="true"></div>'
    ).join('');
  const plane = $('ops-plane');
  if (plane) {
    plane.innerHTML =
      '<div class="plane-card skeleton skeleton-card" style="min-height:140px" aria-hidden="true"></div>' +
      '<div class="plane-card skeleton skeleton-card" style="min-height:140px" aria-hidden="true"></div>' +
      '<div class="plane-card skeleton skeleton-card" style="min-height:140px" aria-hidden="true"></div>';
  }
  $('kpi-grid').innerHTML = sk(10);
  $('subsystem-grid').innerHTML = sk(4);
  $('release-cards').innerHTML =
    '<div class="skeleton skeleton-card" style="min-height:120px"></div>';
}

function fmtMoney(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  return `$${Math.round(n).toLocaleString()}`;
}

function renderOpsPlane(ops) {
  const el = $('ops-plane');
  if (!el) return;

  if (!ops || ops._error) {
    el.innerHTML = `<article class="plane-card">
      <h3>TOC Ops <span class="badge-demo">snapshot</span></h3>
      <p class="plane-detail empty-hint">
        ops-summary unavailable — open <a class="ops-link" href="/registry/ops-summary.json">ops-summary.json</a>
        or run <code>bun run ops:snapshot</code>.
      </p>
      <div class="plane-actions">
        <a class="ops-link" href="/portal/toc/">TOC board</a>
        <a class="ops-link" href="/portal/ops/">Full Ops</a>
      </div>
    </article>
    <article class="plane-card">
      <h3>Ops loop</h3>
      <p class="plane-detail empty-hint">No loop slice until ops-summary loads.</p>
    </article>
    <article class="plane-card">
      <h3>Package handshake</h3>
      <p class="plane-detail empty-hint">No handshake slice until ops-summary loads.</p>
    </article>
    <article class="plane-card">
      <h3>Seat capital desk</h3>
      <p class="plane-detail empty-hint">No seat desk slice until ops-summary loads.</p>
    </article>
    <article class="plane-card">
      <h3>Compliance</h3>
      <p class="plane-detail empty-hint">No compliance slice until ops-summary loads.</p>
    </article>`;
    return;
  }

  const toc = ops.toc;
  const loop = ops.loop;
  const compliance = ops.compliance;
  let tocHtml;
  if (toc?.available) {
    const crit = toc.criticalBottlenecks ?? 0;
    const openBn = toc.openBottlenecks ?? 0;
    const metricCls = crit > 0 ? 'err' : openBn > 0 ? 'warn' : 'ok';
    const tioe =
      toc.throughputT != null && toc.throughputI != null && toc.throughputOE != null
        ? `T ${toc.throughputT} · I ${toc.throughputI} · OE ${toc.throughputOE}`
        : 'T/I/OE not baked — reseed toc';
    const retBits = [
      toc.avgRP != null ? `avg R_P ${Number(toc.avgRP).toFixed(2)}` : '',
      toc.topRankedProcess ? `next ${toc.topRankedProcess}` : '',
      toc.settlementFloatRatio != null
        ? `settle ${Math.round(toc.settlementFloatRatio * 100)}%`
        : '',
    ].filter(Boolean);
    const focus = toc.enforcementFocus ? `focus ${toc.enforcementFocus}` : 'no enf';
    const enfFails = toc.enforcementFailed != null ? `${toc.enforcementFailed} gate fails` : '';
    tocHtml = `<article class="plane-card" data-plane="toc">
      <h3>TOC Ops <span class="badge-demo" title="Operate-lite gates baked; Soft mutations not on Pages">DEMO</span></h3>
      <div class="plane-metric ${metricCls}">${esc(String(toc.warmed ?? 0))} <span style="font-size:0.45em;font-weight:500;color:var(--text-dim)">warmed</span></div>
      <p class="plane-detail">
        ${esc(String(toc.warming ?? 0))} warming · ${esc(String(toc.onboarding ?? 0))} onboarding ·
        ${esc(String(toc.confirmedRails ?? 0))} rails · ${esc(String(openBn))} bottlenecks
        ${crit ? ` · ${esc(String(crit))} critical` : ''}
      </p>
      <p class="plane-sub">${esc(tioe)}${retBits.length ? ` · ${esc(retBits.join(' · '))}` : ''}</p>
      <p class="plane-sub">${esc([focus, enfFails, toc.identityLinked ? `identity ${toc.identityPartners ?? 0}` : 'identity unlinked'].filter(Boolean).join(' · '))}</p>
      <div class="plane-actions">
        <a class="ops-link" href="/portal/toc/">Open TOC board</a>
        <a class="ops-link" href="/registry/toc-ops.json">toc-ops.json</a>
      </div>
    </article>`;
  } else {
    tocHtml = `<article class="plane-card" data-plane="toc">
      <h3>TOC Ops <span class="badge-demo">DEMO</span></h3>
      <p class="plane-detail empty-hint">Fixture missing — run <code>bun run ops:seed:toc</code>.</p>
      <div class="plane-actions"><a class="ops-link" href="/portal/toc/">TOC board</a></div>
    </article>`;
  }

  const partners = ops.tree?.partners;
  const liq = ops.liquidity?.total;
  const completion =
    loop && typeof loop.loopCompletionRate === 'number'
      ? `${Math.round(loop.loopCompletionRate * 100)}%`
      : '—';
  const capParts = [];
  if (loop?.capitalEfficiencyProxy != null) {
    capParts.push(`CE ${Number(loop.capitalEfficiencyProxy).toFixed(2)}`);
  }
  if (loop?.limitEfficiencyProxy != null) {
    capParts.push(`LE ${Number(loop.limitEfficiencyProxy).toFixed(2)}`);
  }
  if (loop?.processReturnProxy != null) {
    capParts.push(`RP ${Number(loop.processReturnProxy).toFixed(2)}`);
  }
  const capLine = capParts.length ? ` · ${capParts.join(' · ')}` : '';
  const failRate =
    ops.channels?.failRate != null
      ? `${Math.round(ops.channels.failRate * 100)}%`
      : ops.outbox?.failRate != null
        ? `${Math.round(ops.outbox.failRate * 100)}%`
        : null;
  const loopHtml = `<article class="plane-card" data-plane="loop">
    <h3>Tree · loop · liquidity</h3>
    <div class="plane-metric ${partners != null ? 'ok' : 'warn'}">${esc(
      partners != null ? String(partners) : '—'
    )} <span style="font-size:0.45em;font-weight:500;color:var(--text-dim)">partners</span></div>
    <p class="plane-detail">
      ${esc(String(ops.tree?.agents ?? 0))} agents · liquidity ${esc(fmtMoney(liq))} ·
      loop complete ${esc(completion)}
    </p>
    <p class="plane-sub">${
      loop
        ? esc(
            `dispatch ${loop.dispatched ?? 0} · reserve ${loop.reserved ?? 0} · settle ${loop.settled ?? 0} · outbox ${loop.outboxSent ?? 0}/${(loop.outboxSent ?? 0) + (loop.outboxFailed ?? 0)}` +
              (loop.projectorBackend ? ` · projector ${loop.projectorBackend}` : '')
          )
        : 'No loop slice'
    }${failRate != null ? esc(` · fail ${failRate}`) : ''}${esc(capLine)}</p>
    <div class="plane-actions">
      <a class="ops-link" href="/portal/ops/">Full Ops</a>
      <a class="ops-link" href="/registry/ops-summary.json">ops-summary.json</a>
    </div>
  </article>`;

  const tg = ops.telegramHandshake;
  let handshakeHtml;
  if (tg?.available) {
    const gaps = tg.inviteGaps ?? 0;
    const gapCls = gaps === 0 ? 'ok' : 'err';
    const gapRows = (tg.rows ?? []).filter(r => r.needsPartnerInForum).slice(0, 3);
    const gapList =
      gapRows.length > 0
        ? `<ul class="plane-gap-list">${gapRows
            .map(
              r =>
                `<li><code>${esc(r.partnerCode)}</code> · ${esc(r.membershipCell)}${r.inviteSentAt ? ' · sent' : ' · pending'}</li>`
            )
            .join('')}</ul>`
        : '';
    handshakeHtml = `<article class="plane-card" data-plane="telegram-handshake">
      <h3>Package handshake <span class="badge-demo" title="Baked from ops:snapshot">snapshot</span></h3>
      <div class="plane-metric ${gapCls}">${esc(String(gaps))} <span style="font-size:0.45em;font-weight:500;color:var(--text-dim)">invite gaps</span></div>
      <p class="plane-detail">
        ${esc(String(tg.partners ?? 0))} linked · ${esc(String(tg.operatorReady ?? 0))} operator_ready ·
        ${esc(String(tg.designated ?? 0))} designated · ${esc(String(tg.blocked ?? 0))} blocked
      </p>
      <p class="plane-sub">verify fail ${esc(String(tg.verifyFailPartners ?? 0))} · lane fail ${esc(String(tg.laneFailPartners ?? 0))}${
        tg.generatedAt ? ` · baked ${esc(String(tg.generatedAt).slice(0, 19))}` : ''
      }</p>
      ${gapList}
      <div class="plane-actions">
        <a class="ops-link" href="/portal/ops/#telegram-handshake">Ops panel</a>
        <a class="ops-link" href="/registry/telegram-handshake.json">handshake.json</a>
      </div>
    </article>`;
  } else {
    handshakeHtml = `<article class="plane-card" data-plane="telegram-handshake">
      <h3>Package handshake</h3>
      <p class="plane-detail empty-hint">No registry rows — link package groups, then <code>bun run ops:snapshot</code>.</p>
      <div class="plane-actions"><a class="ops-link" href="/portal/ops/">Full Ops</a></div>
    </article>`;
  }

  // ── Limit raises plane card ──
  const lims = ops.limitChanges;
  let limitHtml;
  if (lims && lims.length > 0) {
    const raises = lims.filter(r => r.direction === 'up').length;
    const downs = lims.filter(r => r.direction === 'down').length;
    const top3 = lims
      .slice(0, 3)
      .map(r => {
        const icon = r.direction === 'down' ? '⬇️' : '🚀';
        const drivers = (r.top_contributing_factors ?? []).join(', ');
        const proof = r.context_proof?.valid
          ? 'context proof verified'
          : r.context_proof?.signed
            ? 'signed context; proof not verified'
            : 'unsigned or pending context';
        const title = drivers ? `Drivers: ${drivers} · ${proof}` : `Drivers pending · ${proof}`;
        const score = r.context_available
          ? `<span class="badge-demo" title="${esc(title)}">${Math.round((r.multi_factor_score ?? 0) * 100)} score</span>`
          : `<span class="badge-demo" title="${esc(title)}">context pending</span>`;
        return `<li><code>${esc(r.sportsbook)}</code> ${esc(r.sport_id)}/${esc(r.market_id)} <strong>$${r.new_limit}</strong> ${icon} <span style="color:var(--text-dim)">($${r.previous_max})</span> ${score}${r.predicted_raise_prob != null ? ` <span class="badge-demo">🔮${(r.predicted_raise_prob * 100).toFixed(0)}%</span>` : ''}</li>`;
      })
      .join('');
    limitHtml = `<article class="plane-card" data-plane="limit-raises">
      <h3>📊 Limit changes <span class="badge-demo" title="Live query, 48h window">🚀${raises} ⬇️${downs}</span></h3>
      <ul class="plane-gap-list">${top3}</ul>
      <p class="plane-sub">${ops.prediction?.limitRaise?.n > 0 ? `🎯 prediction accuracy MAE ${Number(ops.prediction.limitRaise.mae).toFixed(3)} (${ops.prediction.limitRaise.n} samples)` : ''}</p>
      <div class="plane-actions">
        <a class="ops-link" href="/portal/limits/">Limits board</a>
        <a class="ops-link" href="/portal/ops/">Full Ops</a>
        <a class="ops-link" href="/registry/limit-raises.json">limit-raises.json</a>
      </div>
    </article>`;
  } else {
    limitHtml = `<article class="plane-card" data-plane="limit-raises">
      <h3>Limit increases</h3>
      <p class="plane-detail empty-hint">No recent increases.</p>
      <div class="plane-actions">
        <a class="ops-link" href="/portal/limits/">Limits board</a>
        <a class="ops-link" href="/portal/ops/">Full Ops</a>
      </div>
    </article>`;
  }

  const scd = ops.seatCapitalDesk;
  let seatDeskHtml;
  if (scd?.available && (scd.desks ?? 0) > 0) {
    const incomplete = scd.incompleteOuts ?? 0;
    const blocked = scd.blocked ?? 0;
    const metricCls = incomplete > 0 || blocked > 0 ? 'err' : 'ok';
    seatDeskHtml = `<article class="plane-card" data-plane="seat-capital-desk">
      <h3>Seat capital desk <span class="badge-demo" title="Baked from ops:snapshot">snapshot</span></h3>
      <div class="plane-metric ${metricCls}">${esc(String(incomplete))} <span style="font-size:0.45em;font-weight:500;color:var(--text-dim)">incomplete outs</span></div>
      <p class="plane-detail">
        ${esc(String(scd.desks ?? 0))} desks · blocked ${esc(String(blocked))} · partial ${esc(String(scd.partial ?? 0))} · ready ${esc(String(scd.ready ?? 0))} · funded ${esc(String(scd.funded ?? 0))}
      </p>
      <p class="plane-sub">${scd.generatedAt ? `baked ${esc(String(scd.generatedAt).slice(0, 19))}` : ''}</p>
      <div class="plane-actions">
        <a class="ops-link" href="/portal/ops/#seat-capital-desk">Ops panel</a>
        <a class="ops-link" href="/registry/seat-capital-desk.json">seat-capital-desk.json</a>
      </div>
    </article>`;
  } else {
    seatDeskHtml = `<article class="plane-card" data-plane="seat-capital-desk">
      <h3>Seat capital desk</h3>
      <p class="plane-detail empty-hint">No desks — run <code>bun run seat:desk:post</code>, then <code>bun run ops:snapshot</code>.</p>
      <div class="plane-actions"><a class="ops-link" href="/portal/ops/">Full Ops</a></div>
    </article>`;
  }

  let complianceHtml;
  if (compliance?.available) {
    const mm = compliance.shadowMismatches ?? 0;
    const metricCls = compliance.ok ? 'ok' : mm > 0 ? 'err' : 'warn';
    const states = (compliance.states || ['MA', 'NJ']).join('/');
    complianceHtml = `<article class="plane-card" data-plane="compliance">
      <h3>Compliance <span class="badge-demo" title="Baked MA/NJ board">MA/NJ</span></h3>
      <div class="plane-metric ${metricCls}">${esc(String(compliance.enhancements ?? (compliance.ok ? 'ok' : 'fail')))}</div>
      <p class="plane-detail">
        ${esc(states)} · shadow Δ ${esc(String(mm))}
        ${compliance.shadowAllow != null ? ` · allow ${esc(String(compliance.shadowAllow))}/block ${esc(String(compliance.shadowBlock ?? 0))}` : ''}
      </p>
      <p class="plane-sub">${esc(
        [
          compliance.geoProfiles != null ? `${compliance.geoProfiles} geo profiles` : '',
          compliance.hmac ? 'HMAC' : 'integrity-only',
          compliance.scoreHint || '',
        ]
          .filter(Boolean)
          .join(' · ')
      )}</p>
      <div class="plane-actions">
        <a class="ops-link" href="/portal/compliance/">Compliance board</a>
        <a class="ops-link" href="/registry/compliance-board.json">Board JSON</a>
        <a class="ops-link" href="/portal/toc/">TOC · venues/geo</a>
      </div>
    </article>`;
  } else {
    complianceHtml = `<article class="plane-card" data-plane="compliance">
      <h3>Compliance <span class="badge-demo">MA/NJ</span></h3>
      <p class="plane-detail empty-hint">Board missing — run <code>bun run compliance:bake</code>.</p>
      <div class="plane-actions"><a class="ops-link" href="/portal/compliance/">Compliance board</a></div>
    </article>`;
  }

  el.innerHTML = tocHtml + loopHtml + handshakeHtml + limitHtml + seatDeskHtml + complianceHtml;
}

function proofStatusCls(sum) {
  if (!sum) return 'warn';
  if (sum.status === 'pass' || sum.passed === sum.total) return 'ok';
  if (sum.passed === 0) return 'err';
  return 'warn';
}

function renderKpis(ctx) {
  const { def, mon, release, installPlatform, installEnv, bundler, nits, taxonomy, ops } = ctx;
  const relSum = summaryPass(release);
  const taxOk = taxonomy?.ok === true;
  const taxAudits = taxonomy?.audits?.length ?? 0;
  const taxPass = taxonomy?.audits?.filter(a => a.ok).length ?? 0;
  const tree = ops?.tree;
  const partners = tree?.partners ?? mon?.tree?.partners;

  const cards = [
    {
      label: 'Release verification',
      value: relSum ? `${relSum.passed}/${relSum.total}` : '—',
      details: hasMetaEmbeds(release?.results)
        ? [
            ['mode', 'meta'],
            [
              'channel',
              `${release?.semanticTags?.channel || '?'}@${release?.semanticTags?.targetVersion || '?'}`,
            ],
          ]
        : release?.semanticTags
          ? [
              ['mode', 'bare'],
              ['bun', release.bunVersion || '?'],
            ]
          : undefined,
      detail:
        hasMetaEmbeds(release?.results) || release?.semanticTags
          ? undefined
          : 'Run verify:channel:meta',
      cls: proofStatusCls(relSum),
      href: '/registry/release-features.json',
    },
    {
      label: 'Taxonomy contracts',
      value: taxAudits ? `${taxPass}/${taxAudits}` : '—',
      detail: taxOk ? 'all green' : taxonomy?._error ? 'unavailable' : 'see audit',
      cls: taxOk ? 'ok' : taxAudits ? 'err' : 'warn',
      href: '/registry/proof-taxonomy-audit.json',
    },
    {
      label: 'Install platform',
      value: (() => {
        const s = summaryPass(installPlatform);
        return s ? `${s.passed}/${s.total}` : '—';
      })(),
      detail: installPlatform?.dryRun ? 'dry-run aspects' : 'aspects',
      cls: proofStatusCls(summaryPass(installPlatform)),
      href: '/registry/install-platform.json',
    },
    {
      label: 'Install env',
      value: (() => {
        const s = summaryPass(installEnv);
        return s ? `${s.passed}/${s.total}` : '—';
      })(),
      detail: 'BUN_CONFIG_* + scopes',
      cls: proofStatusCls(summaryPass(installEnv)),
      href: '/registry/install-env-proof.json',
    },
    {
      label: 'Bundler loaders',
      value: (() => {
        const s = summaryPass(bundler);
        return s ? `${s.passed}/${s.total}` : '—';
      })(),
      detail: 'css · jsonc · ts · text · file',
      cls: proofStatusCls(summaryPass(bundler)),
      href: '/registry/bundler-loaders-proof.json',
    },
    {
      label: 'Runtime nits',
      value: (() => {
        const s = summaryPass(nits);
        return s ? `${s.passed}/${s.total}` : '—';
      })(),
      detail: 'inspect · streams · url · file',
      cls: proofStatusCls(summaryPass(nits)),
      href: '/registry/bun-runtime-nits-proof.json',
    },
    {
      label: 'Bun defaults',
      value:
        def?.summary?.passed != null
          ? `${def.summary.passed}/${def.summary.total}`
          : def?.passed != null
            ? `${def.passed}/${def.total}`
            : '—',
      details: def?.bunVersion
        ? [
            ['bun', def.bunVersion],
            ...(def.summary?.status ? [['status', def.summary.status]] : []),
          ]
        : undefined,
      detail: def?.bunVersion ? undefined : def?.status || 'defaults proof',
      cls:
        def?.summary?.status === 'pass' ||
        (def?.summary?.passed ?? def?.passed) === (def?.summary?.total ?? def?.total)
          ? 'ok'
          : def?._error
            ? 'warn'
            : 'err',
      href: '/registry/defaults-proof.json',
    },
    {
      label: 'Tree / liquidity',
      value: partners != null ? String(partners) : (ops?.liquidity?.total ?? mon?.dodQueue ?? '—'),
      details:
        partners != null
          ? [
              ['agents', tree?.agents ?? 0],
              ['liquidity', `$${ops?.liquidity?.total ?? '—'}`],
            ]
          : undefined,
      detail:
        partners != null
          ? undefined
          : mon?.experimentsActive != null
            ? `${mon.experimentsActive} experiments`
            : 'ops-summary',
      cls: partners != null || ops?.liquidity ? 'ok' : 'warn',
      href: '/registry/ops-summary.json',
    },
    {
      label: 'TOC warmed',
      value: ops?.toc?.available ? String(ops.toc.warmed ?? 0) : '—',
      details: ops?.toc?.available
        ? [
            ['warming', ops.toc.warming ?? 0],
            ['bottlenecks', ops.toc.openBottlenecks ?? 0],
          ]
        : undefined,
      detail: ops?.toc?.available ? undefined : 'seed toc fixture',
      cls: ops?.toc?.available
        ? ops.toc.criticalBottlenecks > 0
          ? 'err'
          : ops.toc.openBottlenecks > 0
            ? 'warn'
            : 'ok'
        : 'warn',
      href: '/portal/toc/',
    },
    {
      label: 'Loop settle',
      value: ops?.loop?.settled != null ? String(ops.loop.settled) : '—',
      details:
        ops?.loop != null
          ? [
              ['dispatched', ops.loop.dispatched ?? 0],
              [
                'complete',
                typeof ops.loop.loopCompletionRate === 'number'
                  ? `${Math.round(ops.loop.loopCompletionRate * 100)}%`
                  : 'n/a',
              ],
            ]
          : undefined,
      detail: ops?.loop != null ? undefined : 'ops-summary.loop',
      cls: ops?.loop?.settled != null ? 'ok' : 'warn',
      href: '/registry/ops-summary.json',
    },
    {
      label: 'Compliance',
      value: ops?.compliance?.available
        ? String(ops.compliance.enhancements ?? (ops.compliance.ok ? 'ok' : 'fail'))
        : '—',
      details: ops?.compliance?.available
        ? [
            ['shadow Δ', ops.compliance.shadowMismatches ?? 0],
            ...(ops.compliance.geoProfiles != null ? [['geo', ops.compliance.geoProfiles]] : []),
            ...(ops.compliance.hmac ? [['HMAC', '✓']] : []),
          ]
        : undefined,
      detail: ops?.compliance?.available ? undefined : 'compliance:bake',
      cls: ops?.compliance?.available
        ? ops.compliance.ok
          ? 'ok'
          : (ops.compliance.shadowMismatches ?? 0) > 0
            ? 'err'
            : 'warn'
        : 'warn',
      href: '/portal/compliance/',
    },
  ];

  $('kpi-grid').innerHTML = cards.map(metricCard).join('');
}

function renderSubsystems(release) {
  const by = release?.summary?.bySubsystem || {};
  const pillars = ['runtime', 'package-manager', 'networking', 'bundler', 'test', 'other'];
  const html = pillars
    .filter(p => by[p]?.total)
    .map(p => {
      const b = by[p];
      const cls = b.passed === b.total ? 'ok' : b.passed === 0 ? 'err' : 'warn';
      return metricCard({
        label: p,
        value: `${b.passed}/${b.total}`,
        detail: 'release meta rollup',
        cls: `subsystem-${p} ${cls}`,
      });
    });
  $('subsystem-grid').innerHTML =
    html.join('') ||
    '<p class="empty-hint">No bySubsystem on release proof — run <code>bun run verify:channel:meta</code>.</p>';
}

function renderReleaseSection(release, bake) {
  const tags = release?.semanticTags || {};
  const results = release?.results || [];
  const meta = hasMetaEmbeds(results);
  const modeEl = $('release-mode');
  if (modeEl) {
    if (meta && bake?.type === 'ChannelMetaBake' && !bake.stale) {
      modeEl.textContent = `meta · ${results.length} rows · bake ${bake.passed}/${bake.total}`;
      modeEl.className = 'version-badge match-ok';
    } else if (meta) {
      modeEl.textContent = `meta · ${results.length} rows`;
      modeEl.className = 'version-badge match-ok';
    } else if (bake?.type === 'ChannelMetaBakeInvalid' || bake?.stale) {
      modeEl.textContent = 'bare · bake invalid';
      modeEl.className = 'version-badge match-no';
    } else {
      modeEl.textContent = results.length ? `bare · ${results.length} rows` : '—';
      modeEl.className = 'version-badge';
    }
  }

  const detail = $('release-detail');
  if (detail) {
    if (tags.channel) {
      detail.textContent = `channel ${tags.channel} → ${tags.targetVersion || '?'} · runtime ${tags.runtimeVersion || release?.bunVersion || '?'} · ${formatBySubsystem(release?.summary?.bySubsystem)}`;
    } else {
      detail.textContent = release?._error
        ? 'Release proof unavailable'
        : 'Load /registry/release-features.json';
    }
  }

  const hash = $('release-hash');
  if (hash) {
    hash.textContent = release?.proofHash
      ? `sha256 ${String(release.proofHash).slice(0, 16)}…`
      : '';
  }

  const preview = diversifyBySubsystem(results, 2, 12);
  const cards = $('release-cards');
  if (cards) {
    if (preview.length && tags) {
      cards.innerHTML = renderVerificationResults({ results: preview, semanticTags: tags }, 12);
    } else if (preview.length) {
      cards.innerHTML = `<table class="ops-table"><thead><tr><th>Test</th><th>Status</th><th>Docs</th></tr></thead><tbody>${preview
        .map(r => renderVerificationTableRow(r))
        .join('')}</tbody></table>`;
    } else {
      cards.innerHTML = '<p class="empty-hint">No release results.</p>';
    }
  }

  // Apply channel-filter after cards mount
  requestAnimationFrame(() => {
    document.querySelector('channel-filter')?.applyFilter?.();
  });
}

function renderDefaults(def) {
  const el = $('defaults-tbl');
  if (!el) return;
  const tests = def?.tests || def?.results || [];
  if (!tests.length) {
    el.innerHTML =
      '<h2>Bun defaults</h2><p class="empty-hint">No defaults proof — try <a href="/registry/defaults-proof.json">defaults-proof.json</a> or /api/defaults.</p>';
    return;
  }
  const rows = tests
    .map(
      t =>
        `<tr><td>${esc(t.name)}</td><td class="mono">${esc(String(t.expected ?? '').slice(0, 80))}</td><td>${t.passed ? '✅' : '❌'}</td></tr>`
    )
    .join('');
  const hash = def.proofHash || def.summary?.proofHash || '';
  el.innerHTML = `<h2>Bun defaults verification</h2>
    <table class="ops-table"><thead><tr><th>Test</th><th>Expected</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
    ${hash ? `<p class="proof-line"><span class="phash">sha256 ${esc(String(hash).slice(0, 24))}…</span></p>` : ''}`;
}

function renderTaxonomy(taxonomy) {
  const el = $('taxonomy-tbl');
  if (!el) return;
  const audits = taxonomy?.audits || [];
  if (!audits.length) {
    el.innerHTML =
      '<h2>Proof taxonomy</h2><p class="empty-hint">No audit — run <code>bun run verify:proof-taxonomy:save</code>.</p>';
    return;
  }
  const rows = audits
    .map(a => {
      const file =
        String(a.path || '')
          .split('/')
          .pop() || a.path;
      const sub = a.primarySubsystem
        ? `<span class="version-badge subsystem-${esc(a.primarySubsystem)}">${esc(a.primarySubsystem)}</span>`
        : '—';
      return `<tr><td><a class="ops-link" href="${esc(a.reportPath || '#')}">${esc(file)}</a></td><td>${sub}</td><td>${a.rows > 0 ? a.rows : 'report'}</td><td>${a.ok ? '✅' : '❌'}</td></tr>`;
    })
    .join('');
  const cOk = (taxonomy.consistency || []).filter(c => c.ok).length;
  const cTot = (taxonomy.consistency || []).length;
  el.innerHTML = `<h2>Proof taxonomy audit</h2>
    <p class="section-sub">${taxonomy.ok ? '✅' : '❌'} contracts · consistency ${cOk}/${cTot}</p>
    <table class="ops-table"><thead><tr><th>Artifact</th><th>Subsystem</th><th>Rows</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderErrors(failed) {
  const el = $('errors');
  if (!el) return;
  if (!failed.length) {
    el.innerHTML = '';
    el.classList.add('hidden');
    return;
  }
  el.classList.remove('hidden');
  el.innerHTML = `<div class="err-box" role="alert">
    <strong>Some data sources failed</strong>
    <ul>${failed.map(f => `<li><code>${esc(f.url)}</code> — ${esc(String(f.status || f.message || 'error'))}</li>`).join('')}</ul>
    <button type="button" class="btn" id="retry-btn">Retry</button>
    <a class="ops-link" href="/portal/ops">Open full Ops dashboard</a>
  </div>`;
  $('retry-btn')?.addEventListener('click', () => load());
}

export async function load() {
  renderSkeleton();
  $('ts').textContent = 'Loading…';
  const gate = document.getElementById('dash-gate');
  const baked = document.getElementById('dash-baked');
  if (gate) gate.textContent = 'Loading dashboard…';
  if (baked) baked.textContent = 'Fetching proof slices…';
  $('errors')?.classList.add('hidden');

  const urls = {
    def: ['/api/defaults', '/registry/defaults-proof.json', '/registry/bun-defaults-proof.json'],
    mon: ['/api/monitoring', '/registry/monitoring.json'],
    release: ['/registry/release-features.json', '/api/release'],
    installPlatform: ['/registry/install-platform.json'],
    installEnv: ['/registry/install-env-proof.json'],
    bundler: ['/registry/bundler-loaders-proof.json'],
    nits: ['/registry/bun-runtime-nits-proof.json'],
    taxonomy: ['/registry/proof-taxonomy-audit.json'],
    ops: ['/api/operations/summary', '/registry/ops-summary.json'],
    bake: ['/registry/channel-meta-bake.json'],
  };

  async function firstOk(list) {
    for (const u of list) {
      const j = await fetchJson(u);
      if (isOk(j)) return j;
    }
    return list.length ? await fetchJson(list[0]) : { _error: true };
  }

  const [def, mon, release, installPlatform, installEnv, bundler, nits, taxonomy, ops, bake] =
    await Promise.all([
      firstOk(urls.def),
      firstOk(urls.mon),
      firstOk(urls.release),
      firstOk(urls.installPlatform),
      firstOk(urls.installEnv),
      firstOk(urls.bundler),
      firstOk(urls.nits),
      firstOk(urls.taxonomy),
      firstOk(urls.ops),
      firstOk(urls.bake),
    ]);

  const failed = [def, mon, release, taxonomy]
    .filter(x => x?._error)
    .map(x => ({ url: x._url, status: x._status, message: x._message }));

  const ctx = {
    def,
    mon,
    release,
    installPlatform,
    installEnv,
    bundler,
    nits,
    taxonomy,
    ops,
    bake,
  };

  renderOpsPlane(ops);
  renderKpis(ctx);
  renderSubsystems(isOk(release) ? release : null);
  renderReleaseSection(isOk(release) ? release : null, isOk(bake) ? bake : null);
  renderDefaults(isOk(def) ? def : null);
  renderTaxonomy(isOk(taxonomy) ? taxonomy : null);
  renderErrors(failed);
  // Document-plane verification pins (formdata, networking, stable/pinned 1.4.0)
  void mountProofIndex(document.getElementById('proof-index-host'));

  $('ts').textContent = `Updated ${new Date().toLocaleTimeString()}`;
  if (gate) gate.textContent = failed.length ? 'Dashboard loaded with gaps' : 'Dashboard live';
  if (baked) {
    baked.textContent = [
      failed.length ? `${failed.length} source(s) failed` : 'All primary slices loaded',
      ops?.generatedAt ? `ops ${ops.generatedAt}` : null,
      release?.generatedAt ? `release ${release.generatedAt}` : null,
    ]
      .filter(Boolean)
      .join(' · ');
  }
  document.dispatchEvent(new CustomEvent('portal:dashboard-ready', { detail: ctx }));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => load());
} else {
  load();
}

document.getElementById('refresh-btn')?.addEventListener('click', () => load());
