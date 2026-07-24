/**
 * Pages Function — skills catalog JSON (edge-safe stub).
 *
 * Full scan (Bun.Glob over PORTAL_SKILLS_DIR) runs on origin via serve-public.
 * On Pages we serve committed static artifact or an empty catalog with a warning.
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
    'Skills directory scan is origin-only — run locally or commit public/registry/skills-catalog.json.',
};

export async function onRequest(context: SkillsPagesContext): Promise<Response> {
  if (context.request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
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
      const ct = res.headers.get('Content-Type') || 'application/json; charset=utf-8';
      return new Response(res.body, {
        status: 200,
        headers: {
          'Content-Type': ct.includes('json') ? ct : 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=60',
        },
      });
    }
  } catch {
    /* fall through */
  }

  return new Response(JSON.stringify(EMPTY), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
    },
  });
}
