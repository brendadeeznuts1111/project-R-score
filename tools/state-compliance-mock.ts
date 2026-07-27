#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Local mock server for MA/NJ regulatory compliance checks.
 *
 *   bun run ops:compliance:mock
 *   bun tools/state-compliance-mock.ts --port=8787
 *
 * Demo nodes: demo-ma-licensed · demo-nj-licensed · demo-dual-licensed · demo-unlicensed
 *
 * Example:
 *   curl -sS -X POST "$URL/api/compliance/check" -H 'content-type: application/json' \\
 *     -d '{"nodeId":"demo-ma-licensed","stateCode":"MA","sportId":"NBA","marketId":"totals","wagerAmount":100}'
 */
import { startStateComplianceMock } from '../lib/operations/state-compliance-http.ts';

function parsePort(argv: string[]): number {
  for (const a of argv) {
    if (a.startsWith('--port=')) {
      const n = Number(a.slice('--port='.length));
      if (Number.isFinite(n) && n >= 0) return n;
    }
  }
  const env = Bun.env.COMPLIANCE_MOCK_PORT?.trim();
  if (env) {
    const n = Number(env);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return 8787;
}

const port = parsePort(Bun.argv.slice(2));
const { server, url } = startStateComplianceMock({ port, log: true });

console.info(`
Examples:
  curl -sS ${url}health
  curl -sS -X POST ${url}api/compliance/check -H 'content-type: application/json' \\
    -d '{"nodeId":"demo-unlicensed","stateCode":"NJ","sportId":"soccer","marketId":"match_winner","wagerAmount":100,"betType":"straight"}'
  curl -sS -X POST ${url}api/compliance/check -H 'content-type: application/json' \\
    -d '{"nodeId":"demo-ma-licensed","stateCode":"MA","sportId":"NBA","marketId":"totals","wagerAmount":500,"betType":"straight"}'
  curl -sS '${url}api/compliance/status?nodeId=demo-ma-licensed&state=MA'
`);

process.on('SIGINT', () => {
  server.stop(true);
  process.exit(0);
});
