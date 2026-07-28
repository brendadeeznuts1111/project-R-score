/**
 * Packages graph map board — load + render with explicit failure paths.
 * @see docs/portal-foundation.md
 * @see docs/harness/tenants/monorepo-health.md (claim packages-graph-map-v13)
 */

/** Supported bake schema for this board (pin — warn on mismatch, still try to render). */
export const PACKAGES_MAP_SCHEMA = 13;
/** Older bakes still render; surfaces block appears only on v13+. */
const PACKAGES_MAP_SCHEMA_MIN = 12;

/** Primary registry bake + optional local audit-report fallbacks (dev only paths may 404 on Pages). */
const PACKAGES_MAP_SOURCES = [
  '/registry/packages-graph-map.json',
  '/audit-report.json',
];

/** Related package-plane bakes (wire-portal orphan close for package-info). */
export const PACKAGES_RELATED_REGISTRY = [
  '/registry/packages-graph-map.json',
  '/registry/package-info.json',
  '/registry/monorepo-health.json',
];

/**
 * @param {unknown} err
 * @returns {string}
 */
export function formatLoadError(err) {
  if (err instanceof Error) return err.message || err.name;
  return String(err);
}

/**
 * Normalize audit report vs packages-graph-map bake into a board view-model.
 * @param {Record<string, unknown>} raw
 * @param {string} source
 */
export function normalizePackagesMap(raw, source) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Map payload is empty or not an object');
  }
  const kind = raw.kind;
  // Full audit report embeds map; bake is map-first with packages at top level.
  const map =
    kind === 'packages-metafile-audit' && raw.map && typeof raw.map === 'object'
      ? /** @type {Record<string, unknown>} */ (raw.map)
      : raw.map && typeof raw.map === 'object'
        ? /** @type {Record<string, unknown>} */ (raw.map)
        : /** @type {Record<string, unknown>} */ (raw);

  const packages = Array.isArray(raw.packages)
    ? raw.packages
    : Array.isArray(map.packages) && map.packages.every(p => typeof p === 'object')
      ? map.packages
      : [];

  // When packages is string[] on map only, synthesize rows from packageScores + coupling.
  let rows = packages;
  if (packages.length && typeof packages[0] === 'string') {
    const scores = new Map(
      (Array.isArray(map.packageScores) ? map.packageScores : []).map(s => [s.package, s])
    );
    const coupling = new Map(
      (Array.isArray(map.coupling) ? map.coupling : []).map(c => [c.package, c])
    );
    rows = packages.map(name => {
      const sc = scores.get(name);
      const c = coupling.get(name);
      return {
        name,
        score: sc?.score,
        grade: sc?.grade,
        role: c?.role,
        orphans: 0,
        bytes: 0,
      };
    });
  }

  const rawSchemaVersion = raw.schemaVersion ?? map.schemaVersion;
  const schemaVersion =
    typeof rawSchemaVersion === 'number' &&
    Number.isInteger(rawSchemaVersion) &&
    rawSchemaVersion > 0
      ? rawSchemaVersion
      : null;
  const schemaStatus =
    rawSchemaVersion == null
      ? 'missing'
      : schemaVersion == null
        ? 'invalid'
        : schemaVersion === PACKAGES_MAP_SCHEMA
          ? 'current'
          : schemaVersion === PACKAGES_MAP_SCHEMA_MIN
            ? 'legacy'
            : 'unsupported';
  const surfaces =
    raw.surfaces && typeof raw.surfaces === 'object'
      ? /** @type {Record<string, unknown>} */ (raw.surfaces)
      : null;
  return {
    source,
    schemaVersion,
    schemaStatus,
    schemaOk: schemaStatus === 'current' || schemaStatus === 'legacy',
    schemaDegraded:
      schemaStatus === 'missing' || schemaStatus === 'invalid' || schemaStatus === 'unsupported',
    generatedAt: raw.generatedAt ?? map.generatedAt ?? '',
    bunVersion: raw.bunVersion ?? map.bunVersion ?? '',
    score: raw.score ?? map.score,
    grade: raw.grade ?? map.grade,
    map,
    packages: rows,
    summary: map.summary && typeof map.summary === 'object' ? map.summary : {},
    actions: Array.isArray(map.actions) ? map.actions : [],
    archiveProbes: Array.isArray(map.archiveProbes) ? map.archiveProbes : [],
    quarantine: Array.isArray(map.quarantine) ? map.quarantine : [],
    vault: map.vault && typeof map.vault === 'object' ? map.vault : null,
    env: map.env && typeof map.env === 'object' ? map.env : null,
    surfaces,
  };
}

/**
 * Fetch first successful map source.
 * @param {string[]} [sources]
 * @param {{ signal?: AbortSignal }} [opts]
 */
