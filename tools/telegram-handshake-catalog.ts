#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * Read-only handshake reference — constants, mappings, CLI, lanes (from code SSOT).
 *
 *   bun run telegram:handshake:catalog
 *   bun run telegram:handshake:catalog --json
 *   bun run telegram:handshake:catalog lanes --json
 */
import {
  buildHandshakeCatalog,
  formatHandshakeCatalogHuman,
  HANDSHAKE_CLI_CATALOG,
  HANDSHAKE_LANE_CATALOG,
  HANDSHAKE_VERIFY_CHECK_IDS,
} from '../lib/telegram/handshake-catalog.ts';
import { jsonOut, logDepth } from '../lib/console-depth.ts';

const argv = Bun.argv.slice(2);
const wantJson = argv.includes('--json');
const section = argv.find(a => !a.startsWith('-')) ?? 'all';

function sliceSection(name: string): unknown {
  const catalog = buildHandshakeCatalog();
  switch (name) {
    case 'lanes':
      return { lanes: HANDSHAKE_LANE_CATALOG };
    case 'verify':
      return { verifyChecks: HANDSHAKE_VERIFY_CHECK_IDS };
    case 'cli':
      return { cli: HANDSHAKE_CLI_CATALOG };
    case 'all':
      return catalog;
    default:
      console.error(`Unknown section: ${name}. Use: all | lanes | verify | cli`);
      process.exit(1);
  }
}

if (argv.includes('--help') || argv.includes('-h')) {
  console.log(`Usage: bun tools/telegram-handshake-catalog.ts [all|lanes|verify|cli] [--json]

Single read-only reference for package-group handshake. Prose runbook:
  docs/harness/tenants/partner-package-group-handshake.md
`);
  process.exit(0);
}

const out = sliceSection(section);
if (wantJson) {
  jsonOut(out);
} else if (section === 'all') {
  for (const line of formatHandshakeCatalogHuman(buildHandshakeCatalog())) console.log(line);
} else {
  logDepth(out);
}
