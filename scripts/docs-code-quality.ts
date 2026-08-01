#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/markdown#ansi-terminal-output — Bun.markdown.ansi
/**
 *   bun run docs:code-quality
 */
import { CODE_QUALITY_TENANTS } from '../lib/harness/code-quality';
import { joinPath } from '../lib/path-bun';

const file = joinPath(import.meta.dir, '../docs/harness/code-quality.md');
const body = await Bun.file(file).text();
const catalog = [
  '',
  '## Live catalog (`CODE_QUALITY_TENANTS`)',
  '',
  ...CODE_QUALITY_TENANTS.map(
    t =>
      `- **\`${t.id}\`** → proof \`${t.proofId}\`\n` +
      `  *Fresh-rerun* → \`${t.freshRerun}\`\n` +
      `  *Doc* → \`${t.docPath}\``
  ),
  '',
].join('\n');
process.stdout.write(Bun.markdown.ansi(body + catalog));
process.stdout.write('\n');