async function loadPackagesMap(sources = PACKAGES_MAP_SOURCES, opts = {}) {
  /** @type {string[]} */
  const errors = [];
  for (const url of sources) {
    try {
      const res = await fetch(url, {
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
        signal: opts.signal ?? AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        errors.push(`${url}: HTTP ${res.status}`);
        continue;
      }
      let raw;
      try {
        raw = await res.json();
      } catch {
        errors.push(`${url}: invalid JSON`);
        continue;
      }
      return normalizePackagesMap(raw, url);
    } catch (err) {
      errors.push(`${url}: ${formatLoadError(err)}`);
    }
  }
  const detail = errors.length ? errors.join(' · ') : 'no sources configured';
  throw new Error(`Packages map unavailable — ${detail}`);
}

/**
 * @param {HTMLElement | null} el
 * @param {string} text
 */
function setText(el, text) {
  if (el) el.textContent = text;
}

/**
 * @param {ReturnType<typeof normalizePackagesMap>} data
 * @param {Document} doc
 */
/**
 * Grade band for package / board scores (matches monorepo-health).
 * @param {number | null | undefined} score
 * @returns {'healthy'|'needs-improvement'|'critical'|'unknown'}
 */
export function gradeFromScore(score) {
  if (score == null || !Number.isFinite(Number(score))) return 'unknown';
  const n = Number(score);
  if (n >= 90) return 'healthy';
  if (n >= 60) return 'needs-improvement';
  return 'critical';
}

/** Operator CLI hint for coupling actions. */
export function actionHint(action) {
  switch (action) {
    case 'wire-root-dep':
      return 'bun run audit:packages:apply';
    case 'migrate-relative-imports':
      return 'prefer @factorywager/<pkg> over packages/<pkg>/…';
    case 'archive-candidate':
      return 'review probes · quarantine blocks hard delete';
    default:
      return '';
  }
}

/**
 * Build a lightweight dependency graph model from packages-graph-map bake.
 * Zero CDN deps — pure layout for SVG rendering.
 *
 * @param {object} data - normalizePackagesMap result (packages, map, archiveProbes)
 * @returns {{ nodes: object[], edges: object[], stats: { packageNodes: number, externalNodes: number, edges: number } }}
 */
export function buildDependencyGraphModel(data) {
  const map = data?.map && typeof data.map === 'object' ? data.map : {};
  const pkgRows = Array.isArray(data?.packages) ? data.packages : [];
  const archiveSet = new Set(
    (Array.isArray(data?.archiveProbes) ? data.archiveProbes : [])
      .map(p => p?.package || p?.name)
      .filter(Boolean)
  );
  // Also mark archive-candidate actions
  for (const a of Array.isArray(map.actions) ? map.actions : []) {
    if (a?.action === 'archive-candidate' && a?.package) archiveSet.add(a.package);
  }

  /** @type {Map<string, object>} */
  const nodes = new Map();

  for (const p of pkgRows) {
    const name = typeof p === 'string' ? p : p?.name;
    if (!name || typeof name !== 'string') continue;
    nodes.set(name, {
      id: name,
      label: name,
      kind: 'package',
      role: String(p?.role || 'unknown'),
      score: typeof p?.score === 'number' ? p.score : null,
      archive: archiveSet.has(name),
    });
  }
  // string[] packages on map
  if (Array.isArray(map.packages) && map.packages.every(x => typeof x === 'string')) {
    for (const name of map.packages) {
      if (nodes.has(name)) continue;
      nodes.set(name, {
        id: name,
        label: name,
        kind: 'package',
        role: 'unknown',
        score: null,
        archive: archiveSet.has(name),
      });
    }
  }

  /** @type {object[]} */
  const edges = [];
  const packageEdges = Array.isArray(map.packageEdges) ? map.packageEdges : [];
  for (const e of packageEdges) {
    const from = e?.fromPackage || e?.from;
    const to = e?.toPackage || e?.to;
    if (!from || !to) continue;
    if (!nodes.has(from)) {
      nodes.set(from, {
        id: from,
        label: from,
        kind: 'package',
        role: 'unknown',
        score: null,
        archive: archiveSet.has(from),
      });
    }
    if (!nodes.has(to)) {
      nodes.set(to, {
        id: to,
        label: to,
        kind: 'package',
        role: 'unknown',
        score: null,
        archive: archiveSet.has(to),
      });
    }
    edges.push({
      from: String(from),
      to: String(to),
      weight: Number(e?.weight) || 1,
      kind: 'internal',
    });
  }

  const externalEdges = Array.isArray(map.externalEdges) ? map.externalEdges : [];
  for (const e of externalEdges) {
    const from = e?.fromPackage || e?.from;
    const target = e?.targetPrefix || e?.to || e?.target;
    if (!from || !target) continue;
    if (!nodes.has(from)) {
      nodes.set(from, {
        id: from,
        label: from,
        kind: 'package',
        role: 'unknown',
        score: null,
        archive: archiveSet.has(from),
      });
    }
    const extId = `ext:${target}`;
    if (!nodes.has(extId)) {
      nodes.set(extId, {
        id: extId,
        label: String(target),
        kind: 'external',
        role: String(e?.plane || 'external'),
        score: null,
        archive: false,
      });
    }
    edges.push({
      from: String(from),
      to: extId,
      weight: Number(e?.weight) || 1,
      kind: 'external',
    });
  }

  // Layout: packages on inner ring, externals on outer ring
  const pkgs = [...nodes.values()].filter(n => n.kind === 'package');
  const exts = [...nodes.values()].filter(n => n.kind === 'external');
  const cx = 320;
  const cy = 220;
  const rPkg = 120;
  const rExt = 200;

  const placed = pkgs.map((n, i) => {
    const angle = (2 * Math.PI * i) / Math.max(pkgs.length, 1) - Math.PI / 2;
    return { ...n, x: cx + rPkg * Math.cos(angle), y: cy + rPkg * Math.sin(angle) };
  });
  const placedExt = exts.map((n, i) => {
    const angle = (2 * Math.PI * i) / Math.max(exts.length, 1) - Math.PI / 2;
    return { ...n, x: cx + rExt * Math.cos(angle), y: cy + rExt * Math.sin(angle) };
  });
  const allNodes = [...placed, ...placedExt];

  return {
    nodes: allNodes,
    edges,
    stats: {
      packageNodes: pkgs.length,
      externalNodes: exts.length,
      edges: edges.length,
    },
  };
}

/**
 * Neighbors of a node (including self) for focus highlighting.
 * @param {object} model
 * @param {string} focusId
 * @returns {Set<string>}
 */
export function graphFocusSet(model, focusId) {
  const set = new Set([focusId]);
  if (!focusId) return set;
  for (const e of model.edges || []) {
    if (e.from === focusId) set.add(e.to);
    if (e.to === focusId) set.add(e.from);
  }
  return set;
}

/**
 * Edges involving a package (for detail panel).
 * @param {object} model
 * @param {string} pkgId
 */
export function edgesForPackage(model, pkgId) {
  return (model.edges || []).filter(e => e.from === pkgId || e.to === pkgId);
}

/** Enter and Space activate focused graph nodes and table rows. */
export function isKeyboardActivationKey(key) {
  return key === 'Enter' || key === ' ';
}

/**
 * Render SVG for dependency graph (no D3/Mermaid).
 * @param {object} model - from buildDependencyGraphModel
 * @param {{ focusId?: string|null, roleFilter?: string }} [opts]
 * @returns {string}
 */
export function renderDependencyGraphSvg(model, opts = {}) {
  const W = 640;
  const H = 440;
  const focusId = opts.focusId || null;
  const roleFilter = opts.roleFilter || '';
  const focus = focusId ? graphFocusSet(model, focusId) : null;
  const byId = new Map(model.nodes.map(n => [n.id, n]));
  const edgeEls = model.edges
    .map(e => {
      const a = byId.get(e.from);
      const b = byId.get(e.to);
      if (!a || !b) return '';
      // Role filter: dim edges that do not touch a matching package node
      const roleTouch =
        !roleFilter ||
        (a.kind === 'package' && a.role === roleFilter) ||
        (b.kind === 'package' && b.role === roleFilter) ||
        (a.kind === 'external' && b.kind === 'package' && b.role === roleFilter) ||
        (b.kind === 'external' && a.kind === 'package' && a.role === roleFilter);
      const sw = Math.min(4, 1 + Math.log2(e.weight + 1));
      const cls = e.kind === 'external' ? 'edge-ext' : 'edge-int';
      let dim = '';
      if (!roleTouch) dim = ' dim';
      else if (focus && !focus.has(e.from) && !focus.has(e.to)) dim = ' dim';
      else if (focus && (focus.has(e.from) || focus.has(e.to))) dim = ' hot';
      const midX = ((a.x + b.x) / 2).toFixed(1);
      const midY = ((a.y + b.y) / 2).toFixed(1);
      const wLabel =
        e.weight > 1 ? `<text class="edge-w${dim}" x="${midX}" y="${midY}">${e.weight}</text>` : '';
      return `<g class="pkg-edge${dim}" data-from="${escapeAttribute(e.from)}" data-to="${escapeAttribute(e.to)}"><title>${escapeHtml(e.from)} → ${escapeHtml(e.to)} · weight ${e.weight}</title><line class="${cls}${dim}" x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke-width="${sw.toFixed(2)}" />${wLabel}</g>`;
    })
    .join('');
  const nodeEls = model.nodes
    .map(n => {
      const r = n.kind === 'package' ? 22 : 16;
      const roleCls = `role-${classToken(n.role)}`;
      const arch = n.archive ? ' archive' : '';
      const score =
        n.score != null
          ? `<title>${escapeHtml(n.label)} · score ${n.score} · ${escapeHtml(n.role)}</title>`
          : `<title>${escapeHtml(n.label)} · ${escapeHtml(n.role)}</title>`;
      const fillClass =
        n.kind === 'external'
          ? 'node-ext'
          : n.archive
            ? 'node-archive'
            : n.role === 'dormant'
              ? 'node-dormant'
              : n.role === 'consumed'
                ? 'node-consumed'
                : n.role === 'root-tooling'
                  ? 'node-root'
                  : 'node-pkg';
      // Dim: role filter miss, or out of focus set (focus wins over role for package match)
      let dim = '';
      if (roleFilter && n.kind === 'package' && n.role !== roleFilter) dim = ' dim';
      if (focus && !focus.has(n.id)) dim = ' dim';
      if (focusId && n.id === focusId) dim = ' focus';
      const selected = focusId === n.id;
      const nodeLabel =
        n.kind === 'external'
          ? `External dependency ${n.label}`
          : `Package ${n.label}, role ${n.role}${n.score != null ? `, score ${n.score}` : ''}`;
      return `<g class="pkg-node ${roleCls}${arch}${dim}" data-id="${escapeAttribute(n.id)}" data-kind="${escapeAttribute(n.kind)}" data-role="${escapeAttribute(n.role)}" role="button" tabindex="0" focusable="true" aria-label="${escapeAttribute(nodeLabel)}" aria-pressed="${selected}">
        <circle class="${fillClass}" cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="${r}" />
        ${score}
        <text x="${n.x.toFixed(1)}" y="${(n.y + r + 12).toFixed(1)}" text-anchor="middle" class="node-label">${escapeHtml(n.label.length > 14 ? n.label.slice(0, 12) + '…' : n.label)}</text>
      </g>`;
    })
    .join('');
  return `<svg class="pkg-dep-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Package dependency graph">
    <defs>
      <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6 Z" fill="currentColor" opacity="0.45" />
      </marker>
    </defs>
    <g class="edges" marker-end="url(#arrow)">${edgeEls}</g>
    <g class="nodes">${nodeEls}</g>
  </svg>`;
}

/**
 * Fill the package detail panel for a selected node.
 * @param {object} data - board view-model
 * @param {object} model - graph model
 * @param {string|null} pkgId
 * @param {Document} [doc]
 */
function renderPackageDetail(data, model, pkgId, doc = document) {
  const el = doc.getElementById('pkg-detail');
  if (!el) return;
  if (!pkgId || pkgId.startsWith('ext:')) {
    if (pkgId && pkgId.startsWith('ext:')) {
      const label = pkgId.slice(4);
      const inbound = (model.edges || []).filter(e => e.to === pkgId);
      el.innerHTML = `<h4>External · <code>${escapeHtml(label)}</code></h4>
        <p class="meta">Imported by ${inbound.length} edge(s)</p>
        <ul>${inbound.map(e => `<li><code>${escapeHtml(e.from)}</code> · weight ${e.weight}</li>`).join('') || '<li>—</li>'}</ul>
        <p class="meta"><button type="button" class="copy-cli" data-cli="bun run portal-cli pm graph">copy pm graph</button></p>`;
      bindCopyButtons(el);
      return;
    }
    el.innerHTML =
      '<p class="meta">Select a package node (or table row) for edges, role, and CLI.</p>';
    return;
  }
  const row = (data.packages || []).find(p => (p.name || p.package) === pkgId);
  const node = (model.nodes || []).find(n => n.id === pkgId);
  const edges = edgesForPackage(model, pkgId);
  const actions = (data.actions || []).filter(a => a.package === pkgId);
  const probes = (data.archiveProbes || []).filter(p => p.package === pkgId);
  const score = row?.score ?? node?.score;
  const role = row?.role ?? node?.role ?? '—';
  const g = gradeFromScore(score);
  el.innerHTML = `<h4><code>${escapeHtml(pkgId)}</code></h4>
    <p class="meta">role=<span class="role role-${classToken(role)}">${escapeHtml(String(role))}</span>
      · score=<span class="grade-${g}">${score ?? '—'}</span>
      · orphans=${row?.orphans ?? 0}
      · ${node?.archive ? '<strong class="grade-critical">archive candidate</strong>' : 'active'}</p>
    <p class="meta">Edges (${edges.length})</p>
    <ul>${
      edges
        .map(e => {
          const other = e.from === pkgId ? e.to : e.from;
          const dir = e.from === pkgId ? '→' : '←';
          const label = other.startsWith('ext:') ? other.slice(4) : other;
          return `<li><code>${escapeHtml(pkgId)}</code> ${dir} <code>${escapeHtml(label)}</code> · w=${e.weight} · ${escapeHtml(e.kind)}</li>`;
        })
        .join('') ||
      '<li class="meta">No edges in bake (internal packageEdges empty — external only)</li>'
    }</ul>
    ${
      actions.length
        ? `<p class="meta">Actions</p><ul>${actions
            .map(
              a =>
                `<li><strong>${escapeHtml(a.action)}</strong> — ${escapeHtml(a.reason || '')}${
                  actionHint(a.action) ? ` · <code>${escapeHtml(actionHint(a.action))}</code>` : ''
                }</li>`
            )
            .join('')}</ul>`
        : ''
    }
    ${
      probes.length
        ? `<p class="meta">Archive probes</p><ul>${probes
            .map(
              p =>
                `<li>${escapeHtml(p.kind || '')} → <strong>${escapeHtml(p.recommendation || '')}</strong> — ${escapeHtml(p.note || '')}</li>`
            )
            .join('')}</ul>`
        : ''
    }
    <div class="pkg-detail-cli">
      <button type="button" class="copy-cli" data-cli="bun run portal-cli pm graph">copy pm graph</button>
      <button type="button" class="copy-cli" data-cli="bun run audit:packages -- --bake">copy rebake</button>
      <button type="button" class="copy-cli" data-cli="bun run portal-cli dashboard --view=packages">copy dashboard URL cmd</button>
    </div>`;
  bindCopyButtons(el);
}

function bindCopyButtons(root) {
  root.querySelectorAll('.copy-cli').forEach(btn => {
    if (btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const cmd = btn.getAttribute('data-cli') || '';
      try {
        await navigator.clipboard.writeText(cmd);
        const prev = btn.textContent;
        btn.textContent = 'copied';
        setTimeout(() => {
          btn.textContent = prev;
        }, 1000);
      } catch {
        btn.textContent = 'copy failed';
      }
    });
  });
}

