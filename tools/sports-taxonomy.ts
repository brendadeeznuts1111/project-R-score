#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io — Bun.file / Bun.write
// @see https://bun.com/reference/bun/argv — Bun.argv
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/** Bake the governed sports geography and competition taxonomy. */

import {
  buildSportsTaxonomyArtifact,
  SPORTS_TAXONOMY_PATH,
} from '../lib/operations/sports-competition-catalog.ts';
import { joinPath } from '../lib/path-bun.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('sports:taxonomy', Bun.argv.slice(2))
  : Bun.argv.slice(2);
async function main(): Promise<void> {
  const root = joinPath(import.meta.dir, '..');
  const target = joinPath(root, `public${SPORTS_TAXONOMY_PATH}`);
  const artifact = buildSportsTaxonomyArtifact();
  const serialized = `${JSON.stringify(artifact, null, 2)}\n`;

  if (argv.includes('--check')) {
    if (!(await Bun.file(target).exists())) {
      console.error(`❌ missing public${SPORTS_TAXONOMY_PATH}; run bun run sports:taxonomy`);
      process.exit(1);
    }
    const current = await Bun.file(target).text();
    const currentPayload = JSON.parse(current) as { generatedAt?: string };
    const stableArtifact = buildSportsTaxonomyArtifact(currentPayload.generatedAt);
    const stableSerialized = `${JSON.stringify(stableArtifact, null, 2)}\n`;
    if (current !== stableSerialized) {
      console.error(`❌ public${SPORTS_TAXONOMY_PATH} is stale; run bun run sports:taxonomy`);
      process.exit(1);
    }
    console.info(
      `✅ sports taxonomy current (${artifact.summary.leagues} leagues · ${artifact.summary.countries} countries)`
    );
    return;
  }

  await Bun.write(target, serialized);
  console.info(
    `✅ wrote public${SPORTS_TAXONOMY_PATH} (${artifact.summary.leagues} leagues · ${artifact.summary.countries} countries)`
  );
}

if (import.meta.main) {
  await main();
}
