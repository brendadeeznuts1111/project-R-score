/**
 * Shared glossary UX helpers for the static portal.
 *
 * Tooltips · search autocomplete · breadcrumbs · privacy-friendly usage tracking.
 * Consumes `/registry/domain-glossary.json` (schema v3) and page surface maps
 * baked from `lib/portal/page-glossary.ts` (`sections[]` = hash · domId · conceptId · title).
 *
 * Hash plane only (`URLPattern.hash`) — section + glossary concept.
 * Partner hashes are a separate plane (`partner-routes.js`). Pathname/registry/API
 * planes: `lib/portal/url-planes.ts`.
 *
 * @see tools/domain-glossary.ts
 * @see lib/portal/url-planes.ts
 * @see https://bun.com/blog/bun-v1.3.4#urlpattern-api
 * @see https://bun.com/blog/bun-v1.3.12#urlpattern-is-up-to-2-3x-faster
 */

const GLOSSARY_URL = '/registry/domain-glossary.json';
const TRACK_STORAGE_KEY = 'fw.glossary.usage.v1';
const TRACK_MAX_KEYS = 80;
const TRACK_DETAIL_KEYS = Object.freeze({
  'glossary.click': ['conceptId'],
  'glossary.search_select': ['conceptId'],
  'glossary.view': ['conceptId'],
  'limits.filter': ['filter'],
  'page.view': ['page', 'section'],
});
const TRACK_TOKEN_PATTERN = /^[a-z0-9][a-z0-9_.:-]{0,127}$/i;

// Precompile once; this consumer needs exec() because it extracts named groups.
const sectionPattern = new URLPattern({ hash: 'section\\::section' });
const glossaryConceptPattern = new URLPattern({ hash: 'glossary\\::concept' });

let glossaryCache = null;
let glossaryInflight = null;
let stylesReady = false;
let autocompleteSequence = 0;
const tooltipRoots = new WeakSet();
const trackedPageViews = new Set();

function ensureStyles() {
  if (stylesReady || document.getElementById('glossary-ux-styles')) {
    stylesReady = true;
    return;
  }
  const style = document.createElement('style');
  style.id = 'glossary-ux-styles';
  style.textContent = `
    .glossary-crumbs {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px 8px;
      margin: 0 0 14px;
      padding: 0;
      list-style: none;
      font: 500 12px/1.4 var(--font-sans, Inter, system-ui, sans-serif);
      color: var(--tone-skip, var(--text-dim));
    }
    .glossary-crumbs ol {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px 8px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .glossary-crumbs li {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .glossary-crumbs li:not(:last-child)::after {
      content: "/";
      color: var(--border);
      font-weight: 400;
    }
    .glossary-crumbs a {
      color: var(--tone-info, var(--accent));
      text-decoration: none;
    }
    .glossary-crumbs a:hover,
    .glossary-crumbs a:focus-visible {
      text-decoration: underline;
      outline: none;
    }
    .glossary-crumbs [aria-current="page"] {
      color: var(--text);
      font-weight: 600;
    }
    .glossary-suggest-wrap {
      position: relative;
      display: block;
    }
    .glossary-suggest {
      position: absolute;
      z-index: 40;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      margin: 0;
      padding: 6px;
      list-style: none;
      max-height: 320px;
      overflow: auto;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--surface);
      box-shadow: 0 16px 40px color-mix(in srgb, black 35%, transparent);
    }
    .glossary-suggest[hidden] { display: none; }
    .glossary-suggest__item {
      display: grid;
      gap: 2px;
      width: 100%;
      padding: 8px 10px;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: inherit;
      text-align: left;
      cursor: pointer;
      font: inherit;
    }
    .glossary-suggest__item[aria-selected="true"],
    .glossary-suggest__item:hover,
    .glossary-suggest__item:focus-visible {
      background: var(--accent-glow);
      outline: none;
    }
    .glossary-suggest__label {
      font-weight: 600;
      color: var(--text);
    }
    .glossary-suggest__id {
      font: 500 11px/1.3 var(--font-mono, ui-monospace, monospace);
      color: var(--tone-skip, var(--text-dim));
    }
    .glossary-suggest__desc {
      font-size: 12px;
      color: var(--tone-skip, var(--text-dim));
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    #glossary-live-tip {
      position: fixed;
      z-index: 60;
      max-width: min(360px, calc(100vw - 24px));
      padding: 10px 12px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--surface);
      color: var(--text);
      box-shadow: 0 12px 32px color-mix(in srgb, black 40%, transparent);
      font: 500 12px/1.45 var(--font-sans, Inter, system-ui, sans-serif);
      pointer-events: none;
    }
    #glossary-live-tip[hidden] { display: none; }
    #glossary-live-tip strong {
      display: block;
      margin-bottom: 4px;
      font-size: 12px;
    }
    #glossary-live-tip code {
      display: block;
      margin-bottom: 6px;
      font: 500 10px/1.3 var(--font-mono, ui-monospace, monospace);
      color: var(--tone-info, var(--accent));
    }
    .glossary-status-dot {
      display: inline-block;
      width: 7px;
      height: 7px;
      margin-right: 6px;
      border-radius: 50%;
      background: var(--tone-ok, var(--green));
      vertical-align: middle;
    }
    .glossary-status-dot[data-status="deprecated"] { background: var(--tone-warn, var(--yellow)); }
    .glossary-status-dot[data-status="draft"] { background: var(--tone-skip, var(--text-dim)); }
  `;
  document.head.append(style);
  stylesReady = true;
}

