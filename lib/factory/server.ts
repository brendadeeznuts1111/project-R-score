// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/http/server — Bun.serve
// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve routes
/**
 * VM / bare-metal registry gateway.
 *
 *   bun lib/factory/server.ts
 *   REGISTRY_MONITOR=1 bun lib/factory/server.ts  # also starts integrity cron
 *
 * Routing:
 *   - `routes` — SIMD-matched health/ping/index + method-map POST publish
 *   - `fetch`  — allowlisted object-key reads, OPTIONS, unmatched 404
 *
 * Reads are anonymous and allowlisted. Publishing is accepted only at the
 * multipart versions endpoint and fails closed without a configured token.
 */

import type { BunRequest } from 'bun';
import { buildRegistryHealthReport, healthHttpStatus, publicRegistryHealthReport } from './health';
import { parseRegistryObjectKey } from './http-keys';
import { registerRegistryCrons } from './monitoring';
import { registry, type RegistryClient } from './registry';
import { type ArtifactType } from './artifact';

const DEFAULT_MAX_PUBLISH_BYTES = 50 * 1024 * 1024;

/** Static ready probe — buffered once at module load (zero-allocation responses). */
const READY_RESPONSE = Response.json({ ready: true });

export type RegistryGatewayOptions = {
  publishToken?: string;
  maxPublishBytes?: number;
};

function json(data: object, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function contentTypeForKey(key: string): string {
  if (key.endsWith('.json')) return 'application/json';
  if (key.endsWith('.md')) return 'text/markdown; charset=utf-8';
  return 'application/octet-stream';
}

/**
 * Prefer remote/object-store, then local `public/registry/<key>` snapshot files
 * (self-heal when R2 is empty but ops:snapshot wrote static artifacts).
 */
async function serveRegistryObject(client: RegistryClient, key: string): Promise<Response> {
  const data = await client.fetchObjectBytes(key);
  if (data) {
    return new Response(Uint8Array.from(data).buffer, {
      status: 200,
      headers: {
        'Content-Type': contentTypeForKey(key),
        'Cache-Control': 'public, max-age=60',
      },
    });
  }

  try {
    const local = Bun.file(`public/registry/${key}`);
    if (await local.exists()) {
      return new Response(local, {
        status: 200,
        headers: {
          'Content-Type': contentTypeForKey(key),
          'Cache-Control': 'public, max-age=60',
        },
      });
    }
  } catch {
    /* ignore */
  }

  return json({ error: 'Not found' }, 404);
}

async function tokenMatches(provided: string, expected: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(provided)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ]);
  const left = new Uint8Array(providedHash);
  const right = new Uint8Array(expectedHash);
  let mismatch = 0;
  for (let i = 0; i < left.length; i++) mismatch |= left[i]! ^ right[i]!;
  return mismatch === 0;
}

function bearerToken(request: Request): string {
  const authorization = request.headers.get('Authorization') ?? '';
  return authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
}

function optionalString(value: FormDataEntryValue | null): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function artifactType(value: string | undefined): ArtifactType {
  switch (value) {
    case 'library':
    case 'project':
    case 'template':
    case 'worker':
    case 'cli-tool':
      return value;
    default:
      return 'library';
  }
}

async function healthResponse(client: RegistryClient, method: string): Promise<Response> {
  const report = await buildRegistryHealthReport(client);
  if (method === 'HEAD') {
    return new Response(null, {
      status: healthHttpStatus(report),
      headers: { 'Cache-Control': 'no-store' },
    });
  }
  return json(publicRegistryHealthReport(report), healthHttpStatus(report));
}

async function serveObjectMaybeHead(
  client: RegistryClient,
  key: string,
  method: string
): Promise<Response> {
  const response = await serveRegistryObject(client, key);
  return method === 'HEAD'
    ? new Response(null, { status: response.status, headers: response.headers })
    : response;
}

