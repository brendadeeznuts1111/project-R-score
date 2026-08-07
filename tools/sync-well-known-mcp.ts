#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/workers#creating-a-worker — Workers
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Regenerate public/.well-known/mcp.json from .mcp.json Cloudflare HTTP servers.
 *
 *   bun tools/sync-well-known-mcp.ts
 *   bun tools/sync-well-known-mcp.ts --check
 */
import { joinPath } from '../lib/path-bun.ts';
import { CLOUDFLARE_MCP_HTTP_SERVERS } from '../lib/verification/cloudflare-token-scope.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('sync:well-known-mcp', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const ROOT = joinPath(import.meta.dir, '..');
const repoPath = joinPath(ROOT, '.mcp.json');
const outPath = joinPath(ROOT, 'public/.well-known/mcp.json');
const checkOnly = argv.includes('--check');

const repo = JSON.parse(await Bun.file(repoPath).text()) as {
  mcpServers?: Record<string, { url?: string; type?: string }>;
};

const servers = CLOUDFLARE_MCP_HTTP_SERVERS.map(({ name, url }) => {
  const entry = repo.mcpServers?.[name];
  if (entry?.url !== url) {
    throw new Error(`.mcp.json missing or mismatched URL for ${name}`);
  }
  const descriptions: Record<string, string> = {
    cloudflare: 'Cloudflare account and API operations',
    'cloudflare-docs': 'Cloudflare documentation search',
    'cloudflare-bindings': 'Workers bindings',
    'cloudflare-builds': 'Workers Builds CI',
    'cloudflare-observability': 'Workers logs and metrics',
  };
  return {
    name,
    url,
    transport: 'http' as const,
    description: descriptions[name] ?? name,
  };
});

const manifest = {
  version: '1',
  description:
    'FactoryWager IDE MCP catalog — Cloudflare-hosted servers require CLOUDFLARE_API_TOKEN',
  servers,
  auth: { type: 'bearer', env: 'CLOUDFLARE_API_TOKEN' },
  repoCatalog: '.mcp.json',
};

const next = JSON.stringify(manifest, null, 2) + '\n';

if (checkOnly) {
  const current = await Bun.file(outPath).text();
  if (current !== next) {
    console.error('❌ public/.well-known/mcp.json is stale — run bun tools/sync-well-known-mcp.ts');
    process.exit(1);
  }
  console.log('✅ public/.well-known/mcp.json in sync');
  process.exit(0);
}

await Bun.write(outPath, next);
console.log(`✅ Wrote ${outPath} (${servers.length} Cloudflare MCP servers)`);