/**
 * Load /registry/package-info.json summary into #package-info-meta (optional plane).
 * @param {Document} [doc]
 */
export async function loadPackageInfoRelated(doc = document) {
  const el = doc.getElementById('package-info-meta');
  if (!el) return;
  try {
    const res = await fetch('/registry/package-info.json', {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) {
      el.textContent = `package-info: HTTP ${res.status}`;
      return;
    }
    const j = await res.json();
    const summary = j.summary || {};
    const n = Array.isArray(j.results) ? j.results.length : summary.total ?? '—';
    const passed = summary.passed ?? '—';
    el.innerHTML = `Related: <a href="/registry/package-info.json"><code>package-info.json</code></a> · ${passed}/${n} ok · bun ${escapeHtml(String(j.bunVersion || '?'))}`;
  } catch (err) {
    el.textContent = `package-info: ${formatLoadError(err)}`;
  }
}

/**
 * Bipartite SVG: portal pages (left) → registry bakes (right).
 * @param {Array<{ page: string, registryPath: string, family: string, weight: number }>} edges
 * @param {{ maxEdges?: number }} [opts]
 */
export function renderPageRegistrySvg(edges, opts = {}) {
  const maxEdges = opts.maxEdges ?? 24;
  const top = [...edges].sort((a, b) => b.weight - a.weight).slice(0, maxEdges);
  if (!top.length) {
    return '<p class="pkg-empty">No page→registry edges — rebake surfaces v3</p>';
  }
  const pages = [...new Set(top.map(e => e.page))].sort();
  const regs = [...new Set(top.map(e => e.registryPath.replace('/registry/', '')))].sort();
  const W = 640;
  const H = Math.max(220, Math.max(pages.length, regs.length) * 22 + 40);
  const leftX = 90;
  const rightX = 520;
  const pageY = i => 28 + (i * (H - 48)) / Math.max(pages.length - 1, 1);
  const regY = i => 28 + (i * (H - 48)) / Math.max(regs.length - 1, 1);
  const pageIdx = Object.fromEntries(pages.map((p, i) => [p, i]));
  const regIdx = Object.fromEntries(regs.map((r, i) => [r, i]));

  const lines = top
    .map(e => {
      const reg = e.registryPath.replace('/registry/', '');
      const y1 = pageY(pageIdx[e.page] ?? 0);
      const y2 = regY(regIdx[reg] ?? 0);
      const op = Math.min(0.85, 0.25 + e.weight * 0.08);
      return `<line class="edge-page-reg" x1="${leftX + 36}" y1="${y1}" x2="${rightX - 36}" y2="${y2}" stroke-opacity="${op}" stroke-width="${Math.min(3, 1 + e.weight * 0.15)}" />`;
    })
    .join('');

  const pageNodes = pages
    .map((p, i) => {
      const y = pageY(i);
      return `<g class="page-node"><circle cx="${leftX}" cy="${y}" r="7" class="node-page" /><text class="node-label" x="${leftX - 12}" y="${y + 3}" text-anchor="end">${escapeHtml(p)}</text></g>`;
    })
    .join('');
  const regNodes = regs
    .map((r, i) => {
      const y = regY(i);
      const short = r.length > 22 ? r.slice(0, 20) + '…' : r;
      return `<g class="reg-node"><circle cx="${rightX}" cy="${y}" r="7" class="node-reg" /><text class="node-label" x="${rightX + 12}" y="${y + 3}" text-anchor="start">${escapeHtml(short)}</text></g>`;
    })
    .join('');

  return `<svg class="pkg-dep-svg page-reg-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Page to registry edges">${lines}${pageNodes}${regNodes}</svg>`;
}

/**
 * Render surfaces v3 cross-plane panels (page edges, lib hubs, orphan triage).
 * @param {Record<string, unknown> | null} surfaces
 * @param {Document} [doc]
 */
function renderCrossPlanePanel(surfaces, doc = document) {
  const edgeHost = doc.getElementById('page-reg-graph');
  const edgeMeta = doc.getElementById('page-reg-meta');
  const hubList = doc.getElementById('lib-hub-list');
  const orphanList = doc.getElementById('orphan-triage-list');

  const edges = Array.isArray(surfaces?.crossPlane?.pageToRegistry)
    ? surfaces.crossPlane.pageToRegistry
    : [];
  const hubs = Array.isArray(surfaces?.crossPlane?.libImportHubs)
    ? surfaces.crossPlane.libImportHubs
    : [];
  const triage = Array.isArray(surfaces?.registry?.orphanTriage)
    ? surfaces.registry.orphanTriage
    : [];

  if (edgeMeta) {
    edgeMeta.textContent = edges.length
      ? `${edges.length} page→registry edges · top ${Math.min(24, edges.length)} drawn`
      : 'No page→registry edges — rebake: bun run audit:packages -- --bake';
  }
  if (edgeHost) {
    edgeHost.innerHTML = edges.length
      ? renderPageRegistrySvg(edges, { maxEdges: 24 })
      : '<p class="pkg-empty">No edges in bake</p>';
  }
  if (hubList) {
    hubList.innerHTML = hubs.length
      ? hubs
          .map(
            h =>
              `<li><code>${escapeHtml(h.targetPrefix)}</code> · w=${h.weight} · from ${ (h.fromPackages || []).map(escapeHtml).join(', ') }</li>`
          )
          .join('')
      : '<li>No lib hubs (bake without packageExternalEdges?)</li>';
  }
  if (orphanList) {
    if (!triage.length) {
      orphanList.innerHTML = '<li>No orphans</li>';
    } else {
      orphanList.innerHTML = triage
        .map(t => {
          const portal = t.suggestPortal
            ? ` · <a href="${escapeAttr(t.suggestPortal)}">${escapeHtml(t.suggestPortal)}</a>`
            : '';
          return `<li><code>${escapeHtml(t.file)}</code> · <strong>${escapeHtml(t.action)}</strong> · ${escapeHtml(t.family)}${portal} — ${escapeHtml(t.note || '')}</li>`;
        })
        .join('');
    }
  }
}

/**
 * Mount dependency graph into #pkg-dep-graph.
 * @param {object} data - normalizePackagesMap result
 * @param {Document} [doc]
 */
function renderDependencyGraph(data, doc = document) {
  const host = doc.getElementById('pkg-dep-graph');
  const meta = doc.getElementById('pkg-dep-meta');
  if (!host) return;
  const model = buildDependencyGraphModel(data);
  // stash for filters / re-render
  host._pkgGraphModel = model;
  host._pkgBoardData = data;
  host._pkgFocusId = host._pkgFocusId || null;
  host._pkgRoleFilter = host._pkgRoleFilter || '';

  if (meta) {
    meta.textContent = `${model.stats.packageNodes} packages · ${model.stats.externalNodes} external targets · ${model.stats.edges} edges · click or press Enter/Space to focus · CLI: portal-cli pm graph`;
  }
  if (model.stats.packageNodes === 0) {
    host.innerHTML =
      '<p class="pkg-empty">No package nodes in bake — run <code>bun run audit:packages -- --bake</code></p>';
    return;
  }

  const paint = focusNodeId => {
    host.innerHTML = renderDependencyGraphSvg(model, {
      focusId: host._pkgFocusId,
      roleFilter: host._pkgRoleFilter,
    });
    host.querySelectorAll('.pkg-node').forEach(g => {
      const activate = (ev, restoreKeyboardFocus = false) => {
        ev.stopPropagation();
        const id = g.getAttribute('data-id') || '';
        // toggle focus
        host._pkgFocusId = host._pkgFocusId === id ? null : id;
        paint(restoreKeyboardFocus ? id : null);
        renderPackageDetail(data, model, host._pkgFocusId, doc);
        doc.querySelectorAll('#pkg-body tr.pkg-row-selected').forEach(r => {
          r.classList.remove('pkg-row-selected');
          r.setAttribute('aria-selected', 'false');
        });
        if (host._pkgFocusId && !host._pkgFocusId.startsWith('ext:')) {
          const row = [...doc.querySelectorAll('#pkg-body tr[data-pkg]')].find(
            r => r.getAttribute('data-pkg') === host._pkgFocusId
          );
          if (row) {
            row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            row.classList.add('pkg-row-flash');
            setTimeout(() => row.classList.remove('pkg-row-flash'), 1200);
            row.classList.add('pkg-row-selected');
            row.setAttribute('aria-selected', 'true');
          }
        }
      };
      g.addEventListener('click', ev => activate(ev));
      g.addEventListener('keydown', ev => {
        if (!isKeyboardActivationKey(ev.key)) return;
        ev.preventDefault();
        activate(ev, true);
      });
      g.addEventListener('focus', () => g.classList.add('focus'));
      g.addEventListener('blur', () => {
        if (g.getAttribute('aria-pressed') !== 'true') g.classList.remove('focus');
      });
    });
    if (focusNodeId) {
      const focused = [...host.querySelectorAll('.pkg-node')].find(
        node => node.getAttribute('data-id') === focusNodeId
      );
      focused?.focus();
    }
  };
  paint();
  renderPackageDetail(data, model, host._pkgFocusId, doc);

  // Role filter chips
  const filterHost = doc.getElementById('pkg-role-filters');
  if (filterHost && !filterHost.dataset.bound) {
    filterHost.dataset.bound = '1';
    filterHost.addEventListener('click', e => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      const role = t.getAttribute('data-role');
      if (role == null) return;
      host._pkgRoleFilter = role === host._pkgRoleFilter ? '' : role;
      // role and grade filters are independent (AND)
      filterHost.querySelectorAll('[data-role]').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-role') === host._pkgRoleFilter);
      });
      paint();
      applyTableFilters(doc, host._pkgRoleFilter, host._pkgGradeFilter || '');
    });
  }

  // Grade filter chips
  const gradeHost = doc.getElementById('pkg-grade-filters');
  if (gradeHost && !gradeHost.dataset.bound) {
    gradeHost.dataset.bound = '1';
    gradeHost.addEventListener('click', e => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      const grade = t.getAttribute('data-grade');
      if (grade == null) return;
      host._pkgGradeFilter = grade === host._pkgGradeFilter ? '' : grade;
      gradeHost.querySelectorAll('[data-grade]').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-grade') === host._pkgGradeFilter);
      });
      paint();
      applyTableFilters(doc, host._pkgRoleFilter || '', host._pkgGradeFilter);
    });
  }

  // Clear focus
  const clearBtn = doc.getElementById('pkg-focus-clear');
  if (clearBtn && !clearBtn.dataset.bound) {
    clearBtn.dataset.bound = '1';
    clearBtn.addEventListener('click', () => {
      host._pkgFocusId = null;
      host._pkgRoleFilter = '';
      host._pkgGradeFilter = '';
      filterHost?.querySelectorAll('[data-role]').forEach(b => b.classList.remove('active'));
      gradeHost?.querySelectorAll('[data-grade]').forEach(b => b.classList.remove('active'));
      paint();
      renderPackageDetail(data, model, null, doc);
      applyTableFilters(doc, '', '');
      doc.querySelectorAll('#pkg-body tr.pkg-row-selected').forEach(r => {
        r.classList.remove('pkg-row-selected');
        r.setAttribute('aria-selected', 'false');
      });
    });
  }
}