export async function publishRegistryVersion(
  request: Request,
  client: RegistryClient,
  rawName: string,
  options: RegistryGatewayOptions
): Promise<Response> {
  const configuredToken =
    options.publishToken !== undefined
      ? options.publishToken
      : Bun.env.FACTORY_WAGER_TOKEN || Bun.env.REGISTRY_SECRET || '';
  const expected = configuredToken.trim();
  if (!expected) {
    return json({ error: 'Registry publishing is not configured' }, 503);
  }
  if (!(await tokenMatches(bearerToken(request), expected))) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const maxBytes =
    options.maxPublishBytes ??
    Number(Bun.env.REGISTRY_MAX_PUBLISH_BYTES || DEFAULT_MAX_PUBLISH_BYTES);
  const contentLength = Number(request.headers.get('Content-Length') || 0);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return json({ error: 'Artifact exceeds publish size limit' }, 413);
  }

  let name: string;
  try {
    name = decodeURIComponent(rawName);
  } catch {
    return json({ error: 'Invalid artifact name' }, 400);
  }

  try {
    const form = await request.formData();
    const file = form.get('file');
    const version = optionalString(form.get('version'));
    if (!(file instanceof File)) return json({ error: 'Artifact file is required' }, 400);
    if (!version) return json({ error: 'Version is required' }, 400);
    if (file.size > maxBytes) return json({ error: 'Artifact exceeds publish size limit' }, 413);

    let metadata: Record<string, unknown> = {};
    const metadataText = optionalString(form.get('metadata'));
    if (metadataText) {
      const parsed = JSON.parse(metadataText) as unknown;
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return json({ error: 'Metadata must be a JSON object' }, 400);
      }
      metadata = parsed as Record<string, unknown>;
    }

    const requestedTags = (optionalString(form.get('tags')) ?? 'latest')
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean);
    const tags = requestedTags.length > 0 ? [...new Set(requestedTags)] : ['latest'];
    const description =
      typeof metadata.description === 'string' ? metadata.description.slice(0, 2_000) : undefined;
    const release = await client.publish(name, version, file, {
      type: artifactType(typeof metadata.type === 'string' ? metadata.type : undefined),
      description,
      tags,
      distTag: tags[0],
      publisher: 'registry-http',
      readme: false,
    });
    for (const tag of tags.slice(1)) {
      await client.promote(name, version, tag);
    }
    return json(
      {
        success: true,
        version: String(release.version),
        checksum: release.storage.checksum,
        size: release.storage.size,
      },
      201
    );
  } catch (cause) {
    if (cause instanceof SyntaxError || cause instanceof TypeError) {
      return json({ error: 'Invalid publish request' }, 400);
    }
    console.error('Registry publish failed');
    return json({ error: 'Registry publish failed' }, 500);
  }
}

/**
 * SIMD-matched routes: health, ready, index, and method-map POST publish.
 * Scoped packages use `/api/registry/:scope/:name/versions` (`scope` includes `@…`).
 * URL-encoded single-segment names (`%40scope%2Fname`) hit `:package`.
 */
