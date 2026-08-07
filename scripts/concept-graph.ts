#!/usr/bin/env bun
// @see https://bun.com/docs/bundler/bytecode#with-standalone-executables — --format
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve
// @see https://bun.com/docs/runtime/http/server#changing-the-port-and-hostname — Bun.serve port
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * Deep concept relationship graph — seeAlso · surface · domain hubs · usage.
 *
 *   bun run concept:graph -- --format interactive --serve --BUNPORT
 *   bun run concept:graph -- --focus ops.limits.account --depth 2 --serve
 *   bun run concept:graph -- --bake
 *   bun run concept:graph -- --format json --domain compliance --no-hubs
 */
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
import { colorize, jsonOut, logTable } from '../lib/console-depth.ts';
import { joinPath, normalizePath, resolvePath } from '../lib/path-bun.ts';
import {
  buildConceptGraphAsync,
  conceptGraphToDot,
  conceptGraphToMermaid,
  egoNeighborhoodDistances,
  filterGraphBySeeAlsoLayers,
  isSeeAlsoLayer,
  shortestPath,
  type ConceptGraph,
  type SeeAlsoLayer,
} from '../lib/portal/concept-graph.ts';

const ROOT = resolvePath(import.meta.dir, '..');
const PUBLIC_ROOT = joinPath(ROOT, 'public');
const BAKE_PATH = joinPath(PUBLIC_ROOT, 'registry/concepts-graph.json');

export type ConceptGraphFormat = 'table' | 'json' | 'mermaid' | 'dot' | 'interactive';

export type ConceptGraphOptions = {
  format: ConceptGraphFormat;
  serve: boolean;
  bunPort: boolean;
  port?: number;
  domains: string[];
  namespaces: string[];
  domainHubs: boolean;
  surfaceEdges: boolean;
  groupEdges: boolean;
  minDegree: number;
  focus?: string;
  depth: number;
  pathFrom?: string;
  pathTo?: string;
  /** Display/serve filter only — bake always writes full layers. */
  seeAlsoLayers: SeeAlsoLayer[];
  bake: boolean;
  open: boolean;
  help: boolean;
};

function argValue(argv: readonly string[], flag: string): string | undefined {
  const eq = argv.find(a => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);
  const i = argv.indexOf(flag);
  if (i !== -1) return argv[i + 1];
  return undefined;
}

