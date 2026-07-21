#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/markdown#ansi-terminal-output — Bun.markdown.ansi
/**
 * Terminal-first spine tenants runbook.
 *
 *   bun run docs:spine-tenants
 */
import { ansiMarkdown } from '../lib/console-depth';
import { joinPath } from '../lib/path-bun';
import { SPINE_TENANTS } from '../spine/tenants';

const file = joinPath(import.meta.dir, '../docs/harness/spine-tenants.md');
const body = await Bun.file(file).text();

const catalog = [
  '',
  '## Live registry (`spine/tenants.ts`)',
  '',
  ...SPINE_TENANTS.map(
    t => `- **\`${t.id}\`** — ${t.label}\n  *Schedule* → \`${t.schedule}\` (UTC)`
  ),
  '',
].join('\n');

process.stdout.write(ansiMarkdown(body + catalog));
process.stdout.write('\n');
