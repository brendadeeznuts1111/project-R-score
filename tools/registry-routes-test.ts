#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve routes
// @see https://bun.com/docs/runtime/utils#bun-inspect-table — Bun.inspect.table
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Smoke-test registry / portal route surface and print Bun.inspect.table proof.
 *
 * Modes:
 *   --factory   spin ephemeral createRegistryServer (memory store) [default]
 *   --url=URL   hit an already-running server (serve-public or gateway)
 *
 *   bun tools/registry-routes-test.ts
 *   bun tools/registry-routes-test.ts --url=http://127.0.0.1:3000
 */

import { createMemoryObjectStore } from '../lib/factory/object-store.ts';
import { RegistryClient } from '../lib/factory/registry.ts';
import { createRegistryServer } from '../lib/factory/server.ts';

type Row = {
  path: string;
  method: string;
  status: number | string;
  ok: boolean;
  ms: string;
  type: string;
};

function flag(name: string): string | undefined {
  const hit = Bun.argv.find(a => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}

const baseUrl = flag('url');
const useFactory = !baseUrl && !Bun.argv.includes('--serve-public');

const FACTORY_ENDPOINTS: Array<{ method?: string; path: string }> = [
  { path: '/ready' },
  { path: '/health' },
  { path: '/-/ping' },
  { path: '/api/registry' },
  { path: '/api/registry/health' },
  { path: '/api/registry/registry.json' },
  { method: 'HEAD', path: '/api/registry/registry.json' },
  { method: 'POST', path: '/api/registry/demo/versions' }, // expect 401/503 without token body
];

const PUBLIC_ENDPOINTS: Array<{ method?: string; path: string }> = [
  { path: '/ready' },
  { path: '/health' },
  { path: '/api/registry' },
  { path: '/api/monitoring' },
  { path: '/monitoring' },
  { path: '/api/operations/summary' },
  { path: '/portal' },
  { path: '/registry/ops-summary.json' },
];

async function probe(
  base: string,
  endpoints: Array<{ method?: string; path: string }>
): Promise<Row[]> {
  const results: Row[] = [];
  for (const ep of endpoints) {
    const method = ep.method ?? 'GET';
    const url = new URL(ep.path, base.endsWith('/') ? base : `${base}/`);
    const t0 = performance.now();
    try {
      const res = await fetch(url, { method });
      const ms = (performance.now() - t0).toFixed(2);
      results.push({
        path: ep.path,
        method,
        status: res.status,
        ok: res.ok || res.status === 401 || res.status === 503, // auth-gated still "wired"
        ms: `${ms}ms`,
        type: (res.headers.get('content-type') ?? '').split(';')[0] ?? '',
      });
    } catch (e) {
      results.push({
        path: ep.path,
        method,
        status: 'ERR',
        ok: false,
        ms: '-',
        type: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return results;
}

function printTable(title: string, results: Row[]): string {
  console.log(title);
  console.log(
    Bun.inspect.table(
      results.map(r => ({
        Endpoint: `${r.method} ${r.path}`,
        Status: r.status,
        OK: r.ok ? '✅' : '❌',
        Time: r.ms,
        'Content-Type': r.type,
      })),
      ['Endpoint', 'Status', 'OK', 'Time', 'Content-Type'],
      { colors: true }
    )
  );
  const hasher = new Bun.CryptoHasher('sha256');
  hasher.update(JSON.stringify(results));
  const proof = hasher.digest('hex');
  console.log(`🔒 Proof hash: ${proof}`);
  return proof;
}

let stop: (() => Promise<void>) | undefined;
let base: string;
let endpoints: Array<{ method?: string; path: string }>;

if (useFactory) {
  const store = createMemoryObjectStore();
  await store.putJson('registry.json', {
    schemaVersion: 1,
    lastUpdated: new Date().toISOString(),
    packages: {},
  });
  const client = new RegistryClient({ store });
  const server = createRegistryServer({
    client,
    port: 0,
    hostname: '127.0.0.1',
    publishToken: 'routes-test-secret',
  });
  base = `http://127.0.0.1:${server.port}`;
  endpoints = FACTORY_ENDPOINTS;
  stop = () => server.stop(true);
  console.log(`🧪 Factory registry routes @ ${base}`);
} else {
  base = (baseUrl ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
  endpoints = PUBLIC_ENDPOINTS;
  console.log(`🧪 Live server routes @ ${base}`);
}

const results = await probe(base, endpoints);
const proof = printTable('Registry Routing Test', results);
const failed = results.filter(r => !r.ok);
if (stop) await stop();

if (failed.length > 0) {
  console.error(`\n❌ ${failed.length} route(s) failed`);
  process.exit(1);
}
console.log(`\n✅ ${results.length} route(s) ok · proof ${proof.slice(0, 12)}…`);
