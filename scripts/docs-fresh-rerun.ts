#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/markdown#ansi-terminal-output — Bun.markdown.ansi
/**
 * Terminal-first render of the fresh-rerun contract.
 *
 *   bun run docs:fresh-rerun
 */
import { CRITICAL_PROOF_PATHS } from '../lib/harness/proof';
import { joinPath } from '../lib/path-bun';

const file = joinPath(import.meta.dir, '../docs/harness/FRESH-RERUN.md');
const body = await Bun.file(file).text();

const catalog = [
  '',
  '## Catalog (`freshRerun` per claim)',
  '',
  ...CRITICAL_PROOF_PATHS.map(
    p => `- **\`${p.id}\`** — ${p.claim}\n  *Fresh-rerun* → \`${p.freshRerun}\``
  ),
  '',
].join('\n');

process.stdout.write(Bun.markdown.ansi(body + catalog));
process.stdout.write('\n');
