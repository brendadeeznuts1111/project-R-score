#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @updated Bun.argv · changed v0.6.10 · 2023-06-26 · https://bun.com/blog/bun-v0.6.10
// @verified Bun.argv · Bun v1.4.0 · 2026-08-18 · https://bun.com/reference/bun/argv
import { syncBun14ChannelRelease } from './bun-blog-assets/channel-release.ts';
import { jsonOut } from '../lib/console-depth.ts';

function help(): void {
  console.info(`Usage: bun tools/bun-1.4-channel-release.ts [--check] [--no-archive] [--json]

Rebuilds capability/feed projections from the committed manifest and writes a
content-addressed Bun.Archive under reports/. It never changes the source
manifest and never deletes media or channel items.`);
}

async function main(): Promise<void> {
  const args = new Set(Bun.argv.slice(2));
  if (args.has('--help') || args.has('-h')) return help();
  const allowed = new Set(['--check', '--no-archive', '--json']);
  for (const arg of args) if (!allowed.has(arg)) throw new Error(`unknown option: ${arg}`);
  const result = await syncBun14ChannelRelease({
    check: args.has('--check'),
    archive: !args.has('--check') && !args.has('--no-archive'),
    quiet: args.has('--json'),
  });
  if (args.has('--json')) jsonOut(result);
}

if (import.meta.main) {
  await main().catch(error => {
    console.error(`[channels:bun-1.4] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
