/**
 * Pages Function — skills catalog JSON (edge-safe stub).
 *
 * Full scan (Bun.Glob over PORTAL_SKILLS_DIR) runs on origin via serve-public.
 * On Pages we serve committed public/registry/skills-catalog.json or an empty catalog.
 *
 * @see lib/http/skills-catalog.ts
 * @see public/portal/skills/index.html
 */

export type SkillsPagesEnv = {
  ASSETS?: { fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> };
};

export type SkillsPagesContext = {
  request: Request;
  env: SkillsPagesEnv;
};

const EMPTY = {
  skills: [],
  count: 0,
  warning:
    'Skills directory scan is origin-only — run ops:snapshot locally or commit public/registry/skills-catalog.json.',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
    },
  });
}

export async function onRequest(context: SkillsPagesContext): Promise<Response> {
  if (context.request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const origin = new URL(context.request.url).origin;
  const assetUrl = new URL('/registry/skills-catalog.json', origin);
  try {
    let res: Response;
    if (context.env.ASSETS?.fetch) {
      res = await context.env.ASSETS.fetch(new Request(assetUrl.toString()));
    } else {
      res = await fetch(assetUrl.toString(), { headers: { Accept: 'application/json' } });
    }
    if (res.ok) {
      const ct = res.headers.get('Content-Type') ?? '';
      if (ct.includes('json')) {
        const data = (await res.json()) as { skills?: unknown[]; count?: number };
        if (Array.isArray(data.skills)) {
          return jsonResponse({ ...data, source: 'snapshot' });
        }
      }
    }
  } catch {
    /* fall through */
  }

  return jsonResponse(EMPTY);
}
