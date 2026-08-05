/**
 * Packages graph map board — load + render with explicit failure paths.
 * @see docs/portal-foundation.md
 * @see docs/harness/tenants/monorepo-health.md (claim packages-graph-map-v13)
 */

/** Supported bake schema for this board (pin — warn on mismatch, still try to render). */
export const PACKAGES_MAP_SCHEMA = 13;
/** Older bakes still render; surfaces block appears only on v13+. */
const PACKAGES_MAP_SCHEMA_MIN = 12;

/** Primary registry bake (Pages serves public/registry only). */
const PACKAGES_MAP_SOURCES = ['/registry/packages-graph-map.json'];

/** Related package-plane bakes (wire-portal orphan close for package-info + install hygiene). */
export const PACKAGES_RELATED_REGISTRY = [
  '/registry/packages-graph-map.json',
  '/registry/package-info.json',
  '/registry/monorepo-health.json',
  '/registry/install-hygiene-report.json',
  '/registry/ssot-flow-soft.json',
  '/registry/pm-proof.json',
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
 * Relative age for bake timestamps (UTC ISO or ms).
 * @param {string|number|null|undefined} when
 * @param {number} [nowMs]
 */
export function formatRelativeAge(when, nowMs = Date.now()) {
  if (when == null || when === '') return 'unknown age';
  const t = typeof when === 'number' ? when : Date.parse(String(when));
  if (!Number.isFinite(t)) return 'unknown age';
  const sec = Math.max(0, Math.round((nowMs - t) / 1000));
  if (sec < 45) return 'just now';
  if (sec < 3600) return `${Math.round(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.round(sec / 3600)}h ago`;
  if (sec < 86400 * 14) return `${Math.round(sec / 86400)}d ago`;
  return `${Math.round(sec / (86400 * 7))}w ago`;
}

/**
 * Compact absolute stamp for tooltips (YYYY-MM-DD HH:mm UTC).
 * @param {string|number|null|undefined} when
 */
export function formatBakeStamp(when) {
  if (when == null || when === '') return '';
  const d = new Date(typeof when === 'number' ? when : String(when));
  if (Number.isNaN(d.getTime())) return String(when);
  return d.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
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
/**
 * Match capability-map-subset rows that mention a package.
 * @param {Array<{capability?:string,usedIn?:string,api?:string,status?:string}>} rows
 * @param {string} pkgId
 */
export function matchCapabilityRows(rows, pkgId) {
  const needle = String(pkgId || '').toLowerCase();
  if (!needle || !Array.isArray(rows)) return [];
  return rows.filter(r => {
    const blob = `${r.capability || ''} ${r.usedIn || ''} ${r.api || ''}`.toLowerCase();
    return blob.includes(needle) || blob.includes(`@factorywager/${needle}`);
  });
}

/**
 * @param {object} data
 * @param {object} model
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
        <p class="meta">Registry plane: external target (not a packages/* row)</p>
        <p class="meta"><button type="button" class="copy-cli" data-cli="bun run portal-cli pm graph">copy pm graph</button></p>`;
      bindCopyButtons(el);
      return;
    }
    el.innerHTML =
      '<p class="meta">Select a package node (or table row) for edges, registry links, and CLI.</p>';
    return;
  }
  const row = (data.packages || []).find(p => (p.name || p.package) === pkgId);
  const node = (model.nodes || []).find(n => n.id === pkgId);
  const edges = edgesForPackage(model, pkgId);
  const actions = (data.actions || []).filter(a => a.package === pkgId);
  const probes = (data.archiveProbes || []).filter(p => p.package === pkgId);
  const declared = (data.map?.declared || []).find(d => d.package === pkgId);
  const score = row?.score ?? node?.score;
  const role = row?.role ?? node?.role ?? '—';
  const g = gradeFromScore(score);
  const npmGuess = pkgId.startsWith('@') ? pkgId : `@factorywager/${pkgId}`;
  const pkgCli = `bun run portal-cli pm graph --package=${pkgId} --export=json`;
  const viewCli =
    role && role !== '—'
      ? `bun run portal-cli pm graph --view=${role}`
      : 'bun run portal-cli pm graph';

  el.innerHTML = `<h4><code>${escapeHtml(pkgId)}</code></h4>
    <p class="meta">role=<span class="role role-${classToken(role)}">${escapeHtml(String(role))}</span>
      · score=<span class="grade-${g}">${score ?? '—'}</span>
      · grade=<span class="grade-${g}">${escapeHtml(g)}</span>
      · orphans=${row?.orphans ?? 0}
      · kB=${typeof row?.bytes === 'number' ? (row.bytes / 1024).toFixed(1) : '—'}
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
      declared
        ? `<p class="meta">Declared workspace deps</p>
        <ul>
          <li>in root workspace deps: <strong>${declared.inRootWorkspaceDeps ? 'yes' : 'no'}</strong></li>
          <li>actual cross-pkg: ${(declared.actualCrossPkg || []).map(escapeHtml).join(', ') || '—'}</li>
          <li>missing in package.json: ${(declared.missingInPackageJson || []).map(escapeHtml).join(', ') || '—'}</li>
          <li>unused declared: ${(declared.unusedDeclared || []).map(escapeHtml).join(', ') || '—'}</li>
        </ul>`
        : ''
    }
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
    <p class="meta">Registry drill-down</p>
    <ul id="pkg-registry-links">
      <li><a href="/registry/packages-graph-map.json"><code>packages-graph-map.json</code></a></li>
      <li><a href="/registry/package-info.json"><code>package-info.json</code></a> · match <code>${escapeHtml(npmGuess)}</code></li>
      <li id="pkg-info-hit" class="meta">package-info: loading…</li>
      <li id="pkg-cap-hit" class="meta">capabilities: loading…</li>
    </ul>
    <div class="pkg-detail-cli">
      <button type="button" class="copy-cli" data-cli="${escapeAttribute(pkgCli)}">copy package JSON CLI</button>
      <button type="button" class="copy-cli" data-cli="${escapeAttribute(viewCli)}">copy role view CLI</button>
      <button type="button" class="copy-cli" data-cli="bun run audit:packages -- --bake">copy rebake</button>
      <button type="button" class="pkg-chip" id="pkg-rebake-local" title="POST /api/packages/graph/rebake (local serve-public only)">rebake (local API)</button>
    </div>
    <p class="meta" id="pkg-rebake-status"></p>`;
  bindCopyButtons(el);
  bindRebakeLocal(el);
  void enrichPackageRegistryDetail(pkgId, npmGuess, el);
}

/**
 * Load package-info + capability-map-subset hits for the selected package.
 * @param {string} pkgId
 * @param {string} npmGuess
 * @param {HTMLElement} el
 */
async function enrichPackageRegistryDetail(pkgId, npmGuess, el) {
  const infoEl = el.querySelector('#pkg-info-hit');
  const capEl = el.querySelector('#pkg-cap-hit');
  try {
    const res = await fetch('/registry/package-info.json', {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok && infoEl) {
      const j = await res.json();
      const results = Array.isArray(j.results) ? j.results : [];
      const hit = results.find(
        r =>
          r.name === npmGuess ||
          r.name === pkgId ||
          String(r.name || '').endsWith('/' + pkgId)
      );
      if (hit) {
        infoEl.innerHTML = `package-info: <strong>${escapeHtml(hit.status || '—')}</strong> · ${escapeHtml(hit.registry || '')} · v${escapeHtml(String(hit.version || '—'))} · readme ${escapeHtml(String(hit.readme || '—'))}`;
      } else {
        infoEl.textContent = `package-info: no row for ${npmGuess}`;
      }
    } else if (infoEl) {
      infoEl.textContent = `package-info: HTTP ${res.status}`;
    }
  } catch (err) {
    if (infoEl) infoEl.textContent = `package-info: ${formatLoadError(err)}`;
  }
  try {
    const res = await fetch('/registry/capability-map-subset.json', {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok && capEl) {
      const j = await res.json();
      const hits = matchCapabilityRows(j.rows || [], pkgId);
      if (hits.length) {
        capEl.innerHTML =
          'capabilities: ' +
          hits
            .slice(0, 4)
            .map(
              h =>
                `<code title="${escapeAttribute(h.usedIn || '')}">${escapeHtml(h.capability || '?')}</code> (${escapeHtml(h.status || '')})`
            )
            .join(' · ');
      } else {
        capEl.innerHTML =
          'capabilities: none matched · <a href="/portal/tools/">tools hub</a>';
      }
    } else if (capEl) {
      capEl.textContent = `capabilities: HTTP ${res.status}`;
    }
  } catch (err) {
    if (capEl) capEl.textContent = `capabilities: ${formatLoadError(err)}`;
  }
}

/**
 * POST local rebake when serve-public is on loopback; else show CLI hint.
 * @param {ParentNode} root
 */
function bindRebakeLocal(root) {
  const btn = root.querySelector('#pkg-rebake-local');
  const status = root.querySelector('#pkg-rebake-status');
  if (!btn || btn.dataset.bound === '1') return;
  btn.dataset.bound = '1';
  btn.addEventListener('click', async e => {
    e.stopPropagation();
    if (status) status.textContent = 'Rebaking… (local API)';
    try {
      const res = await fetch('/api/packages/graph/rebake', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(300_000),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (status) {
          status.innerHTML = `Rebake unavailable (${res.status}${body.error ? `: ${escapeHtml(body.error)}` : ''}). Use <code>bun run audit:packages -- --bake</code> or <code>portal-cli pm graph --update</code>.`;
        }
        return;
      }
      if (status) {
        status.textContent = `Rebake ok · score=${body.score ?? '—'} · ${body.generatedAt || ''}`;
      }
      // Reload board from fresh bake
      if (typeof window !== 'undefined' && typeof window.__pkgBoardReload === 'function') {
        window.__pkgBoardReload();
      } else {
        location.reload();
      }
    } catch (err) {
      if (status) {
        status.innerHTML = `Rebake failed: ${escapeHtml(formatLoadError(err))}. Local only: <code>bun run serve:public</code> then retry, or copy rebake CLI.`;
      }
    }
  });
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
 * Normalize a soft-pass proof into a board row (name ≠ id).
 * @param {Record<string, unknown> | null | undefined} proof
 * @param {{ fallbackId: string, fallbackName: string, fallbackCli: string }} fallbacks
 */
export function normalizePublishPlaneRow(proof, fallbacks) {
  const p = proof && typeof proof === 'object' ? proof : {};
  const summary =
    p.summary && typeof p.summary === 'object'
      ? /** @type {Record<string, unknown>} */ (p.summary)
      : {};
  const pkg = p.package;
  const pkgLabel =
    typeof pkg === 'string'
      ? pkg
      : pkg && typeof pkg === 'object'
        ? `${/** @type {Record<string, unknown>} */ (pkg).name ?? '?'}@${/** @type {Record<string, unknown>} */ (pkg).version ?? '?'}`
        : '—';
  const status =
    summary.status === 'pass' || summary.status === 'fail'
      ? summary.status
      : p.ok === true
        ? 'pass'
        : p.ok === false
          ? 'fail'
          : 'missing';
  const tarball =
    p.tarball && typeof p.tarball === 'object'
      ? /** @type {Record<string, unknown>} */ (p.tarball)
      : null;
  const color =
    p.color && typeof p.color === 'object'
      ? /** @type {Record<string, unknown>} */ (p.color)
      : {};
  const modeColor =
    p.modeColor && typeof p.modeColor === 'object'
      ? /** @type {Record<string, unknown>} */ (p.modeColor)
      : {};
  return {
    artifactId: String(p.artifactId || fallbacks.fallbackId),
    artifactName: String(p.artifactName || fallbacks.fallbackName),
    conceptId: String(p.conceptId || ''),
    colorKey: String(color.colorKey || ''),
    colorHex: String(color.hex || ''),
    colorToken: String(color.token || ''),
    modeColorKey: String(modeColor.colorKey || ''),
    modeColorHex: String(modeColor.hex || ''),
    plane: String(p.plane || 'publish'),
    purpose: String(p.purpose || 'audit'),
    mode: String(p.mode || 'soft'),
    cli: String(p.cli || fallbacks.fallbackCli),
    status,
    passed: summary.passed ?? '—',
    failed: summary.failed ?? '—',
    skipped: summary.skipped ?? 0,
    total: summary.total ?? '—',
    packageLabel: pkgLabel,
    reportPath: String(p.reportPath || p.links?.json || ''),
    tarballPath: tarball?.path ? String(tarball.path) : '',
    sha256: tarball?.sha256 ? String(tarball.sha256).slice(0, 12) : '',
    missing: !proof,
  };
}

/**
 * HTML table for publish-plane soft-pass rows.
 * @param {ReturnType<typeof normalizePublishPlaneRow>[]} rows
 */
/**
 * Soft-pass KPI cards (above the detail table).
 * @param {ReturnType<typeof normalizePublishPlaneRow>[]} rows
 */
export function renderPublishPlaneCards(rows) {
  if (!rows.length) return '';
  return rows
    .map(r => {
      const statusClass =
        r.status === 'pass' ? 'grade-healthy' : r.status === 'fail' ? 'grade-critical' : 'pkg-empty';
      const mark = r.status === 'pass' ? 'pass' : r.status === 'fail' ? 'fail' : 'missing';
      const counts = r.missing
        ? 'missing bake'
        : `${r.passed}/${r.total}` +
          (r.skipped ? ` · ${r.skipped} skipped` : '') +
          (r.failed && r.failed !== 0 && r.failed !== '—' ? ` · ${r.failed} failed` : '');
      const jsonHref = r.reportPath || `/registry/${r.artifactId}.json`;
      const swatch = r.colorHex
        ? `<span class="pkg-color-swatch" style="background:${escapeHtml(r.colorHex)}" title="${escapeHtml(r.colorToken || r.colorKey)}"></span>`
        : '';
      const tennisHint =
        r.packageLabel && String(r.packageLabel).includes('tennis-hq')
          ? ` · <a href="https://tennis.factory-wager.com" target="_blank" rel="noopener noreferrer">Market Desk</a>`
          : '';
      return (
        `<article class="publish-kpi-card" data-status="${escapeHtml(String(r.status))}" data-artifact-id="${escapeHtml(r.artifactId)}">` +
        `<div class="kpi-title">` +
        `<span>${swatch}${escapeHtml(r.artifactName)}</span>` +
        `<span class="${statusClass}">${escapeHtml(mark)}</span>` +
        `</div>` +
        `<div class="kpi-meta"><code>${escapeHtml(r.artifactId)}</code> · ${escapeHtml(String(counts))} · mode <code>${escapeHtml(r.mode)}</code></div>` +
        `<div class="kpi-meta">${escapeHtml(r.packageLabel || '—')}${tennisHint}</div>` +
        `<div class="kpi-actions">` +
        `<a class="pkg-chip" href="${escapeHtml(jsonHref)}">json</a>` +
        `<button type="button" class="copy-cli" data-cli="${escapeHtml(r.cli)}">copy CLI</button>` +
        `</div>` +
        `</article>`
      );
    })
    .join('');
}

export function renderPublishPlaneTable(rows) {
  if (!rows.length) {
    return '<p class="pkg-empty">No soft-pass proofs — <code>bun run ssot:flow:soft</code> · <code>bun run verify:pm:save</code></p>';
  }
  const body = rows
    .map(r => {
      const statusClass =
        r.status === 'pass' ? 'grade-healthy' : r.status === 'fail' ? 'grade-critical' : 'pkg-empty';
      const mark = r.status === 'pass' ? '✅' : r.status === 'fail' ? '❌' : '—';
      const counts =
        r.missing
          ? 'missing bake'
          : `${r.passed}/${r.total}` +
            (r.skipped ? ` · ${r.skipped} skipped` : '') +
            (r.failed && r.failed !== 0 && r.failed !== '—' ? ` · ${r.failed} failed` : '');
      const detail = r.tarballPath
        ? `<code>${escapeHtml(r.tarballPath)}</code>${r.sha256 ? ` · sha256 ${escapeHtml(r.sha256)}…` : ''}`
        : escapeHtml(r.packageLabel);
      const jsonHref = r.reportPath || `/registry/${r.artifactId}.json`;
      const swatch = r.colorHex
        ? `<span class="pkg-color-swatch" style="background:${escapeHtml(r.colorHex)}" title="${escapeHtml(r.colorToken || r.colorKey)}"></span>`
        : '';
      const colorCell = r.colorKey
        ? `${swatch}<code>${escapeHtml(r.colorKey)}</code>` +
          (r.conceptId ? ` · <code>${escapeHtml(r.conceptId)}</code>` : '')
        : '—';
      const modeCell = r.modeColorKey
        ? `<span class="pkg-color-swatch" style="background:${escapeHtml(r.modeColorHex || 'transparent')}"></span>` +
          `<code>${escapeHtml(r.mode)}</code>/<code>${escapeHtml(r.modeColorKey)}</code>`
        : escapeHtml(r.mode);
      return (
        `<tr data-artifact-id="${escapeHtml(r.artifactId)}" data-concept-id="${escapeHtml(r.conceptId)}" data-color-key="${escapeHtml(r.colorKey)}">` +
        `<td>${escapeHtml(r.artifactName)}</td>` +
        `<td><code>${escapeHtml(r.artifactId)}</code></td>` +
        `<td>${colorCell}</td>` +
        `<td>${modeCell}</td>` +
        `<td class="${statusClass}">${mark} ${escapeHtml(String(r.status))}</td>` +
        `<td>${escapeHtml(String(counts))}</td>` +
        `<td>${detail}</td>` +
        `<td><a href="${escapeHtml(jsonHref)}"><code>${escapeHtml(r.artifactId)}.json</code></a></td>` +
        `<td><button type="button" class="copy-cli" data-cli="${escapeHtml(r.cli)}">copy CLI</button></td>` +
        `</tr>`
      );
    })
    .join('');
  return (
    `<table class="pkg-table" aria-label="Publish plane soft-pass artifacts">` +
    `<thead><tr>` +
    `<th>artifactName</th><th>artifactId</th><th>colorKey</th><th>mode</th><th>status</th><th>summary</th><th>detail</th><th>json</th><th>cli</th>` +
    `</tr></thead><tbody>${body}</tbody></table>`
  );
}

/**
 * Soft-pass panel: ssot-flow-soft + pm-proof → #publish-plane-body.
 * @param {Document} [doc]
 */
export async function loadPublishPlaneSoftPass(doc = document) {
  const host = doc.getElementById('publish-plane-body');
  const ssotEl = doc.getElementById('ssot-soft-meta');
  const pmEl = doc.getElementById('pm-proof-meta');
  const fetchJson = async path => {
    const res = await fetch(path, {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };

  /** @type {ReturnType<typeof normalizePublishPlaneRow>[]} */
  const rows = [];

  let ssot = null;
  let pm = null;
  try {
    ssot = await fetchJson('/registry/ssot-flow-soft.json');
  } catch {
    ssot = null;
  }
  try {
    pm = await fetchJson('/registry/pm-proof.json');
  } catch {
    pm = null;
  }

  rows.push(
    normalizePublishPlaneRow(ssot, {
      fallbackId: 'ssot-flow-soft',
      fallbackName: 'SSOT soft-pass',
      fallbackCli: 'bun run ssot:flow:soft',
    })
  );
  rows.push(
    normalizePublishPlaneRow(pm, {
      fallbackId: 'pm-proof',
      fallbackName: 'PM publish-plane proof',
      fallbackCli: 'bun run verify:pm:save',
    })
  );

  let weaveNote = '';
  try {
    const weave = await fetchJson('/registry/portal-weave.json');
    const related = weave.related || {};
    const plane = weave.publishPlane || {};
    const planeArts = Array.isArray(plane.artifacts) ? plane.artifacts : [];
    const scriptCmds = Array.isArray(plane.scripts)
      ? plane.scripts
      : (Array.isArray(weave.scripts) ? weave.scripts : [])
          .filter(s => s.id === 'ssot-flow-soft' || s.id === 'verify-pm-save' || s.id === 'verify-weave')
          .map(s => s.cmd);
    const packages = (Array.isArray(weave.surfaces) ? weave.surfaces : []).find(
      s => s.id === 'packages'
    );
    const owns = Array.isArray(packages?.relatedArtifactIds)
      ? packages.relatedArtifactIds.join(', ')
      : '';
    const hexByKey = Object.fromEntries(
      rows
        .filter(r => r.colorKey && r.colorHex)
        .map(r => [r.colorKey, r.colorHex])
    );
    const planeSource = planeArts.length
      ? planeArts
      : rows
          .filter(r => r.colorKey)
          .map(r => ({
            artifactId: r.artifactId,
            conceptId: r.conceptId,
            colorKey: r.colorKey,
            hex: r.colorHex,
            token: r.colorToken,
          }));
    const swatches = planeSource
      .filter(a => a.colorKey)
      .map(a => {
        const hex = String(a.hex || hexByKey[a.colorKey] || '');
        const title = String(a.token || a.conceptId || a.artifactId || a.colorKey);
        return (
          `<span class="pkg-color-swatch"${hex ? ` style="background:${escapeHtml(hex)}"` : ''} title="${escapeHtml(title)}"></span>` +
          `<code>${escapeHtml(String(a.colorKey))}</code>`
        );
      })
      .join(' · ');
    const planePending = !planeArts.length;
    weaveNote =
      `<p class="meta">Weave <code>publishPlane</code>: <a href="/registry/portal-weave.json"><code>portal-weave.json</code></a>` +
      (planePending ? ' · <em>pending on edge</em>' : '') +
      ` · board <code>${escapeHtml(String(plane.board || '/portal/packages/'))}</code>` +
      ` · kernel <code>${escapeHtml(String(plane.colorKernel || 'partner-ops'))}</code>` +
      (owns ? ` · packages owns <code>${escapeHtml(owns)}</code>` : '') +
      (related.ssotFlowSoft
        ? ` · related.ssotFlowSoft=<code>${escapeHtml(String(related.ssotFlowSoft))}</code>`
        : '') +
      (related.pmProof ? ` · related.pmProof=<code>${escapeHtml(String(related.pmProof))}</code>` : '') +
      (swatches ? ` · ${swatches}` : '') +
      (scriptCmds.length
        ? ` · scripts: ${scriptCmds.map(c => `<code>${escapeHtml(String(c))}</code>`).join(' · ')}`
        : '') +
      `</p>`;
  } catch {
    weaveNote =
      '<p class="meta">Weave: missing <code>portal-weave.json</code> — rebake via ops:snapshot / compliance:bake</p>';
  }

  const kpiHost = doc.getElementById('publish-plane-kpis');
  if (kpiHost) {
    kpiHost.innerHTML = renderPublishPlaneCards(rows);
    bindCopyButtons(kpiHost);
  }

  if (host) {
    host.innerHTML = renderPublishPlaneTable(rows) + weaveNote;
    bindCopyButtons(host);
  }

  const ageEl = doc.getElementById('publish-plane-age');
  if (ageEl) {
    const stamps = [ssot?.timestamp, ssot?.generatedAt, pm?.timestamp, pm?.generatedAt]
      .map(v => (v == null ? NaN : Date.parse(String(v))))
      .filter(n => Number.isFinite(n));
    if (stamps.length) {
      const newest = Math.max(...stamps);
      ageEl.textContent = `newest bake ${formatRelativeAge(newest)} · ${formatBakeStamp(newest)}`;
      ageEl.title = stamps.map(t => formatBakeStamp(t)).join(' · ');
    } else {
      ageEl.textContent = 'bake age unknown';
    }
  }

  // Keep hidden meta nodes for older tests / scrapers.
  if (ssotEl) {
    ssotEl.textContent = ssot
      ? `${ssot.artifactName} · id=${ssot.artifactId} · ${ssot.summary?.status ?? (ssot.ok ? 'pass' : 'fail')}`
      : 'SSOT soft-pass: missing';
  }
  if (pmEl) {
    pmEl.textContent = pm
      ? `${pm.artifactName} · id=${pm.artifactId} · ${pm.summary?.status ?? '—'}`
      : 'PM publish-plane proof: missing';
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

/**
 * Render stacked role mix bar from package roles summary.
 * @param {ReturnType<typeof summarizePackageRoles>} breakdown
 * @param {Document} [doc]
 */
export function renderRoleMixBar(breakdown, doc = document) {
  const root = doc.getElementById('pkg-role-mix');
  const track = doc.getElementById('pkg-role-mix-track');
  const legend = doc.getElementById('pkg-role-mix-legend');
  const label = doc.getElementById('pkg-role-mix-label');
  if (!root || !track || !legend) return;
  const total = Math.max(1, breakdown.count || 0);
  const order = [
    ['consumed', 'mix-consumed', breakdown.roles.consumed],
    ['dormant', 'mix-dormant', breakdown.roles.dormant],
    ['root-tooling', 'mix-root-tooling', breakdown.roles['root-tooling']],
    ['scripted', 'mix-scripted', breakdown.roles.scripted],
    ['other', 'mix-other', breakdown.roles.other],
  ];
  const parts = order.filter(([, , n]) => n > 0);
  if (!parts.length) {
    root.hidden = true;
    return;
  }
  root.hidden = false;
  track.innerHTML = parts
    .map(([, cls, n]) => {
      const pct = Math.max(2, Math.round((n / total) * 100));
      return `<span class="${cls}" style="width:${pct}%" title="${n}"></span>`;
    })
    .join('');
  legend.innerHTML = parts
    .map(([name, cls, n]) => {
      const color =
        cls === 'mix-consumed'
          ? 'var(--green, #3dd68c)'
          : cls === 'mix-dormant'
            ? 'var(--yellow, #e6b84d)'
            : cls === 'mix-scripted'
              ? 'var(--accent, #58a6ff)'
              : 'var(--text-dim)';
      return `<span><i style="background:${color}"></i>${escapeHtml(name)} ${n}</span>`;
    })
    .join('');
  if (label) {
    label.textContent = `${breakdown.count} packages · ${breakdown.roles.consumed} consumed · ${breakdown.roles.dormant} dormant`;
  }
}

/**
 * Sort package rows for the coupling table.
 * @param {Array<Record<string, unknown>>} packages
 * @param {string} sortKey
 */
export function sortPackageRows(packages, sortKey) {
  const rows = [...(packages || [])].filter(p => p && typeof p === 'object');
  const nameOf = p => String(p.name || p.package || '');
  const scoreOf = p => (typeof p.score === 'number' ? p.score : -1);
  const bytesOf = p => (typeof p.bytes === 'number' ? p.bytes : 0);
  rows.sort((a, b) => {
    if (sortKey === 'score-desc') return scoreOf(b) - scoreOf(a) || nameOf(a).localeCompare(nameOf(b));
    if (sortKey === 'score-asc') return scoreOf(a) - scoreOf(b) || nameOf(a).localeCompare(nameOf(b));
    if (sortKey === 'role') {
      return (
        String(a.role || '').localeCompare(String(b.role || '')) || nameOf(a).localeCompare(nameOf(b))
      );
    }
    if (sortKey === 'size-desc') return bytesOf(b) - bytesOf(a) || nameOf(a).localeCompare(nameOf(b));
    return nameOf(a).localeCompare(nameOf(b));
  });
  return rows;
}

/**
 * Filter package rows by free-text (name / role).
 * @param {Array<Record<string, unknown>>} packages
 * @param {string} q
 */
export function filterPackageRows(packages, q) {
  const needle = String(q || '')
    .trim()
    .toLowerCase();
  if (!needle) return packages || [];
  return (packages || []).filter(p => {
    if (!p || typeof p !== 'object') return false;
    const hay = `${p.name || p.package || ''} ${p.role || ''} ${p.grade || ''}`.toLowerCase();
    return hay.includes(needle);
  });
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
  const pill = doc.getElementById('board-grade-pill');
  const pillScore = doc.getElementById('pill-score');
  const pillGrade = doc.getElementById('pill-grade');
  if (pill) {
    pill.className = `pkg-grade-pill grade-${boardGrade}`;
  }
  setText(pillScore, data.score != null ? String(data.score) : '—');
  setText(pillGrade, data.grade ? String(data.grade) : boardGrade);
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
  setText(
    doc.getElementById('s-score-sub'),
    `${data.schemaVersion != null ? `schema v${data.schemaVersion}` : 'schema ?'} · ${formatRelativeAge(data.generatedAt)}`
  );
  setText(
    doc.getElementById('s-actions-sub'),
    summary.openActions
      ? `${summary.openActions} open · review archive candidates`
      : 'no open actions'
  );
  setText(
    doc.getElementById('s-pkg-sub'),
    `${breakdown.roles.consumed} consumed · ${breakdown.roles.dormant} dormant`
  );
  renderRoleMixBar(breakdown, doc);
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
  const ageNote = data.generatedAt ? ` · ${formatRelativeAge(data.generatedAt)}` : '';
  const genEl = doc.getElementById('gen-meta');
  setText(
    genEl,
    `${data.generatedAt || 'unknown time'}${ageNote} · bun ${data.bunVersion || '?'} · ${schemaNote}${gradeNote} · ${data.source}`
  );
  if (genEl && data.generatedAt) {
    genEl.title = formatBakeStamp(data.generatedAt);
  }

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
  void loadPublishPlaneSoftPass(doc);

  const paintPackageTable = () => {
    const body = doc.getElementById('pkg-body');
    const countEl = doc.getElementById('pkg-table-count');
    if (!body) return;
    body.replaceChildren();
    const searchEl = doc.getElementById('pkg-search');
    const sortEl = doc.getElementById('pkg-sort');
    const q = searchEl?.value || '';
    const sortKey = sortEl?.value || 'score-desc';
    let rows = filterPackageRows(data.packages, q);
    rows = sortPackageRows(rows, sortKey);
    // When no explicit sort preference beyond default score-desc, keep grade-first for ops
    if (sortKey === 'score-desc' && !q) {
      rows = [...rows].sort((a, b) => {
        const ga = gradeFromScore(a.score);
        const gb = gradeFromScore(b.score);
        const rank = g =>
          g === 'critical' ? 0 : g === 'needs-improvement' ? 1 : g === 'healthy' ? 2 : 3;
        return (
          rank(ga) - rank(gb) ||
          (typeof b.score === 'number' ? b.score : -1) -
            (typeof a.score === 'number' ? a.score : -1) ||
          String(a.name ?? a.package).localeCompare(String(b.name ?? b.package))
        );
      });
    }
    if (countEl) {
      countEl.textContent = `${rows.length} of ${data.packages.length} packages`;
    }
    if (!data.packages.length) {
      const tr = doc.createElement('tr');
      tr.innerHTML = `<td colspan="5" class="pkg-empty">No package rows in bake</td>`;
      body.appendChild(tr);
      return;
    }
    if (!rows.length) {
      const tr = doc.createElement('tr');
      tr.innerHTML = `<td colspan="5" class="pkg-empty">No packages match “${escapeHtml(q)}”</td>`;
      body.appendChild(tr);
      return;
    }
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
  };

  paintPackageTable();

  const searchEl = doc.getElementById('pkg-search');
  const sortEl = doc.getElementById('pkg-sort');
  if (searchEl && searchEl.dataset.bound !== '1') {
    searchEl.dataset.bound = '1';
    searchEl.addEventListener('input', () => paintPackageTable());
  }
  if (sortEl && sortEl.dataset.bound !== '1') {
    sortEl.dataset.bound = '1';
    sortEl.addEventListener('change', () => paintPackageTable());
  }

  // re-apply role/grade filters if user had them selected
  const graphHost = doc.getElementById('pkg-dep-graph');
  if (graphHost) {
    applyTableFilters(doc, graphHost._pkgRoleFilter || '', graphHost._pkgGradeFilter || '');
  }
  // toolbar copy buttons + local rebake
  bindCopyButtons(doc);
  const toolbarRebake = doc.getElementById('pkg-rebake-toolbar');
  if (toolbarRebake && toolbarRebake.dataset.bound !== '1') {
    toolbarRebake.dataset.bound = '1';
    // reuse same handler as detail panel via synthetic root
    const wrap = doc.createElement('div');
    wrap.innerHTML =
      '<button type="button" id="pkg-rebake-local"></button><p id="pkg-rebake-status"></p>';
    const status = doc.getElementById('pkg-toolbar-status');
    toolbarRebake.addEventListener('click', async () => {
      if (status) status.textContent = 'Rebaking… (local API)';
      try {
        const res = await fetch('/api/packages/graph/rebake', {
          method: 'POST',
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(300_000),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (status) {
            status.textContent = `Rebake unavailable (${res.status}). Use: bun run audit:packages -- --bake`;
          }
          return;
        }
        if (status) {
          status.textContent = `Rebake ok · score=${body.score ?? '—'} · reloading…`;
        }
        if (typeof window !== 'undefined' && typeof window.__pkgBoardReload === 'function') {
          window.__pkgBoardReload();
        } else {
          location.reload();
        }
      } catch (err) {
        if (status) {
          status.textContent = `Rebake failed: ${formatLoadError(err)}. Need bun run serve:public on loopback.`;
        }
      }
    });
  }

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
  // Used by local rebake success path
  if (typeof window !== 'undefined') {
    window.__pkgBoardReload = () => void mountPackagesBoard();
  }
}
