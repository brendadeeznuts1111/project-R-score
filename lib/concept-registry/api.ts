// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/blog/bun-v1.3.4#urlpattern-api — URLPattern components
// @see https://bun.com/docs/runtime/http/server#changing-the-port-and-hostname — Bun.serve port/hostname
// lib/concept-registry/api.ts — Concept Registry HTTP API (Phase 1).
//
// Routes (wire boundary: zod parse at the edge, typed rows interior):
//
//   GET    /api/concepts?status=&category=&group=&limit=&offset=
//   GET    /api/concepts/graph
//   POST   /api/concepts/propose             { id, label, ... }
//   GET    /api/concepts/:id
//   GET    /api/concepts/:id/versions
//   GET    /api/concepts/:id/usage
//   GET    /api/concepts/:id/reviews
//   PATCH  /api/concepts/:id/approve         { reviewer?, comments? }
//   PATCH  /api/concepts/:id/reject          { reviewer?, comments? }
//   PATCH  /api/concepts/:id/deprecate       { replaceBy? }
//   DELETE /api/concepts/:id                 { force: true }  (soft archive)
//
// Every mutation goes through the repository layer, which bumps an immutable
// version snapshot. Errors map: 400 zod, 404 not-found, 405 method, 409
// conflict / invalid transition.

import {
  approveConcept,
  archiveConcept,
  buildConceptGraph,
  ConceptRegistryError,
  countConcepts,
  deprecateConcept,
  getConcept,
  getConceptReviews,
  getConceptUsage,
  getConceptVersions,
  listConcepts,
  proposeConcept,
  rejectConcept,
} from './repo.ts';
import {
  ConceptApproveBodySchema,
  ConceptArchiveBodySchema,
  ConceptDeprecateBodySchema,
  ConceptListQuerySchema,
  ConceptProposeBodySchema,
  ConceptRejectBodySchema,
} from './types.ts';

import type { Database } from 'bun:sqlite';

function jsonError(status: number, error: string, id?: string): Response {
  // brand-ok — glossary concept key
  return Response.json({ error, ...(id ? { id } : {}) }, { status });
}

// eslint-disable-next-line harness/no-unknown-function-param -- wire boundary: catch-all mapping for repo throws
function handleRegistryError(err: unknown): Response {
  if (err instanceof ConceptRegistryError) {
    const status = err.kind === 'not-found' ? 404 : 409;
    return jsonError(status, err.message);
  }
  return jsonError(500, err instanceof Error ? err.message : String(err));
}

async function readBody<T>(
  req: Request,
  schema: {
    safeParse(
      // eslint-disable-next-line harness/no-unknown-function-param -- wire boundary: zod parses the raw request body
      data: unknown
    ):
      | { success: true; data: T }
      | { success: false; error: { issues: Array<{ message: string }> } };
  }
): Promise<T | Response> {
  let raw: unknown;
  try {
    raw = (await req.json()) as unknown;
  } catch {
    return jsonError(400, 'invalid JSON body');
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    return jsonError(400, result.error.issues[0]?.message ?? 'invalid body');
  }
  return result.data;
}

type ParamHandler = (req: Request, id: string) => Response | Promise<Response>; // brand-ok — glossary concept key

