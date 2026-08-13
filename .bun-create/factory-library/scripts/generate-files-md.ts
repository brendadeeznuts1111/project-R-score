import { projectFiles, renderFilesIndex } from './files-index.ts';

const packageJson = (await Bun.file('package.json').json()) as { files?: unknown };
const packageFiles = Array.isArray(packageJson.files)
  ? packageJson.files.filter((path): path is string => typeof path === 'string')
  : [];
const files = await projectFiles();

await Bun.write('files.md', renderFilesIndex(files, packageFiles));
console.log(`Generated files.md (${files.length} indexed files).`);
