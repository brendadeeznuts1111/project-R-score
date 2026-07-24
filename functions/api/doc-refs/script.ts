/**
 * Pages Function — serve build-doc-index.ts for piped `bun run - --save`.
 *
 *   curl -sf https://project-r-score.pages.dev/api/doc-refs/script | bun run - --save
 */
import { serveVerificationScript } from '../../../lib/http/verification-scripts.ts';

export async function onRequest(context: { request: Request }): Promise<Response> {
  const base = new URL(context.request.url).origin;
  return serveVerificationScript('doc-index', { baseUrl: base });
}
