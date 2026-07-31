/**
 * Domain glossary board.
 * @see tools/domain-glossary.ts
 * @see https://bun.com/blog/bun-v1.3.4#urlpattern-api
 */

const GLOSSARY_URL = '/registry/domain-glossary.json';
const glossaryPattern = new URLPattern({ hash: 'glossary\\::concept' });

let glossary;

const FILTER_PARAM_KEYS = {
  query: 'q',
  category: 'category',
  kind: 'kind',
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
  return `#glossary:${conceptId}`;
}

function readConceptHash() {
  return glossaryPattern.exec(window.location.href)?.hash.groups.concept ?? null;
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
  addDetailRow(details, 'Kind', concept.kind);
  addDetailRow(details, 'Status', concept.status);
  addDetailRow(details, 'Unit', concept.unit);
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
  card?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  if (!dialog.open) dialog.showModal();
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
}

function matches(concept, filters) {
  if (filters.category && concept.category !== filters.category) return false;
  if (filters.kind && concept.kind !== filters.kind) return false;
  if (filters.status && concept.status !== filters.status) return false;
  if (!filters.query) return true;
  const haystack = [
    concept.id,
    concept.label,
    concept.description,
    concept.category,
    concept.kind,
    concept.mapsTo,
    concept.unit,
    concept.source,
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
  titleLink.append(text('h3', concept.label));
  heading.append(titleLink, chip(concept.kind, concept.color, 'kind'));

  const metadata = document.createElement('div');
  metadata.className = 'glossary-card-meta';
  metadata.append(
    chip(
      glossary.categories.find(category => category.id === concept.category)?.label ??
        concept.category,
      concept.color,
      'category'
    ),
    concept.unit ? chip(concept.unit, concept.color, 'unit') : document.createTextNode('')
  );

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
  for (const key of ['category', 'kind', 'status']) {
    const select = document.getElementById(`glossary-${key}`);
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
        !filters.status);
    card.classList.toggle('active', Boolean(active));
    card.setAttribute('aria-pressed', String(Boolean(active)));
  });
  const hasFilters = Boolean(filters.query || filters.category || filters.kind || filters.status);
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
      .scrollIntoView({ block: 'center', behavior: 'smooth' });
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
      stat(
        summary.deprecated,
        'Deprecated',
        summary.deprecated
          ? 'Concepts with a preferred replacement.'
          : 'No concepts currently require migration.',
        '#f85149',
        { status: 'deprecated' },
        summary.deprecated === 0
      )
    );
  document.getElementById('glossary-generated').textContent =
    `Generated ${payload.generatedAt} · ${payload.sources.semanticAuthority}`;

  addOptions(
    'glossary-category',
    payload.categories.map(category => category.id),
    value => payload.categories.find(category => category.id === value)?.label ?? value
  );
  addOptions('glossary-kind', Object.keys(summary.kinds));
  addOptions('glossary-status', ['active', 'deprecated', 'draft']);
  renderCategoryChips(payload);
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

async function load() {
  const response = await fetch(GLOSSARY_URL, {
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.schemaVersion !== 1 || payload.kind !== 'domain-glossary') {
    throw new Error(`unsupported domain glossary schema: ${String(payload.schemaVersion)}`);
  }
  return payload;
}

for (const id of ['glossary-search', 'glossary-category', 'glossary-kind', 'glossary-status']) {
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

load().then(render).catch(renderError);
