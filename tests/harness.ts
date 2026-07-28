// @see https://bun.com/docs/runtime/sqlite
// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve
// @see https://bun.com/docs/runtime/http/server#server-stop — server.stop
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://github.com/oven-sh/bun/blob/b5036bc6a11be1389b5cb50549c407f956df76d3/test/harness.ts
/**
 * Shared test utilities — following Bun's test/harness.ts pattern.
 *
 * Import explicitly in test files:
 *   import { createTestDb, seedTestData } from '../test/harness.ts';
 */
import { Database } from 'bun:sqlite';
import { mkdtemp, rm } from 'node:fs/promises';
import { basename, isAbsolute, relative, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';

export interface TestWorkspace extends AsyncDisposable {
  readonly root: string;
  resolve(...segments: string[]): string;
}

/**
 * Create a contained temporary workspace that is removed when its async
 * disposable scope exits.
 */
export async function createTestWorkspace(prefix = 'factorywager-test-'): Promise<TestWorkspace> {
  if (!prefix || basename(prefix) !== prefix || prefix === '.' || prefix === '..') {
    throw new Error(`test workspace prefix must be a single path segment: ${prefix}`);
  }

  const root = await mkdtemp(resolve(tmpdir(), prefix));
  let disposed = false;

  return {
    root,
    resolve(...segments: string[]): string {
      if (disposed) throw new Error(`test workspace has been disposed: ${root}`);
      const target = resolve(root, ...segments);
      const relativeTarget = relative(root, target);
      if (
        relativeTarget === '..' ||
        relativeTarget.startsWith(`..${sep}`) ||
        isAbsolute(relativeTarget)
      ) {
        throw new Error(`test workspace path escapes root: ${target}`);
      }
      return target;
    },
    async [Symbol.asyncDispose](): Promise<void> {
      if (disposed) return;
      disposed = true;
      await rm(root, { force: true, recursive: true });
    },
  };
}

export type TestEnvironmentOverrides = Readonly<Record<string, string | undefined>>;

type EnvironmentMap = Record<string, string | undefined>;

function uniqueEnvironmentTargets(): EnvironmentMap[] {
  const processEnvironment = process.env as EnvironmentMap;
  const bunEnvironment = Bun.env as EnvironmentMap;
  return processEnvironment === bunEnvironment
    ? [processEnvironment]
    : [processEnvironment, bunEnvironment];
}

/**
 * Apply environment overrides for one callback and restore every touched key,
 * including when the callback throws.
 */
export async function withTestEnvironment<T>(
  overrides: TestEnvironmentOverrides,
  run: () => T | Promise<T>
): Promise<T> {
  const targets = uniqueEnvironmentTargets();
  const keys = Object.keys(overrides);
  const snapshots = targets.map(target => ({
    target,
    values: new Map(keys.map(key => [key, target[key]])),
  }));

  for (const target of targets) {
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined) delete target[key];
      else target[key] = value;
    }
  }

  try {
    return await run();
  } finally {
    for (const { target, values } of snapshots) {
      for (const [key, value] of values) {
        if (value === undefined) delete target[key];
        else target[key] = value;
      }
    }
  }
}

export type TestJsonValue =
  | null
  | boolean
  | number
  | string
  | readonly TestJsonValue[]
  | { readonly [key: string]: TestJsonValue };

export interface TestJsonRoute {
  readonly body: TestJsonValue;
  readonly status?: number;
  readonly headers?: Readonly<Record<string, string>>;
}

export interface TestJsonServer extends AsyncDisposable {
  readonly origin: string;
  readonly port: number;
  url(pathname?: string): string;
}

/**
 * Start a loopback-only JSON fixture server on an operating-system-assigned
 * port. Routes match URL pathnames exactly.
 */
