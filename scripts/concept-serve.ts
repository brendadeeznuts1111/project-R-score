#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve
// @see https://bun.com/docs/runtime/http/server#configuring-a-default-port — --port
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/api/server — Bun.serve
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/environment-variables — Bun.env
/**
 * Concept registry — read-only HTTP API over the portal semantic vocabulary.
 *
 *   bun run scripts/concept-serve.ts [--port 3042]
 *
 * Port precedence: --port flag > CONCEPT_REGISTRY_PORT env > 3042.
 * Host is always 127.0.0.1 (loopback only — read-only introspection API).
 *
 * Endpoints (all JSON):
 *   GET /api/health          readiness probe ({ ok, service, concepts, uptime })
 *   GET /api/concepts        full list; ?domain= · ?status= · ?unused=1
 *   GET /api/concepts/:id    single concept + usage breakdown (404 when unknown)
 *   GET /api/domains         per-domain rollup (count, used, unused)
 *   GET /api/proposals       pending lifecycle proposals ([] when bake absent)
 */
import { colorize } from '../lib/console-depth.ts';
import {
  countPortalConceptUsagesDetailed,
  type ConceptUsageBreakdown,
} from '../lib/portal/concept-usage.ts';
import {
  PORTAL_SEMANTIC_CONCEPTS,
  type PortalSemanticConcept,
} from '../lib/portal/semantic-vocabulary.ts';
import { conceptCorrelationId, conceptDomain } from './validate-concept-metadata.ts';

const DEFAULT_PORT = 3042;
const PROPOSALS_PATH = `${import.meta.dir}/concept-lifecycle.json`;
const USAGE_CACHE_MS = 30_000;

export type ConceptRegistryRow = {
  id: string; // brand-ok — glossary concept key
  label: string;
  domain: string;
  status: string;
  correlationId: string; // brand-ok — provenance work-item ref
  addedAt: string;
  usage: number;
};

export type ConceptRegistryOptions = {
  concepts?: readonly PortalSemanticConcept[];
  /** Injectable usage scanner (tests pass a static map). */
  loadUsageDetailed?: () => Promise<Map<string, ConceptUsageBreakdown>>;
  proposalsPath?: string;
  startedAt?: number;
  /** Usage cache TTL in ms (default 30s; pass 0 to disable). */
  usageCacheMs?: number;
};

function conceptStatus(concept: PortalSemanticConcept): string {
  // Parallel lane adds optional status/deprecatedAt — read defensively.
  return 'status' in concept && typeof concept.status === 'string' && concept.status.length > 0
    ? concept.status
    : 'active';
}

function conceptAddedAt(concept: PortalSemanticConcept): string {
  return 'addedAt' in concept && typeof concept.addedAt === 'string' ? concept.addedAt : '';
}

// Justification: outbound Response serializer — JSON.stringify accepts any payload shape.
// eslint-disable-next-line harness/no-unknown-function-param
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function notFound(path: string): Response {
  return json({ ok: false, error: 'not-found', path }, 404);
}

type LifecycleFile = {
  version?: unknown;
  proposals?: unknown;
  history?: unknown;
};

/**
 * Fetch handler for the concept registry. Usable without binding a port:
 *
 *   const handler = createConceptRegistryHandler();
 *   const res = await handler(new Request('http://localhost/api/health'));
 */
