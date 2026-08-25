/**
 * <package-card> — reusable custom element for registry package cards.
 *
 * Usage:
 *   <package-card name="event-store"></package-card>
 *   <package-card name="bun-utils" compact></package-card>
 *
 * Attributes:
 *   name     — package name (required) — looked up in /registry/registry.json
 *   compact  — minimal layout (no tags/meta)
 *
 * Data loading uses the shared registry-cache.js module so all card
 * instances share one in-flight request and a 60-second cache.
 *
 * Fires a 'package-detail' CustomEvent (bubbles, composed) when the
 * "Details" button is clicked so a consuming page can show more context.
 *
 * @see /registry/registry.json
 * @see ../registry-cache.js
 * @see ../components/limit-changes-card.js (shadow DOM pattern)
 */

import { fetchRegistry } from '../registry-cache.js';

/* ── Shadow DOM template ─────────────────────────────────────────────── */

const STYLE = `
  <style>
    :host {
      display: block;
      --card-bg: var(--portal-card-bg);
      --card-border: var(--portal-card-border);
      --card-radius: var(--portal-card-radius, 8px);
      --text-main: var(--portal-text-main);
      --text-dim: var(--portal-text-dim);
      --text-inv: var(--portal-text-inv);
      --health-ok: var(--portal-health-ok);
      --health-warn: var(--portal-health-warn);
      --health-bad: var(--portal-health-bad);
      --accent: var(--portal-accent);
      --accent-hover: var(--portal-accent-hover);
      --skeleton-bg: var(--portal-skeleton-bg);
      --error-bg: var(--portal-error-bg);
      --error-border: var(--portal-error-border);
    }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: var(--card-radius);
      padding: 14px 16px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
      line-height: 1.5;
      color: var(--text-main);
      box-sizing: border-box;
    }

    /* ── Header row ── */
    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .name {
      font-weight: 600;
      font-size: 14px;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .badge-new {
      display: inline-block;
      font-size: 10px;
      font-weight: 600;
      color: var(--text-inv);
      background: var(--health-ok);
      border-radius: 3px;
      padding: 1px 5px;
      line-height: 1.4;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .version {
      font-size: 12px;
      color: var(--text-dim);
      font-family: ui-monospace, monospace;
    }

    /* ── Health row ── */
    .health-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .health-bar {
      flex: 1;
      height: 6px;
      border-radius: 3px;
      background: var(--skeleton-bg);
      overflow: hidden;
    }
    .health-fill {
      display: block;
      height: 100%;
      border-radius: 3px;
      transition: width 0.3s ease;
    }
    .health-fill.ok { background: var(--health-ok); }
    .health-fill.warn { background: var(--health-warn); }
    .health-fill.bad { background: var(--health-bad); }
    .health-label {
      font-size: 11px;
      font-weight: 500;
      white-space: nowrap;
    }
    .health-label.ok { color: var(--health-ok); }
    .health-label.warn { color: var(--health-warn); }
    .health-label.bad { color: var(--health-bad); }

    /* ── Type ── */
    .type {
      display: inline-block;
      font-size: 11px;
      color: var(--text-dim);
      border: 1px solid var(--card-border);
      border-radius: 3px;
      padding: 1px 6px;
      margin-bottom: 6px;
    }

    /* ── Description ── */
    .desc {
      margin: 6px 0;
      font-size: 12px;
      color: var(--text-dim);
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* ── Tags ── */
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin: 6px 0;
    }
    .tag {
      display: inline-block;
      font-size: 10px;
      color: var(--accent);
      background: color-mix(in srgb, var(--accent) 12%, transparent);
      border-radius: 3px;
      padding: 1px 6px;
      line-height: 1.5;
    }

    /* ── Meta ── */
    .meta {
      display: flex;
      gap: 12px;
      font-size: 11px;
      color: var(--text-dim);
      margin: 8px 0 10px;
    }

    /* ── Actions ── */
    .actions {
      display: flex;
      gap: 6px;
    }
    .btn {
      padding: 4px 10px;
      border: 1px solid var(--card-border);
      border-radius: 4px;
      background: transparent;
      color: var(--text-main);
      font-size: 12px;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
    }
    .btn:hover, .btn:focus-visible {
      background: var(--accent);
      border-color: var(--accent);
      color: var(--text-inv);
      outline: none;
    }
    .btn:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }

    /* ── Skeleton loading ── */
    .skeleton .bar {
      height: 12px;
      border-radius: 4px;
      background: var(--skeleton-bg);
      margin-bottom: 8px;
      animation: pulse 1.5s infinite ease-in-out;
    }
    .skeleton .bar.short { width: 40%; }
    .skeleton .bar.med { width: 65%; }
    .skeleton .bar.long { width: 85%; }
    .skeleton .line {
      height: 8px;
      border-radius: 4px;
      background: var(--skeleton-bg);
      margin-bottom: 6px;
      animation: pulse 1.5s infinite ease-in-out;
    }
    @keyframes pulse {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 0.8; }
    }
    @media (prefers-reduced-motion: reduce) {
      .health-fill { transition: none; }
      .skeleton .bar, .skeleton .line { animation: none; }
    }

    /* ── Error state ── */
    .error-state {
      background: var(--error-bg);
      border: 1px solid var(--error-border);
      border-radius: var(--card-radius);
      padding: 14px 16px;
      text-align: center;
      font-size: 13px;
      color: var(--health-bad);
    }
    .error-state .retry-btn {
      margin-top: 8px;
    }

    /* ── Compact variant ── */
    :host([compact]) .card { padding: 8px 12px; }
    :host([compact]) .name { font-size: 12px; }
    :host([compact]) .tags { display: none; }
    :host([compact]) .meta { display: none; }
    :host([compact]) .desc { display: none; }
    :host([compact]) .health-row { margin-bottom: 0; }
  </style>
`;

