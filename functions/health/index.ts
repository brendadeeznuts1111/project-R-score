/**
 * Pages Function — GET /health (JSON, same snapshot as /api/health).
 * Origin serve-public also serves JSON here; `/health/` stays the portal redirect HTML.
 *
 * @see https://developers.cloudflare.com/pages/functions/
 * @see lib/http/portal-health-edge.ts
 */
import {
  collectEdgeHealth,
  edgeHealthOptionsResponse,
  respondEdgeHealthJson,
  type HealthEnv,
} from '../../lib/http/portal-health-edge.ts';

export async function onRequest(context: {
  request: Request;
  env: HealthEnv;
}): Promise<Response> {
  if (context.request.method === 'OPTIONS') {
    return edgeHealthOptionsResponse();
  }

  const origin = new URL(context.request.url).origin;
  const body = await collectEdgeHealth(context.env, origin);
  return respondEdgeHealthJson(context.request, body);
}
