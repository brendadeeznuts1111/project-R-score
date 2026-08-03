#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/api/http — Bun.serve
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Concept Registry Service — Phase 1 HTTP API.
 *
 *   bun run concept:registry:serve
 *   CONCEPT_REGISTRY_PORT=8788 bun run concept:registry:serve -- --seed
 *
 * Endpoints: /api/concepts* · /health
 */
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

const fetch = createConceptRegistryFetch(db);

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
