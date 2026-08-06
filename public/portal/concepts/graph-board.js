/**
 * Concept graph interactive board — typed seeAlso layers + hop rings.
 * Loads live /graph.json or bake /registry/concepts-graph.json.
 * @see docs/portal-foundation.md
 * @see bun run concept:graph -- --serve
 */
const COLORS = {
  portal: '#58a6ff',
  compliance: '#d2a8ff',
  operations: '#3fb950',
  infrastructure: '#f0883e',
  accounting: '#79c0ff',
  partners: '#ffa657',
  telegram: '#a5d6ff',
  analytics: '#7ee787',
  trading: '#ff7b72',
  marketdata: '#ffa198',
  data: '#e3b341',
  research: '#56d4dd',
  warehouse: '#c9d1d9',
  registry: '#8b949e',
  tbd: '#6e7681',
  hub: '#e6edf3',
};

const LAYER_COLOR = {
  sameGroup: 'rgba(88,166,255,0.7)',
  crossGroup: 'rgba(121,192,255,0.45)',
  crossDomain: 'rgba(210,168,255,0.55)',
  pageBridge: 'rgba(255,166,87,0.55)',
};

const EDGE_COLOR = {
  surface: 'rgba(139,148,158,0.35)',
  domainHub: 'rgba(210,168,255,0.35)',
  group: 'rgba(63,185,80,0.25)',
};

const HOP_ALPHA = { 0: 1, 1: 0.95, 2: 0.55, 3: 0.32 };

const ALL_LAYERS = ['sameGroup', 'crossGroup', 'crossDomain', 'pageBridge'];

/** @param {unknown} err */
export function formatLoadError(err) {
  if (err instanceof Error) return err.message || err.name;
  return String(err);
}

export async function loadConceptGraph() {
  const params = new URLSearchParams(location.search);
  const forced = params.get('src');
  if (forced) {
    const res = await fetch(forced, { cache: 'no-store' });
    if (!res.ok) throw new Error(`graph HTTP ${res.status} (${forced})`);
    return res.json();
  }
  try {
    const live = await fetch('/graph.json', { cache: 'no-store' });
    if (live.ok) {
      const g = await live.json();
      if (g && g.kind === 'concept-graph') return g;
    }
  } catch {
    /* fall through to bake */
  }
  const bake = await fetch('/registry/concepts-graph.json', { cache: 'no-store' });
  if (!bake.ok) throw new Error(`concepts-graph.json HTTP ${bake.status}`);
  return bake.json();
}

/**
 * Build operator-facing coverage and structure insights from the baked graph.
 * @param {object} graph
 * @returns {string}
 */
export function buildInsightsHtml(graph) {
  const summary = graph.summary || {};
  const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  const clusters = (
    (Array.isArray(graph.report?.clusters) && graph.report.clusters) ||
    (Array.isArray(graph.clusters) && graph.clusters) ||
    []
  )
    .slice()
    .sort((a, b) => (b.size ?? 0) - (a.size ?? 0))
    .slice(0, 3);
  const corridors = (Array.isArray(graph.corridors) ? graph.corridors : [])
    .slice()
    .sort((a, b) => (b.edges ?? 0) - (a.edges ?? 0))
    .slice(0, 3);
  const bridges = nodes
    .filter(node => node.nodeKind === 'concept' && (node.bridgeScore ?? 0) > 0)
    .sort((a, b) => b.bridgeScore - a.bridgeScore)
    .slice(0, 3);

  const row = (label, value) =>
    `<div class="stat"><span class="k">${label}</span><span>${value}</span></div>`;
  const rows = [
    row(
      'coverage',
      `used ${summary.used ?? '—'} · unused ${summary.unused ?? '—'} · surface-only ${summary.surfaceOnly ?? '—'}`
    ),
    row(
      'structure',
      `bridges ${summary.bridges ?? '—'} · clusters ${summary.clusters ?? '—'} · corridors ${summary.corridors ?? '—'}`
    ),
  ];
  for (const cluster of clusters) {
    rows.push(
      row(
        'cluster',
        `${String(cluster.id).replace(/^cluster:/, '')} ×${cluster.size} · ${cluster.domain}`
      )
    );
  }
  for (const corridor of corridors) {
    rows.push(row('corridor', `${corridor.fromDomain} → ${corridor.toDomain} ×${corridor.edges}`));
  }
  for (const bridge of bridges) {
    rows.push(row('bridge', `${bridge.id} · ${bridge.bridgeScore}`));
  }
  return rows.join('');
}