export function createJsonTestServer(
  routes: Readonly<Record<string, TestJsonRoute>>
): TestJsonServer {
  let disposed = false;
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch(request): Response {
      if (request.method !== 'GET') {
        return Response.json(
          { error: 'method_not_allowed' },
          { status: 405, headers: { Allow: 'GET' } }
        );
      }

      const pathname = new URL(request.url).pathname;
      const route = routes[pathname];
      if (!route) {
        return Response.json({ error: 'not_found', path: pathname }, { status: 404 });
      }

      const headers = new Headers(route.headers);
      if (!headers.has('content-type')) {
        headers.set('content-type', 'application/json; charset=utf-8');
      }
      return new Response(JSON.stringify(route.body), {
        status: route.status ?? 200,
        headers,
      });
    },
  });
  const port = server.port;
  if (port === undefined) {
    void server.stop(true);
    throw new Error('test JSON server did not bind a TCP port');
  }
  const origin = `http://127.0.0.1:${port}`;

  return {
    origin,
    port,
    url(pathname = '/'): string {
      if (disposed) throw new Error(`test JSON server has been disposed: ${origin}`);
      if (!pathname.startsWith('/') || pathname.startsWith('//')) {
        throw new Error(`test JSON server URL must be a local absolute path: ${pathname}`);
      }
      const fixtureUrl = new URL(pathname, `${origin}/`);
      if (fixtureUrl.origin !== origin) {
        throw new Error(`test JSON server URL escapes fixture origin: ${pathname}`);
      }
      return fixtureUrl.href;
    },
    async [Symbol.asyncDispose](): Promise<void> {
      if (disposed) return;
      disposed = true;
      await server.stop(true);
    },
  };
}

// ── Terminal detection (cached) ───────────────────────────────────────────
let _hasTerminal: boolean | undefined;
export function getHasTerminal(): boolean {
  if (_hasTerminal !== undefined) return _hasTerminal;
  try {
    const T = (Bun as any).Terminal;
    if (typeof T === 'function') {
      const t = new T(Bun.stdout);
      _hasTerminal = t.isTTY === true;
      return _hasTerminal;
    }
  } catch {}
  _hasTerminal = false;
  return _hasTerminal;
}

let _isNonTTY: boolean | undefined;
export function getIsNonTTY(): boolean {
  if (_isNonTTY !== undefined) return _isNonTTY;
  _isNonTTY = !getHasTerminal();
  return _isNonTTY;
}

// ── Shared test DB factory ───────────────────────────────────────────────
/**
 * Create an in-memory SQLite database with all limit-related schemas.
 */
export function createTestDb(): Database {
  const db = new Database(':memory:');
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA busy_timeout = 5000');

  const { ensureAccountLimitsSchema } = require('../lib/account-limits-repo.ts');
  ensureAccountLimitsSchema(db);
  const { ensureStateRegulationSchema } = require('../lib/operations/state-regulation.ts');
  ensureStateRegulationSchema(db);
  const { ensurePredictionSchema } = require('../lib/prediction/schema.ts');
  ensurePredictionSchema(db);
  const { ensureLimitPredictionSchema } = require('../lib/prediction/limit-prediction.ts');
  ensureLimitPredictionSchema(db);
  try {
    const { ensureLimitPatternsSchema } = require('../lib/operations/limit-patterns.ts');
    ensureLimitPatternsSchema(db);
  } catch {}

  return db;
}

/**
 * Seed demo data into a test DB. Returns the repository for further queries.
 */
export function seedTestData(db: Database, nodeId = 'e2e-test') {
  const {
    seedAccountLimitsDemo,
    AccountLimitsRepository,
  } = require('../lib/account-limits-repo.ts');
  seedAccountLimitsDemo(db, { nodeId, force: true });
  return new AccountLimitsRepository(db);
}

// ── Shared test constants ────────────────────────────────────────────────
export const TEST_NODE_ID = 'e2e-test';
export const TEST_BOOK = 'draftkings';
export const TEST_SPORT = 'nba';
export const TEST_MARKET = 'spread';
export const TEST_BET_TYPE = 'straight';

// ── Conditional test helpers ─────────────────────────────────────────────
export const isNonTTY = getIsNonTTY();
export const hasTerminal = getHasTerminal();
export const isMacOS = process.platform === 'darwin';
