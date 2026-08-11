// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
import { joinPath } from '../lib/path-bun.ts';
import {
  assertModelContractFilesMarkdown,
  renderModelContractFilesMarkdown,
} from '../lib/operator-research/model-contract-files.ts';

const root = joinPath(import.meta.dir, '..');
const filesPath = joinPath(root, 'lib/operator-research/files.md');

async function main(): Promise<void> {
  const write = Bun.argv.includes('--write');
  const expected = renderModelContractFilesMarkdown();
  assertModelContractFilesMarkdown(expected);
  if (write) {
    await Bun.write(filesPath, expected);
    console.log('model contracts: wrote lib/operator-research/files.md');
    return;
  }
  const actual = await Bun.file(filesPath).text();
  if (actual !== expected) {
    throw new Error('model contracts: files.md drift — run bun run model:contracts:files:update');
  }
  assertModelContractFilesMarkdown(actual);
  console.log('model contracts: files.md and file ownership registry agree');
}

if (import.meta.main) await main();
