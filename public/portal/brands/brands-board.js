/**
 * Branded-value glossary + project adoption board.
 * @see tools/brand-keymap.ts
 * @see lib/types/branded/README.md
 */

const KEYMAP_URL = '/registry/brand-keymap.json';

function text(tag, value, className) {
  const node = document.createElement(tag);
  node.textContent = String(value);
  if (className) node.className = className;
  return node;
}

function cell(...children) {
  const td = document.createElement('td');
  td.append(...children);
  return td;
}

function code(value) {
  return text('code', value);
}

function pill(value, className = value) {
  return text('span', value, `brand-pill ${className}`);
}

function domainPill(domain, color) {
  const node = pill(domain, 'domain');
  if (color) node.style.setProperty('--domain-color', color);
  return node;
}

function glossaryLinks(conceptIds) {
  const wrap = document.createElement('div');
  for (const id of conceptIds ?? []) {
    const link = document.createElement('a');
    link.className = 'brand-glossary-link';
    link.href = `/portal/glossary/#glossary:${encodeURIComponent(id)}`;
    link.textContent = id;
    link.title = `Open ${id} in domain glossary`;
    wrap.append(link);
  }
  return wrap;
}

function stat(value, label) {
  const card = document.createElement('div');
  card.className = 'brand-stat';
  card.append(text('strong', value), text('span', label));
  return card;
}

function renderSummary(payload) {
  const summary = payload.summary ?? {};
  const target = document.getElementById('brand-summary');
  target.replaceChildren(
    stat(summary.brands ?? 0, 'branded values'),
    stat(summary.domains ?? 0, 'domains'),
    stat(summary.covered ?? 0, 'covered values'),
    stat(summary.referencedUnconstructed ?? 0, 'type-only attention'),
    stat(summary.trackedProjects ?? 0, 'tracked / governed projects'),
    stat(summary.adoptedProjects ?? 0, 'projects with brand forges')
  );
}

function renderTiers(payload) {
  const target = document.getElementById('brand-tiers');
  const tiers = payload.governance?.constructorTiers ?? [];
  target.replaceChildren(
    ...tiers.map(item => {
      const card = document.createElement('article');
      card.className = 'brand-tier';
      card.append(code(item.tier), text('p', item.use));
      return card;
    })
  );
}

function validationLabel(validation) {
  if (!validation) return 'unknown';
  const shape = validation.pattern ? `${validation.shape} ${validation.pattern}` : validation.shape;
  return `${shape} · ${validation.ingressNormalization}`;
}

function constructorCell(brand) {
  const wrap = document.createElement('div');
  wrap.append(
    code(brand.constructors?.as ?? '—'),
    document.createElement('br'),
    code(brand.constructors?.try ?? '—'),
    document.createElement('br'),
    code(brand.constructors?.parse ?? '—'),
    document.createElement('br'),
    code(brand.guard ?? '—')
  );
  return wrap;
}

function brandMatches(brand, query, domain, status) {
  if (domain && brand.domain !== domain) return false;
  if (status && brand.coverage?.status !== status) return false;
  if (!query) return true;
  const haystack = [
    brand.name,
    brand.domain,
    brand.kind,
    brand.description,
    brand.module,
    ...(brand.mint ?? []),
    ...(brand.glossaryConcepts ?? []),
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

function renderBrands(payload) {
  const query = document.getElementById('brand-search').value.trim().toLowerCase();
  const domain = document.getElementById('brand-domain').value;
  const status = document.getElementById('brand-status').value;
  const brands = (payload.brands ?? []).filter(brand => brandMatches(brand, query, domain, status));
  const target = document.getElementById('brand-rows');

  target.replaceChildren(
    ...brands.map(brand => {
      const row = document.createElement('tr');
      const name = document.createElement('div');
      name.append(
        text('span', brand.name, 'brand-name'),
        document.createElement('br'),
        domainPill(brand.domain, brand.color)
      );
      const purpose = text('div', brand.description, 'brand-description');
      purpose.append(document.createElement('br'), code(brand.module));
      if (brand.glossaryConcepts?.length) {
        purpose.append(document.createElement('br'), glossaryLinks(brand.glossaryConcepts));
      }
      const coverage = document.createElement('div');
      coverage.append(
        pill(brand.coverage?.status ?? 'unknown'),
        document.createElement('br'),
        text(
          'span',
          `refs ${brand.coverage?.references ?? 0} · constructors ${Object.values(
            brand.coverage?.constructors ?? {}
          ).reduce(
            (sum, value) => sum + Number(value),
            0
          )} · guards ${brand.coverage?.guards ?? 0}`,
          'brand-meta'
        )
      );
      row.append(
        cell(name),
        cell(purpose),
        cell(constructorCell(brand)),
        cell(text('span', validationLabel(brand.validation), 'brand-meta')),
        cell(coverage)
      );
      return row;
    })
  );
  if (!brands.length) {
    const row = document.createElement('tr');
    const empty = cell(text('span', 'No branded values match these filters.', 'brand-meta'));
    empty.colSpan = 5;
    row.append(empty);
    target.append(row);
  }
  document.getElementById('brand-result-count').textContent =
    `${brands.length} of ${payload.brands?.length ?? 0} values`;
}

function renderProjects(payload) {
  const target = document.getElementById('project-rows');
  const projects = [...(payload.projects ?? [])].sort((a, b) => {
    if (a.status !== b.status) return a.status.localeCompare(b.status);
    return a.project.localeCompare(b.project);
  });
  target.replaceChildren(
    ...projects.map(project => {
      const row = document.createElement('tr');
      const canonical =
        project.brands?.length > 0
          ? `${project.brands.join(', ')} · ${project.constructorCalls} constructors · ${project.guardCalls} guards`
          : '—';
      row.append(
        cell(code(project.project)),
        cell(pill(project.status)),
        cell(text('span', project.sourceFiles)),
        cell(text('span', canonical, 'brand-meta')),
        cell(text('span', project.localBrandTypes?.join(', ') || '—', 'brand-meta'))
      );
      return row;
    })
  );
}

function renderError(error) {
  const target = document.getElementById('brand-rows');
  const row = document.createElement('tr');
  const message = cell(
    text(
      'div',
      `Brand keymap unavailable: ${error instanceof Error ? error.message : String(error)}`,
      'brand-error'
    )
  );
  message.colSpan = 5;
  row.append(message);
  target.replaceChildren(row);
  document.getElementById('brand-generated').textContent = 'Unable to load brand-keymap.json';
}

async function load() {
  const response = await fetch(KEYMAP_URL, {
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.schemaVersion !== 1 || payload.kind !== 'brand-keymap') {
    throw new Error(`unsupported keymap schema: ${String(payload.schemaVersion)}`);
  }
  return payload;
}

load()
  .then(payload => {
    document.getElementById('brand-generated').textContent =
      `Generated ${payload.generatedAt} · ${payload.sources?.catalog ?? 'brand catalog'}`;
    const domainSelect = document.getElementById('brand-domain');
    for (const domain of payload.domains ?? []) {
      const option = document.createElement('option');
      option.value = domain.name;
      option.textContent = `${domain.name} (${domain.brandCount})`;
      domainSelect.append(option);
    }
    renderSummary(payload);
    renderTiers(payload);
    renderBrands(payload);
    renderProjects(payload);
    for (const id of ['brand-search', 'brand-domain', 'brand-status']) {
      document.getElementById(id).addEventListener('input', () => renderBrands(payload));
    }
  })
  .catch(renderError);
