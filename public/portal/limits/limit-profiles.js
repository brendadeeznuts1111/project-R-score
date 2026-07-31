import { bootGlossaryUx, trackGlossaryEvent } from '../components/glossary-ux.js';

const PROFILE_URL = '/registry/limit-raises.json';
const PROFILE_POLL_INTERVAL = 30_000;
const limitsPagePattern = new URLPattern({ pathname: '/portal/limits/' });
const accountPattern = new URLPattern({ hash: 'account\\::account' });
const sectionPattern = new URLPattern({ hash: 'section\\::section' });
const PROFILE_QUERY_PARAMS = {
  query: 'profile',
  status: 'monitoring',
  jurisdiction: 'jurisdiction',
};
const GLOSSARY_CONCEPT_PATTERN = /^[a-z0-9][a-z0-9._-]*$/i;
const MARKET_GLOSSARY_CONCEPTS = Object.freeze({
  match_winner: 'market.match_winner',
  over_under: 'market.total',
  spread: 'market.point_spread',
});
const SPORT_GLOSSARY_CONCEPTS = Object.freeze({
  american_football: 'sport.american_football',
  baseball: 'sport.baseball',
  basketball: 'sport.basketball',
  golf: 'sport.golf',
  hockey: 'sport.hockey',
  mma: 'sport.mma',
  soccer: 'sport.soccer',
  tennis: 'sport.tennis',
});

let projection = null;
let selectedAccount = null;

function esc(value) {
  const element = document.createElement('div');
  element.textContent = value == null ? '' : String(value);
  return element.innerHTML;
}

function glossaryHref(concept, fallback = 'page.limitPatterns') {
  const candidate = String(concept ?? '');
  const safeConcept = GLOSSARY_CONCEPT_PATTERN.test(candidate) ? candidate : fallback;
  return '/portal/glossary/#glossary:' + encodeURIComponent(safeConcept);
}

/** Wire market_id → preferred sports-betting glossary concept. */
function marketGlossaryConcept(marketKey) {
  return MARKET_GLOSSARY_CONCEPTS[marketKey] ?? 'ops.limits.market_type';
}

function sportGlossaryConcept(sportKey) {
  return SPORT_GLOSSARY_CONCEPTS[sportKey] ?? 'ops.limits.sport';
}

function accountHash(treeNodeId) {
  return `#account:${encodeURIComponent(treeNodeId)}`;
}

function shortRef(value) {
  const text = value == null ? '' : String(value);
  return text.length > 22 ? `${text.slice(0, 9)}…${text.slice(-8)}` : text;
}

function labelFromKey(value) {
  return String(value)
    .split(/[-_]/g)
    .filter(Boolean)
    .map(word => `${word[0]?.toUpperCase() ?? ''}${word.slice(1)}`)
    .join(' ');
}

function accountFromUrl() {
  if (!limitsPagePattern.test(window.location.href)) return null;
  const captured = accountPattern.exec(window.location.href)?.hash.groups.account ?? null;
  if (!captured) return null;
  try {
    return decodeURIComponent(captured);
  } catch {
    return captured;
  }
}

function sectionFromUrl() {
  if (!limitsPagePattern.test(window.location.href)) return null;
  return sectionPattern.exec(window.location.href)?.hash.groups.section ?? null;
}

function syncSectionFromUrl() {
  const section = sectionFromUrl();
  if (!section) return;
  document.getElementById(section)?.scrollIntoView({ block: 'start' });
}

function syncProfileFiltersFromUrl() {
  const url = new URL(window.location.href);
  const query = document.getElementById('profile-filter');
  const status = document.getElementById('profile-status');
  const jurisdiction = document.getElementById('profile-jurisdiction');
  if (query) query.value = url.searchParams.get(PROFILE_QUERY_PARAMS.query) ?? '';
  if (status) status.value = url.searchParams.get(PROFILE_QUERY_PARAMS.status) ?? '';
  if (jurisdiction) {
    const requested = url.searchParams.get(PROFILE_QUERY_PARAMS.jurisdiction) ?? '';
    jurisdiction.value = [...jurisdiction.options].some(option => option.value === requested)
      ? requested
      : '';
  }
}

