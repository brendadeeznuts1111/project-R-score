#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/api/http — Bun.serve
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/utils#bun-nanoseconds — Bun.nanoseconds
/**
 * Concept Registry Service — Phase 1 HTTP API.
 *
 *   bun run concept:registry:serve
 *   CONCEPT_REGISTRY_PORT=8788 bun run concept:registry:serve -- --seed
 *
 * Endpoints: /api/concepts* · /health
 *
 * Every request is echoed to the server console as
 * `METHOD path → status · X.Xms` (colored, console-depth policy layer).
 */
import { colorize } from '../lib/console-depth.ts';
import {
  createConceptRegistryFetch,
  openConceptRegistryDb,
  seedConceptRegistry,
} from '../lib/concept-registry/index.ts';

const port = Number(Bun.env.CONCEPT_REGISTRY_PORT ?? 8788);
const hostname = Bun.env.CONCEPT_REGISTRY_HOST?.trim() || '127.0.0.1';
const seedOnStart = Bun.argv.includes('--seed') || Bun.env.CONCEPT_REGISTRY_SEED === '1';

const db = openConceptRegistryDb();

if (seedOnStart) {
  const report = await seedConceptRegistry(db);
  console.log(
    `concept-registry seed · vocab=${report.fromVocabulary} glossary=${report.fromGlossary} usage=${report.usageRows} total=${report.total}`
  );
}

/** Echo every request to the server console: METHOD path → status · ms. */
function withRequestEcho(fetch: (req: Request) => Promise<Response>): typeof fetch {
  return (req: Request) => {
    const t0 = Bun.nanoseconds();
    const url = new URL(req.url);
    return fetch(req).then(res => {
      const ms = (Bun.nanoseconds() - t0) / 1e6;
      const statusColor = res.status >= 500 ? '#f85149' : res.status >= 400 ? '#d29922' : '#3fb950';
      console.log(
        `${colorize(req.method.padEnd(6), '#58a6ff')} ${url.pathname}${url.search} → ${colorize(String(res.status), statusColor)} · ${colorize(`${ms.toFixed(1)}ms`, '#8b949e')}`
      );
      return res;
    });
  };
}

const fetch = withRequestEcho(createConceptRegistryFetch(db));

const server = Bun.serve({
  port,
  hostname,
  fetch,
});

console.log(
  `concept-registry · http://${server.hostname}:${server.port} · db=${Bun.env.CONCEPT_REGISTRY_DB_PATH ?? 'data/concept-registry.db'}`
);

process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});
