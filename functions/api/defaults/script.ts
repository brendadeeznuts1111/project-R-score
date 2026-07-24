/**
 * Pages Function — serve verify-defaults.ts for `bun run -`.
 *
 *   curl -sf https://project-r-score.pages.dev/api/defaults/script | bun run -
 *   curl -sf .../script.meta | jq -r .pipeVerified
 */
import { serveVerificationScript } from '../../../lib/http/verification-scripts.ts';

export async function onRequest(context: { request: Request }): Promise<Response> {
  const base = new URL(context.request.url).origin;
  return serveVerificationScript('defaults', { baseUrl: base });
}