/**
 * Filter package table by role and/or grade (empty = all).
 * @param {Document} doc
 * @param {string} role
 * @param {string} grade
 */
export function applyTableFilters(doc, role, grade) {
  doc.querySelectorAll('#pkg-body tr[data-pkg]').forEach(tr => {
    let hide = false;
    if (role) {
      const cell = tr.querySelector('td.role');
      const r = cell?.textContent?.trim() || '';
      if (r !== role) hide = true;
    }
    if (!hide && grade) {
      const g = tr.getAttribute('data-grade') || '';
      if (g !== grade) hide = true;
    }
    tr.hidden = hide;
  });
}

/** @deprecated use applyTableFilters */
function applyTableRoleFilter(doc, role) {
  applyTableFilters(doc, role, '');
}

/**
 * Role / grade counts for summary cards.
 * @param {Array<object|string>} packages
 */
export function summarizePackageRoles(packages) {
  const roles = { consumed: 0, dormant: 0, 'root-tooling': 0, scripted: 0, other: 0 };
  const grades = { healthy: 0, 'needs-improvement': 0, critical: 0, unknown: 0 };
  let orphanFiles = 0;
  for (const p of packages || []) {
    if (typeof p === 'string') continue;
    const role = p.role || 'other';
    if (role in roles) roles[role]++;
    else roles.other++;
    const g = gradeFromScore(p.score);
    if (g in grades) grades[g]++;
    else grades.unknown++;
    orphanFiles += Number(p.orphans) || 0;
  }
  return { roles, grades, orphanFiles, count: (packages || []).length };
}

