/**
 * Pages Function — serve verify-networking bundle for `bun run -`.
 *
 *   curl -sf https://project-r-score.pages.dev/api/networking/script | bun run - --local-only
 */
import { serveVerificationScript } from '../../../lib/http/verification-scripts.ts';
import { getOnly } from '../_get-only.ts';

export async function onRequest(context: { request: Request }): Promise<Response> {
  const blocked = getOnly(context.request);
  if (blocked) return blocked;
  const base = new URL(context.request.url).origin;
  return serveVerificationScript('networking', { baseUrl: base });
}
