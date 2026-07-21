#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * CLI for the sandboxed tenant-heal fixture.
 *
 *   bun scripts/tenant-heal-fixture.ts check --dir=.cache/journey-tenant-heal
 *   bun scripts/tenant-heal-fixture.ts break --dir=…
 *   bun scripts/tenant-heal-fixture.ts fix --dir=…
 */
import {
  breakHealth,
  checkHealth,
  fixHealth,
  HEAL_FIXTURE_TENANT,
} from '../lib/harness/heal-fixture';

function parseDir(argv: string[]): string | undefined {
  const eq = argv.find(a => a.startsWith('--dir='));
  if (eq) return eq.slice('--dir='.length);
  const i = argv.indexOf('--dir');
  if (i !== -1) return argv[i + 1];
  return undefined;
}

const argv = Bun.argv.slice(2);
const cmd = argv[0];
const dir = parseDir(argv);

if (!cmd || !dir) {
  console.error(
    `usage: bun scripts/tenant-heal-fixture.ts <check|break|fix> --dir=<workspace>\n` +
      `tenant: ${HEAL_FIXTURE_TENANT}`
  );
  process.exit(2);
}

switch (cmd) {
  case 'check': {
    const code = await checkHealth(dir);
    console.info(
      code === 0 ? `✅ ${HEAL_FIXTURE_TENANT} healthy` : `❌ ${HEAL_FIXTURE_TENANT} unhealthy`
    );
    process.exit(code);
  }
  case 'break': {
    await breakHealth(dir);
    console.info(`💥 ${HEAL_FIXTURE_TENANT} broken`);
    process.exit(0);
  }
  case 'fix': {
    await fixHealth(dir);
    console.info(`🩹 ${HEAL_FIXTURE_TENANT} fixed`);
    process.exit(0);
  }
  default:
    console.error(`unknown command ${cmd}`);
    process.exit(2);
}