const TEMPLATE_HTML = `
  ${STYLE}
  <div class="card" part="card" role="article" aria-busy="true">
    <!-- Skeleton placeholder — replaced on render -->
    <div class="skeleton" id="skeleton" aria-hidden="true">
      <div class="bar long"></div>
      <div class="bar short"></div>
      <div class="line"></div>
      <div class="line"></div>
    </div>
    <!-- Rendered content — hidden until data loads -->
    <div id="content" hidden>
      <div class="header">
        <span class="name" id="name"></span>
        <span class="badge-new" id="badge-new" hidden></span>
        <span class="version" id="version"></span>
      </div>
      <div class="health-row">
        <span class="health-bar" id="health-bar" role="progressbar" aria-label="Package health" aria-valuemin="0" aria-valuemax="100"><span class="health-fill" id="health-fill"></span></span>
        <span class="health-label" id="health-label"></span>
      </div>
      <span class="type" id="type"></span>
      <p class="desc" id="desc"></p>
      <div class="tags" id="tags"></div>
      <div class="meta" id="meta"></div>
      <div class="actions">
        <button class="btn detail-btn" id="detail-btn" type="button">Details →</button>
      </div>
    </div>
    <!-- Error state — hidden until fetch fails -->
    <div id="error" class="error-state" role="alert" hidden>
      <span id="error-msg"></span>
      <div><button class="btn retry-btn" id="retry-btn" type="button">Retry</button></div>
    </div>
  </div>
`;

/* ── Health helpers (mirror health.js so no cross-dependency) ─────────── */

function computeHealth(release, totalVersions) {
  const freshness = release?.publishedAt ? dateFreshness(release.publishedAt) : 0;
  const completeness = tagCompleteness(release, totalVersions);
  const score = Math.round((freshness + completeness) / 2);
  return { score, freshness, completeness };
}

function dateFreshness(publishedAt) {
  const pub = new Date(publishedAt).getTime();
  const now = Date.now();
  const days = (now - pub) / (1000 * 60 * 60 * 24);
  if (days < 7) return 100;
  if (days < 30) return 80;
  if (days < 90) return 60;
  if (days < 180) return 40;
  return 20;
}

function tagCompleteness(release, totalVersions) {
  let score = 0;
  if (release?.description) score += 30;
  if (release?.tags?.length) score += 20;
  if (release?.readme) score += 20;
  if (release?.dependencies) score += 10;
  if (totalVersions > 1) score += 10;
  if (totalVersions > 3) score += 10;
  return Math.min(score, 100);
}

function healthClass(score) {
  if (score >= 70) return 'ok';
  if (score >= 40) return 'warn';
  return 'bad';
}

function healthLabel(score) {
  if (score >= 70) return 'Healthy';
  if (score >= 40) return 'Fair';
  return 'Needs work';
}