export function createConceptRegistryHandler(
  opts: ConceptRegistryOptions = {}
): (req: Request) => Promise<Response> {
  const concepts = opts.concepts ?? PORTAL_SEMANTIC_CONCEPTS;
  const loadUsage = opts.loadUsageDetailed ?? countPortalConceptUsagesDetailed;
  const proposalsPath = opts.proposalsPath ?? PROPOSALS_PATH;
  const startedAt = opts.startedAt ?? Date.now();
  const cacheMs = opts.usageCacheMs ?? USAGE_CACHE_MS;

  let usageCache: { at: number; map: Map<string, ConceptUsageBreakdown> } | undefined;
  async function usage(): Promise<Map<string, ConceptUsageBreakdown>> {
    if (usageCache && cacheMs > 0 && Date.now() - usageCache.at < cacheMs) return usageCache.map;
    const map = await loadUsage();
    usageCache = { at: Date.now(), map };
    return map;
  }

  function rows(usages: Map<string, ConceptUsageBreakdown>): ConceptRegistryRow[] {
    return concepts.map(c => ({
      id: c.id,
      label: c.label,
      domain: conceptDomain(c) ?? '',
      status: conceptStatus(c),
      correlationId: conceptCorrelationId(c) ?? '',
      addedAt: conceptAddedAt(c),
      usage: usages.get(c.id)?.total ?? 0,
    }));
  }

  return async function handler(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    if (req.method === 'GET' && path === '/api/health') {
      return json({
        ok: true,
        service: 'concept-registry',
        concepts: concepts.length,
        uptime: Math.floor((Date.now() - startedAt) / 1000),
      });
    }

    if (req.method === 'GET' && path === '/api/concepts') {
      const usages = await usage();
      let list = rows(usages);
      const domain = url.searchParams.get('domain')?.trim();
      const status = url.searchParams.get('status')?.trim();
      if (domain) list = list.filter(r => r.domain === domain);
      if (status) list = list.filter(r => r.status === status);
      if (url.searchParams.get('unused') === '1') list = list.filter(r => r.usage === 0);
      return json({ concepts: list, total: concepts.length, matched: list.length });
    }

    if (req.method === 'GET' && path.startsWith('/api/concepts/')) {
      const id = decodeURIComponent(path.slice('/api/concepts/'.length));
      const concept = concepts.find(c => c.id === id);
      if (!concept) return notFound(path);
      const usages = await usage();
      const breakdown = usages.get(id) ?? { html: 0, href: 0, map: 0, surface: 0, total: 0 };
      return json({
        concept: {
          id: concept.id,
          label: concept.label,
          description: concept.description,
          semanticType: concept.semanticType,
          uiRole: concept.uiRole,
          namespace: concept.namespace,
          domain: conceptDomain(concept) ?? '',
          status: conceptStatus(concept),
          synonyms: concept.synonyms,
          seeAlso: concept.seeAlso,
          correlationId: conceptCorrelationId(concept) ?? '',
          addedAt: conceptAddedAt(concept),
        },
        usage: breakdown,
      });
    }

    if (req.method === 'GET' && path === '/api/domains') {
      const usages = await usage();
      const byDomain = new Map<
        string,
        { domain: string; count: number; used: number; unused: number }
      >();
      for (const row of rows(usages)) {
        const entry = byDomain.get(row.domain) ?? {
          domain: row.domain,
          count: 0,
          used: 0,
          unused: 0,
        };
        entry.count += 1;
        if (row.usage > 0) entry.used += 1;
        else entry.unused += 1;
        byDomain.set(row.domain, entry);
      }
      return json({
        domains: [...byDomain.values()].sort(
          (a, b) => b.count - a.count || a.domain.localeCompare(b.domain)
        ),
      });
    }

    if (req.method === 'GET' && path === '/api/proposals') {
      const file = Bun.file(proposalsPath);
      if (!(await file.exists())) return json({ version: 1, proposals: [], history: [] });
      const raw = (await file.json()) as LifecycleFile;
      return json({
        version: typeof raw.version === 'number' ? raw.version : 1,
        proposals: Array.isArray(raw.proposals) ? raw.proposals : [],
        history: Array.isArray(raw.history) ? raw.history : [],
      });
    }

    return notFound(path);
  };
}

function parsePort(argv: readonly string[]): number {
  const eq = argv.find(a => a.startsWith('--port='));
  const inline = eq ? eq.slice('--port='.length) : undefined;
  const i = argv.indexOf('--port');
  const spaced = i !== -1 ? argv[i + 1] : undefined;
  const raw = inline ?? spaced ?? Bun.env.CONCEPT_REGISTRY_PORT;
  const port = raw === undefined ? Number.NaN : Number.parseInt(raw, 10);
  return Number.isFinite(port) && port > 0 && port < 65_536 ? port : DEFAULT_PORT;
}

async function main(): Promise<void> {
  const port = parsePort(Bun.argv);
  const handler = createConceptRegistryHandler();
  const server = Bun.serve({ hostname: '127.0.0.1', port, fetch: handler });
  console.log(colorize(`concept:serve · registry API · ${server.url}`, '#3fb950'));
  console.log(
    colorize(
      '  /api/health · /api/concepts · /api/concepts/:id · /api/domains · /api/proposals',
      '#8b949e'
    )
  );
}

if (import.meta.main) {
  await main();
}
