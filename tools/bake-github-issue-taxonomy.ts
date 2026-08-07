#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/reference/bun/argv — Bun.argv
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/** Bake or verify the deterministic public GitHub issue taxonomy artifact. */

import { joinPath } from '../lib/path-bun.ts';
import {
  GITHUB_ISSUE_TAXONOMY_PUBLIC_PATH,
  buildGithubIssueTaxonomyPublicArtifact,
  serializeGithubIssueTaxonomyPublicArtifact,
} from '../lib/github-issue-taxonomy-public.ts';
import { parseGithubIssueTaxonomyPublicArtifact } from '../lib/github-issue-taxonomy-public-wire.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('github-issue-taxonomy:bake', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const root = joinPath(import.meta.dir, '..');
const outPath = joinPath(root, 'public', 'registry', 'github-issue-taxonomy.json');
const expected = buildGithubIssueTaxonomyPublicArtifact();
const expectedText = serializeGithubIssueTaxonomyPublicArtifact(expected);

if (argv.includes('--check')) {
  const file = Bun.file(outPath);
  if (!(await file.exists())) {
    throw new Error(`${GITHUB_ISSUE_TAXONOMY_PUBLIC_PATH} is missing`);
  }
  const existingText = await file.text();
  parseGithubIssueTaxonomyPublicArtifact(JSON.parse(existingText));
  if (existingText !== expectedText) {
    throw new Error(
      `${GITHUB_ISSUE_TAXONOMY_PUBLIC_PATH} serialization is stale; run bun run github-issue-taxonomy:bake`
    );
  }
  console.info(
    `✅ ${GITHUB_ISSUE_TAXONOMY_PUBLIC_PATH} current (${expected.labels.length} labels · ${expected.dimensions.length} dimensions)`
  );
} else {
  await Bun.write(outPath, expectedText);
  console.info(
    `✅ wrote ${GITHUB_ISSUE_TAXONOMY_PUBLIC_PATH} (${expected.labels.length} labels · ${expected.dimensions.length} dimensions)`
  );
}