function daysSince(isoStr) {
  const ms = Date.now() - new Date(isoStr).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/* ── Component class ─────────────────────────────────────────────────── */

export class PackageCard extends HTMLElement {
  static observedAttributes = ['name'];

  /** @type {object|null} raw registry entry (packages[name]) */
  #data = null;
  /** @type {number} guards against stale responses after a name change */
  #loadToken = 0;
  /** @type {boolean} */
  #wired = false;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = TEMPLATE_HTML;
  }

  /* ── Lifecycle ────────────────────────────────────────────────────── */

  connectedCallback() {
    this.#wireEvents();
    if (this.getAttribute('name') && !this.#data) {
      this.load();
    }
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'name' && oldVal !== newVal && newVal && this.isConnected) {
      this.load(newVal);
    }
  }

  /* ── Public API ──────────────────────────────────────────────────── */

  /**
   * Load or reload data for a given package name.
   * @param {string} [name] — defaults to current `name` attribute
   */
  async load(name) {
    name = name ?? this.getAttribute('name');
    if (!name) return;
    const loadToken = ++this.#loadToken;
    this.setAttribute('loading', '');
    this.shadowRoot.querySelector('.card')?.setAttribute('aria-busy', 'true');

    // Show skeleton, hide content and error
    this.#show('skeleton');
    this.#hide('content');
    this.#hide('error');

    try {
      const registry = await fetchRegistry();
      if (loadToken !== this.#loadToken) return;
      this.#data = registry.packages?.[name] ?? null;
      if (!this.#data) throw new Error(`Package "${name}" not found in registry`);
      this.render();
    } catch (err) {
      if (loadToken !== this.#loadToken) return;
      this.#showError(err instanceof Error ? err.message : 'Failed to load package');
    } finally {
      if (loadToken === this.#loadToken) {
        this.removeAttribute('loading');
        this.shadowRoot.querySelector('.card')?.setAttribute('aria-busy', 'false');
      }
    }
  }

  /** Re-render from current #data. */
  render() {
    if (!this.#data) return;
    this.#hide('skeleton');
    this.#hide('error');
    this.#show('content');

    const info = this.#data;
    const name = this.getAttribute('name');
    const versions = Array.isArray(info.versions) ? info.versions : [];
    const latestVer = info['dist-tags']?.latest;
    const release = latestVer ? info.releases?.[String(latestVer)] : null;
    const health = computeHealth(release, versions.length);
    const isNew = release?.publishedAt && daysSince(release.publishedAt) < 7;
    const depCount = release?.dependencies ? Object.keys(release.dependencies).length : 0;

    const root = this.shadowRoot;

    root.getElementById('name').textContent = name ?? '';
    root.getElementById('version').textContent = latestVer ? String(latestVer) : '—';

    const badge = root.getElementById('badge-new');
    badge.hidden = !isNew;
    if (isNew) badge.textContent = 'NEW';

    const fill = root.getElementById('health-fill');
    const hClass = healthClass(health.score);
    fill.className = `health-fill ${hClass}`;
    fill.style.width = `${health.score}%`;
    root.getElementById('health-bar').setAttribute('aria-valuenow', String(health.score));

    root.getElementById('health-label').className = `health-label ${hClass}`;
    root.getElementById('health-label').textContent = healthLabel(health.score);

    root.getElementById('type').textContent = String(release?.type || 'library');

    const descEl = root.getElementById('desc');
    const desc = release?.description;
    if (desc) {
      descEl.textContent = String(desc);
      descEl.hidden = false;
    } else {
      descEl.hidden = true;
    }

    const tagsEl = root.getElementById('tags');
    const tags = release?.tags;
    if (Array.isArray(tags) && tags.length) {
      tagsEl.replaceChildren(
        ...tags.map(tag => {
          const chip = document.createElement('span');
          chip.className = 'tag';
          chip.textContent = String(tag);
          return chip;
        })
      );
      tagsEl.hidden = false;
    } else {
      tagsEl.replaceChildren();
      tagsEl.hidden = true;
    }

    const metaEl = root.getElementById('meta');
    const metaParts = [`${versions.length} version(s)`];
    if (depCount > 0) metaParts.push(`${depCount} dep(s)`);
    if (release?.publishedAt) metaParts.push(new Date(release.publishedAt).toLocaleDateString());
    metaEl.textContent = metaParts.join(' · ');
  }

  /** Access the loaded data (read-only for parent pages). */
  get data() {
    return this.#data;
  }

  /* ── Private helpers ──────────────────────────────────────────────── */

  #wireEvents() {
    if (this.#wired) return;
    this.#wired = true;
    const root = this.shadowRoot;

    const detailBtn = root.getElementById('detail-btn');
    detailBtn.addEventListener('click', () => this.#fireDetail());

    root.getElementById('retry-btn').addEventListener('click', () => this.load());
  }

  #fireDetail() {
    this.dispatchEvent(
      new CustomEvent('package-detail', {
        detail: {
          name: this.getAttribute('name'),
          info: this.#data,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  #show(id) {
    const el = this.shadowRoot.getElementById(id);
    if (el) el.hidden = false;
  }

  #hide(id) {
    const el = this.shadowRoot.getElementById(id);
    if (el) el.hidden = true;
  }

  #showError(msg) {
    this.#hide('skeleton');
    this.#hide('content');
    this.#show('error');
    this.shadowRoot.getElementById('error-msg').textContent = msg || 'Failed to load package';
  }
}

/* ── Registration ────────────────────────────────────────────────────── */

if (!customElements.get('package-card')) {
  customElements.define('package-card', PackageCard);
}
