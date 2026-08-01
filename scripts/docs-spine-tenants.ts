#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/markdown#ansi-terminal-output — Bun.markdown.ansi
/**
 * Terminal-first spine tenants index + typed runbook catalog.
 *
 *   bun run docs:spine-tenants
 */
import { MAINTENANCE_RUNBOOKS, RETIRED_TENANT_RUNBOOKS } from '../lib/harness/maintenance';
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
      `  *Fresh-rerun* → \`${r.freshRerun}\`\n` +
      `  *Retirement verified* → \`${r.retirementVerified}\`\n` +
      (r.retirementCheck
        ? `  *Retirement check* → \`${r.retirementCheck.command ?? r.retirementCheck.proofId}\``
        : `  *Retirement check* → *(none)*`)
  ),
  '',
  '## Retired tombstones (`RETIRED_TENANT_RUNBOOKS`)',
  '',
  ...(RETIRED_TENANT_RUNBOOKS.length === 0
    ? ['*(none)*']
    : RETIRED_TENANT_RUNBOOKS.map(
        r =>
          `- **\`${r.tenant}\`** → proof \`${r.proofId}\` · verified \`${r.retirementVerified}\`\n` +
          `  *Condition* → ${r.retirement}\n` +
          `  *Check* → \`${r.retirementCheck?.command ?? r.retirementCheck?.proofId ?? 'manual'}\``
      )),
  '',
].join('\n');

process.stdout.write(Bun.markdown.ansi(body + catalog));
process.stdout.write('\n');
