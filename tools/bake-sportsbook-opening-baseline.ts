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

import { isModuleEntrypoint } from '../lib/bun-executable.ts';
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
    // generatedAt + Tier 3 checkedAt are bake/probe clocks — strip before content compare.
    const normalize = (raw: Record<string, unknown>): Record<string, unknown> => {
      const clone = structuredClone(raw) as Record<string, unknown>;
      delete clone.generatedAt;
      const tier3 = (
        clone.sources as { tiers?: Record<string, Record<string, unknown>> } | undefined
      )?.tiers?.['3'];
      if (tier3) delete tier3.checkedAt;
      return clone;
    };
    if (!Bun.deepEquals(normalize(current), normalize(payload as Record<string, unknown>), true)) {
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

if (isModuleEntrypoint(import.meta)) {
  await main();
}