/**
 * @returns {Promise<object>}
 */
export async function loadDomainGlossary() {
  if (glossaryCache) return glossaryCache;
  if (glossaryInflight) return glossaryInflight;
  glossaryInflight = fetch(GLOSSARY_URL, {
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  })
    .then(async response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (payload.schemaVersion !== 3 || payload.kind !== 'domain-glossary') {
        throw new Error(`unsupported domain glossary schema: ${String(payload.schemaVersion)}`);
      }
      glossaryCache = payload;
      return payload;
    })
    .finally(() => {
      glossaryInflight = null;
    });
  return glossaryInflight;
}

export function conceptById(glossary, conceptId) {
  if (!glossary || !conceptId) return undefined;
  return glossary.concepts.find(concept => concept.id === conceptId);
}

function parseGlossaryHref(href) {
  if (!href) return null;
  try {
    const url = new URL(href, window.location.origin);
    return fragmentGroup(glossaryConceptPattern, url.href, 'concept');
  } catch {
    const match = String(href).match(/#glossary:([^?#\s]+)/);
    if (!match?.[1]) return null;
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return null;
    }
  }
}

function fragmentGroup(pattern, url, group) {
  const value = pattern.exec(url)?.hash.groups[group];
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function conceptIdFromElement(el) {
  return el.dataset.glossaryConcept || parseGlossaryHref(el.getAttribute('href'));
}

/**
 * Aggregate-only local usage tracking (no PII).
 * Only event-specific, bounded taxonomy tokens are retained. Free-form values,
 * URL paths, query strings, account identifiers, and other PII are discarded.
 * @param {string} name
 * @param {Record<string, string | null | undefined>} [detail]
 */
export function trackGlossaryEvent(name, detail = {}) {
  if (!Object.hasOwn(TRACK_DETAIL_KEYS, name)) return;
  const allowedKeys = TRACK_DETAIL_KEYS[name];
  if (!allowedKeys) return;
  const safeDetail = Object.fromEntries(
    allowedKeys.flatMap(key => {
      const value = detail[key];
      return typeof value === 'string' && TRACK_TOKEN_PATTERN.test(value) ? [[key, value]] : [];
    })
  );
  const conceptId = safeDetail.conceptId ?? null;
  const key = conceptId ? `${name}:${conceptId}` : name;
  try {
    const raw = localStorage.getItem(TRACK_STORAGE_KEY);
    const store = raw ? JSON.parse(raw) : { schemaVersion: 1, counts: {}, updatedAt: null };
    if (!store.counts || typeof store.counts !== 'object') store.counts = {};
    store.counts[key] = (Number(store.counts[key]) || 0) + 1;
    const entries = Object.entries(store.counts).sort((a, b) => b[1] - a[1]);
    if (entries.length > TRACK_MAX_KEYS) {
      store.counts = Object.fromEntries(entries.slice(0, TRACK_MAX_KEYS));
    }
    store.updatedAt = new Date().toISOString();
    localStorage.setItem(TRACK_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // private mode / quota — tracking is best-effort
  }
  window.dispatchEvent(
    new CustomEvent('portal:glossary-track', {
      detail: { name, ...safeDetail, at: Date.now() },
    })
  );
}

export function readGlossaryUsage() {
  try {
    return JSON.parse(localStorage.getItem(TRACK_STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

function ensureTipElement() {
  let tip = document.getElementById('glossary-live-tip');
  if (tip) return tip;
  tip = document.createElement('div');
  tip.id = 'glossary-live-tip';
  tip.setAttribute('role', 'tooltip');
  tip.hidden = true;
  document.body.append(tip);
  return tip;
}

function placeTip(tip, anchor) {
  const rect = anchor.getBoundingClientRect();
  const margin = 12;
  const tipWidth = Math.min(360, window.innerWidth - 24);
  let left = rect.left + rect.width / 2 - tipWidth / 2;
  left = Math.max(margin, Math.min(left, window.innerWidth - tipWidth - margin));
  let top = rect.bottom + 8;
  tip.style.width = `${tipWidth}px`;
  tip.hidden = false;
  const tipHeight = tip.offsetHeight;
  if (top + tipHeight > window.innerHeight - margin && rect.top > tipHeight + margin) {
    top = rect.top - tipHeight - 8;
  }
  tip.style.left = `${left}px`;
  tip.style.top = `${Math.max(margin, top)}px`;
}

/**
 * Hover/focus tooltips for glossary-linked nodes.
 * @param {ParentNode} [root]
 * @param {object} glossary
 */
export function enhanceGlossaryTooltips(root = document, glossary) {
  ensureStyles();
  const tip = ensureTipElement();
  const byId = new Map(glossary.concepts.map(concept => [concept.id, concept]));

  function hideTip() {
    tip.hidden = true;
    tip.textContent = '';
  }

  function showTip(anchor, concept) {
    tip.replaceChildren();
    const status = document.createElement('span');
    status.className = 'glossary-status-dot';
    status.dataset.status = concept.status || 'active';
    status.title = concept.status || 'active';
    const strong = document.createElement('strong');
    strong.append(status, document.createTextNode(concept.label));
    const code = document.createElement('code');
    code.textContent = concept.id;
    const desc = document.createElement('span');
    desc.textContent = concept.description;
    tip.append(strong, code, desc);
    placeTip(tip, anchor);
  }

  function bind(el) {
    if (!(el instanceof HTMLElement) || el.dataset.glossaryTipBound === '1') return;
    const conceptId = conceptIdFromElement(el);
    const concept = conceptId ? byId.get(conceptId) : undefined;
    if (!concept) return;
    el.dataset.glossaryTipBound = '1';
    const describedBy = new Set(
      (el.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean)
    );
    describedBy.add(tip.id);
    el.setAttribute('aria-describedby', [...describedBy].join(' '));
    if (!el.getAttribute('title')) {
      el.setAttribute('title', `${concept.label} — ${concept.description}`);
    }
    el.addEventListener('pointerenter', () => showTip(el, concept));
    el.addEventListener('pointerleave', hideTip);
    el.addEventListener('focus', () => showTip(el, concept));
    el.addEventListener('blur', hideTip);
    el.addEventListener('keydown', event => {
      if (event.key === 'Escape') hideTip();
    });
    el.addEventListener('click', () => {
      trackGlossaryEvent('glossary.click', { conceptId: concept.id });
    });
  }

  function scan() {
    root.querySelectorAll('[data-glossary-concept], a[href*="#glossary:"]').forEach(bind);
  }

  scan();
  const observer = new MutationObserver(() => scan());
  if (root instanceof Node) {
    observer.observe(root, { childList: true, subtree: true });
  }
  return () => {
    observer.disconnect();
    hideTip();
  };
}

function conceptSearchHaystack(concept) {
  return [
    concept.id,
    concept.label,
    concept.description,
    concept.category,
    concept.kind,
    ...(concept.synonyms ?? []),
    ...(concept.seeAlso ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

/**
 * Type-ahead suggestions for a glossary search input.
 * @param {HTMLInputElement} input
 * @param {object} glossary
 * @param {{ onSelect?: (concept: object) => void, limit?: number }} [options]
 */
export function mountGlossaryAutocomplete(input, glossary, options = {}) {
  ensureStyles();
  const limit = options.limit ?? 8;
  const wrap =
    input.closest('.glossary-suggest-wrap') ||
    (() => {
      const node = document.createElement('div');
      node.className = 'glossary-suggest-wrap';
      input.parentElement?.insertBefore(node, input);
      node.append(input);
      return node;
    })();

  const list = document.createElement('ul');
  list.id = input.id
    ? `${input.id}-suggestions`
    : `glossary-search-suggestions-${++autocompleteSequence}`;
  list.className = 'glossary-suggest';
  list.setAttribute('role', 'listbox');
  list.hidden = true;
  wrap.append(list);

  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-controls', list.id);
  input.setAttribute('aria-expanded', 'false');

  let activeIndex = -1;
  let matches = [];

  function close() {
    list.hidden = true;
    list.replaceChildren();
    activeIndex = -1;
    matches = [];
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }

  function renderList(query) {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      close();
      return;
    }
    matches = glossary.concepts
      .filter(concept => conceptSearchHaystack(concept).includes(needle))
      .slice(0, limit);
    if (!matches.length) {
      close();
      return;
    }
    list.replaceChildren(
      ...matches.map((concept, index) => {
        const item = document.createElement('li');
        item.setAttribute('role', 'option');
        item.id = `${list.id}-option-${index}`;
        item.setAttribute('aria-selected', 'false');
        const button = document.createElement('button');
        button.type = 'button';
        button.tabIndex = -1;
        button.className = 'glossary-suggest__item';
        button.dataset.index = String(index);
        button.append(
          Object.assign(document.createElement('span'), {
            className: 'glossary-suggest__label',
            textContent: concept.label,
          }),
          Object.assign(document.createElement('code'), {
            className: 'glossary-suggest__id',
            textContent: concept.id,
          }),
          Object.assign(document.createElement('span'), {
            className: 'glossary-suggest__desc',
            textContent: concept.description,
          })
        );
        button.addEventListener('mousedown', event => {
          event.preventDefault();
        });
        button.addEventListener('click', () => {
          pick(index);
        });
        item.append(button);
        return item;
      })
    );
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    activeIndex = -1;
  }

  function setActive(index) {
    activeIndex = index;
    list.querySelectorAll('[role="option"]').forEach((option, i) => {
      option.setAttribute('aria-selected', String(i === activeIndex));
    });
    const active = list.querySelector(`[data-index="${activeIndex}"]`);
    if (active) {
      input.setAttribute('aria-activedescendant', active.parentElement.id);
      active.parentElement.scrollIntoView({ block: 'nearest' });
    } else input.removeAttribute('aria-activedescendant');
  }

  function pick(index) {
    const concept = matches[index];
    if (!concept) return;
    input.value = concept.label;
    trackGlossaryEvent('glossary.search_select', { conceptId: concept.id });
    close();
    options.onSelect?.(concept);
  }

  input.addEventListener('input', () => {
    renderList(input.value);
  });
  input.addEventListener('keydown', event => {
    if (list.hidden || !matches.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((activeIndex + 1) % matches.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(activeIndex <= 0 ? matches.length - 1 : activeIndex - 1);
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      pick(activeIndex);
    } else if (event.key === 'Escape') {
      close();
    }
  });
  input.addEventListener('blur', () => {
    window.setTimeout(close, 120);
  });

  return { close, renderList };
}

export function surfaceByPath(glossary, pathname) {
  const normalized = pathname.endsWith('/') ? pathname : `${pathname}/`;
  return (glossary.surfaces ?? []).find(
    surface => surface.path === normalized || surface.path === pathname
  );
}

/**
 * Resolve section concept id from URL hash key (`#section:{hash}`).
 * Schema v3 only: `sections[]` rows `{ hash, domId, conceptId, title }`.
 * @param {object|undefined} surface
 * @param {string} sectionHash
 * @returns {string|null}
 */
export function sectionConceptFromSurface(surface, sectionHash) {
  if (!surface || !sectionHash) return null;
  const sections = surface.sections;
  if (!Array.isArray(sections)) return null;
  const row = sections.find(s => s && s.hash === sectionHash);
  return row?.conceptId ?? null;
}

/** DOM id from v3 surface row (`section:{hash}` · `ad-section-{hash}` · bare). */
export function sectionDomIdFromSurface(surface, sectionHash) {
  if (!surface || !sectionHash) return null;
  const sections = surface.sections;
  if (!Array.isArray(sections)) return null;
  const row = sections.find(s => s && s.hash === sectionHash);
  return row?.domId ?? null;
}

/** Board heading title from v3 surface row (not concept.label). */
export function sectionTitleFromSurface(surface, sectionHash) {
  if (!surface || !sectionHash) return null;
  const sections = surface.sections;
  if (!Array.isArray(sections)) return null;
  const row = sections.find(s => s && s.hash === sectionHash);
  const title = row?.title;
  return typeof title === 'string' && title.trim() ? title.trim() : null;
}

/** Duck-type Element / HTMLElement (allows fixture tests without happy-dom). */
function isDomEl(el) {
  return (
    !!el &&
    typeof el === 'object' &&
    typeof el.getAttribute === 'function' &&
    typeof el.querySelector === 'function'
  );
}

/**
 * Resolve an element by id within a root (Document, Element, or fixture).
 * Attribute selector is colon-safe for ids like `section:telegram`.
 * @param {ParentNode|{getElementById?: Function, querySelector?: Function}|null} root
 * @param {string} id
 */
export function getElementByIdInRoot(root, id) {
  if (!root || !id) return null;
  if (typeof root.getElementById === 'function') {
    const hit = root.getElementById(id);
    if (hit) return hit;
  }
  if (typeof root.querySelector === 'function') {
    const escaped = String(id).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return root.querySelector(`[id="${escaped}"]`);
  }
  return null;
}

/**
 * Pick the primary heading text node for a section mount.
 * Limits pattern: h2 > a.section-anchor (title) + .section-heading__links (siblings).
 * @param {Element} sectionEl
 * @param {string} [conceptId]
 * @param {{ getElementById?: Function, querySelector?: Function }|null} [doc] root for aria-labelledby
 * @returns {Element|null}
 */
export function primarySectionTitleEl(sectionEl, conceptId, doc = null) {
  if (!isDomEl(sectionEl)) return null;
  const labelledBy = sectionEl.getAttribute('aria-labelledby');
  const scope = doc || sectionEl;
  const heading =
    (labelledBy && getElementByIdInRoot(scope, labelledBy)) ||
    sectionEl.querySelector(':scope > h1, :scope > h2, :scope > h3') ||
    sectionEl.querySelector('h1, h2, h3');
  if (!isDomEl(heading)) return null;

  const byConcept =
    conceptId &&
    heading.querySelector(`a.section-anchor[data-glossary-concept="${conceptId}"]`);
  if (isDomEl(byConcept)) return byConcept;

  const sectionAnchor = heading.querySelector('a.section-anchor');
  if (isDomEl(sectionAnchor)) return sectionAnchor;

  if (conceptId) {
    const conceptLink = heading.querySelector(`a[data-glossary-concept="${conceptId}"]`);
    if (isDomEl(conceptLink)) return conceptLink;
  }

  const firstConcept = heading.querySelector('a[data-glossary-concept]');
  if (isDomEl(firstConcept)) return firstConcept;

  return heading;
}

/**
 * Apply bake `section.title` to board headings for the current surface.
 * Leaves concept tooltips on `data-glossary-concept` using concept.label/description.
 * Opt-in only — pass `applySectionTitles: true` from bootGlossaryUx (limits PoC).
 *
 * @param {object} glossary domain-glossary payload
 * @param {{ pathname?: string, root?: ParentNode|{getElementById?: Function, querySelector?: Function} }} [options]
 * @returns {{ applied: number, missing: string[], surface: string|null }}
 */
export function applySectionTitles(glossary, options = {}) {
  const pathname = options.pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '');
  const root =
    options.root ??
    (typeof document !== 'undefined' ? document : null);
  const surface = surfaceByPath(glossary, pathname);
  if (!surface || !Array.isArray(surface.sections) || !root) {
    return { applied: 0, missing: [], surface: surface?.path ?? null };
  }

  let applied = 0;
  const missing = [];
  for (const section of surface.sections) {
    const title = typeof section.title === 'string' ? section.title.trim() : '';
    if (!title || !section.domId) continue;

    // Skip intentionally non-visual mounts (partners outs / tag bar).
    const sectionEl = getElementByIdInRoot(root, section.domId);
    if (!isDomEl(sectionEl)) {
      missing.push(section.domId);
      continue;
    }
    const ariaHidden = sectionEl.getAttribute?.('aria-hidden') === 'true';
    const className = sectionEl.getAttribute?.('class') || sectionEl.className || '';
    if (ariaHidden || (typeof className === 'string' && className.split(/\s+/).includes('sr-only'))) {
      continue;
    }

    const target = primarySectionTitleEl(sectionEl, section.conceptId, root);
    if (!isDomEl(target)) {
      missing.push(section.domId);
      continue;
    }

    // Prefer updating the title anchor only — never wipe sibling .section-heading__links.
    const matches =
      typeof target.matches === 'function' &&
      target.matches('a.section-anchor, a[data-glossary-concept]');
    if (matches) {
      target.textContent = title;
    } else {
      const anchor = target.querySelector?.('a.section-anchor, a[data-glossary-concept]');
      if (isDomEl(anchor)) {
        anchor.textContent = title;
      } else {
        // Bare heading with no concept link — refuse to clobber mixed children.
        missing.push(section.domId);
        continue;
      }
    }

    if (sectionEl.dataset) {
      sectionEl.dataset.sectionTitle = title;
      sectionEl.dataset.sectionHash = section.hash ?? '';
    }
    applied++;
  }

  return { applied, missing, surface: surface.path };
}

/** Section hash key from `#section:{hash}` (null if not a section fragment). */
export function sectionHashFromLocation(href = window.location.href) {
  return fragmentGroup(sectionPattern, href, 'section');
}

/**
 * Scroll to the bake-governed `domId` for `#section:{hash}` on a surface.
 * Uses getElementById (colon-safe for `section:…` / `ad-section-…`).
 * Do not use querySelector(`#${domId}`) — `:` is a CSS pseudo-class delimiter.
 * @returns {boolean} true when an element was found and scrolled
 */
export function scrollGlossarySection(surface, sectionHash, options = {}) {
  const domId = sectionDomIdFromSurface(surface, sectionHash);
  if (!domId) return false;
  const el = document.getElementById(domId);
  if (!(el instanceof HTMLElement)) return false;
  el.scrollIntoView({
    behavior: options.behavior ?? 'auto',
    block: options.block ?? 'start',
  });
  return true;
}

/** Resolve pathname surface + current `#section:` hash, then scroll via `domId`. */
export function scrollGlossarySectionFromUrl(glossary, options = {}) {
  const pathname = options.pathname ?? window.location.pathname;
  const href = options.href ?? window.location.href;
  const surface = surfaceByPath(glossary, pathname);
  const sectionHash = sectionHashFromLocation(href);
  if (!surface || !sectionHash) return false;
  return scrollGlossarySection(surface, sectionHash, options);
}

const sectionScrollRoots = new WeakSet();

/**
 * Mark every portal page with a governed glossary concept and a stable deep link.
 * Rich registered pages use their page.* concept; other pages use the shared
 * ui.semantic.surface concept until their dedicated page vocabulary is added.
 * @param {ParentNode} root
 * @param {object} glossary
 * @param {{ pathname?: string }} [options]
 */
export function markPortalSurface(root, glossary, options = {}) {
  const pathname = options.pathname ?? window.location.pathname;
  const surface = surfaceByPath(glossary, pathname);
  const conceptId = surface?.concept ?? 'ui.semantic.surface';
  const heading = root.querySelector('main h1, main .hero h2, h1');

  document.documentElement.dataset.brand = 'factorywager';
  document.documentElement.dataset.glossarySurface = conceptId;
  if (!(heading instanceof HTMLElement)) return { conceptId, surface };

  heading.classList.add('portal-surface-heading');
  heading.dataset.glossaryConcept = conceptId;
  if (!heading.querySelector('[data-portal-glossary-link]')) {
    const link = document.createElement('a');
    link.className = 'surface-glossary-link';
    link.dataset.portalGlossaryLink = 'true';
    link.href = `/portal/glossary/#glossary:${encodeURIComponent(conceptId)}`;
    link.textContent = 'Glossary';
    link.setAttribute('aria-label', `Open ${conceptId} definition in the domain glossary`);
    heading.append(link);
  }
  return { conceptId, surface };
}

function trackPageViewOnce(page, section = null) {
  if (!page) return;
  const key = `${page}:${section ?? ''}`;
  if (trackedPageViews.has(key)) return;
  trackedPageViews.add(key);
  trackGlossaryEvent('page.view', { page, section });
}

/**
 * Breadcrumb trail for glossary-aware portal surfaces.
 * @param {HTMLElement} mount
 * @param {object} glossary
 * @param {{ pathname?: string }} [options]
 */
export function mountGlossaryBreadcrumbs(mount, glossary, options = {}) {
  ensureStyles();
  mount.classList.add('glossary-crumbs');
  mount.setAttribute('aria-label', 'Breadcrumb');

  function render() {
    const pathname = options.pathname ?? window.location.pathname;
    const crumbs = [{ label: 'Home', href: '/portal/' }];
    const surface = surfaceByPath(glossary, pathname);
    const conceptId = fragmentGroup(glossaryConceptPattern, window.location.href, 'concept');
    const sectionId = fragmentGroup(sectionPattern, window.location.href, 'section');

    if (pathname.includes('/portal/glossary')) {
      crumbs.push({
        label: 'Glossary',
        href: '/portal/glossary/',
        current: !conceptId,
      });
      if (conceptId) {
        const concept = conceptById(glossary, conceptId);
        crumbs.push({
          label: concept?.label ?? conceptId,
          href: `/portal/glossary/#glossary:${encodeURIComponent(conceptId)}`,
          current: true,
        });
      }
    } else if (surface) {
      const pageConcept = conceptById(glossary, surface.concept);
      if (pathname.includes('/portal/partner-history') || pathname.includes('/portal/account')) {
        crumbs.push({ label: 'Limits', href: '/portal/limits/' });
      } else if (pathname.includes('/portal/limits')) {
        crumbs.push({ label: 'Ops', href: '/portal/ops/' });
      }
      crumbs.push({
        label: pageConcept?.label ?? 'Page',
        href: surface.path,
        current: !sectionId,
      });
      const sectionConceptId = sectionConceptFromSurface(surface, sectionId);
      if (sectionId && sectionConceptId) {
        // Prefer section.title (board heading); fall back to concept.label for term id.
        const sectionTitle = sectionTitleFromSurface(surface, sectionId);
        const sectionConcept = conceptById(glossary, sectionConceptId);
        crumbs.push({
          label: sectionTitle ?? sectionConcept?.label ?? sectionId,
          href: `#section:${encodeURIComponent(sectionId)}`,
          current: true,
        });
      }
    } else {
      crumbs.push({
        label: pathname.replace(/^\/portal\/?/, '').replace(/\/$/, '') || 'Portal',
        href: pathname,
        current: true,
      });
    }

    const list = document.createElement('ol');
    for (const crumb of crumbs) {
      const item = document.createElement('li');
      if (crumb.current) {
        const current = document.createElement('span');
        current.setAttribute('aria-current', 'page');
        current.textContent = crumb.label;
        item.append(current);
      } else {
        const link = document.createElement('a');
        link.href = crumb.href;
        link.textContent = crumb.label;
        item.append(link);
      }
      list.append(item);
    }
    mount.replaceChildren(list);

    trackPageViewOnce(
      surface?.concept ?? (pathname.includes('/glossary') ? 'ui.semantic.surface' : null),
      sectionId
        ? (sectionConceptFromSurface(surface, sectionId) ?? null)
        : conceptId
          ? conceptId
          : null
    );
  }

  render();
  window.addEventListener('hashchange', render);
  window.addEventListener('popstate', render);
  return render;
}

/**
 * Boot shared glossary UX for a page.
 * @param {{
 *   breadcrumbsMount?: HTMLElement | null,
 *   searchInput?: HTMLInputElement | null,
 *   tooltipRoot?: ParentNode,
 *   onAutocompleteSelect?: (concept: object) => void,
 *   trackPage?: boolean,
 *   markSurface?: boolean,
 *   scrollSections?: boolean,
 *   applySectionTitles?: boolean,
 *   pathname?: string,
 * }} [options]
 */
export async function bootGlossaryUx(options = {}) {
  ensureStyles();
  const glossary = await loadDomainGlossary();
  const marked = options.markSurface === false ? null : markPortalSurface(document, glossary);
  // Opt-in only (limits PoC). Default off so other boards are not silently rewritten.
  // concept.label stays on tooltips via enhanceGlossaryTooltips.
  if (options.applySectionTitles === true) {
    applySectionTitles(glossary, {
      pathname: options.pathname,
      // Prefer document for getElementById; fall back to tooltipRoot for scoped boards/tests.
      root: typeof document !== 'undefined' ? document : options.tooltipRoot,
    });
  }
  if (options.breadcrumbsMount) {
    mountGlossaryBreadcrumbs(options.breadcrumbsMount, glossary);
  } else if (options.trackPage !== false) {
    trackPageViewOnce(
      marked?.conceptId ?? surfaceByPath(glossary, window.location.pathname)?.concept
    );
  }
  if (options.searchInput) {
    mountGlossaryAutocomplete(options.searchInput, glossary, {
      onSelect: options.onAutocompleteSelect,
    });
  }
  if (options.tooltipRoot !== null) {
    const tooltipRoot = options.tooltipRoot ?? document;
    if (!tooltipRoots.has(tooltipRoot)) {
      tooltipRoots.add(tooltipRoot);
      enhanceGlossaryTooltips(tooltipRoot, glossary);
    }
  }
  if (options.scrollSections) {
    const runScroll = () => {
      scrollGlossarySectionFromUrl(glossary, { pathname: options.pathname });
    };
    runScroll();
    if (!sectionScrollRoots.has(window)) {
      sectionScrollRoots.add(window);
      window.addEventListener('hashchange', runScroll);
      window.addEventListener('popstate', runScroll);
    }
  }
  return glossary;
}