/** Build the fetch handler for the Concept Registry API. */
export function conceptRegistryFetch(db: Database): (req: Request) => Promise<Response> | Response {
  const getById: ParamHandler = (_, id) => {
    const concept = getConcept(db, id);
    if (!concept) return jsonError(404, 'concept not found', id);
    return Response.json(concept);
  };
  const versions: ParamHandler = (_, id) => {
    if (!getConcept(db, id)) return jsonError(404, 'concept not found', id);
    return Response.json({ conceptId: id, versions: getConceptVersions(db, id) });
  };
  const usage: ParamHandler = (_, id) => {
    if (!getConcept(db, id)) return jsonError(404, 'concept not found', id);
    return Response.json({ conceptId: id, usage: getConceptUsage(db, id) });
  };
  const reviews: ParamHandler = (_, id) => {
    if (!getConcept(db, id)) return jsonError(404, 'concept not found', id);
    return Response.json({ conceptId: id, reviews: getConceptReviews(db, id) });
  };

  const approve: ParamHandler = async (req, id) => {
    const body = await readBody(req, ConceptApproveBodySchema);
    if (body instanceof Response) return body;
    try {
      return Response.json(approveConcept(db, id, body.reviewer ?? null, body.comments ?? null));
    } catch (err) {
      return handleRegistryError(err);
    }
  };
  const reject: ParamHandler = async (req, id) => {
    const body = await readBody(req, ConceptRejectBodySchema);
    if (body instanceof Response) return body;
    try {
      return Response.json(rejectConcept(db, id, body.reviewer ?? null, body.comments ?? null));
    } catch (err) {
      return handleRegistryError(err);
    }
  };
  const deprecate: ParamHandler = async (req, id) => {
    const body = await readBody(req, ConceptDeprecateBodySchema);
    if (body instanceof Response) return body;
    try {
      return Response.json(deprecateConcept(db, id, body.replaceBy));
    } catch (err) {
      return handleRegistryError(err);
    }
  };
  const archive: ParamHandler = async (req, id) => {
    const body = await readBody(req, ConceptArchiveBodySchema);
    if (body instanceof Response) return body;
    if (!body.force) {
      return jsonError(400, 'soft archive requires { force: true }');
    }
    try {
      return Response.json(archiveConcept(db, id));
    } catch (err) {
      return handleRegistryError(err);
    }
  };

  const paramRoutes: Array<{ pattern: URLPattern; method: string; handler: ParamHandler }> = [
    { pattern: new URLPattern({ pathname: '/api/concepts/:id' }), method: 'GET', handler: getById },
    {
      pattern: new URLPattern({ pathname: '/api/concepts/:id/versions' }),
      method: 'GET',
      handler: versions,
    },
    {
      pattern: new URLPattern({ pathname: '/api/concepts/:id/usage' }),
      method: 'GET',
      handler: usage,
    },
    {
      pattern: new URLPattern({ pathname: '/api/concepts/:id/reviews' }),
      method: 'GET',
      handler: reviews,
    },
    {
      pattern: new URLPattern({ pathname: '/api/concepts/:id/approve' }),
      method: 'PATCH',
      handler: approve,
    },
    {
      pattern: new URLPattern({ pathname: '/api/concepts/:id/reject' }),
      method: 'PATCH',
      handler: reject,
    },
    {
      pattern: new URLPattern({ pathname: '/api/concepts/:id/deprecate' }),
      method: 'PATCH',
      handler: deprecate,
    },
    {
      pattern: new URLPattern({ pathname: '/api/concepts/:id' }),
      method: 'DELETE',
      handler: archive,
    },
  ];

  return (req: Request): Promise<Response> | Response => {
    const url = new URL(req.url);

    if (url.pathname === '/api/concepts' || url.pathname === '/api/concepts/') {
      if (req.method !== 'GET') return jsonError(405, 'method not allowed');
      const query = ConceptListQuerySchema.safeParse(
        Object.fromEntries(url.searchParams.entries())
      );
      if (!query.success) {
        return jsonError(400, query.error.issues[0]?.message ?? 'invalid query');
      }
      const rows = listConcepts(db, query.data);
      return Response.json({
        concepts: rows,
        total: countConcepts(db, query.data),
      });
    }

    if (url.pathname === '/api/concepts/graph' || url.pathname === '/api/concepts/graph/') {
      if (req.method !== 'GET') return jsonError(405, 'method not allowed');
      return Response.json(buildConceptGraph(db));
    }

    if (url.pathname === '/api/concepts/propose' || url.pathname === '/api/concepts/propose/') {
      if (req.method !== 'POST') return jsonError(405, 'method not allowed');
      return (async () => {
        const body = await readBody(req, ConceptProposeBodySchema);
        if (body instanceof Response) return body;
        try {
          return Response.json(proposeConcept(db, body), { status: 201 });
        } catch (err) {
          return handleRegistryError(err);
        }
      })();
    }

    // ── param routes ────────────────────────────────────────────────────────
    // Pathname match first, then method: GET /api/concepts/:id and
    // DELETE /api/concepts/:id share a pathname, so a wrong-method request
    // on a matched pathname must 405, not fall through to 404/next route.
    const matched = paramRoutes.filter(r => r.pattern.exec(url));
    if (matched.length > 0) {
      const route = matched.find(r => r.method === req.method);
      if (!route) return jsonError(405, 'method not allowed');
      const id = route.pattern.exec(url)?.pathname?.groups?.id ?? '';
      if (!id) return jsonError(400, 'missing concept id');
      return (async () => {
        try {
          return await route.handler(req, id);
        } catch (err) {
          return handleRegistryError(err);
        }
      })();
    }

    return jsonError(404, 'unknown route');
  };
}