/**
 * @param {object} GRAPH
 * @param {{ canvas: HTMLCanvasElement, els: Record<string, HTMLElement|null> }} ui
 */
export function mountConceptGraph(GRAPH, ui) {
  const canvas = ui.canvas;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d unavailable');

  const $ = id => ui.els[id] ?? document.getElementById(id);

  let domainFilter = new URLSearchParams(location.search).get('domain') || '';
  let kindFilter = '';
  let boardFilter = '';
  let query = '';
  let selected = null;
  let dragging = null;
  let frozen = false;
  /** @type {0|1|2|3} */
  let hopDepth = 0;
  /** @type {Map<string, number>} */
  let hopDist = new Map();
  let pathIds = new Set();
  let edgeKinds = new Set(['surface', 'domainHub', 'group']);
  let seeAlsoLayers = new Set(ALL_LAYERS);
  let nodes = [];
  let edges = [];

  function edgeAllowed(e) {
    if (e.kind === 'seeAlso') {
      return e.layer ? seeAlsoLayers.has(e.layer) : false;
    }
    return edgeKinds.has(e.kind);
  }

  function resize() {
    const wrap = canvas.parentElement;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = wrap?.clientWidth || window.innerWidth;
    const h = Math.max(wrap?.clientHeight || 0, window.innerHeight - 58);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function buildAdj() {
    const adj = new Map();
    for (const e of GRAPH.edges) {
      if (!edgeAllowed(e)) continue;
      if (!adj.has(e.source)) adj.set(e.source, []);
      if (!adj.has(e.target)) adj.set(e.target, []);
      adj.get(e.source).push(e.target);
      adj.get(e.target).push(e.source);
    }
    return adj;
  }

  function shortest(from, to) {
    if (!from || !to || from === to) return from ? [from] : null;
    const adj = buildAdj();
    const prev = new Map([[from, null]]);
    const q = [from];
    for (let i = 0; i < q.length; i++) {
      const cur = q[i];
      for (const n of adj.get(cur) || []) {
        if (prev.has(n)) continue;
        prev.set(n, cur);
        if (n === to) {
          const path = [to];
          let p = cur;
          while (p) {
            path.push(p);
            p = prev.get(p);
          }
          return path.reverse();
        }
        q.push(n);
      }
    }
    return null;
  }

  /** @returns {Map<string, number>} */
  function neighborhoodDistances(rootId, depth) {
    const dist = new Map([[rootId, 0]]);
    if (depth <= 0) return dist;
    const adj = buildAdj();
    let frontier = [rootId];
    for (let d = 0; d < depth; d++) {
      const next = [];
      for (const id of frontier) {
        for (const n of adj.get(id) || []) {
          if (dist.has(n)) continue;
          dist.set(n, d + 1);
          next.push(n);
        }
      }
      frontier = next;
    }
    return dist;
  }

  function setHopDepth(depth) {
    hopDepth = /** @type {0|1|2|3} */ (Math.max(0, Math.min(3, depth | 0)));
    for (const btn of document.querySelectorAll('[data-hop]')) {
      const v = Number(btn.getAttribute('data-hop'));
      btn.classList.toggle('active', v === hopDepth);
    }
    initSim();
  }

  function filtered() {
    const q = query.trim().toLowerCase();
    hopDist = new Map();
    if (selected && hopDepth > 0) {
      hopDist = neighborhoodDistances(selected.id, hopDepth);
    }

    const ns = GRAPH.nodes.filter(n => {
      if (hopDist.size > 0 && !hopDist.has(n.id)) return false;
      if (domainFilter && n.domain !== domainFilter && n.domain !== 'hub') return false;
      if (domainFilter && n.nodeKind === 'domainHub' && n.id !== `hub:domain:${domainFilter}`)
        return false;
      if (kindFilter && n.kind !== kindFilter) return false;
      if (boardFilter && !(n.boards || []).includes(boardFilter)) return false;
      if (q && !(n.id + ' ' + n.label).toLowerCase().includes(q)) return false;
      return true;
    });
    const idSet = new Set(ns.map(n => n.id));
    const es = GRAPH.edges.filter(
      e => edgeAllowed(e) && idSet.has(e.source) && idSet.has(e.target)
    );
    return { ns, es };
  }

  function syncHash() {
    if (!selected || selected.nodeKind !== 'concept') return;
    const next = `#concept:${selected.id}`;
    if (location.hash !== next) history.replaceState(null, '', next);
  }

  function initSim() {
    const { ns, es } = filtered();
    const w = canvas.clientWidth || 800;
    const h = canvas.clientHeight || 600;
    const byId = new Map();
    nodes = ns.map((n, i) => {
      const hop = hopDist.has(n.id) ? hopDist.get(n.id) : null;
      const angle = (i / Math.max(ns.length, 1)) * Math.PI * 2;
      const ring =
        hop != null && hopDepth > 0
          ? Math.min(w, h) * (0.08 + hop * 0.12)
          : Math.min(w, h) * (n.nodeKind === 'domainHub' ? 0.08 : 0.32);
      const node = {
        ...n,
        hop,
        x: w / 2 + Math.cos(angle) * ring + (Math.random() - 0.5) * 16,
        y: h / 2 + Math.sin(angle) * ring + (Math.random() - 0.5) * 16,
        vx: 0,
        vy: 0,
      };
      byId.set(n.id, node);
      return node;
    });
    edges = es
      .map(e => ({ ...e, a: byId.get(e.source), b: byId.get(e.target) }))
      .filter(e => e.a && e.b);

    const s = GRAPH.summary || {};
    const byLayer = s.seeAlsoByLayer || {};
    const summaryEl = $('summary');
    if (summaryEl) {
      summaryEl.textContent = `v${GRAPH.schemaVersion ?? '?'} · ${ns.length} nodes · ${es.length} edges · used ${s.used ?? '—'}${GRAPH.focus ? ` · focus ${GRAPH.focus}` : ''}${hopDepth ? ` · hop ${hopDepth}` : ''}`;
    }
    const statsEl = $('stats');
    if (statsEl) {
      statsEl.innerHTML = [
        ['Nodes', ns.length],
        ['Edges', es.length],
        ['sameGroup', byLayer.sameGroup ?? '—'],
        ['crossGroup', byLayer.crossGroup ?? '—'],
        ['crossDomain', byLayer.crossDomain ?? '—'],
        ['pageBridge', byLayer.pageBridge ?? '—'],
        ['surface', s.surfaceEdges ?? '—'],
        ['hubs', s.domainHubEdges ?? '—'],
        ['Usage Σ', s.totalUsage ?? '—'],
      ]
        .map(([k, v]) => `<div class="stat"><span class="k">${k}</span><span>${v}</span></div>`)
        .join('');
    }
    const boardsEl = $('boards');
    if (boardsEl) {
      boardsEl.innerHTML =
        (GRAPH.boardSummary || [])
          .map(
            b =>
              `<div class="stat"><span class="k">${b.board}</span><span>${b.concepts}</span></div>`
          )
          .join('') || '<div class="meta">none</div>';
    }
    const insightsEl = $('insights');
    if (insightsEl) insightsEl.innerHTML = buildInsightsHtml(GRAPH);
    const domains = [
      ...new Set(ns.filter(n => n.nodeKind === 'concept').map(n => n.domain)),
    ].sort();
    const legendEl = $('legend');
    if (legendEl) {
      const layerSwatches = ALL_LAYERS.map(
        L => `<span class="swatch" style="border-color:${LAYER_COLOR[L]};color:#e6edf3">${L}</span>`
      ).join('');
      const hopHint =
        '<span class="swatch" title="hop rings">hop 0 solid · 1 bright · 2 mid · 3 dim</span>';
      legendEl.innerHTML =
        layerSwatches +
        hopHint +
        domains
          .map(
            d =>
              `<span class="swatch" style="border-color:${COLORS[d] || '#8b949e'};color:${COLORS[d] || '#8b949e'}">${d}</span>`
          )
          .join('');
    }
    const domainSel = $('domain');
    if (domainSel) {
      const cur = domainFilter;
      domainSel.innerHTML =
        `<option value="">all</option>` +
        domains.map(d => `<option value="${d}">${d}</option>`).join('');
      if ([...domainSel.options].some(o => o.value === cur)) domainSel.value = cur;
    }
    const boardSel = $('board');
    if (boardSel) {
      const boards = (GRAPH.boardSummary || []).map(b => b.board);
      const cur = boardFilter;
      boardSel.innerHTML =
        `<option value="">all</option>` +
        boards.map(b => `<option value="${b}">${b}</option>`).join('');
      if ([...boardSel.options].some(o => o.value === cur)) boardSel.value = cur;
    }
    recomputePath();
  }

  function recomputePath() {
    pathIds = new Set();
    const pathTo = $('pathTo');
    if (!selected || !pathTo || !pathTo.value.trim()) return;
    const path = shortest(selected.id, pathTo.value.trim());
    if (path) path.forEach(id => pathIds.add(id));
  }

  function tick() {
    if (frozen) return;
    const w = canvas.clientWidth || 800;
    const h = canvas.clientHeight || 600;
    const n = nodes.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = nodes[i];
        const b = nodes[j];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        const dist2 = dx * dx + dy * dy || 0.01;
        const force =
          (a.nodeKind === 'domainHub' || b.nodeKind === 'domainHub' ? 2200 : 1400) / dist2;
        const dist = Math.sqrt(dist2);
        dx /= dist;
        dy /= dist;
        a.vx += dx * force;
        a.vy += dy * force;
        b.vx -= dx * force;
        b.vy -= dy * force;
      }
    }
    for (const e of edges) {
      const a = e.a;
      const b = e.b;
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const rest = e.kind === 'domainHub' ? 110 : e.kind === 'surface' ? 70 : 95;
      const diff = dist - rest;
      const k = 0.015 * (e.weight || 1);
      dx = (dx / dist) * diff * k;
      dy = (dy / dist) * diff * k;
      a.vx += dx;
      a.vy += dy;
      b.vx -= dx;
      b.vy -= dy;
    }
    for (const node of nodes) {
      if (dragging === node) continue;
      if (hopDepth > 0 && node.hop != null) {
        const targetR = Math.min(w, h) * (0.08 + node.hop * 0.12);
        const cx = w / 2;
        const cy = h / 2;
        const ang = Math.atan2(node.y - cy, node.x - cx);
        const tx = cx + Math.cos(ang) * targetR;
        const ty = cy + Math.sin(ang) * targetR;
        node.vx += (tx - node.x) * 0.01;
        node.vy += (ty - node.y) * 0.01;
      } else {
        node.vx += (w / 2 - node.x) * 0.0018;
        node.vy += (h / 2 - node.y) * 0.0018;
      }
      node.vx *= 0.86;
      node.vy *= 0.86;
      node.x += node.vx;
      node.y += node.vy;
      node.x = Math.max(18, Math.min(w - 18, node.x));
      node.y = Math.max(18, Math.min(h - 18, node.y));
    }
  }

  function strokeForEdge(e, onPath) {
    if (onPath) return 'rgba(63,185,80,0.9)';
    if (e.kind === 'seeAlso' && e.layer) return LAYER_COLOR[e.layer] || LAYER_COLOR.crossGroup;
    return EDGE_COLOR[e.kind] || 'rgba(88,166,255,0.3)';
  }

  function draw() {
    const w = canvas.clientWidth || 800;
    const h = canvas.clientHeight || 600;
    ctx.clearRect(0, 0, w, h);
    for (const e of edges) {
      const onPath = pathIds.has(e.a.id) && pathIds.has(e.b.id);
      ctx.strokeStyle = strokeForEdge(e, onPath);
      ctx.lineWidth = onPath ? 2.5 : e.kind === 'seeAlso' ? 1.2 + (e.weight || 1) * 0.15 : 1;
      if (e.kind === 'domainHub') ctx.setLineDash([4, 4]);
      else if (e.kind === 'surface') ctx.setLineDash([2, 3]);
      else if (e.kind === 'seeAlso' && e.layer === 'pageBridge') ctx.setLineDash([6, 3]);
      else ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(e.a.x, e.a.y);
      ctx.lineTo(e.b.x, e.b.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    const showLabels = $('labels')?.checked ?? true;
    const usageSize = $('usageSize')?.checked ?? true;
    for (const node of nodes) {
      const color = COLORS[node.domain] || COLORS.hub;
      let r = node.nodeKind === 'domainHub' ? 14 : 4 + Math.min(10, node.degree);
      if (usageSize && node.nodeKind === 'concept') r += Math.min(8, Math.sqrt(node.usageUi || 0));
      const dim = selected && selected !== node && !pathIds.has(node.id);
      const hopAlpha = hopDepth > 0 && node.hop != null ? (HOP_ALPHA[node.hop] ?? 0.25) : 1;
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.globalAlpha = dim ? 0.18 : hopAlpha;
      if (node.nodeKind === 'domainHub') ctx.ellipse(node.x, node.y, r * 1.4, r, 0, 0, Math.PI * 2);
      else ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fill();
      if (selected === node || pathIds.has(node.id) || (hopDepth > 0 && node.hop === 0)) {
        ctx.strokeStyle = pathIds.has(node.id) ? '#3fb950' : '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (hopDepth > 0 && node.hop === 1) {
        ctx.strokeStyle = 'rgba(88,166,255,0.7)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      if (
        showLabels &&
        (node.nodeKind === 'domainHub' ||
          node.degree > 2 ||
          selected === node ||
          pathIds.has(node.id) ||
          (hopDepth > 0 && node.hop != null && node.hop <= 1) ||
          query)
      ) {
        ctx.globalAlpha = 0.92;
        ctx.fillStyle = '#e6edf3';
        ctx.font = `${node.nodeKind === 'domainHub' ? '600 ' : ''}11px ui-sans-serif, system-ui`;
        const hopTag = hopDepth > 0 && node.hop != null && node.hop > 0 ? ` ·${node.hop}` : '';
        ctx.fillText(node.label + hopTag, node.x + r + 4, node.y + 3);
      }
      ctx.globalAlpha = 1;
    }
  }

  function loop() {
    for (let i = 0; i < 2; i++) tick();
    draw();
    requestAnimationFrame(loop);
  }

  function pick(x, y) {
    let best = null;
    let bestD = 16;
    for (const node of nodes) {
      const d = Math.hypot(node.x - x, node.y - y);
      if (d < bestD) {
        best = node;
        bestD = d;
      }
    }
    return best;
  }

  function showDetail(node) {
    selected = node;
    recomputePath();
    syncHash();
    const detail = $('detail');
    if (!detail) return;
    if (!node) {
      detail.textContent = 'Click a node · hops 0–3 · layer chips · / search · f freeze · e PNG';
      return;
    }
    const neighbors = edges
      .filter(e => e.a === node || e.b === node)
      .map(e => {
        const other = e.a === node ? e.b : e.a;
        const layer = e.kind === 'seeAlso' && e.layer ? `/${e.layer}` : '';
        return `${other.id} (${e.kind}${layer})`;
      });
    const pathTo = $('pathTo')?.value?.trim();
    const path = pathTo ? shortest(node.id, pathTo) : null;
    const hopLabel = hopDepth > 0 && hopDist.has(node.id) ? ` · hop ${hopDist.get(node.id)}` : '';
    detail.innerHTML =
      `<div class="id">${node.id}</div>` +
      `<div><strong>${node.label}</strong>${hopLabel}</div>` +
      `<div>kind · ${node.kind} · ${node.nodeKind}</div>` +
      `<div>domain · ${node.domain} (${node.domainLabel})</div>` +
      `<div>namespace · ${node.namespace} · group · ${node.group}</div>` +
      `<div>usage ui/surface · ${node.usageUi} / ${node.usageSurface} · degree · ${node.degree}</div>` +
      `<div>boards · ${node.boards?.length ? node.boards.join(', ') : '—'}</div>` +
      `<div>provenance · ${node.provenance || '—'}</div>` +
      (path ? `<div style="margin-top:8px;color:#3fb950">path · ${path.join(' → ')}</div>` : '') +
      (neighbors.length
        ? `<div style="margin-top:8px">neighbors · ${neighbors.slice(0, 14).join(', ')}${neighbors.length > 14 ? '…' : ''}</div>`
        : '') +
      (node.nodeKind === 'concept'
        ? `<div style="margin-top:8px"><a href="/portal/glossary/#glossary:${encodeURIComponent(node.id)}">glossary</a> · <a href="/portal/concepts/">inventory</a> · <button type="button" class="chip" id="btn-hop2">hop 2</button></div>`
        : '');
    $('btn-hop2')?.addEventListener('click', () => setHopDepth(2));
    if (hopDepth > 0) initSim();
  }

  function xy(ev) {
    const rect = canvas.getBoundingClientRect();
    return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
  }

  function exportPng() {
    const a = document.createElement('a');
    a.download = `concept-graph-${new Date().toISOString().slice(0, 10)}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(GRAPH, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.download = 'concepts-graph.json';
    a.href = URL.createObjectURL(blob);
    a.click();
    URL.revokeObjectURL(a.href);
  }

  canvas.addEventListener('pointerdown', ev => {
    const p = xy(ev);
    const node = pick(p.x, p.y);
    if (node) {
      dragging = node;
      showDetail(node);
      canvas.setPointerCapture(ev.pointerId);
    } else showDetail(null);
  });
  canvas.addEventListener('pointermove', ev => {
    if (!dragging) return;
    const p = xy(ev);
    dragging.x = p.x;
    dragging.y = p.y;
    dragging.vx = 0;
    dragging.vy = 0;
  });
  canvas.addEventListener('pointerup', () => {
    dragging = null;
  });
  canvas.addEventListener('dblclick', ev => {
    const p = xy(ev);
    const node = pick(p.x, p.y);
    if (!node) {
      setHopDepth(0);
      return;
    }
    selected = node;
    setHopDepth(hopDepth || 2);
    showDetail(node);
  });

  $('domain')?.addEventListener('change', e => {
    domainFilter = e.target.value;
    initSim();
  });
  $('kind')?.addEventListener('change', e => {
    kindFilter = e.target.value;
    initSim();
  });
  $('board')?.addEventListener('change', e => {
    boardFilter = e.target.value;
    initSim();
  });
  $('q')?.addEventListener('input', e => {
    query = e.target.value;
    initSim();
  });
  $('pathTo')?.addEventListener('input', () => {
    recomputePath();
    if (selected) showDetail(selected);
  });
  $('exportPng')?.addEventListener('click', exportPng);
  $('exportJson')?.addEventListener('click', exportJson);
  $('freeze')?.addEventListener('change', e => {
    frozen = !!e.target.checked;
  });

  for (const btn of document.querySelectorAll('[data-ek]')) {
    btn.addEventListener('click', () => {
      const k = btn.getAttribute('data-ek');
      if (!k) return;
      if (edgeKinds.has(k)) {
        edgeKinds.delete(k);
        btn.classList.remove('active');
      } else {
        edgeKinds.add(k);
        btn.classList.add('active');
      }
      initSim();
    });
  }

  for (const btn of document.querySelectorAll('[data-layer]')) {
    btn.addEventListener('click', () => {
      const layer = btn.getAttribute('data-layer');
      if (!layer) return;
      if (seeAlsoLayers.has(layer)) {
        seeAlsoLayers.delete(layer);
        btn.classList.remove('active');
      } else {
        seeAlsoLayers.add(layer);
        btn.classList.add('active');
      }
      initSim();
    });
  }

  for (const btn of document.querySelectorAll('[data-hop]')) {
    btn.addEventListener('click', () => {
      const v = Number(btn.getAttribute('data-hop'));
      setHopDepth(Number.isFinite(v) ? v : 0);
    });
  }

  window.addEventListener('keydown', ev => {
    if (ev.target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(ev.target.tagName)) {
      if (ev.key === 'Escape') ev.target.blur();
      return;
    }
    if (ev.key === '/') {
      ev.preventDefault();
      $('q')?.focus();
    } else if (ev.key === '0') {
      setHopDepth(0);
    } else if (ev.key === '1' || ev.key === '2' || ev.key === '3') {
      setHopDepth(Number(ev.key));
    } else if (ev.key === 'f') {
      frozen = !frozen;
      const box = $('freeze');
      if (box) box.checked = frozen;
    } else if (ev.key === 'e') {
      exportPng();
    } else if (ev.key === 'Escape') {
      setHopDepth(0);
      selected = null;
      showDetail(null);
      initSim();
    }
  });

  // Deep-link #concept:id
  const hash = location.hash.match(/^#concept:(.+)$/);
  if (hash?.[1]) {
    const node = GRAPH.nodes.find(n => n.id === hash[1]);
    if (node) {
      selected = node;
      hopDepth = 1;
    }
  }

  window.addEventListener('resize', resize);
  resize();
  for (const btn of document.querySelectorAll('[data-hop]')) {
    btn.classList.toggle('active', Number(btn.getAttribute('data-hop')) === hopDepth);
  }
  initSim();
  if (selected) showDetail(selected);
  loop();
  return { exportPng, exportJson, initSim, setHopDepth };
}

async function main() {
  const status = document.getElementById('summary');
  try {
    const graph = await loadConceptGraph();
    const canvas = document.getElementById('c');
    if (!canvas) throw new Error('missing canvas');
    mountConceptGraph(graph, { canvas, els: {} });
  } catch (err) {
    if (status) {
      status.textContent = `unavailable — ${formatLoadError(err)} · run bun run concept:graph:bake`;
    }
  }
}

if (typeof document !== 'undefined' && document.getElementById('c')) {
  main();
}
