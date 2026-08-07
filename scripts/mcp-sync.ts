#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * mcp-sync — generate .vscode/mcp.json from the SSOT .mcp.json.
 *
 * .mcp.json is the single source of truth for workspace MCP servers
 * (.cursor/mcp.json is a symlink to it). VS Code uses a different schema
 * (`servers` key, `${input:…}` / `${env:VAR}` interpolation), so it is generated.
 *
 * Usage:
 *   bun scripts/mcp-sync.ts          # write .vscode/mcp.json
 *   bun scripts/mcp-sync.ts --check  # exit 1 if .vscode/mcp.json is stale
 */
// @see https://bun.com/docs/runtime/file-io

import { buildVsCodeMcp, stringifyVsCodeMcp, type McpSsot } from './lib/mcp-sync-convert.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('mcp:sync', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const root = new URL('../', import.meta.url).pathname.replace(/\/$/, '');
const ssotPath = `${root}/.mcp.json`;
const vscodePath = `${root}/.vscode/mcp.json`;

async function main(): Promise<void> {
  const ssot = (await Bun.file(ssotPath).json()) as McpSsot;
  const generated = stringifyVsCodeMcp(buildVsCodeMcp(ssot, root));

  if (argv.includes('--check')) {
    const current = await Bun.file(vscodePath).text();
    if (current === generated) {
      console.log('mcp-sync: .vscode/mcp.json is up to date');
      process.exit(0);
    }
    console.error('mcp-sync: .vscode/mcp.json is stale — run `bun scripts/mcp-sync.ts`');
    process.exit(1);
  }

  await Bun.write(vscodePath, generated);
  console.log(`mcp-sync: wrote ${vscodePath} from ${ssotPath}`);
}

if (import.meta.main) {
  await main();
}
