/**
 * Pages Function — script metadata (SHA-256, pipe one-liners).
 */
import { serveVerificationScriptMeta } from '../../../lib/http/verification-scripts.ts';
import { getOnly } from '../_get-only.ts';

export async function onRequest(context: { request: Request }): Promise<Response> {
  const blocked = getOnly(context.request);
  if (blocked) return blocked;
  return serveVerificationScriptMeta('networking', new URL(context.request.url).origin);
}
