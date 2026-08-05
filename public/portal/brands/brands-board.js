/**
 * Bun capability × FactoryWager brand board.
 * @see tools/bun-brand-map.ts
 * @see tools/brand-keymap.ts
 * @see lib/types/branded/README.md
 */

const BRAND_KEYMAP_URL = '/registry/brand-keymap.json';
const BUN_BRAND_MAP_URL = '/registry/bun-brand-map.json';
const SVG_NS = 'http://www.w3.org/2000/svg';
const VIEWS = ['relationships', 'glossary', 'projects'];

let brandKeymap = null;
let bunBrandMap = null;
let selectedRelationship = null;
let requestedSelectionId = null;

function text(tag, value, className) {
  const node = document.createElement(tag);
  node.textContent = String(value ?? '—');
  if (className) node.className = className;
  return node;
}

function cell(...children) {
  const node = document.createElement('td');
  node.append(...children);
  return node;
}

function code(value) {
  return text('code', value);
}

function pill(value) {
  const normalized = String(value || 'none');
  return text('span', normalized, `brand-pill ${normalized}`);
}

function domainPill(domain, color) {
  const node = pill(domain);
  node.classList.add('domain');
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

/**
 * @param {string|number} value
 * @param {string} label
 * @param {boolean|{ attention?: boolean, attentionStrong?: boolean, onActivate?: () => void }} [attentionOrOptions]
 */
function stat(value, label, attentionOrOptions = false) {
  const options =
    typeof attentionOrOptions === 'object' && attentionOrOptions
      ? attentionOrOptions
      : { attention: Boolean(attentionOrOptions) };
  const attention = Boolean(options.attention || options.attentionStrong);
  const onActivate = typeof options.onActivate === 'function' ? options.onActivate : null;
  const card = document.createElement(onActivate ? 'button' : 'div');
  card.className = [
    'brand-stat',
    attention ? 'attention' : '',
    options.attentionStrong ? 'attention-strong' : '',
    onActivate ? 'clickable' : '',
  ]
    .filter(Boolean)
    .join(' ');
  if (onActivate) {
    card.type = 'button';
    card.addEventListener('click', onActivate);
  }
  card.append(text('strong', value), text('span', label));
  return card;
}

/** Brands that appear on bun-brand-map relationships with a non-null brand. */
export function bunGraphBrandNames(relationships = []) {
  return new Set(
    relationships.map(row => row.brand).filter(brand => typeof brand === 'string' && brand)
  );
}

function focusEvidence(evidence) {
  const select = document.getElementById('relationship-evidence');
  if (select) select.value = evidence;
  selectedRelationship = null;
  requestedSelectionId = null;
  setView('relationships');
  writeHash({ evidence, selected: '' });
  renderRelationships();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function basename(path) {
  return (
    String(path || '—')
      .split('/')
      .pop() || '—'
  );
}

function compact(value, max = 29) {
  const string = String(value ?? '—');
  return string.length <= max ? string : `${string.slice(0, max - 1)}…`;
}

export function buildBrandDomainMap(brands = []) {
  return new Map(brands.map(brand => [brand.name, brand.domain]));
}

export function parseBrandHash(hash = '') {
  const params = new URLSearchParams(String(hash).replace(/^#/, ''));
  return {
    view: params.get('view') || 'relationships',
    query: params.get('q') || '',
    domain: params.get('domain') || '',
    project: params.get('project') || '',
    policy: params.get('policy') || '',
    evidence: params.get('evidence') || '',
    selected: params.get('selected') || '',
  };
}

export function patchBrandHash(hash, patch) {
  const params = new URLSearchParams(String(hash || '').replace(/^#/, ''));
  for (const [key, value] of Object.entries(patch)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  return params.toString();
}

function writeHash(patch) {
  const fragment = patchBrandHash(window.location.hash, patch);
  history.replaceState(
    null,
    '',
    `${location.pathname}${location.search}${fragment ? `#${fragment}` : ''}`
  );
}

function setView(view, write = true) {
  const next = VIEWS.includes(view) ? view : 'relationships';
  for (const name of VIEWS) {
    const tab = document.getElementById(`tab-${name}`);
    const panel = document.getElementById(`view-${name}`);
    const active = name === next;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    panel.hidden = !active;
  }
  if (write) writeHash({ view: next === 'relationships' ? '' : next });
}

function initializeTabs() {
  const tabs = [...document.querySelectorAll('[role="tab"][data-view]')];
  for (const tab of tabs) {
    tab.addEventListener('click', () => setView(tab.dataset.view));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const index = tabs.indexOf(tab);
      const next =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? tabs.length - 1
            : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      tabs[next].focus();
      setView(tabs[next].dataset.view);
    });
  }
}

function option(select, value, label = value) {
  const node = document.createElement('option');
  node.value = value;
  node.textContent = label;
  select.append(node);
}

function populateFilters() {
  const domains = brandKeymap?.domains?.map(domain => domain.name) ?? [];
  const projects = unique([
    ...(bunBrandMap?.projects ?? []).map(project => project.path),
    ...(bunBrandMap?.relationships ?? []).map(row => row.project),
  ]);
  for (const domain of domains) {
    option(document.getElementById('relationship-domain'), domain);
    option(document.getElementById('brand-domain'), domain);
  }
  for (const project of projects) option(document.getElementById('relationship-project'), project);
}

function topUndeclaredApis(limit = 3) {
  const counts = new Map();
  for (const finding of bunBrandMap?.findings ?? []) {
    if (finding.kind !== 'observed-undeclared' || !finding.api) continue;
    counts.set(finding.api, (counts.get(finding.api) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([api, count]) => `${api} (${count})`);
}

function renderSummary() {
  const graph = bunBrandMap?.summary ?? {};
  const mapped = graph.mappedBrands ?? 0;
  const totalBrands = graph.totalCanonicalBrands ?? graph.brands ?? 0;
  const matched = graph.matched ?? 0;
  const observed = graph.observed ?? 0;
  const baselineUndeclared = graph.baselineUndeclared ?? graph.legacyUndeclared ?? graph.undeclared ?? 0;
  const newUndeclared = graph.newUndeclared ?? 0;
  const undeclaredTotal = Number(baselineUndeclared) + Number(newUndeclared);
  const target = document.getElementById('brand-summary');
  target.replaceChildren(
    stat(graph.apis ?? bunBrandMap?.capabilities?.length ?? 0, 'Bun APIs'),
    stat(graph.relationships ?? bunBrandMap?.relationships?.length ?? 0, 'relationships'),
    stat(`${mapped}/${totalBrands || '—'}`, 'brands mapped'),
    stat(`${matched}/${observed || '—'}`, 'matched / observed'),
    stat(graph.verified ?? 0, 'verified', {
      onActivate: () => focusEvidence('verified'),
    }),
    stat(`${baselineUndeclared}/${newUndeclared}`, 'legacy / new undeclared', {
      attention: undeclaredTotal > 0,
      attentionStrong: Number(newUndeclared) > 0,
      onActivate: () => focusEvidence('observed-undeclared'),
    })
  );
}

function capabilityFor(row) {
  return (bunBrandMap?.capabilities ?? []).find(item => item.id === row.capabilityId);
}

export function relationshipLabel(row) {
  return row.variant ? `${row.api} · ${row.variant}` : row.api;
}

export function relationshipMatches(row, filters, brandDomains) {
  const brandDomain = brandDomains.get(row.brand);
  if (filters.domain && brandDomain !== filters.domain) return false;
  if (filters.project && row.project !== filters.project) return false;
  if (filters.policy && row.policy !== filters.policy) return false;
  if (filters.evidence && row.evidenceState !== filters.evidence) return false;
  if (!filters.query) return true;
  return [
    row.api,
    row.variant,
    row.brand,
    row.direction,
    row.wrapper,
    row.consumer,
    row.project,
    row.policy,
    row.evidenceState,
    ...(row.proofs ?? []),
  ]
    .join(' ')
    .toLowerCase()
    .includes(filters.query);
}

export function filterRelationshipRows(rows, filters, brandDomains) {
  return rows.filter(row => relationshipMatches(row, filters, brandDomains));
}

export function chooseRelationship(rows, selectedId) {
  const selected = rows.find(row => row.id === selectedId);
  return {
    row: selected ?? rows[0] ?? null,
    usedFallback: Boolean(selectedId) && !selected && rows.length > 0,
  };
}

function selectRelationship(row, options = {}) {
  selectedRelationship = row;
  requestedSelectionId = row?.id ?? null;
  if (options.writeHash !== false) writeHash({ selected: row?.id ?? '' });
  renderGraph(row);
  renderDetail(row);
  for (const tableRow of document.querySelectorAll('#relationship-rows tr[data-relationship]')) {
    tableRow.setAttribute(
      'aria-selected',
      String(tableRow.dataset.relationship === String(row?.id))
    );
  }
}

function renderRelationships() {
  const filters = {
    query: document.getElementById('relationship-search').value.trim().toLowerCase(),
    domain: document.getElementById('relationship-domain').value,
    project: document.getElementById('relationship-project').value,
    policy: document.getElementById('relationship-policy').value,
    evidence: document.getElementById('relationship-evidence').value,
  };
  const brandDomains = buildBrandDomainMap(brandKeymap?.brands ?? []);
  const rows = filterRelationshipRows(bunBrandMap?.relationships ?? [], filters, brandDomains);
  const target = document.getElementById('relationship-rows');
  target.replaceChildren(
    ...rows.map(row => {
      const tr = document.createElement('tr');
      tr.dataset.relationship = row.id;
      tr.setAttribute('aria-selected', String(row.id === selectedRelationship?.id));
      const apiButton = text('button', relationshipLabel(row), 'brand-select-button');
      apiButton.type = 'button';
      apiButton.addEventListener('click', () => selectRelationship(row));
      const wrapper = document.createElement('div');
      wrapper.append(code(row.wrapper), document.createElement('br'));
      wrapper.append(text('span', row.consumer || 'direct consumer', 'brand-meta'));
      const brand = document.createElement('div');
      brand.append(code(row.brand || 'none'), document.createElement('br'), pill(row.direction));
      tr.append(
        cell(apiButton),
        cell(wrapper),
        cell(brand),
        cell(code(row.project)),
        cell(pill(row.policy)),
        cell(pill(row.evidenceState))
      );
      return tr;
    })
  );

  if (!rows.length) {
    const tr = document.createElement('tr');
    const td = cell(text('span', 'No capability relationships match these filters.', 'brand-meta'));
    td.colSpan = 6;
    tr.append(td);
    target.append(tr);
    selectRelationship(null);
  } else {
    const choice = chooseRelationship(rows, selectedRelationship?.id ?? requestedSelectionId);
    selectRelationship(choice.row, { writeHash: choice.usedFallback });
  }
  document.getElementById('relationship-result-count').textContent =
    `${rows.length} of ${bunBrandMap?.relationships?.length ?? 0} relationships`;
}

function svgText(x, y, value, className) {
  const node = document.createElementNS(SVG_NS, 'text');
  node.setAttribute('x', x);
  node.setAttribute('y', y);
  node.setAttribute('class', className);
  node.textContent = value;
  return node;
}

function graphNode({ x, label, value, detail }, index, nodes) {
  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('class', 'brand-graph-node');
  group.setAttribute('role', 'button');
  group.setAttribute('tabindex', index === 0 ? '0' : '-1');
  group.setAttribute('aria-label', `${label}: ${value}. ${detail}`);
  group.setAttribute('transform', `translate(${x} 55)`);
  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('width', '220');
  rect.setAttribute('height', '108');
  rect.setAttribute('rx', '9');
  group.append(
    rect,
    svgText('16', '24', label, 'node-label'),
    svgText('16', '52', compact(value, 27), 'node-value'),
    svgText('16', '77', compact(detail, 31), 'node-detail')
  );
  const activate = () => {
    for (const node of nodes()) node.classList.remove('is-selected');
    group.classList.add('is-selected');
  };
  group.addEventListener('focus', activate);
  group.addEventListener('click', activate);
  group.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Enter' || event.key === ' ') {
      activate();
      return;
    }
    const all = nodes();
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? all.length - 1
          : (index + (event.key === 'ArrowRight' ? 1 : -1) + all.length) % all.length;
    for (const node of all) node.setAttribute('tabindex', '-1');
    all[next].setAttribute('tabindex', '0');
    all[next].focus();
  });
  return group;
}

function renderGraph(row) {
  const target = document.getElementById('relationship-graph');
  target.classList.remove('brand-skeleton');
  target.setAttribute('aria-busy', 'false');
  const badge = document.getElementById('graph-evidence');
  badge.className = `brand-pill ${row?.evidenceState ?? 'none'}`;
  badge.textContent = row?.evidenceState ?? 'no selection';
  if (!row) {
    target.replaceChildren(text('p', 'Select a relationship from the table.', 'brand-meta'));
    return;
  }

  const capability = capabilityFor(row);
  const proof = row.proofs?.[0] ?? capability?.proofs?.[0]?.key ?? 'no exact proof';
  const stages = [
    {
      x: 28,
      label: 'Bun API',
      value: row.api,
      detail: capability?.versionIntroduced
        ? `introduced ${capability.versionIntroduced}`
        : row.variant || 'runtime',
    },
    {
      x: 278,
      label: 'Wrapper / consumer',
      value: basename(row.wrapper),
      detail: row.consumer || row.wrapper,
    },
    {
      x: 528,
      label: 'Branded value',
      value: row.brand || 'none',
      detail: row.direction || 'native runtime value',
    },
    {
      x: 778,
      label: 'Project / proof',
      value: basename(row.project),
      detail: proof,
    },
  ];
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 1026 218');
  svg.setAttribute('role', 'group');
  svg.setAttribute('aria-labelledby', 'graph-svg-title graph-svg-description');
  const title = document.createElementNS(SVG_NS, 'title');
  title.id = 'graph-svg-title';
  title.textContent = `${row.api} relationship`;
  const description = document.createElementNS(SVG_NS, 'desc');
  description.id = 'graph-svg-description';
  description.textContent =
    `${row.api} flows through ${row.wrapper}, relates to ${row.brand || 'no branded value'}, ` +
    `and is evidenced for ${row.project} by ${(row.proofs ?? []).join(', ') || 'no exact proof'}.`;
  svg.append(title, description);
  for (let index = 0; index < stages.length - 1; index += 1) {
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', String(stages[index].x + 220));
    line.setAttribute('y1', '109');
    line.setAttribute('x2', String(stages[index + 1].x));
    line.setAttribute('y2', '109');
    line.setAttribute('class', 'brand-graph-edge');
    svg.append(line);
  }
  const nodeList = [];
  const getNodes = () => nodeList;
  stages.forEach((stage, index) => {
    const node = graphNode(stage, index, getNodes);
    nodeList.push(node);
    svg.append(node);
  });
  nodeList[0].classList.add('is-selected');
  target.replaceChildren(svg);
}

function detailRow(list, label, value) {
  list.append(text('dt', label), text('dd', value));
}

function renderDetail(row) {
  const target = document.getElementById('relationship-detail');
  if (!row) {
    target.replaceChildren(text('p', 'No relationship selected.', 'brand-meta'));
    return;
  }
  const capability = capabilityFor(row);
  const list = document.createElement('dl');
  detailRow(list, 'API', row.variant ? `${row.api} · ${row.variant}` : row.api);
  detailRow(
    list,
    'Release',
    capability?.versionIntroduced
      ? `${capability.versionIntroduced} · ${capability.stability}`
      : capability?.stability || 'not catalogued'
  );
  detailRow(list, 'Wrapper', row.wrapper);
  detailRow(list, 'Consumer', row.consumer || 'direct');
  detailRow(list, 'Brand', `${row.brand || 'none'} · ${row.direction}`);
  detailRow(list, 'Project', row.project);
  detailRow(list, 'Policy', row.policy);
  detailRow(list, 'Evidence', row.evidenceState);
  if (row.evidenceState !== 'verified') {
    detailRow(
      list,
      'Action',
      row.evidenceState === 'observed-undeclared'
        ? 'Declare this owner path or remove the legacy baseline finding.'
        : 'Run bun run bun:brand-map, then repair or refresh the exact proof source.'
    );
  }
  const proofList = document.createElement('ul');
  for (const proof of row.proofs ?? []) {
    const item = document.createElement('li');
    item.append(code(proof));
    proofList.append(item);
  }
  list.append(text('dt', 'Proofs'), cellLike(proofList));
  if (capability?.docsUrl) {
    const link = document.createElement('a');
    link.href = capability.docsUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Canonical Bun documentation';
    list.append(text('dt', 'Docs'), cellLike(link));
  }
  target.replaceChildren(list);
}

function cellLike(child) {
  const node = document.createElement('dd');
  node.append(child);
  return node;
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

function renderTiers() {
  const target = document.getElementById('brand-tiers');
  const tiers = brandKeymap?.governance?.constructorTiers ?? [];
  target.replaceChildren(
    ...tiers.map(item => {
      const card = document.createElement('article');
      card.className = 'brand-tier';
      card.append(code(item.tier), text('p', item.use));
      return card;
    })
  );
}

function brandMatches(brand) {
  const query = document.getElementById('brand-search').value.trim().toLowerCase();
  const domain = document.getElementById('brand-domain').value;
  const status = document.getElementById('brand-status').value;
  if (domain && brand.domain !== domain) return false;
  if (status === 'unmapped') {
    const mapped = bunGraphBrandNames(bunBrandMap?.relationships ?? []);
    if (mapped.has(brand.name)) return false;
  } else if (status && brand.coverage?.status !== status) {
    return false;
  }
  if (!query) return true;
  return [
    brand.name,
    brand.domain,
    brand.kind,
    brand.description,
    brand.module,
    ...(brand.mint ?? []),
    ...(brand.glossaryConcepts ?? []),
  ]
    .join(' ')
    .toLowerCase()
    .includes(query);
}

function renderBrands() {
  const brands = (brandKeymap?.brands ?? []).filter(brandMatches);
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
          ).reduce((sum, value) => sum + Number(value), 0)} · guards ${
            brand.coverage?.guards ?? 0
          }`,
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
    `${brands.length} of ${brandKeymap?.brands?.length ?? 0} values`;
}

function renderProjects() {
  const target = document.getElementById('project-rows');
  const graphProjects = new Map(
    (bunBrandMap?.projects ?? []).map(project => [project.path, project])
  );
  const relationshipProjects = unique(
    (bunBrandMap?.relationships ?? []).map(relationship => relationship.project)
  );
  const projectPaths = unique([
    ...(brandKeymap?.projects ?? []).map(project => project.project),
    ...graphProjects.keys(),
    ...relationshipProjects,
  ]);
  const brandProjects = new Map(
    (brandKeymap?.projects ?? []).map(project => [project.project, project])
  );
  target.replaceChildren(
    ...projectPaths.map(path => {
      const brandProject = brandProjects.get(path);
      const projectRelationships = (bunBrandMap?.relationships ?? []).filter(
        relationship => relationship.project === path
      );
      const graphProject = graphProjects.get(path) ?? {
        capabilities: unique(projectRelationships.map(relationship => relationship.api)),
        relationships: projectRelationships.length,
        brands: unique(projectRelationships.map(relationship => relationship.brand)),
        verified: projectRelationships.filter(
          relationship => relationship.evidenceState === 'verified'
        ).length,
        attention: projectRelationships.filter(
          relationship => relationship.evidenceState !== 'verified'
        ).length,
      };
      const brandStatus =
        brandProject?.status ??
        (path === 'project-R-score' ? 'canonical-spine' : 'external-or-untracked');
      const row = document.createElement('tr');
      row.append(
        cell(code(path)),
        cell(pill(brandStatus)),
        cell(text('span', brandProject?.brands?.join(', ') || '—', 'brand-meta')),
        cell(
          text(
            'span',
            graphProject?.capabilities?.join(', ') ||
              `${graphProject?.relationships ?? 0} relationships`,
            'brand-meta'
          )
        ),
        cell(
          text(
            'span',
            `${graphProject?.verified ?? 0} verified · ${graphProject?.attention ?? 0} attention`,
            'brand-meta'
          )
        )
      );
      return row;
    })
  );
}

function restoreState() {
  const state = parseBrandHash(window.location.hash);
  setView(state.view, false);
  const fields = {
    query: 'relationship-search',
    domain: 'relationship-domain',
    project: 'relationship-project',
    policy: 'relationship-policy',
    evidence: 'relationship-evidence',
  };
  for (const [key, id] of Object.entries(fields)) {
    const value = state[key];
    if (value) document.getElementById(id).value = value;
  }
  requestedSelectionId = state.selected || null;
  if (requestedSelectionId) {
    selectedRelationship = (bunBrandMap?.relationships ?? []).find(
      row => row.id === requestedSelectionId
    );
  }
}

function initializeFilters() {
  const relationships = {
    'relationship-search': 'q',
    'relationship-domain': 'domain',
    'relationship-project': 'project',
    'relationship-policy': 'policy',
    'relationship-evidence': 'evidence',
  };
  for (const [id, key] of Object.entries(relationships)) {
    document.getElementById(id).addEventListener('input', event => {
      writeHash({ [key]: event.currentTarget.value, selected: '' });
      selectedRelationship = null;
      requestedSelectionId = null;
      renderRelationships();
    });
  }
  for (const id of ['brand-search', 'brand-domain', 'brand-status']) {
    document.getElementById(id).addEventListener('input', renderBrands);
  }
}

function renderWarning() {
  const alert = document.getElementById('brand-alert');
  if (alert.classList.contains('error')) return;
  const attention = bunBrandMap?.summary?.attention ?? 0;
  const conflicts = bunBrandMap?.summary?.catalogConflicts ?? 0;
  if (!attention && !conflicts) {
    alert.hidden = true;
    return;
  }
  alert.hidden = false;
  const message =
    `${attention} map item${attention === 1 ? '' : 's'} need attention` +
    (conflicts ? ` · ${conflicts} catalog conflict${conflicts === 1 ? '' : 's'}` : '');
  const raw = document.createElement('a');
  raw.href = BUN_BRAND_MAP_URL;
  raw.textContent = 'Inspect findings JSON';
  alert.replaceChildren(document.createTextNode(`${message} · `), raw);
}

function renderLoadFailure(message, isGraphFailure) {
  const alert = document.getElementById('brand-alert');
  alert.hidden = false;
  alert.className = 'brand-alert error';
  alert.textContent = alert.textContent ? `${alert.textContent} · ${message}` : message;
  if (isGraphFailure) {
    const target = document.getElementById('relationship-rows');
    const row = document.createElement('tr');
    const error = cell(text('div', message, 'brand-error'));
    error.colSpan = 6;
    row.append(error);
    target.replaceChildren(row);
    renderGraph(null);
  } else {
    const target = document.getElementById('brand-rows');
    const row = document.createElement('tr');
    const error = cell(text('div', message, 'brand-error'));
    error.colSpan = 5;
    row.append(error);
    target.replaceChildren(row);
  }
}

async function loadJson(url, kind) {
  const response = await fetch(url, {
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.schemaVersion !== 1 || payload.kind !== kind) {
    throw new Error(
      `${url}: unsupported ${String(payload.kind)} schema ${String(payload.schemaVersion)}`
    );
  }
  return payload;
}

async function bootstrap() {
  initializeTabs();
  initializeFilters();
  const [brandResult, graphResult] = await Promise.allSettled([
    loadJson(BRAND_KEYMAP_URL, 'brand-keymap'),
    loadJson(BUN_BRAND_MAP_URL, 'bun-brand-map'),
  ]);
  if (brandResult.status === 'fulfilled') brandKeymap = brandResult.value;
  else renderLoadFailure(`Brand glossary unavailable: ${brandResult.reason.message}`, false);
  if (graphResult.status === 'fulfilled') bunBrandMap = graphResult.value;
  else renderLoadFailure(`Bun relationship map unavailable: ${graphResult.reason.message}`, true);

  populateFilters();
  restoreState();
  if (brandKeymap) {
    renderTiers();
    renderBrands();
  }
  if (bunBrandMap) {
    renderSummary();
    renderRelationships();
    renderWarning();
  } else {
    renderSummary();
  }
  renderProjects();
  const generated = [bunBrandMap?.generatedAt, brandKeymap?.generatedAt]
    .filter(Boolean)
    .sort()
    .at(-1);
  const summary = bunBrandMap?.summary ?? {};
  const topApis = topUndeclaredApis(3);
  const undeclaredNote = topApis.length
    ? ` · top undeclared: ${topApis.join(', ')}`
    : '';
  document.getElementById('brand-generated').textContent = generated
    ? `Latest registry generation ${generated} · ${summary.matched ?? 0}/${summary.observed ?? 0} matched · ${summary.mappedBrands ?? 0}/${summary.totalCanonicalBrands ?? 0} brands mapped${undeclaredNote}`
    : 'Registry artifacts unavailable; use the raw JSON links to inspect recovery state.';
}

if (typeof document !== 'undefined') void bootstrap();
