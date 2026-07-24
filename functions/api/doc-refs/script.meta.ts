/**
 * Pages Function — doc-index script metadata (SHA-256, pipe one-liners).
 */
import { serveVerificationScriptMeta } from '../../../lib/http/verification-scripts.ts';

export async function onRequest(context: { request: Request }): Promise<Response> {
  return serveVerificationScriptMeta('doc-index', new URL(context.request.url).origin);
}