function syncProfileFiltersToUrl() {
  const url = new URL(window.location.href);
  const values = {
    [PROFILE_QUERY_PARAMS.query]: document.getElementById('profile-filter')?.value.trim() ?? '',
    [PROFILE_QUERY_PARAMS.status]: document.getElementById('profile-status')?.value ?? '',
    [PROFILE_QUERY_PARAMS.jurisdiction]:
      document.getElementById('profile-jurisdiction')?.value ?? '',
  };
  for (const [parameter, value] of Object.entries(values)) {
    if (value) url.searchParams.set(parameter, value);
    else url.searchParams.delete(parameter);
  }
  history.replaceState(history.state, '', url);
}

function setSelectedAccount(treeNodeId, push = true) {
  selectedAccount = treeNodeId;
  const url = new URL(window.location.href);
  url.hash = accountHash(treeNodeId);
  if (push) history.pushState({ account: treeNodeId }, '', url);
  else history.replaceState({ account: treeNodeId }, '', url);
  renderProfiles();
}

function formatDate(value) {
  if (!value) return 'not observed';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function formatMoney(value) {
  return value == null
    ? '—'
    : new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(Number(value));
}

function rulesLabel(rules) {
  const labels = [];
  if (rules?.min_age != null) labels.push(`age ${rules.min_age}+`);
  if (rules?.max_daily_total != null) {
    labels.push(`${formatMoney(rules.max_daily_total)} daily`);
  }
  if (rules?.max_weekly_total != null) {
    labels.push(`${formatMoney(rules.max_weekly_total)} weekly`);
  }
  if (rules?.require_identity_verification) labels.push('identity required');
  if (rules?.allowed_zip_prefixes?.length) {
    labels.push(`ZIP ${rules.allowed_zip_prefixes.join(', ')}`);
  }
  return labels.join(' · ') || 'standard';
}

function summaryCard(value, label, concept, tone = 'skip', description = '') {
  return `<div class="profile-summary__item">
    <strong data-tone="${esc(tone)}">${esc(value)}</strong>
    <a class="semantic-label" href="${glossaryHref(concept)}">${esc(label)}</a>
    ${description ? `<small>${esc(description)}</small>` : ''}
  </div>`;
}

function renderSummary() {
  const target = document.getElementById('profile-summary');
  if (!target || !projection) return;
  const summary = projection.summary;
  target.innerHTML = [
    summaryCard(summary.accounts, 'accounts', 'ops.limits.account'),
    summaryCard(summary.monitored, 'monitored', 'ops.limits.monitoring_status', 'ok'),
    summaryCard(summary.attention, 'attention', 'ops.limits.monitoring_status', 'warn'),
    summaryCard(summary.blocked, 'blocked', 'ops.limits.monitoring_status', 'bad'),
    summaryCard(summary.jurisdictions, 'jurisdictions', 'ops.limits.jurisdiction_policy'),
    summaryCard(summary.policies, 'effective policies', 'ops.limits.policy_code'),
    summaryCard(summary.traceEvents, 'trace events', 'ops.limits.evidence_trace'),
  ].join('');
}

function renderComplianceKpis() {
  const target = document.getElementById('compliance-policy-kpis');
  if (!target || !projection) return;
  target.innerHTML = projection.kpis
    .map(kpi => summaryCard(kpi.value, kpi.label, kpi.key, kpi.tone, kpi.description))
    .join('');
}

function renderJurisdictionOptions() {
  const select = document.getElementById('profile-jurisdiction');
  if (!select || !projection) return;
  const current = select.value;
  const states = [...new Set(projection.policies.map(policy => policy.stateCode))].sort();
  select.innerHTML =
    '<option value="">All jurisdictions</option>' +
    states.map(state => `<option value="${esc(state)}">${esc(state)}</option>`).join('');
  select.value = states.includes(current) ? current : '';
}

function filteredProfiles() {
  if (!projection) return [];
  const query = document.getElementById('profile-filter')?.value.trim().toLowerCase() ?? '';
  const status = document.getElementById('profile-status')?.value ?? '';
  const state = document.getElementById('profile-jurisdiction')?.value ?? '';
  return projection.profiles.filter(profile => {
    if (status && profile.monitoringStatus !== status) return false;
    if (state && profile.jurisdiction.stateCode !== state) return false;
    if (!query) return true;
    const haystack = [
      profile.treeNodeId,
      profile.profileKey,
      profile.accountName,
      profile.accountKind,
      profile.lifecycleStatus,
      profile.jurisdiction.stateCode,
      profile.jurisdiction.location,
      profile.license?.licenseNumber,
      ...profile.policyCodes,
      ...profile.observations.sportsbooks,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  });
}

function profileCard(profile) {
  const isSelected = profile.treeNodeId === selectedAccount;
  const state = profile.jurisdiction.stateCode ?? 'not assigned';
  const location = profile.jurisdiction.location ?? 'Location not observed';
  const zip = profile.jurisdiction.zipCode ?? 'ZIP not observed';
  const license = profile.license
    ? `${profile.license.status}${profile.license.licenseNumber ? ` · ${profile.license.licenseNumber}` : ''}`
    : 'No license binding';
  return `<article class="account-profile" data-tone="${esc(profile.tone)}" data-account="${esc(profile.treeNodeId)}" aria-current="${isSelected}">
    <div class="account-profile__head">
      <div class="account-profile__title">
        <a href="${accountHash(profile.treeNodeId)}" data-account-link="${esc(profile.treeNodeId)}">${esc(profile.accountName)}</a>
        <div class="account-profile__identity">
          <code title="${esc(profile.treeNodeId)}">${esc(shortRef(profile.treeNodeId))}</code>
          <span class="profile-kind">${esc(profile.accountKind)}</span>
          <span class="profile-state">${esc(state)}</span>
        </div>
      </div>
      <span class="status-token" data-tone="${esc(profile.tone)}" data-glossary-concept="ops.limits.monitoring_status">${esc(profile.monitoringStatus)}</span>
    </div>
    <dl class="account-profile__facts">
      <div>
        <dt><a class="semantic-label" href="${glossaryHref('ops.limits.profile')}">Profile</a></dt>
        <dd><code title="${esc(profile.profileKey ?? 'unbound')}">${esc(shortRef(profile.profileKey ?? 'unbound'))}</code> · ${esc(profile.lifecycleStatus ?? 'no lifecycle state')}</dd>
      </div>
      <div>
        <dt>Location</dt>
        <dd>${esc(location)} · <code>${esc(zip)}</code></dd>
      </div>
      <div>
        <dt>License</dt>
        <dd>${esc(license)}</dd>
      </div>
    </dl>
    <div class="account-profile__metrics" aria-label="Account evidence counts">
      <span class="account-profile__metric"><strong>${profile.observations.dimensions}</strong>dimensions</span>
      <span class="account-profile__metric"><strong>${profile.observations.sportsbooks.length}</strong>books</span>
      <span class="account-profile__metric"><strong>${profile.policyCodes.length}</strong>policies</span>
      <span class="account-profile__metric"><strong>${profile.observations.violations30d}</strong>blocked</span>
    </div>
    <div class="account-profile__footer">
      <small>Observed ${esc(formatDate(profile.observations.lastObservedAt))}</small>
      <a href="${accountHash(profile.treeNodeId)}" data-account-link="${esc(profile.treeNodeId)}">Inspect ${profile.traces.length} events →</a>
    </div>
  </article>`;
}

function renderTrace() {
  const target = document.getElementById('account-trace');
  if (!target || !projection) return;
  const profile =
    projection.profiles.find(item => item.treeNodeId === selectedAccount) ??
    projection.profiles[0] ??
    null;
  if (!profile) {
    target.innerHTML = '<p class="empty">No account profile evidence is available.</p>';
    return;
  }
  selectedAccount = profile.treeNodeId;
  const state = profile.jurisdiction.stateCode ?? 'not assigned';
  const lastObserved = formatDate(profile.observations.lastObservedAt);
  target.innerHTML = `
    <header class="trace-panel__header">
      <div>
        <p class="trace-panel__eyebrow"><a class="semantic-label" href="${glossaryHref('ops.limits.account')}">Selected account</a></p>
        <h3>${esc(profile.accountName)}</h3>
      </div>
      <span class="status-token" data-tone="${esc(profile.tone)}" data-glossary-concept="ops.limits.monitoring_status">${esc(profile.monitoringStatus)}</span>
    </header>
    <div class="trace-panel__identity">
      <code title="${esc(profile.treeNodeId)}">${esc(shortRef(profile.treeNodeId))}</code>
      <span class="profile-kind">${esc(profile.accountKind)}</span>
      <span class="profile-state">${esc(state)}</span>
    </div>
    <div class="trace-panel__summary" aria-label="Selected account evidence summary">
      <div><strong>${profile.traces.length}</strong><span>trace events</span></div>
      <div><strong>${profile.policyCodes.length}</strong><span>policy bindings</span></div>
      <div><strong>${profile.observations.violations30d}</strong><span>blocked / 30d</span></div>
    </div>
    <ol class="trace-list" aria-label="Evidence timeline">
      ${
        profile.traces
          .map(
            trace => `<li class="trace-event" data-kind="${esc(trace.kind)}">
              <div class="trace-event__top">
                <strong>${esc(labelFromKey(trace.kind))}</strong>
                <time datetime="${esc(trace.at)}">${esc(formatDate(trace.at))}</time>
              </div>
              <span class="trace-event__detail">${esc(trace.detail)}</span>
              <small>Source · <code>${esc(trace.source)}</code></small>
            </li>`
          )
          .join('') || '<p class="empty">No trace events.</p>'
      }
    </ol>
    <footer class="trace-panel__footer">
      <a class="semantic-label" href="${glossaryHref('ops.limits.evidence_trace')}">Evidence definition</a>
      <button type="button" id="copy-account-link" data-account-id="${esc(profile.treeNodeId)}">Copy deep link</button>
    </footer>
    <small class="sub">Last observed ${esc(lastObserved)}</small>`;
  target.querySelector('#copy-account-link')?.addEventListener('click', async event => {
    const button = event.currentTarget;
    const url = new URL(window.location.href);
    url.hash = accountHash(button.dataset.accountId);
    try {
      await navigator.clipboard.writeText(url.href);
      button.textContent = 'Copied';
    } catch {
      button.textContent = 'Copy unavailable';
    }
  });
}

function renderProfiles() {
  if (!projection) return;
  const profiles = filteredProfiles();
  const target = document.getElementById('account-profile-grid');
  const count = document.getElementById('profile-count');
  if (!selectedAccount || !projection.profiles.some(row => row.treeNodeId === selectedAccount)) {
    selectedAccount = accountFromUrl() ?? profiles[0]?.treeNodeId ?? null;
  }
  if (target) {
    target.innerHTML =
      profiles.map(profileCard).join('') ||
      '<p class="empty">No account profiles match these filters.</p>';
    for (const link of target.querySelectorAll('[data-account-link]')) {
      link.addEventListener('click', event => {
        event.preventDefault();
        setSelectedAccount(link.dataset.accountLink);
      });
    }
  }
  if (count) count.textContent = `${profiles.length} of ${projection.profiles.length} accounts`;
  renderTrace();
}

function renderPolicies() {
  const target = document.getElementById('jurisdiction-policy-body');
  if (!target || !projection) return;
  target.innerHTML =
    projection.policies
      .map(
        policy => `<tr>
          <td><strong>${esc(policy.stateCode)}</strong></td>
          <td>
            <a class="semantic-label" href="${glossaryHref(policy.policyKey)}">${esc(policy.label)}</a>
            <br><code class="policy-code">${esc(policy.policyCode)}</code>
          </td>
          <td>
            <span class="status-token" data-tone="${policy.status === 'active' ? 'ok' : 'warn'}" data-glossary-concept="ui.semantic.status">${esc(policy.status)}</span>
          </td>
          <td>${esc(policy.authority)}<br><small>${esc(policy.risk)} risk</small></td>
          <td>${esc(policy.scope)}${policy.treeNodeId ? `<br><small>${esc(policy.treeNodeId)}</small>` : ''}</td>
          <td>
            <a class="semantic-label" href="${glossaryHref(sportGlossaryConcept(policy.sportKey))}" data-glossary-concept="ops.limits.sport">${esc(policy.sportKey)}</a>
            <br><small><a class="semantic-label" href="${glossaryHref(marketGlossaryConcept(policy.marketKey))}" data-glossary-concept="ops.limits.market_type">${esc(policy.marketKey)}</a></small>
          </td>
          <td>
            ${formatMoney(policy.maxWager)} max
            <br><small>${formatMoney(policy.minWager)} min · ${formatMoney(policy.dailyLimit)} daily · ${formatMoney(policy.weeklyLimit)} weekly</small>
            ${
              policy.tieredLimits?.length
                ? `<br><small>${esc(policy.tieredLimits.map(tier => `${tier.tier}: ${formatMoney(tier.maxWager)}`).join(' · '))}</small>`
                : ''
            }
          </td>
          <td>
            <strong>${esc(policy.enforcement)}</strong>
            <br><small>${esc(rulesLabel(policy.specialRules))}</small>
            ${
              policy.exclusionGroups?.length
                ? `<br><small>excludes ${esc(policy.exclusionGroups.join(', '))}</small>`
                : ''
            }
            <br><small>${esc(policy.allowedBetTypes.join(', ') || 'all bet types')}</small>
          </td>
          <td>
            ${esc(policy.effectiveDate)}
            ${policy.expirationDate ? `<br><small>expires ${esc(policy.expirationDate)}</small>` : ''}
            <br><small>${esc(policy.sourceRef)}</small>
          </td>
        </tr>`
      )
      .join('') ||
    '<tr><td colspan="9" class="empty">No effective jurisdiction policies.</td></tr>';
}

function renderError(message) {
  const target = document.getElementById('account-profile-grid');
  if (target) {
    target.innerHTML = `<p class="empty">${esc(message)} Run <code>bun run ops:snapshot</code>.</p>`;
  }
}

async function loadProfiles() {
  try {
    const response = await fetch(PROFILE_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`profile artifact returned HTTP ${response.status}`);
    const snapshot = await response.json();
    if (snapshot.schemaVersion !== 3 || snapshot.accountProfiles?.schemaVersion !== 2) {
      throw new Error('account profile projection is missing or stale');
    }
    projection = snapshot.accountProfiles;
    selectedAccount = accountFromUrl() ?? selectedAccount;
    renderSummary();
    renderComplianceKpis();
    renderJurisdictionOptions();
    syncProfileFiltersFromUrl();
    renderProfiles();
    renderPolicies();
    syncSectionFromUrl();
  } catch (error) {
    renderError(error instanceof Error ? error.message : String(error));
  }
}

for (const id of ['profile-filter', 'profile-status', 'profile-jurisdiction']) {
  document
    .getElementById(id)
    ?.addEventListener(id === 'profile-filter' ? 'input' : 'change', () => {
      syncProfileFiltersToUrl();
      renderProfiles();
      if (id !== 'profile-filter') trackGlossaryEvent('limits.filter', { filter: id });
    });
}
document.getElementById('profile-filter')?.addEventListener('change', () => {
  trackGlossaryEvent('limits.filter', { filter: 'profile-filter' });
});
document.getElementById('profile-filter-reset')?.addEventListener('click', () => {
  for (const id of ['profile-filter', 'profile-status', 'profile-jurisdiction']) {
    const control = document.getElementById(id);
    if (control) control.value = '';
  }
  syncProfileFiltersToUrl();
  renderProfiles();
  trackGlossaryEvent('limits.filter', { filter: 'profile-filter-reset' });
});
window.addEventListener('hashchange', () => {
  selectedAccount = accountFromUrl();
  renderProfiles();
  syncSectionFromUrl();
});
window.addEventListener('popstate', () => {
  syncProfileFiltersFromUrl();
  selectedAccount = accountFromUrl();
  renderProfiles();
  syncSectionFromUrl();
});

loadProfiles();
setInterval(loadProfiles, PROFILE_POLL_INTERVAL);

bootGlossaryUx({
  breadcrumbsMount: document.getElementById('limits-glossary-crumbs'),
  tooltipRoot: document.querySelector('main') ?? document.body,
  trackPage: false,
}).catch(() => {
  // Glossary UX is progressive enhancement; page data still loads.
});
