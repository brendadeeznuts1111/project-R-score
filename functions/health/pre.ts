/**
 * Pages Function — GET /health/pre (text/plain diagnostics).
 * Matches origin serve-public `healthHtml` / `renderHealthPlain` contract on the edge.
 *
 * @see https://developers.cloudflare.com/pages/functions/
 * @see lib/http/portal-health-edge.ts
 * @see docs/platform-routing.md
 */
import {
  collectEdgeHealth,
  edgeHealthOptionsResponse,
  respondEdgeHealthPlain,
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
  return respondEdgeHealthPlain(context.request, body);
}
