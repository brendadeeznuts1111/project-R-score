#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io — Bun.file / Bun.write
/**
 * Partner-ops taxonomy CLI — validate · build · ledger append.
 *
 *   bun run partners:validate
 *   bun run partners:build
 *   bun run partners:ledger:append -- --code DEPOSIT_RECEIVED --partner ASH --amount 1000 --rail venmo
 *
 * Soft ledger mutations stay in toc-ops-repo `ct`. This is the factory mirror.
 */
import { jsonOut, logDepth } from '../lib/console-depth.ts';
import {
  buildPartnerOpsEvent,
  isPartnerOpsEventCode,
  type PartnerOpsEventCode,
} from '../lib/telegram/partner-ops-events.ts';
import {
  appendPartnerOpsEvent,
  buildPartnersOpsRegistry,
  exportPartnersOpsRegistry,
  PARTNERS_OPS_REGISTRY_PATH,
} from '../lib/telegram/partner-ops-registry.ts';

const argv = Bun.argv.slice(2);
const cmd = argv.find(a => !a.startsWith('-')) ?? 'validate';
const wantJson = argv.includes('--json');

function flag(name: string): string | undefined {
  const i = argv.indexOf(name);
  if (i < 0) return undefined;
  return argv[i + 1];
}

async function runValidate(): Promise<number> {
  const registry = await buildPartnersOpsRegistry();
  if (wantJson) {
    jsonOut({
      ok: registry.validation.ok,
      summary: registry.summary,
      issues: registry.validation.issues,
      path: PARTNERS_OPS_REGISTRY_PATH,
    });
  } else {
    const { summary, validation } = registry;
    console.log(
      `partners-ops · ${summary.partners} partners · ${summary.outs} outs · ${summary.books} books`
    );
    console.log(
      `validation · ${validation.ok ? 'ok' : 'FAIL'} · errors ${summary.validationErrors} · warnings ${summary.validationWarnings}`
    );
    for (const issue of validation.issues) {
      console.log(`  [${issue.level}] ${issue.code}: ${issue.message}`);
    }
  }
  return registry.validation.ok ? 0 : 1;
}

async function runBuild(): Promise<number> {
  const registry = await exportPartnersOpsRegistry();
  if (wantJson) {
    jsonOut({
      ok: registry.validation.ok,
      path: PARTNERS_OPS_REGISTRY_PATH,
      generatedAt: registry.generatedAt,
      summary: registry.summary,
      issues: registry.validation.issues,
    });
  } else {
    console.log(
      `wrote ${PARTNERS_OPS_REGISTRY_PATH} · ${registry.summary.partners} partners · validation ${registry.validation.ok ? 'ok' : 'FAIL'}`
    );
    for (const issue of registry.validation.issues) {
      console.log(`  [${issue.level}] ${issue.code}: ${issue.message}`);
    }
  }
  return registry.validation.ok ? 0 : 1;
}

async function runLedgerAppend(): Promise<number> {
  const codeRaw = flag('--code') || flag('-c');
  if (!codeRaw || !isPartnerOpsEventCode(codeRaw)) {
    console.error(
      `Usage: partners:ledger:append -- --code <EVENT> [--partner CODE] [--call CALL] [--out ID] [--amount N] [--rail R] [--note …]`
    );
    return 2;
  }
  const amountRaw = flag('--amount');
  const event = buildPartnerOpsEvent(codeRaw as PartnerOpsEventCode, {
    partnerCode: flag('--partner')?.toUpperCase(),
    callSign: flag('--call')?.toUpperCase(),
    outId: flag('--out'),
    amount: amountRaw != null ? Number(amountRaw) : undefined,
    rail: flag('--rail'),
    note: flag('--note'),
  });
  const path = await appendPartnerOpsEvent(event);
  if (wantJson) jsonOut({ path, event });
  else logDepth({ path, event });
  return 0;
}

if (argv.includes('--help') || argv.includes('-h')) {
  console.log(`Usage: bun tools/partners-ops.ts <validate|build|ledger:append> [--json]

validate  Check seat-desk + handshake projection for collisions / glossary IDs
build     Write ${PARTNERS_OPS_REGISTRY_PATH}
ledger:append  Append factory-mirror event JSONL (not soft ledger)
`);
  process.exit(0);
}

let exit = 0;
switch (cmd) {
  case 'validate':
    exit = await runValidate();
    break;
  case 'build':
    exit = await runBuild();
    break;
  case 'ledger:append':
    exit = await runLedgerAppend();
    break;
  default:
    console.error(`Unknown command: ${cmd}`);
    exit = 2;
}
process.exit(exit);
