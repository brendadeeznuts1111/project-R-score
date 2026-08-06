#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-markdown — Bun.markdown.ansi
/**
 * Tiny CLI for workspace taxonomy homonyms.
 *
 *   bun tools/workspace-taxonomy.ts explain partner
 *   bun tools/workspace-taxonomy.ts list
 */
import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import { logTable } from '../lib/console-depth.ts';
import {
  SESSION_LANES,
  WORKSPACE_TAXONOMY_CORRELATIONS,
  formatHomonymMarkdown,
} from '../lib/docs/workspace-taxonomy.ts';

function usage(): never {
  console.error(`Usage:
  bun tools/workspace-taxonomy.ts explain <token>
  bun tools/workspace-taxonomy.ts list`);
  process.exit(2);
}

async function main(): Promise<number> {
  const [, , cmd, ...rest] = Bun.argv;
  if (cmd === 'explain') {
    const token = rest.join(' ').trim();
    if (!token) usage();
    const md = formatHomonymMarkdown(token);
    if (typeof Bun.markdown?.ansi === 'function') {
      console.log(Bun.markdown.ansi(md, { columns: 100, hyperlinks: true }));
    } else {
      console.log(md);
    }
    return 0;
  }
  if (cmd === 'list') {
    const rows = WORKSPACE_TAXONOMY_CORRELATIONS.map(r => ({
      sessionLane: r.sessionLane,
      chrome: r.chromeDomains.join(', ') || '—',
      concepts: r.conceptDomains.join(', '),
      scopes: r.commitScopeHints.join(', ') || '—',
    }));
    logTable(rows, ['sessionLane', 'chrome', 'concepts', 'scopes']);
    console.log(
      `\n${SESSION_LANES.length} session lanes · ${WORKSPACE_TAXONOMY_CORRELATIONS.length} correlations`
    );
    return 0;
  }
  usage();
}

if (isModuleEntrypoint(import.meta)) {
  process.exit(await main());
}
