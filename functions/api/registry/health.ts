/**
 * Pages Function — registry health (R2 binding probe, no SigV4 on edge).
 *
 * @see https://developers.cloudflare.com/pages/functions/
 */

import { registryCorsHeaders, type RegistryPagesEnv } from './[[path]]';

export type RegistryHealthContext = {
  request: Request;
  env: RegistryPagesEnv;
};

function healthJson(
  body: object,
  status = 200,
  head = false,
  cors: Record<string, string> = {}
): Response {
  const headers = {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    ...cors,
  };
  return head
    ? new Response(null, { status, headers })
    : new Response(JSON.stringify(body), { status, headers });
}

function parseIndexStats(value: unknown): { packages: number; versions: number } | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const packagesValue = Reflect.get(value, 'packages');
  if (typeof packagesValue !== 'object' || packagesValue === null || Array.isArray(packagesValue)) {
    return null;
  }

  const packages = Object.values(packagesValue);
  let versions = 0;
  for (const pkg of packages) {
    if (typeof pkg !== 'object' || pkg === null || Array.isArray(pkg)) return null;
    const pkgVersions = Reflect.get(pkg, 'versions');
    if (!Array.isArray(pkgVersions)) return null;
    versions += pkgVersions.length;
  }
  return { packages: packages.length, versions };
}

export async function onRequest(context: RegistryHealthContext): Promise<Response> {
  const { request, env } = context;
  const head = request.method === 'HEAD';
  const cors = registryCorsHeaders(request, env);

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: { 'Cache-Control': 'no-store', ...cors },
    });
  }
  if (request.method !== 'GET' && !head) {
    return healthJson({ error: 'Method not allowed' }, 405, false, cors);
  }

  // Same-origin static index, then R2 binding when present.
  async function fromHttp(): Promise<{ text: string } | null> {
    try {
      const url = new URL(request.url);
      const res = await fetch(`${url.origin}/registry/registry.json`, {
        signal: AbortSignal.timeout(1500),
      });
      if (res.ok) return { text: await res.text() };
    } catch {}
    return null;
  }

  async function fromR2(): Promise<{ text: string } | null> {
    const bucket = env.REGISTRY_BUCKET;
    if (!bucket || typeof bucket.get !== 'function') return null;
    try {
      const object = await bucket.get('registry.json');
      if (object?.body) return { text: await new Response(object.body).text() };
    } catch {}
    return null;
  }

  let source: string;
  let text: string | null = null;

  const r2 = await fromR2();
  if (r2) {
    text = r2.text;
    source = 'r2';
  } else {
    const http = await fromHttp();
    if (http) {
      text = http.text;
      source = 'http';
    } else {
      return healthJson(
        { status: 'error', indexOk: false, message: 'Registry index unavailable (all sources empty)' },
        503, head, cors
      );
    }
  }

  try {
    const stats = parseIndexStats(JSON.parse(text) as unknown);
    if (!stats) {
      return healthJson(
        { status: 'error', indexOk: false, message: 'Registry index is invalid' },
        503, head, cors
      );
    }

    return healthJson(
      {
        status: 'ok',
        indexOk: true,
        packages: stats.packages,
        versions: stats.versions,
        edge: true,
        source,
        checkedAt: new Date().toISOString(),
      },
      200, head, cors
    );
  } catch {
    return healthJson(
      { status: 'error', indexOk: false, message: 'Registry storage unreachable' },
      502,
      head,
      cors
    );
  }
}
