/**
 * Pages Function — proxy /api/env to local server or fallback to static snapshot.
 * Serves environment variable status from the registry snapshot.
 */
export async function onRequest(context: { request: Request; env: Record<string, unknown> }): Promise<Response> {
  const url = new URL(context.request.url);
  const origin = url.origin;

  // Try local ASSETS fetch for the monitoring snapshot which includes env data
  if (context.env?.ASSETS && typeof (context.env.ASSETS as any).fetch === 'function') {
    try {
      const monRes = await (context.env.ASSETS as any).fetch(new URL('/registry/monitoring.json', origin));
      if (monRes.ok) {
        const monData = await monRes.json() as Record<string, unknown>;
        if (monData.env) return Response.json(monData.env);
      }
    } catch {}
  }

  // Fallback: return a 503 with instructions
  return Response.json({
    error: 'Environment check not available on edge',
    hint: 'Run locally: bun run env:check',
    docs: 'https://bun.com/docs/runtime/utils#bun-env',
  }, { status: 503 });
}
