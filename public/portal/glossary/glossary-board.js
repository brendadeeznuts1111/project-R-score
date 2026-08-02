/**
 * Domain glossary board.
 * @see tools/domain-glossary.ts
 * @see https://bun.com/blog/bun-v1.3.4#urlpattern-api
 * @see https://bun.com/blog/bun-v1.3.12#urlpattern-is-up-to-2-3x-faster
 * @see ../components/glossary-ux.js
 */

import {
  bootGlossaryUx,
  loadDomainGlossary,
  trackGlossaryEvent,
} from '../components/glossary-ux.js';

// Precompile once; exec() is required here to extract the concept group.
const glossaryPattern = new URLPattern({ hash: 'glossary\\::concept' });

let glossary;
let lastTrackedConceptId = null;

const FILTER_PARAM_KEYS = {
  query: 'q',
  category: 'category',
  kind: 'kind',
  semanticType: 'type',
  status: 'status',
};

function text(tag, value, className) {
  const node = document.createElement(tag);
  node.textContent = String(value);
  if (className) node.className = className;
  return node;
}

function chip(value, color, tone = 'default') {
  const node = document.createElement('span');
  node.className = `glossary-chip glossary-chip--${tone}`;
  if (color) node.style.setProperty('--chip-color', color);
  if (color) node.append(text('span', '', 'glossary-chip-dot'));
  node.append(text('span', value));
  return node;
}

function stat(value, label, description, accent, filter, disabled = false) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'glossary-stat';
  card.style.setProperty('--stat-accent', accent);
  card.disabled = disabled;
  card.dataset.filterKind = filter?.kind ?? '';
  card.dataset.filterStatus = filter?.status ?? '';
  if (filter?.reset) card.dataset.filterReset = 'true';
  card.append(
    text('span', label, 'glossary-stat-label'),
    text('strong', value),
    text('span', description, 'glossary-stat-description')
  );
  if (filter) {
    card.addEventListener('click', () => {
      if (filter.reset) {
        resetFilters();
        return;
      }
      if (filter.kind) {
        const select = document.getElementById('glossary-kind');
        select.value = select.value === filter.kind ? '' : filter.kind;
      }
      if (filter.status) {
        const select = document.getElementById('glossary-status');
        select.value = select.value === filter.status ? '' : filter.status;
      }
      renderConcepts();
    });
  }
  return card;
}

function conceptHash(conceptId) {
  return `#glossary:${encodeURIComponent(conceptId)}`;
}

function readConceptHash() {
  const captured = glossaryPattern.exec(window.location.href)?.hash.groups.concept;
  if (!captured) return null;
  try {
    return decodeURIComponent(captured);
  } catch {
    return null;
  }
}

function scrollBehavior() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

function setConceptHash(conceptId) {
  if (readConceptHash() === conceptId) {
    syncConceptFromUrl();
    return;
  }
  const url = new URL(window.location.href);
  url.hash = conceptHash(conceptId);
  history.pushState(null, '', url);
  syncConceptFromUrl();
}

function clearConceptHash() {
  lastTrackedConceptId = null;
  if (!readConceptHash()) return;
  const url = new URL(window.location.href);
  url.hash = '';
  history.replaceState(null, '', url);
}

function relatedLink(conceptId) {
  const link = document.createElement('a');
  link.href = conceptHash(conceptId);
  link.className = 'glossary-related-link';
  link.textContent = conceptId;
  link.addEventListener('click', () => {
    if (readConceptHash() === conceptId) queueMicrotask(syncConceptFromUrl);
  });
  return link;
}

function addDetailRow(target, label, content) {
  if (content === null || content === undefined || content === '' || content === '—') return;
  const row = document.createElement('div');
  row.className = 'glossary-detail-row';
  row.append(text('dt', label));
  const value = document.createElement('dd');
  if (content instanceof Node) value.append(content);
  else value.textContent = String(content);
  row.append(value);
  target.append(row);
}