function renderPackagesBoard(data, doc = document) {
  const summary = data.summary ?? {};
  const boardGrade = gradeFromScore(data.score);
  const breakdown = summarizePackageRoles(data.packages);
  const scoreEl = doc.getElementById('s-score');
  setText(scoreEl, data.score != null ? String(data.score) : '—');
  if (scoreEl) {
    scoreEl.className = `stat-num grade-${boardGrade}`;
    scoreEl.title = data.grade ? String(data.grade) : boardGrade;
  }
  setText(
    doc.getElementById('s-avg'),
    summary.avgPackageScore != null ? String(summary.avgPackageScore) : '—'
  );
  setText(
    doc.getElementById('s-actions'),
    summary.openActions != null ? String(summary.openActions) : '—'
  );
  setText(doc.getElementById('s-consumed'), String(breakdown.roles.consumed));
  setText(doc.getElementById('s-dormant'), String(breakdown.roles.dormant));
  setText(
    doc.getElementById('s-pkg-count'),
    summary.packageCount != null ? String(summary.packageCount) : String(breakdown.count)
  );
  // Optional legacy cards if present in older HTML
  setText(
    doc.getElementById('s-archive'),
    summary.archivePlaceholders != null ? String(summary.archivePlaceholders) : '—'
  );
  setText(
    doc.getElementById('s-quarantine'),
    summary.quarantineCount != null
      ? String(summary.quarantineCount)
      : String((data.quarantine || []).length)
  );
  setText(
    doc.getElementById('s-inject'),
    summary.envRootRuntimeNeedsInject != null
      ? String(summary.envRootRuntimeNeedsInject)
      : data.env?.summary?.rootRuntimeNeedsInject != null
        ? String(data.env.summary.rootRuntimeNeedsInject)
        : '—'
  );
  setText(doc.getElementById('hub'), summary.topHub != null ? String(summary.topHub) : '—');

  // Summary meta + orphan alert
  const summaryMeta = doc.getElementById('pkg-summary-meta');
  if (summaryMeta) {
    const g = breakdown.grades;
    summaryMeta.textContent = `grades: healthy=${g.healthy} · needs-improvement=${g['needs-improvement']} · critical=${g.critical} · roles: consumed=${breakdown.roles.consumed} dormant=${breakdown.roles.dormant} root-tooling=${breakdown.roles['root-tooling']} · CLI: portal-cli pm graph --view=dormant`;
  }
  const orphanAlert = doc.getElementById('pkg-orphan-alert');
  if (orphanAlert) {
    if (breakdown.orphanFiles > 0) {
      orphanAlert.hidden = false;
      orphanAlert.className = 'meta grade-critical';
      orphanAlert.textContent = `⚠ ${breakdown.orphanFiles} orphan file(s) across packages — run audit:packages and review orphans column.`;
    } else {
      orphanAlert.hidden = false;
      orphanAlert.className = 'meta grade-healthy';
      orphanAlert.textContent = 'Orphan files: 0 (all scanned package sources reachable from entrypoints).';
    }
  }

  const schemaNote =
    data.schemaStatus === 'current'
      ? `schema ${data.schemaVersion}`
      : data.schemaStatus === 'legacy'
        ? `schema ${data.schemaVersion} (legacy; board pins v${PACKAGES_MAP_SCHEMA} — rebake recommended)`
        : data.schemaStatus === 'missing'
          ? `schema missing (degraded; rebake required for v${PACKAGES_MAP_SCHEMA})`
          : data.schemaStatus === 'invalid'
            ? `schema invalid (degraded; rebake required for v${PACKAGES_MAP_SCHEMA})`
            : `schema ${data.schemaVersion} unsupported (degraded; board pins v${PACKAGES_MAP_SCHEMA})`;
  const gradeNote = data.grade ? ` · ${data.grade}` : '';
  setText(
    doc.getElementById('gen-meta'),
    `${data.generatedAt || 'unknown time'} · bun ${data.bunVersion || '?'} · ${schemaNote}${gradeNote} · ${data.source}`
  );

  // Interactive dependency graph (SVG, zero CDN) from packageEdges + externalEdges
  renderDependencyGraph(data, doc);

  // Multi-surface inventory (v13+) — workspaces beyond packages/*, portal, brand, registry
  const surfaces = data.surfaces;
  const surfacesMeta = doc.getElementById('surfaces-meta');
  const surfacesList = doc.getElementById('surfaces-list');
  const workspaceList = doc.getElementById('workspace-list');
  const chromeList = doc.getElementById('chrome-list');
  if (surfaces?.summary && surfacesMeta) {
    const s = surfaces.summary;
    const v2bits = [
      s.libTopLevelDirs != null ? `libDirs=${s.libTopLevelDirs}` : null,
      s.stoNestedPackages != null ? `stoNested=${s.stoNestedPackages}` : null,
      s.portalRegistryRefs != null ? `regRefs=${s.portalRegistryRefs}` : null,
      s.registryOrphanFromPortal != null ? `regOrphan=${s.registryOrphanFromPortal}` : null,
      s.themeDarkTokens != null ? `themeDark=${s.themeDarkTokens}` : null,
      s.pageRegistryEdges != null ? `pageEdges=${s.pageRegistryEdges}` : null,
      s.libImportHubs != null ? `libHubs=${s.libImportHubs}` : null,
      s.orphanWireCandidates != null ? `orphanWire=${s.orphanWireCandidates}` : null,
    ]
      .filter(Boolean)
      .join(' · ');
    surfacesMeta.textContent = `workspaces=${s.workspaceMembers ?? '—'} (graph=${s.packagesPlane ?? '—'}+other=${s.otherWorkspaces ?? '—'}) · portalPages=${s.portalPages ?? '—'} · chrome=${s.chromeComponents ?? '—'} · brand=${s.brandAssets ?? '—'} · registryJson=${s.registryTopLevelJson ?? '—'} · storagePkgs=${s.registryStoragePackages ?? '—'}${v2bits ? ` · ${v2bits}` : ''}`;
  } else if (surfacesMeta) {
    surfacesMeta.textContent =
      'No surfaces block — rebake: bun run audit:packages -- --bake (schema v13+)';
  }
  if (surfacesList) {
    const planes = Array.isArray(surfaces?.planes) ? surfaces.planes : [];
    surfacesList.innerHTML = planes.length
      ? planes
          .map(
            p =>
              `<li><code>${escapeHtml(p.id)}</code> · <strong>${p.count ?? 0}</strong> — ${escapeHtml(p.label || '')}${p.note ? ` · ${escapeHtml(p.note)}` : ''}</li>`
          )
          .join('')
      : '<li>No plane inventory in bake</li>';
  }
  if (workspaceList) {
    const ws = Array.isArray(surfaces?.workspaces) ? surfaces.workspaces : [];
    const libDirs = Array.isArray(surfaces?.libPlane?.dirs) ? surfaces.libPlane.dirs : [];
    const stoNested = Array.isArray(surfaces?.sto?.nested) ? surfaces.sto.nested : [];
    const wsHtml = ws.length
      ? ws
          .map(
            w =>
              `<li><code>${escapeHtml(w.path)}</code> · ${escapeHtml(w.name || '')} · plane=${escapeHtml(w.plane || '')}${w.inPackagesGraph ? ' · inGraph' : ''}</li>`
          )
          .join('')
      : '';
    const libHtml = libDirs.length
      ? `<li class="surfaces-lib"><strong>lib/</strong> dirs=${libDirs.length} (workspace pkg only shared) · heavy: ${[
          ...libDirs,
        ]
          .sort((a, b) => (b.tsFiles || 0) - (a.tsFiles || 0))
          .slice(0, 6)
          .map(d => `${escapeHtml(d.name)}(${d.tsFiles || 0})`)
          .join(', ')}</li>`
      : '';
    const stoHtml = stoNested.length
      ? `<li class="surfaces-sto"><strong>STO nested</strong>: ${stoNested.map(n => `<code>${escapeHtml(n.name || n.path)}</code>`).join(', ')}</li>`
      : '';
    workspaceList.innerHTML = wsHtml + libHtml + stoHtml || '<li>—</li>';
  }
  if (chromeList) {
    const chrome = Array.isArray(surfaces?.portal?.chromeComponents)
      ? surfaces.portal.chromeComponents
      : [];
    const brandTenants = Array.isArray(surfaces?.brand?.tenants) ? surfaces.brand.tenants : [];
    const byFamily = Array.isArray(surfaces?.registry?.byFamily) ? surfaces.registry.byFamily : [];
    const chromeHtml = chrome.length
      ? chrome
          .map(c => {
            const disk = c.onDisk === false ? ' · <span class="grade-critical">missing</span>' : '';
            return `<li><code>${escapeHtml(c.id)}</code> · ${escapeHtml(c.kind || 'module')} · ${escapeHtml(c.path || '')}${disk}</li>`;
          })
          .join('')
      : '<li>No chrome components (portal-chrome bake missing?)</li>';
    const brandHtml = brandTenants.length
      ? `<li class="surfaces-brand">brand tenants: ${brandTenants.map(escapeHtml).join(', ')} · assets=${surfaces?.brand?.assets?.length ?? 0}${surfaces?.portal?.theme?.darkTokenCount != null ? ` · theme darkTokens=${surfaces.portal.theme.darkTokenCount}` : ''}</li>`
      : '';
    const familyHtml = byFamily.length
      ? `<li class="surfaces-family">registry families: ${byFamily.map(f => `${escapeHtml(f.family)}=${f.count}`).join(' · ')}</li>`
      : '';
    chromeList.innerHTML = chromeHtml + brandHtml + familyHtml;
  }

  // Cross-plane: page→registry edges, lib hubs, orphan triage (surfaces v3)
  renderCrossPlanePanel(surfaces, doc);

  // Related package-plane bakes (package-info orphan → packages board)
  void loadPackageInfoRelated(doc);

  const body = doc.getElementById('pkg-body');
  if (body) {
    body.replaceChildren();
    if (!data.packages.length) {
      const tr = doc.createElement('tr');
      tr.innerHTML = `<td colspan="5" class="pkg-empty">No package rows in bake</td>`;
      body.appendChild(tr);
    } else {
      // Sort: critical / needs-improvement first, then name
      const rows = [...data.packages].sort((a, b) => {
        const ga = gradeFromScore(a.score);
        const gb = gradeFromScore(b.score);
        const rank = g =>
          g === 'critical' ? 0 : g === 'needs-improvement' ? 1 : g === 'healthy' ? 2 : 3;
        return (
          rank(ga) - rank(gb) ||
          String(a.name ?? a.package).localeCompare(String(b.name ?? b.package))
        );
      });
      for (const p of rows) {
        const tr = doc.createElement('tr');
        const role = p.role ?? '—';
        const name = p.name ?? p.package ?? '—';
        const bytes = typeof p.bytes === 'number' ? (p.bytes / 1024).toFixed(1) : '—';
        const g = gradeFromScore(p.score);
        tr.dataset.pkg = String(name);
        tr.dataset.role = String(role);
        tr.dataset.grade = g;
        tr.setAttribute('data-grade', g);
        tr.tabIndex = 0;
        tr.setAttribute('aria-label', `Focus package ${String(name)} in dependency graph`);
        tr.setAttribute('aria-selected', 'false');
        tr.classList.add('pkg-row-clickable');
        tr.innerHTML = `<td>${escapeHtml(String(name))}</td><td class="role role-${classToken(role)}">${escapeHtml(String(role))}</td><td class="grade-${g}">${p.score ?? '—'}</td><td>${p.orphans ?? 0}</td><td>${bytes}</td>`;
        const activateRow = () => {
          const graphHost = doc.getElementById('pkg-dep-graph');
          if (!graphHost) return;
          graphHost._pkgFocusId = String(name);
          // re-render graph with focus
          renderDependencyGraph(data, doc);
          doc.querySelectorAll('#pkg-body tr.pkg-row-selected').forEach(r => {
            r.classList.remove('pkg-row-selected');
            r.setAttribute('aria-selected', 'false');
          });
          tr.classList.add('pkg-row-selected');
          tr.setAttribute('aria-selected', 'true');
        };
        tr.addEventListener('click', activateRow);
        tr.addEventListener('keydown', event => {
          if (!isKeyboardActivationKey(event.key)) return;
          event.preventDefault();
          activateRow();
        });
        body.appendChild(tr);
      }
    }
  }
  // re-apply role/grade filters if user had them selected
  const graphHost = doc.getElementById('pkg-dep-graph');
  if (graphHost) {
    applyTableFilters(doc, graphHost._pkgRoleFilter || '', graphHost._pkgGradeFilter || '');
  }
  // toolbar copy buttons
  bindCopyButtons(doc);

  const actionList = doc.getElementById('action-list');
  if (actionList) {
    const actions = data.actions.filter(a => a.action !== 'ok');
    actionList.innerHTML = actions.length
      ? actions
          .map(a => {
            const hint = actionHint(a.action);
            const hintHtml = hint
              ? ` · <span class="action-hint"><code>${escapeHtml(hint)}</code></span>`
              : '';
            return `<li><code>${escapeHtml(a.package)}</code> · <strong>${escapeHtml(a.action)}</strong> — ${escapeHtml(a.reason)}${hintHtml}</li>`;
          })
          .join('')
      : '<li>None — coupling aligned</li>';
  }

  const probeList = doc.getElementById('probe-list');
  if (probeList) {
    const probes = data.archiveProbes;
    probeList.innerHTML = probes.length
      ? probes
          .map(
            p =>
              `<li><code>${escapeHtml(p.package)}</code> · ${escapeHtml(p.kind)} → <strong>${escapeHtml(p.recommendation)}</strong> — ${escapeHtml(p.note)}</li>`
          )
          .join('')
      : '<li>No dormant packages</li>';
  }

  const quarantineList = doc.getElementById('quarantine-list');
  if (quarantineList) {
    const q = data.quarantine || [];
    quarantineList.innerHTML = q.length
      ? q
          .map(
            row =>
              `<li><code>${escapeHtml(row.package)}</code> · blockedBy=[${(row.blockedBy || []).map(escapeHtml).join(', ') || '—'}] — ${escapeHtml(row.reason || '')}</li>`
          )
          .join('')
      : '<li>None</li>';
  }

  const vaultList = doc.getElementById('vault-list');
  const vaultGapMeta = doc.getElementById('vault-gap-meta');
  const vault = data.vault;
  if (vaultList) {
    if (vault?.byPackage?.length) {
      vaultList.innerHTML = vault.byPackage
        .map(r => {
          const miss = r.missingTemplateKeys?.length
            ? ` · missing: ${r.missingTemplateKeys.map(escapeHtml).join(', ')}`
            : '';
          return `<li><code>${escapeHtml(r.package)}</code> · ${(r.envKeys || []).map(escapeHtml).join(', ')}${miss}</li>`;
        })
        .join('');
      if (vault.gap && vaultGapMeta) {
        vaultGapMeta.textContent = `pass-cli=${vault.gap.passCliAvailable ? 'yes' : 'no'} · items=${vault.gap.passItemCount ?? '—'} · humanOpen=${(vault.gap.humanOpen || []).join(', ') || '—'} · wouldMint=${(vault.gap.mintableWouldMint || []).join(', ') || '—'}`;
      }
    } else {
      vaultList.innerHTML =
        '<li>No vault plane in bake — run <code>bun run audit:packages:vault</code></li>';
    }
  }

  const envMeta = doc.getElementById('env-meta');
  const envOwnerList = doc.getElementById('env-owner-list');
  const env = data.env;
  if (envMeta) {
    if (env?.summary) {
      envMeta.textContent = `unique=${env.uniqueVars} · owners=${env.summary.ownerCount} · pkgKeys=${env.summary.packageTouchedKeys} · multiPlane=${env.summary.multiPlaneKeys} · rootNeedsInject=${env.runtime?.root?.missingNeedsInject?.length ?? env.summary?.rootRuntimeNeedsInject ?? '—'} · coveredByDefault=${env.runtime?.root?.coveredByTemplateDefault?.length ?? env.summary?.rootCoveredByDefault ?? '—'} · defaultsIssues=${env.defaultsIssues?.total ?? 0}`;
    } else {
      envMeta.textContent = 'No env inventory — run bun run audit:packages:env';
    }
  }
  if (envOwnerList) {
    const owners = (env?.owners || []).filter(o => (o.packages || []).length).slice(0, 12);
    envOwnerList.innerHTML = owners.length
      ? owners
          .map(
            o =>
              `<li><code>${escapeHtml(o.envKey)}</code> ×${o.count} · pkgs=[${(o.packages || []).map(escapeHtml).join(', ')}] · planes=[${(o.planes || []).map(escapeHtml).join(', ')}]</li>`
          )
          .join('')
      : '<li>No package-touched env keys</li>';
  }
}

