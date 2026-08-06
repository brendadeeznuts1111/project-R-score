/**
 * Static GitHub issue taxonomy board.
 * Reads only repository-baked public registry contracts; never calls GitHub.
 * @see docs/harness/tenants/github-issue-taxonomy.md
 */
import { escHtml, renderPortalError, renderPortalStatGrid } from '../components/portal-ui.js';
import { fetchJsonResult } from '../fetch-json.js';

export const ISSUE_TAXONOMY_URL = '/registry/github-issue-taxonomy.json';
export const BAKE_MANIFEST_URL = '/registry/bake-manifest.json';
export const ISSUE_TAXONOMY_SCHEMA = 'factorywager.github-issue-taxonomy.public.v1';
export const ISSUE_PORTAL_CONCEPT = 'portal.github_issue_taxonomy';

const REPOSITORY_URL = 'https://github.com/brendadeeznuts1111/project-R-score';
const REQUIRED_DIMENSIONS = ['type', 'priority', 'plane', 'runtime', 'team', 'status'];

/** @param {unknown} value */
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** @param {unknown} value */
function text(value) {
  return typeof value === 'string' ? value : '';
}

/** @param {unknown} value */
function rows(value) {
  return Array.isArray(value) ? value : [];
}

/** @param {string} value */
function humanize(value) {
  return value.replace(/[._-]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

/**
 * Browser-side contract guard. The bake remains the semantic authority; this
 * guard makes missing and stale public data explicit instead of silently empty.
 * @param {unknown} value
 */
export function validateIssueTaxonomy(value) {
  const errors = [];
  if (!isRecord(value)) return { ok: false, errors: ['registry root must be an object'] };

  if (value.schema !== ISSUE_TAXONOMY_SCHEMA) errors.push('unexpected registry schema');
  if (value.artifactVersion !== 1) errors.push('unexpected artifact version');
  if (value.artifactId !== 'github-issue-taxonomy') errors.push('artifact identity mismatch');
  if (value.conceptId !== 'registry.github_issue_taxonomy') {
    errors.push('registry concept identity mismatch');
  }
  if (value.path !== ISSUE_TAXONOMY_URL) errors.push('registry path mismatch');

  const dimensions = rows(value.dimensions);
  const labels = rows(value.labels);
  const dimensionKeys = dimensions.map(row => (isRecord(row) ? text(row.key) : ''));
  if (dimensions.length === 0 || dimensionKeys.some(key => !key)) {
    errors.push('semantic dimensions are missing or malformed');
  }
  if (new Set(dimensionKeys).size !== dimensionKeys.length) {
    errors.push('semantic dimensions contain duplicates');
  }
  for (const key of REQUIRED_DIMENSIONS) {
    const dimension = dimensions.find(row => isRecord(row) && row.key === key);
    if (!dimension || dimension.required !== true) errors.push(`${key} must be required`);
  }

  const legalValues = new Set();
  for (const dimension of dimensions) {
    if (!isRecord(dimension)) continue;
    for (const valueName of rows(dimension.values)) {
      if (typeof valueName === 'string') legalValues.add(`${dimension.key}.${valueName}`);
    }
  }

  const labelKeys = [];
  for (const label of labels) {
    if (!isRecord(label)) {
      errors.push('label row must be an object');
      continue;
    }
    const key = text(label.key);
    labelKeys.push(key);
    if (!legalValues.has(`${label.dimension}.${label.value}`)) {
      errors.push(`${key || 'label'} is outside its declared dimension`);
    }
    if (!isRecord(label.github) || !/^[0-9a-f]{6}$/.test(text(label.github.hex))) {
      errors.push(`${key || 'label'} has invalid provider color`);
    }
    if (!isRecord(label.color) || !/^#[0-9a-f]{6}$/i.test(text(label.color.css))) {
      errors.push(`${key || 'label'} has invalid resolved color`);
    }
  }
  if (labels.length === 0 || new Set(labelKeys).size !== labelKeys.length) {
    errors.push('labels are missing or duplicated');
  }

  const audit = isRecord(value.audit) ? value.audit : {};
  const provenance = isRecord(value.provenance) ? value.provenance : {};
  if (audit.ok !== true) errors.push('producer audit is not healthy');
  if (audit.dimensions !== dimensions.length || audit.labels !== labels.length) {
    errors.push('producer audit counts do not match the payload');
  }
  if (!/^[0-9a-f]{64}$/.test(text(audit.sourceHash))) {
    errors.push('source hash is missing or malformed');
  }
  if (audit.sourceHash !== provenance.sourceHash) {
    errors.push('audit and provenance source hashes differ');
  }
  if (!isRecord(value.ownership) || rows(value.ownership.authority).length === 0) {
    errors.push('authority links are missing');
  }

  return { ok: errors.length === 0, errors };
}

/** @param {unknown} artifact */
export function canonicalArtifactBytes(artifact) {
  const serialized = `${JSON.stringify(artifact, null, 2)}\n`;
  return new TextEncoder().encode(serialized).byteLength;
}

/**
 * Combine artifact checks with bake-manifest evidence. A timestamp is optional
 * because this artifact is intentionally deterministic and timestamp-free.
 * @param {unknown} artifact
 * @param {unknown} manifest
 */
export function evaluateIssueRegistryHealth(artifact, manifest) {
  const validation = validateIssueTaxonomy(artifact);
  const checks = [
    { ok: validation.ok, label: 'Registry schema, identities, dimensions, and labels validate' },
  ];
  const errors = [...validation.errors];
  const entries = isRecord(manifest) ? rows(manifest.entries) : [];
  const entry = entries.find(row => isRecord(row) && row.path === ISSUE_TAXONOMY_URL);
  if (!isRecord(manifest) || manifest.kind !== 'registry-bake-manifest') {
    errors.push('bake manifest is unavailable or malformed');
    checks.push({ ok: false, label: 'Bake manifest contract is available' });
  } else {
    checks.push({ ok: true, label: 'Bake manifest contract is available' });
  }
  if (!isRecord(entry)) {
    errors.push('taxonomy is absent from the bake manifest');
    checks.push({ ok: false, label: 'Taxonomy is indexed by the bake manifest' });
  } else {
    checks.push({ ok: true, label: 'Taxonomy is indexed by the bake manifest' });
    const actualBytes = canonicalArtifactBytes(artifact);
    const bytesOk = entry.bytes === actualBytes;
    checks.push({
      ok: bytesOk,
      label: `Manifest bytes match the registry payload (${actualBytes})`,
    });
    if (!bytesOk) errors.push('bake manifest byte count does not match the taxonomy payload');
  }

  const hash =
    isRecord(artifact) && isRecord(artifact.audit) ? text(artifact.audit.sourceHash) : '';
  const hashOk = /^[0-9a-f]{64}$/.test(hash);
  checks.push({ ok: hashOk, label: 'Source freshness fingerprint is present and valid' });

  return {
    ok: errors.length === 0,
    errors,
    checks,
    entry: isRecord(entry) ? entry : null,
    sourceHash: hash,
  };
}

/** @param {string} [labelName] */
export function issueSearchUrl(labelName = '') {
  const url = new URL(`${REPOSITORY_URL}/issues`);
  url.searchParams.set('q', labelName ? `is:issue label:"${labelName}"` : 'is:issue');
  return url.toString();
}

/** @param {string} path */
function authorityUrl(path) {
  const encoded = path
    .split('/')
    .filter(Boolean)
    .map(part => encodeURIComponent(part))
    .join('/');
  return `${REPOSITORY_URL}/blob/main/${encoded}`;
}

/** @type {Record<string, unknown> | null} */
let taxonomy = null;

function setGate(health) {
  const gate = document.getElementById('issue-gate');
  const freshness = document.getElementById('issue-freshness');
  if (gate) {
    gate.className = `portal-gate ${health.ok ? 'ok' : 'bad'}`;
    gate.innerHTML = `<span class="dot" aria-hidden="true"></span>${
      health.ok ? 'Registry verified' : 'Registry degraded'
    }`;
  }
  if (freshness) {
    const bytes = isRecord(health.entry) ? health.entry.bytes : null;
    freshness.textContent = health.ok
      ? `Indexed ${bytes} bytes · source ${health.sourceHash.slice(0, 12)} · deterministic`
      : `${health.errors.length} drift signal${health.errors.length === 1 ? '' : 's'} detected`;
  }
}

function renderSummary(artifact) {
  const dimensions = rows(artifact.dimensions);
  const labels = rows(artifact.labels);
  const required = dimensions.filter(row => isRecord(row) && row.required === true).length;
  const summary = document.getElementById('issue-summary');
  if (!summary) return;
  summary.innerHTML = renderPortalStatGrid([
    { label: 'Dimensions', value: dimensions.length, hint: `${required} required`, tone: 'info' },
    { label: 'Labels', value: labels.length, hint: 'provider projections', tone: 'ok' },
    {
      label: 'Legal rules',
      value: rows(artifact.legalCombinations).length,
      hint: 'cross-dimension',
      tone: 'warn',
    },
    { label: 'Owner', value: text(artifact.ownership?.owner), hint: 'repository authority' },
  ]);
}

function renderIdentity(artifact) {
  const identity = document.getElementById('issue-identity');
  if (identity) {
    identity.innerHTML = [
      ['Artifact', artifact.artifactId],
      ['Registry concept', artifact.conceptId],
      ['Portal concept', ISSUE_PORTAL_CONCEPT],
      ['Plane', artifact.ownership?.plane],
      ['Owner', artifact.ownership?.owner],
      ['Source hash', artifact.audit?.sourceHash],
    ]
      .map(
        ([label, value]) =>
          `<div><dt>${escHtml(label)}</dt><dd><code>${escHtml(value)}</code></dd></div>`
      )
      .join('');
  }

  const authority = document.getElementById('issue-authority');
  if (authority) {
    authority.innerHTML = rows(artifact.ownership?.authority)
      .filter(path => typeof path === 'string')
      .map(
        path =>
          `<a href="${escHtml(authorityUrl(path))}" target="_blank" rel="noopener noreferrer">${escHtml(path)}</a>`
      )
      .join('');
  }
}

function renderAudit(health) {
  const audit = document.getElementById('issue-audit');
  if (!audit) return;
  const checks = [...health.checks, ...health.errors.map(error => ({ ok: false, label: error }))];
  audit.innerHTML = checks
    .map(
      check =>
        `<li class="${check.ok ? '' : 'bad'}"><span aria-hidden="true">${
          check.ok ? '✓' : '!'
        }</span><span>${escHtml(check.label)}</span></li>`
    )
    .join('');
}

function renderRules(artifact) {
  const rules = document.getElementById('issue-rules');
  if (!rules) return;
  rules.innerHTML = rows(artifact.legalCombinations)
    .map(rule => `<li><strong>${escHtml(rule.id)}</strong> — ${escHtml(rule.description)}</li>`)
    .join('');
}

function renderGroups() {
  if (!taxonomy) return;
  const search = text(document.getElementById('issue-search')?.value).trim().toLowerCase();
  const requirement = text(document.getElementById('issue-requirement')?.value) || 'all';
  const dimensions = rows(taxonomy.dimensions).filter(dimension => {
    if (!isRecord(dimension)) return false;
    if (requirement === 'required' && dimension.required !== true) return false;
    if (requirement === 'optional' && dimension.required === true) return false;
    return true;
  });

  let visibleLabels = 0;
  const cards = dimensions
    .map(dimension => {
      const labels = rows(taxonomy.labels).filter(label => {
        if (!isRecord(label) || label.dimension !== dimension.key) return false;
        if (!search) return true;
        return [label.key, label.value, label.github?.name, label.github?.description]
          .map(text)
          .some(value => value.toLowerCase().includes(search));
      });
      if (search && labels.length === 0) return '';
      visibleLabels += labels.length;
      const requirementLabel = dimension.required ? 'Required' : 'Optional';
      const labelRows = labels
        .map(label => {
          const providerName = text(label.github?.name);
          const providerHex = text(label.github?.hex);
          const resolvedColor = text(label.color?.css);
          return `<li class="issue-label">
            <span class="issue-label-swatch" style="--issue-label-color:${escHtml(
              resolvedColor
            )}" aria-hidden="true"></span>
            <div class="issue-label-main">
              <strong>${escHtml(providerName)}</strong>
              <span>${escHtml(label.dimension)} · ${escHtml(label.value)}</span>
              <small>${escHtml(label.github?.description)}</small>
            </div>
            <div class="issue-label-meta">
              <code>color #${escHtml(providerHex)}</code>
              <a href="${escHtml(
                issueSearchUrl(providerName)
              )}" target="_blank" rel="noopener noreferrer" aria-label="Open GitHub issues labeled ${escHtml(
                providerName
              )}">issues ↗</a>
            </div>
          </li>`;
        })
        .join('');
      return `<article class="issue-dimension" aria-labelledby="issue-dimension-${escHtml(
        dimension.key
      )}">
        <header class="issue-dimension-head">
          <div>
            <h3 id="issue-dimension-${escHtml(dimension.key)}">${escHtml(
              humanize(text(dimension.key))
            )}</h3>
            <p>${labels.length} legal value${labels.length === 1 ? '' : 's'}</p>
          </div>
          <span class="issue-requirement ${dimension.required ? 'required' : ''}">${requirementLabel}</span>
        </header>
        <ul class="issue-label-list">${labelRows}</ul>
      </article>`;
    })
    .filter(Boolean);

  const container = document.getElementById('issue-groups');
  const results = document.getElementById('issue-results');
  if (container) {
    container.innerHTML = cards.length
      ? cards.join('')
      : '<div class="portal-empty" role="status">No taxonomy labels match these filters.</div>';
  }
  if (results) results.textContent = `${cards.length} groups · ${visibleLabels} labels`;
}

function renderFailure(message, code) {
  const target = document.getElementById('issue-error');
  if (!target) return;
  target.hidden = false;
  target.innerHTML = renderPortalError({
    title: 'Issue taxonomy registry unavailable',
    message,
    code,
    actionsHtml:
      '<a class="portal-chip" href="/registry/github-issue-taxonomy.json">Inspect registry JSON</a>',
  });
  const gate = document.getElementById('issue-gate');
  if (gate) {
    gate.className = 'portal-gate bad';
    gate.innerHTML = '<span class="dot" aria-hidden="true"></span>Registry degraded';
  }
}

async function loadBoard() {
  const [taxonomyResult, manifestResult] = await Promise.all([
    fetchJsonResult(ISSUE_TAXONOMY_URL),
    fetchJsonResult(BAKE_MANIFEST_URL),
  ]);
  if (!taxonomyResult.ok) {
    renderFailure(
      'The baked taxonomy could not be loaded. This board does not fall back to live GitHub data.',
      `${taxonomyResult.kind || 'fetch'} · ${taxonomyResult.error || 'unknown error'}`
    );
    return;
  }

  taxonomy = taxonomyResult.data;
  const manifest = manifestResult.ok ? manifestResult.data : null;
  const health = evaluateIssueRegistryHealth(taxonomy, manifest);
  setGate(health);
  renderSummary(taxonomy);
  renderIdentity(taxonomy);
  renderAudit(health);
  renderRules(taxonomy);
  renderGroups();
  if (!health.ok) {
    renderFailure(
      'The registry loaded, but one or more drift checks failed. Labels remain visible for diagnosis.',
      health.errors.join(' · ')
    );
  }
}

if (typeof document !== 'undefined') {
  document.getElementById('issue-search')?.addEventListener('input', renderGroups);
  document.getElementById('issue-requirement')?.addEventListener('change', renderGroups);
  void loadBoard();
}
