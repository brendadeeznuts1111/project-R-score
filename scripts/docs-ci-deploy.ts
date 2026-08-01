#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/markdown#ansi-terminal-output — Bun.markdown.ansi
/**
 *   bun run docs:ci-deploy
 */
import { CI_RUNBOOKS } from '../lib/harness/ci-deploy';
import { joinPath } from '../lib/path-bun';

const file = joinPath(import.meta.dir, '../docs/harness/ci-deploy.md');
const body = await Bun.file(file).text();
const catalog = [
  '',
  '## Live catalog (`CI_RUNBOOKS`)',
  '',
  ...CI_RUNBOOKS.map(
    r =>
      `- **\`${r.id}\`** → proof \`${r.proofId}\`\n` +
      `  *Intervention* → \`${r.intervention}\`\n` +
      `  *Doc* → \`${r.docPath}\``
  ),
  '',
].join('\n');
process.stdout.write(Bun.markdown.ansi(body + catalog));
process.stdout.write('\n');
