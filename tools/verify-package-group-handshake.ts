#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Verify package-group handshake lifecycle (JSONL + registry).
 *
 *   bun tools/verify-package-group-handshake.ts ASH
 *   bun tools/verify-package-group-handshake.ts ASH --json
 */
import { DEFAULT_OPS_DB_PATH, openOperationsDb } from '../lib/operations/db.ts';
import {
  formatHandshakeVerifyReport,
  verifyPackageGroupHandshake,
} from '../lib/telegram/verify-package-group-handshake.ts';
import { PENDING_PACKAGE_GROUPS_JSONL } from '../lib/telegram/package-group-registry.ts';
import { PACKAGE_GROUP_FORUMS_META_DIR } from '../lib/telegram/package-group-forum.ts';
import { loadReasonixEnv } from '../lib/telegram/catalog-research/load-reasonix-env.ts';
import { loadTelegramEnv } from '../lib/telegram/telegram-config.ts';

const argv = Bun.argv.slice(2);
let partnerCode = '';
let jsonlPath = PENDING_PACKAGE_GROUPS_JSONL;
let forumsMetaDir = PACKAGE_GROUP_FORUMS_META_DIR;
let dbPath = Bun.env.OPS_DB_PATH?.trim() || DEFAULT_OPS_DB_PATH;
let wantJson = false;
let live = false;

for (let i = 0; i < argv.length; i++) {
  const a = argv[i]!;
  if (a === '--json') wantJson = true;
  else if (a === '--live') live = true;
  else if (a === '--path' && argv[i + 1]) jsonlPath = argv[++i]!;
  else if (a.startsWith('--path=')) jsonlPath = a.slice('--path='.length);
  else if (a === '--forums-dir' && argv[i + 1]) forumsMetaDir = argv[++i]!;
  else if (a.startsWith('--forums-dir=')) forumsMetaDir = a.slice('--forums-dir='.length);
  else if (a === '--db' && argv[i + 1]) dbPath = argv[++i]!;
  else if (a.startsWith('--db=')) dbPath = a.slice('--db='.length);
  else if (a === '--help' || a === '-h') {
    console.log(
      `Usage: bun tools/verify-package-group-handshake.ts <CODE> [--path jsonl] [--forums-dir path] [--db path] [--json] [--live]`
    );
    process.exit(0);
  } else if (!a.startsWith('-')) partnerCode = a.toUpperCase();
}

if (!partnerCode) {
  console.error('Partner CODE required (e.g. ASH)');
  process.exit(2);
}

await loadReasonixEnv();
const db = openOperationsDb({ path: dbPath });
const tg = loadTelegramEnv();
try {
  const result = await verifyPackageGroupHandshake({
    db,
    partnerCode,
    jsonlPath,
    forumsMetaDir,
    live,
    telegramToken: tg.effectiveToken,
  });
  if (wantJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    for (const line of formatHandshakeVerifyReport(result)) {
      console.log(line);
    }
  }
  if (!result.ok) process.exit(1);
} finally {
  db.close();
}
