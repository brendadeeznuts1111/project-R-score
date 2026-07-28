/**
 * Pages Function — serve build-doc-index.ts for piped `bun run - --save`.
 *
 *   curl -sf https://project-r-score.pages.dev/api/doc-refs/script | bun run - --save
 */
import { serveVerificationScript } from '../../../lib/http/verification-scripts.ts';
import { getOnly } from '../_get-only.ts';

export async function onRequest(context: { request: Request }): Promise<Response> {
  const blocked = getOnly(context.request);
  if (blocked) return blocked;
  const base = new URL(context.request.url).origin;
  return serveVerificationScript('doc-index', { baseUrl: base });
}
