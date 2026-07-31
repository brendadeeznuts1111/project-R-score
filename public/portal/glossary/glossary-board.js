/**
 * Domain glossary board.
 * @see tools/domain-glossary.ts
 * @see https://bun.com/blog/bun-v1.3.4#urlpattern-api
 */

const GLOSSARY_URL = '/registry/domain-glossary.json';
const glossaryPattern = new URLPattern({ hash: 'glossary\\::concept' });

let glossary;

function text(tag, value, className) {
  const node = document.createElement(tag);
  node.textContent = String(value);
  if (className) node.className = className;
  return node;
}

function pill(value, color) {
  const node = text('span', value, 'glossary-pill');
  if (color) node.style.setProperty('--concept-color', color);
  return node;
}

function stat(value, label) {
  const card = document.createElement('div');
  card.className = 'glossary-stat';
  card.append(text('strong', value), text('span', label));
  return card;
}

function conceptHash(conceptId) {
  return `#glossary:${conceptId}`;
}

function readConceptHash() {
  return glossaryPattern.exec(window.location.href)?.hash.groups.concept ?? null;
}

function setConceptHash(conceptId) {
  const url = new URL(window.location.href);
  url.hash = conceptHash(conceptId);
  history.pushState(null, '', url);
  openConceptFromHash();
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
  link.addEventListener('click', event => {
    event.preventDefault();
    setConceptHash(conceptId);
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
  });
  const card = document.querySelector(`[data-concept-id="${CSS.escape(concept.id)}"]`);
  card?.classList.add('selected');
  card?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  if (!dialog.open) dialog.showModal();
}

function openConceptFromHash() {
  const conceptId = readConceptHash();
  if (!conceptId || !glossary) return;
  const concept = glossary.concepts.find(item => item.id === conceptId);
  if (concept) openConcept(concept);
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
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `Open ${concept.label} definition`);

  const heading = document.createElement('div');
  heading.className = 'glossary-card-heading';
  heading.append(text('h3', concept.label), pill(concept.kind, concept.color));
  const metadata = document.createElement('div');
  metadata.className = 'glossary-card-meta';
  metadata.append(
    pill(concept.category, concept.color),
    text('code', concept.id),
    concept.unit ? pill(concept.unit, concept.color) : document.createTextNode('')
  );
  card.append(heading, text('p', concept.description, 'glossary-card-description'), metadata);
  if (concept.status !== 'active') {
    card.append(pill(concept.status, concept.color));
  }

  const activate = () => setConceptHash(concept.id);
  card.addEventListener('click', activate);
  card.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activate();
    }
  });
  return card;
}

function renderConcepts() {
  const filters = {
    query: document.getElementById('glossary-search').value.trim().toLowerCase(),
    category: document.getElementById('glossary-category').value,
    kind: document.getElementById('glossary-kind').value,
    status: document.getElementById('glossary-status').value,
  };
  const concepts = glossary.concepts.filter(concept => matches(concept, filters));
  const target = document.getElementById('glossary-grid');
  target.replaceChildren(...concepts.map(conceptCard));
  if (!concepts.length) {
    target.append(text('p', 'No domain concepts match these filters.', 'glossary-empty'));
  }
  document.getElementById('glossary-result-count').textContent =
    `${concepts.length} of ${glossary.concepts.length} concepts`;
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

function render(payload) {
  glossary = payload;
  const summary = payload.summary;
  document
    .getElementById('glossary-summary')
    .replaceChildren(
      stat(summary.concepts, 'concepts'),
      stat(payload.categories.length, 'categories'),
      stat(summary.kinds.registry ?? 0, 'registry fields'),
      stat(summary.kinds.ui ?? 0, 'UI concepts'),
      stat(summary.kinds.composite ?? 0, 'composites'),
      stat(summary.deprecated, 'deprecated')
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
  renderConcepts();
  openConceptFromHash();
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

const dialog = document.getElementById('glossary-detail');
dialog.addEventListener('close', clearConceptHash);
window.addEventListener('hashchange', openConceptFromHash);
window.addEventListener('popstate', openConceptFromHash);

load().then(render).catch(renderError);
