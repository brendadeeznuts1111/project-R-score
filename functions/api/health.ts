/**
 * Pages Function — combined health for edge + static artifacts.
 *
 * GET /api/health
 * Shared on portal UI (/portal/health) and topbar probes.
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

export type { HealthEnv };

export async function onRequest(context: { request: Request; env: HealthEnv }): Promise<Response> {
  if (context.request.method === 'OPTIONS') {
    return edgeHealthOptionsResponse();
  }

  const origin = new URL(context.request.url).origin;
  const body = await collectEdgeHealth(context.env, origin);
  return respondEdgeHealthJson(context.request, body);
}