function resolveCsv(argv: readonly string[], flag: string, envKey: string): string[] {
  const raw = argValue(argv, flag) ?? Bun.env[envKey];
  if (!raw) return [];
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function parseFormat(raw: string | undefined): ConceptGraphFormat {
  if (
    raw === 'json' ||
    raw === 'mermaid' ||
    raw === 'dot' ||
    raw === 'interactive' ||
    raw === 'table'
  ) {
    return raw;
  }
  return 'table';
}

export function parseConceptGraphOptions(argv: readonly string[] = Bun.argv): ConceptGraphOptions {
  const formatRaw =
    argValue(argv, '--format') ?? Bun.env.CONCEPT_GRAPH_FORMAT ?? Bun.env.CONCEPT_GRAPH_OUTPUT;
  const portRaw = argValue(argv, '--port') ?? Bun.env.CONCEPT_GRAPH_PORT;
  const depthRaw = argValue(argv, '--depth') ?? Bun.env.CONCEPT_GRAPH_DEPTH;
  const minDegRaw = argValue(argv, '--min-degree') ?? Bun.env.CONCEPT_GRAPH_MIN_DEGREE;
  const bunPort =
    argv.includes('--BUNPORT') ||
    argv.includes('--bunport') ||
    argv.includes('--bun-port') ||
    Bun.env.CONCEPT_GRAPH_BUNPORT === '1';

  let port: number | undefined;
  if (portRaw !== undefined) {
    const n = Number.parseInt(portRaw, 10);
    if (Number.isFinite(n) && n >= 0) port = n;
  }

  const depth = Number.parseInt(depthRaw ?? '2', 10);
  const minDegree = Number.parseInt(minDegRaw ?? '0', 10);
  const seeAlsoLayers = resolveCsv(argv, '--see-also-layer', 'CONCEPT_GRAPH_SEE_ALSO_LAYER').filter(
    isSeeAlsoLayer
  );

  return {
    format: parseFormat(formatRaw),
    serve: argv.includes('--serve'),
    bunPort,
    port,
    domains: resolveCsv(argv, '--domain', 'CONCEPT_GRAPH_DOMAIN'),
    namespaces: resolveCsv(argv, '--namespace', 'CONCEPT_GRAPH_NAMESPACE'),
    domainHubs: !(argv.includes('--no-hubs') || Bun.env.CONCEPT_GRAPH_NO_HUBS === '1'),
    surfaceEdges: !(argv.includes('--no-surface') || Bun.env.CONCEPT_GRAPH_NO_SURFACE === '1'),
    groupEdges: argv.includes('--group-edges') || Bun.env.CONCEPT_GRAPH_GROUP_EDGES === '1',
    minDegree: Number.isFinite(minDegree) ? minDegree : 0,
    focus: argValue(argv, '--focus') ?? Bun.env.CONCEPT_GRAPH_FOCUS,
    depth: Number.isFinite(depth) ? depth : 2,
    pathFrom: argValue(argv, '--path-from'),
    pathTo: argValue(argv, '--path-to'),
    seeAlsoLayers,
    bake: argv.includes('--bake'),
    open: argv.includes('--open'),
    help: argv.includes('--help') || argv.includes('-h'),
  };
}

function printHelp(): void {
  console.log(`concept:graph — deep portal concept relationship graph (schema v3)

Usage:
  bun run concept:graph [--format table|json|mermaid|dot|interactive] [--serve]

Deep options:
  --domain / --namespace   Filter business domain / vocab namespace
  --focus <id>             Ego-network around a concept
  --depth N                Hops from focus (default 2)
  --path-from / --path-to  Print shortest path (JSON/table)
  --see-also-layer L,L     Display/serve filter: sameGroup,crossGroup,crossDomain,pageBridge
  --no-hubs                Omit domain hub nodes
  --no-surface             Omit surface co-membership edges
  --group-edges            Add soft same-group edges
  --min-degree N           Drop concept nodes below degree N
  --bake                   Write public/registry/concepts-graph.json (full layers)

Serve:
  --serve · --port N · --BUNPORT · --open

Examples:
  bun run concept:graph -- --format interactive --serve --BUNPORT
  bun run concept:graph -- --focus ops.limits.account --depth 2 --serve --port 3043
  bun run concept:graph -- --bake
  bun run concept:graph -- --see-also-layer sameGroup,crossDomain --format table
  bun run concept:graph -- --path-from ui.semantic.status --path-to ui.semantic.source
`);
}

function interactiveRedirectNote(url = 'http://localhost:3043/portal/concepts/graph/'): string {
  return `Concept graph interactive UI lives at the portal board.

  Open:  ${url}
  Serve: bun run concept:graph -- --format interactive --serve --BUNPORT
  Bake:  bun run concept:graph:bake  → /registry/concepts-graph.json
`;
}

async function bakeGraph(graph: ConceptGraph): Promise<void> {
  await Bun.write(BAKE_PATH, `${JSON.stringify(graph, null, 2)}\n`);
  console.log(
    colorize(
      `baked ${BAKE_PATH} · nodes=${graph.summary.nodes} edges=${graph.summary.edges}`,
      '#3fb950'
    )
  );
}

function contentTypeFor(filePath: string): string {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  if (filePath.endsWith('.png')) return 'image/png';
  if (filePath.endsWith('.woff2')) return 'font/woff2';
  return 'application/octet-stream';
}

async function serveStaticPublic(pathname: string): Promise<Response | null> {
  let rel = pathname.startsWith('/') ? pathname.slice(1) : pathname;
  if (!rel || rel.endsWith('/')) rel = `${rel}index.html`;
  const abs = normalizePath(joinPath(PUBLIC_ROOT, rel));
  const rootPrefix = PUBLIC_ROOT.endsWith('/') ? PUBLIC_ROOT : `${PUBLIC_ROOT}/`;
  if (abs !== PUBLIC_ROOT && !abs.startsWith(rootPrefix)) {
    return new Response('Forbidden', { status: 403 });
  }
  const file = Bun.file(abs);
  if (!(await file.exists())) return null;
  return new Response(file, {
    headers: {
      'content-type': contentTypeFor(abs),
      'cache-control': 'no-store',
    },
  });
}

async function serveGraph(graph: ConceptGraph, opts: ConceptGraphOptions): Promise<void> {
  const json = `${JSON.stringify(graph, null, 2)}\n`;

  const serveOpts: Parameters<typeof Bun.serve>[0] = {
    async fetch(req) {
      const url = new URL(req.url);
      const path = url.pathname;

      if (path === '/graph.json' || path === '/api/graph') {
        return new Response(json, {
          headers: {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'no-store',
          },
        });
      }
      if (path === '/health' || path === '/api/health') {
        return Response.json({
          ok: true,
          kind: 'concept-graph',
          schemaVersion: graph.schemaVersion,
          nodes: graph.summary.nodes,
          edges: graph.summary.edges,
          used: graph.summary.used,
          focus: graph.focus ?? null,
        });
      }
      if (path === '/api/path') {
        const from = url.searchParams.get('from') ?? '';
        const to = url.searchParams.get('to') ?? '';
        const pathIds = from && to ? shortestPath(graph.edges, from, to) : null;
        return Response.json({ from, to, path: pathIds });
      }
      if (path === '/api/ego') {
        const id = url.searchParams.get('id') ?? '';
        const depth = Number.parseInt(url.searchParams.get('depth') ?? '2', 10);
        if (!id) return Response.json({ error: 'id required' }, { status: 400 });
        const layers = (url.searchParams.get('layers') ?? '')
          .split(',')
          .map(s => s.trim())
          .filter(isSeeAlsoLayer);
        const kindsRaw = (url.searchParams.get('kinds') ?? '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
        // When layers are set without kinds, hop over seeAlso only (avoid hub pollution).
        const kinds = (kindsRaw.length ? kindsRaw : layers.length ? ['seeAlso'] : undefined) as
          Array<'seeAlso' | 'surface' | 'group' | 'domainHub'> | undefined;
        const hopDepth = Number.isFinite(depth) ? depth : 2;
        const distances = egoNeighborhoodDistances(graph.edges, id, hopDepth, {
          kinds,
          layers: layers.length ? layers : undefined,
        });
        const keep = new Set(distances.keys());
        const nodes = graph.nodes.filter(n => keep.has(n.id));
        const edges = graph.edges.filter(e => {
          if (!keep.has(e.source) || !keep.has(e.target)) return false;
          if (kinds && !kinds.includes(e.kind)) return false;
          if (layers.length && e.kind === 'seeAlso' && (!e.layer || !layers.includes(e.layer))) {
            return false;
          }
          return true;
        });
        return Response.json({
          id,
          depth: hopDepth,
          layers,
          kinds: kinds ?? null,
          distances: Object.fromEntries(distances),
          nodes,
          edges,
          summary: { nodes: nodes.length, edges: edges.length },
        });
      }
      if (path === '/' || path === '/index.html') {
        return Response.redirect(new URL('/portal/concepts/graph/', url).toString(), 302);
      }

      const staticRes = await serveStaticPublic(path);
      if (staticRes) return staticRes;
      return new Response('Not found', { status: 404 });
    },
  };

  if (opts.port !== undefined) serveOpts.port = opts.port;
  else if (!opts.bunPort) serveOpts.port = 3043;

  const server = Bun.serve(serveOpts);
  const board = new URL('/portal/concepts/graph/', server.url).toString();
  console.log(
    colorize(
      `concept:graph · interactive v${graph.schemaVersion} · ${board} · nodes=${graph.summary.nodes} edges=${graph.summary.edges}`,
      '#3fb950'
    )
  );
  console.log(
    colorize(
      `  board · /graph.json · /api/health · /api/path · /api/ego · static public/`,
      '#8b949e'
    )
  );
  if (opts.open) Bun.spawn(['open', board], { stdout: 'ignore', stderr: 'ignore' });
  await new Promise(() => {});
}

export async function runConceptGraph(opts: ConceptGraphOptions): Promise<ConceptGraph> {
  const full = await buildConceptGraphAsync({
    domains: opts.domains,
    namespaces: opts.namespaces,
    domainHubs: opts.domainHubs,
    surfaceEdges: opts.surfaceEdges,
    groupEdges: opts.groupEdges,
    minDegree: opts.minDegree,
    focus: opts.focus,
    depth: opts.depth,
  });

  // Bake always persists full typed layers (ignore display filter).
  if (opts.bake) await bakeGraph(full);

  const graph =
    opts.seeAlsoLayers.length > 0 ? filterGraphBySeeAlsoLayers(full, opts.seeAlsoLayers) : full;

  if (opts.pathFrom && opts.pathTo) {
    const path = shortestPath(graph.edges, opts.pathFrom, opts.pathTo);
    if (opts.format === 'json') {
      jsonOut({ path, from: opts.pathFrom, to: opts.pathTo, graph: graph.summary });
    } else {
      console.log(
        path
          ? colorize(`path · ${path.join(' → ')}`, '#3fb950')
          : colorize(`no path · ${opts.pathFrom} ↛ ${opts.pathTo}`, '#f85149')
      );
    }
    if (!opts.serve && opts.format !== 'interactive') return graph;
  }

  if (opts.serve || opts.format === 'interactive') {
    if (opts.serve) {
      await serveGraph(graph, opts);
      return graph;
    }
    process.stdout.write(interactiveRedirectNote());
    return graph;
  }

  if (opts.format === 'json') {
    jsonOut(graph);
    return graph;
  }
  if (opts.format === 'mermaid') {
    process.stdout.write(conceptGraphToMermaid(graph));
    return graph;
  }
  if (opts.format === 'dot') {
    process.stdout.write(conceptGraphToDot(graph));
    return graph;
  }

  const layers = graph.summary.seeAlsoByLayer;
  console.log(
    colorize(
      `concept:graph v3 · nodes=${graph.summary.nodes} · edges=${graph.summary.edges} · used=${graph.summary.used} · hubs=${graph.summary.domainHubEdges}`,
      '#58a6ff'
    )
  );
  console.log(
    colorize(
      `  seeAlso · sameGroup=${layers.sameGroup} crossGroup=${layers.crossGroup} crossDomain=${layers.crossDomain} pageBridge=${layers.pageBridge}`,
      '#8b949e'
    )
  );
  if (graph.domainSummary.length > 0) {
    logTable(graph.domainSummary, ['domain', 'nodes', 'edges', 'usage']);
  }
  logTable(
    graph.nodes
      .filter(n => n.nodeKind === 'concept')
      .slice(0, 35)
      .map(n => ({
        id: n.id,
        domain: n.domain,
        kind: n.kind,
        degree: n.degree,
        usage: n.usageUi,
        boards: n.boards.length,
      })),
    ['id', 'domain', 'kind', 'degree', 'usage', 'boards']
  );
  return graph;
}

async function main(): Promise<void> {
  const argv = applyUnknownLongOptionGuardFor('concept:graph', Bun.argv.slice(2));
  const opts = parseConceptGraphOptions(argv);
  if (opts.help) {
    printHelp();
    return;
  }
  await runConceptGraph(opts);
}

if (import.meta.main) {
  await main();
}
