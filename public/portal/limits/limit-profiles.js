const PROFILE_URL = '/registry/limit-raises.json';
const PROFILE_POLL_INTERVAL = 30_000;
const accountPattern = new URLPattern({ hash: 'account\\::account' });

let projection = null;
let selectedAccount = null;

function esc(value) {
  const element = document.createElement('div');
  element.textContent = value == null ? '' : String(value);
  return element.innerHTML;
}

function glossaryHref(concept) {
  return `/portal/glossary/#glossary:${concept}`;
}

function accountHash(treeNodeId) {
  return `#account:${encodeURIComponent(treeNodeId)}`;
}

function accountFromUrl() {
  const captured = accountPattern.exec(window.location.href)?.hash.groups.account ?? null;
  if (!captured) return null;
  try {
    return decodeURIComponent(captured);
  } catch {
    return captured;
  }
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
  if (rules?.require_identity_verification) labels.push('identity required');
  if (rules?.allowed_zip_prefixes?.length) {
    labels.push(`ZIP ${rules.allowed_zip_prefixes.join(', ')}`);
  }
  return labels.join(' · ') || 'standard';
}

function summaryCard(value, label, concept, tone = 'skip') {
  return `<div class="profile-summary__item">
    <strong data-tone="${esc(tone)}">${esc(value)}</strong>
    <a class="semantic-label" href="${glossaryHref(concept)}">${esc(label)}</a>
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
  const state = profile.jurisdiction.stateCode ?? 'unbound';
  const license = profile.license
    ? `${profile.license.status}${profile.license.licenseNumber ? ` · ${profile.license.licenseNumber}` : ''}`
    : 'no license binding';
  return `<article class="account-profile" data-tone="${esc(profile.tone)}" data-account="${esc(profile.treeNodeId)}" aria-current="${isSelected}">
    <div class="account-profile__head">
      <a href="${accountHash(profile.treeNodeId)}" data-account-link="${esc(profile.treeNodeId)}">${esc(profile.accountName)}</a>
      <span class="status-token" data-tone="${esc(profile.tone)}">${esc(profile.monitoringStatus)}</span>
    </div>
    <div class="account-profile__meta">
      <div class="profile-keyline"><code>${esc(profile.treeNodeId)}</code><span>${esc(profile.accountKind)}</span></div>
      <div>profile <code>${esc(profile.profileKey ?? 'unbound')}</code> · ${esc(profile.lifecycleStatus ?? 'no lifecycle')}</div>
      <div>${esc(state)} · ${esc(profile.jurisdiction.location ?? 'location missing')} · <code>${esc(profile.jurisdiction.zipCode ?? 'ZIP missing')}</code></div>
      <div>license ${esc(license)}</div>
      <div>${profile.observations.dimensions} dimensions · ${profile.observations.sportsbooks.length} books · ${profile.observations.raises} raises · ${profile.observations.violations30d} blocked</div>
      <div>${profile.policyCodes.length} effective policy bindings · last ${esc(formatDate(profile.observations.lastObservedAt))}</div>
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
  target.innerHTML = `
    <div class="account-profile__head">
      <strong>${esc(profile.accountName)}</strong>
      <span class="status-token" data-tone="${esc(profile.tone)}">${esc(profile.monitoringStatus)}</span>
    </div>
    <p class="sub"><code>${esc(profile.treeNodeId)}</code></p>
    <p><a class="semantic-label" href="${glossaryHref('ops.limits.evidence_trace')}">Evidence trace</a> · ${profile.traces.length} events</p>
    <div class="trace-list">
      ${
        profile.traces
          .map(
            trace => `<div class="trace-event">
              <strong>${esc(trace.kind)}</strong>
              <small>${esc(trace.detail)}</small>
              <time datetime="${esc(trace.at)}">${esc(formatDate(trace.at))}</time>
              <small>source · <code>${esc(trace.source)}</code></small>
            </div>`
          )
          .join('') || '<p class="empty">No trace events.</p>'
      }
    </div>
    <p><a href="${accountHash(profile.treeNodeId)}">Copy account deep link</a></p>`;
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
          <td><code class="policy-code">${esc(policy.policyCode)}</code></td>
          <td>${esc(policy.scope)}${policy.treeNodeId ? `<br><small>${esc(policy.treeNodeId)}</small>` : ''}</td>
          <td>${esc(policy.sportKey)}<br><small>${esc(policy.marketKey)}</small></td>
          <td>${formatMoney(policy.maxWager)} max<br><small>${formatMoney(policy.minWager)} min</small></td>
          <td>${esc(policy.allowedBetTypes.join(', ') || 'all')}</td>
          <td>${esc(rulesLabel(policy.specialRules))}</td>
        </tr>`
      )
      .join('') ||
    '<tr><td colspan="7" class="empty">No effective jurisdiction policies.</td></tr>';
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
    if (snapshot.schemaVersion !== 2 || snapshot.accountProfiles?.schemaVersion !== 1) {
      throw new Error('account profile projection is missing or stale');
    }
    projection = snapshot.accountProfiles;
    selectedAccount = accountFromUrl() ?? selectedAccount;
    renderSummary();
    renderJurisdictionOptions();
    renderProfiles();
    renderPolicies();
  } catch (error) {
    renderError(error instanceof Error ? error.message : String(error));
  }
}

for (const id of ['profile-filter', 'profile-status', 'profile-jurisdiction']) {
  document
    .getElementById(id)
    ?.addEventListener(id === 'profile-filter' ? 'input' : 'change', () => {
      renderProfiles();
    });
}
window.addEventListener('hashchange', () => {
  selectedAccount = accountFromUrl();
  renderProfiles();
});
window.addEventListener('popstate', () => {
  selectedAccount = accountFromUrl();
  renderProfiles();
});

loadProfiles();
setInterval(loadProfiles, PROFILE_POLL_INTERVAL);
