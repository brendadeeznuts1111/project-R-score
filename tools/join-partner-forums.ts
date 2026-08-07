#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Join package-group forums via MTProto user session (clears 2·house! when operator = partner).
 *
 *   bun tools/join-partner-forums.ts
 *   bun tools/join-partner-forums.ts ASH BIL
 *   bun tools/join-partner-forums.ts --dry-run
 */
import { loadReasonixEnv } from '../lib/telegram/catalog-research/load-reasonix-env.ts';
import { listPackageGroupRegistry } from '../lib/telegram/package-group-registry.ts';
import { DEFAULT_OPS_DB_PATH, openOperationsDb } from '../lib/operations/db.ts';
import {
  invokeWithFloodRetry,
  withMtprotoUserClient,
} from '../toc-ops-repo/src/central-tool/telegram/user-client.ts';

const { Api } = await import('../toc-ops-repo/node_modules/telegram/index.js');

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('telegram:join-partner-forums', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const codes = argv.filter(a => !a.startsWith('-')).map(c => c.toUpperCase());

function inviteHash(link: string): string {
  const m = link.match(/t\.me\/\+([A-Za-z0-9_-]+)/);
  if (!m?.[1]) throw new Error(`Invalid invite link: ${link}`);
  return m[1];
}

await loadReasonixEnv();

const db = openOperationsDb({ path: Bun.env.OPS_DB_PATH?.trim() || DEFAULT_OPS_DB_PATH });
const rows = listPackageGroupRegistry(db).filter(r =>
  codes.length ? codes.includes(r.partnerCode.toUpperCase()) : true
);
db.close();

if (!rows.length) {
  console.error('No package groups with registry rows');
  process.exit(1);
}

for (const row of rows) {
  const link = row.inviteLink?.trim();
  if (!link) {
    console.log(`${row.partnerCode}: skip — no inviteLink in registry`);
    continue;
  }
  if (dryRun) {
    console.log(`${row.partnerCode}: would join ${link}`);
    continue;
  }
}

if (dryRun) process.exit(0);

await withMtprotoUserClient({}, async invoker => {
  for (const row of rows) {
    const link = row.inviteLink?.trim();
    if (!link) continue;
    const code = row.partnerCode.toUpperCase();
    try {
      const hash = inviteHash(link);
      await invokeWithFloodRetry(invoker, () =>
        invoker.invoke(new Api.messages.ImportChatInvite({ hash }))
      );
      console.log(`${code}: joined via ${link}`);
      await Bun.sleep(800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/USER_ALREADY_PARTICIPANT|already/i.test(msg)) {
        console.log(`${code}: already in forum`);
      } else {
        console.error(`${code}: join failed — ${msg}`);
      }
    }
  }
});

console.log('');
console.log(
  'Next: bun run telegram:handshake:desk --refresh && bun run telegram:handshake:invite-gap'
);
