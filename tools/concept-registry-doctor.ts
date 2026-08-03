#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Concept registry systems doctor.
 *
 *   bun run concept:registry:doctor
 *   bun run concept:registry:doctor -- --json
 *   bun run concept:registry:doctor -- --strict          # exit 1 if core fails
 *   bun run concept:registry:doctor -- --no-api          # skip live API probe
 *   bun run concept:registry:doctor -- --no-ensure       # do not create/migrate DB
 *
 * Env:
 *   CONCEPT_REGISTRY_DB_PATH   default data/concept-registry.db
 *   CONCEPT_REGISTRY_PORT      default 8788
 *   CONCEPT_REGISTRY_HOST      default 127.0.0.1
 *   CONCEPT_REGISTRY_URL       full base URL override
 */
import { jsonOut } from '../lib/console-depth.ts';
import { formatDoctorReport, runConceptRegistryDoctor } from '../lib/concept-registry/doctor.ts';

const argv = Bun.argv;
const asJson = argv.includes('--json');
const strict = argv.includes('--strict');
const noApi = argv.includes('--no-api');
const noEnsure = argv.includes('--no-ensure');

const report = await runConceptRegistryDoctor({
  checkApi: !noApi,
  ensureSchema: !noEnsure,
});

if (asJson) {
  jsonOut(report);
} else {
  console.log(formatDoctorReport(report));
}

if (strict && !report.ok) process.exit(1);
// Soft fail: empty concepts or offline API only exit 1 under --strict
if (strict && report.conceptStats.total === 0) process.exit(1);
