// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/api/http — Bun.serve
/**
 * Concept Registry HTTP handlers — pure fetch(Request) → Response.
 * Wire parse at the boundary only.
 */
import type { Database } from 'bun:sqlite';
import {
  buildConceptGraph,
  graphCentrality,
  graphOrphans,
  graphStaleEdges,
  graphToMermaid,
} from './graph.ts';
import {
  approveConcept,
  archiveConcept,
  defaultAuthor,
  deprecateConcept,
  getConcept,
  listConcepts,
  listUsage,
  listVersions,
  proposeConcept,
} from './repository.ts';
import type { ConceptStatus, ProposeConceptInput } from './types.ts';
import { isConceptStatus, parseNonEmpty } from './types.ts';

function json(data: object | string | number | boolean | null, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

function err(message: string, status = 400): Response {
  return json({ ok: false, error: message }, status);
}

function csvParam(url: URL, key: string): string[] {
  const raw = url.searchParams.get(key);
  if (!raw) return [];
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

async function readJsonBody(req: Request): Promise<unknown> {
  const text = await req.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error('invalid JSON body');
  }
}

function parseProposeBody(raw: unknown): ProposeConceptInput {
  if (!raw || typeof raw !== 'object') throw new Error('body must be object');
  const o = raw as Record<string, unknown>;
  const id = parseNonEmpty(o.id, 'id');
  const label = parseNonEmpty(o.label, 'label');
  const seeAlso = Array.isArray(o.seeAlso)
    ? o.seeAlso.filter((x): x is string => typeof x === 'string')
    : undefined;
  return {
    id,
    label,
    kind: typeof o.kind === 'string' ? o.kind : undefined,
    category: typeof o.category === 'string' ? o.category : undefined,
    group: typeof o.group === 'string' ? o.group : undefined,
    summary: typeof o.summary === 'string' ? o.summary : undefined,
    color: typeof o.color === 'string' ? o.color : undefined,
    unit: typeof o.unit === 'string' ? o.unit : undefined,
    format: typeof o.format === 'string' ? o.format : undefined,
    mapsTo: typeof o.mapsTo === 'string' ? o.mapsTo : undefined,
    seeAlso,
    author: typeof o.author === 'string' ? o.author : undefined,
    correlationId: typeof o.correlationId === 'string' ? o.correlationId : undefined,
  };
}

/**
 * Route concept-registry API. Returns null when path is outside /api/concepts*.
 */
export async function handleConceptRegistryRequest(
  req: Request,
  db: Database
): Promise<Response | null> {
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const method = req.method.toUpperCase();

  if (!path.startsWith('/api/concepts')) return null;

  try {
    // GET /api/concepts/graph
    if (path === '/api/concepts/graph' && method === 'GET') {
      const graph = buildConceptGraph(db);
      const format = url.searchParams.get('output') ?? 'json';
      if (format === 'mermaid') {
        return new Response(graphToMermaid(graph), {
          headers: { 'content-type': 'text/plain; charset=utf-8' },
        });
      }
      const payload: Record<string, unknown> = { ok: true, graph };
      if (url.searchParams.has('centrality')) {
        payload.centrality = graphCentrality(graph);
      }
      if (url.searchParams.has('orphans')) {
        payload.orphans = graphOrphans(graph);
      }
      if (url.searchParams.has('stale')) {
        payload.staleEdges = graphStaleEdges(graph);
      }
      return json(payload);
    }

    // POST /api/concepts/propose
    if (path === '/api/concepts/propose' && method === 'POST') {
      const body = parseProposeBody(await readJsonBody(req));
      const concept = proposeConcept(db, body, body.author ?? defaultAuthor());
      return json({ ok: true, concept }, 201);
    }

    // /api/concepts/:id/...
    const m = path.match(/^\/api\/concepts\/([^/]+)(?:\/(versions|usage|approve|deprecate))?$/);
    if (m) {
      const id = decodeURIComponent(m[1]!); // brand-ok — glossary concept key from path
      const sub = m[2];

      if (sub === 'versions' && method === 'GET') {
        if (!getConcept(db, id)) return err(`not found: ${id}`, 404);
        return json({ ok: true, conceptId: id, versions: listVersions(db, id) });
      }

      if (sub === 'usage' && method === 'GET') {
        if (!getConcept(db, id)) return err(`not found: ${id}`, 404);
        return json({ ok: true, conceptId: id, usage: listUsage(db, id) });
      }

      if (sub === 'approve' && method === 'PATCH') {
        const raw = await readJsonBody(req);
        const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
        const reviewer = typeof o.reviewer === 'string' ? o.reviewer : defaultAuthor();
        const comments = typeof o.comments === 'string' ? o.comments : undefined;
        const concept = approveConcept(db, id, reviewer, comments);
        return json({ ok: true, concept });
      }

      if (sub === 'deprecate' && method === 'PATCH') {
        const raw = await readJsonBody(req);
        const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
        const replaceBy =
          typeof o.replaceBy === 'string'
            ? o.replaceBy
            : typeof o.deprecatedBy === 'string'
              ? o.deprecatedBy
              : undefined;
        const author = typeof o.author === 'string' ? o.author : defaultAuthor();
        const concept = deprecateConcept(db, id, replaceBy, author);
        return json({ ok: true, concept });
      }

      if (!sub && method === 'GET') {
        const concept = getConcept(db, id);
        if (!concept) return err(`not found: ${id}`, 404);
        return json({ ok: true, concept });
      }

      if (!sub && method === 'DELETE') {
        const force = url.searchParams.get('force') === '1';
        const concept = archiveConcept(db, id, defaultAuthor(), force);
        return json({ ok: true, concept });
      }
    }

    // GET /api/concepts
    if (path === '/api/concepts' && method === 'GET') {
      const statusCsv = csvParam(url, 'status');
      const statuses = statusCsv.filter(isConceptStatus) as ConceptStatus[];
      const concepts = listConcepts(db, {
        status: statuses.length > 0 ? statuses : undefined,
        category: csvParam(url, 'category'),
        group: csvParam(url, 'group'),
        q: url.searchParams.get('q') ?? undefined,
        limit: url.searchParams.has('limit') ? Number(url.searchParams.get('limit')) : undefined,
        offset: url.searchParams.has('offset') ? Number(url.searchParams.get('offset')) : undefined,
      });
      return json({ ok: true, count: concepts.length, concepts });
    }

    return err(`no route: ${method} ${path}`, 404);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const status = /not found/i.test(message)
      ? 404
      : /already exists|refusing|cannot/i.test(message)
        ? 409
        : 400;
    return err(message, status);
  }
}

export type ConceptRegistryFetch = (req: Request) => Promise<Response>;

/** Bind a Database into a fetch handler for Bun.serve. */
export function createConceptRegistryFetch(db: Database): ConceptRegistryFetch {
  return async (req: Request) => {
    const res = await handleConceptRegistryRequest(req, db);
    if (res) return res;
    if (new URL(req.url).pathname === '/health') {
      return json({ ok: true, service: 'concept-registry' });
    }
    return err('not found', 404);
  };
}
