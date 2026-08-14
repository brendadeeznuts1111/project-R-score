// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file
import { parseFilesIndex, projectFiles } from './files-index.ts';
import { validateFactoryLibraryManifest } from './template-contract.ts';

const packageJson = (await Bun.file('package.json').json()) as {
  files?: unknown;
};
const packageFiles = Array.isArray(packageJson.files)
  ? packageJson.files.filter((path): path is string => typeof path === 'string')
  : [];
const actual = await projectFiles();
const listed = parseFilesIndex(await Bun.file('files.md').text());

const missingFromIndex = actual.filter(path => !listed.includes(path));
const staleInIndex = listed.filter(path => !actual.includes(path));
const invalidPublishEntries = packageFiles.filter(
  entry => !actual.some(path => path === entry || path.startsWith(`${entry}/`)),
);
const manifestFindings = validateFactoryLibraryManifest(packageJson);

if (
  missingFromIndex.length ||
  staleInIndex.length ||
  invalidPublishEntries.length ||
  manifestFindings.length
) {
  if (missingFromIndex.length) console.error('Missing from files.md:', missingFromIndex.join(', '));
  if (staleInIndex.length) console.error('Stale files.md entries:', staleInIndex.join(', '));
  if (invalidPublishEntries.length) {
    console.error(
      'package.json files entries without indexed content:',
      invalidPublishEntries.join(', '),
    );
  }
  for (const finding of manifestFindings) {
    console.error(
      `Invalid package contract ${finding.property}: expected ${finding.expected}; received`,
      finding.actual,
    );
  }
  throw new Error(
    'files.md or the package contract is invalid. Run bun run generate:files and review package.json.',
  );
}

console.log(
  `files.md matches ${actual.length} indexed files, the package allowlist, and the package contract.`,
);