export function createRegistryRoutes(
  client: RegistryClient = registry,
  options: RegistryGatewayOptions = {}
) {
  const health = {
    GET: (req: Request) => healthResponse(client, req.method),
    HEAD: (req: Request) => healthResponse(client, req.method),
  };

  return {
    // Static zero-allocation readiness
    '/ready': READY_RESPONSE,

    '/-/ping': {
      GET: () => json({ ok: true }),
      HEAD: () => new Response(null, { status: 200 }),
    },

    '/health': health,
    '/api/registry/health': health,

    '/api/registry': {
      GET: (req: Request) => serveObjectMaybeHead(client, 'registry.json', req.method),
      HEAD: (req: Request) => serveObjectMaybeHead(client, 'registry.json', req.method),
    },

    // Aggregate snapshot from buildRegistrySnapshot / ops:snapshot
    '/api/registry/static': {
      GET: (req: Request) => serveObjectMaybeHead(client, 'static.json', req.method),
      HEAD: (req: Request) => serveObjectMaybeHead(client, 'static.json', req.method),
    },
    '/api/registry/static.json': {
      GET: (req: Request) => serveObjectMaybeHead(client, 'static.json', req.method),
      HEAD: (req: Request) => serveObjectMaybeHead(client, 'static.json', req.method),
    },

    // Unscoped / URL-encoded package name
    '/api/registry/:package/versions': {
      POST: (req: BunRequest<'/api/registry/:package/versions'>) =>
        publishRegistryVersion(req, client, req.params.package, options),
    },

    // Unencoded scoped: /api/registry/@factorywager/sdk/versions
    '/api/registry/:scope/:name/versions': {
      POST: (req: BunRequest<'/api/registry/:scope/:name/versions'>) =>
        publishRegistryVersion(req, client, `${req.params.scope}/${req.params.name}`, options),
    },
  };
}

/**
 * Fallback fetch: allowlisted object-key GET/HEAD, OPTIONS, and a complete
 * router when used alone (unit tests without starting Bun.serve).
 */
export function createRegistryFetchHandler(
  client: RegistryClient = registry,
  options: RegistryGatewayOptions = {}
): (request: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const url = new URL(req.url);

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
    }

    // Publish (also registered on routes — kept here for handler-only tests)
    const publishMatch = url.pathname.match(/^\/api\/registry\/(.+)\/versions$/);
    if (publishMatch && req.method === 'POST') {
      return publishRegistryVersion(req, client, publishMatch[1]!, options);
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return json({ error: 'Method not allowed' }, 405);
    }

    if (url.pathname === '/ready') {
      return READY_RESPONSE.clone();
    }

    if (
      url.pathname === '/health' ||
      url.pathname === '/api/registry/health' ||
      url.pathname === '/-/ping'
    ) {
      if (url.pathname === '/-/ping') {
        return req.method === 'HEAD' ? new Response(null, { status: 200 }) : json({ ok: true });
      }
      return healthResponse(client, req.method);
    }

    if (url.pathname === '/api/registry' || url.pathname === '/api/registry/') {
      return serveObjectMaybeHead(client, 'registry.json', req.method);
    }

    const registryPrefix = '/api/registry/';
    if (url.pathname.startsWith(registryPrefix)) {
      const rawKey = url.pathname.slice(registryPrefix.length);
      const key = parseRegistryObjectKey(rawKey);
      if (!key) return json({ error: 'Invalid registry object key' }, 400);
      return serveObjectMaybeHead(client, key, req.method);
    }

    return json({ error: 'Not found' }, 404);
  };
}

export function createRegistryServer(
  options: {
    client?: RegistryClient;
    port?: number;
    hostname?: string;
    publishToken?: string;
    maxPublishBytes?: number;
  } = {}
): ReturnType<typeof Bun.serve> {
  const client = options.client ?? registry;
  const gateway: RegistryGatewayOptions = {
    publishToken: options.publishToken,
    maxPublishBytes: options.maxPublishBytes,
  };
  const port = options.port ?? Number(Bun.env.REGISTRY_PORT || Bun.env.PORT || 3000);
  const hostname = options.hostname ?? Bun.env.REGISTRY_HOST ?? '0.0.0.0';
  return Bun.serve({
    hostname,
    port,
    routes: createRegistryRoutes(client, gateway),
    fetch: createRegistryFetchHandler(client, gateway),
  });
}

if (import.meta.main) {
  if (Bun.env.REGISTRY_MONITOR === '1') {
    registerRegistryCrons();
  }
  const server = createRegistryServer();
  console.info(`Registry gateway listening on ${server.url}`);
  console.info(`  routes: /ready /health /-/ping /api/registry (+ POST …/versions)`);
  console.info(`  fetch:  allowlisted object keys under /api/registry/*`);
}
