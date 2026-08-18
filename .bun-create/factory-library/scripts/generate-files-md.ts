// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write

import { projectFiles, renderFilesIndex } from './files-index.ts';

const packageJson = (await Bun.file('package.json').json()) as { files?: unknown };
const packageFiles = Array.isArray(packageJson.files)
  ? packageJson.files.filter((path): path is string => typeof path === 'string')
  : [];
const files = await projectFiles();

await Bun.write('files.md', renderFilesIndex(files, packageFiles));
console.log(`Generated files.md (${files.length} indexed files).`);
