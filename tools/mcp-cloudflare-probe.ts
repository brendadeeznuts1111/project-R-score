#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Probe Cloudflare remote MCP HTTP endpoints (auth + reachability).
 *
 * Does not print tokens or tool payloads — only HTTP status / ok flags.
 *
 *   bun tools/mcp-cloudflare-probe.ts
 *   bun tools/mcp-cloudflare-probe.ts --json
 *   bun run mcp:cloudflare:probe
 *
 * Requires CLOUDFLARE_API_TOKEN (project .env / proton inject).
 * Workspace MCP SSOT: .mcp.json · Grok: ~/.grok/config.toml [mcp_servers.cloudflare*]
 */
import { jsonOut } from '../lib/console-depth.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('mcp:cloudflare:probe', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const ENDPOINTS = [
  { id: 'cloudflare', url: 'https://mcp.cloudflare.com/mcp' },
  { id: 'cloudflare-docs', url: 'https://docs.mcp.cloudflare.com/mcp' },
  { id: 'cloudflare-bindings', url: 'https://bindings.mcp.cloudflare.com/mcp' },
  { id: 'cloudflare-observability', url: 'https://observability.mcp.cloudflare.com/mcp' },
] as const;

type ProbeRow = {
  id: string; // brand-ok — MCP server catalog key (not domain *Id)
  url: string;
  ok: boolean;
  status: number | null;
  ms: number;
  note: string;
};

async function probeOne(
  id: string, // brand-ok — MCP server catalog key
  url: string,
  token: string
): Promise<ProbeRow> {
  const t0 = performance.now();
  try {
    // MCP streamable HTTP often expects POST initialize; GET may 405/404 — still proves TLS+auth surface
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json, text/event-stream',
      },
      signal: AbortSignal.timeout(12_000),
    });
    const ms = Math.round(performance.now() - t0);
    const status = res.status;
    // 2xx/3xx/4xx (except 401/403) mean the edge answered; 401/403 = token/policy issue
    const authFail = status === 401 || status === 403;
    const ok = !authFail && status > 0;
    let note = `HTTP ${status}`;
    if (authFail) note = `auth failed (${status}) — check CLOUDFLARE_API_TOKEN scopes`;
    else if (status === 405 || status === 404 || status === 400)
      note = `reachable (${status}) — client should use MCP stream protocol`;
    else if (status >= 200 && status < 300) note = `ok (${status})`;
    return { id, url, ok, status, ms, note };
  } catch (e) {
    const ms = Math.round(performance.now() - t0);
    const msg = e instanceof Error ? e.message : String(e);
    return {
      id,
      url,
      ok: false,
      status: null,
      ms,
      note: msg.slice(0, 120),
    };
  }
}

async function main(): Promise<void> {
  const json = argv.includes('--json');
  const token = Bun.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!token) {
    console.error(
      'CLOUDFLARE_API_TOKEN missing. Run: bun run proton:inject:factorywager then cloudflare:env:validate'
    );
    process.exit(1);
  }

  const rows: ProbeRow[] = [];
  for (const ep of ENDPOINTS) {
    rows.push(await probeOne(ep.id, ep.url, token));
  }

  const report = {
    generatedAt: new Date().toISOString(),
    tokenPresent: true,
    tokenKind: token.startsWith('cfat_') ? 'account' : token.startsWith('cft_') ? 'user' : 'other',
    rows,
    summary: {
      ok: rows.filter(r => r.ok).length,
      total: rows.length,
      authFails: rows.filter(r => r.status === 401 || r.status === 403).length,
    },
  };

  if (json) {
    jsonOut(report);
  } else {
    console.log(
      `Cloudflare MCP probe · token=${report.tokenKind} · ${report.summary.ok}/${report.summary.total} ok`
    );
    for (const r of rows) {
      const mark = r.ok ? '✓' : '✗';
      console.log(`  ${mark} ${r.id.padEnd(28)} ${r.ms}ms  ${r.note}`);
    }
    console.log(
      '\nConfig: .mcp.json (Cursor/VS Code via mcp:sync) · ~/.grok/config.toml [mcp_servers.cloudflare*]'
    );
    console.log('Skills: bunx skills add https://github.com/cloudflare/skills');
  }

  if (report.summary.authFails > 0) process.exit(2);
  if (report.summary.ok === 0) process.exit(1);
}

if (import.meta.main) {
  main().catch(err => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
