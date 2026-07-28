/**
 * Pages Function — serve verify-bun-release.ts for `bun run -`.
 *
 *   curl -sf https://project-r-score.pages.dev/api/release/script | bun run -
 *   curl -sf .../script.meta | jq -r .pipeVerified
 */
import { serveVerificationScript } from '../../../lib/http/verification-scripts.ts';
import { getOnly } from '../_get-only.ts';

export async function onRequest(context: { request: Request }): Promise<Response> {
  const blocked = getOnly(context.request);
  if (blocked) return blocked;
  const base = new URL(context.request.url).origin;
  return serveVerificationScript('release', { baseUrl: base });
}
