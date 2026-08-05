#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * Report seat-capital desk book labels vs public bookmakers registry.
 *
 *   bun run bookmakers:desk-coverage
 *   bun run bookmakers:desk-coverage --json
 *   bun run bookmakers:desk-coverage --apply-max  # fill missing maxBetUsd from desk
 */
import {
  applyDeskMaxBetsToCatalog,
  buildDeskCoverageReport,
} from '../lib/bookmakers/desk-coverage.ts';
import { loadBookmakerRegistry } from '../lib/bookmakers/resolve.ts';

const DESK_PATH = 'public/registry/seat-capital-desk.json';
const REGISTRY_PATH = 'public/registry/bookmakers.json';
const ARTIFACT_PUBLIC = 'artifact-registry/bookmakers/v0.4.0/public/books.json';

async function main(): Promise<void> {
  const asJson = Bun.argv.includes('--json');
  const applyMax = Bun.argv.includes('--apply-max');
  const strict = Bun.argv.includes('--strict');

  if (!(await Bun.file(DESK_PATH).exists())) {
    console.error(`missing ${DESK_PATH} — run seat:desk:refresh / ops:snapshot`);
    process.exit(1);
  }
  const desk = JSON.parse(await Bun.file(DESK_PATH).text());
  const registry = await loadBookmakerRegistry(REGISTRY_PATH);
  const report = buildDeskCoverageReport(desk, registry);

  if (applyMax) {
    const payload = JSON.parse(await Bun.file(REGISTRY_PATH).text()) as {
      bookmakers: Record<string, { limits?: { maxBetUsd?: number | null } }>;
      generatedAt?: string;
    };
    const n = applyDeskMaxBetsToCatalog(payload.bookmakers, report);
    payload.generatedAt = new Date().toISOString();
    const body = `${JSON.stringify(payload, null, 2)}\n`;
    await Bun.write(REGISTRY_PATH, body);
    if (await Bun.file(ARTIFACT_PUBLIC).exists()) {
      await Bun.write(ARTIFACT_PUBLIC, body);
    }
    console.log(`✓ applied ${n} desk maxBetUsd → ${REGISTRY_PATH}`);
  }

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(
      `desk coverage: ${report.matched} matched · ${report.placeholder} placeholder · ${report.unmatched} unmatched · ${report.registryUnused.length} registry unused`
    );
    for (const h of report.hits) {
      const max = h.maxBetUsd != null ? ` max$${h.maxBetUsd}` : '';
      const id = h.registryId ? ` → ${h.registryId}` : '';
      console.log(`  [${h.class}] ${h.deskBook}${id}${max} (n=${h.samples})`);
    }
    if (report.registryUnused.length) {
      console.log(`registry unused: ${report.registryUnused.join(', ')}`);
    }
  }

  if (strict && report.unmatched > 0) {
    process.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
