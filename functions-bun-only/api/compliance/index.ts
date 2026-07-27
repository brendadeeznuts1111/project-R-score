// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve
/**
 * Local Bun-only compliance API (serve-public / bun runtime).
 * Proxies in-process mock or COMPLIANCE_URL for live checks.
 *
 * Pages edge uses functions/api/compliance (snapshot only).
 */
import {
  createMockComplianceDb,
  createStateComplianceFetchHandler,
} from '../../../lib/operations/state-compliance-http.ts';

const db = createMockComplianceDb();
const handler = createStateComplianceFetchHandler(db);

export async function onRequest(context: { request: Request }): Promise<Response> {
  const url = new URL(context.request.url);
  // Map /api/compliance/* → mock paths
  const path = url.pathname.replace(/^\/api\/compliance/, '') || '/health';
  const mapped = new URL(path + url.search, 'http://compliance.local');
  const req = new Request(mapped, context.request);
  return handler(req);
}
