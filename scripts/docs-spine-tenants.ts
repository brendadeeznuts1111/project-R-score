#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/markdown#ansi-terminal-output — Bun.markdown.ansi
/**
 * Terminal-first spine tenants index + typed runbook catalog.
 *
 *   bun run docs:spine-tenants
 */
import { ansiMarkdown } from '../lib/console-depth';
import { MAINTENANCE_RUNBOOKS } from '../lib/harness/maintenance';
import { joinPath } from '../lib/path-bun';
import { SPINE_TENANTS } from '../spine/tenants';

const file = joinPath(import.meta.dir, '../docs/harness/spine-tenants.md');
const body = await Bun.file(file).text();

const catalog = [
  '',
  '## Live spine registry',
  '',
  ...SPINE_TENANTS.map(
    t => `- **\`${t.id}\`** — ${t.label}\n  *Schedule* → \`${t.schedule}\` (UTC)`
  ),
  '',
  '## Typed runbooks (`MAINTENANCE_RUNBOOKS`)',
  '',
  ...MAINTENANCE_RUNBOOKS.map(
    r =>
      `- **\`${r.tenant}\`** → proof \`${r.proofId}\`\n` +
      `  *Doc* → \`${r.docPath}\`\n` +
      `  *Fresh-rerun* → \`${r.freshRerun}\``
  ),
  '',
].join('\n');

process.stdout.write(ansiMarkdown(body + catalog));
process.stdout.write('\n');