function openConcept(concept) {
  const dialog = document.getElementById('glossary-detail');
  const details = document.getElementById('glossary-detail-list');
  const related = document.createElement('div');
  related.className = 'glossary-related';
  related.append(...(concept.seeAlso ?? []).map(relatedLink));

  document.getElementById('glossary-detail-title').textContent = concept.label;
  document.getElementById('glossary-detail-id').textContent = concept.id;
  document.getElementById('glossary-detail-description').textContent = concept.description;
  document.getElementById('glossary-detail-accent').style.backgroundColor = concept.color;
  details.replaceChildren();
  addDetailRow(details, 'Category', concept.category);
  addDetailRow(details, 'Concept kind', concept.kind);
  addDetailRow(details, 'Semantic type', concept.semanticType);
  addDetailRow(details, 'UI role', concept.uiRole);
  addDetailRow(details, 'Parent concept', concept.parentId ? relatedLink(concept.parentId) : null);
  addDetailRow(details, 'Competition scope', concept.scope);
  addDetailRow(details, 'Region', concept.region);
  addDetailRow(details, 'Event country codes', concept.countryCodes?.join(', '));
  addDetailRow(details, 'Flag', concept.flagEmoji);
  addDetailRow(details, 'Status', concept.status);
  addDetailRow(details, 'Unit', concept.unit);
  addDetailRow(details, 'Format', concept.format);
  addDetailRow(details, 'Maps to', concept.mapsTo ? relatedLink(concept.mapsTo) : null);
  addDetailRow(details, 'Registry column', concept.registryColumn);
  addDetailRow(details, 'Source', concept.source);
  addDetailRow(details, 'Feature purpose', concept.featurePurpose);
  addDetailRow(details, 'Synonyms', concept.synonyms?.join(', '));
  addDetailRow(details, 'Values', concept.values?.join(', '));
  addDetailRow(details, 'See also', related.childElementCount ? related : null);
  addDetailRow(
    details,
    'Replacement',
    concept.deprecatedBy ? relatedLink(concept.deprecatedBy) : null
  );

  document.querySelectorAll('.glossary-card.selected').forEach(card => {
    card.classList.remove('selected');
    card.removeAttribute('aria-current');
  });
  const card = document.querySelector(`[data-concept-id="${CSS.escape(concept.id)}"]`);
  card?.classList.add('selected');
  card?.setAttribute('aria-current', 'true');
  card?.scrollIntoView({ block: 'nearest', behavior: scrollBehavior() });
  if (!dialog.open) dialog.showModal();
  if (lastTrackedConceptId !== concept.id) {
    trackGlossaryEvent('glossary.view', { conceptId: concept.id });
    lastTrackedConceptId = concept.id;
  }
}

function syncConceptFromUrl() {
  if (!glossary) return;
  const conceptId = readConceptHash();
  const concept = conceptId ? glossary.concepts.find(item => item.id === conceptId) : undefined;
  if (concept) {
    openConcept(concept);
    return;
  }

  document.querySelectorAll('.glossary-card.selected').forEach(card => {
    card.classList.remove('selected');
    card.removeAttribute('aria-current');
  });
  const dialog = document.getElementById('glossary-detail');
  if (dialog.open) dialog.close();
  lastTrackedConceptId = null;
}