/**
 * @param {unknown} err
 * @param {Document} doc
 */
function renderPackagesBoardError(err, doc = document) {
  const msg = formatLoadError(err);
  setText(doc.getElementById('gen-meta'), `Failed to load map: ${msg}`);
  setText(doc.getElementById('s-score'), '—');
  setText(doc.getElementById('s-avg'), '—');
  setText(doc.getElementById('s-actions'), '—');
  setText(doc.getElementById('s-archive'), '—');
  setText(doc.getElementById('s-quarantine'), '—');
  setText(doc.getElementById('s-inject'), '—');
  setText(doc.getElementById('hub'), '—');
  const scoreEl = doc.getElementById('s-score');
  if (scoreEl) scoreEl.className = 'stat-num';

  const body = doc.getElementById('pkg-body');
  if (body) {
    body.innerHTML = `<tr><td colspan="5" class="pkg-error">Unavailable — rebake with <code>bun run audit:packages:full</code></td></tr>`;
  }
  for (const id of [
    'action-list',
    'probe-list',
    'quarantine-list',
    'vault-list',
    'env-owner-list',
  ]) {
    const el = doc.getElementById(id);
    if (el) el.innerHTML = '<li>Unavailable</li>';
  }
  setText(doc.getElementById('env-meta'), 'Unavailable');

  const banner = doc.getElementById('pkg-error-banner');
  if (banner) {
    banner.classList.remove('hidden');
    banner.innerHTML = `<p><strong>Packages map failed</strong> — ${escapeHtml(msg)}</p>
      <p class="error-hint">
        <button type="button" class="retry-btn error-action" id="pkg-retry">Retry</button>
        · <a class="ops-link" href="/registry/packages-graph-map.json">Raw JSON</a>
        · <a class="ops-link" href="/portal/packages.md">Runbook</a>
        · <code>bun run audit:packages:full</code>
      </p>`;
  }
}

/**
 * @param {string} s
 */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * @param {string} s
 */
function escapeAttribute(s) {
  return escapeHtml(s);
}

/**
 * CSS class fragments are identifiers, not opaque values.
 * @param {unknown} value
 */
function classToken(value) {
  return String(value).replace(/[^a-z0-9_-]/gi, '-');
}

/** Bootstrap when loaded as a module on the packages board page. */
async function mountPackagesBoard() {
  const banner = document.getElementById('pkg-error-banner');
  if (banner) banner.classList.add('hidden');

  const run = async () => {
    try {
      const data = await loadPackagesMap();
      renderPackagesBoard(data);
      if (banner) banner.classList.add('hidden');
    } catch (err) {
      renderPackagesBoardError(err);
      const retry = document.getElementById('pkg-retry');
      if (retry) {
        retry.addEventListener(
          'click',
          () => {
            void mountPackagesBoard();
          },
          { once: true }
        );
      }
    }
  };
  await run();
}

if (typeof document !== 'undefined' && document.getElementById('pkg-body')) {
  void mountPackagesBoard();
}
