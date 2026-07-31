#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-deepequals — Bun.deepEquals
// @see https://bun.com/docs/runtime/file-io — Bun.write
/**
 * Bake top-10 US sportsbook opening-limit baseline for portal boards.
 *
 *   bun run bake:sportsbook-opening-baseline
 *   bun run bake:sportsbook-opening-baseline --check
 */

import { joinPath } from '../lib/path-bun.ts';
import {
  SPORTSBOOK_OPENING_BASELINE_PATH,
  buildSportsbookOpeningBaselineArtifact,
} from '../lib/operations/sportsbook-opening-baseline.ts';

const RELATIVE_PATH = 'public/registry/sportsbook-opening-baseline.json';

async function main(): Promise<void> {
  const root = joinPath(import.meta.dir, '..');
  const target = joinPath(root, RELATIVE_PATH);
  const payload = buildSportsbookOpeningBaselineArtifact();
  const serialized = `${JSON.stringify(payload, null, 2)}\n`;

  if (Bun.argv.includes('--check')) {
    if (!(await Bun.file(target).exists())) {
      console.error(`❌ missing ${RELATIVE_PATH}; run bun run bake:sportsbook-opening-baseline`);
      process.exit(1);
    }
    const current = (await Bun.file(target).json()) as Record<string, unknown>;
    const { generatedAt: _now, ...expected } = payload as Record<string, unknown> & {
      generatedAt: string;
    };
    const { generatedAt: _was, ...committed } = current;
    // generatedAt is bake provenance only — content must stay byte-stable otherwise.
    if (!Bun.deepEquals(committed, expected, true)) {
      console.error(`❌ ${RELATIVE_PATH} is stale; run bun run bake:sportsbook-opening-baseline`);
      process.exit(1);
    }
    console.info(
      `✅ sportsbook opening baseline current (${payload.summary.books} books · ${payload.summary.rows} rows)`
    );
    return;
  }

  await Bun.write(target, serialized);
  console.info(
    `✅ wrote ${SPORTSBOOK_OPENING_BASELINE_PATH} (${payload.summary.books} books · ${payload.summary.rows} rows)`
  );
}

if (import.meta.main) {
  await main();
}