function matches(concept, filters) {
  if (filters.category && concept.category !== filters.category) return false;
  if (filters.kind && concept.kind !== filters.kind) return false;
  if (filters.semanticType && concept.semanticType !== filters.semanticType) return false;
  if (filters.status && concept.status !== filters.status) return false;
  if (!filters.query) return true;
  const haystack = [
    concept.id,
    concept.label,
    concept.description,
    concept.category,
    concept.kind,
    concept.semanticType,
    concept.uiRole,
    concept.mapsTo,
    concept.unit,
    concept.format,
    concept.source,
    concept.parentId,
    concept.scope,
    concept.region,
    ...(concept.countryCodes ?? []),
    ...(concept.synonyms ?? []),
    ...(concept.seeAlso ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(filters.query);
}

function conceptCard(concept) {
  const card = document.createElement('article');
  card.className = 'glossary-card';
  card.dataset.conceptId = concept.id;
  card.style.setProperty('--concept-color', concept.color);

  const heading = document.createElement('div');
  heading.className = 'glossary-card-heading';
  const titleLink = document.createElement('a');
  titleLink.className = 'glossary-card-link';
  titleLink.href = conceptHash(concept.id);
  titleLink.setAttribute('aria-label', `Open ${concept.label} definition`);
  const title = text('h3', concept.label);
  if (concept.flagEmoji) {
    const flag = text('span', concept.flagEmoji, 'glossary-card-flag');
    flag.setAttribute('role', 'img');
    flag.setAttribute('aria-label', concept.flagAriaLabel ?? `${concept.label} geography`);
    title.prepend(flag);
  }
  titleLink.append(title);
  const taxonomy = document.createElement('div');
  taxonomy.className = 'glossary-card-taxonomy';
  taxonomy.append(chip(concept.kind, concept.color, 'kind'));
  if (concept.semanticType) {
    taxonomy.append(chip(concept.semanticType, concept.color, 'type'));
  }
  heading.append(titleLink, taxonomy);

  const metadata = document.createElement('div');
  metadata.className = 'glossary-card-meta';
  metadata.append(
    chip(
      glossary.categories.find(category => category.id === concept.category)?.label ??
        concept.category,
      concept.color,
      'category'
    ),
    concept.unit ? chip(concept.unit, concept.color, 'unit') : document.createTextNode(''),
    concept.format ? chip(concept.format, concept.color, 'format') : document.createTextNode('')
  );
  if (concept.scope) metadata.append(chip(concept.scope.replace('_', ' '), concept.color, 'type'));

  const footer = document.createElement('footer');
  footer.className = 'glossary-card-footer';
  const deepLink = document.createElement('a');
  deepLink.className = 'glossary-card-deep-link';
  deepLink.href = conceptHash(concept.id);
  deepLink.setAttribute('aria-label', `Deep link to ${concept.label}`);
  deepLink.append(text('span', 'Open definition'), text('span', '↗', 'glossary-link-arrow'));
  const lineage = concept.seeAlso?.length
    ? `${concept.seeAlso.length} related`
    : concept.mapsTo
      ? '1 mapping'
      : 'Standalone';
  footer.append(text('code', concept.id), text('span', lineage, 'glossary-card-lineage'), deepLink);

  card.append(
    heading,
    text('p', concept.description, 'glossary-card-description'),
    metadata,
    footer
  );
  if (concept.status !== 'active') {
    card.append(chip(concept.status, concept.color, 'status'));
  }

  card.addEventListener('click', event => {
    if (event.target.closest('a, button')) {
      if (readConceptHash() === concept.id) queueMicrotask(syncConceptFromUrl);
      return;
    }
    setConceptHash(concept.id);
  });
  return card;
}

function currentFilters() {
  return {
    query: document.getElementById('glossary-search').value.trim(),
    category: document.getElementById('glossary-category').value,
    kind: document.getElementById('glossary-kind').value,
    semanticType: document.getElementById('glossary-semantic-type').value,
    status: document.getElementById('glossary-status').value,
  };
}

function syncFiltersToUrl(filters) {
  const url = new URL(window.location.href);
  for (const [key, parameter] of Object.entries(FILTER_PARAM_KEYS)) {
    const value = filters[key];
    if (value) url.searchParams.set(parameter, value);
    else url.searchParams.delete(parameter);
  }
  history.replaceState(history.state, '', url);
}

function restoreFiltersFromUrl() {
  const url = new URL(window.location.href);
  document.getElementById('glossary-search').value =
    url.searchParams.get(FILTER_PARAM_KEYS.query) ?? '';
  for (const key of ['category', 'kind', 'semanticType', 'status']) {
    const selectId = key === 'semanticType' ? 'glossary-semantic-type' : `glossary-${key}`;
    const select = document.getElementById(selectId);
    const value = url.searchParams.get(FILTER_PARAM_KEYS[key]) ?? '';
    select.value = [...select.options].some(option => option.value === value) ? value : '';
  }
}

function updateFilterState(filters) {
  document.querySelectorAll('[data-category-chip]').forEach(button => {
    const active = button.dataset.categoryChip === filters.category;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  document.querySelectorAll('.glossary-stat').forEach(card => {
    const active =
      (card.dataset.filterKind && card.dataset.filterKind === filters.kind) ||
      (card.dataset.filterStatus && card.dataset.filterStatus === filters.status) ||
      (card.dataset.filterReset === 'true' &&
        !filters.query &&
        !filters.category &&
        !filters.kind &&
        !filters.semanticType &&
        !filters.status);
    card.classList.toggle('active', Boolean(active));
    card.setAttribute('aria-pressed', String(Boolean(active)));
  });
  const hasFilters = Boolean(
    filters.query || filters.category || filters.kind || filters.semanticType || filters.status
  );
  document.getElementById('clear-glossary-filters').disabled = !hasFilters;
}

function renderConcepts({ syncUrl = true } = {}) {
  const filters = currentFilters();
  const matchFilters = { ...filters, query: filters.query.toLowerCase() };
  const concepts = glossary.concepts.filter(concept => matches(concept, matchFilters));
  const target = document.getElementById('glossary-grid');
  target.replaceChildren(...concepts.map(conceptCard));
  if (!concepts.length) {
    target.append(text('p', 'No domain concepts match these filters.', 'glossary-empty'));
  }
  document.getElementById('glossary-result-count').textContent =
    `${concepts.length} of ${glossary.concepts.length} concepts`;
  document.getElementById('glossary-result-chip').textContent = `${concepts.length} shown`;
  if (syncUrl) syncFiltersToUrl(filters);
  updateFilterState(filters);
  syncConceptFromUrl();
}

function resetFilters() {
  document.getElementById('glossary-search').value = '';
  document.getElementById('glossary-category').value = '';
  document.getElementById('glossary-kind').value = '';
  document.getElementById('glossary-semantic-type').value = '';
  document.getElementById('glossary-status').value = '';
  renderConcepts();
}

function addOptions(selectId, values, labelFor = value => value) {
  const select = document.getElementById(selectId);
  for (const value of values) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = labelFor(value);
    select.append(option);
  }
}

function renderCategoryChips(payload) {
  const target = document.getElementById('glossary-category-chips');
  const chips = payload.categories.map(category => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'glossary-filter-chip';
    button.dataset.categoryChip = category.id;
    button.style.setProperty('--chip-color', category.color);
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', `Filter by ${category.label}`);
    button.append(
      text('span', '', 'glossary-filter-chip-dot'),
      text('span', category.label, 'glossary-filter-chip-label'),
      text('span', payload.summary.categories[category.id] ?? 0, 'glossary-filter-chip-count')
    );
    button.addEventListener('click', () => {
      const select = document.getElementById('glossary-category');
      select.value = select.value === category.id ? '' : category.id;
      renderConcepts();
    });
    return button;
  });
  target.replaceChildren(...chips);
}

/**
 * Portal board section mounts from bake `surfaces[]` (hash · domId · conceptId · title).
 * Distinct from concept cards, which use `concept.label`.
 */
function renderPortalSections(payload) {
  const root = document.getElementById('glossary-surfaces');
  const chip = document.getElementById('glossary-surfaces-chip');
  if (!root) return;

  const surfaces = (payload.surfaces ?? []).filter(
    s => Array.isArray(s.sections) && s.sections.length > 0
  );
  const sectionCount = surfaces.reduce((n, s) => n + s.sections.length, 0);
  if (chip) {
    chip.textContent =
      surfaces.length === 0
        ? 'No board maps'
        : `${surfaces.length} boards · ${sectionCount} sections`;
  }

  if (!surfaces.length) {
    root.replaceChildren(
      text(
        'p',
        'No surfaces with sections[] in this bake — run bun run glossary:portal after page-glossary mounts.',
        'glossary-empty'
      )
    );
    return;
  }

  const cards = surfaces.map(surface => {
    const card = document.createElement('article');
    card.className = 'glossary-surface-card';

    const header = document.createElement('header');
    const h3 = document.createElement('h3');
    const boardLink = document.createElement('a');
    boardLink.href = surface.path;
    boardLink.textContent = surface.path;
    h3.append(boardLink);
    header.append(h3, text('span', `${surface.sections.length} sections`, 'glossary-surface-meta'));

    const list = document.createElement('ul');
    list.className = 'glossary-section-list';
    for (const section of surface.sections) {
      const li = document.createElement('li');
      const titleWrap = document.createElement('div');
      titleWrap.className = 'sec-title';
      const deep = document.createElement('a');
      deep.href = `${surface.path}#section:${encodeURIComponent(section.hash)}`;
      deep.textContent = section.title || section.hash;
      deep.title = `Open ${section.domId} on board`;
      titleWrap.append(deep);

      const conceptLink = document.createElement('a');
      conceptLink.href = conceptHash(section.conceptId);
      conceptLink.className = 'glossary-surface-meta';
      conceptLink.textContent = section.conceptId;
      conceptLink.title = 'Open concept definition';

      const ids = text(
        'div',
        `domId=${section.domId} · #section:${section.hash}`,
        'sec-ids'
      );

      li.append(titleWrap, conceptLink, ids);
      list.append(li);
    }

    card.append(header, list);
    return card;
  });

  root.replaceChildren(...cards);
}

function render(payload) {
  glossary = payload;
  const summary = payload.summary;
  const color = id => payload.categories.find(category => category.id === id)?.color ?? '#58a6ff';
  const categoriesCard = stat(
    payload.categories.length,
    'Categories',
    'Browse the semantic domains represented in the registry.',
    color('model')
  );
  categoriesCard.addEventListener('click', () => {
    document
      .getElementById('glossary-category-chips')
      .scrollIntoView({ block: 'center', behavior: scrollBehavior() });
  });
  const semanticCard = stat(
    summary.portalSemantics,
    'Portal semantics',
    'Typed field contracts shared by portal surfaces.',
    color('ui')
  );
  semanticCard.addEventListener('click', () => {
    document
      .getElementById('glossary-semantic-type')
      .scrollIntoView({ block: 'center', behavior: scrollBehavior() });
  });
  document
    .getElementById('glossary-summary')
    .replaceChildren(
      stat(
        summary.concepts,
        'Concepts',
        'Reset to the complete semantic catalog.',
        color('market'),
        { reset: true }
      ),
      categoriesCard,
      stat(
        summary.kinds.registry ?? 0,
        'Registry fields',
        'Desk and export contract fields.',
        color('warehouse'),
        { kind: 'registry' }
      ),
      stat(
        summary.kinds.ui ?? 0,
        'UI concepts',
        'Surface labels, states, and interactions.',
        color('ui'),
        { kind: 'ui' }
      ),
      stat(
        summary.kinds.composite ?? 0,
        'Composites',
        'Derived concepts composed from multiple fields.',
        color('pipeline'),
        { kind: 'composite' }
      ),
      semanticCard
    );
  document.getElementById('glossary-generated').textContent =
    `Generated ${payload.generatedAt} · ${payload.sources.semanticAuthority}`;

  addOptions(
    'glossary-category',
    payload.categories.map(category => category.id),
    value => payload.categories.find(category => category.id === value)?.label ?? value
  );
  addOptions('glossary-kind', Object.keys(summary.kinds));
  addOptions('glossary-semantic-type', Object.keys(summary.semanticTypes));
  addOptions('glossary-status', ['active', 'deprecated', 'draft']);
  renderCategoryChips(payload);
  renderPortalSections(payload);
  restoreFiltersFromUrl();
  renderConcepts({ syncUrl: false });
}

function renderError(error) {
  document
    .getElementById('glossary-grid')
    .replaceChildren(
      text(
        'p',
        `Domain glossary unavailable: ${error instanceof Error ? error.message : String(error)}`,
        'glossary-error'
      )
    );
}

for (const id of [
  'glossary-search',
  'glossary-category',
  'glossary-kind',
  'glossary-semantic-type',
  'glossary-status',
]) {
  document.getElementById(id).addEventListener('input', () => glossary && renderConcepts());
}

document.getElementById('clear-glossary-filters').addEventListener('click', resetFilters);
const dialog = document.getElementById('glossary-detail');
dialog.addEventListener('close', clearConceptHash);
window.addEventListener('hashchange', syncConceptFromUrl);
window.addEventListener('popstate', () => {
  if (!glossary) return;
  restoreFiltersFromUrl();
  renderConcepts({ syncUrl: false });
});

loadDomainGlossary()
  .then(async payload => {
    render(payload);
    await bootGlossaryUx({
      breadcrumbsMount: document.getElementById('glossary-crumbs'),
      searchInput: document.getElementById('glossary-search'),
      tooltipRoot: document.querySelector('.glossary-board'),
      trackPage: false,
      applySectionTitles: true,
      onAutocompleteSelect(concept) {
        document.getElementById('glossary-search').value = concept.label;
        renderConcepts();
        setConceptHash(concept.id);
      },
    });
  })
  .catch(renderError);
